// internal/github/status_publish_test.go
// VISION AEGIS CORE ENTERPRISE — V7.4 PASS GOLD STATUS PUBLICATION TESTS
// No real GitHub calls. No internet. No tokens leaked.
package github

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

const validSHA40 = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"

func validStatusInput(client PRClient) PassGoldStatusInput {
	plan := validOpenPRPlan()
	return PassGoldStatusInput{
		Plan:             plan,
		Client:           client,
		Owner:            "myorg",
		Repo:             "myrepo",
		CommitSHA:        validSHA40,
		DryRun:           true,
		RequireWriteGate: true,
	}
}

// ─── Dry-run ─────────────────────────────────────────────────────────────────

func TestPublishPassGoldStatus_DryRun_ValidInput_DoesNotCallClient(t *testing.T) {
	mock := &MockPRClient{}
	input := validStatusInput(mock)
	input.DryRun = true

	res := PublishPassGoldStatus(context.Background(), input)

	if !res.OK {
		t.Errorf("expected OK=true in dry-run, blocked=%v reason=%q err=%q", res.Blocked, res.BlockReason, res.Error)
	}
	if !res.WouldPublish {
		t.Error("expected WouldPublish=true in dry-run with valid input")
	}
	if res.StatusPublished {
		t.Error("StatusPublished must be false in dry-run")
	}
	if mock.PublishStatusCalled {
		t.Error("Client.PublishStatus must NOT be called in dry-run")
	}
	if mock.OpenPRCalled {
		t.Error("Client.OpenPR must NEVER be called by V7.4")
	}
}

func TestPublishPassGoldStatus_DryRun_ContextAndStateSet(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.DryRun = true

	res := PublishPassGoldStatus(context.Background(), input)

	if res.Context != DefaultStatusContext {
		t.Errorf("context=%q, want %q", res.Context, DefaultStatusContext)
	}
	if res.State != "success" {
		t.Errorf("state=%q, want success", res.State)
	}
	if !strings.Contains(res.Description, "PASS GOLD") || !strings.Contains(res.Description, "PASS SECURE") {
		t.Errorf("description must mention PASS GOLD + PASS SECURE, got: %q", res.Description)
	}
}

// ─── Real mocked status ───────────────────────────────────────────────────────

func TestPublishPassGoldStatus_Real_MockClient_PublishesStatus(t *testing.T) {
	mock := &MockPRClient{}
	input := validStatusInput(mock)
	input.DryRun = false

	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake-token-v74-test")

	res := PublishPassGoldStatus(context.Background(), input)

	if !res.OK {
		t.Errorf("expected OK=true, blocked=%v reason=%q err=%q", res.Blocked, res.BlockReason, res.Error)
	}
	if !res.StatusPublished {
		t.Error("expected StatusPublished=true")
	}
	if !mock.PublishStatusCalled {
		t.Error("Client.PublishStatus must be called exactly once")
	}
	if mock.OpenPRCalled {
		t.Error("Client.OpenPR must NOT be called by V7.4")
	}
}

func TestPublishPassGoldStatus_Real_CorrectSHAPassedToClient(t *testing.T) {
	var capturedSHA string
	capClient := &captureSHAClient{onPublish: func(req StatusRequest) { capturedSHA = req.SHA }}
	input := validStatusInput(capClient)
	input.DryRun = false

	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.OK {
		t.Fatalf("expected OK=true, err=%q", res.Error)
	}
	if capturedSHA != validSHA40 {
		t.Errorf("wrong SHA passed to client: got %q, want %q", capturedSHA, validSHA40)
	}
}

func TestPublishPassGoldStatus_Real_CorrectContextAndState(t *testing.T) {
	var capturedReq StatusRequest
	capClient := &captureSHAClient{onPublish: func(req StatusRequest) { capturedReq = req }}
	input := validStatusInput(capClient)
	input.DryRun = false

	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")

	PublishPassGoldStatus(context.Background(), input)

	if capturedReq.Context != DefaultStatusContext {
		t.Errorf("wrong context: %q", capturedReq.Context)
	}
	if capturedReq.State != "success" {
		t.Errorf("wrong state: %q", capturedReq.State)
	}
	if !strings.Contains(capturedReq.Description, "PASS GOLD") {
		t.Errorf("description missing PASS GOLD: %q", capturedReq.Description)
	}
}

// ─── Blocks: write gate ───────────────────────────────────────────────────────

func TestPublishPassGoldStatus_BlocksWithoutVisionGithubWrite(t *testing.T) {
	_ = os.Unsetenv("VISION_GITHUB_WRITE")
	t.Setenv("GITHUB_TOKEN", "fake-token")
	mock := &MockPRClient{}
	input := validStatusInput(mock)
	input.DryRun = false

	res := PublishPassGoldStatus(context.Background(), input)
	if res.StatusPublished {
		t.Error("expected block without VISION_GITHUB_WRITE=1")
	}
	if mock.PublishStatusCalled {
		t.Error("PublishStatus must not be called without write gate")
	}
}

func TestPublishPassGoldStatus_BlocksWithoutGithubToken(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	_ = os.Unsetenv("GITHUB_TOKEN")
	mock := &MockPRClient{}
	input := validStatusInput(mock)
	input.DryRun = false

	res := PublishPassGoldStatus(context.Background(), input)
	if res.StatusPublished {
		t.Error("expected block without GITHUB_TOKEN")
	}
}

func TestPublishPassGoldStatus_BlocksWithNilClient(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")
	input := validStatusInput(nil)
	input.DryRun = false

	res := PublishPassGoldStatus(context.Background(), input)
	if res.StatusPublished {
		t.Error("expected block with nil client")
	}
}

// ─── Blocks: SHA validation ───────────────────────────────────────────────────

func TestPublishPassGoldStatus_BlocksEmptySHA(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.CommitSHA = ""

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for empty SHA")
	}
}

func TestPublishPassGoldStatus_BlocksShortSHA(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.CommitSHA = "a1b2c3d4" // too short

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for short SHA")
	}
}

func TestPublishPassGoldStatus_BlocksNonHexSHA(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.CommitSHA = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" // non-hex

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for non-hex SHA")
	}
}

func TestPublishPassGoldStatus_AcceptsValidSHA40(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.CommitSHA = validSHA40
	input.DryRun = true

	res := PublishPassGoldStatus(context.Background(), input)
	if res.Blocked {
		t.Errorf("valid 40-char SHA should not be blocked, reason=%q", res.BlockReason)
	}
}

func TestPublishPassGoldStatus_AcceptsValidSHA64(t *testing.T) {
	sha64 := strings.Repeat("a1b2", 16) // 64 hex chars
	input := validStatusInput(&MockPRClient{})
	input.CommitSHA = sha64
	input.DryRun = true

	res := PublishPassGoldStatus(context.Background(), input)
	if res.Blocked {
		t.Errorf("valid 64-char SHA should not be blocked, reason=%q", res.BlockReason)
	}
}

// ─── Blocks: plan validation ─────────────────────────────────────────────────

func TestPublishPassGoldStatus_BlocksCanOpenPRFalse(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.Plan.CanOpenPR = false

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when CanOpenPR=false")
	}
}

func TestPublishPassGoldStatus_BlocksWrongStatusContext(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.Plan.StatusContext = "wrong/context"

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for wrong StatusContext")
	}
}

func TestPublishPassGoldStatus_BlocksWrongStatusState(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.Plan.StatusState = "failure"

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when StatusState != success")
	}
}

func TestPublishPassGoldStatus_BlocksEmptyChangedFiles(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.Plan.ChangedFiles = []string{}

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for empty ChangedFiles")
	}
}

func TestPublishPassGoldStatus_BlocksWorkBranchNotVisionRemediation(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.Plan.WorkBranch = "feature/something"

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block for WorkBranch not vision/remediation/*")
	}
}

// ─── Blocks: owner/repo ───────────────────────────────────────────────────────

func TestPublishPassGoldStatus_BlocksInsecureOwnerRepo(t *testing.T) {
	cases := []struct{ owner, repo string }{
		{"", "repo"},
		{"org", ""},
		{"my org", "repo"},
		{"org", "re/po"},
		{"org", "re\\po"},
		{"org", "r..o"},
		{"http://evil", "repo"},
		{"org", "repo;evil"},
	}
	for _, c := range cases {
		input := validStatusInput(&MockPRClient{})
		input.Owner = c.owner
		input.Repo = c.repo

		res := PublishPassGoldStatus(context.Background(), input)
		if !res.Blocked {
			t.Errorf("expected block for owner=%q repo=%q", c.owner, c.repo)
		}
	}
}

// ─── Redaction ────────────────────────────────────────────────────────────────

func TestPublishPassGoldStatus_RedactsTokensFromClientErrors(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	os.Setenv("GITHUB_TOKEN", "fake-test-token")

	secrets := []string{
		"ghp_LEAKED_TOKEN_V74",
		"github_pat_LEAKED_VALUE",
		"x-access-token:secretvalue",
		"Authorization: Bearer ghp_v74secret",
	}

	for _, secret := range secrets {
		errClient := &errorStatusClient{err: fmt.Errorf("publish failed: %s", secret)}
		input := validStatusInput(errClient)
		input.DryRun = false

		res := PublishPassGoldStatus(context.Background(), input)
		if res.Error != "" && containsSecretPattern(res.Error) {
			t.Errorf("Error field leaks secret pattern from: %q", secret)
		}
		if res.BlockReason != "" && containsSecretPattern(res.BlockReason) {
			t.Errorf("BlockReason leaks secret pattern from: %q", secret)
		}
	}
}

// ─── V7.4 never opens PR ─────────────────────────────────────────────────────

func TestPublishPassGoldStatus_NeverCallsOpenPR(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")
	mock := &MockPRClient{}
	input := validStatusInput(mock)
	input.DryRun = false

	PublishPassGoldStatus(context.Background(), input)

	if mock.OpenPRCalled {
		t.Error("V7.4 must NEVER call Client.OpenPR")
	}
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

type captureSHAClient struct {
	onPublish func(req StatusRequest)
}

func (c *captureSHAClient) OpenPR(_ context.Context, _ OpenPRRequest) (OpenPRResponse, error) {
	return OpenPRResponse{}, nil
}

func (c *captureSHAClient) PublishStatus(_ context.Context, req StatusRequest) error {
	if c.onPublish != nil {
		c.onPublish(req)
	}
	return nil
}

type errorStatusClient struct {
	err error
}

func (e *errorStatusClient) OpenPR(_ context.Context, _ OpenPRRequest) (OpenPRResponse, error) {
	return OpenPRResponse{}, nil
}

func (e *errorStatusClient) PublishStatus(_ context.Context, _ StatusRequest) error {
	return e.err
}

// ═══════════════════════════════════════════════════════════════════
// HOTFIX V7.4 — hardened gate tests
// ═══════════════════════════════════════════════════════════════════

func TestPublishPassGoldStatus_BlocksWhenPassGoldRequiredFalse(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.Plan.PassGoldRequired = false

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when PassGoldRequired=false")
	}
	if res.StatusPublished {
		t.Error("StatusPublished must be false when PassGoldRequired=false")
	}
}

func TestPublishPassGoldStatus_BlocksWhenPassSecureRequiredFalse(t *testing.T) {
	input := validStatusInput(&MockPRClient{})
	input.Plan.PassSecureRequired = false

	res := PublishPassGoldStatus(context.Background(), input)
	if !res.Blocked {
		t.Error("expected block when PassSecureRequired=false")
	}
	if res.StatusPublished {
		t.Error("StatusPublished must be false when PassSecureRequired=false")
	}
}

func TestPublishPassGoldStatus_V74_NeverCallsOpenPR(t *testing.T) {
	// V7.4 must never call OpenPR under any conditions.
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "fake")
	mock := &MockPRClient{}
	input := validStatusInput(mock)
	input.DryRun = false

	PublishPassGoldStatus(context.Background(), input)
	if mock.OpenPRCalled {
		t.Error("V7.4 PublishPassGoldStatus must NEVER call Client.OpenPR")
	}
}
