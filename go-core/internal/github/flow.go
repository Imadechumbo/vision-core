package github

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
)

type ControlledFlowInput struct {
	Root          string
	Plan          PRPlan
	Client        PRClient
	Owner         string
	Repo          string
	DryRun        bool
	AllowLocalGit bool
}

type ControlledFlowResult struct {
	OK                 bool   `json:"ok"`
	PlanID             string `json:"plan_id"`
	BaseBranch         string `json:"base_branch"`
	WorkBranch         string `json:"work_branch"`
	BranchCreated      bool   `json:"branch_created"`
	CommitCreated      bool   `json:"commit_created"`
	CommitSHA          string `json:"commit_sha,omitempty"`
	DryRun             bool   `json:"dry_run"`
	WouldOpenPR        bool   `json:"would_open_pr"`
	WouldPublishStatus bool   `json:"would_publish_status"`
	PROpened           bool   `json:"pr_opened"`
	PRNumber           int    `json:"pr_number,omitempty"`
	PRURL              string `json:"pr_url,omitempty"`
	StatusPublished    bool   `json:"status_published"`
	Blocked            bool   `json:"blocked"`
	BlockReason        string `json:"block_reason,omitempty"`
	Error              string `json:"error,omitempty"`
}

func RunControlledPRFlow(ctx context.Context, input ControlledFlowInput) ControlledFlowResult {
	res := ControlledFlowResult{
		PlanID:     input.Plan.ID,
		BaseBranch: input.Plan.BaseBranch,
		WorkBranch: input.Plan.WorkBranch,
		DryRun:     effectiveDryRun(input),
	}

	if err := validateControlledPlan(input.Plan); err != nil {
		return blockControlledFlow(res, err.Error())
	}
	if err := validateGitRoot(input.Root); err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	if err := validatePlannedGitPaths(input.Root, input.Plan.ChangedFiles); err != nil {
		return blockControlledFlow(res, err.Error())
	}
	baseBranch, err := CurrentBranch(input.Root)
	if err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	if baseBranch == "main" || baseBranch == "master" {
		return blockControlledFlow(res, fmt.Sprintf("base branch %q is not allowed for controlled flow", baseBranch))
	}
	if input.Plan.BaseBranch == "" {
		res.BaseBranch = baseBranch
	} else if input.Plan.WorkBranch == input.Plan.BaseBranch {
		return blockControlledFlow(res, "work branch must differ from base branch")
	}
	if input.Plan.WorkBranch == baseBranch {
		return blockControlledFlow(res, "work branch must differ from current branch")
	}
	if err := EnsureWorkingTreeOnlyHas(input.Root, input.Plan.ChangedFiles); err != nil {
		return blockControlledFlow(res, err.Error())
	}

	res.WouldOpenPR = true
	res.WouldPublishStatus = true
	if !input.AllowLocalGit {
		res.OK = true
		return res
	}

	if err := CreateBranch(input.Root, input.Plan.WorkBranch); err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	res.BranchCreated = true
	if err := AddFiles(input.Root, input.Plan.ChangedFiles); err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	sha, err := Commit(input.Root, input.Plan.CommitMessage)
	if err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	res.CommitCreated = true
	res.CommitSHA = sha

	if res.DryRun {
		res.OK = true
		return res
	}
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		res.OK = false
		res.Error = "github write disabled: set VISION_GITHUB_WRITE=1"
		return res
	}
	if input.Client == nil {
		res.OK = false
		res.Error = "pr client is required"
		return res
	}
	pr, err := input.Client.OpenPR(ctx, buildOpenPRRequest(input))
	if err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	res.PROpened = true
	res.PRNumber = pr.Number
	res.PRURL = pr.URL
	if err := input.Client.PublishStatus(ctx, buildStatusRequest(input, sha)); err != nil {
		res.OK = false
		res.Error = err.Error()
		return res
	}
	res.StatusPublished = true
	res.OK = true
	return res
}

func effectiveDryRun(input ControlledFlowInput) bool {
	if input.DryRun {
		return true
	}
	return os.Getenv("VISION_GITHUB_WRITE") != "1"
}

func validateControlledPlan(plan PRPlan) error {
	switch {
	case !plan.CanOpenPR:
		if strings.TrimSpace(plan.BlockReason) != "" {
			return errors.New(plan.BlockReason)
		}
		return errors.New("plan cannot open PR")
	case !IsSafeBranchName(plan.WorkBranch):
		return fmt.Errorf("unsafe branch name: %q", plan.WorkBranch)
	case plan.WorkBranch == "main" || plan.WorkBranch == "master":
		return fmt.Errorf("work branch %q is not allowed", plan.WorkBranch)
	case plan.BaseBranch != "" && plan.WorkBranch == plan.BaseBranch:
		return errors.New("work branch must differ from base branch")
	case len(plan.ChangedFiles) == 0:
		return errors.New("changed_files is empty")
	case plan.StatusState != "success":
		return fmt.Errorf("status_state must be success: %s", plan.StatusState)
	case plan.StatusContext != DefaultStatusContext:
		return fmt.Errorf("status_context must be %s: %s", DefaultStatusContext, plan.StatusContext)
	}
	return nil
}

func validateGitRoot(root string) error {
	if strings.TrimSpace(root) == "" {
		return errors.New("root is required")
	}
	out, err := gitOutput(root, "rev-parse", "--is-inside-work-tree")
	if err != nil {
		return fmt.Errorf("root is not a valid git repository: %w", err)
	}
	if strings.TrimSpace(out) != "true" {
		return errors.New("root is not inside a git work tree")
	}
	return nil
}

func validatePlannedGitPaths(root string, files []string) error {
	if len(files) == 0 {
		return errors.New("changed_files is empty")
	}
	for _, f := range files {
		if _, err := validateGitPath(root, f); err != nil {
			return err
		}
	}
	return nil
}

func blockControlledFlow(res ControlledFlowResult, reason string) ControlledFlowResult {
	res.OK = false
	res.Blocked = true
	res.BlockReason = reason
	return res
}

func buildOpenPRRequest(input ControlledFlowInput) OpenPRRequest {
	return OpenPRRequest{Owner: input.Owner, Repo: input.Repo, BaseBranch: input.Plan.BaseBranch, HeadBranch: input.Plan.WorkBranch, Title: input.Plan.Title, Body: input.Plan.Body}
}

func buildStatusRequest(input ControlledFlowInput, sha string) StatusRequest {
	return StatusRequest{Owner: input.Owner, Repo: input.Repo, SHA: sha, State: input.Plan.StatusState, Context: input.Plan.StatusContext, Description: "PASS GOLD + PASS SECURE confirmed"}
}
