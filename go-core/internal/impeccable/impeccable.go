// Package impeccable implements V8.4 Impeccable UI Guard.
//
// Impeccable is intentionally read-only and dry-run only: it estimates visual,
// UX, accessibility, routing, and frontend regression risk without patching,
// writing files, running browsers, taking screenshots, executing Playwright,
// deploying, publishing status, or calling external services.
package impeccable

import (
	"fmt"
	"path/filepath"
	"strings"
)

const Version = "V8.4"

const (
	RiskLow      = "low"
	RiskMedium   = "medium"
	RiskHigh     = "high"
	RiskCritical = "critical"
)

// UIInput is the common Impeccable input accepted by risk, gate plan, and explain flows.
type UIInput struct {
	Root             string   `json:"root,omitempty"`
	Files            []string `json:"files"`
	Operation        string   `json:"operation"`
	Description      string   `json:"description"`
	Viewport         string   `json:"viewport"`
	Route            string   `json:"route"`
	Framework        string   `json:"framework"`
	ChangedLines     []string `json:"changed_lines,omitempty"`
	AllowDynamicScan bool     `json:"allow_dynamic_scan,omitempty"`
}

// UIEstimate is a read-only dry-run UI risk decision.
type UIEstimate struct {
	Version         string             `json:"version"`
	DryRun          bool               `json:"dry_run"`
	ReadOnly        bool               `json:"read_only"`
	Operation       string             `json:"operation"`
	Files           []string           `json:"files"`
	Route           string             `json:"route"`
	Viewport        string             `json:"viewport"`
	Framework       string             `json:"framework"`
	RiskLevel       string             `json:"risk_level"`
	RiskScore       int                `json:"risk_score"`
	Blocked         bool               `json:"blocked"`
	BlockedReasons  []string           `json:"blocked_reasons"`
	Findings        []UIFinding        `json:"findings"`
	Recommendations []UIRecommendation `json:"recommendations"`
	RequiredGates   []string           `json:"required_gates"`
}

// UIFinding describes a UI guard heuristic hit.
type UIFinding struct {
	Category    string `json:"category"`
	Severity    string `json:"severity"`
	File        string `json:"file,omitempty"`
	RuleID      string `json:"rule_id"`
	Message     string `json:"message"`
	Remediation string `json:"remediation"`
}

// UIRecommendation is an advisory read-only next step.
type UIRecommendation struct {
	Action   string `json:"action"`
	Reason   string `json:"reason"`
	Priority string `json:"priority"`
}

// FileClassificationResult groups paths by Impeccable UI risk class.
type FileClassificationResult struct {
	DryRun         bool        `json:"dry_run"`
	ReadOnly       bool        `json:"read_only"`
	Version        string      `json:"version"`
	UIFiles        []string    `json:"ui_files"`
	RoutingFiles   []string    `json:"routing_files"`
	BackendFiles   []string    `json:"backend_files"`
	DangerousFiles []string    `json:"dangerous_files"`
	Findings       []UIFinding `json:"findings"`
	Blocked        bool        `json:"blocked"`
	RiskLevel      string      `json:"risk_level"`
}

// VisualGatePlan is an advisory plan; commands are suggested but never executed.
type VisualGatePlan struct {
	DryRun            bool               `json:"dry_run"`
	ReadOnly          bool               `json:"read_only"`
	Version           string             `json:"version"`
	RequiredChecks    []string           `json:"required_checks"`
	CommandsSuggested []string           `json:"commands_suggested"`
	CommandsExecuted  bool               `json:"commands_executed"`
	Blocked           bool               `json:"blocked"`
	Recommendations   []UIRecommendation `json:"recommendations"`
	RequiredGates     []string           `json:"required_gates"`
}

// GuardStatusResult reports Impeccable's immutable read-only guard posture.
type GuardStatusResult struct {
	DryRun                  bool     `json:"dry_run"`
	ReadOnly                bool     `json:"read_only"`
	Version                 string   `json:"version"`
	Enabled                 bool     `json:"enabled"`
	Name                    string   `json:"name"`
	BrowserExecutionAllowed bool     `json:"browser_execution_allowed"`
	ScreenshotsAllowed      bool     `json:"screenshots_allowed"`
	MutationsAllowed        bool     `json:"mutations_allowed"`
	DeployAllowed           bool     `json:"deploy_allowed"`
	ExternalCallsAllowed    bool     `json:"external_calls_allowed"`
	RequiredGates           []string `json:"required_gates"`
}

// ExplainInput carries an optional estimate-like object.
type ExplainInput struct {
	Estimate UIEstimate `json:"estimate"`
}

// ExplainResult summarizes a UI risk decision and safe path.
type ExplainResult struct {
	DryRun           bool     `json:"dry_run"`
	ReadOnly         bool     `json:"read_only"`
	Version          string   `json:"version"`
	Summary          string   `json:"summary"`
	WhyRisky         []string `json:"why_risky"`
	CheapestSafePath []string `json:"cheapest_safe_path"`
	RequiredGates    []string `json:"required_gates"`
}

// AnalyzeUIRisk estimates UI risk using only local strings, paths, route, and viewport heuristics.
func AnalyzeUIRisk(input UIInput) UIEstimate {
	findings := ClassifyUIFiles(input.Files)
	gates := []string{"PASS_GOLD", "PASS_SECURE"}
	recommendations := []UIRecommendation{
		{Action: "keep Impeccable in read-only dry-run mode", Reason: "UI guard must not patch, browse, screenshot, deploy, or publish status", Priority: "required"},
	}
	score := 15
	blocked := false
	blockedReasons := []string{}
	uiImpacting := false
	routingImpacting := false
	buildImpacting := false
	backendOnly := len(input.Files) > 0

	if len(input.Files) == 0 {
		score = 45
		recommendations = append(recommendations, UIRecommendation{Action: "provide changed files", Reason: "UI risk can only be estimated from supplied paths and metadata in dry-run mode", Priority: "high"})
	}

	for _, f := range findings {
		switch f.Category {
		case "ui":
			uiImpacting = true
			backendOnly = false
			score = max(score, severityScore(f.Severity))
		case "routing":
			routingImpacting = true
			backendOnly = false
			score = max(score, severityScore(f.Severity))
		case "build":
			buildImpacting = true
			backendOnly = false
			score = max(score, severityScore(f.Severity))
		case "dangerous":
			blocked = true
			backendOnly = false
			score = max(score, severityScore(f.Severity))
			blockedReasons = append(blockedReasons, f.Message)
		case "api_contract":
			backendOnly = false
			score = max(score, severityScore(f.Severity))
		}
	}

	if backendOnly && len(input.Files) > 0 {
		score = min(score, 25)
	}
	if uiImpacting {
		gates = append(gates, "VISUAL_DIFF_REQUIRED", "ACCESSIBILITY_CHECK_RECOMMENDED")
		recommendations = append(recommendations,
			UIRecommendation{Action: "run visual diff before release", Reason: "frontend-impacting files can introduce layout, overflow, contrast, or component regressions", Priority: "high"},
			UIRecommendation{Action: "run accessibility and contrast checks", Reason: "static path heuristics cannot prove visual accessibility", Priority: "medium"},
		)
	}
	if routingImpacting {
		gates = append(gates, "ROUTING_CHECK_REQUIRED")
		recommendations = append(recommendations, UIRecommendation{Action: "verify route loading and headers/proxy behavior", Reason: "routing, headers, workers, CORS, CSP, or proxy changes can break UI runtime loading", Priority: "high"})
	}
	if buildImpacting {
		gates = append(gates, "BUILD_CHECK_REQUIRED")
		recommendations = append(recommendations, UIRecommendation{Action: "run frontend build in the release pipeline", Reason: "dependency and build config changes can break generated UI assets", Priority: "high"})
	}
	if isMobile(input.Viewport) {
		score = max(score+10, 55)
		gates = append(gates, "MOBILE_VIEWPORT_VALIDATION_REQUIRED")
		recommendations = append(recommendations, UIRecommendation{Action: "validate mobile viewport, overflow, and tap targets", Reason: "mobile viewport increases layout and interaction regression risk", Priority: "high"})
	}
	if isCriticalRoute(input.Route) {
		score = max(score+10, 60)
		gates = append(gates, "CRITICAL_ROUTE_LOAD_REQUIRED")
		recommendations = append(recommendations, UIRecommendation{Action: "verify critical route loads without console errors", Reason: fmt.Sprintf("route %q is treated as user-critical", input.Route), Priority: "high"})
	}
	if mentionsRoutingRisk(input.Description) || mentionsRoutingRisk(strings.Join(input.ChangedLines, "\n")) || mentionsRoutingRisk(input.Operation) {
		score = max(score, 65)
		gates = append(gates, "ROUTING_CHECK_REQUIRED")
		recommendations = append(recommendations, UIRecommendation{Action: "validate API/SSE/CORS/CSP contract", Reason: "input mentions runtime UI integration risk", Priority: "high"})
	}
	if blocked {
		score = max(score, 95)
	}
	score = clamp(score, 0, 100)

	return UIEstimate{
		Version:         Version,
		DryRun:          true,
		ReadOnly:        true,
		Operation:       input.Operation,
		Files:           append([]string{}, input.Files...),
		Route:           input.Route,
		Viewport:        input.Viewport,
		Framework:       input.Framework,
		RiskLevel:       riskLevel(score),
		RiskScore:       score,
		Blocked:         blocked,
		BlockedReasons:  dedupe(blockedReasons),
		Findings:        findings,
		Recommendations: dedupeRecommendations(recommendations),
		RequiredGates:   dedupe(gates),
	}
}

// ClassifyUIFiles classifies paths using deterministic local heuristics only.
func ClassifyUIFiles(files []string) []UIFinding {
	findings := []UIFinding{}
	for _, raw := range files {
		file := strings.TrimSpace(filepath.ToSlash(raw))
		if file == "" {
			continue
		}
		lower := strings.ToLower(file)
		base := strings.ToLower(filepath.Base(lower))
		if isDangerousPath(lower) {
			findings = append(findings, UIFinding{Category: "dangerous", Severity: RiskCritical, File: raw, RuleID: "IMPECCABLE_DANGEROUS_PATH", Message: "dangerous UI path or sensitive file is blocked", Remediation: "remove path traversal, secrets, .env, .git, node_modules, dist/build/cache, or credential paths from the UI change set"})
			continue
		}
		if isRoutingFile(lower, base) || mentionsRoutingRisk(lower) {
			findings = append(findings, UIFinding{Category: "routing", Severity: RiskHigh, File: raw, RuleID: "IMPECCABLE_ROUTING_RUNTIME", Message: "routing or UI runtime configuration can affect route loading, CSP, CORS, proxy, worker, or SSE behavior", Remediation: "run routing checks and verify affected UI routes before PASS GOLD"})
			continue
		}
		if isBuildConfig(lower, base) {
			findings = append(findings, UIFinding{Category: "build", Severity: RiskMedium, File: raw, RuleID: "IMPECCABLE_BUILD_DEPENDENCY", Message: "frontend build or dependency configuration can change generated UI behavior", Remediation: "run build, dependency review, and visual smoke checks"})
			continue
		}
		if isUIPath(lower) || isUIExtension(lower) {
			findings = append(findings, UIFinding{Category: "ui", Severity: RiskMedium, File: raw, RuleID: "IMPECCABLE_UI_IMPACT", Message: "frontend-impacting file can affect visual layout, UX, contrast, overflow, or accessibility", Remediation: "run visual diff and accessibility checks before release"})
			continue
		}
		if isAPIContract(lower) {
			findings = append(findings, UIFinding{Category: "api_contract", Severity: RiskMedium, File: raw, RuleID: "IMPECCABLE_API_CONTRACT", Message: "backend API/MCP contract may indirectly affect frontend runtime behavior", Remediation: "verify UI consumers, SSE/API contract, and route data loading"})
			continue
		}
		findings = append(findings, UIFinding{Category: "backend", Severity: RiskLow, File: raw, RuleID: "IMPECCABLE_BACKEND_ONLY", Message: "backend-only path has low direct visual UI risk", Remediation: "run normal backend tests and verify API contract if consumed by UI"})
	}
	return findings
}

// ClassifyUIFileSet returns grouped file classification for MCP output.
func ClassifyUIFileSet(files []string) FileClassificationResult {
	result := FileClassificationResult{DryRun: true, ReadOnly: true, Version: Version, UIFiles: []string{}, RoutingFiles: []string{}, BackendFiles: []string{}, DangerousFiles: []string{}, Findings: []UIFinding{}, RiskLevel: RiskLow}
	result.Findings = ClassifyUIFiles(files)
	maxScore := 15
	for _, finding := range result.Findings {
		switch finding.Category {
		case "ui":
			result.UIFiles = append(result.UIFiles, finding.File)
		case "routing":
			result.RoutingFiles = append(result.RoutingFiles, finding.File)
		case "dangerous":
			result.DangerousFiles = append(result.DangerousFiles, finding.File)
			result.Blocked = true
		case "backend", "api_contract":
			result.BackendFiles = append(result.BackendFiles, finding.File)
		case "build":
			result.UIFiles = append(result.UIFiles, finding.File)
		}
		maxScore = max(maxScore, severityScore(finding.Severity))
	}
	if result.Blocked {
		maxScore = 95
	}
	result.RiskLevel = riskLevel(maxScore)
	return result
}

// BuildVisualGatePlan returns an advisory plan and never executes commands.
func BuildVisualGatePlan(input UIInput) VisualGatePlan {
	est := AnalyzeUIRisk(input)
	checks := []string{"unit_tests", "build", "visual_diff", "mobile_viewport", "accessibility_contrast", "overflow", "console_errors", "route_load"}
	if needsRuntimeContract(input, est) {
		checks = append(checks, "sse_api_runtime_contract")
	}
	commands := []string{"go test ./...", "go build ./cmd/vision-core", "npm run build", "npx playwright test --project=chromium"}
	return VisualGatePlan{
		DryRun:            true,
		ReadOnly:          true,
		Version:           Version,
		RequiredChecks:    dedupe(checks),
		CommandsSuggested: commands,
		CommandsExecuted:  false,
		Blocked:           est.Blocked,
		Recommendations:   est.Recommendations,
		RequiredGates:     est.RequiredGates,
	}
}

// GuardStatus returns immutable guard permissions.
func GuardStatus() GuardStatusResult {
	return GuardStatusResult{DryRun: true, ReadOnly: true, Version: Version, Enabled: true, Name: "Impeccable UI Guard", BrowserExecutionAllowed: false, ScreenshotsAllowed: false, MutationsAllowed: false, DeployAllowed: false, ExternalCallsAllowed: false, RequiredGates: []string{"PASS_GOLD", "PASS_SECURE"}}
}

// ExplainUIRisk summarizes an estimate and the cheapest safe path.
func ExplainUIRisk(input ExplainInput) ExplainResult {
	est := input.Estimate
	risk := est.RiskLevel
	if risk == "" {
		risk = RiskMedium
	}
	gates := est.RequiredGates
	if len(gates) == 0 {
		gates = []string{"PASS_GOLD", "PASS_SECURE"}
	}
	why := append([]string{}, est.BlockedReasons...)
	for _, f := range est.Findings {
		why = append(why, f.Message)
	}
	if len(why) == 0 {
		why = append(why, "UI risk is estimated from supplied files, route, viewport, operation, and description only")
	}
	summary := fmt.Sprintf("Impeccable UI Guard estimated %s visual risk in read-only dry-run mode.", risk)
	if est.Blocked {
		summary = fmt.Sprintf("Impeccable UI Guard blocked the request at %s visual risk.", risk)
	}
	return ExplainResult{DryRun: true, ReadOnly: true, Version: Version, Summary: summary, WhyRisky: dedupe(why), CheapestSafePath: defaultSafePath(gates), RequiredGates: dedupe(gates)}
}

func defaultSafePath(gates []string) []string {
	path := []string{"keep MCP analysis read-only and dry-run only", "review changed frontend/routing/build paths", "run unit tests and build outside the MCP tool", "run visual diff and mobile viewport checks for UI-impacting files", "run accessibility/contrast and console-error checks", "require PASS_GOLD and PASS_SECURE before any real promotion, deploy, status publication, or stable learning"}
	if contains(gates, "ROUTING_CHECK_REQUIRED") {
		path = append(path, "verify route loading plus CSP/CORS/proxy/SSE/API runtime contract")
	}
	return path
}

func isDangerousPath(lower string) bool {
	clean := filepath.ToSlash(filepath.Clean(lower))
	return strings.Contains(lower, "..") || strings.HasPrefix(clean, "../") || clean == ".env" || strings.HasSuffix(clean, "/.env") || strings.Contains(lower, "secret") || strings.Contains(lower, "credential") || strings.Contains(lower, ".git") || strings.Contains(lower, "node_modules/") || strings.Contains(lower, "/dist/") || strings.HasPrefix(lower, "dist/") || strings.Contains(lower, "/build/") || strings.HasPrefix(lower, "build/") || strings.Contains(lower, "/cache/") || strings.HasPrefix(lower, "cache/")
}

func isUIExtension(lower string) bool {
	switch filepath.Ext(lower) {
	case ".html", ".css", ".scss", ".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte":
		return true
	default:
		return false
	}
}

func isUIPath(lower string) bool {
	parts := strings.Split(lower, "/")
	for _, p := range parts {
		switch p {
		case "frontend", "app", "pages", "src", "public", "components", "styles":
			return true
		}
	}
	return false
}

func isRoutingFile(lower, base string) bool {
	return base == "_headers" || base == "_redirects" || base == "wrangler.toml" || strings.Contains(lower, "worker") || strings.Contains(lower, "proxy") || strings.Contains(lower, "cloudflare")
}

func isBuildConfig(lower, base string) bool {
	return base == "package.json" || strings.HasSuffix(base, "lock") || strings.Contains(base, "lock.json") || strings.Contains(base, "lock.yaml") || strings.Contains(base, "vite.config") || strings.Contains(base, "tailwind.config")
}

func mentionsRoutingRisk(s string) bool {
	lower := strings.ToLower(s)
	for _, needle := range []string{"_headers", "_redirects", "csp", "worker", "proxy", "api_base", "sse", "cors", "cloudflare"} {
		if strings.Contains(lower, needle) {
			return true
		}
	}
	return false
}

func isAPIContract(lower string) bool {
	return strings.HasPrefix(lower, "go-core/") && (strings.Contains(lower, "/mcpserver/") || strings.Contains(lower, "/api") || strings.Contains(lower, "contract"))
}

func isMobile(viewport string) bool {
	lower := strings.ToLower(viewport)
	return strings.Contains(lower, "mobile") || strings.Contains(lower, "iphone") || strings.Contains(lower, "android") || strings.Contains(lower, "375") || strings.Contains(lower, "390")
}

func isCriticalRoute(route string) bool {
	switch strings.TrimSpace(strings.ToLower(route)) {
	case "/", "/dashboard", "/mission", "/chat", "/agents", "/metrics":
		return true
	default:
		return false
	}
}

func needsRuntimeContract(input UIInput, est UIEstimate) bool {
	if mentionsRoutingRisk(input.Description) || mentionsRoutingRisk(input.Operation) || mentionsRoutingRisk(strings.Join(input.ChangedLines, "\n")) {
		return true
	}
	for _, f := range est.Findings {
		if f.Category == "routing" || f.Category == "api_contract" {
			return true
		}
	}
	return false
}

func severityScore(severity string) int {
	switch severity {
	case RiskCritical:
		return 95
	case RiskHigh:
		return 75
	case RiskMedium:
		return 55
	default:
		return 20
	}
}

func riskLevel(score int) string {
	switch {
	case score >= 90:
		return RiskCritical
	case score >= 70:
		return RiskHigh
	case score >= 35:
		return RiskMedium
	default:
		return RiskLow
	}
}

func dedupe(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, v := range in {
		v = strings.TrimSpace(v)
		if v == "" || seen[v] {
			continue
		}
		seen[v] = true
		out = append(out, v)
	}
	return out
}

func dedupeRecommendations(in []UIRecommendation) []UIRecommendation {
	seen := map[string]bool{}
	out := []UIRecommendation{}
	for _, v := range in {
		key := v.Action + "\x00" + v.Reason
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, v)
	}
	return out
}

func contains(in []string, want string) bool {
	for _, v := range in {
		if v == want {
			return true
		}
	}
	return false
}

func clamp(v, low, high int) int { return max(low, min(high, v)) }
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
