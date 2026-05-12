// Package sandboxreadiness implements V11.6 Sandbox-to-Controlled Execution Readiness Gate.
//
// V11.6 is the final read-only/dry-run readiness gate for the sandbox phase. It
// consolidates V11.5 through V10.0 evidence into an advisory payload for a future
// V12.0 isolated controlled execution runtime review. It never executes, calls
// adapters or executors, performs network/command/file/database/ledger writes,
// persists readiness/report/replay/trace state, deploys, promotes, publishes
// status, writes memory, grants authority, acquires locks, rolls back, marks real
// PASS gates, or trusts evidence/results/traces/replays/reports/readiness.
package sandboxreadiness

import (
	"strings"

	"github.com/visioncore/go-core/internal/executionresponse"
)

const Version = "V11.6"
const ReadinessMode = "sandbox_to_controlled_execution_readiness_gate"
const NextPhase = "V12.0_isolated_controlled_execution_runtime"

const (
	StatusSandboxReadinessReadyDryRun               = "sandbox_readiness_ready_dry_run"
	StatusIncomplete                                = "incomplete"
	StatusBlocked                                   = "blocked"
	StatusSandboxTraceAuditReportMissing            = "sandbox_trace_audit_report_missing"
	StatusSandboxTraceAuditReportBlocked            = "sandbox_trace_audit_report_blocked"
	StatusSandboxTraceReplayMissing                 = "sandbox_trace_replay_missing"
	StatusSandboxTraceReplayBlocked                 = "sandbox_trace_replay_blocked"
	StatusSandboxTracePersistenceMissing            = "sandbox_trace_persistence_missing"
	StatusSandboxTracePersistenceBlocked            = "sandbox_trace_persistence_blocked"
	StatusSandboxTraceMissing                       = "sandbox_trace_missing"
	StatusSandboxTraceBlocked                       = "sandbox_trace_blocked"
	StatusSandboxAdapterMissing                     = "sandbox_adapter_missing"
	StatusSandboxAdapterBlocked                     = "sandbox_adapter_blocked"
	StatusControlledRuntimeMissing                  = "controlled_runtime_missing"
	StatusControlledRuntimeBlocked                  = "controlled_runtime_blocked"
	StatusEvidenceBindingMissing                    = "evidence_binding_missing"
	StatusEvidenceBindingBlocked                    = "evidence_binding_blocked"
	StatusResultVerificationMissing                 = "result_verification_missing"
	StatusResultVerificationBlocked                 = "result_verification_blocked"
	StatusResponseContractMissing                   = "response_contract_missing"
	StatusResponseContractBlocked                   = "response_contract_blocked"
	StatusRequestEnvelopeMissing                    = "request_envelope_missing"
	StatusRequestEnvelopeBlocked                    = "request_envelope_blocked"
	StatusAdapterInterfaceMissing                   = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked                   = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing                 = "final_authorization_missing"
	StatusFinalAuthorizationBlocked                 = "final_authorization_blocked"
	StatusSimulationMissing                         = "simulation_missing"
	StatusSimulationBlocked                         = "simulation_blocked"
	StatusFirewallMissing                           = "firewall_missing"
	StatusFirewallBlocked                           = "firewall_blocked"
	StatusSovereignCandidateMissing                 = "sovereign_candidate_missing"
	StatusMissingRealGates                          = "missing_real_gates"
	StatusHumanApprovalRequired                     = "human_approval_required"
	StatusRevalidationRequired                      = "revalidation_required"
	StatusReadinessPolicyMissing                    = "readiness_policy_missing"
	StatusReadinessScopeMissing                     = "readiness_scope_missing"
	StatusReadinessSchemaVersionMissing             = "readiness_schema_version_missing"
	StatusReadinessScorePolicyMissing               = "readiness_score_policy_missing"
	StatusReadinessThresholdPolicyMissing           = "readiness_threshold_policy_missing"
	StatusReadinessBlockerPolicyMissing             = "readiness_blocker_policy_missing"
	StatusReadinessRiskPolicyMissing                = "readiness_risk_policy_missing"
	StatusReadinessDeniedPermissionsPolicyMissing   = "readiness_denied_permissions_policy_missing"
	StatusRequiredBeforeV12Missing                  = "required_before_v12_missing"
	StatusV12IsolationRequirementsMissing           = "v12_isolation_requirements_missing"
	StatusV12ExecutionConstraintsMissing            = "v12_execution_constraints_missing"
	StatusV12RollbackRequirementsMissing            = "v12_rollback_requirements_missing"
	StatusV12LockRequirementsMissing                = "v12_lock_requirements_missing"
	StatusV12ObservabilityRequirementsMissing       = "v12_observability_requirements_missing"
	StatusV12ApprovalRequirementsMissing            = "v12_approval_requirements_missing"
	StatusV12AdapterRequirementsMissing             = "v12_adapter_requirements_missing"
	StatusV12CommandAllowlistRequirementsMissing    = "v12_command_allowlist_requirements_missing"
	StatusV12FilesystemIsolationRequirementsMissing = "v12_filesystem_isolation_requirements_missing"
	StatusV12NetworkPolicyRequirementsMissing       = "v12_network_policy_requirements_missing"
	StatusV12ArtifactPolicyRequirementsMissing      = "v12_artifact_policy_requirements_missing"
	StatusV12AuditPolicyRequirementsMissing         = "v12_audit_policy_requirements_missing"
	StatusV12KillSwitchRequirementsMissing          = "v12_kill_switch_requirements_missing"
	StatusReadinessRecommendationMissing            = "readiness_recommendation_missing"
	StatusCorrelationIDMissing                      = "correlation_id_missing"
	StatusIdempotencyMissing                        = "idempotency_missing"
	StatusReadinessRedactionPolicyMissing           = "readiness_redaction_policy_missing"
	StatusReadinessPrivacyPolicyMissing             = "readiness_privacy_policy_missing"
	StatusReadinessRetentionPolicyMissing           = "readiness_retention_policy_missing"
	StatusReadinessTamperEvidenceMissing            = "readiness_tamper_evidence_missing"
	StatusUnsafeRealExecutionAttempt                = "unsafe_real_execution_attempt"
	StatusUnsafeIsolatedRealExecutionAttempt        = "unsafe_isolated_real_execution_attempt"
	StatusUnsafeRealAdapterCallAttempt              = "unsafe_real_adapter_call_attempt"
	StatusUnsafeNetworkAttempt                      = "unsafe_network_attempt"
	StatusUnsafeCommandAttempt                      = "unsafe_command_attempt"
	StatusUnsafeFileWriteAttempt                    = "unsafe_file_write_attempt"
	StatusUnsafeDatabaseWriteAttempt                = "unsafe_database_write_attempt"
	StatusUnsafeReadinessPersistenceAttempt         = "unsafe_readiness_persistence_attempt"
	StatusUnsafeReportPersistenceAttempt            = "unsafe_report_persistence_attempt"
	StatusUnsafeReplayPersistenceAttempt            = "unsafe_replay_persistence_attempt"
	StatusUnsafeTracePersistenceAttempt             = "unsafe_trace_persistence_attempt"
	StatusUnsafeLedgerWriteAttempt                  = "unsafe_ledger_write_attempt"
	StatusUnsafeDeployAttempt                       = "unsafe_deploy_attempt"
	StatusUnsafePromotionAttempt                    = "unsafe_promotion_attempt"
	StatusUnsafeStatusPublishAttempt                = "unsafe_status_publish_attempt"
	StatusUnsafeMemoryWriteAttempt                  = "unsafe_memory_write_attempt"
	StatusUnsafeTrustEscalationAttempt              = "unsafe_trust_escalation_attempt"
)

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var denied = []string{"mcp_execution_allowed", "real_execution_allowed", "isolated_real_execution_allowed", "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "database_write_allowed", "ledger_write_allowed", "readiness_persistence_allowed", "report_persistence_allowed", "replay_persistence_allowed", "trace_persistence_allowed", "readiness_persisted", "report_persisted", "replay_persisted", "trace_persisted", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "evidence_trust_allowed", "result_trust_allowed", "trace_trust_allowed", "replay_trust_allowed", "report_trust_allowed", "readiness_trust_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}

var requiredItems = []string{"readiness_gate_id", "audit_report_id", "replay_gate_id", "persistence_gate_id", "sandbox_trace_id", "sandbox_adapter_id", "runtime_id", "runtime_session_id", "evidence_binding_id", "verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "sandbox_noop", "project", "branch", "commit_sha", "target", "environment", "sandbox_or_local_sandbox", "V11.5_sandbox_trace_audit_report", "V11.4_sandbox_trace_replay_gate", "V11.3_sandbox_trace_persistence_gate", "V11.2_sandbox_execution_trace", "V11.1_sandbox_adapter", "V11.0_controlled_runtime", "V10.8_evidence_binding", "V10.7_result_verification", "V10.6_response_contract", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation", "readiness_policy", "readiness_scope", "readiness_schema_version", "readiness_score_policy", "readiness_threshold_policy", "readiness_blocker_policy", "readiness_risk_policy", "readiness_denied_permissions_policy", "required_before_v12_section", "v12_isolation_requirements_section", "v12_execution_constraints_section", "v12_rollback_requirements_section", "v12_lock_requirements_section", "v12_observability_requirements_section", "v12_approval_requirements_section", "v12_adapter_requirements_section", "v12_command_allowlist_requirements_section", "v12_filesystem_isolation_requirements_section", "v12_network_policy_requirements_section", "v12_artifact_policy_requirements_section", "v12_audit_policy_requirements_section", "v12_kill_switch_requirements_section", "readiness_recommendation", "correlation_id", "idempotency_key", "readiness_redaction_policy", "readiness_privacy_policy", "readiness_retention_policy", "readiness_tamper_evidence_model", "no_real_execution", "no_isolated_real_execution", "no_real_adapter_call", "no_network_call", "no_command_execution", "no_file_write_inside_mcp", "no_database_write_inside_mcp", "no_ledger_write_inside_mcp", "no_readiness_persistence_inside_mcp", "no_report_persistence_inside_mcp", "no_replay_persistence_inside_mcp", "no_trace_persistence_inside_mcp", "no_deploy", "no_promotion", "no_status_publish", "no_memory_stable_write", "no_trust_escalation"}

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

type SandboxToControlledReadinessInput struct {
	Root                                      string                           `json:"root,omitempty"`
	Operation                                 string                           `json:"operation,omitempty"`
	ReadinessGateID                           string                           `json:"readiness_gate_id,omitempty"`
	AuditReportID                             string                           `json:"audit_report_id,omitempty"`
	ReplayGateID                              string                           `json:"replay_gate_id,omitempty"`
	PersistenceGateID                         string                           `json:"persistence_gate_id,omitempty"`
	SandboxTraceID                            string                           `json:"sandbox_trace_id,omitempty"`
	SandboxAdapterID                          string                           `json:"sandbox_adapter_id,omitempty"`
	RuntimeID                                 string                           `json:"runtime_id,omitempty"`
	RuntimeSessionID                          string                           `json:"runtime_session_id,omitempty"`
	EvidenceBindingID                         string                           `json:"evidence_binding_id,omitempty"`
	VerificationID                            string                           `json:"verification_id,omitempty"`
	ResponseContractID                        string                           `json:"response_contract_id,omitempty"`
	RequestEnvelopeID                         string                           `json:"request_envelope_id,omitempty"`
	AdapterInterfaceID                        string                           `json:"adapter_interface_id,omitempty"`
	FinalAuthorizationID                      string                           `json:"final_authorization_id,omitempty"`
	SimulationID                              string                           `json:"simulation_id,omitempty"`
	FirewallID                                string                           `json:"firewall_id,omitempty"`
	DecisionID                                string                           `json:"decision_id,omitempty"`
	InvocationID                              string                           `json:"invocation_id,omitempty"`
	Executor                                  string                           `json:"executor,omitempty"`
	ExecutorMode                              string                           `json:"executor_mode,omitempty"`
	AdapterName                               string                           `json:"adapter_name,omitempty"`
	AdapterVersion                            string                           `json:"adapter_version,omitempty"`
	AdapterType                               string                           `json:"adapter_type,omitempty"`
	Project                                   string                           `json:"project,omitempty"`
	Branch                                    string                           `json:"branch,omitempty"`
	CommitSHA                                 string                           `json:"commit_sha,omitempty"`
	Target                                    string                           `json:"target,omitempty"`
	Environment                               string                           `json:"environment,omitempty"`
	SandboxTraceAuditReport                   *executionresponse.PresenceValid `json:"sandbox_trace_audit_report,omitempty"`
	SandboxTraceReplayGate                    *executionresponse.PresenceValid `json:"sandbox_trace_replay_gate,omitempty"`
	SandboxTracePersistenceGate               *executionresponse.PresenceValid `json:"sandbox_trace_persistence_gate,omitempty"`
	SandboxTrace                              *executionresponse.PresenceValid `json:"sandbox_trace,omitempty"`
	SandboxAdapter                            *executionresponse.PresenceValid `json:"sandbox_adapter,omitempty"`
	ControlledRuntime                         *executionresponse.PresenceValid `json:"controlled_runtime,omitempty"`
	EvidenceBinding                           *executionresponse.PresenceValid `json:"evidence_binding,omitempty"`
	ResultVerification                        *executionresponse.PresenceValid `json:"result_verification,omitempty"`
	ResponseContract                          *executionresponse.PresenceValid `json:"response_contract,omitempty"`
	RequestEnvelope                           *executionresponse.PresenceValid `json:"request_envelope,omitempty"`
	AdapterInterface                          *executionresponse.PresenceValid `json:"adapter_interface,omitempty"`
	FinalAuthorization                        *executionresponse.PresenceValid `json:"final_authorization,omitempty"`
	Simulation                                *executionresponse.PresenceValid `json:"simulation,omitempty"`
	Firewall                                  *executionresponse.PresenceValid `json:"firewall,omitempty"`
	SovereignCandidate                        *executionresponse.PresenceValid `json:"sovereign_candidate,omitempty"`
	SandboxTraceAuditReportReadyDryRun        bool                             `json:"sandbox_trace_audit_report_ready_dry_run,omitempty"`
	AuditReportCandidate                      bool                             `json:"audit_report_candidate,omitempty"`
	ReplaySummaryReadyDryRun                  bool                             `json:"replay_summary_ready_dry_run,omitempty"`
	PersistenceSummaryReadyDryRun             bool                             `json:"persistence_summary_ready_dry_run,omitempty"`
	DeniedPermissionsSummaryReady             bool                             `json:"denied_permissions_summary_ready,omitempty"`
	BlockedActionsSummaryReady                bool                             `json:"blocked_actions_summary_ready,omitempty"`
	GateSummaryReadyDryRun                    bool                             `json:"gate_summary_ready_dry_run,omitempty"`
	BlockerSummaryReadyDryRun                 bool                             `json:"blocker_summary_ready_dry_run,omitempty"`
	RiskSummaryReadyDryRun                    bool                             `json:"risk_summary_ready_dry_run,omitempty"`
	ReadinessPreviewReadyDryRun               bool                             `json:"readiness_preview_ready_dry_run,omitempty"`
	ReportCompleteDryRun                      bool                             `json:"report_complete_dry_run,omitempty"`
	SandboxTraceReplayReadyDryRun             bool                             `json:"sandbox_trace_replay_ready_dry_run,omitempty"`
	ReplayCandidate                           bool                             `json:"replay_candidate,omitempty"`
	ReplayReferenceValidDryRun                bool                             `json:"replay_reference_valid_dry_run,omitempty"`
	EventOrderValidDryRun                     bool                             `json:"event_order_valid_dry_run,omitempty"`
	DeniedPermissionsReplayed                 bool                             `json:"denied_permissions_replayed,omitempty"`
	BlockedActionsReplayed                    bool                             `json:"blocked_actions_replayed,omitempty"`
	TraceHashVerifiedDryRun                   bool                             `json:"trace_hash_verified_dry_run,omitempty"`
	AuditIndexReplayableDryRun                bool                             `json:"audit_index_replayable_dry_run,omitempty"`
	ReplayCompleteDryRun                      bool                             `json:"replay_complete_dry_run,omitempty"`
	SandboxTracePersistenceReadyDryRun        bool                             `json:"sandbox_trace_persistence_ready_dry_run,omitempty"`
	PersistenceCandidate                      bool                             `json:"persistence_candidate,omitempty"`
	IsolatedStorageCandidate                  bool                             `json:"isolated_storage_candidate,omitempty"`
	TraceReplayReferenceReadyDryRun           bool                             `json:"trace_replay_reference_ready_dry_run,omitempty"`
	AuditIndexCandidate                       bool                             `json:"audit_index_candidate,omitempty"`
	SandboxTraceReadyDryRun                   bool                             `json:"sandbox_trace_ready_dry_run,omitempty"`
	TraceCompleteDryRun                       bool                             `json:"trace_complete_dry_run,omitempty"`
	DeniedPermissionsRecorded                 bool                             `json:"denied_permissions_recorded,omitempty"`
	BlockedActionsRecorded                    bool                             `json:"blocked_actions_recorded,omitempty"`
	SandboxAdapterReadyDryRun                 bool                             `json:"sandbox_adapter_ready_dry_run,omitempty"`
	SimulatedAdapterResponseReady             bool                             `json:"simulated_adapter_response_ready,omitempty"`
	RuntimeReadyDryRun                        bool                             `json:"runtime_ready_dry_run,omitempty"`
	ControlledRuntimeReady                    bool                             `json:"controlled_runtime_ready,omitempty"`
	PassGoldReal                              *executionresponse.PresenceValid `json:"pass_gold_real,omitempty"`
	PassSecureReal                            *executionresponse.PresenceValid `json:"pass_secure_real,omitempty"`
	RealGateDryRun                            bool                             `json:"real_gate_dry_run,omitempty"`
	RealGateSynthesized                       bool                             `json:"real_gate_synthesized,omitempty"`
	RealGateRecognizedByAuthority             bool                             `json:"real_gate_recognized_by_authority,omitempty"`
	HumanApproval                             *Approval                        `json:"human_approval,omitempty"`
	IndependentRevalidation                   *Revalidation                    `json:"independent_revalidation,omitempty"`
	ReadinessPolicy                           *executionresponse.PresenceValid `json:"readiness_policy,omitempty"`
	ReadinessScope                            *executionresponse.PresenceValid `json:"readiness_scope,omitempty"`
	ReadinessSchemaVersion                    string                           `json:"readiness_schema_version,omitempty"`
	ReadinessScorePolicy                      *executionresponse.PresenceValid `json:"readiness_score_policy,omitempty"`
	ReadinessThresholdPolicy                  *executionresponse.PresenceValid `json:"readiness_threshold_policy,omitempty"`
	ReadinessBlockerPolicy                    *executionresponse.PresenceValid `json:"readiness_blocker_policy,omitempty"`
	ReadinessRiskPolicy                       *executionresponse.PresenceValid `json:"readiness_risk_policy,omitempty"`
	ReadinessDeniedPermissionsPolicy          *executionresponse.PresenceValid `json:"readiness_denied_permissions_policy,omitempty"`
	RequiredBeforeV12Section                  *executionresponse.PresenceValid `json:"required_before_v12_section,omitempty"`
	V12IsolationRequirementsSection           *executionresponse.PresenceValid `json:"v12_isolation_requirements_section,omitempty"`
	V12ExecutionConstraintsSection            *executionresponse.PresenceValid `json:"v12_execution_constraints_section,omitempty"`
	V12RollbackRequirementsSection            *executionresponse.PresenceValid `json:"v12_rollback_requirements_section,omitempty"`
	V12LockRequirementsSection                *executionresponse.PresenceValid `json:"v12_lock_requirements_section,omitempty"`
	V12ObservabilityRequirementsSection       *executionresponse.PresenceValid `json:"v12_observability_requirements_section,omitempty"`
	V12ApprovalRequirementsSection            *executionresponse.PresenceValid `json:"v12_approval_requirements_section,omitempty"`
	V12AdapterRequirementsSection             *executionresponse.PresenceValid `json:"v12_adapter_requirements_section,omitempty"`
	V12CommandAllowlistRequirementsSection    *executionresponse.PresenceValid `json:"v12_command_allowlist_requirements_section,omitempty"`
	V12FilesystemIsolationRequirementsSection *executionresponse.PresenceValid `json:"v12_filesystem_isolation_requirements_section,omitempty"`
	V12NetworkPolicyRequirementsSection       *executionresponse.PresenceValid `json:"v12_network_policy_requirements_section,omitempty"`
	V12ArtifactPolicyRequirementsSection      *executionresponse.PresenceValid `json:"v12_artifact_policy_requirements_section,omitempty"`
	V12AuditPolicyRequirementsSection         *executionresponse.PresenceValid `json:"v12_audit_policy_requirements_section,omitempty"`
	V12KillSwitchRequirementsSection          *executionresponse.PresenceValid `json:"v12_kill_switch_requirements_section,omitempty"`
	ReadinessRecommendation                   string                           `json:"readiness_recommendation,omitempty"`
	CorrelationID                             string                           `json:"correlation_id,omitempty"`
	IdempotencyKey                            string                           `json:"idempotency_key,omitempty"`
	ReadinessRedactionPolicy                  *executionresponse.PresenceValid `json:"readiness_redaction_policy,omitempty"`
	ReadinessPrivacyPolicy                    *executionresponse.PresenceValid `json:"readiness_privacy_policy,omitempty"`
	ReadinessRetentionPolicy                  *executionresponse.PresenceValid `json:"readiness_retention_policy,omitempty"`
	ReadinessTamperEvidenceModel              *executionresponse.PresenceValid `json:"readiness_tamper_evidence_model,omitempty"`
	Claims                                    *SandboxReadinessClaims          `json:"claims,omitempty"`
}

type SandboxReadinessClaims struct {
	MCPExecutionAllowed            bool `json:"mcp_execution_allowed"`
	RealExecutionAllowed           bool `json:"real_execution_allowed"`
	IsolatedRealExecutionAllowed   bool `json:"isolated_real_execution_allowed"`
	RealAdapterCallAllowed         bool `json:"real_adapter_call_allowed"`
	AdapterCallAllowed             bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed            bool `json:"executor_call_allowed"`
	NetworkCallAllowed             bool `json:"network_call_allowed"`
	CommandExecutionAllowed        bool `json:"command_execution_allowed"`
	FileWriteAllowed               bool `json:"file_write_allowed"`
	DatabaseWriteAllowed           bool `json:"database_write_allowed"`
	LedgerWriteAllowed             bool `json:"ledger_write_allowed"`
	LedgerWritten                  bool `json:"ledger_written"`
	ReadinessPersistenceAllowed    bool `json:"readiness_persistence_allowed"`
	ReportPersistenceAllowed       bool `json:"report_persistence_allowed"`
	ReplayPersistenceAllowed       bool `json:"replay_persistence_allowed"`
	TracePersistenceAllowed        bool `json:"trace_persistence_allowed"`
	ReadinessPersisted             bool `json:"readiness_persisted"`
	ReportPersisted                bool `json:"report_persisted"`
	ReplayPersisted                bool `json:"replay_persisted"`
	TracePersisted                 bool `json:"trace_persisted"`
	DeployAllowed                  bool `json:"deploy_allowed"`
	PromotionAllowed               bool `json:"promotion_allowed"`
	StatusPublishAllowed           bool `json:"status_publish_allowed"`
	MemoryWriteAllowed             bool `json:"memory_write_allowed"`
	StablePromoted                 bool `json:"stable_promoted"`
	LearnedAsStable                bool `json:"learned_as_stable"`
	RealLockAcquired               bool `json:"real_lock_acquired"`
	RollbackPerformed              bool `json:"rollback_performed"`
	EvidenceTrusted                bool `json:"evidence_trusted"`
	ResultTrusted                  bool `json:"result_trusted"`
	TraceTrusted                   bool `json:"trace_trusted"`
	ReplayTrusted                  bool `json:"replay_trusted"`
	ReportTrusted                  bool `json:"report_trusted"`
	ReadinessTrusted               bool `json:"readiness_trusted"`
	PassGold                       bool `json:"pass_gold"`
	PassSecure                     bool `json:"pass_secure"`
	AuthorityGranted               bool `json:"authority_granted"`
	HumanApprovalBypassed          bool `json:"human_approval_bypassed"`
	RevalidationBypassed           bool `json:"revalidation_bypassed"`
	RuntimeBypassed                bool `json:"runtime_bypassed"`
	SandboxAdapterBypassed         bool `json:"sandbox_adapter_bypassed"`
	SandboxTraceBypassed           bool `json:"sandbox_trace_bypassed"`
	PersistenceGateBypassed        bool `json:"persistence_gate_bypassed"`
	ReplayGateBypassed             bool `json:"replay_gate_bypassed"`
	AuditReportBypassed            bool `json:"audit_report_bypassed"`
	EvidenceBindingBypassed        bool `json:"evidence_binding_bypassed"`
	VerificationBypassed           bool `json:"verification_bypassed"`
	ReadinessPolicyBypassed        bool `json:"readiness_policy_bypassed"`
	V12IsolationBypassed           bool `json:"v12_isolation_bypassed"`
	V12RollbackBypassed            bool `json:"v12_rollback_bypassed"`
	V12LockBypassed                bool `json:"v12_lock_bypassed"`
	V12ObservabilityBypassed       bool `json:"v12_observability_bypassed"`
	V12ApprovalBypassed            bool `json:"v12_approval_bypassed"`
	V12CommandAllowlistBypassed    bool `json:"v12_command_allowlist_bypassed"`
	V12FilesystemIsolationBypassed bool `json:"v12_filesystem_isolation_bypassed"`
	V12NetworkPolicyBypassed       bool `json:"v12_network_policy_bypassed"`
	V12KillSwitchBypassed          bool `json:"v12_kill_switch_bypassed"`
	SandboxEscaped                 bool `json:"sandbox_escaped"`
}

type SafetyDenials struct {
	MCPExecutionAllowed          bool `json:"mcp_execution_allowed"`
	RealExecutionAllowed         bool `json:"real_execution_allowed"`
	IsolatedRealExecutionAllowed bool `json:"isolated_real_execution_allowed"`
	RealAdapterCallAllowed       bool `json:"real_adapter_call_allowed"`
	AdapterCallAllowed           bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed          bool `json:"executor_call_allowed"`
	NetworkCallAllowed           bool `json:"network_call_allowed"`
	CommandExecutionAllowed      bool `json:"command_execution_allowed"`
	FileWriteAllowed             bool `json:"file_write_allowed"`
	DatabaseWriteAllowed         bool `json:"database_write_allowed"`
	LedgerWriteAllowed           bool `json:"ledger_write_allowed"`
	ReadinessPersistenceAllowed  bool `json:"readiness_persistence_allowed"`
	ReportPersistenceAllowed     bool `json:"report_persistence_allowed"`
	ReplayPersistenceAllowed     bool `json:"replay_persistence_allowed"`
	TracePersistenceAllowed      bool `json:"trace_persistence_allowed"`
	ReadinessPersisted           bool `json:"readiness_persisted"`
	ReportPersisted              bool `json:"report_persisted"`
	ReplayPersisted              bool `json:"replay_persisted"`
	TracePersisted               bool `json:"trace_persisted"`
	DeployAllowed                bool `json:"deploy_allowed"`
	PromotionAllowed             bool `json:"promotion_allowed"`
	StatusPublishAllowed         bool `json:"status_publish_allowed"`
	MutationAllowed              bool `json:"mutation_allowed"`
	MemoryWriteAllowed           bool `json:"memory_write_allowed"`
	StablePromotionAllowed       bool `json:"stable_promotion_allowed"`
	LearningAllowed              bool `json:"learning_allowed"`
	RealLockAllowed              bool `json:"real_lock_allowed"`
	RollbackAllowed              bool `json:"rollback_allowed"`
	EvidenceTrustAllowed         bool `json:"evidence_trust_allowed"`
	ResultTrustAllowed           bool `json:"result_trust_allowed"`
	TraceTrustAllowed            bool `json:"trace_trust_allowed"`
	ReplayTrustAllowed           bool `json:"replay_trust_allowed"`
	ReportTrustAllowed           bool `json:"report_trust_allowed"`
	ReadinessTrustAllowed        bool `json:"readiness_trust_allowed"`
	PassGoldAllowed              bool `json:"pass_gold_allowed"`
	PassSecureAllowed            bool `json:"pass_secure_allowed"`
	AuthorityGrantAllowed        bool `json:"authority_grant_allowed"`
}

type SandboxToControlledReadinessGate struct {
	SafetyDenials
	Version                               string   `json:"version"`
	DryRun                                bool     `json:"dry_run"`
	ReadOnly                              bool     `json:"read_only"`
	Sandbox                               bool     `json:"sandbox"`
	ReadinessMode                         string   `json:"readiness_mode"`
	NextPhase                             string   `json:"next_phase"`
	ReadinessStatus                       string   `json:"readiness_status"`
	Valid                                 bool     `json:"valid"`
	Blocked                               bool     `json:"blocked"`
	SandboxReadinessReadyDryRun           bool     `json:"sandbox_readiness_ready_dry_run"`
	SandboxToControlledExecutionCandidate bool     `json:"sandbox_to_controlled_execution_candidate"`
	V12TransitionCandidate                bool     `json:"v12_transition_candidate"`
	ReadinessScoreDryRun                  int      `json:"readiness_score_dry_run"`
	AuditReportSummaryReadyDryRun         bool     `json:"audit_report_summary_ready_dry_run"`
	ReplayGateSummaryReadyDryRun          bool     `json:"replay_gate_summary_ready_dry_run"`
	PersistenceGateSummaryReadyDryRun     bool     `json:"persistence_gate_summary_ready_dry_run"`
	TraceSummaryReadyDryRun               bool     `json:"trace_summary_ready_dry_run"`
	SandboxAdapterSummaryReadyDryRun      bool     `json:"sandbox_adapter_summary_ready_dry_run"`
	ControlledRuntimeSummaryReadyDryRun   bool     `json:"controlled_runtime_summary_ready_dry_run"`
	BlockerSummaryReadyDryRun             bool     `json:"blocker_summary_ready_dry_run"`
	RiskSummaryReadyDryRun                bool     `json:"risk_summary_ready_dry_run"`
	DeniedPermissionsSummaryReady         bool     `json:"denied_permissions_summary_ready"`
	RequiredBeforeV12ReadyDryRun          bool     `json:"required_before_v12_ready_dry_run"`
	ReadinessCompleteDryRun               bool     `json:"readiness_complete_dry_run"`
	RequiredBeforeV12                     []string `json:"required_before_v12"`
	BlockersBeforeV12                     []string `json:"blockers_before_v12"`
	RiskSummary                           []string `json:"risk_summary"`
	DeniedPermissionsSummary              []string `json:"denied_permissions_summary"`
	AlwaysDenied                          []string `json:"always_denied"`
	Recommendation                        string   `json:"recommendation"`
	RequiredItems                         []string `json:"required_items"`
	RequiredRealGates                     []string `json:"required_real_gates"`
	MissingItems                          []string `json:"missing_items"`
	UnsafeClaims                          []string `json:"unsafe_claims"`
	Conflicts                             []string `json:"conflicts"`
	BlockingReasons                       []string `json:"blocking_reasons"`
}
type SandboxToControlledReadinessValidation = SandboxToControlledReadinessGate

type SandboxReadinessBoundary struct {
	SafetyDenials
	Version              string   `json:"version"`
	DryRun               bool     `json:"dry_run"`
	ReadOnly             bool     `json:"read_only"`
	Sandbox              bool     `json:"sandbox"`
	ReadinessMode        string   `json:"readiness_mode"`
	NextPhase            string   `json:"next_phase"`
	RealExecutionAllowed bool     `json:"real_execution_allowed"`
	MCPCan               []string `json:"mcp_can"`
	MCPCannot            []string `json:"mcp_cannot"`
	AlwaysDenied         []string `json:"always_denied"`
}

type SandboxReadinessAudit struct {
	SafetyDenials
	Version                                  string   `json:"version"`
	DryRun                                   bool     `json:"dry_run"`
	ReadOnly                                 bool     `json:"read_only"`
	Sandbox                                  bool     `json:"sandbox"`
	ReadinessMode                            string   `json:"readiness_mode"`
	NextPhase                                string   `json:"next_phase"`
	RealExecutionAllowed                     bool     `json:"real_execution_allowed"`
	UnsafeClaimsFound                        bool     `json:"unsafe_claims_found"`
	UnsafeClaims                             []string `json:"unsafe_claims"`
	MissingItemsFound                        bool     `json:"missing_items_found"`
	MissingItems                             []string `json:"missing_items"`
	RealExecutionAttemptFound                bool     `json:"real_execution_attempt_found"`
	IsolatedRealExecutionAttemptFound        bool     `json:"isolated_real_execution_attempt_found"`
	RealAdapterCallAttemptFound              bool     `json:"real_adapter_call_attempt_found"`
	AdapterCallAttemptFound                  bool     `json:"adapter_call_attempt_found"`
	ExecutorCallAttemptFound                 bool     `json:"executor_call_attempt_found"`
	NetworkAttemptFound                      bool     `json:"network_attempt_found"`
	CommandAttemptFound                      bool     `json:"command_attempt_found"`
	FileWriteAttemptFound                    bool     `json:"file_write_attempt_found"`
	DatabaseWriteAttemptFound                bool     `json:"database_write_attempt_found"`
	ReadinessPersistenceAttemptFound         bool     `json:"readiness_persistence_attempt_found"`
	ReportPersistenceAttemptFound            bool     `json:"report_persistence_attempt_found"`
	ReplayPersistenceAttemptFound            bool     `json:"replay_persistence_attempt_found"`
	TracePersistenceAttemptFound             bool     `json:"trace_persistence_attempt_found"`
	LedgerWriteAttemptFound                  bool     `json:"ledger_write_attempt_found"`
	DeployAttemptFound                       bool     `json:"deploy_attempt_found"`
	PromotionAttemptFound                    bool     `json:"promotion_attempt_found"`
	StatusPublishAttemptFound                bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound                  bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound               bool     `json:"stable_learning_attempt_found"`
	TraceTrustAttemptFound                   bool     `json:"trace_trust_attempt_found"`
	ReplayTrustAttemptFound                  bool     `json:"replay_trust_attempt_found"`
	ReportTrustAttemptFound                  bool     `json:"report_trust_attempt_found"`
	ReadinessTrustAttemptFound               bool     `json:"readiness_trust_attempt_found"`
	EvidenceTrustAttemptFound                bool     `json:"evidence_trust_attempt_found"`
	ResultTrustAttemptFound                  bool     `json:"result_trust_attempt_found"`
	RealLockAttemptFound                     bool     `json:"real_lock_attempt_found"`
	RollbackAttemptFound                     bool     `json:"rollback_attempt_found"`
	AutoGoldAttemptFound                     bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound               bool     `json:"authority_grant_attempt_found"`
	HumanApprovalBypassAttemptFound          bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound           bool     `json:"revalidation_bypass_attempt_found"`
	RuntimeBypassAttemptFound                bool     `json:"runtime_bypass_attempt_found"`
	SandboxAdapterBypassAttemptFound         bool     `json:"sandbox_adapter_bypass_attempt_found"`
	SandboxTraceBypassAttemptFound           bool     `json:"sandbox_trace_bypass_attempt_found"`
	PersistenceGateBypassAttemptFound        bool     `json:"persistence_gate_bypass_attempt_found"`
	ReplayGateBypassAttemptFound             bool     `json:"replay_gate_bypass_attempt_found"`
	AuditReportBypassAttemptFound            bool     `json:"audit_report_bypass_attempt_found"`
	EvidenceBindingBypassAttemptFound        bool     `json:"evidence_binding_bypass_attempt_found"`
	VerificationBypassAttemptFound           bool     `json:"verification_bypass_attempt_found"`
	ReadinessPolicyBypassAttemptFound        bool     `json:"readiness_policy_bypass_attempt_found"`
	V12IsolationBypassAttemptFound           bool     `json:"v12_isolation_bypass_attempt_found"`
	V12RollbackBypassAttemptFound            bool     `json:"v12_rollback_bypass_attempt_found"`
	V12LockBypassAttemptFound                bool     `json:"v12_lock_bypass_attempt_found"`
	V12ObservabilityBypassAttemptFound       bool     `json:"v12_observability_bypass_attempt_found"`
	V12ApprovalBypassAttemptFound            bool     `json:"v12_approval_bypass_attempt_found"`
	V12CommandAllowlistBypassAttemptFound    bool     `json:"v12_command_allowlist_bypass_attempt_found"`
	V12FilesystemIsolationBypassAttemptFound bool     `json:"v12_filesystem_isolation_bypass_attempt_found"`
	V12NetworkPolicyBypassAttemptFound       bool     `json:"v12_network_policy_bypass_attempt_found"`
	V12KillSwitchBypassAttemptFound          bool     `json:"v12_kill_switch_bypass_attempt_found"`
	SandboxEscapeAttemptFound                bool     `json:"sandbox_escape_attempt_found"`
}

type SandboxReadinessExplain struct {
	SafetyDenials
	Version                                                           string   `json:"version"`
	DryRun                                                            bool     `json:"dry_run"`
	ReadOnly                                                          bool     `json:"read_only"`
	Sandbox                                                           bool     `json:"sandbox"`
	ReadinessMode                                                     string   `json:"readiness_mode"`
	NextPhase                                                         string   `json:"next_phase"`
	RealExecutionAllowed                                              bool     `json:"real_execution_allowed"`
	WhyReadinessGateIsNotExecution                                    []string `json:"why_readiness_gate_is_not_execution"`
	WhyReadinessGateIsNotV12Release                                   []string `json:"why_readiness_gate_is_not_v12_release"`
	WhyReadinessGateIsNotPersistence                                  []string `json:"why_readiness_gate_is_not_persistence"`
	WhyReadinessTrustIsBlocked                                        []string `json:"why_readiness_trust_is_blocked"`
	WhyFileWriteIsBlockedInsideMCP                                    []string `json:"why_file_write_is_blocked_inside_mcp"`
	WhyDatabaseWriteIsBlockedInsideMCP                                []string `json:"why_database_write_is_blocked_inside_mcp"`
	WhyLedgerWriteIsBlockedInsideMCP                                  []string `json:"why_ledger_write_is_blocked_inside_mcp"`
	WhySandboxTraceAuditReportIsRequired                              []string `json:"why_sandbox_trace_audit_report_is_required"`
	WhySandboxTraceReplayGateIsRequired                               []string `json:"why_sandbox_trace_replay_gate_is_required"`
	WhySandboxTracePersistenceGateIsRequired                          []string `json:"why_sandbox_trace_persistence_gate_is_required"`
	WhySandboxTraceIsRequired                                         []string `json:"why_sandbox_trace_is_required"`
	WhySandboxAdapterIsRequired                                       []string `json:"why_sandbox_adapter_is_required"`
	WhyControlledRuntimeIsRequired                                    []string `json:"why_controlled_runtime_is_required"`
	WhyEvidenceBindingIsRequired                                      []string `json:"why_evidence_binding_is_required"`
	WhyResultVerificationIsRequired                                   []string `json:"why_result_verification_is_required"`
	WhyFinalAuthorizationIsRequired                                   []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                                           []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired                        []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyV12RequiresIsolationLockRollbackObservabilityApprovalAllowlist []string `json:"why_v12_requires_isolation_lock_rollback_observability_approval_allowlist"`
	WhyV120IsNextExplicitRuntimeRelease                               []string `json:"why_v12_0_is_next_explicit_runtime_release"`
	RequiredGates                                                     []string `json:"required_gates"`
	AlwaysDenied                                                      []string `json:"always_denied"`
}

func BuildSandboxToControlledReadinessGate(input SandboxToControlledReadinessInput) SandboxToControlledReadinessGate {
	return validate(input)
}
func ValidateSandboxToControlledReadinessGate(input SandboxToControlledReadinessInput) SandboxToControlledReadinessValidation {
	return validate(input)
}

func BuildSandboxReadinessBoundary() SandboxReadinessBoundary {
	return SandboxReadinessBoundary{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, ReadinessMode: ReadinessMode, NextPhase: NextPhase, RealExecutionAllowed: false, MCPCan: []string{"read", "validate", "audit", "explain", "simulate sandbox-to-controlled execution readiness gate", "build readiness decision payload", "summarize V11 sandbox chain in response payload", "summarize V12 requirements in response payload", "summarize blockers before V12 in response payload", "summarize risks before V12 in response payload", "return readiness decision in response payload"}, MCPCannot: []string{"execute", "execute_runtime", "execute_isolated_runtime", "call_real_adapter", "call_executor", "network_call", "command_execution", "file_write", "database_write", "persist_trace", "persist_replay", "persist_report", "persist_readiness", "write_ledger", "deploy", "promote", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "trust_trace", "trust_replay", "trust_report", "trust_readiness", "trust_evidence", "trust_result", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}, AlwaysDenied: clone(denied)}
}

func AuditSandboxReadinessGate(input SandboxToControlledReadinessInput) SandboxReadinessAudit {
	v := validate(input)
	c := input.Claims
	a := SandboxReadinessAudit{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, ReadinessMode: ReadinessMode, NextPhase: NextPhase, RealExecutionAllowed: false, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems}
	if c == nil {
		return a
	}
	a.RealExecutionAttemptFound = c.RealExecutionAllowed || c.MCPExecutionAllowed
	a.IsolatedRealExecutionAttemptFound = c.IsolatedRealExecutionAllowed
	a.RealAdapterCallAttemptFound = c.RealAdapterCallAllowed
	a.AdapterCallAttemptFound = c.AdapterCallAllowed || c.RealAdapterCallAllowed
	a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
	a.NetworkAttemptFound = c.NetworkCallAllowed
	a.CommandAttemptFound = c.CommandExecutionAllowed
	a.FileWriteAttemptFound = c.FileWriteAllowed
	a.DatabaseWriteAttemptFound = c.DatabaseWriteAllowed
	a.ReadinessPersistenceAttemptFound = c.ReadinessPersistenceAllowed || c.ReadinessPersisted
	a.ReportPersistenceAttemptFound = c.ReportPersistenceAllowed || c.ReportPersisted
	a.ReplayPersistenceAttemptFound = c.ReplayPersistenceAllowed || c.ReplayPersisted
	a.TracePersistenceAttemptFound = c.TracePersistenceAllowed || c.TracePersisted
	a.LedgerWriteAttemptFound = c.LedgerWriteAllowed || c.LedgerWritten
	a.DeployAttemptFound = c.DeployAllowed
	a.PromotionAttemptFound = c.PromotionAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
	a.MemoryWriteAttemptFound = c.MemoryWriteAllowed
	a.StableLearningAttemptFound = c.LearnedAsStable || c.StablePromoted
	a.TraceTrustAttemptFound = c.TraceTrusted
	a.ReplayTrustAttemptFound = c.ReplayTrusted
	a.ReportTrustAttemptFound = c.ReportTrusted
	a.ReadinessTrustAttemptFound = c.ReadinessTrusted
	a.EvidenceTrustAttemptFound = c.EvidenceTrusted
	a.ResultTrustAttemptFound = c.ResultTrusted
	a.RealLockAttemptFound = c.RealLockAcquired
	a.RollbackAttemptFound = c.RollbackPerformed
	a.AutoGoldAttemptFound = c.PassGold || c.PassSecure
	a.AuthorityGrantAttemptFound = c.AuthorityGranted
	a.HumanApprovalBypassAttemptFound = c.HumanApprovalBypassed
	a.RevalidationBypassAttemptFound = c.RevalidationBypassed
	a.RuntimeBypassAttemptFound = c.RuntimeBypassed
	a.SandboxAdapterBypassAttemptFound = c.SandboxAdapterBypassed
	a.SandboxTraceBypassAttemptFound = c.SandboxTraceBypassed
	a.PersistenceGateBypassAttemptFound = c.PersistenceGateBypassed
	a.ReplayGateBypassAttemptFound = c.ReplayGateBypassed
	a.AuditReportBypassAttemptFound = c.AuditReportBypassed
	a.EvidenceBindingBypassAttemptFound = c.EvidenceBindingBypassed
	a.VerificationBypassAttemptFound = c.VerificationBypassed
	a.ReadinessPolicyBypassAttemptFound = c.ReadinessPolicyBypassed
	a.V12IsolationBypassAttemptFound = c.V12IsolationBypassed
	a.V12RollbackBypassAttemptFound = c.V12RollbackBypassed
	a.V12LockBypassAttemptFound = c.V12LockBypassed
	a.V12ObservabilityBypassAttemptFound = c.V12ObservabilityBypassed
	a.V12ApprovalBypassAttemptFound = c.V12ApprovalBypassed
	a.V12CommandAllowlistBypassAttemptFound = c.V12CommandAllowlistBypassed
	a.V12FilesystemIsolationBypassAttemptFound = c.V12FilesystemIsolationBypassed
	a.V12NetworkPolicyBypassAttemptFound = c.V12NetworkPolicyBypassed
	a.V12KillSwitchBypassAttemptFound = c.V12KillSwitchBypassed
	a.SandboxEscapeAttemptFound = c.SandboxEscaped
	return a
}

func ExplainSandboxReadinessGate(input SandboxToControlledReadinessInput) SandboxReadinessExplain {
	return SandboxReadinessExplain{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, ReadinessMode: ReadinessMode, NextPhase: NextPhase, RealExecutionAllowed: false, WhyReadinessGateIsNotExecution: []string{"V11.6 returns an advisory readiness decision payload only and cannot execute runtimes, commands, adapters, or external systems."}, WhyReadinessGateIsNotV12Release: []string{"V11.6 closes sandbox/read-only review but is not the V12.0 isolated controlled execution runtime release."}, WhyReadinessGateIsNotPersistence: []string{"readiness output is never stored by this MCP control plane; persistence needs a future explicit release."}, WhyReadinessTrustIsBlocked: []string{"readiness summarizes prerequisites but does not trust readiness, reports, replay, traces, evidence, or results automatically."}, WhyFileWriteIsBlockedInsideMCP: []string{"MCP is read-only; file writes would mutate the workspace and are always denied."}, WhyDatabaseWriteIsBlockedInsideMCP: []string{"Database writes would persist readiness state and are outside V11.6."}, WhyLedgerWriteIsBlockedInsideMCP: []string{"Ledger writes imply durable authority and remain blocked."}, WhySandboxTraceAuditReportIsRequired: []string{"V11.5 audit report evidence is required before V11.6 can summarize the full sandbox chain."}, WhySandboxTraceReplayGateIsRequired: []string{"V11.4 replay gate evidence is required to reconstruct event order, denied permissions, blocked actions, hashes, and audit indexes."}, WhySandboxTracePersistenceGateIsRequired: []string{"V11.3 persistence gate evidence is required to prove trace persistence is only a future candidate."}, WhySandboxTraceIsRequired: []string{"V11.2 sandbox trace is the dry-run event source for the readiness decision."}, WhySandboxAdapterIsRequired: []string{"V11.1 sandbox/noop adapter evidence prevents real adapter activity from being considered valid."}, WhyControlledRuntimeIsRequired: []string{"V11.0 controlled runtime bounds runtime identity and external-only mode without executing."}, WhyEvidenceBindingIsRequired: []string{"V10.8 evidence binding links evidence to prior gates without trust escalation."}, WhyResultVerificationIsRequired: []string{"V10.7 result verification is a prerequisite for advisory readiness."}, WhyFinalAuthorizationIsRequired: []string{"V10.3 final authorization remains a prerequisite even though V11.6 grants no authority."}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real, non-dry-run, non-synthesized, and recognized by authority before V12 review."}, WhyHumanApprovalAndRevalidationAreRequired: []string{"Real human approval and independent revalidation prevent automatic transition from dry-run readiness to execution."}, WhyV12RequiresIsolationLockRollbackObservabilityApprovalAllowlist: []string{"V12.0 must define isolation, lock, rollback, observability, approval, adapter, command allowlist, filesystem, network, artifact, audit, and kill-switch requirements before any isolated execution."}, WhyV120IsNextExplicitRuntimeRelease: []string{"The next explicit runtime phase is V12.0 isolated controlled execution runtime; V11.6 only prepares its review."}, RequiredGates: clone(requiredGates), AlwaysDenied: clone(denied)}
}

func validate(input SandboxToControlledReadinessInput) SandboxToControlledReadinessGate {
	var missing, conflicts, unsafe []string
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	for name, val := range map[string]string{"readiness_gate_id": input.ReadinessGateID, "audit_report_id": input.AuditReportID, "replay_gate_id": input.ReplayGateID, "persistence_gate_id": input.PersistenceGateID, "sandbox_trace_id": input.SandboxTraceID, "sandbox_adapter_id": input.SandboxAdapterID, "runtime_id": input.RuntimeID, "runtime_session_id": input.RuntimeSessionID, "evidence_binding_id": input.EvidenceBindingID, "verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target} {
		if strings.TrimSpace(val) == "" {
			addMissing(name)
		}
	}
	if input.Executor == "mcp" || input.Executor == "mcp_readonly" {
		addConflict("executor_must_not_be_mcp")
	}
	if input.ExecutorMode == "" {
		addMissing("executor_mode")
	} else if input.ExecutorMode != "external_only" {
		addConflict("executor_mode_must_be_external_only")
	}
	if input.AdapterType == "" {
		addMissing("adapter_type")
	} else if input.AdapterType != "sandbox_noop" {
		addConflict("adapter_type_must_be_sandbox_noop")
	}
	if input.Environment == "" {
		addMissing("environment")
	} else if input.Environment != "sandbox" && input.Environment != "local_sandbox" {
		addConflict("environment_must_be_sandbox_or_local_sandbox")
	}
	validatePresence(input.SandboxTraceAuditReport, addMissing, addConflict, "sandbox_trace_audit_report", StatusSandboxTraceAuditReportMissing, StatusSandboxTraceAuditReportBlocked)
	requireBool(input.SandboxTraceAuditReportReadyDryRun, "sandbox_trace_audit_report_ready_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.AuditReportCandidate, "audit_report_candidate", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.ReplaySummaryReadyDryRun, "replay_summary_ready_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.PersistenceSummaryReadyDryRun, "persistence_summary_ready_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.DeniedPermissionsSummaryReady, "denied_permissions_summary_ready", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.BlockedActionsSummaryReady, "blocked_actions_summary_ready", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.GateSummaryReadyDryRun, "gate_summary_ready_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.BlockerSummaryReadyDryRun, "blocker_summary_ready_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.RiskSummaryReadyDryRun, "risk_summary_ready_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.ReadinessPreviewReadyDryRun, "readiness_preview_ready_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	requireBool(input.ReportCompleteDryRun, "report_complete_dry_run", StatusSandboxTraceAuditReportBlocked, addConflict)
	validatePresence(input.SandboxTraceReplayGate, addMissing, addConflict, "sandbox_trace_replay_gate", StatusSandboxTraceReplayMissing, StatusSandboxTraceReplayBlocked)
	for _, pair := range []struct {
		b bool
		n string
	}{{input.SandboxTraceReplayReadyDryRun, "sandbox_trace_replay_ready_dry_run"}, {input.ReplayCandidate, "replay_candidate"}, {input.ReplayReferenceValidDryRun, "replay_reference_valid_dry_run"}, {input.EventOrderValidDryRun, "event_order_valid_dry_run"}, {input.DeniedPermissionsReplayed, "denied_permissions_replayed"}, {input.BlockedActionsReplayed, "blocked_actions_replayed"}, {input.TraceHashVerifiedDryRun, "trace_hash_verified_dry_run"}, {input.AuditIndexReplayableDryRun, "audit_index_replayable_dry_run"}, {input.ReplayCompleteDryRun, "replay_complete_dry_run"}} {
		requireBool(pair.b, pair.n, StatusSandboxTraceReplayBlocked, addConflict)
	}
	validatePresence(input.SandboxTracePersistenceGate, addMissing, addConflict, "sandbox_trace_persistence_gate", StatusSandboxTracePersistenceMissing, StatusSandboxTracePersistenceBlocked)
	for _, pair := range []struct {
		b bool
		n string
	}{{input.SandboxTracePersistenceReadyDryRun, "sandbox_trace_persistence_ready_dry_run"}, {input.PersistenceCandidate, "persistence_candidate"}, {input.IsolatedStorageCandidate, "isolated_storage_candidate"}, {input.TraceReplayReferenceReadyDryRun, "trace_replay_reference_ready_dry_run"}, {input.AuditIndexCandidate, "audit_index_candidate"}} {
		requireBool(pair.b, pair.n, StatusSandboxTracePersistenceBlocked, addConflict)
	}
	validatePresence(input.SandboxTrace, addMissing, addConflict, "sandbox_trace", StatusSandboxTraceMissing, StatusSandboxTraceBlocked)
	for _, pair := range []struct {
		b     bool
		n, st string
	}{{input.SandboxTraceReadyDryRun, "sandbox_trace_ready_dry_run", StatusSandboxTraceBlocked}, {input.TraceCompleteDryRun, "trace_complete_dry_run", StatusSandboxTraceBlocked}, {input.DeniedPermissionsRecorded, "denied_permissions_recorded", StatusSandboxTraceBlocked}, {input.BlockedActionsRecorded, "blocked_actions_recorded", StatusSandboxTraceBlocked}, {input.SandboxAdapterReadyDryRun, "sandbox_adapter_ready_dry_run", StatusSandboxAdapterBlocked}, {input.SimulatedAdapterResponseReady, "simulated_adapter_response_ready", StatusSandboxAdapterBlocked}, {input.RuntimeReadyDryRun, "runtime_ready_dry_run", StatusControlledRuntimeBlocked}, {input.ControlledRuntimeReady, "controlled_runtime_ready", StatusControlledRuntimeBlocked}} {
		requireBool(pair.b, pair.n, pair.st, addConflict)
	}
	validatePresence(input.SandboxAdapter, addMissing, addConflict, "sandbox_adapter", StatusSandboxAdapterMissing, StatusSandboxAdapterBlocked)
	validatePresence(input.ControlledRuntime, addMissing, addConflict, "controlled_runtime", StatusControlledRuntimeMissing, StatusControlledRuntimeBlocked)
	validatePresence(input.EvidenceBinding, addMissing, addConflict, "evidence_binding", StatusEvidenceBindingMissing, StatusEvidenceBindingBlocked)
	validatePresence(input.ResultVerification, addMissing, addConflict, "result_verification", StatusResultVerificationMissing, StatusResultVerificationBlocked)
	validatePresence(input.ResponseContract, addMissing, addConflict, "response_contract", StatusResponseContractMissing, StatusResponseContractBlocked)
	validatePresence(input.RequestEnvelope, addMissing, addConflict, "request_envelope", StatusRequestEnvelopeMissing, StatusRequestEnvelopeBlocked)
	validatePresence(input.AdapterInterface, addMissing, addConflict, "adapter_interface", StatusAdapterInterfaceMissing, StatusAdapterInterfaceBlocked)
	validatePresence(input.FinalAuthorization, addMissing, addConflict, "final_authorization", StatusFinalAuthorizationMissing, StatusFinalAuthorizationBlocked)
	validatePresence(input.Simulation, addMissing, addConflict, "simulation", StatusSimulationMissing, StatusSimulationBlocked)
	validatePresence(input.Firewall, addMissing, addConflict, "firewall", StatusFirewallMissing, StatusFirewallBlocked)
	validatePresence(input.SovereignCandidate, addMissing, addConflict, "sovereign_candidate", StatusSovereignCandidateMissing, StatusSovereignCandidateMissing)
	if input.PassGoldReal == nil || !input.PassGoldReal.Present || !input.PassGoldReal.Valid || input.PassSecureReal == nil || !input.PassSecureReal.Present || !input.PassSecureReal.Valid || input.RealGateDryRun || input.RealGateSynthesized || !input.RealGateRecognizedByAuthority {
		addConflict(StatusMissingRealGates)
	}
	if input.HumanApproval == nil || !input.HumanApproval.Present || input.HumanApproval.Placeholder || input.HumanApproval.ApprovalIsPlaceholder || !input.HumanApproval.Approved || !input.HumanApproval.Valid {
		addConflict(StatusHumanApprovalRequired)
	}
	if input.IndependentRevalidation == nil || !input.IndependentRevalidation.Present || input.IndependentRevalidation.Placeholder || input.IndependentRevalidation.RevalidationIsPlaceholder || !input.IndependentRevalidation.Completed || !input.IndependentRevalidation.PassGoldRevalidated || !input.IndependentRevalidation.PassSecureRevalidated || !input.IndependentRevalidation.Valid {
		addConflict(StatusRevalidationRequired)
	}
	validatePresence(input.ReadinessPolicy, addMissing, addConflict, "readiness_policy", StatusReadinessPolicyMissing, StatusReadinessPolicyMissing)
	validatePresence(input.ReadinessScope, addMissing, addConflict, "readiness_scope", StatusReadinessScopeMissing, StatusReadinessScopeMissing)
	if input.ReadinessSchemaVersion == "" {
		addMissing("readiness_schema_version")
		addConflict(StatusReadinessSchemaVersionMissing)
	}
	for _, p := range []struct {
		pv       *executionresponse.PresenceValid
		name, st string
	}{{input.ReadinessScorePolicy, "readiness_score_policy", StatusReadinessScorePolicyMissing}, {input.ReadinessThresholdPolicy, "readiness_threshold_policy", StatusReadinessThresholdPolicyMissing}, {input.ReadinessBlockerPolicy, "readiness_blocker_policy", StatusReadinessBlockerPolicyMissing}, {input.ReadinessRiskPolicy, "readiness_risk_policy", StatusReadinessRiskPolicyMissing}, {input.ReadinessDeniedPermissionsPolicy, "readiness_denied_permissions_policy", StatusReadinessDeniedPermissionsPolicyMissing}, {input.RequiredBeforeV12Section, "required_before_v12_section", StatusRequiredBeforeV12Missing}, {input.V12IsolationRequirementsSection, "v12_isolation_requirements_section", StatusV12IsolationRequirementsMissing}, {input.V12ExecutionConstraintsSection, "v12_execution_constraints_section", StatusV12ExecutionConstraintsMissing}, {input.V12RollbackRequirementsSection, "v12_rollback_requirements_section", StatusV12RollbackRequirementsMissing}, {input.V12LockRequirementsSection, "v12_lock_requirements_section", StatusV12LockRequirementsMissing}, {input.V12ObservabilityRequirementsSection, "v12_observability_requirements_section", StatusV12ObservabilityRequirementsMissing}, {input.V12ApprovalRequirementsSection, "v12_approval_requirements_section", StatusV12ApprovalRequirementsMissing}, {input.V12AdapterRequirementsSection, "v12_adapter_requirements_section", StatusV12AdapterRequirementsMissing}, {input.V12CommandAllowlistRequirementsSection, "v12_command_allowlist_requirements_section", StatusV12CommandAllowlistRequirementsMissing}, {input.V12FilesystemIsolationRequirementsSection, "v12_filesystem_isolation_requirements_section", StatusV12FilesystemIsolationRequirementsMissing}, {input.V12NetworkPolicyRequirementsSection, "v12_network_policy_requirements_section", StatusV12NetworkPolicyRequirementsMissing}, {input.V12ArtifactPolicyRequirementsSection, "v12_artifact_policy_requirements_section", StatusV12ArtifactPolicyRequirementsMissing}, {input.V12AuditPolicyRequirementsSection, "v12_audit_policy_requirements_section", StatusV12AuditPolicyRequirementsMissing}, {input.V12KillSwitchRequirementsSection, "v12_kill_switch_requirements_section", StatusV12KillSwitchRequirementsMissing}, {input.ReadinessRedactionPolicy, "readiness_redaction_policy", StatusReadinessRedactionPolicyMissing}, {input.ReadinessPrivacyPolicy, "readiness_privacy_policy", StatusReadinessPrivacyPolicyMissing}, {input.ReadinessRetentionPolicy, "readiness_retention_policy", StatusReadinessRetentionPolicyMissing}, {input.ReadinessTamperEvidenceModel, "readiness_tamper_evidence_model", StatusReadinessTamperEvidenceMissing}} {
		validatePresence(p.pv, addMissing, addConflict, p.name, p.st, p.st)
	}
	if input.ReadinessRecommendation != "eligible_for_future_v12_isolated_runtime_review" && input.ReadinessRecommendation != "do_not_execute_yet" {
		addMissing("readiness_recommendation")
		addConflict(StatusReadinessRecommendationMissing)
	}
	if input.CorrelationID == "" {
		addMissing("correlation_id")
		addConflict(StatusCorrelationIDMissing)
	}
	if input.IdempotencyKey == "" {
		addMissing("idempotency_key")
		addConflict(StatusIdempotencyMissing)
	}
	unsafe = unsafeClaims(input.Claims)
	for _, u := range unsafe {
		mapUnsafeStatus(u, addConflict)
	}
	blocking := appendUniqueList(missing, conflicts...)
	blocked := len(blocking) > 0 || len(unsafe) > 0
	valid := !blocked
	status := StatusSandboxReadinessReadyDryRun
	if len(missing) > 0 {
		status = StatusIncomplete
	}
	if len(conflicts) > 0 || len(unsafe) > 0 {
		status = StatusBlocked
	}
	for _, st := range []string{StatusSandboxTraceAuditReportMissing, StatusSandboxTraceAuditReportBlocked, StatusSandboxTraceReplayMissing, StatusSandboxTraceReplayBlocked, StatusSandboxTracePersistenceMissing, StatusSandboxTracePersistenceBlocked, StatusSandboxTraceMissing, StatusSandboxTraceBlocked, StatusSandboxAdapterMissing, StatusSandboxAdapterBlocked, StatusControlledRuntimeMissing, StatusControlledRuntimeBlocked, StatusMissingRealGates, StatusHumanApprovalRequired, StatusRevalidationRequired} {
		if contains(missing, strings.TrimSuffix(st, "_missing")) || contains(conflicts, st) {
			status = st
			break
		}
	}
	rec := "do_not_execute_yet"
	if valid {
		rec = "eligible_for_future_v12_isolated_runtime_review"
	}
	return SandboxToControlledReadinessGate{Version: Version, DryRun: true, ReadOnly: true, Sandbox: true, ReadinessMode: ReadinessMode, NextPhase: NextPhase, ReadinessStatus: status, Valid: valid, Blocked: blocked, SandboxReadinessReadyDryRun: valid, SandboxToControlledExecutionCandidate: valid, V12TransitionCandidate: valid, ReadinessScoreDryRun: score(valid), AuditReportSummaryReadyDryRun: valid, ReplayGateSummaryReadyDryRun: valid, PersistenceGateSummaryReadyDryRun: valid, TraceSummaryReadyDryRun: valid, SandboxAdapterSummaryReadyDryRun: valid, ControlledRuntimeSummaryReadyDryRun: valid, BlockerSummaryReadyDryRun: true, RiskSummaryReadyDryRun: true, DeniedPermissionsSummaryReady: true, RequiredBeforeV12ReadyDryRun: true, ReadinessCompleteDryRun: valid, RequiredBeforeV12: requiredBeforeV12(), BlockersBeforeV12: blocking, RiskSummary: riskSummary(blocked), DeniedPermissionsSummary: clone(denied), AlwaysDenied: clone(denied), Recommendation: rec, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking}
}

func requireBool(ok bool, name, status string, addConflict func(string)) {
	if !ok {
		addConflict(name + "=false")
		addConflict(status)
	}
}
func validatePresence(p *executionresponse.PresenceValid, addMissing, addConflict func(string), name, missingStatus, blockedStatus string) {
	if p == nil || !p.Present {
		addMissing(name)
		addConflict(missingStatus)
		return
	}
	if !p.Valid {
		addConflict(blockedStatus)
	}
}
func unsafeClaims(c *SandboxReadinessClaims) []string {
	if c == nil {
		return nil
	}
	var out []string
	add := func(cond bool, n string) {
		if cond {
			out = appendUnique(out, n)
		}
	}
	add(c.MCPExecutionAllowed, "mcp_execution_allowed")
	add(c.RealExecutionAllowed, "real_execution_allowed")
	add(c.IsolatedRealExecutionAllowed, "isolated_real_execution_allowed")
	add(c.RealAdapterCallAllowed, "real_adapter_call_allowed")
	add(c.AdapterCallAllowed, "adapter_call_allowed")
	add(c.ExecutorCallAllowed, "executor_call_allowed")
	add(c.NetworkCallAllowed, "network_call_allowed")
	add(c.CommandExecutionAllowed, "command_execution_allowed")
	add(c.FileWriteAllowed, "file_write_allowed")
	add(c.DatabaseWriteAllowed, "database_write_allowed")
	add(c.LedgerWriteAllowed || c.LedgerWritten, "ledger_written")
	add(c.ReadinessPersistenceAllowed || c.ReadinessPersisted, "readiness_persisted")
	add(c.ReportPersistenceAllowed || c.ReportPersisted, "report_persisted")
	add(c.ReplayPersistenceAllowed || c.ReplayPersisted, "replay_persisted")
	add(c.TracePersistenceAllowed || c.TracePersisted, "trace_persisted")
	add(c.DeployAllowed, "deploy_allowed")
	add(c.PromotionAllowed, "promotion_allowed")
	add(c.StatusPublishAllowed, "status_publish_allowed")
	add(c.MemoryWriteAllowed, "memory_write_allowed")
	add(c.StablePromoted, "stable_promoted")
	add(c.LearnedAsStable, "learned_as_stable")
	add(c.RealLockAcquired, "real_lock_acquired")
	add(c.RollbackPerformed, "rollback_performed")
	add(c.EvidenceTrusted, "evidence_trusted")
	add(c.ResultTrusted, "result_trusted")
	add(c.TraceTrusted, "trace_trusted")
	add(c.ReplayTrusted, "replay_trusted")
	add(c.ReportTrusted, "report_trusted")
	add(c.ReadinessTrusted, "readiness_trusted")
	add(c.PassGold, "pass_gold")
	add(c.PassSecure, "pass_secure")
	add(c.AuthorityGranted, "authority_granted")
	return out
}
func mapUnsafeStatus(c string, addConflict func(string)) {
	switch c {
	case "real_execution_allowed", "mcp_execution_allowed":
		addConflict(StatusUnsafeRealExecutionAttempt)
	case "isolated_real_execution_allowed":
		addConflict(StatusUnsafeIsolatedRealExecutionAttempt)
	case "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed":
		addConflict(StatusUnsafeRealAdapterCallAttempt)
	case "network_call_allowed":
		addConflict(StatusUnsafeNetworkAttempt)
	case "command_execution_allowed":
		addConflict(StatusUnsafeCommandAttempt)
	case "file_write_allowed":
		addConflict(StatusUnsafeFileWriteAttempt)
	case "database_write_allowed":
		addConflict(StatusUnsafeDatabaseWriteAttempt)
	case "readiness_persisted":
		addConflict(StatusUnsafeReadinessPersistenceAttempt)
	case "report_persisted":
		addConflict(StatusUnsafeReportPersistenceAttempt)
	case "replay_persisted":
		addConflict(StatusUnsafeReplayPersistenceAttempt)
	case "trace_persisted":
		addConflict(StatusUnsafeTracePersistenceAttempt)
	case "ledger_written":
		addConflict(StatusUnsafeLedgerWriteAttempt)
	case "deploy_allowed":
		addConflict(StatusUnsafeDeployAttempt)
	case "promotion_allowed":
		addConflict(StatusUnsafePromotionAttempt)
	case "status_publish_allowed":
		addConflict(StatusUnsafeStatusPublishAttempt)
	case "memory_write_allowed", "stable_promoted", "learned_as_stable":
		addConflict(StatusUnsafeMemoryWriteAttempt)
	case "evidence_trusted", "result_trusted", "trace_trusted", "replay_trusted", "report_trusted", "readiness_trusted", "pass_gold", "pass_secure", "authority_granted":
		addConflict(StatusUnsafeTrustEscalationAttempt)
	}
}
func score(valid bool) int {
	if valid {
		return 100
	}
	return 0
}
func requiredBeforeV12() []string {
	return []string{"real PASS_GOLD and PASS_SECURE", "human approval", "independent revalidation", "V12 isolation requirements", "V12 lock requirements", "V12 rollback requirements", "V12 observability requirements", "V12 approval requirements", "V12 command allowlist", "V12 filesystem isolation", "V12 network policy", "V12 kill switch"}
}
func riskSummary(blocked bool) []string {
	if blocked {
		return []string{"readiness blocked until missing or unsafe prerequisites are resolved", "no execution authority granted"}
	}
	return []string{"advisory readiness candidate only", "future V12 review still required", "no execution authority granted"}
}
func clone(in []string) []string { out := make([]string, len(in)); copy(out, in); return out }
func appendUnique(in []string, v string) []string {
	if v == "" || contains(in, v) {
		return in
	}
	return append(in, v)
}
func appendUniqueList(base []string, values ...string) []string {
	out := clone(base)
	for _, v := range values {
		out = appendUnique(out, v)
	}
	return out
}
func contains(in []string, v string) bool {
	for _, x := range in {
		if x == v {
			return true
		}
	}
	return false
}
