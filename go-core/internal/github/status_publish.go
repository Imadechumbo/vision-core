// internal/github/status_publish.go
// VISION AEGIS CORE ENTERPRISE — V7.4 REAL PASS GOLD STATUS CHECK PUBLICATION
//
// PublishPassGoldStatus publishes a GitHub commit status check for PASS GOLD
// only when all gates are satisfied:
//   - PRPlan fully validated
//   - CommitSHA is a valid full SHA (40 hex chars)
//   - VISION_GITHUB_WRITE=1
//   - GITHUB_TOKEN non-empty
//   - Client non-nil
//   - DryRun=false
//
// V7.4 NEVER opens PRs. V7.4 NEVER merges. V7.4 NEVER pushes.
// PR opening is exclusively V7.3. This function only calls Client.PublishStatus.
package github

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"
)

// ─── Types ───────────────────────────────────────────────────────────────────

// PassGoldStatusInput carries all inputs for publishing a PASS GOLD status check.
type PassGoldStatusInput struct {
	Plan             PRPlan
	Client           PRClient
	Owner            string
	Repo             string
	CommitSHA        string
	DryRun           bool
	RequireWriteGate bool
}

// PassGoldStatusResult is the outcome of PublishPassGoldStatus.
type PassGoldStatusResult struct {
	OK              bool   `json:"ok"`
	DryRun          bool   `json:"dry_run"`
	WouldPublish    bool   `json:"would_publish"`
	StatusPublished bool   `json:"status_published"`
	Owner           string `json:"owner"`
	Repo            string `json:"repo"`
	CommitSHA       string `json:"commit_sha"`
	Context         string `json:"context"`
	State           string `json:"state"`
	Description     string `json:"description"`
	Blocked         bool   `json:"blocked"`
	BlockReason     string `json:"block_reason,omitempty"`
	Error           string `json:"error,omitempty"`
}

// ─── PublishPassGoldStatus ────────────────────────────────────────────────────

// PublishPassGoldStatus publishes a GitHub commit status check confirming
// PASS GOLD + PASS SECURE. It calls Client.PublishStatus exactly once.
//
// It NEVER calls Client.OpenPR — that is exclusively V7.3.
// It NEVER merges. It NEVER pushes.
func PublishPassGoldStatus(ctx context.Context, input PassGoldStatusInput) PassGoldStatusResult {
	const (
		statusContext     = DefaultStatusContext // "vision/pass-gold"
		statusState       = "success"
		statusDescription = "PASS GOLD + PASS SECURE confirmed"
	)

	res := PassGoldStatusResult{
		DryRun:    input.DryRun,
		Owner:     input.Owner,
		Repo:      input.Repo,
		CommitSHA: input.CommitSHA,
		Context:   statusContext,
		State:     statusState,
		Description: statusDescription,
	}

	block := func(reason string) PassGoldStatusResult {
		res.Blocked = true
		res.BlockReason = RedactSecrets(reason)
		return res
	}

	// ── 1. Validate PRPlan for status publication ────────────────
	if err := validateStatusPlan(input.Plan); err != nil {
		return block(err.Error())
	}

	// ── 2. Validate owner/repo ───────────────────────────────────
	if err := validateOwnerRepo(input.Owner, input.Repo); err != nil {
		return block(err.Error())
	}

	// ── 3. Validate commit SHA ───────────────────────────────────
	if err := validateCommitSHA(input.CommitSHA); err != nil {
		return block(err.Error())
	}

	// ── 4. All validations passed — WouldPublish=true ───────────
	res.WouldPublish = true

	// ── 5. Dry-run path — no client call ─────────────────────────
	if input.DryRun {
		res.OK = true
		return res
	}

	// ── 6. Real call gates ────────────────────────────────────────
	if input.Client == nil {
		return block("client is nil — provide a PRClient implementation")
	}
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return block("github write disabled: set VISION_GITHUB_WRITE=1 to enable status publication")
	}
	if os.Getenv("GITHUB_TOKEN") == "" {
		return block("GITHUB_TOKEN is not set — required for status publication")
	}

	// ── 7. Call PublishStatus exactly once — NEVER OpenPR ────────
	req := StatusRequest{
		Owner:       input.Owner,
		Repo:        input.Repo,
		SHA:         input.CommitSHA,
		State:       statusState,
		Context:     statusContext,
		Description: statusDescription,
		TargetURL:   "", // V7.4: TargetURL left empty; V7.5+ may populate
	}
	if err := input.Client.PublishStatus(ctx, req); err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}

	res.OK = true
	res.StatusPublished = true
	return res
}

// ─── validateStatusPlan ───────────────────────────────────────────────────────

func validateStatusPlan(plan PRPlan) error {
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
	case !strings.HasPrefix(plan.WorkBranch, "vision/remediation/"):
		return fmt.Errorf("plan.work_branch must start with \"vision/remediation/\", got %q", plan.WorkBranch)
	case len(plan.ChangedFiles) == 0:
		return fmt.Errorf("plan.changed_files is empty")
	}
	return nil
}

// ─── validateCommitSHA ────────────────────────────────────────────────────────

// hexRE matches a full 40-character hex SHA (git standard) or 64-char SHA.
var hexRE40 = regexp.MustCompile(`^[0-9a-f]{40}$`)
var hexRE64 = regexp.MustCompile(`^[0-9a-f]{64}$`)

func validateCommitSHA(sha string) error {
	if sha == "" {
		return fmt.Errorf("commit_sha is empty")
	}
	sha = strings.ToLower(strings.TrimSpace(sha))
	if len(sha) < 40 {
		return fmt.Errorf("commit_sha is too short (%d chars): must be a full 40-char hex SHA", len(sha))
	}
	if hexRE40.MatchString(sha) || hexRE64.MatchString(sha) {
		return nil
	}
	return fmt.Errorf("commit_sha contains invalid characters or wrong length: must be 40-hex chars")
}
