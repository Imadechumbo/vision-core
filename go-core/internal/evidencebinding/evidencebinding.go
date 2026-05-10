// Package evidencebinding implements V10.8 External Execution Evidence Binding Gate.
//
// V10.8 binds a V10.7 external execution result verification to traceable
// evidence in read-only dry-run form only. It validates the logical binding
// between results and artifacts, hashes, logs, checks, sources, provenance,
// chain of custody, and audit trail without trusting, persisting, publishing,
// promoting, executing, writing files, mutating memory, or granting authority.
package evidencebinding

import (
	"strings"

	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/executionverification"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V10.8"

const (
	StatusReadyDryRun                = "evidence_binding_ready_dry_run"
	StatusIncomplete                 = "incomplete"
	StatusBlocked                    = "blocked"
	StatusResultVerificationMissing  = "result_verification_missing"
	StatusResultVerificationBlocked  = "result_verification_blocked"
	StatusResponseContractMissing    = "response_contract_missing"
	StatusResponseContractBlocked    = "response_contract_blocked"
	StatusRequestEnvelopeMissing     = "request_envelope_missing"
	StatusRequestEnvelopeBlocked     = "request_envelope_blocked"
	StatusAdapterInterfaceMissing    = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked    = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing  = "final_authorization_missing"
	StatusFinalAuthorizationBlocked  = "final_authorization_blocked"
	StatusSimulationMissing          = "simulation_missing"
	StatusSimulationBlocked          = "simulation_blocked"
	StatusFirewallMissing            = "firewall_missing"
	StatusFirewallBlocked            = "firewall_blocked"
	StatusSovereignCandidateMissing  = "sovereign_candidate_missing"
	StatusMissingRealGates           = "missing_real_gates"
	StatusHumanApprovalRequired      = "human_approval_required"
	StatusRevalidationRequired       = "revalidation_required"
	StatusEvidenceManifestMissing    = "evidence_manifest_missing"
	StatusArtifactReferencesMissing  = "artifact_references_missing"
	StatusArtifactHashesMissing      = "artifact_hashes_missing"
	StatusLogReferencesMissing       = "log_references_missing"
	StatusLogHashesMissing           = "log_hashes_missing"
	StatusCheckResultsMissing        = "check_results_missing"
	StatusSourceReferencesMissing    = "source_references_missing"
	StatusProvenanceMetadataMissing  = "provenance_metadata_missing"
	StatusChainOfCustodyMissing      = "chain_of_custody_missing"
	StatusAuditTrailMissing          = "audit_trail_missing"
	StatusIntegrityCheckFailed       = "integrity_check_failed"
	StatusHashCheckFailed            = "hash_check_failed"
	StatusProvenanceCheckFailed      = "provenance_check_failed"
	StatusSchemaCheckFailed          = "schema_check_failed"
	StatusSecurityCheckFailed        = "security_check_failed"
	StatusAuditCheckFailed           = "audit_check_failed"
	StatusObservabilityCheckFailed   = "observability_check_failed"
	StatusTamperEvidenceCheckFailed  = "tamper_evidence_check_failed"
	StatusRetentionPolicyMissing     = "retention_policy_missing"
	StatusTrustPolicyBlocked         = "trust_policy_blocked"
	StatusBindingPolicyBlocked       = "binding_policy_blocked"
	StatusUnsafeEvidenceTrustAttempt = "unsafe_evidence_trust_attempt"
	StatusUnsafeEvidencePersistence  = "unsafe_evidence_persistence_attempt"
	StatusUnsafeLedgerWriteAttempt   = "unsafe_ledger_write_attempt"
	StatusUnsafeStatusPublishAttempt = "unsafe_status_publish_attempt"
	StatusUnsafePromotionAttempt     = "unsafe_promotion_attempt"
	StatusUnsafeExecutionAttempt     = "unsafe_execution_attempt"
)

var requiredItems = []string{
	"evidence_binding_id", "verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "project", "branch", "commit_sha", "target", "environment",
	"V10.7_result_verification", "result_verification_ready_dry_run", "V10.6_response_contract", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_promotion_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation",
	"evidence_manifest", "artifact_references", "artifact_hashes", "log_references", "log_hashes", "check_references", "check_results", "source_references", "provenance_metadata", "chain_of_custody", "audit_trail", "correlation_id", "idempotency_key", "integrity_checks", "hash_checks", "provenance_checks", "schema_checks", "security_checks", "audit_checks", "observability_checks", "tamper_evidence_checks", "retention_policy", "trust_policy", "binding_policy",
	"no_MCP_execution", "no_evidence_trust_inside_MCP", "no_evidence_persistence_inside_MCP", "no_ledger_write_inside_MCP", "no_status_publish_inside_MCP", "no_promotion_inside_MCP", "no_deploy_inside_MCP", "no_memory_stable_write_inside_MCP",
}
var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var forbiddenInsideMCP = []string{"trust_evidence", "persist_evidence", "write_ledger", "trust_result", "persist_result", "publish_status", "promote", "deploy", "execute", "call_adapter", "call_executor", "network_call", "command_execution", "file_write", "push", "open_pr", "mutate", "write_memory", "learn_stable", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}

type ExecutionEvidenceBindingInput struct {
	Root                 string `json:"root,omitempty"`
	Operation            string `json:"operation,omitempty"`
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

	ResultVerification      *executionverification.ExecutionResultVerificationInput `json:"result_verification,omitempty"`
	RealGates               []sovereigndecision.SovereignRealGate                   `json:"real_gates,omitempty"`
	HumanApproval           *executionresponse.HumanApproval                        `json:"human_approval,omitempty"`
	IndependentRevalidation *executionresponse.IndependentRevalidation              `json:"independent_revalidation,omitempty"`

	EvidenceManifest     *executionresponse.PresenceValid `json:"evidence_manifest,omitempty"`
	ArtifactReferences   *executionresponse.PresenceValid `json:"artifact_references,omitempty"`
	ArtifactHashes       *executionresponse.PresenceValid `json:"artifact_hashes,omitempty"`
	LogReferences        *executionresponse.PresenceValid `json:"log_references,omitempty"`
	LogHashes            *executionresponse.PresenceValid `json:"log_hashes,omitempty"`
	CheckReferences      *executionresponse.PresenceValid `json:"check_references,omitempty"`
	CheckResults         *executionresponse.PresenceValid `json:"check_results,omitempty"`
	SourceReferences     *executionresponse.PresenceValid `json:"source_references,omitempty"`
	ProvenanceMetadata   *executionresponse.PresenceValid `json:"provenance_metadata,omitempty"`
	ChainOfCustody       *executionresponse.PresenceValid `json:"chain_of_custody,omitempty"`
	AuditTrail           *executionresponse.PresenceValid `json:"audit_trail,omitempty"`
	CorrelationID        string                           `json:"correlation_id,omitempty"`
	IdempotencyKey       string                           `json:"idempotency_key,omitempty"`
	IntegrityChecks      *executionresponse.PresenceValid `json:"integrity_checks,omitempty"`
	HashChecks           *executionresponse.PresenceValid `json:"hash_checks,omitempty"`
	ProvenanceChecks     *executionresponse.PresenceValid `json:"provenance_checks,omitempty"`
	SchemaChecks         *executionresponse.PresenceValid `json:"schema_checks,omitempty"`
	SecurityChecks       *executionresponse.PresenceValid `json:"security_checks,omitempty"`
	AuditChecks          *executionresponse.PresenceValid `json:"audit_checks,omitempty"`
	ObservabilityChecks  *executionresponse.PresenceValid `json:"observability_checks,omitempty"`
	TamperEvidenceChecks *executionresponse.PresenceValid `json:"tamper_evidence_checks,omitempty"`
	RetentionPolicy      *executionresponse.PresenceValid `json:"retention_policy,omitempty"`
	TrustPolicy          *executionresponse.PresenceValid `json:"trust_policy,omitempty"`
	BindingPolicy        *executionresponse.PresenceValid `json:"binding_policy,omitempty"`
	SafetyControls       *SafetyControls                  `json:"safety_controls,omitempty"`
	Claims               *ExecutionEvidenceBindingClaims  `json:"claims,omitempty"`

	MCPExecutionAllowed        bool `json:"mcp_execution_allowed,omitempty"`
	EvidenceTrustAllowed       bool `json:"evidence_trust_allowed,omitempty"`
	EvidencePersistenceAllowed bool `json:"evidence_persistence_allowed,omitempty"`
	LedgerWriteAllowed         bool `json:"ledger_write_allowed,omitempty"`
	ResultTrustAllowed         bool `json:"result_trust_allowed,omitempty"`
	ResultPersistenceAllowed   bool `json:"result_persistence_allowed,omitempty"`
	StatusPublishAllowed       bool `json:"status_publish_allowed,omitempty"`
	PromotionAllowed           bool `json:"promotion_allowed,omitempty"`
	DeployAllowed              bool `json:"deploy_allowed,omitempty"`
	MutationAllowed            bool `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed         bool `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed     bool `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed            bool `json:"learning_allowed,omitempty"`
	AdapterCallAllowed         bool `json:"adapter_call_allowed,omitempty"`
	ExecutorCallAllowed        bool `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed         bool `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed    bool `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed           bool `json:"file_write_allowed,omitempty"`
	RealLockAllowed            bool `json:"real_lock_allowed,omitempty"`
	RollbackAllowed            bool `json:"rollback_allowed,omitempty"`
	PassGoldAllowed            bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed          bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGrantAllowed      bool `json:"authority_grant_allowed,omitempty"`
}

type SafetyControls struct {
	Present                        bool `json:"present"`
	Valid                          bool `json:"valid"`
	NoMCPExecution                 bool `json:"no_mcp_execution"`
	NoEvidenceTrustInsideMCP       bool `json:"no_evidence_trust_inside_mcp"`
	NoEvidencePersistenceInsideMCP bool `json:"no_evidence_persistence_inside_mcp"`
	NoLedgerWriteInsideMCP         bool `json:"no_ledger_write_inside_mcp"`
	NoStatusPublishInsideMCP       bool `json:"no_status_publish_inside_mcp"`
	NoPromotionInsideMCP           bool `json:"no_promotion_inside_mcp"`
	NoDeployInsideMCP              bool `json:"no_deploy_inside_mcp"`
	NoMemoryStableWriteInsideMCP   bool `json:"no_memory_stable_write_inside_mcp"`
}

type ExecutionEvidenceBindingClaims struct {
	MCPExecutionAllowed         bool `json:"mcp_execution_allowed"`
	EvidenceTrustAllowed        bool `json:"evidence_trust_allowed"`
	EvidencePersistenceAllowed  bool `json:"evidence_persistence_allowed"`
	LedgerWriteAllowed          bool `json:"ledger_write_allowed"`
	EvidenceBoundAsTrusted      bool `json:"evidence_bound_as_trusted"`
	EvidencePersisted           bool `json:"evidence_persisted"`
	ResultTrustAllowed          bool `json:"result_trust_allowed"`
	ResultPersistenceAllowed    bool `json:"result_persistence_allowed"`
	ExternalResultTrusted       bool `json:"external_result_trusted"`
	ExternalResultVerified      bool `json:"external_result_verified"`
	StatusPublishAllowed        bool `json:"status_publish_allowed"`
	PromotionAllowed            bool `json:"promotion_allowed"`
	DeployAllowed               bool `json:"deploy_allowed"`
	MutationAllowed             bool `json:"mutation_allowed"`
	MemoryWriteAllowed          bool `json:"memory_write_allowed"`
	StablePromotionAllowed      bool `json:"stable_promotion_allowed"`
	LearningAllowed             bool `json:"learning_allowed"`
	StablePromoted              bool `json:"stable_promoted"`
	LearnedAsStable             bool `json:"learned_as_stable"`
	AdapterCallAllowed          bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed         bool `json:"executor_call_allowed"`
	NetworkCallAllowed          bool `json:"network_call_allowed"`
	CommandExecutionAllowed     bool `json:"command_execution_allowed"`
	FileWriteAllowed            bool `json:"file_write_allowed"`
	ExecutionAllowed            bool `json:"execution_allowed"`
	RealLockAllowed             bool `json:"real_lock_allowed"`
	RealLockAcquired            bool `json:"real_lock_acquired"`
	RollbackAllowed             bool `json:"rollback_allowed"`
	RollbackPerformed           bool `json:"rollback_performed"`
	PassGold                    bool `json:"pass_gold"`
	PassSecure                  bool `json:"pass_secure"`
	PassGoldAllowed             bool `json:"pass_gold_allowed"`
	PassSecureAllowed           bool `json:"pass_secure_allowed"`
	AuthorityGranted            bool `json:"authority_granted"`
	AuthorityGrantAllowed       bool `json:"authority_grant_allowed"`
	DryRunGateClaim             bool `json:"dry_run_gate_claim"`
	SynthesizedGateClaim        bool `json:"synthesized_gate_claim"`
	HumanApprovalBypassed       bool `json:"human_approval_bypassed"`
	RevalidationBypassed        bool `json:"revalidation_bypassed"`
	VerificationBypassed        bool `json:"verification_bypassed"`
	EvidenceBindingBypassed     bool `json:"evidence_binding_bypassed"`
	ChainOfCustodyBypassed      bool `json:"chain_of_custody_bypassed"`
	HashValidationBypassed      bool `json:"hash_validation_bypassed"`
	ExternalResultTrustBypassed bool `json:"external_result_trust_bypassed"`
}

type ExecutionEvidenceBinding struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	EvidenceBindingStatus      string   `json:"evidence_binding_status"`
	Valid                      bool     `json:"valid"`
	Blocked                    bool     `json:"blocked"`
	EvidenceBindingReadyDryRun bool     `json:"evidence_binding_ready_dry_run"`
	MissingItems               []string `json:"missing_items"`
	UnsafeClaims               []string `json:"unsafe_claims"`
	Conflicts                  []string `json:"conflicts"`
	BlockingReasons            []string `json:"blocking_reasons"`
	RequiredItems              []string `json:"required_items"`
	RequiredRealGates          []string `json:"required_real_gates"`
	Recommendations            []string `json:"recommendations"`
	MCPExecutionAllowed        bool     `json:"mcp_execution_allowed"`
	EvidenceTrustAllowed       bool     `json:"evidence_trust_allowed"`
	EvidencePersistenceAllowed bool     `json:"evidence_persistence_allowed"`
	LedgerWriteAllowed         bool     `json:"ledger_write_allowed"`
	ResultTrustAllowed         bool     `json:"result_trust_allowed"`
	ResultPersistenceAllowed   bool     `json:"result_persistence_allowed"`
	StatusPublishAllowed       bool     `json:"status_publish_allowed"`
	PromotionAllowed           bool     `json:"promotion_allowed"`
	DeployAllowed              bool     `json:"deploy_allowed"`
	MutationAllowed            bool     `json:"mutation_allowed"`
	MemoryWriteAllowed         bool     `json:"memory_write_allowed"`
	StablePromotionAllowed     bool     `json:"stable_promotion_allowed"`
	LearningAllowed            bool     `json:"learning_allowed"`
	AdapterCallAllowed         bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed        bool     `json:"executor_call_allowed"`
	NetworkCallAllowed         bool     `json:"network_call_allowed"`
	CommandExecutionAllowed    bool     `json:"command_execution_allowed"`
	FileWriteAllowed           bool     `json:"file_write_allowed"`
	RealLockAllowed            bool     `json:"real_lock_allowed"`
	RollbackAllowed            bool     `json:"rollback_allowed"`
	PassGoldAllowed            bool     `json:"pass_gold_allowed"`
	PassSecureAllowed          bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed      bool     `json:"authority_grant_allowed"`
}
type ExecutionEvidenceBindingValidation = ExecutionEvidenceBinding

type EvidenceBindingBoundary struct {
	Version                       string   `json:"version"`
	DryRun                        bool     `json:"dry_run"`
	ReadOnly                      bool     `json:"read_only"`
	MCPCan                        []string `json:"mcp_can"`
	MCPCannot                     []string `json:"mcp_cannot"`
	ForbiddenInsideMCP            []string `json:"forbidden_inside_mcp"`
	RequiredBeforeEvidenceBinding []string `json:"required_before_evidence_binding"`
	AlwaysDenied                  []string `json:"always_denied"`
	RequiredRealGates             []string `json:"required_real_gates"`
}

type ExecutionEvidenceBindingAudit struct {
	Version                               string   `json:"version"`
	DryRun                                bool     `json:"dry_run"`
	ReadOnly                              bool     `json:"read_only"`
	ConflictsFound                        bool     `json:"conflicts_found"`
	Conflicts                             []string `json:"conflicts"`
	UnsafeClaimsFound                     bool     `json:"unsafe_claims_found"`
	UnsafeClaims                          []string `json:"unsafe_claims"`
	MissingItemsFound                     bool     `json:"missing_items_found"`
	MissingItems                          []string `json:"missing_items"`
	EvidenceTrustAttemptFound             bool     `json:"evidence_trust_attempt_found"`
	EvidencePersistenceAttemptFound       bool     `json:"evidence_persistence_attempt_found"`
	LedgerWriteAttemptFound               bool     `json:"ledger_write_attempt_found"`
	ResultTrustAttemptFound               bool     `json:"result_trust_attempt_found"`
	ResultPersistenceAttemptFound         bool     `json:"result_persistence_attempt_found"`
	StatusPublishAttemptFound             bool     `json:"status_publish_attempt_found"`
	PromotionAttemptFound                 bool     `json:"promotion_attempt_found"`
	DeployAttemptFound                    bool     `json:"deploy_attempt_found"`
	ExecutionAttemptFound                 bool     `json:"execution_attempt_found"`
	AdapterCallAttemptFound               bool     `json:"adapter_call_attempt_found"`
	ExecutorCallAttemptFound              bool     `json:"executor_call_attempt_found"`
	NetworkAttemptFound                   bool     `json:"network_attempt_found"`
	CommandAttemptFound                   bool     `json:"command_attempt_found"`
	FileWriteAttemptFound                 bool     `json:"file_write_attempt_found"`
	MemoryWriteAttemptFound               bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound            bool     `json:"stable_learning_attempt_found"`
	RealLockAttemptFound                  bool     `json:"real_lock_attempt_found"`
	RollbackAttemptFound                  bool     `json:"rollback_attempt_found"`
	AutoGoldAttemptFound                  bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound            bool     `json:"authority_grant_attempt_found"`
	DryRunGateClaimFound                  bool     `json:"dry_run_gate_claim_found"`
	SynthesizedGateClaimFound             bool     `json:"synthesized_gate_claim_found"`
	HumanApprovalBypassAttemptFound       bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound        bool     `json:"revalidation_bypass_attempt_found"`
	VerificationBypassAttemptFound        bool     `json:"verification_bypass_attempt_found"`
	EvidenceBindingBypassAttemptFound     bool     `json:"evidence_binding_bypass_attempt_found"`
	ChainOfCustodyBypassAttemptFound      bool     `json:"chain_of_custody_bypass_attempt_found"`
	HashValidationBypassAttemptFound      bool     `json:"hash_validation_bypass_attempt_found"`
	ExternalResultTrustBypassAttemptFound bool     `json:"external_result_trust_bypass_attempt_found"`
	Recommendations                       []string `json:"recommendations"`
}

type ExecutionEvidenceBindingExplain struct {
	Version                                         string   `json:"version"`
	DryRun                                          bool     `json:"dry_run"`
	ReadOnly                                        bool     `json:"read_only"`
	WhyEvidenceBindingIsNotTrust                    []string `json:"why_evidence_binding_is_not_trust"`
	WhyEvidenceBindingIsNotPersistence              []string `json:"why_evidence_binding_is_not_persistence"`
	WhyLedgerWriteIsBlockedInsideMCP                []string `json:"why_ledger_write_is_blocked_inside_mcp"`
	WhyResultVerificationIsRequired                 []string `json:"why_result_verification_is_required"`
	WhyResponseContractIsRequired                   []string `json:"why_response_contract_is_required"`
	WhyRequestEnvelopeIsRequired                    []string `json:"why_request_envelope_is_required"`
	WhyAdapterInterfaceIsRequired                   []string `json:"why_adapter_interface_is_required"`
	WhyFinalAuthorizationIsRequired                 []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                         []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired      []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyArtifactsHashesLogsChecksSourcesAreRequired  []string `json:"why_artifacts_hashes_logs_checks_sources_are_required"`
	WhyChainOfCustodyIsRequired                     []string `json:"why_chain_of_custody_is_required"`
	WhyExternalEvidenceCannotBeTrustedAutomatically []string `json:"why_external_evidence_cannot_be_trusted_automatically"`
	RequiredGates                                   []string `json:"required_gates"`
	AlwaysDenied                                    []string `json:"always_denied"`
}

func BuildExecutionEvidenceBinding(input ExecutionEvidenceBindingInput) ExecutionEvidenceBinding {
	return validate(input)
}
func ValidateExecutionEvidenceBinding(input ExecutionEvidenceBindingInput) ExecutionEvidenceBindingValidation {
	return validate(input)
}

func validate(input ExecutionEvidenceBindingInput) ExecutionEvidenceBinding {
	input = normalize(input)
	missing, conflicts, unsafe := []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s) }
	for name, val := range map[string]string{"evidence_binding_id": input.EvidenceBindingID, "verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment} {
		if strings.TrimSpace(val) == "" {
			addMissing(name)
		}
	}
	if isMCP(input.Executor) {
		addConflict("executor_must_not_be_mcp")
		addConflict(StatusUnsafeExecutionAttempt)
	}
	if input.ExecutorMode != "external_only" {
		addMissing("external_only")
		addConflict("executor_mode_must_be_external_only")
	}
	if input.ResultVerification == nil {
		addMissing("V10.7_result_verification")
		addConflict(StatusResultVerificationMissing)
	} else {
		r := executionverification.ValidateExecutionResultVerification(*input.ResultVerification)
		if !r.Valid || r.Blocked {
			addConflict(StatusResultVerificationBlocked)
		}
		if !r.ResultVerificationReadyDryRun {
			addMissing("result_verification_ready_dry_run")
			addConflict(StatusResultVerificationBlocked)
		}
		bubbleVerificationPrereqs(r, addConflict)
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
	for name, pv := range map[string]*executionresponse.PresenceValid{"evidence_manifest": input.EvidenceManifest, "artifact_references": input.ArtifactReferences, "artifact_hashes": input.ArtifactHashes, "log_references": input.LogReferences, "log_hashes": input.LogHashes, "check_references": input.CheckReferences, "check_results": input.CheckResults, "source_references": input.SourceReferences, "provenance_metadata": input.ProvenanceMetadata, "chain_of_custody": input.ChainOfCustody, "audit_trail": input.AuditTrail, "integrity_checks": input.IntegrityChecks, "hash_checks": input.HashChecks, "provenance_checks": input.ProvenanceChecks, "schema_checks": input.SchemaChecks, "security_checks": input.SecurityChecks, "audit_checks": input.AuditChecks, "observability_checks": input.ObservabilityChecks, "tamper_evidence_checks": input.TamperEvidenceChecks, "retention_policy": input.RetentionPolicy, "trust_policy": input.TrustPolicy, "binding_policy": input.BindingPolicy} {
		validatePresence(name, pv, addMissing, addConflict)
	}
	if input.CorrelationID == "" {
		addMissing("correlation_id")
	}
	if input.IdempotencyKey == "" {
		addMissing("idempotency_key")
	}
	if input.SafetyControls == nil || !input.SafetyControls.Present || !input.SafetyControls.Valid || !input.SafetyControls.NoMCPExecution || !input.SafetyControls.NoEvidenceTrustInsideMCP || !input.SafetyControls.NoEvidencePersistenceInsideMCP || !input.SafetyControls.NoLedgerWriteInsideMCP || !input.SafetyControls.NoStatusPublishInsideMCP || !input.SafetyControls.NoPromotionInsideMCP || !input.SafetyControls.NoDeployInsideMCP || !input.SafetyControls.NoMemoryStableWriteInsideMCP {
		addMissing("safety_controls")
		addConflict("safety_controls_invalid")
	}
	for _, u := range unsafeClaims(input.Claims) {
		addUnsafe(u)
		mapUnsafeStatus(u, addConflict)
	}
	status := StatusReadyDryRun
	valid := len(missing) == 0 && len(conflicts) == 0 && len(unsafe) == 0
	if !valid {
		status = StatusIncomplete
		if len(conflicts) > 0 || len(unsafe) > 0 {
			status = StatusBlocked
		}
	}
	blocking := append(clone(conflicts), unsafe...)
	return ExecutionEvidenceBinding{Version: Version, DryRun: true, ReadOnly: true, EvidenceBindingStatus: status, Valid: valid, Blocked: !valid, EvidenceBindingReadyDryRun: valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocking)}
}

func BuildEvidenceBindingBoundary() EvidenceBindingBoundary {
	return EvidenceBindingBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPCan: []string{"read", "validate", "audit", "explain", "simulate external execution evidence binding"}, MCPCannot: clone(forbiddenInsideMCP), ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeEvidenceBinding: clone(requiredItems), AlwaysDenied: alwaysDenied(), RequiredRealGates: clone(requiredGates)}
}

func AuditExecutionEvidenceBinding(input ExecutionEvidenceBindingInput) ExecutionEvidenceBindingAudit {
	input = normalize(input)
	v := ValidateExecutionEvidenceBinding(input)
	c := input.Claims
	if c == nil {
		c = &ExecutionEvidenceBindingClaims{}
	}
	a := ExecutionEvidenceBindingAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	a.EvidenceTrustAttemptFound = c.EvidenceTrustAllowed || c.EvidenceBoundAsTrusted
	a.EvidencePersistenceAttemptFound = c.EvidencePersistenceAllowed || c.EvidencePersisted
	a.LedgerWriteAttemptFound = c.LedgerWriteAllowed
	a.ResultTrustAttemptFound = c.ResultTrustAllowed || c.ExternalResultTrusted || c.ExternalResultVerified
	a.ResultPersistenceAttemptFound = c.ResultPersistenceAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
	a.PromotionAttemptFound = c.PromotionAllowed || c.StablePromoted || c.StablePromotionAllowed
	a.DeployAttemptFound = c.DeployAllowed
	a.ExecutionAttemptFound = c.MCPExecutionAllowed || c.ExecutionAllowed || c.CommandExecutionAllowed
	a.AdapterCallAttemptFound = c.AdapterCallAllowed
	a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
	a.NetworkAttemptFound = c.NetworkCallAllowed
	a.CommandAttemptFound = c.CommandExecutionAllowed
	a.FileWriteAttemptFound = c.FileWriteAllowed
	a.MemoryWriteAttemptFound = c.MemoryWriteAllowed
	a.StableLearningAttemptFound = c.LearningAllowed || c.LearnedAsStable
	a.RealLockAttemptFound = c.RealLockAllowed || c.RealLockAcquired
	a.RollbackAttemptFound = c.RollbackAllowed || c.RollbackPerformed
	a.AutoGoldAttemptFound = c.PassGold || c.PassSecure || c.PassGoldAllowed || c.PassSecureAllowed
	a.AuthorityGrantAttemptFound = c.AuthorityGranted || c.AuthorityGrantAllowed
	a.DryRunGateClaimFound = c.DryRunGateClaim
	a.SynthesizedGateClaimFound = c.SynthesizedGateClaim
	a.HumanApprovalBypassAttemptFound = c.HumanApprovalBypassed
	a.RevalidationBypassAttemptFound = c.RevalidationBypassed
	a.VerificationBypassAttemptFound = c.VerificationBypassed
	a.EvidenceBindingBypassAttemptFound = c.EvidenceBindingBypassed
	a.ChainOfCustodyBypassAttemptFound = c.ChainOfCustodyBypassed
	a.HashValidationBypassAttemptFound = c.HashValidationBypassed
	a.ExternalResultTrustBypassAttemptFound = c.ExternalResultTrustBypassed
	for _, g := range input.RealGates {
		a.DryRunGateClaimFound = a.DryRunGateClaimFound || g.DryRun
		a.SynthesizedGateClaimFound = a.SynthesizedGateClaimFound || g.Synthesized
	}
	return a
}

func ExplainExecutionEvidenceBinding(input ExecutionEvidenceBindingInput) ExecutionEvidenceBindingExplain {
	return ExecutionEvidenceBindingExplain{Version: Version, DryRun: true, ReadOnly: true, WhyEvidenceBindingIsNotTrust: []string{"evidence_binding_ready_dry_run is advisory only", "logical binding does not make external evidence trusted"}, WhyEvidenceBindingIsNotPersistence: []string{"V10.8 assembles and validates metadata only", "MCP does not persist evidence, files, ledger entries, memory, or stable state"}, WhyLedgerWriteIsBlockedInsideMCP: []string{"the read-only MCP control plane cannot write ledger records or status"}, WhyResultVerificationIsRequired: []string{"V10.7 result verification must be valid and result_verification_ready_dry_run=true before evidence binding can be assessed"}, WhyResponseContractIsRequired: []string{"V10.6 response contract anchors expected result shape and semantics"}, WhyRequestEnvelopeIsRequired: []string{"V10.5 request envelope anchors correlation, idempotency, target, and operation context"}, WhyAdapterInterfaceIsRequired: []string{"V10.4 adapter interface defines the external adapter boundary without allowing MCP to call it"}, WhyFinalAuthorizationIsRequired: []string{"V10.3 final authorization must be valid before evidence binding readiness can be considered"}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real, non-dry-run, non-synthesized, and authority-recognized"}, WhyHumanApprovalAndRevalidationAreRequired: []string{"human approval and independent revalidation prevent MCP from self-authorizing trust"}, WhyArtifactsHashesLogsChecksSourcesAreRequired: []string{"artifacts, hashes, logs, checks, and sources are required to trace a result to concrete evidence"}, WhyChainOfCustodyIsRequired: []string{"chain of custody and audit trail make evidence handling reviewable and tamper-evident"}, WhyExternalEvidenceCannotBeTrustedAutomatically: []string{"external evidence remains untrusted input until accepted outside MCP", "V10.8 never marks evidence_bound_as_trusted, evidence_persisted, external_result_trusted, or external_result_verified"}, RequiredGates: clone(requiredGates), AlwaysDenied: alwaysDenied()}
}

func normalize(input ExecutionEvidenceBindingInput) ExecutionEvidenceBindingInput {
	if input.Claims == nil {
		input.Claims = &ExecutionEvidenceBindingClaims{}
	}
	c := input.Claims
	c.MCPExecutionAllowed = c.MCPExecutionAllowed || input.MCPExecutionAllowed
	c.EvidenceTrustAllowed = c.EvidenceTrustAllowed || input.EvidenceTrustAllowed
	c.EvidencePersistenceAllowed = c.EvidencePersistenceAllowed || input.EvidencePersistenceAllowed
	c.LedgerWriteAllowed = c.LedgerWriteAllowed || input.LedgerWriteAllowed
	c.ResultTrustAllowed = c.ResultTrustAllowed || input.ResultTrustAllowed
	c.ResultPersistenceAllowed = c.ResultPersistenceAllowed || input.ResultPersistenceAllowed
	c.StatusPublishAllowed = c.StatusPublishAllowed || input.StatusPublishAllowed
	c.PromotionAllowed = c.PromotionAllowed || input.PromotionAllowed
	c.DeployAllowed = c.DeployAllowed || input.DeployAllowed
	c.MutationAllowed = c.MutationAllowed || input.MutationAllowed
	c.MemoryWriteAllowed = c.MemoryWriteAllowed || input.MemoryWriteAllowed
	c.StablePromotionAllowed = c.StablePromotionAllowed || input.StablePromotionAllowed
	c.LearningAllowed = c.LearningAllowed || input.LearningAllowed
	c.AdapterCallAllowed = c.AdapterCallAllowed || input.AdapterCallAllowed
	c.ExecutorCallAllowed = c.ExecutorCallAllowed || input.ExecutorCallAllowed
	c.NetworkCallAllowed = c.NetworkCallAllowed || input.NetworkCallAllowed
	c.CommandExecutionAllowed = c.CommandExecutionAllowed || input.CommandExecutionAllowed
	c.FileWriteAllowed = c.FileWriteAllowed || input.FileWriteAllowed
	c.RealLockAllowed = c.RealLockAllowed || input.RealLockAllowed
	c.RollbackAllowed = c.RollbackAllowed || input.RollbackAllowed
	c.PassGoldAllowed = c.PassGoldAllowed || input.PassGoldAllowed
	c.PassSecureAllowed = c.PassSecureAllowed || input.PassSecureAllowed
	c.AuthorityGrantAllowed = c.AuthorityGrantAllowed || input.AuthorityGrantAllowed
	return input
}

func bubbleVerificationPrereqs(r executionverification.ExecutionResultVerification, add func(string)) {
	for _, c := range append(clone(r.Conflicts), r.MissingItems...) {
		switch c {
		case executionverification.StatusResponseContractMissing:
			add(StatusResponseContractMissing)
		case executionverification.StatusResponseContractBlocked:
			add(StatusResponseContractBlocked)
		case executionverification.StatusRequestEnvelopeMissing:
			add(StatusRequestEnvelopeMissing)
		case executionverification.StatusRequestEnvelopeBlocked:
			add(StatusRequestEnvelopeBlocked)
		case executionverification.StatusAdapterInterfaceMissing:
			add(StatusAdapterInterfaceMissing)
		case executionverification.StatusAdapterInterfaceBlocked:
			add(StatusAdapterInterfaceBlocked)
		case executionverification.StatusFinalAuthorizationMissing:
			add(StatusFinalAuthorizationMissing)
		case executionverification.StatusFinalAuthorizationBlocked:
			add(StatusFinalAuthorizationBlocked)
		case executionverification.StatusSimulationMissing:
			add(StatusSimulationMissing)
		case executionverification.StatusSimulationBlocked:
			add(StatusSimulationBlocked)
		case executionverification.StatusFirewallMissing:
			add(StatusFirewallMissing)
		case executionverification.StatusFirewallBlocked:
			add(StatusFirewallBlocked)
		case executionverification.StatusSovereignCandidateMissing:
			add(StatusSovereignCandidateMissing)
		}
	}
}

func validatePresence(name string, pv *executionresponse.PresenceValid, addMissing func(string), addConflict func(string)) {
	if pv == nil || !pv.Present {
		addMissing(name)
		switch name {
		case "evidence_manifest":
			addConflict(StatusEvidenceManifestMissing)
		case "artifact_references":
			addConflict(StatusArtifactReferencesMissing)
		case "artifact_hashes":
			addConflict(StatusArtifactHashesMissing)
		case "log_references":
			addConflict(StatusLogReferencesMissing)
		case "log_hashes":
			addConflict(StatusLogHashesMissing)
		case "check_results":
			addConflict(StatusCheckResultsMissing)
		case "source_references":
			addConflict(StatusSourceReferencesMissing)
		case "provenance_metadata":
			addConflict(StatusProvenanceMetadataMissing)
		case "chain_of_custody":
			addConflict(StatusChainOfCustodyMissing)
		case "audit_trail":
			addConflict(StatusAuditTrailMissing)
		case "retention_policy":
			addConflict(StatusRetentionPolicyMissing)
		}
		return
	}
	if !pv.Valid {
		addConflict(name + "_invalid")
		switch name {
		case "integrity_checks":
			addConflict(StatusIntegrityCheckFailed)
		case "hash_checks":
			addConflict(StatusHashCheckFailed)
		case "provenance_checks":
			addConflict(StatusProvenanceCheckFailed)
		case "schema_checks":
			addConflict(StatusSchemaCheckFailed)
		case "security_checks":
			addConflict(StatusSecurityCheckFailed)
		case "audit_checks":
			addConflict(StatusAuditCheckFailed)
		case "observability_checks":
			addConflict(StatusObservabilityCheckFailed)
		case "tamper_evidence_checks":
			addConflict(StatusTamperEvidenceCheckFailed)
		case "trust_policy":
			addConflict(StatusTrustPolicyBlocked)
		case "binding_policy":
			addConflict(StatusBindingPolicyBlocked)
		}
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

func unsafeClaims(c *ExecutionEvidenceBindingClaims) []string {
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
	add("evidence_trust_allowed", c.EvidenceTrustAllowed)
	add("evidence_persistence_allowed", c.EvidencePersistenceAllowed)
	add("ledger_write_allowed", c.LedgerWriteAllowed)
	add("evidence_bound_as_trusted", c.EvidenceBoundAsTrusted)
	add("evidence_persisted", c.EvidencePersisted)
	add("result_trust_allowed", c.ResultTrustAllowed)
	add("result_persistence_allowed", c.ResultPersistenceAllowed)
	add("external_result_trusted", c.ExternalResultTrusted)
	add("external_result_verified", c.ExternalResultVerified)
	add("status_publish_allowed", c.StatusPublishAllowed)
	add("promotion_allowed", c.PromotionAllowed)
	add("deploy_allowed", c.DeployAllowed)
	add("mutation_allowed", c.MutationAllowed)
	add("memory_write_allowed", c.MemoryWriteAllowed)
	add("stable_promotion_allowed", c.StablePromotionAllowed)
	add("learning_allowed", c.LearningAllowed)
	add("stable_promoted", c.StablePromoted)
	add("learned_as_stable", c.LearnedAsStable)
	add("adapter_call_allowed", c.AdapterCallAllowed)
	add("executor_call_allowed", c.ExecutorCallAllowed)
	add("network_call_allowed", c.NetworkCallAllowed)
	add("command_execution_allowed", c.CommandExecutionAllowed)
	add("file_write_allowed", c.FileWriteAllowed)
	add("execution_allowed", c.ExecutionAllowed)
	add("real_lock_acquired", c.RealLockAcquired)
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
	case "evidence_trust_allowed", "evidence_bound_as_trusted":
		add(StatusUnsafeEvidenceTrustAttempt)
	case "evidence_persistence_allowed", "evidence_persisted":
		add(StatusUnsafeEvidencePersistence)
	case "ledger_write_allowed":
		add(StatusUnsafeLedgerWriteAttempt)
	case "result_trust_allowed", "external_result_trusted", "external_result_verified":
		add(StatusUnsafeEvidenceTrustAttempt)
	case "result_persistence_allowed":
		add(StatusUnsafeEvidencePersistence)
	case "status_publish_allowed":
		add(StatusUnsafeStatusPublishAttempt)
	case "promotion_allowed", "deploy_allowed", "stable_promoted", "stable_promotion_allowed":
		add(StatusUnsafePromotionAttempt)
	case "mcp_execution_allowed", "execution_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed":
		add(StatusUnsafeExecutionAttempt)
	}
}

func alwaysDenied() []string {
	return []string{"mcp_execution_allowed", "evidence_trust_allowed", "evidence_persistence_allowed", "ledger_write_allowed", "result_trust_allowed", "result_persistence_allowed", "status_publish_allowed", "promotion_allowed", "deploy_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "real_lock_allowed", "rollback_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}
}
func recommendations(blocking []string) []string {
	if len(blocking) == 0 {
		return []string{"evidence binding is ready for dry-run review only; no trust, persistence, ledger write, or real permission is granted"}
	}
	return []string{"resolve missing or invalid prerequisites outside MCP", "keep MCP read-only and do not trust evidence, persist evidence, write ledger, publish status, promote, deploy, execute, or grant authority from this binding"}
}
func appendUnique(xs []string, x string) []string {
	for _, e := range xs {
		if e == x {
			return xs
		}
	}
	return append(xs, x)
}
func clone(xs []string) []string { out := make([]string, len(xs)); copy(out, xs); return out }
func isMCP(s string) bool {
	v := strings.ToLower(strings.TrimSpace(s))
	return v == "mcp" || v == "mcp_readonly" || v == "mcp-readonly"
}
