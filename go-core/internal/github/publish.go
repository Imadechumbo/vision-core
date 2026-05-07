package github

import (
	"context"
	"errors"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
)

type RemotePublishInput struct {
	Root                 string
	Plan                 PRPlan
	Remote               string
	DryRun               bool
	RequireWriteGate     bool
	AllowLocalTestRemote bool
}

type RemotePublishResult struct {
	OK          bool   `json:"ok"`
	DryRun      bool   `json:"dry_run"`
	Remote      string `json:"remote"`
	Branch      string `json:"branch"`
	CommitSHA   string `json:"commit_sha,omitempty"`
	WouldPush   bool   `json:"would_push"`
	Pushed      bool   `json:"pushed"`
	Blocked     bool   `json:"blocked"`
	BlockReason string `json:"block_reason,omitempty"`
	Error       string `json:"error,omitempty"`
}

var fullGitSHA = regexp.MustCompile(`^[0-9a-fA-F]{40}([0-9a-fA-F]{24})?$`)

func PublishRemoteBranch(ctx context.Context, input RemotePublishInput) RemotePublishResult {
	remote := strings.TrimSpace(input.Remote)
	if remote == "" {
		remote = "origin"
	}
	res := RemotePublishResult{DryRun: input.DryRun, Remote: remote, Branch: input.Plan.WorkBranch}

	if err := validateRemotePublishPlan(input.Plan); err != nil {
		return blockRemotePublish(res, err.Error())
	}
	if err := validateGitRoot(input.Root); err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}
	current, err := CurrentBranch(input.Root)
	if err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}
	if current != input.Plan.WorkBranch {
		return blockRemotePublish(res, fmt.Sprintf("current branch %q does not match plan work branch %q", current, input.Plan.WorkBranch))
	}
	sha, err := GetHeadSHA(input.Root)
	if err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}
	if !fullGitSHA.MatchString(sha) {
		return blockRemotePublish(res, "HEAD is not a full valid git SHA")
	}
	res.CommitSHA = sha
	if err := EnsureCleanWorkingTree(input.Root); err != nil {
		return blockRemotePublish(res, RedactSecrets(err.Error()))
	}
	if err := validateHeadCommitMatchesPlan(input.Root, input.Plan); err != nil {
		return blockRemotePublish(res, RedactSecrets(err.Error()))
	}
	if remote != "origin" && !input.AllowLocalTestRemote {
		return blockRemotePublish(res, fmt.Sprintf("remote %q is not allowed without AllowLocalTestRemote", remote))
	}

	res.WouldPush = true
	if input.DryRun {
		res.OK = true
		return res
	}
	if os.Getenv("VISION_GITHUB_WRITE") != "1" {
		return blockRemotePublish(res, "github write disabled: set VISION_GITHUB_WRITE=1")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}
	if _, err := gitOutput(input.Root, "push", remote, "HEAD:"+input.Plan.WorkBranch); err != nil {
		res.Error = RedactSecrets(err.Error())
		return res
	}
	res.Pushed = true
	res.OK = true
	return res
}

func validateRemotePublishPlan(plan PRPlan) error {
	switch {
	case !plan.CanOpenPR:
		if strings.TrimSpace(plan.BlockReason) != "" {
			return errors.New(plan.BlockReason)
		}
		return errors.New("plan cannot open PR")
	case plan.StatusContext != DefaultStatusContext:
		return fmt.Errorf("status_context must be %s: %s", DefaultStatusContext, plan.StatusContext)
	case plan.StatusState != "success":
		return fmt.Errorf("status_state must be success: %s", plan.StatusState)
	case len(plan.ChangedFiles) == 0:
		return errors.New("changed_files is empty")
	case isBlockedPublishBranch(plan.WorkBranch):
		return fmt.Errorf("work branch %q is blocked", plan.WorkBranch)
	case !strings.HasPrefix(plan.WorkBranch, "vision/remediation/"):
		return fmt.Errorf("work branch must start with vision/remediation/: %s", plan.WorkBranch)
	case !IsSafeBranchName(plan.WorkBranch):
		return fmt.Errorf("unsafe branch name: %q", plan.WorkBranch)
	case plan.WorkBranch == plan.BaseBranch:
		return errors.New("work branch must differ from base branch")
	}
	return nil
}

func isBlockedPublishBranch(branch string) bool {
	return branch == "main" || branch == "master" || branch == DefaultBaseBranch
}

func validateHeadCommitMatchesPlan(root string, plan PRPlan) error {
	message, err := gitOutput(root, "log", "-1", "--pretty=%B")
	if err != nil {
		return err
	}
	if strings.TrimSpace(message) != strings.TrimSpace(plan.CommitMessage) {
		return fmt.Errorf("HEAD commit message does not match plan commit message")
	}
	changedOut, err := gitOutput(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
	if err != nil {
		return err
	}
	actual := sortedNonEmptyLines(changedOut)
	planned := make([]string, 0, len(plan.ChangedFiles))
	for _, f := range plan.ChangedFiles {
		clean, err := validateGitPath(root, f)
		if err != nil {
			return err
		}
		planned = append(planned, clean)
	}
	sort.Strings(planned)
	if !equalStringSlices(actual, planned) {
		return fmt.Errorf("HEAD changed files %v do not match planned files %v", actual, planned)
	}
	return nil
}

func sortedNonEmptyLines(value string) []string {
	var lines []string
	for _, line := range strings.Split(value, "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			lines = append(lines, line)
		}
	}
	sort.Strings(lines)
	return lines
}

func equalStringSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func blockRemotePublish(res RemotePublishResult, reason string) RemotePublishResult {
	res.OK = false
	res.Blocked = true
	res.BlockReason = RedactSecrets(reason)
	return res
}
