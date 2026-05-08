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
