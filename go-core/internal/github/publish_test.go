package github

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPublishRemoteBranchDryRunDoesNotPush(t *testing.T) {
	dir, bare, branch := publishRepoWithLocalRemote(t)
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Remote: "local", WorkBranch: branch, DryRun: true, AllowLocalTestRemote: true})
	if !res.OK || !res.WouldPush || res.Pushed {
		t.Fatalf("dry-run should validate and avoid push, got %#v", res)
	}
	if remoteHasBranch(t, bare, branch) {
		t.Fatalf("dry-run unexpectedly pushed branch %s", branch)
	}
}

func TestPublishRemoteBranchBlocksRealPushWithoutWriteGate(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "")
	dir, bare, branch := publishRepoWithLocalRemote(t)
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Remote: "local", WorkBranch: branch, AllowLocalTestRemote: true})
	if res.OK || !res.Blocked || !res.WouldPush || !strings.Contains(res.BlockReason, "github write disabled") {
		t.Fatalf("expected write gate block, got %#v", res)
	}
	if remoteHasBranch(t, bare, branch) {
		t.Fatalf("blocked publish unexpectedly pushed branch %s", branch)
	}
}

func TestPublishRemoteBranchPushesToBareLocalRepoWithWriteGate(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "1")
	dir, bare, branch := publishRepoWithLocalRemote(t)
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Remote: "local", WorkBranch: branch, AllowLocalTestRemote: true})
	if !res.OK || !res.WouldPush || !res.Pushed {
		t.Fatalf("expected successful local bare push, got %#v", res)
	}
	if !remoteHasBranch(t, bare, branch) {
		t.Fatalf("expected remote branch %s to exist", branch)
	}
}

func TestPublishRemoteBranchOnlyUsesRemediationBranches(t *testing.T) {
	dir := initRepo(t)
	for _, branch := range []string{"main", "master", DefaultBaseBranch, "feature/fix", "vision/other/fix"} {
		t.Run(branch, func(t *testing.T) {
			if branch != "main" && branch != "master" {
				runGit(t, dir, "checkout", "-B", "vision/remediation/current")
			}
			res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, WorkBranch: branch, DryRun: true})
			if res.OK || !res.Blocked {
				t.Fatalf("expected branch %q to be blocked, got %#v", branch, res)
			}
		})
	}
}

func TestPublishRemoteBranchBlocksUnsafeBranch(t *testing.T) {
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", "vision/remediation/safe")
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, WorkBranch: "vision/remediation/bad branch", DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "unsafe") {
		t.Fatalf("expected unsafe branch block, got %#v", res)
	}
}

func TestPublishRemoteBranchBlocksCurrentBranchMismatch(t *testing.T) {
	dir := initRepo(t)
	runGit(t, dir, "checkout", "-b", "vision/remediation/current")
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, WorkBranch: "vision/remediation/other", DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "differs") {
		t.Fatalf("expected current/work branch mismatch block, got %#v", res)
	}
}

func TestPublishRemoteBranchBlocksDirtyWorkingTree(t *testing.T) {
	dir := initRepo(t)
	branch := "vision/remediation/dirty"
	runGit(t, dir, "checkout", "-b", branch)
	if err := os.WriteFile(filepath.Join(dir, "dirty.txt"), []byte("dirty\n"), 0644); err != nil {
		t.Fatal(err)
	}
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, WorkBranch: branch, DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "not clean") {
		t.Fatalf("expected dirty tree block, got %#v", res)
	}
}

func TestPublishRemoteBranchBlocksNonOriginRemoteWithoutLocalOverride(t *testing.T) {
	dir, _, branch := publishRepoWithLocalRemote(t)
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Remote: "local", WorkBranch: branch, DryRun: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "AllowLocalTestRemote") {
		t.Fatalf("expected non-origin remote block, got %#v", res)
	}
}

func TestPublishRemoteBranchBlocksUnsafeRemote(t *testing.T) {
	dir := initRepo(t)
	branch := "vision/remediation/remote"
	runGit(t, dir, "checkout", "-b", branch)
	res := PublishRemoteBranch(context.Background(), RemotePublishInput{Root: dir, Remote: "--mirror", WorkBranch: branch, DryRun: true, AllowLocalTestRemote: true})
	if res.OK || !res.Blocked || !strings.Contains(res.BlockReason, "unsafe remote") {
		t.Fatalf("expected unsafe remote block, got %#v", res)
	}
}

func TestRedactGitErrorRemovesGitHubSecrets(t *testing.T) {
	message := "ghp" + "_abc123 github_pat" + "_abc_123 x-access-token:topsecret Authorization: Bearer bearer-secret GITHUB" + "_TOKEN=env-secret"
	redacted := RedactGitError(errors.New(message)).Error()
	for _, secret := range []string{"ghp" + "_abc123", "github_pat" + "_abc_123", "topsecret", "bearer-secret", "env-secret"} {
		if strings.Contains(redacted, secret) {
			t.Fatalf("secret %q leaked in %q", secret, redacted)
		}
	}
	if count := strings.Count(redacted, "[REDACTED]"); count < 5 {
		t.Fatalf("expected all token forms to be redacted, got %q", redacted)
	}
}

func TestPushBranchRejectsUnsafeBranch(t *testing.T) {
	dir := initRepo(t)
	if err := PushBranch(context.Background(), dir, "origin", "main"); err == nil {
		t.Fatal("expected PushBranch to reject main")
	}
}

func publishRepoWithLocalRemote(t *testing.T) (string, string, string) {
	t.Helper()
	dir := initRepo(t)
	bare := filepath.Join(t.TempDir(), "remote.git")
	runGit(t, t.TempDir(), "init", "--bare", bare)
	runGit(t, dir, "remote", "add", "local", bare)
	branch := fmt.Sprintf("vision/remediation/%s", strings.ReplaceAll(filepath.Base(t.Name()), "/", "-"))
	runGit(t, dir, "checkout", "-b", branch)
	if err := os.WriteFile(filepath.Join(dir, "publish.txt"), []byte(branch+"\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runGit(t, dir, "add", "publish.txt")
	runGit(t, dir, "commit", "-m", "test publish branch")
	return dir, bare, branch
}

func remoteHasBranch(t *testing.T, bare, branch string) bool {
	t.Helper()
	out := runGitOutput(t, bare, "for-each-ref", "--format=%(refname:short)", "refs/heads")
	for _, line := range strings.Split(out, "\n") {
		if strings.TrimSpace(line) == branch {
			return true
		}
	}
	return false
}
