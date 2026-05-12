// Package dashboard implements V8.5 Unified Intelligence Dashboard.
//
// The dashboard is intentionally read-only and dry-run only. It composes local
// in-memory/read-only signals from Graph Memory, MCP inventory, DryRun,
// CodeBurn, Impeccable, and report index state; it never patches, writes,
// executes commands, opens browsers/screenshots, calls external networks/APIs,
// opens PRs, publishes status, deploys, or mutates memory.
package dashboard

import (
	"fmt"
	"strings"

	"github.com/visioncore/go-core/internal/codeburn"
	"github.com/visioncore/go-core/internal/dryrun"
	"github.com/visioncore/go-core/internal/graphmemory"
	"github.com/visioncore/go-core/internal/impeccable"
	"github.com/visioncore/go-core/internal/report"
)

const Version = "V8.5"

const (
	RiskLow      = "low"
	RiskMedium   = "medium"
	RiskHigh     = "high"
	RiskCritical = "critical"
)

// DashboardInput is the shared V8.5 read-only dashboard request.
type DashboardInput struct {
	Root              string   `json:"root,omitempty"`
	MissionInput      string   `json:"mission_input,omitempty"`
	Operation         string   `json:"operation,omitempty"`
	Files             []string `json:"files,omitempty"`
	Route             string   `json:"route,omitempty"`
	Viewport          string   `json:"viewport,omitempty"`
	Provider          string   `json:"provider,omitempty"`
	Model             string   `json:"model,omitempty"`
	IncludeGraph      bool     `json:"include_graph,omitempty"`
	IncludeCodeBurn   bool     `json:"include_codeburn,omitempty"`
	IncludeImpeccable bool     `json:"include_impeccable,omitempty"`
	IncludeDryRun     bool     `json:"include_dryrun,omitempty"`
	IncludeReports    bool     `json:"include_reports,omitempty"`
}

// DashboardSnapshot is the unified state synthesis for Mission Control.
type DashboardSnapshot struct {
	Version              string                    `json:"version"`
	DryRun               bool                      `json:"dry_run"`
	ReadOnly             bool                      `json:"read_only"`
	SystemStatus         string                    `json:"system_status"`
	MissionInput         string                    `json:"mission_input,omitempty"`
	Operation            string                    `json:"operation,omitempty"`
	PassGoldStatus       DashboardSection          `json:"pass_gold_status"`
	PassSecureStatus     DashboardSection          `json:"pass_secure_status"`
	GraphStatus          DashboardSection          `json:"graph_status"`
	MCPStatus            DashboardSection          `json:"mcp_status"`
	DryRunStatus         DashboardSection          `json:"dryrun_status"`
	CodeBurnStatus       DashboardSection          `json:"codeburn_status"`
	ImpeccableStatus     DashboardSection          `json:"impeccable_status"`
	ReportStatus         DashboardSection          `json:"report_status"`
	RiskLevel            string                    `json:"risk_level"`
	RiskScore            int                       `json:"risk_score"`
	Blocked              bool                      `json:"blocked"`
	BlockedReasons       []string                  `json:"blocked_reasons"`
	RequiredGates        []string                  `json:"required_gates"`
	Recommendations      []DashboardRecommendation `json:"recommendations"`
	NextActions          []string                  `json:"next_actions"`
	PromotionAllowed     bool                      `json:"promotion_allowed"`
	DeployAllowed        bool                      `json:"deploy_allowed"`
	StatusPublishAllowed bool                      `json:"status_publish_allowed"`
	MutationAllowed      bool                      `json:"mutation_allowed"`
}

// DashboardSection describes one read-only module signal.
type DashboardSection struct {
	Name            string   `json:"name"`
	Status          string   `json:"status"`
	RiskLevel       string   `json:"risk_level"`
	Summary         string   `json:"summary"`
	Findings        []string `json:"findings"`
	Recommendations []string `json:"recommendations"`
}

// DashboardRecommendation is a prioritized conservative action.
type DashboardRecommendation struct {
	Action   string `json:"action"`
	Reason   string `json:"reason"`
	Priority string `json:"priority"`
	Source   string `json:"source"`
}

// DashboardReadiness is a conservative promotion/deploy readiness view.
type DashboardReadiness struct {
	DryRun                  bool   `json:"dry_run"`
	ReadOnly                bool   `json:"read_only"`
	Version                 string `json:"version"`
	PassGoldRequired        bool   `json:"pass_gold_required"`
	PassSecureRequired      bool   `json:"pass_secure_required"`
	VisualDiffRequired      bool   `json:"visual_diff_required"`
	CostGuardRequired       bool   `json:"cost_guard_required"`
	DryRunRequired          bool   `json:"dry_run_required"`
	GraphContextRecommended bool   `json:"graph_context_recommended"`
	PromotionAllowed        bool   `json:"promotion_allowed"`
	DeployAllowed           bool   `json:"deploy_allowed"`
	MutationAllowed         bool   `json:"mutation_allowed"`
}

// IntelligenceSummary is the textual V8.5 executive synthesis.
type IntelligenceSummary struct {
	DryRun           bool     `json:"dry_run"`
	ReadOnly         bool     `json:"read_only"`
	Version          string   `json:"version"`
	ExecutiveSummary string   `json:"executive_summary"`
	CurrentState     string   `json:"current_state"`
	TopRisks         []string `json:"top_risks"`
	SafestNextSteps  []string `json:"safest_next_steps"`
	BlockedActions   []string `json:"blocked_actions"`
	GatesToPass      []string `json:"gates_to_pass"`
}

// ToolInventory lists known read-only and blocked MCP tools.
type ToolInventory struct {
	DryRun               bool     `json:"dry_run"`
	ReadOnly             bool     `json:"read_only"`
	Version              string   `json:"version"`
	GraphTools           []string `json:"graph_tools"`
	DryRunTools          []string `json:"dryrun_tools"`
	CodeBurnTools        []string `json:"codeburn_tools"`
	ImpeccableTools      []string `json:"impeccable_tools"`
	DashboardTools       []string `json:"dashboard_tools"`
	BlockedMutatingTools []string `json:"blocked_mutating_tools"`
}

// MissionControlModule is a future-UI module orbit item.
type MissionControlModule struct {
	Name            string `json:"name"`
	Status          string `json:"status"`
	ReadOnly        bool   `json:"read_only"`
	MutationAllowed bool   `json:"mutation_allowed"`
	Summary         string `json:"summary"`
}

// MissionControl is the V8.5 aggregate orbit view.
type MissionControl struct {
	DryRun        bool                   `json:"dry_run"`
	ReadOnly      bool                   `json:"read_only"`
	Version       string                 `json:"version"`
	Modules       []MissionControlModule `json:"modules"`
	OverallStatus string                 `json:"overall_status"`
	RequiredGates []string               `json:"required_gates"`
}

// BuildSnapshot composes a conservative read-only dashboard snapshot.
func BuildSnapshot(input DashboardInput) DashboardSnapshot {
	input = normalizeInput(input)
	readiness := BuildReadiness(input)
	requiredGates := uniqueStrings([]string{"PASS_GOLD", "PASS_SECURE"})
	blockedReasons := []string{"PASS_GOLD status is unknown in MCP read-only dashboard", "PASS_SECURE status is unknown in MCP read-only dashboard"}
	recs := []DashboardRecommendation{
		{Action: "run-pass-gold", Reason: "promotion requires real PASS GOLD outside MCP dashboard", Priority: "critical", Source: "PASS_GOLD"},
		{Action: "run-pass-secure", Reason: "promotion requires real PASS SECURE outside MCP dashboard", Priority: "critical", Source: "PASS_SECURE"},
	}
	nextActions := []string{"keep MCP dashboard in dry-run/read-only mode", "collect PASS GOLD and PASS SECURE evidence outside MCP before promotion"}

	passGold := section("PASS_GOLD", "unknown", RiskHigh, "PASS GOLD evidence is not available to the read-only dashboard.", []string{"dashboard cannot synthesize PASS GOLD"}, []string{"run real PASS GOLD gate outside MCP"})
	passSecure := section("PASS_SECURE", "unknown", RiskHigh, "PASS SECURE evidence is not available to the read-only dashboard.", []string{"dashboard cannot synthesize PASS SECURE"}, []string{"run real PASS SECURE gate outside MCP"})
	graph := buildGraphSection(input)
	mcp := section("MCPReadOnly", "ready", RiskLow, "MCP control plane is read-only; mutating tools remain blocked.", []string{"mutation/deploy/status/PR tools are denied"}, []string{"continue using dry-run tools for planning"})
	dryrunSection, dryrunRisk, dryrunScore, dryrunBlocked, dryrunReasons := buildDryRunSection(input)
	codeburnSection, codeburnRisk, codeburnScore, codeburnBlocked, codeburnReasons := buildCodeBurnSection(input)
	impeccableSection, visualRisk, visualScore, visualBlocked, visualReasons := buildImpeccableSection(input)
	reportSection := buildReportSection(input)

	if readiness.VisualDiffRequired {
		requiredGates = append(requiredGates, "VISUAL_DIFF_REQUIRED")
		recs = append(recs, DashboardRecommendation{Action: "plan-visual-diff", Reason: "UI/frontend files require Impeccable visual evidence", Priority: "high", Source: "Impeccable"})
		nextActions = append(nextActions, "produce visual diff plan before UI promotion")
	}
	if readiness.DryRunRequired {
		requiredGates = append(requiredGates, "DRY_RUN_REQUIRED")
		recs = append(recs, DashboardRecommendation{Action: "run-dry-run", Reason: "mutable operation candidates must remain simulated first", Priority: "high", Source: "DryRun"})
		nextActions = append(nextActions, "run matching dry-run MCP tool and inspect blocked reasons")
	}
	if readiness.CostGuardRequired {
		requiredGates = append(requiredGates, "CODEBURN_REQUIRED")
		recs = append(recs, DashboardRecommendation{Action: "check-codeburn", Reason: "cost/rate/mutation guard must remain green before work", Priority: "medium", Source: "CodeBurn"})
	}
	if graph.Status != "ready" {
		recs = append(recs, DashboardRecommendation{Action: "graph-index", Reason: "Graph Memory index is absent or unreadable", Priority: "medium", Source: "GraphMemory"})
		nextActions = append(nextActions, "build or refresh graph index if mission context is needed")
	}
	if reportSection.Status != "ready" {
		nextActions = append(nextActions, "optionally inspect report index when reports are available")
	}

	blockedReasons = append(blockedReasons, dryrunReasons...)
	blockedReasons = append(blockedReasons, codeburnReasons...)
	blockedReasons = append(blockedReasons, visualReasons...)
	riskScore := maxInt(75, dryrunScore, codeburnScore, visualScore)
	riskLevel := maxRisk(RiskHigh, dryrunRisk, codeburnRisk, visualRisk)
	_ = dryrunBlocked
	_ = codeburnBlocked
	_ = visualBlocked
	blocked := true

	if isLocalOffline(input.Provider, input.Model) {
		recs = append(recs, DashboardRecommendation{Action: "prefer-local-offline", Reason: "local/offline provider keeps external estimated cost at zero", Priority: "low", Source: "CodeBurn"})
	}

	return DashboardSnapshot{
		Version:              Version,
		DryRun:               true,
		ReadOnly:             true,
		SystemStatus:         "blocked_until_pass_gold_and_pass_secure",
		MissionInput:         input.MissionInput,
		Operation:            input.Operation,
		PassGoldStatus:       passGold,
		PassSecureStatus:     passSecure,
		GraphStatus:          graph,
		MCPStatus:            mcp,
		DryRunStatus:         dryrunSection,
		CodeBurnStatus:       codeburnSection,
		ImpeccableStatus:     impeccableSection,
		ReportStatus:         reportSection,
		RiskLevel:            riskLevel,
		RiskScore:            clamp(riskScore, 0, 100),
		Blocked:              blocked,
		BlockedReasons:       uniqueStrings(blockedReasons),
		RequiredGates:        uniqueStrings(requiredGates),
		Recommendations:      recs,
		NextActions:          uniqueStrings(nextActions),
		PromotionAllowed:     false,
		DeployAllowed:        false,
		StatusPublishAllowed: false,
		MutationAllowed:      false,
	}
}

// BuildReadiness returns conservative V8.5 gate requirements.
func BuildReadiness(input DashboardInput) DashboardReadiness {
	input = normalizeInput(input)
	mutable := isMutableOperation(input.Operation)
	return DashboardReadiness{
		DryRun:                  true,
		ReadOnly:                true,
		Version:                 Version,
		PassGoldRequired:        true,
		PassSecureRequired:      true,
		VisualDiffRequired:      hasUIFiles(input.Files),
		CostGuardRequired:       mutable || providerNeedsCostGuard(input.Provider, input.Model),
		DryRunRequired:          mutable,
		GraphContextRecommended: operationNeedsGraph(input.Operation),
		PromotionAllowed:        false,
		DeployAllowed:           false,
		MutationAllowed:         false,
	}
}

// SummarizeIntelligence produces a structured executive summary.
func SummarizeIntelligence(input DashboardInput) IntelligenceSummary {
	snap := BuildSnapshot(input)
	return IntelligenceSummary{
		DryRun:           true,
		ReadOnly:         true,
		Version:          Version,
		ExecutiveSummary: fmt.Sprintf("V8.5 dashboard is read-only/dry-run; system remains %s with %s risk until PASS GOLD and PASS SECURE are real.", snap.SystemStatus, snap.RiskLevel),
		CurrentState:     fmt.Sprintf("operation=%q mission=%q promotion/deploy/status/mutation are all blocked in MCP.", snap.Operation, snap.MissionInput),
		TopRisks:         topRisks(snap),
		SafestNextSteps:  append([]string{}, snap.NextActions...),
		BlockedActions:   []string{"apply_patch", "write_file", "commit", "push", "open_pr", "publish_status", "run_mission_real", "rollback", "deploy"},
		GatesToPass:      append([]string{}, snap.RequiredGates...),
	}
}

// BuildToolInventory returns the static read-only MCP inventory known to V8.5.
func BuildToolInventory() ToolInventory {
	return ToolInventory{
		DryRun:   true,
		ReadOnly: true,
		Version:  Version,
		GraphTools: []string{
			"vision.project_summary", "vision.graph_query", "vision.graph_summary", "vision.graph_providers", "vision.graph_provider_status", "vision.graph_impact_query", "vision.graph_dry_run_context",
		},
		DryRunTools: []string{
			"vision.dry_run_apply_patch", "vision.dry_run_write_file", "vision.dry_run_github_flow", "vision.dry_run_mission", "vision.dry_run_risk_assessment",
		},
		CodeBurnTools: []string{
			"vision.codeburn_estimate", "vision.codeburn_policy_check", "vision.codeburn_budget_plan", "vision.codeburn_guard_status", "vision.codeburn_explain",
		},
		ImpeccableTools: []string{
			"vision.impeccable_ui_risk", "vision.impeccable_file_classify", "vision.impeccable_visual_gate_plan", "vision.impeccable_guard_status", "vision.impeccable_explain",
		},
		DashboardTools: []string{
			"vision.dashboard_snapshot", "vision.dashboard_readiness", "vision.dashboard_intelligence_summary", "vision.dashboard_tool_inventory", "vision.dashboard_mission_control",
		},
		BlockedMutatingTools: []string{
			"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy",
		},
	}
}

// BuildMissionControl returns the future UI aggregate orbit.
func BuildMissionControl(input DashboardInput) MissionControl {
	snap := BuildSnapshot(input)
	modules := []MissionControlModule{
		module("GraphMemory", moduleStatusFromSection(snap.GraphStatus), snap.GraphStatus.Summary),
		module("MCPReadOnly", "ready", snap.MCPStatus.Summary),
		module("DryRun", moduleStatusFromSection(snap.DryRunStatus), snap.DryRunStatus.Summary),
		module("CodeBurn", moduleStatusFromSection(snap.CodeBurnStatus), snap.CodeBurnStatus.Summary),
		module("Impeccable", moduleStatusFromSection(snap.ImpeccableStatus), snap.ImpeccableStatus.Summary),
		module("PASS_GOLD", "unknown", snap.PassGoldStatus.Summary),
		module("PASS_SECURE", "unknown", snap.PassSecureStatus.Summary),
	}
	return MissionControl{
		DryRun:        true,
		ReadOnly:      true,
		Version:       Version,
		Modules:       modules,
		OverallStatus: "blocked_until_pass_gold_and_pass_secure",
		RequiredGates: append([]string{}, snap.RequiredGates...),
	}
}

func buildGraphSection(input DashboardInput) DashboardSection {
	if !input.IncludeGraph {
		return section("GraphMemory", "recommended", RiskMedium, "Graph Memory context was not requested.", []string{"include_graph=false"}, []string{"enable graph context for mission/patch/github_flow planning"})
	}
	if input.Root == "" {
		return section("GraphMemory", "recommended", RiskMedium, "Graph Memory root was not provided.", []string{"cannot locate graph index without root"}, []string{"run graph-index or provide root"})
	}
	sum, err := graphmemory.Summary(input.Root)
	if err != nil {
		return section("GraphMemory", "recommended", RiskMedium, "Graph Memory index is unavailable; dashboard continues without failing.", []string{err.Error()}, []string{"run graph-index"})
	}
	return section("GraphMemory", "ready", RiskLow, "Graph Memory summary is available in read-only mode.", []string{fmt.Sprintf("nodes=%d edges=%d", sum.TotalNodes, sum.TotalEdges)}, []string{"use graph context to scope dry-run planning"})
}

func buildReportSection(input DashboardInput) DashboardSection {
	if !input.IncludeReports {
		return section("Reports", "recommended", RiskLow, "Report index was not requested.", []string{"include_reports=false"}, []string{"include reports when audit history matters"})
	}
	idx, err := report.ListEntries(input.Root, report.DefaultReportDir, 5)
	if err != nil {
		return section("Reports", "recommended", RiskLow, "Report index is unavailable; dashboard continues without failing.", []string{err.Error()}, []string{"create reports through approved dry-run/report flows when needed"})
	}
	if len(idx.Entries) == 0 {
		return section("Reports", "recommended", RiskLow, "No report index entries were found.", []string{"reports_absent"}, []string{"optional: inspect reports after safe dry-runs"})
	}
	return section("Reports", "ready", RiskLow, "Report index entries are available.", []string{fmt.Sprintf("entries=%d", len(idx.Entries))}, []string{"use get_report for index-only report metadata"})
}

func buildDryRunSection(input DashboardInput) (DashboardSection, string, int, bool, []string) {
	result := dryrun.DryRunRiskAssessment(dryrun.RiskAssessmentInput{Files: input.Files, Operation: safeDryRunOperation(input.Operation), Description: input.MissionInput})
	findings := append([]string{}, result.ValidationHints...)
	findings = append(findings, result.SecurityHints...)
	findings = append(findings, result.BlockedReasons...)
	if len(findings) == 0 {
		findings = append(findings, "dry-run risk assessment did not report elevated findings")
	}
	return section("DryRun", statusFromBlocked(result.Blocked), string(result.RiskLevel), "DryRun risk assessment completed without real mutation.", findings, []string{"keep all patch/write/mission/github_flow actions simulated"}), string(result.RiskLevel), result.RiskScore, result.Blocked, result.BlockedReasons
}

func buildCodeBurnSection(input DashboardInput) (DashboardSection, string, int, bool, []string) {
	estimate := codeburn.PolicyCheck(codeburn.EstimateInput{Operation: input.Operation, MissionInput: input.MissionInput, Files: input.Files, Provider: input.Provider, Model: input.Model, MaxEstimatedCostUSD: 1.00})
	findings := append([]string{}, estimate.AuditNotes...)
	findings = append(findings, estimate.BlockedReasons...)
	if estimate.EstimatedCostUSD == 0 {
		findings = append(findings, "estimated_cost_usd=0")
	}
	return section("CodeBurn", statusFromBlocked(estimate.Blocked), estimate.RiskLevel, "CodeBurn policy checked cost and paid-provider exposure without external calls.", findings, estimate.SafePath), estimate.RiskLevel, riskScore(estimate.RiskLevel), estimate.Blocked, estimate.BlockedReasons
}

func buildImpeccableSection(input DashboardInput) (DashboardSection, string, int, bool, []string) {
	ui := impeccable.AnalyzeUIRisk(impeccable.UIInput{Root: input.Root, Operation: input.Operation, Files: input.Files, Route: input.Route, Viewport: input.Viewport, Description: input.MissionInput})
	findings := []string{}
	for _, f := range ui.Findings {
		findings = append(findings, f.Message)
	}
	findings = append(findings, ui.RequiredGates...)
	findings = append(findings, ui.BlockedReasons...)
	if len(findings) == 0 {
		findings = append(findings, "no elevated visual risk signals detected")
	}
	recs := []string{}
	for _, r := range ui.Recommendations {
		recs = append(recs, r.Action)
	}
	return section("Impeccable", statusFromBlocked(ui.Blocked), ui.RiskLevel, "Impeccable evaluated UI/visual gate requirements without browser or screenshot execution.", findings, recs), ui.RiskLevel, ui.RiskScore, ui.Blocked, ui.BlockedReasons
}

func section(name, status, risk, summary string, findings, recommendations []string) DashboardSection {
	return DashboardSection{Name: name, Status: status, RiskLevel: risk, Summary: summary, Findings: uniqueStrings(findings), Recommendations: uniqueStrings(recommendations)}
}

func module(name, status, summary string) MissionControlModule {
	return MissionControlModule{Name: name, Status: status, ReadOnly: true, MutationAllowed: false, Summary: summary}
}

func normalizeInput(input DashboardInput) DashboardInput {
	input.Operation = strings.ToLower(strings.TrimSpace(input.Operation))
	input.Provider = strings.ToLower(strings.TrimSpace(input.Provider))
	input.Model = strings.ToLower(strings.TrimSpace(input.Model))
	if input.Operation == "" {
		input.Operation = "inspect"
	}
	if input.Provider == "" {
		input.Provider = "local"
	}
	if input.Model == "" {
		input.Model = "offline"
	}
	return input
}

func safeDryRunOperation(operation string) string {
	switch operation {
	case "patch", "write", "github_flow", "mission", "deploy":
		return operation
	case "apply_patch":
		return "patch"
	case "write_file":
		return "write"
	case "run_mission_real":
		return "mission"
	default:
		return "mission"
	}
}

func isMutableOperation(operation string) bool {
	switch strings.ToLower(strings.TrimSpace(operation)) {
	case "patch", "apply_patch", "write", "write_file", "mission", "github_flow", "commit", "push", "open_pr", "publish_status", "run_mission_real", "rollback", "deploy":
		return true
	default:
		return false
	}
}

func operationNeedsGraph(operation string) bool {
	switch strings.ToLower(strings.TrimSpace(operation)) {
	case "mission", "patch", "apply_patch", "github_flow", "run_mission_real":
		return true
	default:
		return false
	}
}

func hasUIFiles(files []string) bool {
	for _, f := range files {
		lower := strings.ToLower(strings.TrimSpace(f))
		if strings.Contains(lower, "frontend/") || strings.Contains(lower, "/ui/") || strings.Contains(lower, "web/") || strings.Contains(lower, "app/") || strings.HasSuffix(lower, ".html") || strings.HasSuffix(lower, ".css") || strings.HasSuffix(lower, ".scss") || strings.HasSuffix(lower, ".tsx") || strings.HasSuffix(lower, ".jsx") || strings.HasSuffix(lower, ".vue") || strings.HasSuffix(lower, ".svelte") {
			return true
		}
	}
	return false
}

func providerNeedsCostGuard(provider, model string) bool {
	provider = strings.ToLower(strings.TrimSpace(provider))
	model = strings.ToLower(strings.TrimSpace(model))
	return !isLocalOffline(provider, model)
}

func isLocalOffline(provider, model string) bool {
	provider = strings.ToLower(strings.TrimSpace(provider))
	model = strings.ToLower(strings.TrimSpace(model))
	return provider == "" || provider == "local" || provider == "offline" || model == "offline"
}

func statusFromBlocked(blocked bool) string {
	if blocked {
		return "blocked"
	}
	return "ready"
}

func moduleStatusFromSection(s DashboardSection) string {
	if s.Status == "ready" || s.Status == "blocked" || s.Status == "recommended" || s.Status == "unknown" {
		return s.Status
	}
	return "unknown"
}

func topRisks(snap DashboardSnapshot) []string {
	risks := []string{"PASS GOLD evidence is unknown", "PASS SECURE evidence is unknown"}
	risks = append(risks, snap.BlockedReasons...)
	if containsString(snap.RequiredGates, "VISUAL_DIFF_REQUIRED") {
		risks = append(risks, "UI/frontend changes require visual diff evidence")
	}
	if containsString(snap.RequiredGates, "CODEBURN_REQUIRED") {
		risks = append(risks, "operation requires cost guard confirmation")
	}
	return uniqueStrings(risks)
}

func maxRisk(risks ...string) string {
	max := RiskLow
	for _, r := range risks {
		if riskScore(r) > riskScore(max) {
			max = r
		}
	}
	return max
}

func riskScore(risk string) int {
	switch strings.ToLower(risk) {
	case RiskLow:
		return 15
	case RiskMedium:
		return 40
	case RiskHigh:
		return 75
	case RiskCritical:
		return 100
	default:
		return 50
	}
}

func maxInt(values ...int) int {
	m := 0
	for _, v := range values {
		if v > m {
			m = v
		}
	}
	return m
}

func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func uniqueStrings(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	return out
}

func containsString(values []string, want string) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}
	return false
}
