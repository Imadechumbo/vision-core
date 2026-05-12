// Package codeburn implements V8.3 CodeBurn Cost Guard.
//
// CodeBurn is intentionally read-only and dry-run only: it estimates operational
// cost, checks local safety policy, and explains safe execution paths without
// running patches, writes, commits, pushes, PRs, deploys, status publication, or
// paid external calls.
package codeburn

import (
	"fmt"
	"math"
	"path/filepath"
	"sort"
	"strings"
)

const Version = "V8.3"

const (
	RiskLow      = "low"
	RiskMedium   = "medium"
	RiskHigh     = "high"
	RiskCritical = "critical"
)

var mutatingOperations = map[string]bool{
	"apply_patch":      true,
	"patch":            true,
	"write":            true,
	"write_file":       true,
	"commit":           true,
	"push":             true,
	"open_pr":          true,
	"publish_status":   true,
	"run_mission_real": true,
	"rollback":         true,
	"deploy":           true,
}

var paidProviderRatesPer1K = map[string]float64{
	"openai":    0.002,
	"anthropic": 0.003,
	"github":    0.001,
}

// EstimateInput is the common CodeBurn input accepted by estimate and policy_check.
type EstimateInput struct {
	Operation               string   `json:"operation"`
	MissionInput            string   `json:"mission_input"`
	Files                   []string `json:"files"`
	Commands                []string `json:"commands"`
	Provider                string   `json:"provider"`
	Model                   string   `json:"model"`
	EstimatedTokensIn       int      `json:"estimated_tokens_in"`
	EstimatedTokensOut      int      `json:"estimated_tokens_out"`
	EstimatedRuntimeSeconds int      `json:"estimated_runtime_seconds"`
	MaxFiles                int      `json:"max_files"`
	MaxCommands             int      `json:"max_commands"`
	MaxTokens               int      `json:"max_tokens"`
	MaxRuntimeSeconds       int      `json:"max_runtime_seconds"`
	MaxEstimatedCostUSD     float64  `json:"max_estimated_cost_usd"`
	RequireKnownProvider    bool     `json:"require_known_provider"`
}

// EstimateResult is a read-only dry-run cost and safety decision.
type EstimateResult struct {
	DryRun                  bool     `json:"dry_run"`
	ReadOnly                bool     `json:"read_only"`
	Version                 string   `json:"version"`
	Operation               string   `json:"operation"`
	Provider                string   `json:"provider"`
	Model                   string   `json:"model"`
	EstimatedTokensIn       int      `json:"estimated_tokens_in"`
	EstimatedTokensOut      int      `json:"estimated_tokens_out"`
	EstimatedTokensTotal    int      `json:"estimated_tokens_total"`
	EstimatedRuntimeSeconds int      `json:"estimated_runtime_seconds"`
	EstimatedCostUSD        float64  `json:"estimated_cost_usd"`
	RiskLevel               string   `json:"risk_level"`
	Blocked                 bool     `json:"blocked"`
	BlockedReasons          []string `json:"blocked_reasons"`
	AuditNotes              []string `json:"audit_notes"`
	SafePath                []string `json:"safe_path"`
}

// GuardStatusResult reports CodeBurn's immutable read-only guard posture.
type GuardStatusResult struct {
	DryRun              bool     `json:"dry_run"`
	ReadOnly            bool     `json:"read_only"`
	Version             string   `json:"version"`
	Name                string   `json:"name"`
	Status              string   `json:"status"`
	PaidExternalCalls   bool     `json:"paid_external_calls"`
	MutationsAllowed    bool     `json:"mutations_allowed"`
	DeployAllowed       bool     `json:"deploy_allowed"`
	RequiresPassGold    bool     `json:"requires_pass_gold"`
	RequiresPassSecure  bool     `json:"requires_pass_secure"`
	BlockedRealActions  []string `json:"blocked_real_actions"`
	SupportedProviders  []string `json:"supported_providers"`
	DefaultSafeProvider string   `json:"default_safe_provider"`
	DefaultSafeModel    string   `json:"default_safe_model"`
}

// BudgetPlanInput asks CodeBurn for a cheap and safe read-only plan.
type BudgetPlanInput struct {
	MissionInput      string  `json:"mission_input"`
	BudgetUSD         float64 `json:"budget_usd"`
	PreferredProvider string  `json:"preferred_provider"`
	PreferredModel    string  `json:"preferred_model"`
	MaxSteps          int     `json:"max_steps"`
}

// BudgetPlanResult is a bounded read-only plan.
type BudgetPlanResult struct {
	DryRun              bool     `json:"dry_run"`
	ReadOnly            bool     `json:"read_only"`
	Version             string   `json:"version"`
	MissionInput        string   `json:"mission_input"`
	BudgetUSD           float64  `json:"budget_usd"`
	RecommendedProvider string   `json:"recommended_provider"`
	RecommendedModel    string   `json:"recommended_model"`
	EstimatedCostUSD    float64  `json:"estimated_cost_usd"`
	RiskLevel           string   `json:"risk_level"`
	Steps               []string `json:"steps"`
	Notes               []string `json:"notes"`
}

// ExplainInput carries an arbitrary estimate-like object.
type ExplainInput struct {
	Estimate EstimateResult `json:"estimate"`
}

// ExplainResult summarizes a CodeBurn decision and safe path.
type ExplainResult struct {
	DryRun         bool     `json:"dry_run"`
	ReadOnly       bool     `json:"read_only"`
	Version        string   `json:"version"`
	Summary        string   `json:"summary"`
	Blocked        bool     `json:"blocked"`
	RiskLevel      string   `json:"risk_level"`
	Reasons        []string `json:"reasons"`
	SafePath       []string `json:"safe_path"`
	AuditRationale []string `json:"audit_rationale"`
}

func Estimate(input EstimateInput) EstimateResult {
	return evaluate(input)
}

func PolicyCheck(input EstimateInput) EstimateResult {
	result := evaluate(input)
	result.AuditNotes = append([]string{"policy_check mode: no execution, no mutation, no external paid call"}, result.AuditNotes...)
	return result
}

func GuardStatus() GuardStatusResult {
	return GuardStatusResult{
		DryRun:              true,
		ReadOnly:            true,
		Version:             Version,
		Name:                "CodeBurn Cost Guard",
		Status:              "active_read_only",
		PaidExternalCalls:   false,
		MutationsAllowed:    false,
		DeployAllowed:       false,
		RequiresPassGold:    true,
		RequiresPassSecure:  true,
		BlockedRealActions:  []string{"patch", "write", "commit", "push", "open_pr", "publish_status", "run_mission_real", "rollback", "deploy"},
		SupportedProviders:  []string{"local", "offline", "openai", "anthropic", "github"},
		DefaultSafeProvider: "local",
		DefaultSafeModel:    "offline",
	}
}

func BudgetPlan(input BudgetPlanInput) BudgetPlanResult {
	maxSteps := input.MaxSteps
	if maxSteps <= 0 || maxSteps > 8 {
		maxSteps = 5
	}
	provider := normalize(input.PreferredProvider)
	model := normalize(input.PreferredModel)
	if provider == "" || !isFreeProvider(provider, model) {
		provider = "local"
		model = "offline"
	}
	if model == "" {
		model = "offline"
	}
	steps := []string{
		"inspect context using read-only graph and report tools",
		"estimate files, commands, tokens, runtime, and cost before any action",
		"reject deploy/status/PR/push/write/patch/commit as real MCP mutations",
		"prefer local/offline analysis so estimated provider cost remains zero",
		"run tests only after PASS GOLD and PASS SECURE gates are available outside MCP",
		"prepare a human-reviewed remediation plan without promoting stable state",
		"stop if sensitive paths, traversal, or any budget limit is exceeded",
		"record audit notes in the dry-run response only",
	}
	if maxSteps < len(steps) {
		steps = steps[:maxSteps]
	}
	return BudgetPlanResult{
		DryRun:              true,
		ReadOnly:            true,
		Version:             Version,
		MissionInput:        input.MissionInput,
		BudgetUSD:           input.BudgetUSD,
		RecommendedProvider: provider,
		RecommendedModel:    model,
		EstimatedCostUSD:    0,
		RiskLevel:           RiskLow,
		Steps:               steps,
		Notes: []string{
			"budget plan is advisory and read-only",
			"local/offline provider keeps estimated external cost at 0",
			"no real patch, write, commit, push, PR, deploy, status publication, or paid call is performed",
		},
	}
}

func Explain(input ExplainInput) ExplainResult {
	est := input.Estimate
	risk := est.RiskLevel
	if risk == "" {
		risk = RiskLow
	}
	reasons := append([]string{}, est.BlockedReasons...)
	if len(reasons) == 0 && est.Blocked {
		reasons = append(reasons, "blocked by CodeBurn policy")
	}
	safePath := append([]string{}, est.SafePath...)
	if len(safePath) == 0 {
		safePath = defaultSafePath()
	}
	summary := "CodeBurn allows only read-only dry-run planning."
	if est.Blocked {
		summary = fmt.Sprintf("CodeBurn blocked the request at %s risk.", risk)
	} else {
		summary = fmt.Sprintf("CodeBurn estimated the request as %s risk within read-only dry-run limits.", risk)
	}
	return ExplainResult{
		DryRun:    true,
		ReadOnly:  true,
		Version:   Version,
		Summary:   summary,
		Blocked:   est.Blocked,
		RiskLevel: risk,
		Reasons:   reasons,
		SafePath:  safePath,
		AuditRationale: []string{
			"PASS GOLD and PASS SECURE are required before any non-MCP real mutation",
			"MCP control plane remains read-only and dry-run only",
			"unknown or paid providers are never called by CodeBurn",
		},
	}
}

func evaluate(input EstimateInput) EstimateResult {
	provider := normalize(input.Provider)
	model := normalize(input.Model)
	if provider == "" {
		provider = "local"
	}
	if model == "" {
		model = "offline"
	}
	operation := normalize(input.Operation)
	if operation == "" {
		operation = "inspect"
	}
	totalTokens := nonNegative(input.EstimatedTokensIn) + nonNegative(input.EstimatedTokensOut)
	cost, knownProvider, paidProvider := estimateCost(provider, model, totalTokens)
	risk := RiskLow
	reasons := []string{}
	audit := []string{"CodeBurn V8.3 evaluated request in dry-run/read-only mode"}

	if operation == "deploy" {
		reasons = append(reasons, "deploy is blocked by default")
		risk = maxRisk(risk, RiskHigh)
	} else if mutatingOperations[operation] {
		audit = append(audit, "operation is a mutation candidate and remains estimate-only")
		risk = maxRisk(risk, RiskMedium)
	}

	for _, f := range input.Files {
		pathRisk, pathReasons := assessPath(f)
		risk = maxRisk(risk, pathRisk)
		reasons = append(reasons, pathReasons...)
	}

	if input.MaxFiles > 0 && len(input.Files) > input.MaxFiles {
		reasons = append(reasons, fmt.Sprintf("file count %d exceeds max_files %d", len(input.Files), input.MaxFiles))
		risk = maxRisk(risk, RiskMedium)
	}
	if input.MaxCommands > 0 && len(input.Commands) > input.MaxCommands {
		reasons = append(reasons, fmt.Sprintf("command count %d exceeds max_commands %d", len(input.Commands), input.MaxCommands))
		risk = maxRisk(risk, RiskMedium)
	}
	if input.MaxTokens > 0 && totalTokens > input.MaxTokens {
		reasons = append(reasons, fmt.Sprintf("estimated tokens %d exceed max_tokens %d", totalTokens, input.MaxTokens))
		risk = maxRisk(risk, RiskHigh)
	}
	if input.MaxRuntimeSeconds > 0 && input.EstimatedRuntimeSeconds > input.MaxRuntimeSeconds {
		reasons = append(reasons, fmt.Sprintf("estimated runtime seconds %d exceed max_runtime_seconds %d", input.EstimatedRuntimeSeconds, input.MaxRuntimeSeconds))
		risk = maxRisk(risk, RiskHigh)
	}
	if input.MaxEstimatedCostUSD > 0 && cost > input.MaxEstimatedCostUSD {
		reasons = append(reasons, fmt.Sprintf("estimated cost %.6f exceeds max_estimated_cost_usd %.6f", cost, input.MaxEstimatedCostUSD))
		risk = maxRisk(risk, RiskHigh)
	}
	if !knownProvider {
		reasons = append(reasons, fmt.Sprintf("unknown provider %q is not allowed by CodeBurn policy", provider))
		risk = maxRisk(risk, RiskHigh)
	} else if paidProvider {
		audit = append(audit, fmt.Sprintf("provider %q is priced for estimation only; no external call was made", provider))
	}
	if input.RequireKnownProvider && !knownProvider {
		reasons = append(reasons, "known provider required by policy")
	}

	blocked := len(reasons) > 0 || risk == RiskCritical
	return EstimateResult{
		DryRun:                  true,
		ReadOnly:                true,
		Version:                 Version,
		Operation:               operation,
		Provider:                provider,
		Model:                   model,
		EstimatedTokensIn:       nonNegative(input.EstimatedTokensIn),
		EstimatedTokensOut:      nonNegative(input.EstimatedTokensOut),
		EstimatedTokensTotal:    totalTokens,
		EstimatedRuntimeSeconds: nonNegative(input.EstimatedRuntimeSeconds),
		EstimatedCostUSD:        roundUSD(cost),
		RiskLevel:               risk,
		Blocked:                 blocked,
		BlockedReasons:          reasons,
		AuditNotes:              audit,
		SafePath:                defaultSafePath(),
	}
}

func estimateCost(provider, model string, totalTokens int) (float64, bool, bool) {
	if provider == "local" || provider == "offline" {
		return 0, true, false
	}
	rate, ok := paidProviderRatesPer1K[provider]
	if !ok {
		return 0, false, false
	}
	if model == "offline" || model == "local" {
		return 0, true, false
	}
	return float64(totalTokens) / 1000 * rate, true, true
}

func isFreeProvider(provider, model string) bool {
	if provider == "local" || provider == "offline" {
		return true
	}
	_, knownPaidProvider := paidProviderRatesPer1K[provider]
	return knownPaidProvider && (model == "offline" || model == "local")
}

func assessPath(p string) (string, []string) {
	trimmed := strings.TrimSpace(p)
	if trimmed == "" {
		return RiskMedium, []string{"empty file path"}
	}
	norm := filepath.ToSlash(filepath.Clean(trimmed))
	if filepath.IsAbs(trimmed) || norm == ".." || strings.HasPrefix(norm, "../") || strings.Contains(norm, "/../") {
		return RiskCritical, []string{fmt.Sprintf("path traversal or absolute path blocked as critical: %q", p)}
	}
	parts := strings.Split(norm, "/")
	base := strings.ToLower(parts[len(parts)-1])
	if base == ".env" || strings.HasPrefix(base, ".env.") {
		return RiskCritical, []string{fmt.Sprintf("sensitive env file blocked as critical: %q", p)}
	}
	for _, part := range parts {
		lower := strings.ToLower(part)
		if lower == ".ssh" || lower == "secrets" || strings.Contains(lower, "credential") || strings.Contains(lower, "password") {
			return RiskCritical, []string{fmt.Sprintf("sensitive path blocked as critical: %q", p)}
		}
	}
	if strings.HasSuffix(base, ".pem") || strings.HasSuffix(base, ".key") {
		return RiskHigh, []string{fmt.Sprintf("sensitive key file blocked: %q", p)}
	}
	return RiskLow, nil
}

func defaultSafePath() []string {
	return []string{
		"stay in MCP read-only/dry-run mode",
		"use local/offline provider when possible",
		"reduce files, commands, tokens, runtime, or cost until limits pass",
		"require PASS GOLD and PASS SECURE before any real mutation outside MCP",
	}
}

func normalize(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func nonNegative(n int) int {
	if n < 0 {
		return 0
	}
	return n
}

func roundUSD(v float64) float64 {
	return math.Round(v*1_000_000) / 1_000_000
}

func maxRisk(a, b string) string {
	order := map[string]int{RiskLow: 0, RiskMedium: 1, RiskHigh: 2, RiskCritical: 3}
	if order[b] > order[a] {
		return b
	}
	return a
}

// RegisteredToolNames returns the V8.3 MCP tool names in stable order.
func RegisteredToolNames() []string {
	tools := []string{
		"vision.codeburn_estimate",
		"vision.codeburn_policy_check",
		"vision.codeburn_budget_plan",
		"vision.codeburn_guard_status",
		"vision.codeburn_explain",
	}
	sort.Strings(tools)
	return tools
}
