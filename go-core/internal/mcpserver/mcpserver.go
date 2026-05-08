// Package mcpserver implements a read-only local MCP control plane.
//
// Contract V8.0:
//   - No real execution via MCP (no patch, commit, push, PR, deploy)
//   - No import of internal/passgold or internal/passsecure or internal/mission
//   - pass_gold_status returns status:"unknown" (cannot synthesize GOLD)
//   - get_report returns index entry only — never reads JSONPath or external files
//   - All mutating tools return: "tool is not allowed in read-only MCP control plane"
package mcpserver

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/visioncore/go-core/internal/graphmemory"
	"github.com/visioncore/go-core/internal/report"
)

// ── Tool names ────────────────────────────────────────────────────────────────

const (
	ToolProjectSummary        = "vision.project_summary"
	ToolGraphQuery            = "vision.graph_query"
	ToolGraphSummary          = "vision.graph_summary"
	ToolListReports           = "vision.list_reports"
	ToolGetReport             = "vision.get_report"
	ToolGithubFlowReportsList = "vision.github_flow_reports_list"
	ToolPassGoldStatus        = "vision.pass_gold_status"
)

// blockedTools are mutating tools that must always be rejected.
var blockedTools = map[string]bool{
	"vision.apply_patch":      true,
	"vision.write_file":       true,
	"vision.commit":           true,
	"vision.push":             true,
	"vision.open_pr":          true,
	"vision.publish_status":   true,
	"vision.run_mission_real": true,
	"vision.rollback":         true,
	"vision.deploy":           true,
}

// allowedTools are the permitted read-only tools.
var allowedTools = map[string]bool{
	ToolProjectSummary:        true,
	ToolGraphQuery:            true,
	ToolGraphSummary:          true,
	ToolListReports:           true,
	ToolGetReport:             true,
	ToolGithubFlowReportsList: true,
	ToolPassGoldStatus:        true,
}

const blockedToolError = "tool is not allowed in read-only MCP control plane"

// ── Types ─────────────────────────────────────────────────────────────────────

// ToolRequest is an MCP tool invocation.
type ToolRequest struct {
	Tool string          `json:"tool"`
	Args json.RawMessage `json:"args,omitempty"`
	Root string          `json:"root,omitempty"`
}

// ToolResponse is the result of a tool invocation.
type ToolResponse struct {
	Tool    string      `json:"tool"`
	OK      bool        `json:"ok"`
	Error   string      `json:"error,omitempty"`
	Payload interface{} `json:"payload,omitempty"`
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

// Dispatch routes a ToolRequest and enforces the read-only policy.
// Blocked tools always return the canonical error message.
func Dispatch(req ToolRequest) ToolResponse {
	tool := strings.TrimSpace(req.Tool)

	if blockedTools[tool] {
		return ToolResponse{Tool: tool, OK: false, Error: blockedToolError}
	}
	if !allowedTools[tool] {
		return ToolResponse{
			Tool:  tool,
			OK:    false,
			Error: fmt.Sprintf("unknown tool: %q — not registered in read-only MCP control plane", tool),
		}
	}

	switch tool {
	case ToolGraphSummary:
		return handleGraphSummary(req)
	case ToolGraphQuery:
		return handleGraphQuery(req)
	case ToolProjectSummary:
		return handleProjectSummary(req)
	case ToolListReports:
		return handleListReports(req)
	case ToolGetReport:
		return handleGetReport(req)
	case ToolGithubFlowReportsList:
		return handleGithubFlowReportsList(req)
	case ToolPassGoldStatus:
		return handlePassGoldStatus(req)
	}
	return ToolResponse{Tool: tool, OK: false, Error: "handler not implemented"}
}

// ── Handlers ──────────────────────────────────────────────────────────────────

func handleGraphSummary(req ToolRequest) ToolResponse {
	root := rootFrom(req)
	sum, err := graphmemory.Summary(root)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: sum}
}

type graphQueryArgs struct {
	Query string `json:"query"`
	Limit int    `json:"limit"`
}

func handleGraphQuery(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (query, limit)"))
	}
	var a graphQueryArgs
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	root := rootFrom(req)
	result, err := graphmemory.Query(root, a.Query, a.Limit)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleProjectSummary(req ToolRequest) ToolResponse {
	root := rootFrom(req)
	sum, err := graphmemory.Summary(root)
	if err != nil {
		// Graceful fallback — index not built yet
		return ToolResponse{
			Tool: req.Tool,
			OK:   true,
			Payload: map[string]interface{}{
				"root":    root,
				"note":    "graph index not found; run graph-index first",
				"version": graphmemory.IndexVersion,
			},
		}
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: sum}
}

func handleListReports(req ToolRequest) ToolResponse {
	root := rootFrom(req)
	reportDir := report.DefaultReportDir

	idx, err := report.ListEntries(root, reportDir, 0)
	if err != nil {
		// Index file not found is not an error — return empty list
		return ToolResponse{
			Tool: req.Tool,
			OK:   true,
			Payload: map[string]interface{}{
				"entries": []interface{}{},
				"note":    "no github-flow reports found",
			},
		}
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: map[string]interface{}{
		"version": idx.Version,
		"entries": idx.Entries,
	}}
}

type getReportArgs struct {
	FlowID    string `json:"flow_id"`
	ReportDir string `json:"report_dir,omitempty"`
}

// handleGetReport returns only the index entry — NEVER reads JSONPath or external files.
func handleGetReport(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (flow_id)"))
	}
	var a getReportArgs
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	if a.FlowID == "" {
		return errResp(req.Tool, errors.New("flow_id is required"))
	}
	if err := report.ValidateFlowID(a.FlowID); err != nil {
		return errResp(req.Tool, err)
	}

	root := rootFrom(req)
	reportDir := a.ReportDir
	if reportDir == "" {
		reportDir = report.DefaultReportDir
	}

	// Safety: only allow reading from .vision-reports/github-flow subtree
	if err := report.ValidateReportDir(reportDir); err != nil {
		return errResp(req.Tool, err)
	}
	// Extra safety: block any path that escapes .vision-reports
	normDir := filepath.ToSlash(filepath.Clean(reportDir))
	if !strings.HasPrefix(normDir, ".vision-reports") {
		return errResp(req.Tool, errors.New("report_dir must be inside .vision-reports"))
	}

	entry, err := report.GetEntry(root, reportDir, a.FlowID)
	if err != nil {
		return errResp(req.Tool, err)
	}

	// Return index entry only — never read JSONPath or external files
	return ToolResponse{
		Tool: req.Tool,
		OK:   true,
		Payload: map[string]interface{}{
			"flow_id":       entry.FlowID,
			"created_at":    entry.CreatedAtUTC,
			"ok":            entry.OK,
			"mode":          entry.Mode,
			"dry_run":       entry.DryRun,
			"owner":         entry.Owner,
			"repo":          entry.Repo,
			"mission_id":    entry.MissionID,
			"issue_type":    entry.IssueType,
			"base_branch":   entry.BaseBranch,
			"work_branch":   entry.WorkBranch,
			"changed_files": entry.ChangedFiles,
			// json_path and markdown_path are intentionally excluded —
			// get_report must not read or expose arbitrary file paths
			"note": "index entry only — use CLI for full report",
		},
	}
}

func handleGithubFlowReportsList(req ToolRequest) ToolResponse {
	// Alias for list_reports scoped to github-flow directory
	root := rootFrom(req)
	idx, err := report.ListEntries(root, report.DefaultReportDir, 0)
	if err != nil {
		return ToolResponse{
			Tool: req.Tool,
			OK:   true,
			Payload: map[string]interface{}{
				"report_dir": report.DefaultReportDir,
				"entries":    []interface{}{},
				"note":       "no github-flow reports found",
			},
		}
	}
	return ToolResponse{
		Tool: req.Tool,
		OK:   true,
		Payload: map[string]interface{}{
			"report_dir": report.DefaultReportDir,
			"version":    idx.Version,
			"entries":    idx.Entries,
		},
	}
}

// handlePassGoldStatus returns status:"unknown" — MCP cannot synthesize PASS GOLD.
// It does NOT import passgold, passsecure, or mission packages.
// It does NOT call passgold.Evaluate, passgold.AllGatesOK, mission.Run, etc.
func handlePassGoldStatus(req ToolRequest) ToolResponse {
	root := rootFrom(req)
	// Try to read last report entry for informational context only
	// (never synthesizes or claims GOLD)
	note := "no read-only pass gold status source available"
	lastEntry := ""
	if idx, err := report.ListEntries(root, report.DefaultReportDir, 1); err == nil && len(idx.Entries) > 0 {
		e := idx.Entries[0]
		lastEntry = fmt.Sprintf("last flow: %s (ok=%v, mission=%s)", e.FlowID, e.OK, e.MissionID)
		_ = lastEntry
		note = "pass_gold_status is read-only context; last flow recorded in index — run mission for authoritative result"
	}

	return ToolResponse{
		Tool: req.Tool,
		OK:   true,
		Payload: map[string]interface{}{
			"status":            "unknown",
			"reason":            note,
			"read_only":         true,
			"deploy_performed":  false,
			"status_published":  false,
		},
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func rootFrom(req ToolRequest) string {
	if req.Root != "" {
		return req.Root
	}
	if cwd, err := os.Getwd(); err == nil {
		return cwd
	}
	return "."
}

func errResp(tool string, err error) ToolResponse {
	return ToolResponse{Tool: tool, OK: false, Error: err.Error()}
}

// IsBlocked reports whether a tool name is blocked (mutating).
func IsBlocked(tool string) bool { return blockedTools[tool] }

// IsAllowed reports whether a tool name is allowed (read-only).
func IsAllowed(tool string) bool { return allowedTools[tool] }
