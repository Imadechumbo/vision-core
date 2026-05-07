package github

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type failingPRClient struct {
	OpenCalls   int
	StatusCalls int
	Err         error
}

func (f *failingPRClient) OpenPR(_ context.Context, _ OpenPRRequest) (OpenPRResponse, error) {
	f.OpenCalls++
	return OpenPRResponse{}, f.Err
}

func (f *failingPRClient) PublishStatus(_ context.Context, _ StatusRequest) error {
	f.StatusCalls++
	return nil
}

func validRealPRPlan() PRPlan {
	return BuildPRPlan(PRPlanInput{MissionID: "real_open", ChangedFiles: []string{"planned.txt"}, IssueType: "cors", GateSnapshot: goldGates()})
}

func TestOpenRealPRDryRunValidatesAndDoesNotCallClient(t *testing.T) {
	mock := &MockPRClient{}
	res := OpenRealPR(context.Background(), RealPROpenInput{
		Plan:                   validRealPRPlan(),
		Client:                 mock,
		Owner:                  "acme-org",
		Repo:                   "vision.core",
		DryRun:                 true,
		RequireWriteGate:       true,
		RequireRemotePublished: true,
		RemotePublished:        true,
	})
	if !res.OK || !res.DryRun || !res.WouldOpen || res.PROpened || res.Blocked {
		t.Fatalf("unexpected dry-run result: %#v", res)
	}
	if mock.OpenCalls != 0 || mock.StatusCalls != 0 {
		t.Fatalf("dry-run called client: open=%d status=%d", mock.OpenCalls, mock.StatusCalls)
	}
}

func TestOpenRealPRBlocksInvalidPlanGates(t *testing.T) {
	base := validRealPRPlan()
	tests := []struct {
		name   string
		mutate func(*PRPlan)
		want   string
	}{
		{"can open false", func(p *PRPlan) { p.CanOpenPR = false; p.BlockReason = "pass_gold is false" }, "pass_gold"},
		{"pass gold required false", func(p *PRPlan) { p.PassGoldRequired = false }, "pass_gold_required"},
		{"pass secure required false", func(p *PRPlan) { p.PassSecureRequired = false }, "pass_secure_required"},
		{"bad context", func(p *PRPlan) { p.StatusContext = "ci/pass" }, "status_context"},
		{"bad state", func(p *PRPlan) { p.StatusState = "failure" }, "status_state"},
		{"empty base", func(p *PRPlan) { p.BaseBranch = "" }, "base_branch"},
		{"empty work", func(p *PRPlan) { p.WorkBranch = "" }, "work_branch"},
		{"bad prefix", func(p *PRPlan) { p.WorkBranch = "feature/remediation" }, "vision/remediation/"},
		{"unsafe work", func(p *PRPlan) { p.WorkBranch = "vision/remediation/bad branch" }, "unsafe branch"},
		{"equal base", func(p *PRPlan) { p.BaseBranch = p.WorkBranch }, "differ"},
		{"empty files", func(p *PRPlan) { p.ChangedFiles = nil }, "changed_files"},
		{"empty title", func(p *PRPlan) { p.Title = "" }, "title"},
		{"empty body", func(p *PRPlan) { p.Body = "" }, "body"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan := base
			tt.mutate(&plan)
			res := OpenRealPR(context.Background(), RealPROpenInput{Plan: plan, Owner: "acme", Repo: "vision", DryRun: true, RequireRemotePublished: true, RemotePublished: true})
			if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, tt.want) {
				t.Fatalf("expected block containing %q, got %#v", tt.want, res)
			}
		})
	}
}

func TestOpenRealPRBlocksUnsafeOwnerRepoAndUnpublishedRemoteBranch(t *testing.T) {
	for _, tc := range []struct {
		name  string
		owner string
		repo  string
		want  string
	}{
		{"missing owner", "", "vision", "owner is required"},
		{"missing repo", "acme", "", "repo is required"},
		{"owner slash", "acme/org", "vision", "unsafe owner"},
		{"repo url", "acme", "https://github.com/acme/vision", "unsafe repo"},
		{"owner traversal", "acme..org", "vision", "unsafe owner"},
		{"repo shell", "acme", "vision;rm", "unsafe repo"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			res := OpenRealPR(context.Background(), RealPROpenInput{Plan: validRealPRPlan(), Owner: tc.owner, Repo: tc.repo, DryRun: true, RequireRemotePublished: true, RemotePublished: true})
			if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, tc.want) {
				t.Fatalf("expected block containing %q, got %#v", tc.want, res)
			}
		})
	}

	res := OpenRealPR(context.Background(), RealPROpenInput{Plan: validRealPRPlan(), Owner: "acme", Repo: "vision", DryRun: true, RequireRemotePublished: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "remote branch") {
		t.Fatalf("expected remote branch block, got %#v", res)
	}
}

func TestOpenRealPRNonDryRunRequiresWriteGateTokenAndClient(t *testing.T) {
	plan := validRealPRPlan()
	t.Setenv("VISION_GITHUB_WRITE", "")
	t.Setenv("GITHUB_TOKEN", "token")
	res := OpenRealPR(context.Background(), RealPROpenInput{Plan: plan, Owner: "acme", Repo: "vision", RequireWriteGate: true, RequireRemotePublished: true, RemotePublished: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "VISION_GITHUB_WRITE=1") {
		t.Fatalf("expected write gate block, got %#v", res)
	}

	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "")
	res = OpenRealPR(context.Background(), RealPROpenInput{Plan: plan, Owner: "acme", Repo: "vision", RequireWriteGate: true, RequireRemotePublished: true, RemotePublished: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "token unavailable") {
		t.Fatalf("expected token block, got %#v", res)
	}

	t.Setenv("GITHUB_TOKEN", "secret")
	res = OpenRealPR(context.Background(), RealPROpenInput{Plan: plan, Owner: "acme", Repo: "vision", RequireWriteGate: true, RequireRemotePublished: true, RemotePublished: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "pr client") {
		t.Fatalf("expected client block, got %#v", res)
	}
}

func TestOpenRealPROpensWithMockClientAndNeverPublishesStatus(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "dummy-token")
	mock := &MockPRClient{}
	res := OpenRealPR(context.Background(), RealPROpenInput{Plan: validRealPRPlan(), Client: mock, Owner: "acme", Repo: "vision", RequireWriteGate: true, RequireRemotePublished: true, RemotePublished: true})
	if !res.OK || !res.PROpened || res.PRNumber != 1 || res.PRURL == "" || res.Blocked {
		t.Fatalf("unexpected open result: %#v", res)
	}
	if mock.OpenCalls != 1 || mock.StatusCalls != 0 {
		t.Fatalf("expected one open and zero status calls, got open=%d status=%d", mock.OpenCalls, mock.StatusCalls)
	}
}

func TestOpenRealPRRedactsClientErrors(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	t.Setenv("GITHUB_TOKEN", "env-secret")
	client := &failingPRClient{Err: errors.New("github rejected ghp_secret env-secret Authorization: Bearer secret")}
	res := OpenRealPR(context.Background(), RealPROpenInput{Plan: validRealPRPlan(), Client: client, Owner: "acme", Repo: "vision", RequireWriteGate: true, RequireRemotePublished: true, RemotePublished: true})
	if res.OK || res.Error == "" {
		t.Fatalf("expected redacted client error, got %#v", res)
	}
	for _, forbidden := range []string{"ghp_secret", "env-secret", "Authorization: Bearer secret"} {
		if strings.Contains(res.Error, forbidden) || strings.Contains(res.BlockReason, forbidden) {
			t.Fatalf("secret %q leaked in result %#v", forbidden, res)
		}
	}
	if client.StatusCalls != 0 {
		t.Fatalf("OpenRealPR must not publish status, got %d calls", client.StatusCalls)
	}
}
