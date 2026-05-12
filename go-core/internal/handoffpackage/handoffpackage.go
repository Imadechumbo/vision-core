// Package handoffpackage implements the V9.6 External Executor Handoff Package.
//
// The handoff package is intentionally read-only and dry-run. It consolidates
// V9.0 through V9.5 summaries into an in-memory advisory payload for a future
// external executor. It never writes files, exports ZIP/JSON, calls networks or
// executor APIs, executes commands, promotes, deploys, publishes status, mutates
// memory, acquires locks, or performs rollback.
package handoffpackage

import "strings"

const Version = "V9.6"

const (
	StatusReadyDryRun            = "handoff_ready_dry_run"
	StatusIncomplete             = "incomplete"
	StatusMissingRealGates       = "missing_real_gates"
	StatusBlocked                = "blocked"
	StatusUnsafeExecutionAttempt = "unsafe_execution_attempt"
)

var requiredItems = []string{
	"handoff_id", "executor", "project", "branch", "commit_sha", "target", "environment",
	"authority_summary", "promotion_contract_summary", "safety_envelope_summary", "rehearsal_summary",
	"authorization_manifest_summary", "final_preflight_result", "PASS_GOLD_REAL", "PASS_SECURE_REAL",
	"required_artifacts", "rollback_requirements", "kill_switch_requirements", "observability_requirements",
	"handoff_boundary", "checklist", "no_file_write", "no_network_call", "no_command_execution",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var advisorySources = map[string]bool{
	"mcp": true, "mcp_readonly": true, "dashboard": true, "readiness": true,
	"evidenceledger": true, "contractregistry": true, "policymatrix": true,
	"codeburn": true, "impeccable": true, "dryrun": true, "graphmemory": true,
	"unknown": true, "advisory": true,
}

type HandoffInput struct {
	Root                         string                     `json:"root,omitempty"`
	MissionInput                 string                     `json:"mission_input,omitempty"`
	Operation                    string                     `json:"operation,omitempty"`
	Handoff                      *HandoffInput              `json:"handoff,omitempty"`
	HandoffID                    string                     `json:"handoff_id,omitempty"`
	Executor                     string                     `json:"executor,omitempty"`
	Project                      string                     `json:"project,omitempty"`
	Branch                       string                     `json:"branch,omitempty"`
	CommitSHA                    string                     `json:"commit_sha,omitempty"`
	Target                       string                     `json:"target,omitempty"`
	Environment                  string                     `json:"environment,omitempty"`
	AuthoritySummary             *HandoffSummary            `json:"authority_summary,omitempty"`
	PromotionContractSummary     *HandoffSummary            `json:"promotion_contract_summary,omitempty"`
	SafetyEnvelopeSummary        *HandoffSummary            `json:"safety_envelope_summary,omitempty"`
	RehearsalSummary             *HandoffSummary            `json:"rehearsal_summary,omitempty"`
	AuthorizationManifestSummary *HandoffSummary            `json:"authorization_manifest_summary,omitempty"`
	FinalPreflightResult         *FinalPreflightSummary     `json:"final_preflight_result,omitempty"`
	Gates                        []HandoffGate              `json:"gates,omitempty"`
	Artifacts                    []HandoffArtifact          `json:"artifacts,omitempty"`
	RollbackRequirements         *RollbackRequirements      `json:"rollback_requirements,omitempty"`
	KillSwitchRequirements       *KillSwitchRequirements    `json:"kill_switch_requirements,omitempty"`
	ObservabilityRequirements    *ObservabilityRequirements `json:"observability_requirements,omitempty"`
	Boundary                     *HandoffBoundary           `json:"boundary,omitempty"`
	Checklist                    *HandoffChecklist          `json:"checklist,omitempty"`
	Strict                       bool                       `json:"strict,omitempty"`
	PromotionAllowed             bool                       `json:"promotion_allowed,omitempty"`
	DeployAllowed                bool                       `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed         bool                       `json:"status_publish_allowed,omitempty"`
	MutationAllowed              bool                       `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed           bool                       `json:"memory_write_allowed,omitempty"`
	MCPExecutionAllowed          bool                       `json:"mcp_execution_allowed,omitempty"`
	ExecutorCallAllowedInsideMCP bool                       `json:"executor_call_allowed_inside_mcp,omitempty"`
	FileWriteAllowed             bool                       `json:"file_write_allowed,omitempty"`
	AttemptExternalCall          bool                       `json:"attempt_external_call,omitempty"`
	AttemptRealRollback          bool                       `json:"attempt_real_rollback,omitempty"`
	AttemptRealLock              bool                       `json:"attempt_real_lock,omitempty"`
	CommandExecution             bool                       `json:"command_execution,omitempty"`
	NetworkCall                  bool                       `json:"network_call,omitempty"`
	FileWrite                    bool                       `json:"file_write,omitempty"`
	WriteHandoffFile             bool                       `json:"write_handoff_file,omitempty"`
	PassGold                     bool                       `json:"pass_gold,omitempty"`
	PassSecure                   bool                       `json:"pass_secure,omitempty"`
	ExecutionAuthorizedInsideMCP bool                       `json:"execution_authorized_inside_mcp,omitempty"`
	HandoffAsPassGold            bool                       `json:"handoff_as_pass_gold,omitempty"`
	PreflightAsPassGold          bool                       `json:"preflight_as_pass_gold,omitempty"`
	AuthorizationAsPassGold      bool                       `json:"authorization_as_pass_gold,omitempty"`
	RehearsalAsPassGold          bool                       `json:"rehearsal_as_pass_gold,omitempty"`
	SafetyAsPassGold             bool                       `json:"safety_as_pass_gold,omitempty"`
	HandoffAsPassSecure          bool                       `json:"handoff_as_pass_secure,omitempty"`
	PreflightAsPassSecure        bool                       `json:"preflight_as_pass_secure,omitempty"`
	AuthorizationAsPassSecure    bool                       `json:"authorization_as_pass_secure,omitempty"`
	RehearsalAsPassSecure        bool                       `json:"rehearsal_as_pass_secure,omitempty"`
	SafetyAsPassSecure           bool                       `json:"safety_as_pass_secure,omitempty"`
	ExternalExecutorHandoffReady bool                       `json:"external_executor_handoff_ready,omitempty"`
	UnsafeClaims                 []string                   `json:"unsafe_claims,omitempty"`
	Conflicts                    []string                   `json:"conflicts,omitempty"`
}

type HandoffPackage struct {
	Version                      string                     `json:"version"`
	DryRun                       bool                       `json:"dry_run"`
	ReadOnly                     bool                       `json:"read_only"`
	HandoffID                    string                     `json:"handoff_id,omitempty"`
	PackageStatus                string                     `json:"package_status"`
	ExternalExecutorHandoffReady bool                       `json:"external_executor_handoff_ready"`
	Executor                     string                     `json:"executor,omitempty"`
	Project                      string                     `json:"project,omitempty"`
	Branch                       string                     `json:"branch,omitempty"`
	CommitSHA                    string                     `json:"commit_sha,omitempty"`
	Target                       string                     `json:"target,omitempty"`
	Environment                  string                     `json:"environment,omitempty"`
	AuthoritySummary             *HandoffSummary            `json:"authority_summary,omitempty"`
	PromotionContractSummary     *HandoffSummary            `json:"promotion_contract_summary,omitempty"`
	SafetyEnvelopeSummary        *HandoffSummary            `json:"safety_envelope_summary,omitempty"`
	RehearsalSummary             *HandoffSummary            `json:"rehearsal_summary,omitempty"`
	AuthorizationManifestSummary *HandoffSummary            `json:"authorization_manifest_summary,omitempty"`
	FinalPreflightResult         *FinalPreflightSummary     `json:"final_preflight_result,omitempty"`
	Gates                        []HandoffGate              `json:"gates,omitempty"`
	Artifacts                    []HandoffArtifact          `json:"artifacts,omitempty"`
	RollbackRequirements         *RollbackRequirements      `json:"rollback_requirements,omitempty"`
	KillSwitchRequirements       *KillSwitchRequirements    `json:"kill_switch_requirements,omitempty"`
	ObservabilityRequirements    *ObservabilityRequirements `json:"observability_requirements,omitempty"`
	Boundary                     *HandoffBoundary           `json:"boundary,omitempty"`
	Checklist                    *HandoffChecklist          `json:"checklist,omitempty"`
	MissingItems                 []string                   `json:"missing_items"`
	MissingGates                 []string                   `json:"missing_gates"`
	UnsafeClaims                 []string                   `json:"unsafe_claims"`
	Conflicts                    []string                   `json:"conflicts"`
	RequiredItems                []string                   `json:"required_items"`
	MCPExecutionAllowed          bool                       `json:"mcp_execution_allowed"`
	PromotionAllowed             bool                       `json:"promotion_allowed"`
	DeployAllowed                bool                       `json:"deploy_allowed"`
	StatusPublishAllowed         bool                       `json:"status_publish_allowed"`
	MutationAllowed              bool                       `json:"mutation_allowed"`
	MemoryWriteAllowed           bool                       `json:"memory_write_allowed"`
	ExecutorCallAllowedInsideMCP bool                       `json:"executor_call_allowed_inside_mcp"`
	FileWriteAllowed             bool                       `json:"file_write_allowed"`
	UsableForPassGold            bool                       `json:"usable_for_pass_gold"`
	UsableForPassSecure          bool                       `json:"usable_for_pass_secure"`
	Recommendations              []string                   `json:"recommendations"`
}

type HandoffSummary struct {
	Present bool   `json:"present"`
	Version string `json:"version,omitempty"`
	Status  string `json:"status,omitempty"`
	Ready   bool   `json:"ready"`
	Valid   bool   `json:"valid"`
	Summary string `json:"summary,omitempty"`
}

type FinalPreflightSummary struct {
	Present                         bool   `json:"present"`
	Version                         string `json:"version,omitempty"`
	Status                          string `json:"status,omitempty"`
	Ready                           bool   `json:"ready"`
	Valid                           bool   `json:"valid"`
	Summary                         string `json:"summary,omitempty"`
	ExternalExecutionPreflightReady bool   `json:"external_execution_preflight_ready"`
}

type HandoffGate struct {
	Gate                  string `json:"gate,omitempty"`
	Status                string `json:"status,omitempty"`
	RealEvidence          bool   `json:"real_evidence,omitempty"`
	DryRun                bool   `json:"dry_run,omitempty"`
	Synthesized           bool   `json:"synthesized,omitempty"`
	Advisory              bool   `json:"advisory,omitempty"`
	RecognizedByAuthority bool   `json:"recognized_by_authority,omitempty"`
	Source                string `json:"source,omitempty"`
	ArtifactID            string `json:"artifact_id,omitempty"`
	Valid                 bool   `json:"valid"`
}

type HandoffArtifact struct {
	ID       string `json:"id,omitempty"`
	Type     string `json:"type,omitempty"`
	Required bool   `json:"required,omitempty"`
	Present  bool   `json:"present,omitempty"`
	Trusted  bool   `json:"trusted,omitempty"`
	Source   string `json:"source,omitempty"`
	Summary  string `json:"summary,omitempty"`
	Valid    bool   `json:"valid"`
}

type RollbackRequirements struct {
	Present                    bool   `json:"present"`
	Mandatory                  bool   `json:"mandatory"`
	Strategy                   string `json:"strategy,omitempty"`
	SnapshotRequired           bool   `json:"snapshot_required"`
	ValidationRequired         bool   `json:"validation_required"`
	ManualInterventionRequired bool   `json:"manual_intervention_required"`
	Valid                      bool   `json:"valid"`
}

type KillSwitchRequirements struct {
	Present        bool   `json:"present"`
	Mandatory      bool   `json:"mandatory"`
	Enabled        bool   `json:"enabled"`
	Trigger        string `json:"trigger,omitempty"`
	ManualOverride bool   `json:"manual_override"`
	Valid          bool   `json:"valid"`
}

type ObservabilityRequirements struct {
	Present            bool `json:"present"`
	HealthChecks       bool `json:"health_checks"`
	Metrics            bool `json:"metrics"`
	Logs               bool `json:"logs"`
	WatchWindowSeconds int  `json:"watch_window_seconds"`
	AlertingDeclared   bool `json:"alerting_declared"`
	Valid              bool `json:"valid"`
}

type HandoffBoundary struct {
	Version                         string   `json:"version,omitempty"`
	DryRun                          bool     `json:"dry_run,omitempty"`
	ReadOnly                        bool     `json:"read_only,omitempty"`
	Present                         bool     `json:"present"`
	MCPScope                        []string `json:"mcp_scope"`
	ExternalExecutorScope           []string `json:"external_executor_scope"`
	ForbiddenInsideMCP              []string `json:"forbidden_inside_mcp"`
	RequiredBeforeExternalExecution []string `json:"required_before_external_execution"`
	AllowedOnlyOutsideMCP           []string `json:"allowed_only_outside_mcp"`
	RequiredHandoffItems            []string `json:"required_handoff_items"`
	NoWriteFile                     bool     `json:"no_write_file"`
	NoNetworkCall                   bool     `json:"no_network_call"`
	NoCommandExecution              bool     `json:"no_command_execution"`
	Valid                           bool     `json:"valid"`
}

type HandoffChecklist struct {
	Present                      bool `json:"present"`
	AuthorityChecked             bool `json:"authority_checked"`
	PromotionContractChecked     bool `json:"promotion_contract_checked"`
	SafetyEnvelopeChecked        bool `json:"safety_envelope_checked"`
	RehearsalChecked             bool `json:"rehearsal_checked"`
	AuthorizationManifestChecked bool `json:"authorization_manifest_checked"`
	FinalPreflightChecked        bool `json:"final_preflight_checked"`
	PassGoldRealChecked          bool `json:"pass_gold_real_checked"`
	PassSecureRealChecked        bool `json:"pass_secure_real_checked"`
	RollbackChecked              bool `json:"rollback_checked"`
	KillSwitchChecked            bool `json:"kill_switch_checked"`
	ObservabilityChecked         bool `json:"observability_checked"`
	MCPBoundaryChecked           bool `json:"mcp_boundary_checked"`
	NoMutationChecked            bool `json:"no_mutation_checked"`
	Valid                        bool `json:"valid"`
}

type HandoffValidation struct {
	Version                      string   `json:"version"`
	DryRun                       bool     `json:"dry_run"`
	ReadOnly                     bool     `json:"read_only"`
	Valid                        bool     `json:"valid"`
	Blocked                      bool     `json:"blocked"`
	PackageStatus                string   `json:"package_status"`
	ExternalExecutorHandoffReady bool     `json:"external_executor_handoff_ready"`
	MissingItems                 []string `json:"missing_items"`
	MissingGates                 []string `json:"missing_gates"`
	UnsafeClaims                 []string `json:"unsafe_claims"`
	Conflicts                    []string `json:"conflicts"`
	RequiredItems                []string `json:"required_items"`
	MCPExecutionAllowed          bool     `json:"mcp_execution_allowed"`
	PromotionAllowed             bool     `json:"promotion_allowed"`
	DeployAllowed                bool     `json:"deploy_allowed"`
	StatusPublishAllowed         bool     `json:"status_publish_allowed"`
	MutationAllowed              bool     `json:"mutation_allowed"`
	MemoryWriteAllowed           bool     `json:"memory_write_allowed"`
	ExecutorCallAllowedInsideMCP bool     `json:"executor_call_allowed_inside_mcp"`
	FileWriteAllowed             bool     `json:"file_write_allowed"`
	UsableForPassGold            bool     `json:"usable_for_pass_gold"`
	UsableForPassSecure          bool     `json:"usable_for_pass_secure"`
	Recommendations              []string `json:"recommendations"`
}

type HandoffAudit struct {
	Version                     string   `json:"version"`
	DryRun                      bool     `json:"dry_run"`
	ReadOnly                    bool     `json:"read_only"`
	ConflictsFound              bool     `json:"conflicts_found"`
	Conflicts                   []string `json:"conflicts"`
	UnsafeClaimsFound           bool     `json:"unsafe_claims_found"`
	UnsafeClaims                []string `json:"unsafe_claims"`
	MissingItemsFound           bool     `json:"missing_items_found"`
	MissingItems                []string `json:"missing_items"`
	ExecutionAttemptFound       bool     `json:"execution_attempt_found"`
	MutationAttemptFound        bool     `json:"mutation_attempt_found"`
	FileWriteAttemptFound       bool     `json:"file_write_attempt_found"`
	MCPExecutorCallAttemptFound bool     `json:"mcp_executor_call_attempt_found"`
	DryRunGateClaimFound        bool     `json:"dry_run_gate_claim_found"`
	SynthesizedGateClaimFound   bool     `json:"synthesized_gate_claim_found"`
	Recommendations             []string `json:"recommendations"`
}

type HandoffExplain struct {
	Version                  string   `json:"version"`
	DryRun                   bool     `json:"dry_run"`
	ReadOnly                 bool     `json:"read_only"`
	Summary                  string   `json:"summary"`
	HandoffModel             []string `json:"handoff_model"`
	RequiredItems            []string `json:"required_items"`
	WhyMCPCannotExecute      []string `json:"why_mcp_cannot_execute"`
	WhyHandoffIsNotPassGold  []string `json:"why_handoff_is_not_pass_gold"`
	WhyHandoffIsNotExecution []string `json:"why_handoff_is_not_execution"`
	WhyHandoffIsNotAFile     []string `json:"why_handoff_is_not_a_file"`
	BlockedActions           []string `json:"blocked_actions"`
	SafestNextSteps          []string `json:"safest_next_steps"`
	RequiredGates            []string `json:"required_gates"`
}

func BuildHandoffPackage(input HandoffInput) HandoffPackage {
	in := NormalizeHandoff(input)
	missing, missingGates, unsafe, conflicts := evaluate(in)
	status := deriveStatus(missing, missingGates, unsafe)
	if len(conflicts) > 0 && status == StatusReadyDryRun {
		status = StatusBlocked
	}
	ready := status == StatusReadyDryRun && len(conflicts) == 0 && !isMCPExecutor(in.Executor)
	return HandoffPackage{
		Version: Version, DryRun: true, ReadOnly: true, HandoffID: in.HandoffID, PackageStatus: status,
		ExternalExecutorHandoffReady: ready, Executor: in.Executor, Project: in.Project, Branch: in.Branch,
		CommitSHA: in.CommitSHA, Target: in.Target, Environment: in.Environment,
		AuthoritySummary: normalizeSummary(in.AuthoritySummary), PromotionContractSummary: normalizeSummary(in.PromotionContractSummary),
		SafetyEnvelopeSummary: normalizeSummary(in.SafetyEnvelopeSummary), RehearsalSummary: normalizeSummary(in.RehearsalSummary),
		AuthorizationManifestSummary: normalizeSummary(in.AuthorizationManifestSummary), FinalPreflightResult: normalizeFinalPreflight(in.FinalPreflightResult),
		Gates: normalizeGates(in.Gates), Artifacts: normalizeArtifacts(in.Artifacts), RollbackRequirements: normalizeRollback(in.RollbackRequirements),
		KillSwitchRequirements: normalizeKillSwitch(in.KillSwitchRequirements), ObservabilityRequirements: normalizeObservability(in.ObservabilityRequirements),
		Boundary: normalizeBoundary(in.Boundary), Checklist: normalizeChecklist(in.Checklist), MissingItems: missing, MissingGates: missingGates,
		UnsafeClaims: unsafe, Conflicts: conflicts, RequiredItems: append([]string{}, requiredItems...), MCPExecutionAllowed: false,
		PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false,
		ExecutorCallAllowedInsideMCP: false, FileWriteAllowed: false, UsableForPassGold: false, UsableForPassSecure: false,
		Recommendations: recommendations(status),
	}
}

func ValidateHandoff(input HandoffInput) HandoffValidation {
	in := NormalizeHandoff(input)
	missing, missingGates, unsafe, conflicts := evaluate(in)
	status := deriveStatus(missing, missingGates, unsafe)
	if len(conflicts) > 0 && status == StatusReadyDryRun {
		status = StatusBlocked
	}
	valid := status == StatusReadyDryRun && len(conflicts) == 0 && !isMCPExecutor(in.Executor)
	return HandoffValidation{Version: Version, DryRun: true, ReadOnly: true, Valid: valid, Blocked: !valid, PackageStatus: status,
		ExternalExecutorHandoffReady: valid, MissingItems: missing, MissingGates: missingGates, UnsafeClaims: unsafe, Conflicts: conflicts,
		RequiredItems: append([]string{}, requiredItems...), MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false,
		StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, ExecutorCallAllowedInsideMCP: false,
		FileWriteAllowed: false, UsableForPassGold: false, UsableForPassSecure: false, Recommendations: recommendations(status)}
}

func BuildHandoffBoundary() HandoffBoundary {
	return HandoffBoundary{Version: Version, DryRun: true, ReadOnly: true, Present: true,
		MCPScope:                        []string{"read", "validate", "audit", "explain", "simulate handoff package"},
		ExternalExecutorScope:           []string{"consume handoff outside MCP", "perform execution only outside MCP after real Authority/Contract/Safety/Rehearsal/Authz/Preflight validation", "own rollback, observability, and kill switch controls outside MCP"},
		ForbiddenInsideMCP:              []string{"write_handoff_file", "execute", "call_external_executor", "authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "PR", "mutate", "write_memory", "memory_write", "acquire_real_lock", "perform_rollback"},
		RequiredBeforeExternalExecution: []string{"valid Authority Summary V9.0", "valid Promotion Contract Summary V9.1", "valid Safety Envelope Summary V9.2", "valid Rehearsal Summary V9.3", "valid Authorization Manifest Summary V9.4", "valid Final Preflight Result V9.5", "PASS_GOLD_REAL", "PASS_SECURE_REAL"},
		AllowedOnlyOutsideMCP:           []string{"call_external_executor", "execute", "promote", "deploy", "publish_status", "push", "open_PR", "acquire_real_lock", "perform_rollback", "write_handoff_file_if_future_export_exists"},
		RequiredHandoffItems:            append([]string{}, requiredItems...), NoWriteFile: true, NoNetworkCall: true, NoCommandExecution: true, Valid: true}
}

func AuditHandoff(input HandoffInput) HandoffAudit {
	in := NormalizeHandoff(input)
	missing, _, unsafe, conflicts := evaluate(in)
	dry, synth := false, false
	for _, g := range in.Gates {
		if g.DryRun || g.Advisory || advisorySources[strings.ToLower(strings.TrimSpace(g.Source))] {
			dry = true
		}
		if g.Synthesized {
			synth = true
		}
	}
	return HandoffAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(conflicts) > 0, Conflicts: conflicts,
		UnsafeClaimsFound: len(unsafe) > 0, UnsafeClaims: unsafe, MissingItemsFound: len(missing) > 0, MissingItems: missing,
		ExecutionAttemptFound: hasExecutionAttempt(in), MutationAttemptFound: hasMutationAttempt(in),
		FileWriteAttemptFound:       in.FileWriteAllowed || in.FileWrite || in.WriteHandoffFile,
		MCPExecutorCallAttemptFound: in.ExecutorCallAllowedInsideMCP || in.AttemptExternalCall || isMCPExecutor(in.Executor),
		DryRunGateClaimFound:        dry, SynthesizedGateClaimFound: synth, Recommendations: recommendations(deriveStatus(missing, nil, unsafe))}
}

func ExplainHandoff(input HandoffInput) HandoffExplain {
	return HandoffExplain{Version: Version, DryRun: true, ReadOnly: true,
		Summary:                  "V9.6 builds an in-memory, read-only, dry-run handoff package for a future external executor; it does not execute or write anything.",
		HandoffModel:             []string{"consolidate V9.0 Authority Summary", "consolidate V9.1 Promotion Contract Summary", "consolidate V9.2 Safety Envelope Summary", "consolidate V9.3 Rehearsal Summary", "consolidate V9.4 Authorization Manifest Summary", "consolidate V9.5 Final Preflight Result", "validate required artifacts, rollback, kill switch, observability, boundary, and checklist"},
		RequiredItems:            append([]string{}, requiredItems...),
		WhyMCPCannotExecute:      []string{"MCP is a read-only control plane", "external executor calls, command execution, network calls, file writes, deployment, promotion, rollback, and status publishing are forbidden inside MCP", "SEM PASS GOLD / PASS SECURE means no mutation is authorized"},
		WhyHandoffIsNotPassGold:  []string{"The handoff package only references real PASS_GOLD evidence; it cannot create, replace, synthesize, or declare PASS GOLD", "usable_for_pass_gold is always false"},
		WhyHandoffIsNotExecution: []string{"The package is advisory and dry-run only", "executor_call_allowed_inside_mcp, promotion_allowed, deploy_allowed, and mutation_allowed are always false"},
		WhyHandoffIsNotAFile:     []string{"V9.6 is an in-memory logical payload", "file_write_allowed is always false", "write_handoff_file is forbidden in this version"},
		BlockedActions:           BuildHandoffBoundary().ForbiddenInsideMCP,
		SafestNextSteps:          []string{"collect real PASS_GOLD_REAL and PASS_SECURE_REAL evidence", "validate V9.0-V9.5 summaries", "keep all execution outside MCP", "do not write or export a handoff file in V9.6"},
		RequiredGates:            append([]string{}, requiredGates...)}
}

func NormalizeHandoff(input HandoffInput) HandoffInput {
	if input.Handoff != nil {
		nested := *input.Handoff
		if input.Root != "" {
			nested.Root = input.Root
		}
		return nested
	}
	return input
}

func EvaluateHandoffEligibility(input HandoffInput) (bool, []string) {
	v := ValidateHandoff(input)
	if v.Valid {
		return true, nil
	}
	reasons := append([]string{}, v.MissingItems...)
	reasons = append(reasons, v.MissingGates...)
	reasons = append(reasons, v.UnsafeClaims...)
	reasons = append(reasons, v.Conflicts...)
	return false, dedupe(reasons)
}

func evaluate(in HandoffInput) ([]string, []string, []string, []string) {
	missing, missingGates, unsafe, conflicts := []string{}, []string{}, []string{}, []string{}
	if strings.TrimSpace(in.HandoffID) == "" {
		missing = append(missing, "handoff_id")
	}
	if strings.TrimSpace(in.Executor) == "" {
		missing = append(missing, "executor")
	} else if isMCPExecutor(in.Executor) {
		unsafe = append(unsafe, "executor cannot be mcp or mcp_readonly")
	}
	if strings.TrimSpace(in.Project) == "" {
		missing = append(missing, "project")
	}
	if strings.TrimSpace(in.Branch) == "" {
		missing = append(missing, "branch")
	}
	if strings.TrimSpace(in.CommitSHA) == "" {
		missing = append(missing, "commit_sha")
	}
	if strings.TrimSpace(in.Target) == "" {
		missing = append(missing, "target")
	}
	if strings.TrimSpace(in.Environment) == "" {
		missing = append(missing, "environment")
	}
	if !summaryValid(in.AuthoritySummary) {
		missing = append(missing, "authority_summary")
	}
	if !summaryValid(in.PromotionContractSummary) {
		missing = append(missing, "promotion_contract_summary")
	}
	if !summaryValid(in.SafetyEnvelopeSummary) {
		missing = append(missing, "safety_envelope_summary")
	}
	if !summaryValid(in.RehearsalSummary) {
		missing = append(missing, "rehearsal_summary")
	}
	if !summaryValid(in.AuthorizationManifestSummary) {
		missing = append(missing, "authorization_manifest_summary")
	}
	if !finalPreflightValid(in.FinalPreflightResult) {
		missing = append(missing, "final_preflight_result")
	}
	if in.FinalPreflightResult != nil && !in.FinalPreflightResult.ExternalExecutionPreflightReady {
		missing = append(missing, "external_execution_preflight_ready")
	}
	gold, secure := false, false
	for _, g := range in.Gates {
		name := strings.ToUpper(strings.TrimSpace(g.Gate))
		if name == "PASS_GOLD_REAL" {
			name = "PASS_GOLD"
		}
		if name == "PASS_SECURE_REAL" {
			name = "PASS_SECURE"
		}
		if g.DryRun {
			unsafe = append(unsafe, "dry-run gate cannot be used as real evidence: "+name)
		}
		if g.Synthesized {
			unsafe = append(unsafe, "synthesized gate cannot be used as real evidence: "+name)
		}
		if g.Advisory || advisorySources[strings.ToLower(strings.TrimSpace(g.Source))] {
			unsafe = append(unsafe, "advisory gate cannot be used as real evidence: "+name)
		}
		if g.RealEvidence && !g.DryRun && !g.Synthesized && !g.Advisory && g.RecognizedByAuthority && strings.EqualFold(g.Status, "pass") {
			if name == "PASS_GOLD" {
				gold = true
			}
			if name == "PASS_SECURE" {
				secure = true
			}
		}
	}
	if !gold {
		missingGates = append(missingGates, "PASS_GOLD_REAL")
	}
	if !secure {
		missingGates = append(missingGates, "PASS_SECURE_REAL")
	}
	if !artifactsValid(in.Artifacts) {
		missing = append(missing, "required_artifacts")
	}
	if !rollbackValid(in.RollbackRequirements) {
		missing = append(missing, "rollback_requirements")
	}
	if !killSwitchValid(in.KillSwitchRequirements) {
		missing = append(missing, "kill_switch_requirements")
	}
	if !observabilityValid(in.ObservabilityRequirements) {
		missing = append(missing, "observability_requirements")
	}
	if !boundaryValid(in.Boundary) {
		missing = append(missing, "handoff_boundary")
	}
	if !checklistValid(in.Checklist) {
		missing = append(missing, "checklist")
	}
	if hasExecutionAttempt(in) {
		unsafe = append(unsafe, "payload attempts execution inside MCP")
	}
	if hasMutationAttempt(in) {
		unsafe = append(unsafe, "payload attempts mutation inside MCP")
	}
	if in.ExecutorCallAllowedInsideMCP {
		unsafe = append(unsafe, "executor_call_allowed_inside_mcp cannot be true")
	}
	if in.FileWriteAllowed {
		unsafe = append(unsafe, "file_write_allowed cannot be true")
	}
	if in.WriteHandoffFile {
		unsafe = append(unsafe, "write_handoff_file cannot be true")
	}
	if in.AttemptExternalCall {
		unsafe = append(unsafe, "attempt_external_call cannot be true")
	}
	if in.AttemptRealRollback {
		unsafe = append(unsafe, "attempt_real_rollback cannot be true")
	}
	if in.AttemptRealLock {
		unsafe = append(unsafe, "attempt_real_lock cannot be true")
	}
	if in.CommandExecution {
		unsafe = append(unsafe, "command_execution cannot be true")
	}
	if in.NetworkCall {
		unsafe = append(unsafe, "network_call cannot be true")
	}
	if in.FileWrite {
		unsafe = append(unsafe, "file_write cannot be true")
	}
	if in.PassGold {
		unsafe = append(unsafe, "handoff package cannot declare pass_gold=true")
	}
	if in.PassSecure {
		unsafe = append(unsafe, "handoff package cannot declare pass_secure=true")
	}
	if in.ExecutionAuthorizedInsideMCP {
		unsafe = append(unsafe, "handoff package cannot authorize execution inside MCP")
	}
	if in.HandoffAsPassGold || in.PreflightAsPassGold || in.AuthorizationAsPassGold || in.RehearsalAsPassGold || in.SafetyAsPassGold || in.HandoffAsPassSecure || in.PreflightAsPassSecure || in.AuthorizationAsPassSecure || in.RehearsalAsPassSecure || in.SafetyAsPassSecure {
		unsafe = append(unsafe, "handoff/preflight/authz/rehearsal/safety cannot be used as PASS GOLD or PASS SECURE real")
	}
	unsafe = append(unsafe, in.UnsafeClaims...)
	conflicts = append(conflicts, in.Conflicts...)
	wouldReady := len(missing) == 0 && len(missingGates) == 0 && len(unsafe) == 0 && len(conflicts) == 0 && !isMCPExecutor(in.Executor)
	if in.ExternalExecutorHandoffReady && !wouldReady {
		conflicts = append(conflicts, "external_executor_handoff_ready=true while required items or real gates are missing")
	}
	return dedupe(missing), dedupe(missingGates), dedupe(unsafe), dedupe(conflicts)
}

func deriveStatus(missing, missingGates, unsafe []string) string {
	for _, u := range unsafe {
		l := strings.ToLower(u)
		if strings.Contains(l, "execution") || strings.Contains(l, "promot") || strings.Contains(l, "deploy") || strings.Contains(l, "rollback") || strings.Contains(l, "lock") || strings.Contains(l, "command") || strings.Contains(l, "network") || strings.Contains(l, "file_write") || strings.Contains(l, "write_handoff_file") || strings.Contains(l, "external_call") {
			return StatusUnsafeExecutionAttempt
		}
	}
	if len(unsafe) > 0 {
		return StatusBlocked
	}
	if len(missing) > 0 {
		return StatusIncomplete
	}
	if len(missingGates) > 0 {
		return StatusMissingRealGates
	}
	return StatusReadyDryRun
}

func hasExecutionAttempt(in HandoffInput) bool {
	return in.MCPExecutionAllowed || in.PromotionAllowed || in.DeployAllowed || in.StatusPublishAllowed || in.ExecutorCallAllowedInsideMCP || in.AttemptExternalCall || in.CommandExecution || in.NetworkCall || in.ExecutionAuthorizedInsideMCP
}
func hasMutationAttempt(in HandoffInput) bool {
	return in.MutationAllowed || in.MemoryWriteAllowed || in.FileWriteAllowed || in.FileWrite || in.WriteHandoffFile || in.PromotionAllowed || in.DeployAllowed || in.StatusPublishAllowed || in.AttemptRealRollback || in.AttemptRealLock
}
func isMCPExecutor(executor string) bool {
	e := strings.ToLower(strings.TrimSpace(executor))
	return e == "mcp" || e == "mcp_readonly"
}
func summaryValid(s *HandoffSummary) bool { return s != nil && s.Present && s.Ready && s.Valid }
func finalPreflightValid(s *FinalPreflightSummary) bool {
	return s != nil && s.Present && s.Ready && s.Valid && s.ExternalExecutionPreflightReady
}
func artifactsValid(a []HandoffArtifact) bool {
	if len(a) == 0 {
		return false
	}
	req := false
	for _, x := range a {
		if x.Required {
			req = true
			if !x.Present || !x.Trusted {
				return false
			}
		}
	}
	return req
}
func rollbackValid(r *RollbackRequirements) bool {
	return r != nil && r.Present && r.Mandatory && r.Strategy != "" && r.SnapshotRequired && r.ValidationRequired
}
func killSwitchValid(k *KillSwitchRequirements) bool {
	return k != nil && k.Present && k.Mandatory && k.Enabled && k.Trigger != "" && k.ManualOverride
}
func observabilityValid(o *ObservabilityRequirements) bool {
	return o != nil && o.Present && o.HealthChecks && o.Metrics && o.Logs && o.WatchWindowSeconds > 0 && o.AlertingDeclared
}
func boundaryValid(b *HandoffBoundary) bool {
	return b != nil && b.Present && b.NoWriteFile && b.NoNetworkCall && b.NoCommandExecution
}
func checklistValid(c *HandoffChecklist) bool {
	return c != nil && c.Present && c.AuthorityChecked && c.PromotionContractChecked && c.SafetyEnvelopeChecked && c.RehearsalChecked && c.AuthorizationManifestChecked && c.FinalPreflightChecked && c.PassGoldRealChecked && c.PassSecureRealChecked && c.RollbackChecked && c.KillSwitchChecked && c.ObservabilityChecked && c.MCPBoundaryChecked && c.NoMutationChecked
}
func normalizeSummary(s *HandoffSummary) *HandoffSummary {
	if s == nil {
		return nil
	}
	v := *s
	v.Valid = summaryValid(s)
	return &v
}
func normalizeFinalPreflight(s *FinalPreflightSummary) *FinalPreflightSummary {
	if s == nil {
		return nil
	}
	v := *s
	v.Valid = finalPreflightValid(s)
	return &v
}
func normalizeGates(in []HandoffGate) []HandoffGate {
	out := append([]HandoffGate{}, in...)
	for i := range out {
		out[i].Valid = out[i].RealEvidence && !out[i].DryRun && !out[i].Synthesized && !out[i].Advisory && out[i].RecognizedByAuthority && strings.EqualFold(out[i].Status, "pass")
	}
	return out
}
func normalizeArtifacts(in []HandoffArtifact) []HandoffArtifact {
	out := append([]HandoffArtifact{}, in...)
	for i := range out {
		out[i].Valid = !out[i].Required || (out[i].Present && out[i].Trusted)
	}
	return out
}
func normalizeRollback(r *RollbackRequirements) *RollbackRequirements {
	if r == nil {
		return nil
	}
	v := *r
	v.Valid = rollbackValid(r)
	return &v
}
func normalizeKillSwitch(k *KillSwitchRequirements) *KillSwitchRequirements {
	if k == nil {
		return nil
	}
	v := *k
	v.Valid = killSwitchValid(k)
	return &v
}
func normalizeObservability(o *ObservabilityRequirements) *ObservabilityRequirements {
	if o == nil {
		return nil
	}
	v := *o
	v.Valid = observabilityValid(o)
	return &v
}
func normalizeBoundary(b *HandoffBoundary) *HandoffBoundary {
	if b == nil {
		return nil
	}
	v := *b
	v.Valid = boundaryValid(b)
	return &v
}
func normalizeChecklist(c *HandoffChecklist) *HandoffChecklist {
	if c == nil {
		return nil
	}
	v := *c
	v.Valid = checklistValid(c)
	return &v
}
func recommendations(status string) []string {
	if status == StatusReadyDryRun {
		return []string{"handoff is advisory-ready for a future external executor outside MCP; do not execute inside MCP"}
	}
	return []string{"complete missing items", "provide real PASS_GOLD_REAL and PASS_SECURE_REAL evidence", "remove unsafe execution or mutation claims", "keep handoff in memory and dry-run only"}
}
func dedupe(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, x := range in {
		if strings.TrimSpace(x) == "" || seen[x] {
			continue
		}
		seen[x] = true
		out = append(out, x)
	}
	return out
}
