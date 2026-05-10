// Package sandboxadapter implements V11.1 Controlled Runtime Sandbox Adapter.
//
// V11.1 is a fake-safe, read-only, dry-run/noop adapter bridge for the
// controlled external execution runtime. It validates that a runtime can prepare
// a sandbox adapter invocation, but it never executes commands, calls network,
// writes files, mutates repositories, deploys, publishes status, promotes,
// writes memory or ledgers, acquires locks, rolls back, trusts evidence/results,
// marks gates, or grants authority.
package sandboxadapter

import (
	"strings"

	"github.com/visioncore/go-core/internal/evidencebinding"
	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/executionruntime"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V11.1"

const (
	StatusSandboxAdapterReadyDryRun    = "sandbox_adapter_ready_dry_run"
	StatusIncomplete                   = "incomplete"
	StatusBlocked                      = "blocked"
	StatusControlledRuntimeMissing     = "controlled_runtime_missing"
	StatusControlledRuntimeBlocked     = "controlled_runtime_blocked"
	StatusEvidenceBindingMissing       = "evidence_binding_missing"
	StatusEvidenceBindingBlocked       = "evidence_binding_blocked"
	StatusResultVerificationMissing    = "result_verification_missing"
	StatusResultVerificationBlocked    = "result_verification_blocked"
	StatusResponseContractMissing      = "response_contract_missing"
	StatusResponseContractBlocked      = "response_contract_blocked"
	StatusRequestEnvelopeMissing       = "request_envelope_missing"
	StatusRequestEnvelopeBlocked       = "request_envelope_blocked"
	StatusAdapterInterfaceMissing      = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked      = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing    = "final_authorization_missing"
	StatusFinalAuthorizationBlocked    = "final_authorization_blocked"
	StatusSimulationMissing            = "simulation_missing"
	StatusSimulationBlocked            = "simulation_blocked"
	StatusFirewallMissing              = "firewall_missing"
	StatusFirewallBlocked              = "firewall_blocked"
	StatusSovereignCandidateMissing    = "sovereign_candidate_missing"
	StatusMissingRealGates             = "missing_real_gates"
	StatusHumanApprovalRequired        = "human_approval_required"
	StatusRevalidationRequired         = "revalidation_required"
	StatusSandboxPolicyMissing         = "sandbox_policy_missing"
	StatusSandboxScopeMissing          = "sandbox_scope_missing"
	StatusSandboxConstraintsMissing    = "sandbox_constraints_missing"
	StatusSandboxInputMissing          = "sandbox_input_contract_missing"
	StatusSandboxOutputMissing         = "sandbox_output_contract_missing"
	StatusSandboxNoopMissing           = "sandbox_noop_response_missing"
	StatusSandboxAuditMissing          = "sandbox_audit_envelope_missing"
	StatusSandboxObservabilityMissing  = "sandbox_observability_missing"
	StatusSandboxRollbackMissing       = "sandbox_rollback_policy_missing"
	StatusSandboxTimeoutMissing        = "sandbox_timeout_missing"
	StatusSandboxIdempotencyMissing    = "sandbox_idempotency_missing"
	StatusSandboxKillSwitchMissing     = "sandbox_kill_switch_missing"
	StatusSandboxStopCriteriaMissing   = "sandbox_stop_criteria_missing"
	StatusSandboxSafetyControlsMissing = "sandbox_safety_controls_missing"
	StatusUnsafeRealExecutionAttempt   = "unsafe_real_execution_attempt"
	StatusUnsafeRealAdapterCallAttempt = "unsafe_real_adapter_call_attempt"
	StatusUnsafeNetworkAttempt         = "unsafe_network_attempt"
	StatusUnsafeCommandAttempt         = "unsafe_command_attempt"
	StatusUnsafeFileWriteAttempt       = "unsafe_file_write_attempt"
	StatusUnsafeDeployAttempt          = "unsafe_deploy_attempt"
	StatusUnsafePromotionAttempt       = "unsafe_promotion_attempt"
	StatusUnsafeStatusPublishAttempt   = "unsafe_status_publish_attempt"
	StatusUnsafeMemoryWriteAttempt     = "unsafe_memory_write_attempt"
	StatusUnsafeTrustEscalationAttempt = "unsafe_trust_escalation_attempt"
)

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var requiredItems = []string{
	"sandbox_adapter_id", "runtime_id", "runtime_session_id", "evidence_binding_id", "verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "sandbox_noop", "project", "branch", "commit_sha", "target", "environment", "sandbox_or_local_sandbox",
	"V11.0_controlled_runtime", "runtime_ready_dry_run", "controlled_runtime_ready", "V10.8_evidence_binding", "V10.7_result_verification", "V10.6_response_contract", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation",
	"sandbox_policy", "sandbox_scope", "sandbox_constraints", "sandbox_input_contract", "sandbox_output_contract", "sandbox_noop_response", "sandbox_audit_envelope", "sandbox_observability_plan", "sandbox_rollback_policy", "sandbox_timeout", "sandbox_idempotency_key", "sandbox_kill_switch", "sandbox_stop_criteria", "sandbox_safety_controls",
	"no_real_execution", "no_real_adapter_call", "no_network_call", "no_command_execution", "no_file_write", "no_deploy", "no_promotion", "no_status_publish", "no_memory_stable_write", "no_trust_escalation",
}

var denied = []string{"mcp_execution_allowed", "real_execution_allowed", "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "evidence_trust_allowed", "result_trust_allowed", "ledger_write_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}

type SandboxAdapterInput struct {
	Root                 string `json:"root,omitempty"`
	Operation            string `json:"operation,omitempty"`
	SandboxAdapterID     string `json:"sandbox_adapter_id,omitempty"`
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

	ControlledRuntime       *executionruntime.ControlledExecutionRuntimeInput `json:"controlled_runtime,omitempty"`
	RuntimeReadyDryRun      bool                                              `json:"runtime_ready_dry_run,omitempty"`
	ControlledRuntimeReady  bool                                              `json:"controlled_runtime_ready,omitempty"`
	EvidenceBinding         *evidencebinding.ExecutionEvidenceBindingInput    `json:"evidence_binding,omitempty"`
	RealGates               []sovereigndecision.SovereignRealGate             `json:"real_gates,omitempty"`
	HumanApproval           *executionresponse.HumanApproval                  `json:"human_approval,omitempty"`
	IndependentRevalidation *executionresponse.IndependentRevalidation        `json:"independent_revalidation,omitempty"`

	SandboxPolicy            *executionresponse.PresenceValid `json:"sandbox_policy,omitempty"`
	SandboxScope             *executionresponse.PresenceValid `json:"sandbox_scope,omitempty"`
	SandboxConstraints       *executionresponse.PresenceValid `json:"sandbox_constraints,omitempty"`
	SandboxInputContract     *executionresponse.PresenceValid `json:"sandbox_input_contract,omitempty"`
	SandboxOutputContract    *executionresponse.PresenceValid `json:"sandbox_output_contract,omitempty"`
	SandboxNoopResponse      *executionresponse.PresenceValid `json:"sandbox_noop_response,omitempty"`
	SandboxAuditEnvelope     *executionresponse.PresenceValid `json:"sandbox_audit_envelope,omitempty"`
	SandboxObservabilityPlan *executionresponse.PresenceValid `json:"sandbox_observability_plan,omitempty"`
	SandboxRollbackPolicy    *executionresponse.PresenceValid `json:"sandbox_rollback_policy,omitempty"`
	SandboxTimeout           *executionresponse.PresenceValid `json:"sandbox_timeout,omitempty"`
	SandboxKillSwitch        *executionresponse.PresenceValid `json:"sandbox_kill_switch,omitempty"`
	SandboxStopCriteria      *executionresponse.PresenceValid `json:"sandbox_stop_criteria,omitempty"`
	SandboxSafetyControls    *SandboxSafetyControls           `json:"sandbox_safety_controls,omitempty"`
	SandboxIdempotencyKey    string                           `json:"sandbox_idempotency_key,omitempty"`
	Claims                   *SandboxAdapterClaims            `json:"claims,omitempty"`

	MCPExecutionAllowed     bool `json:"mcp_execution_allowed,omitempty"`
	RealExecutionAllowed    bool `json:"real_execution_allowed,omitempty"`
	RealAdapterCallAllowed  bool `json:"real_adapter_call_allowed,omitempty"`
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
	RealLockAllowed         bool `json:"real_lock_allowed,omitempty"`
	RollbackAllowed         bool `json:"rollback_allowed,omitempty"`
	EvidenceTrustAllowed    bool `json:"evidence_trust_allowed,omitempty"`
	ResultTrustAllowed      bool `json:"result_trust_allowed,omitempty"`
	LedgerWriteAllowed      bool `json:"ledger_write_allowed,omitempty"`
	PassGoldAllowed         bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed       bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGrantAllowed   bool `json:"authority_grant_allowed,omitempty"`
}

type SandboxSafetyControls struct {
	Present             bool `json:"present"`
	Valid               bool `json:"valid"`
	NoRealExecution     bool `json:"no_real_execution"`
	NoRealAdapterCall   bool `json:"no_real_adapter_call"`
	NoNetworkCall       bool `json:"no_network_call"`
	NoCommandExecution  bool `json:"no_command_execution"`
	NoFileWrite         bool `json:"no_file_write"`
	NoDeploy            bool `json:"no_deploy"`
	NoPromotion         bool `json:"no_promotion"`
	NoStatusPublish     bool `json:"no_status_publish"`
	NoMemoryStableWrite bool `json:"no_memory_stable_write"`
	NoTrustEscalation   bool `json:"no_trust_escalation"`
}

type SandboxAdapterClaims struct {
	MCPExecutionAllowed     bool `json:"mcp_execution_allowed"`
	RealExecutionAllowed    bool `json:"real_execution_allowed"`
	RealAdapterCallAllowed  bool `json:"real_adapter_call_allowed"`
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
	RealLockAllowed         bool `json:"real_lock_allowed"`
	RealLockAcquired        bool `json:"real_lock_acquired"`
	RollbackAllowed         bool `json:"rollback_allowed"`
	RollbackPerformed       bool `json:"rollback_performed"`
	EvidenceTrustAllowed    bool `json:"evidence_trust_allowed"`
	EvidenceTrusted         bool `json:"evidence_trusted"`
	ResultTrustAllowed      bool `json:"result_trust_allowed"`
	ResultTrusted           bool `json:"result_trusted"`
	LedgerWriteAllowed      bool `json:"ledger_write_allowed"`
	LedgerWritten           bool `json:"ledger_written"`
	PassGold                bool `json:"pass_gold"`
	PassSecure              bool `json:"pass_secure"`
	PassGoldAllowed         bool `json:"pass_gold_allowed"`
	PassSecureAllowed       bool `json:"pass_secure_allowed"`
	AuthorityGranted        bool `json:"authority_granted"`
	AuthorityGrantAllowed   bool `json:"authority_grant_allowed"`
	HumanApprovalBypassed   bool `json:"human_approval_bypassed"`
	RevalidationBypassed    bool `json:"revalidation_bypassed"`
	RuntimeBypassed         bool `json:"runtime_bypassed"`
	EvidenceBindingBypassed bool `json:"evidence_binding_bypassed"`
	VerificationBypassed    bool `json:"verification_bypassed"`
	SandboxPolicyBypassed   bool `json:"sandbox_policy_bypassed"`
	SandboxEscaped          bool `json:"sandbox_escaped"`
	KillSwitchBypassed      bool `json:"kill_switch_bypassed"`
	RollbackBypassed        bool `json:"rollback_bypassed"`
	ObservabilityBypassed   bool `json:"observability_bypassed"`
}

type SandboxAdapter struct {
	Version                       string   `json:"version"`
	DryRun                        bool     `json:"dry_run"`
	ReadOnly                      bool     `json:"read_only"`
	Sandbox                       bool     `json:"sandbox"`
	AdapterType                   string   `json:"adapter_type"`
	AdapterStatus                 string   `json:"adapter_status"`
	Valid                         bool     `json:"valid"`
	Blocked                       bool     `json:"blocked"`
	SandboxAdapterReadyDryRun     bool     `json:"sandbox_adapter_ready_dry_run"`
	SandboxNoopCandidate          bool     `json:"sandbox_noop_candidate"`
	ControlledRuntimeCandidate    bool     `json:"controlled_runtime_candidate"`
	SimulatedAdapterResponseReady bool     `json:"simulated_adapter_response_ready"`
	MissingItems                  []string `json:"missing_items"`
	UnsafeClaims                  []string `json:"unsafe_claims"`
	Conflicts                     []string `json:"conflicts"`
	BlockingReasons               []string `json:"blocking_reasons"`
	RequiredItems                 []string `json:"required_items"`
	RequiredRealGates             []string `json:"required_real_gates"`
	Recommendations               []string `json:"recommendations"`
	MCPExecutionAllowed           bool     `json:"mcp_execution_allowed"`
	RealExecutionAllowed          bool     `json:"real_execution_allowed"`
	RealAdapterCallAllowed        bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed            bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed           bool     `json:"executor_call_allowed"`
	NetworkCallAllowed            bool     `json:"network_call_allowed"`
	CommandExecutionAllowed       bool     `json:"command_execution_allowed"`
	FileWriteAllowed              bool     `json:"file_write_allowed"`
	DeployAllowed                 bool     `json:"deploy_allowed"`
	PromotionAllowed              bool     `json:"promotion_allowed"`
	StatusPublishAllowed          bool     `json:"status_publish_allowed"`
	MutationAllowed               bool     `json:"mutation_allowed"`
	MemoryWriteAllowed            bool     `json:"memory_write_allowed"`
	StablePromotionAllowed        bool     `json:"stable_promotion_allowed"`
	LearningAllowed               bool     `json:"learning_allowed"`
	RealLockAllowed               bool     `json:"real_lock_allowed"`
	RollbackAllowed               bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed          bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed            bool     `json:"result_trust_allowed"`
	LedgerWriteAllowed            bool     `json:"ledger_write_allowed"`
	PassGoldAllowed               bool     `json:"pass_gold_allowed"`
	PassSecureAllowed             bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed         bool     `json:"authority_grant_allowed"`
}

type SandboxAdapterValidation = SandboxAdapter

type SandboxAdapterBoundary struct {
	Version                 string   `json:"version"`
	DryRun                  bool     `json:"dry_run"`
	ReadOnly                bool     `json:"read_only"`
	Sandbox                 bool     `json:"sandbox"`
	AdapterType             string   `json:"adapter_type"`
	RealExecutionAllowed    bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed     bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed  bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed      bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed     bool     `json:"executor_call_allowed"`
	NetworkCallAllowed      bool     `json:"network_call_allowed"`
	CommandExecutionAllowed bool     `json:"command_execution_allowed"`
	FileWriteAllowed        bool     `json:"file_write_allowed"`
	DeployAllowed           bool     `json:"deploy_allowed"`
	PromotionAllowed        bool     `json:"promotion_allowed"`
	StatusPublishAllowed    bool     `json:"status_publish_allowed"`
	MutationAllowed         bool     `json:"mutation_allowed"`
	MemoryWriteAllowed      bool     `json:"memory_write_allowed"`
	StablePromotionAllowed  bool     `json:"stable_promotion_allowed"`
	LearningAllowed         bool     `json:"learning_allowed"`
	RealLockAllowed         bool     `json:"real_lock_allowed"`
	RollbackAllowed         bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed    bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed      bool     `json:"result_trust_allowed"`
	LedgerWriteAllowed      bool     `json:"ledger_write_allowed"`
	PassGoldAllowed         bool     `json:"pass_gold_allowed"`
	PassSecureAllowed       bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed   bool     `json:"authority_grant_allowed"`
	MCPCan                  []string `json:"mcp_can"`
	MCPCannot               []string `json:"mcp_cannot"`
	AlwaysDenied            []string `json:"always_denied"`
}

type SandboxAdapterAudit struct {
	Version                           string   `json:"version"`
	DryRun                            bool     `json:"dry_run"`
	ReadOnly                          bool     `json:"read_only"`
	Sandbox                           bool     `json:"sandbox"`
	AdapterType                       string   `json:"adapter_type"`
	RealExecutionAllowed              bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed               bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed            bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed                bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed               bool     `json:"executor_call_allowed"`
	NetworkCallAllowed                bool     `json:"network_call_allowed"`
	CommandExecutionAllowed           bool     `json:"command_execution_allowed"`
	FileWriteAllowed                  bool     `json:"file_write_allowed"`
	DeployAllowed                     bool     `json:"deploy_allowed"`
	PromotionAllowed                  bool     `json:"promotion_allowed"`
	StatusPublishAllowed              bool     `json:"status_publish_allowed"`
	MutationAllowed                   bool     `json:"mutation_allowed"`
	MemoryWriteAllowed                bool     `json:"memory_write_allowed"`
	StablePromotionAllowed            bool     `json:"stable_promotion_allowed"`
	LearningAllowed                   bool     `json:"learning_allowed"`
	RealLockAllowed                   bool     `json:"real_lock_allowed"`
	RollbackAllowed                   bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed              bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed                bool     `json:"result_trust_allowed"`
	LedgerWriteAllowed                bool     `json:"ledger_write_allowed"`
	PassGoldAllowed                   bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                 bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed             bool     `json:"authority_grant_allowed"`
	UnsafeClaimsFound                 bool     `json:"unsafe_claims_found"`
	UnsafeClaims                      []string `json:"unsafe_claims"`
	MissingItemsFound                 bool     `json:"missing_items_found"`
	MissingItems                      []string `json:"missing_items"`
	RealExecutionAttemptFound         bool     `json:"real_execution_attempt_found"`
	RealAdapterCallAttemptFound       bool     `json:"real_adapter_call_attempt_found"`
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
	RuntimeBypassAttemptFound         bool     `json:"runtime_bypass_attempt_found"`
	EvidenceBindingBypassAttemptFound bool     `json:"evidence_binding_bypass_attempt_found"`
	VerificationBypassAttemptFound    bool     `json:"verification_bypass_attempt_found"`
	SandboxPolicyBypassAttemptFound   bool     `json:"sandbox_policy_bypass_attempt_found"`
	SandboxEscapeAttemptFound         bool     `json:"sandbox_escape_attempt_found"`
	KillSwitchBypassAttemptFound      bool     `json:"kill_switch_bypass_attempt_found"`
	RollbackBypassAttemptFound        bool     `json:"rollback_bypass_attempt_found"`
	ObservabilityBypassAttemptFound   bool     `json:"observability_bypass_attempt_found"`
	Recommendations                   []string `json:"recommendations"`
}

type SandboxAdapterExplain struct {
	Version                                                string   `json:"version"`
	DryRun                                                 bool     `json:"dry_run"`
	ReadOnly                                               bool     `json:"read_only"`
	Sandbox                                                bool     `json:"sandbox"`
	AdapterType                                            string   `json:"adapter_type"`
	RealExecutionAllowed                                   bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed                                    bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed                                 bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed                                     bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed                                    bool     `json:"executor_call_allowed"`
	NetworkCallAllowed                                     bool     `json:"network_call_allowed"`
	CommandExecutionAllowed                                bool     `json:"command_execution_allowed"`
	FileWriteAllowed                                       bool     `json:"file_write_allowed"`
	DeployAllowed                                          bool     `json:"deploy_allowed"`
	PromotionAllowed                                       bool     `json:"promotion_allowed"`
	StatusPublishAllowed                                   bool     `json:"status_publish_allowed"`
	MutationAllowed                                        bool     `json:"mutation_allowed"`
	MemoryWriteAllowed                                     bool     `json:"memory_write_allowed"`
	StablePromotionAllowed                                 bool     `json:"stable_promotion_allowed"`
	LearningAllowed                                        bool     `json:"learning_allowed"`
	RealLockAllowed                                        bool     `json:"real_lock_allowed"`
	RollbackAllowed                                        bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed                                   bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed                                     bool     `json:"result_trust_allowed"`
	LedgerWriteAllowed                                     bool     `json:"ledger_write_allowed"`
	PassGoldAllowed                                        bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                                      bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed                                  bool     `json:"authority_grant_allowed"`
	WhySandboxAdapterIsNotRealExecution                    []string `json:"why_sandbox_adapter_is_not_real_execution"`
	WhyRealAdapterCallIsBlocked                            []string `json:"why_real_adapter_call_is_blocked"`
	WhySandboxNoopIsAllowedOnlyAsDryRun                    []string `json:"why_sandbox_noop_is_allowed_only_as_dry_run"`
	WhyControlledRuntimeIsRequired                         []string `json:"why_controlled_runtime_is_required"`
	WhyEvidenceBindingIsRequired                           []string `json:"why_evidence_binding_is_required"`
	WhyResultVerificationIsRequired                        []string `json:"why_result_verification_is_required"`
	WhyFinalAuthorizationIsRequired                        []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                                []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired             []string `json:"why_human_approval_and_revalidation_are_required"`
	WhySandboxPolicySafetyRollbackObservabilityAreRequired []string `json:"why_sandbox_policy_safety_rollback_observability_are_required"`
	WhyRealExecutionRequiresFutureExplicitRelease          []string `json:"why_real_execution_requires_future_explicit_release"`
	RequiredGates                                          []string `json:"required_gates"`
	AlwaysDenied                                           []string `json:"always_denied"`
}

func BuildSandboxAdapter(input SandboxAdapterInput) SandboxAdapter { return validate(input) }
func ValidateSandboxAdapter(input SandboxAdapterInput) SandboxAdapterValidation {
	return validate(input)
}

func validate(input SandboxAdapterInput) SandboxAdapter {
	input = normalize(input)
	missing, conflicts, unsafe := []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s) }

	for name, val := range map[string]string{"sandbox_adapter_id": input.SandboxAdapterID, "runtime_id": input.RuntimeID, "runtime_session_id": input.RuntimeSessionID, "evidence_binding_id": input.EvidenceBindingID, "verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment} {
		if strings.TrimSpace(val) == "" {
			addMissing(name)
		}
	}
	if isMCP(input.Executor) {
		addConflict("executor_must_not_be_mcp")
		addConflict(StatusUnsafeRealExecutionAttempt)
	}
	if input.ExecutorMode != "external_only" {
		addMissing("external_only")
		addConflict("executor_mode_must_be_external_only")
	}
	if input.AdapterType != "sandbox_noop" {
		addConflict("adapter_type_must_be_sandbox_noop")
	}
	if input.Environment != "sandbox" && input.Environment != "local_sandbox" {
		addConflict("environment_must_be_sandbox_or_local_sandbox")
	}

	if input.ControlledRuntime == nil {
		addMissing("V11.0_controlled_runtime")
		addConflict(StatusControlledRuntimeMissing)
	} else {
		rt := executionruntime.ValidateControlledExecutionRuntime(*input.ControlledRuntime)
		if !rt.Valid || rt.Blocked || !rt.RuntimeReadyDryRun || !rt.ControlledRuntimeReady {
			addConflict(StatusControlledRuntimeBlocked)
			for _, c := range append(clone(rt.Conflicts), rt.BlockingReasons...) {
				bubbleRuntimePrereqs(c, addConflict)
			}
		}
	}
	if !input.RuntimeReadyDryRun {
		addConflict("runtime_ready_dry_run_false")
		addConflict(StatusControlledRuntimeBlocked)
	}
	if !input.ControlledRuntimeReady {
		addConflict("controlled_runtime_ready_false")
		addConflict(StatusControlledRuntimeBlocked)
	}

	if input.EvidenceBinding == nil {
		addMissing("V10.8_evidence_binding")
		addConflict(StatusEvidenceBindingMissing)
	} else {
		eb := evidencebinding.ValidateExecutionEvidenceBinding(*input.EvidenceBinding)
		if !eb.Valid || eb.Blocked || !eb.EvidenceBindingReadyDryRun {
			addConflict(StatusEvidenceBindingBlocked)
			bubbleEvidencePrereqs(append(clone(eb.Conflicts), eb.BlockingReasons...), addConflict)
		}
	}
	validateRealGates(input.RealGates, addMissing, addConflict)
	if input.HumanApproval == nil || input.HumanApproval.Placeholder || !input.HumanApproval.Approved {
		addMissing("human_approval")
		addConflict(StatusHumanApprovalRequired)
	}
	if input.IndependentRevalidation == nil || input.IndependentRevalidation.Placeholder || !input.IndependentRevalidation.Completed || !input.IndependentRevalidation.PassGoldRevalidated || !input.IndependentRevalidation.PassSecureRevalidated {
		addMissing("independent_revalidation")
		addConflict(StatusRevalidationRequired)
	}

	validatePresence("sandbox_policy", input.SandboxPolicy, addMissing, addConflict, StatusSandboxPolicyMissing)
	validatePresence("sandbox_scope", input.SandboxScope, addMissing, addConflict, StatusSandboxScopeMissing)
	validatePresence("sandbox_constraints", input.SandboxConstraints, addMissing, addConflict, StatusSandboxConstraintsMissing)
	validatePresence("sandbox_input_contract", input.SandboxInputContract, addMissing, addConflict, StatusSandboxInputMissing)
	validatePresence("sandbox_output_contract", input.SandboxOutputContract, addMissing, addConflict, StatusSandboxOutputMissing)
	validatePresence("sandbox_noop_response", input.SandboxNoopResponse, addMissing, addConflict, StatusSandboxNoopMissing)
	validatePresence("sandbox_audit_envelope", input.SandboxAuditEnvelope, addMissing, addConflict, StatusSandboxAuditMissing)
	validatePresence("sandbox_observability_plan", input.SandboxObservabilityPlan, addMissing, addConflict, StatusSandboxObservabilityMissing)
	validatePresence("sandbox_rollback_policy", input.SandboxRollbackPolicy, addMissing, addConflict, StatusSandboxRollbackMissing)
	validatePresence("sandbox_timeout", input.SandboxTimeout, addMissing, addConflict, StatusSandboxTimeoutMissing)
	validatePresence("sandbox_kill_switch", input.SandboxKillSwitch, addMissing, addConflict, StatusSandboxKillSwitchMissing)
	validatePresence("sandbox_stop_criteria", input.SandboxStopCriteria, addMissing, addConflict, StatusSandboxStopCriteriaMissing)
	if strings.TrimSpace(input.SandboxIdempotencyKey) == "" {
		addMissing("sandbox_idempotency_key")
		addConflict(StatusSandboxIdempotencyMissing)
	}
	if input.SandboxSafetyControls == nil || !input.SandboxSafetyControls.Present || !input.SandboxSafetyControls.Valid || !input.SandboxSafetyControls.NoRealExecution || !input.SandboxSafetyControls.NoRealAdapterCall || !input.SandboxSafetyControls.NoNetworkCall || !input.SandboxSafetyControls.NoCommandExecution || !input.SandboxSafetyControls.NoFileWrite || !input.SandboxSafetyControls.NoDeploy || !input.SandboxSafetyControls.NoPromotion || !input.SandboxSafetyControls.NoStatusPublish || !input.SandboxSafetyControls.NoMemoryStableWrite || !input.SandboxSafetyControls.NoTrustEscalation {
		addMissing("sandbox_safety_controls")
		addConflict(StatusSandboxSafetyControlsMissing)
	}

	for _, c := range unsafeClaims(input.Claims) {
		addUnsafe(c)
		mapUnsafeStatus(c, addConflict)
	}
	blocked := len(missing) > 0 || len(conflicts) > 0 || len(unsafe) > 0
	status := StatusSandboxAdapterReadyDryRun
	if blocked {
		status = StatusBlocked
		if len(missing) > 0 {
			status = StatusIncomplete
		}
	}
	blocking := appendUniqueList(conflicts, unsafe...)
	if len(missing) > 0 {
		blocking = appendUnique(blocking, StatusIncomplete)
	}
	if len(conflicts) > 0 || len(unsafe) > 0 {
		blocking = appendUnique(blocking, StatusBlocked)
	}
	return SandboxAdapter{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, AdapterType: "sandbox_noop", AdapterStatus: status, Valid: !blocked, Blocked: blocked, SandboxAdapterReadyDryRun: !blocked, SandboxNoopCandidate: !blocked, ControlledRuntimeCandidate: !blocked, SimulatedAdapterResponseReady: !blocked, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocked), RealExecutionAllowed: false}
}

func BuildSandboxAdapterBoundary() SandboxAdapterBoundary {
	return SandboxAdapterBoundary{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, AdapterType: "sandbox_noop", RealExecutionAllowed: false, MCPCan: []string{"read", "validate", "audit", "explain", "simulate sandbox adapter", "build noop adapter response"}, MCPCannot: []string{"execute", "execute_runtime", "call_real_adapter", "call_executor", "network_call", "command_execution", "file_write", "deploy", "promote", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "trust_evidence", "trust_result", "write_ledger", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}, AlwaysDenied: clone(denied)}
}

func AuditSandboxAdapter(input SandboxAdapterInput) SandboxAdapterAudit {
	v := validate(input)
	c := normalize(input).Claims
	a := SandboxAdapterAudit{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, AdapterType: "sandbox_noop", RealExecutionAllowed: false, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	if c == nil {
		return a
	}
	a.RealExecutionAttemptFound = c.RealExecutionAllowed
	a.RealAdapterCallAttemptFound = c.RealAdapterCallAllowed
	a.AdapterCallAttemptFound = c.AdapterCallAllowed || c.RealAdapterCallAllowed
	a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
	a.NetworkAttemptFound = c.NetworkCallAllowed
	a.CommandAttemptFound = c.CommandExecutionAllowed
	a.FileWriteAttemptFound = c.FileWriteAllowed
	a.DeployAttemptFound = c.DeployAllowed
	a.PromotionAttemptFound = c.PromotionAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
	a.MemoryWriteAttemptFound = c.MemoryWriteAllowed
	a.StableLearningAttemptFound = c.LearningAllowed || c.LearnedAsStable || c.StablePromoted
	a.EvidenceTrustAttemptFound = c.EvidenceTrustAllowed || c.EvidenceTrusted
	a.ResultTrustAttemptFound = c.ResultTrustAllowed || c.ResultTrusted
	a.LedgerWriteAttemptFound = c.LedgerWriteAllowed || c.LedgerWritten
	a.RealLockAttemptFound = c.RealLockAllowed || c.RealLockAcquired
	a.RollbackAttemptFound = c.RollbackAllowed || c.RollbackPerformed
	a.AutoGoldAttemptFound = c.PassGold || c.PassSecure || c.PassGoldAllowed || c.PassSecureAllowed
	a.AuthorityGrantAttemptFound = c.AuthorityGranted || c.AuthorityGrantAllowed
	a.HumanApprovalBypassAttemptFound = c.HumanApprovalBypassed
	a.RevalidationBypassAttemptFound = c.RevalidationBypassed
	a.RuntimeBypassAttemptFound = c.RuntimeBypassed
	a.EvidenceBindingBypassAttemptFound = c.EvidenceBindingBypassed
	a.VerificationBypassAttemptFound = c.VerificationBypassed
	a.SandboxPolicyBypassAttemptFound = c.SandboxPolicyBypassed
	a.SandboxEscapeAttemptFound = c.SandboxEscaped
	a.KillSwitchBypassAttemptFound = c.KillSwitchBypassed
	a.RollbackBypassAttemptFound = c.RollbackBypassed
	a.ObservabilityBypassAttemptFound = c.ObservabilityBypassed
	return a
}

func ExplainSandboxAdapter(input SandboxAdapterInput) SandboxAdapterExplain {
	return SandboxAdapterExplain{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, AdapterType: "sandbox_noop", RealExecutionAllowed: false, WhySandboxAdapterIsNotRealExecution: []string{"V11.1 only builds a simulated noop adapter response and performs no side effects."}, WhyRealAdapterCallIsBlocked: []string{"Real adapter calls remain denied until a future explicit release."}, WhySandboxNoopIsAllowedOnlyAsDryRun: []string{"The sandbox noop candidate is consultative and cannot authorize execution."}, WhyControlledRuntimeIsRequired: []string{"The V11.0 controlled runtime must be valid before a sandbox adapter rehearsal can be considered."}, WhyEvidenceBindingIsRequired: []string{"Evidence binding keeps simulated results associated with immutable dry-run context without trusting them."}, WhyResultVerificationIsRequired: []string{"Result verification is required to avoid accepting adapter output automatically."}, WhyFinalAuthorizationIsRequired: []string{"Final authorization proves upstream gates were evaluated before sandbox rehearsal."}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE real gates are prerequisites but are not granted by this adapter."}, WhyHumanApprovalAndRevalidationAreRequired: []string{"Human approval and independent revalidation prevent placeholder approvals and bypasses."}, WhySandboxPolicySafetyRollbackObservabilityAreRequired: []string{"Sandbox policy, safety controls, rollback policy, and observability define the no-side-effect boundary."}, WhyRealExecutionRequiresFutureExplicitRelease: []string{"This version intentionally denies real execution, deploy, status, writes, locks, rollback, trust, and authority."}, RequiredGates: clone(requiredGates), AlwaysDenied: clone(denied)}
}

func normalize(input SandboxAdapterInput) SandboxAdapterInput {
	if input.Claims == nil {
		input.Claims = &SandboxAdapterClaims{}
	}
	c := input.Claims
	c.MCPExecutionAllowed = c.MCPExecutionAllowed || input.MCPExecutionAllowed
	c.RealExecutionAllowed = c.RealExecutionAllowed || input.RealExecutionAllowed
	c.RealAdapterCallAllowed = c.RealAdapterCallAllowed || input.RealAdapterCallAllowed
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
	c.RealLockAllowed = c.RealLockAllowed || input.RealLockAllowed
	c.RollbackAllowed = c.RollbackAllowed || input.RollbackAllowed
	c.EvidenceTrustAllowed = c.EvidenceTrustAllowed || input.EvidenceTrustAllowed
	c.ResultTrustAllowed = c.ResultTrustAllowed || input.ResultTrustAllowed
	c.LedgerWriteAllowed = c.LedgerWriteAllowed || input.LedgerWriteAllowed
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

func bubbleRuntimePrereqs(c string, add func(string)) {
	switch c {
	case executionruntime.StatusEvidenceBindingMissing:
		add(StatusEvidenceBindingMissing)
	case executionruntime.StatusEvidenceBindingBlocked:
		add(StatusEvidenceBindingBlocked)
	case executionruntime.StatusResultVerificationMissing:
		add(StatusResultVerificationMissing)
	case executionruntime.StatusResultVerificationBlocked:
		add(StatusResultVerificationBlocked)
	case executionruntime.StatusResponseContractMissing:
		add(StatusResponseContractMissing)
	case executionruntime.StatusResponseContractBlocked:
		add(StatusResponseContractBlocked)
	case executionruntime.StatusRequestEnvelopeMissing:
		add(StatusRequestEnvelopeMissing)
	case executionruntime.StatusRequestEnvelopeBlocked:
		add(StatusRequestEnvelopeBlocked)
	case executionruntime.StatusAdapterInterfaceMissing:
		add(StatusAdapterInterfaceMissing)
	case executionruntime.StatusAdapterInterfaceBlocked:
		add(StatusAdapterInterfaceBlocked)
	case executionruntime.StatusFinalAuthorizationMissing:
		add(StatusFinalAuthorizationMissing)
	case executionruntime.StatusFinalAuthorizationBlocked:
		add(StatusFinalAuthorizationBlocked)
	case executionruntime.StatusSimulationMissing:
		add(StatusSimulationMissing)
	case executionruntime.StatusSimulationBlocked:
		add(StatusSimulationBlocked)
	case executionruntime.StatusFirewallMissing:
		add(StatusFirewallMissing)
	case executionruntime.StatusFirewallBlocked:
		add(StatusFirewallBlocked)
	case executionruntime.StatusSovereignCandidateMissing:
		add(StatusSovereignCandidateMissing)
	}
}
func bubbleEvidencePrereqs(xs []string, add func(string)) {
	for _, c := range xs {
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

func unsafeClaims(c *SandboxAdapterClaims) []string {
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
	add("real_adapter_call_allowed", c.RealAdapterCallAllowed)
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
	add("real_lock_allowed", c.RealLockAllowed)
	add("real_lock_acquired", c.RealLockAcquired)
	add("rollback_allowed", c.RollbackAllowed)
	add("rollback_performed", c.RollbackPerformed)
	add("evidence_trust_allowed", c.EvidenceTrustAllowed)
	add("evidence_trusted", c.EvidenceTrusted)
	add("result_trust_allowed", c.ResultTrustAllowed)
	add("result_trusted", c.ResultTrusted)
	add("ledger_write_allowed", c.LedgerWriteAllowed)
	add("ledger_written", c.LedgerWritten)
	add("pass_gold", c.PassGold)
	add("pass_secure", c.PassSecure)
	add("pass_gold_allowed", c.PassGoldAllowed)
	add("pass_secure_allowed", c.PassSecureAllowed)
	add("authority_granted", c.AuthorityGranted)
	add("authority_grant_allowed", c.AuthorityGrantAllowed)
	return out
}

func mapUnsafeStatus(c string, add func(string)) {
	switch c {
	case "real_execution_allowed", "mcp_execution_allowed":
		add(StatusUnsafeRealExecutionAttempt)
	case "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed":
		add(StatusUnsafeRealAdapterCallAttempt)
	case "network_call_allowed":
		add(StatusUnsafeNetworkAttempt)
	case "command_execution_allowed":
		add(StatusUnsafeCommandAttempt)
	case "file_write_allowed":
		add(StatusUnsafeFileWriteAttempt)
	case "deploy_allowed":
		add(StatusUnsafeDeployAttempt)
	case "promotion_allowed":
		add(StatusUnsafePromotionAttempt)
	case "status_publish_allowed":
		add(StatusUnsafeStatusPublishAttempt)
	case "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "stable_promoted", "learned_as_stable":
		add(StatusUnsafeMemoryWriteAttempt)
	case "evidence_trust_allowed", "evidence_trusted", "result_trust_allowed", "result_trusted", "ledger_write_allowed", "ledger_written", "pass_gold", "pass_secure", "pass_gold_allowed", "pass_secure_allowed", "authority_granted", "authority_grant_allowed":
		add(StatusUnsafeTrustEscalationAttempt)
	case "real_lock_allowed", "real_lock_acquired":
		add("unsafe_real_lock_attempt")
	case "rollback_allowed", "rollback_performed":
		add("unsafe_rollback_attempt")
	}
}
func recommendations(blocked bool) []string {
	if blocked {
		return []string{"keep adapter sandbox/noop", "do not execute real commands", "complete all V11.0 and sandbox safety prerequisites"}
	}
	return []string{"sandbox noop adapter response is ready for dry-run inspection only", "do not treat simulated output as trusted evidence or result"}
}
func isMCP(s string) bool { return s == "mcp" || s == "mcp_readonly" }
func appendUnique(xs []string, s string) []string {
	if strings.TrimSpace(s) == "" {
		return xs
	}
	for _, x := range xs {
		if x == s {
			return xs
		}
	}
	return append(xs, s)
}
func appendUniqueList(xs []string, ys ...string) []string {
	out := clone(xs)
	for _, y := range ys {
		out = appendUnique(out, y)
	}
	return out
}
func clone(xs []string) []string {
	if xs == nil {
		return nil
	}
	out := make([]string, len(xs))
	copy(out, xs)
	return out
}
