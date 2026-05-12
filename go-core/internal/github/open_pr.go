// internal/github/open_pr.go
// VISION AEGIS CORE ENTERPRISE — V7.3 REAL PR OPEN WITH EXPLICIT WRITE GATE
//
// OpenRealPR opens a GitHub Pull Request only when:
//   - PRPlan.CanOpenPR = true
//   - PRPlan fully validated (StatusContext, StatusState, branches, files)
//   - VISION_GITHUB_WRITE=1 (explicit env opt-in)
//   - GITHUB_TOKEN non-empty
//   - Client non-nil
//   - Remote branch published (when RequireRemotePublished=true)
//   - DryRun=false
//
// V7.3 NEVER publishes status. Status is exclusively V7.4.
// V7.3 NEVER merges. V7.3 NEVER pushes.
package github

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"
)

// ─── Types ───────────────────────────────────────────────────────────────────

// RealPROpenInput carries all inputs required to open a supervised real PR.
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

// RealPROpenResult is the outcome of OpenRealPR.
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

// ─── OpenRealPR ───────────────────────────────────────────────────────────────

// OpenRealPR opens a GitHub Pull Request in a gated, supervised manner.
// It validates the PRPlan, owner/repo, write gate, and remote publish state
// before calling Client.OpenPR exactly once.
//
// It NEVER calls Client.PublishStatus — that is exclusively V7.4.
// It NEVER merges. It NEVER pushes.
func OpenRealPR(ctx context.Context, input RealPROpenInput) RealPROpenResult {
	res := RealPROpenResult{
		DryRun:     input.DryRun,
		BaseBranch: input.Plan.BaseBranch,
		HeadBranch: input.Plan.WorkBranch,
		Title:      input.Plan.Title,
	}

	block := func(reason string) RealPROpenResult {
		res.Blocked = true
		res.BlockReason = RedactSecrets(reason)
		return res
	}

	// ── 1. Validate PRPlan ───────────────────────────────────────
	if err := validateOpenPRPlan(input.Plan); err != nil {
		return block(err.Error())
	}

	// ── 2. Validate owner/repo ───────────────────────────────────
	if err := validateOwnerRepo(input.Owner, input.Repo); err != nil {
		return block(err.Error())
	}

	// ── 3. Validate remote published ─────────────────────────────
	if input.RequireRemotePublished && !input.RemotePublished {
		return block("remote branch not published — call PublishRemoteBranch first")
	}
	// Real mode always requires remote published, regardless of RequireRemotePublished flag.
	if !input.DryRun && !input.RemotePublished {
		return block("remote branch not published — call PublishRemoteBranch first (required in real mode)")
	}

	// ── 4. All validations passed — WouldOpen=true ───────────────
	res.WouldOpen = true

	// ── 5. Dry-run path — no client call ─────────────────────────
	if input.DryRun || input.Client == nil && !requiresRealCall(input) {
		if input.DryRun {
			res.OK = true
			return res
		}
	}
	if input.DryRun {
		res.OK = true
		return res
	}

	// ── 6. Real call gates ────────────────────────────────────────
	if input.Client == nil {
		return block("client is nil — provide a PRClient implementation")
	}
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return block("github write disabled: set VISION_GITHUB_WRITE=1 to enable real PR open")
	}
	if os.Getenv("GITHUB_TOKEN") == "" {
		return block("GITHUB_TOKEN is not set — required for real PR open")
	}

	// ── 7. Call OpenPR exactly once — NEVER PublishStatus ────────
	req := OpenPRRequest{
		Owner:      input.Owner,
		Repo:       input.Repo,
		BaseBranch: input.Plan.BaseBranch,
		HeadBranch: input.Plan.WorkBranch,
		Title:      input.Plan.Title,
		Body:       input.Plan.Body,
	}
	resp, err := input.Client.OpenPR(ctx, req)
	if err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}

	res.OK = true
	res.PROpened = true
	res.PRNumber = resp.Number
	res.PRURL = resp.URL
	return res
}

// requiresRealCall returns true when DryRun=false — used for internal logic clarity.
func requiresRealCall(input RealPROpenInput) bool {
	return !input.DryRun
}

// ─── validateOpenPRPlan ───────────────────────────────────────────────────────

var protectedBranches = map[string]bool{
	"main":                     true,
	"master":                   true,
	"v6-go-enterprise-runtime": true,
}

func validateOpenPRPlan(plan PRPlan) error {
	switch {
	case !plan.CanOpenPR:
		return fmt.Errorf("plan.can_open_pr is false: %s", plan.BlockReason)
	case !plan.PassGoldRequired:
		return fmt.Errorf("pass_gold_required must be true")
	case !plan.PassSecureRequired:
		return fmt.Errorf("pass_secure_required must be true")
	case plan.StatusContext != DefaultStatusContext:
		return fmt.Errorf("plan.status_context must be %q, got %q", DefaultStatusContext, plan.StatusContext)
	case plan.StatusState != "success":
		return fmt.Errorf("plan.status_state must be \"success\", got %q", plan.StatusState)
	case plan.BaseBranch == "":
		return fmt.Errorf("plan.base_branch is empty")
	case plan.WorkBranch == "":
		return fmt.Errorf("plan.work_branch is empty")
	case !strings.HasPrefix(plan.WorkBranch, "vision/remediation/"):
		return fmt.Errorf("plan.work_branch must start with \"vision/remediation/\", got %q", plan.WorkBranch)
	case protectedBranches[plan.WorkBranch]:
		return fmt.Errorf("plan.work_branch %q is a protected branch", plan.WorkBranch)
	case plan.WorkBranch == plan.BaseBranch:
		return fmt.Errorf("plan.work_branch must not equal plan.base_branch")
	case len(plan.ChangedFiles) == 0:
		return fmt.Errorf("plan.changed_files is empty")
	case strings.TrimSpace(plan.Title) == "":
		return fmt.Errorf("plan.title is empty")
	case strings.TrimSpace(plan.Body) == "":
		return fmt.Errorf("plan.body is empty")
	}
	return nil
}

// ─── validateOwnerRepo ────────────────────────────────────────────────────────

var safeOwnerRepoRE = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)

func validateOwnerRepo(owner, repo string) error {
	if err := validateSingleOwnerRepo("owner", owner); err != nil {
		return err
	}
	return validateSingleOwnerRepo("repo", repo)
}

func validateSingleOwnerRepo(field, value string) error {
	if value == "" {
		return fmt.Errorf("%s is empty", field)
	}
	if strings.Contains(value, "/") {
		return fmt.Errorf("%s must not contain slash: %q", field, value)
	}
	if strings.Contains(value, "\\") {
		return fmt.Errorf("%s must not contain backslash: %q", field, value)
	}
	if strings.Contains(value, "..") {
		return fmt.Errorf("%s must not contain \"..\": %q", field, value)
	}
	if strings.ContainsAny(value, " \t\n\r") {
		return fmt.Errorf("%s must not contain whitespace: %q", field, value)
	}
	// Reject URLs
	if strings.HasPrefix(strings.ToLower(value), "http") {
		return fmt.Errorf("%s must not be a URL: %q", field, value)
	}
	// Reject shell metacharacters
	if strings.ContainsAny(value, ";|&$`(){}!<>") {
		return fmt.Errorf("%s contains unsafe characters: %q", field, value)
	}
	if !safeOwnerRepoRE.MatchString(value) {
		return fmt.Errorf("%s contains invalid characters (allowed: A-Za-z0-9_.-): %q", field, value)
	}
	return nil
}
