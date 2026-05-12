// Package sandboxtracereplay implements V11.4 Sandbox Trace Replay Gate.
//
// V11.4 is a read-only/dry-run logical replay gate for V11.3 persistible
// sandbox/noop traces. It reconstructs replay evidence in the response payload
// only and never executes, calls adapters, performs network/command/file/database/ledger
// operations, persists replay state, deploys, promotes, publishes status,
// writes memory, grants authority, or trusts evidence/results/traces/replays.
package sandboxtracereplay

import (
	"strings"

	"github.com/visioncore/go-core/internal/executionresponse"
)

const Version = "V11.4"
const TraceMode = "sandbox_noop_trace"
const ReplayMode = "sandbox_trace_replay_gate"

const (
	StatusSandboxTraceReplayReadyDryRun  = "sandbox_trace_replay_ready_dry_run"
	StatusIncomplete                     = "incomplete"
	StatusBlocked                        = "blocked"
	StatusSandboxTracePersistenceMissing = "sandbox_trace_persistence_missing"
	StatusSandboxTracePersistenceBlocked = "sandbox_trace_persistence_blocked"
	StatusReplayReferenceMissing         = "replay_reference_missing"
	StatusReplayReferenceInvalid         = "replay_reference_invalid"
	StatusReplayEventListMissing         = "replay_event_list_missing"
	StatusReplayEventOrderPolicyMissing  = "replay_event_order_policy_missing"
	StatusReplayEventOrderInvalid        = "replay_event_order_invalid"
	StatusReplayTimestampModelMissing    = "replay_timestamp_model_missing"
	StatusReplayCorrelationIDMissing     = "replay_correlation_id_missing"
	StatusReplayIdempotencyMissing       = "replay_idempotency_missing"
	StatusReplayTraceHashMissing         = "replay_trace_hash_missing"
	StatusReplayHashVerificationFailed   = "replay_hash_verification_failed"
	StatusReplayAuditIndexMissing        = "replay_audit_index_missing"
	StatusReplayAuditTrailMissing        = "replay_audit_trail_missing"
	StatusReplayDeniedPermissionsMissing = "replay_denied_permissions_missing"
	StatusReplayBlockedActionsMissing    = "replay_blocked_actions_missing"
	StatusReplaySafetyDecisionsMissing   = "replay_safety_decisions_missing"
	StatusReplayCheckResultsMissing      = "replay_check_results_missing"
	StatusReplayIntegrityCheckFailed     = "replay_integrity_check_failed"
	StatusReplayCompletenessCheckFailed  = "replay_completeness_check_failed"
	StatusReplayRedactionPolicyMissing   = "replay_redaction_policy_missing"
	StatusReplayPrivacyPolicyMissing     = "replay_privacy_policy_missing"
	StatusReplayRetentionPolicyMissing   = "replay_retention_policy_missing"
	StatusReplayTamperEvidenceMissing    = "replay_tamper_evidence_missing"
	StatusSandboxTraceMissing            = "sandbox_trace_missing"
	StatusSandboxTraceBlocked            = "sandbox_trace_blocked"
	StatusSandboxAdapterMissing          = "sandbox_adapter_missing"
	StatusSandboxAdapterBlocked          = "sandbox_adapter_blocked"
	StatusControlledRuntimeMissing       = "controlled_runtime_missing"
	StatusControlledRuntimeBlocked       = "controlled_runtime_blocked"
	StatusEvidenceBindingMissing         = "evidence_binding_missing"
	StatusEvidenceBindingBlocked         = "evidence_binding_blocked"
	StatusResultVerificationMissing      = "result_verification_missing"
	StatusResultVerificationBlocked      = "result_verification_blocked"
	StatusResponseContractMissing        = "response_contract_missing"
	StatusResponseContractBlocked        = "response_contract_blocked"
	StatusRequestEnvelopeMissing         = "request_envelope_missing"
	StatusRequestEnvelopeBlocked         = "request_envelope_blocked"
	StatusAdapterInterfaceMissing        = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked        = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing      = "final_authorization_missing"
	StatusFinalAuthorizationBlocked      = "final_authorization_blocked"
	StatusSimulationMissing              = "simulation_missing"
	StatusSimulationBlocked              = "simulation_blocked"
	StatusFirewallMissing                = "firewall_missing"
	StatusFirewallBlocked                = "firewall_blocked"
	StatusSovereignCandidateMissing      = "sovereign_candidate_missing"
	StatusMissingRealGates               = "missing_real_gates"
	StatusHumanApprovalRequired          = "human_approval_required"
	StatusRevalidationRequired           = "revalidation_required"
	StatusUnsafeRealExecutionAttempt     = "unsafe_real_execution_attempt"
	StatusUnsafeRealAdapterCallAttempt   = "unsafe_real_adapter_call_attempt"
	StatusUnsafeNetworkAttempt           = "unsafe_network_attempt"
	StatusUnsafeCommandAttempt           = "unsafe_command_attempt"
	StatusUnsafeFileWriteAttempt         = "unsafe_file_write_attempt"
	StatusUnsafeDatabaseWriteAttempt     = "unsafe_database_write_attempt"
	StatusUnsafeTracePersistenceAttempt  = "unsafe_trace_persistence_attempt"
	StatusUnsafeReplayPersistenceAttempt = "unsafe_replay_persistence_attempt"
	StatusUnsafeLedgerWriteAttempt       = "unsafe_ledger_write_attempt"
	StatusUnsafeDeployAttempt            = "unsafe_deploy_attempt"
	StatusUnsafePromotionAttempt         = "unsafe_promotion_attempt"
	StatusUnsafeStatusPublishAttempt     = "unsafe_status_publish_attempt"
	StatusUnsafeMemoryWriteAttempt       = "unsafe_memory_write_attempt"
	StatusUnsafeTrustEscalationAttempt   = "unsafe_trust_escalation_attempt"
)

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var denied = []string{"mcp_execution_allowed", "real_execution_allowed", "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "trace_persistence_allowed", "replay_persistence_allowed", "trace_persisted", "replay_persisted", "database_write_allowed", "ledger_write_allowed", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "evidence_trust_allowed", "result_trust_allowed", "trace_trust_allowed", "replay_trust_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}

var requiredItems = []string{
	"replay_gate_id", "persistence_gate_id", "sandbox_trace_id", "sandbox_adapter_id", "runtime_id", "runtime_session_id", "evidence_binding_id", "verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "sandbox_noop", "project", "branch", "commit_sha", "target", "environment", "sandbox_or_local_sandbox",
	"V11.3_sandbox_trace_persistence_gate", "sandbox_trace_persistence_ready_dry_run", "persistence_candidate", "isolated_storage_candidate", "trace_replay_reference_ready_dry_run", "audit_index_candidate", "V11.2_sandbox_execution_trace", "sandbox_trace_ready_dry_run", "trace_complete_dry_run", "denied_permissions_recorded", "blocked_actions_recorded", "V11.1_sandbox_adapter", "sandbox_adapter_ready_dry_run", "V11.0_controlled_runtime", "runtime_ready_dry_run", "controlled_runtime_ready", "V10.8_evidence_binding", "V10.7_result_verification", "V10.6_response_contract", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation",
	"replay_policy", "replay_scope", "replay_reference", "replay_event_list", "replay_event_order_policy", "replay_event_order_result", "replay_timestamp_model", "replay_correlation_id", "replay_idempotency_key", "replay_trace_hash", "replay_hash_verification", "replay_audit_index_descriptor", "replay_audit_trail", "replay_denied_permissions", "replay_blocked_actions", "replay_safety_decisions", "replay_check_results", "replay_integrity_checks", "replay_completeness_checks", "replay_redaction_policy", "replay_privacy_policy", "replay_retention_policy", "replay_tamper_evidence_model",
	"no_real_execution", "no_real_adapter_call", "no_network_call", "no_command_execution", "no_file_write_inside_mcp", "no_database_write_inside_mcp", "no_ledger_write_inside_mcp", "no_replay_persistence_inside_mcp", "no_deploy", "no_promotion", "no_status_publish", "no_memory_stable_write", "no_trust_escalation",
}

type Approval struct {
	Present               bool `json:"present"`
	Approved              bool `json:"approved"`
	Placeholder           bool `json:"placeholder"`
	ApprovalIsPlaceholder bool `json:"approval_is_placeholder"`
	Valid                 bool `json:"valid"`
}
type Revalidation struct {
	Present                   bool `json:"present"`
	Completed                 bool `json:"completed"`
	Placeholder               bool `json:"placeholder"`
	RevalidationIsPlaceholder bool `json:"revalidation_is_placeholder"`
	PassGoldRevalidated       bool `json:"pass_gold_revalidated"`
	PassSecureRevalidated     bool `json:"pass_secure_revalidated"`
	Valid                     bool `json:"valid"`
}

type SandboxTraceReplayInput struct {
	Root                 string `json:"root,omitempty"`
	Operation            string `json:"operation,omitempty"`
	ReplayGateID         string `json:"replay_gate_id,omitempty"`
	PersistenceGateID    string `json:"persistence_gate_id,omitempty"`
	SandboxTraceID       string `json:"sandbox_trace_id,omitempty"`
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

	SandboxTracePersistenceGate        *executionresponse.PresenceValid `json:"sandbox_trace_persistence_gate,omitempty"`
	SandboxTracePersistenceReadyDryRun bool                             `json:"sandbox_trace_persistence_ready_dry_run,omitempty"`
	PersistenceCandidate               bool                             `json:"persistence_candidate,omitempty"`
	IsolatedStorageCandidate           bool                             `json:"isolated_storage_candidate,omitempty"`
	TraceReplayReferenceReadyDryRun    bool                             `json:"trace_replay_reference_ready_dry_run,omitempty"`
	AuditIndexCandidate                bool                             `json:"audit_index_candidate,omitempty"`
	SandboxTrace                       *executionresponse.PresenceValid `json:"sandbox_trace,omitempty"`
	SandboxTraceReadyDryRun            bool                             `json:"sandbox_trace_ready_dry_run,omitempty"`
	TraceCompleteDryRun                bool                             `json:"trace_complete_dry_run,omitempty"`
	DeniedPermissionsRecorded          bool                             `json:"denied_permissions_recorded,omitempty"`
	BlockedActionsRecorded             bool                             `json:"blocked_actions_recorded,omitempty"`
	SandboxAdapter                     *executionresponse.PresenceValid `json:"sandbox_adapter,omitempty"`
	SandboxAdapterReadyDryRun          bool                             `json:"sandbox_adapter_ready_dry_run,omitempty"`
	ControlledRuntime                  *executionresponse.PresenceValid `json:"controlled_runtime,omitempty"`
	RuntimeReadyDryRun                 bool                             `json:"runtime_ready_dry_run,omitempty"`
	ControlledRuntimeReady             bool                             `json:"controlled_runtime_ready,omitempty"`
	EvidenceBinding                    *executionresponse.PresenceValid `json:"evidence_binding,omitempty"`
	ResultVerification                 *executionresponse.PresenceValid `json:"result_verification,omitempty"`
	ResponseContract                   *executionresponse.PresenceValid `json:"response_contract,omitempty"`
	RequestEnvelope                    *executionresponse.PresenceValid `json:"request_envelope,omitempty"`
	AdapterInterface                   *executionresponse.PresenceValid `json:"adapter_interface,omitempty"`
	FinalAuthorization                 *executionresponse.PresenceValid `json:"final_authorization,omitempty"`
	Simulation                         *executionresponse.PresenceValid `json:"simulation,omitempty"`
	Firewall                           *executionresponse.PresenceValid `json:"firewall,omitempty"`
	SovereignCandidate                 *executionresponse.PresenceValid `json:"sovereign_candidate,omitempty"`
	PassGoldReal                       *executionresponse.PresenceValid `json:"pass_gold_real,omitempty"`
	PassSecureReal                     *executionresponse.PresenceValid `json:"pass_secure_real,omitempty"`
	RealGateDryRun                     bool                             `json:"real_gate_dry_run,omitempty"`
	RealGateSynthesized                bool                             `json:"real_gate_synthesized,omitempty"`
	RecognizedByAuthority              bool                             `json:"recognized_by_authority,omitempty"`
	HumanApproval                      *Approval                        `json:"human_approval,omitempty"`
	IndependentRevalidation            *Revalidation                    `json:"independent_revalidation,omitempty"`

	ReplayPolicy               *executionresponse.PresenceValid `json:"replay_policy,omitempty"`
	ReplayScope                *executionresponse.PresenceValid `json:"replay_scope,omitempty"`
	ReplayReference            *executionresponse.PresenceValid `json:"replay_reference,omitempty"`
	ReplayReferenceValue       string                           `json:"replay_reference_value,omitempty"`
	ReplayEvents               []string                         `json:"replay_events,omitempty"`
	ReplayEventOrderPolicy     *executionresponse.PresenceValid `json:"replay_event_order_policy,omitempty"`
	ReplayEventOrderResult     *executionresponse.PresenceValid `json:"replay_event_order_result,omitempty"`
	ReplayTimestampModel       *executionresponse.PresenceValid `json:"replay_timestamp_model,omitempty"`
	ReplayCorrelationID        string                           `json:"replay_correlation_id,omitempty"`
	ReplayIdempotencyKey       string                           `json:"replay_idempotency_key,omitempty"`
	ReplayTraceHash            string                           `json:"replay_trace_hash,omitempty"`
	ReplayHashVerification     *executionresponse.PresenceValid `json:"replay_hash_verification,omitempty"`
	ReplayAuditIndexDescriptor *executionresponse.PresenceValid `json:"replay_audit_index_descriptor,omitempty"`
	ReplayAuditTrail           *executionresponse.PresenceValid `json:"replay_audit_trail,omitempty"`
	ReplayDeniedPermissions    []string                         `json:"replay_denied_permissions,omitempty"`
	ReplayBlockedActions       []string                         `json:"replay_blocked_actions,omitempty"`
	ReplaySafetyDecisions      *executionresponse.PresenceValid `json:"replay_safety_decisions,omitempty"`
	ReplayCheckResults         *executionresponse.PresenceValid `json:"replay_check_results,omitempty"`
	ReplayIntegrityChecks      *executionresponse.PresenceValid `json:"replay_integrity_checks,omitempty"`
	ReplayCompletenessChecks   *executionresponse.PresenceValid `json:"replay_completeness_checks,omitempty"`
	ReplayRedactionPolicy      *executionresponse.PresenceValid `json:"replay_redaction_policy,omitempty"`
	ReplayPrivacyPolicy        *executionresponse.PresenceValid `json:"replay_privacy_policy,omitempty"`
	ReplayRetentionPolicy      *executionresponse.PresenceValid `json:"replay_retention_policy,omitempty"`
	ReplayTamperEvidenceModel  *executionresponse.PresenceValid `json:"replay_tamper_evidence_model,omitempty"`
	Claims                     *SandboxTraceReplayClaims        `json:"claims,omitempty"`
}

type SafetyDenials struct {
	MCPExecutionAllowed      bool `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed   bool `json:"real_adapter_call_allowed"`
	AdapterCallAllowed       bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed      bool `json:"executor_call_allowed"`
	NetworkCallAllowed       bool `json:"network_call_allowed"`
	CommandExecutionAllowed  bool `json:"command_execution_allowed"`
	FileWriteAllowed         bool `json:"file_write_allowed"`
	TracePersistenceAllowed  bool `json:"trace_persistence_allowed"`
	ReplayPersistenceAllowed bool `json:"replay_persistence_allowed"`
	TracePersisted           bool `json:"trace_persisted"`
	ReplayPersisted          bool `json:"replay_persisted"`
	DatabaseWriteAllowed     bool `json:"database_write_allowed"`
	LedgerWriteAllowed       bool `json:"ledger_write_allowed"`
	DeployAllowed            bool `json:"deploy_allowed"`
	PromotionAllowed         bool `json:"promotion_allowed"`
	StatusPublishAllowed     bool `json:"status_publish_allowed"`
	MutationAllowed          bool `json:"mutation_allowed"`
	MemoryWriteAllowed       bool `json:"memory_write_allowed"`
	StablePromotionAllowed   bool `json:"stable_promotion_allowed"`
	LearningAllowed          bool `json:"learning_allowed"`
	RealLockAllowed          bool `json:"real_lock_allowed"`
	RollbackAllowed          bool `json:"rollback_allowed"`
	EvidenceTrustAllowed     bool `json:"evidence_trust_allowed"`
	ResultTrustAllowed       bool `json:"result_trust_allowed"`
	TraceTrustAllowed        bool `json:"trace_trust_allowed"`
	ReplayTrustAllowed       bool `json:"replay_trust_allowed"`
	PassGoldAllowed          bool `json:"pass_gold_allowed"`
	PassSecureAllowed        bool `json:"pass_secure_allowed"`
	AuthorityGrantAllowed    bool `json:"authority_grant_allowed"`
}

type SandboxTraceReplayClaims struct {
	MCPExecutionAllowed      bool `json:"mcp_execution_allowed,omitempty"`
	RealExecutionAllowed     bool `json:"real_execution_allowed,omitempty"`
	RealAdapterCallAllowed   bool `json:"real_adapter_call_allowed,omitempty"`
	AdapterCallAllowed       bool `json:"adapter_call_allowed,omitempty"`
	ExecutorCallAllowed      bool `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed       bool `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed  bool `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed         bool `json:"file_write_allowed,omitempty"`
	TracePersistenceAllowed  bool `json:"trace_persistence_allowed,omitempty"`
	ReplayPersistenceAllowed bool `json:"replay_persistence_allowed,omitempty"`
	TracePersisted           bool `json:"trace_persisted,omitempty"`
	ReplayPersisted          bool `json:"replay_persisted,omitempty"`
	DatabaseWriteAllowed     bool `json:"database_write_allowed,omitempty"`
	LedgerWriteAllowed       bool `json:"ledger_write_allowed,omitempty"`
	LedgerWritten            bool `json:"ledger_written,omitempty"`
	DeployAllowed            bool `json:"deploy_allowed,omitempty"`
	PromotionAllowed         bool `json:"promotion_allowed,omitempty"`
	StatusPublishAllowed     bool `json:"status_publish_allowed,omitempty"`
	MutationAllowed          bool `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed       bool `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed   bool `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed          bool `json:"learning_allowed,omitempty"`
	StablePromoted           bool `json:"stable_promoted,omitempty"`
	LearnedAsStable          bool `json:"learned_as_stable,omitempty"`
	RealLockAllowed          bool `json:"real_lock_allowed,omitempty"`
	RealLockAcquired         bool `json:"real_lock_acquired,omitempty"`
	RollbackAllowed          bool `json:"rollback_allowed,omitempty"`
	RollbackPerformed        bool `json:"rollback_performed,omitempty"`
	EvidenceTrustAllowed     bool `json:"evidence_trust_allowed,omitempty"`
	EvidenceTrusted          bool `json:"evidence_trusted,omitempty"`
	ResultTrustAllowed       bool `json:"result_trust_allowed,omitempty"`
	ResultTrusted            bool `json:"result_trusted,omitempty"`
	TraceTrustAllowed        bool `json:"trace_trust_allowed,omitempty"`
	TraceTrusted             bool `json:"trace_trusted,omitempty"`
	ReplayTrustAllowed       bool `json:"replay_trust_allowed,omitempty"`
	ReplayTrusted            bool `json:"replay_trusted,omitempty"`
	PassGold                 bool `json:"pass_gold,omitempty"`
	PassSecure               bool `json:"pass_secure,omitempty"`
	PassGoldAllowed          bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed        bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGranted         bool `json:"authority_granted,omitempty"`
	AuthorityGrantAllowed    bool `json:"authority_grant_allowed,omitempty"`
	HumanApprovalBypassed    bool `json:"human_approval_bypassed,omitempty"`
	RevalidationBypassed     bool `json:"revalidation_bypassed,omitempty"`
	RuntimeBypassed          bool `json:"runtime_bypassed,omitempty"`
	SandboxAdapterBypassed   bool `json:"sandbox_adapter_bypassed,omitempty"`
	SandboxTraceBypassed     bool `json:"sandbox_trace_bypassed,omitempty"`
	PersistenceGateBypassed  bool `json:"persistence_gate_bypassed,omitempty"`
	EvidenceBindingBypassed  bool `json:"evidence_binding_bypassed,omitempty"`
	VerificationBypassed     bool `json:"verification_bypassed,omitempty"`
	ReplayPolicyBypassed     bool `json:"replay_policy_bypassed,omitempty"`
	ReplayHashBypassed       bool `json:"replay_hash_bypassed,omitempty"`
	ReplayEventOrderBypassed bool `json:"replay_event_order_bypassed,omitempty"`
	ReplayAuditIndexBypassed bool `json:"replay_audit_index_bypassed,omitempty"`
	ReplayRedactionBypassed  bool `json:"replay_redaction_bypassed,omitempty"`
	SandboxEscaped           bool `json:"sandbox_escaped,omitempty"`
	KillSwitchBypassed       bool `json:"kill_switch_bypassed,omitempty"`
	RollbackBypassed         bool `json:"rollback_bypassed,omitempty"`
	ObservabilityBypassed    bool `json:"observability_bypassed,omitempty"`
}

type SandboxTraceReplayGate struct {
	Version                       string            `json:"version"`
	DryRun                        bool              `json:"dry_run"`
	ReadOnly                      bool              `json:"read_only"`
	Sandbox                       bool              `json:"sandbox"`
	TraceMode                     string            `json:"trace_mode"`
	ReplayMode                    string            `json:"replay_mode"`
	ReplayStatus                  string            `json:"replay_status"`
	Valid                         bool              `json:"valid"`
	Blocked                       bool              `json:"blocked"`
	SandboxTraceReplayReadyDryRun bool              `json:"sandbox_trace_replay_ready_dry_run"`
	ReplayCandidate               bool              `json:"replay_candidate"`
	ReplayReferenceValidDryRun    bool              `json:"replay_reference_valid_dry_run"`
	EventOrderValidDryRun         bool              `json:"event_order_valid_dry_run"`
	DeniedPermissionsReplayed     bool              `json:"denied_permissions_replayed"`
	BlockedActionsReplayed        bool              `json:"blocked_actions_replayed"`
	TraceHashVerifiedDryRun       bool              `json:"trace_hash_verified_dry_run"`
	AuditIndexReplayableDryRun    bool              `json:"audit_index_replayable_dry_run"`
	ReplayCompleteDryRun          bool              `json:"replay_complete_dry_run"`
	ReconstructedSandboxSession   map[string]string `json:"reconstructed_sandbox_session,omitempty"`
	ReplayDecision                string            `json:"replay_decision"`
	MissingItems                  []string          `json:"missing_items"`
	UnsafeClaims                  []string          `json:"unsafe_claims"`
	Conflicts                     []string          `json:"conflicts"`
	BlockingReasons               []string          `json:"blocking_reasons"`
	RequiredItems                 []string          `json:"required_items"`
	RequiredRealGates             []string          `json:"required_real_gates"`
	Recommendations               []string          `json:"recommendations"`
	MCPExecutionAllowed           bool              `json:"mcp_execution_allowed"`
	RealExecutionAllowed          bool              `json:"real_execution_allowed"`
	RealAdapterCallAllowed        bool              `json:"real_adapter_call_allowed"`
	AdapterCallAllowed            bool              `json:"adapter_call_allowed"`
	ExecutorCallAllowed           bool              `json:"executor_call_allowed"`
	NetworkCallAllowed            bool              `json:"network_call_allowed"`
	CommandExecutionAllowed       bool              `json:"command_execution_allowed"`
	FileWriteAllowed              bool              `json:"file_write_allowed"`
	TracePersistenceAllowed       bool              `json:"trace_persistence_allowed"`
	ReplayPersistenceAllowed      bool              `json:"replay_persistence_allowed"`
	TracePersisted                bool              `json:"trace_persisted"`
	ReplayPersisted               bool              `json:"replay_persisted"`
	DatabaseWriteAllowed          bool              `json:"database_write_allowed"`
	LedgerWriteAllowed            bool              `json:"ledger_write_allowed"`
	DeployAllowed                 bool              `json:"deploy_allowed"`
	PromotionAllowed              bool              `json:"promotion_allowed"`
	StatusPublishAllowed          bool              `json:"status_publish_allowed"`
	MutationAllowed               bool              `json:"mutation_allowed"`
	MemoryWriteAllowed            bool              `json:"memory_write_allowed"`
	StablePromotionAllowed        bool              `json:"stable_promotion_allowed"`
	LearningAllowed               bool              `json:"learning_allowed"`
	RealLockAllowed               bool              `json:"real_lock_allowed"`
	RollbackAllowed               bool              `json:"rollback_allowed"`
	EvidenceTrustAllowed          bool              `json:"evidence_trust_allowed"`
	ResultTrustAllowed            bool              `json:"result_trust_allowed"`
	TraceTrustAllowed             bool              `json:"trace_trust_allowed"`
	ReplayTrustAllowed            bool              `json:"replay_trust_allowed"`
	PassGoldAllowed               bool              `json:"pass_gold_allowed"`
	PassSecureAllowed             bool              `json:"pass_secure_allowed"`
	AuthorityGrantAllowed         bool              `json:"authority_grant_allowed"`
}

type SandboxTraceReplayValidation = SandboxTraceReplayGate

type SandboxTraceReplayBoundary struct {
	SafetyDenials
	Version              string   `json:"version"`
	DryRun               bool     `json:"dry_run"`
	ReadOnly             bool     `json:"read_only"`
	Sandbox              bool     `json:"sandbox"`
	TraceMode            string   `json:"trace_mode"`
	ReplayMode           string   `json:"replay_mode"`
	RealExecutionAllowed bool     `json:"real_execution_allowed"`
	MCPCan               []string `json:"mcp_can"`
	MCPCannot            []string `json:"mcp_cannot"`
	AlwaysDenied         []string `json:"always_denied"`
}

type SandboxTraceReplayAudit struct {
	SafetyDenials
	Version                            string   `json:"version"`
	DryRun                             bool     `json:"dry_run"`
	ReadOnly                           bool     `json:"read_only"`
	Sandbox                            bool     `json:"sandbox"`
	TraceMode                          string   `json:"trace_mode"`
	ReplayMode                         string   `json:"replay_mode"`
	RealExecutionAllowed               bool     `json:"real_execution_allowed"`
	UnsafeClaimsFound                  bool     `json:"unsafe_claims_found"`
	UnsafeClaims                       []string `json:"unsafe_claims"`
	MissingItemsFound                  bool     `json:"missing_items_found"`
	MissingItems                       []string `json:"missing_items"`
	RealExecutionAttemptFound          bool     `json:"real_execution_attempt_found"`
	RealAdapterCallAttemptFound        bool     `json:"real_adapter_call_attempt_found"`
	AdapterCallAttemptFound            bool     `json:"adapter_call_attempt_found"`
	ExecutorCallAttemptFound           bool     `json:"executor_call_attempt_found"`
	NetworkAttemptFound                bool     `json:"network_attempt_found"`
	CommandAttemptFound                bool     `json:"command_attempt_found"`
	FileWriteAttemptFound              bool     `json:"file_write_attempt_found"`
	DatabaseWriteAttemptFound          bool     `json:"database_write_attempt_found"`
	TracePersistenceAttemptFound       bool     `json:"trace_persistence_attempt_found"`
	ReplayPersistenceAttemptFound      bool     `json:"replay_persistence_attempt_found"`
	LedgerWriteAttemptFound            bool     `json:"ledger_write_attempt_found"`
	DeployAttemptFound                 bool     `json:"deploy_attempt_found"`
	PromotionAttemptFound              bool     `json:"promotion_attempt_found"`
	StatusPublishAttemptFound          bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound            bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound         bool     `json:"stable_learning_attempt_found"`
	TraceTrustAttemptFound             bool     `json:"trace_trust_attempt_found"`
	ReplayTrustAttemptFound            bool     `json:"replay_trust_attempt_found"`
	EvidenceTrustAttemptFound          bool     `json:"evidence_trust_attempt_found"`
	ResultTrustAttemptFound            bool     `json:"result_trust_attempt_found"`
	RealLockAttemptFound               bool     `json:"real_lock_attempt_found"`
	RollbackAttemptFound               bool     `json:"rollback_attempt_found"`
	AutoGoldAttemptFound               bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound         bool     `json:"authority_grant_attempt_found"`
	HumanApprovalBypassAttemptFound    bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound     bool     `json:"revalidation_bypass_attempt_found"`
	RuntimeBypassAttemptFound          bool     `json:"runtime_bypass_attempt_found"`
	SandboxAdapterBypassAttemptFound   bool     `json:"sandbox_adapter_bypass_attempt_found"`
	SandboxTraceBypassAttemptFound     bool     `json:"sandbox_trace_bypass_attempt_found"`
	PersistenceGateBypassAttemptFound  bool     `json:"persistence_gate_bypass_attempt_found"`
	EvidenceBindingBypassAttemptFound  bool     `json:"evidence_binding_bypass_attempt_found"`
	VerificationBypassAttemptFound     bool     `json:"verification_bypass_attempt_found"`
	ReplayPolicyBypassAttemptFound     bool     `json:"replay_policy_bypass_attempt_found"`
	ReplayHashBypassAttemptFound       bool     `json:"replay_hash_bypass_attempt_found"`
	ReplayEventOrderBypassAttemptFound bool     `json:"replay_event_order_bypass_attempt_found"`
	ReplayAuditIndexBypassAttemptFound bool     `json:"replay_audit_index_bypass_attempt_found"`
	ReplayRedactionBypassAttemptFound  bool     `json:"replay_redaction_bypass_attempt_found"`
	SandboxEscapeAttemptFound          bool     `json:"sandbox_escape_attempt_found"`
	KillSwitchBypassAttemptFound       bool     `json:"kill_switch_bypass_attempt_found"`
	RollbackBypassAttemptFound         bool     `json:"rollback_bypass_attempt_found"`
	ObservabilityBypassAttemptFound    bool     `json:"observability_bypass_attempt_found"`
}

type SandboxTraceReplayExplain struct {
	SafetyDenials
	Version                                                  string   `json:"version"`
	DryRun                                                   bool     `json:"dry_run"`
	ReadOnly                                                 bool     `json:"read_only"`
	Sandbox                                                  bool     `json:"sandbox"`
	TraceMode                                                string   `json:"trace_mode"`
	ReplayMode                                               string   `json:"replay_mode"`
	RealExecutionAllowed                                     bool     `json:"real_execution_allowed"`
	WhyReplayGateIsNotExecution                              []string `json:"why_replay_gate_is_not_execution"`
	WhyReplayGateIsNotPersistence                            []string `json:"why_replay_gate_is_not_persistence"`
	WhyFileWriteIsBlockedInsideMCP                           []string `json:"why_file_write_is_blocked_inside_mcp"`
	WhyDatabaseWriteIsBlockedInsideMCP                       []string `json:"why_database_write_is_blocked_inside_mcp"`
	WhyLedgerWriteIsBlockedInsideMCP                         []string `json:"why_ledger_write_is_blocked_inside_mcp"`
	WhySandboxTracePersistenceGateIsRequired                 []string `json:"why_sandbox_trace_persistence_gate_is_required"`
	WhySandboxTraceIsRequired                                []string `json:"why_sandbox_trace_is_required"`
	WhySandboxAdapterIsRequired                              []string `json:"why_sandbox_adapter_is_required"`
	WhyControlledRuntimeIsRequired                           []string `json:"why_controlled_runtime_is_required"`
	WhyEvidenceBindingIsRequired                             []string `json:"why_evidence_binding_is_required"`
	WhyResultVerificationIsRequired                          []string `json:"why_result_verification_is_required"`
	WhyFinalAuthorizationIsRequired                          []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                                  []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired               []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyEventOrderHashReplayReferenceAndAuditIndexAreRequired []string `json:"why_event_order_hash_replay_reference_and_audit_index_are_required"`
	WhyReplayCanOnlyBePersistedByFutureExplicitRelease       []string `json:"why_replay_can_only_be_persisted_by_future_explicit_release"`
	RequiredGates                                            []string `json:"required_gates"`
	AlwaysDenied                                             []string `json:"always_denied"`
}

func BuildSandboxTraceReplayGate(input SandboxTraceReplayInput) SandboxTraceReplayGate {
	return validate(input)
}
func ValidateSandboxTraceReplayGate(input SandboxTraceReplayInput) SandboxTraceReplayValidation {
	return validate(input)
}

func BuildSandboxTraceReplayBoundary() SandboxTraceReplayBoundary {
	return SandboxTraceReplayBoundary{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, ReplayMode: ReplayMode, RealExecutionAllowed: false, MCPCan: []string{"read", "validate", "audit", "explain", "simulate sandbox trace replay gate", "reconstruct sandbox session in response payload", "replay denied permissions in response payload", "replay blocked actions in response payload", "verify event order in dry-run", "verify trace hash in dry-run", "verify replay reference in dry-run", "verify audit index in dry-run", "return replay decision in response payload"}, MCPCannot: []string{"execute", "execute_runtime", "call_real_adapter", "call_executor", "network_call", "command_execution", "file_write", "database_write", "persist_trace", "persist_replay", "write_ledger", "deploy", "promote", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "trust_trace", "trust_replay", "trust_evidence", "trust_result", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}, AlwaysDenied: clone(denied)}
}

func AuditSandboxTraceReplayGate(input SandboxTraceReplayInput) SandboxTraceReplayAudit {
	v := validate(input)
	c := claims(input)
	a := SandboxTraceReplayAudit{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, ReplayMode: ReplayMode, RealExecutionAllowed: false, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems}
	if c == nil {
		return a
	}
	a.RealExecutionAttemptFound = c.RealExecutionAllowed || c.MCPExecutionAllowed
	a.RealAdapterCallAttemptFound = c.RealAdapterCallAllowed || c.AdapterCallAllowed || c.ExecutorCallAllowed
	a.AdapterCallAttemptFound = c.AdapterCallAllowed || c.RealAdapterCallAllowed
	a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
	a.NetworkAttemptFound = c.NetworkCallAllowed
	a.CommandAttemptFound = c.CommandExecutionAllowed
	a.FileWriteAttemptFound = c.FileWriteAllowed
	a.DatabaseWriteAttemptFound = c.DatabaseWriteAllowed
	a.TracePersistenceAttemptFound = c.TracePersistenceAllowed || c.TracePersisted
	a.ReplayPersistenceAttemptFound = c.ReplayPersistenceAllowed || c.ReplayPersisted
	a.LedgerWriteAttemptFound = c.LedgerWriteAllowed || c.LedgerWritten
	a.DeployAttemptFound = c.DeployAllowed
	a.PromotionAttemptFound = c.PromotionAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
	a.MemoryWriteAttemptFound = c.MemoryWriteAllowed || c.StablePromotionAllowed || c.LearningAllowed || c.StablePromoted || c.LearnedAsStable
	a.StableLearningAttemptFound = c.LearningAllowed || c.LearnedAsStable || c.StablePromoted
	a.TraceTrustAttemptFound = c.TraceTrustAllowed || c.TraceTrusted
	a.ReplayTrustAttemptFound = c.ReplayTrustAllowed || c.ReplayTrusted
	a.EvidenceTrustAttemptFound = c.EvidenceTrustAllowed || c.EvidenceTrusted
	a.ResultTrustAttemptFound = c.ResultTrustAllowed || c.ResultTrusted
	a.RealLockAttemptFound = c.RealLockAllowed || c.RealLockAcquired
	a.RollbackAttemptFound = c.RollbackAllowed || c.RollbackPerformed
	a.AutoGoldAttemptFound = c.PassGold || c.PassSecure || c.PassGoldAllowed || c.PassSecureAllowed
	a.AuthorityGrantAttemptFound = c.AuthorityGranted || c.AuthorityGrantAllowed
	a.HumanApprovalBypassAttemptFound = c.HumanApprovalBypassed
	a.RevalidationBypassAttemptFound = c.RevalidationBypassed
	a.RuntimeBypassAttemptFound = c.RuntimeBypassed
	a.SandboxAdapterBypassAttemptFound = c.SandboxAdapterBypassed
	a.SandboxTraceBypassAttemptFound = c.SandboxTraceBypassed
	a.PersistenceGateBypassAttemptFound = c.PersistenceGateBypassed
	a.EvidenceBindingBypassAttemptFound = c.EvidenceBindingBypassed
	a.VerificationBypassAttemptFound = c.VerificationBypassed
	a.ReplayPolicyBypassAttemptFound = c.ReplayPolicyBypassed
	a.ReplayHashBypassAttemptFound = c.ReplayHashBypassed
	a.ReplayEventOrderBypassAttemptFound = c.ReplayEventOrderBypassed
	a.ReplayAuditIndexBypassAttemptFound = c.ReplayAuditIndexBypassed
	a.ReplayRedactionBypassAttemptFound = c.ReplayRedactionBypassed
	a.SandboxEscapeAttemptFound = c.SandboxEscaped
	a.KillSwitchBypassAttemptFound = c.KillSwitchBypassed
	a.RollbackBypassAttemptFound = c.RollbackBypassed
	a.ObservabilityBypassAttemptFound = c.ObservabilityBypassed
	return a
}

func ExplainSandboxTraceReplayGate(input SandboxTraceReplayInput) SandboxTraceReplayExplain {
	return SandboxTraceReplayExplain{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, ReplayMode: ReplayMode, RealExecutionAllowed: false, WhyReplayGateIsNotExecution: []string{"V11.4 reconstructs and validates replay evidence in a response payload only; it cannot execute commands, runtimes, adapters, or external systems."}, WhyReplayGateIsNotPersistence: []string{"sandbox_trace_replay_ready_dry_run is advisory only and never writes replay records, ledgers, databases, files, status, or memory."}, WhyFileWriteIsBlockedInsideMCP: []string{"MCP remains a read-only control plane; file writes would create side effects and are always denied."}, WhyDatabaseWriteIsBlockedInsideMCP: []string{"Database writes would persist replay state and are outside this dry-run release."}, WhyLedgerWriteIsBlockedInsideMCP: []string{"Ledger writes imply durable audit authority and remain blocked."}, WhySandboxTracePersistenceGateIsRequired: []string{"V11.3 persistence eligibility proves the V11.2 sandbox trace is only a future persistence candidate, not persisted state."}, WhySandboxTraceIsRequired: []string{"A valid V11.2 sandbox/noop trace is the source event sequence for replay reconstruction."}, WhySandboxAdapterIsRequired: []string{"A valid V11.1 sandbox/noop adapter prevents real adapter calls from being treated as replayable sandbox evidence."}, WhyControlledRuntimeIsRequired: []string{"A valid V11.0 controlled runtime bounds session identity and external-only execution mode."}, WhyEvidenceBindingIsRequired: []string{"V10.8 evidence binding links replay evidence to prior verification without trusting it automatically."}, WhyResultVerificationIsRequired: []string{"V10.7 result verification is required before any advisory replay decision can be considered."}, WhyFinalAuthorizationIsRequired: []string{"V10.3 final authorization remains a prerequisite even though V11.4 grants no authority."}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real, non-dry-run, non-synthesized, authority-recognized prerequisites."}, WhyHumanApprovalAndRevalidationAreRequired: []string{"Real human approval and independent revalidation are required to prevent automatic trust escalation from replay output."}, WhyEventOrderHashReplayReferenceAndAuditIndexAreRequired: []string{"Event order, trace hash, replay reference, and audit index checks are the dry-run integrity model for logical replay."}, WhyReplayCanOnlyBePersistedByFutureExplicitRelease: []string{"V11.4 contains no persistence authority; replay persistence requires a future explicit release outside read-only MCP."}, RequiredGates: clone(requiredGates), AlwaysDenied: clone(denied)}
}

func validate(input SandboxTraceReplayInput) SandboxTraceReplayGate {
	missing, conflicts, unsafe := []string{}, []string{}, unsafeClaims(claims(input))
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	for name, val := range map[string]string{"replay_gate_id": input.ReplayGateID, "persistence_gate_id": input.PersistenceGateID, "sandbox_trace_id": input.SandboxTraceID, "sandbox_adapter_id": input.SandboxAdapterID, "runtime_id": input.RuntimeID, "runtime_session_id": input.RuntimeSessionID, "evidence_binding_id": input.EvidenceBindingID, "verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "executor_mode": input.ExecutorMode, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment, "replay_correlation_id": input.ReplayCorrelationID, "replay_idempotency_key": input.ReplayIdempotencyKey, "replay_trace_hash": input.ReplayTraceHash} {
		if strings.TrimSpace(val) == "" {
			addMissing(name)
		}
	}
	if input.Executor == "mcp" || input.Executor == "mcp_readonly" {
		addConflict("executor_must_not_be_mcp")
	}
	if input.ExecutorMode != "external_only" {
		addConflict("executor_mode_must_be_external_only")
	}
	if input.AdapterType != "sandbox_noop" {
		addConflict("adapter_type_must_be_sandbox_noop")
	}
	if input.Environment != "sandbox" && input.Environment != "local_sandbox" {
		addConflict("environment_must_be_sandbox_or_local_sandbox")
	}
	validatePresence(input.SandboxTracePersistenceGate, addMissing, addConflict, StatusSandboxTracePersistenceMissing, StatusSandboxTracePersistenceBlocked)
	requireBool(input.SandboxTracePersistenceReadyDryRun, "sandbox_trace_persistence_ready_dry_run", StatusSandboxTracePersistenceBlocked, addMissing, addConflict)
	requireBool(input.PersistenceCandidate, "persistence_candidate", StatusSandboxTracePersistenceBlocked, addMissing, addConflict)
	requireBool(input.IsolatedStorageCandidate, "isolated_storage_candidate", StatusSandboxTracePersistenceBlocked, addMissing, addConflict)
	requireBool(input.TraceReplayReferenceReadyDryRun, "trace_replay_reference_ready_dry_run", StatusSandboxTracePersistenceBlocked, addMissing, addConflict)
	requireBool(input.AuditIndexCandidate, "audit_index_candidate", StatusSandboxTracePersistenceBlocked, addMissing, addConflict)
	validatePresence(input.SandboxTrace, addMissing, addConflict, StatusSandboxTraceMissing, StatusSandboxTraceBlocked)
	requireBool(input.SandboxTraceReadyDryRun, "sandbox_trace_ready_dry_run", StatusSandboxTraceBlocked, addMissing, addConflict)
	requireBool(input.TraceCompleteDryRun, "trace_complete_dry_run", StatusSandboxTraceBlocked, addMissing, addConflict)
	requireBool(input.DeniedPermissionsRecorded, "denied_permissions_recorded", StatusSandboxTraceBlocked, addMissing, addConflict)
	requireBool(input.BlockedActionsRecorded, "blocked_actions_recorded", StatusSandboxTraceBlocked, addMissing, addConflict)
	validatePresence(input.SandboxAdapter, addMissing, addConflict, StatusSandboxAdapterMissing, StatusSandboxAdapterBlocked)
	requireBool(input.SandboxAdapterReadyDryRun, "sandbox_adapter_ready_dry_run", StatusSandboxAdapterBlocked, addMissing, addConflict)
	validatePresence(input.ControlledRuntime, addMissing, addConflict, StatusControlledRuntimeMissing, StatusControlledRuntimeBlocked)
	requireBool(input.RuntimeReadyDryRun, "runtime_ready_dry_run", StatusControlledRuntimeBlocked, addMissing, addConflict)
	requireBool(input.ControlledRuntimeReady, "controlled_runtime_ready", StatusControlledRuntimeBlocked, addMissing, addConflict)
	validatePresence(input.EvidenceBinding, addMissing, addConflict, StatusEvidenceBindingMissing, StatusEvidenceBindingBlocked)
	validatePresence(input.ResultVerification, addMissing, addConflict, StatusResultVerificationMissing, StatusResultVerificationBlocked)
	validatePresence(input.ResponseContract, addMissing, addConflict, StatusResponseContractMissing, StatusResponseContractBlocked)
	validatePresence(input.RequestEnvelope, addMissing, addConflict, StatusRequestEnvelopeMissing, StatusRequestEnvelopeBlocked)
	validatePresence(input.AdapterInterface, addMissing, addConflict, StatusAdapterInterfaceMissing, StatusAdapterInterfaceBlocked)
	validatePresence(input.FinalAuthorization, addMissing, addConflict, StatusFinalAuthorizationMissing, StatusFinalAuthorizationBlocked)
	validatePresence(input.Simulation, addMissing, addConflict, StatusSimulationMissing, StatusSimulationBlocked)
	validatePresence(input.Firewall, addMissing, addConflict, StatusFirewallMissing, StatusFirewallBlocked)
	validatePresence(input.SovereignCandidate, addMissing, addConflict, StatusSovereignCandidateMissing, StatusSovereignCandidateMissing)
	validatePresence(input.PassGoldReal, addMissing, addConflict, StatusMissingRealGates, StatusMissingRealGates)
	validatePresence(input.PassSecureReal, addMissing, addConflict, StatusMissingRealGates, StatusMissingRealGates)
	if input.RealGateDryRun {
		addConflict("real_gate_dry_run")
	}
	if input.RealGateSynthesized {
		addConflict("real_gate_synthesized")
	}
	if !input.RecognizedByAuthority {
		addConflict("recognized_by_authority=false")
	}
	if input.HumanApproval == nil || !input.HumanApproval.Present || !input.HumanApproval.Approved || input.HumanApproval.Placeholder || input.HumanApproval.ApprovalIsPlaceholder || !input.HumanApproval.Valid {
		addMissing("human_approval")
		addConflict(StatusHumanApprovalRequired)
	}
	if input.IndependentRevalidation == nil || !input.IndependentRevalidation.Present || !input.IndependentRevalidation.Completed || input.IndependentRevalidation.Placeholder || input.IndependentRevalidation.RevalidationIsPlaceholder || !input.IndependentRevalidation.PassGoldRevalidated || !input.IndependentRevalidation.PassSecureRevalidated || !input.IndependentRevalidation.Valid {
		addMissing("independent_revalidation")
		addConflict(StatusRevalidationRequired)
	}
	validatePresence(input.ReplayPolicy, addMissing, addConflict, "replay_policy_missing", "replay_policy_invalid")
	validatePresence(input.ReplayScope, addMissing, addConflict, "replay_scope_missing", "replay_scope_invalid")
	validatePresence(input.ReplayReference, addMissing, addConflict, StatusReplayReferenceMissing, StatusReplayReferenceInvalid)
	if len(input.ReplayEvents) == 0 {
		addMissing("replay_event_list")
		addConflict(StatusReplayEventListMissing)
	}
	validatePresence(input.ReplayEventOrderPolicy, addMissing, addConflict, StatusReplayEventOrderPolicyMissing, StatusReplayEventOrderPolicyMissing)
	validatePresence(input.ReplayEventOrderResult, addMissing, addConflict, StatusReplayEventOrderInvalid, StatusReplayEventOrderInvalid)
	validatePresence(input.ReplayTimestampModel, addMissing, addConflict, StatusReplayTimestampModelMissing, StatusReplayTimestampModelMissing)
	if input.ReplayCorrelationID == "" {
		addConflict(StatusReplayCorrelationIDMissing)
	}
	if input.ReplayIdempotencyKey == "" {
		addConflict(StatusReplayIdempotencyMissing)
	}
	if input.ReplayTraceHash == "" {
		addConflict(StatusReplayTraceHashMissing)
	}
	validatePresence(input.ReplayHashVerification, addMissing, addConflict, StatusReplayHashVerificationFailed, StatusReplayHashVerificationFailed)
	validatePresence(input.ReplayAuditIndexDescriptor, addMissing, addConflict, StatusReplayAuditIndexMissing, StatusReplayAuditIndexMissing)
	validatePresence(input.ReplayAuditTrail, addMissing, addConflict, StatusReplayAuditTrailMissing, StatusReplayAuditTrailMissing)
	if len(input.ReplayDeniedPermissions) == 0 {
		addMissing("replay_denied_permissions")
		addConflict(StatusReplayDeniedPermissionsMissing)
	}
	if len(input.ReplayBlockedActions) == 0 {
		addMissing("replay_blocked_actions")
		addConflict(StatusReplayBlockedActionsMissing)
	}
	validatePresence(input.ReplaySafetyDecisions, addMissing, addConflict, StatusReplaySafetyDecisionsMissing, StatusReplaySafetyDecisionsMissing)
	validatePresence(input.ReplayCheckResults, addMissing, addConflict, StatusReplayCheckResultsMissing, StatusReplayCheckResultsMissing)
	validatePresence(input.ReplayIntegrityChecks, addMissing, addConflict, StatusReplayIntegrityCheckFailed, StatusReplayIntegrityCheckFailed)
	validatePresence(input.ReplayCompletenessChecks, addMissing, addConflict, StatusReplayCompletenessCheckFailed, StatusReplayCompletenessCheckFailed)
	validatePresence(input.ReplayRedactionPolicy, addMissing, addConflict, StatusReplayRedactionPolicyMissing, StatusReplayRedactionPolicyMissing)
	validatePresence(input.ReplayPrivacyPolicy, addMissing, addConflict, StatusReplayPrivacyPolicyMissing, StatusReplayPrivacyPolicyMissing)
	validatePresence(input.ReplayRetentionPolicy, addMissing, addConflict, StatusReplayRetentionPolicyMissing, StatusReplayRetentionPolicyMissing)
	validatePresence(input.ReplayTamperEvidenceModel, addMissing, addConflict, StatusReplayTamperEvidenceMissing, StatusReplayTamperEvidenceMissing)
	for _, c := range unsafe {
		mapUnsafeStatus(c, addConflict)
	}
	blocking := appendUniqueList(missing, conflicts...)
	blocked := len(blocking) > 0 || len(unsafe) > 0
	valid := !blocked
	status := StatusSandboxTraceReplayReadyDryRun
	if len(missing) > 0 {
		status = StatusIncomplete
	}
	if len(conflicts) > 0 || len(unsafe) > 0 {
		status = StatusBlocked
	}
	if contains(conflicts, StatusSandboxTracePersistenceBlocked) {
		status = StatusSandboxTracePersistenceBlocked
	}
	if contains(missing, "replay_reference") || contains(conflicts, StatusReplayReferenceMissing) {
		status = StatusReplayReferenceMissing
	}
	if contains(conflicts, StatusReplayReferenceInvalid) {
		status = StatusReplayReferenceInvalid
	}
	if contains(conflicts, StatusReplayEventOrderInvalid) {
		status = StatusReplayEventOrderInvalid
	}
	return SandboxTraceReplayGate{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, ReplayMode: ReplayMode, ReplayStatus: status, Valid: valid, Blocked: blocked, SandboxTraceReplayReadyDryRun: valid, ReplayCandidate: valid, ReplayReferenceValidDryRun: valid, EventOrderValidDryRun: valid, DeniedPermissionsReplayed: valid, BlockedActionsReplayed: valid, TraceHashVerifiedDryRun: valid, AuditIndexReplayableDryRun: valid, ReplayCompleteDryRun: valid, ReconstructedSandboxSession: map[string]string{"runtime_session_id": input.RuntimeSessionID, "sandbox_trace_id": input.SandboxTraceID, "sandbox_adapter_id": input.SandboxAdapterID, "replay_gate_id": input.ReplayGateID}, ReplayDecision: replayDecision(valid), MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocked)}
}

func validatePresence(p *executionresponse.PresenceValid, addMissing, addConflict func(string), missingStatus, blockedStatus string) {
	if p == nil || !p.Present {
		addMissing(missingStatus)
		return
	}
	if !p.Valid {
		addConflict(blockedStatus)
	}
}
func requireBool(v bool, item, status string, addMissing, addConflict func(string)) {
	if !v {
		addMissing(item)
		addConflict(status)
	}
}
func replayDecision(valid bool) string {
	if valid {
		return "advisory_replay_candidate_dry_run"
	}
	return "blocked_no_replay_authority"
}
func recommendations(blocked bool) []string {
	if blocked {
		return []string{"keep sandbox trace replay as dry-run only", "do not execute or persist replay", "complete V11.3 persistence gate, V11.2 trace, real gates, approval, revalidation, replay reference, event order, hash, and audit index prerequisites"}
	}
	return []string{"sandbox trace is a replay candidate for dry-run inspection only", "future explicit release required before any replay persistence or execution"}
}
func claims(input SandboxTraceReplayInput) *SandboxTraceReplayClaims { return input.Claims }

func unsafeClaims(c *SandboxTraceReplayClaims) []string {
	if c == nil {
		return nil
	}
	out := []string{}
	add := func(n string, v bool) {
		if v {
			out = appendUnique(out, n)
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
	add("trace_persistence_allowed", c.TracePersistenceAllowed)
	add("replay_persistence_allowed", c.ReplayPersistenceAllowed)
	add("trace_persisted", c.TracePersisted)
	add("replay_persisted", c.ReplayPersisted)
	add("database_write_allowed", c.DatabaseWriteAllowed)
	add("ledger_write_allowed", c.LedgerWriteAllowed)
	add("ledger_written", c.LedgerWritten)
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
	add("trace_trust_allowed", c.TraceTrustAllowed)
	add("trace_trusted", c.TraceTrusted)
	add("replay_trust_allowed", c.ReplayTrustAllowed)
	add("replay_trusted", c.ReplayTrusted)
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
	case "database_write_allowed":
		add(StatusUnsafeDatabaseWriteAttempt)
	case "trace_persistence_allowed", "trace_persisted":
		add(StatusUnsafeTracePersistenceAttempt)
	case "replay_persistence_allowed", "replay_persisted":
		add(StatusUnsafeReplayPersistenceAttempt)
	case "ledger_write_allowed", "ledger_written":
		add(StatusUnsafeLedgerWriteAttempt)
	case "deploy_allowed":
		add(StatusUnsafeDeployAttempt)
	case "promotion_allowed":
		add(StatusUnsafePromotionAttempt)
	case "status_publish_allowed":
		add(StatusUnsafeStatusPublishAttempt)
	case "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "stable_promoted", "learned_as_stable":
		add(StatusUnsafeMemoryWriteAttempt)
	case "evidence_trust_allowed", "evidence_trusted", "result_trust_allowed", "result_trusted", "trace_trust_allowed", "trace_trusted", "replay_trust_allowed", "replay_trusted", "pass_gold", "pass_secure", "pass_gold_allowed", "pass_secure_allowed", "authority_granted", "authority_grant_allowed":
		add(StatusUnsafeTrustEscalationAttempt)
	case "real_lock_allowed", "real_lock_acquired":
		add("unsafe_real_lock_attempt")
	case "rollback_allowed", "rollback_performed":
		add("unsafe_rollback_attempt")
	}
}
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
func contains(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}
