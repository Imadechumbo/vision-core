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
