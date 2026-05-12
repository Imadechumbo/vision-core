// internal/github/e2e_flow.go
// VISION AEGIS CORE ENTERPRISE — V7.5 REAL END-TO-END GITHUB FLOW ORCHESTRATION
//
// RunEndToEndGitHubFlow orchestrates the complete supervised GitHub flow:
//
//   PASS GOLD + PASS SECURE
//   → [A] Validate PRPlan
//   → [B] RunControlledPRFlow   (local branch + commit)
//   → [C] PublishRemoteBranch   (if PublishRemote=true)
//   → [D] OpenRealPR            (if OpenPR=true)
//   → [E] PublishPassGoldStatus (if PublishStatus=true)
//
// The order is fixed. Any step failure halts subsequent steps.
// DryRun=true simulates all steps without external effects.
// Escrita real exige VISION_GITHUB_WRITE=1 + GITHUB_TOKEN.
// Sem merge automático.
package github

import (
	"context"
	"os"
)

// ─── Types ───────────────────────────────────────────────────────────────────

// EndToEndGitHubFlowInput is the single input struct for the orchestrator.
type EndToEndGitHubFlowInput struct {
	Root   string
	Plan   PRPlan
	Client PRClient
	Owner  string
	Repo   string
	Remote string // git remote name; defaults to "origin"

	// Feature flags — fine-grained step control
	DryRun        bool
	AllowLocalGit bool // permit real local branch/commit creation
	PublishRemote bool // run PublishRemoteBranch step
	OpenPR        bool // run OpenRealPR step
	PublishStatus bool // run PublishPassGoldStatus step

	RequireWriteGate     bool
	AllowLocalTestRemote bool // allow non-origin remotes (tests only)
}

// EndToEndGitHubFlowResult collects the outcome of every orchestration step.
type EndToEndGitHubFlowResult struct {
	OK       bool   `json:"ok"`
	DryRun   bool   `json:"dry_run"`
	PlanID   string `json:"plan_id"`
	BaseBranch string `json:"base_branch"`
	WorkBranch string `json:"work_branch"`

	// B: local flow
	LocalFlowOK   bool   `json:"local_flow_ok"`
	BranchCreated bool   `json:"branch_created"`
	CommitCreated bool   `json:"commit_created"`
	CommitSHA     string `json:"commit_sha,omitempty"`

	// C: remote publish
	RemotePublishOK bool   `json:"remote_publish_ok"`
	WouldPush       bool   `json:"would_push"`
	RemotePushed    bool   `json:"remote_pushed"`

	// D: open PR
	PROpenOK   bool   `json:"pr_open_ok"`
	WouldOpenPR bool   `json:"would_open_pr"`
	PROpened   bool   `json:"pr_opened"`
	PRNumber   int    `json:"pr_number,omitempty"`
	PRURL      string `json:"pr_url,omitempty"`

	// E: publish status
	StatusOK           bool   `json:"status_ok"`
	WouldPublishStatus bool   `json:"would_publish_status"`
	StatusPublished    bool   `json:"status_published"`

	Blocked     bool   `json:"blocked"`
	BlockReason string `json:"block_reason,omitempty"`
	Error       string `json:"error,omitempty"`
}

// ─── RunEndToEndGitHubFlow ────────────────────────────────────────────────────

// RunEndToEndGitHubFlow orchestrates the full supervised GitHub flow in the
// mandatory order: validate → local git → remote publish → open PR → status.
//
// Any step that fails halts the flow and returns a blocked result.
// All errors are passed through RedactSecrets before being stored.
func RunEndToEndGitHubFlow(ctx context.Context, input EndToEndGitHubFlowInput) EndToEndGitHubFlowResult {
	res := EndToEndGitHubFlowResult{
		DryRun:     input.DryRun,
		PlanID:     input.Plan.ID,
		BaseBranch: input.Plan.BaseBranch,
		WorkBranch: input.Plan.WorkBranch,
	}

	block := func(reason string) EndToEndGitHubFlowResult {
		res.Blocked = true
		res.BlockReason = RedactSecrets(reason)
		return res
	}

	// ── A: Validate PRPlan ──────────────────────────────────────────
	if err := validateE2EPlan(input.Plan); err != nil {
		return block(err.Error())
	}
	if err := validateOwnerRepo(input.Owner, input.Repo); err != nil {
		return block(err.Error())
	}

	// Validate write gate early for real-mode flows — avoids partial execution.
	if !input.DryRun {
		if input.PublishRemote || input.OpenPR || input.PublishStatus {
			if os.Getenv("VISION_GITHUB_WRITE") != "1" {
				return block("github write disabled: set VISION_GITHUB_WRITE=1 to enable real flow")
			}
		}
		if input.OpenPR || input.PublishStatus {
			if os.Getenv("GITHUB_TOKEN") == "" {
				return block("GITHUB_TOKEN is not set — required for PR open and status publication")
			}
		}
	}

	// ── B: Local controlled flow ────────────────────────────────────
	localRes := RunControlledPRFlow(ctx, ControlledFlowInput{
		Root:          input.Root,
		Plan:          input.Plan,
		Client:        input.Client,
		Owner:         input.Owner,
		Repo:          input.Repo,
		DryRun:        input.DryRun,
		AllowLocalGit: input.AllowLocalGit,
	})

	res.LocalFlowOK = localRes.OK
	res.BranchCreated = localRes.BranchCreated
	res.CommitCreated = localRes.CommitCreated
	res.CommitSHA = localRes.CommitSHA
	res.WouldOpenPR = localRes.WouldOpenPR
	res.WouldPublishStatus = localRes.WouldPublishStatus

	if !localRes.OK {
		reason := localRes.Error
		if reason == "" {
			reason = localRes.BlockReason
		}
		return block("local flow failed: " + reason)
	}

	// ── C: Remote publish ───────────────────────────────────────────
	remote := input.Remote
	if remote == "" {
		remote = "origin"
	}

	var remoteResult RemotePublishResult
	if input.PublishRemote {
		// In dry-run without local git, simulate the remote publish without
		// calling PublishRemoteBranch (which requires current branch = work branch).
		// The simulation indicates WouldPush=true if the plan is valid.
		if input.DryRun && !input.AllowLocalGit {
			remoteResult = RemotePublishResult{
				OK:       true,
				DryRun:   true,
				Remote:   remote,
				Branch:   input.Plan.WorkBranch,
				WouldPush: true,
			}
		} else {
			remoteResult = PublishRemoteBranch(ctx, RemotePublishInput{
				Root:                 input.Root,
				Plan:                 input.Plan,
				Remote:               remote,
				DryRun:               input.DryRun,
				RequireWriteGate:     input.RequireWriteGate,
				AllowLocalTestRemote: input.AllowLocalTestRemote,
			})
		}

		res.RemotePublishOK = remoteResult.OK
		res.WouldPush = remoteResult.WouldPush
		res.RemotePushed = remoteResult.Pushed

		// Use SHA from remote publish if available (more reliable post-push SHA).
		if remoteResult.CommitSHA != "" {
			res.CommitSHA = remoteResult.CommitSHA
		}

		if !remoteResult.OK {
			reason := remoteResult.Error
			if reason == "" {
				reason = remoteResult.BlockReason
			}
			return block("remote publish failed: " + reason)
		}
	}

	// ── D: Open PR ──────────────────────────────────────────────────
	if input.OpenPR {
		// Real mode requires remote branch published in the same flow.
		if !input.DryRun && !remoteResult.Pushed {
			return block("remote publish step required before opening real PR")
		}

		// In dry-run, treat as published if remote publish step ran and passed.
		remotePublishedForPR := remoteResult.Pushed || (input.DryRun && remoteResult.OK) || (input.DryRun && !input.PublishRemote)

		prRes := OpenRealPR(ctx, RealPROpenInput{
			Plan:                   input.Plan,
			Client:                 input.Client,
			Owner:                  input.Owner,
			Repo:                   input.Repo,
			DryRun:                 input.DryRun,
			RequireWriteGate:       input.RequireWriteGate,
			RequireRemotePublished: true,
			RemotePublished:        remotePublishedForPR,
		})

		res.PROpenOK = prRes.OK
		res.WouldOpenPR = prRes.WouldOpen
		res.PROpened = prRes.PROpened
		res.PRNumber = prRes.PRNumber
		res.PRURL = prRes.PRURL

		if !prRes.OK && !input.DryRun {
			reason := prRes.Error
			if reason == "" {
				reason = prRes.BlockReason
			}
			return block("PR open failed: " + reason)
		}
		if prRes.Blocked {
			return block("PR open blocked: " + prRes.BlockReason)
		}
	}

	// ── E: Publish PASS GOLD status ─────────────────────────────────
	if input.PublishStatus {
		// CommitSHA: prefer remote publish result, then local flow result.
		commitSHA := res.CommitSHA

		// In dry-run without a real SHA, use a zero-SHA sentinel.
		// PublishPassGoldStatus in dry-run never calls the API,
		// so the SHA is only needed for validation format — supply a valid-format one.
		if commitSHA == "" && input.DryRun {
			commitSHA = "0000000000000000000000000000000000000000"
		}

		if commitSHA == "" {
			return block("commit SHA required for PASS GOLD status publication")
		}

		statusRes := PublishPassGoldStatus(ctx, PassGoldStatusInput{
			Plan:             input.Plan,
			Client:           input.Client,
			Owner:            input.Owner,
			Repo:             input.Repo,
			CommitSHA:        commitSHA,
			DryRun:           input.DryRun,
			RequireWriteGate: input.RequireWriteGate,
		})

		res.StatusOK = statusRes.OK
		res.WouldPublishStatus = statusRes.WouldPublish
		res.StatusPublished = statusRes.StatusPublished

		if !statusRes.OK && !input.DryRun {
			return block("status publication failed: " + statusRes.BlockReason + statusRes.Error)
		}
		if statusRes.Blocked {
			return block("status publication blocked: " + statusRes.BlockReason)
		}
	}

	res.OK = true
	return res
}

// ─── validateE2EPlan ─────────────────────────────────────────────────────────

// validateE2EPlan is the strict gate check for the E2E orchestrator.
// It validates all PRPlan fields required for the full flow.
func validateE2EPlan(plan PRPlan) error {
	// Reuse existing validators from open_pr.go and status_publish.go.
	// They already encode the full contract including PassGoldRequired/PassSecureRequired.
	// For the E2E flow we apply the union of both validators.
	if err := validateOpenPRPlan(plan); err != nil {
		return err
	}
	// validateStatusPlan adds no additional constraints not already in validateOpenPRPlan
	// for plans built by BuildPRPlan, but call it for defence-in-depth.
	return validateStatusPlan(plan)
}
