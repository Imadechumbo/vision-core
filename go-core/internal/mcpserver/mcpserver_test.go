package mcpserver_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/graphmemory"
	"github.com/visioncore/go-core/internal/mcpserver"
	"github.com/visioncore/go-core/internal/report"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func buildIndex(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	os.WriteFile(filepath.Join(root, "main.go"), []byte(
		"package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"hello\") }\nfunc GitHubFlow() {}\n",
	), 0o644)
	if _, err := graphmemory.Index(root); err != nil {
		t.Fatalf("graphmemory.Index: %v", err)
	}
	return root
}

func mkArgs(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

func seedReport(t *testing.T, root string) string {
	t.Helper()
	dir := report.DefaultReportDir
	entry := report.FlowReportIndexEntry{
		FlowID:       "github_flow_20240101T120000Z_abc12345",
		CreatedAtUTC: "2024-01-01T12:00:00Z",
		Version:      "V7.7",
		Mode:         "local_safety_drill",
		OK:           true,
		Owner:        "testowner",
		Repo:         "testrepo",
		MissionID:    "mission_test",
		IssueType:    "test",
		BaseBranch:   "v6-go-enterprise-runtime",
		WorkBranch:   "vision/remediation/mission_test",
		ChangedFiles: []string{"test.go"},
		JSONPath:     "/SHOULD_NOT_BE_READ/secret.json",
	}
	if err := report.AppendOrUpdateEntry(root, dir, entry); err != nil {
		t.Fatalf("seed report: %v", err)
	}
	return entry.FlowID
}

// ─── TestExecuteProjectSummary ────────────────────────────────────────────────

func TestExecuteProjectSummary(t *testing.T) {
	root := buildIndex(t)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolProjectSummary, Root: root})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}
	if resp.Payload == nil {
		t.Error("expected payload")
	}
}

func TestExecuteProjectSummaryNoIndexGraceful(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolProjectSummary, Root: root})
	// Must not fail — returns graceful note
	if !resp.OK {
		t.Errorf("project_summary without index should be graceful, got error: %s", resp.Error)
	}
}

// ─── TestExecuteGraphSummary ──────────────────────────────────────────────────

func TestExecuteGraphSummary(t *testing.T) {
	root := buildIndex(t)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGraphSummary, Root: root})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}
}

func TestExecuteGraphSummaryNoIndex(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGraphSummary, Root: root})
	if resp.OK {
		t.Error("graph_summary without index must return ok=false")
	}
	if !strings.Contains(resp.Error, "graph index not found") {
		t.Errorf("expected 'graph index not found' in error: %q", resp.Error)
	}
}

// ─── TestExecuteGraphQuery ────────────────────────────────────────────────────

func TestExecuteGraphQuery(t *testing.T) {
	root := buildIndex(t)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphQuery,
		Root: root,
		Args: mkArgs(map[string]interface{}{"query": "github", "limit": 10}),
	})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}
}

func TestExecuteGraphQueryNoIndex(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphQuery,
		Root: root,
		Args: mkArgs(map[string]interface{}{"query": "x", "limit": 5}),
	})
	if resp.OK {
		t.Error("graph_query without index must return ok=false")
	}
}

func TestExecuteGraphQueryNoArgs(t *testing.T) {
	root := buildIndex(t)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGraphQuery, Root: root})
	if resp.OK {
		t.Error("expected ok=false when args missing")
	}
}

func TestExecuteGraphQueryInvalidArgs(t *testing.T) {
	root := buildIndex(t)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphQuery,
		Root: root,
		Args: json.RawMessage(`{not valid}`),
	})
	if resp.OK {
		t.Error("expected ok=false for invalid JSON args")
	}
}

// ─── TestExecuteListReports ───────────────────────────────────────────────────

func TestExecuteListReports(t *testing.T) {
	root := t.TempDir()
	seedReport(t, root)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolListReports, Root: root})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}
}

func TestExecuteListReportsEmpty(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolListReports, Root: root})
	if !resp.OK {
		t.Errorf("list_reports on empty dir should be graceful: %s", resp.Error)
	}
}

// ─── TestExecuteGitHubFlowReportsListAlias ────────────────────────────────────

func TestExecuteGitHubFlowReportsListAlias(t *testing.T) {
	root := t.TempDir()
	seedReport(t, root)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGithubFlowReportsList, Root: root})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}
}

// ─── TestExecuteGetReportDoesNotReadArbitraryJSONPath ─────────────────────────

func TestExecuteGetReportDoesNotReadArbitraryJSONPath(t *testing.T) {
	root := t.TempDir()
	flowID := seedReport(t, root)

	// The seeded entry has JSONPath = "/SHOULD_NOT_BE_READ/secret.json"
	// The handler must NOT attempt to read it.
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGetReport,
		Root: root,
		Args: mkArgs(map[string]interface{}{"flow_id": flowID}),
	})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}

	// Verify json_path is NOT in the payload
	payload, _ := json.Marshal(resp.Payload)
	payloadStr := string(payload)
	if strings.Contains(payloadStr, "SHOULD_NOT_BE_READ") {
		t.Error("get_report must not expose or read JSONPath")
	}
	if strings.Contains(payloadStr, "json_path") {
		t.Error("get_report payload must not include json_path field")
	}
	// Must have index fields
	if !strings.Contains(payloadStr, "flow_id") {
		t.Error("get_report payload must include flow_id")
	}
}

func TestExecuteGetReportNoArgs(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGetReport, Root: root})
	if resp.OK {
		t.Error("expected ok=false when no args")
	}
}

func TestExecuteGetReportInvalidFlowID(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGetReport,
		Root: root,
		Args: mkArgs(map[string]interface{}{"flow_id": "bad id with spaces"}),
	})
	if resp.OK {
		t.Error("expected ok=false for invalid flow_id")
	}
}

// ─── TestExecutePassGoldStatusUnknown ────────────────────────────────────────

func TestExecutePassGoldStatusUnknown(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPassGoldStatus, Root: root})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}

	payload, _ := json.Marshal(resp.Payload)
	payloadStr := string(payload)

	// Must return status: "unknown"
	if !strings.Contains(payloadStr, `"status":"unknown"`) {
		t.Errorf("pass_gold_status must return status:unknown, got: %s", payloadStr)
	}
	// Must set read_only: true
	if !strings.Contains(payloadStr, `"read_only":true`) {
		t.Errorf("pass_gold_status must set read_only:true, got: %s", payloadStr)
	}
	// Must set deploy_performed: false
	if !strings.Contains(payloadStr, `"deploy_performed":false`) {
		t.Errorf("pass_gold_status must set deploy_performed:false, got: %s", payloadStr)
	}
	// Must set status_published: false
	if !strings.Contains(payloadStr, `"status_published":false`) {
		t.Errorf("pass_gold_status must set status_published:false, got: %s", payloadStr)
	}
}

// ─── TestMutableToolsAreBlockedReadOnly ───────────────────────────────────────

func TestMutableToolsAreBlockedReadOnly(t *testing.T) {
	mutableTools := []string{
		"vision.apply_patch",
		"vision.write_file",
		"vision.commit",
		"vision.push",
		"vision.open_pr",
		"vision.publish_status",
		"vision.run_mission_real",
		"vision.rollback",
		"vision.deploy",
	}
	for _, tool := range mutableTools {
		t.Run(tool, func(t *testing.T) {
			resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
			if resp.OK {
				t.Errorf("blocked tool %q must return ok=false", tool)
			}
			if resp.Error != "tool is not allowed in read-only MCP control plane" {
				t.Errorf("wrong error for %q: %q", tool, resp.Error)
			}
		})
	}
}

// ─── TestMCPReadonlyCommandExists ─────────────────────────────────────────────

func TestMCPReadonlyCommandExists(t *testing.T) {
	// Verify all 9 mutating tools are actually blocked
	for _, tool := range []string{
		"vision.apply_patch", "vision.write_file", "vision.commit",
		"vision.push", "vision.open_pr", "vision.publish_status",
		"vision.run_mission_real", "vision.rollback", "vision.deploy",
	} {
		if !mcpserver.IsBlocked(tool) {
			t.Errorf("tool %q must be in blocked set", tool)
		}
	}
	// Verify all read-only tools are allowed
	for _, tool := range []string{
		mcpserver.ToolProjectSummary, mcpserver.ToolGraphQuery,
		mcpserver.ToolGraphSummary, mcpserver.ToolListReports,
		mcpserver.ToolGetReport, mcpserver.ToolGithubFlowReportsList,
		mcpserver.ToolPassGoldStatus,
	} {
		if !mcpserver.IsAllowed(tool) {
			t.Errorf("tool %q must be in allowed set", tool)
		}
	}
}

// ─── Unknown tool ─────────────────────────────────────────────────────────────

func TestDispatchUnknownTool(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: "vision.totally_unknown_xyz"})
	if resp.OK {
		t.Error("unknown tool must return ok=false")
	}
}

// ─── Token redaction via graph ────────────────────────────────────────────────

func TestGraphSummaryNoTokenLeak(t *testing.T) {
	root := t.TempDir()
	os.WriteFile(filepath.Join(root, "secret.go"), []byte(
		"package main\n// ghp_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAK\nfunc main() {}\n",
	), 0o644)
	graphmemory.Index(root)

	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGraphSummary, Root: root})
	if !resp.OK {
		t.Fatalf("expected ok: %s", resp.Error)
	}
	b, _ := json.Marshal(resp.Payload)
	if strings.Contains(string(b), "ghp_") {
		t.Error("token leaked in graph_summary response")
	}
}

// ── V8.1 Tests ────────────────────────────────────────────────────────────────

// ─── TestExecuteGraphProviders ────────────────────────────────────────────────

func TestExecuteGraphProviders(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGraphProviders})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, "local") {
		t.Error("providers must include 'local'")
	}
	if !strings.Contains(s, "graphify") {
		t.Error("providers must include 'graphify'")
	}
}

// ─── TestExecuteGraphProviderStatusLocal ──────────────────────────────────────

func TestExecuteGraphProviderStatusLocal(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphProviderStatus,
		Args: mkArgs(map[string]string{"provider": "local"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"available":true`) {
		t.Errorf("local provider must be available: %s", s)
	}
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must be read_only: %s", s)
	}
}

// ─── TestExecuteGraphProviderStatusGraphifyUnavailable ────────────────────────

func TestExecuteGraphProviderStatusGraphifyUnavailable(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphProviderStatus,
		Args: mkArgs(map[string]string{"provider": "graphify"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	// If graphify is unavailable, must include reason
	if strings.Contains(s, `"available":false`) {
		if !strings.Contains(s, "graphify provider not available") {
			t.Errorf("must have canonical reason when unavailable: %s", s)
		}
	}
}

// ─── TestExecuteGraphImpactQuery ──────────────────────────────────────────────

func TestExecuteGraphImpactQuery(t *testing.T) {
	root := buildIndex(t)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphImpactQuery,
		Root: root,
		Args: mkArgs(map[string]interface{}{"query": "github", "limit": 10}),
	})
	if !resp.OK {
		t.Errorf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must be read_only: %s", s)
	}
}

func TestExecuteGraphImpactQueryNoIndex(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphImpactQuery,
		Root: root,
		Args: mkArgs(map[string]interface{}{"query": "x", "limit": 5}),
	})
	if resp.OK {
		t.Error("impact_query without index must return ok=false")
	}
	if !strings.Contains(resp.Error, "graph index not found") {
		t.Errorf("expected 'graph index not found': %q", resp.Error)
	}
}

func TestExecuteGraphImpactQueryNoArgs(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGraphImpactQuery})
	if resp.OK {
		t.Error("expected ok=false with no args")
	}
}

// ─── TestExecuteGraphDryRunContext ────────────────────────────────────────────

func TestExecuteGraphDryRunContext(t *testing.T) {
	root := buildIndex(t)
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphDryRunContext,
		Root: root,
		Args: mkArgs(map[string]interface{}{
			"query":      "CORS origin blocked",
			"issue_type": "cors_blocked",
			"limit":      10,
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"dry_run":true`) {
		t.Errorf("must have dry_run:true: %s", s)
	}
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must have read_only:true: %s", s)
	}
	if !strings.Contains(s, "candidate_files") {
		t.Errorf("must have candidate_files: %s", s)
	}
	if !strings.Contains(s, "risk_hints") {
		t.Errorf("must have risk_hints: %s", s)
	}
}

// ─── TestGraphDryRunContextDoesNotWriteFiles ──────────────────────────────────

func TestGraphDryRunContextDoesNotWriteFiles(t *testing.T) {
	root := buildIndex(t)

	// Capture files before
	before := listFiles(t, root)

	mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGraphDryRunContext,
		Root: root,
		Args: mkArgs(map[string]interface{}{"query": "test", "limit": 5}),
	})

	// Capture files after — no new files must have been created
	after := listFiles(t, root)

	for f := range after {
		if _, existed := before[f]; !existed {
			t.Errorf("dry_run_context created unexpected file: %s", f)
		}
	}
}

func listFiles(t *testing.T, root string) map[string]bool {
	t.Helper()
	files := map[string]bool{}
	filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		files[path] = true
		return nil
	})
	return files
}

// ─── TestMutableToolsAreStillBlockedReadOnly ──────────────────────────────────

func TestMutableToolsAreStillBlockedReadOnly(t *testing.T) {
	for _, tool := range []string{
		"vision.apply_patch", "vision.write_file", "vision.commit",
		"vision.push", "vision.open_pr", "vision.publish_status",
		"vision.run_mission_real", "vision.rollback", "vision.deploy",
	} {
		t.Run(tool, func(t *testing.T) {
			resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
			if resp.OK {
				t.Errorf("%q must return ok=false", tool)
			}
			if resp.Error != "tool is not allowed in read-only MCP control plane" {
				t.Errorf("wrong error for %q: %q", tool, resp.Error)
			}
		})
	}
}

// ─── TestPassGoldStatusStillUnknown ───────────────────────────────────────────

func TestPassGoldStatusStillUnknown(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPassGoldStatus})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"status":"unknown"`) {
		t.Errorf("pass_gold_status must return status:unknown: %s", s)
	}
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must be read_only:true: %s", s)
	}
	if !strings.Contains(s, `"deploy_performed":false`) {
		t.Errorf("must have deploy_performed:false: %s", s)
	}
}

// ─── TestGetReportStillIndexOnly ──────────────────────────────────────────────

func TestGetReportStillIndexOnly(t *testing.T) {
	root := t.TempDir()
	flowID := seedReport(t, root)

	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolGetReport,
		Root: root,
		Args: mkArgs(map[string]interface{}{"flow_id": flowID}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if strings.Contains(s, "SHOULD_NOT_BE_READ") {
		t.Error("get_report must not expose JSONPath contents")
	}
	if strings.Contains(s, "json_path") {
		t.Error("get_report payload must not include json_path field")
	}
}

// ── V8.2 Tests ────────────────────────────────────────────────────────────────

// ─── All V8.2 tools registered ────────────────────────────────────────────────

func TestV82AllNewToolsRegistered(t *testing.T) {
	v82Tools := []string{
		mcpserver.ToolDryRunApplyPatch,
		mcpserver.ToolDryRunWriteFile,
		mcpserver.ToolDryRunGitHubFlow,
		mcpserver.ToolDryRunMission,
		mcpserver.ToolDryRunRiskAssessment,
	}
	for _, tool := range v82Tools {
		if !mcpserver.IsAllowed(tool) {
			t.Errorf("V8.2 tool %q must be in allowed set", tool)
		}
		if mcpserver.IsBlocked(tool) {
			t.Errorf("V8.2 tool %q must not be in blocked set", tool)
		}
	}
}

// ─── vision.dry_run_apply_patch ───────────────────────────────────────────────

func TestExecuteDryRunApplyPatch_DryRunReadOnly(t *testing.T) {
	root := buildIndex(t)
	// Write a test file
	os.WriteFile(filepath.Join(root, "README.md"), []byte("VISION SAFE CONTENT"), 0o644)

	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDryRunApplyPatch,
		Root: root,
		Args: mkArgs(map[string]interface{}{
			"file": "README.md", "find": "VISION", "replace": "VISION", "mode": "exact_match",
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"dry_run":true`) {
		t.Errorf("must have dry_run:true: %s", s)
	}
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must have read_only:true: %s", s)
	}
}

func TestExecuteDryRunApplyPatch_DoesNotModifyFile(t *testing.T) {
	root := t.TempDir()
	content := "ORIGINAL CONTENT"
	path := filepath.Join(root, "test.txt")
	os.WriteFile(path, []byte(content), 0o644)

	mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDryRunApplyPatch,
		Root: root,
		Args: mkArgs(map[string]interface{}{
			"file": "test.txt", "find": "ORIGINAL", "replace": "CHANGED", "mode": "exact_match",
		}),
	})

	after, _ := os.ReadFile(path)
	if string(after) != content {
		t.Error("dry_run_apply_patch must not modify file")
	}
}

func TestExecuteDryRunApplyPatch_NoArgs(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolDryRunApplyPatch})
	if resp.OK {
		t.Error("expected ok=false with no args")
	}
}

// ─── vision.dry_run_write_file ────────────────────────────────────────────────

func TestExecuteDryRunWriteFile_DryRunReadOnly(t *testing.T) {
	root := t.TempDir()
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDryRunWriteFile,
		Root: root,
		Args: mkArgs(map[string]interface{}{
			"file": "tmp-v82-dryrun-test.txt", "content": "test", "operation": "create",
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"dry_run":true`) {
		t.Errorf("must have dry_run:true: %s", s)
	}
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must have read_only:true: %s", s)
	}
}

func TestExecuteDryRunWriteFile_DoesNotCreateFile(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "tmp-v82-dryrun-test.txt")

	mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDryRunWriteFile,
		Root: root,
		Args: mkArgs(map[string]interface{}{
			"file": "tmp-v82-dryrun-test.txt", "content": "test", "operation": "create",
		}),
	})

	if _, err := os.Stat(target); err == nil {
		t.Error("dry_run_write_file must not create the file")
	}
}

func TestExecuteDryRunWriteFile_NoArgs(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolDryRunWriteFile})
	if resp.OK {
		t.Error("expected ok=false with no args")
	}
}

// ─── vision.dry_run_github_flow ───────────────────────────────────────────────

func TestExecuteDryRunGitHubFlow_DryRunReadOnly(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDryRunGitHubFlow,
		Args: mkArgs(map[string]interface{}{
			"mission_id":    "mission_v82_test",
			"issue_type":    "cors_blocked",
			"base_branch":   "v6-go-enterprise-runtime",
			"work_branch":   "vision/remediation/mission_v82_test",
			"title":         "VISION remediation dry run",
			"changed_files": []string{"go-core/internal/mcpserver/mcpserver.go"},
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"dry_run":true`) {
		t.Errorf("must have dry_run:true: %s", s)
	}
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must have read_only:true: %s", s)
	}
	if !strings.Contains(s, `"would_push":true`) {
		t.Errorf("must have would_push:true for valid input: %s", s)
	}
	if !strings.Contains(s, `"would_open_pr":true`) {
		t.Errorf("must have would_open_pr:true for valid input: %s", s)
	}
	if !strings.Contains(s, `"would_publish_status":true`) {
		t.Errorf("must have would_publish_status:true for valid input: %s", s)
	}
}

func TestExecuteDryRunGitHubFlow_NoArgs(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolDryRunGitHubFlow})
	if resp.OK {
		t.Error("expected ok=false with no args")
	}
}

// ─── vision.dry_run_mission ───────────────────────────────────────────────────

func TestExecuteDryRunMission_DryRunReadOnly(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDryRunMission,
		Args: mkArgs(map[string]interface{}{"input": "CORS origin blocked", "mode": "remediation_plan"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"dry_run":true`) {
		t.Errorf("must have dry_run:true: %s", s)
	}
	if !strings.Contains(s, `"read_only":true`) {
		t.Errorf("must have read_only:true: %s", s)
	}
	if !strings.Contains(s, `"would_patch":false`) {
		t.Errorf("would_patch must be false: %s", s)
	}
	if !strings.Contains(s, `"would_create_report":false`) {
		t.Errorf("would_create_report must be false: %s", s)
	}
}

func TestExecuteDryRunMission_NoArgs(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolDryRunMission})
	if resp.OK {
		t.Error("expected ok=false with no args")
	}
}

// ─── vision.dry_run_risk_assessment ───────────────────────────────────────────

func TestExecuteDryRunRiskAssessment_DangerousPathBlocked(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDryRunRiskAssessment,
		Args: mkArgs(map[string]interface{}{
			"files":     []string{".env", "go-core/internal/mcpserver/mcpserver.go"},
			"operation": "patch",
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"dry_run":true`) {
		t.Errorf("must have dry_run:true: %s", s)
	}
	if !strings.Contains(s, `"blocked":true`) {
		t.Errorf(".env must cause blocked:true: %s", s)
	}
}

func TestExecuteDryRunRiskAssessment_NoArgs(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolDryRunRiskAssessment})
	if resp.OK {
		t.Error("expected ok=false with no args")
	}
}

// ─── Regression: V8.0/V8.1 tools still work ──────────────────────────────────

func TestV81ToolsStillWorkInV82(t *testing.T) {
	root := buildIndex(t)
	for _, tc := range []struct {
		tool string
		args interface{}
	}{
		{mcpserver.ToolGraphSummary, nil},
		{mcpserver.ToolGraphProviders, nil},
		{mcpserver.ToolPassGoldStatus, nil},
		{mcpserver.ToolGraphQuery, map[string]interface{}{"query": "github", "limit": 5}},
		{mcpserver.ToolGraphProviderStatus, map[string]interface{}{"provider": "local"}},
	} {
		req := mcpserver.ToolRequest{Tool: tc.tool, Root: root}
		if tc.args != nil {
			req.Args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(req)
		if !resp.OK {
			t.Errorf("V8.1 tool %q still must work: %s", tc.tool, resp.Error)
		}
	}
}

// ── V8.3 CodeBurn Tests ──────────────────────────────────────────────────────

func TestV83CodeBurnToolsRegistered(t *testing.T) {
	tools := []string{
		mcpserver.ToolCodeBurnEstimate,
		mcpserver.ToolCodeBurnPolicyCheck,
		mcpserver.ToolCodeBurnBudgetPlan,
		mcpserver.ToolCodeBurnGuardStatus,
		mcpserver.ToolCodeBurnExplain,
	}
	for _, tool := range tools {
		if !mcpserver.IsAllowed(tool) {
			t.Errorf("V8.3 CodeBurn tool %q must be allowed", tool)
		}
		if mcpserver.IsBlocked(tool) {
			t.Errorf("V8.3 CodeBurn tool %q must not be blocked", tool)
		}
	}
}

func TestExecuteCodeBurnGuardStatus_DryRunReadOnlyV83(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolCodeBurnGuardStatus})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.3"`, `"deploy_allowed":false`, `"mutations_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteCodeBurnEstimate_LocalOfflineCostZero(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolCodeBurnEstimate,
		Args: mkArgs(map[string]interface{}{
			"operation": "patch", "mission_input": "CORS origin blocked",
			"files": []string{"go-core/internal/mcpserver/mcpserver.go"}, "commands": []string{"go test ./..."},
			"provider": "local", "model": "offline", "estimated_tokens_in": 1000, "estimated_tokens_out": 500,
			"estimated_runtime_seconds": 30, "max_files": 20, "max_commands": 10, "max_tokens": 100000,
			"max_runtime_seconds": 600, "max_estimated_cost_usd": 1.00,
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.3"`, `"estimated_cost_usd":0`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteCodeBurnPolicyCheck_BlocksEnvTraversalAndLimits(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolCodeBurnPolicyCheck,
		Args: mkArgs(map[string]interface{}{
			"operation": "patch", "files": []string{".env", "../secret.txt", "go-core/internal/mcpserver/mcpserver.go"},
			"commands": []string{"go test ./...", "go build ./cmd/vision-core"}, "provider": "local", "model": "offline",
			"estimated_tokens_in": 1000, "estimated_tokens_out": 1000, "estimated_runtime_seconds": 30,
			"max_files": 1, "max_commands": 1, "max_tokens": 100, "max_runtime_seconds": 1, "max_estimated_cost_usd": 0.01,
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.3"`, `"blocked":true`, `"risk_level":"critical"`, "sensitive env file", "path traversal", "file count", "command count", "estimated tokens", "estimated runtime"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteCodeBurnPolicyCheck_UnknownProviderBlocks(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolCodeBurnPolicyCheck,
		Args: mkArgs(map[string]interface{}{"provider": "unknown-paid", "model": "paid", "require_known_provider": true}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"blocked":true`) || !strings.Contains(s, "unknown provider") {
		t.Fatalf("unknown provider must block: %s", s)
	}
}

func TestExecuteCodeBurnBudgetPlan_RecommendsCheapSafePath(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolCodeBurnBudgetPlan,
		Args: mkArgs(map[string]interface{}{"mission_input": "Corrigir CORS origin blocked", "budget_usd": 0.25, "preferred_provider": "local", "max_steps": 5}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.3"`, `"recommended_provider":"local"`, `"recommended_model":"offline"`, `"estimated_cost_usd":0`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteCodeBurnExplain_ReturnsSummaryAndSafePath(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolCodeBurnExplain,
		Args: mkArgs(map[string]interface{}{"estimate": map[string]interface{}{"blocked": true, "blocked_reasons": []string{"cost exceeds limit"}, "risk_level": "high"}}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.3"`, "CodeBurn blocked", "cost exceeds limit", "safe_path"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

// ── V8.4 Impeccable UI Guard Tests ──────────────────────────────────────────

func TestV84ImpeccableToolsRegistered(t *testing.T) {
	tools := []string{
		mcpserver.ToolImpeccableUIRisk,
		mcpserver.ToolImpeccableFileClassify,
		mcpserver.ToolImpeccableVisualGatePlan,
		mcpserver.ToolImpeccableGuardStatus,
		mcpserver.ToolImpeccableExplain,
	}
	for _, tool := range tools {
		if !mcpserver.IsAllowed(tool) {
			t.Errorf("V8.4 Impeccable tool %q must be allowed", tool)
		}
		if mcpserver.IsBlocked(tool) {
			t.Errorf("V8.4 Impeccable tool %q must not be blocked", tool)
		}
	}
}

func TestExecuteImpeccableUIRisk_DryRunReadOnlyV84(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolImpeccableUIRisk,
		Args: mkArgs(map[string]interface{}{
			"operation": "frontend_change", "files": []string{"frontend/index.html", "frontend/styles.css"},
			"route": "/", "viewport": "mobile", "framework": "static", "description": "Ajuste visual do dashboard",
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.4"`, `"VISUAL_DIFF_REQUIRED"`, `"PASS_GOLD"`, `"PASS_SECURE"`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteImpeccableFileClassify_GroupsFrontendBackendDangerous(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolImpeccableFileClassify,
		Args: mkArgs(map[string]interface{}{"files": []string{"frontend/index.html", "go-core/internal/github/github.go", ".env"}}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.4"`, `"ui_files":["frontend/index.html"]`, `"backend_files":["go-core/internal/github/github.go"]`, `"dangerous_files":[".env"]`, `"blocked":true`, `"risk_level":"critical"`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteImpeccableVisualGatePlan_CommandsNotExecuted(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolImpeccableVisualGatePlan,
		Args: mkArgs(map[string]interface{}{"route": "/", "viewport": "mobile", "files": []string{"frontend/index.html"}, "description": "Alteração visual"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.4"`, `"commands_executed":false`, `"visual_diff"`, `"mobile_viewport"`, `"accessibility_contrast"`, `"route_load"`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteImpeccableGuardStatus_DeniesBrowserScreenshotsMutations(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolImpeccableGuardStatus})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"enabled":true`, `"browser_execution_allowed":false`, `"screenshots_allowed":false`, `"mutations_allowed":false`, `"deploy_allowed":false`, `"external_calls_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteImpeccableExplain_ReturnsSummaryAndSafePath(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolImpeccableExplain,
		Args: mkArgs(map[string]interface{}{"estimate": map[string]interface{}{"blocked": true, "blocked_reasons": []string{"dangerous UI path"}, "risk_level": "high"}}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"dry_run":true`, `"read_only":true`, `"version":"V8.4"`, `"summary"`, `"cheapest_safe_path"`, "dangerous UI path"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV83V82V81V80ToolsStillAllowedInV84(t *testing.T) {
	tools := []string{
		mcpserver.ToolProjectSummary,
		mcpserver.ToolGraphQuery,
		mcpserver.ToolGraphSummary,
		mcpserver.ToolListReports,
		mcpserver.ToolGetReport,
		mcpserver.ToolGithubFlowReportsList,
		mcpserver.ToolPassGoldStatus,
		mcpserver.ToolGraphProviders,
		mcpserver.ToolGraphProviderStatus,
		mcpserver.ToolGraphImpactQuery,
		mcpserver.ToolGraphDryRunContext,
		mcpserver.ToolDryRunApplyPatch,
		mcpserver.ToolDryRunWriteFile,
		mcpserver.ToolDryRunGitHubFlow,
		mcpserver.ToolDryRunMission,
		mcpserver.ToolDryRunRiskAssessment,
		mcpserver.ToolCodeBurnEstimate,
		mcpserver.ToolCodeBurnPolicyCheck,
		mcpserver.ToolCodeBurnBudgetPlan,
		mcpserver.ToolCodeBurnGuardStatus,
		mcpserver.ToolCodeBurnExplain,
	}
	for _, tool := range tools {
		if !mcpserver.IsAllowed(tool) {
			t.Errorf("existing tool %q must remain allowed", tool)
		}
	}
}

// ── V8.5 Unified Intelligence Dashboard Tests ────────────────────────────────

func TestV85DashboardToolsRegistered(t *testing.T) {
	for _, tool := range []string{
		mcpserver.ToolDashboardSnapshot,
		mcpserver.ToolDashboardReadiness,
		mcpserver.ToolDashboardIntelligenceSummary,
		mcpserver.ToolDashboardToolInventory,
		mcpserver.ToolDashboardMissionControl,
	} {
		if !mcpserver.IsAllowed(tool) {
			t.Errorf("V8.5 dashboard tool %q must be allowed", tool)
		}
		if mcpserver.IsBlocked(tool) {
			t.Errorf("V8.5 dashboard tool %q must not be blocked", tool)
		}
	}
}

func TestExecuteDashboardSnapshotV85DryRunReadOnly(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDashboardSnapshot,
		Root: t.TempDir(),
		Args: mkArgs(map[string]interface{}{
			"mission_input": "CORS origin blocked",
			"operation":     "mission",
			"files":         []string{"frontend/index.html", "go-core/internal/mcpserver/mcpserver.go"},
			"route":         "/",
			"viewport":      "mobile",
			"provider":      "local",
			"model":         "offline",
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.5"`, `"dry_run":true`, `"read_only":true`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteDashboardReadinessBlocksDeployMutation(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDashboardReadiness,
		Root: t.TempDir(),
		Args: mkArgs(map[string]interface{}{"operation": "patch", "files": []string{"frontend/index.html"}, "provider": "local", "model": "offline"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.5"`, `"dry_run":true`, `"read_only":true`, `"pass_gold_required":true`, `"pass_secure_required":true`, `"deploy_allowed":false`, `"mutation_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteDashboardIntelligenceSummaryHasExecutiveSummary(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDashboardIntelligenceSummary,
		Root: t.TempDir(),
		Args: mkArgs(map[string]interface{}{"mission_input": "CORS origin blocked", "operation": "mission", "files": []string{"frontend/index.html"}, "route": "/", "viewport": "mobile"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	if !strings.Contains(s, `"executive_summary":`) || !strings.Contains(s, `"top_risks":`) || !strings.Contains(s, `"blocked_actions":`) {
		t.Fatalf("summary missing required fields: %s", s)
	}
}

func TestExecuteDashboardToolInventoryListsBlockedMutatingTools(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolDashboardToolInventory})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.5"`, `"dashboard_tools":`, `"blocked_mutating_tools":`, "vision.apply_patch", "vision.deploy"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecuteDashboardMissionControlListsExpectedModules(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolDashboardMissionControl,
		Root: t.TempDir(),
		Args: mkArgs(map[string]interface{}{"mission_input": "CORS origin blocked", "operation": "mission", "files": []string{"frontend/index.html"}, "route": "/", "viewport": "mobile"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{"GraphMemory", "MCPReadOnly", "DryRun", "CodeBurn", "Impeccable", "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("mission control missing %s: %s", want, s)
		}
	}
}

func TestV85MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV85RegressionToolsV84V83V82V81V80StillWork(t *testing.T) {
	root := buildIndex(t)
	cases := []struct {
		tool string
		args interface{}
	}{
		{mcpserver.ToolProjectSummary, nil},
		{mcpserver.ToolGraphProviders, nil},
		{mcpserver.ToolGraphSummary, nil},
		{mcpserver.ToolGraphQuery, map[string]interface{}{"query": "github", "limit": 5}},
		{mcpserver.ToolGraphDryRunContext, map[string]interface{}{"query": "github", "limit": 5}},
		{mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"operation": "patch", "files": []string{"README.md"}}},
		{mcpserver.ToolCodeBurnGuardStatus, nil},
		{mcpserver.ToolImpeccableGuardStatus, nil},
	}
	for _, tc := range cases {
		req := mcpserver.ToolRequest{Tool: tc.tool, Root: root}
		if tc.args != nil {
			req.Args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(req)
		if !resp.OK {
			t.Fatalf("regression tool %s must still work: %s", tc.tool, resp.Error)
		}
	}
}

// ── V8.6 Agent Policy Matrix Tests ──────────────────────────────────────────

func TestV86PolicyMatrixToolsRegistered(t *testing.T) {
	for _, tool := range []string{
		mcpserver.ToolPolicyMatrix,
		mcpserver.ToolPolicyDecide,
		mcpserver.ToolPolicyValidatePlan,
		mcpserver.ToolPolicyConflicts,
		mcpserver.ToolPolicyExplain,
	} {
		if !mcpserver.IsAllowed(tool) {
			t.Fatalf("V8.6 policy matrix tool %q must be allowed", tool)
		}
		if mcpserver.IsBlocked(tool) {
			t.Fatalf("V8.6 policy matrix tool %q must not be blocked", tool)
		}
	}
}

func TestExecutePolicyMatrixV86DryRunReadOnly(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPolicyMatrix, Root: t.TempDir()})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.6"`, `"dry_run":true`, `"read_only":true`, `"matrix_status":"safe_read_only"`, `"PASS_GOLD"`, `"PASS_SECURE"`} {
		if !strings.Contains(s, want) {
			t.Fatalf("policy_matrix missing %s: %s", want, s)
		}
	}
}

func TestExecutePolicyDecideBlocksPatchEngineApplyPatch(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolPolicyDecide,
		Root: t.TempDir(),
		Args: mkArgs(map[string]interface{}{"agent": "PatchEngine", "action": "apply_patch", "tool": "vision.apply_patch", "operation": "patch", "requested_mode": "dry_run"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.6"`, `"dry_run":true`, `"read_only":true`, `"agent":"PatchEngine"`, `"allowed":false`, `"blocked":true`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("policy_decide missing %s: %s", want, s)
		}
	}
}

func TestExecutePolicyValidatePlanBlocksApplyPatch(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolPolicyValidatePlan,
		Root: t.TempDir(),
		Args: mkArgs(map[string]interface{}{"steps": []map[string]interface{}{{"agent": "Scanner", "action": "scan", "tool": "vision.graph_query", "operation": "read"}, {"agent": "PatchEngine", "action": "apply_patch", "tool": "vision.apply_patch", "operation": "patch"}}}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.6"`, `"valid":false`, `"blocked":true`, `"findings":`, `vision.apply_patch`} {
		if !strings.Contains(s, want) {
			t.Fatalf("policy_validate_plan missing %s: %s", want, s)
		}
	}
}

func TestExecutePolicyConflictsClean(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPolicyConflicts, Root: t.TempDir()})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.6"`, `"dry_run":true`, `"read_only":true`, `"conflicts_found":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("policy_conflicts missing %s: %s", want, s)
		}
	}
}

func TestExecutePolicyExplainHasSummaryAndNextSteps(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolPolicyExplain,
		Root: t.TempDir(),
		Args: mkArgs(map[string]interface{}{"agent": "Dashboard", "action": "deploy", "tool": "vision.deploy", "operation": "deploy", "requested_mode": "dry_run"}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.6"`, `"summary":`, `"why_blocked":`, `"safest_next_steps":`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("policy_explain missing %s: %s", want, s)
		}
	}
}

func TestV86MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV86RegressionToolsV85V84V83V82V81V80StillWork(t *testing.T) {
	root := buildIndex(t)
	cases := []struct {
		tool string
		args interface{}
	}{
		{mcpserver.ToolProjectSummary, nil},
		{mcpserver.ToolGraphProviders, nil},
		{mcpserver.ToolGraphSummary, nil},
		{mcpserver.ToolGraphQuery, map[string]interface{}{"query": "github", "limit": 5}},
		{mcpserver.ToolGraphDryRunContext, map[string]interface{}{"query": "github", "limit": 5}},
		{mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"operation": "patch", "files": []string{"README.md"}}},
		{mcpserver.ToolCodeBurnGuardStatus, nil},
		{mcpserver.ToolImpeccableGuardStatus, nil},
		{mcpserver.ToolDashboardToolInventory, nil},
	}
	for _, tc := range cases {
		req := mcpserver.ToolRequest{Tool: tc.tool, Root: root}
		if tc.args != nil {
			req.Args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(req)
		if !resp.OK {
			t.Fatalf("regression tool %s must still work: %s", tc.tool, resp.Error)
		}
	}
}

// ── V8.7 Runtime Contract Registry Tests ───────────────────────────────────

func TestV87ContractRegistryToolsRegistered(t *testing.T) {
	for _, tool := range []string{
		mcpserver.ToolContractRegistry,
		mcpserver.ToolContractGet,
		mcpserver.ToolContractValidatePayload,
		mcpserver.ToolContractAudit,
		mcpserver.ToolContractExplain,
	} {
		if !mcpserver.IsAllowed(tool) {
			t.Fatalf("V8.7 contract registry tool %q must be allowed", tool)
		}
		if mcpserver.IsBlocked(tool) {
			t.Fatalf("V8.7 contract registry tool %q must not be blocked", tool)
		}
	}
}

func TestExecuteContractRegistryV87ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolContractRegistry, Root: t.TempDir()})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.7"`, `"dry_run":true`, `"read_only":true`, `"registry_status":"safe_read_only"`, `"contracts":`, `"modules":`, `"blocked_mutating_tools":`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("contract_registry missing %s: %s", want, s)
		}
	}
}

func TestExecuteContractGetDashboardSnapshot(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolContractGet, Args: mkArgs(map[string]interface{}{"tool": "vision.dashboard_snapshot"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.7"`, `"dry_run":true`, `"read_only":true`, `"contract":`, `"name":"vision.dashboard_snapshot"`, `"category":"dashboard"`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("contract_get missing %s: %s", want, s)
		}
	}
}

func TestExecuteContractValidatePayloadPolicyDecide(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{
		Tool: mcpserver.ToolContractValidatePayload,
		Args: mkArgs(map[string]interface{}{
			"tool": "vision.policy_decide",
			"payload": map[string]interface{}{
				"agent": "PatchEngine", "action": "apply_patch", "tool": "vision.apply_patch", "operation": "patch", "requested_mode": "dry_run",
			},
			"strict": true,
		}),
	})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.7"`, `"dry_run":true`, `"read_only":true`, `"tool":"vision.policy_decide"`, `"valid":true`, `"blocked":false`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("contract_validate_payload missing %s: %s", want, s)
		}
	}
}

func TestExecuteContractAuditClean(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolContractAudit})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.7"`, `"dry_run":true`, `"read_only":true`, `"conflicts_found":false`, `"missing_contracts":[]`, `"duplicate_contracts":[]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("contract_audit missing %s: %s", want, s)
		}
	}
}

func TestExecuteContractExplainHasSummaryAndNextSteps(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolContractExplain, Args: mkArgs(map[string]interface{}{"tool": "vision.deploy", "operation": "deploy"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.7"`, `"dry_run":true`, `"read_only":true`, `"summary":`, `"contract_scope":`, `"blocked_actions":`, `"safest_next_steps":`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("contract_explain missing %s: %s", want, s)
		}
	}
}

func TestV87MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV87RegressionToolsV86ThroughV80StillWork(t *testing.T) {
	root := buildIndex(t)
	cases := []struct {
		name string
		tool string
		args interface{}
	}{
		{"V8.6", mcpserver.ToolPolicyConflicts, nil},
		{"V8.5", mcpserver.ToolDashboardToolInventory, nil},
		{"V8.4", mcpserver.ToolImpeccableGuardStatus, nil},
		{"V8.3", mcpserver.ToolCodeBurnGuardStatus, nil},
		{"V8.2", mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"operation": "patch", "files": []string{"README.md"}}},
		{"V8.1", mcpserver.ToolGraphProviders, nil},
		{"V8.0", mcpserver.ToolProjectSummary, nil},
	}
	for _, tc := range cases {
		req := mcpserver.ToolRequest{Tool: tc.tool, Root: root}
		if tc.args != nil {
			req.Args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(req)
		if !resp.OK {
			t.Fatalf("%s regression tool %s must still work: %s", tc.name, tc.tool, resp.Error)
		}
	}
}

// ── V8.8 Evidence Ledger Tests ──────────────────────────────────────────────

func TestV88EvidenceLedgerToolsRegistered(t *testing.T) {
	for _, tool := range []string{
		mcpserver.ToolEvidenceLedger,
		mcpserver.ToolEvidenceValidate,
		mcpserver.ToolEvidenceSummary,
		mcpserver.ToolEvidenceAudit,
		mcpserver.ToolEvidenceExplain,
	} {
		if !mcpserver.IsAllowed(tool) {
			t.Fatalf("V8.8 evidence ledger tool %q must be allowed", tool)
		}
		if mcpserver.IsBlocked(tool) {
			t.Fatalf("V8.8 evidence ledger tool %q must not be blocked", tool)
		}
	}
}

func TestExecuteEvidenceLedgerV88ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolEvidenceLedger, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{
		"mission_input": "CORS origin blocked",
		"operation":     "mission",
		"evidences":     []map[string]interface{}{{"source": "contract_registry", "tool": "vision.contract_audit", "category": "contract", "status": "pass", "dry_run": true, "read_only": true, "summary": "contract audit conflicts_found=false"}},
	})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.8"`, `"dry_run":true`, `"read_only":true`, `"ledger_status":"dry_run_evidence_only"`, `"gates_missing":["PASS_GOLD","PASS_SECURE"]`, `"blocked":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("evidence_ledger missing %s: %s", want, s)
		}
	}
}

func TestExecuteEvidenceValidateBlocksDryRunPassGold(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolEvidenceValidate, Args: mkArgs(map[string]interface{}{"evidences": []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "status": "pass", "dry_run": true, "pass_gold": true}}, "strict": true})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.8"`, `"valid":false`, `"blocked":true`, `"unsafe_claims":`, `PASS_GOLD_REAL`, `PASS_SECURE_REAL`} {
		if !strings.Contains(s, want) {
			t.Fatalf("evidence_validate missing %s: %s", want, s)
		}
	}
}

func TestExecuteEvidenceSummaryReturnsStrength(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolEvidenceSummary, Args: mkArgs(map[string]interface{}{"mission_input": "CORS origin blocked", "operation": "mission", "evidences": []map[string]interface{}{{"source": "contract_registry", "tool": "vision.contract_audit", "category": "contract", "status": "pass", "dry_run": true, "read_only": true}}})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.8"`, `"evidence_strength":"dry_run_only"`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("evidence_summary missing %s: %s", want, s)
		}
	}
}

func TestExecuteEvidenceAuditUnsafeClaimsFound(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolEvidenceAudit, Args: mkArgs(map[string]interface{}{"evidences": []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "status": "pass", "dry_run": true, "pass_gold": true}}})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.8"`, `"unsafe_claims_found":true`, `"unsafe_claims":`} {
		if !strings.Contains(s, want) {
			t.Fatalf("evidence_audit missing %s: %s", want, s)
		}
	}
}

func TestExecuteEvidenceExplainWhyNotPassGold(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolEvidenceExplain, Args: mkArgs(map[string]interface{}{"tool": "vision.contract_audit", "source": "contract_registry"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V8.8"`, `"why_not_pass_gold":`, `"safest_next_steps":`, `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("evidence_explain missing %s: %s", want, s)
		}
	}
}

func TestV88MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV88RegressionToolsV87ThroughV80StillWork(t *testing.T) {
	root := buildIndex(t)
	cases := []struct {
		name string
		tool string
		args interface{}
	}{
		{"V8.7", mcpserver.ToolContractAudit, nil},
		{"V8.6", mcpserver.ToolPolicyConflicts, nil},
		{"V8.5", mcpserver.ToolDashboardToolInventory, nil},
		{"V8.4", mcpserver.ToolImpeccableGuardStatus, nil},
		{"V8.3", mcpserver.ToolCodeBurnGuardStatus, nil},
		{"V8.2", mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"operation": "patch", "files": []string{"README.md"}}},
		{"V8.1", mcpserver.ToolGraphProviders, nil},
		{"V8.0", mcpserver.ToolProjectSummary, nil},
	}
	for _, tc := range cases {
		req := mcpserver.ToolRequest{Tool: tc.tool, Root: root}
		if tc.args != nil {
			req.Args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(req)
		if !resp.OK {
			t.Fatalf("%s regression tool %s must still work: %s", tc.name, tc.tool, resp.Error)
		}
	}
}

// ── V8.9 Promotion Readiness Gate Tests ─────────────────────────────────────

func payloadMap(t *testing.T, payload interface{}) map[string]interface{} {
	t.Helper()
	b, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	var out map[string]interface{}
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	return out
}

func TestV89ReadinessToolsRegistered(t *testing.T) {
	tools := []string{
		mcpserver.ToolReadinessVerdict,
		mcpserver.ToolReadinessValidate,
		mcpserver.ToolReadinessModules,
		mcpserver.ToolReadinessAudit,
		mcpserver.ToolReadinessExplain,
	}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK {
			t.Fatalf("tool %s must be registered: %s", tool, resp.Error)
		}
	}
}

func TestExecuteReadinessVerdictV89ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolReadinessVerdict, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"mission_input": "CORS origin blocked", "operation": "mission"})})
	if !resp.OK {
		t.Fatalf("readiness verdict failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V8.9" || p["dry_run"] != true || p["read_only"] != true || p["ready"] != false {
		t.Fatalf("unexpected readiness verdict payload: %+v", p)
	}
}

func TestExecuteReadinessValidateBlocksDryRunPromotionClaims(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolReadinessValidate, Args: mkArgs(map[string]interface{}{"evidences": []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "status": "pass", "dry_run": true, "pass_gold": true, "promotion_allowed": true}}, "strict": true})})
	if !resp.OK {
		t.Fatalf("readiness validate failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["valid"] != false || p["blocked"] != true {
		t.Fatalf("validation must block dry-run pass/promote claims: %+v", p)
	}
	claims, _ := p["unsafe_claims"].([]interface{})
	if len(claims) == 0 {
		t.Fatalf("expected unsafe claims: %+v", p)
	}
}

func TestExecuteReadinessModulesListsEvidenceLedgerAndPassGates(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolReadinessModules, Args: mkArgs(map[string]interface{}{"operation": "mission", "files": []string{"frontend/index.html"}, "evidences": []map[string]interface{}{{"source": "contract_registry", "tool": "vision.contract_audit", "status": "pass", "dry_run": true}}})})
	if !resp.OK {
		t.Fatalf("readiness modules failed: %s", resp.Error)
	}
	b, _ := json.Marshal(resp.Payload)
	payload := string(b)
	for _, want := range []string{"EvidenceLedger", "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(payload, want) {
			t.Fatalf("expected %s in modules payload: %s", want, payload)
		}
	}
}

func TestExecuteReadinessAuditDetectsPromotionAttempt(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolReadinessAudit, Args: mkArgs(map[string]interface{}{"evidences": []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "status": "pass", "dry_run": true, "promotion_allowed": true}}})})
	if !resp.OK {
		t.Fatalf("readiness audit failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["promotion_attempt_found"] != true {
		t.Fatalf("expected promotion_attempt_found: %+v", p)
	}
}

func TestExecuteReadinessExplainReturnsWhyNotPromoted(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolReadinessExplain, Args: mkArgs(map[string]interface{}{"mission_input": "CORS origin blocked", "operation": "mission"})})
	if !resp.OK {
		t.Fatalf("readiness explain failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	why, _ := p["why_not_promoted"].([]interface{})
	if len(why) == 0 {
		t.Fatalf("expected why_not_promoted: %+v", p)
	}
}

func TestV89MutatingToolsStillBlockedWithCanonicalError(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("tool %s must remain blocked with canonical error, got %+v", tool, resp)
		}
	}
}

func TestV89RegressionToolsV80ThroughV88StillWork(t *testing.T) {
	root := buildIndex(t)
	tests := []struct {
		version string
		tool    string
		args    interface{}
	}{
		{"V8.8", mcpserver.ToolEvidenceExplain, nil},
		{"V8.7", mcpserver.ToolContractAudit, nil},
		{"V8.6", mcpserver.ToolPolicyConflicts, nil},
		{"V8.5", mcpserver.ToolDashboardToolInventory, nil},
		{"V8.4", mcpserver.ToolImpeccableGuardStatus, nil},
		{"V8.3", mcpserver.ToolCodeBurnGuardStatus, nil},
		{"V8.2", mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"files": []string{"frontend/index.html"}, "operation": "mission"}},
		{"V8.1", mcpserver.ToolGraphProviders, nil},
		{"V8.0", mcpserver.ToolProjectSummary, nil},
	}
	for _, tc := range tests {
		var args json.RawMessage
		if tc.args != nil {
			args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: root, Args: args})
		if !resp.OK {
			t.Fatalf("%s regression tool %s failed: %s", tc.version, tc.tool, resp.Error)
		}
	}
}

// ── V9.0 PASS GOLD Authority Layer Tests ────────────────────────────────────

func v90RealGoldEvidence() map[string]interface{} {
	return map[string]interface{}{"gate": "PASS_GOLD", "status": "pass", "source": "sddf_passgold_validator", "artifact_id": "pg-123", "artifact_type": "pass_gold_report", "dry_run": false, "real_evidence": true, "synthesized": false}
}

func TestV90GateAuthorityToolsRegistered(t *testing.T) {
	tools := []string{
		mcpserver.ToolGateAuthoritySnapshot,
		mcpserver.ToolGateAuthorityDecide,
		mcpserver.ToolGateAuthorityAudit,
		mcpserver.ToolGateAuthorityPolicy,
		mcpserver.ToolGateAuthorityExplain,
	}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK {
			t.Fatalf("tool %s must be registered: %s", tool, resp.Error)
		}
	}
}

func TestExecuteGateAuthoritySnapshotV90ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGateAuthoritySnapshot, Args: mkArgs(map[string]interface{}{"mission_input": "CORS origin blocked", "operation": "promotion_check", "evidences": []map[string]interface{}{v90RealGoldEvidence()}})})
	if !resp.OK {
		t.Fatalf("gate authority snapshot failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V9.0" || p["dry_run"] != true || p["read_only"] != true || p["promotion_allowed"] != false || p["deploy_allowed"] != false {
		t.Fatalf("unexpected snapshot payload: %+v", p)
	}
}

func TestExecuteGateAuthorityDecideRecognizesValidPassGoldReal(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGateAuthorityDecide, Args: mkArgs(map[string]interface{}{"gate": "PASS_GOLD", "evidence": v90RealGoldEvidence()})})
	if !resp.OK {
		t.Fatalf("gate authority decide failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["status"] != "recognized_real_gate" || p["recognized"] != true || p["valid"] != true || p["blocked"] != false {
		t.Fatalf("expected recognized real gate: %+v", p)
	}
}

func TestExecuteGateAuthorityDecideRejectsDashboardDryRunSynthesized(t *testing.T) {
	ev := map[string]interface{}{"gate": "PASS_GOLD", "status": "pass", "source": "dashboard", "artifact_id": "fake", "artifact_type": "dashboard_snapshot", "dry_run": true, "real_evidence": false, "synthesized": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGateAuthorityDecide, Args: mkArgs(map[string]interface{}{"gate": "PASS_GOLD", "evidence": ev})})
	if !resp.OK {
		t.Fatalf("gate authority decide failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["status"] != "rejected_synthesized_gate" || p["recognized"] != false || p["valid"] != false || p["blocked"] != true {
		t.Fatalf("expected dashboard dry-run synthesized rejection: %+v", p)
	}
}

func TestExecuteGateAuthorityAuditDetectsSynthesizedUnauthorizedDryRunGate(t *testing.T) {
	ev := map[string]interface{}{"gate": "PASS_GOLD", "status": "pass", "source": "readiness", "dry_run": true, "real_evidence": false, "synthesized": true, "promotion_allowed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGateAuthorityAudit, Args: mkArgs(map[string]interface{}{"evidences": []map[string]interface{}{ev}})})
	if !resp.OK {
		t.Fatalf("gate authority audit failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["synthesized_gate_attempt_found"] != true || p["unauthorized_gate_found"] != true || p["dry_run_gate_claim_found"] != true || p["unsafe_claims_found"] != true {
		t.Fatalf("expected synthesized/unauthorized/dry-run detection: %+v", p)
	}
}

func TestExecuteGateAuthorityPolicyListsSources(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGateAuthorityPolicy})
	if !resp.OK {
		t.Fatalf("gate authority policy failed: %s", resp.Error)
	}
	b, _ := json.Marshal(resp.Payload)
	s := string(b)
	for _, want := range []string{`"version":"V9.0"`, "sddf_passgold_validator", "passsecure_runner", "dashboard", "readiness", `"required_gates":["PASS_GOLD","PASS_SECURE"]`} {
		if !strings.Contains(s, want) {
			t.Fatalf("policy missing %s: %s", want, s)
		}
	}
}

func TestExecuteGateAuthorityExplainReturnsWhyNotPromoted(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolGateAuthorityExplain, Args: mkArgs(map[string]interface{}{"gate": "PASS_GOLD", "source": "dashboard"})})
	if !resp.OK {
		t.Fatalf("gate authority explain failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	why, _ := p["why_not_promoted"].([]interface{})
	if p["version"] != "V9.0" || p["dry_run"] != true || p["read_only"] != true || len(why) == 0 {
		t.Fatalf("expected V9.0 why_not_promoted: %+v", p)
	}
}

func TestV90MutatingToolsStillBlockedWithCanonicalError(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("tool %s must remain blocked with canonical error, got %+v", tool, resp)
		}
	}
}

func TestV90RegressionToolsV80ThroughV89StillWork(t *testing.T) {
	root := buildIndex(t)
	tests := []struct {
		version string
		tool    string
		args    interface{}
	}{
		{"V8.9", mcpserver.ToolReadinessExplain, nil},
		{"V8.8", mcpserver.ToolEvidenceExplain, nil},
		{"V8.7", mcpserver.ToolContractAudit, nil},
		{"V8.6", mcpserver.ToolPolicyConflicts, nil},
		{"V8.5", mcpserver.ToolDashboardToolInventory, nil},
		{"V8.4", mcpserver.ToolImpeccableGuardStatus, nil},
		{"V8.3", mcpserver.ToolCodeBurnGuardStatus, nil},
		{"V8.2", mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"files": []string{"frontend/index.html"}, "operation": "mission"}},
		{"V8.1", mcpserver.ToolGraphProviders, nil},
		{"V8.0", mcpserver.ToolProjectSummary, nil},
	}
	for _, tc := range tests {
		var args json.RawMessage
		if tc.args != nil {
			args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: root, Args: args})
		if !resp.OK {
			t.Fatalf("%s regression tool %s failed: %s", tc.version, tc.tool, resp.Error)
		}
	}
}

// ── V9.1 External Promotion Executor Contract Tests ────────────────────────

func v91CompletePromotionArgs() map[string]interface{} {
	return map[string]interface{}{
		"mission_input": "CORS origin blocked",
		"operation":     "promotion_contract_check",
		"request": map[string]interface{}{
			"request_id": "promo-001", "mission_id": "mission-001", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "69d210e",
			"target": "stable", "environment": "local", "executor": "external_promotion_executor", "operation": "promote", "dry_run": false, "read_only": false,
		},
		"gates": []map[string]interface{}{
			{"gate": "PASS_GOLD", "status": "pass", "source": "sddf_passgold_validator", "artifact_id": "pg-123", "artifact_type": "pass_gold_report", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true},
			{"gate": "PASS_SECURE", "status": "pass", "source": "passsecure_runner", "artifact_id": "ps-123", "artifact_type": "pass_secure_report", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true},
		},
		"artifacts": []map[string]interface{}{
			{"id": "pg-123", "type": "pass_gold_report", "required": true, "present": true, "trusted": true},
			{"id": "ps-123", "type": "pass_secure_report", "required": true, "present": true, "trusted": true},
			{"id": "auth-001", "type": "authority_snapshot", "required": true, "present": true, "trusted": true},
			{"id": "promo-001", "type": "promotion_request", "required": true, "present": true, "trusted": true},
		},
	}
}

func TestV91PromotionContractToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolPromotionContractSnapshot, mcpserver.ToolPromotionContractValidate, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolPromotionContractAudit, mcpserver.ToolPromotionContractExplain} {
		if !mcpserver.IsAllowed(tool) || mcpserver.IsBlocked(tool) {
			t.Fatalf("V9.1 tool %s registration invalid", tool)
		}
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK {
			t.Fatalf("V9.1 tool %s must dispatch: %s", tool, resp.Error)
		}
	}
}

func TestExecutePromotionContractSnapshotV91ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionContractSnapshot, Args: mkArgs(v91CompletePromotionArgs())})
	if !resp.OK {
		t.Fatalf("promotion contract snapshot failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V9.1" || p["dry_run"] != true || p["read_only"] != true || p["contract_status"] != "externally_eligible_dry_run" || p["would_allow_external_executor"] != true || p["promotion_allowed"] != false || p["deploy_allowed"] != false {
		t.Fatalf("unexpected V9.1 snapshot payload: %+v", p)
	}
}

func TestExecutePromotionContractValidateBlocksMCPAndPromotionAllowed(t *testing.T) {
	args := map[string]interface{}{
		"request": map[string]interface{}{"request_id": "promo-001", "mission_id": "mission-001", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "69d210e", "target": "stable", "environment": "local", "executor": "mcp", "operation": "promote", "promotion_allowed": true},
		"gates":   []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "source": "dashboard", "artifact_id": "fake", "artifact_type": "dashboard_snapshot", "real_evidence": false, "dry_run": true, "synthesized": true, "recognized_by_authority": false}},
	}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionContractValidate, Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("promotion contract validate failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V9.1" || p["blocked"] != true || p["valid"] != false || p["contract_status"] != "blocked" || p["would_allow_external_executor"] != false {
		t.Fatalf("expected blocked validation: %+v", p)
	}
	b, _ := json.Marshal(resp.Payload)
	s := string(b)
	for _, want := range []string{"executor=mcp", "promotion_allowed=true", "PASS_GOLD_REAL", "PASS_SECURE_REAL"} {
		if !strings.Contains(s, want) {
			t.Fatalf("validation missing %s: %s", want, s)
		}
	}
}

func TestExecutePromotionContractBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionContractBoundary})
	if !resp.OK {
		t.Fatalf("promotion contract boundary failed: %s", resp.Error)
	}
	b, _ := json.Marshal(resp.Payload)
	s := string(b)
	for _, want := range []string{`"version":"V9.1"`, `"dry_run":true`, `"read_only":true`, "forbidden_inside_mcp", "promote", "deploy", "publish_status", "write_memory"} {
		if !strings.Contains(s, want) {
			t.Fatalf("boundary missing %s: %s", want, s)
		}
	}
}

func TestExecutePromotionContractAuditDetectsExternalCallAttempt(t *testing.T) {
	args := map[string]interface{}{"request": map[string]interface{}{"executor": "mcp", "operation": "promote", "promotion_allowed": true, "deploy_allowed": true}, "gates": []map[string]interface{}{{"gate": "PASS_GOLD", "source": "readiness", "dry_run": true, "real_evidence": false, "synthesized": true}}, "attempt_external_call": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionContractAudit, Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("promotion contract audit failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V9.1" || p["executor_call_attempt_found"] != true || p["unsafe_claims_found"] != true {
		t.Fatalf("expected external call attempt audit: %+v", p)
	}
}

func TestExecutePromotionContractExplainWhyMCPCannotExecute(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionContractExplain, Args: mkArgs(map[string]interface{}{"operation": "promote", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("promotion contract explain failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	why, _ := p["why_mcp_cannot_execute"].([]interface{})
	if p["version"] != "V9.1" || p["dry_run"] != true || p["read_only"] != true || len(why) == 0 {
		t.Fatalf("expected why_mcp_cannot_execute: %+v", p)
	}
}

func TestV91MutatingToolsStillBlockedWithCanonicalError(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("tool %s must remain blocked with canonical error, got %+v", tool, resp)
		}
	}
}

func TestV91RegressionToolsV80ThroughV90StillWork(t *testing.T) {
	root := buildIndex(t)
	tests := []struct {
		version string
		tool    string
		args    interface{}
	}{
		{"V9.0", mcpserver.ToolGateAuthorityPolicy, nil},
		{"V8.9", mcpserver.ToolReadinessExplain, nil},
		{"V8.8", mcpserver.ToolEvidenceExplain, nil},
		{"V8.7", mcpserver.ToolContractAudit, nil},
		{"V8.6", mcpserver.ToolPolicyConflicts, nil},
		{"V8.5", mcpserver.ToolDashboardToolInventory, nil},
		{"V8.4", mcpserver.ToolImpeccableGuardStatus, nil},
		{"V8.3", mcpserver.ToolCodeBurnGuardStatus, nil},
		{"V8.2", mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"files": []string{"frontend/index.html"}, "operation": "mission"}},
		{"V8.1", mcpserver.ToolGraphProviders, nil},
		{"V8.0", mcpserver.ToolProjectSummary, nil},
	}
	for _, tc := range tests {
		req := mcpserver.ToolRequest{Tool: tc.tool, Root: root}
		if tc.args != nil {
			req.Args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(req)
		if !resp.OK {
			t.Fatalf("%s regression tool %s failed: %s", tc.version, tc.tool, resp.Error)
		}
	}
}

func completeSafetyArgs() map[string]interface{} {
	return map[string]interface{}{
		"mission_input":            "CORS origin blocked",
		"operation":                "external_executor_safety_check",
		"executor":                 "external_promotion_executor",
		"target":                   "stable",
		"environment":              "local",
		"promotion_contract_valid": true,
		"gates": []map[string]interface{}{
			{"gate": "PASS_GOLD", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true},
			{"gate": "PASS_SECURE", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true},
		},
		"rollback_policy":   map[string]interface{}{"present": true, "strategy": "snapshot_restore", "snapshot_required": true, "restore_command_declared": true, "validation_after_rollback": true, "max_attempts": 1, "manual_intervention_required": true},
		"idempotency":       map[string]interface{}{"present": true, "key": "promo-001", "scope": "project-branch-target", "replay_protection": true, "duplicate_action_behavior": "block"},
		"lock":              map[string]interface{}{"present": true, "lock_id": "vision-core-stable", "lease_seconds": 900, "owner": "external_promotion_executor", "prevents_concurrent_execution": true},
		"timeout":           map[string]interface{}{"present": true, "max_seconds": 900, "graceful_abort": true, "hard_abort": true},
		"kill_switch":       map[string]interface{}{"present": true, "enabled": true, "trigger": "manual_or_policy", "manual_override": true},
		"audit_trail":       map[string]interface{}{"present": true, "audit_id": "audit-001", "records_inputs": true, "records_outputs": true, "records_gate_artifacts": true, "records_decisions": true, "immutable_target_declared": true},
		"dry_run_rehearsal": map[string]interface{}{"present": true, "rehearsal_id": "dryrun-001", "completed": true, "matched_target": true, "matched_environment": true, "no_mutation_confirmed": true},
		"observability":     map[string]interface{}{"present": true, "health_checks": true, "metrics": true, "logs": true, "post_execution_watch_seconds": 600, "alerting_declared": true},
		"fallback":          map[string]interface{}{"present": true, "fallback_target": "previous-stable", "fallback_strategy": "manual_hold_then_restore", "manual_hold_required": true},
	}
}

func TestV92SafetyToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorSafetyEnvelope, mcpserver.ToolExecutorSafetyValidate, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolExecutorSafetyAudit, mcpserver.ToolExecutorSafetyExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Args: mkArgs(map[string]interface{}{})})
		if !resp.OK {
			t.Fatalf("V9.2 tool %s should be registered: %+v", tool, resp)
		}
	}
}

func TestExecuteExecutorSafetyEnvelopeReturnsV92ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorSafetyEnvelope, Args: mkArgs(completeSafetyArgs())})
	if !resp.OK {
		t.Fatalf("executor safety envelope failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V9.2" || p["dry_run"] != true || p["read_only"] != true || p["would_allow_external_executor"] != true || p["promotion_allowed"] != false || p["deploy_allowed"] != false {
		t.Fatalf("unexpected safety envelope payload: %+v", p)
	}
}

func TestExecuteExecutorSafetyValidateBlocksMCPAndPromotionAllowed(t *testing.T) {
	args := map[string]interface{}{"executor": "mcp", "target": "stable", "environment": "local", "promotion_contract_valid": false, "promotion_allowed": true, "attempt_external_call": true, "gates": []map[string]interface{}{{"gate": "PASS_GOLD", "real_evidence": false, "dry_run": true, "synthesized": true}}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorSafetyValidate, Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("executor safety validate failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V9.2" || p["valid"] != false || p["blocked"] != true || p["mcp_execution_allowed"] != false {
		t.Fatalf("expected blocked validation: %+v", p)
	}
	claims, _ := p["unsafe_claims"].([]interface{})
	if len(claims) == 0 {
		t.Fatalf("expected unsafe claims: %+v", p)
	}
}

func TestExecuteExecutorSafetyBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorSafetyBoundary})
	if !resp.OK {
		t.Fatalf("executor safety boundary failed: %s", resp.Error)
	}
	b, _ := json.Marshal(resp.Payload)
	s := string(b)
	for _, want := range []string{`"version":"V9.2"`, `"dry_run":true`, `"read_only":true`, "forbidden_inside_mcp", "promote", "deploy", "publish_status", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback"} {
		if !strings.Contains(s, want) {
			t.Fatalf("safety boundary missing %s: %s", want, s)
		}
	}
}

func TestExecuteExecutorSafetyAuditDetectsExternalCallAttempt(t *testing.T) {
	args := map[string]interface{}{"executor": "mcp", "operation": "promote", "promotion_allowed": true, "deploy_allowed": true, "attempt_external_call": true, "attempt_real_rollback": true, "gates": []map[string]interface{}{{"gate": "PASS_GOLD", "dry_run": true, "real_evidence": false, "synthesized": true}}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorSafetyAudit, Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("executor safety audit failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	if p["version"] != "V9.2" || p["executor_call_attempt_found"] != true || p["unsafe_claims_found"] != true || p["missing_controls_found"] != true {
		t.Fatalf("expected audit findings: %+v", p)
	}
}

func TestExecuteExecutorSafetyExplainWhyMCPCannotExecute(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorSafetyExplain, Args: mkArgs(map[string]interface{}{"operation": "promote", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("executor safety explain failed: %s", resp.Error)
	}
	p := payloadMap(t, resp.Payload)
	why, _ := p["why_mcp_cannot_execute"].([]interface{})
	gates, _ := p["required_gates"].([]interface{})
	if p["version"] != "V9.2" || p["dry_run"] != true || p["read_only"] != true || len(why) == 0 || len(gates) != 2 {
		t.Fatalf("expected explain details: %+v", p)
	}
}

func TestV92MutatingToolsStillBlockedWithCanonicalError(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("tool %s must remain blocked with canonical error, got %+v", tool, resp)
		}
	}
}

func TestV92RegressionToolsV80ThroughV91StillWork(t *testing.T) {
	root := buildIndex(t)
	tests := []struct {
		version string
		tool    string
		args    interface{}
	}{
		{"V9.1", mcpserver.ToolPromotionContractBoundary, nil},
		{"V9.0", mcpserver.ToolGateAuthorityPolicy, nil},
		{"V8.9", mcpserver.ToolReadinessExplain, nil},
		{"V8.8", mcpserver.ToolEvidenceExplain, nil},
		{"V8.7", mcpserver.ToolContractAudit, nil},
		{"V8.6", mcpserver.ToolPolicyConflicts, nil},
		{"V8.5", mcpserver.ToolDashboardToolInventory, nil},
		{"V8.4", mcpserver.ToolImpeccableGuardStatus, nil},
		{"V8.3", mcpserver.ToolCodeBurnGuardStatus, nil},
		{"V8.2", mcpserver.ToolDryRunRiskAssessment, map[string]interface{}{"files": []string{"frontend/index.html"}, "operation": "mission"}},
		{"V8.1", mcpserver.ToolGraphProviders, nil},
		{"V8.0", mcpserver.ToolProjectSummary, nil},
	}
	for _, tc := range tests {
		req := mcpserver.ToolRequest{Tool: tc.tool, Root: root}
		if tc.args != nil {
			req.Args = mkArgs(tc.args)
		}
		resp := mcpserver.Dispatch(req)
		if !resp.OK {
			t.Fatalf("%s regression tool %s failed: %s", tc.version, tc.tool, resp.Error)
		}
	}
}
