// Package promotionfirewall implements V10.1 Promotion Execution Eligibility Firewall.
//
// The firewall is a read-only/dry-run boundary between a V10.0
// promotion_decision_candidate=true advisory result and any future real execution
// layer. It never promotes, deploys, publishes status, writes memory, learns
// stable state, calls an executor, calls networks, executes commands, writes
// files, executes rollback, opens PRs, pushes, or acquires real locks.
package promotionfirewall

import (
	"strings"

	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V10.1"

const (
	StatusExecutionEligibilityReadyDryRun = "execution_eligibility_ready_dry_run"
	StatusIncomplete                      = "incomplete"
	StatusBlocked                         = "blocked"
	StatusMissingRealGates                = "missing_real_gates"
	StatusHumanApprovalRequired           = "human_approval_required"
	StatusRevalidationRequired            = "revalidation_required"
	StatusUnsafeExecutionClaim            = "unsafe_execution_claim"
)

var requiredItems = []string{
	"decision_id", "executor", "executor_mode", "external_only", "promotion_decision_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL",
	"human_approval", "independent_revalidation", "rollback_requirements", "observability_requirements", "policy", "controls",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var forbiddenInsideMCP = []string{
	"call_executor", "acquire_lock", "promote", "promote_stable", "deploy", "publish_status", "push", "PR", "open_pr", "mutate", "write_memory", "learn_stable",
	"execute_rollback", "command_execution", "network_call", "file_write", "status_publication", "memory_persistence", "stable_promotion",
}

type PromotionFirewallInput struct {
	Root                            string                                     `json:"root,omitempty"`
	Operation                       string                                     `json:"operation,omitempty"`
	PromotionFirewall               *PromotionFirewallInput                    `json:"promotion_firewall,omitempty"`
	Firewall                        *PromotionFirewallInput                    `json:"firewall,omitempty"`
	SovereignDecision               *sovereigndecision.SovereignDecisionResult `json:"sovereign_decision,omitempty"`
	Decision                        *sovereigndecision.SovereignDecisionResult `json:"decision,omitempty"`
	DecisionID                      string                                     `json:"decision_id,omitempty"`
	Executor                        string                                     `json:"executor,omitempty"`
	ExecutorMode                    string                                     `json:"executor_mode,omitempty"`
	PromotionDecisionCandidate      bool                                       `json:"promotion_decision_candidate"`
	ExecutionEligibilityReadyDryRun bool                                       `json:"execution_eligibility_ready_dry_run,omitempty"`
	RealGates                       []sovereigndecision.SovereignRealGate      `json:"real_gates,omitempty"`
	HumanApproval                   *HumanApproval                             `json:"human_approval,omitempty"`
	IndependentRevalidation         *IndependentRevalidation                   `json:"independent_revalidation,omitempty"`
	RollbackRequirements            *RollbackRequirements                      `json:"rollback_requirements,omitempty"`
	ObservabilityRequirements       *ObservabilityRequirements                 `json:"observability_requirements,omitempty"`
	Policy                          *FirewallPolicy                            `json:"policy,omitempty"`
	Controls                        *FirewallControls                          `json:"controls,omitempty"`
	Claims                          *FirewallClaims                            `json:"claims,omitempty"`
	MCPExecutionAllowed             bool                                       `json:"mcp_execution_allowed,omitempty"`
	ExecutionAllowed                bool                                       `json:"execution_allowed,omitempty"`
	ExecutorCallAllowed             bool                                       `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed              bool                                       `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed         bool                                       `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed                bool                                       `json:"file_write_allowed,omitempty"`
	PromotionAllowed                bool                                       `json:"promotion_allowed,omitempty"`
	DeployAllowed                   bool                                       `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed            bool                                       `json:"status_publish_allowed,omitempty"`
	MemoryWriteAllowed              bool                                       `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed          bool                                       `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed                 bool                                       `json:"learning_allowed,omitempty"`
}

type HumanApproval struct {
	Present               bool   `json:"present"`
	Approved              bool   `json:"approved"`
	Approver              string `json:"approver,omitempty"`
	ApprovalReference     string `json:"approval_reference,omitempty"`
	ApprovalIsPlaceholder bool   `json:"approval_is_placeholder"`
	Valid                 bool   `json:"valid"`
}

type IndependentRevalidation struct {
	Present                   bool   `json:"present"`
	Completed                 bool   `json:"completed"`
	Validator                 string `json:"validator,omitempty"`
	RevalidationReference     string `json:"revalidation_reference,omitempty"`
	RevalidationIsPlaceholder bool   `json:"revalidation_is_placeholder"`
	Valid                     bool   `json:"valid"`
}

type RollbackRequirements struct {
	Present                      bool `json:"present"`
	RollbackPlanPresent          bool `json:"rollback_plan_present"`
	RealRollbackExecutionAllowed bool `json:"real_rollback_execution_allowed"`
	Valid                        bool `json:"valid"`
}
type ObservabilityRequirements struct {
	Present             bool `json:"present"`
	HealthChecksPresent bool `json:"health_checks_present"`
	MetricsPresent      bool `json:"metrics_present"`
	AlertingPresent     bool `json:"alerting_present"`
	Valid               bool `json:"valid"`
}
type FirewallPolicy struct {
	Present               bool `json:"present"`
	RejectExecutionClaims bool `json:"reject_execution_claims"`
	RequireExternalOnly   bool `json:"require_external_only"`
	RequireReadOnlyDryRun bool `json:"require_read_only_dry_run"`
	Valid                 bool `json:"valid"`
}
type FirewallControls struct {
	Present            bool `json:"present"`
	ReadOnly           bool `json:"read_only"`
	DryRun             bool `json:"dry_run"`
	NoExecutorCall     bool `json:"no_executor_call"`
	NoNetworkCall      bool `json:"no_network_call"`
	NoCommandExecution bool `json:"no_command_execution"`
	NoFileWrite        bool `json:"no_file_write"`
	NoRealLock         bool `json:"no_real_lock"`
	Valid              bool `json:"valid"`
}

type FirewallClaims struct {
	MCPExecutionAllowed     bool `json:"mcp_execution_allowed"`
	ExecutionAllowed        bool `json:"execution_allowed"`
	ExecutorCallAllowed     bool `json:"executor_call_allowed"`
	NetworkCallAllowed      bool `json:"network_call_allowed"`
	CommandExecutionAllowed bool `json:"command_execution_allowed"`
	FileWriteAllowed        bool `json:"file_write_allowed"`
	PromotionAllowed        bool `json:"promotion_allowed"`
	DeployAllowed           bool `json:"deploy_allowed"`
	StatusPublishAllowed    bool `json:"status_publish_allowed"`
	MemoryWriteAllowed      bool `json:"memory_write_allowed"`
	StablePromotionAllowed  bool `json:"stable_promotion_allowed"`
	LearningAllowed         bool `json:"learning_allowed"`
}

type PromotionFirewallResult struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	FirewallStatus                  string   `json:"firewall_status"`
	ExecutionEligibilityReadyDryRun bool     `json:"execution_eligibility_ready_dry_run"`
	Valid                           bool     `json:"valid"`
	Blocked                         bool     `json:"blocked"`
	MissingItems                    []string `json:"missing_items"`
	UnsafeClaims                    []string `json:"unsafe_claims"`
	Conflicts                       []string `json:"conflicts"`
	BlockingReasons                 []string `json:"blocking_reasons"`
	RequiredItems                   []string `json:"required_items"`
	RequiredRealGates               []string `json:"required_real_gates"`
	Recommendations                 []string `json:"recommendations"`
	MCPExecutionAllowed             bool     `json:"mcp_execution_allowed"`
	ExecutorCallAllowed             bool     `json:"executor_call_allowed"`
	NetworkCallAllowed              bool     `json:"network_call_allowed"`
	CommandExecutionAllowed         bool     `json:"command_execution_allowed"`
	FileWriteAllowed                bool     `json:"file_write_allowed"`
	PromotionAllowed                bool     `json:"promotion_allowed"`
	DeployAllowed                   bool     `json:"deploy_allowed"`
	StatusPublishAllowed            bool     `json:"status_publish_allowed"`
	MemoryWriteAllowed              bool     `json:"memory_write_allowed"`
	StablePromotionAllowed          bool     `json:"stable_promotion_allowed"`
	LearningAllowed                 bool     `json:"learning_allowed"`
}

type PromotionFirewallValidation = PromotionFirewallResult

type PromotionFirewallBoundary struct {
	Version                   string   `json:"version"`
	DryRun                    bool     `json:"dry_run"`
	ReadOnly                  bool     `json:"read_only"`
	MCPScope                  []string `json:"mcp_scope"`
	ForbiddenInsideMCP        []string `json:"forbidden_inside_mcp"`
	RequiredBeforeEligibility []string `json:"required_before_eligibility"`
	AlwaysDenied              []string `json:"always_denied"`
	RequiredRealGates         []string `json:"required_real_gates"`
}

type PromotionFirewallAudit struct {
	Version                  string   `json:"version"`
	DryRun                   bool     `json:"dry_run"`
	ReadOnly                 bool     `json:"read_only"`
	ConflictsFound           bool     `json:"conflicts_found"`
	Conflicts                []string `json:"conflicts"`
	UnsafeClaimsFound        bool     `json:"unsafe_claims_found"`
	UnsafeClaims             []string `json:"unsafe_claims"`
	MissingItemsFound        bool     `json:"missing_items_found"`
	MissingItems             []string `json:"missing_items"`
	ExecutorCallAttemptFound bool     `json:"executor_call_attempt_found"`
	ExecutionClaimFound      bool     `json:"execution_claim_found"`
	PromotionAttemptFound    bool     `json:"promotion_attempt_found"`
	FileWriteAttemptFound    bool     `json:"file_write_attempt_found"`
	Recommendations          []string `json:"recommendations"`
}

type PromotionFirewallExplain struct {
	Version                      string   `json:"version"`
	DryRun                       bool     `json:"dry_run"`
	ReadOnly                     bool     `json:"read_only"`
	Summary                      string   `json:"summary"`
	FirewallModel                []string `json:"firewall_model"`
	WhyEligibilityIsNotExecution []string `json:"why_eligibility_is_not_execution"`
	AlwaysDenied                 []string `json:"always_denied"`
	BlockedActions               []string `json:"blocked_actions"`
	SafestNextSteps              []string `json:"safest_next_steps"`
	RequiredGates                []string `json:"required_gates"`
}

func BuildPromotionFirewall(input PromotionFirewallInput) PromotionFirewallResult {
	return ValidatePromotionFirewall(input)
}

func ValidatePromotionFirewall(input PromotionFirewallInput) PromotionFirewallValidation {
	input = NormalizePromotionFirewall(input)
	missing, unsafe, conflicts, blocking := []string{}, []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s); blocking = appendUnique(blocking, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s); blocking = appendUnique(blocking, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s); blocking = appendUnique(blocking, s) }
	if input.DecisionID == "" {
		addMissing("decision_id")
	}
	if input.Executor == "" {
		addMissing("executor")
	}
	if isMCP(input.Executor) {
		addConflict("executor_must_not_be_mcp")
	}
	if input.ExecutorMode != "external_only" {
		addMissing("external_only")
		addConflict("executor_mode_must_be_external_only")
	}
	if !input.PromotionDecisionCandidate {
		addMissing("promotion_decision_candidate")
	}
	gold, secure := false, false
	for _, g := range input.RealGates {
		gate := normalizeGate(g.Gate)
		if g.DryRun {
			addConflict(gate + "_dry_run_gate_claim")
		}
		if g.Synthesized {
			addConflict(gate + "_synthesized_gate_claim")
		}
		if !g.RecognizedByAuthority {
			addConflict(gate + "_not_recognized_by_authority")
		}
		if !g.RealEvidence {
			addConflict(gate + "_missing_real_evidence")
		}
		if strings.ToLower(g.Status) != "pass" {
			addConflict(gate + "_status_not_pass")
		}
		good := g.RealEvidence && !g.DryRun && !g.Synthesized && g.RecognizedByAuthority && strings.ToLower(g.Status) == "pass"
		if gate == "PASS_GOLD" && good {
			gold = true
		}
		if gate == "PASS_SECURE" && good {
			secure = true
		}
	}
	if !gold {
		addMissing("PASS_GOLD_REAL")
	}
	if !secure {
		addMissing("PASS_SECURE_REAL")
	}
	if input.HumanApproval == nil || !input.HumanApproval.Present || !input.HumanApproval.Approved {
		addMissing("human_approval")
	} else if input.HumanApproval.ApprovalIsPlaceholder || input.HumanApproval.Approver == "" || input.HumanApproval.ApprovalReference == "" {
		addConflict("human_approval_placeholder")
	}
	if input.IndependentRevalidation == nil || !input.IndependentRevalidation.Present || !input.IndependentRevalidation.Completed {
		addMissing("independent_revalidation")
	} else if input.IndependentRevalidation.RevalidationIsPlaceholder || input.IndependentRevalidation.Validator == "" || input.IndependentRevalidation.RevalidationReference == "" {
		addConflict("independent_revalidation_placeholder")
	}
	if input.RollbackRequirements == nil || !input.RollbackRequirements.Present {
		addMissing("rollback_requirements")
	}
	if input.ObservabilityRequirements == nil || !input.ObservabilityRequirements.Present {
		addMissing("observability_requirements")
	}
	if input.Policy == nil || !input.Policy.Present {
		addMissing("policy")
	}
	if input.Controls == nil || !input.Controls.Present {
		addMissing("controls")
	}
	if input.Claims != nil {
		addUnsafeClaims(input.Claims, addUnsafe)
	}
	valid := len(missing) == 0 && len(unsafe) == 0 && len(conflicts) == 0
	status := firewallStatus(missing, unsafe, conflicts)
	return PromotionFirewallResult{Version: Version, DryRun: true, ReadOnly: true, FirewallStatus: status, ExecutionEligibilityReadyDryRun: valid, Valid: valid, Blocked: !valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(missing, unsafe, conflicts)}
}

func BuildPromotionFirewallBoundary() PromotionFirewallBoundary {
	return PromotionFirewallBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPScope: []string{"read", "validate", "audit", "explain", "simulate_promotion_execution_eligibility_firewall"}, ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeEligibility: clone(requiredItems), AlwaysDenied: alwaysDenied(), RequiredRealGates: clone(requiredGates)}
}

func AuditPromotionFirewall(input PromotionFirewallInput) PromotionFirewallAudit {
	input = NormalizePromotionFirewall(input)
	v := ValidatePromotionFirewall(input)
	a := PromotionFirewallAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	if input.Claims != nil {
		a.ExecutorCallAttemptFound = input.Claims.ExecutorCallAllowed
		a.ExecutionClaimFound = input.Claims.ExecutionAllowed || input.Claims.MCPExecutionAllowed || input.Claims.NetworkCallAllowed || input.Claims.CommandExecutionAllowed
		a.PromotionAttemptFound = input.Claims.PromotionAllowed || input.Claims.DeployAllowed || input.Claims.StatusPublishAllowed || input.Claims.MemoryWriteAllowed || input.Claims.StablePromotionAllowed || input.Claims.LearningAllowed
		a.FileWriteAttemptFound = input.Claims.FileWriteAllowed
	}
	return a
}

func ExplainPromotionFirewall(input PromotionFirewallInput) PromotionFirewallExplain {
	return PromotionFirewallExplain{Version: Version, DryRun: true, ReadOnly: true, Summary: "V10.1 is a read-only/dry-run firewall between promotion_decision_candidate=true and any future real execution layer.", FirewallModel: []string{"consume V10.0 candidate as advisory input", "validate real gates and approvals", "reject execution claims", "always deny MCP execution and side effects"}, WhyEligibilityIsNotExecution: []string{"execution_eligibility_ready_dry_run is advisory only", "MCP is a read-only control plane", "executor calls, network calls, commands, file writes, promotion, deploy, status publication, memory writes, stable promotion, and learning remain false"}, AlwaysDenied: alwaysDenied(), BlockedActions: clone(forbiddenInsideMCP), SafestNextSteps: []string{"keep MCP dry-run/read-only", "obtain non-placeholder human approval", "perform independent revalidation", "require future execution outside MCP with separate authorization"}, RequiredGates: clone(requiredGates)}
}

func NormalizePromotionFirewall(input PromotionFirewallInput) PromotionFirewallInput {
	if input.PromotionFirewall != nil {
		input = mergeInput(input, *input.PromotionFirewall)
	}
	if input.Firewall != nil {
		input = mergeInput(input, *input.Firewall)
	}
	if input.SovereignDecision != nil {
		input = mergeDecision(input, *input.SovereignDecision)
	}
	if input.Decision != nil {
		input = mergeDecision(input, *input.Decision)
	}
	if input.Claims == nil {
		input.Claims = &FirewallClaims{}
	}
	input.Claims.MCPExecutionAllowed = input.Claims.MCPExecutionAllowed || input.MCPExecutionAllowed
	input.Claims.ExecutionAllowed = input.Claims.ExecutionAllowed || input.ExecutionAllowed
	input.Claims.ExecutorCallAllowed = input.Claims.ExecutorCallAllowed || input.ExecutorCallAllowed
	input.Claims.NetworkCallAllowed = input.Claims.NetworkCallAllowed || input.NetworkCallAllowed
	input.Claims.CommandExecutionAllowed = input.Claims.CommandExecutionAllowed || input.CommandExecutionAllowed
	input.Claims.FileWriteAllowed = input.Claims.FileWriteAllowed || input.FileWriteAllowed
	input.Claims.PromotionAllowed = input.Claims.PromotionAllowed || input.PromotionAllowed
	input.Claims.DeployAllowed = input.Claims.DeployAllowed || input.DeployAllowed
	input.Claims.StatusPublishAllowed = input.Claims.StatusPublishAllowed || input.StatusPublishAllowed
	input.Claims.MemoryWriteAllowed = input.Claims.MemoryWriteAllowed || input.MemoryWriteAllowed
	input.Claims.StablePromotionAllowed = input.Claims.StablePromotionAllowed || input.StablePromotionAllowed
	input.Claims.LearningAllowed = input.Claims.LearningAllowed || input.LearningAllowed
	return input
}

func mergeInput(base, nested PromotionFirewallInput) PromotionFirewallInput {
	if base.DecisionID == "" {
		base.DecisionID = nested.DecisionID
	}
	if base.Executor == "" {
		base.Executor = nested.Executor
	}
	if base.ExecutorMode == "" {
		base.ExecutorMode = nested.ExecutorMode
	}
	base.PromotionDecisionCandidate = base.PromotionDecisionCandidate || nested.PromotionDecisionCandidate
	if len(base.RealGates) == 0 {
		base.RealGates = nested.RealGates
	}
	if base.HumanApproval == nil {
		base.HumanApproval = nested.HumanApproval
	}
	if base.IndependentRevalidation == nil {
		base.IndependentRevalidation = nested.IndependentRevalidation
	}
	if base.RollbackRequirements == nil {
		base.RollbackRequirements = nested.RollbackRequirements
	}
	if base.ObservabilityRequirements == nil {
		base.ObservabilityRequirements = nested.ObservabilityRequirements
	}
	if base.Policy == nil {
		base.Policy = nested.Policy
	}
	if base.Controls == nil {
		base.Controls = nested.Controls
	}
	if base.Claims == nil {
		base.Claims = nested.Claims
	}
	return base
}
func mergeDecision(base PromotionFirewallInput, d sovereigndecision.SovereignDecisionResult) PromotionFirewallInput {
	if base.DecisionID == "" {
		base.DecisionID = d.DecisionID
	}
	if base.Executor == "" {
		base.Executor = d.Executor
	}
	if base.ExecutorMode == "" {
		base.ExecutorMode = d.ExecutorMode
	}
	base.PromotionDecisionCandidate = base.PromotionDecisionCandidate || d.PromotionDecisionCandidate
	if len(base.RealGates) == 0 {
		base.RealGates = d.RealGates
	}
	return base
}

func addUnsafeClaims(c *FirewallClaims, add func(string)) {
	if c.MCPExecutionAllowed {
		add("mcp_execution_allowed")
	}
	if c.ExecutionAllowed {
		add("execution_allowed")
	}
	if c.ExecutorCallAllowed {
		add("executor_call_allowed")
	}
	if c.NetworkCallAllowed {
		add("network_call_allowed")
	}
	if c.CommandExecutionAllowed {
		add("command_execution_allowed")
	}
	if c.FileWriteAllowed {
		add("file_write_allowed")
	}
	if c.PromotionAllowed {
		add("promotion_allowed")
	}
	if c.DeployAllowed {
		add("deploy_allowed")
	}
	if c.StatusPublishAllowed {
		add("status_publish_allowed")
	}
	if c.MemoryWriteAllowed {
		add("memory_write_allowed")
	}
	if c.StablePromotionAllowed {
		add("stable_promotion_allowed")
	}
	if c.LearningAllowed {
		add("learning_allowed")
	}
}
func firewallStatus(missing, unsafe, conflicts []string) string {
	if len(unsafe) > 0 {
		return StatusUnsafeExecutionClaim
	}
	if contains(missing, "PASS_GOLD_REAL") || contains(missing, "PASS_SECURE_REAL") {
		return StatusMissingRealGates
	}
	if contains(missing, "human_approval") || contains(conflicts, "human_approval_placeholder") {
		return StatusHumanApprovalRequired
	}
	if contains(missing, "independent_revalidation") || contains(conflicts, "independent_revalidation_placeholder") {
		return StatusRevalidationRequired
	}
	if len(missing) > 0 {
		return StatusIncomplete
	}
	if len(conflicts) > 0 {
		return StatusBlocked
	}
	return StatusExecutionEligibilityReadyDryRun
}
func alwaysDenied() []string {
	return []string{"mcp_execution_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed"}
}
func recommendations(missing, unsafe, conflicts []string) []string {
	out := []string{"keep MCP dry-run/read-only and do not call executors"}
	if len(missing) > 0 {
		out = append(out, "provide missing firewall evidence")
	}
	if len(unsafe) > 0 {
		out = append(out, "remove all execution-allowed claims")
	}
	if len(conflicts) > 0 {
		out = append(out, "resolve firewall conflicts outside MCP")
	}
	return out
}
func normalizeGate(s string) string {
	s = strings.TrimSpace(strings.ToUpper(strings.ReplaceAll(s, "-", "_")))
	if s == "GOLD" || s == "PASSGOLD" {
		return "PASS_GOLD"
	}
	if s == "SECURE" || s == "PASSSECURE" {
		return "PASS_SECURE"
	}
	return s
}
func isMCP(s string) bool {
	v := strings.ToLower(strings.TrimSpace(s))
	return v == "mcp" || v == "mcp_server" || v == "inside_mcp"
}
func contains(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}
func appendUnique(xs []string, s string) []string {
	if s == "" || contains(xs, s) {
		return xs
	}
	return append(xs, s)
}
func clone(xs []string) []string { return append([]string{}, xs...) }
