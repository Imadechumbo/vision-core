// Package executionruntime implements V11.0 Controlled External Execution Runtime.
//
// V11.0 starts the runtime phase, but it is intentionally read-only and dry-run
// only. It prepares and validates a controlled external execution runtime plan
// without calling adapters, executors, network, commands, files, deploy, status,
// memory, locks, rollback, evidence trust, result trust, or authority grants.
package executionruntime

import (
	"strings"

	"github.com/visioncore/go-core/internal/evidencebinding"
	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V11.0"

const (
	StatusRuntimeReadyDryRun            = "runtime_ready_dry_run"
	StatusIncomplete                    = "incomplete"
	StatusBlocked                       = "blocked"
	StatusEvidenceBindingMissing        = "evidence_binding_missing"
	StatusEvidenceBindingBlocked        = "evidence_binding_blocked"
	StatusResultVerificationMissing     = "result_verification_missing"
	StatusResultVerificationBlocked     = "result_verification_blocked"
	StatusResponseContractMissing       = "response_contract_missing"
	StatusResponseContractBlocked       = "response_contract_blocked"
	StatusRequestEnvelopeMissing        = "request_envelope_missing"
	StatusRequestEnvelopeBlocked        = "request_envelope_blocked"
	StatusAdapterInterfaceMissing       = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked       = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing     = "final_authorization_missing"
	StatusFinalAuthorizationBlocked     = "final_authorization_blocked"
	StatusSimulationMissing             = "simulation_missing"
	StatusSimulationBlocked             = "simulation_blocked"
	StatusFirewallMissing               = "firewall_missing"
	StatusFirewallBlocked               = "firewall_blocked"
	StatusSovereignCandidateMissing     = "sovereign_candidate_missing"
	StatusMissingRealGates              = "missing_real_gates"
	StatusHumanApprovalRequired         = "human_approval_required"
	StatusRevalidationRequired          = "revalidation_required"
	StatusRuntimePlanMissing            = "runtime_plan_missing"
	StatusRuntimePolicyMissing          = "runtime_policy_missing"
	StatusRuntimeModeBlocked            = "runtime_mode_blocked"
	StatusRuntimeScopeMissing           = "runtime_scope_missing"
	StatusSafetyEnvelopeMissing         = "safety_envelope_missing"
	StatusAuditEnvelopeMissing          = "audit_envelope_missing"
	StatusObservabilityPlanMissing      = "observability_plan_missing"
	StatusRollbackPlanMissing           = "rollback_plan_missing"
	StatusIdempotencyMissing            = "idempotency_missing"
	StatusKillSwitchMissing             = "kill_switch_missing"
	StatusTimeoutMissing                = "timeout_missing"
	StatusLockPlanMissing               = "lock_plan_missing"
	StatusStopCriteriaMissing           = "stop_criteria_missing"
	StatusPreflightChecksMissing        = "preflight_checks_missing"
	StatusPostflightChecksMissing       = "postflight_checks_missing"
	StatusUnsafeRuntimeExecutionAttempt = "unsafe_runtime_execution_attempt"
	StatusUnsafeAdapterCallAttempt      = "unsafe_adapter_call_attempt"
	StatusUnsafeNetworkAttempt          = "unsafe_network_attempt"
	StatusUnsafeCommandAttempt          = "unsafe_command_attempt"
	StatusUnsafeFileWriteAttempt        = "unsafe_file_write_attempt"
	StatusUnsafeDeployAttempt           = "unsafe_deploy_attempt"
	StatusUnsafePromotionAttempt        = "unsafe_promotion_attempt"
	StatusUnsafeStatusPublishAttempt    = "unsafe_status_publish_attempt"
	StatusUnsafeMemoryWriteAttempt      = "unsafe_memory_write_attempt"
	StatusUnsafeTrustEscalationAttempt  = "unsafe_trust_escalation_attempt"
)

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var requiredItems = []string{
	"runtime_id", "runtime_session_id", "evidence_binding_id", "verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "project", "branch", "commit_sha", "target", "environment",
	"V10.8_evidence_binding", "evidence_binding_ready_dry_run", "V10.7_result_verification", "V10.6_response_contract", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_promotion_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation",
	"runtime_plan", "runtime_policy", "runtime_mode", "runtime_scope", "runtime_constraints", "runtime_safety_envelope", "runtime_audit_envelope", "runtime_observability_plan", "runtime_rollback_plan", "runtime_idempotency_key", "runtime_kill_switch", "runtime_timeout", "runtime_lock_plan", "runtime_stop_criteria", "runtime_preflight_checks", "runtime_postflight_checks",
	"no_MCP_execution", "no_adapter_call_inside_MCP", "no_network_inside_MCP", "no_command_inside_MCP", "no_file_write_inside_MCP", "no_deploy_inside_MCP", "no_status_publish_inside_MCP", "no_promotion_inside_MCP", "no_memory_stable_write_inside_MCP", "no_trust_escalation_inside_MCP",
}

var forbiddenInsideMCP = []string{"execute", "execute_runtime", "call_adapter", "call_executor", "network_call", "command_execution", "file_write", "deploy", "promote", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "trust_evidence", "trust_result", "write_ledger", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}

var denied = []string{"mcp_execution_allowed", "real_execution_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "evidence_trust_allowed", "result_trust_allowed", "ledger_write_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}

type ControlledExecutionRuntimeInput struct {
	Root                 string `json:"root,omitempty"`
	Operation            string `json:"operation,omitempty"`
	RuntimeID            string `json:"runtime_id,omitempty"`
	RuntimeSessionID     string `json:"runtime_session_id,omitempty"`
	EvidenceBindingID    string `json:"evidence_binding_id,omitempty"`
	VerificationID       string `json:"verification_id,omitempty"`
	ResponseContractID   string `json:"response_contract_id,omitempty"`
	RequestEnvelopeID    string `json:"request_envelope_id,omitempty"`
	AdapterInterfaceID   string `json:"adapter_interface_id,omitempty"`
	FinalAuthorizationID string `json:"final_authorization_id,omitempty"`
	SimulationID         string `json:"simulation_id,omitempty"`
	FirewallID           string `json:"firewall_id,omitempty"`
	DecisionID           string `json:"decision_id,omitempty"`
	InvocationID         string `json:"invocation_id,omitempty"`
	Executor             string `json:"executor,omitempty"`
	ExecutorMode         string `json:"executor_mode,omitempty"`
	AdapterName          string `json:"adapter_name,omitempty"`
	AdapterVersion       string `json:"adapter_version,omitempty"`
	AdapterType          string `json:"adapter_type,omitempty"`
	Project              string `json:"project,omitempty"`
	Branch               string `json:"branch,omitempty"`
	CommitSHA            string `json:"commit_sha,omitempty"`
	Target               string `json:"target,omitempty"`
	Environment          string `json:"environment,omitempty"`
	RuntimeMode          string `json:"runtime_mode,omitempty"`

	EvidenceBinding         *evidencebinding.ExecutionEvidenceBindingInput `json:"evidence_binding,omitempty"`
	RealGates               []sovereigndecision.SovereignRealGate          `json:"real_gates,omitempty"`
	HumanApproval           *executionresponse.HumanApproval               `json:"human_approval,omitempty"`
	IndependentRevalidation *executionresponse.IndependentRevalidation     `json:"independent_revalidation,omitempty"`

	RuntimePlan              *executionresponse.PresenceValid  `json:"runtime_plan,omitempty"`
	RuntimePolicy            *executionresponse.PresenceValid  `json:"runtime_policy,omitempty"`
	RuntimeScope             *executionresponse.PresenceValid  `json:"runtime_scope,omitempty"`
	RuntimeConstraints       *executionresponse.PresenceValid  `json:"runtime_constraints,omitempty"`
	RuntimeSafetyEnvelope    *executionresponse.PresenceValid  `json:"runtime_safety_envelope,omitempty"`
	RuntimeAuditEnvelope     *executionresponse.PresenceValid  `json:"runtime_audit_envelope,omitempty"`
	RuntimeObservabilityPlan *executionresponse.PresenceValid  `json:"runtime_observability_plan,omitempty"`
	RuntimeRollbackPlan      *executionresponse.PresenceValid  `json:"runtime_rollback_plan,omitempty"`
	RuntimeKillSwitch        *executionresponse.PresenceValid  `json:"runtime_kill_switch,omitempty"`
	RuntimeTimeout           *executionresponse.PresenceValid  `json:"runtime_timeout,omitempty"`
	RuntimeLockPlan          *executionresponse.PresenceValid  `json:"runtime_lock_plan,omitempty"`
	RuntimeStopCriteria      *executionresponse.PresenceValid  `json:"runtime_stop_criteria,omitempty"`
	RuntimePreflightChecks   *executionresponse.PresenceValid  `json:"runtime_preflight_checks,omitempty"`
	RuntimePostflightChecks  *executionresponse.PresenceValid  `json:"runtime_postflight_checks,omitempty"`
	RuntimeIdempotencyKey    string                            `json:"runtime_idempotency_key,omitempty"`
	SafetyControls           *RuntimeSafetyControls            `json:"safety_controls,omitempty"`
	Claims                   *ControlledExecutionRuntimeClaims `json:"claims,omitempty"`

	MCPExecutionAllowed     bool `json:"mcp_execution_allowed,omitempty"`
	RealExecutionAllowed    bool `json:"real_execution_allowed,omitempty"`
	AdapterCallAllowed      bool `json:"adapter_call_allowed,omitempty"`
	ExecutorCallAllowed     bool `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed      bool `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed bool `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed        bool `json:"file_write_allowed,omitempty"`
	DeployAllowed           bool `json:"deploy_allowed,omitempty"`
	PromotionAllowed        bool `json:"promotion_allowed,omitempty"`
	StatusPublishAllowed    bool `json:"status_publish_allowed,omitempty"`
	MutationAllowed         bool `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed      bool `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed  bool `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed         bool `json:"learning_allowed,omitempty"`
	EvidenceTrustAllowed    bool `json:"evidence_trust_allowed,omitempty"`
	ResultTrustAllowed      bool `json:"result_trust_allowed,omitempty"`
	LedgerWriteAllowed      bool `json:"ledger_write_allowed,omitempty"`
	RealLockAllowed         bool `json:"real_lock_allowed,omitempty"`
	RollbackAllowed         bool `json:"rollback_allowed,omitempty"`
	PassGoldAllowed         bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed       bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGrantAllowed   bool `json:"authority_grant_allowed,omitempty"`
}

type RuntimeSafetyControls struct {
	Present                      bool `json:"present"`
	Valid                        bool `json:"valid"`
	NoMCPExecution               bool `json:"no_mcp_execution"`
	NoAdapterCallInsideMCP       bool `json:"no_adapter_call_inside_mcp"`
	NoNetworkInsideMCP           bool `json:"no_network_inside_mcp"`
	NoCommandInsideMCP           bool `json:"no_command_inside_mcp"`
	NoFileWriteInsideMCP         bool `json:"no_file_write_inside_mcp"`
	NoDeployInsideMCP            bool `json:"no_deploy_inside_mcp"`
	NoStatusPublishInsideMCP     bool `json:"no_status_publish_inside_mcp"`
	NoPromotionInsideMCP         bool `json:"no_promotion_inside_mcp"`
	NoMemoryStableWriteInsideMCP bool `json:"no_memory_stable_write_inside_mcp"`
	NoTrustEscalationInsideMCP   bool `json:"no_trust_escalation_inside_mcp"`
}

type ControlledExecutionRuntimeClaims struct {
	MCPExecutionAllowed     bool `json:"mcp_execution_allowed"`
	RealExecutionAllowed    bool `json:"real_execution_allowed"`
	AdapterCallAllowed      bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed     bool `json:"executor_call_allowed"`
	NetworkCallAllowed      bool `json:"network_call_allowed"`
	CommandExecutionAllowed bool `json:"command_execution_allowed"`
	FileWriteAllowed        bool `json:"file_write_allowed"`
	DeployAllowed           bool `json:"deploy_allowed"`
	PromotionAllowed        bool `json:"promotion_allowed"`
	StatusPublishAllowed    bool `json:"status_publish_allowed"`
	MutationAllowed         bool `json:"mutation_allowed"`
	MemoryWriteAllowed      bool `json:"memory_write_allowed"`
	StablePromotionAllowed  bool `json:"stable_promotion_allowed"`
	LearningAllowed         bool `json:"learning_allowed"`
	StablePromoted          bool `json:"stable_promoted"`
	LearnedAsStable         bool `json:"learned_as_stable"`
	EvidenceTrustAllowed    bool `json:"evidence_trust_allowed"`
	EvidenceTrusted         bool `json:"evidence_trusted"`
	ResultTrustAllowed      bool `json:"result_trust_allowed"`
	ResultTrusted           bool `json:"result_trusted"`
	LedgerWriteAllowed      bool `json:"ledger_write_allowed"`
	LedgerWritten           bool `json:"ledger_written"`
	RealLockAllowed         bool `json:"real_lock_allowed"`
	RealLockAcquired        bool `json:"real_lock_acquired"`
	RollbackAllowed         bool `json:"rollback_allowed"`
	RollbackPerformed       bool `json:"rollback_performed"`
	PassGold                bool `json:"pass_gold"`
	PassSecure              bool `json:"pass_secure"`
	PassGoldAllowed         bool `json:"pass_gold_allowed"`
	PassSecureAllowed       bool `json:"pass_secure_allowed"`
	AuthorityGranted        bool `json:"authority_granted"`
	AuthorityGrantAllowed   bool `json:"authority_grant_allowed"`
	HumanApprovalBypassed   bool `json:"human_approval_bypassed"`
	RevalidationBypassed    bool `json:"revalidation_bypassed"`
	EvidenceBindingBypassed bool `json:"evidence_binding_bypassed"`
	VerificationBypassed    bool `json:"verification_bypassed"`
	RuntimePolicyBypassed   bool `json:"runtime_policy_bypassed"`
	KillSwitchBypassed      bool `json:"kill_switch_bypassed"`
	RollbackBypassed        bool `json:"rollback_bypassed"`
	ObservabilityBypassed   bool `json:"observability_bypassed"`
}

type ControlledExecutionRuntime struct {
	Version                   string   `json:"version"`
	DryRun                    bool     `json:"dry_run"`
	ReadOnly                  bool     `json:"read_only"`
	ControlledRuntime         bool     `json:"controlled_runtime"`
	RuntimeStatus             string   `json:"runtime_status"`
	Valid                     bool     `json:"valid"`
	Blocked                   bool     `json:"blocked"`
	RuntimeReadyDryRun        bool     `json:"runtime_ready_dry_run"`
	RuntimeExecutionCandidate bool     `json:"runtime_execution_candidate"`
	ControlledRuntimeReady    bool     `json:"controlled_runtime_ready"`
	MissingItems              []string `json:"missing_items"`
	UnsafeClaims              []string `json:"unsafe_claims"`
	Conflicts                 []string `json:"conflicts"`
	BlockingReasons           []string `json:"blocking_reasons"`
	RequiredItems             []string `json:"required_items"`
	RequiredRealGates         []string `json:"required_real_gates"`
	Recommendations           []string `json:"recommendations"`
	MCPExecutionAllowed       bool     `json:"mcp_execution_allowed"`
	RealExecutionAllowed      bool     `json:"real_execution_allowed"`
	AdapterCallAllowed        bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed       bool     `json:"executor_call_allowed"`
	NetworkCallAllowed        bool     `json:"network_call_allowed"`
	CommandExecutionAllowed   bool     `json:"command_execution_allowed"`
	FileWriteAllowed          bool     `json:"file_write_allowed"`
	DeployAllowed             bool     `json:"deploy_allowed"`
	PromotionAllowed          bool     `json:"promotion_allowed"`
	StatusPublishAllowed      bool     `json:"status_publish_allowed"`
	MutationAllowed           bool     `json:"mutation_allowed"`
	MemoryWriteAllowed        bool     `json:"memory_write_allowed"`
	StablePromotionAllowed    bool     `json:"stable_promotion_allowed"`
	LearningAllowed           bool     `json:"learning_allowed"`
	RealLockAllowed           bool     `json:"real_lock_allowed"`
	RollbackAllowed           bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed      bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed        bool     `json:"result_trust_allowed"`
	LedgerWriteAllowed        bool     `json:"ledger_write_allowed"`
	PassGoldAllowed           bool     `json:"pass_gold_allowed"`
	PassSecureAllowed         bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed     bool     `json:"authority_grant_allowed"`
}

type ControlledExecutionRuntimeValidation = ControlledExecutionRuntime

type ExecutionRuntimeBoundary struct {
	Version               string   `json:"version"`
	DryRun                bool     `json:"dry_run"`
	ReadOnly              bool     `json:"read_only"`
	ControlledRuntime     bool     `json:"controlled_runtime"`
	RealExecutionAllowed  bool     `json:"real_execution_allowed"`
	MCPCan                []string `json:"mcp_can"`
	MCPCannot             []string `json:"mcp_cannot"`
	ForbiddenInsideMCP    []string `json:"forbidden_inside_mcp"`
	RequiredBeforeRuntime []string `json:"required_before_runtime"`
	AlwaysDenied          []string `json:"always_denied"`
	RequiredRealGates     []string `json:"required_real_gates"`
}

type ControlledExecutionRuntimeAudit struct {
	Version                           string   `json:"version"`
	DryRun                            bool     `json:"dry_run"`
	ReadOnly                          bool     `json:"read_only"`
	ControlledRuntime                 bool     `json:"controlled_runtime"`
	RealExecutionAllowed              bool     `json:"real_execution_allowed"`
	ConflictsFound                    bool     `json:"conflicts_found"`
	Conflicts                         []string `json:"conflicts"`
	UnsafeClaimsFound                 bool     `json:"unsafe_claims_found"`
	UnsafeClaims                      []string `json:"unsafe_claims"`
	MissingItemsFound                 bool     `json:"missing_items_found"`
	MissingItems                      []string `json:"missing_items"`
	RuntimeExecutionAttemptFound      bool     `json:"runtime_execution_attempt_found"`
	AdapterCallAttemptFound           bool     `json:"adapter_call_attempt_found"`
	ExecutorCallAttemptFound          bool     `json:"executor_call_attempt_found"`
	NetworkAttemptFound               bool     `json:"network_attempt_found"`
	CommandAttemptFound               bool     `json:"command_attempt_found"`
	FileWriteAttemptFound             bool     `json:"file_write_attempt_found"`
	DeployAttemptFound                bool     `json:"deploy_attempt_found"`
	PromotionAttemptFound             bool     `json:"promotion_attempt_found"`
	StatusPublishAttemptFound         bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound           bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound        bool     `json:"stable_learning_attempt_found"`
	EvidenceTrustAttemptFound         bool     `json:"evidence_trust_attempt_found"`
	ResultTrustAttemptFound           bool     `json:"result_trust_attempt_found"`
	LedgerWriteAttemptFound           bool     `json:"ledger_write_attempt_found"`
	RealLockAttemptFound              bool     `json:"real_lock_attempt_found"`
	RollbackAttemptFound              bool     `json:"rollback_attempt_found"`
	AutoGoldAttemptFound              bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound        bool     `json:"authority_grant_attempt_found"`
	HumanApprovalBypassAttemptFound   bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound    bool     `json:"revalidation_bypass_attempt_found"`
	EvidenceBindingBypassAttemptFound bool     `json:"evidence_binding_bypass_attempt_found"`
	VerificationBypassAttemptFound    bool     `json:"verification_bypass_attempt_found"`
	RuntimePolicyBypassAttemptFound   bool     `json:"runtime_policy_bypass_attempt_found"`
	KillSwitchBypassAttemptFound      bool     `json:"kill_switch_bypass_attempt_found"`
	RollbackBypassAttemptFound        bool     `json:"rollback_bypass_attempt_found"`
	ObservabilityBypassAttemptFound   bool     `json:"observability_bypass_attempt_found"`
	Recommendations                   []string `json:"recommendations"`
}

type ControlledExecutionRuntimeExplain struct {
	Version                                                string   `json:"version"`
	DryRun                                                 bool     `json:"dry_run"`
	ReadOnly                                               bool     `json:"read_only"`
	ControlledRuntime                                      bool     `json:"controlled_runtime"`
	RealExecutionAllowed                                   bool     `json:"real_execution_allowed"`
	WhyControlledRuntimeIsNotRealExecutionYet              []string `json:"why_controlled_runtime_is_not_real_execution_yet"`
	WhyMCPCannotExecuteRuntime                             []string `json:"why_mcp_cannot_execute_runtime"`
	WhyExternalAdapterCallIsBlocked                        []string `json:"why_external_adapter_call_is_blocked"`
	WhyEvidenceBindingIsRequired                           []string `json:"why_evidence_binding_is_required"`
	WhyResultVerificationIsRequired                        []string `json:"why_result_verification_is_required"`
	WhyFinalAuthorizationIsRequired                        []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                                []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired             []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyRuntimePolicySafetyRollbackObservabilityAreRequired []string `json:"why_runtime_policy_safety_rollback_observability_are_required"`
	WhyRealExecutionRequiresFutureExplicitRelease          []string `json:"why_real_execution_requires_future_explicit_release"`
	RequiredGates                                          []string `json:"required_gates"`
	AlwaysDenied                                           []string `json:"always_denied"`
}

func BuildControlledExecutionRuntime(input ControlledExecutionRuntimeInput) ControlledExecutionRuntime {
	return validate(input)
}
func ValidateControlledExecutionRuntime(input ControlledExecutionRuntimeInput) ControlledExecutionRuntimeValidation {
	return validate(input)
}

func validate(input ControlledExecutionRuntimeInput) ControlledExecutionRuntime {
	input = normalize(input)
	missing, conflicts, unsafe := []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s) }

	for name, val := range map[string]string{"runtime_id": input.RuntimeID, "runtime_session_id": input.RuntimeSessionID, "evidence_binding_id": input.EvidenceBindingID, "verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment} {
		if strings.TrimSpace(val) == "" {
			addMissing(name)
		}
	}
	if isMCP(input.Executor) {
		addConflict("executor_must_not_be_mcp")
		addConflict(StatusUnsafeRuntimeExecutionAttempt)
	}
	if input.ExecutorMode != "external_only" {
		addMissing("external_only")
		addConflict("executor_mode_must_be_external_only")
	}
	if input.RuntimeMode == "" {
		addMissing("runtime_mode")
		addConflict(StatusRuntimeModeBlocked)
	}
	if strings.Contains(strings.ToLower(input.RuntimeMode), "real_execution") {
		addConflict(StatusRuntimeModeBlocked)
	}

	if input.EvidenceBinding == nil {
		addMissing("V10.8_evidence_binding")
		addConflict(StatusEvidenceBindingMissing)
	} else {
		eb := evidencebinding.ValidateExecutionEvidenceBinding(*input.EvidenceBinding)
		if !eb.Valid || eb.Blocked {
			addConflict(StatusEvidenceBindingBlocked)
			bubbleEvidenceBindingPrereqs(eb, addConflict)
		}
		if !eb.EvidenceBindingReadyDryRun {
			addMissing("evidence_binding_ready_dry_run")
			addConflict(StatusEvidenceBindingBlocked)
		}
	}

	validateRealGates(input.RealGates, addMissing, addConflict)
	if input.HumanApproval == nil || !input.HumanApproval.Present || !input.HumanApproval.Approved || input.HumanApproval.Placeholder || input.HumanApproval.ApprovalIsPlaceholder || !input.HumanApproval.Valid {
		addMissing("human_approval")
		addConflict(StatusHumanApprovalRequired)
	}
	if input.IndependentRevalidation == nil || !input.IndependentRevalidation.Present || !input.IndependentRevalidation.Completed || input.IndependentRevalidation.Placeholder || input.IndependentRevalidation.RevalidationIsPlaceholder || !input.IndependentRevalidation.PassGoldRevalidated || !input.IndependentRevalidation.PassSecureRevalidated || !input.IndependentRevalidation.Valid {
		addMissing("independent_revalidation")
		addConflict(StatusRevalidationRequired)
	}

	validatePresence("runtime_plan", input.RuntimePlan, addMissing, addConflict, StatusRuntimePlanMissing)
	validatePresence("runtime_policy", input.RuntimePolicy, addMissing, addConflict, StatusRuntimePolicyMissing)
	validatePresence("runtime_scope", input.RuntimeScope, addMissing, addConflict, StatusRuntimeScopeMissing)
	validatePresence("runtime_constraints", input.RuntimeConstraints, addMissing, addConflict, "runtime_constraints_missing")
	validatePresence("runtime_safety_envelope", input.RuntimeSafetyEnvelope, addMissing, addConflict, StatusSafetyEnvelopeMissing)
	validatePresence("runtime_audit_envelope", input.RuntimeAuditEnvelope, addMissing, addConflict, StatusAuditEnvelopeMissing)
	validatePresence("runtime_observability_plan", input.RuntimeObservabilityPlan, addMissing, addConflict, StatusObservabilityPlanMissing)
	validatePresence("runtime_rollback_plan", input.RuntimeRollbackPlan, addMissing, addConflict, StatusRollbackPlanMissing)
	validatePresence("runtime_kill_switch", input.RuntimeKillSwitch, addMissing, addConflict, StatusKillSwitchMissing)
	validatePresence("runtime_timeout", input.RuntimeTimeout, addMissing, addConflict, StatusTimeoutMissing)
	validatePresence("runtime_lock_plan", input.RuntimeLockPlan, addMissing, addConflict, StatusLockPlanMissing)
	validatePresence("runtime_stop_criteria", input.RuntimeStopCriteria, addMissing, addConflict, StatusStopCriteriaMissing)
	validatePresence("runtime_preflight_checks", input.RuntimePreflightChecks, addMissing, addConflict, StatusPreflightChecksMissing)
	validatePresence("runtime_postflight_checks", input.RuntimePostflightChecks, addMissing, addConflict, StatusPostflightChecksMissing)
	if strings.TrimSpace(input.RuntimeIdempotencyKey) == "" {
		addMissing("runtime_idempotency_key")
		addConflict(StatusIdempotencyMissing)
	}
	if input.SafetyControls == nil || !input.SafetyControls.Present || !input.SafetyControls.Valid || !input.SafetyControls.NoMCPExecution || !input.SafetyControls.NoAdapterCallInsideMCP || !input.SafetyControls.NoNetworkInsideMCP || !input.SafetyControls.NoCommandInsideMCP || !input.SafetyControls.NoFileWriteInsideMCP || !input.SafetyControls.NoDeployInsideMCP || !input.SafetyControls.NoStatusPublishInsideMCP || !input.SafetyControls.NoPromotionInsideMCP || !input.SafetyControls.NoMemoryStableWriteInsideMCP || !input.SafetyControls.NoTrustEscalationInsideMCP {
		addMissing("runtime_safety_controls")
		addConflict("runtime_safety_controls_invalid")
	}

	for _, u := range unsafeClaims(input.Claims) {
		addUnsafe(u)
		mapUnsafeStatus(u, addConflict)
	}
	status := StatusRuntimeReadyDryRun
	valid := len(missing) == 0 && len(conflicts) == 0 && len(unsafe) == 0
	if !valid {
		status = StatusIncomplete
		if len(conflicts) > 0 || len(unsafe) > 0 {
			status = StatusBlocked
		}
	}
	blocking := append(clone(conflicts), unsafe...)
	return ControlledExecutionRuntime{Version: Version, DryRun: true, ReadOnly: true, ControlledRuntime: true, RuntimeStatus: status, Valid: valid, Blocked: !valid, RuntimeReadyDryRun: valid, RuntimeExecutionCandidate: valid, ControlledRuntimeReady: valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocking)}
}

func BuildExecutionRuntimeBoundary() ExecutionRuntimeBoundary {
	return ExecutionRuntimeBoundary{Version: Version, DryRun: true, ReadOnly: true, ControlledRuntime: true, RealExecutionAllowed: false, MCPCan: []string{"read", "validate", "audit", "explain", "simulate controlled execution runtime"}, MCPCannot: clone(forbiddenInsideMCP), ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeRuntime: clone(requiredItems), AlwaysDenied: clone(denied), RequiredRealGates: clone(requiredGates)}
}

func AuditControlledExecutionRuntime(input ControlledExecutionRuntimeInput) ControlledExecutionRuntimeAudit {
	input = normalize(input)
	v := ValidateControlledExecutionRuntime(input)
	c := input.Claims
	if c == nil {
		c = &ControlledExecutionRuntimeClaims{}
	}
	a := ControlledExecutionRuntimeAudit{Version: Version, DryRun: true, ReadOnly: true, ControlledRuntime: true, RealExecutionAllowed: false, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	a.RuntimeExecutionAttemptFound = c.MCPExecutionAllowed || c.RealExecutionAllowed
	a.AdapterCallAttemptFound = c.AdapterCallAllowed
	a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
	a.NetworkAttemptFound = c.NetworkCallAllowed
	a.CommandAttemptFound = c.CommandExecutionAllowed
	a.FileWriteAttemptFound = c.FileWriteAllowed
	a.DeployAttemptFound = c.DeployAllowed
	a.PromotionAttemptFound = c.PromotionAllowed || c.StablePromoted || c.StablePromotionAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
	a.MemoryWriteAttemptFound = c.MemoryWriteAllowed
	a.StableLearningAttemptFound = c.LearningAllowed || c.LearnedAsStable
	a.EvidenceTrustAttemptFound = c.EvidenceTrustAllowed || c.EvidenceTrusted
	a.ResultTrustAttemptFound = c.ResultTrustAllowed || c.ResultTrusted
	a.LedgerWriteAttemptFound = c.LedgerWriteAllowed || c.LedgerWritten
	a.RealLockAttemptFound = c.RealLockAllowed || c.RealLockAcquired
	a.RollbackAttemptFound = c.RollbackAllowed || c.RollbackPerformed
	a.AutoGoldAttemptFound = c.PassGold || c.PassSecure || c.PassGoldAllowed || c.PassSecureAllowed
	a.AuthorityGrantAttemptFound = c.AuthorityGranted || c.AuthorityGrantAllowed
	a.HumanApprovalBypassAttemptFound = c.HumanApprovalBypassed
	a.RevalidationBypassAttemptFound = c.RevalidationBypassed
	a.EvidenceBindingBypassAttemptFound = c.EvidenceBindingBypassed
	a.VerificationBypassAttemptFound = c.VerificationBypassed
	a.RuntimePolicyBypassAttemptFound = c.RuntimePolicyBypassed
	a.KillSwitchBypassAttemptFound = c.KillSwitchBypassed
	a.RollbackBypassAttemptFound = c.RollbackBypassed
	a.ObservabilityBypassAttemptFound = c.ObservabilityBypassed
	return a
}

func ExplainControlledExecutionRuntime(input ControlledExecutionRuntimeInput) ControlledExecutionRuntimeExplain {
	return ControlledExecutionRuntimeExplain{Version: Version, DryRun: true, ReadOnly: true, ControlledRuntime: true, RealExecutionAllowed: false, WhyControlledRuntimeIsNotRealExecutionYet: []string{"runtime_ready_dry_run is advisory only", "V11.0 prepares a controlled runtime plan but does not execute it"}, WhyMCPCannotExecuteRuntime: []string{"the MCP control plane is read-only", "MCP cannot call executors, mutate files, publish status, acquire locks, or perform rollback"}, WhyExternalAdapterCallIsBlocked: []string{"adapter calls require a future explicit release, isolated environment, real adapter, real lock, observability, rollback, and human approval"}, WhyEvidenceBindingIsRequired: []string{"V10.8 evidence binding ties results to traceable artifacts before runtime readiness can be rehearsed"}, WhyResultVerificationIsRequired: []string{"V10.7 result verification must be valid before external results can be considered by the runtime"}, WhyFinalAuthorizationIsRequired: []string{"V10.3 final authorization prevents runtime preparation from bypassing the authorization chain"}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real, non-dry-run, non-synthesized, and authority-recognized"}, WhyHumanApprovalAndRevalidationAreRequired: []string{"human approval and independent revalidation prevent self-authorization and trust escalation"}, WhyRuntimePolicySafetyRollbackObservabilityAreRequired: []string{"runtime policy, safety envelope, rollback plan, kill switch, timeout, lock plan, and observability plan are required before any future real runtime release"}, WhyRealExecutionRequiresFutureExplicitRelease: []string{"real execution remains blocked by default in V11.0", "a future release must explicitly enable real execution after PASS GOLD/PASS SECURE are revalidated"}, RequiredGates: clone(requiredGates), AlwaysDenied: clone(denied)}
}

func normalize(input ControlledExecutionRuntimeInput) ControlledExecutionRuntimeInput {
	if input.Claims == nil {
		input.Claims = &ControlledExecutionRuntimeClaims{}
	}
	c := input.Claims
	c.MCPExecutionAllowed = c.MCPExecutionAllowed || input.MCPExecutionAllowed
	c.RealExecutionAllowed = c.RealExecutionAllowed || input.RealExecutionAllowed
	c.AdapterCallAllowed = c.AdapterCallAllowed || input.AdapterCallAllowed
	c.ExecutorCallAllowed = c.ExecutorCallAllowed || input.ExecutorCallAllowed
	c.NetworkCallAllowed = c.NetworkCallAllowed || input.NetworkCallAllowed
	c.CommandExecutionAllowed = c.CommandExecutionAllowed || input.CommandExecutionAllowed
	c.FileWriteAllowed = c.FileWriteAllowed || input.FileWriteAllowed
	c.DeployAllowed = c.DeployAllowed || input.DeployAllowed
	c.PromotionAllowed = c.PromotionAllowed || input.PromotionAllowed
	c.StatusPublishAllowed = c.StatusPublishAllowed || input.StatusPublishAllowed
	c.MutationAllowed = c.MutationAllowed || input.MutationAllowed
	c.MemoryWriteAllowed = c.MemoryWriteAllowed || input.MemoryWriteAllowed
	c.StablePromotionAllowed = c.StablePromotionAllowed || input.StablePromotionAllowed
	c.LearningAllowed = c.LearningAllowed || input.LearningAllowed
	c.EvidenceTrustAllowed = c.EvidenceTrustAllowed || input.EvidenceTrustAllowed
	c.ResultTrustAllowed = c.ResultTrustAllowed || input.ResultTrustAllowed
	c.LedgerWriteAllowed = c.LedgerWriteAllowed || input.LedgerWriteAllowed
	c.RealLockAllowed = c.RealLockAllowed || input.RealLockAllowed
	c.RollbackAllowed = c.RollbackAllowed || input.RollbackAllowed
	c.PassGoldAllowed = c.PassGoldAllowed || input.PassGoldAllowed
	c.PassSecureAllowed = c.PassSecureAllowed || input.PassSecureAllowed
	c.AuthorityGrantAllowed = c.AuthorityGrantAllowed || input.AuthorityGrantAllowed
	return input
}

func validatePresence(name string, pv *executionresponse.PresenceValid, addMissing func(string), addConflict func(string), status string) {
	if pv == nil || !pv.Present {
		addMissing(name)
		addConflict(status)
		return
	}
	if !pv.Valid {
		addConflict(name + "_invalid")
		addConflict(status)
	}
}

func validateRealGates(gates []sovereigndecision.SovereignRealGate, addMissing func(string), addConflict func(string)) {
	seen := map[string]sovereigndecision.SovereignRealGate{}
	for _, g := range gates {
		seen[g.Gate] = g
	}
	for _, gate := range requiredGates {
		g, ok := seen[gate]
		if !ok || !g.RealEvidence || g.DryRun || g.Synthesized || !g.RecognizedByAuthority {
			addMissing(gate + "_REAL")
			addConflict(StatusMissingRealGates)
			if ok && g.DryRun {
				addConflict("real_gate_dry_run_true")
			}
			if ok && g.Synthesized {
				addConflict("real_gate_synthesized_true")
			}
			if ok && !g.RecognizedByAuthority {
				addConflict("real_gate_recognized_by_authority_false")
			}
		}
	}
}

func bubbleEvidenceBindingPrereqs(eb evidencebinding.ExecutionEvidenceBinding, add func(string)) {
	for _, c := range append(clone(eb.Conflicts), eb.MissingItems...) {
		switch c {
		case evidencebinding.StatusResultVerificationMissing:
			add(StatusResultVerificationMissing)
		case evidencebinding.StatusResultVerificationBlocked:
			add(StatusResultVerificationBlocked)
		case evidencebinding.StatusResponseContractMissing:
			add(StatusResponseContractMissing)
		case evidencebinding.StatusResponseContractBlocked:
			add(StatusResponseContractBlocked)
		case evidencebinding.StatusRequestEnvelopeMissing:
			add(StatusRequestEnvelopeMissing)
		case evidencebinding.StatusRequestEnvelopeBlocked:
			add(StatusRequestEnvelopeBlocked)
		case evidencebinding.StatusAdapterInterfaceMissing:
			add(StatusAdapterInterfaceMissing)
		case evidencebinding.StatusAdapterInterfaceBlocked:
			add(StatusAdapterInterfaceBlocked)
		case evidencebinding.StatusFinalAuthorizationMissing:
			add(StatusFinalAuthorizationMissing)
		case evidencebinding.StatusFinalAuthorizationBlocked:
			add(StatusFinalAuthorizationBlocked)
		case evidencebinding.StatusSimulationMissing:
			add(StatusSimulationMissing)
		case evidencebinding.StatusSimulationBlocked:
			add(StatusSimulationBlocked)
		case evidencebinding.StatusFirewallMissing:
			add(StatusFirewallMissing)
		case evidencebinding.StatusFirewallBlocked:
			add(StatusFirewallBlocked)
		case evidencebinding.StatusSovereignCandidateMissing:
			add(StatusSovereignCandidateMissing)
		}
	}
}

func unsafeClaims(c *ControlledExecutionRuntimeClaims) []string {
	if c == nil {
		return nil
	}
	out := []string{}
	add := func(s string, b bool) {
		if b {
			out = appendUnique(out, s)
		}
	}
	add("mcp_execution_allowed", c.MCPExecutionAllowed)
	add("real_execution_allowed", c.RealExecutionAllowed)
	add("adapter_call_allowed", c.AdapterCallAllowed)
	add("executor_call_allowed", c.ExecutorCallAllowed)
	add("network_call_allowed", c.NetworkCallAllowed)
	add("command_execution_allowed", c.CommandExecutionAllowed)
	add("file_write_allowed", c.FileWriteAllowed)
	add("deploy_allowed", c.DeployAllowed)
	add("promotion_allowed", c.PromotionAllowed)
	add("status_publish_allowed", c.StatusPublishAllowed)
	add("mutation_allowed", c.MutationAllowed)
	add("memory_write_allowed", c.MemoryWriteAllowed)
	add("stable_promotion_allowed", c.StablePromotionAllowed)
	add("learning_allowed", c.LearningAllowed)
	add("stable_promoted", c.StablePromoted)
	add("learned_as_stable", c.LearnedAsStable)
	add("evidence_trust_allowed", c.EvidenceTrustAllowed)
	add("evidence_trusted", c.EvidenceTrusted)
	add("result_trust_allowed", c.ResultTrustAllowed)
	add("result_trusted", c.ResultTrusted)
	add("ledger_write_allowed", c.LedgerWriteAllowed)
	add("ledger_written", c.LedgerWritten)
	add("real_lock_allowed", c.RealLockAllowed)
	add("real_lock_acquired", c.RealLockAcquired)
	add("rollback_allowed", c.RollbackAllowed)
	add("rollback_performed", c.RollbackPerformed)
	add("pass_gold", c.PassGold)
	add("pass_secure", c.PassSecure)
	add("pass_gold_allowed", c.PassGoldAllowed)
	add("pass_secure_allowed", c.PassSecureAllowed)
	add("authority_granted", c.AuthorityGranted)
	add("authority_grant_allowed", c.AuthorityGrantAllowed)
	return out
}

func mapUnsafeStatus(u string, add func(string)) {
	switch u {
	case "mcp_execution_allowed", "real_execution_allowed":
		add(StatusUnsafeRuntimeExecutionAttempt)
	case "adapter_call_allowed":
		add(StatusUnsafeAdapterCallAttempt)
	case "network_call_allowed":
		add(StatusUnsafeNetworkAttempt)
	case "command_execution_allowed":
		add(StatusUnsafeCommandAttempt)
	case "file_write_allowed":
		add(StatusUnsafeFileWriteAttempt)
	case "deploy_allowed":
		add(StatusUnsafeDeployAttempt)
	case "promotion_allowed", "stable_promotion_allowed", "stable_promoted":
		add(StatusUnsafePromotionAttempt)
	case "status_publish_allowed":
		add(StatusUnsafeStatusPublishAttempt)
	case "memory_write_allowed", "learning_allowed", "learned_as_stable":
		add(StatusUnsafeMemoryWriteAttempt)
	case "evidence_trust_allowed", "evidence_trusted", "result_trust_allowed", "result_trusted", "ledger_write_allowed", "ledger_written", "pass_gold", "pass_secure", "authority_granted", "authority_grant_allowed":
		add(StatusUnsafeTrustEscalationAttempt)
	}
}

func recommendations(blocking []string) []string {
	if len(blocking) == 0 {
		return []string{"controlled runtime is ready for dry-run rehearsal only; keep real execution disabled"}
	}
	return []string{"keep real execution disabled", "complete missing runtime contracts and real gates outside MCP", "do not call adapters, executors, network, commands, file writes, deploy, status, memory, locks, rollback, or trust paths from MCP"}
}

func isMCP(executor string) bool {
	e := strings.ToLower(strings.TrimSpace(executor))
	return e == "mcp" || e == "mcp_readonly" || e == "mcp-readonly"
}
func appendUnique(xs []string, s string) []string {
	for _, x := range xs {
		if x == s {
			return xs
		}
	}
	return append(xs, s)
}
func clone(xs []string) []string { out := make([]string, len(xs)); copy(out, xs); return out }
