package github

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

const remediationBranchPrefix = "vision/remediation/"

type RemotePublishInput struct {
	Root                 string
	Remote               string
	BaseBranch           string
	WorkBranch           string
	DryRun               bool
	AllowLocalTestRemote bool
}

type RemotePublishResult struct {
	OK          bool   `json:"ok"`
	Remote      string `json:"remote"`
	BaseBranch  string `json:"base_branch"`
	WorkBranch  string `json:"work_branch"`
	DryRun      bool   `json:"dry_run"`
	WouldPush   bool   `json:"would_push"`
	Pushed      bool   `json:"pushed"`
	Blocked     bool   `json:"blocked"`
	BlockReason string `json:"block_reason,omitempty"`
	Error       string `json:"error,omitempty"`
}

func PublishRemoteBranch(ctx context.Context, input RemotePublishInput) RemotePublishResult {
	remote := defaultString(input.Remote, "origin")
	base := defaultString(input.BaseBranch, DefaultBaseBranch)
	work := strings.TrimSpace(input.WorkBranch)
	res := RemotePublishResult{
		Remote:     remote,
		BaseBranch: base,
		WorkBranch: work,
		DryRun:     input.DryRun,
	}

	if err := validateRemotePublishInput(input.Root, remote, base, work, input.AllowLocalTestRemote); err != nil {
		return blockRemotePublish(res, err.Error())
	}
	current, err := CurrentBranch(input.Root)
	if err != nil {
		res.OK = false
		res.Error = RedactGitError(err).Error()
		return res
	}
	if current != work {
		return blockRemotePublish(res, fmt.Sprintf("current branch %q differs from work branch %q", current, work))
	}
	if err := EnsureCleanWorkingTree(input.Root); err != nil {
		return blockRemotePublish(res, err.Error())
	}
	if err := validatePublishRemote(input.Root, remote, input.AllowLocalTestRemote); err != nil {
		return blockRemotePublish(res, err.Error())
	}

	res.WouldPush = true
	if input.DryRun {
		res.OK = true
		return res
	}
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return blockRemotePublish(res, "github write disabled: set VISION_GITHUB_WRITE=1")
	}
	if err := PushBranch(ctx, input.Root, remote, work); err != nil {
		res.OK = false
		res.Error = RedactGitError(err).Error()
		return res
	}
	res.Pushed = true
	res.OK = true
	return res
}

func PushBranch(ctx context.Context, root, remote, branch string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := validateGitRoot(root); err != nil {
		return err
	}
	if err := validatePublishBranch(branch, DefaultBaseBranch); err != nil {
		return err
	}
	if !isSafeRemoteArgument(remote) {
		return fmt.Errorf("unsafe remote: %q", remote)
	}
	cmd := exec.CommandContext(ctx, "git", "push", remote, branch+":"+branch)
	cmd.Dir = root
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = strings.TrimSpace(stdout.String())
		}
		if msg == "" {
			msg = err.Error()
		}
		return errors.New(msg)
	}
	return nil
}

func validateRemotePublishInput(root, remote, base, work string, allowLocal bool) error {
	if err := validateGitRoot(root); err != nil {
		return err
	}
	if err := validatePublishBranch(work, base); err != nil {
		return err
	}
	if err := validateBaseBranch(base); err != nil {
		return err
	}
	if !isSafeRemoteArgument(remote) {
		return fmt.Errorf("unsafe remote: %q", remote)
	}
	if remote != "origin" && !allowLocal {
		return fmt.Errorf("remote %q is not allowed without AllowLocalTestRemote", remote)
	}
	return nil
}

func validatePublishBranch(branch, base string) error {
	branch = strings.TrimSpace(branch)
	switch {
	case branch == "":
		return errors.New("work branch is required")
	case !IsSafeBranchName(branch):
		return fmt.Errorf("unsafe branch name: %q", branch)
	case !strings.HasPrefix(branch, remediationBranchPrefix):
		return fmt.Errorf("work branch must start with %s", remediationBranchPrefix)
	case branch == "main" || branch == "master" || branch == DefaultBaseBranch:
		return fmt.Errorf("work branch %q is not allowed", branch)
	case base != "" && branch == base:
		return errors.New("work branch must differ from base branch")
	}
	return nil
}

func validateBaseBranch(base string) error {
	base = strings.TrimSpace(base)
	if base == "" {
		return errors.New("base branch is required")
	}
	if !IsSafeBranchName(base) {
		return fmt.Errorf("unsafe base branch name: %q", base)
	}
	return nil
}

func validatePublishRemote(root, remote string, allowLocal bool) error {
	if remote == "origin" {
		return nil
	}
	if !allowLocal {
		return fmt.Errorf("remote %q is not allowed without AllowLocalTestRemote", remote)
	}
	if isLocalFilesystemRemote(remote) {
		return nil
	}
	out, err := gitOutput(root, "remote", "get-url", remote)
	if err != nil {
		return fmt.Errorf("remote %q is not configured", remote)
	}
	if !isLocalFilesystemRemote(strings.TrimSpace(out)) {
		return fmt.Errorf("remote %q must point to a local test repository", remote)
	}
	return nil
}

var safeRemoteName = regexp.MustCompile(`^[A-Za-z0-9._/-]+$`)

func isSafeRemoteArgument(remote string) bool {
	remote = strings.TrimSpace(remote)
	if remote == "" || strings.HasPrefix(remote, "-") || strings.ContainsAny(remote, " \t\n\r") {
		return false
	}
	if strings.Contains(remote, "::") {
		return false
	}
	if strings.ContainsAny(remote, ";&|`$<>") {
		return false
	}
	if isLocalFilesystemRemote(remote) {
		return true
	}
	return safeRemoteName.MatchString(remote)
}

func isLocalFilesystemRemote(remote string) bool {
	remote = strings.TrimSpace(remote)
	if remote == "" {
		return false
	}
	if strings.HasPrefix(remote, "file://") {
		u, err := url.Parse(remote)
		return err == nil && u.Scheme == "file" && u.Path != ""
	}
	if filepath.IsAbs(remote) || strings.HasPrefix(remote, "./") || strings.HasPrefix(remote, "../") {
		return true
	}
	return false
}

func blockRemotePublish(res RemotePublishResult, reason string) RemotePublishResult {
	res.OK = false
	res.Blocked = true
	res.BlockReason = redactGitSecrets(reason)
	return res
}
