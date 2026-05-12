package dryrun_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/visioncore/go-core/internal/dryrun"
)

// ── ApplyPatch ────────────────────────────────────────────────────────────────

func TestDryRunApplyPatch_AlwaysDryRun(t *testing.T) {
	r := dryrun.DryRunApplyPatch(dryrun.ApplyPatchInput{File: "README.md"})
	if !r.DryRun {
		t.Error("dry_run must be true")
	}
	if !r.ReadOnly {
		t.Error("read_only must be true")
	}
	if r.Version != dryrun.Version {
		t.Errorf("expected version %q, got %q", dryrun.Version, r.Version)
	}
}

func TestDryRunApplyPatch_DoesNotModifyFile(t *testing.T) {
	root := t.TempDir()
	content := "VISION SAFE CONTENT"
	path := filepath.Join(root, "safe.go")
	os.WriteFile(path, []byte(content), 0o644)

	dryrun.DryRunApplyPatch(dryrun.ApplyPatchInput{
		Root:    root,
		File:    "safe.go",
		Find:    "VISION",
		Replace: "REPLACED",
		Mode:    "exact_match",
	})

	after, _ := os.ReadFile(path)
	if string(after) != content {
		t.Error("DryRunApplyPatch must not modify file")
	}
}

func TestDryRunApplyPatch_FindPresentReturnWouldApplyTrue(t *testing.T) {
	root := t.TempDir()
	os.WriteFile(filepath.Join(root, "test.go"), []byte("hello world"), 0o644)

	r := dryrun.DryRunApplyPatch(dryrun.ApplyPatchInput{
		Root: root, File: "test.go", Find: "hello", Replace: "hi", Mode: "exact_match",
	})
	if !r.WouldApply {
		t.Error("expected would_apply=true when find string present")
	}
}

func TestDryRunApplyPatch_FindAbsentReturnWouldApplyFalse(t *testing.T) {
	root := t.TempDir()
	os.WriteFile(filepath.Join(root, "test.go"), []byte("hello world"), 0o644)

	r := dryrun.DryRunApplyPatch(dryrun.ApplyPatchInput{
		Root: root, File: "test.go", Find: "NOT_PRESENT_XYZ", Replace: "x", Mode: "exact_match",
	})
	if r.WouldApply {
		t.Error("expected would_apply=false when find string absent")
	}
}

func TestDryRunApplyPatch_PathTraversalBlocked(t *testing.T) {
	r := dryrun.DryRunApplyPatch(dryrun.ApplyPatchInput{File: "../secret.go"})
	if !r.Blocked {
		t.Error("path traversal must be blocked")
	}
	if r.WouldApply {
		t.Error("blocked patch must not would_apply")
	}
}

func TestDryRunApplyPatch_DangerousPathBlocked(t *testing.T) {
	r := dryrun.DryRunApplyPatch(dryrun.ApplyPatchInput{File: ".env"})
	if !r.Blocked {
		t.Error(".env must be blocked")
	}
}

func TestDryRunApplyPatch_RequiresGates(t *testing.T) {
	r := dryrun.DryRunApplyPatch(dryrun.ApplyPatchInput{File: "README.md"})
	if !r.PassGoldRequired {
		t.Error("pass_gold_required must be true")
	}
	if !r.PassSecureRequired {
		t.Error("pass_secure_required must be true")
	}
}

// ── WriteFile ─────────────────────────────────────────────────────────────────

func TestDryRunWriteFile_AlwaysDryRun(t *testing.T) {
	r := dryrun.DryRunWriteFile(dryrun.WriteFileInput{File: "tmp.txt", Content: "x", Operation: "create"})
	if !r.DryRun {
		t.Error("dry_run must be true")
	}
	if !r.ReadOnly {
		t.Error("read_only must be true")
	}
}

func TestDryRunWriteFile_DoesNotCreateFile(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "tmp-v82-dryrun-test.txt")

	dryrun.DryRunWriteFile(dryrun.WriteFileInput{
		Root: root, File: "tmp-v82-dryrun-test.txt", Content: "test", Operation: "create",
	})

	if _, err := os.Stat(target); err == nil {
		t.Error("DryRunWriteFile must not create the file")
	}
}

func TestDryRunWriteFile_DotEnvBlocked(t *testing.T) {
	r := dryrun.DryRunWriteFile(dryrun.WriteFileInput{File: ".env", Content: "x", Operation: "overwrite"})
	if !r.Blocked {
		t.Error(".env write must be blocked")
	}
	if r.WouldWrite {
		t.Error("blocked write must not would_write")
	}
}

func TestDryRunWriteFile_PathTraversalBlocked(t *testing.T) {
	r := dryrun.DryRunWriteFile(dryrun.WriteFileInput{File: "../../etc/passwd", Content: "x", Operation: "overwrite"})
	if !r.Blocked {
		t.Error("path traversal must be blocked")
	}
}

func TestDryRunWriteFile_SecretContentBlocked(t *testing.T) {
	r := dryrun.DryRunWriteFile(dryrun.WriteFileInput{
		File: "config.txt", Content: "ghp_ABCDEF123456789", Operation: "create",
	})
	if !r.Blocked {
		t.Error("content with secret token must be blocked")
	}
}

func TestDryRunWriteFile_SafeFileWouldWrite(t *testing.T) {
	r := dryrun.DryRunWriteFile(dryrun.WriteFileInput{
		File: "docs/notes.md", Content: "# Notes", Operation: "create",
	})
	if !r.WouldWrite {
		t.Errorf("safe file should would_write=true, blocked=%v reasons=%v", r.Blocked, r.BlockedReasons)
	}
}

func TestDryRunWriteFile_RequiresGates(t *testing.T) {
	r := dryrun.DryRunWriteFile(dryrun.WriteFileInput{File: "ok.txt", Content: "x", Operation: "create"})
	if !r.PassGoldRequired || !r.PassSecureRequired {
		t.Error("both gates must be required")
	}
}

// ── GitHubFlow ────────────────────────────────────────────────────────────────

func TestDryRunGitHubFlow_AlwaysDryRun(t *testing.T) {
	r := dryrun.DryRunGitHubFlow(dryrun.GitHubFlowInput{
		WorkBranch: "vision/remediation/test", ChangedFiles: []string{"go-core/main.go"},
	})
	if !r.DryRun || !r.ReadOnly {
		t.Error("dry_run and read_only must be true")
	}
}

func TestDryRunGitHubFlow_NoRealOpsPerformed(t *testing.T) {
	// The function must be deterministic — call it many times and verify
	// no git process is spawned (we can't easily check, but we verify no panic
	// and that results are correct)
	for i := 0; i < 3; i++ {
		r := dryrun.DryRunGitHubFlow(dryrun.GitHubFlowInput{
			MissionID:    "test_mission",
			ChangedFiles: []string{"file.go"},
		})
		if !r.DryRun {
			t.Error("must be dry_run")
		}
	}
}

func TestDryRunGitHubFlow_WouldFields(t *testing.T) {
	r := dryrun.DryRunGitHubFlow(dryrun.GitHubFlowInput{
		MissionID:    "m1",
		IssueType:    "cors_blocked",
		BaseBranch:   "v6-go-enterprise-runtime",
		WorkBranch:   "vision/remediation/m1",
		Title:        "VISION remediation dry run",
		ChangedFiles: []string{"go-core/internal/mcpserver/mcpserver.go"},
	})
	if !r.WouldCreateBranch || !r.WouldCommit || !r.WouldPush || !r.WouldOpenPR || !r.WouldPublishStatus {
		t.Errorf("all would_ fields must be true for valid input: %+v", r)
	}
	if r.Blocked {
		t.Errorf("valid input must not be blocked: %v", r.BlockedReasons)
	}
}

func TestDryRunGitHubFlow_MainBranchBlocked(t *testing.T) {
	r := dryrun.DryRunGitHubFlow(dryrun.GitHubFlowInput{
		WorkBranch: "vision/remediation/x", BaseBranch: "main",
		ChangedFiles: []string{"file.go"},
	})
	if !r.Blocked {
		t.Error("main base branch must be blocked")
	}
}

func TestDryRunGitHubFlow_EmptyChangedFilesBlocked(t *testing.T) {
	r := dryrun.DryRunGitHubFlow(dryrun.GitHubFlowInput{
		WorkBranch: "vision/remediation/x", BaseBranch: "v6-go-enterprise-runtime",
	})
	if !r.Blocked {
		t.Error("empty changed_files must be blocked")
	}
}

func TestDryRunGitHubFlow_RequiredGates(t *testing.T) {
	r := dryrun.DryRunGitHubFlow(dryrun.GitHubFlowInput{
		WorkBranch: "vision/remediation/x", ChangedFiles: []string{"f.go"},
	})
	found := map[string]bool{}
	for _, g := range r.RequiredGates {
		found[g] = true
	}
	if !found["PASS_GOLD"] || !found["PASS_SECURE"] {
		t.Errorf("required_gates must include PASS_GOLD and PASS_SECURE: %v", r.RequiredGates)
	}
}

// ── Mission ───────────────────────────────────────────────────────────────────

func TestDryRunMission_AlwaysDryRun(t *testing.T) {
	r := dryrun.DryRunMission(dryrun.MissionInput{Input: "test"})
	if !r.DryRun || !r.ReadOnly {
		t.Error("dry_run and read_only must be true")
	}
}

func TestDryRunMission_NoPatchNoReport(t *testing.T) {
	r := dryrun.DryRunMission(dryrun.MissionInput{Input: "CORS origin blocked", Mode: "remediation_plan"})
	if r.WouldPatch {
		t.Error("would_patch must be false in dry-run")
	}
	if r.WouldCreateReport {
		t.Error("would_create_report must be false in dry-run")
	}
}

func TestDryRunMission_AgentsListed(t *testing.T) {
	r := dryrun.DryRunMission(dryrun.MissionInput{Input: "test"})
	if len(r.Agents) == 0 {
		t.Error("agents list must not be empty")
	}
}

func TestDryRunMission_EmptyInputBlocked(t *testing.T) {
	r := dryrun.DryRunMission(dryrun.MissionInput{Input: ""})
	if !r.Blocked {
		t.Error("empty input must be blocked")
	}
}

func TestDryRunMission_DoesNotWriteFiles(t *testing.T) {
	root := t.TempDir()
	before := countFiles(t, root)

	dryrun.DryRunMission(dryrun.MissionInput{Input: "CORS origin blocked", Root: root, Mode: "remediation_plan"})

	after := countFiles(t, root)
	if after != before {
		t.Errorf("DryRunMission created files: before=%d after=%d", before, after)
	}
}

// ── RiskAssessment ────────────────────────────────────────────────────────────

func TestDryRunRiskAssessment_AlwaysDryRun(t *testing.T) {
	r := dryrun.DryRunRiskAssessment(dryrun.RiskAssessmentInput{
		Files: []string{"file.go"}, Operation: "patch",
	})
	if !r.DryRun || !r.ReadOnly {
		t.Error("dry_run and read_only must be true")
	}
}

func TestDryRunRiskAssessment_DangerousPathBlocked(t *testing.T) {
	r := dryrun.DryRunRiskAssessment(dryrun.RiskAssessmentInput{
		Files:     []string{".env", "go-core/internal/mcpserver/mcpserver.go"},
		Operation: "patch",
	})
	if !r.Blocked {
		t.Error(".env must cause blocked=true")
	}
	if r.RiskLevel != dryrun.RiskCritical && r.RiskLevel != dryrun.RiskHigh {
		t.Errorf("expected high/critical risk for .env, got %q", r.RiskLevel)
	}
}

func TestDryRunRiskAssessment_DeployAlwaysBlocked(t *testing.T) {
	r := dryrun.DryRunRiskAssessment(dryrun.RiskAssessmentInput{
		Files: []string{"ok.go"}, Operation: "deploy",
	})
	if !r.Blocked {
		t.Error("deploy must always be blocked")
	}
}

func TestDryRunRiskAssessment_RequiredGates(t *testing.T) {
	r := dryrun.DryRunRiskAssessment(dryrun.RiskAssessmentInput{
		Files: []string{"ok.go"}, Operation: "patch",
	})
	found := map[string]bool{}
	for _, g := range r.RequiredGates {
		found[g] = true
	}
	if !found["PASS_GOLD"] || !found["PASS_SECURE"] {
		t.Errorf("required_gates must include PASS_GOLD and PASS_SECURE: %v", r.RequiredGates)
	}
}

func TestDryRunRiskAssessment_SafeFileIsLowRisk(t *testing.T) {
	r := dryrun.DryRunRiskAssessment(dryrun.RiskAssessmentInput{
		Files: []string{"docs/notes.md"}, Operation: "patch",
	})
	if r.RiskLevel != dryrun.RiskLow {
		t.Errorf("expected low risk for docs/notes.md, got %q", r.RiskLevel)
	}
	if r.Blocked {
		t.Errorf("safe file should not be blocked: %v", r.BlockedReasons)
	}
}

func TestDryRunRiskAssessment_ScoreRange(t *testing.T) {
	r := dryrun.DryRunRiskAssessment(dryrun.RiskAssessmentInput{
		Files: []string{"file.go"}, Operation: "patch",
	})
	if r.RiskScore < 0 || r.RiskScore > 100 {
		t.Errorf("risk_score must be 0-100, got %d", r.RiskScore)
	}
}

// ── helpers ───────────────────────────────────────────────────────────────────

func countFiles(t *testing.T, root string) int {
	t.Helper()
	count := 0
	filepath.Walk(root, func(_ string, info os.FileInfo, _ error) error {
		if info != nil && !info.IsDir() {
			count++
		}
		return nil
	})
	return count
}
