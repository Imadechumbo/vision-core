// Package executionrequest implements V10.5 External Execution Request Envelope.
//
// V10.5 builds, validates, audits, and explains the logical request envelope a
// future external execution layer could receive. It is strictly read-only/dry-run:
// it never sends requests, calls adapters or executors, performs network or
// command activity, writes files, deploys, publishes status, persists envelopes,
// promotes stable, learns stable state, acquires real locks, performs rollback,
// marks PASS gates, or grants authority.
package executionrequest

import (
	"strings"

	"github.com/visioncore/go-core/internal/executionadapter"
	"github.com/visioncore/go-core/internal/finalauthorization"
	"github.com/visioncore/go-core/internal/promotionsimulation"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V10.5"

const (
	StatusReadyDryRun               = "request_envelope_ready_dry_run"
	StatusIncomplete                = "incomplete"
	StatusBlocked                   = "blocked"
	StatusAdapterInterfaceMissing   = "adapter_interface_missing"
	StatusAdapterInterfaceBlocked   = "adapter_interface_blocked"
	StatusFinalAuthorizationMissing = "final_authorization_missing"
	StatusFinalAuthorizationBlocked = "final_authorization_blocked"
	StatusSimulationMissing         = "simulation_missing"
	StatusSimulationBlocked         = "simulation_blocked"
	StatusFirewallMissing           = "firewall_missing"
	StatusFirewallBlocked           = "firewall_blocked"
	StatusSovereignCandidateMiss    = "sovereign_candidate_missing"
	StatusMissingRealGates          = "missing_real_gates"
	StatusHumanApprovalRequired     = "human_approval_required"
	StatusRevalidationRequired      = "revalidation_required"
	StatusRequestContractMissing    = "request_contract_missing"
	StatusRequestContractInvalid    = "request_contract_invalid"
	StatusPolicyBlocked             = "policy_blocked"
	StatusUnsafeRequestSendAttempt  = "unsafe_request_send_attempt"
	StatusUnsafeAdapterCallAttempt  = "unsafe_adapter_call_attempt"
	StatusUnsafeExecutionAttempt    = "unsafe_execution_attempt"
	StatusUnsafePromotionAttempt    = "unsafe_promotion_attempt"
	StatusUnsafePersistenceAttempt  = "unsafe_persistence_attempt"
)

var requiredItems = []string{
	"request_envelope_id", "adapter_interface_id", "final_authorization_id", "simulation_id", "firewall_id", "decision_id", "invocation_id", "executor", "executor_mode", "external_only", "adapter_name", "adapter_version", "adapter_type", "project", "branch", "commit_sha", "target", "environment",
	"V10.4_adapter_interface", "adapter_interface_ready_dry_run", "V10.3_final_authorization", "final_authorization_ready_dry_run", "V10.2_promotion_simulation", "V10.1_firewall", "V10.0_sovereign_candidate",
	"PASS_GOLD_REAL", "PASS_SECURE_REAL", "human_approval", "independent_revalidation", "request_payload_schema", "request_metadata", "correlation_id", "idempotency_key", "target_descriptor", "operation_descriptor", "execution_constraints", "safety_constraints", "audit_descriptor", "rollback_descriptor", "observability_descriptor", "timeout_descriptor", "kill_switch_descriptor", "error_handling_descriptor", "security_descriptor", "policy_descriptor",
	"no_MCP_execution", "no_request_send_inside_MCP", "no_adapter_call_inside_MCP", "no_network_inside_MCP", "no_command_inside_MCP", "no_file_write_inside_MCP", "no_deploy_inside_MCP", "no_status_publish_inside_MCP", "no_memory_stable_write_inside_MCP",
}
var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var forbiddenInsideMCP = []string{"send_request", "execute", "call_adapter", "call_executor", "network_call", "command_execution", "file_write", "promote", "deploy", "publish_status", "push", "open_pr", "mutate", "write_memory", "learn_stable", "acquire_real_lock", "perform_rollback", "persist_request_envelope", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}

type ExecutionRequestInput struct {
	Root                      string                                `json:"root,omitempty"`
	Operation                 string                                `json:"operation,omitempty"`
	RequestEnvelope           *ExecutionRequestInput                `json:"request_envelope,omitempty"`
	RequestEnvelopeID         string                                `json:"request_envelope_id,omitempty"`
	AdapterInterfaceID        string                                `json:"adapter_interface_id,omitempty"`
	FinalAuthorizationID      string                                `json:"final_authorization_id,omitempty"`
	SimulationID              string                                `json:"simulation_id,omitempty"`
	FirewallID                string                                `json:"firewall_id,omitempty"`
	DecisionID                string                                `json:"decision_id,omitempty"`
	InvocationID              string                                `json:"invocation_id,omitempty"`
	Executor                  string                                `json:"executor,omitempty"`
	ExecutorMode              string                                `json:"executor_mode,omitempty"`
	AdapterName               string                                `json:"adapter_name,omitempty"`
	AdapterVersion            string                                `json:"adapter_version,omitempty"`
	AdapterType               string                                `json:"adapter_type,omitempty"`
	Project                   string                                `json:"project,omitempty"`
	Branch                    string                                `json:"branch,omitempty"`
	CommitSHA                 string                                `json:"commit_sha,omitempty"`
	Target                    string                                `json:"target,omitempty"`
	Environment               string                                `json:"environment,omitempty"`
	AdapterInterface          *AdapterInterfaceEvidence             `json:"adapter_interface,omitempty"`
	ExternalExecutionAdapter  *AdapterInterfaceEvidence             `json:"external_execution_adapter,omitempty"`
	FinalAuthorization        *FinalAuthorizationEvidence           `json:"final_authorization,omitempty"`
	Authorization             *FinalAuthorizationEvidence           `json:"authorization,omitempty"`
	PromotionSimulation       *SimulationEvidence                   `json:"promotion_simulation,omitempty"`
	Simulation                *SimulationEvidence                   `json:"simulation,omitempty"`
	PromotionFirewall         *FirewallEvidence                     `json:"promotion_firewall,omitempty"`
	Firewall                  *FirewallEvidence                     `json:"firewall,omitempty"`
	SovereignDecision         *SovereignDecisionEvidence            `json:"sovereign_decision,omitempty"`
	Decision                  *SovereignDecisionEvidence            `json:"decision,omitempty"`
	RealGates                 []sovereigndecision.SovereignRealGate `json:"real_gates,omitempty"`
	HumanApproval             *HumanApproval                        `json:"human_approval,omitempty"`
	IndependentRevalidation   *IndependentRevalidation              `json:"independent_revalidation,omitempty"`
	RequestPayloadSchema      *PresenceValid                        `json:"request_payload_schema,omitempty"`
	RequestMetadata           *PresenceValid                        `json:"request_metadata,omitempty"`
	CorrelationID             string                                `json:"correlation_id,omitempty"`
	IdempotencyKey            string                                `json:"idempotency_key,omitempty"`
	TargetDescriptor          *PresenceValid                        `json:"target_descriptor,omitempty"`
	OperationDescriptor       *PresenceValid                        `json:"operation_descriptor,omitempty"`
	ExecutionConstraints      *PresenceValid                        `json:"execution_constraints,omitempty"`
	SafetyConstraints         *PresenceValid                        `json:"safety_constraints,omitempty"`
	AuditDescriptor           *PresenceValid                        `json:"audit_descriptor,omitempty"`
	RollbackDescriptor        *PresenceValid                        `json:"rollback_descriptor,omitempty"`
	ObservabilityDescriptor   *PresenceValid                        `json:"observability_descriptor,omitempty"`
	TimeoutDescriptor         *PresenceValid                        `json:"timeout_descriptor,omitempty"`
	KillSwitchDescriptor      *PresenceValid                        `json:"kill_switch_descriptor,omitempty"`
	ErrorHandlingDescriptor   *PresenceValid                        `json:"error_handling_descriptor,omitempty"`
	SecurityDescriptor        *PresenceValid                        `json:"security_descriptor,omitempty"`
	PolicyDescriptor          *PresenceValid                        `json:"policy_descriptor,omitempty"`
	SafetyControls            *SafetyControls                       `json:"safety_controls,omitempty"`
	Claims                    *ExecutionRequestClaims               `json:"claims,omitempty"`
	MCPExecutionAllowed       bool                                  `json:"mcp_execution_allowed,omitempty"`
	RequestSendAllowed        bool                                  `json:"request_send_allowed,omitempty"`
	AdapterCallAllowed        bool                                  `json:"adapter_call_allowed,omitempty"`
	ExecutorCallAllowed       bool                                  `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed        bool                                  `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed   bool                                  `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed          bool                                  `json:"file_write_allowed,omitempty"`
	PromotionAllowed          bool                                  `json:"promotion_allowed,omitempty"`
	DeployAllowed             bool                                  `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed      bool                                  `json:"status_publish_allowed,omitempty"`
	MutationAllowed           bool                                  `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed        bool                                  `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed    bool                                  `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed           bool                                  `json:"learning_allowed,omitempty"`
	RealLockAllowed           bool                                  `json:"real_lock_allowed,omitempty"`
	RollbackAllowed           bool                                  `json:"rollback_allowed,omitempty"`
	RequestPersistenceAllowed bool                                  `json:"request_persistence_allowed,omitempty"`
	PassGoldAllowed           bool                                  `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed         bool                                  `json:"pass_secure_allowed,omitempty"`
	AuthorityGrantAllowed     bool                                  `json:"authority_grant_allowed,omitempty"`
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
type FinalAuthorizationEvidence = executionadapter.FinalAuthorizationEvidence
type SimulationEvidence = executionadapter.SimulationEvidence
type FirewallEvidence = executionadapter.FirewallEvidence
type SovereignDecisionEvidence = executionadapter.SovereignDecisionEvidence
type PresenceValid = executionadapter.PresenceValid
type HumanApproval = executionadapter.HumanApproval
type IndependentRevalidation = executionadapter.IndependentRevalidation

type SafetyControls struct {
	Present                      bool `json:"present"`
	Valid                        bool `json:"valid"`
	NoMCPExecution               bool `json:"no_mcp_execution"`
	NoRequestSendInsideMCP       bool `json:"no_request_send_inside_mcp"`
	NoAdapterCallInsideMCP       bool `json:"no_adapter_call_inside_mcp"`
	NoNetworkInsideMCP           bool `json:"no_network_inside_mcp"`
	NoCommandInsideMCP           bool `json:"no_command_inside_mcp"`
	NoFileWriteInsideMCP         bool `json:"no_file_write_inside_mcp"`
	NoDeployInsideMCP            bool `json:"no_deploy_inside_mcp"`
	NoStatusPublishInsideMCP     bool `json:"no_status_publish_inside_mcp"`
	NoMemoryStableWriteInsideMCP bool `json:"no_memory_stable_write_inside_mcp"`
}

type ExecutionRequestClaims struct {
	MCPExecutionAllowed       bool `json:"mcp_execution_allowed"`
	RequestSendAllowed        bool `json:"request_send_allowed"`
	AdapterCallAllowed        bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed       bool `json:"executor_call_allowed"`
	NetworkCallAllowed        bool `json:"network_call_allowed"`
	CommandExecutionAllowed   bool `json:"command_execution_allowed"`
	FileWriteAllowed          bool `json:"file_write_allowed"`
	PromotionAllowed          bool `json:"promotion_allowed"`
	DeployAllowed             bool `json:"deploy_allowed"`
	StatusPublishAllowed      bool `json:"status_publish_allowed"`
	MutationAllowed           bool `json:"mutation_allowed"`
	MemoryWriteAllowed        bool `json:"memory_write_allowed"`
	StablePromotionAllowed    bool `json:"stable_promotion_allowed"`
	LearningAllowed           bool `json:"learning_allowed"`
	StablePromoted            bool `json:"stable_promoted"`
	LearnedAsStable           bool `json:"learned_as_stable"`
	ExecutionAllowed          bool `json:"execution_allowed"`
	RealLockAllowed           bool `json:"real_lock_allowed"`
	RealLockAcquired          bool `json:"real_lock_acquired"`
	RollbackAllowed           bool `json:"rollback_allowed"`
	RollbackPerformed         bool `json:"rollback_performed"`
	RequestEnvelopePersisted  bool `json:"request_envelope_persisted"`
	RequestPersistenceAllowed bool `json:"request_persistence_allowed"`
	PassGold                  bool `json:"pass_gold"`
	PassSecure                bool `json:"pass_secure"`
	PassGoldAllowed           bool `json:"pass_gold_allowed"`
	PassSecureAllowed         bool `json:"pass_secure_allowed"`
	AuthorityGranted          bool `json:"authority_granted"`
	AuthorityGrantAllowed     bool `json:"authority_grant_allowed"`
	DryRunGateClaim           bool `json:"dry_run_gate_claim"`
	SynthesizedGateClaim      bool `json:"synthesized_gate_claim"`
	HumanApprovalBypassed     bool `json:"human_approval_bypassed"`
	RevalidationBypassed      bool `json:"revalidation_bypassed"`
	RequestContractBypassed   bool `json:"request_contract_bypassed"`
	ContractBypassed          bool `json:"contract_bypassed"`
}

type ExecutionRequestResult struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	RequestEnvelopeStatus      string   `json:"request_envelope_status"`
	Valid                      bool     `json:"valid"`
	Blocked                    bool     `json:"blocked"`
	RequestEnvelopeReadyDryRun bool     `json:"request_envelope_ready_dry_run"`
	MissingItems               []string `json:"missing_items"`
	UnsafeClaims               []string `json:"unsafe_claims"`
	Conflicts                  []string `json:"conflicts"`
	BlockingReasons            []string `json:"blocking_reasons"`
	RequiredItems              []string `json:"required_items"`
	RequiredRealGates          []string `json:"required_real_gates"`
	Recommendations            []string `json:"recommendations"`
	MCPExecutionAllowed        bool     `json:"mcp_execution_allowed"`
	RequestSendAllowed         bool     `json:"request_send_allowed"`
	AdapterCallAllowed         bool     `json:"adapter_call_allowed"`
	ExecutorCallAllowed        bool     `json:"executor_call_allowed"`
	NetworkCallAllowed         bool     `json:"network_call_allowed"`
	CommandExecutionAllowed    bool     `json:"command_execution_allowed"`
	FileWriteAllowed           bool     `json:"file_write_allowed"`
	PromotionAllowed           bool     `json:"promotion_allowed"`
	DeployAllowed              bool     `json:"deploy_allowed"`
	StatusPublishAllowed       bool     `json:"status_publish_allowed"`
	MutationAllowed            bool     `json:"mutation_allowed"`
	MemoryWriteAllowed         bool     `json:"memory_write_allowed"`
	StablePromotionAllowed     bool     `json:"stable_promotion_allowed"`
	LearningAllowed            bool     `json:"learning_allowed"`
	RealLockAllowed            bool     `json:"real_lock_allowed"`
	RollbackAllowed            bool     `json:"rollback_allowed"`
	RequestPersistenceAllowed  bool     `json:"request_persistence_allowed"`
	PassGoldAllowed            bool     `json:"pass_gold_allowed"`
	PassSecureAllowed          bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed      bool     `json:"authority_grant_allowed"`
}
type ExecutionRequestValidation = ExecutionRequestResult

type ExecutionRequestBoundary struct {
	Version                       string   `json:"version"`
	DryRun                        bool     `json:"dry_run"`
	ReadOnly                      bool     `json:"read_only"`
	MCPCan                        []string `json:"mcp_can"`
	MCPCannot                     []string `json:"mcp_cannot"`
	ForbiddenInsideMCP            []string `json:"forbidden_inside_mcp"`
	RequiredBeforeRequestEnvelope []string `json:"required_before_request_envelope"`
	AlwaysDenied                  []string `json:"always_denied"`
	RequiredRealGates             []string `json:"required_real_gates"`
}
type ExecutionRequestAudit struct {
	Version                           string   `json:"version"`
	DryRun                            bool     `json:"dry_run"`
	ReadOnly                          bool     `json:"read_only"`
	ConflictsFound                    bool     `json:"conflicts_found"`
	Conflicts                         []string `json:"conflicts"`
	UnsafeClaimsFound                 bool     `json:"unsafe_claims_found"`
	UnsafeClaims                      []string `json:"unsafe_claims"`
	MissingItemsFound                 bool     `json:"missing_items_found"`
	MissingItems                      []string `json:"missing_items"`
	RequestSendAttemptFound           bool     `json:"request_send_attempt_found"`
	AdapterCallAttemptFound           bool     `json:"adapter_call_attempt_found"`
	ExecutionAttemptFound             bool     `json:"execution_attempt_found"`
	ExecutorCallAttemptFound          bool     `json:"executor_call_attempt_found"`
	NetworkAttemptFound               bool     `json:"network_attempt_found"`
	CommandAttemptFound               bool     `json:"command_attempt_found"`
	FileWriteAttemptFound             bool     `json:"file_write_attempt_found"`
	PromotionAttemptFound             bool     `json:"promotion_attempt_found"`
	DeployAttemptFound                bool     `json:"deploy_attempt_found"`
	StatusPublishAttemptFound         bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound           bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound        bool     `json:"stable_learning_attempt_found"`
	RealLockAttemptFound              bool     `json:"real_lock_attempt_found"`
	RollbackAttemptFound              bool     `json:"rollback_attempt_found"`
	RequestPersistenceAttemptFound    bool     `json:"request_persistence_attempt_found"`
	AutoGoldAttemptFound              bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound        bool     `json:"authority_grant_attempt_found"`
	DryRunGateClaimFound              bool     `json:"dry_run_gate_claim_found"`
	SynthesizedGateClaimFound         bool     `json:"synthesized_gate_claim_found"`
	HumanApprovalBypassAttemptFound   bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound    bool     `json:"revalidation_bypass_attempt_found"`
	RequestContractBypassAttemptFound bool     `json:"request_contract_bypass_attempt_found"`
	Recommendations                   []string `json:"recommendations"`
}
type ExecutionRequestExplain struct {
	Version                                    string   `json:"version"`
	DryRun                                     bool     `json:"dry_run"`
	ReadOnly                                   bool     `json:"read_only"`
	WhyRequestEnvelopeIsNotExecution           []string `json:"why_request_envelope_is_not_execution"`
	WhyRequestSendIsBlockedInsideMCP           []string `json:"why_request_send_is_blocked_inside_mcp"`
	WhyAdapterInterfaceIsRequired              []string `json:"why_adapter_interface_is_required"`
	WhyFinalAuthorizationIsRequired            []string `json:"why_final_authorization_is_required"`
	WhyRealGatesAreRequired                    []string `json:"why_real_gates_are_required"`
	WhyHumanApprovalAndRevalidationAreRequired []string `json:"why_human_approval_and_revalidation_are_required"`
	WhyRequestContractsAreRequired             []string `json:"why_request_contracts_are_required"`
	RequiredGates                              []string `json:"required_gates"`
	AlwaysDenied                               []string `json:"always_denied"`
}

func BuildExecutionRequestEnvelope(input ExecutionRequestInput) ExecutionRequestResult {
	return ValidateExecutionRequestEnvelope(input)
}
func ValidateExecutionRequestEnvelope(input ExecutionRequestInput) ExecutionRequestValidation {
	input = NormalizeExecutionRequestEnvelope(input)
	missing, unsafe, conflicts, blocking := []string{}, []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s); blocking = appendUnique(blocking, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s); blocking = appendUnique(blocking, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s); blocking = appendUnique(blocking, s) }
	for name, val := range map[string]string{"request_envelope_id": input.RequestEnvelopeID, "adapter_interface_id": input.AdapterInterfaceID, "final_authorization_id": input.FinalAuthorizationID, "simulation_id": input.SimulationID, "firewall_id": input.FirewallID, "decision_id": input.DecisionID, "invocation_id": input.InvocationID, "executor": input.Executor, "adapter_name": input.AdapterName, "adapter_version": input.AdapterVersion, "adapter_type": input.AdapterType, "project": input.Project, "branch": input.Branch, "commit_sha": input.CommitSHA, "target": input.Target, "environment": input.Environment, "correlation_id": input.CorrelationID, "idempotency_key": input.IdempotencyKey} {
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
	if input.AdapterInterface == nil {
		addMissing("V10.4_adapter_interface")
		addConflict("adapter_interface_missing")
	} else {
		if input.AdapterInterface.Version != "" && input.AdapterInterface.Version != executionadapter.Version {
			addConflict("adapter_interface_version_must_be_V10.4")
		}
		if !input.AdapterInterface.Valid || input.AdapterInterface.Blocked {
			addConflict("adapter_interface_blocked")
		}
		if !input.AdapterInterface.AdapterInterfaceReadyDryRun {
			addMissing("adapter_interface_ready_dry_run")
		}
	}
	if input.FinalAuthorization == nil {
		addMissing("V10.3_final_authorization")
		addConflict("final_authorization_missing")
	} else {
		if input.FinalAuthorization.Version != "" && input.FinalAuthorization.Version != finalauthorization.Version {
			addConflict("final_authorization_version_must_be_V10.3")
		}
		if !input.FinalAuthorization.Valid || input.FinalAuthorization.Blocked {
			addConflict("final_authorization_blocked")
		}
		if !input.FinalAuthorization.FinalAuthorizationReadyDryRun {
			addMissing("final_authorization_ready_dry_run")
		}
	}
	if input.PromotionSimulation == nil {
		addMissing("V10.2_promotion_simulation")
		addConflict("simulation_missing")
	} else {
		if input.PromotionSimulation.Version != "" && input.PromotionSimulation.Version != promotionsimulation.Version {
			addConflict("simulation_version_must_be_V10.2")
		}
		if !input.PromotionSimulation.Valid || input.PromotionSimulation.Blocked {
			addConflict("simulation_blocked")
		}
		if !input.PromotionSimulation.SimulationRecordReadyDryRun {
			addMissing("simulation_record_ready_dry_run")
		}
		if !(input.PromotionSimulation.ExecutionSimulationCandidate || input.PromotionSimulation.PromotionExecutionCandidate) {
			addMissing("execution_simulation_candidate")
		}
	}
	if input.PromotionFirewall == nil {
		addMissing("V10.1_firewall")
		addConflict("firewall_missing")
	} else {
		if !input.PromotionFirewall.Valid || !input.PromotionFirewall.FirewallValid || input.PromotionFirewall.Blocked {
			addConflict("firewall_blocked")
		}
		if !input.PromotionFirewall.ExecutionEligibilityReadyDryRun {
			addMissing("execution_eligibility_ready_dry_run")
		}
	}
	if input.SovereignDecision == nil {
		addMissing("V10.0_sovereign_candidate")
		addConflict("sovereign_candidate_missing")
	} else {
		if !input.SovereignDecision.Valid || !input.SovereignDecision.SovereignDecisionValid || input.SovereignDecision.Blocked {
			addConflict("sovereign_candidate_missing")
		}
		if !input.SovereignDecision.PromotionDecisionCandidate {
			addMissing("promotion_decision_candidate")
		}
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
	if input.HumanApproval == nil || !input.HumanApproval.Present {
		addMissing("human_approval")
	} else {
		if input.HumanApproval.Placeholder || input.HumanApproval.ApprovalIsPlaceholder || input.HumanApproval.Approver == "" || input.HumanApproval.ApprovalReference == "" {
			addConflict("human_approval_placeholder")
		}
		if !input.HumanApproval.Approved {
			addConflict("human_approval_approved_false")
		}
		if !input.HumanApproval.Valid {
			addConflict("human_approval_invalid")
		}
	}
	if input.IndependentRevalidation == nil || !input.IndependentRevalidation.Present {
		addMissing("independent_revalidation")
	} else {
		if input.IndependentRevalidation.Placeholder || input.IndependentRevalidation.RevalidationIsPlaceholder || input.IndependentRevalidation.Validator == "" || input.IndependentRevalidation.RevalidationReference == "" {
			addConflict("independent_revalidation_placeholder")
		}
		if !input.IndependentRevalidation.Completed {
			addConflict("independent_revalidation_completed_false")
		}
		if !input.IndependentRevalidation.PassGoldRevalidated {
			addConflict("pass_gold_revalidated_false")
		}
		if !input.IndependentRevalidation.PassSecureRevalidated {
			addConflict("pass_secure_revalidated_false")
		}
		if !input.IndependentRevalidation.Valid {
			addConflict("independent_revalidation_invalid")
		}
	}
	for name, item := range map[string]*PresenceValid{"request_payload_schema": input.RequestPayloadSchema, "request_metadata": input.RequestMetadata, "target_descriptor": input.TargetDescriptor, "operation_descriptor": input.OperationDescriptor, "execution_constraints": input.ExecutionConstraints, "safety_constraints": input.SafetyConstraints, "audit_descriptor": input.AuditDescriptor, "rollback_descriptor": input.RollbackDescriptor, "observability_descriptor": input.ObservabilityDescriptor, "timeout_descriptor": input.TimeoutDescriptor, "kill_switch_descriptor": input.KillSwitchDescriptor, "error_handling_descriptor": input.ErrorHandlingDescriptor, "security_descriptor": input.SecurityDescriptor, "policy_descriptor": input.PolicyDescriptor} {
		if item == nil || !item.Present {
			addMissing(name)
		} else if !item.Valid {
			addConflict(name + "_invalid")
		}
	}
	if input.SafetyControls == nil || !input.SafetyControls.Present {
		addMissing("safety_controls")
	} else if !safetyControlsValid(input.SafetyControls) {
		addConflict("safety_controls_invalid")
	}
	if input.Claims != nil {
		addUnsafeClaims(input.Claims, addUnsafe)
	}
	valid := len(missing) == 0 && len(unsafe) == 0 && len(conflicts) == 0
	return ExecutionRequestResult{Version: Version, DryRun: true, ReadOnly: true, RequestEnvelopeStatus: requestStatus(missing, unsafe, conflicts), Valid: valid, Blocked: !valid, RequestEnvelopeReadyDryRun: valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(missing, unsafe, conflicts)}
}

func BuildExecutionRequestBoundary() ExecutionRequestBoundary {
	return ExecutionRequestBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPCan: []string{"read", "validate", "audit", "explain", "simulate external execution request envelope"}, MCPCannot: clone(forbiddenInsideMCP), ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeRequestEnvelope: clone(requiredItems), AlwaysDenied: alwaysDenied(), RequiredRealGates: clone(requiredGates)}
}
func AuditExecutionRequestEnvelope(input ExecutionRequestInput) ExecutionRequestAudit {
	input = NormalizeExecutionRequestEnvelope(input)
	v := ValidateExecutionRequestEnvelope(input)
	a := ExecutionRequestAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	if input.Claims != nil {
		c := input.Claims
		a.RequestSendAttemptFound = c.RequestSendAllowed
		a.AdapterCallAttemptFound = c.AdapterCallAllowed
		a.ExecutionAttemptFound = c.MCPExecutionAllowed || c.ExecutionAllowed
		a.ExecutorCallAttemptFound = c.ExecutorCallAllowed
		a.NetworkAttemptFound = c.NetworkCallAllowed
		a.CommandAttemptFound = c.CommandExecutionAllowed
		a.FileWriteAttemptFound = c.FileWriteAllowed
		a.PromotionAttemptFound = c.PromotionAllowed || c.StablePromotionAllowed || c.StablePromoted
		a.DeployAttemptFound = c.DeployAllowed
		a.StatusPublishAttemptFound = c.StatusPublishAllowed
		a.MemoryWriteAttemptFound = c.MemoryWriteAllowed
		a.StableLearningAttemptFound = c.LearningAllowed || c.LearnedAsStable
		a.RealLockAttemptFound = c.RealLockAllowed || c.RealLockAcquired
		a.RollbackAttemptFound = c.RollbackAllowed || c.RollbackPerformed
		a.RequestPersistenceAttemptFound = c.RequestPersistenceAllowed || c.RequestEnvelopePersisted
		a.AutoGoldAttemptFound = c.PassGold || c.PassSecure || c.PassGoldAllowed || c.PassSecureAllowed
		a.AuthorityGrantAttemptFound = c.AuthorityGranted || c.AuthorityGrantAllowed
		a.DryRunGateClaimFound = c.DryRunGateClaim
		a.SynthesizedGateClaimFound = c.SynthesizedGateClaim
		a.HumanApprovalBypassAttemptFound = c.HumanApprovalBypassed
		a.RevalidationBypassAttemptFound = c.RevalidationBypassed
		a.RequestContractBypassAttemptFound = c.RequestContractBypassed || c.ContractBypassed
	}
	for _, g := range input.RealGates {
		a.DryRunGateClaimFound = a.DryRunGateClaimFound || g.DryRun
		a.SynthesizedGateClaimFound = a.SynthesizedGateClaimFound || g.Synthesized
	}
	return a
}
func ExplainExecutionRequestEnvelope(input ExecutionRequestInput) ExecutionRequestExplain {
	return ExecutionRequestExplain{Version: Version, DryRun: true, ReadOnly: true, WhyRequestEnvelopeIsNotExecution: []string{"request_envelope_ready_dry_run is advisory only", "V10.5 returns a logical envelope validation response and never sends it"}, WhyRequestSendIsBlockedInsideMCP: []string{"MCP is a read-only control plane", "request sends, adapter calls, executor calls, network calls, command execution, and file writes inside MCP are always blocked"}, WhyAdapterInterfaceIsRequired: []string{"V10.4 adapter interface must be valid and adapter_interface_ready_dry_run=true before a request envelope can be considered ready", "V10.5 does not replace the adapter interface and cannot call it"}, WhyFinalAuthorizationIsRequired: []string{"V10.3 final authorization must be valid and final_authorization_ready_dry_run=true before a request envelope can be considered ready", "V10.5 cannot grant execution authority"}, WhyRealGatesAreRequired: []string{"PASS_GOLD and PASS_SECURE must be real, non-dry-run, non-synthesized, and authority-recognized"}, WhyHumanApprovalAndRevalidationAreRequired: []string{"future external execution requires real human approval", "independent revalidation must confirm PASS_GOLD and PASS_SECURE"}, WhyRequestContractsAreRequired: []string{"payload schema, metadata, correlation, idempotency, descriptors, constraints, audit, rollback, observability, timeout, kill switch, error handling, security, and policy contracts define the future request boundary", "contracts are validated only and never persisted by MCP"}, RequiredGates: clone(requiredGates), AlwaysDenied: alwaysDenied()}
}

func NormalizeExecutionRequestEnvelope(input ExecutionRequestInput) ExecutionRequestInput {
	if input.RequestEnvelope != nil {
		input = mergeInput(input, *input.RequestEnvelope)
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
		input.Claims = &ExecutionRequestClaims{}
	}
	c := input.Claims
	c.MCPExecutionAllowed = c.MCPExecutionAllowed || input.MCPExecutionAllowed
	c.RequestSendAllowed = c.RequestSendAllowed || input.RequestSendAllowed
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
	c.RequestPersistenceAllowed = c.RequestPersistenceAllowed || input.RequestPersistenceAllowed
	c.PassGoldAllowed = c.PassGoldAllowed || input.PassGoldAllowed
	c.PassSecureAllowed = c.PassSecureAllowed || input.PassSecureAllowed
	c.AuthorityGrantAllowed = c.AuthorityGrantAllowed || input.AuthorityGrantAllowed
	return input
}
func mergeInput(base, n ExecutionRequestInput) ExecutionRequestInput {
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
	if base.RequestPayloadSchema == nil {
		base.RequestPayloadSchema = n.RequestPayloadSchema
	}
	if base.RequestMetadata == nil {
		base.RequestMetadata = n.RequestMetadata
	}
	if base.CorrelationID == "" {
		base.CorrelationID = n.CorrelationID
	}
	if base.IdempotencyKey == "" {
		base.IdempotencyKey = n.IdempotencyKey
	}
	if base.TargetDescriptor == nil {
		base.TargetDescriptor = n.TargetDescriptor
	}
	if base.OperationDescriptor == nil {
		base.OperationDescriptor = n.OperationDescriptor
	}
	if base.ExecutionConstraints == nil {
		base.ExecutionConstraints = n.ExecutionConstraints
	}
	if base.SafetyConstraints == nil {
		base.SafetyConstraints = n.SafetyConstraints
	}
	if base.AuditDescriptor == nil {
		base.AuditDescriptor = n.AuditDescriptor
	}
	if base.RollbackDescriptor == nil {
		base.RollbackDescriptor = n.RollbackDescriptor
	}
	if base.ObservabilityDescriptor == nil {
		base.ObservabilityDescriptor = n.ObservabilityDescriptor
	}
	if base.TimeoutDescriptor == nil {
		base.TimeoutDescriptor = n.TimeoutDescriptor
	}
	if base.KillSwitchDescriptor == nil {
		base.KillSwitchDescriptor = n.KillSwitchDescriptor
	}
	if base.ErrorHandlingDescriptor == nil {
		base.ErrorHandlingDescriptor = n.ErrorHandlingDescriptor
	}
	if base.SecurityDescriptor == nil {
		base.SecurityDescriptor = n.SecurityDescriptor
	}
	if base.PolicyDescriptor == nil {
		base.PolicyDescriptor = n.PolicyDescriptor
	}
	if base.SafetyControls == nil {
		base.SafetyControls = n.SafetyControls
	}
	if base.Claims == nil {
		base.Claims = n.Claims
	}
	return base
}
func safetyControlsValid(c *SafetyControls) bool {
	return c.Present && c.Valid && c.NoMCPExecution && c.NoRequestSendInsideMCP && c.NoAdapterCallInsideMCP && c.NoNetworkInsideMCP && c.NoCommandInsideMCP && c.NoFileWriteInsideMCP && c.NoDeployInsideMCP && c.NoStatusPublishInsideMCP && c.NoMemoryStableWriteInsideMCP
}
func addUnsafeClaims(c *ExecutionRequestClaims, add func(string)) {
	pairs := []struct {
		name  string
		value bool
	}{{"mcp_execution_allowed", c.MCPExecutionAllowed}, {"request_send_allowed", c.RequestSendAllowed}, {"adapter_call_allowed", c.AdapterCallAllowed}, {"executor_call_allowed", c.ExecutorCallAllowed}, {"network_call_allowed", c.NetworkCallAllowed}, {"command_execution_allowed", c.CommandExecutionAllowed}, {"file_write_allowed", c.FileWriteAllowed}, {"promotion_allowed", c.PromotionAllowed}, {"deploy_allowed", c.DeployAllowed}, {"status_publish_allowed", c.StatusPublishAllowed}, {"mutation_allowed", c.MutationAllowed}, {"memory_write_allowed", c.MemoryWriteAllowed}, {"stable_promotion_allowed", c.StablePromotionAllowed}, {"learning_allowed", c.LearningAllowed}, {"stable_promoted", c.StablePromoted}, {"learned_as_stable", c.LearnedAsStable}, {"execution_allowed", c.ExecutionAllowed}, {"real_lock_allowed", c.RealLockAllowed}, {"real_lock_acquired", c.RealLockAcquired}, {"rollback_allowed", c.RollbackAllowed}, {"rollback_performed", c.RollbackPerformed}, {"request_envelope_persisted", c.RequestEnvelopePersisted}, {"request_persistence_allowed", c.RequestPersistenceAllowed}, {"pass_gold", c.PassGold}, {"pass_secure", c.PassSecure}, {"pass_gold_allowed", c.PassGoldAllowed}, {"pass_secure_allowed", c.PassSecureAllowed}, {"authority_granted", c.AuthorityGranted}, {"authority_grant_allowed", c.AuthorityGrantAllowed}, {"dry_run_gate_claim", c.DryRunGateClaim}, {"synthesized_gate_claim", c.SynthesizedGateClaim}, {"human_approval_bypassed", c.HumanApprovalBypassed}, {"revalidation_bypassed", c.RevalidationBypassed}, {"request_contract_bypassed", c.RequestContractBypassed || c.ContractBypassed}}
	for _, p := range pairs {
		if p.value {
			add(p.name)
		}
	}
}
func requestStatus(missing, unsafe, conflicts []string) string {
	if contains(unsafe, "request_send_allowed") {
		return StatusUnsafeRequestSendAttempt
	}
	if contains(unsafe, "adapter_call_allowed") {
		return StatusUnsafeAdapterCallAttempt
	}
	if containsAny(unsafe, "mcp_execution_allowed", "execution_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed") {
		return StatusUnsafeExecutionAttempt
	}
	if containsAny(unsafe, "promotion_allowed", "deploy_allowed", "status_publish_allowed", "stable_promoted", "learned_as_stable", "pass_gold", "pass_secure", "authority_granted") {
		return StatusUnsafePromotionAttempt
	}
	if containsAny(unsafe, "memory_write_allowed", "real_lock_acquired", "rollback_performed", "request_envelope_persisted", "request_persistence_allowed") {
		return StatusUnsafePersistenceAttempt
	}
	if contains(conflicts, "adapter_interface_missing") {
		return StatusAdapterInterfaceMissing
	}
	if contains(conflicts, "adapter_interface_blocked") || contains(missing, "adapter_interface_ready_dry_run") {
		return StatusAdapterInterfaceBlocked
	}
	if contains(conflicts, "final_authorization_missing") {
		return StatusFinalAuthorizationMissing
	}
	if contains(conflicts, "final_authorization_blocked") || contains(missing, "final_authorization_ready_dry_run") {
		return StatusFinalAuthorizationBlocked
	}
	if contains(conflicts, "simulation_missing") {
		return StatusSimulationMissing
	}
	if contains(conflicts, "simulation_blocked") {
		return StatusSimulationBlocked
	}
	if contains(conflicts, "firewall_missing") {
		return StatusFirewallMissing
	}
	if contains(conflicts, "firewall_blocked") {
		return StatusFirewallBlocked
	}
	if contains(conflicts, "sovereign_candidate_missing") {
		return StatusSovereignCandidateMiss
	}
	if contains(missing, "PASS_GOLD_REAL") || contains(missing, "PASS_SECURE_REAL") || hasSuffix(conflicts, "_dry_run_gate_claim") || hasSuffix(conflicts, "_synthesized_gate_claim") || hasSuffix(conflicts, "_not_recognized_by_authority") {
		return StatusMissingRealGates
	}
	if contains(missing, "human_approval") || hasPrefix(conflicts, "human_approval") {
		return StatusHumanApprovalRequired
	}
	if contains(missing, "independent_revalidation") || hasPrefix(conflicts, "independent_revalidation") || contains(conflicts, "pass_gold_revalidated_false") || contains(conflicts, "pass_secure_revalidated_false") {
		return StatusRevalidationRequired
	}
	if hasRequestContractMissing(missing) {
		return StatusRequestContractMissing
	}
	if hasSuffix(conflicts, "_descriptor_invalid") || hasSuffix(conflicts, "_constraints_invalid") || contains(conflicts, "request_payload_schema_invalid") || contains(conflicts, "request_metadata_invalid") {
		return StatusRequestContractInvalid
	}
	if contains(missing, "safety_controls") || contains(conflicts, "safety_controls_invalid") || contains(missing, "policy_descriptor") || contains(conflicts, "policy_descriptor_invalid") {
		return StatusPolicyBlocked
	}
	if len(missing) > 0 {
		return StatusIncomplete
	}
	if len(conflicts) > 0 {
		return StatusBlocked
	}
	return StatusReadyDryRun
}
func hasRequestContractMissing(xs []string) bool {
	for _, x := range xs {
		if strings.Contains(x, "descriptor") || strings.Contains(x, "constraints") || strings.HasPrefix(x, "request_") || x == "correlation_id" || x == "idempotency_key" {
			return true
		}
	}
	return false
}
func alwaysDenied() []string {
	return []string{"mcp_execution_allowed", "request_send_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "request_persistence_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}
}
func recommendations(missing, unsafe, conflicts []string) []string {
	out := []string{"keep V10.5 dry-run/read-only and do not send requests, call adapters, persist envelopes, or grant authority inside MCP"}
	if len(missing) > 0 {
		out = append(out, "provide missing external execution request evidence")
	}
	if len(unsafe) > 0 {
		out = append(out, "remove all request send, adapter, execution, promotion, persistence, PASS, and authority claims")
	}
	if len(conflicts) > 0 {
		out = append(out, "resolve request envelope conflicts outside MCP")
	}
	return out
}
func normalizeGate(s string) string {
	return strings.TrimSpace(strings.ToUpper(strings.ReplaceAll(s, "-", "_")))
}
func isMCP(s string) bool {
	v := strings.ToLower(strings.TrimSpace(s))
	return v == "mcp" || v == "mcp_readonly" || v == "mcp_server" || v == "inside_mcp"
}
func contains(xs []string, w string) bool {
	for _, x := range xs {
		if x == w {
			return true
		}
	}
	return false
}
func containsAny(xs []string, wants ...string) bool {
	for _, w := range wants {
		if contains(xs, w) {
			return true
		}
	}
	return false
}
func hasPrefix(xs []string, p string) bool {
	for _, x := range xs {
		if strings.HasPrefix(x, p) {
			return true
		}
	}
	return false
}
func hasSuffix(xs []string, s string) bool {
	for _, x := range xs {
		if strings.HasSuffix(x, s) {
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
