// Package sandboxtrace implements V11.2 Sandbox Execution Trace Recorder.
//
// V11.2 builds an in-memory/read-only logical trace for the V11.1 sandbox/noop
// rehearsal. It records consultative trace payloads only and never persists,
// executes, calls adapters, performs network/command/file operations, writes
// ledgers/memory, deploys, promotes, rolls back, locks, trusts evidence/results,
// marks gates, or grants authority.
package sandboxtrace

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/sandboxadapter"
)

const Version = "V11.2"
const TraceMode = "sandbox_noop_trace"

const (
	StatusSandboxTraceReadyDryRun       = "sandbox_trace_ready_dry_run"
	StatusIncomplete                    = "incomplete"
	StatusBlocked                       = "blocked"
	StatusSandboxAdapterMissing         = "sandbox_adapter_missing"
	StatusSandboxAdapterBlocked         = "sandbox_adapter_blocked"
	StatusControlledRuntimeMissing      = "controlled_runtime_missing"
	StatusControlledRuntimeBlocked      = "controlled_runtime_blocked"
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
	StatusTracePolicyMissing            = "trace_policy_missing"
	StatusTraceScopeMissing             = "trace_scope_missing"
	StatusTraceInputSnapshotMissing     = "trace_input_snapshot_missing"
	StatusTraceOutputSnapshotMissing    = "trace_output_snapshot_missing"
	StatusTraceEventListMissing         = "trace_event_list_missing"
	StatusTraceTimestampModelMissing    = "trace_timestamp_model_missing"
	StatusTraceCorrelationIDMissing     = "trace_correlation_id_missing"
	StatusTraceIdempotencyMissing       = "trace_idempotency_missing"
	StatusDeniedPermissionsMissing      = "denied_permissions_missing"
	StatusBlockedActionsMissing         = "blocked_actions_missing"
	StatusSafetyDecisionsMissing        = "safety_decisions_missing"
	StatusCheckResultsMissing           = "check_results_missing"
	StatusAuditEnvelopeMissing          = "audit_envelope_missing"
	StatusObservabilityEnvelopeMissing  = "observability_envelope_missing"
	StatusIntegrityCheckFailed          = "integrity_check_failed"
	StatusCompletenessCheckFailed       = "completeness_check_failed"
	StatusRetentionPolicyMissing        = "retention_policy_missing"
	StatusPrivacyPolicyMissing          = "privacy_policy_missing"
	StatusRedactionPolicyMissing        = "redaction_policy_missing"
	StatusTamperEvidenceMissing         = "tamper_evidence_missing"
	StatusUnsafeRealExecutionAttempt    = "unsafe_real_execution_attempt"
	StatusUnsafeRealAdapterCallAttempt  = "unsafe_real_adapter_call_attempt"
	StatusUnsafeNetworkAttempt          = "unsafe_network_attempt"
	StatusUnsafeCommandAttempt          = "unsafe_command_attempt"
	StatusUnsafeFileWriteAttempt        = "unsafe_file_write_attempt"
	StatusUnsafeTracePersistenceAttempt = "unsafe_trace_persistence_attempt"
	StatusUnsafeLedgerWriteAttempt      = "unsafe_ledger_write_attempt"
	StatusUnsafeDeployAttempt           = "unsafe_deploy_attempt"
	StatusUnsafePromotionAttempt        = "unsafe_promotion_attempt"
	StatusUnsafeStatusPublishAttempt    = "unsafe_status_publish_attempt"
	StatusUnsafeMemoryWriteAttempt      = "unsafe_memory_write_attempt"
	StatusUnsafeTrustEscalationAttempt  = "unsafe_trust_escalation_attempt"
)

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var denied = []string{"mcp_execution_allowed", "real_execution_allowed", "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "trace_persistence_allowed", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "evidence_trust_allowed", "result_trust_allowed", "ledger_write_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}

var requiredItems = []string{
	"sandbox_trace_id", "sandbox_adapter_id", "runtime_id", "runtime_session_id", "evidence_binding_id", "verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "sandbox_noop", "project", "branch", "commit_sha", "target", "environment", "sandbox_or_local_sandbox",
	"V11.1_sandbox_adapter", "sandbox_adapter_ready_dry_run", "simulated_adapter_response_ready", "V11.0_controlled_runtime", "runtime_ready_dry_run", "controlled_runtime_ready", "V10.8_evidence_binding", "V10.7_result_verification", "V10.6_response_contract", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation",
	"trace_policy", "trace_scope", "trace_input_snapshot", "trace_output_snapshot", "trace_event_list", "trace_timestamp_model", "trace_correlation_id", "trace_idempotency_key", "trace_denied_permissions", "trace_blocked_actions", "trace_safety_decisions", "trace_check_results", "trace_audit_envelope", "trace_observability_envelope", "trace_integrity_checks", "trace_completeness_checks", "trace_retention_policy", "trace_privacy_policy", "trace_redaction_policy", "trace_tamper_evidence_model",
	"no_real_execution", "no_real_adapter_call", "no_network_call", "no_command_execution", "no_file_write", "no_trace_persistence", "no_ledger_write", "no_deploy", "no_promotion", "no_status_publish", "no_memory_stable_write", "no_trust_escalation",
}

type SandboxExecutionTraceInput struct {
	Root                 string `json:"root,omitempty"`
	Operation            string `json:"operation,omitempty"`
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

	SandboxAdapter                *sandboxadapter.SandboxAdapterInput `json:"sandbox_adapter,omitempty"`
	SandboxAdapterReadyDryRun     bool                                `json:"sandbox_adapter_ready_dry_run,omitempty"`
	SimulatedAdapterResponseReady bool                                `json:"simulated_adapter_response_ready,omitempty"`
	RuntimeReadyDryRun            bool                                `json:"runtime_ready_dry_run,omitempty"`
	ControlledRuntimeReady        bool                                `json:"controlled_runtime_ready,omitempty"`
	TracePolicy                   *executionresponse.PresenceValid    `json:"trace_policy,omitempty"`
	TraceScope                    *executionresponse.PresenceValid    `json:"trace_scope,omitempty"`
	TraceInputSnapshot            *executionresponse.PresenceValid    `json:"trace_input_snapshot,omitempty"`
	TraceOutputSnapshot           *executionresponse.PresenceValid    `json:"trace_output_snapshot,omitempty"`
	TraceEventList                *executionresponse.PresenceValid    `json:"trace_event_list,omitempty"`
	TraceTimestampModel           *executionresponse.PresenceValid    `json:"trace_timestamp_model,omitempty"`
	TraceCorrelationID            string                              `json:"trace_correlation_id,omitempty"`
	TraceIdempotencyKey           string                              `json:"trace_idempotency_key,omitempty"`
	TraceDeniedPermissions        *executionresponse.PresenceValid    `json:"trace_denied_permissions,omitempty"`
	TraceBlockedActions           *executionresponse.PresenceValid    `json:"trace_blocked_actions,omitempty"`
	TraceSafetyDecisions          *executionresponse.PresenceValid    `json:"trace_safety_decisions,omitempty"`
	TraceCheckResults             *executionresponse.PresenceValid    `json:"trace_check_results,omitempty"`
	TraceAuditEnvelope            *executionresponse.PresenceValid    `json:"trace_audit_envelope,omitempty"`
	TraceObservabilityEnvelope    *executionresponse.PresenceValid    `json:"trace_observability_envelope,omitempty"`
	TraceIntegrityChecks          *executionresponse.PresenceValid    `json:"trace_integrity_checks,omitempty"`
	TraceCompletenessChecks       *executionresponse.PresenceValid    `json:"trace_completeness_checks,omitempty"`
	TraceRetentionPolicy          *executionresponse.PresenceValid    `json:"trace_retention_policy,omitempty"`
	TracePrivacyPolicy            *executionresponse.PresenceValid    `json:"trace_privacy_policy,omitempty"`
	TraceRedactionPolicy          *executionresponse.PresenceValid    `json:"trace_redaction_policy,omitempty"`
	TraceTamperEvidenceModel      *executionresponse.PresenceValid    `json:"trace_tamper_evidence_model,omitempty"`
	InputReceived                 map[string]interface{}              `json:"input_received,omitempty"`
	RuntimeSession                map[string]interface{}              `json:"runtime_session,omitempty"`
	SimulatedAdapterResponse      map[string]interface{}              `json:"simulated_adapter_response,omitempty"`
	LogicalTimestamps             []string                            `json:"logical_timestamps,omitempty"`
	ChecksExecuted                []string                            `json:"checks_executed,omitempty"`
	DeniedPermissions             []string                            `json:"denied_permissions,omitempty"`
	BlockedActions                []string                            `json:"blocked_actions,omitempty"`
	AuditTrail                    []string                            `json:"audit_trail,omitempty"`
	SafetyDecisions               []string                            `json:"safety_decisions,omitempty"`
	SandboxPolicyResult           string                              `json:"sandbox_policy_result,omitempty"`
	NoopResult                    string                              `json:"noop_result,omitempty"`
	TraceHash                     string                              `json:"trace_hash,omitempty"`
	TraceCompleteness             string                              `json:"trace_completeness,omitempty"`
	Claims                        *SandboxTraceClaims                 `json:"claims,omitempty"`

	MCPExecutionAllowed     bool `json:"mcp_execution_allowed,omitempty"`
	RealExecutionAllowed    bool `json:"real_execution_allowed,omitempty"`
	RealAdapterCallAllowed  bool `json:"real_adapter_call_allowed,omitempty"`
	AdapterCallAllowed      bool `json:"adapter_call_allowed,omitempty"`
	ExecutorCallAllowed     bool `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed      bool `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed bool `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed        bool `json:"file_write_allowed,omitempty"`
	TracePersistenceAllowed bool `json:"trace_persistence_allowed,omitempty"`
	TracePersisted          bool `json:"trace_persisted,omitempty"`
	DeployAllowed           bool `json:"deploy_allowed,omitempty"`
	PromotionAllowed        bool `json:"promotion_allowed,omitempty"`
	StatusPublishAllowed    bool `json:"status_publish_allowed,omitempty"`
	MutationAllowed         bool `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed      bool `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed  bool `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed         bool `json:"learning_allowed,omitempty"`
	StablePromoted          bool `json:"stable_promoted,omitempty"`
	LearnedAsStable         bool `json:"learned_as_stable,omitempty"`
	RealLockAllowed         bool `json:"real_lock_allowed,omitempty"`
	RealLockAcquired        bool `json:"real_lock_acquired,omitempty"`
	RollbackAllowed         bool `json:"rollback_allowed,omitempty"`
	RollbackPerformed       bool `json:"rollback_performed,omitempty"`
	EvidenceTrustAllowed    bool `json:"evidence_trust_allowed,omitempty"`
	EvidenceTrusted         bool `json:"evidence_trusted,omitempty"`
	ResultTrustAllowed      bool `json:"result_trust_allowed,omitempty"`
	ResultTrusted           bool `json:"result_trusted,omitempty"`
	LedgerWriteAllowed      bool `json:"ledger_write_allowed,omitempty"`
	LedgerWritten           bool `json:"ledger_written,omitempty"`
	PassGold                bool `json:"pass_gold,omitempty"`
	PassSecure              bool `json:"pass_secure,omitempty"`
	PassGoldAllowed         bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed       bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGranted        bool `json:"authority_granted,omitempty"`
	AuthorityGrantAllowed   bool `json:"authority_grant_allowed,omitempty"`
}

type SandboxTraceClaims struct {
	MCPExecutionAllowed       bool `json:"mcp_execution_allowed"`
	RealExecutionAllowed      bool `json:"real_execution_allowed"`
	RealAdapterCallAllowed    bool `json:"real_adapter_call_allowed"`
	AdapterCallAllowed        bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed       bool `json:"executor_call_allowed"`
	NetworkCallAllowed        bool `json:"network_call_allowed"`
	CommandExecutionAllowed   bool `json:"command_execution_allowed"`
	FileWriteAllowed          bool `json:"file_write_allowed"`
	TracePersistenceAllowed   bool `json:"trace_persistence_allowed"`
	TracePersisted            bool `json:"trace_persisted"`
	LedgerWriteAllowed        bool `json:"ledger_write_allowed"`
	LedgerWritten             bool `json:"ledger_written"`
	DeployAllowed             bool `json:"deploy_allowed"`
	PromotionAllowed          bool `json:"promotion_allowed"`
	StatusPublishAllowed      bool `json:"status_publish_allowed"`
	MutationAllowed           bool `json:"mutation_allowed"`
	MemoryWriteAllowed        bool `json:"memory_write_allowed"`
	StablePromotionAllowed    bool `json:"stable_promotion_allowed"`
	LearningAllowed           bool `json:"learning_allowed"`
	StablePromoted            bool `json:"stable_promoted"`
	LearnedAsStable           bool `json:"learned_as_stable"`
	RealLockAllowed           bool `json:"real_lock_allowed"`
	RealLockAcquired          bool `json:"real_lock_acquired"`
	RollbackAllowed           bool `json:"rollback_allowed"`
	RollbackPerformed         bool `json:"rollback_performed"`
	EvidenceTrustAllowed      bool `json:"evidence_trust_allowed"`
	EvidenceTrusted           bool `json:"evidence_trusted"`
	ResultTrustAllowed        bool `json:"result_trust_allowed"`
	ResultTrusted             bool `json:"result_trusted"`
	PassGold                  bool `json:"pass_gold"`
	PassSecure                bool `json:"pass_secure"`
	PassGoldAllowed           bool `json:"pass_gold_allowed"`
	PassSecureAllowed         bool `json:"pass_secure_allowed"`
	AuthorityGranted          bool `json:"authority_granted"`
	AuthorityGrantAllowed     bool `json:"authority_grant_allowed"`
	HumanApprovalBypassed     bool `json:"human_approval_bypassed"`
	RevalidationBypassed      bool `json:"revalidation_bypassed"`
	RuntimeBypassed           bool `json:"runtime_bypassed"`
	SandboxAdapterBypassed    bool `json:"sandbox_adapter_bypassed"`
	EvidenceBindingBypassed   bool `json:"evidence_binding_bypassed"`
	VerificationBypassed      bool `json:"verification_bypassed"`
	TracePolicyBypassed       bool `json:"trace_policy_bypassed"`
	TraceIntegrityBypassed    bool `json:"trace_integrity_bypassed"`
	TraceCompletenessBypassed bool `json:"trace_completeness_bypassed"`
	TraceRedactionBypassed    bool `json:"trace_redaction_bypassed"`
	SandboxEscaped            bool `json:"sandbox_escaped"`
	KillSwitchBypassed        bool `json:"kill_switch_bypassed"`
	RollbackBypassed          bool `json:"rollback_bypassed"`
	ObservabilityBypassed     bool `json:"observability_bypassed"`
}

type SandboxExecutionTrace struct {
	Version                    string                 `json:"version"`
	DryRun                     bool                   `json:"dry_run"`
	ReadOnly                   bool                   `json:"read_only"`
	Sandbox                    bool                   `json:"sandbox"`
	TraceMode                  string                 `json:"trace_mode"`
	TraceStatus                string                 `json:"trace_status"`
	Valid                      bool                   `json:"valid"`
	Blocked                    bool                   `json:"blocked"`
	SandboxTraceReadyDryRun    bool                   `json:"sandbox_trace_ready_dry_run"`
	SandboxTraceCandidate      bool                   `json:"sandbox_trace_candidate"`
	SandboxAdapterTraceable    bool                   `json:"sandbox_adapter_traceable"`
	SimulatedResponseTraceable bool                   `json:"simulated_response_traceable"`
	DeniedPermissionsRecorded  bool                   `json:"denied_permissions_recorded"`
	BlockedActionsRecorded     bool                   `json:"blocked_actions_recorded"`
	AuditTrailReadyDryRun      bool                   `json:"audit_trail_ready_dry_run"`
	TraceCompleteDryRun        bool                   `json:"trace_complete_dry_run"`
	SandboxTraceID             string                 `json:"sandbox_trace_id,omitempty"`
	SandboxAdapterID           string                 `json:"sandbox_adapter_id,omitempty"`
	RuntimeSessionID           string                 `json:"runtime_session_id,omitempty"`
	CorrelationID              string                 `json:"correlation_id,omitempty"`
	IdempotencyKey             string                 `json:"idempotency_key,omitempty"`
	TraceHash                  string                 `json:"trace_hash,omitempty"`
	InputReceived              map[string]interface{} `json:"input_received,omitempty"`
	RuntimeSession             map[string]interface{} `json:"runtime_session,omitempty"`
	SimulatedAdapterResponse   map[string]interface{} `json:"simulated_adapter_response,omitempty"`
	LogicalTimestamps          []string               `json:"logical_timestamps,omitempty"`
	ChecksExecuted             []string               `json:"checks_executed,omitempty"`
	DeniedPermissions          []string               `json:"denied_permissions,omitempty"`
	BlockedActions             []string               `json:"blocked_actions,omitempty"`
	AuditTrail                 []string               `json:"audit_trail,omitempty"`
	SafetyDecisions            []string               `json:"safety_decisions,omitempty"`
	SandboxPolicyResult        string                 `json:"sandbox_policy_result,omitempty"`
	NoopResult                 string                 `json:"noop_result,omitempty"`
	TraceCompleteness          string                 `json:"trace_completeness,omitempty"`
	MissingItems               []string               `json:"missing_items"`
	UnsafeClaims               []string               `json:"unsafe_claims"`
	Conflicts                  []string               `json:"conflicts"`
	BlockingReasons            []string               `json:"blocking_reasons"`
	RequiredItems              []string               `json:"required_items"`
	RequiredRealGates          []string               `json:"required_real_gates"`
	Recommendations            []string               `json:"recommendations"`
	MCPExecutionAllowed        bool                   `json:"mcp_execution_allowed"`
	RealExecutionAllowed       bool                   `json:"real_execution_allowed"`
	RealAdapterCallAllowed     bool                   `json:"real_adapter_call_allowed"`
	AdapterCallAllowed         bool                   `json:"adapter_call_allowed"`
	ExecutorCallAllowed        bool                   `json:"executor_call_allowed"`
	NetworkCallAllowed         bool                   `json:"network_call_allowed"`
	CommandExecutionAllowed    bool                   `json:"command_execution_allowed"`
	FileWriteAllowed           bool                   `json:"file_write_allowed"`
	TracePersistenceAllowed    bool                   `json:"trace_persistence_allowed"`
	DeployAllowed              bool                   `json:"deploy_allowed"`
	PromotionAllowed           bool                   `json:"promotion_allowed"`
	StatusPublishAllowed       bool                   `json:"status_publish_allowed"`
	MutationAllowed            bool                   `json:"mutation_allowed"`
	MemoryWriteAllowed         bool                   `json:"memory_write_allowed"`
	StablePromotionAllowed     bool                   `json:"stable_promotion_allowed"`
	LearningAllowed            bool                   `json:"learning_allowed"`
	RealLockAllowed            bool                   `json:"real_lock_allowed"`
	RollbackAllowed            bool                   `json:"rollback_allowed"`
	EvidenceTrustAllowed       bool                   `json:"evidence_trust_allowed"`
	ResultTrustAllowed         bool                   `json:"result_trust_allowed"`
	LedgerWriteAllowed         bool                   `json:"ledger_write_allowed"`
	PassGoldAllowed            bool                   `json:"pass_gold_allowed"`
	PassSecureAllowed          bool                   `json:"pass_secure_allowed"`
	AuthorityGrantAllowed      bool                   `json:"authority_grant_allowed"`
}

type SandboxExecutionTraceValidation = SandboxExecutionTrace

type SandboxTraceBoundary struct {
	Version                 string   `json:"version"`
	DryRun                  bool     `json:"dry_run"`
	ReadOnly                bool     `json:"read_only"`
	Sandbox                 bool     `json:"sandbox"`
	TraceMode               string   `json:"trace_mode"`
	RealExecutionAllowed    bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed     bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed  bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed      bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed     bool     `json:"executor_call_allowed"`
	NetworkCallAllowed      bool     `json:"network_call_allowed"`
	CommandExecutionAllowed bool     `json:"command_execution_allowed"`
	FileWriteAllowed        bool     `json:"file_write_allowed"`
	TracePersistenceAllowed bool     `json:"trace_persistence_allowed"`
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

type TraceDeniedFlags struct {
	MCPExecutionAllowed     bool `json:"mcp_execution_allowed"`
	RealExecutionAllowed    bool `json:"real_execution_allowed"`
	RealAdapterCallAllowed  bool `json:"real_adapter_call_allowed"`
	AdapterCallAllowed      bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed     bool `json:"executor_call_allowed"`
	NetworkCallAllowed      bool `json:"network_call_allowed"`
	CommandExecutionAllowed bool `json:"command_execution_allowed"`
	FileWriteAllowed        bool `json:"file_write_allowed"`
	TracePersistenceAllowed bool `json:"trace_persistence_allowed"`
	DeployAllowed           bool `json:"deploy_allowed"`
	PromotionAllowed        bool `json:"promotion_allowed"`
	StatusPublishAllowed    bool `json:"status_publish_allowed"`
	MutationAllowed         bool `json:"mutation_allowed"`
	MemoryWriteAllowed      bool `json:"memory_write_allowed"`
	StablePromotionAllowed  bool `json:"stable_promotion_allowed"`
	LearningAllowed         bool `json:"learning_allowed"`
	RealLockAllowed         bool `json:"real_lock_allowed"`
	RollbackAllowed         bool `json:"rollback_allowed"`
	EvidenceTrustAllowed    bool `json:"evidence_trust_allowed"`
	ResultTrustAllowed      bool `json:"result_trust_allowed"`
	LedgerWriteAllowed      bool `json:"ledger_write_allowed"`
	PassGoldAllowed         bool `json:"pass_gold_allowed"`
	PassSecureAllowed       bool `json:"pass_secure_allowed"`
	AuthorityGrantAllowed   bool `json:"authority_grant_allowed"`
}

type SandboxTraceAudit struct {
	Version                             string   `json:"version"`
	DryRun                              bool     `json:"dry_run"`
	ReadOnly                            bool     `json:"read_only"`
	Sandbox                             bool     `json:"sandbox"`
	TraceMode                           string   `json:"trace_mode"`
	RealExecutionAllowed                bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed                 bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed              bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed                  bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed                 bool     `json:"executor_call_allowed"`
	NetworkCallAllowed                  bool     `json:"network_call_allowed"`
	CommandExecutionAllowed             bool     `json:"command_execution_allowed"`
	FileWriteAllowed                    bool     `json:"file_write_allowed"`
	TracePersistenceAllowed             bool     `json:"trace_persistence_allowed"`
	DeployAllowed                       bool     `json:"deploy_allowed"`
	PromotionAllowed                    bool     `json:"promotion_allowed"`
	StatusPublishAllowed                bool     `json:"status_publish_allowed"`
	MutationAllowed                     bool     `json:"mutation_allowed"`
	MemoryWriteAllowed                  bool     `json:"memory_write_allowed"`
	StablePromotionAllowed              bool     `json:"stable_promotion_allowed"`
	LearningAllowed                     bool     `json:"learning_allowed"`
	RealLockAllowed                     bool     `json:"real_lock_allowed"`
	RollbackAllowed                     bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed                bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed                  bool     `json:"result_trust_allowed"`
	LedgerWriteAllowed                  bool     `json:"ledger_write_allowed"`
	PassGoldAllowed                     bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                   bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed               bool     `json:"authority_grant_allowed"`
	UnsafeClaimsFound                   bool     `json:"unsafe_claims_found"`
	UnsafeClaims                        []string `json:"unsafe_claims"`
	MissingItemsFound                   bool     `json:"missing_items_found"`
	MissingItems                        []string `json:"missing_items"`
	RealExecutionAttemptFound           bool     `json:"real_execution_attempt_found"`
	RealAdapterCallAttemptFound         bool     `json:"real_adapter_call_attempt_found"`
	AdapterCallAttemptFound             bool     `json:"adapter_call_attempt_found"`
	ExecutorCallAttemptFound            bool     `json:"executor_call_attempt_found"`
	NetworkAttemptFound                 bool     `json:"network_attempt_found"`
	CommandAttemptFound                 bool     `json:"command_attempt_found"`
	FileWriteAttemptFound               bool     `json:"file_write_attempt_found"`
	TracePersistenceAttemptFound        bool     `json:"trace_persistence_attempt_found"`
	LedgerWriteAttemptFound             bool     `json:"ledger_write_attempt_found"`
	DeployAttemptFound                  bool     `json:"deploy_attempt_found"`
	PromotionAttemptFound               bool     `json:"promotion_attempt_found"`
	StatusPublishAttemptFound           bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound             bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound          bool     `json:"stable_learning_attempt_found"`
	EvidenceTrustAttemptFound           bool     `json:"evidence_trust_attempt_found"`
	ResultTrustAttemptFound             bool     `json:"result_trust_attempt_found"`
	RealLockAttemptFound                bool     `json:"real_lock_attempt_found"`
	RollbackAttemptFound                bool     `json:"rollback_attempt_found"`
	AutoGoldAttemptFound                bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound          bool     `json:"authority_grant_attempt_found"`
	HumanApprovalBypassAttemptFound     bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound      bool     `json:"revalidation_bypass_attempt_found"`
	RuntimeBypassAttemptFound           bool     `json:"runtime_bypass_attempt_found"`
	SandboxAdapterBypassAttemptFound    bool     `json:"sandbox_adapter_bypass_attempt_found"`
	EvidenceBindingBypassAttemptFound   bool     `json:"evidence_binding_bypass_attempt_found"`
	VerificationBypassAttemptFound      bool     `json:"verification_bypass_attempt_found"`
	TracePolicyBypassAttemptFound       bool     `json:"trace_policy_bypass_attempt_found"`
	TraceIntegrityBypassAttemptFound    bool     `json:"trace_integrity_bypass_attempt_found"`
	TraceCompletenessBypassAttemptFound bool     `json:"trace_completeness_bypass_attempt_found"`
	TraceRedactionBypassAttemptFound    bool     `json:"trace_redaction_bypass_attempt_found"`
	SandboxEscapeAttemptFound           bool     `json:"sandbox_escape_attempt_found"`
	KillSwitchBypassAttemptFound        bool     `json:"kill_switch_bypass_attempt_found"`
	RollbackBypassAttemptFound          bool     `json:"rollback_bypass_attempt_found"`
	ObservabilityBypassAttemptFound     bool     `json:"observability_bypass_attempt_found"`
	Recommendations                     []string `json:"recommendations"`
}

type SandboxTraceExplain struct {
	Version                                                    string   `json:"version"`
	DryRun                                                     bool     `json:"dry_run"`
	ReadOnly                                                   bool     `json:"read_only"`
	Sandbox                                                    bool     `json:"sandbox"`
	TraceMode                                                  string   `json:"trace_mode"`
	RealExecutionAllowed                                       bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed                                        bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed                                     bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed                                         bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed                                        bool     `json:"executor_call_allowed"`
	NetworkCallAllowed                                         bool     `json:"network_call_allowed"`
	CommandExecutionAllowed                                    bool     `json:"command_execution_allowed"`
	FileWriteAllowed                                           bool     `json:"file_write_allowed"`
	TracePersistenceAllowed                                    bool     `json:"trace_persistence_allowed"`
	DeployAllowed                                              bool     `json:"deploy_allowed"`
	PromotionAllowed                                           bool     `json:"promotion_allowed"`
	StatusPublishAllowed                                       bool     `json:"status_publish_allowed"`
	MutationAllowed                                            bool     `json:"mutation_allowed"`
	MemoryWriteAllowed                                         bool     `json:"memory_write_allowed"`
	StablePromotionAllowed                                     bool     `json:"stable_promotion_allowed"`
	LearningAllowed                                            bool     `json:"learning_allowed"`
	RealLockAllowed                                            bool     `json:"real_lock_allowed"`
	RollbackAllowed                                            bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed                                       bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed                                         bool     `json:"result_trust_allowed"`
	LedgerWriteAllowed                                         bool     `json:"ledger_write_allowed"`
	PassGoldAllowed                                            bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                                          bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed                                      bool     `json:"authority_grant_allowed"`
	WhySandboxTraceIsNotRealExecution                          []string `json:"why_sandbox_trace_is_not_real_execution"`
	WhyTraceIsNotPersistence                                   []string `json:"why_trace_is_not_persistence"`
	WhyTracePersistenceIsBlocked                               []string `json:"why_trace_persistence_is_blocked"`
	WhyLedgerWriteIsBlocked                                    []string `json:"why_ledger_write_is_blocked"`
	WhySandboxAdapterIsRequired                                []string `json:"why_sandbox_adapter_is_required"`
	WhyControlledRuntimeIsRequired                             []string `json:"why_controlled_runtime_is_required"`
	WhyEvidenceBindingIsRequired                               []string `json:"why_evidence_binding_is_required"`
	WhyResultVerificationIsRequired                            []string `json:"why_result_verification_is_required"`
	WhyFinalAuthorizationIsRequired                            []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                                    []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired                 []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyDeniedPermissionsAndBlockedActionsAreRecorded           []string `json:"why_denied_permissions_and_blocked_actions_are_recorded"`
	WhyTracePolicyIntegrityRedactionAndCompletenessAreRequired []string `json:"why_trace_policy_integrity_redaction_and_completeness_are_required"`
	WhyRealExecutionRequiresFutureExplicitRelease              []string `json:"why_real_execution_requires_future_explicit_release"`
	RequiredGates                                              []string `json:"required_gates"`
	AlwaysDenied                                               []string `json:"always_denied"`
}

func BuildSandboxExecutionTrace(input SandboxExecutionTraceInput) SandboxExecutionTrace {
	return validate(input)
}
func ValidateSandboxExecutionTrace(input SandboxExecutionTraceInput) SandboxExecutionTraceValidation {
	return validate(input)
}

func validate(input SandboxExecutionTraceInput) SandboxExecutionTrace {
	input = normalize(input)
	missing, conflicts, unsafe := []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s) }
	for name, val := range map[string]string{"sandbox_trace_id": input.SandboxTraceID, "sandbox_adapter_id": input.SandboxAdapterID, "runtime_id": input.RuntimeID, "runtime_session_id": input.RuntimeSessionID, "evidence_binding_id": input.EvidenceBindingID, "verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment} {
		if strings.TrimSpace(val) == "" {
			addMissing(name)
		}
	}
	if input.Executor == "mcp" || input.Executor == "mcp_readonly" {
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
	if input.SandboxAdapter == nil {
		addMissing("V11.1_sandbox_adapter")
		addConflict(StatusSandboxAdapterMissing)
	} else {
		sa := sandboxadapter.ValidateSandboxAdapter(*input.SandboxAdapter)
		if !sa.Valid || sa.Blocked || !sa.SandboxAdapterReadyDryRun || !sa.SimulatedAdapterResponseReady {
			addConflict(StatusSandboxAdapterBlocked)
			bubbleSandboxAdapter(sa.BlockingReasons, addConflict)
			bubbleSandboxAdapter(sa.Conflicts, addConflict)
		}
	}
	if !input.SandboxAdapterReadyDryRun {
		addConflict("sandbox_adapter_ready_dry_run_false")
		addConflict(StatusSandboxAdapterBlocked)
	}
	if !input.SimulatedAdapterResponseReady {
		addConflict("simulated_adapter_response_ready_false")
		addConflict(StatusSandboxAdapterBlocked)
	}
	if !input.RuntimeReadyDryRun {
		addConflict("runtime_ready_dry_run_false")
		addConflict(StatusControlledRuntimeBlocked)
	}
	if !input.ControlledRuntimeReady {
		addConflict("controlled_runtime_ready_false")
		addConflict(StatusControlledRuntimeBlocked)
	}
	validatePresence("trace_policy", input.TracePolicy, addMissing, addConflict, StatusTracePolicyMissing)
	validatePresence("trace_scope", input.TraceScope, addMissing, addConflict, StatusTraceScopeMissing)
	validatePresence("trace_input_snapshot", input.TraceInputSnapshot, addMissing, addConflict, StatusTraceInputSnapshotMissing)
	validatePresence("trace_output_snapshot", input.TraceOutputSnapshot, addMissing, addConflict, StatusTraceOutputSnapshotMissing)
	validatePresence("trace_event_list", input.TraceEventList, addMissing, addConflict, StatusTraceEventListMissing)
	validatePresence("trace_timestamp_model", input.TraceTimestampModel, addMissing, addConflict, StatusTraceTimestampModelMissing)
	if strings.TrimSpace(input.TraceCorrelationID) == "" {
		addMissing("trace_correlation_id")
		addConflict(StatusTraceCorrelationIDMissing)
	}
	if strings.TrimSpace(input.TraceIdempotencyKey) == "" {
		addMissing("trace_idempotency_key")
		addConflict(StatusTraceIdempotencyMissing)
	}
	validatePresence("trace_denied_permissions", input.TraceDeniedPermissions, addMissing, addConflict, StatusDeniedPermissionsMissing)
	validatePresence("trace_blocked_actions", input.TraceBlockedActions, addMissing, addConflict, StatusBlockedActionsMissing)
	validatePresence("trace_safety_decisions", input.TraceSafetyDecisions, addMissing, addConflict, StatusSafetyDecisionsMissing)
	validatePresence("trace_check_results", input.TraceCheckResults, addMissing, addConflict, StatusCheckResultsMissing)
	validatePresence("trace_audit_envelope", input.TraceAuditEnvelope, addMissing, addConflict, StatusAuditEnvelopeMissing)
	validatePresence("trace_observability_envelope", input.TraceObservabilityEnvelope, addMissing, addConflict, StatusObservabilityEnvelopeMissing)
	validatePresence("trace_integrity_checks", input.TraceIntegrityChecks, addMissing, addConflict, StatusIntegrityCheckFailed)
	validatePresence("trace_completeness_checks", input.TraceCompletenessChecks, addMissing, addConflict, StatusCompletenessCheckFailed)
	validatePresence("trace_retention_policy", input.TraceRetentionPolicy, addMissing, addConflict, StatusRetentionPolicyMissing)
	validatePresence("trace_privacy_policy", input.TracePrivacyPolicy, addMissing, addConflict, StatusPrivacyPolicyMissing)
	validatePresence("trace_redaction_policy", input.TraceRedactionPolicy, addMissing, addConflict, StatusRedactionPolicyMissing)
	validatePresence("trace_tamper_evidence_model", input.TraceTamperEvidenceModel, addMissing, addConflict, StatusTamperEvidenceMissing)
	for _, c := range unsafeClaims(input.Claims) {
		addUnsafe(c)
		mapUnsafeStatus(c, addConflict)
	}
	blocked := len(missing) > 0 || len(conflicts) > 0 || len(unsafe) > 0
	status := StatusSandboxTraceReadyDryRun
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
	hash := input.TraceHash
	if hash == "" && input.SandboxTraceID != "" {
		sum := sha256.Sum256([]byte(input.SandboxTraceID + ":" + input.TraceCorrelationID + ":" + input.TraceIdempotencyKey))
		hash = hex.EncodeToString(sum[:])
	}
	return SandboxExecutionTrace{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, TraceStatus: status, Valid: !blocked, Blocked: blocked, SandboxTraceReadyDryRun: !blocked, SandboxTraceCandidate: !blocked, SandboxAdapterTraceable: !blocked, SimulatedResponseTraceable: !blocked, DeniedPermissionsRecorded: !blocked, BlockedActionsRecorded: !blocked, AuditTrailReadyDryRun: !blocked, TraceCompleteDryRun: !blocked, SandboxTraceID: input.SandboxTraceID, SandboxAdapterID: input.SandboxAdapterID, RuntimeSessionID: input.RuntimeSessionID, CorrelationID: input.TraceCorrelationID, IdempotencyKey: input.TraceIdempotencyKey, TraceHash: hash, InputReceived: input.InputReceived, RuntimeSession: input.RuntimeSession, SimulatedAdapterResponse: input.SimulatedAdapterResponse, LogicalTimestamps: input.LogicalTimestamps, ChecksExecuted: input.ChecksExecuted, DeniedPermissions: defaultStrings(input.DeniedPermissions, denied), BlockedActions: defaultStrings(input.BlockedActions, BuildSandboxTraceBoundary().MCPCannot), AuditTrail: input.AuditTrail, SafetyDecisions: input.SafetyDecisions, SandboxPolicyResult: input.SandboxPolicyResult, NoopResult: input.NoopResult, TraceCompleteness: input.TraceCompleteness, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocked)}
}

func BuildSandboxTraceBoundary() SandboxTraceBoundary {
	return SandboxTraceBoundary{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, RealExecutionAllowed: false, MCPCan: []string{"read", "validate", "audit", "explain", "build sandbox execution trace", "simulate sandbox trace", "record denied permissions in response payload", "record blocked actions in response payload", "build noop trace response"}, MCPCannot: []string{"execute", "execute_runtime", "call_real_adapter", "call_executor", "network_call", "command_execution", "file_write", "persist_trace", "write_ledger", "deploy", "promote", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "trust_evidence", "trust_result", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}, AlwaysDenied: clone(denied)}
}

func AuditSandboxExecutionTrace(input SandboxExecutionTraceInput) SandboxTraceAudit {
	v := validate(input)
	c := normalize(input).Claims
	a := SandboxTraceAudit{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	if c == nil {
		return a
	}
	a.RealExecutionAttemptFound = c.RealExecutionAllowed || c.MCPExecutionAllowed
	a.RealAdapterCallAttemptFound = c.RealAdapterCallAllowed
	a.AdapterCallAttemptFound = c.AdapterCallAllowed || c.RealAdapterCallAllowed
	a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
	a.NetworkAttemptFound = c.NetworkCallAllowed
	a.CommandAttemptFound = c.CommandExecutionAllowed
	a.FileWriteAttemptFound = c.FileWriteAllowed
	a.TracePersistenceAttemptFound = c.TracePersistenceAllowed || c.TracePersisted
	a.LedgerWriteAttemptFound = c.LedgerWriteAllowed || c.LedgerWritten
	a.DeployAttemptFound = c.DeployAllowed
	a.PromotionAttemptFound = c.PromotionAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
	a.MemoryWriteAttemptFound = c.MemoryWriteAllowed
	a.StableLearningAttemptFound = c.LearningAllowed || c.LearnedAsStable || c.StablePromoted
	a.EvidenceTrustAttemptFound = c.EvidenceTrustAllowed || c.EvidenceTrusted
	a.ResultTrustAttemptFound = c.ResultTrustAllowed || c.ResultTrusted
	a.RealLockAttemptFound = c.RealLockAllowed || c.RealLockAcquired
	a.RollbackAttemptFound = c.RollbackAllowed || c.RollbackPerformed
	a.AutoGoldAttemptFound = c.PassGold || c.PassSecure || c.PassGoldAllowed || c.PassSecureAllowed
	a.AuthorityGrantAttemptFound = c.AuthorityGranted || c.AuthorityGrantAllowed
	a.HumanApprovalBypassAttemptFound = c.ClaimsBool("human_approval_bypassed")
	a.RevalidationBypassAttemptFound = c.ClaimsBool("revalidation_bypassed")
	a.RuntimeBypassAttemptFound = c.ClaimsBool("runtime_bypassed")
	a.SandboxAdapterBypassAttemptFound = c.ClaimsBool("sandbox_adapter_bypassed")
	a.EvidenceBindingBypassAttemptFound = c.ClaimsBool("evidence_binding_bypassed")
	a.VerificationBypassAttemptFound = c.ClaimsBool("verification_bypassed")
	a.TracePolicyBypassAttemptFound = c.ClaimsBool("trace_policy_bypassed")
	a.TraceIntegrityBypassAttemptFound = c.ClaimsBool("trace_integrity_bypassed")
	a.TraceCompletenessBypassAttemptFound = c.ClaimsBool("trace_completeness_bypassed")
	a.TraceRedactionBypassAttemptFound = c.ClaimsBool("trace_redaction_bypassed")
	a.SandboxEscapeAttemptFound = c.ClaimsBool("sandbox_escaped")
	a.KillSwitchBypassAttemptFound = c.ClaimsBool("kill_switch_bypassed")
	a.RollbackBypassAttemptFound = c.ClaimsBool("rollback_bypassed")
	a.ObservabilityBypassAttemptFound = c.ClaimsBool("observability_bypassed")
	return a
}

func ExplainSandboxExecutionTrace(input SandboxExecutionTraceInput) SandboxTraceExplain {
	return SandboxTraceExplain{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, WhySandboxTraceIsNotRealExecution: []string{"V11.2 records a logical sandbox/noop trace only and performs no side effects."}, WhyTraceIsNotPersistence: []string{"The trace is returned in memory/MCP payload and is not written to files, databases, ledgers, or memory."}, WhyTracePersistenceIsBlocked: []string{"Persistence is explicitly denied for this release to avoid creating authoritative execution evidence."}, WhyLedgerWriteIsBlocked: []string{"Ledger writes would imply durable trust and remain outside the read-only MCP boundary."}, WhySandboxAdapterIsRequired: []string{"A valid V11.1 sandbox/noop adapter proves the simulated adapter response is traceable without calling a real adapter."}, WhyControlledRuntimeIsRequired: []string{"A valid V11.0 controlled runtime anchors the sandbox session and external-only executor boundary."}, WhyEvidenceBindingIsRequired: []string{"Evidence binding associates the trace with upstream context without trusting the simulated result."}, WhyResultVerificationIsRequired: []string{"Result verification prevents accepting noop output as real execution proof."}, WhyFinalAuthorizationIsRequired: []string{"Final authorization confirms upstream gates before the trace rehearsal is considered complete."}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE are prerequisites but V11.2 never marks them."}, WhyHumanApprovalAndRevalidationAreRequired: []string{"Real human approval and independent revalidation prevent placeholder approval or bypass."}, WhyDeniedPermissionsAndBlockedActionsAreRecorded: []string{"Denied permissions and blocked actions document the safety boundary inside the response payload only."}, WhyTracePolicyIntegrityRedactionAndCompletenessAreRequired: []string{"Policy, integrity, redaction, and completeness checks keep the consultative trace auditable without persistence."}, WhyRealExecutionRequiresFutureExplicitRelease: []string{"Real execution requires a future explicit release; V11.2 always denies execution, adapter calls, writes, deploy, promotion, locks, rollback, trust, and authority."}, RequiredGates: clone(requiredGates), AlwaysDenied: clone(denied)}
}

func (c *SandboxTraceClaims) ClaimsBool(name string) bool {
	if c == nil {
		return false
	}
	switch name {
	case "human_approval_bypassed":
		return c.HumanApprovalBypassed
	case "revalidation_bypassed":
		return c.RevalidationBypassed
	case "runtime_bypassed":
		return c.RuntimeBypassed
	case "sandbox_adapter_bypassed":
		return c.SandboxAdapterBypassed
	case "evidence_binding_bypassed":
		return c.EvidenceBindingBypassed
	case "verification_bypassed":
		return c.VerificationBypassed
	case "trace_policy_bypassed":
		return c.TracePolicyBypassed
	case "trace_integrity_bypassed":
		return c.TraceIntegrityBypassed
	case "trace_completeness_bypassed":
		return c.TraceCompletenessBypassed
	case "trace_redaction_bypassed":
		return c.TraceRedactionBypassed
	case "sandbox_escaped":
		return c.SandboxEscaped
	case "kill_switch_bypassed":
		return c.KillSwitchBypassed
	case "rollback_bypassed":
		return c.RollbackBypassed
	case "observability_bypassed":
		return c.ObservabilityBypassed
	}
	return false
}

func normalize(input SandboxExecutionTraceInput) SandboxExecutionTraceInput {
	if input.Claims == nil {
		input.Claims = &SandboxTraceClaims{}
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
	c.TracePersistenceAllowed = c.TracePersistenceAllowed || input.TracePersistenceAllowed
	c.TracePersisted = c.TracePersisted || input.TracePersisted
	c.DeployAllowed = c.DeployAllowed || input.DeployAllowed
	c.PromotionAllowed = c.PromotionAllowed || input.PromotionAllowed
	c.StatusPublishAllowed = c.StatusPublishAllowed || input.StatusPublishAllowed
	c.MutationAllowed = c.MutationAllowed || input.MutationAllowed
	c.MemoryWriteAllowed = c.MemoryWriteAllowed || input.MemoryWriteAllowed
	c.StablePromotionAllowed = c.StablePromotionAllowed || input.StablePromotionAllowed
	c.LearningAllowed = c.LearningAllowed || input.LearningAllowed
	c.StablePromoted = c.StablePromoted || input.StablePromoted
	c.LearnedAsStable = c.LearnedAsStable || input.LearnedAsStable
	c.RealLockAllowed = c.RealLockAllowed || input.RealLockAllowed
	c.RealLockAcquired = c.RealLockAcquired || input.RealLockAcquired
	c.RollbackAllowed = c.RollbackAllowed || input.RollbackAllowed
	c.RollbackPerformed = c.RollbackPerformed || input.RollbackPerformed
	c.EvidenceTrustAllowed = c.EvidenceTrustAllowed || input.EvidenceTrustAllowed
	c.EvidenceTrusted = c.EvidenceTrusted || input.EvidenceTrusted
	c.ResultTrustAllowed = c.ResultTrustAllowed || input.ResultTrustAllowed
	c.ResultTrusted = c.ResultTrusted || input.ResultTrusted
	c.LedgerWriteAllowed = c.LedgerWriteAllowed || input.LedgerWriteAllowed
	c.LedgerWritten = c.LedgerWritten || input.LedgerWritten
	c.PassGold = c.PassGold || input.PassGold
	c.PassSecure = c.PassSecure || input.PassSecure
	c.PassGoldAllowed = c.PassGoldAllowed || input.PassGoldAllowed
	c.PassSecureAllowed = c.PassSecureAllowed || input.PassSecureAllowed
	c.AuthorityGranted = c.AuthorityGranted || input.AuthorityGranted
	c.AuthorityGrantAllowed = c.AuthorityGrantAllowed || input.AuthorityGrantAllowed
	return input
}

func unsafeClaims(c *SandboxTraceClaims) []string {
	if c == nil {
		return nil
	}
	x := *c
	out := []string{}
	add := func(s string, b bool) {
		if b {
			out = appendUnique(out, s)
		}
	}
	add("mcp_execution_allowed", x.MCPExecutionAllowed)
	add("real_execution_allowed", x.RealExecutionAllowed)
	add("real_adapter_call_allowed", x.RealAdapterCallAllowed)
	add("adapter_call_allowed", x.AdapterCallAllowed)
	add("executor_call_allowed", x.ExecutorCallAllowed)
	add("network_call_allowed", x.NetworkCallAllowed)
	add("command_execution_allowed", x.CommandExecutionAllowed)
	add("file_write_allowed", x.FileWriteAllowed)
	add("trace_persistence_allowed", x.TracePersistenceAllowed)
	add("trace_persisted", x.TracePersisted)
	add("ledger_write_allowed", x.LedgerWriteAllowed)
	add("ledger_written", x.LedgerWritten)
	add("deploy_allowed", x.DeployAllowed)
	add("promotion_allowed", x.PromotionAllowed)
	add("status_publish_allowed", x.StatusPublishAllowed)
	add("mutation_allowed", x.MutationAllowed)
	add("memory_write_allowed", x.MemoryWriteAllowed)
	add("stable_promotion_allowed", x.StablePromotionAllowed)
	add("learning_allowed", x.LearningAllowed)
	add("stable_promoted", x.StablePromoted)
	add("learned_as_stable", x.LearnedAsStable)
	add("real_lock_allowed", x.RealLockAllowed)
	add("real_lock_acquired", x.RealLockAcquired)
	add("rollback_allowed", x.RollbackAllowed)
	add("rollback_performed", x.RollbackPerformed)
	add("evidence_trust_allowed", x.EvidenceTrustAllowed)
	add("evidence_trusted", x.EvidenceTrusted)
	add("result_trust_allowed", x.ResultTrustAllowed)
	add("result_trusted", x.ResultTrusted)
	add("pass_gold", x.PassGold)
	add("pass_secure", x.PassSecure)
	add("pass_gold_allowed", x.PassGoldAllowed)
	add("pass_secure_allowed", x.PassSecureAllowed)
	add("authority_granted", x.AuthorityGranted)
	add("authority_grant_allowed", x.AuthorityGrantAllowed)
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
	case "trace_persistence_allowed", "trace_persisted":
		add(StatusUnsafeTracePersistenceAttempt)
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
	case "evidence_trust_allowed", "evidence_trusted", "result_trust_allowed", "result_trusted", "pass_gold", "pass_secure", "pass_gold_allowed", "pass_secure_allowed", "authority_granted", "authority_grant_allowed":
		add(StatusUnsafeTrustEscalationAttempt)
	case "real_lock_allowed", "real_lock_acquired":
		add("unsafe_real_lock_attempt")
	case "rollback_allowed", "rollback_performed":
		add("unsafe_rollback_attempt")
	}
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
func bubbleSandboxAdapter(xs []string, add func(string)) {
	for _, c := range xs {
		switch c {
		case sandboxadapter.StatusControlledRuntimeMissing:
			add(StatusControlledRuntimeMissing)
		case sandboxadapter.StatusControlledRuntimeBlocked:
			add(StatusControlledRuntimeBlocked)
		case sandboxadapter.StatusEvidenceBindingMissing:
			add(StatusEvidenceBindingMissing)
		case sandboxadapter.StatusEvidenceBindingBlocked:
			add(StatusEvidenceBindingBlocked)
		case sandboxadapter.StatusResultVerificationMissing:
			add(StatusResultVerificationMissing)
		case sandboxadapter.StatusResultVerificationBlocked:
			add(StatusResultVerificationBlocked)
		case sandboxadapter.StatusResponseContractMissing:
			add(StatusResponseContractMissing)
		case sandboxadapter.StatusResponseContractBlocked:
			add(StatusResponseContractBlocked)
		case sandboxadapter.StatusRequestEnvelopeMissing:
			add(StatusRequestEnvelopeMissing)
		case sandboxadapter.StatusRequestEnvelopeBlocked:
			add(StatusRequestEnvelopeBlocked)
		case sandboxadapter.StatusAdapterInterfaceMissing:
			add(StatusAdapterInterfaceMissing)
		case sandboxadapter.StatusAdapterInterfaceBlocked:
			add(StatusAdapterInterfaceBlocked)
		case sandboxadapter.StatusFinalAuthorizationMissing:
			add(StatusFinalAuthorizationMissing)
		case sandboxadapter.StatusFinalAuthorizationBlocked:
			add(StatusFinalAuthorizationBlocked)
		case sandboxadapter.StatusSimulationMissing:
			add(StatusSimulationMissing)
		case sandboxadapter.StatusSimulationBlocked:
			add(StatusSimulationBlocked)
		case sandboxadapter.StatusFirewallMissing:
			add(StatusFirewallMissing)
		case sandboxadapter.StatusFirewallBlocked:
			add(StatusFirewallBlocked)
		case sandboxadapter.StatusSovereignCandidateMissing:
			add(StatusSovereignCandidateMissing)
		case sandboxadapter.StatusMissingRealGates:
			add(StatusMissingRealGates)
		case sandboxadapter.StatusHumanApprovalRequired:
			add(StatusHumanApprovalRequired)
		case sandboxadapter.StatusRevalidationRequired:
			add(StatusRevalidationRequired)
		}
	}
}
func recommendations(blocked bool) []string {
	if blocked {
		return []string{"keep trace sandbox/noop only", "do not persist or execute", "complete V11.1 adapter and trace prerequisites"}
	}
	return []string{"sandbox execution trace is ready for dry-run inspection only", "do not treat the trace as trusted evidence or persisted record"}
}
func defaultStrings(xs, d []string) []string {
	if len(xs) > 0 {
		return clone(xs)
	}
	return clone(d)
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
