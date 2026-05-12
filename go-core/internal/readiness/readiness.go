// Package readiness implements the V8.9 Promotion Readiness Gate.
//
// The gate is intentionally read-only and dry-run only. It produces in-memory
// verdicts, validation, module summaries, audits, and explanations. It never
// promotes, deploys, publishes status, writes memory, executes commands, opens
// PRs, pushes, calls networks/APIs, or converts dry-run evidence into real
// PASS_GOLD/PASS_SECURE gates.
package readiness

import (
	"fmt"
	"sort"
	"strings"

	"github.com/visioncore/go-core/internal/evidenceledger"
)

const Version = "V8.9"

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var mutatingTools = map[string]bool{
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

// ReadinessInput is a flexible read-only request used by all V8.9 tools.
type ReadinessInput struct {
	Root                 string      `json:"root,omitempty"`
	MissionInput         string      `json:"mission_input,omitempty"`
	Operation            string      `json:"operation,omitempty"`
	Files                []string    `json:"files,omitempty"`
	Route                string      `json:"route,omitempty"`
	Viewport             string      `json:"viewport,omitempty"`
	Provider             string      `json:"provider,omitempty"`
	Model                string      `json:"model,omitempty"`
	Evidence             interface{} `json:"evidence,omitempty"`
	Evidences            interface{} `json:"evidences,omitempty"`
	PassGoldStatus       string      `json:"pass_gold_status,omitempty"`
	PassSecureStatus     string      `json:"pass_secure_status,omitempty"`
	IncludeGraph         bool        `json:"include_graph,omitempty"`
	IncludeDryRun        bool        `json:"include_dryrun,omitempty"`
	IncludeCodeBurn      bool        `json:"include_codeburn,omitempty"`
	IncludeImpeccable    bool        `json:"include_impeccable,omitempty"`
	IncludeDashboard     bool        `json:"include_dashboard,omitempty"`
	IncludePolicy        bool        `json:"include_policy,omitempty"`
	IncludeContracts     bool        `json:"include_contracts,omitempty"`
	IncludeEvidence      bool        `json:"include_evidence,omitempty"`
	Strict               bool        `json:"strict,omitempty"`
	Ready                bool        `json:"ready,omitempty"`
	PromotionAllowed     bool        `json:"promotion_allowed,omitempty"`
	DeployAllowed        bool        `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed bool        `json:"status_publish_allowed,omitempty"`
	MutationAllowed      bool        `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed   bool        `json:"memory_write_allowed,omitempty"`
}

// ReadinessVerdict is the conservative dry-run readiness verdict.
type ReadinessVerdict struct {
	Version              string            `json:"version"`
	DryRun               bool              `json:"dry_run"`
	ReadOnly             bool              `json:"read_only"`
	ReadinessStatus      string            `json:"readiness_status"`
	Ready                bool              `json:"ready"`
	Blocked              bool              `json:"blocked"`
	BlockedReasons       []string          `json:"blocked_reasons"`
	MissionInput         string            `json:"mission_input,omitempty"`
	Operation            string            `json:"operation,omitempty"`
	RequiredGates        []string          `json:"required_gates"`
	MissingGates         []string          `json:"missing_gates"`
	ObservedGates        []GateCheck       `json:"observed_gates"`
	ModuleResults        []ModuleReadiness `json:"module_results"`
	RiskLevel            string            `json:"risk_level"`
	RiskScore            int               `json:"risk_score"`
	EvidenceStrength     string            `json:"evidence_strength"`
	PromotionAllowed     bool              `json:"promotion_allowed"`
	DeployAllowed        bool              `json:"deploy_allowed"`
	StatusPublishAllowed bool              `json:"status_publish_allowed"`
	MutationAllowed      bool              `json:"mutation_allowed"`
	MemoryWriteAllowed   bool              `json:"memory_write_allowed"`
	Recommendations      []string          `json:"recommendations"`
	SafestNextSteps      []string          `json:"safest_next_steps"`
}

// ModuleReadiness describes one advisory module or required real gate.
type ModuleReadiness struct {
	Name          string   `json:"name"`
	Version       string   `json:"version"`
	Status        string   `json:"status"`
	Advisory      bool     `json:"advisory"`
	Ready         bool     `json:"ready"`
	Blocked       bool     `json:"blocked"`
	RiskLevel     string   `json:"risk_level"`
	Summary       string   `json:"summary"`
	RequiredGates []string `json:"required_gates"`
	MissingGates  []string `json:"missing_gates"`
	Findings      []string `json:"findings"`
}

// GateCheck records an observed or missing gate signal without synthesizing it.
type GateCheck struct {
	Gate    string `json:"gate"`
	Status  string `json:"status"`
	Real    bool   `json:"real"`
	DryRun  bool   `json:"dry_run"`
	Source  string `json:"source"`
	Summary string `json:"summary"`
}

// ReadinessValidationResult reports whether readiness evidence is safe.
type ReadinessValidationResult struct {
	Version         string   `json:"version"`
	DryRun          bool     `json:"dry_run"`
	ReadOnly        bool     `json:"read_only"`
	Valid           bool     `json:"valid"`
	Blocked         bool     `json:"blocked"`
	BlockedReasons  []string `json:"blocked_reasons"`
	UnsafeClaims    []string `json:"unsafe_claims"`
	MissingGates    []string `json:"missing_gates"`
	RequiredGates   []string `json:"required_gates"`
	Recommendations []string `json:"recommendations"`
}

// ReadinessAuditResult reports conflicts and unsafe promotion attempts.
type ReadinessAuditResult struct {
	Version               string   `json:"version"`
	DryRun                bool     `json:"dry_run"`
	ReadOnly              bool     `json:"read_only"`
	ConflictsFound        bool     `json:"conflicts_found"`
	Conflicts             []string `json:"conflicts"`
	UnsafeClaimsFound     bool     `json:"unsafe_claims_found"`
	UnsafeClaims          []string `json:"unsafe_claims"`
	PromotionAttemptFound bool     `json:"promotion_attempt_found"`
	Recommendations       []string `json:"recommendations"`
}

// ReadinessExplainResult explains why the dry-run verdict is not promotion.
type ReadinessExplainResult struct {
	Version         string   `json:"version"`
	DryRun          bool     `json:"dry_run"`
	ReadOnly        bool     `json:"read_only"`
	Summary         string   `json:"summary"`
	WhyBlocked      []string `json:"why_blocked"`
	WhatIsReady     []string `json:"what_is_ready"`
	WhatIsMissing   []string `json:"what_is_missing"`
	WhyNotPromoted  []string `json:"why_not_promoted"`
	SafestNextSteps []string `json:"safest_next_steps"`
	RequiredGates   []string `json:"required_gates"`
}

type evidenceSignal struct {
	Source               string
	Tool                 string
	Category             string
	Status               string
	Gate                 string
	DryRun               bool
	ReadOnly             bool
	RealEvidence         bool
	Summary              string
	PassGold             bool
	PassSecure           bool
	PromotionAllowed     bool
	DeployAllowed        bool
	StatusPublishAllowed bool
	MutationAllowed      bool
	MemoryWriteAllowed   bool
	Ready                bool
}

func gates() []string { return append([]string{}, requiredGates...) }

func missingRealGates(input ReadinessInput, records []evidenceSignal) []string {
	goldReal := isRealPassStatus(input.PassGoldStatus)
	secureReal := isRealPassStatus(input.PassSecureStatus)
	for _, r := range records {
		if r.RealEvidence && !r.DryRun {
			gate := strings.ToUpper(strings.TrimSpace(r.Gate))
			if gate == "PASS_GOLD" || r.PassGold {
				goldReal = true
			}
			if gate == "PASS_SECURE" || r.PassSecure {
				secureReal = true
			}
		}
	}
	missing := []string{}
	if !goldReal {
		missing = append(missing, "PASS_GOLD_REAL")
	}
	if !secureReal {
		missing = append(missing, "PASS_SECURE_REAL")
	}
	return missing
}

func isRealPassStatus(status string) bool {
	s := strings.ToLower(strings.TrimSpace(status))
	return s == "real_pass" || s == "pass_real" || s == "pass_gold_real" || s == "pass_secure_real"
}

// BuildReadiness composes an in-memory conservative readiness verdict.
func BuildReadiness(input ReadinessInput) ReadinessVerdict {
	records := normalizeEvidence(input)
	validation := ValidateReadiness(input)
	score := ScoreReadiness(input)
	missing := missingRealGates(input, records)
	status := "missing_real_gates"
	if len(records) == 0 {
		status = "insufficient_evidence"
	}
	if len(records) > 0 && onlyDryRun(records) {
		status = "dry_run_only"
	}
	if allAdvisoryPass(records) && len(missing) > 0 && !validationHasUnsafe(validation) {
		status = "advisory_ready"
	}
	if validationHasUnsafe(validation) {
		status = "blocked"
	}
	blockedReasons := append([]string{}, validation.BlockedReasons...)
	if len(missing) > 0 {
		blockedReasons = appendMissing(blockedReasons, "real PASS_GOLD/PASS_SECURE gates are missing")
	}
	if len(records) == 0 {
		blockedReasons = appendMissing(blockedReasons, "insufficient readiness evidence")
	}
	if status == "promoted" {
		status = "blocked"
	}
	return ReadinessVerdict{
		Version:              Version,
		DryRun:               true,
		ReadOnly:             true,
		ReadinessStatus:      status,
		Ready:                false,
		Blocked:              true,
		BlockedReasons:       uniq(blockedReasons),
		MissionInput:         input.MissionInput,
		Operation:            input.Operation,
		RequiredGates:        gates(),
		MissingGates:         missing,
		ObservedGates:        observedGates(input, records, missing),
		ModuleResults:        BuildModuleReadiness(input),
		RiskLevel:            riskLevel(score),
		RiskScore:            score,
		EvidenceStrength:     evidenceStrength(records, missing),
		PromotionAllowed:     false,
		DeployAllowed:        false,
		StatusPublishAllowed: false,
		MutationAllowed:      false,
		MemoryWriteAllowed:   false,
		Recommendations:      recommendations(validation.UnsafeClaims, missing),
		SafestNextSteps:      safestNextSteps(missing),
	}
}

// ValidateReadiness detects unsafe readiness and promotion claims.
func ValidateReadiness(input ReadinessInput) ReadinessValidationResult {
	records := normalizeEvidence(input)
	unsafe := []string{}
	blockedReasons := []string{}
	if input.PromotionAllowed {
		unsafe = append(unsafe, "promotion_allowed=true is forbidden in the read-only MCP control plane")
	}
	if input.DeployAllowed {
		unsafe = append(unsafe, "deploy_allowed=true is forbidden in the read-only MCP control plane")
	}
	if input.StatusPublishAllowed {
		unsafe = append(unsafe, "status_publish_allowed=true is forbidden in the read-only MCP control plane")
	}
	if input.MutationAllowed {
		unsafe = append(unsafe, "mutation_allowed=true is forbidden in the read-only MCP control plane")
	}
	if input.MemoryWriteAllowed {
		unsafe = append(unsafe, "memory_write_allowed=true is forbidden in the read-only MCP control plane")
	}
	for i, r := range records {
		prefix := fmt.Sprintf("evidence[%d]", i)
		if r.Tool != "" && mutatingTools[r.Tool] {
			unsafe = append(unsafe, prefix+" uses mutating tool "+r.Tool+" as readiness evidence")
		}
		if r.PromotionAllowed {
			unsafe = append(unsafe, prefix+" claims promotion_allowed=true inside MCP")
		}
		if r.DeployAllowed {
			unsafe = append(unsafe, prefix+" claims deploy_allowed=true inside MCP")
		}
		if r.StatusPublishAllowed {
			unsafe = append(unsafe, prefix+" claims status_publish_allowed=true inside MCP")
		}
		if r.MutationAllowed {
			unsafe = append(unsafe, prefix+" claims mutation_allowed=true inside MCP")
		}
		if r.MemoryWriteAllowed {
			unsafe = append(unsafe, prefix+" claims memory_write_allowed=true inside MCP")
		}
		if r.DryRun && r.PassGold {
			unsafe = append(unsafe, prefix+" claims pass_gold=true from dry-run evidence")
		}
		if r.DryRun && r.PassSecure {
			unsafe = append(unsafe, prefix+" claims pass_secure=true from dry-run evidence")
		}
		if r.DryRun && (r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed) {
			unsafe = append(unsafe, prefix+" dry-run evidence attempts to authorize promotion or mutation")
		}
		if strings.EqualFold(r.Status, "unknown") && (r.PassGold || r.PassSecure || r.Ready) {
			unsafe = append(unsafe, prefix+" uses unknown PASS_GOLD/PASS_SECURE status as real")
		}
	}
	missing := missingRealGates(input, records)
	if len(missing) > 0 {
		blockedReasons = append(blockedReasons, "missing real gates: "+strings.Join(missing, ", "))
	}
	if len(unsafe) > 0 {
		blockedReasons = append(blockedReasons, "unsafe promotion/readiness claims detected")
	}
	valid := len(unsafe) == 0 && len(missing) == 0
	return ReadinessValidationResult{
		Version:         Version,
		DryRun:          true,
		ReadOnly:        true,
		Valid:           valid,
		Blocked:         !valid,
		BlockedReasons:  uniq(blockedReasons),
		UnsafeClaims:    uniq(unsafe),
		MissingGates:    missing,
		RequiredGates:   gates(),
		Recommendations: recommendations(unsafe, missing),
	}
}

// BuildModuleReadiness lists advisory modules and required real gates.
func BuildModuleReadiness(input ReadinessInput) []ModuleReadiness {
	validation := ValidateReadiness(input)
	missing := validation.MissingGates
	unsafe := validation.UnsafeClaims
	mods := []ModuleReadiness{
		advisoryModule("GraphMemory", "V8.0", "graph/context is advisory in MCP readiness"),
		advisoryModule("MCPReadOnly", "V8.0", "read-only MCP control plane is enforced"),
		advisoryModule("DryRun", "V8.2", "dry-run planning evidence is advisory only"),
		advisoryModule("CodeBurn", "V8.3", "cost guard signal is advisory only"),
		advisoryModule("Impeccable", "V8.4", "UI guard signal is advisory only"),
		advisoryModule("Dashboard", "V8.5", "dashboard intelligence is advisory only"),
		advisoryModule("PolicyMatrix", "V8.6", "policy matrix decision is advisory only"),
		advisoryModule("ContractRegistry", "V8.7", "contract registry validation is advisory only"),
		advisoryModule("EvidenceLedger", evidenceledger.Version, "dry-run/read-only evidence is advisory and cannot become PASS_GOLD/PASS_SECURE"),
		advisoryModule("GitHubFlow", "V7.9", "GitHub flow remains gated and advisory from MCP"),
		advisoryModule("ReportIndex", "V8.0", "report index is read-only metadata"),
	}
	mods = append(mods, gateModule("PASS_GOLD", "PASS_GOLD_REAL", missing))
	mods = append(mods, gateModule("PASS_SECURE", "PASS_SECURE_REAL", missing))
	if len(unsafe) > 0 {
		for i := range mods {
			mods[i].Blocked = true
			mods[i].Status = "blocked"
			mods[i].Findings = append(mods[i].Findings, unsafe...)
		}
	}
	return mods
}

// AuditReadiness detects contradictions and unsafe promotion attempts.
func AuditReadiness(input ReadinessInput) ReadinessAuditResult {
	validation := ValidateReadiness(input)
	conflicts := []string{}
	promotionAttempt := input.PromotionAllowed || input.DeployAllowed || input.StatusPublishAllowed || input.MutationAllowed || input.MemoryWriteAllowed
	if input.Ready && len(validation.MissingGates) > 0 {
		conflicts = append(conflicts, "ready=true contradicts missing real PASS_GOLD/PASS_SECURE gates")
	}
	if input.PromotionAllowed {
		conflicts = append(conflicts, "promotion_allowed=true contradicts dry_run=true/read_only=true")
	}
	if input.Ready && contains(validation.MissingGates, "PASS_GOLD_REAL") {
		conflicts = append(conflicts, "ready=true contradicts absent PASS_GOLD_REAL")
	}
	for _, r := range normalizeEvidence(input) {
		if r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed || mutatingTools[r.Tool] {
			promotionAttempt = true
		}
		if r.DryRun && (r.PassGold || r.PassSecure || r.RealEvidence) {
			conflicts = append(conflicts, "MCP/dry-run evidence attempts to synthesize real PASS_GOLD/PASS_SECURE gates")
		}
		if r.Ready && len(validation.MissingGates) > 0 {
			conflicts = append(conflicts, "evidence ready=true contradicts missing real gates")
		}
	}
	return ReadinessAuditResult{
		Version:               Version,
		DryRun:                true,
		ReadOnly:              true,
		ConflictsFound:        len(conflicts) > 0,
		Conflicts:             uniq(conflicts),
		UnsafeClaimsFound:     len(validation.UnsafeClaims) > 0,
		UnsafeClaims:          validation.UnsafeClaims,
		PromotionAttemptFound: promotionAttempt,
		Recommendations:       recommendations(validation.UnsafeClaims, validation.MissingGates),
	}
}

// ExplainReadiness explains the conservative dry-run verdict.
func ExplainReadiness(input ReadinessInput) ReadinessExplainResult {
	verdict := BuildReadiness(input)
	whatReady := []string{"MCP readiness aggregation is available as read-only/dry-run advisory output"}
	for _, m := range verdict.ModuleResults {
		if m.Advisory && !m.Blocked {
			whatReady = append(whatReady, m.Name+" advisory signal")
		}
	}
	return ReadinessExplainResult{
		Version:         Version,
		DryRun:          true,
		ReadOnly:        true,
		Summary:         "Promotion Readiness Gate V8.9 produced a conservative dry-run verdict; no promotion or mutation was performed.",
		WhyBlocked:      verdict.BlockedReasons,
		WhatIsReady:     uniq(whatReady),
		WhatIsMissing:   verdict.MissingGates,
		WhyNotPromoted:  []string{"readiness is a verdict, not a promotion", "MCP output is dry-run/read-only", "promotion requires real PASS_GOLD and PASS_SECURE outside this dry-run gate"},
		SafestNextSteps: verdict.SafestNextSteps,
		RequiredGates:   gates(),
	}
}

// ScoreReadiness computes an advisory score. Missing real pass gates cap it at 80.
func ScoreReadiness(input ReadinessInput) int {
	score := 0
	if input.IncludeGraph || len(input.Files) > 0 || input.MissionInput != "" {
		score += 10
	}
	if input.IncludeDryRun || hasEvidenceFrom(input, "dry_run") {
		score += 10
	}
	if input.IncludeCodeBurn || hasEvidenceFrom(input, "codeburn") {
		score += 10
	}
	if input.IncludeImpeccable || hasEvidenceFrom(input, "impeccable") {
		score += 10
	}
	if input.IncludeDashboard || hasEvidenceFrom(input, "dashboard") {
		score += 10
	}
	if input.IncludePolicy || hasEvidenceFrom(input, "policy") || hasEvidenceFrom(input, "policy_matrix") {
		score += 10
	}
	if input.IncludeContracts || hasEvidenceFrom(input, "contract") || hasEvidenceFrom(input, "contract_registry") {
		score += 10
	}
	if input.IncludeEvidence || len(normalizeEvidence(input)) > 0 {
		score += 10
	}
	missing := missingRealGates(input, normalizeEvidence(input))
	if !contains(missing, "PASS_GOLD_REAL") {
		score += 10
	}
	if !contains(missing, "PASS_SECURE_REAL") {
		score += 10
	}
	if len(ValidateReadiness(input).UnsafeClaims) > 0 {
		score = 0
	}
	if len(missing) > 0 && score > 80 {
		score = 80
	}
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

func advisoryModule(name, version, summary string) ModuleReadiness {
	return ModuleReadiness{Name: name, Version: version, Status: "advisory", Advisory: true, Ready: false, Blocked: false, RiskLevel: "medium", Summary: summary, RequiredGates: gates(), MissingGates: []string{}, Findings: []string{}}
}

func gateModule(name, missingName string, missing []string) ModuleReadiness {
	m := ModuleReadiness{Name: name, Version: "required", Status: "ready", Advisory: false, Ready: true, Blocked: false, RiskLevel: "low", Summary: name + " real gate observed", RequiredGates: gates(), MissingGates: []string{}, Findings: []string{}}
	if contains(missing, missingName) {
		m.Status = "missing_real_gate"
		m.Ready = false
		m.Blocked = true
		m.RiskLevel = "critical"
		m.Summary = name + " real gate is required and was not observed"
		m.MissingGates = []string{missingName}
		m.Findings = []string{missingName + " missing"}
	}
	return m
}

func normalizeEvidence(input ReadinessInput) []evidenceSignal {
	items := []interface{}{}
	if input.Evidence != nil {
		items = append(items, input.Evidence)
	}
	items = appendEvidence(items, input.Evidences)
	records := []evidenceSignal{}
	for _, item := range items {
		m, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		records = append(records, evidenceSignal{
			Source:               str(m["source"]),
			Tool:                 str(m["tool"]),
			Category:             str(m["category"]),
			Status:               defaultString(str(m["status"]), "unknown"),
			Gate:                 str(m["gate"]),
			DryRun:               truthy(m["dry_run"]),
			ReadOnly:             truthy(m["read_only"]),
			RealEvidence:         truthy(m["real_evidence"]),
			Summary:              str(m["summary"]),
			PassGold:             truthy(m["pass_gold"]),
			PassSecure:           truthy(m["pass_secure"]),
			PromotionAllowed:     truthy(m["promotion_allowed"]),
			DeployAllowed:        truthy(m["deploy_allowed"]),
			StatusPublishAllowed: truthy(m["status_publish_allowed"]),
			MutationAllowed:      truthy(m["mutation_allowed"]),
			MemoryWriteAllowed:   truthy(m["memory_write_allowed"]),
			Ready:                truthy(m["ready"]),
		})
	}
	return records
}

func appendEvidence(items []interface{}, value interface{}) []interface{} {
	switch v := value.(type) {
	case nil:
		return items
	case []interface{}:
		return append(items, v...)
	case []map[string]interface{}:
		for _, x := range v {
			items = append(items, x)
		}
	case map[string]interface{}:
		items = append(items, v)
	default:
		items = append(items, v)
	}
	return items
}

func observedGates(input ReadinessInput, records []evidenceSignal, missing []string) []GateCheck {
	checks := []GateCheck{}
	for _, r := range records {
		gate := strings.ToUpper(strings.TrimSpace(r.Gate))
		if gate == "" {
			if r.PassGold {
				gate = "PASS_GOLD"
			} else if r.PassSecure {
				gate = "PASS_SECURE"
			} else {
				gate = "ADVISORY"
			}
		}
		checks = append(checks, GateCheck{Gate: gate, Status: r.Status, Real: r.RealEvidence && !r.DryRun, DryRun: r.DryRun, Source: r.Source, Summary: r.Summary})
	}
	for _, miss := range missing {
		checks = append(checks, GateCheck{Gate: strings.TrimSuffix(miss, "_REAL"), Status: "missing_real_gate", Real: false, DryRun: true, Source: "readiness_gate", Summary: miss + " was not observed"})
	}
	return checks
}

func onlyDryRun(records []evidenceSignal) bool {
	if len(records) == 0 {
		return false
	}
	for _, r := range records {
		if !r.DryRun {
			return false
		}
	}
	return true
}

func allAdvisoryPass(records []evidenceSignal) bool {
	if len(records) == 0 {
		return false
	}
	for _, r := range records {
		if !r.DryRun || strings.ToLower(r.Status) != "pass" {
			return false
		}
	}
	return true
}

func validationHasUnsafe(v ReadinessValidationResult) bool { return len(v.UnsafeClaims) > 0 }

func evidenceStrength(records []evidenceSignal, missing []string) string {
	if len(records) == 0 {
		return "insufficient"
	}
	if len(missing) > 0 && onlyDryRun(records) {
		return "dry_run_only"
	}
	if len(missing) > 0 {
		return "advisory_only"
	}
	return "real_gates_observed"
}

func recommendations(unsafe []string, missing []string) []string {
	recs := []string{}
	if len(unsafe) > 0 {
		recs = append(recs, "remove unsafe promotion/deploy/status/mutation/memory claims from MCP evidence")
	}
	if len(missing) > 0 {
		recs = append(recs, "obtain real PASS_GOLD and PASS_SECURE gates before promotion")
	}
	return uniq(recs)
}

func safestNextSteps(missing []string) []string {
	steps := []string{"keep readiness evaluation read-only/dry-run", "do not deploy, publish status, mutate files, or write stable memory from MCP"}
	if len(missing) > 0 {
		steps = append(steps, "run the authoritative gated PASS_GOLD/PASS_SECURE process outside this read-only MCP verdict")
	}
	return steps
}

func riskLevel(score int) string {
	switch {
	case score <= 30:
		return "critical"
	case score <= 55:
		return "high"
	case score <= 75:
		return "medium"
	default:
		return "low"
	}
}

func hasEvidenceFrom(input ReadinessInput, needle string) bool {
	needle = strings.ToLower(needle)
	for _, r := range normalizeEvidence(input) {
		if strings.Contains(strings.ToLower(r.Source), needle) || strings.Contains(strings.ToLower(r.Tool), needle) || strings.Contains(strings.ToLower(r.Category), needle) {
			return true
		}
	}
	return false
}

func truthy(v interface{}) bool {
	switch x := v.(type) {
	case bool:
		return x
	case string:
		s := strings.ToLower(strings.TrimSpace(x))
		return s == "true" || s == "yes" || s == "1" || s == "pass"
	default:
		return false
	}
}

func str(v interface{}) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(v))
}

func defaultString(s, fallback string) string {
	if strings.TrimSpace(s) == "" {
		return fallback
	}
	return s
}

func contains(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}

func appendMissing(xs []string, value string) []string {
	if contains(xs, value) {
		return xs
	}
	return append(xs, value)
}

func uniq(xs []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, x := range xs {
		x = strings.TrimSpace(x)
		if x == "" || seen[x] {
			continue
		}
		seen[x] = true
		out = append(out, x)
	}
	sort.Strings(out)
	return out
}
