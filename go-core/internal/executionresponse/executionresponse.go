// Package executionresponse implements V10.6 External Execution Response Contract.
//
// V10.6 defines, validates, audits, and explains the logical response contract a
// future external adapter could return after receiving the V10.5 request envelope.
// It is strictly read-only/dry-run: it never receives a real adapter response,
// calls adapters or executors, performs network or command activity, writes
// files, deploys, publishes status, persists response contracts, promotes stable,
// learns stable state, acquires real locks, performs rollback, trusts external
// responses automatically, marks PASS gates, or grants authority.
package executionresponse

import (
	"strings"

	"github.com/visioncore/go-core/internal/executionadapter"
	"github.com/visioncore/go-core/internal/executionrequest"
	"github.com/visioncore/go-core/internal/finalauthorization"
	"github.com/visioncore/go-core/internal/promotionsimulation"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V10.6"

const (
	StatusReadyDryRun               = "response_contract_ready_dry_run"
	StatusIncomplete                = "incomplete"
	StatusBlocked                   = "blocked"
	StatusRequestEnvelopeMissing    = "request_envelope_missing"
	StatusRequestEnvelopeBlocked    = "request_envelope_blocked"
	StatusAdapterInterfaceMissing   = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked   = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing = "final_authorization_missing"
	StatusFinalAuthorizationBlocked = "final_authorization_blocked"
	StatusSimulationMissing         = "simulation_missing"
	StatusSimulationBlocked         = "simulation_blocked"
	StatusFirewallMissing           = "firewall_missing"
	StatusFirewallBlocked           = "firewall_blocked"
	StatusSovereignCandidateMissing = "sovereign_candidate_missing"
	StatusMissingRealGates          = "missing_real_gates"
	StatusHumanApprovalRequired     = "human_approval_required"
	StatusRevalidationRequired      = "revalidation_required"
	StatusResponseContractMissing   = "response_contract_missing"
	StatusResponseContractInvalid   = "response_contract_invalid"
	StatusTrustPolicyMissing        = "trust_policy_missing"
	StatusTrustPolicyBlocked        = "trust_policy_blocked"
	StatusPolicyBlocked             = "policy_blocked"
	StatusUnsafeResponseTrust       = "unsafe_response_trust_attempt"
	StatusUnsafeResponsePersistence = "unsafe_response_persistence_attempt"
	StatusUnsafeAdapterCall         = "unsafe_adapter_call_attempt"
	StatusUnsafeExecution           = "unsafe_execution_attempt"
	StatusUnsafePromotion           = "unsafe_promotion_attempt"
)

var requiredItems = []string{
	"response_contract_id", "request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "project", "branch", "commit_sha", "target", "environment",
	"V10.5_request_envelope", "request_envelope_ready_dry_run", "V10.4_adapter_interface", "adapter_interface_ready_dry_run", "V10.3_final_authorization", "final_authorization_ready_dry_run", "V10.2_promotion_simulation", "V10.1_firewall", "V10.0_sovereign_candidate",
	"PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation", "response_schema", "response_metadata", "correlation_id", "idempotency_key", "adapter_result_descriptor", "execution_outcome_descriptor", "artifact_descriptor", "evidence_descriptor", "error_descriptor", "timeout_descriptor", "rollback_descriptor", "observability_descriptor", "audit_descriptor", "security_descriptor", "policy_descriptor", "trust_policy",
	"no_MCP_execution", "no_response_trust_inside_MCP", "no_response_persistence_inside_MCP", "no_adapter_call_inside_MCP", "no_network_inside_MCP", "no_command_inside_MCP", "no_file_write_inside_MCP", "no_deploy_inside_MCP", "no_status_publish_inside_MCP", "no_memory_stable_write_inside_MCP",
}
var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var forbiddenInsideMCP = []string{"trust_response", "persist_response", "execute", "call_adapter", "call_executor", "network_call", "command_execution", "file_write", "promote", "deploy", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "acquire_real_lock", "perform_rollback", "persist_response_contract", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}

type ExecutionResponseInput struct {
	Root                 string                  `json:"root,omitempty"`
	Operation            string                  `json:"operation,omitempty"`
	ResponseContract     *ExecutionResponseInput `json:"response_contract,omitempty"`
	ResponseContractID   string                  `json:"response_contract_id,omitempty"`
	RequestEnvelopeID    string                  `json:"request_envelope_id,omitempty"`
	AdapterInterfaceID   string                  `json:"adapter_interface_id,omitempty"`
	FinalAuthorizationID string                  `json:"final_authorization_id,omitempty"`
	SimulationID         string                  `json:"simulation_id,omitempty"`
	FirewallID           string                  `json:"firewall_id,omitempty"`
	DecisionID           string                  `json:"decision_id,omitempty"`
	InvocationID         string                  `json:"invocation_id,omitempty"`
	Executor             string                  `json:"executor,omitempty"`
	ExecutorMode         string                  `json:"executor_mode,omitempty"`
	AdapterName          string                  `json:"adapter_name,omitempty"`
	AdapterVersion       string                  `json:"adapter_version,omitempty"`
	AdapterType          string                  `json:"adapter_type,omitempty"`
	Project              string                  `json:"project,omitempty"`
	Branch               string                  `json:"branch,omitempty"`
	CommitSHA            string                  `json:"commit_sha,omitempty"`
	Target               string                  `json:"target,omitempty"`
	Environment          string                  `json:"environment,omitempty"`

	RequestEnvelope          *RequestEnvelopeEvidence              `json:"request_envelope,omitempty"`
	ExecutionRequest         *RequestEnvelopeEvidence              `json:"execution_request,omitempty"`
	AdapterInterface         *AdapterInterfaceEvidence             `json:"adapter_interface,omitempty"`
	ExternalExecutionAdapter *AdapterInterfaceEvidence             `json:"external_execution_adapter,omitempty"`
	FinalAuthorization       *FinalAuthorizationEvidence           `json:"final_authorization,omitempty"`
	Authorization            *FinalAuthorizationEvidence           `json:"authorization,omitempty"`
	PromotionSimulation      *SimulationEvidence                   `json:"promotion_simulation,omitempty"`
	Simulation               *SimulationEvidence                   `json:"simulation,omitempty"`
	PromotionFirewall        *FirewallEvidence                     `json:"promotion_firewall,omitempty"`
	Firewall                 *FirewallEvidence                     `json:"firewall,omitempty"`
	SovereignDecision        *SovereignDecisionEvidence            `json:"sovereign_decision,omitempty"`
	Decision                 *SovereignDecisionEvidence            `json:"decision,omitempty"`
	RealGates                []sovereigndecision.SovereignRealGate `json:"real_gates,omitempty"`
	HumanApproval            *HumanApproval                        `json:"human_approval,omitempty"`
	IndependentRevalidation  *IndependentRevalidation              `json:"independent_revalidation,omitempty"`

	ResponseSchema             *PresenceValid           `json:"response_schema,omitempty"`
	ResponseMetadata           *PresenceValid           `json:"response_metadata,omitempty"`
	CorrelationID              string                   `json:"correlation_id,omitempty"`
	IdempotencyKey             string                   `json:"idempotency_key,omitempty"`
	AdapterResultDescriptor    *PresenceValid           `json:"adapter_result_descriptor,omitempty"`
	ExecutionOutcomeDescriptor *PresenceValid           `json:"execution_outcome_descriptor,omitempty"`
	ArtifactDescriptor         *PresenceValid           `json:"artifact_descriptor,omitempty"`
	EvidenceDescriptor         *PresenceValid           `json:"evidence_descriptor,omitempty"`
	ErrorDescriptor            *PresenceValid           `json:"error_descriptor,omitempty"`
	TimeoutDescriptor          *PresenceValid           `json:"timeout_descriptor,omitempty"`
	RollbackDescriptor         *PresenceValid           `json:"rollback_descriptor,omitempty"`
	ObservabilityDescriptor    *PresenceValid           `json:"observability_descriptor,omitempty"`
	AuditDescriptor            *PresenceValid           `json:"audit_descriptor,omitempty"`
	SecurityDescriptor         *PresenceValid           `json:"security_descriptor,omitempty"`
	PolicyDescriptor           *PresenceValid           `json:"policy_descriptor,omitempty"`
	TrustPolicy                *PresenceValid           `json:"trust_policy,omitempty"`
	SafetyControls             *SafetyControls          `json:"safety_controls,omitempty"`
	Claims                     *ExecutionResponseClaims `json:"claims,omitempty"`

	MCPExecutionAllowed        bool `json:"mcp_execution_allowed,omitempty"`
	ResponseTrustAllowed       bool `json:"response_trust_allowed,omitempty"`
	ResponsePersistenceAllowed bool `json:"response_persistence_allowed,omitempty"`
	AdapterCallAllowed         bool `json:"adapter_call_allowed,omitempty"`
	ExecutorCallAllowed        bool `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed         bool `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed    bool `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed           bool `json:"file_write_allowed,omitempty"`
	PromotionAllowed           bool `json:"promotion_allowed,omitempty"`
	DeployAllowed              bool `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed       bool `json:"status_publish_allowed,omitempty"`
	MutationAllowed            bool `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed         bool `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed     bool `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed            bool `json:"learning_allowed,omitempty"`
	RealLockAllowed            bool `json:"real_lock_allowed,omitempty"`
	RollbackAllowed            bool `json:"rollback_allowed,omitempty"`
	PassGoldAllowed            bool `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed          bool `json:"pass_secure_allowed,omitempty"`
	AuthorityGrantAllowed      bool `json:"authority_grant_allowed,omitempty"`
}

type RequestEnvelopeEvidence struct {
	Version                    string `json:"version,omitempty"`
	DryRun                     bool   `json:"dry_run,omitempty"`
	ReadOnly                   bool   `json:"read_only,omitempty"`
	Valid                      bool   `json:"valid,omitempty"`
	Blocked                    bool   `json:"blocked,omitempty"`
	RequestEnvelopeReadyDryRun bool   `json:"request_envelope_ready_dry_run,omitempty"`
	RequestEnvelopeStatus      string `json:"request_envelope_status,omitempty"`
}
type AdapterInterfaceEvidence struct {
	Version                     string `json:"version,omitempty"`
	DryRun                      bool   `json:"dry_run,omitempty"`
	ReadOnly                    bool   `json:"read_only,omitempty"`
	Valid                       bool   `json:"valid,omitempty"`
	Blocked                     bool   `json:"blocked,omitempty"`
	AdapterInterfaceReadyDryRun bool   `json:"adapter_interface_ready_dry_run,omitempty"`
	AdapterInterfaceStatus      string `json:"adapter_interface_status,omitempty"`
}
type FinalAuthorizationEvidence struct {
	Version                       string `json:"version,omitempty"`
	DryRun                        bool   `json:"dry_run,omitempty"`
	ReadOnly                      bool   `json:"read_only,omitempty"`
	Valid                         bool   `json:"valid,omitempty"`
	Blocked                       bool   `json:"blocked,omitempty"`
	FinalAuthorizationReadyDryRun bool   `json:"final_authorization_ready_dry_run,omitempty"`
	FinalAuthorizationStatus      string `json:"final_authorization_status,omitempty"`
}
type SimulationEvidence struct {
	Version                      string `json:"version,omitempty"`
	DryRun                       bool   `json:"dry_run,omitempty"`
	ReadOnly                     bool   `json:"read_only,omitempty"`
	Valid                        bool   `json:"valid,omitempty"`
	Blocked                      bool   `json:"blocked,omitempty"`
	SimulationRecordReadyDryRun  bool   `json:"simulation_record_ready_dry_run,omitempty"`
	ExecutionSimulationCandidate bool   `json:"execution_simulation_candidate,omitempty"`
	PromotionExecutionCandidate  bool   `json:"promotion_execution_candidate,omitempty"`
}
type FirewallEvidence struct {
	Version                         string `json:"version,omitempty"`
	DryRun                          bool   `json:"dry_run,omitempty"`
	ReadOnly                        bool   `json:"read_only,omitempty"`
	Valid                           bool   `json:"valid,omitempty"`
	FirewallValid                   bool   `json:"firewall_valid,omitempty"`
	Blocked                         bool   `json:"blocked,omitempty"`
	ExecutionEligibilityReadyDryRun bool   `json:"execution_eligibility_ready_dry_run,omitempty"`
}
type SovereignDecisionEvidence struct {
	Version                    string `json:"version,omitempty"`
	DryRun                     bool   `json:"dry_run,omitempty"`
	ReadOnly                   bool   `json:"read_only,omitempty"`
	Valid                      bool   `json:"valid,omitempty"`
	SovereignDecisionValid     bool   `json:"sovereign_decision_valid,omitempty"`
	Blocked                    bool   `json:"blocked,omitempty"`
	PromotionDecisionCandidate bool   `json:"promotion_decision_candidate,omitempty"`
}
type PresenceValid struct {
	Present bool `json:"present"`
	Valid   bool `json:"valid"`
}
type HumanApproval struct {
	Present               bool   `json:"present"`
	Approved              bool   `json:"approved"`
	Approver              string `json:"approver,omitempty"`
	ApprovalReference     string `json:"approval_reference,omitempty"`
	Placeholder           bool   `json:"placeholder"`
	ApprovalIsPlaceholder bool   `json:"approval_is_placeholder"`
	Valid                 bool   `json:"valid"`
}
type IndependentRevalidation struct {
	Present                   bool   `json:"present"`
	Completed                 bool   `json:"completed"`
	Validator                 string `json:"validator,omitempty"`
	RevalidationReference     string `json:"revalidation_reference,omitempty"`
	Placeholder               bool   `json:"placeholder"`
	RevalidationIsPlaceholder bool   `json:"revalidation_is_placeholder"`
	PassGoldRevalidated       bool   `json:"pass_gold_revalidated"`
	PassSecureRevalidated     bool   `json:"pass_secure_revalidated"`
	Valid                     bool   `json:"valid"`
}
type SafetyControls struct {
	Present                        bool `json:"present"`
	Valid                          bool `json:"valid"`
	NoMCPExecution                 bool `json:"no_mcp_execution"`
	NoResponseTrustInsideMCP       bool `json:"no_response_trust_inside_mcp"`
	NoResponsePersistenceInsideMCP bool `json:"no_response_persistence_inside_mcp"`
	NoAdapterCallInsideMCP         bool `json:"no_adapter_call_inside_mcp"`
	NoNetworkInsideMCP             bool `json:"no_network_inside_mcp"`
	NoCommandInsideMCP             bool `json:"no_command_inside_mcp"`
	NoFileWriteInsideMCP           bool `json:"no_file_write_inside_mcp"`
	NoDeployInsideMCP              bool `json:"no_deploy_inside_mcp"`
	NoStatusPublishInsideMCP       bool `json:"no_status_publish_inside_mcp"`
	NoMemoryStableWriteInsideMCP   bool `json:"no_memory_stable_write_inside_mcp"`
}

type ExecutionResponseClaims struct {
	MCPExecutionAllowed           bool `json:"mcp_execution_allowed"`
	ResponseTrustAllowed          bool `json:"response_trust_allowed"`
	ResponsePersistenceAllowed    bool `json:"response_persistence_allowed"`
	AdapterCallAllowed            bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed           bool `json:"executor_call_allowed"`
	NetworkCallAllowed            bool `json:"network_call_allowed"`
	CommandExecutionAllowed       bool `json:"command_execution_allowed"`
	FileWriteAllowed              bool `json:"file_write_allowed"`
	PromotionAllowed              bool `json:"promotion_allowed"`
	DeployAllowed                 bool `json:"deploy_allowed"`
	StatusPublishAllowed          bool `json:"status_publish_allowed"`
	MutationAllowed               bool `json:"mutation_allowed"`
	MemoryWriteAllowed            bool `json:"memory_write_allowed"`
	StablePromotionAllowed        bool `json:"stable_promotion_allowed"`
	LearningAllowed               bool `json:"learning_allowed"`
	StablePromoted                bool `json:"stable_promoted"`
	LearnedAsStable               bool `json:"learned_as_stable"`
	ExecutionAllowed              bool `json:"execution_allowed"`
	RealLockAllowed               bool `json:"real_lock_allowed"`
	RealLockAcquired              bool `json:"real_lock_acquired"`
	RollbackAllowed               bool `json:"rollback_allowed"`
	RollbackPerformed             bool `json:"rollback_performed"`
	ResponseContractPersisted     bool `json:"response_contract_persisted"`
	PassGold                      bool `json:"pass_gold"`
	PassSecure                    bool `json:"pass_secure"`
	PassGoldAllowed               bool `json:"pass_gold_allowed"`
	PassSecureAllowed             bool `json:"pass_secure_allowed"`
	AuthorityGranted              bool `json:"authority_granted"`
	AuthorityGrantAllowed         bool `json:"authority_grant_allowed"`
	ExternalResponseTrusted       bool `json:"external_response_trusted"`
	ExternalResponseVerified      bool `json:"external_response_verified"`
	DryRunGateClaim               bool `json:"dry_run_gate_claim"`
	SynthesizedGateClaim          bool `json:"synthesized_gate_claim"`
	HumanApprovalBypassed         bool `json:"human_approval_bypassed"`
	RevalidationBypassed          bool `json:"revalidation_bypassed"`
	ResponseContractBypassed      bool `json:"response_contract_bypassed"`
	ExternalResponseTrustBypassed bool `json:"external_response_trust_bypassed"`
}

type ExecutionResponseResult struct {
	Version                     string   `json:"version"`
	DryRun                      bool     `json:"dry_run"`
	ReadOnly                    bool     `json:"read_only"`
	ResponseContractStatus      string   `json:"response_contract_status"`
	Valid                       bool     `json:"valid"`
	Blocked                     bool     `json:"blocked"`
	ResponseContractReadyDryRun bool     `json:"response_contract_ready_dry_run"`
	MissingItems                []string `json:"missing_items"`
	UnsafeClaims                []string `json:"unsafe_claims"`
	Conflicts                   []string `json:"conflicts"`
	BlockingReasons             []string `json:"blocking_reasons"`
	RequiredItems               []string `json:"required_items"`
	RequiredRealGates           []string `json:"required_real_gates"`
	Recommendations             []string `json:"recommendations"`
	MCPExecutionAllowed         bool     `json:"mcp_execution_allowed"`
	ResponseTrustAllowed        bool     `json:"response_trust_allowed"`
	ResponsePersistenceAllowed  bool     `json:"response_persistence_allowed"`
	AdapterCallAllowed          bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed         bool     `json:"executor_call_allowed"`
	NetworkCallAllowed          bool     `json:"network_call_allowed"`
	CommandExecutionAllowed     bool     `json:"command_execution_allowed"`
	FileWriteAllowed            bool     `json:"file_write_allowed"`
	PromotionAllowed            bool     `json:"promotion_allowed"`
	DeployAllowed               bool     `json:"deploy_allowed"`
	StatusPublishAllowed        bool     `json:"status_publish_allowed"`
	MutationAllowed             bool     `json:"mutation_allowed"`
	MemoryWriteAllowed          bool     `json:"memory_write_allowed"`
	StablePromotionAllowed      bool     `json:"stable_promotion_allowed"`
	LearningAllowed             bool     `json:"learning_allowed"`
	RealLockAllowed             bool     `json:"real_lock_allowed"`
	RollbackAllowed             bool     `json:"rollback_allowed"`
	PassGoldAllowed             bool     `json:"pass_gold_allowed"`
	PassSecureAllowed           bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed       bool     `json:"authority_grant_allowed"`
}
type ExecutionResponseValidation = ExecutionResponseResult

type ExecutionResponseBoundary struct {
	Version                        string   `json:"version"`
	DryRun                         bool     `json:"dry_run"`
	ReadOnly                       bool     `json:"read_only"`
	MCPCan                         []string `json:"mcp_can"`
	MCPCannot                      []string `json:"mcp_cannot"`
	ForbiddenInsideMCP             []string `json:"forbidden_inside_mcp"`
	RequiredBeforeResponseContract []string `json:"required_before_response_contract"`
	AlwaysDenied                   []string `json:"always_denied"`
	RequiredRealGates              []string `json:"required_real_gates"`
}
type ExecutionResponseAudit struct {
	Version                                 string   `json:"version"`
	DryRun                                  bool     `json:"dry_run"`
	ReadOnly                                bool     `json:"read_only"`
	ConflictsFound                          bool     `json:"conflicts_found"`
	Conflicts                               []string `json:"conflicts"`
	UnsafeClaimsFound                       bool     `json:"unsafe_claims_found"`
	UnsafeClaims                            []string `json:"unsafe_claims"`
	MissingItemsFound                       bool     `json:"missing_items_found"`
	MissingItems                            []string `json:"missing_items"`
	ResponseTrustAttemptFound               bool     `json:"response_trust_attempt_found"`
	ResponsePersistenceAttemptFound         bool     `json:"response_persistence_attempt_found"`
	AdapterCallAttemptFound                 bool     `json:"adapter_call_attempt_found"`
	ExecutionAttemptFound                   bool     `json:"execution_attempt_found"`
	ExecutorCallAttemptFound                bool     `json:"executor_call_attempt_found"`
	NetworkAttemptFound                     bool     `json:"network_attempt_found"`
	CommandAttemptFound                     bool     `json:"command_attempt_found"`
	FileWriteAttemptFound                   bool     `json:"file_write_attempt_found"`
	PromotionAttemptFound                   bool     `json:"promotion_attempt_found"`
	DeployAttemptFound                      bool     `json:"deploy_attempt_found"`
	StatusPublishAttemptFound               bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound                 bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound              bool     `json:"stable_learning_attempt_found"`
	RealLockAttemptFound                    bool     `json:"real_lock_attempt_found"`
	RollbackAttemptFound                    bool     `json:"rollback_attempt_found"`
	AutoGoldAttemptFound                    bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound              bool     `json:"authority_grant_attempt_found"`
	DryRunGateClaimFound                    bool     `json:"dry_run_gate_claim_found"`
	SynthesizedGateClaimFound               bool     `json:"synthesized_gate_claim_found"`
	HumanApprovalBypassAttemptFound         bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound          bool     `json:"revalidation_bypass_attempt_found"`
	ResponseContractBypassAttemptFound      bool     `json:"response_contract_bypass_attempt_found"`
	ExternalResponseTrustBypassAttemptFound bool     `json:"external_response_trust_bypass_attempt_found"`
	Recommendations                         []string `json:"recommendations"`
}
type ExecutionResponseExplain struct {
	Version                                         string   `json:"version"`
	DryRun                                          bool     `json:"dry_run"`
	ReadOnly                                        bool     `json:"read_only"`
	WhyResponseContractIsNotExecution               []string `json:"why_response_contract_is_not_execution"`
	WhyResponseTrustIsBlockedInsideMCP              []string `json:"why_response_trust_is_blocked_inside_mcp"`
	WhyResponsePersistenceIsBlockedInsideMCP        []string `json:"why_response_persistence_is_blocked_inside_mcp"`
	WhyRequestEnvelopeIsRequired                    []string `json:"why_request_envelope_is_required"`
	WhyAdapterInterfaceIsRequired                   []string `json:"why_adapter_interface_is_required"`
	WhyFinalAuthorizationIsRequired                 []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                         []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired      []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyResponseContractsAreRequired                 []string `json:"why_response_contracts_are_required"`
	WhyExternalResponseCannotBeTrustedAutomatically []string `json:"why_external_response_cannot_be_trusted_automatically"`
	RequiredGates                                   []string `json:"required_gates"`
	AlwaysDenied                                    []string `json:"always_denied"`
}

func BuildExecutionResponseContract(input ExecutionResponseInput) ExecutionResponseResult {
	return ValidateExecutionResponseContract(input)
}

func ValidateExecutionResponseContract(input ExecutionResponseInput) ExecutionResponseValidation {
	input = NormalizeExecutionResponseContract(input)
	missing, unsafe, conflicts, blocking := []string{}, []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s); blocking = appendUnique(blocking, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s); blocking = appendUnique(blocking, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s); blocking = appendUnique(blocking, s) }
	for name, val := range map[string]string{"response_contract_id": input.ResponseContractID, "request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment, "correlation_id": input.CorrelationID, "idempotency_key": input.IdempotencyKey} {
		if strings.TrimSpace(val) == "" {
			addMissing(name)
		}
	}
	if isMCP(input.Executor) {
		addConflict("executor_must_not_be_mcp")
	}
	if input.ExecutorMode != "external_only" {
		addMissing("external_only")
		addConflict("executor_mode_must_be_external_only")
	}
	if input.RequestEnvelope == nil {
		addMissing("V10.5_request_envelope")
		addConflict(StatusRequestEnvelopeMissing)
	} else {
		if input.RequestEnvelope.Version != "" && input.RequestEnvelope.Version != executionrequest.Version {
			addConflict("request_envelope_version_must_be_V10.5")
		}
		if !input.RequestEnvelope.Valid || input.RequestEnvelope.Blocked {
			addConflict(StatusRequestEnvelopeBlocked)
		}
		if !input.RequestEnvelope.RequestEnvelopeReadyDryRun {
			addMissing("request_envelope_ready_dry_run")
		}
	}
	if input.AdapterInterface == nil {
		addMissing("V10.4_adapter_interface")
		addConflict(StatusAdapterInterfaceMissing)
	} else {
		if input.AdapterInterface.Version != "" && input.AdapterInterface.Version != executionadapter.Version {
			addConflict("adapter_interface_version_must_be_V10.4")
		}
		if !input.AdapterInterface.Valid || input.AdapterInterface.Blocked {
			addConflict(StatusAdapterInterfaceBlocked)
		}
		if !input.AdapterInterface.AdapterInterfaceReadyDryRun {
			addMissing("adapter_interface_ready_dry_run")
		}
	}
	if input.FinalAuthorization == nil {
		addMissing("V10.3_final_authorization")
		addConflict(StatusFinalAuthorizationMissing)
	} else {
		if input.FinalAuthorization.Version != "" && input.FinalAuthorization.Version != finalauthorization.Version {
			addConflict("final_authorization_version_must_be_V10.3")
		}
		if !input.FinalAuthorization.Valid || input.FinalAuthorization.Blocked {
			addConflict(StatusFinalAuthorizationBlocked)
		}
		if !input.FinalAuthorization.FinalAuthorizationReadyDryRun {
			addMissing("final_authorization_ready_dry_run")
		}
	}
	if input.PromotionSimulation == nil {
		addMissing("V10.2_promotion_simulation")
		addConflict(StatusSimulationMissing)
	} else {
		if input.PromotionSimulation.Version != "" && input.PromotionSimulation.Version != promotionsimulation.Version {
			addConflict("simulation_version_must_be_V10.2")
		}
		if !input.PromotionSimulation.Valid || input.PromotionSimulation.Blocked {
			addConflict(StatusSimulationBlocked)
		}
		if !input.PromotionSimulation.SimulationRecordReadyDryRun {
			addMissing("simulation_record_ready_dry_run")
		}
		if !input.PromotionSimulation.ExecutionSimulationCandidate && !input.PromotionSimulation.PromotionExecutionCandidate {
			addMissing("execution_simulation_candidate")
		}
	}
	if input.PromotionFirewall == nil {
		addMissing("V10.1_firewall")
		addConflict(StatusFirewallMissing)
	} else {
		if !input.PromotionFirewall.Valid || !input.PromotionFirewall.FirewallValid || input.PromotionFirewall.Blocked {
			addConflict(StatusFirewallBlocked)
		}
	}
	if input.SovereignDecision == nil {
		addMissing("V10.0_sovereign_candidate")
		addConflict(StatusSovereignCandidateMissing)
	} else {
		if !input.SovereignDecision.Valid || !input.SovereignDecision.SovereignDecisionValid || input.SovereignDecision.Blocked || !input.SovereignDecision.PromotionDecisionCandidate {
			addConflict(StatusSovereignCandidateMissing)
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
	for name, pv := range map[string]*PresenceValid{"response_schema": input.ResponseSchema, "response_metadata": input.ResponseMetadata, "adapter_result_descriptor": input.AdapterResultDescriptor, "execution_outcome_descriptor": input.ExecutionOutcomeDescriptor, "artifact_descriptor": input.ArtifactDescriptor, "evidence_descriptor": input.EvidenceDescriptor, "error_descriptor": input.ErrorDescriptor, "timeout_descriptor": input.TimeoutDescriptor, "rollback_descriptor": input.RollbackDescriptor, "observability_descriptor": input.ObservabilityDescriptor, "audit_descriptor": input.AuditDescriptor, "security_descriptor": input.SecurityDescriptor, "policy_descriptor": input.PolicyDescriptor, "trust_policy": input.TrustPolicy} {
		validatePresence(name, pv, addMissing, addConflict)
	}
	if input.TrustPolicy == nil {
		addConflict(StatusTrustPolicyMissing)
	} else if !input.TrustPolicy.Valid {
		addConflict(StatusTrustPolicyBlocked)
	}
	if input.PolicyDescriptor == nil || !input.PolicyDescriptor.Valid {
		addConflict(StatusPolicyBlocked)
	}
	if input.SafetyControls == nil || !input.SafetyControls.Present || !input.SafetyControls.Valid || !input.SafetyControls.NoMCPExecution || !input.SafetyControls.NoResponseTrustInsideMCP || !input.SafetyControls.NoResponsePersistenceInsideMCP || !input.SafetyControls.NoAdapterCallInsideMCP || !input.SafetyControls.NoNetworkInsideMCP || !input.SafetyControls.NoCommandInsideMCP || !input.SafetyControls.NoFileWriteInsideMCP || !input.SafetyControls.NoDeployInsideMCP || !input.SafetyControls.NoStatusPublishInsideMCP || !input.SafetyControls.NoMemoryStableWriteInsideMCP {
		addMissing("safety_controls")
		addConflict("safety_controls_invalid")
	}
	for _, claim := range unsafeClaims(input.Claims) {
		addUnsafe(claim)
	}
	status := StatusReadyDryRun
	valid := len(missing) == 0 && len(unsafe) == 0 && len(conflicts) == 0
	if !valid {
		status = StatusIncomplete
		if len(unsafe) > 0 || len(conflicts) > 0 {
			status = StatusBlocked
		}
	}
	return ExecutionResponseResult{Version: Version, DryRun: true, ReadOnly: true, ResponseContractStatus: status, Valid: valid, Blocked: !valid, ResponseContractReadyDryRun: valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(blocking)}
}

func BuildExecutionResponseBoundary() ExecutionResponseBoundary {
	return ExecutionResponseBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPCan: []string{"read", "validate", "audit", "explain", "simulate external execution response contract"}, MCPCannot: clone(forbiddenInsideMCP), ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeResponseContract: clone(requiredItems), AlwaysDenied: alwaysDenied(), RequiredRealGates: clone(requiredGates)}
}
func AuditExecutionResponseContract(input ExecutionResponseInput) ExecutionResponseAudit {
	input = NormalizeExecutionResponseContract(input)
	v := ValidateExecutionResponseContract(input)
	c := input.Claims
	if c == nil {
		c = &ExecutionResponseClaims{}
	}
	a := ExecutionResponseAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	a.ResponseTrustAttemptFound = c.ResponseTrustAllowed || c.ExternalResponseTrusted || c.ExternalResponseVerified
	a.ResponsePersistenceAttemptFound = c.ResponsePersistenceAllowed || c.ResponseContractPersisted
	a.AdapterCallAttemptFound = c.AdapterCallAllowed
	a.ExecutionAttemptFound = c.MCPExecutionAllowed || c.ExecutionAllowed || c.CommandExecutionAllowed
	a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
	a.NetworkAttemptFound = c.NetworkCallAllowed
	a.CommandAttemptFound = c.CommandExecutionAllowed
	a.FileWriteAttemptFound = c.FileWriteAllowed
	a.PromotionAttemptFound = c.PromotionAllowed || c.StablePromoted || c.StablePromotionAllowed
	a.DeployAttemptFound = c.DeployAllowed
	a.StatusPublishAttemptFound = c.StatusPublishAllowed
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
	a.ResponseContractBypassAttemptFound = c.ResponseContractBypassed
	a.ExternalResponseTrustBypassAttemptFound = c.ExternalResponseTrustBypassed
	for _, g := range input.RealGates {
		a.DryRunGateClaimFound = a.DryRunGateClaimFound || g.DryRun
		a.SynthesizedGateClaimFound = a.SynthesizedGateClaimFound || g.Synthesized
	}
	return a
}
func ExplainExecutionResponseContract(input ExecutionResponseInput) ExecutionResponseExplain {
	return ExecutionResponseExplain{Version: Version, DryRun: true, ReadOnly: true, WhyResponseContractIsNotExecution: []string{"response_contract_ready_dry_run is advisory only", "V10.6 returns a logical response contract validation and never receives or executes an external response"}, WhyResponseTrustIsBlockedInsideMCP: []string{"MCP is a read-only control plane", "external response trust must occur outside MCP after independent verification"}, WhyResponsePersistenceIsBlockedInsideMCP: []string{"MCP must not persist response contracts or adapter results", "read-only validation cannot write files, memory, stable state, or status"}, WhyRequestEnvelopeIsRequired: []string{"V10.5 request envelope must be valid and request_envelope_ready_dry_run=true before a response contract can be evaluated"}, WhyAdapterInterfaceIsRequired: []string{"V10.4 adapter interface defines the future adapter boundary, but V10.6 never calls it"}, WhyFinalAuthorizationIsRequired: []string{"V10.3 final authorization must be valid and final_authorization_ready_dry_run=true before response contract readiness can be considered"}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real, non-dry-run, non-synthesized, and authority-recognized"}, WhyHumanApprovalAndRevalidationAreRequired: []string{"future external execution response handling requires real human approval", "independent revalidation must confirm PASS_GOLD and PASS_SECURE"}, WhyResponseContractsAreRequired: []string{"schema, metadata, correlation, idempotency, result, outcome, artifact, evidence, error, timeout, rollback, observability, audit, security, policy, and trust descriptors define the future response boundary"}, WhyExternalResponseCannotBeTrustedAutomatically: []string{"adapter output is untrusted input until independently verified outside MCP", "V10.6 blocks automatic trust, persistence, promotion, deployment, and authority grants"}, RequiredGates: clone(requiredGates), AlwaysDenied: alwaysDenied()}
}

func NormalizeExecutionResponseContract(input ExecutionResponseInput) ExecutionResponseInput {
	if input.ResponseContract != nil {
		input = mergeInput(input, *input.ResponseContract)
	}
	if input.RequestEnvelope == nil && input.ExecutionRequest != nil {
		input.RequestEnvelope = input.ExecutionRequest
	}
	if input.AdapterInterface == nil && input.ExternalExecutionAdapter != nil {
		input.AdapterInterface = input.ExternalExecutionAdapter
	}
	if input.FinalAuthorization == nil && input.Authorization != nil {
		input.FinalAuthorization = input.Authorization
	}
	if input.PromotionSimulation == nil && input.Simulation != nil {
		input.PromotionSimulation = input.Simulation
	}
	if input.PromotionFirewall == nil && input.Firewall != nil {
		input.PromotionFirewall = input.Firewall
	}
	if input.SovereignDecision == nil && input.Decision != nil {
		input.SovereignDecision = input.Decision
	}
	if input.Claims == nil {
		input.Claims = &ExecutionResponseClaims{}
	}
	c := input.Claims
	c.MCPExecutionAllowed = c.MCPExecutionAllowed || input.MCPExecutionAllowed
	c.ResponseTrustAllowed = c.ResponseTrustAllowed || input.ResponseTrustAllowed
	c.ResponsePersistenceAllowed = c.ResponsePersistenceAllowed || input.ResponsePersistenceAllowed
	c.AdapterCallAllowed = c.AdapterCallAllowed || input.AdapterCallAllowed
	c.ExecutorCallAllowed = c.ExecutorCallAllowed || input.ExecutorCallAllowed
	c.NetworkCallAllowed = c.NetworkCallAllowed || input.NetworkCallAllowed
	c.CommandExecutionAllowed = c.CommandExecutionAllowed || input.CommandExecutionAllowed
	c.FileWriteAllowed = c.FileWriteAllowed || input.FileWriteAllowed
	c.PromotionAllowed = c.PromotionAllowed || input.PromotionAllowed
	c.DeployAllowed = c.DeployAllowed || input.DeployAllowed
	c.StatusPublishAllowed = c.StatusPublishAllowed || input.StatusPublishAllowed
	c.MutationAllowed = c.MutationAllowed || input.MutationAllowed
	c.MemoryWriteAllowed = c.MemoryWriteAllowed || input.MemoryWriteAllowed
	c.StablePromotionAllowed = c.StablePromotionAllowed || input.StablePromotionAllowed
	c.LearningAllowed = c.LearningAllowed || input.LearningAllowed
	c.RealLockAllowed = c.RealLockAllowed || input.RealLockAllowed
	c.RollbackAllowed = c.RollbackAllowed || input.RollbackAllowed
	c.PassGoldAllowed = c.PassGoldAllowed || input.PassGoldAllowed
	c.PassSecureAllowed = c.PassSecureAllowed || input.PassSecureAllowed
	c.AuthorityGrantAllowed = c.AuthorityGrantAllowed || input.AuthorityGrantAllowed
	return input
}

func mergeInput(base, n ExecutionResponseInput) ExecutionResponseInput {
	if base.ResponseContractID == "" {
		base.ResponseContractID = n.ResponseContractID
	}
	if base.RequestEnvelopeID == "" {
		base.RequestEnvelopeID = n.RequestEnvelopeID
	}
	if base.AdapterInterfaceID == "" {
		base.AdapterInterfaceID = n.AdapterInterfaceID
	}
	if base.FinalAuthorizationID == "" {
		base.FinalAuthorizationID = n.FinalAuthorizationID
	}
	if base.SimulationID == "" {
		base.SimulationID = n.SimulationID
	}
	if base.FirewallID == "" {
		base.FirewallID = n.FirewallID
	}
	if base.DecisionID == "" {
		base.DecisionID = n.DecisionID
	}
	if base.InvocationID == "" {
		base.InvocationID = n.InvocationID
	}
	if base.Executor == "" {
		base.Executor = n.Executor
	}
	if base.ExecutorMode == "" {
		base.ExecutorMode = n.ExecutorMode
	}
	if base.AdapterName == "" {
		base.AdapterName = n.AdapterName
	}
	if base.AdapterVersion == "" {
		base.AdapterVersion = n.AdapterVersion
	}
	if base.AdapterType == "" {
		base.AdapterType = n.AdapterType
	}
	if base.Project == "" {
		base.Project = n.Project
	}
	if base.Branch == "" {
		base.Branch = n.Branch
	}
	if base.CommitSHA == "" {
		base.CommitSHA = n.CommitSHA
	}
	if base.Target == "" {
		base.Target = n.Target
	}
	if base.Environment == "" {
		base.Environment = n.Environment
	}
	if base.RequestEnvelope == nil {
		base.RequestEnvelope = n.RequestEnvelope
	}
	if base.AdapterInterface == nil {
		base.AdapterInterface = n.AdapterInterface
	}
	if base.FinalAuthorization == nil {
		base.FinalAuthorization = n.FinalAuthorization
	}
	if base.PromotionSimulation == nil {
		base.PromotionSimulation = n.PromotionSimulation
	}
	if base.PromotionFirewall == nil {
		base.PromotionFirewall = n.PromotionFirewall
	}
	if base.SovereignDecision == nil {
		base.SovereignDecision = n.SovereignDecision
	}
	if len(base.RealGates) == 0 {
		base.RealGates = n.RealGates
	}
	if base.HumanApproval == nil {
		base.HumanApproval = n.HumanApproval
	}
	if base.IndependentRevalidation == nil {
		base.IndependentRevalidation = n.IndependentRevalidation
	}
	if base.ResponseSchema == nil {
		base.ResponseSchema = n.ResponseSchema
	}
	if base.ResponseMetadata == nil {
		base.ResponseMetadata = n.ResponseMetadata
	}
	if base.CorrelationID == "" {
		base.CorrelationID = n.CorrelationID
	}
	if base.IdempotencyKey == "" {
		base.IdempotencyKey = n.IdempotencyKey
	}
	if base.AdapterResultDescriptor == nil {
		base.AdapterResultDescriptor = n.AdapterResultDescriptor
	}
	if base.ExecutionOutcomeDescriptor == nil {
		base.ExecutionOutcomeDescriptor = n.ExecutionOutcomeDescriptor
	}
	if base.ArtifactDescriptor == nil {
		base.ArtifactDescriptor = n.ArtifactDescriptor
	}
	if base.EvidenceDescriptor == nil {
		base.EvidenceDescriptor = n.EvidenceDescriptor
	}
	if base.ErrorDescriptor == nil {
		base.ErrorDescriptor = n.ErrorDescriptor
	}
	if base.TimeoutDescriptor == nil {
		base.TimeoutDescriptor = n.TimeoutDescriptor
	}
	if base.RollbackDescriptor == nil {
		base.RollbackDescriptor = n.RollbackDescriptor
	}
	if base.ObservabilityDescriptor == nil {
		base.ObservabilityDescriptor = n.ObservabilityDescriptor
	}
	if base.AuditDescriptor == nil {
		base.AuditDescriptor = n.AuditDescriptor
	}
	if base.SecurityDescriptor == nil {
		base.SecurityDescriptor = n.SecurityDescriptor
	}
	if base.PolicyDescriptor == nil {
		base.PolicyDescriptor = n.PolicyDescriptor
	}
	if base.TrustPolicy == nil {
		base.TrustPolicy = n.TrustPolicy
	}
	if base.SafetyControls == nil {
		base.SafetyControls = n.SafetyControls
	}
	if base.Claims == nil {
		base.Claims = n.Claims
	}
	return base
}
func validatePresence(name string, pv *PresenceValid, addMissing func(string), addConflict func(string)) {
	if pv == nil || !pv.Present {
		addMissing(name)
		if name == "response_schema" {
			addConflict(StatusResponseContractMissing)
		}
		return
	}
	if !pv.Valid {
		addConflict(name + "_invalid")
		if name == "response_schema" {
			addConflict(StatusResponseContractInvalid)
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
func unsafeClaims(c *ExecutionResponseClaims) []string {
	if c == nil {
		return nil
	}
	out := []string{}
	add := func(name string, b bool) {
		if b {
			out = appendUnique(out, name)
		}
	}
	add("mcp_execution_allowed", c.MCPExecutionAllowed)
	add("response_trust_allowed", c.ResponseTrustAllowed)
	add("response_persistence_allowed", c.ResponsePersistenceAllowed)
	add("adapter_call_allowed", c.AdapterCallAllowed)
	add("executor_call_allowed", c.ExecutorCallAllowed)
	add("network_call_allowed", c.NetworkCallAllowed)
	add("command_execution_allowed", c.CommandExecutionAllowed)
	add("file_write_allowed", c.FileWriteAllowed)
	add("promotion_allowed", c.PromotionAllowed)
	add("deploy_allowed", c.DeployAllowed)
	add("status_publish_allowed", c.StatusPublishAllowed)
	add("mutation_allowed", c.MutationAllowed)
	add("memory_write_allowed", c.MemoryWriteAllowed)
	add("stable_promotion_allowed", c.StablePromotionAllowed)
	add("learning_allowed", c.LearningAllowed)
	add("stable_promoted", c.StablePromoted)
	add("learned_as_stable", c.LearnedAsStable)
	add("execution_allowed", c.ExecutionAllowed)
	add("real_lock_acquired", c.RealLockAcquired)
	add("rollback_performed", c.RollbackPerformed)
	add("response_contract_persisted", c.ResponseContractPersisted)
	add("pass_gold", c.PassGold)
	add("pass_secure", c.PassSecure)
	add("pass_gold_allowed", c.PassGoldAllowed)
	add("pass_secure_allowed", c.PassSecureAllowed)
	add("authority_granted", c.AuthorityGranted)
	add("authority_grant_allowed", c.AuthorityGrantAllowed)
	add("external_response_trusted", c.ExternalResponseTrusted)
	add("external_response_verified", c.ExternalResponseVerified)
	return out
}
func alwaysDenied() []string {
	return []string{"mcp_execution_allowed", "response_trust_allowed", "response_persistence_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}
}
func recommendations(blocking []string) []string {
	if len(blocking) == 0 {
		return []string{"response contract is ready for dry-run review only; no real permission is granted"}
	}
	return []string{"resolve missing or invalid prerequisites outside MCP", "keep MCP read-only and do not trust, persist, execute, promote, deploy, or grant authority from this contract"}
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
