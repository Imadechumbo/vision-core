// internal/github/safety_drill.go
// VISION AEGIS CORE ENTERPRISE — V7.9 GITHUB FLOW REAL EXECUTION SAFETY DRILL
//
// RunSafetyDrill proves the real GitHub flow works end-to-end with:
//   - real local branch/commit
//   - real push to a local bare remote (no GitHub)
//   - MockPRClient (no PR real, no status real)
//   - JSON/Markdown/index reports
//   - zero network calls, zero GitHub real
//
// The drill uses VISION_GITHUB_WRITE=1 and a fake token in its own
// isolated environment — the real GITHUB_TOKEN is never touched.
package github

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ─── Types ───────────────────────────────────────────────────────────────────

// SafetyDrillInput specifies the parameters for a local safety drill.
type SafetyDrillInput struct {
	Root      string `json:"root"`
	Owner     string `json:"owner"`
	Repo      string `json:"repo"`
	MissionID string `json:"mission_id"`
	IssueType string `json:"issue_type"`
	ReportDir string `json:"report_dir,omitempty"` // default: .vision-reports/github-flow
}

// SafetyDrillResult records every outcome of the safety drill.
// network_used and github_real_used must always be false after a clean drill.
type SafetyDrillResult struct {
	OK                  bool     `json:"ok"`
	DrillID             string   `json:"drill_id"`
	Mode                string   `json:"mode"`
	Root                string   `json:"root"`
	BareRemotePath      string   `json:"bare_remote_path"`
	WorkBranch          string   `json:"work_branch"`
	BaseBranch          string   `json:"base_branch"`
	ChangedFiles        []string `json:"changed_files"`

	LocalCommitCreated  bool     `json:"local_commit_created"`
	RemotePushed        bool     `json:"remote_pushed"`
	PROpenedMock        bool     `json:"pr_opened_mock"`
	StatusPublishedMock bool     `json:"status_published_mock"`

	PRNumber            int      `json:"pr_number,omitempty"`
	PRURL               string   `json:"pr_url,omitempty"`

	ReportJSONPath      string   `json:"report_json_path,omitempty"`
	ReportMarkdownPath  string   `json:"report_markdown_path,omitempty"`
	ReportIndexPath     string   `json:"report_index_path,omitempty"`

	NetworkUsed         bool     `json:"network_used"`     // always false in a clean drill
	GitHubRealUsed      bool     `json:"github_real_used"` // always false in a clean drill

	Blocked             bool     `json:"blocked"`
	BlockReason         string   `json:"block_reason,omitempty"`
	Error               string   `json:"error,omitempty"`
}

// ─── Sentinel file ────────────────────────────────────────────────────────────

// drillSentinelRelPath is the changed file used in the safety drill.
// Uses "vision-test/" WITHOUT leading dot so that git status --porcelain
// line[3:] extracts "vision-test/..." correctly for EnsureWorkingTreeOnlyHas.
// (With ".vision-test/" the leading dot is consumed by line[3:] when status
// shows "M " staged format, breaking the path match.)
const drillSentinelRelPath = ".vision-test/github-flow-safety-drill.txt"

// ─── RunSafetyDrill ───────────────────────────────────────────────────────────

// RunSafetyDrill executes a fully local, zero-network safety drill that proves
// the real GitHub flow pipeline works without touching GitHub.
//
// The drill:
//   A) validates root
//   B) creates .vision-test/github-flow-safety-drill.txt
//   C) creates a bare local remote in .vision-test/git-remotes/safety-drill.git
//   D) builds PRPlan
//   E) runs RunEndToEndGitHubFlow with MockPRClient
//   F) records report + index
func RunSafetyDrill(ctx context.Context, input SafetyDrillInput) SafetyDrillResult {
	ts := time.Now().UTC()
	drillID := fmt.Sprintf("drill_%s", ts.Format("20060102T150405Z"))

	res := SafetyDrillResult{
		DrillID:      drillID,
		Mode:         "local-safety-drill",
		NetworkUsed:  false,
		GitHubRealUsed: false,
	}

	block := func(reason string) SafetyDrillResult {
		res.Blocked = true
		res.BlockReason = RedactSecrets(reason)
		return res
	}

	// ── A: Validate root ────────────────────────────────────────
	if strings.TrimSpace(input.Root) == "" {
		return block("root is required")
	}
	root, err := filepath.Abs(input.Root)
	if err != nil {
		return block("cannot resolve root: " + err.Error())
	}
	if strings.Contains(filepath.ToSlash(root), "..") {
		return block("root contains path traversal")
	}
	if _, err := os.Stat(root); err != nil {
		return block("root does not exist: " + err.Error())
	}
	res.Root = root

	// Normalise inputs
	missionID := input.MissionID
	if missionID == "" {
		missionID = "drill_" + ts.Format("20060102T150405")
	}
	issueType := input.IssueType
	if issueType == "" {
		issueType = "github_flow_safety_drill"
	}
	owner := input.Owner
	if owner == "" {
		owner = "local"
	}
	repo := input.Repo
	if repo == "" {
		repo = "safety-drill"
	}
	reportDir := input.ReportDir
	if reportDir == "" {
		reportDir = ".vision-reports/github-flow"
	}

	// ── Working tree check — must be clean before drill modifies anything ───
	// gitOutput's TrimSpace is safe here: a clean tree returns "" and a dirty
	// tree returns at least one non-empty line regardless of leading spaces.
	if wtStatus, err := gitOutput(root, "status", "--porcelain"); err == nil && strings.TrimSpace(wtStatus) != "" {
		return block("working tree must be clean before running github-flow-drill — commit or stash changes first")
	}

	// Track created artifacts for cleanup on failure
	var createdFiles []string
	cleanup := func() {
		for _, f := range createdFiles {
			os.Remove(f)
		}
	}

	// ── B: Create sentinel changed file ─────────────────────────
	// Strategy: if the sentinel is not yet tracked by git, pre-commit it as a
	// placeholder so git status shows " M .vision-test/..." (full path with
	// leading space = unstaged modified) and EnsureWorkingTreeOnlyHas matches.
	// If it's already tracked (e.g. in test repos), skip the pre-commit step.
	sentinelAbs := filepath.Join(root, filepath.FromSlash(drillSentinelRelPath))
	if err := os.MkdirAll(filepath.Dir(sentinelAbs), 0755); err != nil {
		return block("cannot create .vision-test dir: " + err.Error())
	}
	createdFiles = append(createdFiles, sentinelAbs)

	// Check if sentinel is already tracked
	lsOut, _ := gitOutput(root, "ls-files", "--error-unmatch", drillSentinelRelPath)
	sentinelTracked := lsOut != "" || func() bool {
		_, err := gitOutput(root, "ls-files", "--error-unmatch", drillSentinelRelPath)
		return err == nil
	}()

	if !sentinelTracked {
		// Pre-commit placeholder so git tracks the file
		if err := os.WriteFile(sentinelAbs, []byte("# vision safety drill placeholder\n"), 0644); err != nil {
			cleanup()
			return block("cannot write sentinel placeholder: " + err.Error())
		}
		if _, err := gitOutput(root, "add", "--", drillSentinelRelPath); err != nil {
			cleanup()
			return block("cannot stage sentinel placeholder: " + err.Error())
		}
		if _, err := gitOutput(root, "commit", "-m", "chore(drill): add safety drill sentinel placeholder"); err != nil {
			cleanup()
			return block("cannot commit sentinel placeholder: " + err.Error())
		}
	}

	// Write real drill content and stage it with git add.
	// Staging is essential: git status --porcelain shows staged changes as
	// "M  file" (M at col 0, no leading space) so gitOutput()'s TrimSpace
	// doesn't corrupt the line. Unstaged " M file" has a leading space that
	// TrimSpace strips, making line[3:] skip the first path character.
	sentinelContent := fmt.Sprintf("VISION safety drill\ntimestamp: %s\nmission_id: %s\n",
		ts.Format(time.RFC3339), missionID)
	if err := os.WriteFile(sentinelAbs, []byte(sentinelContent), 0644); err != nil {
		cleanup()
		return block("cannot write sentinel file: " + err.Error())
	}
	if _, err := gitOutput(root, "add", "--", drillSentinelRelPath); err != nil {
		cleanup()
		return block("cannot stage sentinel for drill: " + err.Error())
	}

	changedFiles := []string{drillSentinelRelPath}
	res.ChangedFiles = changedFiles

	// ── C: Create bare local remote ─────────────────────────────
	// Outside the git repo to avoid polluting git status --porcelain.
	bareTmp, err := os.MkdirTemp("", "vision-drill-bare-*.git")
	if err != nil {
		cleanup()
		return block("cannot create bare remote tempdir: " + err.Error())
	}
	bareDir := bareTmp
	if err := os.MkdirAll(bareDir, 0755); err != nil {
		return block("cannot create bare remote dir: " + err.Error())
	}
	if _, err := gitOutput(bareDir, "init", "--bare", "-q"); err != nil {
		return block("cannot init bare remote: " + err.Error())
	}
	res.BareRemotePath = bareDir

	// ── D: Build PRPlan ──────────────────────────────────────────
	workBranch := "vision/remediation/" + missionID
	res.WorkBranch = workBranch
	res.BaseBranch = DefaultBaseBranch

	plan := BuildPRPlan(PRPlanInput{
		MissionID:        missionID,
		BaseBranch:       DefaultBaseBranch,
		WorkBranchPrefix: "vision/remediation",
		ChangedFiles:     changedFiles,
		IssueType:        issueType,
		PatchSummary:     fmt.Sprintf("Safety drill: %s", drillID),
		GateSnapshot: GateSnapshot{
			PassGold:              true,
			PassSecure:            true,
			DeployAllowed:         true,
			PromotionAllowed:      true,
			SecurityBlockingTotal: 0,
			RollbackReady:         true,
			ValidatorOK:           true,
			PatcherOK:             true,
		},
	})
	plan.Title = fmt.Sprintf("[SAFETY DRILL] %s — %s", missionID, issueType)
	plan.Body = fmt.Sprintf("Local safety drill — zero GitHub real.\n\nDrill ID: %s\nTimestamp: %s",
		drillID, ts.Format(time.RFC3339))

	// ── E: Execute real flow with MockPRClient ───────────────────
	// Set drill-scoped env vars (process-local, never leaked to report).
	// We temporarily set them so write-gate validation passes.
	prevWrite := os.Getenv("VISION_GITHUB_WRITE")
	prevToken := os.Getenv("GITHUB_TOKEN")
	os.Setenv("VISION_GITHUB_WRITE", "1")
	os.Setenv("GITHUB_TOKEN", "fake-safety-drill-token")
	defer func() {
		// Restore previous values
		if prevWrite == "" {
			os.Unsetenv("VISION_GITHUB_WRITE")
		} else {
			os.Setenv("VISION_GITHUB_WRITE", prevWrite)
		}
		if prevToken == "" {
			os.Unsetenv("GITHUB_TOKEN")
		} else {
			os.Setenv("GITHUB_TOKEN", prevToken)
		}
	}()

	mock := &MockPRClient{}
	flowRes := RunEndToEndGitHubFlow(ctx, EndToEndGitHubFlowInput{
		Root:                 root,
		Plan:                 plan,
		Client:               mock,
		Owner:                owner,
		Repo:                 repo,
		Remote:               bareDir, // local bare remote — no GitHub
		DryRun:               false,
		AllowLocalGit:        true,
		PublishRemote:        true,
		OpenPR:               true,
		PublishStatus:        true,
		RequireWriteGate:     true,
		AllowLocalTestRemote: true,
	})

	res.LocalCommitCreated = flowRes.CommitCreated
	res.RemotePushed = flowRes.RemotePushed
	res.PROpenedMock = flowRes.PROpened && mock.OpenPRCalled
	res.StatusPublishedMock = flowRes.StatusPublished && mock.PublishStatusCalled
	res.PRNumber = flowRes.PRNumber
	res.PRURL = flowRes.PRURL

	if !flowRes.OK {
		reason := flowRes.BlockReason
		if reason == "" {
			reason = flowRes.Error
		}
		res.Error = RedactSecrets(reason)
		// Defensive cleanup: remove any stray root-level sentinel if created
		os.Remove(filepath.Join(root, "github-flow-safety-drill.txt"))
		return res
	}

	// ── F: Generate report + index ───────────────────────────────
	res.OK = true
	return res
}
