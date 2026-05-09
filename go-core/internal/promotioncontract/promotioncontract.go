// Package promotioncontract implements the V9.1 External Promotion Executor Contract.
//
// The package is intentionally read-only and dry-run. It defines, validates,
// audits, and explains the payload boundary for a future external promotion
// executor, but it never promotes, deploys, publishes status, mutates state,
// writes memory, calls networks/APIs, executes commands, or invokes an external
// executor.
package promotioncontract

import "strings"

const Version = "V9.1"

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var requiredFields = []string{"request_id", "mission_id", "project", "branch", "commit_sha", "target", "environment", "executor"}
var requiredArtifacts = []string{"pass_gold_report", "pass_secure_report", "authority_snapshot", "promotion_request"}

var advisorySources = map[string]bool{
	"mcp": true, "mcp_readonly": true, "dashboard": true, "readiness": true,
	"evidenceledger": true, "contractregistry": true, "policymatrix": true,
	"codeburn": true, "impeccable": true, "dryrun": true, "graphmemory": true,
	"unknown": true,
}

// PromotionContractInput is the flexible request accepted by all V9.1 tools.
type PromotionContractInput struct {
	Root                string              `json:"root,omitempty"`
	MissionInput        string              `json:"mission_input,omitempty"`
	Operation           string              `json:"operation,omitempty"`
	Request             PromotionRequest    `json:"request,omitempty"`
	Evidence            interface{}         `json:"evidence,omitempty"`
	Evidences           interface{}         `json:"evidences,omitempty"`
	Gates               []PromotionGate     `json:"gates,omitempty"`
	Artifacts           []PromotionArtifact `json:"artifacts,omitempty"`
	Target              string              `json:"target,omitempty"`
	Environment         string              `json:"environment,omitempty"`
	Executor            string              `json:"executor,omitempty"`
	ArtifactID          string              `json:"artifact_id,omitempty"`
	Strict              bool                `json:"strict,omitempty"`
	AttemptExternalCall bool                `json:"attempt_external_call,omitempty"`
}

// PromotionRequest is the normalized formal payload for future external promotion.
type PromotionRequest struct {
	RequestID            string              `json:"request_id,omitempty"`
	MissionID            string              `json:"mission_id,omitempty"`
	Project              string              `json:"project,omitempty"`
	Branch               string              `json:"branch,omitempty"`
	CommitSHA            string              `json:"commit_sha,omitempty"`
	Target               string              `json:"target,omitempty"`
	Environment          string              `json:"environment,omitempty"`
	RequestedBy          string              `json:"requested_by,omitempty"`
	Executor             string              `json:"executor,omitempty"`
	Operation            string              `json:"operation,omitempty"`
	Gates                []PromotionGate     `json:"gates,omitempty"`
	Artifacts            []PromotionArtifact `json:"artifacts,omitempty"`
	AuthoritySnapshot    interface{}         `json:"authority_snapshot,omitempty"`
	DryRun               bool                `json:"dry_run,omitempty"`
	ReadOnly             bool                `json:"read_only,omitempty"`
	PromotionAllowed     bool                `json:"promotion_allowed,omitempty"`
	DeployAllowed        bool                `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed bool                `json:"status_publish_allowed,omitempty"`
	MutationAllowed      bool                `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed   bool                `json:"memory_write_allowed,omitempty"`
}

// PromotionGate is candidate gate evidence for PASS_GOLD/PASS_SECURE.
type PromotionGate struct {
	Gate                  string `json:"gate,omitempty"`
	Status                string `json:"status,omitempty"`
	Source                string `json:"source,omitempty"`
	ArtifactID            string `json:"artifact_id,omitempty"`
	ArtifactType          string `json:"artifact_type,omitempty"`
	RealEvidence          bool   `json:"real_evidence,omitempty"`
	DryRun                bool   `json:"dry_run,omitempty"`
	Synthesized           bool   `json:"synthesized,omitempty"`
	RecognizedByAuthority bool   `json:"recognized_by_authority,omitempty"`
}

// PromotionArtifact describes an artifact required before future external execution.
type PromotionArtifact struct {
	ID       string `json:"id,omitempty"`
	Type     string `json:"type,omitempty"`
	Source   string `json:"source,omitempty"`
	Summary  string `json:"summary,omitempty"`
	Required bool   `json:"required,omitempty"`
	Present  bool   `json:"present,omitempty"`
	Trusted  bool   `json:"trusted,omitempty"`
}

type PromotionContractValidation struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	Valid                      bool     `json:"valid"`
	Blocked                    bool     `json:"blocked"`
	ContractStatus             string   `json:"contract_status"`
	MissingFields              []string `json:"missing_fields"`
	MissingGates               []string `json:"missing_gates"`
	MissingArtifacts           []string `json:"missing_artifacts"`
	UnsafeClaims               []string `json:"unsafe_claims"`
	RequiredGates              []string `json:"required_gates"`
	WouldAllowExternalExecutor bool     `json:"would_allow_external_executor"`
	MCPExecutionAllowed        bool     `json:"mcp_execution_allowed"`
	PromotionAllowed           bool     `json:"promotion_allowed"`
	DeployAllowed              bool     `json:"deploy_allowed"`
	StatusPublishAllowed       bool     `json:"status_publish_allowed"`
	MutationAllowed            bool     `json:"mutation_allowed"`
	MemoryWriteAllowed         bool     `json:"memory_write_allowed"`
	Recommendations            []string `json:"recommendations"`
}

type PromotionContractSnapshot struct {
	Version                    string            `json:"version"`
	DryRun                     bool              `json:"dry_run"`
	ReadOnly                   bool              `json:"read_only"`
	ContractStatus             string            `json:"contract_status"`
	Request                    PromotionRequest  `json:"request"`
	RequiredFields             []string          `json:"required_fields"`
	RequiredGates              []string          `json:"required_gates"`
	RequiredArtifacts          []string          `json:"required_artifacts"`
	Boundary                   PromotionBoundary `json:"boundary"`
	WouldAllowExternalExecutor bool              `json:"would_allow_external_executor"`
	MCPExecutionAllowed        bool              `json:"mcp_execution_allowed"`
	PromotionAllowed           bool              `json:"promotion_allowed"`
	DeployAllowed              bool              `json:"deploy_allowed"`
	StatusPublishAllowed       bool              `json:"status_publish_allowed"`
	MutationAllowed            bool              `json:"mutation_allowed"`
	MemoryWriteAllowed         bool              `json:"memory_write_allowed"`
	Recommendations            []string          `json:"recommendations"`
}

type PromotionBoundary struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	MCPScope                        []string `json:"mcp_scope"`
	ExternalExecutorScope           []string `json:"external_executor_scope"`
	ForbiddenInsideMCP              []string `json:"forbidden_inside_mcp"`
	RequiredBeforeExternalExecution []string `json:"required_before_external_execution"`
	AllowedOnlyOutsideMCP           []string `json:"allowed_only_outside_mcp"`
}

type PromotionContractAudit struct {
	Version                  string   `json:"version"`
	DryRun                   bool     `json:"dry_run"`
	ReadOnly                 bool     `json:"read_only"`
	ConflictsFound           bool     `json:"conflicts_found"`
	Conflicts                []string `json:"conflicts"`
	UnsafeClaimsFound        bool     `json:"unsafe_claims_found"`
	UnsafeClaims             []string `json:"unsafe_claims"`
	MissingRequirementsFound bool     `json:"missing_requirements_found"`
	MissingRequirements      []string `json:"missing_requirements"`
	ExecutorCallAttemptFound bool     `json:"executor_call_attempt_found"`
	Recommendations          []string `json:"recommendations"`
}

type PromotionContractExplain struct {
	Version                     string   `json:"version"`
	DryRun                      bool     `json:"dry_run"`
	ReadOnly                    bool     `json:"read_only"`
	Summary                     string   `json:"summary"`
	ContractModel               []string `json:"contract_model"`
	RequiredForExternalExecutor []string `json:"required_for_external_executor"`
	WhyMCPCannotExecute         []string `json:"why_mcp_cannot_execute"`
	BlockedActions              []string `json:"blocked_actions"`
	SafestNextSteps             []string `json:"safest_next_steps"`
	RequiredGates               []string `json:"required_gates"`
}

func BuildContractSnapshot(input PromotionContractInput) PromotionContractSnapshot {
	v := ValidateContract(input)
	status := v.ContractStatus
	return PromotionContractSnapshot{Version: Version, DryRun: true, ReadOnly: true, ContractStatus: status,
		Request: NormalizePromotionRequest(input), RequiredFields: append([]string{}, requiredFields...), RequiredGates: RequiredGates(), RequiredArtifacts: append([]string{}, requiredArtifacts...), Boundary: BuildBoundary(),
		WouldAllowExternalExecutor: v.WouldAllowExternalExecutor, MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false,
		Recommendations: v.Recommendations}
}

func ValidateContract(input PromotionContractInput) PromotionContractValidation {
	req := NormalizePromotionRequest(input)
	missingFields := missingRequestFields(req)
	missingGates := missingRealGates(input)
	missingArtifacts := missingRequiredArtifacts(input)
	unsafe := unsafeClaims(input)
	eligible, reasons := EvaluateExternalEligibility(input)
	status := contractStatus(missingFields, missingGates, missingArtifacts, unsafe, eligible)
	blocked := len(unsafe) > 0
	valid := eligible && !blocked
	return PromotionContractValidation{Version: Version, DryRun: true, ReadOnly: true, Valid: valid, Blocked: blocked, ContractStatus: status,
		MissingFields: missingFields, MissingGates: missingGates, MissingArtifacts: missingArtifacts, UnsafeClaims: unsafe, RequiredGates: RequiredGates(), WouldAllowExternalExecutor: eligible,
		MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, Recommendations: recommendations(reasons, unsafe)}
}

func BuildBoundary() PromotionBoundary {
	return PromotionBoundary{Version: Version, DryRun: true, ReadOnly: true,
		MCPScope:                        []string{"read", "validate", "audit", "explain", "simulate_contract"},
		ExternalExecutorScope:           []string{"future_external_promotion", "future_external_deploy", "future_external_status_publish", "future_external_rollback_policy_enforcement"},
		ForbiddenInsideMCP:              []string{"promote", "deploy", "publish_status", "push", "PR", "mutate", "write_memory", "call_external_executor"},
		RequiredBeforeExternalExecution: []string{"PASS_GOLD_REAL", "PASS_SECURE_REAL", "valid authority_snapshot", "explicit artifacts", "explicit authorization", "declared target", "declared environment", "future rollback policy"},
		AllowedOnlyOutsideMCP:           []string{"promote", "deploy", "publish_status", "push", "open_PR", "write_memory", "call_external_executor"}}
}

func AuditContract(input PromotionContractInput) PromotionContractAudit {
	v := ValidateContract(input)
	conflicts := []string{}
	req := NormalizePromotionRequest(input)
	if allRealGatesPresent(input) && req.PromotionAllowed {
		conflicts = append(conflicts, "all real gates recognized but promotion_allowed=true is still forbidden inside MCP")
	}
	if isMCPExecutor(req.Executor) {
		conflicts = append(conflicts, "executor=mcp conflicts with external executor boundary")
	}
	return PromotionContractAudit{Version: Version, DryRun: true, ReadOnly: true,
		ConflictsFound: len(conflicts) > 0, Conflicts: conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims,
		MissingRequirementsFound: len(v.MissingFields)+len(v.MissingGates)+len(v.MissingArtifacts) > 0, MissingRequirements: append(append(append([]string{}, v.MissingFields...), v.MissingGates...), v.MissingArtifacts...),
		ExecutorCallAttemptFound: input.AttemptExternalCall, Recommendations: v.Recommendations}
}

func ExplainContract(input PromotionContractInput) PromotionContractExplain {
	return PromotionContractExplain{Version: Version, DryRun: true, ReadOnly: true,
		Summary:                     "V9.1 defines a dry-run/read-only boundary contract for a future external promotion executor; it never executes promotion inside MCP.",
		ContractModel:               []string{"normalize promotion request", "validate required fields", "require PASS_GOLD_REAL and PASS_SECURE_REAL", "require trusted artifacts", "audit unsafe execution claims", "simulate external executor eligibility only"},
		RequiredForExternalExecutor: []string{"request_id", "mission_id", "project", "branch", "commit_sha", "target", "environment", "external executor", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "pass_gold_report", "pass_secure_report", "authority_snapshot", "promotion_request"},
		WhyMCPCannotExecute:         []string{"MCP is a read-only control plane", "V9.1 only validates and explains contract sufficiency", "real promotion/deploy/status/memory mutations must remain outside MCP", "no external executor call is implemented or allowed in V9.1"},
		BlockedActions:              []string{"promote", "deploy", "publish_status", "push", "PR", "mutate", "write_memory", "call_external_executor"},
		SafestNextSteps:             []string{"collect real PASS_GOLD/PASS_SECURE artifacts", "capture authority snapshot", "declare target/environment/external executor", "keep MCP dry-run/read-only", "implement any future executor outside MCP with separate authorization"},
		RequiredGates:               RequiredGates()}
}

func NormalizePromotionRequest(input PromotionContractInput) PromotionRequest {
	req := input.Request
	if req.Target == "" {
		req.Target = input.Target
	}
	if req.Environment == "" {
		req.Environment = input.Environment
	}
	if req.Executor == "" {
		req.Executor = input.Executor
	}
	if req.Operation == "" {
		req.Operation = input.Operation
	}
	if len(req.Gates) == 0 {
		req.Gates = input.Gates
	}
	if len(req.Artifacts) == 0 {
		req.Artifacts = input.Artifacts
	}
	return req
}

func EvaluateExternalEligibility(input PromotionContractInput) (bool, []string) {
	reasons := []string{}
	req := NormalizePromotionRequest(input)
	if missing := missingRequestFields(req); len(missing) > 0 {
		reasons = append(reasons, prefixAll("missing field: ", missing)...)
	}
	if missing := missingRealGates(input); len(missing) > 0 {
		reasons = append(reasons, prefixAll("missing gate: ", missing)...)
	}
	if missing := missingRequiredArtifacts(input); len(missing) > 0 {
		reasons = append(reasons, prefixAll("missing artifact: ", missing)...)
	}
	if unsafe := unsafeClaims(input); len(unsafe) > 0 {
		reasons = append(reasons, prefixAll("unsafe claim: ", unsafe)...)
	}
	if req.Executor == "" {
		reasons = append(reasons, "executor must be declared")
	} else if isMCPExecutor(req.Executor) {
		reasons = append(reasons, "executor must be external, not MCP")
	}
	if req.Target == "" {
		reasons = append(reasons, "target must be declared")
	}
	if req.Environment == "" {
		reasons = append(reasons, "environment must be declared")
	}
	return len(reasons) == 0, reasons
}

func RequiredGates() []string { return append([]string{}, requiredGates...) }

func missingRequestFields(req PromotionRequest) []string {
	checks := map[string]string{"request_id": req.RequestID, "mission_id": req.MissionID, "project": req.Project, "branch": req.Branch, "commit_sha": req.CommitSHA, "target": req.Target, "environment": req.Environment, "executor": req.Executor}
	out := []string{}
	for _, f := range requiredFields {
		if strings.TrimSpace(checks[f]) == "" {
			out = append(out, f)
		}
	}
	return out
}

func missingRealGates(input PromotionContractInput) []string {
	gold, secure := false, false
	for _, g := range allGates(input) {
		if isRealGate(g) {
			switch normalize(g.Gate) {
			case "pass_gold":
				gold = true
			case "pass_secure":
				secure = true
			}
		}
	}
	out := []string{}
	if !gold {
		out = append(out, "PASS_GOLD_REAL")
	}
	if !secure {
		out = append(out, "PASS_SECURE_REAL")
	}
	return out
}

func missingRequiredArtifacts(input PromotionContractInput) []string {
	arts := NormalizePromotionRequest(input).Artifacts
	present := map[string]bool{}
	for _, a := range arts {
		if a.Present && a.Trusted && a.ID != "" {
			present[normalize(a.Type)] = true
		}
	}
	out := []string{}
	for _, typ := range requiredArtifacts {
		if !present[normalize(typ)] {
			out = append(out, typ)
		}
	}
	return out
}

func unsafeClaims(input PromotionContractInput) []string {
	req := NormalizePromotionRequest(input)
	out := []string{}
	if isMCPExecutor(req.Executor) {
		out = append(out, "executor=mcp is forbidden for promotion execution")
	}
	if req.PromotionAllowed {
		out = append(out, "promotion_allowed=true is forbidden inside MCP")
	}
	if req.DeployAllowed {
		out = append(out, "deploy_allowed=true is forbidden inside MCP")
	}
	if req.StatusPublishAllowed {
		out = append(out, "status_publish_allowed=true is forbidden inside MCP")
	}
	if req.MutationAllowed {
		out = append(out, "mutation_allowed=true is forbidden inside MCP")
	}
	if req.MemoryWriteAllowed {
		out = append(out, "memory_write_allowed=true is forbidden inside MCP")
	}
	if input.AttemptExternalCall {
		out = append(out, "attempt_external_call=true is forbidden inside MCP")
	}
	for _, g := range allGates(input) {
		name := strings.ToUpper(g.Gate)
		if (name == "PASS_GOLD" || name == "PASS_SECURE") && g.DryRun {
			out = append(out, name+" dry_run evidence cannot be used as a real gate")
		}
		if (name == "PASS_GOLD" || name == "PASS_SECURE") && g.Synthesized {
			out = append(out, name+" synthesized gate cannot be used as real evidence")
		}
		if (name == "PASS_GOLD" || name == "PASS_SECURE") && advisorySources[normalize(g.Source)] {
			out = append(out, name+" advisory source cannot be used as a real gate: "+g.Source)
		}
	}
	return dedupe(out)
}

func allGates(input PromotionContractInput) []PromotionGate {
	if len(input.Gates) > 0 {
		return input.Gates
	}
	return input.Request.Gates
}

func isRealGate(g PromotionGate) bool {
	gate := normalize(g.Gate)
	return (gate == "pass_gold" || gate == "pass_secure") && normalize(g.Status) == "pass" && g.RealEvidence && !g.DryRun && !g.Synthesized && g.RecognizedByAuthority && !advisorySources[normalize(g.Source)] && g.ArtifactID != ""
}

func allRealGatesPresent(input PromotionContractInput) bool { return len(missingRealGates(input)) == 0 }
func isMCPExecutor(s string) bool                           { n := normalize(s); return n == "mcp" || n == "mcp_readonly" }
func normalize(s string) string                             { return strings.ToLower(strings.TrimSpace(s)) }

func contractStatus(fields, gates, artifacts, unsafe []string, eligible bool) string {
	if len(unsafe) > 0 {
		return "blocked"
	}
	if len(fields) > 0 || len(artifacts) > 0 {
		return "incomplete"
	}
	if len(gates) > 0 {
		return "missing_real_gates"
	}
	if eligible {
		return "externally_eligible_dry_run"
	}
	return "incomplete"
}

func recommendations(reasons, unsafe []string) []string {
	if len(reasons) == 0 && len(unsafe) == 0 {
		return []string{"contract is externally eligible in dry-run only; do not execute inside MCP"}
	}
	out := []string{"keep MCP dry-run/read-only", "do not call an external executor from MCP", "provide real PASS_GOLD/PASS_SECURE authority-recognized artifacts"}
	return dedupe(out)
}

func prefixAll(prefix string, items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, prefix+item)
	}
	return out
}
func dedupe(items []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			out = append(out, item)
		}
	}
	return out
}
