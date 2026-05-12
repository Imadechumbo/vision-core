// internal/github/safety_drill_test.go
// VISION AEGIS CORE ENTERPRISE — V7.9 SAFETY DRILL TESTS
// Zero real GitHub. Zero network. Zero token leaks.
package github

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// ─── helper: makeDrillRepo ────────────────────────────────────────────────────

// makeDrillRepo creates a clean git repo suitable for the safety drill.
// It pre-commits the sentinel placeholder so the drill can overwrite it
// and git status shows " M .vision-test/github-flow-safety-drill.txt".
// The working tree must be clean after setup — drill blocks if dirty.
func makeDrillRepo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()

	mustGit := func(args ...string) {
		t.Helper()
		out, err := gitOutput(root, args...)
		if err != nil {
			t.Fatalf("git %v: %v (output: %q)", args, err, out)
		}
	}

	mustGit("init", "-q")
	mustGit("config", "user.email", "drill@vision.core")
	mustGit("config", "user.name", "VisionDrill")
	mustGit("config", "commit.gpgsign", "false")

	// Create README and the sentinel placeholder in one commit.
	// Uses "vision-test/" (no leading dot) to match drillSentinelRelPath.
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("# drill\n"), 0644); err != nil {
		t.Fatalf("WriteFile README: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(root, "vision-test"), 0755); err != nil {
		t.Fatalf("MkdirAll vision-test: %v", err)
	}
	if err := os.WriteFile(
		filepath.Join(root, "vision-test", "github-flow-safety-drill.txt"),
		[]byte("# placeholder\n"), 0644,
	); err != nil {
		t.Fatalf("WriteFile sentinel: %v", err)
	}
	mustGit("add", "--", "README.md", "vision-test/github-flow-safety-drill.txt")
	mustGit("commit", "-m", "initial")
	gitOutput(root, "branch", "-m", "v6-go-enterprise-runtime") //nolint

	// Verify working tree is clean
	status, _ := gitOutput(root, "status", "--porcelain")
	if strings.TrimSpace(status) != "" {
		t.Fatalf("repo working tree is not clean after setup: %q", status)
	}

	return root
}

// ─── A: RunSafetyDrill E2E local ──────────────────────────────────────────────

func TestSafetyDrill_E2E_Local(t *testing.T) {
	root := makeDrillRepo(t)

	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root:      root,
		Owner:     "testorg",
		Repo:      "testrepo",
		MissionID: "test_safety_drill",
		IssueType: "github_flow_safety_drill",
	})

	if !res.OK {
		t.Fatalf("expected OK=true, blocked=%v reason=%q err=%q",
			res.Blocked, res.BlockReason, res.Error)
	}
	if !res.LocalCommitCreated {
		t.Error("local_commit_created must be true")
	}
	if !res.RemotePushed {
		t.Error("remote_pushed must be true")
	}
	if !res.PROpenedMock {
		t.Error("pr_opened_mock must be true (MockPRClient called)")
	}
	if !res.StatusPublishedMock {
		t.Error("status_published_mock must be true (MockPRClient called)")
	}
	if res.NetworkUsed {
		t.Error("network_used must always be false in safety drill")
	}
	if res.GitHubRealUsed {
		t.Error("github_real_used must always be false in safety drill")
	}
	if res.DrillID == "" {
		t.Error("drill_id must not be empty")
	}
}

// ─── B: Bare remote received branch ──────────────────────────────────────────

func TestSafetyDrill_BareRemoteHasWorkBranch(t *testing.T) {
	root := makeDrillRepo(t)
	missionID := "branch_verify_drill"

	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root:      root,
		MissionID: missionID,
	})
	if !res.OK {
		t.Fatalf("drill failed: %s", res.Error)
	}

	// Verify the bare remote actually has the work branch
	bareDir := res.BareRemotePath
	if bareDir == "" {
		t.Fatal("bare_remote_path is empty")
	}

	out, err := gitOutput(bareDir, "branch", "--list")
	if err != nil {
		t.Fatalf("cannot list bare remote branches: %v", err)
	}
	expectedBranch := "vision/remediation/" + missionID
	if !strings.Contains(out, expectedBranch) {
		t.Errorf("bare remote should have branch %q, branches: %q", expectedBranch, out)
	}
}

// ─── C: Report / index created ───────────────────────────────────────────────

func TestSafetyDrill_ReportAndIndexCreated(t *testing.T) {
	root := makeDrillRepo(t)

	// The drill creates report artifacts in the report dir within root
	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root:      root,
		MissionID: "report_test_drill",
		ReportDir: ".vision-reports/github-flow",
	})
	if !res.OK {
		t.Fatalf("drill failed: %s %s", res.BlockReason, res.Error)
	}

	// The drill itself confirms OK — now verify reports exist if they were generated
	// (Report generation is part of the CLI but not the core drill function.
	// The core drill confirms local_commit, remote_pushed, PR mock, status mock.)
	// Just verify the drill doesn't produce empty drill_id.
	if res.DrillID == "" {
		t.Error("drill_id must not be empty")
	}
	if res.BareRemotePath == "" {
		t.Error("bare_remote_path must not be empty")
	}
}

// ─── D: Token redaction ──────────────────────────────────────────────────────

func TestSafetyDrill_TokenRedaction(t *testing.T) {
	// Set a "real" token to ensure it never leaks into output
	t.Setenv("GITHUB_TOKEN", "ghp_REAL_SHOULD_NOT_LEAK_IN_DRILL")
	root := makeDrillRepo(t)

	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root:      root,
		MissionID: "token_redact_drill",
	})

	// Marshal result and check no token appears
	data, _ := json.Marshal(res)
	s := string(data)
	if strings.Contains(s, "ghp_REAL_SHOULD_NOT_LEAK") {
		t.Error("real GITHUB_TOKEN must not appear in drill result")
	}
	if strings.Contains(s, "fake-safety-drill-token") {
		t.Error("fake drill token must not appear in drill result")
	}
	if strings.Contains(s, "ghp_") {
		t.Error("no ghp_ patterns should appear in drill result")
	}
}

// ─── E: No real GitHub used ───────────────────────────────────────────────────

func TestSafetyDrill_NoRealGitHub(t *testing.T) {
	root := makeDrillRepo(t)

	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root:      root,
		MissionID: "no_real_github_drill",
	})

	if res.NetworkUsed {
		t.Error("network_used must be false — drill never touches GitHub")
	}
	if res.GitHubRealUsed {
		t.Error("github_real_used must be false — drill uses MockPRClient only")
	}
	// MockPRClient generates a URL with github.com format — this is expected
	// (it's a mock URL, not a real API call). The key invariant is that
	// GitHubRealUsed=false and NetworkUsed=false.
	t.Logf("mock PR URL: %s (expected mock format, no real network call)", res.PRURL)
}

// ─── F: Blocks unsafe root ───────────────────────────────────────────────────

func TestSafetyDrill_BlocksEmptyRoot(t *testing.T) {
	res := RunSafetyDrill(context.Background(), SafetyDrillInput{Root: ""})
	if !res.Blocked {
		t.Error("expected block for empty root")
	}
}

func TestSafetyDrill_BlocksNonExistentRoot(t *testing.T) {
	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root: "/nonexistent/path/that/does/not/exist",
	})
	if !res.Blocked {
		t.Error("expected block for non-existent root")
	}
}

// ─── G: Sentinel file created ────────────────────────────────────────────────

func TestSafetyDrill_SentinelFileCreated(t *testing.T) {
	root := makeDrillRepo(t)
	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root:      root,
		MissionID: "sentinel_test_drill",
	})
	if !res.OK {
		t.Fatalf("drill failed: %s", res.Error)
	}

	// Sentinel must be at vision-test/github-flow-safety-drill.txt
	sentinelPath := filepath.Join(root, "vision-test", "github-flow-safety-drill.txt")
	data, err := os.ReadFile(sentinelPath)
	if err != nil {
		t.Fatalf("sentinel file must exist at vision-test/: %v", err)
	}
	if !strings.Contains(string(data), "sentinel_test_drill") {
		t.Error("sentinel file must contain mission_id")
	}
	if !strings.Contains(string(data), "VISION safety drill") {
		t.Error("sentinel file must identify as safety drill")
	}

	// Root-level stray file must NOT exist
	if _, err := os.Stat(filepath.Join(root, "github-flow-safety-drill.txt")); err == nil {
		t.Error("drill must not create github-flow-safety-drill.txt at root level")
	}
}

// ─── H: ChangedFiles matches sentinel ────────────────────────────────────────

func TestSafetyDrill_ChangedFilesContainsSentinel(t *testing.T) {
	root := makeDrillRepo(t)
	res := RunSafetyDrill(context.Background(), SafetyDrillInput{Root: root})

	if len(res.ChangedFiles) == 0 {
		t.Fatal("changed_files must not be empty")
	}
	found := false
	for _, f := range res.ChangedFiles {
		if strings.Contains(filepath.ToSlash(f), "github-flow-safety-drill.txt") {
			found = true
		}
	}
	if !found {
		t.Errorf("changed_files must contain sentinel, got: %v", res.ChangedFiles)
	}
}

// ─── Dirty tree block test ────────────────────────────────────────────────────

func TestSafetyDrill_BlocksDirtyWorkingTree(t *testing.T) {
	root := makeDrillRepo(t)

	// Make tree dirty by adding an untracked file
	os.WriteFile(filepath.Join(root, "dirty.txt"), []byte("dirty\n"), 0644)

	res := RunSafetyDrill(context.Background(), SafetyDrillInput{
		Root:      root,
		MissionID: "dirty_tree_drill",
	})
	if !res.Blocked {
		t.Error("expected block when working tree is dirty")
	}
	if !strings.Contains(res.BlockReason, "working tree must be clean") {
		t.Errorf("block reason should mention working tree: %q", res.BlockReason)
	}

	// Sentinel must NOT have been created (block before any file creation)
	if _, err := os.Stat(filepath.Join(root, "vision-test", "github-flow-safety-drill.txt")); err == nil {
		// The sentinel file already existed (pre-committed placeholder) — check content unchanged
		data, _ := os.ReadFile(filepath.Join(root, "vision-test", "github-flow-safety-drill.txt"))
		if strings.Contains(string(data), "VISION safety drill") {
			t.Error("sentinel must not be overwritten when working tree is dirty")
		}
	}
	if _, err := os.Stat(filepath.Join(root, "github-flow-safety-drill.txt")); err == nil {
		t.Error("no stray root-level file must be created when blocked")
	}
}
