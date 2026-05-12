// Package authorizationmanifest implements the V9.4 External Executor Authorization Manifest.
//
// The manifest is intentionally read-only and dry-run. It defines, validates,
// audits, and explains explicit authorization boundaries for a future external
// executor, but it never promotes, deploys, publishes status, writes files,
// writes memory, calls networks/APIs, executes commands, acquires real locks,
// performs rollback, writes a manifest file, or invokes an external executor.
package authorizationmanifest

import (
	"strings"
	"time"
)

const Version = "V9.4"

var requiredItems = []string{
	"authorization_id",
	"authorized_by",
	"authorization_source",
	"executor",
	"project",
	"branch",
	"commit_sha",
	"target",
	"environment",
	"explicit_authorization",
	"scope",
	"validity",
	"limits",
	"PASS_GOLD_REAL",
	"PASS_SECURE_REAL",
	"required_artifacts",
	"safety_envelope_reference",
	"promotion_contract_reference",
	"rehearsal_reference",
	"rollback_authorization",
	"kill_switch_authorization",
	"audit",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var advisorySources = map[string]bool{
	"mcp": true, "mcp_readonly": true, "dashboard": true, "readiness": true,
	"evidenceledger": true, "contractregistry": true, "policymatrix": true,
	"codeburn": true, "impeccable": true, "dryrun": true, "graphmemory": true,
	"unknown": true, "advisory": true,
}

type AuthorizationInput struct {
	Root                         string                     `json:"root,omitempty"`
	MissionInput                 string                     `json:"mission_input,omitempty"`
	Operation                    string                     `json:"operation,omitempty"`
	Manifest                     *AuthorizationInput        `json:"manifest,omitempty"`
	AuthorizationID              string                     `json:"authorization_id,omitempty"`
	AuthorizedBy                 string                     `json:"authorized_by,omitempty"`
	AuthorizationSource          string                     `json:"authorization_source,omitempty"`
	Executor                     string                     `json:"executor,omitempty"`
	Project                      string                     `json:"project,omitempty"`
	Branch                       string                     `json:"branch,omitempty"`
	CommitSHA                    string                     `json:"commit_sha,omitempty"`
	Target                       string                     `json:"target,omitempty"`
	Environment                  string                     `json:"environment,omitempty"`
	Scope                        AuthorizationScope         `json:"scope,omitempty"`
	Validity                     AuthorizationValidity      `json:"validity,omitempty"`
	Limits                       AuthorizationLimits        `json:"limits,omitempty"`
	Gates                        []AuthorizationGate        `json:"gates,omitempty"`
	RequiredArtifacts            []RequiredArtifact         `json:"required_artifacts,omitempty"`
	SafetyEnvelope               SafetyEnvelopeReference    `json:"safety_envelope,omitempty"`
	PromotionContract            PromotionContractReference `json:"promotion_contract,omitempty"`
	Rehearsal                    RehearsalReference         `json:"rehearsal,omitempty"`
	Rollback                     RollbackAuthorization      `json:"rollback,omitempty"`
	KillSwitch                   KillSwitchAuthorization    `json:"kill_switch,omitempty"`
	Audit                        AuthorizationAudit         `json:"audit,omitempty"`
	ExplicitAuthorization        bool                       `json:"explicit_authorization,omitempty"`
	Strict                       bool                       `json:"strict,omitempty"`
	PromotionAllowed             bool                       `json:"promotion_allowed,omitempty"`
	DeployAllowed                bool                       `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed         bool                       `json:"status_publish_allowed,omitempty"`
	MutationAllowed              bool                       `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed           bool                       `json:"memory_write_allowed,omitempty"`
	AttemptExternalCall          bool                       `json:"attempt_external_call,omitempty"`
	AttemptRealRollback          bool                       `json:"attempt_real_rollback,omitempty"`
	AttemptRealLock              bool                       `json:"attempt_real_lock,omitempty"`
	CommandExecution             bool                       `json:"command_execution,omitempty"`
	NetworkCall                  bool                       `json:"network_call,omitempty"`
	FileWrite                    bool                       `json:"file_write,omitempty"`
	PassGold                     bool                       `json:"pass_gold,omitempty"`
	PassSecure                   bool                       `json:"pass_secure,omitempty"`
	ExecutionAuthorizedInsideMCP bool                       `json:"execution_authorized_inside_mcp,omitempty"`
	RehearsalAsPassGold          bool                       `json:"rehearsal_as_pass_gold,omitempty"`
	RehearsalAsPassSecure        bool                       `json:"rehearsal_as_pass_secure,omitempty"`
	WouldAuthorizeClaim          bool                       `json:"would_authorize_external_executor,omitempty"`
}

type AuthorizationScope struct {
	Present             bool     `json:"present,omitempty"`
	AllowedOperations   []string `json:"allowed_operations,omitempty"`
	ForbiddenOperations []string `json:"forbidden_operations,omitempty"`
	AllowedTargets      []string `json:"allowed_targets,omitempty"`
	AllowedEnvironments []string `json:"allowed_environments,omitempty"`
	AllowedBranch       string   `json:"allowed_branch,omitempty"`
	AllowedCommitSHA    string   `json:"allowed_commit_sha,omitempty"`
	MaxFilesChanged     int      `json:"max_files_changed,omitempty"`
	MaxActions          int      `json:"max_actions,omitempty"`
	Valid               bool     `json:"valid"`
}

type AuthorizationValidity struct {
	Present      bool   `json:"present,omitempty"`
	IssuedAt     string `json:"issued_at,omitempty"`
	ExpiresAt    string `json:"expires_at,omitempty"`
	NotBefore    string `json:"not_before,omitempty"`
	Timezone     string `json:"timezone,omitempty"`
	Expired      bool   `json:"expired,omitempty"`
	WithinWindow bool   `json:"within_window,omitempty"`
	Valid        bool   `json:"valid"`
}

type AuthorizationLimits struct {
	Present                    bool `json:"present,omitempty"`
	MaxDurationSeconds         int  `json:"max_duration_seconds,omitempty"`
	MaxRetries                 int  `json:"max_retries,omitempty"`
	RequireManualHold          bool `json:"require_manual_hold,omitempty"`
	RequireSingleExecutor      bool `json:"require_single_executor,omitempty"`
	RequireIdempotency         bool `json:"require_idempotency,omitempty"`
	RequireLockLease           bool `json:"require_lock_lease,omitempty"`
	RequireNoParallelExecution bool `json:"require_no_parallel_execution,omitempty"`
	Valid                      bool `json:"valid"`
}

type AuthorizationGate struct {
	Gate                  string `json:"gate,omitempty"`
	Status                string `json:"status,omitempty"`
	Source                string `json:"source,omitempty"`
	ArtifactID            string `json:"artifact_id,omitempty"`
	ArtifactType          string `json:"artifact_type,omitempty"`
	RealEvidence          bool   `json:"real_evidence,omitempty"`
	DryRun                bool   `json:"dry_run,omitempty"`
	Synthesized           bool   `json:"synthesized,omitempty"`
	Advisory              bool   `json:"advisory,omitempty"`
	RecognizedByAuthority bool   `json:"recognized_by_authority,omitempty"`
	Valid                 bool   `json:"valid"`
}

type RequiredArtifact struct {
	ID       string `json:"id,omitempty"`
	Type     string `json:"type,omitempty"`
	Source   string `json:"source,omitempty"`
	Required bool   `json:"required,omitempty"`
	Present  bool   `json:"present,omitempty"`
	Trusted  bool   `json:"trusted,omitempty"`
	Summary  string `json:"summary,omitempty"`
}

type SafetyEnvelopeReference struct {
	Present                    bool   `json:"present,omitempty"`
	EnvelopeID                 string `json:"envelope_id,omitempty"`
	Version                    string `json:"version,omitempty"`
	SafetyReadyDryRun          bool   `json:"safety_ready_dry_run,omitempty"`
	WouldAllowExternalExecutor bool   `json:"would_allow_external_executor,omitempty"`
	Referenced                 bool   `json:"referenced,omitempty"`
	Valid                      bool   `json:"valid"`
}

type PromotionContractReference struct {
	Present                    bool   `json:"present,omitempty"`
	ContractID                 string `json:"contract_id,omitempty"`
	Version                    string `json:"version,omitempty"`
	ExternallyEligibleDryRun   bool   `json:"externally_eligible_dry_run,omitempty"`
	WouldAllowExternalExecutor bool   `json:"would_allow_external_executor,omitempty"`
	Referenced                 bool   `json:"referenced,omitempty"`
	Valid                      bool   `json:"valid"`
}

type RehearsalReference struct {
	Present              bool   `json:"present,omitempty"`
	RehearsalID          string `json:"rehearsal_id,omitempty"`
	Version              string `json:"version,omitempty"`
	RehearsalReadyDryRun bool   `json:"rehearsal_ready_dry_run,omitempty"`
	NoMutationProof      bool   `json:"no_mutation_proof,omitempty"`
	Referenced           bool   `json:"referenced,omitempty"`
	Valid                bool   `json:"valid"`
}

type RollbackAuthorization struct {
	Present                    bool   `json:"present,omitempty"`
	Mandatory                  bool   `json:"mandatory,omitempty"`
	Strategy                   string `json:"strategy,omitempty"`
	SnapshotRequired           bool   `json:"snapshot_required,omitempty"`
	ValidationRequired         bool   `json:"validation_required,omitempty"`
	ManualInterventionRequired bool   `json:"manual_intervention_required,omitempty"`
	Valid                      bool   `json:"valid"`
}

type KillSwitchAuthorization struct {
	Present        bool   `json:"present,omitempty"`
	Mandatory      bool   `json:"mandatory,omitempty"`
	Enabled        bool   `json:"enabled,omitempty"`
	Trigger        string `json:"trigger,omitempty"`
	ManualOverride bool   `json:"manual_override,omitempty"`
	Valid          bool   `json:"valid"`
}

type AuthorizationAudit struct {
	Present                 bool   `json:"present,omitempty"`
	AuditID                 string `json:"audit_id,omitempty"`
	RecordsAuthorizer       bool   `json:"records_authorizer,omitempty"`
	RecordsScope            bool   `json:"records_scope,omitempty"`
	RecordsGates            bool   `json:"records_gates,omitempty"`
	RecordsArtifacts        bool   `json:"records_artifacts,omitempty"`
	RecordsDecisions        bool   `json:"records_decisions,omitempty"`
	RecordsExpiration       bool   `json:"records_expiration,omitempty"`
	ImmutableTargetDeclared bool   `json:"immutable_target_declared,omitempty"`
	Valid                   bool   `json:"valid"`
}

type AuthorizationManifest struct {
	Version                        string                     `json:"version"`
	DryRun                         bool                       `json:"dry_run"`
	ReadOnly                       bool                       `json:"read_only"`
	AuthorizationID                string                     `json:"authorization_id,omitempty"`
	AuthorizedBy                   string                     `json:"authorized_by,omitempty"`
	AuthorizationSource            string                     `json:"authorization_source,omitempty"`
	Executor                       string                     `json:"executor,omitempty"`
	Project                        string                     `json:"project,omitempty"`
	Branch                         string                     `json:"branch,omitempty"`
	CommitSHA                      string                     `json:"commit_sha,omitempty"`
	Target                         string                     `json:"target,omitempty"`
	Environment                    string                     `json:"environment,omitempty"`
	Scope                          AuthorizationScope         `json:"scope"`
	Validity                       AuthorizationValidity      `json:"validity"`
	Limits                         AuthorizationLimits        `json:"limits"`
	Gates                          []AuthorizationGate        `json:"gates,omitempty"`
	RequiredArtifacts              []RequiredArtifact         `json:"required_artifacts,omitempty"`
	SafetyEnvelope                 SafetyEnvelopeReference    `json:"safety_envelope"`
	PromotionContract              PromotionContractReference `json:"promotion_contract"`
	Rehearsal                      RehearsalReference         `json:"rehearsal"`
	Rollback                       RollbackAuthorization      `json:"rollback"`
	KillSwitch                     KillSwitchAuthorization    `json:"kill_switch"`
	Audit                          AuthorizationAudit         `json:"audit"`
	ManifestStatus                 string                     `json:"manifest_status"`
	MissingItems                   []string                   `json:"missing_items"`
	UnsafeClaims                   []string                   `json:"unsafe_claims"`
	RequiredItems                  []string                   `json:"required_items"`
	WouldAuthorizeExternalExecutor bool                       `json:"would_authorize_external_executor"`
	MCPExecutionAllowed            bool                       `json:"mcp_execution_allowed"`
	PromotionAllowed               bool                       `json:"promotion_allowed"`
	DeployAllowed                  bool                       `json:"deploy_allowed"`
	StatusPublishAllowed           bool                       `json:"status_publish_allowed"`
	MutationAllowed                bool                       `json:"mutation_allowed"`
	MemoryWriteAllowed             bool                       `json:"memory_write_allowed"`
	UsableForPassGold              bool                       `json:"usable_for_pass_gold"`
	UsableForPassSecure            bool                       `json:"usable_for_pass_secure"`
	Recommendations                []string                   `json:"recommendations"`
}

type AuthorizationValidation struct {
	Version                        string   `json:"version"`
	DryRun                         bool     `json:"dry_run"`
	ReadOnly                       bool     `json:"read_only"`
	Valid                          bool     `json:"valid"`
	Blocked                        bool     `json:"blocked"`
	ManifestStatus                 string   `json:"manifest_status"`
	MissingItems                   []string `json:"missing_items"`
	UnsafeClaims                   []string `json:"unsafe_claims"`
	RequiredItems                  []string `json:"required_items"`
	WouldAuthorizeExternalExecutor bool     `json:"would_authorize_external_executor"`
	MCPExecutionAllowed            bool     `json:"mcp_execution_allowed"`
	PromotionAllowed               bool     `json:"promotion_allowed"`
	DeployAllowed                  bool     `json:"deploy_allowed"`
	StatusPublishAllowed           bool     `json:"status_publish_allowed"`
	MutationAllowed                bool     `json:"mutation_allowed"`
	MemoryWriteAllowed             bool     `json:"memory_write_allowed"`
	UsableForPassGold              bool     `json:"usable_for_pass_gold"`
	UsableForPassSecure            bool     `json:"usable_for_pass_secure"`
	Recommendations                []string `json:"recommendations"`
}

type AuthorizationAuditResult struct {
	Version                   string   `json:"version"`
	DryRun                    bool     `json:"dry_run"`
	ReadOnly                  bool     `json:"read_only"`
	ConflictsFound            bool     `json:"conflicts_found"`
	Conflicts                 []string `json:"conflicts"`
	UnsafeClaimsFound         bool     `json:"unsafe_claims_found"`
	UnsafeClaims              []string `json:"unsafe_claims"`
	MissingItemsFound         bool     `json:"missing_items_found"`
	MissingItems              []string `json:"missing_items"`
	AuthorizationAttemptFound bool     `json:"authorization_attempt_found"`
	ExecutionAttemptFound     bool     `json:"execution_attempt_found"`
	ExpiredAuthorizationFound bool     `json:"expired_authorization_found"`
	Recommendations           []string `json:"recommendations"`
}

type AuthorizationBoundary struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	MCPScope                        []string `json:"mcp_scope"`
	ExternalExecutorScope           []string `json:"external_executor_scope"`
	ForbiddenInsideMCP              []string `json:"forbidden_inside_mcp"`
	RequiredBeforeExternalExecution []string `json:"required_before_external_execution"`
	AllowedOnlyOutsideMCP           []string `json:"allowed_only_outside_mcp"`
	RequiredManifestItems           []string `json:"required_manifest_items"`
}

type AuthorizationExplain struct {
	Version                        string   `json:"version"`
	DryRun                         bool     `json:"dry_run"`
	ReadOnly                       bool     `json:"read_only"`
	Summary                        string   `json:"summary"`
	AuthorizationModel             []string `json:"authorization_model"`
	RequiredItems                  []string `json:"required_items"`
	WhyMCPCannotExecute            []string `json:"why_mcp_cannot_execute"`
	WhyAuthorizationIsNotPassGold  []string `json:"why_authorization_is_not_pass_gold"`
	WhyAuthorizationIsNotExecution []string `json:"why_authorization_is_not_execution"`
	BlockedActions                 []string `json:"blocked_actions"`
	SafestNextSteps                []string `json:"safest_next_steps"`
	RequiredGates                  []string `json:"required_gates"`
}

func NormalizeAuthorization(input AuthorizationInput) AuthorizationInput {
	if input.Manifest == nil {
		return input
	}
	m := *input.Manifest
	if m.Root == "" {
		m.Root = input.Root
	}
	if m.MissionInput == "" {
		m.MissionInput = input.MissionInput
	}
	if m.Operation == "" {
		m.Operation = input.Operation
	}
	return m
}

func BuildAuthorizationManifest(input AuthorizationInput) AuthorizationManifest {
	in := normalizeAndValidate(input)
	validation := validateNormalized(in)
	status := validation.ManifestStatus
	if len(validation.MissingItems) > 0 {
		status = "incomplete"
	}
	if in.Validity.Expired {
		status = "expired"
	}
	if hasExecutionAttempt(in) {
		status = "unsafe_execution_attempt"
	} else if len(validation.UnsafeClaims) > 0 {
		status = "blocked"
	}
	if validation.WouldAuthorizeExternalExecutor {
		status = "authorization_ready_dry_run"
	}
	return AuthorizationManifest{
		Version: Version, DryRun: true, ReadOnly: true,
		AuthorizationID: in.AuthorizationID, AuthorizedBy: in.AuthorizedBy, AuthorizationSource: in.AuthorizationSource,
		Executor: in.Executor, Project: in.Project, Branch: in.Branch, CommitSHA: in.CommitSHA, Target: in.Target, Environment: in.Environment,
		Scope: in.Scope, Validity: in.Validity, Limits: in.Limits, Gates: in.Gates, RequiredArtifacts: in.RequiredArtifacts,
		SafetyEnvelope: in.SafetyEnvelope, PromotionContract: in.PromotionContract, Rehearsal: in.Rehearsal, Rollback: in.Rollback, KillSwitch: in.KillSwitch, Audit: in.Audit,
		ManifestStatus: status, MissingItems: validation.MissingItems, UnsafeClaims: validation.UnsafeClaims, RequiredItems: append([]string{}, requiredItems...),
		WouldAuthorizeExternalExecutor: validation.WouldAuthorizeExternalExecutor,
		MCPExecutionAllowed:            false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false,
		UsableForPassGold: false, UsableForPassSecure: false, Recommendations: validation.Recommendations,
	}
}

func ValidateAuthorization(input AuthorizationInput) AuthorizationValidation {
	return validateNormalized(normalizeAndValidate(input))
}

func BuildAuthorizationBoundary() AuthorizationBoundary {
	return AuthorizationBoundary{
		Version: Version, DryRun: true, ReadOnly: true,
		MCPScope:                        []string{"read", "validate", "audit", "explain", "simulate authorization manifest"},
		ExternalExecutorScope:           []string{"may use manifest only outside MCP", "requires real PASS_GOLD and PASS_SECURE", "requires safety envelope, promotion contract, rehearsal, rollback, kill switch, and valid authorization window"},
		ForbiddenInsideMCP:              []string{"authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "PR", "mutate", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback", "write_manifest_file"},
		RequiredBeforeExternalExecution: append([]string{}, requiredItems...),
		AllowedOnlyOutsideMCP:           []string{"external_executor_authorization", "promotion_execution", "deploy_execution", "status_publication", "rollback_execution", "lock_acquisition"},
		RequiredManifestItems:           append([]string{}, requiredItems...),
	}
}

func AuditAuthorization(input AuthorizationInput) AuthorizationAuditResult {
	in := normalizeAndValidate(input)
	v := validateNormalized(in)
	conflicts := []string{}
	if isMCPExecutor(in.Executor) {
		conflicts = append(conflicts, "executor=mcp conflicts with external executor authorization")
	}
	if in.WouldAuthorizeClaim && (len(v.MissingItems) > 0 || len(v.UnsafeClaims) > 0) {
		conflicts = append(conflicts, "would_authorize_external_executor claim conflicts with missing or unsafe manifest")
	}
	if in.RehearsalAsPassGold || in.RehearsalAsPassSecure {
		conflicts = append(conflicts, "rehearsal cannot be used as PASS_GOLD or PASS_SECURE")
	}
	return AuthorizationAuditResult{
		Version: Version, DryRun: true, ReadOnly: true,
		ConflictsFound: len(conflicts) > 0, Conflicts: conflicts,
		UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims,
		MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems,
		AuthorizationAttemptFound: in.ExecutionAuthorizedInsideMCP || in.WouldAuthorizeClaim || isMCPExecutor(in.Executor) || !in.ExplicitAuthorization,
		ExecutionAttemptFound:     hasExecutionAttempt(in),
		ExpiredAuthorizationFound: in.Validity.Expired,
		Recommendations:           []string{"keep authorization dry-run/read-only inside MCP", "obtain real PASS_GOLD and PASS_SECURE before any future external executor action", "use the manifest only outside MCP after all controls validate"},
	}
}

func ExplainAuthorization(input AuthorizationInput) AuthorizationExplain {
	_ = NormalizeAuthorization(input)
	return AuthorizationExplain{
		Version: Version, DryRun: true, ReadOnly: true,
		Summary:                        "V9.4 models an explicit, temporal, limited, auditable authorization manifest for a future external executor; inside MCP it is only read-only/dry-run validation.",
		AuthorizationModel:             []string{"explicit authorizer and source", "fixed project, branch, commit, target, and environment", "valid time window", "bounded scope and execution limits", "real PASS_GOLD/PASS_SECURE evidence", "referenced safety envelope, promotion contract, and rehearsal", "mandatory rollback and enabled kill switch"},
		RequiredItems:                  append([]string{}, requiredItems...),
		WhyMCPCannotExecute:            []string{"MCP is a read-only control plane", "V9.4 forbids promotion, deployment, status publication, mutation, memory writes, external calls, locks, and rollback inside MCP", "authorization manifests are advisory simulation payloads only"},
		WhyAuthorizationIsNotPassGold:  []string{"PASS GOLD must come from real authority evidence", "a manifest records authorization boundaries but does not perform gate validation", "usable_for_pass_gold is always false inside MCP"},
		WhyAuthorizationIsNotExecution: []string{"would_authorize_external_executor is only a contractual simulation", "V9.4 never calls an executor or performs mutation", "promotion_allowed and deploy_allowed are always false inside MCP"},
		BlockedActions:                 BuildAuthorizationBoundary().ForbiddenInsideMCP,
		SafestNextSteps:                []string{"collect real PASS_GOLD and PASS_SECURE artifacts", "validate safety envelope, promotion contract, and rehearsal references", "confirm rollback and kill switch before any future external executor outside MCP"},
		RequiredGates:                  append([]string{}, requiredGates...),
	}
}

func EvaluateAuthorizationEligibility(input AuthorizationInput) (bool, []string) {
	v := ValidateAuthorization(input)
	if v.WouldAuthorizeExternalExecutor {
		return true, []string{"manifest is complete for advisory future external executor use only"}
	}
	reasons := append([]string{}, v.MissingItems...)
	reasons = append(reasons, v.UnsafeClaims...)
	return false, reasons
}

func normalizeAndValidate(input AuthorizationInput) AuthorizationInput {
	in := NormalizeAuthorization(input)
	in.Scope.Valid = in.Scope.Present && len(in.Scope.AllowedOperations) > 0 && len(in.Scope.AllowedTargets) > 0 && len(in.Scope.AllowedEnvironments) > 0 && strings.TrimSpace(in.Scope.AllowedBranch) != "" && strings.TrimSpace(in.Scope.AllowedCommitSHA) != "" && in.Scope.MaxActions >= 0 && in.Scope.MaxFilesChanged >= 0
	in.Validity.Valid = validValidity(&in.Validity)
	in.Limits.Valid = in.Limits.Present && in.Limits.MaxDurationSeconds > 0 && in.Limits.MaxRetries >= 0 && in.Limits.RequireManualHold && in.Limits.RequireSingleExecutor && in.Limits.RequireIdempotency && in.Limits.RequireLockLease && in.Limits.RequireNoParallelExecution
	for i := range in.Gates {
		g := &in.Gates[i]
		g.Valid = isRealGate(*g)
	}
	in.SafetyEnvelope.Valid = in.SafetyEnvelope.Present && in.SafetyEnvelope.Referenced && strings.TrimSpace(in.SafetyEnvelope.EnvelopeID) != "" && in.SafetyEnvelope.SafetyReadyDryRun && in.SafetyEnvelope.WouldAllowExternalExecutor
	in.PromotionContract.Valid = in.PromotionContract.Present && in.PromotionContract.Referenced && strings.TrimSpace(in.PromotionContract.ContractID) != "" && in.PromotionContract.ExternallyEligibleDryRun && in.PromotionContract.WouldAllowExternalExecutor
	in.Rehearsal.Valid = in.Rehearsal.Present && in.Rehearsal.Referenced && strings.TrimSpace(in.Rehearsal.RehearsalID) != "" && in.Rehearsal.RehearsalReadyDryRun && in.Rehearsal.NoMutationProof
	in.Rollback.Valid = in.Rollback.Present && in.Rollback.Mandatory && strings.TrimSpace(in.Rollback.Strategy) != "" && in.Rollback.SnapshotRequired && in.Rollback.ValidationRequired && in.Rollback.ManualInterventionRequired
	in.KillSwitch.Valid = in.KillSwitch.Present && in.KillSwitch.Mandatory && in.KillSwitch.Enabled && strings.TrimSpace(in.KillSwitch.Trigger) != ""
	in.Audit.Valid = in.Audit.Present && strings.TrimSpace(in.Audit.AuditID) != "" && in.Audit.RecordsAuthorizer && in.Audit.RecordsScope && in.Audit.RecordsGates && in.Audit.RecordsArtifacts && in.Audit.RecordsDecisions && in.Audit.RecordsExpiration && in.Audit.ImmutableTargetDeclared
	return in
}

func validateNormalized(in AuthorizationInput) AuthorizationValidation {
	missing := []string{}
	unsafe := []string{}
	addMissing := func(item string) { missing = appendUnique(missing, item) }
	addUnsafe := func(item string) { unsafe = appendUnique(unsafe, item) }

	if strings.TrimSpace(in.AuthorizationID) == "" {
		addMissing("authorization_id")
	}
	if strings.TrimSpace(in.AuthorizedBy) == "" {
		addMissing("authorized_by")
	}
	if strings.TrimSpace(in.AuthorizationSource) == "" {
		addMissing("authorization_source")
	}
	if !in.ExplicitAuthorization {
		addMissing("explicit_authorization")
	}
	if strings.TrimSpace(in.Executor) == "" {
		addMissing("executor")
	}
	if isMCPExecutor(in.Executor) {
		addUnsafe("executor_mcp_not_allowed")
	}
	if strings.TrimSpace(in.Project) == "" {
		addMissing("project")
	}
	if strings.TrimSpace(in.Branch) == "" {
		addMissing("branch")
	}
	if strings.TrimSpace(in.CommitSHA) == "" {
		addMissing("commit_sha")
	}
	if strings.TrimSpace(in.Target) == "" {
		addMissing("target")
	}
	if strings.TrimSpace(in.Environment) == "" {
		addMissing("environment")
	}
	if !in.Scope.Present {
		addMissing("scope")
	} else if !in.Scope.Valid {
		addMissing("scope_valid")
	}
	if !in.Validity.Present {
		addMissing("validity")
	} else if !in.Validity.Valid {
		addMissing("validity_valid")
	}
	if in.Validity.Expired {
		addUnsafe("authorization_expired")
	}
	if !in.Limits.Present {
		addMissing("limits")
	} else if !in.Limits.Valid {
		addMissing("limits_valid")
	}
	if !hasGate(in.Gates, "PASS_GOLD") {
		addMissing("PASS_GOLD_REAL")
	}
	if !hasGate(in.Gates, "PASS_SECURE") {
		addMissing("PASS_SECURE_REAL")
	}
	for _, g := range in.Gates {
		name := strings.ToUpper(strings.TrimSpace(g.Gate))
		if g.DryRun {
			addUnsafe(name + "_dry_run_gate_used_as_real")
		}
		if g.Synthesized {
			addUnsafe(name + "_synthesized_gate_used_as_real")
		}
		if g.Advisory || advisorySources[strings.ToLower(strings.TrimSpace(g.Source))] {
			addUnsafe(name + "_advisory_gate_used_as_real")
		}
		if name == "PASS_GOLD" && !isRealGate(g) {
			addMissing("PASS_GOLD_REAL")
		}
		if name == "PASS_SECURE" && !isRealGate(g) {
			addMissing("PASS_SECURE_REAL")
		}
	}
	if len(in.RequiredArtifacts) == 0 || !requiredArtifactsTrusted(in.RequiredArtifacts) {
		addMissing("required_artifacts")
	}
	if !in.SafetyEnvelope.Present {
		addMissing("safety_envelope_reference")
	} else if !in.SafetyEnvelope.Valid {
		addMissing("safety_envelope_reference_valid")
	}
	if !in.PromotionContract.Present {
		addMissing("promotion_contract_reference")
	} else if !in.PromotionContract.Valid {
		addMissing("promotion_contract_reference_valid")
	}
	if !in.Rehearsal.Present {
		addMissing("rehearsal_reference")
	} else if !in.Rehearsal.Valid {
		addMissing("rehearsal_reference_valid")
	}
	if !in.Rollback.Present {
		addMissing("rollback_authorization")
	} else if !in.Rollback.Mandatory || !in.Rollback.Valid {
		addMissing("rollback_authorization_mandatory_valid")
	}
	if !in.KillSwitch.Present {
		addMissing("kill_switch_authorization")
	} else if !in.KillSwitch.Mandatory || !in.KillSwitch.Enabled || !in.KillSwitch.Valid {
		addMissing("kill_switch_authorization_enabled_valid")
	}
	if !in.Audit.Present {
		addMissing("audit")
	} else if !in.Audit.Valid {
		addMissing("audit_valid")
	}

	if in.PromotionAllowed {
		addUnsafe("promotion_allowed_true_inside_mcp")
	}
	if in.DeployAllowed {
		addUnsafe("deploy_allowed_true_inside_mcp")
	}
	if in.StatusPublishAllowed {
		addUnsafe("status_publish_allowed_true_inside_mcp")
	}
	if in.MutationAllowed {
		addUnsafe("mutation_allowed_true_inside_mcp")
	}
	if in.MemoryWriteAllowed {
		addUnsafe("memory_write_allowed_true_inside_mcp")
	}
	if in.AttemptExternalCall {
		addUnsafe("attempt_external_call_true")
	}
	if in.AttemptRealRollback {
		addUnsafe("attempt_real_rollback_true")
	}
	if in.AttemptRealLock {
		addUnsafe("attempt_real_lock_true")
	}
	if in.CommandExecution {
		addUnsafe("command_execution_true")
	}
	if in.NetworkCall {
		addUnsafe("network_call_true")
	}
	if in.FileWrite {
		addUnsafe("file_write_true")
	}
	if in.PassGold {
		addUnsafe("pass_gold_claim_true")
	}
	if in.PassSecure {
		addUnsafe("pass_secure_claim_true")
	}
	if in.ExecutionAuthorizedInsideMCP {
		addUnsafe("execution_authorized_inside_mcp_true")
	}
	if in.RehearsalAsPassGold {
		addUnsafe("rehearsal_used_as_pass_gold")
	}
	if in.RehearsalAsPassSecure {
		addUnsafe("rehearsal_used_as_pass_secure")
	}

	would := len(missing) == 0 && len(unsafe) == 0 && !isMCPExecutor(in.Executor) && in.ExplicitAuthorization && in.Scope.Valid && in.Validity.Valid && !in.Validity.Expired && in.Limits.Valid && hasGate(in.Gates, "PASS_GOLD") && hasGate(in.Gates, "PASS_SECURE") && requiredArtifactsTrusted(in.RequiredArtifacts) && in.SafetyEnvelope.Valid && in.PromotionContract.Valid && in.Rehearsal.Valid && in.Rollback.Valid && in.KillSwitch.Valid && in.KillSwitch.Enabled && in.Audit.Valid
	status := "authorization_ready_dry_run"
	if len(missing) > 0 {
		status = "incomplete"
	}
	if in.Validity.Expired {
		status = "expired"
	}
	if hasExecutionAttempt(in) {
		status = "unsafe_execution_attempt"
	} else if len(unsafe) > 0 {
		status = "blocked"
	}
	if would {
		status = "authorization_ready_dry_run"
	}
	return AuthorizationValidation{
		Version: Version, DryRun: true, ReadOnly: true,
		Valid: would, Blocked: len(unsafe) > 0 || len(missing) > 0,
		ManifestStatus: status, MissingItems: missing, UnsafeClaims: unsafe, RequiredItems: append([]string{}, requiredItems...),
		WouldAuthorizeExternalExecutor: would,
		MCPExecutionAllowed:            false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, UsableForPassGold: false, UsableForPassSecure: false,
		Recommendations: []string{"do not execute from MCP", "provide every required real gate and control before future external executor use", "keep rollback mandatory and kill switch enabled"},
	}
}

func validValidity(v *AuthorizationValidity) bool {
	if !v.Present || !v.WithinWindow || v.Expired {
		return false
	}
	now := time.Now().UTC()
	if strings.TrimSpace(v.NotBefore) != "" {
		if t, err := time.Parse(time.RFC3339, v.NotBefore); err == nil && now.Before(t) {
			return false
		}
	}
	if strings.TrimSpace(v.ExpiresAt) != "" {
		if t, err := time.Parse(time.RFC3339, v.ExpiresAt); err == nil && now.After(t) {
			v.Expired = true
			return false
		}
	}
	return true
}

func hasGate(gates []AuthorizationGate, name string) bool {
	for _, g := range gates {
		if strings.EqualFold(strings.TrimSpace(g.Gate), name) && isRealGate(g) {
			return true
		}
	}
	return false
}

func isRealGate(g AuthorizationGate) bool {
	return strings.EqualFold(strings.TrimSpace(g.Status), "pass") && g.RealEvidence && !g.DryRun && !g.Synthesized && !g.Advisory && !advisorySources[strings.ToLower(strings.TrimSpace(g.Source))] && g.RecognizedByAuthority && strings.TrimSpace(g.ArtifactID) != ""
}

func requiredArtifactsTrusted(artifacts []RequiredArtifact) bool {
	if len(artifacts) == 0 {
		return false
	}
	for _, a := range artifacts {
		if a.Required && (!a.Present || !a.Trusted || strings.TrimSpace(a.ID) == "" || strings.TrimSpace(a.Type) == "") {
			return false
		}
	}
	return true
}

func hasExecutionAttempt(in AuthorizationInput) bool {
	return in.PromotionAllowed || in.DeployAllowed || in.StatusPublishAllowed || in.MutationAllowed || in.MemoryWriteAllowed || in.AttemptExternalCall || in.AttemptRealRollback || in.AttemptRealLock || in.CommandExecution || in.NetworkCall || in.FileWrite
}

func isMCPExecutor(executor string) bool {
	e := strings.ToLower(strings.TrimSpace(executor))
	return e == "mcp" || e == "mcp_readonly" || e == "mcp-readonly"
}

func appendUnique(items []string, item string) []string {
	if item == "" {
		return items
	}
	for _, existing := range items {
		if existing == item {
			return items
		}
	}
	return append(items, item)
}
