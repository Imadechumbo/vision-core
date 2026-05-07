package github

import (
	"context"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
)

const remediationBranchPrefix = "vision/remediation/"

var safeOwnerRepoName = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)

type RealPROpenInput struct {
	Plan                   PRPlan
	Client                 PRClient
	Owner                  string
	Repo                   string
	DryRun                 bool
	RequireWriteGate       bool
	RequireRemotePublished bool
	RemotePublished        bool
}

type RealPROpenResult struct {
	OK          bool   `json:"ok"`
	DryRun      bool   `json:"dry_run"`
	WouldOpen   bool   `json:"would_open"`
	PROpened    bool   `json:"pr_opened"`
	PRNumber    int    `json:"pr_number,omitempty"`
	PRURL       string `json:"pr_url,omitempty"`
	BaseBranch  string `json:"base_branch"`
	HeadBranch  string `json:"head_branch"`
	Title       string `json:"title"`
	Blocked     bool   `json:"blocked"`
	BlockReason string `json:"block_reason,omitempty"`
	Error       string `json:"error,omitempty"`
}

func OpenRealPR(ctx context.Context, input RealPROpenInput) RealPROpenResult {
	res := RealPROpenResult{
		DryRun:     input.DryRun,
		BaseBranch: input.Plan.BaseBranch,
		HeadBranch: input.Plan.WorkBranch,
		Title:      input.Plan.Title,
	}

	if err := validateRealPRPlan(input.Plan); err != nil {
		return blockRealPROpen(res, err.Error())
	}
	if err := validateOwnerRepoName("owner", input.Owner); err != nil {
		return blockRealPROpen(res, err.Error())
	}
	if err := validateOwnerRepoName("repo", input.Repo); err != nil {
		return blockRealPROpen(res, err.Error())
	}
	if !input.RemotePublished {
		return blockRealPROpen(res, "remote branch has not been published")
	}

	res.WouldOpen = true
	if input.DryRun {
		res.OK = true
		return res
	}

	if input.RequireWriteGate && os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return blockRealPROpen(res, "github write disabled: set VISION_GITHUB_WRITE=1")
	}
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return blockRealPROpen(res, "github write disabled: set VISION_GITHUB_WRITE=1")
	}
	if os.Getenv("GITHUB_TOKEN") == "" {
		return blockRealPROpen(res, "github token unavailable")
	}
	if input.Client == nil {
		return blockRealPROpen(res, "pr client is required")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}

	pr, err := input.Client.OpenPR(ctx, OpenPRRequest{
		Owner:      input.Owner,
		Repo:       input.Repo,
		BaseBranch: input.Plan.BaseBranch,
		HeadBranch: input.Plan.WorkBranch,
		Title:      input.Plan.Title,
		Body:       input.Plan.Body,
	})
	if err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}
	res.PROpened = true
	res.PRNumber = pr.Number
	res.PRURL = pr.URL
	res.OK = true
	return res
}

func validateRealPRPlan(plan PRPlan) error {
	switch {
	case !plan.CanOpenPR:
		if strings.TrimSpace(plan.BlockReason) != "" {
			return errors.New(plan.BlockReason)
		}
		return errors.New("plan cannot open PR")
	case !plan.PassGoldRequired:
		return errors.New("pass_gold_required must be true")
	case !plan.PassSecureRequired:
		return errors.New("pass_secure_required must be true")
	case plan.StatusContext != DefaultStatusContext:
		return fmt.Errorf("status_context must be %s: %s", DefaultStatusContext, plan.StatusContext)
	case plan.StatusState != "success":
		return fmt.Errorf("status_state must be success: %s", plan.StatusState)
	case strings.TrimSpace(plan.BaseBranch) == "":
		return errors.New("base_branch is required")
	case strings.TrimSpace(plan.WorkBranch) == "":
		return errors.New("work_branch is required")
	case !strings.HasPrefix(plan.WorkBranch, remediationBranchPrefix):
		return fmt.Errorf("work_branch must start with %s: %s", remediationBranchPrefix, plan.WorkBranch)
	case isBlockedRealPRBranch(plan.WorkBranch):
		return fmt.Errorf("work branch %q is blocked", plan.WorkBranch)
	case !IsSafeBranchName(plan.WorkBranch):
		return fmt.Errorf("unsafe branch name: %q", plan.WorkBranch)
	case plan.WorkBranch == plan.BaseBranch:
		return errors.New("work branch must differ from base branch")
	case len(plan.ChangedFiles) == 0:
		return errors.New("changed_files is empty")
	case strings.TrimSpace(plan.Title) == "":
		return errors.New("title is required")
	case strings.TrimSpace(plan.Body) == "":
		return errors.New("body is required")
	}
	return nil
}

func validateOwnerRepoName(field, value string) error {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fmt.Errorf("%s is required", field)
	}
	if trimmed != value {
		return fmt.Errorf("%s contains surrounding whitespace", field)
	}
	if strings.Contains(trimmed, "..") || strings.Contains(trimmed, "/") || strings.Contains(trimmed, "\\") || strings.Contains(trimmed, "://") || !safeOwnerRepoName.MatchString(trimmed) {
		return fmt.Errorf("unsafe %s: %q", field, trimmed)
	}
	return nil
}

func isBlockedRealPRBranch(branch string) bool {
	return branch == "main" || branch == "master" || branch == DefaultBaseBranch
}

func blockRealPROpen(res RealPROpenResult, reason string) RealPROpenResult {
	res.OK = false
	res.Blocked = true
	res.BlockReason = RedactSecrets(reason)
	return res
}
