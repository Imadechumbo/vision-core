// Package evidenceledger implements the V8.8 read-only/dry-run Evidence Ledger.
//
// The ledger is intentionally in-memory only: it aggregates, validates, audits,
// and explains evidence payloads without executing commands, writing files,
// persisting memory, calling networks/APIs, publishing status, opening PRs, or
// converting dry-run/read-only evidence into real PASS_GOLD/PASS_SECURE gates.
package evidenceledger

import (
	"fmt"
	"sort"
	"strings"
)

const Version = "V8.8"

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

// EvidenceInput is a flexible read-only request used by all V8.8 tools.
type EvidenceInput struct {
	Root                   string      `json:"root,omitempty"`
	MissionInput           string      `json:"mission_input,omitempty"`
	Operation              string      `json:"operation,omitempty"`
	Tool                   string      `json:"tool,omitempty"`
	Source                 string      `json:"source,omitempty"`
	Evidence               interface{} `json:"evidence,omitempty"`
	Evidences              interface{} `json:"evidences,omitempty"`
	Strict                 bool        `json:"strict,omitempty"`
	IncludeMissing         bool        `json:"include_missing,omitempty"`
	IncludeRecommendations bool        `json:"include_recommendations,omitempty"`
}

// EvidenceRecord is the normalized, conservative representation of one evidence item.
type EvidenceRecord struct {
	ID                  string                 `json:"id"`
	Source              string                 `json:"source"`
	Tool                string                 `json:"tool"`
	Category            string                 `json:"category"`
	Gate                string                 `json:"gate"`
	Status              string                 `json:"status"`
	Confidence          string                 `json:"confidence"`
	DryRun              bool                   `json:"dry_run"`
	ReadOnly            bool                   `json:"read_only"`
	RealEvidence        bool                   `json:"real_evidence"`
	UsableForPassGold   bool                   `json:"usable_for_pass_gold"`
	UsableForPassSecure bool                   `json:"usable_for_pass_secure"`
	Summary             string                 `json:"summary"`
	Details             map[string]interface{} `json:"details,omitempty"`
	RequiredGates       []string               `json:"required_gates"`
	TimestampHint       string                 `json:"timestamp_hint,omitempty"`
}

// EvidenceLedgerSnapshot is the logical in-memory ledger result.
type EvidenceLedgerSnapshot struct {
	Version                  string           `json:"version"`
	DryRun                   bool             `json:"dry_run"`
	ReadOnly                 bool             `json:"read_only"`
	LedgerStatus             string           `json:"ledger_status"`
	MissionInput             string           `json:"mission_input,omitempty"`
	Operation                string           `json:"operation,omitempty"`
	Evidences                []EvidenceRecord `json:"evidences"`
	GatesObserved            []string         `json:"gates_observed"`
	GatesMissing             []string         `json:"gates_missing"`
	DryRunEvidenceCount      int              `json:"dry_run_evidence_count"`
	RealEvidenceCount        int              `json:"real_evidence_count"`
	UsableForPassGoldCount   int              `json:"usable_for_pass_gold_count"`
	UsableForPassSecureCount int              `json:"usable_for_pass_secure_count"`
	Blocked                  bool             `json:"blocked"`
	BlockedReasons           []string         `json:"blocked_reasons"`
	RequiredGates            []string         `json:"required_gates"`
	Recommendations          []string         `json:"recommendations"`
}

// EvidenceValidationResult reports whether evidence is safe to rely on.
type EvidenceValidationResult struct {
	Version         string   `json:"version"`
	DryRun          bool     `json:"dry_run"`
	ReadOnly        bool     `json:"read_only"`
	Valid           bool     `json:"valid"`
	Blocked         bool     `json:"blocked"`
	BlockedReasons  []string `json:"blocked_reasons"`
	Contradictions  []string `json:"contradictions"`
	MissingEvidence []string `json:"missing_evidence"`
	UnsafeClaims    []string `json:"unsafe_claims"`
	RequiredGates   []string `json:"required_gates"`
	Recommendations []string `json:"recommendations"`
}

// EvidenceSummary is an executive summary of evidence strength and gaps.
type EvidenceSummary struct {
	Version          string           `json:"version"`
	DryRun           bool             `json:"dry_run"`
	ReadOnly         bool             `json:"read_only"`
	Summary          string           `json:"summary"`
	EvidenceStrength string           `json:"evidence_strength"`
	TopEvidence      []EvidenceRecord `json:"top_evidence"`
	MissingEvidence  []string         `json:"missing_evidence"`
	SafestNextSteps  []string         `json:"safest_next_steps"`
	RequiredGates    []string         `json:"required_gates"`
}

// EvidenceAuditResult reports conflicts and unsafe claims in the ledger.
type EvidenceAuditResult struct {
	Version           string   `json:"version"`
	DryRun            bool     `json:"dry_run"`
	ReadOnly          bool     `json:"read_only"`
	ConflictsFound    bool     `json:"conflicts_found"`
	Conflicts         []string `json:"conflicts"`
	UnsafeClaimsFound bool     `json:"unsafe_claims_found"`
	UnsafeClaims      []string `json:"unsafe_claims"`
	Recommendations   []string `json:"recommendations"`
}

// EvidenceExplainResult explains the Evidence Ledger contract.
type EvidenceExplainResult struct {
	Version              string   `json:"version"`
	DryRun               bool     `json:"dry_run"`
	ReadOnly             bool     `json:"read_only"`
	Summary              string   `json:"summary"`
	WhatCountsAsEvidence []string `json:"what_counts_as_evidence"`
	WhatDoesNotCount     []string `json:"what_does_not_count"`
	WhyNotPassGold       []string `json:"why_not_pass_gold"`
	SafestNextSteps      []string `json:"safest_next_steps"`
	RequiredGates        []string `json:"required_gates"`
}

// BuildLedger builds an in-memory evidence snapshot without side effects.
func BuildLedger(input EvidenceInput) EvidenceLedgerSnapshot {
	records := NormalizeEvidence(input)
	validation := ValidateEvidence(input)
	observedSet := map[string]bool{}
	dryRunCount, realCount, goldUsable, secureUsable := 0, 0, 0, 0
	for _, rec := range records {
		if rec.Gate != "" {
			observedSet[rec.Gate] = true
		}
		if rec.DryRun {
			dryRunCount++
		}
		if rec.RealEvidence {
			realCount++
		}
		if rec.UsableForPassGold {
			goldUsable++
		}
		if rec.UsableForPassSecure {
			secureUsable++
		}
	}
	observed := sortedKeys(observedSet)
	missing := missingGates(goldUsable > 0, secureUsable > 0)
	status := "missing_real_gates"
	if len(records) == 0 {
		status = "empty"
	} else if len(validation.Contradictions) > 0 {
		status = "contradictory"
	} else if dryRunCount == len(records) {
		status = "dry_run_evidence_only"
	}
	blockedReasons := append([]string{}, validation.BlockedReasons...)
	blockedReasons = appendUnique(blockedReasons, validation.UnsafeClaims...)
	blockedReasons = appendUnique(blockedReasons, validation.Contradictions...)
	blocked := true
	if len(missing) == 0 && len(blockedReasons) == 0 {
		blocked = false
	}
	return EvidenceLedgerSnapshot{
		Version:                  Version,
		DryRun:                   true,
		ReadOnly:                 true,
		LedgerStatus:             status,
		MissionInput:             input.MissionInput,
		Operation:                input.Operation,
		Evidences:                records,
		GatesObserved:            observed,
		GatesMissing:             missing,
		DryRunEvidenceCount:      dryRunCount,
		RealEvidenceCount:        realCount,
		UsableForPassGoldCount:   goldUsable,
		UsableForPassSecureCount: secureUsable,
		Blocked:                  blocked,
		BlockedReasons:           blockedReasons,
		RequiredGates:            gates(),
		Recommendations:          recommendations(missing, len(records) == 0),
	}
}

// NormalizeEvidence accepts flexible evidence payloads and classifies conservatively.
func NormalizeEvidence(input EvidenceInput) []EvidenceRecord {
	items := []interface{}{}
	if input.Evidence != nil {
		items = append(items, input.Evidence)
	}
	items = append(items, flattenEvidence(input.Evidences)...)
	if len(items) == 0 && (strings.TrimSpace(input.Tool) != "" || strings.TrimSpace(input.Source) != "") {
		items = append(items, map[string]interface{}{"tool": input.Tool, "source": input.Source, "status": "unknown"})
	}
	records := make([]EvidenceRecord, 0, len(items))
	for i, item := range items {
		details := toMap(item)
		rec := EvidenceRecord{
			ID:            fmt.Sprintf("evidence-%03d", i+1),
			Source:        pickString(details, "source", input.Source),
			Tool:          pickString(details, "tool", input.Tool),
			Category:      pickString(details, "category", ""),
			Gate:          normalizeGate(pickString(details, "gate", "")),
			Status:        strings.ToLower(pickString(details, "status", "unknown")),
			Confidence:    strings.ToLower(pickString(details, "confidence", "")),
			DryRun:        pickBool(details, "dry_run", false),
			ReadOnly:      pickBool(details, "read_only", false),
			RealEvidence:  pickBool(details, "real_evidence", false),
			Summary:       pickString(details, "summary", ""),
			Details:       details,
			RequiredGates: gates(),
			TimestampHint: pickString(details, "timestamp_hint", ""),
		}
		if rec.Category == "" {
			rec.Category = inferCategory(rec.Tool, rec.Source, details)
		}
		if rec.Confidence == "" {
			rec.Confidence = inferConfidence(rec.Category)
		}
		if rec.Status == "" {
			rec.Status = "unknown"
		}
		if rec.DryRun {
			rec.RealEvidence = false
		}
		if rec.Gate == "" {
			rec.Gate = inferGate(details)
		}
		rec.UsableForPassGold = rec.RealEvidence && !rec.DryRun && (rec.Gate == "PASS_GOLD" || truthy(details["pass_gold"]))
		rec.UsableForPassSecure = rec.RealEvidence && !rec.DryRun && (rec.Gate == "PASS_SECURE" || truthy(details["pass_secure"]))
		if rec.DryRun {
			rec.UsableForPassGold = false
			rec.UsableForPassSecure = false
		}
		records = append(records, rec)
	}
	return records
}

// ValidateEvidence detects empty, missing, contradictory, and unsafe evidence claims.
func ValidateEvidence(input EvidenceInput) EvidenceValidationResult {
	records := NormalizeEvidence(input)
	res := EvidenceValidationResult{Version: Version, DryRun: true, ReadOnly: true, Valid: true, Blocked: false, BlockedReasons: []string{}, Contradictions: []string{}, MissingEvidence: []string{}, UnsafeClaims: []string{}, RequiredGates: gates(), Recommendations: []string{}}
	if len(records) == 0 {
		res.Valid = false
		res.Blocked = true
		res.BlockedReasons = append(res.BlockedReasons, "no evidence supplied")
	}
	goldReal, secureReal := false, false
	statusByKey := map[string]string{}
	for _, rec := range records {
		if rec.UsableForPassGold {
			goldReal = true
		}
		if rec.UsableForPassSecure {
			secureReal = true
		}
		res.UnsafeClaims = appendUnique(res.UnsafeClaims, unsafeClaimsFor(rec)...)
		if rec.Gate != "" && (rec.Status == "pass" || rec.Status == "fail") {
			key := rec.Source + "|" + rec.Gate
			if prev, ok := statusByKey[key]; ok && prev != rec.Status {
				res.Contradictions = appendUnique(res.Contradictions, fmt.Sprintf("contradictory status for source %q gate %q: %s and %s", rec.Source, rec.Gate, prev, rec.Status))
			}
			statusByKey[key] = rec.Status
		}
	}
	if !goldReal {
		res.MissingEvidence = append(res.MissingEvidence, "PASS_GOLD_REAL")
	}
	if !secureReal {
		res.MissingEvidence = append(res.MissingEvidence, "PASS_SECURE_REAL")
	}
	if len(res.UnsafeClaims) > 0 || len(res.Contradictions) > 0 || len(res.MissingEvidence) > 0 {
		res.Valid = false
		res.Blocked = true
	}
	res.BlockedReasons = appendUnique(res.BlockedReasons, res.UnsafeClaims...)
	res.BlockedReasons = appendUnique(res.BlockedReasons, res.Contradictions...)
	res.Recommendations = recommendations(res.MissingEvidence, len(records) == 0)
	sort.Strings(res.MissingEvidence)
	sort.Strings(res.UnsafeClaims)
	sort.Strings(res.Contradictions)
	return res
}

// SummarizeEvidence returns a conservative executive summary.
func SummarizeEvidence(input EvidenceInput) EvidenceSummary {
	records := NormalizeEvidence(input)
	validation := ValidateEvidence(input)
	strength := evidenceStrength(records, validation)
	top := records
	if len(top) > 3 {
		top = top[:3]
	}
	mission := strings.TrimSpace(input.MissionInput)
	if mission == "" {
		mission = "unspecified mission"
	}
	return EvidenceSummary{Version: Version, DryRun: true, ReadOnly: true, Summary: fmt.Sprintf("Evidence Ledger reviewed %d evidence item(s) for %s; PASS_GOLD/PASS_SECURE remain external real gates.", len(records), mission), EvidenceStrength: strength, TopEvidence: top, MissingEvidence: validation.MissingEvidence, SafestNextSteps: safeNextSteps(), RequiredGates: gates()}
}

// AuditLedger audits the ledger for conflicts and unsafe claims.
func AuditLedger(input EvidenceInput) EvidenceAuditResult {
	validation := ValidateEvidence(input)
	return EvidenceAuditResult{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(validation.Contradictions) > 0, Conflicts: validation.Contradictions, UnsafeClaimsFound: len(validation.UnsafeClaims) > 0, UnsafeClaims: validation.UnsafeClaims, Recommendations: recommendations(validation.MissingEvidence, false)}
}

// ExplainEvidence explains what Evidence Ledger can and cannot prove.
func ExplainEvidence(input EvidenceInput) EvidenceExplainResult {
	tool := strings.TrimSpace(input.Tool)
	if tool == "" {
		tool = "the supplied tool"
	}
	return EvidenceExplainResult{Version: Version, DryRun: true, ReadOnly: true, Summary: fmt.Sprintf("V8.8 Evidence Ledger explains evidence from %s as read-only/dry-run context, not as real PASS_GOLD/PASS_SECURE.", tool), WhatCountsAsEvidence: []string{"Read-only guard outputs and dry-run validation snapshots.", "Explicit real gate artifacts only when marked real_evidence=true and produced outside the MCP dry-run layer.", "Consistent pass/fail observations tied to a source, tool, gate, and summary."}, WhatDoesNotCount: []string{"Dry-run evidence claiming pass_gold or pass_secure.", "Deploy, promotion, mutation, status publication, PR, push, or rollback claims from inside MCP.", "Unknown evidence without source/tool/gate context."}, WhyNotPassGold: []string{"Evidence Ledger never executes PASS_GOLD or PASS_SECURE.", "Dry-run/read-only evidence is advisory and cannot be promoted to real gate success.", "Real promotion requires external PASS_GOLD and PASS_SECURE artifacts before deploy/status publication."}, SafestNextSteps: safeNextSteps(), RequiredGates: gates()}
}

func flattenEvidence(v interface{}) []interface{} {
	if v == nil {
		return nil
	}
	switch t := v.(type) {
	case []interface{}:
		return t
	case []map[string]interface{}:
		out := make([]interface{}, 0, len(t))
		for _, m := range t {
			out = append(out, m)
		}
		return out
	default:
		return []interface{}{v}
	}
}

func toMap(v interface{}) map[string]interface{} {
	out := map[string]interface{}{}
	if m, ok := v.(map[string]interface{}); ok {
		for k, val := range m {
			out[k] = val
		}
		return out
	}
	out["value"] = v
	return out
}

func pickString(m map[string]interface{}, key, fallback string) string {
	if v, ok := m[key]; ok {
		switch s := v.(type) {
		case string:
			if strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s)
			}
		case fmt.Stringer:
			return strings.TrimSpace(s.String())
		}
	}
	return strings.TrimSpace(fallback)
}

func pickBool(m map[string]interface{}, key string, fallback bool) bool {
	if v, ok := m[key]; ok {
		return truthy(v)
	}
	return fallback
}

func truthy(v interface{}) bool {
	switch t := v.(type) {
	case bool:
		return t
	case string:
		s := strings.ToLower(strings.TrimSpace(t))
		return s == "true" || s == "yes" || s == "1" || s == "pass"
	case int:
		return t != 0
	case float64:
		return t != 0
	default:
		return false
	}
}

func inferCategory(tool, source string, details map[string]interface{}) string {
	text := strings.ToLower(tool + " " + source)
	switch {
	case strings.Contains(text, "contract"):
		return "contract"
	case strings.Contains(text, "policy"):
		return "policy"
	case strings.Contains(text, "dashboard"):
		return "dashboard"
	case strings.Contains(text, "codeburn"):
		return "codeburn"
	case strings.Contains(text, "impeccable"):
		return "impeccable"
	case strings.Contains(text, "dry_run") || strings.Contains(text, "dry-run"):
		return "dry_run"
	}
	if _, ok := details["conflicts_found"]; ok {
		return "audit"
	}
	return "unknown"
}

func inferConfidence(category string) string {
	if category == "unknown" {
		return "low"
	}
	return "medium"
}

func inferGate(details map[string]interface{}) string {
	if truthy(details["pass_gold"]) {
		return "PASS_GOLD"
	}
	if truthy(details["pass_secure"]) {
		return "PASS_SECURE"
	}
	return ""
}

func normalizeGate(gate string) string {
	s := strings.ToUpper(strings.TrimSpace(gate))
	s = strings.ReplaceAll(s, "-", "_")
	s = strings.ReplaceAll(s, " ", "_")
	return s
}

func unsafeClaimsFor(rec EvidenceRecord) []string {
	claims := []string{}
	m := rec.Details
	if rec.DryRun && truthy(m["pass_gold"]) {
		claims = append(claims, fmt.Sprintf("%s claims pass_gold=true with dry_run=true", rec.ID))
	}
	if rec.DryRun && truthy(m["pass_secure"]) {
		claims = append(claims, fmt.Sprintf("%s claims pass_secure=true with dry_run=true", rec.ID))
	}
	if rec.Gate == "PASS_GOLD" && !rec.RealEvidence {
		claims = append(claims, fmt.Sprintf("%s declares PASS_GOLD without real_evidence=true", rec.ID))
	}
	if rec.Gate == "PASS_SECURE" && !rec.RealEvidence {
		claims = append(claims, fmt.Sprintf("%s declares PASS_SECURE without real_evidence=true", rec.ID))
	}
	if truthy(m["deploy_allowed"]) {
		claims = append(claims, fmt.Sprintf("%s claims deploy_allowed=true inside MCP", rec.ID))
	}
	if truthy(m["mutation_allowed"]) {
		claims = append(claims, fmt.Sprintf("%s claims mutation_allowed=true inside MCP", rec.ID))
	}
	if truthy(m["status_published"]) {
		claims = append(claims, fmt.Sprintf("%s claims status_published=true inside MCP", rec.ID))
	}
	if truthy(m["promotion_allowed"]) && !(rec.UsableForPassGold && rec.UsableForPassSecure) {
		claims = append(claims, fmt.Sprintf("%s claims promotion_allowed=true without real PASS_GOLD/PASS_SECURE", rec.ID))
	}
	if mutatingTools[rec.Tool] {
		claims = append(claims, fmt.Sprintf("%s uses mutating tool %s as evidence source", rec.ID, rec.Tool))
	}
	if len(rec.RequiredGates) == 0 {
		claims = append(claims, fmt.Sprintf("%s has no required_gates", rec.ID))
	}
	if rec.DryRun && rec.RealEvidence {
		claims = append(claims, fmt.Sprintf("%s treats dry-run evidence as real", rec.ID))
	}
	return claims
}

func evidenceStrength(records []EvidenceRecord, validation EvidenceValidationResult) string {
	if len(records) == 0 {
		return "none"
	}
	dryOnly := true
	real := 0
	readOnly := 0
	for _, rec := range records {
		if !rec.DryRun {
			dryOnly = false
		}
		if rec.RealEvidence {
			real++
		}
		if rec.ReadOnly {
			readOnly++
		}
	}
	if dryOnly {
		return "dry_run_only"
	}
	if real == 0 && readOnly == len(records) {
		return "strong_read_only"
	}
	if real > 0 && len(validation.MissingEvidence) > 0 {
		return "partial"
	}
	if len(validation.MissingEvidence) > 0 {
		return "real_required"
	}
	return "partial"
}

func missingGates(goldReal, secureReal bool) []string {
	missing := []string{}
	if !goldReal {
		missing = append(missing, "PASS_GOLD")
	}
	if !secureReal {
		missing = append(missing, "PASS_SECURE")
	}
	return missing
}

func recommendations(missing []string, empty bool) []string {
	recs := []string{"Keep Evidence Ledger output read-only/dry-run; do not deploy, publish status, or promote from this result."}
	if empty {
		recs = append(recs, "Collect read-only guard evidence before making recommendations.")
	}
	if len(missing) > 0 {
		recs = append(recs, "Collect real PASS_GOLD and PASS_SECURE evidence outside the MCP dry-run layer before promotion.")
	}
	return recs
}

func safeNextSteps() []string {
	return []string{"Review missing evidence and unsafe claims.", "Run real PASS_GOLD/PASS_SECURE gates outside this read-only MCP ledger when promotion is required.", "Treat dry-run evidence as advisory only."}
}

func gates() []string { return append([]string{}, requiredGates...) }

func sortedKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func appendUnique(base []string, vals ...string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, v := range base {
		if v != "" && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	for _, v := range vals {
		if v != "" && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}
