// Package sandboxtracepersistence implements V11.3 Sandbox Trace Persistence Gate.
//
// V11.3 is a read-only/dry-run persistence eligibility gate for V11.2 sandbox
// execution traces. It can declare that a trace is a candidate for future
// isolated/auditable persistence, but it never persists automatically and never
// grants execution, adapter, network, command, file, database, ledger, deploy,
// promotion, memory, trust, lock, rollback, PASS, or authority permissions.
package sandboxtracepersistence

import (
	"strings"

	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/sandboxtrace"
)

const Version = "V11.3"
const TraceMode = "sandbox_noop_trace"
const PersistenceMode = "controlled_sandbox_trace_persistence_gate"

const (
	StatusSandboxTracePersistenceReadyDryRun = "sandbox_trace_persistence_ready_dry_run"
	StatusIncomplete                         = "incomplete"
	StatusBlocked                            = "blocked"
	StatusSandboxTraceMissing                = "sandbox_trace_missing"
	StatusSandboxTraceBlocked                = "sandbox_trace_blocked"
	StatusSandboxAdapterMissing              = "sandbox_adapter_missing"
	StatusSandboxAdapterBlocked              = "sandbox_adapter_blocked"
	StatusControlledRuntimeMissing           = "controlled_runtime_missing"
	StatusControlledRuntimeBlocked           = "controlled_runtime_blocked"
	StatusEvidenceBindingMissing             = "evidence_binding_missing"
	StatusEvidenceBindingBlocked             = "evidence_binding_blocked"
	StatusResultVerificationMissing          = "result_verification_missing"
	StatusResultVerificationBlocked          = "result_verification_blocked"
	StatusResponseContractMissing            = "response_contract_missing"
	StatusResponseContractBlocked            = "response_contract_blocked"
	StatusRequestEnvelopeMissing             = "request_envelope_missing"
	StatusRequestEnvelopeBlocked             = "request_envelope_blocked"
	StatusAdapterInterfaceMissing            = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked            = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing          = "final_authorization_missing"
	StatusFinalAuthorizationBlocked          = "final_authorization_blocked"
	StatusSimulationMissing                  = "simulation_missing"
	StatusSimulationBlocked                  = "simulation_blocked"
	StatusFirewallMissing                    = "firewall_missing"
	StatusFirewallBlocked                    = "firewall_blocked"
	StatusSovereignCandidateMissing          = "sovereign_candidate_missing"
	StatusMissingRealGates                   = "missing_real_gates"
	StatusHumanApprovalRequired              = "human_approval_required"
	StatusRevalidationRequired               = "revalidation_required"
	StatusPersistencePolicyMissing           = "persistence_policy_missing"
	StatusPersistenceScopeMissing            = "persistence_scope_missing"
	StatusIsolatedStorageMissing             = "isolated_storage_missing"
	StatusAllowedStorageRootMissing          = "allowed_storage_root_missing"
	StatusPathSafetyPolicyMissing            = "path_safety_policy_missing"
	StatusFilenamePolicyMissing              = "filename_policy_missing"
	StatusSerializationPolicyMissing         = "serialization_policy_missing"
	StatusTraceSchemaVersionMissing          = "trace_schema_version_missing"
	StatusTraceHashMissing                   = "trace_hash_missing"
	StatusIntegrityCheckFailed               = "integrity_check_failed"
	StatusRedactionPolicyMissing             = "redaction_policy_missing"
	StatusPrivacyPolicyMissing               = "privacy_policy_missing"
	StatusRetentionPolicyMissing             = "retention_policy_missing"
	StatusReplayReferenceMissing             = "replay_reference_missing"
	StatusAuditIndexMissing                  = "audit_index_missing"
	StatusTamperEvidenceMissing              = "tamper_evidence_missing"
	StatusDeduplicationKeyMissing            = "deduplication_key_missing"
	StatusCorrelationIDMissing               = "correlation_id_missing"
	StatusIdempotencyMissing                 = "idempotency_missing"
	StatusUnsafeRealExecutionAttempt         = "unsafe_real_execution_attempt"
	StatusUnsafeRealAdapterCallAttempt       = "unsafe_real_adapter_call_attempt"
	StatusUnsafeNetworkAttempt               = "unsafe_network_attempt"
	StatusUnsafeCommandAttempt               = "unsafe_command_attempt"
	StatusUnsafeFileWriteAttempt             = "unsafe_file_write_attempt"
	StatusUnsafeDatabaseWriteAttempt         = "unsafe_database_write_attempt"
	StatusUnsafeTracePersistenceAttempt      = "unsafe_trace_persistence_attempt"
	StatusUnsafeLedgerWriteAttempt           = "unsafe_ledger_write_attempt"
	StatusUnsafeDeployAttempt                = "unsafe_deploy_attempt"
	StatusUnsafePromotionAttempt             = "unsafe_promotion_attempt"
	StatusUnsafeStatusPublishAttempt         = "unsafe_status_publish_attempt"
	StatusUnsafeMemoryWriteAttempt           = "unsafe_memory_write_attempt"
	StatusUnsafeTrustEscalationAttempt       = "unsafe_trust_escalation_attempt"
)

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var denied = []string{"mcp_execution_allowed", "real_execution_allowed", "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "trace_persistence_allowed", "trace_persisted", "database_write_allowed", "ledger_write_allowed", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "evidence_trust_allowed", "result_trust_allowed", "trace_trust_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}

var requiredItems = []string{
	"persistence_gate_id", "sandbox_trace_id", "sandbox_adapter_id", "runtime_id", "runtime_session_id", "evidence_binding_id", "verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "sandbox_noop", "project", "branch", "commit_sha", "target", "environment", "sandbox_or_local_sandbox",
	"V11.2_sandbox_execution_trace", "sandbox_trace_ready_dry_run", "trace_complete_dry_run", "denied_permissions_recorded", "blocked_actions_recorded", "V11.1_sandbox_adapter", "sandbox_adapter_ready_dry_run", "V11.0_controlled_runtime", "runtime_ready_dry_run", "controlled_runtime_ready", "V10.8_evidence_binding", "V10.7_result_verification", "V10.6_response_contract", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation",
	"persistence_policy", "persistence_scope", "isolated_storage_descriptor", "allowed_storage_root_descriptor", "path_safety_policy", "filename_policy", "trace_serialization_policy", "trace_schema_version", "trace_hash", "trace_integrity_checks", "trace_redaction_policy", "trace_privacy_policy", "trace_retention_policy", "trace_replay_reference", "trace_audit_index_descriptor", "trace_tamper_evidence_model", "trace_deduplication_key", "trace_correlation_id", "trace_idempotency_key",
	"no_real_execution", "no_real_adapter_call", "no_network_call", "no_command_execution", "no_file_write_inside_mcp", "no_database_write_inside_mcp", "no_ledger_write_inside_mcp", "no_deploy", "no_promotion", "no_status_publish", "no_memory_stable_write", "no_trust_escalation",
}

type SandboxTracePersistenceInput struct {
	Root                 string `json:"root,omitempty"`
	Operation            string `json:"operation,omitempty"`
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

	SandboxTrace              *sandboxtrace.SandboxExecutionTraceInput `json:"sandbox_trace,omitempty"`
	SandboxTraceReadyDryRun   bool                                     `json:"sandbox_trace_ready_dry_run,omitempty"`
	TraceCompleteDryRun       bool                                     `json:"trace_complete_dry_run,omitempty"`
	DeniedPermissionsRecorded bool                                     `json:"denied_permissions_recorded,omitempty"`
	BlockedActionsRecorded    bool                                     `json:"blocked_actions_recorded,omitempty"`
	SandboxAdapterReadyDryRun bool                                     `json:"sandbox_adapter_ready_dry_run,omitempty"`
	RuntimeReadyDryRun        bool                                     `json:"runtime_ready_dry_run,omitempty"`
	ControlledRuntimeReady    bool                                     `json:"controlled_runtime_ready,omitempty"`
	EvidenceBinding           *executionresponse.PresenceValid         `json:"evidence_binding,omitempty"`
	ResultVerification        *executionresponse.PresenceValid         `json:"result_verification,omitempty"`
	ResponseContract          *executionresponse.PresenceValid         `json:"response_contract,omitempty"`
	RequestEnvelope           *executionresponse.PresenceValid         `json:"request_envelope,omitempty"`
	AdapterInterface          *executionresponse.PresenceValid         `json:"adapter_interface,omitempty"`
	FinalAuthorization        *executionresponse.PresenceValid         `json:"final_authorization,omitempty"`
	Simulation                *executionresponse.PresenceValid         `json:"simulation,omitempty"`
	Firewall                  *executionresponse.PresenceValid         `json:"firewall,omitempty"`
	SovereignCandidate        *executionresponse.PresenceValid         `json:"sovereign_candidate,omitempty"`
	PassGoldReal              *executionresponse.PresenceValid         `json:"pass_gold_real,omitempty"`
	PassSecureReal            *executionresponse.PresenceValid         `json:"pass_secure_real,omitempty"`
	RealGateDryRun            bool                                     `json:"real_gate_dry_run,omitempty"`
	RealGateSynthesized       bool                                     `json:"real_gate_synthesized,omitempty"`
	RecognizedByAuthority     bool                                     `json:"recognized_by_authority,omitempty"`
	HumanApproval             *Approval                                `json:"human_approval,omitempty"`
	IndependentRevalidation   *Revalidation                            `json:"independent_revalidation,omitempty"`
	PersistencePolicy         *executionresponse.PresenceValid         `json:"persistence_policy,omitempty"`
	PersistenceScope          *executionresponse.PresenceValid         `json:"persistence_scope,omitempty"`
	IsolatedStorageDescriptor *executionresponse.PresenceValid         `json:"isolated_storage_descriptor,omitempty"`
	AllowedStorageRoot        *executionresponse.PresenceValid         `json:"allowed_storage_root_descriptor,omitempty"`
	PathSafetyPolicy          *executionresponse.PresenceValid         `json:"path_safety_policy,omitempty"`
	FilenamePolicy            *executionresponse.PresenceValid         `json:"filename_policy,omitempty"`
	TraceSerializationPolicy  *executionresponse.PresenceValid         `json:"trace_serialization_policy,omitempty"`
	TraceSchemaVersion        string                                   `json:"trace_schema_version,omitempty"`
	TraceHash                 string                                   `json:"trace_hash,omitempty"`
	TraceIntegrityChecks      *executionresponse.PresenceValid         `json:"trace_integrity_checks,omitempty"`
	TraceRedactionPolicy      *executionresponse.PresenceValid         `json:"trace_redaction_policy,omitempty"`
	TracePrivacyPolicy        *executionresponse.PresenceValid         `json:"trace_privacy_policy,omitempty"`
	TraceRetentionPolicy      *executionresponse.PresenceValid         `json:"trace_retention_policy,omitempty"`
	TraceReplayReference      *executionresponse.PresenceValid         `json:"trace_replay_reference,omitempty"`
	TraceAuditIndexDescriptor *executionresponse.PresenceValid         `json:"trace_audit_index_descriptor,omitempty"`
	TraceTamperEvidenceModel  *executionresponse.PresenceValid         `json:"trace_tamper_evidence_model,omitempty"`
	TraceDeduplicationKey     string                                   `json:"trace_deduplication_key,omitempty"`
	TraceCorrelationID        string                                   `json:"trace_correlation_id,omitempty"`
	TraceIdempotencyKey       string                                   `json:"trace_idempotency_key,omitempty"`
	Claims                    *SandboxTracePersistenceClaims           `json:"claims,omitempty"`

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
	DatabaseWriteAllowed    bool `json:"database_write_allowed,omitempty"`
	LedgerWriteAllowed      bool `json:"ledger_write_allowed,omitempty"`
	LedgerWritten           bool `json:"ledger_written,omitempty"`
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
	TraceTrustAllowed       bool `json:"trace_trust_allowed,omitempty"`
	TraceTrusted            bool `json:"trace_trusted,omitempty"`
	PassGold                bool `json:"pass_gold,omitempty"`
	PassSecure              bool `json:"pass_secure,omitempty"`
	PassGoldAllowed         bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed       bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGranted        bool `json:"authority_granted,omitempty"`
	AuthorityGrantAllowed   bool `json:"authority_grant_allowed,omitempty"`
}

type Approval struct {
	Present     bool   `json:"present,omitempty"`
	Approved    bool   `json:"approved,omitempty"`
	Placeholder bool   `json:"placeholder,omitempty"`
	Approver    string `json:"approver,omitempty"`
}

type Revalidation struct {
	Present               bool `json:"present,omitempty"`
	Completed             bool `json:"completed,omitempty"`
	Placeholder           bool `json:"placeholder,omitempty"`
	PassGoldRevalidated   bool `json:"pass_gold_revalidated,omitempty"`
	PassSecureRevalidated bool `json:"pass_secure_revalidated,omitempty"`
}

type SandboxTracePersistenceClaims struct {
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
	DatabaseWriteAllowed      bool `json:"database_write_allowed"`
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
	TraceTrustAllowed         bool `json:"trace_trust_allowed"`
	TraceTrusted              bool `json:"trace_trusted"`
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
	SandboxTraceBypassed      bool `json:"sandbox_trace_bypassed"`
	EvidenceBindingBypassed   bool `json:"evidence_binding_bypassed"`
	VerificationBypassed      bool `json:"verification_bypassed"`
	PersistencePolicyBypassed bool `json:"persistence_policy_bypassed"`
	PathSafetyBypassed        bool `json:"path_safety_bypassed"`
	RedactionBypassed         bool `json:"redaction_bypassed"`
	RetentionBypassed         bool `json:"retention_bypassed"`
	AuditIndexBypassed        bool `json:"audit_index_bypassed"`
	SandboxEscaped            bool `json:"sandbox_escaped"`
	KillSwitchBypassed        bool `json:"kill_switch_bypassed"`
	RollbackBypassed          bool `json:"rollback_bypassed"`
	ObservabilityBypassed     bool `json:"observability_bypassed"`
}

type SandboxTracePersistenceGate struct {
	Version                            string   `json:"version"`
	DryRun                             bool     `json:"dry_run"`
	ReadOnly                           bool     `json:"read_only"`
	Sandbox                            bool     `json:"sandbox"`
	TraceMode                          string   `json:"trace_mode"`
	PersistenceMode                    string   `json:"persistence_mode"`
	PersistenceStatus                  string   `json:"persistence_status"`
	Valid                              bool     `json:"valid"`
	Blocked                            bool     `json:"blocked"`
	SandboxTracePersistenceReadyDryRun bool     `json:"sandbox_trace_persistence_ready_dry_run"`
	PersistenceCandidate               bool     `json:"persistence_candidate"`
	IsolatedStorageCandidate           bool     `json:"isolated_storage_candidate"`
	TraceIntegrityReadyDryRun          bool     `json:"trace_integrity_ready_dry_run"`
	TraceRedactionReadyDryRun          bool     `json:"trace_redaction_ready_dry_run"`
	TraceRetentionReadyDryRun          bool     `json:"trace_retention_ready_dry_run"`
	TraceReplayReferenceReadyDryRun    bool     `json:"trace_replay_reference_ready_dry_run"`
	AuditIndexCandidate                bool     `json:"audit_index_candidate"`
	PersistenceGateID                  string   `json:"persistence_gate_id,omitempty"`
	SandboxTraceID                     string   `json:"sandbox_trace_id,omitempty"`
	TraceHash                          string   `json:"trace_hash,omitempty"`
	MissingItems                       []string `json:"missing_items"`
	UnsafeClaims                       []string `json:"unsafe_claims"`
	Conflicts                          []string `json:"conflicts"`
	BlockingReasons                    []string `json:"blocking_reasons"`
	RequiredItems                      []string `json:"required_items"`
	RequiredRealGates                  []string `json:"required_real_gates"`
	Recommendations                    []string `json:"recommendations"`
	MCPExecutionAllowed                bool     `json:"mcp_execution_allowed"`
	RealExecutionAllowed               bool     `json:"real_execution_allowed"`
	RealAdapterCallAllowed             bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed                 bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed                bool     `json:"executor_call_allowed"`
	NetworkCallAllowed                 bool     `json:"network_call_allowed"`
	CommandExecutionAllowed            bool     `json:"command_execution_allowed"`
	FileWriteAllowed                   bool     `json:"file_write_allowed"`
	TracePersistenceAllowed            bool     `json:"trace_persistence_allowed"`
	TracePersisted                     bool     `json:"trace_persisted"`
	DatabaseWriteAllowed               bool     `json:"database_write_allowed"`
	LedgerWriteAllowed                 bool     `json:"ledger_write_allowed"`
	DeployAllowed                      bool     `json:"deploy_allowed"`
	PromotionAllowed                   bool     `json:"promotion_allowed"`
	StatusPublishAllowed               bool     `json:"status_publish_allowed"`
	MutationAllowed                    bool     `json:"mutation_allowed"`
	MemoryWriteAllowed                 bool     `json:"memory_write_allowed"`
	StablePromotionAllowed             bool     `json:"stable_promotion_allowed"`
	LearningAllowed                    bool     `json:"learning_allowed"`
	RealLockAllowed                    bool     `json:"real_lock_allowed"`
	RollbackAllowed                    bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed               bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed                 bool     `json:"result_trust_allowed"`
	TraceTrustAllowed                  bool     `json:"trace_trust_allowed"`
	PassGoldAllowed                    bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                  bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed              bool     `json:"authority_grant_allowed"`
}

type SandboxTracePersistenceValidation = SandboxTracePersistenceGate

type SandboxTracePersistenceBoundary struct {
	Version                 string   `json:"version"`
	DryRun                  bool     `json:"dry_run"`
	ReadOnly                bool     `json:"read_only"`
	Sandbox                 bool     `json:"sandbox"`
	TraceMode               string   `json:"trace_mode"`
	PersistenceMode         string   `json:"persistence_mode"`
	RealExecutionAllowed    bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed     bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed  bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed      bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed     bool     `json:"executor_call_allowed"`
	NetworkCallAllowed      bool     `json:"network_call_allowed"`
	CommandExecutionAllowed bool     `json:"command_execution_allowed"`
	FileWriteAllowed        bool     `json:"file_write_allowed"`
	TracePersistenceAllowed bool     `json:"trace_persistence_allowed"`
	TracePersisted          bool     `json:"trace_persisted"`
	DatabaseWriteAllowed    bool     `json:"database_write_allowed"`
	LedgerWriteAllowed      bool     `json:"ledger_write_allowed"`
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
	TraceTrustAllowed       bool     `json:"trace_trust_allowed"`
	PassGoldAllowed         bool     `json:"pass_gold_allowed"`
	PassSecureAllowed       bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed   bool     `json:"authority_grant_allowed"`
	MCPCan                  []string `json:"mcp_can"`
	MCPCannot               []string `json:"mcp_cannot"`
	AlwaysDenied            []string `json:"always_denied"`
}

type SandboxTracePersistenceAudit struct {
	Version                             string   `json:"version"`
	DryRun                              bool     `json:"dry_run"`
	ReadOnly                            bool     `json:"read_only"`
	Sandbox                             bool     `json:"sandbox"`
	TraceMode                           string   `json:"trace_mode"`
	PersistenceMode                     string   `json:"persistence_mode"`
	RealExecutionAllowed                bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed                 bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed              bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed                  bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed                 bool     `json:"executor_call_allowed"`
	NetworkCallAllowed                  bool     `json:"network_call_allowed"`
	CommandExecutionAllowed             bool     `json:"command_execution_allowed"`
	FileWriteAllowed                    bool     `json:"file_write_allowed"`
	TracePersistenceAllowed             bool     `json:"trace_persistence_allowed"`
	TracePersisted                      bool     `json:"trace_persisted"`
	DatabaseWriteAllowed                bool     `json:"database_write_allowed"`
	LedgerWriteAllowed                  bool     `json:"ledger_write_allowed"`
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
	TraceTrustAllowed                   bool     `json:"trace_trust_allowed"`
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
	DatabaseWriteAttemptFound           bool     `json:"database_write_attempt_found"`
	TracePersistenceAttemptFound        bool     `json:"trace_persistence_attempt_found"`
	LedgerWriteAttemptFound             bool     `json:"ledger_write_attempt_found"`
	DeployAttemptFound                  bool     `json:"deploy_attempt_found"`
	PromotionAttemptFound               bool     `json:"promotion_attempt_found"`
	StatusPublishAttemptFound           bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound             bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound          bool     `json:"stable_learning_attempt_found"`
	TraceTrustAttemptFound              bool     `json:"trace_trust_attempt_found"`
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
	SandboxTraceBypassAttemptFound      bool     `json:"sandbox_trace_bypass_attempt_found"`
	EvidenceBindingBypassAttemptFound   bool     `json:"evidence_binding_bypass_attempt_found"`
	VerificationBypassAttemptFound      bool     `json:"verification_bypass_attempt_found"`
	PersistencePolicyBypassAttemptFound bool     `json:"persistence_policy_bypass_attempt_found"`
	PathSafetyBypassAttemptFound        bool     `json:"path_safety_bypass_attempt_found"`
	RedactionBypassAttemptFound         bool     `json:"redaction_bypass_attempt_found"`
	RetentionBypassAttemptFound         bool     `json:"retention_bypass_attempt_found"`
	AuditIndexBypassAttemptFound        bool     `json:"audit_index_bypass_attempt_found"`
	SandboxEscapeAttemptFound           bool     `json:"sandbox_escape_attempt_found"`
	KillSwitchBypassAttemptFound        bool     `json:"kill_switch_bypass_attempt_found"`
	RollbackBypassAttemptFound          bool     `json:"rollback_bypass_attempt_found"`
	ObservabilityBypassAttemptFound     bool     `json:"observability_bypass_attempt_found"`
	Recommendations                     []string `json:"recommendations"`
}

type SandboxTracePersistenceExplain struct {
	Version                                                   string   `json:"version"`
	DryRun                                                    bool     `json:"dry_run"`
	ReadOnly                                                  bool     `json:"read_only"`
	Sandbox                                                   bool     `json:"sandbox"`
	TraceMode                                                 string   `json:"trace_mode"`
	PersistenceMode                                           string   `json:"persistence_mode"`
	RealExecutionAllowed                                      bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed                                       bool     `json:"mcp_execution_allowed"`
	RealAdapterCallAllowed                                    bool     `json:"real_adapter_call_allowed"`
	AdapterCallAllowed                                        bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed                                       bool     `json:"executor_call_allowed"`
	NetworkCallAllowed                                        bool     `json:"network_call_allowed"`
	CommandExecutionAllowed                                   bool     `json:"command_execution_allowed"`
	FileWriteAllowed                                          bool     `json:"file_write_allowed"`
	TracePersistenceAllowed                                   bool     `json:"trace_persistence_allowed"`
	TracePersisted                                            bool     `json:"trace_persisted"`
	DatabaseWriteAllowed                                      bool     `json:"database_write_allowed"`
	LedgerWriteAllowed                                        bool     `json:"ledger_write_allowed"`
	DeployAllowed                                             bool     `json:"deploy_allowed"`
	PromotionAllowed                                          bool     `json:"promotion_allowed"`
	StatusPublishAllowed                                      bool     `json:"status_publish_allowed"`
	MutationAllowed                                           bool     `json:"mutation_allowed"`
	MemoryWriteAllowed                                        bool     `json:"memory_write_allowed"`
	StablePromotionAllowed                                    bool     `json:"stable_promotion_allowed"`
	LearningAllowed                                           bool     `json:"learning_allowed"`
	RealLockAllowed                                           bool     `json:"real_lock_allowed"`
	RollbackAllowed                                           bool     `json:"rollback_allowed"`
	EvidenceTrustAllowed                                      bool     `json:"evidence_trust_allowed"`
	ResultTrustAllowed                                        bool     `json:"result_trust_allowed"`
	TraceTrustAllowed                                         bool     `json:"trace_trust_allowed"`
	PassGoldAllowed                                           bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                                         bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed                                     bool     `json:"authority_grant_allowed"`
	WhyPersistenceGateIsNotPersistence                        []string `json:"why_persistence_gate_is_not_persistence"`
	WhyFileWriteIsBlockedInsideMCP                            []string `json:"why_file_write_is_blocked_inside_mcp"`
	WhyDatabaseWriteIsBlockedInsideMCP                        []string `json:"why_database_write_is_blocked_inside_mcp"`
	WhyLedgerWriteIsBlockedInsideMCP                          []string `json:"why_ledger_write_is_blocked_inside_mcp"`
	WhySandboxTraceIsRequired                                 []string `json:"why_sandbox_trace_is_required"`
	WhySandboxAdapterIsRequired                               []string `json:"why_sandbox_adapter_is_required"`
	WhyControlledRuntimeIsRequired                            []string `json:"why_controlled_runtime_is_required"`
	WhyEvidenceBindingIsRequired                              []string `json:"why_evidence_binding_is_required"`
	WhyResultVerificationIsRequired                           []string `json:"why_result_verification_is_required"`
	WhyFinalAuthorizationIsRequired                           []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                                   []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired                []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyIsolatedStoragePathSafetyRedactionRetentionAreRequired []string `json:"why_isolated_storage_path_safety_redaction_retention_are_required"`
	WhyTraceCanOnlyBePersistedByFutureExplicitRelease         []string `json:"why_trace_can_only_be_persisted_by_future_explicit_release"`
	RequiredGates                                             []string `json:"required_gates"`
	AlwaysDenied                                              []string `json:"always_denied"`
}

func BuildSandboxTracePersistenceGate(input SandboxTracePersistenceInput) SandboxTracePersistenceGate {
	return validate(input)
}

func ValidateSandboxTracePersistenceGate(input SandboxTracePersistenceInput) SandboxTracePersistenceValidation {
	return validate(input)
}

func BuildSandboxTracePersistenceBoundary() SandboxTracePersistenceBoundary {
	return SandboxTracePersistenceBoundary{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, PersistenceMode: PersistenceMode, RealExecutionAllowed: false, MCPCan: []string{"read", "validate", "audit", "explain", "simulate sandbox trace persistence gate", "build persistence eligibility payload", "build isolated storage candidate descriptor", "build replay reference candidate", "build audit index candidate", "return trace persistence decision in response payload"}, MCPCannot: []string{"execute", "execute_runtime", "call_real_adapter", "call_executor", "network_call", "command_execution", "file_write", "database_write", "persist_trace", "write_ledger", "deploy", "promote", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "trust_trace", "trust_evidence", "trust_result", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}, AlwaysDenied: clone(denied)}
}

func AuditSandboxTracePersistenceGate(input SandboxTracePersistenceInput) SandboxTracePersistenceAudit {
	v := validate(input)
	c := normalizeClaims(input)
	a := SandboxTracePersistenceAudit{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, PersistenceMode: PersistenceMode, RealExecutionAllowed: false, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
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
	a.DatabaseWriteAttemptFound = c.DatabaseWriteAllowed
	a.TracePersistenceAttemptFound = c.TracePersistenceAllowed || c.TracePersisted
	a.LedgerWriteAttemptFound = c.LedgerWriteAllowed || c.LedgerWritten
	a.DeployAttemptFound = c.DeployAllowed
	a.PromotionAttemptFound = c.PromotionAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
	a.MemoryWriteAttemptFound = c.MemoryWriteAllowed
	a.StableLearningAttemptFound = c.LearningAllowed || c.LearnedAsStable || c.StablePromoted
	a.TraceTrustAttemptFound = c.TraceTrustAllowed || c.TraceTrusted
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
	a.EvidenceBindingBypassAttemptFound = c.EvidenceBindingBypassed
	a.VerificationBypassAttemptFound = c.VerificationBypassed
	a.PersistencePolicyBypassAttemptFound = c.PersistencePolicyBypassed
	a.PathSafetyBypassAttemptFound = c.PathSafetyBypassed
	a.RedactionBypassAttemptFound = c.RedactionBypassed
	a.RetentionBypassAttemptFound = c.RetentionBypassed
	a.AuditIndexBypassAttemptFound = c.AuditIndexBypassed
	a.SandboxEscapeAttemptFound = c.SandboxEscaped
	a.KillSwitchBypassAttemptFound = c.KillSwitchBypassed
	a.RollbackBypassAttemptFound = c.RollbackBypassed
	a.ObservabilityBypassAttemptFound = c.ObservabilityBypassed
	return a
}

func ExplainSandboxTracePersistenceGate(input SandboxTracePersistenceInput) SandboxTracePersistenceExplain {
	return SandboxTracePersistenceExplain{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, PersistenceMode: PersistenceMode, RealExecutionAllowed: false, WhyPersistenceGateIsNotPersistence: []string{"V11.3 builds only a dry-run eligibility decision; it does not write a file, database, ledger, memory, status, or project record."}, WhyFileWriteIsBlockedInsideMCP: []string{"MCP remains a read-only control plane, so filesystem writes are always denied even for isolated storage candidates."}, WhyDatabaseWriteIsBlockedInsideMCP: []string{"Database writes would create durable state and are outside this dry-run release."}, WhyLedgerWriteIsBlockedInsideMCP: []string{"Ledger writes would imply durable audit authority and remain blocked until a future explicit release."}, WhySandboxTraceIsRequired: []string{"A valid V11.2 sandbox/noop execution trace is the source payload being evaluated for future persistence."}, WhySandboxAdapterIsRequired: []string{"A valid V11.1 sandbox/noop adapter proves the trace came from a noop adapter boundary rather than a real adapter call."}, WhyControlledRuntimeIsRequired: []string{"A valid V11.0 controlled runtime anchors the external-only executor and sandbox session."}, WhyEvidenceBindingIsRequired: []string{"Evidence binding ties the trace to upstream context without trusting or persisting the result."}, WhyResultVerificationIsRequired: []string{"Result verification prevents treating simulated/noop output as real execution proof."}, WhyFinalAuthorizationIsRequired: []string{"Final authorization confirms upstream gates before a trace can be considered a persistence candidate."}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real and independently revalidated, but V11.3 never marks them."}, WhyHumanApprovalAndRevalidationAreRequired: []string{"Human approval and independent revalidation prevent placeholder approval, synthetic gates, and trust escalation."}, WhyIsolatedStoragePathSafetyRedactionRetentionAreRequired: []string{"A future persistence release needs an isolated storage root, path and filename controls, redaction, privacy, retention, replay reference, audit index, and tamper-evidence descriptors before any write."}, WhyTraceCanOnlyBePersistedByFutureExplicitRelease: []string{"V11.3 only returns candidates in the response payload; actual trace persistence requires a future explicit mutating release outside read-only MCP."}, RequiredGates: clone(requiredGates), AlwaysDenied: clone(denied)}
}

func validate(input SandboxTracePersistenceInput) SandboxTracePersistenceGate {
	var missing, conflicts, unsafe []string
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s) }

	for name, value := range map[string]string{"persistence_gate_id": input.PersistenceGateID, "sandbox_trace_id": input.SandboxTraceID, "sandbox_adapter_id": input.SandboxAdapterID, "runtime_id": input.RuntimeID, "runtime_session_id": input.RuntimeSessionID, "evidence_binding_id": input.EvidenceBindingID, "verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "executor_mode": input.ExecutorMode, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment} {
		if strings.TrimSpace(value) == "" {
			addMissing(name)
		}
	}
	if strings.TrimSpace(input.SandboxTraceID) == "" {
		addConflict(StatusSandboxTraceMissing)
	}
	if strings.TrimSpace(input.SandboxAdapterID) == "" {
		addConflict(StatusSandboxAdapterMissing)
	}
	if strings.TrimSpace(input.RuntimeID) == "" || strings.TrimSpace(input.RuntimeSessionID) == "" {
		addConflict(StatusControlledRuntimeMissing)
	}
	if strings.TrimSpace(input.EvidenceBindingID) == "" {
		addConflict(StatusEvidenceBindingMissing)
	}
	if strings.TrimSpace(input.VerificationID) == "" {
		addConflict(StatusResultVerificationMissing)
	}
	if strings.TrimSpace(input.ResponseContractID) == "" {
		addConflict(StatusResponseContractMissing)
	}
	if strings.TrimSpace(input.RequestEnvelopeID) == "" {
		addConflict(StatusRequestEnvelopeMissing)
	}
	if strings.TrimSpace(input.AdapterInterfaceID) == "" {
		addConflict(StatusAdapterInterfaceMissing)
	}
	if strings.TrimSpace(input.FinalAuthorizationID) == "" {
		addConflict(StatusFinalAuthorizationMissing)
	}
	if strings.TrimSpace(input.SimulationID) == "" {
		addConflict(StatusSimulationMissing)
	}
	if strings.TrimSpace(input.FirewallID) == "" {
		addConflict(StatusFirewallMissing)
	}
	if strings.TrimSpace(input.DecisionID) == "" {
		addConflict(StatusSovereignCandidateMissing)
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

	if input.SandboxTrace == nil {
		addMissing("sandbox_trace")
		addConflict(StatusSandboxTraceMissing)
	} else {
		trace := sandboxtrace.ValidateSandboxExecutionTrace(*input.SandboxTrace)
		if !trace.Valid || trace.Blocked || !trace.SandboxTraceReadyDryRun || !trace.TraceCompleteDryRun || !trace.DeniedPermissionsRecorded || !trace.BlockedActionsRecorded {
			addConflict(StatusSandboxTraceBlocked)
		}
	}
	if !input.SandboxTraceReadyDryRun {
		addConflict("sandbox_trace_ready_dry_run_false")
		addConflict(StatusSandboxTraceBlocked)
	}
	if !input.TraceCompleteDryRun {
		addConflict("trace_complete_dry_run_false")
		addConflict(StatusSandboxTraceBlocked)
	}
	if !input.DeniedPermissionsRecorded {
		addConflict("denied_permissions_recorded_false")
		addConflict(StatusSandboxTraceBlocked)
	}
	if !input.BlockedActionsRecorded {
		addConflict("blocked_actions_recorded_false")
		addConflict(StatusSandboxTraceBlocked)
	}
	if !input.SandboxAdapterReadyDryRun {
		addConflict("sandbox_adapter_ready_dry_run_false")
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
	validatePresence("evidence_binding", input.EvidenceBinding, addMissing, addConflict, StatusEvidenceBindingMissing, StatusEvidenceBindingBlocked)
	validatePresence("result_verification", input.ResultVerification, addMissing, addConflict, StatusResultVerificationMissing, StatusResultVerificationBlocked)
	validatePresence("response_contract", input.ResponseContract, addMissing, addConflict, StatusResponseContractMissing, StatusResponseContractBlocked)
	validatePresence("request_envelope", input.RequestEnvelope, addMissing, addConflict, StatusRequestEnvelopeMissing, StatusRequestEnvelopeBlocked)
	validatePresence("adapter_interface", input.AdapterInterface, addMissing, addConflict, StatusAdapterInterfaceMissing, StatusAdapterInterfaceBlocked)
	validatePresence("final_authorization", input.FinalAuthorization, addMissing, addConflict, StatusFinalAuthorizationMissing, StatusFinalAuthorizationBlocked)
	validatePresence("simulation", input.Simulation, addMissing, addConflict, StatusSimulationMissing, StatusSimulationBlocked)
	validatePresence("firewall", input.Firewall, addMissing, addConflict, StatusFirewallMissing, StatusFirewallBlocked)
	validatePresence("sovereign_candidate", input.SovereignCandidate, addMissing, addConflict, StatusSovereignCandidateMissing, StatusSovereignCandidateMissing)
	validatePresence("pass_gold_real", input.PassGoldReal, addMissing, addConflict, StatusMissingRealGates, StatusMissingRealGates)
	validatePresence("pass_secure_real", input.PassSecureReal, addMissing, addConflict, StatusMissingRealGates, StatusMissingRealGates)
	if input.RealGateDryRun {
		addConflict("real_gate_dry_run_true")
		addConflict(StatusMissingRealGates)
	}
	if input.RealGateSynthesized {
		addConflict("real_gate_synthesized_true")
		addConflict(StatusMissingRealGates)
	}
	if !input.RecognizedByAuthority {
		addConflict("recognized_by_authority_false")
		addConflict(StatusMissingRealGates)
	}
	if input.HumanApproval == nil || !input.HumanApproval.Present || input.HumanApproval.Placeholder || !input.HumanApproval.Approved {
		addConflict(StatusHumanApprovalRequired)
	}
	if input.IndependentRevalidation == nil || !input.IndependentRevalidation.Present || input.IndependentRevalidation.Placeholder || !input.IndependentRevalidation.Completed || !input.IndependentRevalidation.PassGoldRevalidated || !input.IndependentRevalidation.PassSecureRevalidated {
		addConflict(StatusRevalidationRequired)
	}
	validatePresence("persistence_policy", input.PersistencePolicy, addMissing, addConflict, StatusPersistencePolicyMissing, StatusPersistencePolicyMissing)
	validatePresence("persistence_scope", input.PersistenceScope, addMissing, addConflict, StatusPersistenceScopeMissing, StatusPersistenceScopeMissing)
	validatePresence("isolated_storage_descriptor", input.IsolatedStorageDescriptor, addMissing, addConflict, StatusIsolatedStorageMissing, StatusIsolatedStorageMissing)
	validatePresence("allowed_storage_root_descriptor", input.AllowedStorageRoot, addMissing, addConflict, StatusAllowedStorageRootMissing, StatusAllowedStorageRootMissing)
	validatePresence("path_safety_policy", input.PathSafetyPolicy, addMissing, addConflict, StatusPathSafetyPolicyMissing, StatusPathSafetyPolicyMissing)
	validatePresence("filename_policy", input.FilenamePolicy, addMissing, addConflict, StatusFilenamePolicyMissing, StatusFilenamePolicyMissing)
	validatePresence("trace_serialization_policy", input.TraceSerializationPolicy, addMissing, addConflict, StatusSerializationPolicyMissing, StatusSerializationPolicyMissing)
	if strings.TrimSpace(input.TraceSchemaVersion) == "" {
		addMissing("trace_schema_version")
		addConflict(StatusTraceSchemaVersionMissing)
	}
	if strings.TrimSpace(input.TraceHash) == "" {
		addMissing("trace_hash")
		addConflict(StatusTraceHashMissing)
	}
	validatePresence("trace_integrity_checks", input.TraceIntegrityChecks, addMissing, addConflict, StatusIntegrityCheckFailed, StatusIntegrityCheckFailed)
	validatePresence("trace_redaction_policy", input.TraceRedactionPolicy, addMissing, addConflict, StatusRedactionPolicyMissing, StatusRedactionPolicyMissing)
	validatePresence("trace_privacy_policy", input.TracePrivacyPolicy, addMissing, addConflict, StatusPrivacyPolicyMissing, StatusPrivacyPolicyMissing)
	validatePresence("trace_retention_policy", input.TraceRetentionPolicy, addMissing, addConflict, StatusRetentionPolicyMissing, StatusRetentionPolicyMissing)
	validatePresence("trace_replay_reference", input.TraceReplayReference, addMissing, addConflict, StatusReplayReferenceMissing, StatusReplayReferenceMissing)
	validatePresence("trace_audit_index_descriptor", input.TraceAuditIndexDescriptor, addMissing, addConflict, StatusAuditIndexMissing, StatusAuditIndexMissing)
	validatePresence("trace_tamper_evidence_model", input.TraceTamperEvidenceModel, addMissing, addConflict, StatusTamperEvidenceMissing, StatusTamperEvidenceMissing)
	if strings.TrimSpace(input.TraceDeduplicationKey) == "" {
		addMissing("trace_deduplication_key")
		addConflict(StatusDeduplicationKeyMissing)
	}
	if strings.TrimSpace(input.TraceCorrelationID) == "" {
		addMissing("trace_correlation_id")
		addConflict(StatusCorrelationIDMissing)
	}
	if strings.TrimSpace(input.TraceIdempotencyKey) == "" {
		addMissing("trace_idempotency_key")
		addConflict(StatusIdempotencyMissing)
	}

	for _, c := range unsafeClaims(normalizeClaims(input)) {
		addUnsafe(c)
		mapUnsafeStatus(c, addConflict)
	}
	blocked := len(missing) > 0 || len(conflicts) > 0 || len(unsafe) > 0
	status := StatusSandboxTracePersistenceReadyDryRun
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
	return SandboxTracePersistenceGate{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, TraceMode: TraceMode, PersistenceMode: PersistenceMode, PersistenceStatus: status, Valid: !blocked, Blocked: blocked, SandboxTracePersistenceReadyDryRun: !blocked, PersistenceCandidate: !blocked, IsolatedStorageCandidate: !blocked, TraceIntegrityReadyDryRun: !blocked, TraceRedactionReadyDryRun: !blocked, TraceRetentionReadyDryRun: !blocked, TraceReplayReferenceReadyDryRun: !blocked, AuditIndexCandidate: !blocked, PersistenceGateID: input.PersistenceGateID, SandboxTraceID: input.SandboxTraceID, TraceHash: input.TraceHash, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocked)}
}

func validatePresence(name string, pv *executionresponse.PresenceValid, addMissing func(string), addConflict func(string), missingStatus, blockedStatus string) {
	if pv == nil || !pv.Present {
		addMissing(name)
		addConflict(missingStatus)
		return
	}
	if !pv.Valid {
		addConflict(name + "_invalid")
		addConflict(blockedStatus)
	}
}

func normalizeClaims(input SandboxTracePersistenceInput) *SandboxTracePersistenceClaims {
	if input.Claims != nil {
		return input.Claims
	}
	return &SandboxTracePersistenceClaims{MCPExecutionAllowed: input.MCPExecutionAllowed, RealExecutionAllowed: input.RealExecutionAllowed, RealAdapterCallAllowed: input.RealAdapterCallAllowed, AdapterCallAllowed: input.AdapterCallAllowed, ExecutorCallAllowed: input.ExecutorCallAllowed, NetworkCallAllowed: input.NetworkCallAllowed, CommandExecutionAllowed: input.CommandExecutionAllowed, FileWriteAllowed: input.FileWriteAllowed, TracePersistenceAllowed: input.TracePersistenceAllowed, TracePersisted: input.TracePersisted, DatabaseWriteAllowed: input.DatabaseWriteAllowed, LedgerWriteAllowed: input.LedgerWriteAllowed, LedgerWritten: input.LedgerWritten, DeployAllowed: input.DeployAllowed, PromotionAllowed: input.PromotionAllowed, StatusPublishAllowed: input.StatusPublishAllowed, MutationAllowed: input.MutationAllowed, MemoryWriteAllowed: input.MemoryWriteAllowed, StablePromotionAllowed: input.StablePromotionAllowed, LearningAllowed: input.LearningAllowed, StablePromoted: input.StablePromoted, LearnedAsStable: input.LearnedAsStable, RealLockAllowed: input.RealLockAllowed, RealLockAcquired: input.RealLockAcquired, RollbackAllowed: input.RollbackAllowed, RollbackPerformed: input.RollbackPerformed, EvidenceTrustAllowed: input.EvidenceTrustAllowed, EvidenceTrusted: input.EvidenceTrusted, ResultTrustAllowed: input.ResultTrustAllowed, ResultTrusted: input.ResultTrusted, TraceTrustAllowed: input.TraceTrustAllowed, TraceTrusted: input.TraceTrusted, PassGold: input.PassGold, PassSecure: input.PassSecure, PassGoldAllowed: input.PassGoldAllowed, PassSecureAllowed: input.PassSecureAllowed, AuthorityGranted: input.AuthorityGranted, AuthorityGrantAllowed: input.AuthorityGrantAllowed}
}

func unsafeClaims(c *SandboxTracePersistenceClaims) []string {
	if c == nil {
		return nil
	}
	var out []string
	add := func(name string, v bool) {
		if v {
			out = appendUnique(out, name)
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
	add("trace_persisted", c.TracePersisted)
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
	case "evidence_trust_allowed", "evidence_trusted", "result_trust_allowed", "result_trusted", "trace_trust_allowed", "trace_trusted", "pass_gold", "pass_secure", "pass_gold_allowed", "pass_secure_allowed", "authority_granted", "authority_grant_allowed":
		add(StatusUnsafeTrustEscalationAttempt)
	case "real_lock_allowed", "real_lock_acquired":
		add("unsafe_real_lock_attempt")
	case "rollback_allowed", "rollback_performed":
		add("unsafe_rollback_attempt")
	}
}

func recommendations(blocked bool) []string {
	if blocked {
		return []string{"keep sandbox trace persistence as dry-run only", "do not persist trace", "complete V11.2 trace, real gates, approval, revalidation, and storage safety prerequisites"}
	}
	return []string{"sandbox trace is a persistence candidate for dry-run inspection only", "future explicit release required before any trace persistence write"}
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
