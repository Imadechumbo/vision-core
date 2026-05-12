// Package resultintake implements V9.8 External Executor Result Intake Boundary.
//
// The result intake boundary is deliberately read-only and dry-run. It validates
// and classifies a future external executor result payload for later human and
// authority review, but it never trusts the result, marks PASS GOLD/PASS SECURE,
// promotes stable, deploys, publishes status, writes memory, learns stable state,
// performs rollback, executes commands, calls networks, opens PRs, or writes files.
package resultintake

import "strings"

const Version = "V9.8"

const (
	StatusReadyDryRun         = "result_intake_ready_dry_run"
	StatusIncomplete          = "incomplete"
	StatusBlocked             = "blocked"
	StatusUnsafeTrustAttempt  = "unsafe_trust_attempt"
	StatusUnsafeAutoPromotion = "unsafe_auto_promotion_attempt"
	StatusResultRejected      = "result_rejected"
)

var requiredItems = []string{
	"intake_id", "invocation_id", "executor", "executor_mode", "external_only", "project", "branch", "commit_sha", "target", "environment",
	"invocation_boundary_reference", "handoff_package_reference", "final_preflight_reference", "authorization_manifest_reference",
	"result_payload", "execution_result", "evidence_bundle", "audit_trail", "rollback_outcome", "observability_outcome", "mutation_summary",
	"command_summary", "network_summary", "file_write_summary", "status_publication_summary", "attestation", "idempotency", "safety_decision",
	"no_auto_gold_claim", "no_auto_promotion_claim", "no_trust_without_review",
}

var forbiddenInsideMCP = []string{
	"trust_result_automatically", "mark_PASS_GOLD", "mark_PASS_SECURE", "promote", "promote_stable", "deploy", "publish_status",
	"push", "open_pr", "mutate", "write_memory", "grant_authority", "learn_stable", "perform_rollback", "network_call",
	"command_execution", "file_write", "status_publication", "result_persistence",
}

var blockedActions = []string{
	"trust_result_automatically", "mark_PASS_GOLD", "mark_PASS_SECURE", "promote_stable", "deploy", "publish_status", "push", "open_pr",
	"mutate", "write_memory", "grant_authority", "learn_stable", "perform_rollback",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

// ResultIntakeInput is the V9.8 advisory payload accepted by MCP tools.
type ResultIntakeInput struct {
	Root                       string                    `json:"root,omitempty"`
	MissionInput               string                    `json:"mission_input,omitempty"`
	Operation                  string                    `json:"operation,omitempty"`
	Intake                     *ResultIntakeInput        `json:"intake,omitempty"`
	Result                     *ResultIntakeInput        `json:"result,omitempty"`
	IntakeID                   string                    `json:"intake_id,omitempty"`
	InvocationID               string                    `json:"invocation_id,omitempty"`
	Executor                   string                    `json:"executor,omitempty"`
	ExecutorMode               string                    `json:"executor_mode,omitempty"`
	Project                    string                    `json:"project,omitempty"`
	Branch                     string                    `json:"branch,omitempty"`
	CommitSHA                  string                    `json:"commit_sha,omitempty"`
	Target                     string                    `json:"target,omitempty"`
	Environment                string                    `json:"environment,omitempty"`
	InvocationBoundary         *BoundaryReference        `json:"invocation_boundary,omitempty"`
	HandoffPackage             *BoundaryReference        `json:"handoff_package,omitempty"`
	FinalPreflight             *BoundaryReference        `json:"final_preflight,omitempty"`
	AuthorizationManifest      *BoundaryReference        `json:"authorization_manifest,omitempty"`
	ResultPayload              *ResultPayload            `json:"result_payload,omitempty"`
	ExecutionResult            *ExecutionResult          `json:"execution_result,omitempty"`
	EvidenceBundle             *EvidenceBundle           `json:"evidence_bundle,omitempty"`
	AuditTrail                 *AuditTrail               `json:"audit_trail,omitempty"`
	RollbackOutcome            *RollbackOutcome          `json:"rollback_outcome,omitempty"`
	ObservabilityOutcome       *ObservabilityOutcome     `json:"observability_outcome,omitempty"`
	MutationSummary            *MutationSummary          `json:"mutation_summary,omitempty"`
	CommandSummary             *CommandSummary           `json:"command_summary,omitempty"`
	NetworkSummary             *NetworkSummary           `json:"network_summary,omitempty"`
	FileWriteSummary           *FileWriteSummary         `json:"file_write_summary,omitempty"`
	StatusPublicationSummary   *StatusPublicationSummary `json:"status_publication_summary,omitempty"`
	Attestation                *ResultAttestation        `json:"attestation,omitempty"`
	Idempotency                *ResultIdempotency        `json:"idempotency,omitempty"`
	SafetyDecision             *SafetyDecision           `json:"safety_decision,omitempty"`
	Claims                     *ResultClaims             `json:"claims,omitempty"`
	Strict                     bool                      `json:"strict,omitempty"`
	PassGold                   bool                      `json:"pass_gold,omitempty"`
	PassSecure                 bool                      `json:"pass_secure,omitempty"`
	PromotionAllowed           bool                      `json:"promotion_allowed,omitempty"`
	DeployAllowed              bool                      `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed       bool                      `json:"status_publish_allowed,omitempty"`
	MutationAllowed            bool                      `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed         bool                      `json:"memory_write_allowed,omitempty"`
	StablePromoted             bool                      `json:"stable_promoted,omitempty"`
	AuthorityGranted           bool                      `json:"authority_granted,omitempty"`
	ResultTrustedWithoutReview bool                      `json:"result_trusted_without_review,omitempty"`
}

type BoundaryReference struct {
	Present                         bool   `json:"present,omitempty"`
	Version                         string `json:"version,omitempty"`
	Status                          string `json:"status,omitempty"`
	ExternalInvocationBoundaryReady bool   `json:"external_invocation_boundary_ready,omitempty"`
	ExternalExecutorHandoffReady    bool   `json:"external_executor_handoff_ready,omitempty"`
	ExternalExecutionPreflightReady bool   `json:"external_execution_preflight_ready,omitempty"`
	WouldAuthorizeExternalExecutor  bool   `json:"would_authorize_external_executor,omitempty"`
	Valid                           bool   `json:"valid,omitempty"`
}

type ResultPayload struct {
	Present         bool    `json:"present,omitempty"`
	ResultID        string  `json:"result_id,omitempty"`
	InvocationID    string  `json:"invocation_id,omitempty"`
	Executor        string  `json:"executor,omitempty"`
	ExecutorMode    string  `json:"executor_mode,omitempty"`
	ExternalOnly    bool    `json:"external_only,omitempty"`
	Completed       bool    `json:"completed,omitempty"`
	Status          string  `json:"status,omitempty"`
	StartedAt       string  `json:"started_at,omitempty"`
	FinishedAt      string  `json:"finished_at,omitempty"`
	DurationSeconds float64 `json:"duration_seconds,omitempty"`
	ExitCode        int     `json:"exit_code,omitempty"`
	Valid           bool    `json:"valid,omitempty"`
}

type ExecutionResult struct {
	Present                  bool   `json:"present,omitempty"`
	Status                   string `json:"status,omitempty"`
	Success                  bool   `json:"success,omitempty"`
	Failed                   bool   `json:"failed,omitempty"`
	Cancelled                bool   `json:"cancelled,omitempty"`
	TimedOut                 bool   `json:"timed_out,omitempty"`
	ErrorMessage             string `json:"error_message,omitempty"`
	ExternalExecutorReported bool   `json:"external_executor_reported,omitempty"`
	Valid                    bool   `json:"valid,omitempty"`
}
type EvidenceBundle struct {
	Present                   bool   `json:"present,omitempty"`
	EvidenceID                string `json:"evidence_id,omitempty"`
	ContainsRealPassGold      bool   `json:"contains_real_pass_gold,omitempty"`
	ContainsRealPassSecure    bool   `json:"contains_real_pass_secure,omitempty"`
	ContainsExecutorLogs      bool   `json:"contains_executor_logs,omitempty"`
	ContainsDiffSummary       bool   `json:"contains_diff_summary,omitempty"`
	ContainsValidationSummary bool   `json:"contains_validation_summary,omitempty"`
	ContainsSecuritySummary   bool   `json:"contains_security_summary,omitempty"`
	DryRunEvidenceOnly        bool   `json:"dry_run_evidence_only,omitempty"`
	Trusted                   bool   `json:"trusted,omitempty"`
	Valid                     bool   `json:"valid,omitempty"`
}
type AuditTrail struct {
	Present                 bool   `json:"present,omitempty"`
	AuditID                 string `json:"audit_id,omitempty"`
	RecordsInvocationID     bool   `json:"records_invocation_id,omitempty"`
	RecordsExecutor         bool   `json:"records_executor,omitempty"`
	RecordsInputs           bool   `json:"records_inputs,omitempty"`
	RecordsOutputs          bool   `json:"records_outputs,omitempty"`
	RecordsStartedFinished  bool   `json:"records_started_finished,omitempty"`
	RecordsDecisions        bool   `json:"records_decisions,omitempty"`
	ImmutableTargetDeclared bool   `json:"immutable_target_declared,omitempty"`
	Valid                   bool   `json:"valid,omitempty"`
}
type RollbackOutcome struct {
	Present                    bool `json:"present,omitempty"`
	RollbackRequired           bool `json:"rollback_required,omitempty"`
	RollbackPerformed          bool `json:"rollback_performed,omitempty"`
	RollbackSuccessful         bool `json:"rollback_successful,omitempty"`
	RollbackFailed             bool `json:"rollback_failed,omitempty"`
	SimulatedOnly              bool `json:"simulated_only,omitempty"`
	ManualInterventionRequired bool `json:"manual_intervention_required,omitempty"`
	Valid                      bool `json:"valid,omitempty"`
}
type ObservabilityOutcome struct {
	Present                   bool `json:"present,omitempty"`
	HealthChecksReported      bool `json:"health_checks_reported,omitempty"`
	MetricsReported           bool `json:"metrics_reported,omitempty"`
	LogsReported              bool `json:"logs_reported,omitempty"`
	AlertsReported            bool `json:"alerts_reported,omitempty"`
	PostExecutionWatchSeconds int  `json:"post_execution_watch_seconds,omitempty"`
	Valid                     bool `json:"valid,omitempty"`
}
type MutationSummary struct {
	Present              bool `json:"present,omitempty"`
	FilesChanged         int  `json:"files_changed,omitempty"`
	CommitsCreated       int  `json:"commits_created,omitempty"`
	BranchesChanged      int  `json:"branches_changed,omitempty"`
	DeploymentsPerformed int  `json:"deployments_performed,omitempty"`
	StatusesPublished    int  `json:"statuses_published,omitempty"`
	MemoryWritten        int  `json:"memory_written,omitempty"`
	StablePromoted       bool `json:"stable_promoted,omitempty"`
	Valid                bool `json:"valid,omitempty"`
}
type CommandSummary struct {
	Present          bool `json:"present,omitempty"`
	CommandsExecuted bool `json:"commands_executed,omitempty"`
	CommandCount     int  `json:"command_count,omitempty"`
	ExecutorSideOnly bool `json:"executor_side_only,omitempty"`
	Valid            bool `json:"valid,omitempty"`
}
type NetworkSummary struct {
	Present          bool `json:"present,omitempty"`
	NetworkCallsMade bool `json:"network_calls_made,omitempty"`
	NetworkCallCount int  `json:"network_call_count,omitempty"`
	ExecutorSideOnly bool `json:"executor_side_only,omitempty"`
	Valid            bool `json:"valid,omitempty"`
}
type FileWriteSummary struct {
	Present          bool `json:"present,omitempty"`
	FileWritesMade   bool `json:"file_writes_made,omitempty"`
	FileWriteCount   int  `json:"file_write_count,omitempty"`
	ExecutorSideOnly bool `json:"executor_side_only,omitempty"`
	Valid            bool `json:"valid,omitempty"`
}
type StatusPublicationSummary struct {
	Present          bool   `json:"present,omitempty"`
	StatusPublished  bool   `json:"status_published,omitempty"`
	StatusTarget     string `json:"status_target,omitempty"`
	ExecutorSideOnly bool   `json:"executor_side_only,omitempty"`
	Valid            bool   `json:"valid,omitempty"`
}
type ResultAttestation struct {
	Present                bool   `json:"present,omitempty"`
	AttestationID          string `json:"attestation_id,omitempty"`
	SignaturePlaceholder   string `json:"signature_placeholder,omitempty"`
	SignaturePresent       bool   `json:"signature_present,omitempty"`
	PlaintextSecretPresent bool   `json:"plaintext_secret_present,omitempty"`
	VerifierDeclared       bool   `json:"verifier_declared,omitempty"`
	Valid                  bool   `json:"valid,omitempty"`
}
type ResultIdempotency struct {
	Present                 bool   `json:"present,omitempty"`
	Key                     string `json:"key,omitempty"`
	InvocationIDMatched     bool   `json:"invocation_id_matched,omitempty"`
	DuplicateDetected       bool   `json:"duplicate_detected,omitempty"`
	DuplicateActionBehavior string `json:"duplicate_action_behavior,omitempty"`
	Valid                   bool   `json:"valid,omitempty"`
}
type SafetyDecision struct {
	Present                    bool     `json:"present,omitempty"`
	Decision                   string   `json:"decision,omitempty"`
	RequiresHumanReview        bool     `json:"requires_human_review,omitempty"`
	RequiresRevalidation       bool     `json:"requires_revalidation,omitempty"`
	EligibleForAuthorityReview bool     `json:"eligible_for_authority_review,omitempty"`
	Rejected                   bool     `json:"rejected,omitempty"`
	Reasons                    []string `json:"reasons,omitempty"`
	Valid                      bool     `json:"valid,omitempty"`
}
type ResultClaims struct {
	PassGold                   bool `json:"pass_gold,omitempty"`
	PassSecure                 bool `json:"pass_secure,omitempty"`
	PromotionAllowed           bool `json:"promotion_allowed,omitempty"`
	DeployAllowed              bool `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed       bool `json:"status_publish_allowed,omitempty"`
	MutationAllowed            bool `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed         bool `json:"memory_write_allowed,omitempty"`
	StablePromoted             bool `json:"stable_promoted,omitempty"`
	AuthorityGranted           bool `json:"authority_granted,omitempty"`
	ResultTrustedWithoutReview bool `json:"result_trusted_without_review,omitempty"`
}

type ResultIntakeBoundaryResult struct {
	Version                          string                    `json:"version"`
	DryRun                           bool                      `json:"dry_run"`
	ReadOnly                         bool                      `json:"read_only"`
	IntakeID                         string                    `json:"intake_id,omitempty"`
	IntakeStatus                     string                    `json:"intake_status"`
	ResultIntakeValid                bool                      `json:"result_intake_valid"`
	ResultRequiresHumanReview        bool                      `json:"result_requires_human_review"`
	ResultRequiresRevalidation       bool                      `json:"result_requires_revalidation"`
	ResultEligibleForAuthorityReview bool                      `json:"result_eligible_for_authority_review"`
	ResultRejected                   bool                      `json:"result_rejected"`
	InvocationID                     string                    `json:"invocation_id,omitempty"`
	Executor                         string                    `json:"executor,omitempty"`
	ExecutorMode                     string                    `json:"executor_mode,omitempty"`
	Project                          string                    `json:"project,omitempty"`
	Branch                           string                    `json:"branch,omitempty"`
	CommitSHA                        string                    `json:"commit_sha,omitempty"`
	Target                           string                    `json:"target,omitempty"`
	Environment                      string                    `json:"environment,omitempty"`
	ResultPayload                    *ResultPayload            `json:"result_payload,omitempty"`
	ExecutionResult                  *ExecutionResult          `json:"execution_result,omitempty"`
	EvidenceBundle                   *EvidenceBundle           `json:"evidence_bundle,omitempty"`
	AuditTrail                       *AuditTrail               `json:"audit_trail,omitempty"`
	RollbackOutcome                  *RollbackOutcome          `json:"rollback_outcome,omitempty"`
	ObservabilityOutcome             *ObservabilityOutcome     `json:"observability_outcome,omitempty"`
	MutationSummary                  *MutationSummary          `json:"mutation_summary,omitempty"`
	CommandSummary                   *CommandSummary           `json:"command_summary,omitempty"`
	NetworkSummary                   *NetworkSummary           `json:"network_summary,omitempty"`
	FileWriteSummary                 *FileWriteSummary         `json:"file_write_summary,omitempty"`
	StatusPublicationSummary         *StatusPublicationSummary `json:"status_publication_summary,omitempty"`
	Attestation                      *ResultAttestation        `json:"attestation,omitempty"`
	Idempotency                      *ResultIdempotency        `json:"idempotency,omitempty"`
	SafetyDecision                   *SafetyDecision           `json:"safety_decision,omitempty"`
	MissingItems                     []string                  `json:"missing_items"`
	UnsafeClaims                     []string                  `json:"unsafe_claims"`
	Conflicts                        []string                  `json:"conflicts"`
	MCPExecutionAllowed              bool                      `json:"mcp_execution_allowed"`
	PromotionAllowed                 bool                      `json:"promotion_allowed"`
	DeployAllowed                    bool                      `json:"deploy_allowed"`
	StatusPublishAllowed             bool                      `json:"status_publish_allowed"`
	MutationAllowed                  bool                      `json:"mutation_allowed"`
	MemoryWriteAllowed               bool                      `json:"memory_write_allowed"`
	StablePromotionAllowed           bool                      `json:"stable_promotion_allowed"`
	AuthorityGrantAllowed            bool                      `json:"authority_grant_allowed"`
	PassGoldAllowed                  bool                      `json:"pass_gold_allowed"`
	PassSecureAllowed                bool                      `json:"pass_secure_allowed"`
	TrustWithoutReviewAllowed        bool                      `json:"trust_without_review_allowed"`
	Recommendations                  []string                  `json:"recommendations"`
}

type ResultIntakeValidation struct {
	Version                          string   `json:"version"`
	DryRun                           bool     `json:"dry_run"`
	ReadOnly                         bool     `json:"read_only"`
	Valid                            bool     `json:"valid"`
	Blocked                          bool     `json:"blocked"`
	IntakeStatus                     string   `json:"intake_status"`
	ResultIntakeValid                bool     `json:"result_intake_valid"`
	ResultRequiresHumanReview        bool     `json:"result_requires_human_review"`
	ResultRequiresRevalidation       bool     `json:"result_requires_revalidation"`
	ResultEligibleForAuthorityReview bool     `json:"result_eligible_for_authority_review"`
	ResultRejected                   bool     `json:"result_rejected"`
	MissingItems                     []string `json:"missing_items"`
	UnsafeClaims                     []string `json:"unsafe_claims"`
	Conflicts                        []string `json:"conflicts"`
	RequiredItems                    []string `json:"required_items"`
	MCPExecutionAllowed              bool     `json:"mcp_execution_allowed"`
	PromotionAllowed                 bool     `json:"promotion_allowed"`
	DeployAllowed                    bool     `json:"deploy_allowed"`
	StatusPublishAllowed             bool     `json:"status_publish_allowed"`
	MutationAllowed                  bool     `json:"mutation_allowed"`
	MemoryWriteAllowed               bool     `json:"memory_write_allowed"`
	StablePromotionAllowed           bool     `json:"stable_promotion_allowed"`
	AuthorityGrantAllowed            bool     `json:"authority_grant_allowed"`
	PassGoldAllowed                  bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                bool     `json:"pass_secure_allowed"`
	TrustWithoutReviewAllowed        bool     `json:"trust_without_review_allowed"`
	Recommendations                  []string `json:"recommendations"`
}
type ResultIntakeAudit struct {
	Version                   string   `json:"version"`
	DryRun                    bool     `json:"dry_run"`
	ReadOnly                  bool     `json:"read_only"`
	ConflictsFound            bool     `json:"conflicts_found"`
	Conflicts                 []string `json:"conflicts"`
	UnsafeClaimsFound         bool     `json:"unsafe_claims_found"`
	UnsafeClaims              []string `json:"unsafe_claims"`
	MissingItemsFound         bool     `json:"missing_items_found"`
	MissingItems              []string `json:"missing_items"`
	TrustBypassAttemptFound   bool     `json:"trust_bypass_attempt_found"`
	AutoGoldAttemptFound      bool     `json:"auto_gold_attempt_found"`
	AutoPromotionAttemptFound bool     `json:"auto_promotion_attempt_found"`
	MemoryWriteAttemptFound   bool     `json:"memory_write_attempt_found"`
	StatusPublishClaimFound   bool     `json:"status_publish_claim_found"`
	PlaintextSecretFound      bool     `json:"plaintext_secret_found"`
	Recommendations           []string `json:"recommendations"`
}
type ResultIntakeBoundary struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	MCPScope                   []string `json:"mcp_scope"`
	ExternalExecutorScope      []string `json:"external_executor_scope"`
	ForbiddenInsideMCP         []string `json:"forbidden_inside_mcp"`
	RequiredBeforeResultIntake []string `json:"required_before_result_intake"`
	AllowedOnlyOutsideMCP      []string `json:"allowed_only_outside_mcp"`
	RequiredResultItems        []string `json:"required_result_items"`
}
type ResultIntakeExplain struct {
	Version                 string   `json:"version"`
	DryRun                  bool     `json:"dry_run"`
	ReadOnly                bool     `json:"read_only"`
	Summary                 string   `json:"summary"`
	IntakeModel             []string `json:"intake_model"`
	RequiredItems           []string `json:"required_items"`
	WhyResultIsNotPassGold  []string `json:"why_result_is_not_pass_gold"`
	WhyResultIsNotAuthority []string `json:"why_result_is_not_authority"`
	WhyResultRequiresReview []string `json:"why_result_requires_review"`
	BlockedActions          []string `json:"blocked_actions"`
	SafestNextSteps         []string `json:"safest_next_steps"`
	RequiredGates           []string `json:"required_gates"`
}

func BuildResultIntake(input ResultIntakeInput) ResultIntakeBoundaryResult {
	input = NormalizeResultIntake(input)
	v := ValidateResultIntake(input)
	return ResultIntakeBoundaryResult{Version: Version, DryRun: true, ReadOnly: true, IntakeID: input.IntakeID, IntakeStatus: v.IntakeStatus, ResultIntakeValid: v.ResultIntakeValid, ResultRequiresHumanReview: true, ResultRequiresRevalidation: true, ResultEligibleForAuthorityReview: v.ResultEligibleForAuthorityReview, ResultRejected: v.ResultRejected, InvocationID: input.InvocationID, Executor: input.Executor, ExecutorMode: input.ExecutorMode, Project: input.Project, Branch: input.Branch, CommitSHA: input.CommitSHA, Target: input.Target, Environment: input.Environment, ResultPayload: input.ResultPayload, ExecutionResult: input.ExecutionResult, EvidenceBundle: input.EvidenceBundle, AuditTrail: input.AuditTrail, RollbackOutcome: input.RollbackOutcome, ObservabilityOutcome: input.ObservabilityOutcome, MutationSummary: input.MutationSummary, CommandSummary: input.CommandSummary, NetworkSummary: input.NetworkSummary, FileWriteSummary: input.FileWriteSummary, StatusPublicationSummary: input.StatusPublicationSummary, Attestation: input.Attestation, Idempotency: input.Idempotency, SafetyDecision: input.SafetyDecision, MissingItems: v.MissingItems, UnsafeClaims: v.UnsafeClaims, Conflicts: v.Conflicts, MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, StablePromotionAllowed: false, AuthorityGrantAllowed: false, PassGoldAllowed: false, PassSecureAllowed: false, TrustWithoutReviewAllowed: false, Recommendations: v.Recommendations}
}

func ValidateResultIntake(input ResultIntakeInput) ResultIntakeValidation {
	input = NormalizeResultIntake(input)
	missing := missingItems(input)
	unsafe := unsafeClaims(input)
	conflicts := conflicts(input)
	rejected := input.SafetyDecision != nil && input.SafetyDecision.Rejected
	valid := len(missing) == 0 && len(unsafe) == 0 && len(conflicts) == 0 && !rejected
	status := StatusReadyDryRun
	switch {
	case rejected:
		status = StatusResultRejected
	case len(missing) > 0:
		status = StatusIncomplete
	case hasTrustBypass(input, unsafe):
		status = StatusUnsafeTrustAttempt
	case hasAutoPromotion(unsafe):
		status = StatusUnsafeAutoPromotion
	case len(unsafe) > 0 || len(conflicts) > 0:
		status = StatusBlocked
	}
	return ResultIntakeValidation{Version: Version, DryRun: true, ReadOnly: true, Valid: valid, Blocked: !valid, IntakeStatus: status, ResultIntakeValid: valid, ResultRequiresHumanReview: true, ResultRequiresRevalidation: true, ResultEligibleForAuthorityReview: valid && !rejected, ResultRejected: rejected, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, RequiredItems: clone(requiredItems), MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, StablePromotionAllowed: false, AuthorityGrantAllowed: false, PassGoldAllowed: false, PassSecureAllowed: false, TrustWithoutReviewAllowed: false, Recommendations: recommendations(missing, unsafe, conflicts)}
}

func BuildResultIntakeBoundary() ResultIntakeBoundary {
	return ResultIntakeBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPScope: []string{"read", "validate", "audit", "explain", "simulate_result_intake"}, ExternalExecutorScope: []string{"produce_result_outside_mcp", "report_execution_status", "provide_evidence_bundle", "provide_audit_trail", "provide_rollback_outcome", "provide_observability_outcome"}, ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeResultIntake: []string{"Invocation Boundary V9.7", "Handoff Package V9.6", "Final Preflight V9.5", "Authorization Manifest V9.4"}, AllowedOnlyOutsideMCP: []string{"external_executor_execution", "executor_side_commands", "executor_side_network", "executor_side_file_writes", "executor_side_status_publication_report"}, RequiredResultItems: clone(requiredItems)}
}

func AuditResultIntake(input ResultIntakeInput) ResultIntakeAudit {
	input = NormalizeResultIntake(input)
	missing := missingItems(input)
	unsafe := unsafeClaims(input)
	conf := conflicts(input)
	return ResultIntakeAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(conf) > 0, Conflicts: conf, UnsafeClaimsFound: len(unsafe) > 0, UnsafeClaims: unsafe, MissingItemsFound: len(missing) > 0, MissingItems: missing, TrustBypassAttemptFound: hasTrustBypass(input, unsafe), AutoGoldAttemptFound: containsAny(unsafe, "pass_gold_claim", "pass_secure_claim", "evidence_claims_real_pass_gold", "evidence_claims_real_pass_secure"), AutoPromotionAttemptFound: hasAutoPromotion(unsafe), MemoryWriteAttemptFound: containsAny(unsafe, "memory_write_allowed_claim", "mutation_summary_memory_written", "stable_promoted_claim"), StatusPublishClaimFound: containsAny(unsafe, "status_publish_allowed_claim", "status_publication_claim", "mutation_summary_statuses_published"), PlaintextSecretFound: input.Attestation != nil && input.Attestation.PlaintextSecretPresent, Recommendations: recommendations(missing, unsafe, conf)}
}

func ExplainResultIntake(input ResultIntakeInput) ResultIntakeExplain {
	return ResultIntakeExplain{Version: Version, DryRun: true, ReadOnly: true, Summary: "V9.8 ingests an external executor result as read-only dry-run evidence for later review; it does not trust, persist, promote, deploy, publish, roll back, or grant authority.", IntakeModel: []string{"receive logical result payload", "validate required V9.7/V9.6/V9.5/V9.4 references", "separate external claims from evidence", "classify missing items, unsafe claims, and conflicts", "route only structurally valid results to future human/authority review"}, RequiredItems: clone(requiredItems), WhyResultIsNotPassGold: []string{"External executor output is not an authoritative PASS GOLD evaluation.", "PASS GOLD must be produced by independent real gates outside this intake boundary.", "V9.8 always returns pass_gold_allowed=false."}, WhyResultIsNotAuthority: []string{"Result intake is a boundary, not an authority-granting layer.", "Eligibility for review never grants authority automatically.", "V9.8 always returns authority_grant_allowed=false."}, WhyResultRequiresReview: []string{"External results are untrusted until independently reviewed.", "Claims must remain separate from verifiable evidence.", "Human review and revalidation are required by default."}, BlockedActions: clone(blockedActions), SafestNextSteps: []string{"request human review", "re-run independent validation", "verify PASS_GOLD and PASS_SECURE with real gates", "audit evidence before any promotion decision"}, RequiredGates: clone(requiredGates)}
}

func NormalizeResultIntake(input ResultIntakeInput) ResultIntakeInput {
	if input.Intake != nil {
		input = merge(input, *input.Intake)
	}
	if input.Result != nil {
		input = merge(input, *input.Result)
	}
	if input.Claims == nil {
		input.Claims = &ResultClaims{}
	}
	input.Claims.PassGold = input.Claims.PassGold || input.PassGold
	input.Claims.PassSecure = input.Claims.PassSecure || input.PassSecure
	input.Claims.PromotionAllowed = input.Claims.PromotionAllowed || input.PromotionAllowed
	input.Claims.DeployAllowed = input.Claims.DeployAllowed || input.DeployAllowed
	input.Claims.StatusPublishAllowed = input.Claims.StatusPublishAllowed || input.StatusPublishAllowed
	input.Claims.MutationAllowed = input.Claims.MutationAllowed || input.MutationAllowed
	input.Claims.MemoryWriteAllowed = input.Claims.MemoryWriteAllowed || input.MemoryWriteAllowed
	input.Claims.StablePromoted = input.Claims.StablePromoted || input.StablePromoted
	input.Claims.AuthorityGranted = input.Claims.AuthorityGranted || input.AuthorityGranted
	input.Claims.ResultTrustedWithoutReview = input.Claims.ResultTrustedWithoutReview || input.ResultTrustedWithoutReview
	return input
}

func EvaluateResultIntakeEligibility(input ResultIntakeInput) (bool, []string) {
	v := ValidateResultIntake(input)
	reasons := append(append([]string{}, v.MissingItems...), v.UnsafeClaims...)
	reasons = append(reasons, v.Conflicts...)
	return v.ResultIntakeValid && !v.ResultRejected, reasons
}

func missingItems(i ResultIntakeInput) []string {
	var m []string
	add := func(cond bool, item string) {
		if cond {
			m = append(m, item)
		}
	}
	add(strings.TrimSpace(i.IntakeID) == "", "intake_id")
	add(strings.TrimSpace(i.InvocationID) == "", "invocation_id")
	add(strings.TrimSpace(i.Executor) == "", "executor")
	add(strings.TrimSpace(i.ExecutorMode) == "", "executor_mode")
	add(strings.TrimSpace(i.ExecutorMode) != "external_only", "external_only")
	add(strings.TrimSpace(i.Project) == "", "project")
	add(strings.TrimSpace(i.Branch) == "", "branch")
	add(strings.TrimSpace(i.CommitSHA) == "", "commit_sha")
	add(strings.TrimSpace(i.Target) == "", "target")
	add(strings.TrimSpace(i.Environment) == "", "environment")
	add(!refOK(i.InvocationBoundary, "V9.7"), "invocation_boundary_reference")
	add(!refOK(i.HandoffPackage, "V9.6"), "handoff_package_reference")
	add(!refOK(i.FinalPreflight, "V9.5"), "final_preflight_reference")
	add(!refOK(i.AuthorizationManifest, "V9.4"), "authorization_manifest_reference")
	add(i.ResultPayload == nil || !i.ResultPayload.Present || !i.ResultPayload.ExternalOnly || i.ResultPayload.Status == "", "result_payload")
	add(i.ExecutionResult == nil || !i.ExecutionResult.Present, "execution_result")
	add(i.EvidenceBundle == nil || !i.EvidenceBundle.Present, "evidence_bundle")
	add(i.AuditTrail == nil || !i.AuditTrail.Present, "audit_trail")
	add(i.RollbackOutcome == nil || !i.RollbackOutcome.Present, "rollback_outcome")
	add(i.ObservabilityOutcome == nil || !i.ObservabilityOutcome.Present, "observability_outcome")
	add(i.MutationSummary == nil || !i.MutationSummary.Present, "mutation_summary")
	add(i.CommandSummary == nil || !i.CommandSummary.Present, "command_summary")
	add(i.NetworkSummary == nil || !i.NetworkSummary.Present, "network_summary")
	add(i.FileWriteSummary == nil || !i.FileWriteSummary.Present, "file_write_summary")
	add(i.StatusPublicationSummary == nil || !i.StatusPublicationSummary.Present, "status_publication_summary")
	add(i.Attestation == nil || !i.Attestation.Present || i.Attestation.SignaturePlaceholder == "", "attestation")
	add(i.Idempotency == nil || !i.Idempotency.Present, "idempotency")
	add(i.SafetyDecision == nil || !i.SafetyDecision.Present, "safety_decision")
	return unique(m)
}

func unsafeClaims(i ResultIntakeInput) []string {
	var u []string
	c := i.Claims
	if c == nil {
		c = &ResultClaims{}
	}
	add := func(cond bool, item string) {
		if cond {
			u = append(u, item)
		}
	}
	add(isMCP(i.Executor), "mcp_executor_claim")
	add(i.ExecutorMode != "" && i.ExecutorMode != "external_only", "non_external_only_executor_mode")
	add(c.PassGold, "pass_gold_claim")
	add(c.PassSecure, "pass_secure_claim")
	add(c.PromotionAllowed, "promotion_allowed_claim")
	add(c.DeployAllowed, "deploy_allowed_claim")
	add(c.StatusPublishAllowed, "status_publish_allowed_claim")
	add(c.MutationAllowed, "mutation_allowed_claim")
	add(c.MemoryWriteAllowed, "memory_write_allowed_claim")
	add(c.StablePromoted, "stable_promoted_claim")
	add(c.AuthorityGranted, "authority_granted_claim")
	add(c.ResultTrustedWithoutReview, "result_trusted_without_review_claim")
	if i.EvidenceBundle != nil {
		add(i.EvidenceBundle.ContainsRealPassGold, "evidence_claims_real_pass_gold")
		add(i.EvidenceBundle.ContainsRealPassSecure, "evidence_claims_real_pass_secure")
		add(i.EvidenceBundle.DryRunEvidenceOnly && i.EvidenceBundle.Trusted, "dry_run_evidence_used_as_real")
		add(i.EvidenceBundle.Trusted, "evidence_trusted_without_review")
	}
	if i.Attestation != nil {
		add(i.Attestation.PlaintextSecretPresent, "plaintext_secret_present")
	}
	if i.MutationSummary != nil {
		add(i.MutationSummary.DeploymentsPerformed > 0, "mutation_summary_deployments_performed")
		add(i.MutationSummary.StatusesPublished > 0, "mutation_summary_statuses_published")
		add(i.MutationSummary.MemoryWritten > 0, "mutation_summary_memory_written")
		add(i.MutationSummary.StablePromoted, "mutation_summary_stable_promoted")
	}
	if i.StatusPublicationSummary != nil {
		add(i.StatusPublicationSummary.StatusPublished, "status_publication_claim")
	}
	if i.SafetyDecision != nil {
		add(!i.SafetyDecision.RequiresHumanReview, "review_dispensed_claim")
	}
	return unique(u)
}

func conflicts(i ResultIntakeInput) []string {
	var c []string
	add := func(cond bool, item string) {
		if cond {
			c = append(c, item)
		}
	}
	if i.ResultPayload != nil {
		add(i.ResultPayload.InvocationID != "" && i.InvocationID != "" && i.ResultPayload.InvocationID != i.InvocationID, "result_payload_invocation_id_mismatch")
		add(i.ResultPayload.Executor != "" && i.Executor != "" && i.ResultPayload.Executor != i.Executor, "result_payload_executor_mismatch")
		add(i.ResultPayload.ExecutorMode != "" && i.ResultPayload.ExecutorMode != i.ExecutorMode, "result_payload_executor_mode_mismatch")
	}
	if i.Idempotency != nil {
		add(!i.Idempotency.InvocationIDMatched, "idempotency_invocation_id_not_matched")
	}
	if i.CommandSummary != nil {
		add((i.CommandSummary.CommandsExecuted || i.CommandSummary.CommandCount > 0) && !i.CommandSummary.ExecutorSideOnly, "command_summary_not_executor_side_only")
	}
	if i.NetworkSummary != nil {
		add((i.NetworkSummary.NetworkCallsMade || i.NetworkSummary.NetworkCallCount > 0) && !i.NetworkSummary.ExecutorSideOnly, "network_summary_not_executor_side_only")
	}
	if i.FileWriteSummary != nil {
		add((i.FileWriteSummary.FileWritesMade || i.FileWriteSummary.FileWriteCount > 0) && !i.FileWriteSummary.ExecutorSideOnly, "file_write_summary_not_executor_side_only")
	}
	if i.StatusPublicationSummary != nil {
		add(i.StatusPublicationSummary.StatusPublished && !i.StatusPublicationSummary.ExecutorSideOnly, "status_publication_inside_mcp_attempt")
	}
	return unique(c)
}

func refOK(r *BoundaryReference, version string) bool {
	return r != nil && r.Present && r.Valid && r.Version == version
}
func isMCP(s string) bool {
	v := strings.ToLower(strings.TrimSpace(s))
	return v == "mcp" || v == "mcp_readonly" || v == "mcp-readonly"
}
func hasTrustBypass(i ResultIntakeInput, u []string) bool {
	return containsAny(u, "result_trusted_without_review_claim", "evidence_trusted_without_review", "dry_run_evidence_used_as_real", "review_dispensed_claim") || (i.SafetyDecision != nil && !i.SafetyDecision.RequiresHumanReview)
}
func hasAutoPromotion(u []string) bool {
	return containsAny(u, "promotion_allowed_claim", "deploy_allowed_claim", "status_publish_allowed_claim", "mutation_allowed_claim", "memory_write_allowed_claim", "stable_promoted_claim", "authority_granted_claim", "mutation_summary_deployments_performed", "mutation_summary_statuses_published", "mutation_summary_memory_written", "mutation_summary_stable_promoted")
}
func containsAny(list []string, vals ...string) bool {
	for _, x := range list {
		for _, v := range vals {
			if x == v {
				return true
			}
		}
	}
	return false
}
func recommendations(m, u, c []string) []string {
	r := []string{"keep result intake read-only and dry-run", "require human review and independent revalidation", "do not grant PASS GOLD, PASS SECURE, authority, promotion, deployment, status publication, or memory writes from result intake"}
	if len(m) > 0 {
		r = append(r, "provide all required result intake items")
	}
	if len(u) > 0 {
		r = append(r, "remove unsafe claims and separate claims from evidence")
	}
	if len(c) > 0 {
		r = append(r, "resolve conflicting executor result metadata")
	}
	return r
}
func clone(in []string) []string { out := make([]string, len(in)); copy(out, in); return out }
func unique(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, v := range in {
		if !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}

func merge(base, nested ResultIntakeInput) ResultIntakeInput {
	if base.IntakeID == "" {
		base.IntakeID = nested.IntakeID
	}
	if base.InvocationID == "" {
		base.InvocationID = nested.InvocationID
	}
	if base.Executor == "" {
		base.Executor = nested.Executor
	}
	if base.ExecutorMode == "" {
		base.ExecutorMode = nested.ExecutorMode
	}
	if base.Project == "" {
		base.Project = nested.Project
	}
	if base.Branch == "" {
		base.Branch = nested.Branch
	}
	if base.CommitSHA == "" {
		base.CommitSHA = nested.CommitSHA
	}
	if base.Target == "" {
		base.Target = nested.Target
	}
	if base.Environment == "" {
		base.Environment = nested.Environment
	}
	if base.InvocationBoundary == nil {
		base.InvocationBoundary = nested.InvocationBoundary
	}
	if base.HandoffPackage == nil {
		base.HandoffPackage = nested.HandoffPackage
	}
	if base.FinalPreflight == nil {
		base.FinalPreflight = nested.FinalPreflight
	}
	if base.AuthorizationManifest == nil {
		base.AuthorizationManifest = nested.AuthorizationManifest
	}
	if base.ResultPayload == nil {
		base.ResultPayload = nested.ResultPayload
	}
	if base.ExecutionResult == nil {
		base.ExecutionResult = nested.ExecutionResult
	}
	if base.EvidenceBundle == nil {
		base.EvidenceBundle = nested.EvidenceBundle
	}
	if base.AuditTrail == nil {
		base.AuditTrail = nested.AuditTrail
	}
	if base.RollbackOutcome == nil {
		base.RollbackOutcome = nested.RollbackOutcome
	}
	if base.ObservabilityOutcome == nil {
		base.ObservabilityOutcome = nested.ObservabilityOutcome
	}
	if base.MutationSummary == nil {
		base.MutationSummary = nested.MutationSummary
	}
	if base.CommandSummary == nil {
		base.CommandSummary = nested.CommandSummary
	}
	if base.NetworkSummary == nil {
		base.NetworkSummary = nested.NetworkSummary
	}
	if base.FileWriteSummary == nil {
		base.FileWriteSummary = nested.FileWriteSummary
	}
	if base.StatusPublicationSummary == nil {
		base.StatusPublicationSummary = nested.StatusPublicationSummary
	}
	if base.Attestation == nil {
		base.Attestation = nested.Attestation
	}
	if base.Idempotency == nil {
		base.Idempotency = nested.Idempotency
	}
	if base.SafetyDecision == nil {
		base.SafetyDecision = nested.SafetyDecision
	}
	if base.Claims == nil {
		base.Claims = nested.Claims
	}
	base.PassGold = base.PassGold || nested.PassGold
	base.PassSecure = base.PassSecure || nested.PassSecure
	base.PromotionAllowed = base.PromotionAllowed || nested.PromotionAllowed
	base.DeployAllowed = base.DeployAllowed || nested.DeployAllowed
	base.StatusPublishAllowed = base.StatusPublishAllowed || nested.StatusPublishAllowed
	base.MutationAllowed = base.MutationAllowed || nested.MutationAllowed
	base.MemoryWriteAllowed = base.MemoryWriteAllowed || nested.MemoryWriteAllowed
	base.StablePromoted = base.StablePromoted || nested.StablePromoted
	base.AuthorityGranted = base.AuthorityGranted || nested.AuthorityGranted
	base.ResultTrustedWithoutReview = base.ResultTrustedWithoutReview || nested.ResultTrustedWithoutReview
	return base
}
