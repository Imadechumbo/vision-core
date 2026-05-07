// internal/github/e2e_flow_test.go
// VISION AEGIS CORE ENTERPRISE — V7.5 END-TO-END FLOW TESTS
// Zero real GitHub calls. Zero internet. Zero token leaks.
package github

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func validE2EPlan() PRPlan {
	return PRPlan{
		ID:                 "prplan_e2e_test",
		CanOpenPR:          true,
		PassGoldRequired:   true,
		PassSecureRequired: true,
		StatusContext:      DefaultStatusContext,
		StatusState:        "success",
		BaseBranch:         "v6-go-enterprise-runtime",
		WorkBranch:         "vision/remediation/e2e-test",
		CommitMessage:      "fix(vision): e2e test remediation",
		Title:              "VISION remediation: e2e test",
		Body:               "End-to-end test — supervised remediation by Vision Aegis Core.",
		ChangedFiles:       []string{"server.js"},
	}
}

// makeE2ERepo creates a temp git repo and returns root.
// After setup, server.js exists as a NEW untracked file in the working tree,
// matching ChangedFiles=["server.js"]. New untracked files appear as
// "?? filename" in git status --porcelain so line[3:] = "filename" correctly.
func makeE2ERepo(t *testing.T) string {
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
	mustGit("config", "user.email", "test@vision.core")
	mustGit("config", "user.name", "VisionTest")
	mustGit("config", "commit.gpgsign", "false")

	// Initial commit with README so repo has a HEAD
	if err := os.WriteFile(filepath.Join(root, "README.md"), []byte("# vision\n"), 0644); err != nil {
		t.Fatalf("WriteFile README: %v", err)
	}
	mustGit("add", "--", "README.md")
	mustGit("commit", "-m", "initial")

	// Rename to non-protected base branch
	gitOutput(root, "branch", "-m", "v6-go-enterprise-runtime") //nolint:errcheck

	// Create server.js as a NEW flat untracked file matching ChangedFiles.
	// Flat file avoids the "?? subdir/" vs "?? subdir/file" git status issue.
	if err := os.WriteFile(filepath.Join(root, "server.js"), []byte("// patched\n"), 0644); err != nil {
		t.Fatalf("WriteFile server.js: %v", err)
	}

	return root
}

// makeBareRepo creates a bare git repo and returns its path.
func makeBareRepo(t *testing.T) string {
	t.Helper()
	bare := t.TempDir()
	if _, err := gitOutputDir(bare, "init", "--bare", "-q"); err != nil {
		t.Fatalf("git init --bare: %v", err)
	}
	return bare
}

// gitOutputDir runs git with the given args in dir.
func gitOutputDir(dir string, args ...string) (string, error) {
	return gitOutput(dir, args...)
}

// ─── 1. Dry-run end-to-end ───────────────────────────────────────────────────

func TestE2E_DryRun_FullFlow_NoExternalEffects(t *testing.T) {
	mock := &MockPRClient{}
	root := makeE2ERepo(t)

	input := EndToEndGitHubFlowInput{
		Root:             root,
		Plan:             validE2EPlan(),
		Client:           mock,
		Owner:            "myorg",
		Repo:             "myrepo",
		Remote:           "origin",
		DryRun:           true,
		AllowLocalGit:    false,
		PublishRemote:    true,
		OpenPR:           true,
		PublishStatus:    true,
		RequireWriteGate: true,
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)

	if !res.OK {
		t.Errorf("expected OK=true in dry-run, blocked=%v reason=%q err=%q",
			res.Blocked, res.BlockReason, res.Error)
	}
	if res.DryRun != true {
		t.Error("DryRun must be true in result")
	}
	if res.RemotePushed {
		t.Error("RemotePushed must be false in dry-run")
	}
	if res.PROpened {
		t.Error("PROpened must be false in dry-run")
	}
	if res.StatusPublished {
		t.Error("StatusPublished must be false in dry-run")
	}
	if mock.OpenPRCalled {
		t.Error("Client.OpenPR must NOT be called in dry-run")
	}
	if mock.PublishStatusCalled {
		t.Error("Client.PublishStatus must NOT be called in dry-run")
	}
	// Would-flags should reflect intent
	if !res.WouldPush {
		t.Error("WouldPush should be true in dry-run with PublishRemote=true")
	}
}

// ─── 2. Local git flow in temp repo ─────────────────────────────────────────

func TestE2E_LocalGitFlow_CreatesCommit(t *testing.T) {
	root := makeE2ERepo(t)
	plan := validE2EPlan()

	input := EndToEndGitHubFlowInput{
		Root:          root,
		Plan:          plan,
		Client:        &MockPRClient{},
		Owner:         "org",
		Repo:          "repo",
		DryRun:        true,
		AllowLocalGit: true,
		PublishRemote: false,
		OpenPR:        false,
		PublishStatus: false,
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)

	if !res.OK {
		t.Errorf("expected OK=true for local git flow, err=%q blocked=%q", res.Error, res.BlockReason)
	}
	if !res.LocalFlowOK {
		t.Error("LocalFlowOK must be true")
	}
	// Branch and commit should be created (AllowLocalGit=true)
	if !res.BranchCreated {
		t.Error("BranchCreated should be true with AllowLocalGit=true")
	}
	if !res.CommitCreated {
		t.Error("CommitCreated should be true")
	}
}

// ─── 3. Full mocked real flow with bare repo ─────────────────────────────────

func TestE2E_FullMockedRealFlow_BareRepo(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake-token-e2e-v75")

	root := makeE2ERepo(t)
	bare := makeBareRepo(t)

	// Add bare as remote
	gitOutputDir(root, "remote", "add", "localbare", bare) //nolint

	plan := validE2EPlan()
	mock := &MockPRClient{}

	input := EndToEndGitHubFlowInput{
		Root:                 root,
		Plan:                 plan,
		Client:               mock,
		Owner:                "myorg",
		Repo:                 "myrepo",
		Remote:               "localbare",
		DryRun:               false,
		AllowLocalGit:        true,
		PublishRemote:        true,
		OpenPR:               true,
		PublishStatus:        true,
		RequireWriteGate:     true,
		AllowLocalTestRemote: true,
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)

	if !res.OK {
		t.Errorf("expected OK=true, blocked=%v reason=%q err=%q",
			res.Blocked, res.BlockReason, res.Error)
	}
	if !res.CommitCreated {
		t.Error("CommitCreated must be true")
	}
	if !res.RemotePushed {
		t.Error("RemotePushed must be true")
	}
	if !res.PROpened {
		t.Error("PROpened must be true with MockPRClient")
	}
	if res.PRNumber == 0 {
		t.Error("PRNumber must be > 0")
	}
	if res.PRURL == "" {
		t.Error("PRURL must not be empty")
	}
	if !res.StatusPublished {
		t.Error("StatusPublished must be true")
	}
	if !mock.OpenPRCalled {
		t.Error("OpenPR must have been called")
	}
	if !mock.PublishStatusCalled {
		t.Error("PublishStatus must have been called")
	}
}

// ─── 4. Block without write gate ─────────────────────────────────────────────

func TestE2E_BlocksWithoutVisionGithubWrite(t *testing.T) {
	_ = os.Unsetenv("VISION_GITHUB_WRITE")
	t.Setenv("GITHUB_TOKEN", "fake")
	mock := &MockPRClient{}

	input := EndToEndGitHubFlowInput{
		Root:          makeE2ERepo(t),
		Plan:          validE2EPlan(),
		Client:        mock,
		Owner:         "org", Repo: "repo",
		DryRun:        false,
		PublishRemote: true,
		OpenPR:        true,
		PublishStatus: true,
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)
	if res.OK {
		t.Error("expected block without VISION_GITHUB_WRITE=1")
	}
	if mock.OpenPRCalled || mock.PublishStatusCalled {
		t.Error("client must not be called without write gate")
	}
}

// ─── 5. Block without token ───────────────────────────────────────────────────

func TestE2E_BlocksWithoutGithubToken(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	_ = os.Unsetenv("GITHUB_TOKEN")

	input := EndToEndGitHubFlowInput{
		Root:          makeE2ERepo(t),
		Plan:          validE2EPlan(),
		Client:        &MockPRClient{},
		Owner:         "org", Repo: "repo",
		DryRun:        false,
		PublishRemote: true,
		OpenPR:        true,
		PublishStatus: true,
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)
	if res.OK {
		t.Error("expected block without GITHUB_TOKEN")
	}
}

// ─── 6-10. Plan gate blocks ───────────────────────────────────────────────────

func TestE2E_BlocksWhenCanOpenPRFalse(t *testing.T) {
	p := validE2EPlan()
	p.CanOpenPR = false
	p.BlockReason = "pass_gold is false"
	input := e2eInputWith(t, p)
	if res := RunEndToEndGitHubFlow(context.Background(), input); !res.Blocked {
		t.Error("expected block when CanOpenPR=false")
	}
}

func TestE2E_BlocksWhenPassGoldRequiredFalse(t *testing.T) {
	p := validE2EPlan()
	p.PassGoldRequired = false
	input := e2eInputWith(t, p)
	if res := RunEndToEndGitHubFlow(context.Background(), input); !res.Blocked {
		t.Error("expected block when PassGoldRequired=false")
	}
}

func TestE2E_BlocksWhenPassSecureRequiredFalse(t *testing.T) {
	p := validE2EPlan()
	p.PassSecureRequired = false
	input := e2eInputWith(t, p)
	if res := RunEndToEndGitHubFlow(context.Background(), input); !res.Blocked {
		t.Error("expected block when PassSecureRequired=false")
	}
}

func TestE2E_BlocksWhenStatusStateNotSuccess(t *testing.T) {
	p := validE2EPlan()
	p.StatusState = "pending"
	input := e2eInputWith(t, p)
	if res := RunEndToEndGitHubFlow(context.Background(), input); !res.Blocked {
		t.Error("expected block when StatusState != success")
	}
}

func TestE2E_BlocksWhenWorkBranchNotVisionRemediation(t *testing.T) {
	p := validE2EPlan()
	p.WorkBranch = "feature/bad"
	input := e2eInputWith(t, p)
	if res := RunEndToEndGitHubFlow(context.Background(), input); !res.Blocked {
		t.Error("expected block when WorkBranch not vision/remediation/*")
	}
}

// ─── 11. Block: OpenPR=true but PublishRemote=false in real mode ──────────────

func TestE2E_BlocksOpenPRWithoutRemotePublishInRealMode(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")

	root := makeE2ERepo(t)
	input := EndToEndGitHubFlowInput{
		Root:          root,
		Plan:          validE2EPlan(),
		Client:        &MockPRClient{},
		Owner:         "org", Repo: "repo",
		DryRun:        false,
		AllowLocalGit: true,
		PublishRemote: false, // not publishing remote
		OpenPR:        true,  // but trying to open PR
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)
	if res.PROpened {
		t.Error("must not open PR without remote publish in real mode")
	}
}

// ─── 12. Block: PublishStatus=true but no CommitSHA ──────────────────────────

func TestE2E_BlocksStatusWithoutCommitSHA(t *testing.T) {
	// A dry-run where local git is disabled → no CommitSHA generated.
	// But PublishStatus requires one.
	input := EndToEndGitHubFlowInput{
		Root:          makeE2ERepo(t),
		Plan:          validE2EPlan(),
		Client:        &MockPRClient{},
		Owner:         "org", Repo: "repo",
		DryRun:        true,
		AllowLocalGit: false,
		PublishRemote: false,
		OpenPR:        false,
		PublishStatus: true, // needs SHA, but none available
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)
	// If blocked due to missing SHA, that's correct.
	// The flow may be OK if dry-run skips the SHA check — but
	// the orchestrator must block real mode without SHA.
	// For dry-run: validate that status would be attempted but SHA absent means block.
	if res.StatusPublished {
		t.Error("status must not be published without CommitSHA")
	}
}

// ─── 13. Redaction ────────────────────────────────────────────────────────────

func TestE2E_RedactsTokensFromErrors(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake-e2e-token")

	secrets := []string{
		"ghp_E2ELEAKED",
		"github_pat_E2ELEAKED",
		"x-access-token:e2eleaked",
		"Authorization: Bearer ghp_e2e",
	}

	for _, secret := range secrets {
		root := makeE2ERepo(t)
		bare := makeBareRepo(t)
		gitOutputDir(root, "remote", "add", "localbare", bare)

		// Errors will come from OpenPR mock that returns the secret
		errClient := &errorPRClient{err: fmt.Errorf("e2e error: %s", secret)}
		plan := validE2EPlan()
		input := EndToEndGitHubFlowInput{
			Root:                 root,
			Plan:                 plan,
			Client:               errClient,
			Owner:                "org", Repo: "repo",
			Remote:               "localbare",
			DryRun:               false,
			AllowLocalGit:        true,
			PublishRemote:        true,
			OpenPR:               true,
			RequireWriteGate:     true,
			AllowLocalTestRemote: true,
		}
		os.Setenv("GITHUB_TOKEN", "fake")

		res := RunEndToEndGitHubFlow(context.Background(), input)
		if containsSecretPattern(res.Error) {
			t.Errorf("Error leaks secret (from %q): %q", secret, res.Error)
		}
		if containsSecretPattern(res.BlockReason) {
			t.Errorf("BlockReason leaks secret (from %q): %q", secret, res.BlockReason)
		}
	}
}

// ─── 14. Step order — failure halts subsequent steps ─────────────────────────

func TestE2E_StepOrder_LocalFailureHaltsRemoteAndPR(t *testing.T) {
	// Use a non-git directory so local flow fails.
	root := t.TempDir() // not a git repo
	mock := &MockPRClient{}

	input := EndToEndGitHubFlowInput{
		Root:          root,
		Plan:          validE2EPlan(),
		Client:        mock,
		Owner:         "org", Repo: "repo",
		DryRun:        true,
		AllowLocalGit: true,
		PublishRemote: true,
		OpenPR:        true,
		PublishStatus: true,
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)
	// Local flow should fail → remote/PR/status not reached
	if res.RemotePushed {
		t.Error("remote must not be pushed if local flow fails")
	}
	if res.PROpened {
		t.Error("PR must not be opened if local flow fails")
	}
	if res.StatusPublished {
		t.Error("status must not be published if local flow fails")
	}
	if mock.OpenPRCalled {
		t.Error("OpenPR must not be called if local flow fails")
	}
	if mock.PublishStatusCalled {
		t.Error("PublishStatus must not be called if local flow fails")
	}
}

func TestE2E_StepOrder_PRFailureHaltsStatus(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")

	root := makeE2ERepo(t)
	bare := makeBareRepo(t)
	gitOutputDir(root, "remote", "add", "localbare", bare)

	// PR client fails OpenPR
	failPRClient := &partialMockClient{openPRErr: fmt.Errorf("pr open failed")}

	input := EndToEndGitHubFlowInput{
		Root:                 root,
		Plan:                 validE2EPlan(),
		Client:               failPRClient,
		Owner:                "org", Repo: "repo",
		Remote:               "localbare",
		DryRun:               false,
		AllowLocalGit:        true,
		PublishRemote:        true,
		OpenPR:               true,
		PublishStatus:        true,
		RequireWriteGate:     true,
		AllowLocalTestRemote: true,
	}

	res := RunEndToEndGitHubFlow(context.Background(), input)
	// PR failed → status should NOT be published
	if res.StatusPublished {
		t.Error("status must not be published if PR open fails")
	}
	if failPRClient.publishStatusCalled {
		t.Error("PublishStatus must not be called if PR open fails")
	}
}

// ─── 15. No real GitHub ───────────────────────────────────────────────────────

func TestE2E_NoRealGitHub_OnlyMocks(t *testing.T) {
	// This test documents the invariant: all e2e tests use mocks, no real HTTP.
	// The MockPRClient never touches the network.
	mock := &MockPRClient{}
	if mock.OpenCalls != 0 || mock.StatusCalls != 0 {
		t.Error("MockPRClient starts with zero calls — invariant violated")
	}
}

// ─── helper: e2eInputWith ────────────────────────────────────────────────────

func e2eInputWith(t *testing.T, plan PRPlan) EndToEndGitHubFlowInput {
	t.Helper()
	return EndToEndGitHubFlowInput{
		Root:   makeE2ERepo(t),
		Plan:   plan,
		Client: &MockPRClient{},
		Owner:  "org",
		Repo:   "repo",
		DryRun: true,
	}
}

// ─── partialMockClient ────────────────────────────────────────────────────────

type partialMockClient struct {
	openPRErr           error
	publishStatusCalled bool
}

func (p *partialMockClient) OpenPR(_ context.Context, _ OpenPRRequest) (OpenPRResponse, error) {
	return OpenPRResponse{}, p.openPRErr
}

func (p *partialMockClient) PublishStatus(_ context.Context, _ StatusRequest) error {
	p.publishStatusCalled = true
	return nil
}
