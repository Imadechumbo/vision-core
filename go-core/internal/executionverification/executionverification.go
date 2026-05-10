// Package executionverification implements V10.7 External Execution Result Verification Gate.
//
// V10.7 validates whether a future external execution result is logically
// verifiable against the V10.6 response contract. It is strictly read-only and
// dry-run: readiness is advisory only and never grants trust, persistence,
// status publishing, promotion, deployment, execution, adapter/executor calls,
// network/command/file activity, memory writes, stable learning, rollback,
// lock acquisition, PASS gate marking, or authority.
package executionverification

import (
	"strings"

	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V10.7"

const (
	StatusReadyDryRun                = "result_verification_ready_dry_run"
	StatusIncomplete                 = "incomplete"
	StatusBlocked                    = "blocked"
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
	StatusResultDescriptorMissing    = "result_descriptor_missing"
	StatusVerificationPolicyMissing  = "verification_policy_missing"
	StatusTrustPolicyBlocked         = "trust_policy_blocked"
	StatusIntegrityCheckFailed       = "integrity_check_failed"
	StatusProvenanceCheckFailed      = "provenance_check_failed"
	StatusSchemaCheckFailed          = "schema_check_failed"
	StatusSecurityCheckFailed        = "security_check_failed"
	StatusAuditCheckFailed           = "audit_check_failed"
	StatusObservabilityCheckFailed   = "observability_check_failed"
	StatusRollbackReadinessFailed    = "rollback_readiness_failed"
	StatusUnsafeResultTrustAttempt   = "unsafe_result_trust_attempt"
	StatusUnsafeResultPersistence    = "unsafe_result_persistence_attempt"
	StatusUnsafeStatusPublishAttempt = "unsafe_status_publish_attempt"
	StatusUnsafePromotionAttempt     = "unsafe_promotion_attempt"
	StatusUnsafeExecutionAttempt     = "unsafe_execution_attempt"
)

var requiredItems = []string{
	"verification_id", "response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "project", "branch", "commit_sha", "target", "environment",
	"V10.6_response_contract", "response_contract_ready_dry_run", "V10.5_request_envelope", "V10.4_adapter_interface", "V10.3_final_authorization", "V10.2_promotion_simulation", "V10.1_firewall", "V10.0_sovereign_candidate", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation",
	"external_result_descriptor", "result_metadata", "correlation_id", "idempotency_key", "artifact_references", "evidence_references", "execution_outcome", "adapter_result", "error_summary", "verification_policy", "trust_policy", "integrity_checks", "provenance_checks", "schema_checks", "security_checks", "audit_checks", "observability_checks", "rollback_readiness_checks",
	"no_MCP_execution", "no_result_trust_inside_MCP", "no_result_persistence_inside_MCP", "no_status_publish_inside_MCP", "no_promotion_inside_MCP", "no_deploy_inside_MCP", "no_memory_stable_write_inside_MCP",
}
var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var forbiddenInsideMCP = []string{"trust_result", "persist_result", "publish_status", "promote", "deploy", "execute", "call_adapter", "call_executor", "network_call", "command_execution", "file_write", "push", "open_pr", "mutate", "write_memory", "learn_stable", "acquire_real_lock", "perform_rollback", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}

type ExecutionResultVerificationInput struct {
	Root                 string `json:"root,omitempty"`
	Operation            string `json:"operation,omitempty"`
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

	ResponseContract        *executionresponse.ExecutionResponseInput  `json:"response_contract,omitempty"`
	RealGates               []sovereigndecision.SovereignRealGate      `json:"real_gates,omitempty"`
	HumanApproval           *executionresponse.HumanApproval           `json:"human_approval,omitempty"`
	IndependentRevalidation *executionresponse.IndependentRevalidation `json:"independent_revalidation,omitempty"`

	ExternalResultDescriptor *executionresponse.PresenceValid `json:"external_result_descriptor,omitempty"`
	ResultMetadata           *executionresponse.PresenceValid `json:"result_metadata,omitempty"`
	CorrelationID            string                           `json:"correlation_id,omitempty"`
	IdempotencyKey           string                           `json:"idempotency_key,omitempty"`
	ArtifactReferences       *executionresponse.PresenceValid `json:"artifact_references,omitempty"`
	EvidenceReferences       *executionresponse.PresenceValid `json:"evidence_references,omitempty"`
	ExecutionOutcome         *executionresponse.PresenceValid `json:"execution_outcome,omitempty"`
	AdapterResult            *executionresponse.PresenceValid `json:"adapter_result,omitempty"`
	ErrorSummary             *executionresponse.PresenceValid `json:"error_summary,omitempty"`
	VerificationPolicy       *executionresponse.PresenceValid `json:"verification_policy,omitempty"`
	TrustPolicy              *executionresponse.PresenceValid `json:"trust_policy,omitempty"`
	IntegrityChecks          *executionresponse.PresenceValid `json:"integrity_checks,omitempty"`
	ProvenanceChecks         *executionresponse.PresenceValid `json:"provenance_checks,omitempty"`
	SchemaChecks             *executionresponse.PresenceValid `json:"schema_checks,omitempty"`
	SecurityChecks           *executionresponse.PresenceValid `json:"security_checks,omitempty"`
	AuditChecks              *executionresponse.PresenceValid `json:"audit_checks,omitempty"`
	ObservabilityChecks      *executionresponse.PresenceValid `json:"observability_checks,omitempty"`
	RollbackReadinessChecks  *executionresponse.PresenceValid `json:"rollback_readiness_checks,omitempty"`
	SafetyControls           *SafetyControls                  `json:"safety_controls,omitempty"`
	Claims                   *ExecutionVerificationClaims     `json:"claims,omitempty"`

	MCPExecutionAllowed      bool `json:"mcp_execution_allowed,omitempty"`
	ResultTrustAllowed       bool `json:"result_trust_allowed,omitempty"`
	ResultPersistenceAllowed bool `json:"result_persistence_allowed,omitempty"`
	StatusPublishAllowed     bool `json:"status_publish_allowed,omitempty"`
	PromotionAllowed         bool `json:"promotion_allowed,omitempty"`
	DeployAllowed            bool `json:"deploy_allowed,omitempty"`
	MutationAllowed          bool `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed       bool `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed   bool `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed          bool `json:"learning_allowed,omitempty"`
	AdapterCallAllowed       bool `json:"adapter_call_allowed,omitempty"`
	ExecutorCallAllowed      bool `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed       bool `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed  bool `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed         bool `json:"file_write_allowed,omitempty"`
	RealLockAllowed          bool `json:"real_lock_allowed,omitempty"`
	RollbackAllowed          bool `json:"rollback_allowed,omitempty"`
	PassGoldAllowed          bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed        bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGrantAllowed    bool `json:"authority_grant_allowed,omitempty"`
}

type SafetyControls struct {
	Present                      bool `json:"present"`
	Valid                        bool `json:"valid"`
	NoMCPExecution               bool `json:"no_mcp_execution"`
	NoResultTrustInsideMCP       bool `json:"no_result_trust_inside_mcp"`
	NoResultPersistenceInsideMCP bool `json:"no_result_persistence_inside_mcp"`
	NoStatusPublishInsideMCP     bool `json:"no_status_publish_inside_mcp"`
	NoPromotionInsideMCP         bool `json:"no_promotion_inside_mcp"`
	NoDeployInsideMCP            bool `json:"no_deploy_inside_mcp"`
	NoMemoryStableWriteInsideMCP bool `json:"no_memory_stable_write_inside_mcp"`
}
type ExecutionVerificationClaims struct {
	MCPExecutionAllowed         bool `json:"mcp_execution_allowed"`
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
	ExternalResultTrustBypassed bool `json:"external_result_trust_bypassed"`
}

type ExecutionResultVerification struct {
	Version                       string   `json:"version"`
	DryRun                        bool     `json:"dry_run"`
	ReadOnly                      bool     `json:"read_only"`
	ResultVerificationStatus      string   `json:"result_verification_status"`
	Valid                         bool     `json:"valid"`
	Blocked                       bool     `json:"blocked"`
	ResultVerificationReadyDryRun bool     `json:"result_verification_ready_dry_run"`
	MissingItems                  []string `json:"missing_items"`
	UnsafeClaims                  []string `json:"unsafe_claims"`
	Conflicts                     []string `json:"conflicts"`
	BlockingReasons               []string `json:"blocking_reasons"`
	RequiredItems                 []string `json:"required_items"`
	RequiredRealGates             []string `json:"required_real_gates"`
	Recommendations               []string `json:"recommendations"`
	MCPExecutionAllowed           bool     `json:"mcp_execution_allowed"`
	ResultTrustAllowed            bool     `json:"result_trust_allowed"`
	ResultPersistenceAllowed      bool     `json:"result_persistence_allowed"`
	StatusPublishAllowed          bool     `json:"status_publish_allowed"`
	PromotionAllowed              bool     `json:"promotion_allowed"`
	DeployAllowed                 bool     `json:"deploy_allowed"`
	MutationAllowed               bool     `json:"mutation_allowed"`
	MemoryWriteAllowed            bool     `json:"memory_write_allowed"`
	StablePromotionAllowed        bool     `json:"stable_promotion_allowed"`
	LearningAllowed               bool     `json:"learning_allowed"`
	AdapterCallAllowed            bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed           bool     `json:"executor_call_allowed"`
	NetworkCallAllowed            bool     `json:"network_call_allowed"`
	CommandExecutionAllowed       bool     `json:"command_execution_allowed"`
	FileWriteAllowed              bool     `json:"file_write_allowed"`
	RealLockAllowed               bool     `json:"real_lock_allowed"`
	RollbackAllowed               bool     `json:"rollback_allowed"`
	PassGoldAllowed               bool     `json:"pass_gold_allowed"`
	PassSecureAllowed             bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed         bool     `json:"authority_grant_allowed"`
}
type ExecutionResultVerificationValidation = ExecutionResultVerification

type ExecutionVerificationBoundary struct {
	Version                          string   `json:"version"`
	DryRun                           bool     `json:"dry_run"`
	ReadOnly                         bool     `json:"read_only"`
	MCPCan                           []string `json:"mcp_can"`
	MCPCannot                        []string `json:"mcp_cannot"`
	ForbiddenInsideMCP               []string `json:"forbidden_inside_mcp"`
	RequiredBeforeResultVerification []string `json:"required_before_result_verification"`
	AlwaysDenied                     []string `json:"always_denied"`
	RequiredRealGates                []string `json:"required_real_gates"`
}

type ExecutionVerificationAudit struct {
	Version                               string   `json:"version"`
	DryRun                                bool     `json:"dry_run"`
	ReadOnly                              bool     `json:"read_only"`
	ConflictsFound                        bool     `json:"conflicts_found"`
	Conflicts                             []string `json:"conflicts"`
	UnsafeClaimsFound                     bool     `json:"unsafe_claims_found"`
	UnsafeClaims                          []string `json:"unsafe_claims"`
	MissingItemsFound                     bool     `json:"missing_items_found"`
	MissingItems                          []string `json:"missing_items"`
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
	ExternalResultTrustBypassAttemptFound bool     `json:"external_result_trust_bypass_attempt_found"`
	Recommendations                       []string `json:"recommendations"`
}

type ExecutionVerificationExplain struct {
	Version                                                    string   `json:"version"`
	DryRun                                                     bool     `json:"dry_run"`
	ReadOnly                                                   bool     `json:"read_only"`
	WhyResultVerificationIsNotTrust                            []string `json:"why_result_verification_is_not_trust"`
	WhyResultVerificationIsNotExecution                        []string `json:"why_result_verification_is_not_execution"`
	WhyResultPersistenceIsBlockedInsideMCP                     []string `json:"why_result_persistence_is_blocked_inside_mcp"`
	WhyResponseContractIsRequired                              []string `json:"why_response_contract_is_required"`
	WhyRequestEnvelopeIsRequired                               []string `json:"why_request_envelope_is_required"`
	WhyAdapterInterfaceIsRequired                              []string `json:"why_adapter_interface_is_required"`
	WhyFinalAuthorizationIsRequired                            []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                                    []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired                 []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyIntegrityProvenanceSchemaSecurityAuditChecksAreRequired []string `json:"why_integrity_provenance_schema_security_audit_checks_are_required"`
	WhyExternalResultCannotBeTrustedAutomatically              []string `json:"why_external_result_cannot_be_trusted_automatically"`
	RequiredGates                                              []string `json:"required_gates"`
	AlwaysDenied                                               []string `json:"always_denied"`
}

func BuildExecutionResultVerification(input ExecutionResultVerificationInput) ExecutionResultVerification {
	return validate(input)
}
func ValidateExecutionResultVerification(input ExecutionResultVerificationInput) ExecutionResultVerificationValidation {
	return validate(input)
}

func validate(input ExecutionResultVerificationInput) ExecutionResultVerification {
	input = normalize(input)
	missing, conflicts, unsafe := []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s) }
	for name, val := range map[string]string{"verification_id": input.VerificationID, "response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment} {
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
	if input.ResponseContract == nil {
		addMissing("V10.6_response_contract")
		addConflict(StatusResponseContractMissing)
	} else {
		r := executionresponse.ValidateExecutionResponseContract(*input.ResponseContract)
		if !r.Valid || r.Blocked {
			addConflict(StatusResponseContractBlocked)
		}
		if !r.ResponseContractReadyDryRun {
			addMissing("response_contract_ready_dry_run")
			addConflict(StatusResponseContractBlocked)
		}
		bubbleResponsePrereqs(r, addConflict)
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
	for name, pv := range map[string]*executionresponse.PresenceValid{"external_result_descriptor": input.ExternalResultDescriptor, "result_metadata": input.ResultMetadata, "artifact_references": input.ArtifactReferences, "evidence_references": input.EvidenceReferences, "execution_outcome": input.ExecutionOutcome, "adapter_result": input.AdapterResult, "error_summary": input.ErrorSummary, "verification_policy": input.VerificationPolicy, "trust_policy": input.TrustPolicy, "integrity_checks": input.IntegrityChecks, "provenance_checks": input.ProvenanceChecks, "schema_checks": input.SchemaChecks, "security_checks": input.SecurityChecks, "audit_checks": input.AuditChecks, "observability_checks": input.ObservabilityChecks, "rollback_readiness_checks": input.RollbackReadinessChecks} {
		validatePresence(name, pv, addMissing, addConflict)
	}
	if input.CorrelationID == "" {
		addMissing("correlation_id")
	}
	if input.IdempotencyKey == "" {
		addMissing("idempotency_key")
	}
	if input.SafetyControls == nil || !input.SafetyControls.Present || !input.SafetyControls.Valid || !input.SafetyControls.NoMCPExecution || !input.SafetyControls.NoResultTrustInsideMCP || !input.SafetyControls.NoResultPersistenceInsideMCP || !input.SafetyControls.NoStatusPublishInsideMCP || !input.SafetyControls.NoPromotionInsideMCP || !input.SafetyControls.NoDeployInsideMCP || !input.SafetyControls.NoMemoryStableWriteInsideMCP {
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
	return ExecutionResultVerification{Version: Version, DryRun: true, ReadOnly: true, ResultVerificationStatus: status, Valid: valid, Blocked: !valid, ResultVerificationReadyDryRun: valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocking)}
}

func BuildExecutionVerificationBoundary() ExecutionVerificationBoundary {
	return ExecutionVerificationBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPCan: []string{"read", "validate", "audit", "explain", "simulate external execution result verification"}, MCPCannot: clone(forbiddenInsideMCP), ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeResultVerification: clone(requiredItems), AlwaysDenied: alwaysDenied(), RequiredRealGates: clone(requiredGates)}
}
func AuditExecutionResultVerification(input ExecutionResultVerificationInput) ExecutionVerificationAudit {
	input = normalize(input)
	v := ValidateExecutionResultVerification(input)
	c := input.Claims
	if c == nil {
		c = &ExecutionVerificationClaims{}
	}
	a := ExecutionVerificationAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
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
	a.ExternalResultTrustBypassAttemptFound = c.ExternalResultTrustBypassed
	for _, g := range input.RealGates {
		a.DryRunGateClaimFound = a.DryRunGateClaimFound || g.DryRun
		a.SynthesizedGateClaimFound = a.SynthesizedGateClaimFound || g.Synthesized
	}
	return a
}
func ExplainExecutionResultVerification(input ExecutionResultVerificationInput) ExecutionVerificationExplain {
	return ExecutionVerificationExplain{Version: Version, DryRun: true, ReadOnly: true, WhyResultVerificationIsNotTrust: []string{"result_verification_ready_dry_run is advisory only", "verification readiness does not make adapter output trusted"}, WhyResultVerificationIsNotExecution: []string{"V10.7 only validates descriptors and policies", "MCP never executes, calls adapters, calls executors, or runs commands"}, WhyResultPersistenceIsBlockedInsideMCP: []string{"MCP is read-only and cannot persist results, status, files, memory, or stable state"}, WhyResponseContractIsRequired: []string{"V10.6 response contract must be valid and response_contract_ready_dry_run=true before result verification can be assessed"}, WhyRequestEnvelopeIsRequired: []string{"V10.5 request envelope anchors correlation, idempotency, target, and operation context"}, WhyAdapterInterfaceIsRequired: []string{"V10.4 adapter interface defines the future external adapter boundary without allowing MCP to call it"}, WhyFinalAuthorizationIsRequired: []string{"V10.3 final authorization must be valid before verification readiness can be considered"}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real, non-dry-run, non-synthesized, and authority-recognized"}, WhyHumanApprovalAndRevalidationAreRequired: []string{"human approval and independent revalidation prevent MCP from self-authorizing trust"}, WhyIntegrityProvenanceSchemaSecurityAuditChecksAreRequired: []string{"integrity, provenance, schema, security, audit, observability, and rollback readiness checks are prerequisites for later analysis"}, WhyExternalResultCannotBeTrustedAutomatically: []string{"external results remain untrusted input until verified outside MCP", "V10.7 never marks external_result_trusted or external_result_verified"}, RequiredGates: clone(requiredGates), AlwaysDenied: alwaysDenied()}
}

func normalize(input ExecutionResultVerificationInput) ExecutionResultVerificationInput {
	if input.Claims == nil {
		input.Claims = &ExecutionVerificationClaims{}
	}
	c := input.Claims
	c.MCPExecutionAllowed = c.MCPExecutionAllowed || input.MCPExecutionAllowed
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
func bubbleResponsePrereqs(r executionresponse.ExecutionResponseValidation, add func(string)) {
	for _, c := range r.Conflicts {
		switch c {
		case executionresponse.StatusRequestEnvelopeMissing:
			add(StatusRequestEnvelopeMissing)
		case executionresponse.StatusRequestEnvelopeBlocked:
			add(StatusRequestEnvelopeBlocked)
		case executionresponse.StatusAdapterInterfaceMissing:
			add(StatusAdapterInterfaceMissing)
		case executionresponse.StatusAdapterInterfaceBlocked:
			add(StatusAdapterInterfaceBlocked)
		case executionresponse.StatusFinalAuthorizationMissing:
			add(StatusFinalAuthorizationMissing)
		case executionresponse.StatusFinalAuthorizationBlocked:
			add(StatusFinalAuthorizationBlocked)
		case executionresponse.StatusSimulationMissing:
			add(StatusSimulationMissing)
		case executionresponse.StatusSimulationBlocked:
			add(StatusSimulationBlocked)
		case executionresponse.StatusFirewallMissing:
			add(StatusFirewallMissing)
		case executionresponse.StatusFirewallBlocked:
			add(StatusFirewallBlocked)
		case executionresponse.StatusSovereignCandidateMissing:
			add(StatusSovereignCandidateMissing)
		}
	}
}
func validatePresence(name string, pv *executionresponse.PresenceValid, addMissing func(string), addConflict func(string)) {
	if pv == nil || !pv.Present {
		addMissing(name)
		if name == "external_result_descriptor" {
			addConflict(StatusResultDescriptorMissing)
		}
		if name == "verification_policy" {
			addConflict(StatusVerificationPolicyMissing)
		}
		return
	}
	if !pv.Valid {
		addConflict(name + "_invalid")
		switch name {
		case "trust_policy":
			addConflict(StatusTrustPolicyBlocked)
		case "integrity_checks":
			addConflict(StatusIntegrityCheckFailed)
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
		case "rollback_readiness_checks":
			addConflict(StatusRollbackReadinessFailed)
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
func unsafeClaims(c *ExecutionVerificationClaims) []string {
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
	case "result_trust_allowed", "external_result_trusted", "external_result_verified":
		add(StatusUnsafeResultTrustAttempt)
	case "result_persistence_allowed":
		add(StatusUnsafeResultPersistence)
	case "status_publish_allowed":
		add(StatusUnsafeStatusPublishAttempt)
	case "promotion_allowed", "deploy_allowed", "stable_promoted", "stable_promotion_allowed":
		add(StatusUnsafePromotionAttempt)
	case "mcp_execution_allowed", "execution_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed":
		add(StatusUnsafeExecutionAttempt)
	}
}
func alwaysDenied() []string {
	return []string{"mcp_execution_allowed", "result_trust_allowed", "result_persistence_allowed", "status_publish_allowed", "promotion_allowed", "deploy_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "real_lock_allowed", "rollback_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}
}
func recommendations(blocking []string) []string {
	if len(blocking) == 0 {
		return []string{"result verification is ready for dry-run review only; no real permission or trust is granted"}
	}
	return []string{"resolve missing or invalid prerequisites outside MCP", "keep MCP read-only and do not trust, persist, publish status, promote, deploy, execute, or grant authority from this verification"}
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
