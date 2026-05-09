// Package promotionsimulation implements V10.2 Promotion Execution Simulation Recorder.
//
// The recorder is a read-only/dry-run simulation layer for a future promotion
// execution. It records only an in-memory response value for the caller and never
// executes, persists a simulation record, calls executors, performs network or
// command activity, writes files, deploys, publishes real status, writes memory,
// learns stable state, acquires real locks, rolls back, grants authority, or
// promotes PASS gates.
package promotionsimulation

import (
	"strings"

	"github.com/visioncore/go-core/internal/promotionfirewall"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

const Version = "V10.2"

const (
	StatusSimulationReadyDryRun = "promotion_execution_simulation_ready_dry_run"
	StatusIncomplete            = "incomplete"
	StatusBlocked               = "blocked"
	StatusUnsafeClaim           = "unsafe_execution_claim"
	StatusFirewallInvalid       = "promotion_firewall_invalid"
	StatusUnsafePlan            = "unsafe_simulation_plan"
)

var requiredItems = []string{
	"executor", "executor_mode", "external_only", "promotion_firewall", "firewall_valid", "execution_eligibility_ready_dry_run", "promotion_execution_candidate",
	"PASS_GOLD_REAL", "PASS_SECURE_REAL", "execution_plan", "simulation_steps", "gate_plan", "controls_plan", "rollback", "observability", "status_publication", "lock", "idempotency", "kill_switch", "timeout", "stop_criteria", "evidence", "policy",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var forbiddenInsideMCP = []string{
	"call_executor", "acquire_lock", "promote", "promote_stable", "deploy", "publish_status", "push", "PR", "open_pr", "mutate", "write_memory", "learn_stable", "execute_rollback", "persist_simulation", "pass_gold", "pass_secure", "grant_authority", "command_execution", "network_call", "file_write", "status_publication", "memory_persistence", "stable_promotion",
}

type PromotionSimulationInput struct {
	Root                            string                                `json:"root,omitempty"`
	Operation                       string                                `json:"operation,omitempty"`
	PromotionSimulation             *PromotionSimulationInput             `json:"promotion_simulation,omitempty"`
	Simulation                      *PromotionSimulationInput             `json:"simulation,omitempty"`
	PromotionFirewall               *PromotionFirewallEvidence            `json:"promotion_firewall,omitempty"`
	Firewall                        *PromotionFirewallEvidence            `json:"firewall,omitempty"`
	Executor                        string                                `json:"executor,omitempty"`
	ExecutorMode                    string                                `json:"executor_mode,omitempty"`
	PromotionExecutionCandidate     bool                                  `json:"promotion_execution_candidate"`
	ExecutionEligibilityReadyDryRun bool                                  `json:"execution_eligibility_ready_dry_run,omitempty"`
	RealGates                       []sovereigndecision.SovereignRealGate `json:"real_gates,omitempty"`
	ExecutionPlan                   *ExecutionPlan                        `json:"execution_plan,omitempty"`
	SimulationSteps                 []SimulationStep                      `json:"simulation_steps,omitempty"`
	GatePlan                        *PresenceValid                        `json:"gate_plan,omitempty"`
	ControlsPlan                    *ControlsPlan                         `json:"controls_plan,omitempty"`
	Rollback                        *PresenceValid                        `json:"rollback,omitempty"`
	Observability                   *PresenceValid                        `json:"observability,omitempty"`
	StatusPublication               *PresenceValid                        `json:"status_publication,omitempty"`
	Lock                            *PresenceValid                        `json:"lock,omitempty"`
	Idempotency                     *PresenceValid                        `json:"idempotency,omitempty"`
	KillSwitch                      *PresenceValid                        `json:"kill_switch,omitempty"`
	Timeout                         *PresenceValid                        `json:"timeout,omitempty"`
	StopCriteria                    *PresenceValid                        `json:"stop_criteria,omitempty"`
	Evidence                        *PresenceValid                        `json:"evidence,omitempty"`
	Policy                          *PresenceValid                        `json:"policy,omitempty"`
	Controls                        *SimulationControls                   `json:"controls,omitempty"`
	Claims                          *SimulationClaims                     `json:"claims,omitempty"`
	MCPExecutionAllowed             bool                                  `json:"mcp_execution_allowed,omitempty"`
	ExecutionAllowed                bool                                  `json:"execution_allowed,omitempty"`
	ExecutorAllowed                 bool                                  `json:"executor_allowed,omitempty"`
	ExecutorCallAllowed             bool                                  `json:"executor_call_allowed,omitempty"`
	NetworkCallAllowed              bool                                  `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed         bool                                  `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed                bool                                  `json:"file_write_allowed,omitempty"`
	PromotionAllowed                bool                                  `json:"promotion_allowed,omitempty"`
	DeployAllowed                   bool                                  `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed            bool                                  `json:"status_publish_allowed,omitempty"`
	MutationAllowed                 bool                                  `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed              bool                                  `json:"memory_write_allowed,omitempty"`
	StablePromotionAllowed          bool                                  `json:"stable_promotion_allowed,omitempty"`
	LearningAllowed                 bool                                  `json:"learning_allowed,omitempty"`
	RealLockAllowed                 bool                                  `json:"real_lock_allowed,omitempty"`
	RollbackAllowed                 bool                                  `json:"rollback_allowed,omitempty"`
	SimulationPersistenceAllowed    bool                                  `json:"simulation_persistence_allowed,omitempty"`
	PassGoldAllowed                 bool                                  `json:"pass_gold_allowed,omitempty"`
	PassSecureAllowed               bool                                  `json:"pass_secure_allowed,omitempty"`
	AuthorityGrantAllowed           bool                                  `json:"authority_grant_allowed,omitempty"`
}

type PromotionFirewallEvidence struct {
	Version                         string `json:"version,omitempty"`
	DryRun                          bool   `json:"dry_run,omitempty"`
	ReadOnly                        bool   `json:"read_only,omitempty"`
	Valid                           bool   `json:"valid,omitempty"`
	FirewallValid                   bool   `json:"firewall_valid,omitempty"`
	Blocked                         bool   `json:"blocked,omitempty"`
	ExecutionEligibilityReadyDryRun bool   `json:"execution_eligibility_ready_dry_run,omitempty"`
	FirewallStatus                  string `json:"firewall_status,omitempty"`
}

type ExecutionPlan struct {
	Present bool             `json:"present"`
	Valid   bool             `json:"valid"`
	Steps   []SimulationStep `json:"steps,omitempty"`
}

type SimulationStep struct {
	Name     string `json:"name,omitempty"`
	Action   string `json:"action,omitempty"`
	Mutating bool   `json:"mutating"`
}

type PresenceValid struct {
	Present bool `json:"present"`
	Valid   bool `json:"valid"`
}

type ControlsPlan struct {
	Present                 bool `json:"present"`
	Valid                   bool `json:"valid"`
	ReadOnly                bool `json:"read_only"`
	DryRun                  bool `json:"dry_run"`
	NoExecutorCall          bool `json:"no_executor_call"`
	NoNetworkCall           bool `json:"no_network_call"`
	NoCommandExecution      bool `json:"no_command_execution"`
	NoFileWrite             bool `json:"no_file_write"`
	NoMutation              bool `json:"no_mutation"`
	NoRealLock              bool `json:"no_real_lock"`
	NoRollbackExecution     bool `json:"no_rollback_execution"`
	NoSimulationPersistence bool `json:"no_simulation_persistence"`
}

type SimulationControls struct {
	PublishInsideMCPAllowed bool `json:"publish_inside_mcp_allowed"`
	RealLockAcquired        bool `json:"real_lock_acquired"`
}

type SimulationClaims struct {
	MCPExecutionAllowed          bool `json:"mcp_execution_allowed"`
	ExecutionAllowed             bool `json:"execution_allowed"`
	ExecutorAllowed              bool `json:"executor_allowed"`
	ExecutorCallAllowed          bool `json:"executor_call_allowed"`
	NetworkCallAllowed           bool `json:"network_call_allowed"`
	CommandExecutionAllowed      bool `json:"command_execution_allowed"`
	FileWriteAllowed             bool `json:"file_write_allowed"`
	PromotionAllowed             bool `json:"promotion_allowed"`
	DeployAllowed                bool `json:"deploy_allowed"`
	StatusPublishAllowed         bool `json:"status_publish_allowed"`
	MutationAllowed              bool `json:"mutation_allowed"`
	MemoryWriteAllowed           bool `json:"memory_write_allowed"`
	StablePromotionAllowed       bool `json:"stable_promotion_allowed"`
	LearningAllowed              bool `json:"learning_allowed"`
	RealLockAllowed              bool `json:"real_lock_allowed"`
	RollbackAllowed              bool `json:"rollback_allowed"`
	SimulationPersisted          bool `json:"simulation_persisted"`
	SimulationPersistenceAllowed bool `json:"simulation_persistence_allowed"`
	PassGoldAllowed              bool `json:"pass_gold_allowed"`
	PassSecureAllowed            bool `json:"pass_secure_allowed"`
	AuthorityGranted             bool `json:"authority_granted"`
	AuthorityGrantAllowed        bool `json:"authority_grant_allowed"`
}

type PromotionSimulationResult struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	SimulationStatus                string   `json:"simulation_status"`
	Valid                           bool     `json:"valid"`
	Blocked                         bool     `json:"blocked"`
	PromotionExecutionCandidate     bool     `json:"promotion_execution_candidate"`
	ExecutionEligibilityReadyDryRun bool     `json:"execution_eligibility_ready_dry_run"`
	MissingItems                    []string `json:"missing_items"`
	UnsafeClaims                    []string `json:"unsafe_claims"`
	Conflicts                       []string `json:"conflicts"`
	BlockingReasons                 []string `json:"blocking_reasons"`
	RequiredItems                   []string `json:"required_items"`
	RequiredRealGates               []string `json:"required_real_gates"`
	Recommendations                 []string `json:"recommendations"`
	MCPExecutionAllowed             bool     `json:"mcp_execution_allowed"`
	ExecutorCallAllowed             bool     `json:"executor_call_allowed"`
	NetworkCallAllowed              bool     `json:"network_call_allowed"`
	CommandExecutionAllowed         bool     `json:"command_execution_allowed"`
	FileWriteAllowed                bool     `json:"file_write_allowed"`
	PromotionAllowed                bool     `json:"promotion_allowed"`
	DeployAllowed                   bool     `json:"deploy_allowed"`
	StatusPublishAllowed            bool     `json:"status_publish_allowed"`
	MutationAllowed                 bool     `json:"mutation_allowed"`
	MemoryWriteAllowed              bool     `json:"memory_write_allowed"`
	StablePromotionAllowed          bool     `json:"stable_promotion_allowed"`
	LearningAllowed                 bool     `json:"learning_allowed"`
	RealLockAllowed                 bool     `json:"real_lock_allowed"`
	RollbackAllowed                 bool     `json:"rollback_allowed"`
	SimulationPersistenceAllowed    bool     `json:"simulation_persistence_allowed"`
	PassGoldAllowed                 bool     `json:"pass_gold_allowed"`
	PassSecureAllowed               bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed           bool     `json:"authority_grant_allowed"`
}

type PromotionSimulationValidation = PromotionSimulationResult

type PromotionSimulationBoundary struct {
	Version                  string   `json:"version"`
	DryRun                   bool     `json:"dry_run"`
	ReadOnly                 bool     `json:"read_only"`
	MCPScope                 []string `json:"mcp_scope"`
	ForbiddenInsideMCP       []string `json:"forbidden_inside_mcp"`
	RequiredBeforeSimulation []string `json:"required_before_simulation"`
	AlwaysDenied             []string `json:"always_denied"`
	RequiredRealGates        []string `json:"required_real_gates"`
}

type PromotionSimulationAudit struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	ConflictsFound             bool     `json:"conflicts_found"`
	Conflicts                  []string `json:"conflicts"`
	UnsafeClaimsFound          bool     `json:"unsafe_claims_found"`
	UnsafeClaims               []string `json:"unsafe_claims"`
	MissingItemsFound          bool     `json:"missing_items_found"`
	MissingItems               []string `json:"missing_items"`
	ExecutorCallAttemptFound   bool     `json:"executor_call_attempt_found"`
	ExecutionClaimFound        bool     `json:"execution_claim_found"`
	PromotionAttemptFound      bool     `json:"promotion_attempt_found"`
	FileWriteAttemptFound      bool     `json:"file_write_attempt_found"`
	SimulationPersistedFound   bool     `json:"simulation_persisted_found"`
	AuthorityGrantAttemptFound bool     `json:"authority_grant_attempt_found"`
	Recommendations            []string `json:"recommendations"`
}

type PromotionSimulationExplain struct {
	Version                   string   `json:"version"`
	DryRun                    bool     `json:"dry_run"`
	ReadOnly                  bool     `json:"read_only"`
	Summary                   string   `json:"summary"`
	SimulationModel           []string `json:"simulation_model"`
	WhySimulationIsNotExecute []string `json:"why_simulation_is_not_execution"`
	AlwaysDenied              []string `json:"always_denied"`
	BlockedActions            []string `json:"blocked_actions"`
	SafestNextSteps           []string `json:"safest_next_steps"`
	RequiredGates             []string `json:"required_gates"`
}

func BuildPromotionSimulation(input PromotionSimulationInput) PromotionSimulationResult {
	return ValidatePromotionSimulation(input)
}

func ValidatePromotionSimulation(input PromotionSimulationInput) PromotionSimulationValidation {
	input = NormalizePromotionSimulation(input)
	missing, unsafe, conflicts, blocking := []string{}, []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s); blocking = appendUnique(blocking, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s); blocking = appendUnique(blocking, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s); blocking = appendUnique(blocking, s) }

	if input.Executor == "" {
		addMissing("executor")
	}
	if isMCP(input.Executor) {
		addConflict("executor_must_not_be_mcp")
	}
	if input.ExecutorMode != "external_only" {
		addMissing("external_only")
		addConflict("executor_mode_must_be_external_only")
	}
	if input.PromotionFirewall == nil {
		addMissing("promotion_firewall")
	} else {
		if !input.PromotionFirewall.Valid || input.PromotionFirewall.Blocked {
			addConflict("promotion_firewall_invalid")
		}
		if !input.PromotionFirewall.FirewallValid {
			addConflict("firewall_valid_false")
		}
		if !input.PromotionFirewall.ExecutionEligibilityReadyDryRun {
			addMissing("execution_eligibility_ready_dry_run")
		}
	}
	if !input.ExecutionEligibilityReadyDryRun {
		addMissing("execution_eligibility_ready_dry_run")
	}
	if !input.PromotionExecutionCandidate {
		addMissing("promotion_execution_candidate")
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

	if input.ExecutionPlan == nil || !input.ExecutionPlan.Present {
		addMissing("execution_plan")
	} else if !input.ExecutionPlan.Valid {
		addConflict("execution_plan_invalid")
	}
	steps := append([]SimulationStep{}, input.SimulationSteps...)
	if input.ExecutionPlan != nil {
		steps = append(steps, input.ExecutionPlan.Steps...)
	}
	if len(steps) == 0 {
		addMissing("simulation_steps")
	}
	for _, step := range steps {
		if step.Mutating {
			name := step.Name
			if name == "" {
				name = step.Action
			}
			if name == "" {
				name = "unnamed"
			}
			addConflict("simulation_step_mutating:" + name)
		}
	}
	if input.GatePlan == nil || !input.GatePlan.Present {
		addMissing("gate_plan")
	} else if !input.GatePlan.Valid {
		addConflict("gate_plan_invalid")
	}
	if input.ControlsPlan == nil || !input.ControlsPlan.Present {
		addMissing("controls_plan")
	} else if !controlsPlanSafe(input.ControlsPlan) {
		addConflict("controls_plan_insecure")
	}
	for name, item := range map[string]*PresenceValid{"rollback": input.Rollback, "observability": input.Observability, "status_publication": input.StatusPublication, "lock": input.Lock, "idempotency": input.Idempotency, "kill_switch": input.KillSwitch, "timeout": input.Timeout, "stop_criteria": input.StopCriteria, "evidence": input.Evidence, "policy": input.Policy} {
		if item == nil || !item.Present {
			addMissing(name)
		} else if !item.Valid {
			addConflict(name + "_invalid")
		}
	}
	if input.Controls != nil {
		if input.Controls.PublishInsideMCPAllowed {
			addConflict("publish_inside_mcp_allowed")
		}
		if input.Controls.RealLockAcquired {
			addConflict("real_lock_acquired")
		}
	}
	if input.Claims != nil {
		addUnsafeClaims(input.Claims, addUnsafe)
	}

	valid := len(missing) == 0 && len(unsafe) == 0 && len(conflicts) == 0
	return PromotionSimulationResult{Version: Version, DryRun: true, ReadOnly: true, SimulationStatus: simulationStatus(missing, unsafe, conflicts), Valid: valid, Blocked: !valid, PromotionExecutionCandidate: input.PromotionExecutionCandidate && valid, ExecutionEligibilityReadyDryRun: input.ExecutionEligibilityReadyDryRun && valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), Recommendations: recommendations(missing, unsafe, conflicts)}
}

func BuildPromotionSimulationBoundary() PromotionSimulationBoundary {
	return PromotionSimulationBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPScope: []string{"read", "validate", "audit", "explain", "simulate_promotion_execution"}, ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeSimulation: clone(requiredItems), AlwaysDenied: alwaysDenied(), RequiredRealGates: clone(requiredGates)}
}

func AuditPromotionSimulation(input PromotionSimulationInput) PromotionSimulationAudit {
	input = NormalizePromotionSimulation(input)
	v := ValidatePromotionSimulation(input)
	a := PromotionSimulationAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	if input.Claims != nil {
		a.ExecutorCallAttemptFound = input.Claims.ExecutorCallAllowed || input.Claims.ExecutorAllowed
		a.ExecutionClaimFound = input.Claims.ExecutionAllowed || input.Claims.MCPExecutionAllowed || input.Claims.NetworkCallAllowed || input.Claims.CommandExecutionAllowed
		a.PromotionAttemptFound = input.Claims.PromotionAllowed || input.Claims.DeployAllowed || input.Claims.StatusPublishAllowed || input.Claims.MemoryWriteAllowed || input.Claims.StablePromotionAllowed || input.Claims.LearningAllowed || input.Claims.PassGoldAllowed || input.Claims.PassSecureAllowed
		a.FileWriteAttemptFound = input.Claims.FileWriteAllowed
		a.SimulationPersistedFound = input.Claims.SimulationPersisted || input.Claims.SimulationPersistenceAllowed
		a.AuthorityGrantAttemptFound = input.Claims.AuthorityGranted || input.Claims.AuthorityGrantAllowed
	}
	return a
}

func ExplainPromotionSimulation(input PromotionSimulationInput) PromotionSimulationExplain {
	return PromotionSimulationExplain{Version: Version, DryRun: true, ReadOnly: true, Summary: "V10.2 simulates a future promotion execution using eligibility-firewall evidence but never executes or persists the simulation.", SimulationModel: []string{"consume V10.1 promotion_firewall as advisory input", "validate external-only executor and real gates", "validate non-mutating simulation steps and controls", "always deny MCP execution, persistence, authority grants, and side effects"}, WhySimulationIsNotExecute: []string{"promotion_execution_candidate is advisory only", "MCP remains a read-only control plane", "executor calls, network calls, commands, file writes, deploy, status publication, memory writes, stable promotion, rollback, lock acquisition, simulation persistence, PASS gate promotion, and authority grants remain false"}, AlwaysDenied: alwaysDenied(), BlockedActions: clone(forbiddenInsideMCP), SafestNextSteps: []string{"keep MCP dry-run/read-only", "keep simulation records outside persistent storage", "require future execution outside MCP with separate authorization", "revalidate PASS_GOLD_REAL and PASS_SECURE_REAL before any external execution"}, RequiredGates: clone(requiredGates)}
}

func NormalizePromotionSimulation(input PromotionSimulationInput) PromotionSimulationInput {
	if input.PromotionSimulation != nil {
		input = mergeInput(input, *input.PromotionSimulation)
	}
	if input.Simulation != nil {
		input = mergeInput(input, *input.Simulation)
	}
	if input.PromotionFirewall == nil && input.Firewall != nil {
		input.PromotionFirewall = input.Firewall
	}
	if input.PromotionFirewall != nil {
		if input.PromotionFirewall.ExecutionEligibilityReadyDryRun {
			input.ExecutionEligibilityReadyDryRun = true
		}
	}
	if input.Claims == nil {
		input.Claims = &SimulationClaims{}
	}
	input.Claims.MCPExecutionAllowed = input.Claims.MCPExecutionAllowed || input.MCPExecutionAllowed
	input.Claims.ExecutionAllowed = input.Claims.ExecutionAllowed || input.ExecutionAllowed
	input.Claims.ExecutorAllowed = input.Claims.ExecutorAllowed || input.ExecutorAllowed
	input.Claims.ExecutorCallAllowed = input.Claims.ExecutorCallAllowed || input.ExecutorCallAllowed
	input.Claims.NetworkCallAllowed = input.Claims.NetworkCallAllowed || input.NetworkCallAllowed
	input.Claims.CommandExecutionAllowed = input.Claims.CommandExecutionAllowed || input.CommandExecutionAllowed
	input.Claims.FileWriteAllowed = input.Claims.FileWriteAllowed || input.FileWriteAllowed
	input.Claims.PromotionAllowed = input.Claims.PromotionAllowed || input.PromotionAllowed
	input.Claims.DeployAllowed = input.Claims.DeployAllowed || input.DeployAllowed
	input.Claims.StatusPublishAllowed = input.Claims.StatusPublishAllowed || input.StatusPublishAllowed
	input.Claims.MutationAllowed = input.Claims.MutationAllowed || input.MutationAllowed
	input.Claims.MemoryWriteAllowed = input.Claims.MemoryWriteAllowed || input.MemoryWriteAllowed
	input.Claims.StablePromotionAllowed = input.Claims.StablePromotionAllowed || input.StablePromotionAllowed
	input.Claims.LearningAllowed = input.Claims.LearningAllowed || input.LearningAllowed
	input.Claims.RealLockAllowed = input.Claims.RealLockAllowed || input.RealLockAllowed
	input.Claims.RollbackAllowed = input.Claims.RollbackAllowed || input.RollbackAllowed
	input.Claims.SimulationPersistenceAllowed = input.Claims.SimulationPersistenceAllowed || input.SimulationPersistenceAllowed
	input.Claims.PassGoldAllowed = input.Claims.PassGoldAllowed || input.PassGoldAllowed
	input.Claims.PassSecureAllowed = input.Claims.PassSecureAllowed || input.PassSecureAllowed
	input.Claims.AuthorityGrantAllowed = input.Claims.AuthorityGrantAllowed || input.AuthorityGrantAllowed
	return input
}

func mergeInput(base, nested PromotionSimulationInput) PromotionSimulationInput {
	if base.Executor == "" {
		base.Executor = nested.Executor
	}
	if base.ExecutorMode == "" {
		base.ExecutorMode = nested.ExecutorMode
	}
	base.PromotionExecutionCandidate = base.PromotionExecutionCandidate || nested.PromotionExecutionCandidate
	base.ExecutionEligibilityReadyDryRun = base.ExecutionEligibilityReadyDryRun || nested.ExecutionEligibilityReadyDryRun
	if base.PromotionFirewall == nil {
		base.PromotionFirewall = nested.PromotionFirewall
	}
	if len(base.RealGates) == 0 {
		base.RealGates = nested.RealGates
	}
	if base.ExecutionPlan == nil {
		base.ExecutionPlan = nested.ExecutionPlan
	}
	if len(base.SimulationSteps) == 0 {
		base.SimulationSteps = nested.SimulationSteps
	}
	if base.GatePlan == nil {
		base.GatePlan = nested.GatePlan
	}
	if base.ControlsPlan == nil {
		base.ControlsPlan = nested.ControlsPlan
	}
	if base.Rollback == nil {
		base.Rollback = nested.Rollback
	}
	if base.Observability == nil {
		base.Observability = nested.Observability
	}
	if base.StatusPublication == nil {
		base.StatusPublication = nested.StatusPublication
	}
	if base.Lock == nil {
		base.Lock = nested.Lock
	}
	if base.Idempotency == nil {
		base.Idempotency = nested.Idempotency
	}
	if base.KillSwitch == nil {
		base.KillSwitch = nested.KillSwitch
	}
	if base.Timeout == nil {
		base.Timeout = nested.Timeout
	}
	if base.StopCriteria == nil {
		base.StopCriteria = nested.StopCriteria
	}
	if base.Evidence == nil {
		base.Evidence = nested.Evidence
	}
	if base.Policy == nil {
		base.Policy = nested.Policy
	}
	if base.Controls == nil {
		base.Controls = nested.Controls
	}
	if base.Claims == nil {
		base.Claims = nested.Claims
	}
	return base
}

func controlsPlanSafe(c *ControlsPlan) bool {
	return c.Valid && c.ReadOnly && c.DryRun && c.NoExecutorCall && c.NoNetworkCall && c.NoCommandExecution && c.NoFileWrite && c.NoMutation && c.NoRealLock && c.NoRollbackExecution && c.NoSimulationPersistence
}

func addUnsafeClaims(c *SimulationClaims, add func(string)) {
	pairs := []struct {
		name  string
		value bool
	}{
		{"mcp_execution_allowed", c.MCPExecutionAllowed}, {"execution_allowed", c.ExecutionAllowed}, {"executor_allowed", c.ExecutorAllowed}, {"executor_call_allowed", c.ExecutorCallAllowed}, {"network_call_allowed", c.NetworkCallAllowed}, {"command_execution_allowed", c.CommandExecutionAllowed}, {"file_write_allowed", c.FileWriteAllowed}, {"promotion_allowed", c.PromotionAllowed}, {"deploy_allowed", c.DeployAllowed}, {"status_publish_allowed", c.StatusPublishAllowed}, {"mutation_allowed", c.MutationAllowed}, {"memory_write_allowed", c.MemoryWriteAllowed}, {"stable_promotion_allowed", c.StablePromotionAllowed}, {"learning_allowed", c.LearningAllowed}, {"real_lock_allowed", c.RealLockAllowed}, {"rollback_allowed", c.RollbackAllowed}, {"simulation_persisted", c.SimulationPersisted}, {"simulation_persistence_allowed", c.SimulationPersistenceAllowed}, {"pass_gold_allowed", c.PassGoldAllowed}, {"pass_secure_allowed", c.PassSecureAllowed}, {"authority_granted", c.AuthorityGranted}, {"authority_grant_allowed", c.AuthorityGrantAllowed},
	}
	for _, p := range pairs {
		if p.value {
			add(p.name)
		}
	}
}

func simulationStatus(missing, unsafe, conflicts []string) string {
	if len(unsafe) > 0 {
		return StatusUnsafeClaim
	}
	if contains(conflicts, "promotion_firewall_invalid") || contains(conflicts, "firewall_valid_false") {
		return StatusFirewallInvalid
	}
	if contains(conflicts, "controls_plan_insecure") || hasPrefix(conflicts, "simulation_step_mutating:") {
		return StatusUnsafePlan
	}
	if len(missing) > 0 {
		return StatusIncomplete
	}
	if len(conflicts) > 0 {
		return StatusBlocked
	}
	return StatusSimulationReadyDryRun
}

func alwaysDenied() []string {
	return []string{"mcp_execution_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "real_lock_allowed", "rollback_allowed", "simulation_persistence_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed"}
}

func recommendations(missing, unsafe, conflicts []string) []string {
	out := []string{"keep MCP dry-run/read-only and do not call executors or persist simulation records"}
	if len(missing) > 0 {
		out = append(out, "provide missing simulation evidence")
	}
	if len(unsafe) > 0 {
		out = append(out, "remove all execution, persistence, PASS, and authority claims")
	}
	if len(conflicts) > 0 {
		out = append(out, "resolve simulation conflicts outside MCP")
	}
	return out
}

func normalizeGate(s string) string {
	return strings.TrimSpace(strings.ToUpper(strings.ReplaceAll(s, "-", "_")))
}
func isMCP(s string) bool {
	v := strings.ToLower(strings.TrimSpace(s))
	return v == "mcp" || v == "mcp_server" || v == "inside_mcp"
}
func contains(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}
func hasPrefix(xs []string, prefix string) bool {
	for _, x := range xs {
		if strings.HasPrefix(x, prefix) {
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

// Compile-time reference keeps V10.2 explicitly coupled to the V10.1 advisory boundary.
var _ = promotionfirewall.Version
