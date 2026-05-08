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
