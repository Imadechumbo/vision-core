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

	"github.com/visioncore/go-core/internal/authorizationmanifest"
	"github.com/visioncore/go-core/internal/codeburn"
	"github.com/visioncore/go-core/internal/contractregistry"
	"github.com/visioncore/go-core/internal/dashboard"
	"github.com/visioncore/go-core/internal/dryrun"
	"github.com/visioncore/go-core/internal/evidenceledger"
	"github.com/visioncore/go-core/internal/executorpreflight"
	"github.com/visioncore/go-core/internal/gateauthority"
	"github.com/visioncore/go-core/internal/graphmemory"
	"github.com/visioncore/go-core/internal/impeccable"
	"github.com/visioncore/go-core/internal/policymatrix"
	"github.com/visioncore/go-core/internal/promotioncontract"
	"github.com/visioncore/go-core/internal/readiness"
	"github.com/visioncore/go-core/internal/rehearsalrecorder"
	"github.com/visioncore/go-core/internal/report"
	"github.com/visioncore/go-core/internal/safetyenvelope"
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
	// V8.1 tools
	ToolGraphProviders      = "vision.graph_providers"
	ToolGraphProviderStatus = "vision.graph_provider_status"
	ToolGraphImpactQuery    = "vision.graph_impact_query"
	ToolGraphDryRunContext  = "vision.graph_dry_run_context"
	// V8.2 dry-run control tools
	ToolDryRunApplyPatch     = "vision.dry_run_apply_patch"
	ToolDryRunWriteFile      = "vision.dry_run_write_file"
	ToolDryRunGitHubFlow     = "vision.dry_run_github_flow"
	ToolDryRunMission        = "vision.dry_run_mission"
	ToolDryRunRiskAssessment = "vision.dry_run_risk_assessment"
	// V8.3 CodeBurn cost guard tools
	ToolCodeBurnEstimate    = "vision.codeburn_estimate"
	ToolCodeBurnPolicyCheck = "vision.codeburn_policy_check"
	ToolCodeBurnBudgetPlan  = "vision.codeburn_budget_plan"
	ToolCodeBurnGuardStatus = "vision.codeburn_guard_status"
	ToolCodeBurnExplain     = "vision.codeburn_explain"
	// V8.4 Impeccable UI Guard tools
	ToolImpeccableUIRisk         = "vision.impeccable_ui_risk"
	ToolImpeccableFileClassify   = "vision.impeccable_file_classify"
	ToolImpeccableVisualGatePlan = "vision.impeccable_visual_gate_plan"
	ToolImpeccableGuardStatus    = "vision.impeccable_guard_status"
	ToolImpeccableExplain        = "vision.impeccable_explain"
	// V8.5 Unified Intelligence Dashboard tools
	ToolDashboardSnapshot            = "vision.dashboard_snapshot"
	ToolDashboardReadiness           = "vision.dashboard_readiness"
	ToolDashboardIntelligenceSummary = "vision.dashboard_intelligence_summary"
	ToolDashboardToolInventory       = "vision.dashboard_tool_inventory"
	ToolDashboardMissionControl      = "vision.dashboard_mission_control"
	// V8.6 Agent Policy Matrix tools
	ToolPolicyMatrix       = "vision.policy_matrix"
	ToolPolicyDecide       = "vision.policy_decide"
	ToolPolicyValidatePlan = "vision.policy_validate_plan"
	ToolPolicyConflicts    = "vision.policy_conflicts"
	ToolPolicyExplain      = "vision.policy_explain"
	// V8.7 Runtime Contract Registry tools
	ToolContractRegistry        = "vision.contract_registry"
	ToolContractGet             = "vision.contract_get"
	ToolContractValidatePayload = "vision.contract_validate_payload"
	ToolContractAudit           = "vision.contract_audit"
	ToolContractExplain         = "vision.contract_explain"
	// V8.8 Evidence Ledger tools
	ToolEvidenceLedger   = "vision.evidence_ledger"
	ToolEvidenceValidate = "vision.evidence_validate"
	ToolEvidenceSummary  = "vision.evidence_summary"
	ToolEvidenceAudit    = "vision.evidence_audit"
	ToolEvidenceExplain  = "vision.evidence_explain"
	// V8.9 Promotion Readiness Gate tools
	ToolReadinessVerdict  = "vision.readiness_verdict"
	ToolReadinessValidate = "vision.readiness_validate"
	ToolReadinessModules  = "vision.readiness_modules"
	ToolReadinessAudit    = "vision.readiness_audit"
	ToolReadinessExplain  = "vision.readiness_explain"
	// V9.0 PASS GOLD Authority Layer tools
	ToolGateAuthoritySnapshot = "vision.gate_authority_snapshot"
	ToolGateAuthorityDecide   = "vision.gate_authority_decide"
	ToolGateAuthorityAudit    = "vision.gate_authority_audit"
	ToolGateAuthorityPolicy   = "vision.gate_authority_policy"
	ToolGateAuthorityExplain  = "vision.gate_authority_explain"
	// V9.1 External Promotion Executor Contract tools
	ToolPromotionContractSnapshot = "vision.promotion_contract_snapshot"
	ToolPromotionContractValidate = "vision.promotion_contract_validate"
	ToolPromotionContractBoundary = "vision.promotion_contract_boundary"
	ToolPromotionContractAudit    = "vision.promotion_contract_audit"
	ToolPromotionContractExplain  = "vision.promotion_contract_explain"
	// V9.2 External Executor Safety Envelope tools
	ToolExecutorSafetyEnvelope = "vision.executor_safety_envelope"
	ToolExecutorSafetyValidate = "vision.executor_safety_validate"
	ToolExecutorSafetyBoundary = "vision.executor_safety_boundary"
	ToolExecutorSafetyAudit    = "vision.executor_safety_audit"
	ToolExecutorSafetyExplain  = "vision.executor_safety_explain"
	// V9.3 Executor Dry-Run Rehearsal Recorder tools
	ToolExecutorRehearsalRecord   = "vision.executor_rehearsal_record"
	ToolExecutorRehearsalValidate = "vision.executor_rehearsal_validate"
	ToolExecutorRehearsalBoundary = "vision.executor_rehearsal_boundary"
	ToolExecutorRehearsalAudit    = "vision.executor_rehearsal_audit"
	ToolExecutorRehearsalExplain  = "vision.executor_rehearsal_explain"
	// V9.4 External Executor Authorization Manifest tools
	ToolExecutorAuthorizationManifest = "vision.executor_authorization_manifest"
	ToolExecutorAuthorizationValidate = "vision.executor_authorization_validate"
	ToolExecutorAuthorizationBoundary = "vision.executor_authorization_boundary"
	ToolExecutorAuthorizationAudit    = "vision.executor_authorization_audit"
	ToolExecutorAuthorizationExplain  = "vision.executor_authorization_explain"
	// V9.5 External Executor Final Preflight tools
	ToolExecutorFinalPreflight    = "vision.executor_final_preflight"
	ToolExecutorPreflightValidate = "vision.executor_preflight_validate"
	ToolExecutorPreflightBoundary = "vision.executor_preflight_boundary"
	ToolExecutorPreflightAudit    = "vision.executor_preflight_audit"
	ToolExecutorPreflightExplain  = "vision.executor_preflight_explain"
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
	// V8.1
	ToolGraphProviders:      true,
	ToolGraphProviderStatus: true,
	ToolGraphImpactQuery:    true,
	ToolGraphDryRunContext:  true,
	// V8.2 dry-run control tools
	ToolDryRunApplyPatch:     true,
	ToolDryRunWriteFile:      true,
	ToolDryRunGitHubFlow:     true,
	ToolDryRunMission:        true,
	ToolDryRunRiskAssessment: true,
	// V8.3 CodeBurn cost guard tools
	ToolCodeBurnEstimate:    true,
	ToolCodeBurnPolicyCheck: true,
	ToolCodeBurnBudgetPlan:  true,
	ToolCodeBurnGuardStatus: true,
	ToolCodeBurnExplain:     true,
	// V8.4 Impeccable UI Guard tools
	ToolImpeccableUIRisk:         true,
	ToolImpeccableFileClassify:   true,
	ToolImpeccableVisualGatePlan: true,
	ToolImpeccableGuardStatus:    true,
	ToolImpeccableExplain:        true,
	// V8.5 Unified Intelligence Dashboard tools
	ToolDashboardSnapshot:            true,
	ToolDashboardReadiness:           true,
	ToolDashboardIntelligenceSummary: true,
	ToolDashboardToolInventory:       true,
	ToolDashboardMissionControl:      true,
	// V8.6 Agent Policy Matrix tools
	ToolPolicyMatrix:       true,
	ToolPolicyDecide:       true,
	ToolPolicyValidatePlan: true,
	ToolPolicyConflicts:    true,
	ToolPolicyExplain:      true,
	// V8.7 Runtime Contract Registry tools
	ToolContractRegistry:        true,
	ToolContractGet:             true,
	ToolContractValidatePayload: true,
	ToolContractAudit:           true,
	ToolContractExplain:         true,
	// V8.8 Evidence Ledger tools
	ToolEvidenceLedger:   true,
	ToolEvidenceValidate: true,
	ToolEvidenceSummary:  true,
	ToolEvidenceAudit:    true,
	ToolEvidenceExplain:  true,
	// V8.9 Promotion Readiness Gate tools
	ToolReadinessVerdict:  true,
	ToolReadinessValidate: true,
	ToolReadinessModules:  true,
	ToolReadinessAudit:    true,
	ToolReadinessExplain:  true,
	// V9.0 PASS GOLD Authority Layer tools
	ToolGateAuthoritySnapshot: true,
	ToolGateAuthorityDecide:   true,
	ToolGateAuthorityAudit:    true,
	ToolGateAuthorityPolicy:   true,
	ToolGateAuthorityExplain:  true,
	// V9.1 External Promotion Executor Contract tools
	ToolPromotionContractSnapshot: true,
	ToolPromotionContractValidate: true,
	ToolPromotionContractBoundary: true,
	ToolPromotionContractAudit:    true,
	ToolPromotionContractExplain:  true,
	// V9.2 External Executor Safety Envelope tools
	ToolExecutorSafetyEnvelope: true,
	ToolExecutorSafetyValidate: true,
	ToolExecutorSafetyBoundary: true,
	ToolExecutorSafetyAudit:    true,
	ToolExecutorSafetyExplain:  true,
	// V9.3 Executor Dry-Run Rehearsal Recorder tools
	ToolExecutorRehearsalRecord:   true,
	ToolExecutorRehearsalValidate: true,
	ToolExecutorRehearsalBoundary: true,
	ToolExecutorRehearsalAudit:    true,
	ToolExecutorRehearsalExplain:  true,
	// V9.4 External Executor Authorization Manifest tools
	ToolExecutorAuthorizationManifest: true,
	ToolExecutorAuthorizationValidate: true,
	ToolExecutorAuthorizationBoundary: true,
	ToolExecutorAuthorizationAudit:    true,
	ToolExecutorAuthorizationExplain:  true,
	// V9.5 External Executor Final Preflight tools
	ToolExecutorFinalPreflight:    true,
	ToolExecutorPreflightValidate: true,
	ToolExecutorPreflightBoundary: true,
	ToolExecutorPreflightAudit:    true,
	ToolExecutorPreflightExplain:  true,
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
	// V8.1
	case ToolGraphProviders:
		return handleGraphProviders(req)
	case ToolGraphProviderStatus:
		return handleGraphProviderStatus(req)
	case ToolGraphImpactQuery:
		return handleGraphImpactQuery(req)
	case ToolGraphDryRunContext:
		return handleGraphDryRunContext(req)
	// V8.2 dry-run control tools
	case ToolDryRunApplyPatch:
		return handleDryRunApplyPatch(req)
	case ToolDryRunWriteFile:
		return handleDryRunWriteFile(req)
	case ToolDryRunGitHubFlow:
		return handleDryRunGitHubFlow(req)
	case ToolDryRunMission:
		return handleDryRunMission(req)
	case ToolDryRunRiskAssessment:
		return handleDryRunRiskAssessment(req)
	// V8.3 CodeBurn cost guard tools
	case ToolCodeBurnEstimate:
		return handleCodeBurnEstimate(req)
	case ToolCodeBurnPolicyCheck:
		return handleCodeBurnPolicyCheck(req)
	case ToolCodeBurnBudgetPlan:
		return handleCodeBurnBudgetPlan(req)
	case ToolCodeBurnGuardStatus:
		return handleCodeBurnGuardStatus(req)
	case ToolCodeBurnExplain:
		return handleCodeBurnExplain(req)
	// V8.4 Impeccable UI Guard tools
	case ToolImpeccableUIRisk:
		return handleImpeccableUIRisk(req)
	case ToolImpeccableFileClassify:
		return handleImpeccableFileClassify(req)
	case ToolImpeccableVisualGatePlan:
		return handleImpeccableVisualGatePlan(req)
	case ToolImpeccableGuardStatus:
		return handleImpeccableGuardStatus(req)
	case ToolImpeccableExplain:
		return handleImpeccableExplain(req)
	// V8.5 Unified Intelligence Dashboard tools
	case ToolDashboardSnapshot:
		return handleDashboardSnapshot(req)
	case ToolDashboardReadiness:
		return handleDashboardReadiness(req)
	case ToolDashboardIntelligenceSummary:
		return handleDashboardIntelligenceSummary(req)
	case ToolDashboardToolInventory:
		return handleDashboardToolInventory(req)
	case ToolDashboardMissionControl:
		return handleDashboardMissionControl(req)
	// V8.6 Agent Policy Matrix tools
	case ToolPolicyMatrix:
		return handlePolicyMatrix(req)
	case ToolPolicyDecide:
		return handlePolicyDecide(req)
	case ToolPolicyValidatePlan:
		return handlePolicyValidatePlan(req)
	case ToolPolicyConflicts:
		return handlePolicyConflicts(req)
	case ToolPolicyExplain:
		return handlePolicyExplain(req)
	// V8.7 Runtime Contract Registry tools
	case ToolContractRegistry:
		return handleContractRegistry(req)
	case ToolContractGet:
		return handleContractGet(req)
	case ToolContractValidatePayload:
		return handleContractValidatePayload(req)
	case ToolContractAudit:
		return handleContractAudit(req)
	case ToolContractExplain:
		return handleContractExplain(req)
	// V8.8 Evidence Ledger tools
	case ToolEvidenceLedger:
		return handleEvidenceLedger(req)
	case ToolEvidenceValidate:
		return handleEvidenceValidate(req)
	case ToolEvidenceSummary:
		return handleEvidenceSummary(req)
	case ToolEvidenceAudit:
		return handleEvidenceAudit(req)
	case ToolEvidenceExplain:
		return handleEvidenceExplain(req)
	// V8.9 Promotion Readiness Gate tools
	case ToolReadinessVerdict:
		return handleReadinessVerdict(req)
	case ToolReadinessValidate:
		return handleReadinessValidate(req)
	case ToolReadinessModules:
		return handleReadinessModules(req)
	case ToolReadinessAudit:
		return handleReadinessAudit(req)
	case ToolReadinessExplain:
		return handleReadinessExplain(req)
	// V9.0 PASS GOLD Authority Layer tools
	case ToolGateAuthoritySnapshot:
		return handleGateAuthoritySnapshot(req)
	case ToolGateAuthorityDecide:
		return handleGateAuthorityDecide(req)
	case ToolGateAuthorityAudit:
		return handleGateAuthorityAudit(req)
	case ToolGateAuthorityPolicy:
		return handleGateAuthorityPolicy(req)
	case ToolGateAuthorityExplain:
		return handleGateAuthorityExplain(req)
	// V9.1 External Promotion Executor Contract tools
	case ToolPromotionContractSnapshot:
		return handlePromotionContractSnapshot(req)
	case ToolPromotionContractValidate:
		return handlePromotionContractValidate(req)
	case ToolPromotionContractBoundary:
		return handlePromotionContractBoundary(req)
	case ToolPromotionContractAudit:
		return handlePromotionContractAudit(req)
	case ToolPromotionContractExplain:
		return handlePromotionContractExplain(req)
	// V9.2 External Executor Safety Envelope tools
	case ToolExecutorSafetyEnvelope:
		return handleExecutorSafetyEnvelope(req)
	case ToolExecutorSafetyValidate:
		return handleExecutorSafetyValidate(req)
	case ToolExecutorSafetyBoundary:
		return handleExecutorSafetyBoundary(req)
	case ToolExecutorSafetyAudit:
		return handleExecutorSafetyAudit(req)
	case ToolExecutorSafetyExplain:
		return handleExecutorSafetyExplain(req)
	// V9.3 Executor Dry-Run Rehearsal Recorder tools
	case ToolExecutorRehearsalRecord:
		return handleExecutorRehearsalRecord(req)
	case ToolExecutorRehearsalValidate:
		return handleExecutorRehearsalValidate(req)
	case ToolExecutorRehearsalBoundary:
		return handleExecutorRehearsalBoundary(req)
	case ToolExecutorRehearsalAudit:
		return handleExecutorRehearsalAudit(req)
	case ToolExecutorRehearsalExplain:
		return handleExecutorRehearsalExplain(req)
	// V9.4 External Executor Authorization Manifest tools
	case ToolExecutorAuthorizationManifest:
		return handleExecutorAuthorizationManifest(req)
	case ToolExecutorAuthorizationValidate:
		return handleExecutorAuthorizationValidate(req)
	case ToolExecutorAuthorizationBoundary:
		return handleExecutorAuthorizationBoundary(req)
	case ToolExecutorAuthorizationAudit:
		return handleExecutorAuthorizationAudit(req)
	case ToolExecutorAuthorizationExplain:
		return handleExecutorAuthorizationExplain(req)
	// V9.5 External Executor Final Preflight tools
	case ToolExecutorFinalPreflight:
		return handleExecutorFinalPreflight(req)
	case ToolExecutorPreflightValidate:
		return handleExecutorPreflightValidate(req)
	case ToolExecutorPreflightBoundary:
		return handleExecutorPreflightBoundary(req)
	case ToolExecutorPreflightAudit:
		return handleExecutorPreflightAudit(req)
	case ToolExecutorPreflightExplain:
		return handleExecutorPreflightExplain(req)
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
			"status":           "unknown",
			"reason":           note,
			"read_only":        true,
			"deploy_performed": false,
			"status_published": false,
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

// ── V8.1 Handlers ─────────────────────────────────────────────────────────────

// handleGraphProviders returns the list of all registered graph providers.
// Read-only, no side-effects.
func handleGraphProviders(req ToolRequest) ToolResponse {
	infos := graphmemory.ListProviders()
	return ToolResponse{
		Tool: req.Tool,
		OK:   true,
		Payload: map[string]interface{}{
			"version":   graphmemory.V81Version,
			"providers": infos,
		},
	}
}

type graphProviderStatusArgs struct {
	Provider string `json:"provider"`
}

// handleGraphProviderStatus reports availability of a named provider.
// Read-only, no side-effects.
func handleGraphProviderStatus(req ToolRequest) ToolResponse {
	var a graphProviderStatusArgs
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	if a.Provider == "" {
		a.Provider = "local"
	}

	p, err := graphmemory.GetProvider(a.Provider)
	if err != nil {
		return errResp(req.Tool, err)
	}

	payload := map[string]interface{}{
		"provider":  p.Name(),
		"available": p.Available(),
		"read_only": true,
		"version":   graphmemory.V81Version,
	}
	if !p.Available() {
		payload["reason"] = graphmemory.GraphifyUnavailableReason
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: payload}
}

type graphImpactQueryArgs struct {
	Query    string `json:"query"`
	Limit    int    `json:"limit"`
	Provider string `json:"provider,omitempty"`
}

// handleGraphImpactQuery queries the existing index for related nodes.
// Does NOT build the index automatically.
// Read-only, no side-effects.
func handleGraphImpactQuery(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (query, limit)"))
	}
	var a graphImpactQueryArgs
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	if a.Limit <= 0 {
		a.Limit = 10
	}
	if a.Provider == "" {
		a.Provider = "local"
	}

	// Validate provider exists (but use the index regardless — query is read-only)
	if _, err := graphmemory.GetProvider(a.Provider); err != nil {
		return errResp(req.Tool, err)
	}

	root := rootFrom(req)
	result, err := graphmemory.Query(root, a.Query, a.Limit)
	if err != nil {
		return errResp(req.Tool, err)
	}

	return ToolResponse{
		Tool: req.Tool,
		OK:   true,
		Payload: map[string]interface{}{
			"version":   graphmemory.V81Version,
			"provider":  a.Provider,
			"query":     result.Query,
			"limit":     result.Limit,
			"total":     result.Total,
			"results":   result.Results,
			"read_only": true,
		},
	}
}

type graphDryRunContextArgs struct {
	Query     string `json:"query"`
	IssueType string `json:"issue_type,omitempty"`
	Limit     int    `json:"limit,omitempty"`
}

// handleGraphDryRunContext assembles a read-only planning context for a future mission.
// Does NOT call mission.Run, does NOT call patcher, does NOT write files,
// does NOT call GitHub.
func handleGraphDryRunContext(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (query)"))
	}
	var a graphDryRunContextArgs
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	if a.Query == "" {
		return errResp(req.Tool, errors.New("query is required"))
	}
	if a.Limit <= 0 {
		a.Limit = 10
	}
	if a.IssueType == "" {
		a.IssueType = "unknown"
	}

	root := rootFrom(req)

	// Attempt to load index for candidate files; graceful if absent
	var candidateFiles []string
	var relatedCommands []string
	var riskHints []string

	result, err := graphmemory.Query(root, a.Query, a.Limit)
	if err == nil {
		for _, n := range result.Results {
			if n.Path != "" {
				candidateFiles = append(candidateFiles, n.Path)
			}
			if string(n.Kind) == "cli_cmd" {
				relatedCommands = append(relatedCommands, n.Label)
			}
		}
	} else {
		riskHints = append(riskHints, "graph index not built — run graph-index for richer context")
	}

	// Static risk hints based on issue_type
	switch strings.ToLower(a.IssueType) {
	case "cors_blocked", "cors":
		riskHints = append(riskHints, "CORS issues often affect multiple endpoints — verify allow-list coverage")
		riskHints = append(riskHints, "Check OPTIONS preflight handling before applying patch")
	case "github_flow_safety_drill":
		riskHints = append(riskHints, "Safety drill — no real GitHub write will occur")
	default:
		riskHints = append(riskHints, "Run mission for authoritative diagnosis and patch plan")
	}

	// Related reports — list any existing reports (read-only)
	relatedReports := []string{}
	if idx, rerr := report.ListEntries(root, report.DefaultReportDir, 3); rerr == nil {
		for _, e := range idx.Entries {
			relatedReports = append(relatedReports, e.FlowID)
		}
	}

	return ToolResponse{
		Tool: req.Tool,
		OK:   true,
		Payload: map[string]interface{}{
			"version":          graphmemory.V81Version,
			"query":            a.Query,
			"issue_type":       a.IssueType,
			"candidate_files":  candidateFiles,
			"related_commands": relatedCommands,
			"related_reports":  relatedReports,
			"risk_hints":       riskHints,
			"dry_run":          true,
			"read_only":        true,
		},
	}
}

// ── V8.2 Handlers ─────────────────────────────────────────────────────────────

func handleDryRunApplyPatch(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (file, find, replace, mode)"))
	}
	var a dryrun.ApplyPatchInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	a.Root = rootFrom(req)
	result := dryrun.DryRunApplyPatch(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleDryRunWriteFile(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (file, content, operation)"))
	}
	var a dryrun.WriteFileInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	a.Root = rootFrom(req)
	result := dryrun.DryRunWriteFile(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleDryRunGitHubFlow(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (mission_id or work_branch, changed_files)"))
	}
	var a dryrun.GitHubFlowInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	result := dryrun.DryRunGitHubFlow(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleDryRunMission(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (input)"))
	}
	var a dryrun.MissionInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	result := dryrun.DryRunMission(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleDryRunRiskAssessment(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (files, operation)"))
	}
	var a dryrun.RiskAssessmentInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	result := dryrun.DryRunRiskAssessment(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

// ── V8.3 CodeBurn Handlers ───────────────────────────────────────────────────

func handleCodeBurnEstimate(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (operation, provider, model, limits)"))
	}
	var a codeburn.EstimateInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	result := codeburn.Estimate(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleCodeBurnPolicyCheck(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (operation, provider, model, limits)"))
	}
	var a codeburn.EstimateInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	result := codeburn.PolicyCheck(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleCodeBurnBudgetPlan(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (mission_input, budget_usd)"))
	}
	var a codeburn.BudgetPlanInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	result := codeburn.BudgetPlan(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

func handleCodeBurnGuardStatus(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: codeburn.GuardStatus()}
}

func handleCodeBurnExplain(req ToolRequest) ToolResponse {
	if len(req.Args) == 0 {
		return errResp(req.Tool, errors.New("args required (estimate)"))
	}
	var a codeburn.ExplainInput
	if err := json.Unmarshal(req.Args, &a); err != nil {
		return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
	}
	result := codeburn.Explain(a)
	return ToolResponse{Tool: req.Tool, OK: true, Payload: result}
}

// ── V8.4 Impeccable UI Guard Handlers ───────────────────────────────────────

func handleImpeccableUIRisk(req ToolRequest) ToolResponse {
	var a impeccable.UIInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: impeccable.AnalyzeUIRisk(a)}
}

func handleImpeccableFileClassify(req ToolRequest) ToolResponse {
	var a struct {
		Files []string `json:"files"`
	}
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: impeccable.ClassifyUIFileSet(a.Files)}
}

func handleImpeccableVisualGatePlan(req ToolRequest) ToolResponse {
	var a impeccable.UIInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: impeccable.BuildVisualGatePlan(a)}
}

func handleImpeccableGuardStatus(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: impeccable.GuardStatus()}
}

func handleImpeccableExplain(req ToolRequest) ToolResponse {
	var a impeccable.ExplainInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: impeccable.ExplainUIRisk(a)}
}

// ── V8.5 Unified Intelligence Dashboard Handlers ─────────────────────────────

func parseDashboardInput(req ToolRequest) (dashboard.DashboardInput, error) {
	var a dashboard.DashboardInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleDashboardSnapshot(req ToolRequest) ToolResponse {
	a, err := parseDashboardInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: dashboard.BuildSnapshot(a)}
}

func handleDashboardReadiness(req ToolRequest) ToolResponse {
	a, err := parseDashboardInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: dashboard.BuildReadiness(a)}
}

func handleDashboardIntelligenceSummary(req ToolRequest) ToolResponse {
	a, err := parseDashboardInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: dashboard.SummarizeIntelligence(a)}
}

func handleDashboardToolInventory(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: dashboard.BuildToolInventory()}
}

func handleDashboardMissionControl(req ToolRequest) ToolResponse {
	a, err := parseDashboardInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: dashboard.BuildMissionControl(a)}
}

// ── V8.6 Agent Policy Matrix Handlers ───────────────────────────────────────

func handlePolicyMatrix(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: policymatrix.BuildMatrix()}
}

func handlePolicyDecide(req ToolRequest) ToolResponse {
	var a policymatrix.PolicyInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: policymatrix.Decide(a)}
}

func handlePolicyValidatePlan(req ToolRequest) ToolResponse {
	var a policymatrix.PlanValidationInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: policymatrix.ValidatePlan(a)}
}

func handlePolicyConflicts(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: policymatrix.DetectConflicts()}
}

func handlePolicyExplain(req ToolRequest) ToolResponse {
	var a policymatrix.PolicyInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: policymatrix.ExplainDecision(a)}
}

// ── V8.7 Runtime Contract Registry Handlers ─────────────────────────────────

func handleContractRegistry(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: contractregistry.BuildRegistry()}
}

func handleContractGet(req ToolRequest) ToolResponse {
	var a contractregistry.ContractInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: map[string]interface{}{
		"version":   contractregistry.Version,
		"dry_run":   true,
		"read_only": true,
		"contract":  contractregistry.GetContract(a.Tool),
	}}
}

func handleContractValidatePayload(req ToolRequest) ToolResponse {
	var a contractregistry.ContractInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: contractregistry.ValidateContract(a)}
}

func handleContractAudit(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: contractregistry.AuditRegistry()}
}

func handleContractExplain(req ToolRequest) ToolResponse {
	var a contractregistry.ContractInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return errResp(req.Tool, fmt.Errorf("invalid args: %w", err))
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: contractregistry.ExplainContract(a)}
}

// ── V8.8 Evidence Ledger Handlers ───────────────────────────────────────────

func parseEvidenceInput(req ToolRequest) (evidenceledger.EvidenceInput, error) {
	var a evidenceledger.EvidenceInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleEvidenceLedger(req ToolRequest) ToolResponse {
	a, err := parseEvidenceInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: evidenceledger.BuildLedger(a)}
}

func handleEvidenceValidate(req ToolRequest) ToolResponse {
	a, err := parseEvidenceInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: evidenceledger.ValidateEvidence(a)}
}

func handleEvidenceSummary(req ToolRequest) ToolResponse {
	a, err := parseEvidenceInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: evidenceledger.SummarizeEvidence(a)}
}

func handleEvidenceAudit(req ToolRequest) ToolResponse {
	a, err := parseEvidenceInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: evidenceledger.AuditLedger(a)}
}

func handleEvidenceExplain(req ToolRequest) ToolResponse {
	a, err := parseEvidenceInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: evidenceledger.ExplainEvidence(a)}
}

// ── V8.9 Promotion Readiness Gate Handlers ──────────────────────────────────

type readinessModulesPayload struct {
	Version       string                      `json:"version"`
	DryRun        bool                        `json:"dry_run"`
	ReadOnly      bool                        `json:"read_only"`
	Modules       []readiness.ModuleReadiness `json:"modules"`
	RequiredGates []string                    `json:"required_gates"`
}

func parseReadinessInput(req ToolRequest) (readiness.ReadinessInput, error) {
	var a readiness.ReadinessInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleReadinessVerdict(req ToolRequest) ToolResponse {
	a, err := parseReadinessInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: readiness.BuildReadiness(a)}
}

func handleReadinessValidate(req ToolRequest) ToolResponse {
	a, err := parseReadinessInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: readiness.ValidateReadiness(a)}
}

func handleReadinessModules(req ToolRequest) ToolResponse {
	a, err := parseReadinessInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: readinessModulesPayload{
		Version:       readiness.Version,
		DryRun:        true,
		ReadOnly:      true,
		Modules:       readiness.BuildModuleReadiness(a),
		RequiredGates: []string{"PASS_GOLD", "PASS_SECURE"},
	}}
}

func handleReadinessAudit(req ToolRequest) ToolResponse {
	a, err := parseReadinessInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: readiness.AuditReadiness(a)}
}

func handleReadinessExplain(req ToolRequest) ToolResponse {
	a, err := parseReadinessInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: readiness.ExplainReadiness(a)}
}

// ── V9.0 PASS GOLD Authority Layer Handlers ────────────────────────────────

func parseGateAuthorityInput(req ToolRequest) (gateauthority.GateAuthorityInput, error) {
	var a gateauthority.GateAuthorityInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleGateAuthoritySnapshot(req ToolRequest) ToolResponse {
	a, err := parseGateAuthorityInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: gateauthority.BuildAuthoritySnapshot(a)}
}

func handleGateAuthorityDecide(req ToolRequest) ToolResponse {
	a, err := parseGateAuthorityInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: gateauthority.DecideGate(a)}
}

func handleGateAuthorityAudit(req ToolRequest) ToolResponse {
	a, err := parseGateAuthorityInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: gateauthority.AuditGateAuthority(a)}
}

func handleGateAuthorityPolicy(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: gateauthority.BuildAuthorityPolicy()}
}

func handleGateAuthorityExplain(req ToolRequest) ToolResponse {
	a, err := parseGateAuthorityInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: gateauthority.ExplainGateAuthority(a)}
}

// ── V9.1 External Promotion Executor Contract Handlers ─────────────────────

func parsePromotionContractInput(req ToolRequest) (promotioncontract.PromotionContractInput, error) {
	var a promotioncontract.PromotionContractInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handlePromotionContractSnapshot(req ToolRequest) ToolResponse {
	a, err := parsePromotionContractInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: promotioncontract.BuildContractSnapshot(a)}
}

func handlePromotionContractValidate(req ToolRequest) ToolResponse {
	a, err := parsePromotionContractInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: promotioncontract.ValidateContract(a)}
}

func handlePromotionContractBoundary(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: promotioncontract.BuildBoundary()}
}

func handlePromotionContractAudit(req ToolRequest) ToolResponse {
	a, err := parsePromotionContractInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: promotioncontract.AuditContract(a)}
}

func handlePromotionContractExplain(req ToolRequest) ToolResponse {
	a, err := parsePromotionContractInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: promotioncontract.ExplainContract(a)}
}

// ── V9.2 External Executor Safety Envelope Handlers ───────────────────────

func parseSafetyEnvelopeInput(req ToolRequest) (safetyenvelope.SafetyEnvelopeInput, error) {
	var a safetyenvelope.SafetyEnvelopeInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleExecutorSafetyEnvelope(req ToolRequest) ToolResponse {
	a, err := parseSafetyEnvelopeInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: safetyenvelope.BuildSafetyEnvelope(a)}
}

func handleExecutorSafetyValidate(req ToolRequest) ToolResponse {
	a, err := parseSafetyEnvelopeInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: safetyenvelope.ValidateSafetyEnvelope(a)}
}

func handleExecutorSafetyBoundary(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: safetyenvelope.BuildSafetyBoundary()}
}

func handleExecutorSafetyAudit(req ToolRequest) ToolResponse {
	a, err := parseSafetyEnvelopeInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: safetyenvelope.AuditSafetyEnvelope(a)}
}

func handleExecutorSafetyExplain(req ToolRequest) ToolResponse {
	a, err := parseSafetyEnvelopeInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: safetyenvelope.ExplainSafetyEnvelope(a)}
}

// ── V9.3 Executor Dry-Run Rehearsal Recorder Handlers ─────────────────────

func parseRehearsalInput(req ToolRequest) (rehearsalrecorder.RehearsalInput, error) {
	var a rehearsalrecorder.RehearsalInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleExecutorRehearsalRecord(req ToolRequest) ToolResponse {
	a, err := parseRehearsalInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: rehearsalrecorder.BuildRehearsalRecord(a)}
}

func handleExecutorRehearsalValidate(req ToolRequest) ToolResponse {
	a, err := parseRehearsalInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: rehearsalrecorder.ValidateRehearsal(a)}
}

func handleExecutorRehearsalBoundary(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: rehearsalrecorder.BuildRehearsalBoundary()}
}

func handleExecutorRehearsalAudit(req ToolRequest) ToolResponse {
	a, err := parseRehearsalInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: rehearsalrecorder.AuditRehearsal(a)}
}

func handleExecutorRehearsalExplain(req ToolRequest) ToolResponse {
	a, err := parseRehearsalInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: rehearsalrecorder.ExplainRehearsal(a)}
}

// ── V9.4 External Executor Authorization Manifest Handlers ──────────────────

func parseAuthorizationInput(req ToolRequest) (authorizationmanifest.AuthorizationInput, error) {
	var a authorizationmanifest.AuthorizationInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleExecutorAuthorizationManifest(req ToolRequest) ToolResponse {
	a, err := parseAuthorizationInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: authorizationmanifest.BuildAuthorizationManifest(a)}
}

func handleExecutorAuthorizationValidate(req ToolRequest) ToolResponse {
	a, err := parseAuthorizationInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: authorizationmanifest.ValidateAuthorization(a)}
}

func handleExecutorAuthorizationBoundary(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: authorizationmanifest.BuildAuthorizationBoundary()}
}

func handleExecutorAuthorizationAudit(req ToolRequest) ToolResponse {
	a, err := parseAuthorizationInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: authorizationmanifest.AuditAuthorization(a)}
}

func handleExecutorAuthorizationExplain(req ToolRequest) ToolResponse {
	a, err := parseAuthorizationInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: authorizationmanifest.ExplainAuthorization(a)}
}

// ── V9.5 External Executor Final Preflight Handlers ─────────────────────────

func parsePreflightInput(req ToolRequest) (executorpreflight.PreflightInput, error) {
	var a executorpreflight.PreflightInput
	if len(req.Args) > 0 {
		if err := json.Unmarshal(req.Args, &a); err != nil {
			return a, fmt.Errorf("invalid args: %w", err)
		}
	}
	if a.Root == "" {
		a.Root = rootFrom(req)
	}
	return a, nil
}

func handleExecutorFinalPreflight(req ToolRequest) ToolResponse {
	a, err := parsePreflightInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: executorpreflight.BuildFinalPreflight(a)}
}

func handleExecutorPreflightValidate(req ToolRequest) ToolResponse {
	a, err := parsePreflightInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: executorpreflight.ValidatePreflight(a)}
}

func handleExecutorPreflightBoundary(req ToolRequest) ToolResponse {
	return ToolResponse{Tool: req.Tool, OK: true, Payload: executorpreflight.BuildPreflightBoundary()}
}

func handleExecutorPreflightAudit(req ToolRequest) ToolResponse {
	a, err := parsePreflightInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: executorpreflight.AuditPreflight(a)}
}

func handleExecutorPreflightExplain(req ToolRequest) ToolResponse {
	a, err := parsePreflightInput(req)
	if err != nil {
		return errResp(req.Tool, err)
	}
	return ToolResponse{Tool: req.Tool, OK: true, Payload: executorpreflight.ExplainPreflight(a)}
}
