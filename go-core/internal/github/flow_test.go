package github

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func validFlowPlan(files ...string) PRPlan {
	if len(files) == 0 {
		files = []string{"planned.txt"}
	}
	plan := BuildPRPlan(PRPlanInput{MissionID: "flow_123", ChangedFiles: files, IssueType: "cors", GateSnapshot: goldGates()})
	plan.CommitMessage = "fix(vision): controlled flow test"
	return plan
}

func TestRunControlledPRFlowBlocksPlanGates(t *testing.T) {
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", DefaultBaseBranch)
	basePlan := validFlowPlan("planned.txt")
	tests := []struct {
		name   string
		mutate func(*PRPlan)
		want   string
	}{
		{"can open false", func(p *PRPlan) { p.CanOpenPR = false; p.BlockReason = "pass_gold is false" }, "pass_gold"},
		{"bad status", func(p *PRPlan) { p.StatusState = "failure" }, "status_state"},
		{"bad context", func(p *PRPlan) { p.StatusContext = "ci/pass" }, "status_context"},
		{"empty files", func(p *PRPlan) { p.ChangedFiles = nil }, "changed_files"},
		{"unsafe branch", func(p *PRPlan) { p.WorkBranch = "bad branch" }, "unsafe branch"},
		{"main branch", func(p *PRPlan) { p.WorkBranch = "main" }, "unsafe branch"},
		{"master branch", func(p *PRPlan) { p.WorkBranch = "master" }, "unsafe branch"},
		{"equal base", func(p *PRPlan) { p.WorkBranch = p.BaseBranch }, "differ"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan := basePlan
			tt.mutate(&plan)
			res := RunControlledPRFlow(context.Background(), ControlledFlowInput{Root: dir, Plan: plan, DryRun: true})
			if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, tt.want) {
				t.Fatalf("expected block containing %q, got %#v", tt.want, res)
			}
		})
	}
}

func TestRunControlledPRFlowDryRunDoesNotCreateBranchCommitOrCallClient(t *testing.T) {
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", DefaultBaseBranch)
	before, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	mock := &MockPRClient{}
	res := RunControlledPRFlow(context.Background(), ControlledFlowInput{Root: dir, Plan: validFlowPlan("planned.txt"), Client: mock, Owner: "acme", Repo: "vision", DryRun: true})
	if !res.OK || !res.DryRun || res.BranchCreated || res.CommitCreated || res.PROpened || res.StatusPublished || !res.WouldOpenPR || !res.WouldPublishStatus {
		t.Fatalf("unexpected dry-run result: %#v", res)
	}
	after, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	if after != before {
		t.Fatalf("dry-run changed branch: before=%s after=%s", before, after)
	}
	if mock.OpenCalls != 0 || mock.StatusCalls != 0 {
		t.Fatalf("dry-run called client: open=%d status=%d", mock.OpenCalls, mock.StatusCalls)
	}
}

func TestRunControlledPRFlowLocalGitCreatesBranchAndCommitOnlyPlannedFiles(t *testing.T) {
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", DefaultBaseBranch)
	if err := os.WriteFile(filepath.Join(dir, "planned.txt"), []byte("planned\n"), 0644); err != nil {
		t.Fatal(err)
	}
	plan := validFlowPlan("planned.txt")
	res := RunControlledPRFlow(context.Background(), ControlledFlowInput{Root: dir, Plan: plan, DryRun: true, AllowLocalGit: true})
	if !res.OK || !res.BranchCreated || !res.CommitCreated || res.CommitSHA == "" || res.PROpened || res.StatusPublished {
		t.Fatalf("unexpected local flow result: %#v", res)
	}
	branch, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	if branch != plan.WorkBranch {
		t.Fatalf("expected branch %s, got %s", plan.WorkBranch, branch)
	}
	msg := runGitOutput(t, dir, "log", "-1", "--pretty=%s")
	if msg != plan.CommitMessage {
		t.Fatalf("commit message mismatch: %q", msg)
	}
	changed := runGitOutput(t, dir, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
	if changed != "planned.txt" {
		t.Fatalf("commit included unexpected files: %q", changed)
	}
}

func TestRunControlledPRFlowRejectsUnplannedDirtyFile(t *testing.T) {
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", DefaultBaseBranch)
	if err := os.WriteFile(filepath.Join(dir, "planned.txt"), []byte("planned\n"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "unplanned.txt"), []byte("no\n"), 0644); err != nil {
		t.Fatal(err)
	}
	res := RunControlledPRFlow(context.Background(), ControlledFlowInput{Root: dir, Plan: validFlowPlan("planned.txt"), DryRun: true, AllowLocalGit: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "unplanned") {
		t.Fatalf("expected unplanned dirty file block, got %#v", res)
	}
}

func TestRunControlledPRFlowRejectsUnsafePlannedPaths(t *testing.T) {
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", DefaultBaseBranch)
	for _, file := range []string{".vision-memory/a.jsonl", ".vision-snapshots/a", "bin/vision-core", "node_modules/x", "vendor/x", "dist/app", "build/app", ".next/app", "../escape", filepath.Join(dir, "abs.txt")} {
		t.Run(file, func(t *testing.T) {
			plan := validFlowPlan(file)
			res := RunControlledPRFlow(context.Background(), ControlledFlowInput{Root: dir, Plan: plan, DryRun: true, AllowLocalGit: true})
			if res.OK || !res.Blocked {
				t.Fatalf("expected unsafe path block, got %#v", res)
			}
		})
	}
}

func TestRunControlledPRFlowBlocksMainOrMasterCurrentBranch(t *testing.T) {
	dir := initRepo(t)
	current, err := CurrentBranch(dir)
	if err != nil {
		t.Fatal(err)
	}
	if current != "main" && current != "master" {
		runGit(t, dir, "checkout", "-b", "main")
	}
	res := RunControlledPRFlow(context.Background(), ControlledFlowInput{Root: dir, Plan: validFlowPlan("planned.txt"), DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "not allowed") {
		t.Fatalf("expected main/master current branch block, got %#v", res)
	}
}

func TestGitHubPackagePushContractAvoidsForbiddenOptions(t *testing.T) {
	matches, err := filepath.Glob(filepath.Join(".", "*.go"))
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range matches {
		b, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		text := string(b)
		for _, forbidden := range []string{"set-upstream", "force", "mirror", "all", "tags"} {
			option := "--" + forbidden
			if strings.Contains(text, option) {
				t.Fatalf("github package must not use forbidden push option %s in %s", option, f)
			}
		}
	}
}

func TestHTTPClientRefusesWithoutWriteGateAndDryRunAvoidsNetwork(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "")
	t.Setenv("GITHUB_TOKEN", "secret-value")
	_, err := (HTTPGitHubClient{}).OpenPR(context.Background(), OpenPRRequest{})
	if err == nil || strings.Contains(err.Error(), "secret-value") {
		t.Fatalf("expected write-gate error without token leak, got %v", err)
	}
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", DefaultBaseBranch)
	res := RunControlledPRFlow(context.Background(), ControlledFlowInput{Root: dir, Plan: validFlowPlan("planned.txt"), Client: HTTPGitHubClient{}, DryRun: true})
	if !res.OK || res.PROpened || res.StatusPublished {
		t.Fatalf("dry-run should avoid HTTP client/network, got %#v", res)
	}
}

func runGitOutput(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v failed: %v\n%s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}
