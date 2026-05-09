// Package safetyenvelope implements the V9.2 External Executor Safety Envelope.
//
// The package is intentionally read-only and dry-run. It defines, validates,
// audits, and explains operational safety controls for a future external
// executor, but it never promotes, deploys, publishes status, mutates state,
// writes memory, calls networks/APIs, executes commands, acquires real locks,
// performs rollback, or invokes an external executor.
package safetyenvelope

import "strings"

const Version = "V9.2"

var requiredControls = []string{
	"PASS_GOLD_REAL",
	"PASS_SECURE_REAL",
	"promotion_contract_valid",
	"rollback_policy",
	"idempotency_key",
	"concurrency_lock_or_lease",
	"timeout_policy",
	"kill_switch",
	"audit_trail",
	"dry_run_rehearsal",
	"observability_plan",
	"fallback_plan",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var advisorySources = map[string]bool{
	"mcp": true, "mcp_readonly": true, "dashboard": true, "readiness": true,
	"evidenceledger": true, "contractregistry": true, "policymatrix": true,
	"codeburn": true, "impeccable": true, "dryrun": true, "graphmemory": true,
	"unknown": true, "advisory": true,
}

type SafetyEnvelopeInput struct {
	Root                   string                 `json:"root,omitempty"`
	MissionInput           string                 `json:"mission_input,omitempty"`
	Operation              string                 `json:"operation,omitempty"`
	Request                SafetyRequest          `json:"request,omitempty"`
	Contract               map[string]interface{} `json:"contract,omitempty"`
	Gates                  []SafetyGate           `json:"gates,omitempty"`
	Artifacts              interface{}            `json:"artifacts,omitempty"`
	Preconditions          []string               `json:"preconditions,omitempty"`
	PromotionContractValid bool                   `json:"promotion_contract_valid,omitempty"`
	RollbackPolicy         RollbackPolicy         `json:"rollback_policy,omitempty"`
	Idempotency            IdempotencyPolicy      `json:"idempotency,omitempty"`
	Lock                   LockPolicy             `json:"lock,omitempty"`
	Lease                  LockPolicy             `json:"lease,omitempty"`
	Timeout                TimeoutPolicy          `json:"timeout,omitempty"`
	KillSwitch             KillSwitchPolicy       `json:"kill_switch,omitempty"`
	AuditTrail             AuditTrailPolicy       `json:"audit_trail,omitempty"`
	DryRunRehearsal        DryRunRehearsalPolicy  `json:"dry_run_rehearsal,omitempty"`
	Observability          ObservabilityPolicy    `json:"observability,omitempty"`
	Fallback               FallbackPolicy         `json:"fallback,omitempty"`
	Executor               string                 `json:"executor,omitempty"`
	Target                 string                 `json:"target,omitempty"`
	Environment            string                 `json:"environment,omitempty"`
	Strict                 bool                   `json:"strict,omitempty"`
	PromotionAllowed       bool                   `json:"promotion_allowed,omitempty"`
	DeployAllowed          bool                   `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed   bool                   `json:"status_publish_allowed,omitempty"`
	MutationAllowed        bool                   `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed     bool                   `json:"memory_write_allowed,omitempty"`
	AttemptExternalCall    bool                   `json:"attempt_external_call,omitempty"`
	AttemptRealRollback    bool                   `json:"attempt_real_rollback,omitempty"`
	AttemptRealLock        bool                   `json:"attempt_real_lock,omitempty"`
	AttemptRealDeploy      bool                   `json:"attempt_real_deploy,omitempty"`
	WouldAllowClaim        bool                   `json:"would_allow_external_executor,omitempty"`
}

type SafetyRequest struct {
	Executor             string       `json:"executor,omitempty"`
	Target               string       `json:"target,omitempty"`
	Environment          string       `json:"environment,omitempty"`
	Operation            string       `json:"operation,omitempty"`
	Gates                []SafetyGate `json:"gates,omitempty"`
	PromotionAllowed     bool         `json:"promotion_allowed,omitempty"`
	DeployAllowed        bool         `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed bool         `json:"status_publish_allowed,omitempty"`
	MutationAllowed      bool         `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed   bool         `json:"memory_write_allowed,omitempty"`
	AttemptExternalCall  bool         `json:"attempt_external_call,omitempty"`
	AttemptRealRollback  bool         `json:"attempt_real_rollback,omitempty"`
	AttemptRealLock      bool         `json:"attempt_real_lock,omitempty"`
	AttemptRealDeploy    bool         `json:"attempt_real_deploy,omitempty"`
}

type SafetyGate struct {
	Gate                  string `json:"gate,omitempty"`
	Status                string `json:"status,omitempty"`
	Source                string `json:"source,omitempty"`
	ArtifactID            string `json:"artifact_id,omitempty"`
	RealEvidence          bool   `json:"real_evidence,omitempty"`
	DryRun                bool   `json:"dry_run,omitempty"`
	Synthesized           bool   `json:"synthesized,omitempty"`
	Advisory              bool   `json:"advisory,omitempty"`
	RecognizedByAuthority bool   `json:"recognized_by_authority,omitempty"`
}

type SafetyEnvelope struct {
	Version                    string                `json:"version"`
	DryRun                     bool                  `json:"dry_run"`
	ReadOnly                   bool                  `json:"read_only"`
	EnvelopeStatus             string                `json:"envelope_status"`
	Preconditions              []string              `json:"preconditions,omitempty"`
	RollbackPolicy             RollbackPolicy        `json:"rollback_policy"`
	Idempotency                IdempotencyPolicy     `json:"idempotency"`
	ConcurrencyLock            LockPolicy            `json:"concurrency_lock"`
	TimeoutPolicy              TimeoutPolicy         `json:"timeout_policy"`
	KillSwitch                 KillSwitchPolicy      `json:"kill_switch"`
	AuditTrail                 AuditTrailPolicy      `json:"audit_trail"`
	DryRunRehearsal            DryRunRehearsalPolicy `json:"dry_run_rehearsal"`
	Observability              ObservabilityPolicy   `json:"observability"`
	Fallback                   FallbackPolicy        `json:"fallback"`
	Boundary                   SafetyBoundary        `json:"boundary"`
	RequiredControls           []string              `json:"required_controls"`
	MissingControls            []string              `json:"missing_controls"`
	UnsafeClaims               []string              `json:"unsafe_claims"`
	WouldAllowExternalExecutor bool                  `json:"would_allow_external_executor"`
	MCPExecutionAllowed        bool                  `json:"mcp_execution_allowed"`
	PromotionAllowed           bool                  `json:"promotion_allowed"`
	DeployAllowed              bool                  `json:"deploy_allowed"`
	StatusPublishAllowed       bool                  `json:"status_publish_allowed"`
	MutationAllowed            bool                  `json:"mutation_allowed"`
	MemoryWriteAllowed         bool                  `json:"memory_write_allowed"`
	Recommendations            []string              `json:"recommendations"`
}

type SafetyControl struct {
	Name     string   `json:"name"`
	Required bool     `json:"required"`
	Present  bool     `json:"present"`
	Valid    bool     `json:"valid"`
	Status   string   `json:"status"`
	Summary  string   `json:"summary"`
	Details  []string `json:"details,omitempty"`
}

type RollbackPolicy struct {
	Present                    bool   `json:"present"`
	Strategy                   string `json:"strategy,omitempty"`
	SnapshotRequired           bool   `json:"snapshot_required,omitempty"`
	RestoreCommandDeclared     bool   `json:"restore_command_declared,omitempty"`
	ValidationAfterRollback    bool   `json:"validation_after_rollback,omitempty"`
	MaxAttempts                int    `json:"max_attempts,omitempty"`
	ManualInterventionRequired bool   `json:"manual_intervention_required,omitempty"`
	Valid                      bool   `json:"valid"`
}

type IdempotencyPolicy struct {
	Present                 bool   `json:"present"`
	Key                     string `json:"key,omitempty"`
	Scope                   string `json:"scope,omitempty"`
	ReplayProtection        bool   `json:"replay_protection,omitempty"`
	DuplicateActionBehavior string `json:"duplicate_action_behavior,omitempty"`
	Valid                   bool   `json:"valid"`
}

type LockPolicy struct {
	Present                     bool   `json:"present"`
	LockID                      string `json:"lock_id,omitempty"`
	LeaseSeconds                int    `json:"lease_seconds,omitempty"`
	Owner                       string `json:"owner,omitempty"`
	PreventsConcurrentExecution bool   `json:"prevents_concurrent_execution,omitempty"`
	Valid                       bool   `json:"valid"`
}

type TimeoutPolicy struct {
	Present       bool `json:"present"`
	MaxSeconds    int  `json:"max_seconds,omitempty"`
	GracefulAbort bool `json:"graceful_abort,omitempty"`
	HardAbort     bool `json:"hard_abort,omitempty"`
	Valid         bool `json:"valid"`
}

type KillSwitchPolicy struct {
	Present        bool   `json:"present"`
	Enabled        bool   `json:"enabled,omitempty"`
	Trigger        string `json:"trigger,omitempty"`
	ManualOverride bool   `json:"manual_override,omitempty"`
	Valid          bool   `json:"valid"`
}

type AuditTrailPolicy struct {
	Present                 bool   `json:"present"`
	AuditID                 string `json:"audit_id,omitempty"`
	RecordsInputs           bool   `json:"records_inputs,omitempty"`
	RecordsOutputs          bool   `json:"records_outputs,omitempty"`
	RecordsGateArtifacts    bool   `json:"records_gate_artifacts,omitempty"`
	RecordsDecisions        bool   `json:"records_decisions,omitempty"`
	ImmutableTargetDeclared bool   `json:"immutable_target_declared,omitempty"`
	Valid                   bool   `json:"valid"`
}

type DryRunRehearsalPolicy struct {
	Present             bool   `json:"present"`
	RehearsalID         string `json:"rehearsal_id,omitempty"`
	Completed           bool   `json:"completed,omitempty"`
	MatchedTarget       bool   `json:"matched_target,omitempty"`
	MatchedEnvironment  bool   `json:"matched_environment,omitempty"`
	NoMutationConfirmed bool   `json:"no_mutation_confirmed,omitempty"`
	Valid               bool   `json:"valid"`
}

type ObservabilityPolicy struct {
	Present                   bool `json:"present"`
	HealthChecks              bool `json:"health_checks,omitempty"`
	Metrics                   bool `json:"metrics,omitempty"`
	Logs                      bool `json:"logs,omitempty"`
	PostExecutionWatchSeconds int  `json:"post_execution_watch_seconds,omitempty"`
	AlertingDeclared          bool `json:"alerting_declared,omitempty"`
	Valid                     bool `json:"valid"`
}

type FallbackPolicy struct {
	Present            bool   `json:"present"`
	FallbackTarget     string `json:"fallback_target,omitempty"`
	FallbackStrategy   string `json:"fallback_strategy,omitempty"`
	ManualHoldRequired bool   `json:"manual_hold_required,omitempty"`
	Valid              bool   `json:"valid"`
}

type SafetyValidation struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	Valid                      bool     `json:"valid"`
	Blocked                    bool     `json:"blocked"`
	EnvelopeStatus             string   `json:"envelope_status"`
	MissingControls            []string `json:"missing_controls"`
	UnsafeClaims               []string `json:"unsafe_claims"`
	RequiredControls           []string `json:"required_controls"`
	WouldAllowExternalExecutor bool     `json:"would_allow_external_executor"`
	MCPExecutionAllowed        bool     `json:"mcp_execution_allowed"`
	PromotionAllowed           bool     `json:"promotion_allowed"`
	DeployAllowed              bool     `json:"deploy_allowed"`
	StatusPublishAllowed       bool     `json:"status_publish_allowed"`
	MutationAllowed            bool     `json:"mutation_allowed"`
	MemoryWriteAllowed         bool     `json:"memory_write_allowed"`
	Recommendations            []string `json:"recommendations"`
}

type SafetyAudit struct {
	Version                  string   `json:"version"`
	DryRun                   bool     `json:"dry_run"`
	ReadOnly                 bool     `json:"read_only"`
	ConflictsFound           bool     `json:"conflicts_found"`
	Conflicts                []string `json:"conflicts"`
	UnsafeClaimsFound        bool     `json:"unsafe_claims_found"`
	UnsafeClaims             []string `json:"unsafe_claims"`
	MissingControlsFound     bool     `json:"missing_controls_found"`
	MissingControls          []string `json:"missing_controls"`
	ExecutorCallAttemptFound bool     `json:"executor_call_attempt_found"`
	Recommendations          []string `json:"recommendations"`
}

type SafetyBoundary struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	MCPScope                        []string `json:"mcp_scope"`
	ExternalExecutorScope           []string `json:"external_executor_scope"`
	ForbiddenInsideMCP              []string `json:"forbidden_inside_mcp"`
	RequiredBeforeExternalExecution []string `json:"required_before_external_execution"`
	AllowedOnlyOutsideMCP           []string `json:"allowed_only_outside_mcp"`
	RequiredSafetyControls          []string `json:"required_safety_controls"`
}

type SafetyExplain struct {
	Version             string   `json:"version"`
	DryRun              bool     `json:"dry_run"`
	ReadOnly            bool     `json:"read_only"`
	Summary             string   `json:"summary"`
	SafetyModel         []string `json:"safety_model"`
	RequiredControls    []string `json:"required_controls"`
	WhyMCPCannotExecute []string `json:"why_mcp_cannot_execute"`
	BlockedActions      []string `json:"blocked_actions"`
	SafestNextSteps     []string `json:"safest_next_steps"`
	RequiredGates       []string `json:"required_gates"`
}

func BuildSafetyEnvelope(input SafetyEnvelopeInput) SafetyEnvelope {
	input = NormalizeSafetyEnvelope(input)
	v := ValidateSafetyEnvelope(input)
	return SafetyEnvelope{Version: Version, DryRun: true, ReadOnly: true, EnvelopeStatus: v.EnvelopeStatus,
		Preconditions: input.Preconditions, RollbackPolicy: validatedRollback(input.RollbackPolicy), Idempotency: validatedIdempotency(input.Idempotency), ConcurrencyLock: validatedLock(effectiveLock(input)), TimeoutPolicy: validatedTimeout(input.Timeout), KillSwitch: validatedKillSwitch(input.KillSwitch), AuditTrail: validatedAuditTrail(input.AuditTrail), DryRunRehearsal: validatedRehearsal(input.DryRunRehearsal), Observability: validatedObservability(input.Observability), Fallback: validatedFallback(input.Fallback), Boundary: BuildSafetyBoundary(),
		RequiredControls: RequiredControls(), MissingControls: v.MissingControls, UnsafeClaims: v.UnsafeClaims, WouldAllowExternalExecutor: v.WouldAllowExternalExecutor,
		MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, Recommendations: v.Recommendations}
}

func ValidateSafetyEnvelope(input SafetyEnvelopeInput) SafetyValidation {
	input = NormalizeSafetyEnvelope(input)
	missing := missingControls(input)
	unsafe := unsafeClaims(input)
	eligible, reasons := EvaluateSafetyEligibility(input)
	status := envelopeStatus(missing, unsafe, eligible)
	blocked := len(unsafe) > 0
	return SafetyValidation{Version: Version, DryRun: true, ReadOnly: true, Valid: eligible && !blocked, Blocked: blocked, EnvelopeStatus: status,
		MissingControls: missing, UnsafeClaims: unsafe, RequiredControls: RequiredControls(), WouldAllowExternalExecutor: eligible && !blocked,
		MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false,
		Recommendations: recommendations(reasons, unsafe)}
}

func BuildSafetyBoundary() SafetyBoundary {
	return SafetyBoundary{Version: Version, DryRun: true, ReadOnly: true,
		MCPScope:                        []string{"read", "validate", "audit", "explain", "simulate_safety_envelope"},
		ExternalExecutorScope:           []string{"future_external_promotion", "future_external_deploy", "future_external_status_publish", "future_external_rollback", "future_external_lock_lease"},
		ForbiddenInsideMCP:              []string{"promote", "deploy", "publish_status", "push", "PR", "mutate", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback"},
		RequiredBeforeExternalExecution: []string{"PASS_GOLD_REAL", "PASS_SECURE_REAL", "V9.1 promotion contract valid", "rollback policy", "idempotency key", "lock/lease", "timeout", "kill switch", "audit trail", "dry-run rehearsal", "observability", "fallback", "explicit authorization"},
		AllowedOnlyOutsideMCP:           []string{"promote", "deploy", "publish_status", "push", "open_PR", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback"},
		RequiredSafetyControls:          RequiredControls()}
}

func AuditSafetyEnvelope(input SafetyEnvelopeInput) SafetyAudit {
	input = NormalizeSafetyEnvelope(input)
	v := ValidateSafetyEnvelope(input)
	conflicts := []string{}
	if isMCPExecutor(input.Executor) {
		conflicts = append(conflicts, "executor=mcp conflicts with external executor boundary")
	}
	if input.PromotionAllowed || input.DeployAllowed || input.StatusPublishAllowed || input.MutationAllowed || input.MemoryWriteAllowed {
		conflicts = append(conflicts, "payload attempts to allow real action inside MCP")
	}
	if input.AttemptRealRollback || input.AttemptRealDeploy || input.AttemptRealLock {
		conflicts = append(conflicts, "payload requests real rollback/deploy/lock inside MCP")
	}
	if input.WouldAllowClaim && !v.WouldAllowExternalExecutor {
		conflicts = append(conflicts, "payload declares would_allow_external_executor=true while required controls are missing or unsafe")
	}
	return SafetyAudit{Version: Version, DryRun: true, ReadOnly: true,
		ConflictsFound: len(conflicts) > 0, Conflicts: conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims,
		MissingControlsFound: len(v.MissingControls) > 0, MissingControls: v.MissingControls, ExecutorCallAttemptFound: input.AttemptExternalCall, Recommendations: v.Recommendations}
}

func ExplainSafetyEnvelope(input SafetyEnvelopeInput) SafetyExplain {
	return SafetyExplain{Version: Version, DryRun: true, ReadOnly: true,
		Summary:             "V9.2 defines a dry-run/read-only safety envelope for a future external executor; it never executes promotion, deploy, status publication, rollback, lock acquisition, memory writes, or external calls inside MCP.",
		SafetyModel:         []string{"normalize future execution payload", "require real PASS_GOLD and PASS_SECURE", "require valid V9.1 promotion contract", "require rollback/idempotency/lock-timeout/kill-switch/audit/rehearsal/observability/fallback controls", "audit unsafe execution claims", "simulate external executor eligibility only"},
		RequiredControls:    RequiredControls(),
		WhyMCPCannotExecute: []string{"MCP is a read-only control plane", "V9.2 only defines, validates, audits, and explains the safety envelope", "real execution requires a future external executor outside MCP", "MCP cannot call external executors, acquire real locks, perform rollback, mutate stable memory, deploy, publish status, push, or open PRs"},
		BlockedActions:      BuildSafetyBoundary().ForbiddenInsideMCP,
		SafestNextSteps:     []string{"collect real PASS_GOLD/PASS_SECURE artifacts", "validate the V9.1 promotion contract", "declare rollback/idempotency/lock-timeout/kill-switch/audit/rehearsal/observability/fallback controls", "keep MCP dry-run/read-only", "implement any future executor outside MCP with explicit authorization"},
		RequiredGates:       RequiredGates()}
}

func NormalizeSafetyEnvelope(input SafetyEnvelopeInput) SafetyEnvelopeInput {
	if input.Executor == "" {
		input.Executor = input.Request.Executor
	}
	if input.Target == "" {
		input.Target = input.Request.Target
	}
	if input.Environment == "" {
		input.Environment = input.Request.Environment
	}
	if input.Operation == "" {
		input.Operation = input.Request.Operation
	}
	if len(input.Gates) == 0 {
		input.Gates = input.Request.Gates
	}
	input.PromotionAllowed = input.PromotionAllowed || input.Request.PromotionAllowed
	input.DeployAllowed = input.DeployAllowed || input.Request.DeployAllowed
	input.StatusPublishAllowed = input.StatusPublishAllowed || input.Request.StatusPublishAllowed
	input.MutationAllowed = input.MutationAllowed || input.Request.MutationAllowed
	input.MemoryWriteAllowed = input.MemoryWriteAllowed || input.Request.MemoryWriteAllowed
	input.AttemptExternalCall = input.AttemptExternalCall || input.Request.AttemptExternalCall
	input.AttemptRealRollback = input.AttemptRealRollback || input.Request.AttemptRealRollback
	input.AttemptRealLock = input.AttemptRealLock || input.Request.AttemptRealLock
	input.AttemptRealDeploy = input.AttemptRealDeploy || input.Request.AttemptRealDeploy
	if !input.PromotionContractValid {
		if b, ok := input.Contract["promotion_contract_valid"].(bool); ok {
			input.PromotionContractValid = b
		}
		if b, ok := input.Contract["would_allow_external_executor"].(bool); ok {
			input.PromotionContractValid = b
		}
	}
	return input
}

func EvaluateSafetyEligibility(input SafetyEnvelopeInput) (bool, []string) {
	input = NormalizeSafetyEnvelope(input)
	reasons := []string{}
	if missing := missingControls(input); len(missing) > 0 {
		reasons = append(reasons, prefixAll("missing control: ", missing)...)
	}
	if unsafe := unsafeClaims(input); len(unsafe) > 0 {
		reasons = append(reasons, prefixAll("unsafe claim: ", unsafe)...)
	}
	if strings.TrimSpace(input.Executor) == "" {
		reasons = append(reasons, "executor must be declared")
	} else if isMCPExecutor(input.Executor) {
		reasons = append(reasons, "executor must be external, not MCP")
	}
	if strings.TrimSpace(input.Target) == "" {
		reasons = append(reasons, "target must be declared")
	}
	if strings.TrimSpace(input.Environment) == "" {
		reasons = append(reasons, "environment must be declared")
	}
	return len(reasons) == 0, reasons
}

func RequiredControls() []string { return append([]string{}, requiredControls...) }
func RequiredGates() []string    { return append([]string{}, requiredGates...) }

func missingControls(input SafetyEnvelopeInput) []string {
	out := []string{}
	if !hasRealGate(input, "PASS_GOLD") {
		out = append(out, "PASS_GOLD_REAL")
	}
	if !hasRealGate(input, "PASS_SECURE") {
		out = append(out, "PASS_SECURE_REAL")
	}
	if !input.PromotionContractValid {
		out = append(out, "promotion_contract_valid")
	}
	checks := []struct {
		name  string
		valid bool
	}{
		{"rollback_policy", validatedRollback(input.RollbackPolicy).Valid},
		{"idempotency_key", validatedIdempotency(input.Idempotency).Valid},
		{"concurrency_lock_or_lease", validatedLock(effectiveLock(input)).Valid},
		{"timeout_policy", validatedTimeout(input.Timeout).Valid},
		{"kill_switch", validatedKillSwitch(input.KillSwitch).Valid},
		{"audit_trail", validatedAuditTrail(input.AuditTrail).Valid},
		{"dry_run_rehearsal", validatedRehearsal(input.DryRunRehearsal).Valid},
		{"observability_plan", validatedObservability(input.Observability).Valid},
		{"fallback_plan", validatedFallback(input.Fallback).Valid},
	}
	for _, c := range checks {
		if !c.valid {
			out = append(out, c.name)
		}
	}
	return out
}

func unsafeClaims(input SafetyEnvelopeInput) []string {
	out := []string{}
	if isMCPExecutor(input.Executor) {
		out = append(out, "executor=mcp is forbidden for external execution")
	}
	if input.PromotionAllowed {
		out = append(out, "promotion_allowed=true is forbidden inside MCP")
	}
	if input.DeployAllowed {
		out = append(out, "deploy_allowed=true is forbidden inside MCP")
	}
	if input.StatusPublishAllowed {
		out = append(out, "status_publish_allowed=true is forbidden inside MCP")
	}
	if input.MutationAllowed {
		out = append(out, "mutation_allowed=true is forbidden inside MCP")
	}
	if input.MemoryWriteAllowed {
		out = append(out, "memory_write_allowed=true is forbidden inside MCP")
	}
	if input.AttemptExternalCall {
		out = append(out, "attempt_external_call=true is forbidden inside MCP")
	}
	if input.AttemptRealRollback {
		out = append(out, "attempt_real_rollback=true is forbidden inside MCP")
	}
	if input.AttemptRealLock {
		out = append(out, "attempt_real_lock=true is forbidden inside MCP")
	}
	if input.AttemptRealDeploy {
		out = append(out, "attempt_real_deploy=true is forbidden inside MCP")
	}
	for _, g := range input.Gates {
		name := strings.ToUpper(strings.TrimSpace(g.Gate))
		if name != "PASS_GOLD" && name != "PASS_SECURE" {
			continue
		}
		if g.DryRun {
			out = append(out, name+" dry_run evidence cannot be used as a real gate")
		}
		if g.Synthesized {
			out = append(out, name+" synthesized gate cannot be used as real evidence")
		}
		if g.Advisory || advisorySources[normalize(g.Source)] {
			out = append(out, name+" advisory source cannot be used as a real gate")
		}
	}
	return dedupe(out)
}

func envelopeStatus(missing, unsafe []string, eligible bool) string {
	if len(unsafe) > 0 {
		return "blocked"
	}
	for _, m := range missing {
		if m == "PASS_GOLD_REAL" || m == "PASS_SECURE_REAL" {
			return "missing_real_gates"
		}
	}
	if len(missing) > 0 {
		return "incomplete"
	}
	if eligible {
		return "safety_ready_dry_run"
	}
	return "incomplete"
}

func hasRealGate(input SafetyEnvelopeInput, gate string) bool {
	for _, g := range input.Gates {
		if normalize(g.Gate) == normalize(gate) && isRealGate(g) {
			return true
		}
	}
	return false
}

func isRealGate(g SafetyGate) bool {
	gate := normalize(g.Gate)
	return (gate == "pass_gold" || gate == "pass_secure") && g.RealEvidence && !g.DryRun && !g.Synthesized && !g.Advisory && g.RecognizedByAuthority && !advisorySources[normalize(g.Source)]
}

func effectiveLock(input SafetyEnvelopeInput) LockPolicy {
	if input.Lock.Present || input.Lock.LockID != "" || input.Lock.LeaseSeconds > 0 {
		return input.Lock
	}
	return input.Lease
}

func validatedRollback(p RollbackPolicy) RollbackPolicy {
	p.Valid = p.Present && p.Strategy != "" && p.SnapshotRequired && p.RestoreCommandDeclared && p.ValidationAfterRollback && p.MaxAttempts > 0 && p.ManualInterventionRequired
	return p
}
func validatedIdempotency(p IdempotencyPolicy) IdempotencyPolicy {
	p.Valid = p.Present && p.Key != "" && p.Scope != "" && p.ReplayProtection && normalize(p.DuplicateActionBehavior) != ""
	return p
}
func validatedLock(p LockPolicy) LockPolicy {
	p.Valid = p.Present && p.LockID != "" && p.LeaseSeconds > 0 && p.Owner != "" && p.PreventsConcurrentExecution
	return p
}
func validatedTimeout(p TimeoutPolicy) TimeoutPolicy {
	p.Valid = p.Present && p.MaxSeconds > 0 && p.GracefulAbort && p.HardAbort
	return p
}
func validatedKillSwitch(p KillSwitchPolicy) KillSwitchPolicy {
	p.Valid = p.Present && p.Enabled && p.Trigger != "" && p.ManualOverride
	return p
}
func validatedAuditTrail(p AuditTrailPolicy) AuditTrailPolicy {
	p.Valid = p.Present && p.AuditID != "" && p.RecordsInputs && p.RecordsOutputs && p.RecordsGateArtifacts && p.RecordsDecisions && p.ImmutableTargetDeclared
	return p
}
func validatedRehearsal(p DryRunRehearsalPolicy) DryRunRehearsalPolicy {
	p.Valid = p.Present && p.RehearsalID != "" && p.Completed && p.MatchedTarget && p.MatchedEnvironment && p.NoMutationConfirmed
	return p
}
func validatedObservability(p ObservabilityPolicy) ObservabilityPolicy {
	p.Valid = p.Present && p.HealthChecks && p.Metrics && p.Logs && p.PostExecutionWatchSeconds > 0 && p.AlertingDeclared
	return p
}
func validatedFallback(p FallbackPolicy) FallbackPolicy {
	p.Valid = p.Present && p.FallbackTarget != "" && p.FallbackStrategy != "" && p.ManualHoldRequired
	return p
}

func recommendations(reasons, unsafe []string) []string {
	if len(reasons) == 0 && len(unsafe) == 0 {
		return []string{"safety envelope is ready in dry-run only; do not execute inside MCP"}
	}
	return []string{"keep MCP dry-run/read-only", "do not call an external executor from MCP", "provide real PASS_GOLD/PASS_SECURE authority-recognized evidence", "complete rollback, idempotency, lock/lease, timeout, kill switch, audit, rehearsal, observability, and fallback controls"}
}
func prefixAll(prefix string, items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		out = append(out, prefix+item)
	}
	return out
}
func isMCPExecutor(s string) bool { n := normalize(s); return n == "mcp" || n == "mcp_readonly" }
func normalize(s string) string   { return strings.ToLower(strings.TrimSpace(s)) }
func dedupe(items []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			out = append(out, item)
		}
	}
	return out
}
