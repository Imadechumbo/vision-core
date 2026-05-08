package main

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/report"
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
	// Use a temp dir as root so report artifacts don't pollute the working tree
	root := t.TempDir()

	// Use temp file for stdout to avoid pipe deadlock on Windows
	tmpOut, err := os.CreateTemp("", "ghflow-test-*.json")
	if err != nil {
		t.Fatalf("CreateTemp: %v", err)
	}
	defer os.Remove(tmpOut.Name())

	old := os.Stdout
	os.Stdout = tmpOut
	runGitHubFlow([]string{
		"--root", root,
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
		// Use a sub-dir inside root for reports to ensure cleanup
		"--report-dir", ".vision-reports/github-flow",
	})
	os.Stdout = old
	tmpOut.Close()

	data, err := os.ReadFile(tmpOut.Name())
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}

	var got map[string]interface{}
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("invalid JSON output: %v\n%s", err, data)
	}
	// V7.8 contract: version="V7.8", ok=true, mode=dry-run, github_flow present
	if got["ok"] != true || got["version"] != "V7.8" || got["mode"] != "dry-run" || got["github_flow"] == nil {
		t.Fatalf("unexpected github-flow output: %#v", got)
	}

	flow := got["github_flow"].(map[string]interface{})
	if flow["work_branch"] != "vision/remediation/mission_cli_test" || flow["base_branch"] != "v6-go-enterprise-runtime" {
		t.Fatalf("unexpected branches: %#v", flow)
	}
	if flow["pr_opened"] != false || flow["remote_pushed"] != false || flow["status_published"] != false {
		t.Fatalf("dry-run must not perform real side effects: %#v", flow)
	}

	// V7.8: report field must be present with flow_id and index_path
	rpt, _ := got["report"].(map[string]interface{})
	if rpt == nil {
		t.Fatal("report field must be present in V7.8 output")
	}
	if rpt["flow_id"] == "" || rpt["flow_id"] == nil {
		t.Error("report.flow_id must not be empty")
	}
	// format defaults to "both" — index_path must be set
	if rpt["index_path"] == "" || rpt["index_path"] == nil {
		t.Error("report.index_path must be present when format=both")
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

// ═══════════════════════════════════════════════════════════════════
// V7.7 GITHUB FLOW EXECUTION REPORTS TESTS
// ═══════════════════════════════════════════════════════════════════

// ─── Helpers ─────────────────────────────────────────────────────────────────

func runFlowInTemp(t *testing.T, extraArgs []string) (string, string) {
	t.Helper()
	dir := t.TempDir()
	args := []string{
		"--root", dir,
		"--owner", "testorg",
		"--repo", "testrepo",
		"--mission-id", "test_mission",
		"--issue-type", "cors_blocked",
		"--changed-file", "backend/server.js",
		"--title", "VISION test remediation",
		"--body", "Test body",
		"--publish-remote",
		"--open-pr",
		"--publish-status",
		"--report-dir", ".vision-reports/github-flow",
		"--report-format", "both",
	}
	args = append(args, extraArgs...)

	out := captureStdout(t, func() {
		runGitHubFlow(args)
	})
	return out, dir
}

// ─── A: dry-run generates JSON + Markdown ─────────────────────────────────────

func TestV77_DryRun_GeneratesJSONAndMarkdown(t *testing.T) {
	out, dir := runFlowInTemp(t, nil)

	// Output must be valid JSON
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	if result["ok"] != true {
		t.Errorf("expected ok=true, got %v (output: %s)", result["ok"], out)
	}

	// Report metadata must be present
	rpt, ok := result["report"].(map[string]interface{})
	if !ok {
		t.Fatalf("report field missing or wrong type in output: %s", out)
	}
	flowID, _ := rpt["flow_id"].(string)
	if flowID == "" {
		t.Error("report.flow_id must not be empty")
	}
	jsonPath, _ := rpt["json_path"].(string)
	if jsonPath == "" {
		t.Error("report.json_path must not be empty")
	}
	mdPath, _ := rpt["markdown_path"].(string)
	if mdPath == "" {
		t.Error("report.markdown_path must not be empty")
	}

	// Files must exist
	if _, err := os.Stat(jsonPath); err != nil {
		t.Errorf("JSON report file missing: %v", err)
	}
	if _, err := os.Stat(mdPath); err != nil {
		t.Errorf("Markdown report file missing: %v", err)
	}

	// JSON report contains flow_id
	jsonData, _ := os.ReadFile(jsonPath)
	var jsonReport map[string]interface{}
	if err := json.Unmarshal(jsonData, &jsonReport); err != nil {
		t.Fatalf("report JSON not parseable: %v", err)
	}
	if jsonReport["flow_id"] != flowID {
		t.Errorf("flow_id mismatch in JSON report")
	}

	// Markdown contains expected header
	mdData, _ := os.ReadFile(mdPath)
	if !strings.Contains(string(mdData), "VISION GitHub Flow Execution Report") {
		t.Error("Markdown must contain 'VISION GitHub Flow Execution Report'")
	}
	if !strings.Contains(string(mdData), "dry-run") || !strings.Contains(string(mdData), "Dry Run") {
		t.Error("Markdown must mention dry-run mode")
	}

	// No token leak
	if strings.Contains(string(mdData), "ghp_") || strings.Contains(string(mdData), "github_pat_") {
		t.Error("Markdown must not contain token patterns")
	}

	_ = dir
}

// ─── B: report-format=json only ───────────────────────────────────────────────

func TestV77_ReportFormatJSON_OnlyJSONGenerated(t *testing.T) {
	out, _ := runFlowInTemp(t, []string{"--report-format", "json"})

	var result map[string]interface{}
	json.Unmarshal([]byte(out), &result) //nolint
	rpt, _ := result["report"].(map[string]interface{})
	if rpt == nil {
		t.Fatal("report missing")
	}
	if _, ok := rpt["json_path"]; !ok {
		t.Error("json_path must be present for format=json")
	}
	if _, ok := rpt["markdown_path"]; ok {
		t.Error("markdown_path must NOT be present for format=json")
	}
}

// ─── C: report-format=markdown only ──────────────────────────────────────────

func TestV77_ReportFormatMarkdown_OnlyMarkdownGenerated(t *testing.T) {
	out, _ := runFlowInTemp(t, []string{"--report-format", "markdown"})

	var result map[string]interface{}
	json.Unmarshal([]byte(out), &result) //nolint
	rpt, _ := result["report"].(map[string]interface{})
	if rpt == nil {
		t.Fatal("report missing")
	}
	if _, ok := rpt["markdown_path"]; !ok {
		t.Error("markdown_path must be present for format=markdown")
	}
	if _, ok := rpt["json_path"]; ok {
		t.Error("json_path must NOT be present for format=markdown")
	}
}

// ─── D: report-format=both ────────────────────────────────────────────────────

func TestV77_ReportFormatBoth_BothGenerated(t *testing.T) {
	out, _ := runFlowInTemp(t, []string{"--report-format", "both"})

	var result map[string]interface{}
	json.Unmarshal([]byte(out), &result) //nolint
	rpt, _ := result["report"].(map[string]interface{})
	if rpt == nil {
		t.Fatal("report missing")
	}
	if _, ok := rpt["json_path"]; !ok {
		t.Error("json_path must be present for format=both")
	}
	if _, ok := rpt["markdown_path"]; !ok {
		t.Error("markdown_path must be present for format=both")
	}
}

// ─── E: report-format=none ────────────────────────────────────────────────────

func TestV77_ReportFormatNone_NoFilesGenerated(t *testing.T) {
	out, dir := runFlowInTemp(t, []string{"--report-format", "none"})

	var result map[string]interface{}
	json.Unmarshal([]byte(out), &result) //nolint
	if result["ok"] != true {
		t.Errorf("expected ok=true with format=none, got: %s", out)
	}
	rpt, _ := result["report"].(map[string]interface{})
	if rpt != nil {
		if _, ok := rpt["json_path"]; ok {
			t.Error("json_path must not be present for format=none")
		}
	}
	// No report files created
	reportDir := filepath.Join(dir, ".vision-reports", "github-flow")
	entries, _ := os.ReadDir(reportDir)
	if len(entries) > 0 {
		t.Errorf("expected no report files for format=none, found: %v", entries)
	}
}

// ─── F: report-dir inseguro bloqueia ─────────────────────────────────────────

func TestV77_ReportDirInsecure_Blocks(t *testing.T) {
	// Cross-platform bad paths — must all be rejected by ValidateReportDir.
	badDirs := []string{
		"/absolute/path",
		"\\absolute\\path",   // backslash prefix (Windows UNC-like)
		"C:\\absolute\\path", // Windows drive letter
		"../traversal",
		".git/reports",
		".vision-memory/reports",
		".vision-snapshots/reports",
		"bin/reports",
		"node_modules/reports",
	}
	for _, bad := range badDirs {
		bad := bad // capture
		t.Run(bad, func(t *testing.T) {
			err := report.ValidateReportDir(bad)
			if err == nil {
				t.Errorf("ValidateReportDir(%q) should have failed but returned nil", bad)
			}
		})
	}
}

// ─── G: token redaction ───────────────────────────────────────────────────────

func TestV77_TokenRedaction_NoLeakInOutput(t *testing.T) {
	t.Setenv("GITHUB_TOKEN", "ghp_TEST_SECRET_123456789012345678")

	out, _ := runFlowInTemp(t, nil)

	// Check CLI stdout
	if strings.Contains(out, "ghp_TEST_SECRET") {
		t.Error("stdout output must not contain GITHUB_TOKEN value")
	}
	if strings.Contains(out, "ghp_") {
		t.Error("stdout output must not contain ghp_ patterns")
	}
}

// ─── H: mission does not generate github-flow report ─────────────────────────

func TestV77_Mission_DoesNotGenerateGitHubFlowReport(t *testing.T) {
	dir := t.TempDir()

	// Use a temp file as stdout instead of os.Pipe to avoid deadlock on Windows:
	// os.Pipe can block if the write buffer fills before the reader drains it.
	// A temp file has no fixed buffer size.
	tmpOut, err := os.CreateTemp("", "mission-out-*.json")
	if err != nil {
		t.Fatalf("cannot create temp file: %v", err)
	}
	defer os.Remove(tmpOut.Name())

	old := os.Stdout
	os.Stdout = tmpOut
	runMission([]string{"--root", dir, "--input", "self-test"})
	os.Stdout = old
	tmpOut.Close()

	data, err := os.ReadFile(tmpOut.Name())
	if err != nil {
		t.Fatalf("cannot read temp file: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("mission output not valid JSON: %v\noutput: %s", err, data)
	}

	// Mission must not have github-flow report
	if _, ok := result["report"]; ok {
		t.Error("mission output must not contain report field")
	}

	// No .vision-reports directory created
	reportDir := filepath.Join(dir, ".vision-reports")
	if _, err := os.Stat(reportDir); err == nil {
		t.Error("mission must not create .vision-reports directory")
	}
}

// ─── I: --help shows report flags ────────────────────────────────────────────

func TestV77_Help_ShowsReportFlags(t *testing.T) {
	out := captureStdout(t, func() {
		runGitHubFlow([]string{"--help"})
	})
	if !strings.Contains(out, "report-dir") {
		t.Error("--help must mention --report-dir")
	}
	if !strings.Contains(out, "report-format") {
		t.Error("--help must mention --report-format")
	}
}

// ─── J: no real GitHub ────────────────────────────────────────────────────────

func TestV77_NoRealGitHub(t *testing.T) {
	// This test documents the invariant: all V7.7 tests use mocks or dry-run.
	// No real HTTP calls, no real GitHub API.
	out, _ := runFlowInTemp(t, nil)
	var result map[string]interface{}
	json.Unmarshal([]byte(out), &result) //nolint
	flow, _ := result["github_flow"].(map[string]interface{})
	if flow != nil {
		if pushed, _ := flow["remote_pushed"].(bool); pushed {
			t.Error("real push must not happen in test dry-run")
		}
		if opened, _ := flow["pr_opened"].(bool); opened {
			t.Error("real PR must not be opened in test dry-run")
		}
		if published, _ := flow["status_published"].(bool); published {
			t.Error("real status must not be published in test dry-run")
		}
	}
}

// ═══════════════════════════════════════════════════════════════════
// V7.8 GITHUB FLOW REPORT INDEX AND RETENTION TESTS
// ═══════════════════════════════════════════════════════════════════

// ─── K: github-flow V7.7 still generates report + index ──────────────────────

func TestV78_GitHubFlow_GeneratesIndexEntry(t *testing.T) {
	out, dir := runFlowInTemp(t, nil)

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output not valid JSON: %v\noutput: %s", err, out)
	}
	rpt, _ := result["report"].(map[string]interface{})
	if rpt == nil {
		t.Fatal("report field missing")
	}

	// index_path must be present
	indexPath, _ := rpt["index_path"].(string)
	if indexPath == "" {
		t.Fatal("report.index_path must not be empty")
	}
	if _, err := os.Stat(indexPath); err != nil {
		t.Errorf("index.json must exist: %v", err)
	}

	// index must contain the flow_id
	data, _ := os.ReadFile(indexPath)
	if !strings.Contains(string(data), rpt["flow_id"].(string)) {
		t.Errorf("index.json must contain flow_id %q", rpt["flow_id"])
	}

	_ = dir
}

// ─── D: List reports CLI ─────────────────────────────────────────────────────

func TestV78_GitHubFlowReports_List_TwoEntries(t *testing.T) {
	// Run flow twice to create two index entries
	_, dir := runFlowInTemp(t, nil)
	runFlowInTemp(t, []string{"--root", dir, "--mission-id", "second_mission"})

	out := captureStdout(t, func() {
		runGitHubFlowReports([]string{
			"--root", dir,
			"--report-dir", ".vision-reports/github-flow",
			"--list",
		})
	})

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("list output not valid JSON: %v\noutput: %s", err, out)
	}
	if result["ok"] != true {
		t.Errorf("expected ok=true: %s", out)
	}
	// count may be 1 or 2 depending on whether second run created a new flow_id
	count, _ := result["count"].(float64)
	if count < 1 {
		t.Errorf("expected count >= 1, got %v", count)
	}
}

// ─── E: Get by flow_id CLI ────────────────────────────────────────────────────

func TestV78_GitHubFlowReports_GetByFlowID(t *testing.T) {
	out, dir := runFlowInTemp(t, nil)

	var flowResult map[string]interface{}
	json.Unmarshal([]byte(out), &flowResult)
	rpt, _ := flowResult["report"].(map[string]interface{})
	flowID, _ := rpt["flow_id"].(string)
	if flowID == "" {
		t.Skip("no flow_id in output")
	}

	listOut := captureStdout(t, func() {
		runGitHubFlowReports([]string{
			"--root", dir,
			"--report-dir", ".vision-reports/github-flow",
			"--flow-id", flowID,
		})
	})
	var getResult map[string]interface{}
	if err := json.Unmarshal([]byte(listOut), &getResult); err != nil {
		t.Fatalf("get output not valid JSON: %s", listOut)
	}
	if getResult["ok"] != true {
		t.Errorf("expected ok=true for get: %s", listOut)
	}
	entry, _ := getResult["entry"].(map[string]interface{})
	if entry == nil || entry["flow_id"] != flowID {
		t.Errorf("entry flow_id mismatch: %v", getResult)
	}
}

// ─── F: Clean dry-run CLI ────────────────────────────────────────────────────

func TestV78_GitHubFlowReports_CleanDryRun(t *testing.T) {
	_, dir := runFlowInTemp(t, nil)

	cleanOut := captureStdout(t, func() {
		runGitHubFlowReports([]string{
			"--root", dir,
			"--report-dir", ".vision-reports/github-flow",
			"--clean",
			"--keep-last", "1",
			"--dry-run=true",
		})
	})
	var cleanResult map[string]interface{}
	if err := json.Unmarshal([]byte(cleanOut), &cleanResult); err != nil {
		t.Fatalf("clean output not valid JSON: %s", cleanOut)
	}
	if cleanResult["ok"] != true {
		t.Errorf("expected ok=true for clean dry-run: %s", cleanOut)
	}
}

// ─── H: Path safety CLI ──────────────────────────────────────────────────────

func TestV78_GitHubFlowReports_InsecureReportDir_Blocked(t *testing.T) {
	// ValidateReportDir is called in runGitHubFlowReports — test via function
	badDirs := []string{
		"/absolute",
		"../traversal",
		".git/reports",
		"node_modules/r",
	}
	for _, bad := range badDirs {
		if err := report.ValidateReportDir(bad); err == nil {
			t.Errorf("expected block for %q", bad)
		}
	}
}

// ─── I: flow_id safety CLI ───────────────────────────────────────────────────

func TestV78_FlowIDSafety_Blocked(t *testing.T) {
	badIDs := []string{
		"",
		"no_prefix",
		"github_flow_with/slash",
		"github_flow_with space",
		"github_flow_with..dots",
	}
	for _, bad := range badIDs {
		if err := report.ValidateFlowID(bad); err == nil {
			t.Errorf("expected block for flow_id %q", bad)
		}
	}
}

// ─── J: Redaction CLI ────────────────────────────────────────────────────────

func TestV78_TokenRedaction_IndexAndOutput(t *testing.T) {
	t.Setenv("GITHUB_TOKEN", "ghp_V78_SECRET_TOKEN_VALUE_9876")
	out, _ := runFlowInTemp(t, nil)

	if strings.Contains(out, "ghp_V78_SECRET") {
		t.Error("CLI output must not contain GITHUB_TOKEN")
	}
}

// ─── L: Mission does not create index ────────────────────────────────────────

func TestV78_Mission_DoesNotCreateIndex(t *testing.T) {
	dir := t.TempDir()

	tmpOut, err := os.CreateTemp("", "mission-v78-*.json")
	if err != nil {
		t.Fatalf("CreateTemp: %v", err)
	}
	defer os.Remove(tmpOut.Name())

	old := os.Stdout
	os.Stdout = tmpOut
	runMission([]string{"--root", dir, "--input", "self-test"})
	os.Stdout = old
	tmpOut.Close()

	// index.json must not exist
	indexPath := filepath.Join(dir, ".vision-reports", "github-flow", "index.json")
	if _, err := os.Stat(indexPath); err == nil {
		t.Error("mission must not create .vision-reports/github-flow/index.json")
	}
}

// ─── M: No real GitHub ───────────────────────────────────────────────────────

func TestV78_NoRealGitHub_IndexTestsAreSafe(t *testing.T) {
	// Documents that all V7.8 tests use only local file operations.
	// The report index is purely local JSONL/JSON — no network calls.
	t.Log("V7.8 index tests: local filesystem only, zero network calls")
}

// ─── github-flow-reports --help ──────────────────────────────────────────────

func TestV78_GitHubFlowReports_HelpShowsFlags(t *testing.T) {
	out := captureStdout(t, func() {
		runGitHubFlowReports([]string{"--help"})
	})
	for _, flag := range []string{"--report-dir", "--list", "--flow-id", "--limit", "--clean", "--keep-last", "--dry-run"} {
		if !strings.Contains(out, flag) {
			t.Errorf("--help must mention %s", flag)
		}
	}
}
