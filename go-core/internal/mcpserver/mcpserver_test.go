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

// ── V9.3 Executor Dry-Run Rehearsal Recorder Tests ───────────────────────────

func completeRehearsalArgs() map[string]interface{} {
	return map[string]interface{}{
		"mission_input": "CORS origin blocked", "operation": "external_executor_rehearsal", "rehearsal_id": "rehearsal-001",
		"executor": "external_promotion_executor", "target": "stable", "environment": "local",
		"safety_envelope_valid": true, "promotion_contract_valid": true,
		"expected_actions":        []map[string]interface{}{{"id": "act-001", "name": "verify_authority_artifacts", "category": "validation", "would_execute_outside_mcp": true, "inside_mcp_allowed": false, "requires_gate": "PASS_GOLD", "order": 1}},
		"forbidden_actions":       []string{"promote_inside_mcp", "deploy_inside_mcp", "publish_status_inside_mcp", "write_memory_inside_mcp", "call_external_executor_inside_mcp"},
		"replay_plan":             map[string]interface{}{"present": true, "steps": []string{"validate_gates", "verify_safety_envelope", "simulate_promotion_order", "confirm_no_mutation"}, "deterministic": true, "target_matched": true, "environment_matched": true},
		"no_mutation_proof":       map[string]interface{}{"present": true, "no_files_written": true, "no_commands_executed": true, "no_network_called": true, "no_status_published": true, "no_deploy_performed": true, "no_lock_acquired": true, "no_rollback_performed": true},
		"audit_summary":           map[string]interface{}{"present": true, "audit_id": "audit-rehearsal-001", "records_inputs": true, "records_expected_actions": true, "records_forbidden_actions": true, "records_safety_controls": true, "records_no_mutation": true},
		"evidence_summary":        map[string]interface{}{"present": true, "includes_pass_gold_real_reference": true, "includes_pass_secure_real_reference": true, "includes_safety_envelope_reference": true, "includes_promotion_contract_reference": true, "uses_dry_run_as_real_gate": false},
		"rollback_rehearsal":      map[string]interface{}{"present": true, "strategy": "snapshot_restore", "simulated_only": true, "restore_path_declared": true, "validation_after_simulated_restore": true, "no_real_rollback_performed": true},
		"observability_rehearsal": map[string]interface{}{"present": true, "health_checks_planned": true, "metrics_planned": true, "logs_planned": true, "alerting_planned": true, "watch_window_seconds": 600},
		"checklist":               map[string]interface{}{"present": true, "pass_gold_real_checked": true, "pass_secure_real_checked": true, "promotion_contract_checked": true, "safety_envelope_checked": true, "idempotency_checked": true, "lock_lease_checked": true, "timeout_checked": true, "kill_switch_checked": true, "audit_trail_checked": true, "rollback_checked": true, "observability_checked": true, "fallback_checked": true, "no_mutation_checked": true},
	}
}

func TestV93AllRehearsalToolsRegistered(t *testing.T) {
	for _, tool := range []string{
		mcpserver.ToolExecutorRehearsalRecord,
		mcpserver.ToolExecutorRehearsalValidate,
		mcpserver.ToolExecutorRehearsalBoundary,
		mcpserver.ToolExecutorRehearsalAudit,
		mcpserver.ToolExecutorRehearsalExplain,
	} {
		if !mcpserver.IsAllowed(tool) {
			t.Errorf("V9.3 tool %q must be allowed", tool)
		}
	}
}

func TestExecutorRehearsalRecordReturnsV93DryRunReadOnly(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorRehearsalRecord, Args: mkArgs(completeRehearsalArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.3"`, `"dry_run":true`, `"read_only":true`, `"rehearsal_status":"rehearsal_ready_dry_run"`, `"would_allow_external_executor":true`, `"promotion_allowed":false`, `"deploy_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("payload missing %s: %s", want, s)
		}
	}
}

func TestExecutorRehearsalValidateBlocksMCPAndPromotionAllowed(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorRehearsalValidate, Args: mkArgs(map[string]interface{}{
		"rehearsal_id": "rehearsal-unsafe", "executor": "mcp", "target": "stable", "environment": "local",
		"safety_envelope_valid": false, "promotion_contract_valid": false, "promotion_allowed": true,
		"attempt_external_call": true, "file_write": true, "command_execution": true,
		"no_mutation_proof": map[string]interface{}{"present": true, "no_files_written": true, "no_commands_executed": true, "no_network_called": true},
	})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.3"`, `"dry_run":true`, `"read_only":true`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "promotion_allowed_inside_mcp"} {
		if !strings.Contains(s, want) {
			t.Fatalf("payload missing %s: %s", want, s)
		}
	}
}

func TestExecutorRehearsalBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorRehearsalBoundary})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{"forbidden_inside_mcp", "promote", "deploy", "call_external_executor", "write_rehearsal_file"} {
		if !strings.Contains(s, want) {
			t.Fatalf("boundary missing %s: %s", want, s)
		}
	}
}

func TestExecutorRehearsalAuditDetectsExecutionAndMutation(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorRehearsalAudit, Args: mkArgs(map[string]interface{}{
		"executor": "mcp", "operation": "promote", "promotion_allowed": true, "deploy_allowed": true,
		"attempt_external_call": true, "attempt_real_rollback": true, "file_write": true, "command_execution": true,
		"network_call": true, "pass_gold": true,
		"no_mutation_proof": map[string]interface{}{"present": true, "no_files_written": true, "no_commands_executed": true, "no_network_called": true},
	})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"execution_attempt_found":true`, `"mutation_attempt_found":true`, `"unsafe_claims_found":true`, "rehearsal_claims_pass_gold"} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s: %s", want, s)
		}
	}
}

func TestExecutorRehearsalExplainWhyNotPassGold(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorRehearsalExplain, Args: mkArgs(map[string]interface{}{"operation": "promote", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{"why_rehearsal_is_not_pass_gold", "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("explain missing %s: %s", want, s)
		}
	}
}

func TestV93RegressionsPriorToolsStillAllowed(t *testing.T) {
	for _, tool := range []string{
		mcpserver.ToolExecutorSafetyBoundary,
		mcpserver.ToolPromotionContractBoundary,
		mcpserver.ToolGateAuthorityPolicy,
		mcpserver.ToolReadinessModules,
		mcpserver.ToolEvidenceExplain,
		mcpserver.ToolContractExplain,
		mcpserver.ToolPolicyExplain,
		mcpserver.ToolDashboardToolInventory,
		mcpserver.ToolImpeccableExplain,
		mcpserver.ToolCodeBurnExplain,
		mcpserver.ToolDryRunRiskAssessment,
		mcpserver.ToolGraphProviders,
		mcpserver.ToolPassGoldStatus,
	} {
		if !mcpserver.IsAllowed(tool) {
			t.Fatalf("prior tool no longer allowed: %s", tool)
		}
	}
}

func completeAuthorizationArgs() map[string]interface{} {
	return map[string]interface{}{
		"mission_input": "CORS origin blocked", "operation": "external_executor_authorization_check", "authorization_id": "authz-001", "authorized_by": "operator", "authorization_source": "local_authoritative_gate", "executor": "external_promotion_executor", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "814c2e9", "target": "stable", "environment": "local", "explicit_authorization": true,
		"scope":              map[string]interface{}{"present": true, "allowed_operations": []string{"promote"}, "forbidden_operations": []string{"deploy_from_mcp", "publish_status_from_mcp", "write_memory_from_mcp"}, "allowed_targets": []string{"stable"}, "allowed_environments": []string{"local"}, "allowed_branch": "v6-go-enterprise-runtime", "allowed_commit_sha": "814c2e9", "max_files_changed": 0, "max_actions": 3},
		"validity":           map[string]interface{}{"present": true, "issued_at": "2026-05-09T00:00:00Z", "expires_at": "2026-12-31T23:59:59Z", "not_before": "2026-05-09T00:00:00Z", "timezone": "UTC", "expired": false, "within_window": true},
		"limits":             map[string]interface{}{"present": true, "max_duration_seconds": 900, "max_retries": 1, "require_manual_hold": true, "require_single_executor": true, "require_idempotency": true, "require_lock_lease": true, "require_no_parallel_execution": true},
		"gates":              []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "source": "sddf_passgold_validator", "artifact_id": "pg-123", "artifact_type": "pass_gold_report", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true}, {"gate": "PASS_SECURE", "status": "pass", "source": "passsecure_runner", "artifact_id": "ps-123", "artifact_type": "pass_secure_report", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true}},
		"required_artifacts": []map[string]interface{}{{"id": "pg-123", "type": "pass_gold_report", "required": true, "present": true, "trusted": true}, {"id": "ps-123", "type": "pass_secure_report", "required": true, "present": true, "trusted": true}, {"id": "safety-001", "type": "safety_envelope", "required": true, "present": true, "trusted": true}, {"id": "contract-001", "type": "promotion_contract", "required": true, "present": true, "trusted": true}, {"id": "rehearsal-001", "type": "rehearsal_record", "required": true, "present": true, "trusted": true}},
		"safety_envelope":    map[string]interface{}{"present": true, "envelope_id": "safety-001", "version": "V9.2", "safety_ready_dry_run": true, "would_allow_external_executor": true, "referenced": true},
		"promotion_contract": map[string]interface{}{"present": true, "contract_id": "contract-001", "version": "V9.1", "externally_eligible_dry_run": true, "would_allow_external_executor": true, "referenced": true},
		"rehearsal":          map[string]interface{}{"present": true, "rehearsal_id": "rehearsal-001", "version": "V9.3", "rehearsal_ready_dry_run": true, "no_mutation_proof": true, "referenced": true},
		"rollback":           map[string]interface{}{"present": true, "mandatory": true, "strategy": "snapshot_restore", "snapshot_required": true, "validation_required": true, "manual_intervention_required": true},
		"kill_switch":        map[string]interface{}{"present": true, "mandatory": true, "enabled": true, "trigger": "manual_or_policy", "manual_override": true},
		"audit":              map[string]interface{}{"present": true, "audit_id": "authz-audit-001", "records_authorizer": true, "records_scope": true, "records_gates": true, "records_artifacts": true, "records_decisions": true, "records_expiration": true, "immutable_target_declared": true},
	}
}

func TestV94AuthorizationToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorAuthorizationManifest, mcpserver.ToolExecutorAuthorizationValidate, mcpserver.ToolExecutorAuthorizationBoundary, mcpserver.ToolExecutorAuthorizationAudit, mcpserver.ToolExecutorAuthorizationExplain} {
		if !mcpserver.IsAllowed(tool) {
			t.Fatalf("V9.4 tool %s must be registered", tool)
		}
	}
}

func TestExecutorAuthorizationManifestReturnsV94DryRunReadOnly(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorizationManifest, Args: mkArgs(completeAuthorizationArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.4"`, `"dry_run":true`, `"read_only":true`, `"manifest_status":"authorization_ready_dry_run"`, `"would_authorize_external_executor":true`, `"promotion_allowed":false`, `"deploy_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("manifest payload missing %s: %s", want, s)
		}
	}
}

func TestExecutorAuthorizationValidateBlocksMCPAndExplicitFalse(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorizationValidate, Args: mkArgs(map[string]interface{}{"authorization_id": "authz-unsafe", "authorized_by": "", "authorization_source": "mcp", "executor": "mcp", "target": "stable", "environment": "local", "explicit_authorization": false, "promotion_allowed": true, "attempt_external_call": true, "file_write": true, "command_execution": true, "gates": []map[string]interface{}{{"gate": "PASS_GOLD", "real_evidence": false, "dry_run": true, "synthesized": true}}})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.4"`, `"valid":false`, `"blocked":true`, "executor_mcp_not_allowed", "explicit_authorization", "promotion_allowed_true_inside_mcp", `"usable_for_pass_gold":false`, `"usable_for_pass_secure":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("validate payload missing %s: %s", want, s)
		}
	}
}

func TestExecutorAuthorizationBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorizationBoundary})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{"forbidden_inside_mcp", "authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "PR", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback", "write_manifest_file"} {
		if !strings.Contains(s, want) {
			t.Fatalf("boundary missing %s: %s", want, s)
		}
	}
}

func TestExecutorAuthorizationAuditDetectsExecutionAndExpiration(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorizationAudit, Args: mkArgs(map[string]interface{}{"authorization_id": "authz-unsafe", "executor": "mcp", "operation": "promote", "promotion_allowed": true, "deploy_allowed": true, "attempt_external_call": true, "attempt_real_rollback": true, "file_write": true, "command_execution": true, "network_call": true, "pass_gold": true, "validity": map[string]interface{}{"present": true, "expired": true, "within_window": false}})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"execution_attempt_found":true`, `"expired_authorization_found":true`, `"unsafe_claims_found":true`, "pass_gold_claim_true"} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s: %s", want, s)
		}
	}
}

func TestExecutorAuthorizationExplainWhyNotPassGoldOrExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorizationExplain, Args: mkArgs(map[string]interface{}{"operation": "promote", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{"why_authorization_is_not_pass_gold", "why_authorization_is_not_execution", "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("explain missing %s: %s", want, s)
		}
	}
}

func TestV94MutatingToolsStillBlockedWithCanonicalError(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("tool %s must remain blocked, got %+v", tool, resp)
		}
	}
}

func TestV94RegressionsV80ThroughV93ToolsStillAllowed(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorRehearsalBoundary, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolGateAuthorityPolicy, mcpserver.ToolReadinessModules, mcpserver.ToolEvidenceExplain, mcpserver.ToolContractExplain, mcpserver.ToolPolicyExplain, mcpserver.ToolDashboardToolInventory, mcpserver.ToolImpeccableExplain, mcpserver.ToolCodeBurnExplain, mcpserver.ToolDryRunRiskAssessment, mcpserver.ToolGraphProviders, mcpserver.ToolPassGoldStatus, mcpserver.ToolProjectSummary} {
		if !mcpserver.IsAllowed(tool) {
			t.Fatalf("regression tool no longer allowed: %s", tool)
		}
	}
}

func fullPreflightArgs() map[string]interface{} {
	return map[string]interface{}{
		"mission_input": "CORS origin blocked", "operation": "external_executor_final_preflight", "preflight_id": "preflight-001", "executor": "external_promotion_executor", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "2b58abc", "target": "stable", "environment": "local",
		"authority":              map[string]interface{}{"present": true, "version": "V9.0", "pass_gold_real": true, "pass_secure_real": true, "all_real_gates_recognized": true, "authority_status": "all_real_gates_recognized"},
		"promotion_contract":     map[string]interface{}{"present": true, "version": "V9.1", "contract_status": "externally_eligible_dry_run", "externally_eligible_dry_run": true, "would_allow_external_executor": true},
		"safety_envelope":        map[string]interface{}{"present": true, "version": "V9.2", "envelope_status": "safety_ready_dry_run", "safety_ready_dry_run": true, "would_allow_external_executor": true, "required_controls_present": true},
		"rehearsal":              map[string]interface{}{"present": true, "version": "V9.3", "rehearsal_status": "rehearsal_ready_dry_run", "rehearsal_ready_dry_run": true, "no_mutation_proof": true, "would_allow_external_executor": true},
		"authorization_manifest": map[string]interface{}{"present": true, "version": "V9.4", "manifest_status": "authorization_ready_dry_run", "authorization_ready_dry_run": true, "would_authorize_external_executor": true, "validity_within_window": true, "explicit_authorization": true},
		"gates": []map[string]interface{}{
			{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true, "source": "sddf_passgold_validator", "artifact_id": "pg-123"},
			{"gate": "PASS_SECURE", "status": "pass", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true, "source": "passsecure_runner", "artifact_id": "ps-123"},
		},
		"artifacts": []map[string]interface{}{
			{"id": "pg-123", "type": "pass_gold_report", "required": true, "present": true, "trusted": true},
			{"id": "ps-123", "type": "pass_secure_report", "required": true, "present": true, "trusted": true},
			{"id": "contract-001", "type": "promotion_contract", "required": true, "present": true, "trusted": true},
			{"id": "safety-001", "type": "safety_envelope", "required": true, "present": true, "trusted": true},
			{"id": "rehearsal-001", "type": "rehearsal_record", "required": true, "present": true, "trusted": true},
			{"id": "authz-001", "type": "authorization_manifest", "required": true, "present": true, "trusted": true},
		},
	}
}

func TestV95ToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorFinalPreflight, mcpserver.ToolExecutorPreflightValidate, mcpserver.ToolExecutorPreflightBoundary, mcpserver.ToolExecutorPreflightAudit, mcpserver.ToolExecutorPreflightExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK || strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V9.5 tool %s not registered: ok=%v err=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestExecutorFinalPreflightReturnsV95ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorFinalPreflight, Root: t.TempDir(), Args: mkArgs(fullPreflightArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.5"`, `"dry_run":true`, `"read_only":true`, `"preflight_status":"preflight_ready_dry_run"`, `"external_execution_preflight_ready":true`, `"promotion_allowed":false`, `"deploy_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorPreflightValidateBlocksMCPAndExecutorCall(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorPreflightValidate, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"preflight_id": "preflight-unsafe", "executor": "mcp", "target": "stable", "environment": "local", "executor_call_allowed_inside_mcp": true})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.5"`, `"valid":false`, `"blocked":true`, "executor cannot be mcp or mcp_readonly", "executor_call_allowed_inside_mcp cannot be true"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorPreflightBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorPreflightBoundary})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.5"`, `"forbidden_inside_mcp":`, "call_external_executor", "authorize_execution_inside_mcp", "write_preflight_file"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorPreflightAuditDetectsAttempts(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorPreflightAudit, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"preflight_id": "preflight-unsafe", "executor": "mcp", "operation": "promote", "promotion_allowed": true, "deploy_allowed": true, "executor_call_allowed_inside_mcp": true, "attempt_external_call": true, "attempt_real_rollback": true, "file_write": true, "command_execution": true, "network_call": true, "pass_gold": true, "external_execution_preflight_ready": true, "gates": []map[string]interface{}{{"gate": "PASS_GOLD", "dry_run": true, "real_evidence": false, "synthesized": true}}})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"execution_attempt_found":true`, `"mutation_attempt_found":true`, `"mcp_executor_call_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorPreflightExplainIncludesNotPassGoldAndNotExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorPreflightExplain, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"operation": "promote", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.5"`, `"why_preflight_is_not_pass_gold":`, `"why_preflight_is_not_execution":`, "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV95MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV95RegressionToolsV80ThroughV94StillRegistered(t *testing.T) {
	tools := []string{
		mcpserver.ToolProjectSummary, mcpserver.ToolGraphProviders, mcpserver.ToolDryRunRiskAssessment, mcpserver.ToolCodeBurnExplain, mcpserver.ToolImpeccableExplain,
		mcpserver.ToolDashboardToolInventory, mcpserver.ToolPolicyExplain, mcpserver.ToolContractExplain, mcpserver.ToolEvidenceExplain, mcpserver.ToolReadinessExplain,
		mcpserver.ToolGateAuthorityExplain, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolExecutorRehearsalBoundary, mcpserver.ToolExecutorAuthorizationBoundary,
	}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("regression tool %s became unregistered", tool)
		}
	}
}

func fullHandoffArgs() map[string]interface{} {
	return map[string]interface{}{
		"mission_input": "CORS origin blocked", "operation": "external_executor_handoff_package", "handoff_id": "handoff-001", "executor": "external_promotion_executor", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "b916ea9", "target": "stable", "environment": "local",
		"authority_summary":              map[string]interface{}{"present": true, "version": "V9.0", "status": "all_real_gates_recognized", "ready": true, "valid": true, "summary": "PASS_GOLD_REAL and PASS_SECURE_REAL recognized."},
		"promotion_contract_summary":     map[string]interface{}{"present": true, "version": "V9.1", "status": "externally_eligible_dry_run", "ready": true, "valid": true, "summary": "Promotion contract externally eligible in dry-run."},
		"safety_envelope_summary":        map[string]interface{}{"present": true, "version": "V9.2", "status": "safety_ready_dry_run", "ready": true, "valid": true, "summary": "Safety envelope controls present."},
		"rehearsal_summary":              map[string]interface{}{"present": true, "version": "V9.3", "status": "rehearsal_ready_dry_run", "ready": true, "valid": true, "summary": "Dry-run rehearsal completed with no-mutation proof."},
		"authorization_manifest_summary": map[string]interface{}{"present": true, "version": "V9.4", "status": "authorization_ready_dry_run", "ready": true, "valid": true, "summary": "Authorization manifest is valid in dry-run."},
		"final_preflight_result":         map[string]interface{}{"present": true, "version": "V9.5", "status": "preflight_ready_dry_run", "ready": true, "valid": true, "summary": "Final preflight is ready in dry-run.", "external_execution_preflight_ready": true},
		"gates": []map[string]interface{}{
			{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true, "source": "sddf_passgold_validator", "artifact_id": "pg-123"},
			{"gate": "PASS_SECURE", "status": "pass", "real_evidence": true, "dry_run": false, "synthesized": false, "recognized_by_authority": true, "source": "passsecure_runner", "artifact_id": "ps-123"},
		},
		"artifacts": []map[string]interface{}{
			{"id": "pg-123", "type": "pass_gold_report", "required": true, "present": true, "trusted": true}, {"id": "ps-123", "type": "pass_secure_report", "required": true, "present": true, "trusted": true}, {"id": "contract-001", "type": "promotion_contract", "required": true, "present": true, "trusted": true}, {"id": "safety-001", "type": "safety_envelope", "required": true, "present": true, "trusted": true}, {"id": "rehearsal-001", "type": "rehearsal_record", "required": true, "present": true, "trusted": true}, {"id": "authz-001", "type": "authorization_manifest", "required": true, "present": true, "trusted": true}, {"id": "preflight-001", "type": "final_preflight", "required": true, "present": true, "trusted": true},
		},
		"rollback_requirements":      map[string]interface{}{"present": true, "mandatory": true, "strategy": "snapshot_restore", "snapshot_required": true, "validation_required": true, "manual_intervention_required": true},
		"kill_switch_requirements":   map[string]interface{}{"present": true, "mandatory": true, "enabled": true, "trigger": "manual_or_policy", "manual_override": true},
		"observability_requirements": map[string]interface{}{"present": true, "health_checks": true, "metrics": true, "logs": true, "watch_window_seconds": 600, "alerting_declared": true},
		"boundary":                   map[string]interface{}{"present": true, "no_write_file": true, "no_network_call": true, "no_command_execution": true, "mcp_scope": []string{"read", "validate", "audit", "explain", "simulate handoff package"}, "forbidden_inside_mcp": []string{"write_handoff_file", "execute", "call_external_executor", "promote", "deploy", "publish_status", "mutate", "write_memory"}},
		"checklist":                  map[string]interface{}{"present": true, "authority_checked": true, "promotion_contract_checked": true, "safety_envelope_checked": true, "rehearsal_checked": true, "authorization_manifest_checked": true, "final_preflight_checked": true, "pass_gold_real_checked": true, "pass_secure_real_checked": true, "rollback_checked": true, "kill_switch_checked": true, "observability_checked": true, "mcp_boundary_checked": true, "no_mutation_checked": true},
	}
}

func TestV96HandoffToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorHandoffPackage, mcpserver.ToolExecutorHandoffValidate, mcpserver.ToolExecutorHandoffBoundary, mcpserver.ToolExecutorHandoffAudit, mcpserver.ToolExecutorHandoffExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK || strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V9.6 tool %s not registered: ok=%v err=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestExecutorHandoffPackageReturnsV96ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorHandoffPackage, Root: t.TempDir(), Args: mkArgs(fullHandoffArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.6"`, `"dry_run":true`, `"read_only":true`, `"package_status":"handoff_ready_dry_run"`, `"external_executor_handoff_ready":true`, `"promotion_allowed":false`, `"deploy_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorHandoffValidateBlocksMCPExecutorCallAndFileWrite(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorHandoffValidate, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"handoff_id": "handoff-unsafe", "executor": "mcp", "target": "stable", "environment": "local", "promotion_allowed": true, "executor_call_allowed_inside_mcp": true, "file_write_allowed": true, "write_handoff_file": true, "external_executor_handoff_ready": true})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.6"`, `"valid":false`, `"blocked":true`, "executor cannot be mcp or mcp_readonly", "executor_call_allowed_inside_mcp cannot be true", "write_handoff_file cannot be true"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorHandoffBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorHandoffBoundary})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.6"`, `"forbidden_inside_mcp":`, "write_handoff_file", "call_external_executor", "authorize_execution_inside_mcp", "perform_rollback"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorHandoffAuditDetectsAttempts(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorHandoffAudit, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"handoff_id": "handoff-unsafe", "executor": "mcp", "operation": "promote", "promotion_allowed": true, "deploy_allowed": true, "executor_call_allowed_inside_mcp": true, "file_write_allowed": true, "write_handoff_file": true, "attempt_external_call": true, "attempt_real_rollback": true, "file_write": true, "command_execution": true, "network_call": true, "pass_gold": true, "external_executor_handoff_ready": true, "gates": []map[string]interface{}{{"gate": "PASS_GOLD", "dry_run": true, "real_evidence": false, "synthesized": true}}})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"execution_attempt_found":true`, `"mutation_attempt_found":true`, `"file_write_attempt_found":true`, `"mcp_executor_call_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorHandoffExplainIncludesNotPassGoldExecutionOrFile(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorHandoffExplain, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"operation": "promote", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	payload, _ := json.Marshal(resp.Payload)
	s := string(payload)
	for _, want := range []string{`"version":"V9.6"`, `"why_handoff_is_not_pass_gold":`, `"why_handoff_is_not_execution":`, `"why_handoff_is_not_a_file":`, "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV96MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV96RegressionToolsV80ThroughV95StillRegistered(t *testing.T) {
	tools := []string{mcpserver.ToolProjectSummary, mcpserver.ToolGraphProviders, mcpserver.ToolDryRunRiskAssessment, mcpserver.ToolCodeBurnExplain, mcpserver.ToolImpeccableExplain, mcpserver.ToolDashboardToolInventory, mcpserver.ToolPolicyExplain, mcpserver.ToolContractExplain, mcpserver.ToolEvidenceExplain, mcpserver.ToolReadinessExplain, mcpserver.ToolGateAuthorityExplain, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolExecutorRehearsalBoundary, mcpserver.ToolExecutorAuthorizationBoundary, mcpserver.ToolExecutorPreflightBoundary}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("regression tool %s became unregistered", tool)
		}
	}
}

func TestV97InvocationToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorInvocationBoundary, mcpserver.ToolExecutorInvocationValidate, mcpserver.ToolExecutorInvocationHardDenyBoundary, mcpserver.ToolExecutorInvocationAudit, mcpserver.ToolExecutorInvocationExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK || strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V9.7 tool %s not registered: ok=%v err=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestExecutorInvocationBoundaryReturnsV97ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorInvocationBoundary, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"invocation_id": "invoke-001", "executor": "external_promotion_executor", "executor_mode": "external_only"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.7"`, `"dry_run":true`, `"read_only":true`, `"mcp_execution_allowed":false`, `"executor_call_allowed_inside_mcp":false`, `"promotion_allowed":false`, `"deploy_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorInvocationValidateBlocksUnsafeClaims(t *testing.T) {
	args := map[string]interface{}{"invocation_id": "invoke-unsafe", "executor": "mcp", "executor_mode": "inside_mcp", "network_call_allowed": true, "authorization": map[string]interface{}{"present": true, "token_plaintext_present": true}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorInvocationValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.7"`, `"valid":false`, `"blocked":true`, "executor cannot be mcp", "executor_mode must be external_only", "network_call_allowed cannot be true", "real or plaintext authorization token"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorInvocationBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorInvocationBoundary, Args: mkArgs(map[string]interface{}{})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.7"`, `"forbidden_inside_mcp":`, "invoke_executor", "network_call", "command_execution", "file_write", "authorize_execution_inside_mcp", "perform_rollback"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorInvocationAuditDetectsAttemptsAndPlaintext(t *testing.T) {
	args := map[string]interface{}{"invocation_id": "invoke-unsafe", "executor": "mcp", "executor_mode": "inside_mcp", "executor_call_allowed_inside_mcp": true, "network_call": true, "command_execution": true, "file_write": true, "authorization": map[string]interface{}{"token_plaintext_present": true}, "signature": map[string]interface{}{"signature_plaintext_secret_present": true}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorInvocationAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"mcp_executor_call_attempt_found":true`, `"plaintext_secret_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorInvocationExplainIncludesMCPAndPlaceholderReasons(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorInvocationExplain, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"operation": "promote", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.7"`, `"why_mcp_cannot_invoke_executor":`, `"why_tokens_are_placeholders_only":`, "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV97MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV97RegressionToolsV80ThroughV96StillRegistered(t *testing.T) {
	tools := []string{mcpserver.ToolProjectSummary, mcpserver.ToolGraphProviders, mcpserver.ToolDryRunRiskAssessment, mcpserver.ToolCodeBurnExplain, mcpserver.ToolImpeccableExplain, mcpserver.ToolDashboardToolInventory, mcpserver.ToolPolicyExplain, mcpserver.ToolContractExplain, mcpserver.ToolEvidenceExplain, mcpserver.ToolReadinessExplain, mcpserver.ToolGateAuthorityExplain, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolExecutorRehearsalBoundary, mcpserver.ToolExecutorAuthorizationBoundary, mcpserver.ToolExecutorPreflightBoundary, mcpserver.ToolExecutorHandoffBoundary}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("regression tool %s became unregistered", tool)
		}
	}
}

func mustJSON(t *testing.T, v interface{}) []byte {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return b
}

func TestV98ResultIntakeToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorResultIntake, mcpserver.ToolExecutorResultValidate, mcpserver.ToolExecutorResultBoundary, mcpserver.ToolExecutorResultAudit, mcpserver.ToolExecutorResultExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK || strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V9.8 tool %s not registered: ok=%v err=%q", tool, resp.OK, resp.Error)
		}
	}
}

func validResultIntakeArgs() map[string]interface{} {
	return map[string]interface{}{"intake_id": "intake-001", "invocation_id": "invoke-001", "executor": "external_promotion_executor", "executor_mode": "external_only", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "e299103", "target": "stable", "environment": "local", "invocation_boundary": map[string]interface{}{"present": true, "version": "V9.7", "valid": true}, "handoff_package": map[string]interface{}{"present": true, "version": "V9.6", "valid": true}, "final_preflight": map[string]interface{}{"present": true, "version": "V9.5", "valid": true}, "authorization_manifest": map[string]interface{}{"present": true, "version": "V9.4", "valid": true}, "result_payload": map[string]interface{}{"present": true, "result_id": "result-001", "invocation_id": "invoke-001", "executor": "external_promotion_executor", "executor_mode": "external_only", "external_only": true, "completed": true, "status": "completed"}, "execution_result": map[string]interface{}{"present": true, "status": "completed", "success": true, "external_executor_reported": true}, "evidence_bundle": map[string]interface{}{"present": true, "trusted": false}, "audit_trail": map[string]interface{}{"present": true}, "rollback_outcome": map[string]interface{}{"present": true}, "observability_outcome": map[string]interface{}{"present": true}, "mutation_summary": map[string]interface{}{"present": true}, "command_summary": map[string]interface{}{"present": true, "executor_side_only": true}, "network_summary": map[string]interface{}{"present": true, "executor_side_only": true}, "file_write_summary": map[string]interface{}{"present": true, "executor_side_only": true}, "status_publication_summary": map[string]interface{}{"present": true, "executor_side_only": true}, "attestation": map[string]interface{}{"present": true, "signature_placeholder": "SIGNATURE_PLACEHOLDER", "plaintext_secret_present": false}, "idempotency": map[string]interface{}{"present": true, "key": "invoke-001", "invocation_id_matched": true}, "safety_decision": map[string]interface{}{"present": true, "requires_human_review": true, "requires_revalidation": true, "eligible_for_authority_review": true, "rejected": false}, "claims": map[string]interface{}{"pass_gold": false, "pass_secure": false, "promotion_allowed": false, "deploy_allowed": false, "status_publish_allowed": false, "mutation_allowed": false, "memory_write_allowed": false, "stable_promoted": false, "authority_granted": false, "result_trusted_without_review": false}}
}

func TestExecutorResultIntakeReturnsV98ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorResultIntake, Root: t.TempDir(), Args: mkArgs(validResultIntakeArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.8"`, `"dry_run":true`, `"read_only":true`, `"intake_status":"result_intake_ready_dry_run"`, `"result_intake_valid":true`, `"promotion_allowed":false`, `"pass_gold_allowed":false`, `"trust_without_review_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorResultValidateBlocksUnsafeClaims(t *testing.T) {
	args := map[string]interface{}{"intake_id": "intake-unsafe", "invocation_id": "invoke-unsafe", "executor": "mcp", "executor_mode": "inside_mcp", "pass_gold": true, "result_trusted_without_review": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorResultValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.8"`, `"valid":false`, `"blocked":true`, "mcp_executor_claim", "pass_gold_claim", "result_trusted_without_review_claim", `"pass_gold_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorResultBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorResultBoundary, Args: mkArgs(map[string]interface{}{})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.8"`, `"forbidden_inside_mcp":`, "trust_result_automatically", "mark_PASS_GOLD", "mark_PASS_SECURE", "promote_stable", "deploy", "publish_status", "write_memory", "grant_authority", "learn_stable", "perform_rollback"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorResultAuditDetectsUnsafeAttempts(t *testing.T) {
	args := map[string]interface{}{"intake_id": "intake-unsafe", "executor": "mcp", "pass_gold": true, "promotion_allowed": true, "memory_write_allowed": true, "status_publish_allowed": true, "result_trusted_without_review": true, "attestation": map[string]interface{}{"plaintext_secret_present": true}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorResultAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"trust_bypass_attempt_found":true`, `"auto_gold_attempt_found":true`, `"auto_promotion_attempt_found":true`, `"plaintext_secret_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorResultExplainIncludesPassGoldAndReviewReasons(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorResultExplain, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"operation": "intake_external_result", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.8"`, `"why_result_is_not_pass_gold":`, `"why_result_requires_review":`, "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV98MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV98RegressionToolsV80ThroughV97StillRegistered(t *testing.T) {
	tools := []string{mcpserver.ToolProjectSummary, mcpserver.ToolGraphProviders, mcpserver.ToolDryRunRiskAssessment, mcpserver.ToolCodeBurnExplain, mcpserver.ToolImpeccableExplain, mcpserver.ToolDashboardToolInventory, mcpserver.ToolPolicyExplain, mcpserver.ToolContractExplain, mcpserver.ToolEvidenceExplain, mcpserver.ToolReadinessExplain, mcpserver.ToolGateAuthorityExplain, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolExecutorRehearsalBoundary, mcpserver.ToolExecutorAuthorizationBoundary, mcpserver.ToolExecutorPreflightBoundary, mcpserver.ToolExecutorHandoffBoundary, mcpserver.ToolExecutorInvocationBoundary}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("regression tool %s became unregistered", tool)
		}
	}
}

func validAuthorityReviewArgs() map[string]interface{} {
	return map[string]interface{}{
		"review_id": "review-001", "intake_id": "intake-001", "invocation_id": "invoke-001", "executor": "external_promotion_executor", "executor_mode": "external_only", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "bd56cf1", "target": "stable", "environment": "local",
		"result_intake":    map[string]interface{}{"present": true, "version": "V9.8", "intake_id": "intake-001", "intake_status": "result_intake_ready_dry_run", "result_intake_valid": true, "result_requires_human_review": true, "result_requires_revalidation": true, "result_eligible_for_authority_review": true, "result_rejected": false, "valid": true},
		"evidence_bundle":  map[string]interface{}{"present": true, "evidence_id": "evidence-result-001", "contains_executor_logs": true, "contains_diff_summary": true, "contains_validation_summary": true, "contains_security_summary": true, "contains_real_pass_gold": false, "contains_real_pass_secure": false, "dry_run_evidence_only": false, "trusted": false, "sufficient_for_review": true},
		"audit_trail":      map[string]interface{}{"present": true, "audit_id": "audit-001", "records_invocation_id": true, "records_executor": true, "records_inputs": true, "records_outputs": true, "records_started_finished": true, "records_decisions": true, "immutable_target_declared": true, "sufficient_for_review": true},
		"safety_decision":  map[string]interface{}{"present": true, "decision": "requires_authority_review", "requires_human_review": true, "requires_revalidation": true, "eligible_for_authority_review": true, "rejected": false},
		"rollback_outcome": map[string]interface{}{"present": true}, "observability_outcome": map[string]interface{}{"present": true}, "mutation_summary": map[string]interface{}{"present": true}, "command_summary": map[string]interface{}{"present": true}, "network_summary": map[string]interface{}{"present": true}, "file_write_summary": map[string]interface{}{"present": true}, "status_publication_summary": map[string]interface{}{"present": true},
		"authority_requirements": map[string]interface{}{"present": true, "requires_pass_gold_real": true, "requires_pass_secure_real": true, "requires_evidence_bundle": true, "requires_audit_trail": true, "requires_safety_decision": true, "requires_no_auto_promotion": true, "requires_no_memory_write": true, "requires_no_trust_bypass": true},
		"review_policy":          map[string]interface{}{"present": true, "require_human_review": true, "require_revalidation": true, "require_real_pass_gold_gate": true, "require_real_pass_secure_gate": true, "reject_auto_gold_claims": true, "reject_auto_promotion_claims": true, "reject_memory_write_claims": true, "reject_trust_without_review": true},
		"claims":                 map[string]interface{}{"pass_gold": false, "pass_secure": false, "authority_granted": false, "promotion_allowed": false, "deploy_allowed": false, "status_publish_allowed": false, "mutation_allowed": false, "memory_write_allowed": false, "stable_promoted": false, "result_trusted_without_review": false, "review_bypassed": false, "human_review_skipped": false, "revalidation_skipped": false},
	}
}

func TestV99AuthorityReviewToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExecutorAuthorityReview, mcpserver.ToolExecutorAuthorityReviewValidate, mcpserver.ToolExecutorAuthorityReviewBoundary, mcpserver.ToolExecutorAuthorityReviewAudit, mcpserver.ToolExecutorAuthorityReviewExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if !resp.OK || strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V9.9 tool %s not registered: ok=%v err=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestExecutorAuthorityReviewReturnsV99ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorityReview, Root: t.TempDir(), Args: mkArgs(validAuthorityReviewArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.9"`, `"dry_run":true`, `"read_only":true`, `"review_status":"authority_review_ready_dry_run"`, `"authority_review_valid":true`, `"pass_gold_allowed":false`, `"authority_grant_allowed":false`, `"promotion_allowed":false`, `"trust_without_review_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorAuthorityReviewValidateBlocksUnsafeClaims(t *testing.T) {
	args := map[string]interface{}{"review_id": "review-unsafe", "intake_id": "intake-unsafe", "invocation_id": "invoke-unsafe", "executor": "mcp", "executor_mode": "inside_mcp", "pass_gold": true, "authority_granted": true, "human_review_skipped": true, "safety_decision": map[string]interface{}{"present": true, "requires_human_review": false, "requires_revalidation": false, "rejected": false}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorityReviewValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.9"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "pass_gold", "authority_granted", "human_review_skipped", `"pass_gold_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorAuthorityReviewBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorityReviewBoundary, Args: mkArgs(map[string]interface{}{})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.9"`, `"forbidden_inside_mcp":`, "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "deploy", "publish_status", "write_memory", "learn_stable", "trust_result_automatically", "bypass_human_review", "bypass_revalidation"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorAuthorityReviewAuditDetectsUnsafeAttempts(t *testing.T) {
	args := map[string]interface{}{"review_id": "review-unsafe", "executor": "mcp", "pass_gold": true, "pass_secure": true, "authority_granted": true, "promotion_allowed": true, "deploy_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "stable_promoted": true, "result_trusted_without_review": true, "review_bypassed": true, "human_review_skipped": true, "revalidation_skipped": true, "evidence_bundle": map[string]interface{}{"dry_run_evidence_only": true, "trusted": true}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorityReviewAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"auto_promotion_attempt_found":true`, `"trust_bypass_attempt_found":true`, `"review_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExecutorAuthorityReviewExplainIncludesAuthorityAndHumanReviewReasons(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExecutorAuthorityReviewExplain, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"operation": "review_external_result", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V9.9"`, `"why_review_is_not_authority":`, `"why_human_review_is_required":`, "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV99MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV99RegressionToolsV80ThroughV98StillRegistered(t *testing.T) {
	tools := []string{mcpserver.ToolProjectSummary, mcpserver.ToolGraphProviders, mcpserver.ToolDryRunRiskAssessment, mcpserver.ToolCodeBurnExplain, mcpserver.ToolImpeccableExplain, mcpserver.ToolDashboardToolInventory, mcpserver.ToolPolicyExplain, mcpserver.ToolContractExplain, mcpserver.ToolEvidenceExplain, mcpserver.ToolReadinessExplain, mcpserver.ToolGateAuthorityExplain, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolExecutorRehearsalBoundary, mcpserver.ToolExecutorAuthorizationBoundary, mcpserver.ToolExecutorPreflightBoundary, mcpserver.ToolExecutorHandoffBoundary, mcpserver.ToolExecutorInvocationBoundary, mcpserver.ToolExecutorResultBoundary}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("regression tool %s became unregistered", tool)
		}
	}
}

func validSovereignDecisionArgs() map[string]interface{} {
	return map[string]interface{}{
		"decision_id": "decision-001", "review_id": "review-001", "intake_id": "intake-001", "invocation_id": "invoke-001", "executor": "external_promotion_executor", "executor_mode": "external_only", "project": "vision-core", "branch": "v6-go-enterprise-runtime", "commit_sha": "e2c3203", "target": "stable", "environment": "local",
		"authority_review":           map[string]interface{}{"present": true, "version": "V9.9", "review_id": "review-001", "review_status": "authority_review_ready_dry_run", "authority_review_valid": true, "authority_review_ready_dry_run": true, "requires_human_review": true, "requires_revalidation": true, "eligible_for_future_authority_decision": true, "rejected": false, "valid": true},
		"result_intake":              map[string]interface{}{"present": true, "version": "V9.8", "intake_id": "intake-001", "result_intake_valid": true, "result_requires_human_review": true, "result_requires_revalidation": true, "result_eligible_for_authority_review": true, "result_rejected": false, "valid": true},
		"evidence_bundle":            map[string]interface{}{"present": true, "evidence_id": "evidence-001", "contains_executor_logs": true, "contains_diff_summary": true, "contains_validation_summary": true, "contains_security_summary": true, "contains_real_pass_gold": true, "contains_real_pass_secure": true, "sufficient_for_decision": true, "dry_run_evidence_only": false},
		"audit_trail":                map[string]interface{}{"present": true, "audit_id": "audit-001", "records_invocation_id": true, "records_executor": true, "records_inputs": true, "records_outputs": true, "records_started_finished": true, "records_decisions": true, "immutable_target_declared": true, "sufficient_for_decision": true},
		"real_gates":                 []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "source": "validator", "artifact_id": "pg", "recognized_by_authority": true, "dry_run": false, "synthesized": false}, {"gate": "PASS_SECURE", "status": "pass", "real_evidence": true, "source": "runner", "artifact_id": "ps", "recognized_by_authority": true, "dry_run": false, "synthesized": false}},
		"promotion_requirements":     map[string]interface{}{"present": true, "requires_pass_gold_real": true, "requires_pass_secure_real": true, "requires_authority_review_valid": true, "requires_result_intake_valid": true, "requires_evidence_bundle": true, "requires_audit_trail": true, "requires_human_approval": true, "requires_revalidation": true, "requires_rollback_plan": true, "requires_observability": true, "requires_no_unsafe_claims": true},
		"risk_assessment":            map[string]interface{}{"present": true, "risk_level": "medium", "critical_risks": 0, "high_risks": 0, "medium_risks": 1, "low_risks": 2, "acceptable_for_candidate": true},
		"rollback_requirements":      map[string]interface{}{"present": true, "rollback_required": true, "rollback_plan_present": true, "snapshot_required": true, "validation_required": true, "manual_intervention_required": true},
		"observability_requirements": map[string]interface{}{"present": true, "health_checks_required": true, "metrics_required": true, "logs_required": true, "alerting_required": true, "watch_window_seconds": 900},
		"human_approval":             map[string]interface{}{"present": true, "required": true, "approved": true, "approver": "operator", "approval_reference": "approval-001", "approval_is_placeholder": false},
		"policy":                     map[string]interface{}{"present": true, "reject_auto_gold_claims": true, "reject_auto_authority_claims": true, "reject_auto_promotion_claims": true, "reject_memory_write_claims": true, "reject_stable_promotion_claims": true, "reject_trust_without_review": true, "require_real_pass_gold_gate": true, "require_real_pass_secure_gate": true, "require_human_approval": true, "require_revalidation": true},
	}
}

func TestV100SovereignDecisionToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolSovereignPromotionDecision, mcpserver.ToolSovereignDecisionValidate, mcpserver.ToolSovereignDecisionBoundary, mcpserver.ToolSovereignDecisionAudit, mcpserver.ToolSovereignDecisionExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validSovereignDecisionArgs())})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V10.0 tool %s not registered", tool)
		}
	}
}

func TestSovereignPromotionDecisionReturnsV100ReadOnlyDryRun(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolSovereignPromotionDecision, Root: t.TempDir(), Args: mkArgs(validSovereignDecisionArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.0"`, `"dry_run":true`, `"read_only":true`, `"decision_status":"promotion_candidate_ready_dry_run"`, `"promotion_decision_candidate":true`, `"promotion_allowed":false`, `"pass_gold_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestSovereignDecisionValidateBlocksMCPAndUnsafeClaims(t *testing.T) {
	args := map[string]interface{}{"decision_id": "decision-unsafe", "review_id": "review-unsafe", "intake_id": "intake-unsafe", "invocation_id": "invoke-unsafe", "executor": "mcp", "executor_mode": "inside_mcp", "pass_gold": true, "authority_granted": true, "promotion_allowed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolSovereignDecisionValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.0"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "pass_gold", "authority_granted", "promotion_allowed", `"pass_gold_allowed":false`, `"authority_grant_allowed":false`, `"promotion_allowed":false`, `"trust_without_review_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestSovereignDecisionBoundaryListsForbiddenInsideMCP(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolSovereignDecisionBoundary, Args: mkArgs(map[string]interface{}{})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.0"`, `"forbidden_inside_mcp":`, "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "deploy", "publish_status", "write_memory", "learn_stable", "trust_result_automatically", "bypass_human_review", "bypass_revalidation"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestSovereignDecisionAuditDetectsUnsafeAttempts(t *testing.T) {
	args := map[string]interface{}{"decision_id": "decision-unsafe", "executor": "mcp", "pass_gold": true, "pass_secure": true, "authority_granted": true, "promotion_allowed": true, "deploy_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "stable_promoted": true, "learned_as_stable": true, "result_trusted_without_review": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "real_gates": []map[string]interface{}{{"gate": "PASS_GOLD", "dry_run": true, "synthesized": true, "real_evidence": false}}}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolSovereignDecisionAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"auto_promotion_attempt_found":true`, `"deploy_attempt_found":true`, `"status_publish_attempt_found":true`, `"stable_learning_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestSovereignDecisionExplainIncludesAuthorityAndAdvisoryReasons(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolSovereignDecisionExplain, Root: t.TempDir(), Args: mkArgs(map[string]interface{}{"operation": "sovereign_promotion_candidate_decision", "executor": "external_promotion_executor"})})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.0"`, `"why_decision_is_not_authority":`, `"why_candidate_is_only_advisory":`, "PASS_GOLD", "PASS_SECURE"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV100MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func TestV100RegressionToolsV80ThroughV99StillRegistered(t *testing.T) {
	tools := []string{mcpserver.ToolProjectSummary, mcpserver.ToolGraphProviders, mcpserver.ToolDryRunRiskAssessment, mcpserver.ToolCodeBurnExplain, mcpserver.ToolImpeccableExplain, mcpserver.ToolDashboardToolInventory, mcpserver.ToolPolicyExplain, mcpserver.ToolContractExplain, mcpserver.ToolEvidenceExplain, mcpserver.ToolReadinessExplain, mcpserver.ToolGateAuthorityExplain, mcpserver.ToolPromotionContractBoundary, mcpserver.ToolExecutorSafetyBoundary, mcpserver.ToolExecutorRehearsalBoundary, mcpserver.ToolExecutorAuthorizationBoundary, mcpserver.ToolExecutorPreflightBoundary, mcpserver.ToolExecutorHandoffBoundary, mcpserver.ToolExecutorInvocationBoundary, mcpserver.ToolExecutorResultBoundary, mcpserver.ToolExecutorAuthorityReviewBoundary}
	for _, tool := range tools {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir()})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("regression tool %s became unregistered", tool)
		}
	}
}

func validPromotionFirewallArgs() map[string]interface{} {
	return map[string]interface{}{
		"decision_id":                  "decision-001",
		"executor":                     "external_promotion_executor",
		"executor_mode":                "external_only",
		"promotion_decision_candidate": true,
		"real_gates": []map[string]interface{}{
			{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "source": "validator", "artifact_id": "pg", "recognized_by_authority": true},
			{"gate": "PASS_SECURE", "status": "pass", "real_evidence": true, "source": "runner", "artifact_id": "ps", "recognized_by_authority": true},
		},
		"human_approval":             map[string]interface{}{"present": true, "approved": true, "approver": "operator", "approval_reference": "approval-001"},
		"independent_revalidation":   map[string]interface{}{"present": true, "completed": true, "validator": "reviewer", "revalidation_reference": "reval-001"},
		"rollback_requirements":      map[string]interface{}{"present": true, "rollback_plan_present": true},
		"observability_requirements": map[string]interface{}{"present": true, "health_checks_present": true, "metrics_present": true, "alerting_present": true},
		"policy":                     map[string]interface{}{"present": true, "reject_execution_claims": true, "require_external_only": true, "require_read_only_dry_run": true},
		"controls":                   map[string]interface{}{"present": true, "read_only": true, "dry_run": true, "no_executor_call": true, "no_network_call": true, "no_command_execution": true, "no_file_write": true, "no_real_lock": true},
	}
}

func TestV101PromotionFirewallToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolPromotionExecutionFirewall, mcpserver.ToolPromotionFirewallValidate, mcpserver.ToolPromotionFirewallBoundary, mcpserver.ToolPromotionFirewallAudit, mcpserver.ToolPromotionFirewallExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validPromotionFirewallArgs())})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V10.1 tool %s not registered", tool)
		}
	}
}

func TestPromotionExecutionFirewallReturnsV101ReadOnlyDryRunAndDeniesExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionExecutionFirewall, Root: t.TempDir(), Args: mkArgs(validPromotionFirewallArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.1"`, `"dry_run":true`, `"read_only":true`, `"firewall_status":"execution_eligibility_ready_dry_run"`, `"execution_eligibility_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"status_publish_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestPromotionFirewallValidateBlocksRequiredFailuresAndClaims(t *testing.T) {
	args := validPromotionFirewallArgs()
	args["executor"] = "mcp"
	args["executor_mode"] = "inside_mcp"
	args["promotion_decision_candidate"] = false
	args["promotion_allowed"] = true
	args["deploy_allowed"] = true
	args["status_publish_allowed"] = true
	args["memory_write_allowed"] = true
	args["execution_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	args["real_gates"] = []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "dry_run": true, "synthesized": true, "recognized_by_authority": false}}
	args["human_approval"] = map[string]interface{}{"present": true, "approved": true, "approval_is_placeholder": true}
	args["independent_revalidation"] = map[string]interface{}{"present": true, "completed": true, "revalidation_is_placeholder": true}
	args["rollback_requirements"] = nil
	args["observability_requirements"] = nil
	args["policy"] = nil
	args["controls"] = nil
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionFirewallValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.1"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "promotion_decision_candidate", "PASS_SECURE_REAL", "PASS_GOLD_dry_run_gate_claim", "PASS_GOLD_synthesized_gate_claim", "PASS_GOLD_not_recognized_by_authority", "human_approval_placeholder", "independent_revalidation_placeholder", "rollback_requirements", "observability_requirements", "policy", "controls", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "memory_write_allowed", "execution_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestPromotionFirewallBoundaryAndExplain(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolPromotionFirewallBoundary, []string{`"version":"V10.1"`, `"forbidden_inside_mcp":`, "call_executor", "acquire_lock", "execute_rollback", `"always_denied":`, "mcp_execution_allowed", "learning_allowed"}},
		{mcpserver.ToolPromotionFirewallExplain, []string{`"version":"V10.1"`, `"why_eligibility_is_not_execution":`, "execution_eligibility_ready_dry_run", "PASS_GOLD", "PASS_SECURE"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validPromotionFirewallArgs())})
		if !resp.OK {
			t.Fatalf("expected ok=true for %s: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("missing %s in payload: %s", want, s)
			}
		}
	}
}

func TestPromotionFirewallAuditDetectsUnsafeExecutionAttempts(t *testing.T) {
	args := validPromotionFirewallArgs()
	args["executor_call_allowed"] = true
	args["file_write_allowed"] = true
	args["promotion_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionFirewallAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"unsafe_claims_found":true`, `"executor_call_attempt_found":true`, `"file_write_attempt_found":true`, `"promotion_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV101MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func validPromotionSimulationArgs() map[string]interface{} {
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	return map[string]interface{}{
		"executor":                            "external_promotion_executor",
		"executor_mode":                       "external_only",
		"promotion_execution_candidate":       true,
		"execution_eligibility_ready_dry_run": true,
		"promotion_firewall":                  map[string]interface{}{"version": "V10.1", "dry_run": true, "read_only": true, "valid": true, "firewall_valid": true, "execution_eligibility_ready_dry_run": true},
		"real_gates": []map[string]interface{}{
			{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "source": "validator", "artifact_id": "pg", "recognized_by_authority": true},
			{"gate": "PASS_SECURE", "status": "pass", "real_evidence": true, "source": "runner", "artifact_id": "ps", "recognized_by_authority": true},
		},
		"execution_plan":     map[string]interface{}{"present": true, "valid": true},
		"simulation_steps":   []map[string]interface{}{{"name": "inspect", "action": "read", "mutating": false}},
		"gate_plan":          present(),
		"controls_plan":      map[string]interface{}{"present": true, "valid": true, "read_only": true, "dry_run": true, "no_executor_call": true, "no_network_call": true, "no_command_execution": true, "no_file_write": true, "no_mutation": true, "no_real_lock": true, "no_rollback_execution": true, "no_simulation_persistence": true},
		"rollback":           present(),
		"observability":      present(),
		"status_publication": present(),
		"lock":               present(),
		"idempotency":        present(),
		"kill_switch":        present(),
		"timeout":            present(),
		"stop_criteria":      present(),
		"evidence":           present(),
		"policy":             present(),
		"controls":           map[string]interface{}{"publish_inside_mcp_allowed": false, "real_lock_acquired": false},
	}
}

func TestV102PromotionSimulationToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolPromotionExecutionSimulation, mcpserver.ToolPromotionSimulationValidate, mcpserver.ToolPromotionSimulationBoundary, mcpserver.ToolPromotionSimulationAudit, mcpserver.ToolPromotionSimulationExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validPromotionSimulationArgs())})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V10.2 tool %s not registered", tool)
		}
	}
}

func TestPromotionExecutionSimulationReturnsV102ReadOnlyDryRunAndDeniesExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionExecutionSimulation, Root: t.TempDir(), Args: mkArgs(validPromotionSimulationArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.2"`, `"dry_run":true`, `"read_only":true`, `"simulation_status":"promotion_execution_simulation_ready_dry_run"`, `"promotion_execution_candidate":true`, `"execution_eligibility_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"simulation_persistence_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestPromotionSimulationValidateBlocksRequiredFailuresAndClaims(t *testing.T) {
	args := validPromotionSimulationArgs()
	args["executor"] = "mcp"
	args["executor_mode"] = "inside_mcp"
	args["promotion_execution_candidate"] = false
	args["execution_eligibility_ready_dry_run"] = false
	args["promotion_firewall"] = map[string]interface{}{"valid": false, "firewall_valid": false, "execution_eligibility_ready_dry_run": false}
	args["real_gates"] = []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "dry_run": true, "synthesized": true, "recognized_by_authority": false}}
	args["execution_plan"] = nil
	args["simulation_steps"] = []map[string]interface{}{{"name": "write", "mutating": true}}
	args["gate_plan"] = nil
	args["controls_plan"] = map[string]interface{}{"present": true, "valid": true, "read_only": true}
	args["rollback"] = nil
	args["observability"] = nil
	args["status_publication"] = nil
	args["lock"] = nil
	args["idempotency"] = nil
	args["kill_switch"] = nil
	args["timeout"] = nil
	args["stop_criteria"] = nil
	args["evidence"] = nil
	args["policy"] = nil
	args["controls"] = map[string]interface{}{"publish_inside_mcp_allowed": true, "real_lock_acquired": true}
	args["execution_allowed"] = true
	args["executor_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	args["promotion_allowed"] = true
	args["deploy_allowed"] = true
	args["status_publish_allowed"] = true
	args["mutation_allowed"] = true
	args["memory_write_allowed"] = true
	args["stable_promotion_allowed"] = true
	args["rollback_allowed"] = true
	args["simulation_persistence_allowed"] = true
	args["pass_gold_allowed"] = true
	args["pass_secure_allowed"] = true
	args["authority_grant_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionSimulationValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.2"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "promotion_firewall_invalid", "firewall_valid_false", "execution_eligibility_ready_dry_run", "promotion_execution_candidate", "PASS_SECURE_REAL", "PASS_GOLD_dry_run_gate_claim", "PASS_GOLD_synthesized_gate_claim", "PASS_GOLD_not_recognized_by_authority", "execution_plan", "simulation_step_mutating:write", "gate_plan", "controls_plan_insecure", "rollback", "observability", "status_publication", "lock", "idempotency", "kill_switch", "timeout", "stop_criteria", "evidence", "policy", "publish_inside_mcp_allowed", "real_lock_acquired", "execution_allowed", "executor_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "rollback_allowed", "simulation_persistence_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestPromotionSimulationBoundaryAndExplain(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolPromotionSimulationBoundary, []string{`"version":"V10.2"`, `"forbidden_inside_mcp":`, "call_executor", "persist_simulation", "grant_authority", `"always_denied":`, "mcp_execution_allowed", "simulation_persistence_allowed", "authority_grant_allowed"}},
		{mcpserver.ToolPromotionSimulationExplain, []string{`"version":"V10.2"`, `"why_simulation_is_not_execution":`, "promotion_execution_candidate", "PASS_GOLD", "PASS_SECURE"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validPromotionSimulationArgs())})
		if !resp.OK {
			t.Fatalf("expected ok=true for %s: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("missing %s in payload: %s", want, s)
			}
		}
	}
}

func TestPromotionSimulationAuditDetectsUnsafeExecutionAttempts(t *testing.T) {
	args := validPromotionSimulationArgs()
	args["executor_call_allowed"] = true
	args["file_write_allowed"] = true
	args["promotion_allowed"] = true
	args["claims"] = map[string]interface{}{"simulation_persisted": true, "authority_granted": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionSimulationAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"unsafe_claims_found":true`, `"executor_call_attempt_found":true`, `"file_write_attempt_found":true`, `"promotion_attempt_found":true`, `"simulation_persisted_found":true`, `"authority_grant_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestV102MutatingToolsStillBlockedExactMessage(t *testing.T) {
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func validFinalAuthorizationArgs() map[string]interface{} {
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	return map[string]interface{}{
		"final_authorization_id": "fa-1",
		"simulation_id":          "sim-1",
		"firewall_id":            "fw-1",
		"decision_id":            "dec-1",
		"review_id":              "rev-1",
		"intake_id":              "intake-1",
		"invocation_id":          "inv-1",
		"executor":               "external_promotion_executor",
		"executor_mode":          "external_only",
		"project":                "vision-core",
		"branch":                 "v6-go-enterprise-runtime",
		"commit_sha":             "088f7aa",
		"target":                 "stable",
		"environment":            "production",
		"promotion_simulation":   map[string]interface{}{"version": "V10.2", "dry_run": true, "read_only": true, "valid": true, "simulation_record_ready_dry_run": true, "execution_simulation_candidate": true},
		"promotion_firewall":     map[string]interface{}{"version": "V10.1", "dry_run": true, "read_only": true, "valid": true, "firewall_valid": true, "execution_eligibility_ready_dry_run": true},
		"sovereign_decision":     map[string]interface{}{"version": "V10.0", "dry_run": true, "read_only": true, "valid": true, "sovereign_decision_valid": true, "promotion_decision_candidate": true},
		"real_gates": []map[string]interface{}{
			{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "source": "validator", "artifact_id": "pg", "recognized_by_authority": true},
			{"gate": "PASS_SECURE", "status": "pass", "real_evidence": true, "source": "runner", "artifact_id": "ps", "recognized_by_authority": true},
		},
		"human_approval":           map[string]interface{}{"present": true, "approved": true, "approver": "release-manager", "approval_reference": "approval-1", "valid": true},
		"independent_revalidation": map[string]interface{}{"present": true, "completed": true, "validator": "independent-validator", "revalidation_reference": "reval-1", "pass_gold_revalidated": true, "pass_secure_revalidated": true, "valid": true},
		"rollback_plan":            present(),
		"observability_plan":       present(),
		"idempotency":              present(),
		"kill_switch":              present(),
		"timeout":                  present(),
		"final_execution_policy":   present(),
		"safety_controls":          map[string]interface{}{"present": true, "valid": true, "no_mcp_execution": true, "no_executor_call_inside_mcp": true, "no_network_inside_mcp": true, "no_command_inside_mcp": true, "no_file_write_inside_mcp": true, "no_deploy_inside_mcp": true, "no_status_publish_inside_mcp": true, "no_memory_stable_write_inside_mcp": true},
	}
}

func TestV103PromotionFinalAuthorizationToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolPromotionFinalAuthorization, mcpserver.ToolPromotionFinalAuthorizationValidate, mcpserver.ToolPromotionFinalAuthorizationBoundary, mcpserver.ToolPromotionFinalAuthorizationAudit, mcpserver.ToolPromotionFinalAuthorizationExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validFinalAuthorizationArgs())})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V10.3 tool %s not registered", tool)
		}
	}
}

func TestPromotionFinalAuthorizationReturnsV103ReadOnlyDryRunAndDeniesExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionFinalAuthorization, Root: t.TempDir(), Args: mkArgs(validFinalAuthorizationArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.3"`, `"dry_run":true`, `"read_only":true`, `"final_authorization_status":"final_authorization_ready_dry_run"`, `"final_authorization_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"final_authorization_persistence_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestPromotionFinalAuthorizationValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validFinalAuthorizationArgs()
	args["executor"] = "mcp_readonly"
	args["executor_mode"] = "inside_mcp"
	args["promotion_simulation"] = map[string]interface{}{"version": "V10.2", "valid": false, "simulation_record_ready_dry_run": false, "execution_simulation_candidate": false}
	args["promotion_firewall"] = map[string]interface{}{"valid": false, "firewall_valid": false, "execution_eligibility_ready_dry_run": false}
	args["sovereign_decision"] = map[string]interface{}{"valid": false, "sovereign_decision_valid": false, "promotion_decision_candidate": false}
	args["real_gates"] = []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "dry_run": true, "synthesized": true, "recognized_by_authority": false}}
	args["human_approval"] = map[string]interface{}{"present": true, "approved": false, "placeholder": true, "valid": false}
	args["independent_revalidation"] = map[string]interface{}{"present": true, "completed": false, "placeholder": true, "pass_gold_revalidated": false, "pass_secure_revalidated": false, "valid": false}
	args["rollback_plan"] = nil
	args["observability_plan"] = nil
	args["idempotency"] = nil
	args["kill_switch"] = nil
	args["timeout"] = nil
	args["final_execution_policy"] = nil
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": false}
	args["execution_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	args["promotion_allowed"] = true
	args["deploy_allowed"] = true
	args["status_publish_allowed"] = true
	args["memory_write_allowed"] = true
	args["final_authorization_persistence_allowed"] = true
	args["authority_grant_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionFinalAuthorizationValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.3"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "simulation_blocked", "simulation_record_ready_dry_run", "execution_simulation_candidate", "firewall_blocked", "execution_eligibility_ready_dry_run", "sovereign_candidate_missing", "promotion_decision_candidate", "PASS_SECURE_REAL", "PASS_GOLD_dry_run_gate_claim", "PASS_GOLD_synthesized_gate_claim", "PASS_GOLD_not_recognized_by_authority", "human_approval_placeholder", "human_approval_approved_false", "independent_revalidation_placeholder", "independent_revalidation_completed_false", "pass_gold_revalidated_false", "pass_secure_revalidated_false", "rollback_plan", "observability_plan", "idempotency", "kill_switch", "timeout", "final_execution_policy", "safety_controls_invalid", "execution_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "memory_write_allowed", "final_authorization_persistence_allowed", "authority_grant_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestPromotionFinalAuthorizationBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolPromotionFinalAuthorizationBoundary, []string{`"version":"V10.3"`, `"dry_run":true`, `"read_only":true`, "simulate final authorization", "call_executor", "persist_final_authorization", "mark_PASS_GOLD", "grant_authority", "final_authorization_persistence_allowed"}},
		{mcpserver.ToolPromotionFinalAuthorizationExplain, []string{`"version":"V10.3"`, "why_final_authorization_is_not_execution", "why_mcp_cannot_execute", "why_real_gates_are_required", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validFinalAuthorizationArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}

	args := validFinalAuthorizationArgs()
	args["claims"] = map[string]interface{}{"execution_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "promotion_allowed": true, "deploy_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "final_authorization_persisted": true, "pass_gold": true, "authority_granted": true, "dry_run_gate_claim": true, "synthesized_gate_claim": true, "human_approval_bypassed": true, "revalidation_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolPromotionFinalAuthorizationAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"execution_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"promotion_attempt_found":true`, `"deploy_attempt_found":true`, `"status_publish_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"final_authorization_persistence_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func validExecutionAdapterArgs() map[string]interface{} {
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	return map[string]interface{}{
		"adapter_interface_id":     "adapter-iface-1",
		"final_authorization_id":   "fa-1",
		"simulation_id":            "sim-1",
		"firewall_id":              "fw-1",
		"decision_id":              "dec-1",
		"invocation_id":            "inv-1",
		"executor":                 "external_promotion_executor",
		"executor_mode":            "external_only",
		"adapter_name":             "external-execution-adapter",
		"adapter_version":          "1.0.0",
		"adapter_type":             "promotion_executor_adapter",
		"project":                  "vision-core",
		"branch":                   "v6-go-enterprise-runtime",
		"commit_sha":               "59a6624",
		"target":                   "stable",
		"environment":              "production",
		"final_authorization":      map[string]interface{}{"version": "V10.3", "dry_run": true, "read_only": true, "valid": true, "final_authorization_ready_dry_run": true},
		"promotion_simulation":     map[string]interface{}{"version": "V10.2", "dry_run": true, "read_only": true, "valid": true, "simulation_record_ready_dry_run": true, "execution_simulation_candidate": true},
		"promotion_firewall":       map[string]interface{}{"version": "V10.1", "dry_run": true, "read_only": true, "valid": true, "firewall_valid": true, "execution_eligibility_ready_dry_run": true},
		"sovereign_decision":       map[string]interface{}{"version": "V10.0", "dry_run": true, "read_only": true, "valid": true, "sovereign_decision_valid": true, "promotion_decision_candidate": true},
		"real_gates":               []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "recognized_by_authority": true}, {"gate": "PASS_SECURE", "status": "pass", "real_evidence": true, "recognized_by_authority": true}},
		"human_approval":           map[string]interface{}{"present": true, "approved": true, "approver": "release-manager", "approval_reference": "approval-1", "valid": true},
		"independent_revalidation": map[string]interface{}{"present": true, "completed": true, "validator": "independent-validator", "revalidation_reference": "reval-1", "pass_gold_revalidated": true, "pass_secure_revalidated": true, "valid": true},
		"adapter_contract_schema":  present(),
		"input_contract":           present(),
		"output_contract":          present(),
		"error_contract":           present(),
		"timeout_contract":         present(),
		"idempotency_contract":     present(),
		"kill_switch_contract":     present(),
		"rollback_contract":        present(),
		"observability_contract":   present(),
		"audit_contract":           present(),
		"security_contract":        present(),
		"policy_contract":          present(),
		"safety_controls":          map[string]interface{}{"present": true, "valid": true, "no_mcp_execution": true, "no_adapter_call_inside_mcp": true, "no_network_inside_mcp": true, "no_command_inside_mcp": true, "no_file_write_inside_mcp": true, "no_deploy_inside_mcp": true, "no_status_publish_inside_mcp": true, "no_memory_stable_write_inside_mcp": true},
	}
}

func TestV104ExternalExecutionAdapterToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExternalExecutionAdapterInterface, mcpserver.ToolExternalExecutionAdapterValidate, mcpserver.ToolExternalExecutionAdapterBoundary, mcpserver.ToolExternalExecutionAdapterAudit, mcpserver.ToolExternalExecutionAdapterExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validExecutionAdapterArgs())})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V10.4 tool %s not registered", tool)
		}
	}
}

func TestExternalExecutionAdapterReturnsV104ReadOnlyDryRunAndDeniesExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionAdapterInterface, Root: t.TempDir(), Args: mkArgs(validExecutionAdapterArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.4"`, `"dry_run":true`, `"read_only":true`, `"adapter_interface_status":"adapter_interface_ready_dry_run"`, `"adapter_interface_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"adapter_call_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"adapter_persistence_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionAdapterValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validExecutionAdapterArgs()
	args["executor"] = "mcp_readonly"
	args["executor_mode"] = "inside_mcp"
	args["adapter_name"] = ""
	args["adapter_version"] = ""
	args["adapter_type"] = ""
	args["final_authorization"] = map[string]interface{}{"version": "V10.3", "valid": false, "final_authorization_ready_dry_run": false}
	args["promotion_simulation"] = map[string]interface{}{"version": "V10.2", "valid": false, "simulation_record_ready_dry_run": false, "execution_simulation_candidate": false}
	args["promotion_firewall"] = map[string]interface{}{"valid": false, "firewall_valid": false, "execution_eligibility_ready_dry_run": false}
	args["sovereign_decision"] = map[string]interface{}{"valid": false, "sovereign_decision_valid": false, "promotion_decision_candidate": false}
	args["real_gates"] = []map[string]interface{}{{"gate": "PASS_GOLD", "status": "pass", "real_evidence": true, "dry_run": true, "synthesized": true, "recognized_by_authority": false}}
	args["human_approval"] = map[string]interface{}{"present": true, "approved": false, "placeholder": true, "valid": false}
	args["independent_revalidation"] = map[string]interface{}{"present": true, "completed": false, "placeholder": true, "pass_gold_revalidated": false, "pass_secure_revalidated": false, "valid": false}
	args["input_contract"] = nil
	args["output_contract"] = map[string]interface{}{"present": true, "valid": false}
	args["policy_contract"] = nil
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": false}
	args["adapter_call_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	args["promotion_allowed"] = true
	args["deploy_allowed"] = true
	args["status_publish_allowed"] = true
	args["memory_write_allowed"] = true
	args["adapter_persistence_allowed"] = true
	args["authority_grant_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionAdapterValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.4"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "adapter_name", "adapter_version", "adapter_type", "final_authorization_blocked", "final_authorization_ready_dry_run", "simulation_blocked", "simulation_record_ready_dry_run", "execution_simulation_candidate", "firewall_blocked", "sovereign_candidate_missing", "promotion_decision_candidate", "PASS_SECURE_REAL", "PASS_GOLD_dry_run_gate_claim", "PASS_GOLD_synthesized_gate_claim", "PASS_GOLD_not_recognized_by_authority", "human_approval_placeholder", "human_approval_approved_false", "independent_revalidation_placeholder", "independent_revalidation_completed_false", "pass_gold_revalidated_false", "pass_secure_revalidated_false", "input_contract", "output_contract_invalid", "policy_contract", "safety_controls_invalid", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "memory_write_allowed", "adapter_persistence_allowed", "authority_grant_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionAdapterBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolExternalExecutionAdapterBoundary, []string{`"version":"V10.4"`, `"dry_run":true`, `"read_only":true`, "simulate external execution adapter interface", "call_adapter", "call_executor", "persist_adapter_contract", "mark_PASS_GOLD", "grant_authority", "adapter_persistence_allowed"}},
		{mcpserver.ToolExternalExecutionAdapterExplain, []string{`"version":"V10.4"`, "why_adapter_interface_is_not_execution", "why_adapter_call_is_blocked_inside_mcp", "why_final_authorization_is_required", "why_real_gates_are_required", "why_contracts_are_required", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validExecutionAdapterArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}

	args := validExecutionAdapterArgs()
	args["claims"] = map[string]interface{}{"adapter_call_allowed": true, "execution_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "promotion_allowed": true, "deploy_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "adapter_contract_persisted": true, "pass_gold": true, "authority_granted": true, "dry_run_gate_claim": true, "synthesized_gate_claim": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "contract_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionAdapterAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"adapter_call_attempt_found":true`, `"execution_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"promotion_attempt_found":true`, `"deploy_attempt_found":true`, `"status_publish_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"adapter_persistence_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`, `"contract_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	for _, tool := range []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool})
		if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
			t.Fatalf("mutating tool %s must remain blocked with exact message, got ok=%v error=%q", tool, resp.OK, resp.Error)
		}
	}
}

func validExecutionRequestArgs() map[string]interface{} {
	args := validExecutionAdapterArgs()
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	args["request_envelope_id"] = "req-env-1"
	args["adapter_interface"] = map[string]interface{}{"version": "V10.4", "dry_run": true, "read_only": true, "valid": true, "adapter_interface_ready_dry_run": true}
	args["request_payload_schema"] = present()
	args["request_metadata"] = present()
	args["correlation_id"] = "corr-1"
	args["idempotency_key"] = "idem-1"
	args["target_descriptor"] = present()
	args["operation_descriptor"] = present()
	args["execution_constraints"] = present()
	args["safety_constraints"] = present()
	args["audit_descriptor"] = present()
	args["rollback_descriptor"] = present()
	args["observability_descriptor"] = present()
	args["timeout_descriptor"] = present()
	args["kill_switch_descriptor"] = present()
	args["error_handling_descriptor"] = present()
	args["security_descriptor"] = present()
	args["policy_descriptor"] = present()
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": true, "no_mcp_execution": true, "no_request_send_inside_mcp": true, "no_adapter_call_inside_mcp": true, "no_network_inside_mcp": true, "no_command_inside_mcp": true, "no_file_write_inside_mcp": true, "no_deploy_inside_mcp": true, "no_status_publish_inside_mcp": true, "no_memory_stable_write_inside_mcp": true}
	return args
}

func TestV105ExternalExecutionRequestToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExternalExecutionRequestEnvelope, mcpserver.ToolExternalExecutionRequestValidate, mcpserver.ToolExternalExecutionRequestBoundary, mcpserver.ToolExternalExecutionRequestAudit, mcpserver.ToolExternalExecutionRequestExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validExecutionRequestArgs())})
		if strings.Contains(resp.Error, "unknown tool") {
			t.Fatalf("V10.5 tool %s not registered", tool)
		}
	}
}

func TestExternalExecutionRequestReturnsV105ReadOnlyDryRunAndDeniesExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionRequestEnvelope, Root: t.TempDir(), Args: mkArgs(validExecutionRequestArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.5"`, `"dry_run":true`, `"read_only":true`, `"request_envelope_status":"request_envelope_ready_dry_run"`, `"request_envelope_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"request_send_allowed":false`, `"adapter_call_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"request_persistence_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionRequestValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validExecutionRequestArgs()
	args["executor"] = "mcp_readonly"
	args["executor_mode"] = "inside_mcp"
	args["adapter_interface"] = map[string]interface{}{"version": "V10.4", "valid": false, "adapter_interface_ready_dry_run": false}
	args["final_authorization"] = map[string]interface{}{"version": "V10.3", "valid": false, "final_authorization_ready_dry_run": false}
	args["promotion_simulation"] = map[string]interface{}{"version": "V10.2", "valid": false, "simulation_record_ready_dry_run": false, "execution_simulation_candidate": false}
	args["request_payload_schema"] = nil
	args["request_metadata"] = map[string]interface{}{"present": true, "valid": false}
	args["correlation_id"] = ""
	args["idempotency_key"] = ""
	args["target_descriptor"] = nil
	args["operation_descriptor"] = map[string]interface{}{"present": true, "valid": false}
	args["policy_descriptor"] = nil
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": false}
	args["request_send_allowed"] = true
	args["adapter_call_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	args["request_persistence_allowed"] = true
	args["authority_grant_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionRequestValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.5"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "adapter_interface_blocked", "adapter_interface_ready_dry_run", "final_authorization_blocked", "final_authorization_ready_dry_run", "simulation_blocked", "simulation_record_ready_dry_run", "execution_simulation_candidate", "request_payload_schema", "request_metadata_invalid", "correlation_id", "idempotency_key", "target_descriptor", "operation_descriptor_invalid", "policy_descriptor", "safety_controls_invalid", "request_send_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "request_persistence_allowed", "authority_grant_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionRequestBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolExternalExecutionRequestBoundary, []string{`"version":"V10.5"`, `"dry_run":true`, `"read_only":true`, "simulate external execution request envelope", "send_request", "call_adapter", "persist_request_envelope", "mark_PASS_GOLD", "grant_authority", "request_persistence_allowed"}},
		{mcpserver.ToolExternalExecutionRequestExplain, []string{`"version":"V10.5"`, "why_request_envelope_is_not_execution", "why_request_send_is_blocked_inside_mcp", "why_adapter_interface_is_required", "why_final_authorization_is_required", "why_real_gates_are_required", "why_request_contracts_are_required", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validExecutionRequestArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}
	args := validExecutionRequestArgs()
	args["claims"] = map[string]interface{}{"request_send_allowed": true, "adapter_call_allowed": true, "execution_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "promotion_allowed": true, "deploy_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "request_envelope_persisted": true, "pass_gold": true, "authority_granted": true, "dry_run_gate_claim": true, "synthesized_gate_claim": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "request_contract_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionRequestAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"request_send_attempt_found":true`, `"adapter_call_attempt_found":true`, `"execution_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"promotion_attempt_found":true`, `"deploy_attempt_found":true`, `"status_publish_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"request_persistence_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`, `"request_contract_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	resp = mcpserver.Dispatch(mcpserver.ToolRequest{Tool: "vision.apply_patch"})
	if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
		t.Fatalf("mutating tool must remain blocked with exact message, got ok=%v error=%q", resp.OK, resp.Error)
	}
}

func validExecutionResponseArgs() map[string]interface{} {
	args := validExecutionRequestArgs()
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	args["response_contract_id"] = "resp-contract-1"
	args["request_envelope"] = map[string]interface{}{"version": "V10.5", "dry_run": true, "read_only": true, "valid": true, "request_envelope_ready_dry_run": true}
	args["response_schema"] = present()
	args["response_metadata"] = present()
	args["adapter_result_descriptor"] = present()
	args["execution_outcome_descriptor"] = present()
	args["artifact_descriptor"] = present()
	args["evidence_descriptor"] = present()
	args["error_descriptor"] = present()
	args["timeout_descriptor"] = present()
	args["rollback_descriptor"] = present()
	args["observability_descriptor"] = present()
	args["audit_descriptor"] = present()
	args["security_descriptor"] = present()
	args["policy_descriptor"] = present()
	args["trust_policy"] = present()
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": true, "no_mcp_execution": true, "no_response_trust_inside_mcp": true, "no_response_persistence_inside_mcp": true, "no_adapter_call_inside_mcp": true, "no_network_inside_mcp": true, "no_command_inside_mcp": true, "no_file_write_inside_mcp": true, "no_deploy_inside_mcp": true, "no_status_publish_inside_mcp": true, "no_memory_stable_write_inside_mcp": true}
	return args
}

func TestV106ExternalExecutionResponseToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExternalExecutionResponseContract, mcpserver.ToolExternalExecutionResponseValidate, mcpserver.ToolExternalExecutionResponseBoundary, mcpserver.ToolExternalExecutionResponseAudit, mcpserver.ToolExternalExecutionResponseExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validExecutionResponseArgs())})
		if !resp.OK {
			t.Fatalf("V10.6 tool %s not registered: %s", tool, resp.Error)
		}
	}
}

func TestExternalExecutionResponseReturnsV106ReadOnlyDryRunAndDeniesExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionResponseContract, Root: t.TempDir(), Args: mkArgs(validExecutionResponseArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.6"`, `"dry_run":true`, `"read_only":true`, `"response_contract_status":"response_contract_ready_dry_run"`, `"response_contract_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"response_trust_allowed":false`, `"response_persistence_allowed":false`, `"adapter_call_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionResponseValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validExecutionResponseArgs()
	args["executor"] = "mcp_readonly"
	args["executor_mode"] = "inside_mcp"
	args["request_envelope"] = map[string]interface{}{"version": "V10.5", "valid": false, "request_envelope_ready_dry_run": false}
	args["response_schema"] = nil
	args["response_metadata"] = map[string]interface{}{"present": true, "valid": false}
	args["correlation_id"] = ""
	args["idempotency_key"] = ""
	args["adapter_result_descriptor"] = nil
	args["execution_outcome_descriptor"] = map[string]interface{}{"present": true, "valid": false}
	args["trust_policy"] = nil
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": false}
	args["response_trust_allowed"] = true
	args["response_persistence_allowed"] = true
	args["adapter_call_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	args["authority_grant_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionResponseValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.6"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "request_envelope_blocked", "request_envelope_ready_dry_run", "response_schema", "response_metadata_invalid", "correlation_id", "idempotency_key", "adapter_result_descriptor", "execution_outcome_descriptor_invalid", "trust_policy_missing", "safety_controls_invalid", "response_trust_allowed", "response_persistence_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "authority_grant_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionResponseBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolExternalExecutionResponseBoundary, []string{`"version":"V10.6"`, `"dry_run":true`, `"read_only":true`, "simulate external execution response contract", "trust_response", "persist_response", "call_adapter", "persist_response_contract", "mark_PASS_GOLD", "grant_authority", "response_trust_allowed"}},
		{mcpserver.ToolExternalExecutionResponseExplain, []string{`"version":"V10.6"`, "why_response_contract_is_not_execution", "why_response_trust_is_blocked_inside_mcp", "why_response_persistence_is_blocked_inside_mcp", "why_request_envelope_is_required", "why_adapter_interface_is_required", "why_final_authorization_is_required", "why_real_gates_are_required", "why_response_contracts_are_required", "why_external_response_cannot_be_trusted_automatically", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validExecutionResponseArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}
	args := validExecutionResponseArgs()
	args["claims"] = map[string]interface{}{"response_trust_allowed": true, "response_persistence_allowed": true, "adapter_call_allowed": true, "execution_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "promotion_allowed": true, "deploy_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "pass_gold": true, "authority_granted": true, "dry_run_gate_claim": true, "synthesized_gate_claim": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "response_contract_bypassed": true, "external_response_trust_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionResponseAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"response_trust_attempt_found":true`, `"response_persistence_attempt_found":true`, `"adapter_call_attempt_found":true`, `"execution_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"promotion_attempt_found":true`, `"deploy_attempt_found":true`, `"status_publish_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`, `"response_contract_bypass_attempt_found":true`, `"external_response_trust_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	resp = mcpserver.Dispatch(mcpserver.ToolRequest{Tool: "vision.apply_patch"})
	if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
		t.Fatalf("mutating tool must remain blocked with exact message, got ok=%v error=%q", resp.OK, resp.Error)
	}
}

func validExecutionVerificationArgs() map[string]interface{} {
	args := map[string]interface{}{}
	for k, v := range validExecutionResponseArgs() {
		args[k] = v
	}
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	args["verification_id"] = "verify-1"
	args["response_contract"] = validExecutionResponseArgs()
	args["external_result_descriptor"] = present()
	args["result_metadata"] = present()
	args["artifact_references"] = present()
	args["evidence_references"] = present()
	args["execution_outcome"] = present()
	args["adapter_result"] = present()
	args["error_summary"] = present()
	args["verification_policy"] = present()
	args["integrity_checks"] = present()
	args["provenance_checks"] = present()
	args["schema_checks"] = present()
	args["security_checks"] = present()
	args["audit_checks"] = present()
	args["observability_checks"] = present()
	args["rollback_readiness_checks"] = present()
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": true, "no_mcp_execution": true, "no_result_trust_inside_mcp": true, "no_result_persistence_inside_mcp": true, "no_status_publish_inside_mcp": true, "no_promotion_inside_mcp": true, "no_deploy_inside_mcp": true, "no_memory_stable_write_inside_mcp": true}
	return args
}

func TestV107ExternalExecutionResultVerificationToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExternalExecutionResultVerification, mcpserver.ToolExternalExecutionResultValidate, mcpserver.ToolExternalExecutionResultBoundary, mcpserver.ToolExternalExecutionResultAudit, mcpserver.ToolExternalExecutionResultExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validExecutionVerificationArgs())})
		if !resp.OK {
			t.Fatalf("V10.7 tool %s not registered: %s", tool, resp.Error)
		}
	}
}

func TestExternalExecutionResultVerificationReturnsV107ReadOnlyDryRunAndDeniesExecution(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionResultVerification, Root: t.TempDir(), Args: mkArgs(validExecutionVerificationArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.7"`, `"dry_run":true`, `"read_only":true`, `"result_verification_status":"result_verification_ready_dry_run"`, `"result_verification_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"result_trust_allowed":false`, `"result_persistence_allowed":false`, `"status_publish_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"adapter_call_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionResultValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validExecutionVerificationArgs()
	args["executor"] = "mcp_readonly"
	args["executor_mode"] = "inside_mcp"
	args["response_contract"] = nil
	args["external_result_descriptor"] = nil
	args["result_metadata"] = map[string]interface{}{"present": true, "valid": false}
	args["correlation_id"] = ""
	args["idempotency_key"] = ""
	args["integrity_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["provenance_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["schema_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["security_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["audit_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["observability_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["rollback_readiness_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": false}
	args["result_trust_allowed"] = true
	args["result_persistence_allowed"] = true
	args["status_publish_allowed"] = true
	args["promotion_allowed"] = true
	args["deploy_allowed"] = true
	args["adapter_call_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionResultValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.7"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "response_contract_missing", "result_descriptor_missing", "result_metadata_invalid", "correlation_id", "idempotency_key", "integrity_check_failed", "provenance_check_failed", "schema_check_failed", "security_check_failed", "audit_check_failed", "observability_check_failed", "rollback_readiness_failed", "safety_controls_invalid", "result_trust_allowed", "result_persistence_allowed", "status_publish_allowed", "promotion_allowed", "deploy_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionResultBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolExternalExecutionResultBoundary, []string{`"version":"V10.7"`, `"dry_run":true`, `"read_only":true`, "simulate external execution result verification", "trust_result", "persist_result", "publish_status", "call_adapter", "mark_PASS_GOLD", "grant_authority", "result_trust_allowed"}},
		{mcpserver.ToolExternalExecutionResultExplain, []string{`"version":"V10.7"`, "why_result_verification_is_not_trust", "why_result_verification_is_not_execution", "why_result_persistence_is_blocked_inside_mcp", "why_response_contract_is_required", "why_request_envelope_is_required", "why_adapter_interface_is_required", "why_final_authorization_is_required", "why_real_gates_are_required", "why_human_approval_and_revalidation_are_required", "why_integrity_provenance_schema_security_audit_checks_are_required", "why_external_result_cannot_be_trusted_automatically", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validExecutionVerificationArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}
	args := validExecutionVerificationArgs()
	args["claims"] = map[string]interface{}{"result_trust_allowed": true, "result_persistence_allowed": true, "status_publish_allowed": true, "promotion_allowed": true, "deploy_allowed": true, "execution_allowed": true, "adapter_call_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "pass_gold": true, "authority_granted": true, "dry_run_gate_claim": true, "synthesized_gate_claim": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "verification_bypassed": true, "external_result_trust_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionResultAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"result_trust_attempt_found":true`, `"result_persistence_attempt_found":true`, `"status_publish_attempt_found":true`, `"promotion_attempt_found":true`, `"deploy_attempt_found":true`, `"execution_attempt_found":true`, `"adapter_call_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`, `"verification_bypass_attempt_found":true`, `"external_result_trust_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	resp = mcpserver.Dispatch(mcpserver.ToolRequest{Tool: "vision.apply_patch"})
	if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
		t.Fatalf("mutating tool must remain blocked with exact message, got ok=%v error=%q", resp.OK, resp.Error)
	}
}

func validExecutionEvidenceBindingArgs() map[string]interface{} {
	args := map[string]interface{}{}
	for k, v := range validExecutionVerificationArgs() {
		args[k] = v
	}
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	args["evidence_binding_id"] = "binding-1"
	args["result_verification"] = validExecutionVerificationArgs()
	args["evidence_manifest"] = present()
	args["artifact_references"] = present()
	args["artifact_hashes"] = present()
	args["log_references"] = present()
	args["log_hashes"] = present()
	args["check_references"] = present()
	args["check_results"] = present()
	args["source_references"] = present()
	args["provenance_metadata"] = present()
	args["chain_of_custody"] = present()
	args["audit_trail"] = present()
	args["hash_checks"] = present()
	args["tamper_evidence_checks"] = present()
	args["retention_policy"] = present()
	args["binding_policy"] = present()
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": true, "no_mcp_execution": true, "no_evidence_trust_inside_mcp": true, "no_evidence_persistence_inside_mcp": true, "no_ledger_write_inside_mcp": true, "no_status_publish_inside_mcp": true, "no_promotion_inside_mcp": true, "no_deploy_inside_mcp": true, "no_memory_stable_write_inside_mcp": true}
	return args
}

func TestV108ExternalExecutionEvidenceBindingToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolExternalExecutionEvidenceBinding, mcpserver.ToolExternalExecutionEvidenceBindingValidate, mcpserver.ToolExternalExecutionEvidenceBindingBoundary, mcpserver.ToolExternalExecutionEvidenceBindingAudit, mcpserver.ToolExternalExecutionEvidenceBindingExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validExecutionEvidenceBindingArgs())})
		if !resp.OK {
			t.Fatalf("V10.8 tool %s not registered: %s", tool, resp.Error)
		}
	}
}

func TestExternalExecutionEvidenceBindingReturnsV108ReadOnlyDryRunAndDeniesRealPermissions(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionEvidenceBinding, Root: t.TempDir(), Args: mkArgs(validExecutionEvidenceBindingArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.8"`, `"dry_run":true`, `"read_only":true`, `"evidence_binding_status":"evidence_binding_ready_dry_run"`, `"evidence_binding_ready_dry_run":true`, `"mcp_execution_allowed":false`, `"evidence_trust_allowed":false`, `"evidence_persistence_allowed":false`, `"ledger_write_allowed":false`, `"result_trust_allowed":false`, `"result_persistence_allowed":false`, `"status_publish_allowed":false`, `"promotion_allowed":false`, `"deploy_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"adapter_call_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionEvidenceBindingValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validExecutionEvidenceBindingArgs()
	args["executor"] = "mcp_readonly"
	args["executor_mode"] = "inside_mcp"
	args["result_verification"] = nil
	args["evidence_manifest"] = nil
	args["artifact_references"] = nil
	args["artifact_hashes"] = nil
	args["log_references"] = nil
	args["log_hashes"] = nil
	args["check_results"] = nil
	args["source_references"] = nil
	args["provenance_metadata"] = nil
	args["chain_of_custody"] = nil
	args["audit_trail"] = nil
	args["correlation_id"] = ""
	args["idempotency_key"] = ""
	args["integrity_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["hash_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["provenance_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["schema_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["security_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["audit_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["observability_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["tamper_evidence_checks"] = map[string]interface{}{"present": true, "valid": false}
	args["retention_policy"] = nil
	args["trust_policy"] = map[string]interface{}{"present": true, "valid": false}
	args["binding_policy"] = map[string]interface{}{"present": true, "valid": false}
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": false}
	args["evidence_trust_allowed"] = true
	args["evidence_persistence_allowed"] = true
	args["ledger_write_allowed"] = true
	args["result_trust_allowed"] = true
	args["result_persistence_allowed"] = true
	args["status_publish_allowed"] = true
	args["promotion_allowed"] = true
	args["deploy_allowed"] = true
	args["adapter_call_allowed"] = true
	args["executor_call_allowed"] = true
	args["network_call_allowed"] = true
	args["command_execution_allowed"] = true
	args["file_write_allowed"] = true
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionEvidenceBindingValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V10.8"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "result_verification_missing", "evidence_manifest_missing", "artifact_references_missing", "artifact_hashes_missing", "log_references_missing", "log_hashes_missing", "check_results_missing", "source_references_missing", "provenance_metadata_missing", "chain_of_custody_missing", "audit_trail_missing", "correlation_id", "idempotency_key", "integrity_check_failed", "hash_check_failed", "provenance_check_failed", "schema_check_failed", "security_check_failed", "audit_check_failed", "observability_check_failed", "tamper_evidence_check_failed", "retention_policy_missing", "trust_policy_blocked", "binding_policy_blocked", "safety_controls_invalid", "evidence_trust_allowed", "evidence_persistence_allowed", "ledger_write_allowed", "result_trust_allowed", "result_persistence_allowed", "status_publish_allowed", "promotion_allowed", "deploy_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestExternalExecutionEvidenceBindingBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolExternalExecutionEvidenceBindingBoundary, []string{`"version":"V10.8"`, `"dry_run":true`, `"read_only":true`, "simulate external execution evidence binding", "trust_evidence", "persist_evidence", "write_ledger", "trust_result", "persist_result", "call_adapter", "mark_PASS_GOLD", "grant_authority", "evidence_trust_allowed"}},
		{mcpserver.ToolExternalExecutionEvidenceBindingExplain, []string{`"version":"V10.8"`, "why_evidence_binding_is_not_trust", "why_evidence_binding_is_not_persistence", "why_ledger_write_is_blocked_inside_mcp", "why_result_verification_is_required", "why_response_contract_is_required", "why_request_envelope_is_required", "why_adapter_interface_is_required", "why_final_authorization_is_required", "why_real_gates_are_required", "why_human_approval_and_revalidation_are_required", "why_artifacts_hashes_logs_checks_sources_are_required", "why_chain_of_custody_is_required", "why_external_evidence_cannot_be_trusted_automatically", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validExecutionEvidenceBindingArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}
	args := validExecutionEvidenceBindingArgs()
	args["claims"] = map[string]interface{}{"evidence_trust_allowed": true, "evidence_persistence_allowed": true, "ledger_write_allowed": true, "result_trust_allowed": true, "result_persistence_allowed": true, "status_publish_allowed": true, "promotion_allowed": true, "deploy_allowed": true, "execution_allowed": true, "adapter_call_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "pass_gold": true, "authority_granted": true, "dry_run_gate_claim": true, "synthesized_gate_claim": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "verification_bypassed": true, "evidence_binding_bypassed": true, "chain_of_custody_bypassed": true, "hash_validation_bypassed": true, "external_result_trust_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolExternalExecutionEvidenceBindingAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"evidence_trust_attempt_found":true`, `"evidence_persistence_attempt_found":true`, `"ledger_write_attempt_found":true`, `"result_trust_attempt_found":true`, `"result_persistence_attempt_found":true`, `"status_publish_attempt_found":true`, `"promotion_attempt_found":true`, `"deploy_attempt_found":true`, `"execution_attempt_found":true`, `"adapter_call_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"dry_run_gate_claim_found":true`, `"synthesized_gate_claim_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`, `"verification_bypass_attempt_found":true`, `"evidence_binding_bypass_attempt_found":true`, `"chain_of_custody_bypass_attempt_found":true`, `"hash_validation_bypass_attempt_found":true`, `"external_result_trust_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	resp = mcpserver.Dispatch(mcpserver.ToolRequest{Tool: "vision.apply_patch"})
	if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
		t.Fatalf("mutating tool must remain blocked with exact message, got ok=%v error=%q", resp.OK, resp.Error)
	}
}

func validControlledExecutionRuntimeArgs() map[string]interface{} {
	args := map[string]interface{}{}
	for k, v := range validExecutionEvidenceBindingArgs() {
		args[k] = v
	}
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	args["runtime_id"] = "runtime-1"
	args["runtime_session_id"] = "session-1"
	args["runtime_mode"] = "controlled_dry_run_rehearsal"
	args["evidence_binding"] = validExecutionEvidenceBindingArgs()
	args["runtime_plan"] = present()
	args["runtime_policy"] = present()
	args["runtime_scope"] = present()
	args["runtime_constraints"] = present()
	args["runtime_safety_envelope"] = present()
	args["runtime_audit_envelope"] = present()
	args["runtime_observability_plan"] = present()
	args["runtime_rollback_plan"] = present()
	args["runtime_kill_switch"] = present()
	args["runtime_timeout"] = present()
	args["runtime_lock_plan"] = present()
	args["runtime_stop_criteria"] = present()
	args["runtime_preflight_checks"] = present()
	args["runtime_postflight_checks"] = present()
	args["runtime_idempotency_key"] = "runtime-idem-1"
	args["safety_controls"] = map[string]interface{}{"present": true, "valid": true, "no_mcp_execution": true, "no_adapter_call_inside_mcp": true, "no_network_inside_mcp": true, "no_command_inside_mcp": true, "no_file_write_inside_mcp": true, "no_deploy_inside_mcp": true, "no_status_publish_inside_mcp": true, "no_promotion_inside_mcp": true, "no_memory_stable_write_inside_mcp": true, "no_trust_escalation_inside_mcp": true}
	return args
}

func TestV110ControlledExecutionRuntimeToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolControlledExecutionRuntime, mcpserver.ToolControlledExecutionRuntimeValidate, mcpserver.ToolControlledExecutionRuntimeBoundary, mcpserver.ToolControlledExecutionRuntimeAudit, mcpserver.ToolControlledExecutionRuntimeExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validControlledExecutionRuntimeArgs())})
		if !resp.OK {
			t.Fatalf("V11.0 tool %s not registered: %s", tool, resp.Error)
		}
	}
}

func TestControlledExecutionRuntimeReturnsV110ReadOnlyDryRunAndDeniesRealPermissions(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolControlledExecutionRuntime, Root: t.TempDir(), Args: mkArgs(validControlledExecutionRuntimeArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V11.0"`, `"dry_run":true`, `"read_only":true`, `"controlled_runtime":true`, `"runtime_status":"runtime_ready_dry_run"`, `"runtime_ready_dry_run":true`, `"runtime_execution_candidate":true`, `"controlled_runtime_ready":true`, `"mcp_execution_allowed":false`, `"real_execution_allowed":false`, `"adapter_call_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"deploy_allowed":false`, `"promotion_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"evidence_trust_allowed":false`, `"result_trust_allowed":false`, `"ledger_write_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestControlledExecutionRuntimeValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validControlledExecutionRuntimeArgs()
	args["executor"] = "mcp"
	args["executor_mode"] = "mcp_readonly"
	args["runtime_mode"] = "real_execution"
	delete(args, "evidence_binding")
	delete(args, "runtime_plan")
	delete(args, "runtime_policy")
	delete(args, "runtime_scope")
	delete(args, "runtime_safety_envelope")
	delete(args, "runtime_audit_envelope")
	delete(args, "runtime_observability_plan")
	delete(args, "runtime_rollback_plan")
	delete(args, "runtime_idempotency_key")
	delete(args, "runtime_kill_switch")
	delete(args, "runtime_timeout")
	delete(args, "runtime_lock_plan")
	delete(args, "runtime_stop_criteria")
	delete(args, "runtime_preflight_checks")
	delete(args, "runtime_postflight_checks")
	args["claims"] = map[string]interface{}{"real_execution_allowed": true, "mcp_execution_allowed": true, "adapter_call_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "deploy_allowed": true, "promotion_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "stable_promoted": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "evidence_trusted": true, "result_trusted": true, "ledger_written": true, "pass_gold": true, "pass_secure": true, "authority_granted": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolControlledExecutionRuntimeValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V11.0"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "runtime_mode_blocked", "evidence_binding_missing", "runtime_plan_missing", "runtime_policy_missing", "runtime_scope_missing", "safety_envelope_missing", "audit_envelope_missing", "observability_plan_missing", "rollback_plan_missing", "idempotency_missing", "kill_switch_missing", "timeout_missing", "lock_plan_missing", "stop_criteria_missing", "preflight_checks_missing", "postflight_checks_missing", "unsafe_runtime_execution_attempt", "unsafe_adapter_call_attempt", "unsafe_network_attempt", "unsafe_command_attempt", "unsafe_file_write_attempt", "unsafe_deploy_attempt", "unsafe_promotion_attempt", "unsafe_status_publish_attempt", "unsafe_memory_write_attempt", "unsafe_trust_escalation_attempt", "real_execution_allowed", "adapter_call_allowed", "evidence_trusted", "result_trusted", "ledger_written"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestControlledExecutionRuntimeBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolControlledExecutionRuntimeBoundary, []string{`"version":"V11.0"`, `"dry_run":true`, `"read_only":true`, `"controlled_runtime":true`, `"real_execution_allowed":false`, "simulate controlled execution runtime", "execute_runtime", "call_adapter", "call_executor", "network_call", "command_execution", "file_write", "deploy", "promote", "publish_status", "write_memory", "learn_stable", "trust_evidence", "trust_result", "write_ledger", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "grant_authority", "real_execution_allowed"}},
		{mcpserver.ToolControlledExecutionRuntimeExplain, []string{`"version":"V11.0"`, `"controlled_runtime":true`, `"real_execution_allowed":false`, "why_controlled_runtime_is_not_real_execution_yet", "why_mcp_cannot_execute_runtime", "why_external_adapter_call_is_blocked", "why_evidence_binding_is_required", "why_result_verification_is_required", "why_final_authorization_is_required", "why_real_gates_are_required", "why_human_approval_and_revalidation_are_required", "why_runtime_policy_safety_rollback_observability_are_required", "why_real_execution_requires_future_explicit_release", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validControlledExecutionRuntimeArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}
	args := validControlledExecutionRuntimeArgs()
	args["claims"] = map[string]interface{}{"real_execution_allowed": true, "adapter_call_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "deploy_allowed": true, "promotion_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "evidence_trusted": true, "result_trusted": true, "ledger_written": true, "real_lock_acquired": true, "rollback_performed": true, "pass_gold": true, "authority_granted": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "evidence_binding_bypassed": true, "verification_bypassed": true, "runtime_policy_bypassed": true, "kill_switch_bypassed": true, "rollback_bypassed": true, "observability_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolControlledExecutionRuntimeAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"runtime_execution_attempt_found":true`, `"adapter_call_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"deploy_attempt_found":true`, `"promotion_attempt_found":true`, `"status_publish_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"evidence_trust_attempt_found":true`, `"result_trust_attempt_found":true`, `"ledger_write_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`, `"evidence_binding_bypass_attempt_found":true`, `"verification_bypass_attempt_found":true`, `"runtime_policy_bypass_attempt_found":true`, `"kill_switch_bypass_attempt_found":true`, `"rollback_bypass_attempt_found":true`, `"observability_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	resp = mcpserver.Dispatch(mcpserver.ToolRequest{Tool: "vision.apply_patch"})
	if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
		t.Fatalf("mutating tool must remain blocked with exact message, got ok=%v error=%q", resp.OK, resp.Error)
	}
}

func validSandboxAdapterArgs() map[string]interface{} {
	args := map[string]interface{}{}
	for k, v := range validControlledExecutionRuntimeArgs() {
		args[k] = v
	}
	present := func() map[string]interface{} { return map[string]interface{}{"present": true, "valid": true} }
	args["sandbox_adapter_id"] = "sandbox-adapter-1"
	args["adapter_type"] = "sandbox_noop"
	args["environment"] = "sandbox"
	args["controlled_runtime"] = validControlledExecutionRuntimeArgs()
	args["runtime_ready_dry_run"] = true
	args["controlled_runtime_ready"] = true
	args["evidence_binding"] = validExecutionEvidenceBindingArgs()
	args["sandbox_policy"] = present()
	args["sandbox_scope"] = present()
	args["sandbox_constraints"] = present()
	args["sandbox_input_contract"] = present()
	args["sandbox_output_contract"] = present()
	args["sandbox_noop_response"] = present()
	args["sandbox_audit_envelope"] = present()
	args["sandbox_observability_plan"] = present()
	args["sandbox_rollback_policy"] = present()
	args["sandbox_timeout"] = present()
	args["sandbox_idempotency_key"] = "sandbox-idem-1"
	args["sandbox_kill_switch"] = present()
	args["sandbox_stop_criteria"] = present()
	args["sandbox_safety_controls"] = map[string]interface{}{"present": true, "valid": true, "no_real_execution": true, "no_real_adapter_call": true, "no_network_call": true, "no_command_execution": true, "no_file_write": true, "no_deploy": true, "no_promotion": true, "no_status_publish": true, "no_memory_stable_write": true, "no_trust_escalation": true}
	return args
}

func TestV111ControlledRuntimeSandboxAdapterToolsRegistered(t *testing.T) {
	for _, tool := range []string{mcpserver.ToolControlledRuntimeSandboxAdapter, mcpserver.ToolControlledRuntimeSandboxAdapterValidate, mcpserver.ToolControlledRuntimeSandboxAdapterBoundary, mcpserver.ToolControlledRuntimeSandboxAdapterAudit, mcpserver.ToolControlledRuntimeSandboxAdapterExplain} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tool, Root: t.TempDir(), Args: mkArgs(validSandboxAdapterArgs())})
		if !resp.OK {
			t.Fatalf("V11.1 tool %s not registered: %s", tool, resp.Error)
		}
		if !mcpserver.IsAllowed(tool) || mcpserver.IsBlocked(tool) {
			t.Fatalf("V11.1 tool %s must be read-only allowed", tool)
		}
	}
}

func TestControlledRuntimeSandboxAdapterReturnsV111ReadOnlySandboxNoopAndDeniesRealPermissions(t *testing.T) {
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolControlledRuntimeSandboxAdapter, Root: t.TempDir(), Args: mkArgs(validSandboxAdapterArgs())})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V11.1"`, `"dry_run":true`, `"read_only":true`, `"sandbox":true`, `"adapter_type":"sandbox_noop"`, `"adapter_status":"sandbox_adapter_ready_dry_run"`, `"sandbox_adapter_ready_dry_run":true`, `"sandbox_noop_candidate":true`, `"controlled_runtime_candidate":true`, `"simulated_adapter_response_ready":true`, `"mcp_execution_allowed":false`, `"real_execution_allowed":false`, `"real_adapter_call_allowed":false`, `"adapter_call_allowed":false`, `"executor_call_allowed":false`, `"network_call_allowed":false`, `"command_execution_allowed":false`, `"file_write_allowed":false`, `"deploy_allowed":false`, `"promotion_allowed":false`, `"status_publish_allowed":false`, `"mutation_allowed":false`, `"memory_write_allowed":false`, `"stable_promotion_allowed":false`, `"learning_allowed":false`, `"real_lock_allowed":false`, `"rollback_allowed":false`, `"evidence_trust_allowed":false`, `"result_trust_allowed":false`, `"ledger_write_allowed":false`, `"pass_gold_allowed":false`, `"pass_secure_allowed":false`, `"authority_grant_allowed":false`} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestControlledRuntimeSandboxAdapterValidateBlocksFailuresAndClaims(t *testing.T) {
	args := validSandboxAdapterArgs()
	args["executor"] = "mcp"
	args["executor_mode"] = "mcp_readonly"
	args["adapter_type"] = "real_adapter"
	args["environment"] = "production"
	delete(args, "controlled_runtime")
	args["runtime_ready_dry_run"] = false
	args["controlled_runtime_ready"] = false
	delete(args, "evidence_binding")
	delete(args, "sandbox_policy")
	delete(args, "sandbox_scope")
	delete(args, "sandbox_constraints")
	delete(args, "sandbox_input_contract")
	delete(args, "sandbox_output_contract")
	delete(args, "sandbox_noop_response")
	delete(args, "sandbox_audit_envelope")
	delete(args, "sandbox_observability_plan")
	delete(args, "sandbox_rollback_policy")
	delete(args, "sandbox_timeout")
	delete(args, "sandbox_idempotency_key")
	delete(args, "sandbox_kill_switch")
	delete(args, "sandbox_stop_criteria")
	delete(args, "sandbox_safety_controls")
	args["claims"] = map[string]interface{}{"real_execution_allowed": true, "mcp_execution_allowed": true, "real_adapter_call_allowed": true, "adapter_call_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "deploy_allowed": true, "promotion_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "stable_promoted": true, "learned_as_stable": true, "real_lock_acquired": true, "rollback_performed": true, "evidence_trusted": true, "result_trusted": true, "ledger_written": true, "pass_gold": true, "pass_secure": true, "authority_granted": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolControlledRuntimeSandboxAdapterValidate, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"version":"V11.1"`, `"valid":false`, `"blocked":true`, "executor_must_not_be_mcp", "executor_mode_must_be_external_only", "adapter_type_must_be_sandbox_noop", "environment_must_be_sandbox_or_local_sandbox", "controlled_runtime_missing", "controlled_runtime_blocked", "evidence_binding_missing", "sandbox_policy_missing", "sandbox_scope_missing", "sandbox_constraints_missing", "sandbox_input_contract_missing", "sandbox_output_contract_missing", "sandbox_noop_response_missing", "sandbox_audit_envelope_missing", "sandbox_observability_missing", "sandbox_rollback_policy_missing", "sandbox_timeout_missing", "sandbox_idempotency_missing", "sandbox_kill_switch_missing", "sandbox_stop_criteria_missing", "sandbox_safety_controls_missing", "unsafe_real_execution_attempt", "unsafe_real_adapter_call_attempt", "unsafe_network_attempt", "unsafe_command_attempt", "unsafe_file_write_attempt", "unsafe_deploy_attempt", "unsafe_promotion_attempt", "unsafe_status_publish_attempt", "unsafe_memory_write_attempt", "unsafe_trust_escalation_attempt", "real_execution_allowed", "real_adapter_call_allowed", "adapter_call_allowed", "evidence_trusted", "result_trusted", "ledger_written"} {
		if !strings.Contains(s, want) {
			t.Fatalf("missing %s in payload: %s", want, s)
		}
	}
}

func TestControlledRuntimeSandboxAdapterBoundaryAuditExplainAndBlockedMutatingTools(t *testing.T) {
	for _, tc := range []struct {
		tool  string
		wants []string
	}{
		{mcpserver.ToolControlledRuntimeSandboxAdapterBoundary, []string{`"version":"V11.1"`, `"dry_run":true`, `"read_only":true`, `"sandbox":true`, `"adapter_type":"sandbox_noop"`, `"real_execution_allowed":false`, "simulate sandbox adapter", "build noop adapter response", "execute_runtime", "call_real_adapter", "call_executor", "network_call", "command_execution", "file_write", "deploy", "promote", "publish_status", "write_memory", "learn_stable", "trust_evidence", "trust_result", "write_ledger", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "real_adapter_call_allowed"}},
		{mcpserver.ToolControlledRuntimeSandboxAdapterExplain, []string{`"version":"V11.1"`, `"sandbox":true`, `"adapter_type":"sandbox_noop"`, `"real_execution_allowed":false`, "why_sandbox_adapter_is_not_real_execution", "why_real_adapter_call_is_blocked", "why_sandbox_noop_is_allowed_only_as_dry_run", "why_controlled_runtime_is_required", "why_evidence_binding_is_required", "why_result_verification_is_required", "why_final_authorization_is_required", "why_real_gates_are_required", "why_human_approval_and_revalidation_are_required", "why_sandbox_policy_safety_rollback_observability_are_required", "why_real_execution_requires_future_explicit_release", "PASS_GOLD", "PASS_SECURE", "always_denied"}},
	} {
		resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: tc.tool, Root: t.TempDir(), Args: mkArgs(validSandboxAdapterArgs())})
		if !resp.OK {
			t.Fatalf("%s expected ok=true: %s", tc.tool, resp.Error)
		}
		s := string(mustJSON(t, resp.Payload))
		for _, want := range tc.wants {
			if !strings.Contains(s, want) {
				t.Fatalf("%s missing %s in %s", tc.tool, want, s)
			}
		}
	}
	args := validSandboxAdapterArgs()
	args["claims"] = map[string]interface{}{"real_execution_allowed": true, "real_adapter_call_allowed": true, "adapter_call_allowed": true, "executor_call_allowed": true, "network_call_allowed": true, "command_execution_allowed": true, "file_write_allowed": true, "deploy_allowed": true, "promotion_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "evidence_trusted": true, "result_trusted": true, "ledger_written": true, "real_lock_acquired": true, "rollback_performed": true, "pass_gold": true, "authority_granted": true, "human_approval_bypassed": true, "revalidation_bypassed": true, "runtime_bypassed": true, "evidence_binding_bypassed": true, "verification_bypassed": true, "sandbox_policy_bypassed": true, "sandbox_escaped": true, "kill_switch_bypassed": true, "rollback_bypassed": true, "observability_bypassed": true}
	resp := mcpserver.Dispatch(mcpserver.ToolRequest{Tool: mcpserver.ToolControlledRuntimeSandboxAdapterAudit, Root: t.TempDir(), Args: mkArgs(args)})
	if !resp.OK {
		t.Fatalf("audit expected ok=true: %s", resp.Error)
	}
	s := string(mustJSON(t, resp.Payload))
	for _, want := range []string{`"real_execution_attempt_found":true`, `"real_adapter_call_attempt_found":true`, `"adapter_call_attempt_found":true`, `"executor_call_attempt_found":true`, `"network_attempt_found":true`, `"command_attempt_found":true`, `"file_write_attempt_found":true`, `"deploy_attempt_found":true`, `"promotion_attempt_found":true`, `"status_publish_attempt_found":true`, `"memory_write_attempt_found":true`, `"stable_learning_attempt_found":true`, `"evidence_trust_attempt_found":true`, `"result_trust_attempt_found":true`, `"ledger_write_attempt_found":true`, `"real_lock_attempt_found":true`, `"rollback_attempt_found":true`, `"auto_gold_attempt_found":true`, `"authority_grant_attempt_found":true`, `"human_approval_bypass_attempt_found":true`, `"revalidation_bypass_attempt_found":true`, `"runtime_bypass_attempt_found":true`, `"evidence_binding_bypass_attempt_found":true`, `"verification_bypass_attempt_found":true`, `"sandbox_policy_bypass_attempt_found":true`, `"sandbox_escape_attempt_found":true`, `"kill_switch_bypass_attempt_found":true`, `"rollback_bypass_attempt_found":true`, `"observability_bypass_attempt_found":true`} {
		if !strings.Contains(s, want) {
			t.Fatalf("audit missing %s in %s", want, s)
		}
	}
	resp = mcpserver.Dispatch(mcpserver.ToolRequest{Tool: "vision.apply_patch"})
	if resp.OK || resp.Error != "tool is not allowed in read-only MCP control plane" {
		t.Fatalf("mutating tool must remain blocked with exact message, got ok=%v error=%q", resp.OK, resp.Error)
	}
}
