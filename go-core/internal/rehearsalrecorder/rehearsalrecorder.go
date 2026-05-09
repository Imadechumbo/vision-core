// Package rehearsalrecorder implements the V9.3 Executor Dry-Run Rehearsal Recorder.
//
// The recorder is intentionally read-only and dry-run. It builds, validates,
// audits, and explains logical rehearsal payloads for a future external
// executor, but it never promotes, deploys, publishes status, writes files,
// writes memory, calls networks/APIs, executes commands, acquires real locks,
// performs rollback, or invokes an external executor.
package rehearsalrecorder

import "strings"

const Version = "V9.3"

var requiredItems = []string{
	"rehearsal_id",
	"executor",
	"target",
	"environment",
	"safety_envelope_valid",
	"promotion_contract_valid",
	"expected_actions",
	"forbidden_actions",
	"replay_plan",
	"no_mutation_proof",
	"audit_summary",
	"evidence_summary",
	"rollback_rehearsal",
	"observability_rehearsal",
	"checklist",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

type RehearsalInput struct {
	Root                   string                   `json:"root,omitempty"`
	MissionInput           string                   `json:"mission_input,omitempty"`
	Operation              string                   `json:"operation,omitempty"`
	Rehearsal              *RehearsalInput          `json:"rehearsal,omitempty"`
	RehearsalID            string                   `json:"rehearsal_id,omitempty"`
	Executor               string                   `json:"executor,omitempty"`
	Target                 string                   `json:"target,omitempty"`
	Environment            string                   `json:"environment,omitempty"`
	SafetyEnvelopeValid    bool                     `json:"safety_envelope_valid,omitempty"`
	PromotionContractValid bool                     `json:"promotion_contract_valid,omitempty"`
	Gates                  []string                 `json:"gates,omitempty"`
	ExpectedActions        []ExpectedAction         `json:"expected_actions,omitempty"`
	ForbiddenActions       []string                 `json:"forbidden_actions,omitempty"`
	ReplayPlan             ReplayPlan               `json:"replay_plan,omitempty"`
	NoMutationProof        NoMutationProof          `json:"no_mutation_proof,omitempty"`
	AuditSummary           RehearsalAuditSummary    `json:"audit_summary,omitempty"`
	EvidenceSummary        RehearsalEvidenceSummary `json:"evidence_summary,omitempty"`
	RollbackRehearsal      RollbackRehearsal        `json:"rollback_rehearsal,omitempty"`
	ObservabilityRehearsal ObservabilityRehearsal   `json:"observability_rehearsal,omitempty"`
	Checklist              SafetyChecklist          `json:"checklist,omitempty"`
	Strict                 bool                     `json:"strict,omitempty"`
	PromotionAllowed       bool                     `json:"promotion_allowed,omitempty"`
	DeployAllowed          bool                     `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed   bool                     `json:"status_publish_allowed,omitempty"`
	MutationAllowed        bool                     `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed     bool                     `json:"memory_write_allowed,omitempty"`
	AttemptExternalCall    bool                     `json:"attempt_external_call,omitempty"`
	AttemptRealRollback    bool                     `json:"attempt_real_rollback,omitempty"`
	AttemptRealLock        bool                     `json:"attempt_real_lock,omitempty"`
	CommandExecution       bool                     `json:"command_execution,omitempty"`
	NetworkCall            bool                     `json:"network_call,omitempty"`
	FileWrite              bool                     `json:"file_write,omitempty"`
	PassGold               bool                     `json:"pass_gold,omitempty"`
	PassSecure             bool                     `json:"pass_secure,omitempty"`
	WouldAllowClaim        bool                     `json:"would_allow_external_executor,omitempty"`
	Extra                  map[string]interface{}   `json:"-"`
}

type ExpectedAction struct {
	ID                     string `json:"id,omitempty"`
	Name                   string `json:"name,omitempty"`
	Category               string `json:"category,omitempty"`
	WouldExecuteOutsideMCP bool   `json:"would_execute_outside_mcp,omitempty"`
	InsideMCPAllowed       bool   `json:"inside_mcp_allowed,omitempty"`
	RequiresGate           string `json:"requires_gate,omitempty"`
	RequiresControl        string `json:"requires_control,omitempty"`
	Order                  int    `json:"order,omitempty"`
	Summary                string `json:"summary,omitempty"`
}

type ReplayPlan struct {
	Present            bool     `json:"present,omitempty"`
	Steps              []string `json:"steps,omitempty"`
	Deterministic      bool     `json:"deterministic,omitempty"`
	TargetMatched      bool     `json:"target_matched,omitempty"`
	EnvironmentMatched bool     `json:"environment_matched,omitempty"`
	Valid              bool     `json:"valid"`
}

type NoMutationProof struct {
	Present             bool `json:"present,omitempty"`
	NoFilesWritten      bool `json:"no_files_written,omitempty"`
	NoCommandsExecuted  bool `json:"no_commands_executed,omitempty"`
	NoNetworkCalled     bool `json:"no_network_called,omitempty"`
	NoStatusPublished   bool `json:"no_status_published,omitempty"`
	NoDeployPerformed   bool `json:"no_deploy_performed,omitempty"`
	NoLockAcquired      bool `json:"no_lock_acquired,omitempty"`
	NoRollbackPerformed bool `json:"no_rollback_performed,omitempty"`
	Valid               bool `json:"valid"`
}

type RehearsalAuditSummary struct {
	Present                 bool   `json:"present,omitempty"`
	AuditID                 string `json:"audit_id,omitempty"`
	RecordsInputs           bool   `json:"records_inputs,omitempty"`
	RecordsExpectedActions  bool   `json:"records_expected_actions,omitempty"`
	RecordsForbiddenActions bool   `json:"records_forbidden_actions,omitempty"`
	RecordsSafetyControls   bool   `json:"records_safety_controls,omitempty"`
	RecordsNoMutation       bool   `json:"records_no_mutation,omitempty"`
	Valid                   bool   `json:"valid"`
}

type RehearsalEvidenceSummary struct {
	Present                            bool `json:"present,omitempty"`
	IncludesPassGoldRealReference      bool `json:"includes_pass_gold_real_reference,omitempty"`
	IncludesPassSecureRealReference    bool `json:"includes_pass_secure_real_reference,omitempty"`
	IncludesSafetyEnvelopeReference    bool `json:"includes_safety_envelope_reference,omitempty"`
	IncludesPromotionContractReference bool `json:"includes_promotion_contract_reference,omitempty"`
	UsesDryRunAsRealGate               bool `json:"uses_dry_run_as_real_gate,omitempty"`
	Valid                              bool `json:"valid"`
}

type RollbackRehearsal struct {
	Present                         bool   `json:"present,omitempty"`
	Strategy                        string `json:"strategy,omitempty"`
	SimulatedOnly                   bool   `json:"simulated_only,omitempty"`
	RestorePathDeclared             bool   `json:"restore_path_declared,omitempty"`
	ValidationAfterSimulatedRestore bool   `json:"validation_after_simulated_restore,omitempty"`
	NoRealRollbackPerformed         bool   `json:"no_real_rollback_performed,omitempty"`
	Valid                           bool   `json:"valid"`
}

type ObservabilityRehearsal struct {
	Present             bool `json:"present,omitempty"`
	HealthChecksPlanned bool `json:"health_checks_planned,omitempty"`
	MetricsPlanned      bool `json:"metrics_planned,omitempty"`
	LogsPlanned         bool `json:"logs_planned,omitempty"`
	AlertingPlanned     bool `json:"alerting_planned,omitempty"`
	WatchWindowSeconds  int  `json:"watch_window_seconds,omitempty"`
	Valid               bool `json:"valid"`
}

type SafetyChecklist struct {
	Present                  bool `json:"present,omitempty"`
	PassGoldRealChecked      bool `json:"pass_gold_real_checked,omitempty"`
	PassSecureRealChecked    bool `json:"pass_secure_real_checked,omitempty"`
	PromotionContractChecked bool `json:"promotion_contract_checked,omitempty"`
	SafetyEnvelopeChecked    bool `json:"safety_envelope_checked,omitempty"`
	IdempotencyChecked       bool `json:"idempotency_checked,omitempty"`
	LockLeaseChecked         bool `json:"lock_lease_checked,omitempty"`
	TimeoutChecked           bool `json:"timeout_checked,omitempty"`
	KillSwitchChecked        bool `json:"kill_switch_checked,omitempty"`
	AuditTrailChecked        bool `json:"audit_trail_checked,omitempty"`
	RollbackChecked          bool `json:"rollback_checked,omitempty"`
	ObservabilityChecked     bool `json:"observability_checked,omitempty"`
	FallbackChecked          bool `json:"fallback_checked,omitempty"`
	NoMutationChecked        bool `json:"no_mutation_checked,omitempty"`
	Valid                    bool `json:"valid"`
}

type RehearsalRecord struct {
	Version                    string                   `json:"version"`
	DryRun                     bool                     `json:"dry_run"`
	ReadOnly                   bool                     `json:"read_only"`
	RehearsalID                string                   `json:"rehearsal_id,omitempty"`
	MissionInput               string                   `json:"mission_input,omitempty"`
	Operation                  string                   `json:"operation,omitempty"`
	Executor                   string                   `json:"executor,omitempty"`
	Target                     string                   `json:"target,omitempty"`
	Environment                string                   `json:"environment,omitempty"`
	RehearsalStatus            string                   `json:"rehearsal_status"`
	ExpectedActions            []ExpectedAction         `json:"expected_actions,omitempty"`
	ForbiddenActions           []string                 `json:"forbidden_actions,omitempty"`
	ReplayPlan                 ReplayPlan               `json:"replay_plan"`
	NoMutationProof            NoMutationProof          `json:"no_mutation_proof"`
	AuditSummary               RehearsalAuditSummary    `json:"audit_summary"`
	EvidenceSummary            RehearsalEvidenceSummary `json:"evidence_summary"`
	RollbackRehearsal          RollbackRehearsal        `json:"rollback_rehearsal"`
	ObservabilityRehearsal     ObservabilityRehearsal   `json:"observability_rehearsal"`
	Checklist                  SafetyChecklist          `json:"checklist"`
	MissingItems               []string                 `json:"missing_items"`
	UnsafeClaims               []string                 `json:"unsafe_claims"`
	WouldAllowExternalExecutor bool                     `json:"would_allow_external_executor"`
	MCPExecutionAllowed        bool                     `json:"mcp_execution_allowed"`
	PromotionAllowed           bool                     `json:"promotion_allowed"`
	DeployAllowed              bool                     `json:"deploy_allowed"`
	StatusPublishAllowed       bool                     `json:"status_publish_allowed"`
	MutationAllowed            bool                     `json:"mutation_allowed"`
	MemoryWriteAllowed         bool                     `json:"memory_write_allowed"`
	UsableForPassGold          bool                     `json:"usable_for_pass_gold"`
	UsableForPassSecure        bool                     `json:"usable_for_pass_secure"`
	Recommendations            []string                 `json:"recommendations"`
}

type RehearsalValidation struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	Valid                      bool     `json:"valid"`
	Blocked                    bool     `json:"blocked"`
	RehearsalStatus            string   `json:"rehearsal_status"`
	MissingItems               []string `json:"missing_items"`
	UnsafeClaims               []string `json:"unsafe_claims"`
	RequiredItems              []string `json:"required_items"`
	WouldAllowExternalExecutor bool     `json:"would_allow_external_executor"`
	MCPExecutionAllowed        bool     `json:"mcp_execution_allowed"`
	PromotionAllowed           bool     `json:"promotion_allowed"`
	DeployAllowed              bool     `json:"deploy_allowed"`
	StatusPublishAllowed       bool     `json:"status_publish_allowed"`
	MutationAllowed            bool     `json:"mutation_allowed"`
	MemoryWriteAllowed         bool     `json:"memory_write_allowed"`
	UsableForPassGold          bool     `json:"usable_for_pass_gold"`
	UsableForPassSecure        bool     `json:"usable_for_pass_secure"`
	Recommendations            []string `json:"recommendations"`
}

type RehearsalAudit struct {
	Version               string   `json:"version"`
	DryRun                bool     `json:"dry_run"`
	ReadOnly              bool     `json:"read_only"`
	ConflictsFound        bool     `json:"conflicts_found"`
	Conflicts             []string `json:"conflicts"`
	UnsafeClaimsFound     bool     `json:"unsafe_claims_found"`
	UnsafeClaims          []string `json:"unsafe_claims"`
	MissingItemsFound     bool     `json:"missing_items_found"`
	MissingItems          []string `json:"missing_items"`
	ExecutionAttemptFound bool     `json:"execution_attempt_found"`
	MutationAttemptFound  bool     `json:"mutation_attempt_found"`
	Recommendations       []string `json:"recommendations"`
}

type RehearsalExplain struct {
	Version                   string   `json:"version"`
	DryRun                    bool     `json:"dry_run"`
	ReadOnly                  bool     `json:"read_only"`
	Summary                   string   `json:"summary"`
	RehearsalModel            []string `json:"rehearsal_model"`
	RequiredItems             []string `json:"required_items"`
	WhyMCPCannotExecute       []string `json:"why_mcp_cannot_execute"`
	WhyRehearsalIsNotPassGold []string `json:"why_rehearsal_is_not_pass_gold"`
	BlockedActions            []string `json:"blocked_actions"`
	SafestNextSteps           []string `json:"safest_next_steps"`
	RequiredGates             []string `json:"required_gates"`
}

type RehearsalBoundary struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	MCPScope                        []string `json:"mcp_scope"`
	ExternalExecutorScope           []string `json:"external_executor_scope"`
	ForbiddenInsideMCP              []string `json:"forbidden_inside_mcp"`
	RequiredBeforeExternalExecution []string `json:"required_before_external_execution"`
	AllowedOnlyOutsideMCP           []string `json:"allowed_only_outside_mcp"`
	RequiredRehearsalItems          []string `json:"required_rehearsal_items"`
}

func BuildRehearsalRecord(input RehearsalInput) RehearsalRecord {
	input = NormalizeRehearsal(input)
	v := ValidateRehearsal(input)
	return RehearsalRecord{
		Version: Version, DryRun: true, ReadOnly: true,
		RehearsalID: input.RehearsalID, MissionInput: input.MissionInput, Operation: input.Operation,
		Executor: input.Executor, Target: input.Target, Environment: input.Environment,
		RehearsalStatus: v.RehearsalStatus, ExpectedActions: input.ExpectedActions, ForbiddenActions: input.ForbiddenActions,
		ReplayPlan: normalizeReplayPlan(input.ReplayPlan), NoMutationProof: normalizeNoMutationProof(input.NoMutationProof),
		AuditSummary: normalizeAuditSummary(input.AuditSummary), EvidenceSummary: normalizeEvidenceSummary(input.EvidenceSummary),
		RollbackRehearsal: normalizeRollbackRehearsal(input.RollbackRehearsal), ObservabilityRehearsal: normalizeObservabilityRehearsal(input.ObservabilityRehearsal),
		Checklist: normalizeChecklist(input.Checklist), MissingItems: v.MissingItems, UnsafeClaims: v.UnsafeClaims,
		WouldAllowExternalExecutor: v.WouldAllowExternalExecutor,
		MCPExecutionAllowed:        false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false,
		MutationAllowed: false, MemoryWriteAllowed: false, UsableForPassGold: false, UsableForPassSecure: false,
		Recommendations: v.Recommendations,
	}
}

func ValidateRehearsal(input RehearsalInput) RehearsalValidation {
	input = NormalizeRehearsal(input)
	missing := missingItems(input)
	unsafe := unsafeClaims(input)
	executionAttempt := hasExecutionAttempt(input)
	status := "rehearsal_ready_dry_run"
	eligible := len(missing) == 0 && len(unsafe) == 0 && !executionAttempt && executorExternal(input.Executor)
	if len(missing) > 0 {
		status = "incomplete"
	}
	if len(unsafe) > 0 {
		status = "blocked"
	}
	if executionAttempt {
		status = "unsafe_execution_attempt"
	}
	if !eligible {
		eligible = false
	}
	recs := []string{"keep rehearsal read-only/dry-run", "require real PASS_GOLD and PASS_SECURE outside MCP before any external execution"}
	if len(missing) > 0 {
		recs = append(recs, "complete all required rehearsal items before advisory use")
	}
	if len(unsafe) > 0 || executionAttempt {
		recs = append(recs, "remove unsafe claims and real execution attempts from the MCP payload")
	}
	return RehearsalValidation{
		Version: Version, DryRun: true, ReadOnly: true,
		Valid: eligible, Blocked: !eligible, RehearsalStatus: status,
		MissingItems: missing, UnsafeClaims: unsafe, RequiredItems: copyStrings(requiredItems),
		WouldAllowExternalExecutor: eligible,
		MCPExecutionAllowed:        false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false,
		MutationAllowed: false, MemoryWriteAllowed: false, UsableForPassGold: false, UsableForPassSecure: false,
		Recommendations: recs,
	}
}

func BuildRehearsalBoundary() RehearsalBoundary {
	return RehearsalBoundary{
		Version: Version, DryRun: true, ReadOnly: true,
		MCPScope:                        []string{"read", "validate", "audit", "explain", "simulate_rehearsal", "record_logical_payload"},
		ExternalExecutorScope:           []string{"may_use_rehearsal_as_advisory_checklist", "must_verify_real_PASS_GOLD", "must_verify_real_PASS_SECURE", "must_run_outside_mcp_only"},
		ForbiddenInsideMCP:              []string{"promote", "deploy", "publish_status", "push", "PR", "mutate", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback", "write_rehearsal_file"},
		RequiredBeforeExternalExecution: []string{"PASS_GOLD_REAL", "PASS_SECURE_REAL", "valid_promotion_contract", "valid_safety_envelope", "operator_authorization", "external_executor_outside_mcp"},
		AllowedOnlyOutsideMCP:           []string{"promotion", "deployment", "status_publish", "repository_push", "pull_request", "memory_write", "external_executor_call", "real_lock", "real_rollback"},
		RequiredRehearsalItems:          copyStrings(requiredItems),
	}
}

func AuditRehearsal(input RehearsalInput) RehearsalAudit {
	input = NormalizeRehearsal(input)
	missing := missingItems(input)
	unsafe := unsafeClaims(input)
	conflicts := []string{}
	if input.WouldAllowClaim && len(missing) > 0 {
		conflicts = append(conflicts, "would_allow_external_executor claimed while required items are missing")
	}
	if input.NoMutationProof.Present && (input.FileWrite || input.CommandExecution || input.NetworkCall) {
		conflicts = append(conflicts, "no_mutation_proof conflicts with file_write/command_execution/network_call")
	}
	executionAttempt := hasExecutionAttempt(input)
	mutationAttempt := input.FileWrite || input.MutationAllowed || input.MemoryWriteAllowed
	return RehearsalAudit{
		Version: Version, DryRun: true, ReadOnly: true,
		ConflictsFound: len(conflicts) > 0, Conflicts: conflicts,
		UnsafeClaimsFound: len(unsafe) > 0, UnsafeClaims: unsafe,
		MissingItemsFound: len(missing) > 0, MissingItems: missing,
		ExecutionAttemptFound: executionAttempt, MutationAttemptFound: mutationAttempt,
		Recommendations: []string{"treat rehearsal as advisory only", "never use V9.3 as PASS GOLD/PASS SECURE evidence", "remove real execution or mutation flags from MCP payload"},
	}
}

func ExplainRehearsal(input RehearsalInput) RehearsalExplain {
	_ = NormalizeRehearsal(input)
	return RehearsalExplain{
		Version: Version, DryRun: true, ReadOnly: true,
		Summary:                   "V9.3 records a read-only dry-run rehearsal for a future external executor without authorizing or performing execution.",
		RehearsalModel:            []string{"collect declared inputs", "validate required controls", "audit unsafe claims", "explain forbidden MCP actions", "return logical payload only"},
		RequiredItems:             copyStrings(requiredItems),
		WhyMCPCannotExecute:       []string{"MCP control plane is read-only", "promotion, deploy, status publish, command execution, network calls, locks, rollback, PRs, pushes, and memory writes are prohibited", "external execution must happen only outside MCP after real gates"},
		WhyRehearsalIsNotPassGold: []string{"a rehearsal is simulated advisory evidence only", "dry-run output cannot become PASS_GOLD_REAL or PASS_SECURE_REAL", "real gate authority must be verified independently outside the rehearsal"},
		BlockedActions:            BuildRehearsalBoundary().ForbiddenInsideMCP,
		SafestNextSteps:           []string{"complete missing rehearsal controls", "verify V9.2 safety envelope", "verify V9.1 promotion contract", "obtain real PASS_GOLD and PASS_SECURE before any external execution"},
		RequiredGates:             copyStrings(requiredGates),
	}
}

func NormalizeRehearsal(input RehearsalInput) RehearsalInput {
	if input.Rehearsal != nil {
		nested := *input.Rehearsal
		if input.Root == "" {
			input.Root = nested.Root
		}
		if input.MissionInput == "" {
			input.MissionInput = nested.MissionInput
		}
		if input.Operation == "" {
			input.Operation = nested.Operation
		}
		if input.RehearsalID == "" {
			input.RehearsalID = nested.RehearsalID
		}
		if input.Executor == "" {
			input.Executor = nested.Executor
		}
		if input.Target == "" {
			input.Target = nested.Target
		}
		if input.Environment == "" {
			input.Environment = nested.Environment
		}
		if !input.SafetyEnvelopeValid {
			input.SafetyEnvelopeValid = nested.SafetyEnvelopeValid
		}
		if !input.PromotionContractValid {
			input.PromotionContractValid = nested.PromotionContractValid
		}
		if len(input.Gates) == 0 {
			input.Gates = nested.Gates
		}
		if len(input.ExpectedActions) == 0 {
			input.ExpectedActions = nested.ExpectedActions
		}
		if len(input.ForbiddenActions) == 0 {
			input.ForbiddenActions = nested.ForbiddenActions
		}
		if !input.ReplayPlan.Present {
			input.ReplayPlan = nested.ReplayPlan
		}
		if !input.NoMutationProof.Present {
			input.NoMutationProof = nested.NoMutationProof
		}
		if !input.AuditSummary.Present {
			input.AuditSummary = nested.AuditSummary
		}
		if !input.EvidenceSummary.Present {
			input.EvidenceSummary = nested.EvidenceSummary
		}
		if !input.RollbackRehearsal.Present {
			input.RollbackRehearsal = nested.RollbackRehearsal
		}
		if !input.ObservabilityRehearsal.Present {
			input.ObservabilityRehearsal = nested.ObservabilityRehearsal
		}
		if !input.Checklist.Present {
			input.Checklist = nested.Checklist
		}
	}
	input.ReplayPlan = normalizeReplayPlan(input.ReplayPlan)
	input.NoMutationProof = normalizeNoMutationProof(input.NoMutationProof)
	input.AuditSummary = normalizeAuditSummary(input.AuditSummary)
	input.EvidenceSummary = normalizeEvidenceSummary(input.EvidenceSummary)
	input.RollbackRehearsal = normalizeRollbackRehearsal(input.RollbackRehearsal)
	input.ObservabilityRehearsal = normalizeObservabilityRehearsal(input.ObservabilityRehearsal)
	input.Checklist = normalizeChecklist(input.Checklist)
	return input
}

func EvaluateRehearsalEligibility(input RehearsalInput) (bool, []string) {
	v := ValidateRehearsal(input)
	reasons := append([]string{}, v.MissingItems...)
	reasons = append(reasons, v.UnsafeClaims...)
	return v.WouldAllowExternalExecutor, reasons
}

func missingItems(input RehearsalInput) []string {
	missing := []string{}
	if strings.TrimSpace(input.RehearsalID) == "" {
		missing = append(missing, "rehearsal_id")
	}
	if strings.TrimSpace(input.Executor) == "" {
		missing = append(missing, "executor")
	}
	if strings.TrimSpace(input.Target) == "" {
		missing = append(missing, "target")
	}
	if strings.TrimSpace(input.Environment) == "" {
		missing = append(missing, "environment")
	}
	if !input.SafetyEnvelopeValid {
		missing = append(missing, "safety_envelope_valid")
	}
	if !input.PromotionContractValid {
		missing = append(missing, "promotion_contract_valid")
	}
	if len(input.ExpectedActions) == 0 {
		missing = append(missing, "expected_actions")
	}
	if len(input.ForbiddenActions) == 0 {
		missing = append(missing, "forbidden_actions")
	}
	if !input.ReplayPlan.Valid {
		missing = append(missing, "replay_plan")
	}
	if !input.NoMutationProof.Valid {
		missing = append(missing, "no_mutation_proof")
	}
	if !input.AuditSummary.Valid {
		missing = append(missing, "audit_summary")
	}
	if !input.EvidenceSummary.Valid {
		missing = append(missing, "evidence_summary")
	}
	if !input.RollbackRehearsal.Valid {
		missing = append(missing, "rollback_rehearsal")
	}
	if !input.ObservabilityRehearsal.Valid {
		missing = append(missing, "observability_rehearsal")
	}
	if !input.Checklist.Valid {
		missing = append(missing, "checklist")
	}
	return missing
}

func unsafeClaims(input RehearsalInput) []string {
	unsafe := []string{}
	if !executorExternal(input.Executor) && strings.TrimSpace(input.Executor) != "" {
		unsafe = append(unsafe, "executor_must_not_be_mcp")
	}
	if input.PromotionAllowed {
		unsafe = append(unsafe, "promotion_allowed_inside_mcp")
	}
	if input.DeployAllowed {
		unsafe = append(unsafe, "deploy_allowed_inside_mcp")
	}
	if input.StatusPublishAllowed {
		unsafe = append(unsafe, "status_publish_allowed_inside_mcp")
	}
	if input.MutationAllowed {
		unsafe = append(unsafe, "mutation_allowed_inside_mcp")
	}
	if input.MemoryWriteAllowed {
		unsafe = append(unsafe, "memory_write_allowed_inside_mcp")
	}
	if input.AttemptExternalCall {
		unsafe = append(unsafe, "attempt_external_call_inside_mcp")
	}
	if input.AttemptRealRollback {
		unsafe = append(unsafe, "attempt_real_rollback_inside_mcp")
	}
	if input.AttemptRealLock {
		unsafe = append(unsafe, "attempt_real_lock_inside_mcp")
	}
	if input.CommandExecution {
		unsafe = append(unsafe, "command_execution_inside_mcp")
	}
	if input.NetworkCall {
		unsafe = append(unsafe, "network_call_inside_mcp")
	}
	if input.FileWrite {
		unsafe = append(unsafe, "file_write_inside_mcp")
	}
	if input.PassGold {
		unsafe = append(unsafe, "rehearsal_claims_pass_gold")
	}
	if input.PassSecure {
		unsafe = append(unsafe, "rehearsal_claims_pass_secure")
	}
	if input.EvidenceSummary.UsesDryRunAsRealGate {
		unsafe = append(unsafe, "dry_run_evidence_used_as_real_gate")
	}
	if input.NoMutationProof.Present && input.FileWrite {
		unsafe = append(unsafe, "no_mutation_proof_contradicts_file_write")
	}
	if input.NoMutationProof.Present && input.CommandExecution {
		unsafe = append(unsafe, "no_mutation_proof_contradicts_command_execution")
	}
	if input.NoMutationProof.Present && input.NetworkCall {
		unsafe = append(unsafe, "no_mutation_proof_contradicts_network_call")
	}
	return unsafe
}

func hasExecutionAttempt(input RehearsalInput) bool {
	return input.PromotionAllowed || input.DeployAllowed || input.StatusPublishAllowed || input.AttemptExternalCall || input.AttemptRealRollback || input.AttemptRealLock || input.CommandExecution || input.NetworkCall
}

func executorExternal(executor string) bool {
	s := strings.ToLower(strings.TrimSpace(executor))
	return s != "" && s != "mcp" && s != "mcp_readonly"
}

func normalizeReplayPlan(p ReplayPlan) ReplayPlan {
	p.Valid = p.Present && len(p.Steps) > 0 && p.Deterministic && p.TargetMatched && p.EnvironmentMatched
	return p
}

func normalizeNoMutationProof(p NoMutationProof) NoMutationProof {
	p.Valid = p.Present && p.NoFilesWritten && p.NoCommandsExecuted && p.NoNetworkCalled && p.NoStatusPublished && p.NoDeployPerformed && p.NoLockAcquired && p.NoRollbackPerformed
	return p
}

func normalizeAuditSummary(a RehearsalAuditSummary) RehearsalAuditSummary {
	a.Valid = a.Present && a.AuditID != "" && a.RecordsInputs && a.RecordsExpectedActions && a.RecordsForbiddenActions && a.RecordsSafetyControls && a.RecordsNoMutation
	return a
}

func normalizeEvidenceSummary(e RehearsalEvidenceSummary) RehearsalEvidenceSummary {
	e.Valid = e.Present && e.IncludesPassGoldRealReference && e.IncludesPassSecureRealReference && e.IncludesSafetyEnvelopeReference && e.IncludesPromotionContractReference && !e.UsesDryRunAsRealGate
	return e
}

func normalizeRollbackRehearsal(r RollbackRehearsal) RollbackRehearsal {
	r.Valid = r.Present && r.Strategy != "" && r.SimulatedOnly && r.RestorePathDeclared && r.ValidationAfterSimulatedRestore && r.NoRealRollbackPerformed
	return r
}

func normalizeObservabilityRehearsal(o ObservabilityRehearsal) ObservabilityRehearsal {
	o.Valid = o.Present && o.HealthChecksPlanned && o.MetricsPlanned && o.LogsPlanned && o.AlertingPlanned && o.WatchWindowSeconds > 0
	return o
}

func normalizeChecklist(c SafetyChecklist) SafetyChecklist {
	c.Valid = c.Present && c.PassGoldRealChecked && c.PassSecureRealChecked && c.PromotionContractChecked && c.SafetyEnvelopeChecked && c.IdempotencyChecked && c.LockLeaseChecked && c.TimeoutChecked && c.KillSwitchChecked && c.AuditTrailChecked && c.RollbackChecked && c.ObservabilityChecked && c.FallbackChecked && c.NoMutationChecked
	return c
}

func copyStrings(in []string) []string {
	out := make([]string, len(in))
	copy(out, in)
	return out
}
