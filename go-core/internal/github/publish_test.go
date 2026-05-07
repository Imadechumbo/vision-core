package github

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func publishPlanForCommit(t *testing.T, dir string, branch string, files ...string) PRPlan {
	t.Helper()
	if len(files) == 0 {
		files = []string{"planned.txt"}
	}
	runGit(t, dir, "checkout", "-b", branch)
	for _, f := range files {
		if err := os.WriteFile(filepath.Join(dir, f), []byte("planned\n"), 0644); err != nil {
			t.Fatal(err)
		}
	}
	plan := BuildPRPlan(PRPlanInput{MissionID: "publish_123", ChangedFiles: files, IssueType: "cors", GateSnapshot: goldGates()})
	plan.WorkBranch = branch
	plan.BaseBranch = DefaultBaseBranch
	plan.CommitMessage = "fix(vision): publish branch test"
	runGit(t, dir, "add", "--", files[0])
	for _, f := range files[1:] {
		runGit(t, dir, "add", "--", f)
	}
	runGit(t, dir, "commit", "-m", plan.CommitMessage)
	return plan
}

func TestPublishRemoteBranchDryRunDoesNotPush(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/dry-run")
	bare := initBareRepo(t)
	runGit(t, dir, "remote", "add", "origin", bare)

	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan, DryRun: true})
	if !res.OK || !res.DryRun || !res.WouldPush || res.Pushed || res.CommitSHA == "" {
		t.Fatalf("unexpected dry-run result: %#v", res)
	}
	if branchExistsInBare(t, bare, plan.WorkBranch) {
		t.Fatalf("dry-run pushed branch %s", plan.WorkBranch)
	}
}

func TestPublishRemoteBranchWithoutVisionGithubWriteBlocksPush(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "")
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/no-gate")
	bare := initBareRepo(t)
	runGit(t, dir, "remote", "add", "origin", bare)

	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "VISION_GITHUB_WRITE=1") || res.Pushed {
		t.Fatalf("expected write gate block, got %#v", res)
	}
	if branchExistsInBare(t, bare, plan.WorkBranch) {
		t.Fatalf("blocked publish pushed branch %s", plan.WorkBranch)
	}
}

func TestPublishRemoteBranchWithWriteGatePushesOnlyHeadToPlanBranchToBareRepo(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/real-push")
	bare := initBareRepo(t)
	runGit(t, dir, "remote", "add", "localbare", bare)

	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan, Remote: "localbare", AllowLocalTestRemote: true})
	if !res.OK || !res.WouldPush || !res.Pushed || res.Remote != "localbare" || res.Branch != plan.WorkBranch {
		t.Fatalf("unexpected push result: %#v", res)
	}
	if !branchExistsInBare(t, bare, plan.WorkBranch) {
		t.Fatalf("expected branch %s in bare repo", plan.WorkBranch)
	}
	bareSHA := runGitOutput(t, bare, "rev-parse", plan.WorkBranch)
	if bareSHA != res.CommitSHA {
		t.Fatalf("expected bare branch SHA %s, got %s", res.CommitSHA, bareSHA)
	}
}

func TestPublishRemoteBranchBlocksBranchOutsideRemediationPrefix(t *testing.T) {
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/prefix")
	plan.WorkBranch = "feature/not-remediation"
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan, DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "vision/remediation/") {
		t.Fatalf("expected prefix block, got %#v", res)
	}
}

func TestPublishRemoteBranchBlocksProtectedWorkBranches(t *testing.T) {
	dir := initRepo(t)
	base := publishPlanForCommit(t, dir, "vision/remediation/protected")
	for _, branch := range []string{"main", "master", DefaultBaseBranch} {
		t.Run(branch, func(t *testing.T) {
			plan := base
			plan.WorkBranch = branch
			res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan, DryRun: true})
			if res.OK || !res.Blocked {
				t.Fatalf("expected protected branch block, got %#v", res)
			}
		})
	}
}

func TestPublishRemoteBranchBlocksCurrentBranchMismatch(t *testing.T) {
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/current")
	other := plan
	other.WorkBranch = "vision/remediation/other"
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: other, DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "current branch") {
		t.Fatalf("expected current branch block, got %#v", res)
	}
}

func TestPublishRemoteBranchBlocksDirtyWorkingTree(t *testing.T) {
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/dirty")
	if err := os.WriteFile(filepath.Join(dir, "dirty.txt"), []byte("dirty\n"), 0644); err != nil {
		t.Fatal(err)
	}
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan, DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "working tree") {
		t.Fatalf("expected dirty working tree block, got %#v", res)
	}
}

func TestPublishRemoteBranchBlocksNonOriginRemoteWithoutLocalTestAllowance(t *testing.T) {
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/remote")
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan, Remote: "localbare", DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "AllowLocalTestRemote") {
		t.Fatalf("expected remote block, got %#v", res)
	}
}

func TestPublishRemoteBranchValidatesHeadCommitAgainstPlan(t *testing.T) {
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/head-check")
	badMessage := plan
	badMessage.CommitMessage = "fix(vision): different"
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: badMessage, DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "commit message") {
		t.Fatalf("expected commit message block, got %#v", res)
	}
	badFiles := plan
	badFiles.ChangedFiles = []string{"other.txt"}
	res = PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: badFiles, DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "changed files") {
		t.Fatalf("expected changed files block, got %#v", res)
	}
}

func TestPublishRemoteBranchTokenDoesNotLeakInError(t *testing.T) {
	secret := "ghp_secret github_pat_secret x-access-token:secret Authorization: Bearer secret env-secret"
	t.Setenv("GITHUB_TOKEN", "env-secret")
	redacted := RedactSecrets(secret)
	for _, forbidden := range []string{"ghp_secret", "github_pat_secret", "x-access-token:secret", "Authorization: Bearer secret", "env-secret"} {
		if strings.Contains(redacted, forbidden) {
			t.Fatalf("redacted value leaked %q in %q", forbidden, redacted)
		}
	}

	t.Setenv("VISION_GITHUB_WRITE", "1")
	dir := initRepo(t)
	plan := publishPlanForCommit(t, dir, "vision/remediation/redact")
	runGit(t, dir, "remote", "add", "origin", filepath.Join(t.TempDir(), "missing-ghp_secret-env-secret.git"))
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Plan: plan})
	if res.OK || res.Error == "" {
		t.Fatalf("expected push error, got %#v", res)
	}
	if strings.Contains(res.Error, "ghp_secret") || strings.Contains(res.Error, "env-secret") {
		t.Fatalf("publish error leaked token: %q", res.Error)
	}
}

func initBareRepo(t *testing.T) string {
	t.Helper()
	parent := t.TempDir()
	dir := filepath.Join(parent, "remote.git")
	runGit(t, parent, "init", "--bare", dir)
	return dir
}

func branchExistsInBare(t *testing.T, bare, branch string) bool {
	t.Helper()
	cmd := exec.Command("git", "rev-parse", "--verify", branch)
	cmd.Dir = bare
	out, err := cmd.CombinedOutput()
	return err == nil && strings.TrimSpace(string(out)) != ""
}
