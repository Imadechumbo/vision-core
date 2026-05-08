package main

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"
)

func TestSplitChangedFilesDeduplicatesAndTrims(t *testing.T) {
	files := splitChangedFiles(" go-core/a.go,go-core/b.go, go-core/a.go ,, ")
	want := []string{"go-core/a.go", "go-core/b.go"}
	if len(files) != len(want) {
		t.Fatalf("unexpected file count: got %v want %v", files, want)
	}
	for i := range want {
		if files[i] != want[i] {
			t.Fatalf("unexpected files: got %v want %v", files, want)
		}
	}
}

func TestValidateGitHubFlowCLIForcesApplyRealGate(t *testing.T) {
	t.Setenv("VISION_GITHUB_WRITE", "")
	err := validateGitHubFlowCLI(validGitHubFlowCLIInput(func(input *gitHubFlowCLIInput) {
		input.DryRun = false
		input.ApplyReal = true
	}))
	if err == nil || !strings.Contains(err.Error(), "VISION_GITHUB_WRITE=1") {
		t.Fatalf("expected write gate error, got %v", err)
	}
}

func TestValidateGitHubFlowCLIRejectsNonOriginRemote(t *testing.T) {
	err := validateGitHubFlowCLI(validGitHubFlowCLIInput(func(input *gitHubFlowCLIInput) {
		input.Remote = "upstream"
	}))
	if err == nil || !strings.Contains(err.Error(), "only allows origin") {
		t.Fatalf("expected origin-only error, got %v", err)
	}
}

func TestValidateGitHubFlowCLIRequiresPublishRemoteAndOpenPRForStatus(t *testing.T) {
	err := validateGitHubFlowCLI(validGitHubFlowCLIInput(func(input *gitHubFlowCLIInput) {
		input.PublishStatus = true
		input.PublishRemote = true
		input.OpenPR = false
	}))
	if err == nil || !strings.Contains(err.Error(), "--publish-status requires") {
		t.Fatalf("expected publish-status dependency error, got %v", err)
	}
}

func TestRunGitHubFlowHelpPrintsContractFlagsWithoutPlan(t *testing.T) {
	out := captureStdout(t, func() { runGitHubFlow([]string{"--help"}) })
	if strings.Contains(out, "--plan") {
		t.Fatalf("github-flow help must not expose --plan: %s", out)
	}
	for _, required := range []string{"--root", "--owner", "--repo", "--remote", "--mission-id", "--issue-type", "--changed-file", "--title", "--body", "--dry-run=true|false", "--apply-real", "--allow-local-git", "--publish-remote", "--open-pr", "--publish-status"} {
		if !strings.Contains(out, required) {
			t.Fatalf("github-flow help missing %s: %s", required, out)
		}
	}
}

func TestRunGitHubFlowDefaultDryRunBuildsV76PlanInternally(t *testing.T) {
	out := captureStdout(t, func() {
		runGitHubFlow([]string{
			"--root", ".",
			"--owner", "Imadechumbo",
			"--repo", "vision-core",
			"--mission-id", "mission_cli_test",
			"--issue-type", "cors_blocked",
			"--changed-file", "go-core/internal/github/e2e_flow.go",
			"--title", "VISION remediation: cors_blocked",
			"--body", "Automated PASS GOLD remediation plan",
			"--publish-remote",
			"--open-pr",
			"--publish-status",
		})
	})
	var got map[string]interface{}
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("invalid JSON output: %v\n%s", err, out)
	}
	if got["ok"] != true || got["version"] != "V7.6" || got["mode"] != "dry-run" || got["github_flow"] == nil {
		t.Fatalf("unexpected github-flow output: %#v", got)
	}
	flow := got["github_flow"].(map[string]interface{})
	if flow["work_branch"] != "vision/remediation/mission_cli_test" || flow["base_branch"] != "v6-go-enterprise-runtime" {
		t.Fatalf("unexpected branches: %#v", flow)
	}
	if flow["pr_opened"] != false || flow["remote_pushed"] != false || flow["status_published"] != false {
		t.Fatalf("dry-run must not perform real side effects: %#v", flow)
	}
}

func validGitHubFlowCLIInput(mutators ...func(*gitHubFlowCLIInput)) gitHubFlowCLIInput {
	input := gitHubFlowCLIInput{
		Root:          ".",
		Owner:         "Imadechumbo",
		Repo:          "vision-core",
		Remote:        "origin",
		MissionID:     "mission_cli_test",
		IssueType:     "cors_blocked",
		ChangedFiles:  []string{"go-core/internal/github/e2e_flow.go"},
		Title:         "VISION remediation: cors_blocked",
		Body:          "Automated PASS GOLD remediation plan",
		DryRun:        true,
		ApplyReal:     false,
		PublishRemote: true,
		OpenPR:        true,
		PublishStatus: true,
	}
	for _, mutate := range mutators {
		mutate(&input)
	}
	return input
}

func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	old := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	fn()
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	os.Stdout = old
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}
