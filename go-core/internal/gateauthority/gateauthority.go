// Package gateauthority implements the V9.0 PASS GOLD Authority Layer.
//
// The layer is intentionally read-only and dry-run: it recognizes, rejects,
// audits, and explains gate authority using only in-memory request payloads. It
// never reads gate artifacts, writes files, executes commands, publishes status,
// opens PRs, deploys, calls networks/APIs, or converts advisory evidence into a
// real PASS_GOLD/PASS_SECURE gate.
package gateauthority

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

const Version = "V9.0"

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var authorizedSources = []string{
	"sddf_passgold_validator",
	"passgold_runner",
	"passsecure_runner",
	"ci_required_check",
	"local_authoritative_gate",
}

var authorizedArtifactTypes = []string{
	"pass_gold_report",
	"pass_secure_report",
	"ci_required_check",
	"signed_gate_result",
	"local_gate_result",
}

var forbiddenSources = []string{
	"mcp",
	"dashboard",
	"readiness",
	"evidenceledger",
	"contractregistry",
	"policymatrix",
	"codeburn",
	"impeccable",
	"dryrun",
	"graphmemory",
	"unknown",
}

var forbiddenClaims = []string{
	"promotion_allowed=true",
	"deploy_allowed=true",
	"status_publish_allowed=true",
	"mutation_allowed=true",
	"memory_write_allowed=true",
	"dry_run evidence as PASS_GOLD_REAL",
	"dry_run evidence as PASS_SECURE_REAL",
	"MCP synthesized PASS_GOLD",
	"MCP synthesized PASS_SECURE",
	"V8.x advisory tool as gate authority",
}

var requiredFieldsForRealGate = []string{
	"gate",
	"status",
	"source",
	"artifact_id",
	"artifact_type",
	"dry_run=false",
	"real_evidence=true",
	"synthesized=false",
}

// GateAuthorityInput is a flexible read-only request used by all V9.0 tools.
type GateAuthorityInput struct {
	Root         string      `json:"root,omitempty"`
	MissionInput string      `json:"mission_input,omitempty"`
	Operation    string      `json:"operation,omitempty"`
	Evidence     interface{} `json:"evidence,omitempty"`
	Evidences    interface{} `json:"evidences,omitempty"`
	Gate         string      `json:"gate,omitempty"`
	Source       string      `json:"source,omitempty"`
	ArtifactID   string      `json:"artifact_id,omitempty"`
	ArtifactType string      `json:"artifact_type,omitempty"`
	Authority    string      `json:"authority,omitempty"`
	Strict       bool        `json:"strict,omitempty"`
}

// GateEvidence is the normalized representation of a candidate gate evidence item.
type GateEvidence struct {
	ID                   string                 `json:"id"`
	Gate                 string                 `json:"gate"`
	Status               string                 `json:"status"`
	Source               string                 `json:"source"`
	Authority            string                 `json:"authority,omitempty"`
	ArtifactID           string                 `json:"artifact_id"`
	ArtifactType         string                 `json:"artifact_type"`
	DryRun               bool                   `json:"dry_run"`
	ReadOnly             bool                   `json:"read_only"`
	RealEvidence         bool                   `json:"real_evidence"`
	AuthorizedSource     bool                   `json:"authorized_source"`
	Synthesized          bool                   `json:"synthesized"`
	UsableAsRealGate     bool                   `json:"usable_as_real_gate"`
	Summary              string                 `json:"summary,omitempty"`
	Details              map[string]interface{} `json:"details,omitempty"`
	PromotionAllowed     bool                   `json:"promotion_allowed,omitempty"`
	DeployAllowed        bool                   `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed bool                   `json:"status_publish_allowed,omitempty"`
	MutationAllowed      bool                   `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed   bool                   `json:"memory_write_allowed,omitempty"`
}

// GateAuthorityDecision reports whether a requested gate is recognized.
type GateAuthorityDecision struct {
	Version         string         `json:"version"`
	DryRun          bool           `json:"dry_run"`
	ReadOnly        bool           `json:"read_only"`
	Gate            string         `json:"gate"`
	Status          string         `json:"status"`
	Recognized      bool           `json:"recognized"`
	Valid           bool           `json:"valid"`
	Blocked         bool           `json:"blocked"`
	BlockedReasons  []string       `json:"blocked_reasons"`
	Evidence        []GateEvidence `json:"evidence"`
	RequiredGates   []string       `json:"required_gates"`
	MissingGates    []string       `json:"missing_gates"`
	UnsafeClaims    []string       `json:"unsafe_claims"`
	Recommendations []string       `json:"recommendations"`
}

// GateAuthoritySnapshot summarizes real gate recognition and immutable blocks.
type GateAuthoritySnapshot struct {
	Version              string         `json:"version"`
	DryRun               bool           `json:"dry_run"`
	ReadOnly             bool           `json:"read_only"`
	AuthorityStatus      string         `json:"authority_status"`
	PassGoldReal         bool           `json:"pass_gold_real"`
	PassSecureReal       bool           `json:"pass_secure_real"`
	PassGoldSource       string         `json:"pass_gold_source,omitempty"`
	PassSecureSource     string         `json:"pass_secure_source,omitempty"`
	Gates                []GateEvidence `json:"gates"`
	MissingGates         []string       `json:"missing_gates"`
	UnsafeClaims         []string       `json:"unsafe_claims"`
	PromotionAllowed     bool           `json:"promotion_allowed"`
	DeployAllowed        bool           `json:"deploy_allowed"`
	StatusPublishAllowed bool           `json:"status_publish_allowed"`
	MutationAllowed      bool           `json:"mutation_allowed"`
	MemoryWriteAllowed   bool           `json:"memory_write_allowed"`
	RequiredGates        []string       `json:"required_gates"`
	Recommendations      []string       `json:"recommendations"`
}

// GateAuthorityAuditResult reports conflicts and unsafe authority claims.
type GateAuthorityAuditResult struct {
	Version                     string   `json:"version"`
	DryRun                      bool     `json:"dry_run"`
	ReadOnly                    bool     `json:"read_only"`
	ConflictsFound              bool     `json:"conflicts_found"`
	Conflicts                   []string `json:"conflicts"`
	UnsafeClaimsFound           bool     `json:"unsafe_claims_found"`
	UnsafeClaims                []string `json:"unsafe_claims"`
	SynthesizedGateAttemptFound bool     `json:"synthesized_gate_attempt_found"`
	UnauthorizedGateFound       bool     `json:"unauthorized_gate_found"`
	DryRunGateClaimFound        bool     `json:"dry_run_gate_claim_found"`
	Recommendations             []string `json:"recommendations"`
}

// GateAuthorityExplainResult explains the V9.0 authority model.
type GateAuthorityExplainResult struct {
	Version         string   `json:"version"`
	DryRun          bool     `json:"dry_run"`
	ReadOnly        bool     `json:"read_only"`
	Summary         string   `json:"summary"`
	AuthorityModel  []string `json:"authority_model"`
	RecognizedGates []string `json:"recognized_gates"`
	RejectedGates   []string `json:"rejected_gates"`
	WhyNotPromoted  []string `json:"why_not_promoted"`
	SafestNextSteps []string `json:"safest_next_steps"`
	RequiredGates   []string `json:"required_gates"`
}

// GateAuthorityPolicy describes real-gate authority rules.
type GateAuthorityPolicy struct {
	Version                   string   `json:"version"`
	DryRun                    bool     `json:"dry_run"`
	ReadOnly                  bool     `json:"read_only"`
	AuthorizedSources         []string `json:"authorized_sources"`
	AuthorizedArtifactTypes   []string `json:"authorized_artifact_types"`
	ForbiddenSources          []string `json:"forbidden_sources"`
	ForbiddenClaims           []string `json:"forbidden_claims"`
	RequiredFieldsForRealGate []string `json:"required_fields_for_real_gate"`
	RequiredGates             []string `json:"required_gates"`
}

// BuildAuthorityPolicy returns the immutable V9.0 authority policy.
func BuildAuthorityPolicy() GateAuthorityPolicy {
	return GateAuthorityPolicy{
		Version: Version, DryRun: true, ReadOnly: true,
		AuthorizedSources: clone(authorizedSources), AuthorizedArtifactTypes: clone(authorizedArtifactTypes),
		ForbiddenSources: clone(forbiddenSources), ForbiddenClaims: clone(forbiddenClaims),
		RequiredFieldsForRealGate: clone(requiredFieldsForRealGate), RequiredGates: gates(),
	}
}

// NormalizeGateEvidence normalizes one or many in-memory evidence payloads.
func NormalizeGateEvidence(input GateAuthorityInput) []GateEvidence {
	items := collectEvidence(input)
	out := make([]GateEvidence, 0, len(items))
	for i, item := range items {
		ev := decodeEvidence(item)
		if ev.ID == "" {
			ev.ID = fmt.Sprintf("gate-evidence-%d", i+1)
		}
		if ev.Gate == "" {
			ev.Gate = input.Gate
		}
		if ev.Source == "" {
			ev.Source = input.Source
		}
		if ev.ArtifactID == "" {
			ev.ArtifactID = input.ArtifactID
		}
		if ev.ArtifactType == "" {
			ev.ArtifactType = input.ArtifactType
		}
		if ev.Authority == "" {
			ev.Authority = input.Authority
		}
		ev.Gate = normalizeGate(ev.Gate)
		ev.Status = strings.ToLower(strings.TrimSpace(ev.Status))
		ev.Source = strings.ToLower(strings.TrimSpace(ev.Source))
		ev.ArtifactType = strings.ToLower(strings.TrimSpace(ev.ArtifactType))
		ev.ArtifactID = strings.TrimSpace(ev.ArtifactID)
		ev.ReadOnly = true
		ev.AuthorizedSource = stringIn(ev.Source, authorizedSources)
		ev.UsableAsRealGate = ev.AuthorizedSource && stringIn(ev.ArtifactType, authorizedArtifactTypes) &&
			!ev.DryRun && ev.RealEvidence && !ev.Synthesized && ev.Status == "pass" && ev.ArtifactID != "" && isRequiredGate(ev.Gate)
		out = append(out, ev)
	}
	return out
}

// DecideGate recognizes only valid, real PASS_GOLD/PASS_SECURE evidence.
func DecideGate(input GateAuthorityInput) GateAuthorityDecision {
	evidence := NormalizeGateEvidence(input)
	target := normalizeGate(input.Gate)
	if target == "" && len(evidence) > 0 {
		target = evidence[0].Gate
	}
	decision := GateAuthorityDecision{Version: Version, DryRun: true, ReadOnly: true, Gate: target, Status: "rejected_no_real_gate", Blocked: true, Evidence: evidence, RequiredGates: gates(), MissingGates: []string{target + "_REAL"}, Recommendations: defaultRecommendations()}
	var candidate *GateEvidence
	for i := range evidence {
		if target == "" || evidence[i].Gate == target {
			if evidence[i].UsableAsRealGate {
				decision.Status = "recognized_real_gate"
				decision.Recognized = true
				decision.Valid = true
				decision.Blocked = false
				decision.BlockedReasons = nil
				decision.MissingGates = nil
				return decision
			}
			if candidate == nil {
				candidate = &evidence[i]
			}
		}
	}
	if candidate == nil {
		decision.BlockedReasons = []string{"no evidence for requested gate"}
		return decision
	}
	decision.Status, decision.BlockedReasons = rejectStatus(*candidate)
	decision.UnsafeClaims = unsafeClaims(evidence)
	return decision
}

// BuildAuthoritySnapshot recognizes present real gates but never permits mutation.
func BuildAuthoritySnapshot(input GateAuthorityInput) GateAuthoritySnapshot {
	evidence := NormalizeGateEvidence(input)
	audit := AuditGateAuthority(input)
	s := GateAuthoritySnapshot{Version: Version, DryRun: true, ReadOnly: true, AuthorityStatus: "no_real_gates", Gates: evidence, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, RequiredGates: gates(), Recommendations: defaultRecommendations(), UnsafeClaims: audit.UnsafeClaims}
	for _, ev := range evidence {
		if !ev.UsableAsRealGate {
			continue
		}
		switch ev.Gate {
		case "PASS_GOLD":
			s.PassGoldReal = true
			if s.PassGoldSource == "" {
				s.PassGoldSource = ev.Source
			}
		case "PASS_SECURE":
			s.PassSecureReal = true
			if s.PassSecureSource == "" {
				s.PassSecureSource = ev.Source
			}
		}
	}
	if !s.PassGoldReal {
		s.MissingGates = append(s.MissingGates, "PASS_GOLD_REAL")
	}
	if !s.PassSecureReal {
		s.MissingGates = append(s.MissingGates, "PASS_SECURE_REAL")
	}
	if audit.UnsafeClaimsFound || audit.SynthesizedGateAttemptFound || audit.UnauthorizedGateFound || audit.DryRunGateClaimFound {
		s.AuthorityStatus = "blocked"
	} else if s.PassGoldReal && s.PassSecureReal {
		s.AuthorityStatus = "all_real_gates_recognized"
	} else if s.PassGoldReal || s.PassSecureReal {
		s.AuthorityStatus = "partial_real_gates"
	}
	return s
}

// AuditGateAuthority detects conflicts and unsafe real-gate claims.
func AuditGateAuthority(input GateAuthorityInput) GateAuthorityAuditResult {
	evidence := NormalizeGateEvidence(input)
	result := GateAuthorityAuditResult{Version: Version, DryRun: true, ReadOnly: true, Recommendations: defaultRecommendations()}
	statusByGate := map[string]map[string]bool{"PASS_GOLD": {}, "PASS_SECURE": {}}
	for _, ev := range evidence {
		if !isRequiredGate(ev.Gate) {
			continue
		}
		if ev.Status != "" {
			statusByGate[ev.Gate][ev.Status] = true
		}
		claimingGate := ev.Status == "pass" || ev.RealEvidence || ev.Gate != ""
		if ev.DryRun && claimingGate {
			result.DryRunGateClaimFound = true
			result.UnsafeClaims = append(result.UnsafeClaims, ev.Gate+" declared from dry-run evidence")
		}
		if ev.Synthesized && claimingGate {
			result.SynthesizedGateAttemptFound = true
			result.UnsafeClaims = append(result.UnsafeClaims, ev.Gate+" declared as synthesized gate evidence")
		}
		if !ev.AuthorizedSource && claimingGate {
			result.UnauthorizedGateFound = true
			result.UnsafeClaims = append(result.UnsafeClaims, ev.Gate+" declared by unauthorized source "+sourceName(ev.Source))
		}
		if ev.ArtifactID == "" && (ev.RealEvidence || ev.Status == "pass") {
			result.UnsafeClaims = append(result.UnsafeClaims, ev.Gate+" declared without explicit artifact_id")
		}
		if ev.PromotionAllowed {
			result.UnsafeClaims = append(result.UnsafeClaims, "promotion_allowed=true is forbidden in MCP gate authority")
		}
		if ev.DeployAllowed {
			result.UnsafeClaims = append(result.UnsafeClaims, "deploy_allowed=true is forbidden in MCP gate authority")
		}
		if ev.StatusPublishAllowed {
			result.UnsafeClaims = append(result.UnsafeClaims, "status_publish_allowed=true is forbidden in MCP gate authority")
		}
		if ev.MutationAllowed {
			result.UnsafeClaims = append(result.UnsafeClaims, "mutation_allowed=true is forbidden in MCP gate authority")
		}
		if ev.MemoryWriteAllowed {
			result.UnsafeClaims = append(result.UnsafeClaims, "memory_write_allowed=true is forbidden in MCP gate authority")
		}
		if strings.HasPrefix(ev.Source, "vision.") || stringIn(ev.Source, forbiddenSources) {
			result.UnsafeClaims = append(result.UnsafeClaims, "V8.x advisory source cannot declare real gate authority: "+sourceName(ev.Source))
		}
	}
	for gate, statuses := range statusByGate {
		if statuses["pass"] && statuses["fail"] {
			result.Conflicts = append(result.Conflicts, gate+" has simultaneous pass and fail claims")
		}
	}
	result.ConflictsFound = len(result.Conflicts) > 0
	result.UnsafeClaims = unique(result.UnsafeClaims)
	result.UnsafeClaimsFound = len(result.UnsafeClaims) > 0
	return result
}

// ExplainGateAuthority explains recognized/rejected gates and why recognition is not promotion.
func ExplainGateAuthority(input GateAuthorityInput) GateAuthorityExplainResult {
	evidence := NormalizeGateEvidence(input)
	out := GateAuthorityExplainResult{Version: Version, DryRun: true, ReadOnly: true, Summary: "V9.0 recognizes only explicit real PASS_GOLD/PASS_SECURE evidence from authorized sources; recognition never promotes or deploys from MCP.", AuthorityModel: []string{"authorized source + authorized artifact type + status=pass + dry_run=false + real_evidence=true + synthesized=false + artifact_id present", "dashboard/readiness/evidenceledger/contractregistry/policymatrix/codeburn/impeccable/dryrun/graphmemory and vision.* tools are advisory only", "MCP Gate Authority is read-only/dry-run and cannot publish status or mutate state"}, WhyNotPromoted: []string{"MCP Gate Authority is not an execution layer", "promotion_allowed, deploy_allowed, status_publish_allowed, mutation_allowed, and memory_write_allowed remain false even when all gates are recognized", "a future promotion layer must run outside MCP with real PASS_GOLD and PASS_SECURE artifacts plus explicit authorization"}, SafestNextSteps: defaultRecommendations(), RequiredGates: gates()}
	for _, ev := range evidence {
		if ev.UsableAsRealGate {
			out.RecognizedGates = append(out.RecognizedGates, ev.Gate+" from "+ev.Source)
		} else {
			status, _ := rejectStatus(ev)
			out.RejectedGates = append(out.RejectedGates, ev.Gate+" from "+sourceName(ev.Source)+" ("+status+")")
		}
	}
	return out
}

func collectEvidence(input GateAuthorityInput) []interface{} {
	items := []interface{}{}
	if input.Evidence != nil {
		items = append(items, input.Evidence)
	}
	items = appendEvidenceValue(items, input.Evidences)
	if len(items) == 0 && (input.Gate != "" || input.Source != "" || input.ArtifactID != "") {
		items = append(items, input)
	}
	return items
}

func appendEvidenceValue(items []interface{}, v interface{}) []interface{} {
	if v == nil {
		return items
	}
	switch typed := v.(type) {
	case []interface{}:
		return append(items, typed...)
	case []GateEvidence:
		for _, ev := range typed {
			items = append(items, ev)
		}
	case GateEvidence:
		return append(items, typed)
	default:
		items = append(items, typed)
	}
	return items
}

func decodeEvidence(v interface{}) GateEvidence {
	var ev GateEvidence
	b, _ := json.Marshal(v)
	_ = json.Unmarshal(b, &ev)
	var raw map[string]interface{}
	if err := json.Unmarshal(b, &raw); err == nil {
		ev.Details = raw
	}
	return ev
}

func rejectStatus(ev GateEvidence) (string, []string) {
	if ev.Synthesized {
		return "rejected_synthesized_gate", []string{"synthesized gate claims cannot become real PASS_GOLD/PASS_SECURE"}
	}
	if ev.DryRun {
		return "rejected_dry_run_gate", []string{"dry-run evidence cannot become a real gate"}
	}
	if ev.ArtifactID == "" {
		return "rejected_missing_artifact", []string{"real gate evidence requires explicit artifact_id"}
	}
	if !ev.AuthorizedSource {
		return "rejected_unauthorized_source", []string{"source is not authorized for real gate evidence"}
	}
	if !stringIn(ev.ArtifactType, authorizedArtifactTypes) {
		return "rejected_unauthorized_artifact_type", []string{"artifact_type is not authorized for real gate evidence"}
	}
	if !ev.RealEvidence {
		return "rejected_advisory_evidence", []string{"real_evidence=true is required"}
	}
	if ev.Status != "pass" {
		return "rejected_non_pass_status", []string{"status=pass is required"}
	}
	return "rejected_no_real_gate", []string{"evidence is not usable as a real gate"}
}

func unsafeClaims(evidence []GateEvidence) []string {
	return AuditGateAuthority(GateAuthorityInput{Evidences: evidence}).UnsafeClaims
}
func gates() []string            { return clone(requiredGates) }
func clone(in []string) []string { out := append([]string{}, in...); return out }
func normalizeGate(g string) string {
	g = strings.ToUpper(strings.TrimSpace(g))
	g = strings.TrimSuffix(g, "_REAL")
	return g
}
func isRequiredGate(g string) bool { return g == "PASS_GOLD" || g == "PASS_SECURE" }
func sourceName(s string) string {
	if s == "" {
		return "unknown"
	}
	return s
}

func stringIn(s string, list []string) bool {
	for _, item := range list {
		if s == item {
			return true
		}
	}
	return false
}

func unique(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, item := range in {
		if item == "" || seen[item] {
			continue
		}
		seen[item] = true
		out = append(out, item)
	}
	sort.Strings(out)
	return out
}

func defaultRecommendations() []string {
	return []string{
		"Require PASS_GOLD_REAL and PASS_SECURE_REAL from authorized non-MCP sources before any future promotion layer acts.",
		"Keep MCP authority tools read-only/dry-run and use them only to recognize, reject, audit, and explain gate evidence.",
		"For future real promotion, implement an external non-MCP execution layer with explicit artifact verification and authorization.",
	}
}
