// internal/github/open_pr_test.go
// VISION AEGIS CORE ENTERPRISE — V7.3 REAL PR OPEN TESTS
// No real GitHub calls. No internet. No tokens leaked.
package github

import (
	"context"
	"fmt"
	"os"
	"testing"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func validOpenPRPlan() PRPlan {
	return PRPlan{
		CanOpenPR:          true,
		PassGoldRequired:   true,
		PassSecureRequired: true,
		StatusContext:      DefaultStatusContext,
		StatusState:        "success",
		BaseBranch:         "v6-go-enterprise-runtime",
		WorkBranch:         "vision/remediation/test-mission",
		Title:              "VISION remediation: cors_blocked",
		Body:               "Supervised remediation applied by Vision Aegis Core.",
		ChangedFiles:       []string{"backend/server.js"},
	}
}

func validOpenPRInput(client PRClient) RealPROpenInput {
	return RealPROpenInput{
		Plan:                   validOpenPRPlan(),
		Client:                 client,
		Owner:                  "myorg",
		Repo:                   "myrepo",
		DryRun:                 true,
		RequireWriteGate:       true,
		RequireRemotePublished: true,
		RemotePublished:        true,
	}
}

// ─── Dry-run ─────────────────────────────────────────────────────────────────

func TestOpenRealPR_DryRun_ValidPlan_DoesNotCallClient(t *testing.T) {
	mock := &MockPRClient{}
	input := validOpenPRInput(mock)
	input.DryRun = true

	res := OpenRealPR(context.Background(), input)

	if !res.OK {
		t.Errorf("expected OK=true in dry-run, blocked=%v reason=%q err=%q", res.Blocked, res.BlockReason, res.Error)
	}
	if !res.WouldOpen {
		t.Error("expected WouldOpen=true in dry-run with valid plan")
	}
	if res.PROpened {
		t.Error("PROpened must be false in dry-run")
	}
	if mock.OpenPRCalled {
		t.Error("Client.OpenPR must NOT be called in dry-run")
	}
	if mock.PublishStatusCalled {
		t.Error("Client.PublishStatus must NOT be called in dry-run (V7.3 never calls it)")
	}
}

// ─── Real mocked PR open ─────────────────────────────────────────────────────

func TestOpenRealPR_Real_MockClient_OpensPR(t *testing.T) {
	mock := &MockPRClient{}
	input := validOpenPRInput(mock)
	input.DryRun = false

	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake-token-v73-test")

	res := OpenRealPR(context.Background(), input)

	if !res.OK {
		t.Errorf("expected OK=true, blocked=%v reason=%q err=%q", res.Blocked, res.BlockReason, res.Error)
	}
	if !res.PROpened {
		t.Error("expected PROpened=true")
	}
	if res.PRNumber == 0 {
		t.Error("expected PRNumber > 0")
	}
	if res.PRURL == "" {
		t.Error("expected PRURL non-empty")
	}
	if !mock.OpenPRCalled {
		t.Error("Client.OpenPR must be called exactly once")
	}
	if mock.PublishStatusCalled {
		t.Error("Client.PublishStatus must NOT be called by V7.3")
	}
}

// ─── Blocks: write gate ───────────────────────────────────────────────────────

func TestOpenRealPR_BlocksWithoutVisionGithubWrite(t *testing.T) {
	_ = os.Unsetenv("VISION_GITHUB_WRITE")
	t.Setenv("GITHUB_TOKEN", "fake-token")
	mock := &MockPRClient{}
	input := validOpenPRInput(mock)
	input.DryRun = false

	res := OpenRealPR(context.Background(), input)
	if res.OK && res.PROpened {
		t.Error("expected block without VISION_GITHUB_WRITE=1")
	}
	if mock.OpenPRCalled {
		t.Error("OpenPR must not be called without write gate")
	}
}

func TestOpenRealPR_BlocksWithoutGithubToken(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	_ = os.Unsetenv("GITHUB_TOKEN")
	mock := &MockPRClient{}
	input := validOpenPRInput(mock)
	input.DryRun = false

	res := OpenRealPR(context.Background(), input)
	if res.PROpened {
		t.Error("expected block without GITHUB_TOKEN")
	}
}

func TestOpenRealPR_BlocksWithNilClient(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")
	input := validOpenPRInput(nil)
	input.DryRun = false

	res := OpenRealPR(context.Background(), input)
	if res.PROpened {
		t.Error("expected block with nil client")
	}
}

// ─── Blocks: remote published ─────────────────────────────────────────────────

func TestOpenRealPR_BlocksWhenRemoteNotPublished(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.RequireRemotePublished = true
	input.RemotePublished = false

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when remote not published and RequireRemotePublished=true")
	}
}

func TestOpenRealPR_AllowsWhenRequireRemotePublishedFalse(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.RequireRemotePublished = false
	input.RemotePublished = false
	input.DryRun = true

	res := OpenRealPR(context.Background(), input)
	if res.Blocked {
		t.Errorf("expected no block when RequireRemotePublished=false, reason=%q", res.BlockReason)
	}
}

// ─── Blocks: plan validation ─────────────────────────────────────────────────

func TestOpenRealPR_BlocksWhenCanOpenPRFalse(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.CanOpenPR = false
	input.Plan.BlockReason = "pass_gold is false"

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when CanOpenPR=false")
	}
}

func TestOpenRealPR_BlocksWrongStatusContext(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.StatusContext = "wrong/context"

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for wrong StatusContext")
	}
}

func TestOpenRealPR_BlocksWrongStatusState(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.StatusState = "pending"

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when StatusState != success")
	}
}

func TestOpenRealPR_BlocksEmptyChangedFiles(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.ChangedFiles = []string{}

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when ChangedFiles empty")
	}
}

func TestOpenRealPR_BlocksWorkBranchNotVisionRemediation(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.WorkBranch = "feature/something"

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when WorkBranch not vision/remediation/*")
	}
}

func TestOpenRealPR_BlocksProtectedBranches(t *testing.T) {
	protected := []string{"main", "master", "v6-go-enterprise-runtime"}
	for _, branch := range protected {
		input := validOpenPRInput(&MockPRClient{})
		// Craft a branch that starts with vision/remediation/ but collides with protected
		// (protected branches are checked directly)
		input.Plan.WorkBranch = branch
		res := OpenRealPR(context.Background(), input)
		if !res.Blocked {
			t.Errorf("expected block for protected branch %q", branch)
		}
	}
}

func TestOpenRealPR_BlocksWorkBranchEqualsBaseBranch(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.WorkBranch = "vision/remediation/test"
	input.Plan.BaseBranch = "vision/remediation/test"

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when WorkBranch == BaseBranch")
	}
}

func TestOpenRealPR_BlocksEmptyTitle(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.Title = ""

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for empty Title")
	}
}

func TestOpenRealPR_BlocksEmptyBody(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.Body = ""

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for empty Body")
	}
}

// ─── Blocks: owner/repo validation ───────────────────────────────────────────

func TestOpenRealPR_BlocksInsecureOwnerRepo(t *testing.T) {
	cases := []struct {
		owner, repo string
	}{
		{"", "myrepo"},
		{"myorg", ""},
		{"my org", "myrepo"},
		{"myorg", "my/repo"},
		{"myorg", "my\\repo"},
		{"myorg", "my..repo"},
		{"http://evil.com", "myrepo"},
		{"myorg", "repo;rm -rf /"},
		{"my|org", "repo"},
	}
	for _, c := range cases {
		input := validOpenPRInput(&MockPRClient{})
		input.Owner = c.owner
		input.Repo = c.repo

		res := OpenRealPR(context.Background(), input)
		if !res.Blocked {
			t.Errorf("expected block for owner=%q repo=%q", c.owner, c.repo)
		}
	}
}

// ─── Redaction ────────────────────────────────────────────────────────────────

func TestOpenRealPR_RedactsTokensFromClientErrors(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "ghp_TESTTOKEN123456789012345678901234")

	secrets := []string{
		"ghp_LEAKED",
		"github_pat_LEAKED_TOKEN_VALUE",
		"x-access-token:secretvalue",
		"Authorization: Bearer ghp_secret",
	}

	for _, secret := range secrets {
		errClient := &errorPRClient{err: fmt.Errorf("call failed: %s", secret)}
		input := validOpenPRInput(errClient)
		input.DryRun = false
		// Force GITHUB_TOKEN for this specific case
		os.Setenv("GITHUB_TOKEN", "fake-test-token")

		res := OpenRealPR(context.Background(), input)
		if res.Error != "" && containsSecretPattern(res.Error) {
			t.Errorf("Error field leaks secret pattern: %q (from secret=%q)", res.Error, secret)
		}
		if res.BlockReason != "" && containsSecretPattern(res.BlockReason) {
			t.Errorf("BlockReason field leaks secret pattern: %q", res.BlockReason)
		}
	}
}

// ─── MockPRClient extension for publish tracking ────────────────────────────

// MockPRClient is already defined in pr.go — extend tracking with PublishStatusCalled.
// We check via a wrapper that tracks both calls.
func TestOpenRealPR_MockClientTracksCallsCorrectly(t *testing.T) {
	mock := &MockPRClient{}
	if mock.OpenPRCalled {
		t.Error("OpenPRCalled should start false")
	}
	if mock.PublishStatusCalled {
		t.Error("PublishStatusCalled should start false")
	}
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// errorPRClient is a PRClient that always returns an error from OpenPR.
type errorPRClient struct {
	err error
}

func (e *errorPRClient) OpenPR(_ context.Context, _ OpenPRRequest) (OpenPRResponse, error) {
	return OpenPRResponse{}, e.err
}

func (e *errorPRClient) PublishStatus(_ context.Context, _ StatusRequest) error {
	return nil
}

// containsSecretPattern checks for known secret prefixes in a string.
func containsSecretPattern(s string) bool {
	patterns := []string{"ghp_", "github_pat_", "x-access-token", "Authorization: Bearer"}
	lower := s
	for _, p := range patterns {
		if len(lower) >= len(p) {
			for i := 0; i <= len(lower)-len(p); i++ {
				if lower[i:i+len(p)] == p {
					return true
				}
			}
		}
	}
	return false
}

// ═══════════════════════════════════════════════════════════════════
// HOTFIX V7.3 — hardened gate tests
// ═══════════════════════════════════════════════════════════════════

func TestOpenRealPR_BlocksWhenPassGoldRequiredFalse(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.PassGoldRequired = false

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when PassGoldRequired=false")
	}
	if res.PROpened {
		t.Error("PROpened must be false when PassGoldRequired=false")
	}
}

func TestOpenRealPR_BlocksWhenPassSecureRequiredFalse(t *testing.T) {
	input := validOpenPRInput(&MockPRClient{})
	input.Plan.PassSecureRequired = false

	res := OpenRealPR(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when PassSecureRequired=false")
	}
	if res.PROpened {
		t.Error("PROpened must be false when PassSecureRequired=false")
	}
}

func TestOpenRealPR_RealMode_BlocksEvenIfRequireRemotePublishedFalse(t *testing.T) {
	// Real mode NEVER opens PR if RemotePublished=false, regardless of RequireRemotePublished.
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake-token")
	mock := &MockPRClient{}
	input := validOpenPRInput(mock)
	input.DryRun = false
	input.RequireRemotePublished = false // flag off
	input.RemotePublished = false        // not published

	res := OpenRealPR(context.Background(), input)
	if res.PROpened {
		t.Error("real mode must block when RemotePublished=false even if RequireRemotePublished=false")
	}
	if mock.OpenPRCalled {
		t.Error("OpenPR must not be called when remote not published in real mode")
	}
}

func TestOpenRealPR_DryRun_AllowedWhenRequireRemotePublishedFalseAndNotPublished(t *testing.T) {
	// Dry-run is still allowed when RequireRemotePublished=false and RemotePublished=false.
	input := validOpenPRInput(&MockPRClient{})
	input.DryRun = true
	input.RequireRemotePublished = false
	input.RemotePublished = false

	res := OpenRealPR(context.Background(), input)
	if res.Blocked {
		t.Errorf("dry-run should not be blocked when RequireRemotePublished=false, reason=%q", res.BlockReason)
	}
	if !res.WouldOpen {
		t.Error("expected WouldOpen=true in valid dry-run")
	}
}

func TestOpenRealPR_V73_NeverCallsPublishStatus(t *testing.T) {
	// V7.3 must never call PublishStatus under any conditions.
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")
	mock := &MockPRClient{}
	input := validOpenPRInput(mock)
	input.DryRun = false

	OpenRealPR(context.Background(), input)
	if mock.PublishStatusCalled {
		t.Error("V7.3 OpenRealPR must NEVER call Client.PublishStatus")
	}
}

func TestOpenRealPR_RedactionOnOpenPRDryRunAwareErrors(t *testing.T) {
	// Errors from OpenPRDryRunAware must not leak tokens.
	t.Setenv("VISION_GITHUB_WRITE", "1")
	secrets := []string{
		"ghp_DRYRUN_LEAKED",
		"github_pat_LEAKED_DRYRUN",
		"x-access-token:leakedvalue",
		"Authorization: Bearer ghp_dryrun",
	}
	for _, secret := range secrets {
		errClient := &errorPRClient{err: fmt.Errorf("flow failed: %s", secret)}
		input := OpenFlowInput{
			DryRun:  false,
			Plan:    validOpenPRPlan(),
			Client:  errClient,
			Request: OpenPRRequest{Owner: "org", Repo: "repo"},
			Status:  StatusRequest{},
		}
		res := OpenPRDryRunAware(context.Background(), input)
		if res.Error != "" && containsSecretPattern(res.Error) {
			t.Errorf("OpenPRDryRunAware Error leaks secret pattern from: %q — got: %q", secret, res.Error)
		}
	}
}
