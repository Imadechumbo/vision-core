// Package authorityreview implements V9.9 External Result Authority Review Gate.
//
// The gate is read-only and dry-run. It reviews a V9.8 external result intake
// payload for structural readiness to enter a future authority review layer. It
// never grants authority, marks PASS GOLD/PASS SECURE, promotes stable, deploys,
// publishes status, writes memory, learns stable state, executes rollback,
// executes commands, calls networks, opens PRs, pushes, or writes files.
package authorityreview

import "strings"

const Version = "V9.9"

const (
	StatusReadyDryRun                = "authority_review_ready_dry_run"
	StatusIncomplete                 = "incomplete"
	StatusBlocked                    = "blocked"
	StatusUnsafeAutoGoldAttempt      = "unsafe_auto_gold_attempt"
	StatusUnsafeAuthorityGrant       = "unsafe_authority_grant_attempt"
	StatusUnsafeAutoPromotionAttempt = "unsafe_auto_promotion_attempt"
	StatusReviewRejected             = "review_rejected"
)

var requiredItems = []string{
	"review_id", "intake_id", "invocation_id", "executor", "executor_mode", "external_only", "project", "branch", "commit_sha", "target", "environment",
	"result_intake_valid", "result_eligible_for_authority_review", "evidence_bundle", "audit_trail", "safety_decision", "rollback_outcome",
	"observability_outcome", "mutation_summary", "command_summary", "network_summary", "file_write_summary", "status_publication_summary",
	"authority_requirements", "review_policy", "no_auto_gold_claim", "no_authority_grant_claim", "no_auto_promotion_claim", "no_memory_write_claim", "no_trust_without_review",
}

var forbiddenInsideMCP = []string{
	"mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "promote", "promote_stable", "deploy", "publish_status", "push", "PR", "open_pr",
	"mutate", "write_memory", "learn_stable", "trust_result_automatically", "bypass_human_review", "bypass_revalidation", "execute_rollback",
	"command_execution", "network_call", "file_write", "status_publication", "memory_persistence", "stable_promotion",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

// AuthorityReviewInput is the advisory V9.9 payload accepted by MCP tools.
type AuthorityReviewInput struct {
	Root                       string                   `json:"root,omitempty"`
	MissionInput               string                   `json:"mission_input,omitempty"`
	Operation                  string                   `json:"operation,omitempty"`
	AuthorityReview            *AuthorityReviewInput    `json:"authority_review,omitempty"`
	Review                     *AuthorityReviewInput    `json:"review,omitempty"`
	ReviewID                   string                   `json:"review_id,omitempty"`
	IntakeID                   string                   `json:"intake_id,omitempty"`
	InvocationID               string                   `json:"invocation_id,omitempty"`
	Executor                   string                   `json:"executor,omitempty"`
	ExecutorMode               string                   `json:"executor_mode,omitempty"`
	Project                    string                   `json:"project,omitempty"`
	Branch                     string                   `json:"branch,omitempty"`
	CommitSHA                  string                   `json:"commit_sha,omitempty"`
	Target                     string                   `json:"target,omitempty"`
	Environment                string                   `json:"environment,omitempty"`
	ResultIntake               *ResultIntakeReference   `json:"result_intake,omitempty"`
	EvidenceBundle             *AuthorityEvidenceReview `json:"evidence_bundle,omitempty"`
	AuditTrail                 *AuthorityAuditReview    `json:"audit_trail,omitempty"`
	SafetyDecision             *AuthoritySafetyReview   `json:"safety_decision,omitempty"`
	RollbackOutcome            map[string]interface{}   `json:"rollback_outcome,omitempty"`
	ObservabilityOutcome       map[string]interface{}   `json:"observability_outcome,omitempty"`
	MutationSummary            map[string]interface{}   `json:"mutation_summary,omitempty"`
	CommandSummary             map[string]interface{}   `json:"command_summary,omitempty"`
	NetworkSummary             map[string]interface{}   `json:"network_summary,omitempty"`
	FileWriteSummary           map[string]interface{}   `json:"file_write_summary,omitempty"`
	StatusPublicationSummary   map[string]interface{}   `json:"status_publication_summary,omitempty"`
	AuthorityRequirements      *AuthorityRequirements   `json:"authority_requirements,omitempty"`
	ReviewPolicy               *AuthorityReviewPolicy   `json:"review_policy,omitempty"`
	Claims                     *AuthorityReviewClaims   `json:"claims,omitempty"`
	Strict                     bool                     `json:"strict,omitempty"`
	PassGold                   bool                     `json:"pass_gold,omitempty"`
	PassSecure                 bool                     `json:"pass_secure,omitempty"`
	AuthorityGranted           bool                     `json:"authority_granted,omitempty"`
	PromotionAllowed           bool                     `json:"promotion_allowed,omitempty"`
	DeployAllowed              bool                     `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed       bool                     `json:"status_publish_allowed,omitempty"`
	MutationAllowed            bool                     `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed         bool                     `json:"memory_write_allowed,omitempty"`
	StablePromoted             bool                     `json:"stable_promoted,omitempty"`
	ResultTrustedWithoutReview bool                     `json:"result_trusted_without_review,omitempty"`
	ReviewBypassed             bool                     `json:"review_bypassed,omitempty"`
	HumanReviewSkipped         bool                     `json:"human_review_skipped,omitempty"`
	RevalidationSkipped        bool                     `json:"revalidation_skipped,omitempty"`
}

type ResultIntakeReference struct {
	Present                          bool   `json:"present"`
	Version                          string `json:"version,omitempty"`
	IntakeID                         string `json:"intake_id,omitempty"`
	IntakeStatus                     string `json:"intake_status,omitempty"`
	ResultIntakeValid                bool   `json:"result_intake_valid"`
	ResultRequiresHumanReview        bool   `json:"result_requires_human_review"`
	ResultRequiresRevalidation       bool   `json:"result_requires_revalidation"`
	ResultEligibleForAuthorityReview bool   `json:"result_eligible_for_authority_review"`
	ResultRejected                   bool   `json:"result_rejected"`
	Valid                            bool   `json:"valid"`
}

type AuthorityEvidenceReview struct {
	Present                   bool   `json:"present"`
	EvidenceID                string `json:"evidence_id,omitempty"`
	ContainsExecutorLogs      bool   `json:"contains_executor_logs"`
	ContainsDiffSummary       bool   `json:"contains_diff_summary"`
	ContainsValidationSummary bool   `json:"contains_validation_summary"`
	ContainsSecuritySummary   bool   `json:"contains_security_summary"`
	ContainsRealPassGold      bool   `json:"contains_real_pass_gold"`
	ContainsRealPassSecure    bool   `json:"contains_real_pass_secure"`
	DryRunEvidenceOnly        bool   `json:"dry_run_evidence_only"`
	Trusted                   bool   `json:"trusted"`
	SufficientForReview       bool   `json:"sufficient_for_review"`
	Valid                     bool   `json:"valid"`
}

type AuthorityAuditReview struct {
	Present                 bool   `json:"present"`
	AuditID                 string `json:"audit_id,omitempty"`
	RecordsInvocationID     bool   `json:"records_invocation_id"`
	RecordsExecutor         bool   `json:"records_executor"`
	RecordsInputs           bool   `json:"records_inputs"`
	RecordsOutputs          bool   `json:"records_outputs"`
	RecordsStartedFinished  bool   `json:"records_started_finished"`
	RecordsDecisions        bool   `json:"records_decisions"`
	ImmutableTargetDeclared bool   `json:"immutable_target_declared"`
	SufficientForReview     bool   `json:"sufficient_for_review"`
	Valid                   bool   `json:"valid"`
}

type AuthoritySafetyReview struct {
	Present                    bool     `json:"present"`
	Decision                   string   `json:"decision,omitempty"`
	RequiresHumanReview        bool     `json:"requires_human_review"`
	RequiresRevalidation       bool     `json:"requires_revalidation"`
	EligibleForAuthorityReview bool     `json:"eligible_for_authority_review"`
	Rejected                   bool     `json:"rejected"`
	Reasons                    []string `json:"reasons,omitempty"`
	Valid                      bool     `json:"valid"`
}

type AuthorityReviewPolicy struct {
	Present                   bool `json:"present"`
	RequireHumanReview        bool `json:"require_human_review"`
	RequireRevalidation       bool `json:"require_revalidation"`
	RequireRealPassGoldGate   bool `json:"require_real_pass_gold_gate"`
	RequireRealPassSecureGate bool `json:"require_real_pass_secure_gate"`
	RejectAutoGoldClaims      bool `json:"reject_auto_gold_claims"`
	RejectAutoPromotionClaims bool `json:"reject_auto_promotion_claims"`
	RejectMemoryWriteClaims   bool `json:"reject_memory_write_claims"`
	RejectTrustWithoutReview  bool `json:"reject_trust_without_review"`
	Valid                     bool `json:"valid"`
}

type AuthorityRequirements struct {
	Present                 bool `json:"present"`
	RequiresPassGoldReal    bool `json:"requires_pass_gold_real"`
	RequiresPassSecureReal  bool `json:"requires_pass_secure_real"`
	RequiresEvidenceBundle  bool `json:"requires_evidence_bundle"`
	RequiresAuditTrail      bool `json:"requires_audit_trail"`
	RequiresSafetyDecision  bool `json:"requires_safety_decision"`
	RequiresNoAutoPromotion bool `json:"requires_no_auto_promotion"`
	RequiresNoMemoryWrite   bool `json:"requires_no_memory_write"`
	RequiresNoTrustBypass   bool `json:"requires_no_trust_bypass"`
	Valid                   bool `json:"valid"`
}

type AuthorityReviewClaims struct {
	PassGold                   bool `json:"pass_gold"`
	PassSecure                 bool `json:"pass_secure"`
	AuthorityGranted           bool `json:"authority_granted"`
	PromotionAllowed           bool `json:"promotion_allowed"`
	DeployAllowed              bool `json:"deploy_allowed"`
	StatusPublishAllowed       bool `json:"status_publish_allowed"`
	MutationAllowed            bool `json:"mutation_allowed"`
	MemoryWriteAllowed         bool `json:"memory_write_allowed"`
	StablePromoted             bool `json:"stable_promoted"`
	ResultTrustedWithoutReview bool `json:"result_trusted_without_review"`
	ReviewBypassed             bool `json:"review_bypassed"`
	HumanReviewSkipped         bool `json:"human_review_skipped"`
	RevalidationSkipped        bool `json:"revalidation_skipped"`
}

type AuthorityReviewResult struct {
	Version                            string                   `json:"version"`
	DryRun                             bool                     `json:"dry_run"`
	ReadOnly                           bool                     `json:"read_only"`
	ReviewID                           string                   `json:"review_id,omitempty"`
	ReviewStatus                       string                   `json:"review_status"`
	AuthorityReviewValid               bool                     `json:"authority_review_valid"`
	AuthorityReviewReadyDryRun         bool                     `json:"authority_review_ready_dry_run"`
	RequiresHumanReview                bool                     `json:"requires_human_review"`
	RequiresRevalidation               bool                     `json:"requires_revalidation"`
	EligibleForFutureAuthorityDecision bool                     `json:"eligible_for_future_authority_decision"`
	Rejected                           bool                     `json:"rejected"`
	IntakeID                           string                   `json:"intake_id,omitempty"`
	InvocationID                       string                   `json:"invocation_id,omitempty"`
	Executor                           string                   `json:"executor,omitempty"`
	ExecutorMode                       string                   `json:"executor_mode,omitempty"`
	Project                            string                   `json:"project,omitempty"`
	Branch                             string                   `json:"branch,omitempty"`
	CommitSHA                          string                   `json:"commit_sha,omitempty"`
	Target                             string                   `json:"target,omitempty"`
	Environment                        string                   `json:"environment,omitempty"`
	ResultIntake                       *ResultIntakeReference   `json:"result_intake,omitempty"`
	EvidenceBundle                     *AuthorityEvidenceReview `json:"evidence_bundle,omitempty"`
	AuditTrail                         *AuthorityAuditReview    `json:"audit_trail,omitempty"`
	SafetyDecision                     *AuthoritySafetyReview   `json:"safety_decision,omitempty"`
	RollbackOutcome                    map[string]interface{}   `json:"rollback_outcome,omitempty"`
	ObservabilityOutcome               map[string]interface{}   `json:"observability_outcome,omitempty"`
	MutationSummary                    map[string]interface{}   `json:"mutation_summary,omitempty"`
	CommandSummary                     map[string]interface{}   `json:"command_summary,omitempty"`
	NetworkSummary                     map[string]interface{}   `json:"network_summary,omitempty"`
	FileWriteSummary                   map[string]interface{}   `json:"file_write_summary,omitempty"`
	StatusPublicationSummary           map[string]interface{}   `json:"status_publication_summary,omitempty"`
	AuthorityRequirements              *AuthorityRequirements   `json:"authority_requirements,omitempty"`
	ReviewPolicy                       *AuthorityReviewPolicy   `json:"review_policy,omitempty"`
	MissingItems                       []string                 `json:"missing_items"`
	UnsafeClaims                       []string                 `json:"unsafe_claims"`
	Conflicts                          []string                 `json:"conflicts"`
	MCPExecutionAllowed                bool                     `json:"mcp_execution_allowed"`
	PassGoldAllowed                    bool                     `json:"pass_gold_allowed"`
	PassSecureAllowed                  bool                     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed              bool                     `json:"authority_grant_allowed"`
	PromotionAllowed                   bool                     `json:"promotion_allowed"`
	DeployAllowed                      bool                     `json:"deploy_allowed"`
	StatusPublishAllowed               bool                     `json:"status_publish_allowed"`
	MutationAllowed                    bool                     `json:"mutation_allowed"`
	MemoryWriteAllowed                 bool                     `json:"memory_write_allowed"`
	StablePromotionAllowed             bool                     `json:"stable_promotion_allowed"`
	TrustWithoutReviewAllowed          bool                     `json:"trust_without_review_allowed"`
	Recommendations                    []string                 `json:"recommendations"`
}

type AuthorityReviewValidation struct {
	Version                            string   `json:"version"`
	DryRun                             bool     `json:"dry_run"`
	ReadOnly                           bool     `json:"read_only"`
	Valid                              bool     `json:"valid"`
	Blocked                            bool     `json:"blocked"`
	ReviewStatus                       string   `json:"review_status"`
	AuthorityReviewReadyDryRun         bool     `json:"authority_review_ready_dry_run"`
	EligibleForFutureAuthorityDecision bool     `json:"eligible_for_future_authority_decision"`
	RequiresHumanReview                bool     `json:"requires_human_review"`
	RequiresRevalidation               bool     `json:"requires_revalidation"`
	Rejected                           bool     `json:"rejected"`
	MissingItems                       []string `json:"missing_items"`
	UnsafeClaims                       []string `json:"unsafe_claims"`
	Conflicts                          []string `json:"conflicts"`
	RequiredItems                      []string `json:"required_items"`
	PassGoldAllowed                    bool     `json:"pass_gold_allowed"`
	PassSecureAllowed                  bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed              bool     `json:"authority_grant_allowed"`
	PromotionAllowed                   bool     `json:"promotion_allowed"`
	DeployAllowed                      bool     `json:"deploy_allowed"`
	StatusPublishAllowed               bool     `json:"status_publish_allowed"`
	MutationAllowed                    bool     `json:"mutation_allowed"`
	MemoryWriteAllowed                 bool     `json:"memory_write_allowed"`
	StablePromotionAllowed             bool     `json:"stable_promotion_allowed"`
	TrustWithoutReviewAllowed          bool     `json:"trust_without_review_allowed"`
	Recommendations                    []string `json:"recommendations"`
}

type AuthorityReviewAudit struct {
	Version                        string   `json:"version"`
	DryRun                         bool     `json:"dry_run"`
	ReadOnly                       bool     `json:"read_only"`
	ConflictsFound                 bool     `json:"conflicts_found"`
	Conflicts                      []string `json:"conflicts"`
	UnsafeClaimsFound              bool     `json:"unsafe_claims_found"`
	UnsafeClaims                   []string `json:"unsafe_claims"`
	MissingItemsFound              bool     `json:"missing_items_found"`
	MissingItems                   []string `json:"missing_items"`
	AutoGoldAttemptFound           bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound     bool     `json:"authority_grant_attempt_found"`
	AutoPromotionAttemptFound      bool     `json:"auto_promotion_attempt_found"`
	MemoryWriteAttemptFound        bool     `json:"memory_write_attempt_found"`
	TrustBypassAttemptFound        bool     `json:"trust_bypass_attempt_found"`
	ReviewBypassAttemptFound       bool     `json:"review_bypass_attempt_found"`
	RevalidationBypassAttemptFound bool     `json:"revalidation_bypass_attempt_found"`
	Recommendations                []string `json:"recommendations"`
}

type AuthorityReviewBoundary struct {
	Version                           string   `json:"version"`
	DryRun                            bool     `json:"dry_run"`
	ReadOnly                          bool     `json:"read_only"`
	MCPScope                          []string `json:"mcp_scope"`
	ExternalExecutorScope             []string `json:"external_executor_scope"`
	AuthorityScope                    []string `json:"authority_scope"`
	ForbiddenInsideMCP                []string `json:"forbidden_inside_mcp"`
	RequiredBeforeAuthorityReview     []string `json:"required_before_authority_review"`
	AllowedOnlyInFutureAuthorityLayer []string `json:"allowed_only_in_future_authority_layer"`
	RequiredReviewItems               []string `json:"required_review_items"`
}

type AuthorityReviewExplain struct {
	Version                  string   `json:"version"`
	DryRun                   bool     `json:"dry_run"`
	ReadOnly                 bool     `json:"read_only"`
	Summary                  string   `json:"summary"`
	ReviewModel              []string `json:"review_model"`
	RequiredItems            []string `json:"required_items"`
	WhyReviewIsNotPassGold   []string `json:"why_review_is_not_pass_gold"`
	WhyReviewIsNotAuthority  []string `json:"why_review_is_not_authority"`
	WhyReviewCannotPromote   []string `json:"why_review_cannot_promote"`
	WhyHumanReviewIsRequired []string `json:"why_human_review_is_required"`
	BlockedActions           []string `json:"blocked_actions"`
	SafestNextSteps          []string `json:"safest_next_steps"`
	RequiredGates            []string `json:"required_gates"`
}

func BuildAuthorityReview(input AuthorityReviewInput) AuthorityReviewResult {
	input = NormalizeAuthorityReview(input)
	v := ValidateAuthorityReview(input)
	status := v.ReviewStatus
	valid := v.Valid
	ready := valid && status == StatusReadyDryRun
	return AuthorityReviewResult{
		Version: Version, DryRun: true, ReadOnly: true, ReviewID: input.ReviewID, ReviewStatus: status,
		AuthorityReviewValid: valid, AuthorityReviewReadyDryRun: ready, RequiresHumanReview: true, RequiresRevalidation: true,
		EligibleForFutureAuthorityDecision: valid && !v.Rejected, Rejected: v.Rejected, IntakeID: input.IntakeID, InvocationID: input.InvocationID,
		Executor: input.Executor, ExecutorMode: input.ExecutorMode, Project: input.Project, Branch: input.Branch, CommitSHA: input.CommitSHA,
		Target: input.Target, Environment: input.Environment, ResultIntake: input.ResultIntake, EvidenceBundle: input.EvidenceBundle, AuditTrail: input.AuditTrail,
		SafetyDecision: input.SafetyDecision, RollbackOutcome: input.RollbackOutcome, ObservabilityOutcome: input.ObservabilityOutcome, MutationSummary: input.MutationSummary,
		CommandSummary: input.CommandSummary, NetworkSummary: input.NetworkSummary, FileWriteSummary: input.FileWriteSummary, StatusPublicationSummary: input.StatusPublicationSummary,
		AuthorityRequirements: input.AuthorityRequirements, ReviewPolicy: input.ReviewPolicy, MissingItems: v.MissingItems, UnsafeClaims: v.UnsafeClaims, Conflicts: v.Conflicts,
		MCPExecutionAllowed: false, PassGoldAllowed: false, PassSecureAllowed: false, AuthorityGrantAllowed: false, PromotionAllowed: false, DeployAllowed: false,
		StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, StablePromotionAllowed: false, TrustWithoutReviewAllowed: false,
		Recommendations: v.Recommendations,
	}
}

func ValidateAuthorityReview(input AuthorityReviewInput) AuthorityReviewValidation {
	input = NormalizeAuthorityReview(input)
	missing, unsafe, conflicts := evaluateProblems(input)
	rejected := (input.ResultIntake != nil && input.ResultIntake.ResultRejected) || (input.SafetyDecision != nil && input.SafetyDecision.Rejected)
	status := reviewStatus(missing, unsafe, conflicts, rejected)
	valid := len(missing) == 0 && len(unsafe) == 0 && len(conflicts) == 0 && !rejected
	return AuthorityReviewValidation{
		Version: Version, DryRun: true, ReadOnly: true, Valid: valid, Blocked: !valid, ReviewStatus: status,
		AuthorityReviewReadyDryRun: valid, EligibleForFutureAuthorityDecision: valid && !rejected, RequiresHumanReview: true, RequiresRevalidation: true,
		Rejected: rejected, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, RequiredItems: append([]string{}, requiredItems...),
		PassGoldAllowed: false, PassSecureAllowed: false, AuthorityGrantAllowed: false, PromotionAllowed: false, DeployAllowed: false,
		StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, StablePromotionAllowed: false, TrustWithoutReviewAllowed: false,
		Recommendations: recommendations(missing, unsafe, conflicts, rejected),
	}
}

func BuildAuthorityReviewBoundary() AuthorityReviewBoundary {
	return AuthorityReviewBoundary{
		Version: Version, DryRun: true, ReadOnly: true,
		MCPScope:                          []string{"read", "validate", "audit", "explain", "simulate_authority_review_gate"},
		ExternalExecutorScope:             []string{"provide_result_intake_reference", "provide_evidence_bundle", "provide_audit_trail", "provide_safety_decision", "provide_summaries"},
		AuthorityScope:                    []string{"future_authority_layer_may_consume_review_as_input_only", "V9.9_does_not_implement_real_authority", "V9.9_does_not_implement_real_PASS_GOLD", "V9.9_does_not_implement_promotion", "V9.9_does_not_implement_persistence", "V9.9_does_not_implement_status_publication"},
		ForbiddenInsideMCP:                append([]string{}, forbiddenInsideMCP...),
		RequiredBeforeAuthorityReview:     []string{"valid_V9.8_result_intake", "human_review_required", "revalidation_required", "evidence_bundle", "audit_trail", "safety_decision", "no_unsafe_claims"},
		AllowedOnlyInFutureAuthorityLayer: []string{"real_PASS_GOLD_evaluation", "real_PASS_SECURE_evaluation", "authority_decision", "stable_promotion_decision"},
		RequiredReviewItems:               append([]string{}, requiredItems...),
	}
}

func AuditAuthorityReview(input AuthorityReviewInput) AuthorityReviewAudit {
	input = NormalizeAuthorityReview(input)
	missing, unsafe, conflicts := evaluateProblems(input)
	autoGold := hasAny(unsafe, "pass_gold", "pass_secure")
	authority := hasAny(unsafe, "authority_granted")
	autoPromotion := hasAny(unsafe, "promotion_allowed", "deploy_allowed", "status_publish_allowed", "mutation_allowed", "stable_promoted")
	memory := hasAny(unsafe, "memory_write_allowed")
	trust := hasAny(unsafe, "result_trusted_without_review")
	reviewBypass := hasAny(unsafe, "review_bypassed", "human_review_skipped")
	revalidationBypass := hasAny(unsafe, "revalidation_skipped")
	return AuthorityReviewAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(conflicts) > 0, Conflicts: conflicts,
		UnsafeClaimsFound: len(unsafe) > 0, UnsafeClaims: unsafe, MissingItemsFound: len(missing) > 0, MissingItems: missing,
		AutoGoldAttemptFound: autoGold, AuthorityGrantAttemptFound: authority, AutoPromotionAttemptFound: autoPromotion, MemoryWriteAttemptFound: memory,
		TrustBypassAttemptFound: trust, ReviewBypassAttemptFound: reviewBypass, RevalidationBypassAttemptFound: revalidationBypass,
		Recommendations: recommendations(missing, unsafe, conflicts, false)}
}

func ExplainAuthorityReview(input AuthorityReviewInput) AuthorityReviewExplain {
	return AuthorityReviewExplain{Version: Version, DryRun: true, ReadOnly: true,
		Summary:                  "V9.9 reviews an ingested external executor result for structural readiness to enter a future authority review; it does not grant authority or promote anything.",
		ReviewModel:              []string{"read-only MCP intake", "validate required result intake, evidence, audit, safety, and summaries", "detect unsafe claims and trust bypass attempts", "return authority_review_ready_dry_run only as advisory readiness"},
		RequiredItems:            append([]string{}, requiredItems...),
		WhyReviewIsNotPassGold:   []string{"The gate is dry-run evidence triage only.", "PASS GOLD must be decided by a real PASS GOLD gate, never by external result intake or MCP review."},
		WhyReviewIsNotAuthority:  []string{"The gate produces advisory readiness only.", "Authority can only be decided by a future authority layer using this review as one input."},
		WhyReviewCannotPromote:   []string{"Promotion, deployment, status publication, mutation, memory writes, and stable learning are forbidden in V9.9.", "A ready review still sets all action allowances to false."},
		WhyHumanReviewIsRequired: []string{"External results are untrusted until independent human review and revalidation occur.", "The gate always returns requires_human_review=true and requires_revalidation=true."},
		BlockedActions:           append([]string{}, forbiddenInsideMCP...),
		SafestNextSteps:          []string{"Collect missing evidence and audit records.", "Run independent validation and security review.", "Submit the dry-run review to a future authority layer only after PASS GOLD and PASS SECURE gates are real."},
		RequiredGates:            append([]string{}, requiredGates...),
	}
}

func NormalizeAuthorityReview(input AuthorityReviewInput) AuthorityReviewInput {
	if input.AuthorityReview != nil {
		input = mergeInput(input, *input.AuthorityReview)
	}
	if input.Review != nil {
		input = mergeInput(input, *input.Review)
	}
	if input.Claims == nil {
		input.Claims = &AuthorityReviewClaims{}
	}
	input.Claims.PassGold = input.Claims.PassGold || input.PassGold
	input.Claims.PassSecure = input.Claims.PassSecure || input.PassSecure
	input.Claims.AuthorityGranted = input.Claims.AuthorityGranted || input.AuthorityGranted
	input.Claims.PromotionAllowed = input.Claims.PromotionAllowed || input.PromotionAllowed
	input.Claims.DeployAllowed = input.Claims.DeployAllowed || input.DeployAllowed
	input.Claims.StatusPublishAllowed = input.Claims.StatusPublishAllowed || input.StatusPublishAllowed
	input.Claims.MutationAllowed = input.Claims.MutationAllowed || input.MutationAllowed
	input.Claims.MemoryWriteAllowed = input.Claims.MemoryWriteAllowed || input.MemoryWriteAllowed
	input.Claims.StablePromoted = input.Claims.StablePromoted || input.StablePromoted
	input.Claims.ResultTrustedWithoutReview = input.Claims.ResultTrustedWithoutReview || input.ResultTrustedWithoutReview
	input.Claims.ReviewBypassed = input.Claims.ReviewBypassed || input.ReviewBypassed
	input.Claims.HumanReviewSkipped = input.Claims.HumanReviewSkipped || input.HumanReviewSkipped
	input.Claims.RevalidationSkipped = input.Claims.RevalidationSkipped || input.RevalidationSkipped
	return input
}

func EvaluateAuthorityReviewEligibility(input AuthorityReviewInput) (bool, []string) {
	v := ValidateAuthorityReview(input)
	if v.Valid {
		return true, []string{"external result is structurally ready for future authority review only"}
	}
	reasons := append([]string{}, v.MissingItems...)
	reasons = append(reasons, v.UnsafeClaims...)
	reasons = append(reasons, v.Conflicts...)
	return false, reasons
}

func evaluateProblems(input AuthorityReviewInput) ([]string, []string, []string) {
	var missing, unsafe, conflicts []string
	check := func(cond bool, item string) {
		if cond {
			missing = appendUnique(missing, item)
		}
	}
	check(strings.TrimSpace(input.ReviewID) == "", "review_id")
	check(strings.TrimSpace(input.IntakeID) == "", "intake_id")
	check(strings.TrimSpace(input.InvocationID) == "", "invocation_id")
	check(strings.TrimSpace(input.Executor) == "", "executor")
	if isMCP(input.Executor) {
		conflicts = appendUnique(conflicts, "executor_must_not_be_mcp")
	}
	check(strings.TrimSpace(input.ExecutorMode) == "", "executor_mode")
	if input.ExecutorMode != "" && input.ExecutorMode != "external_only" {
		conflicts = appendUnique(conflicts, "executor_mode_must_be_external_only")
	}
	check(strings.TrimSpace(input.Project) == "", "project")
	check(strings.TrimSpace(input.Branch) == "", "branch")
	check(strings.TrimSpace(input.CommitSHA) == "", "commit_sha")
	check(strings.TrimSpace(input.Target) == "", "target")
	check(strings.TrimSpace(input.Environment) == "", "environment")
	if input.ResultIntake == nil || !input.ResultIntake.Present {
		missing = appendUnique(missing, "result_intake")
	} else {
		if !input.ResultIntake.ResultIntakeValid || !input.ResultIntake.Valid {
			missing = appendUnique(missing, "result_intake_valid")
		}
		if !input.ResultIntake.ResultEligibleForAuthorityReview {
			missing = appendUnique(missing, "result_eligible_for_authority_review")
		}
		if input.ResultIntake.ResultRejected {
			conflicts = appendUnique(conflicts, "result_intake_rejected")
		}
	}
	if input.EvidenceBundle == nil || !input.EvidenceBundle.Present {
		missing = appendUnique(missing, "evidence_bundle")
	} else {
		if !input.EvidenceBundle.SufficientForReview {
			missing = appendUnique(missing, "evidence_bundle.sufficient_for_review")
		}
		if input.EvidenceBundle.DryRunEvidenceOnly && input.EvidenceBundle.Trusted {
			conflicts = appendUnique(conflicts, "dry_run_evidence_used_as_real")
		}
	}
	if input.AuditTrail == nil || !input.AuditTrail.Present {
		missing = appendUnique(missing, "audit_trail")
	} else if !input.AuditTrail.SufficientForReview {
		missing = appendUnique(missing, "audit_trail.sufficient_for_review")
	}
	if input.SafetyDecision == nil || !input.SafetyDecision.Present {
		missing = appendUnique(missing, "safety_decision")
	} else {
		if !input.SafetyDecision.RequiresHumanReview {
			conflicts = appendUnique(conflicts, "safety_decision.requires_human_review")
		}
		if !input.SafetyDecision.RequiresRevalidation {
			conflicts = appendUnique(conflicts, "safety_decision.requires_revalidation")
		}
		if input.SafetyDecision.Rejected {
			conflicts = appendUnique(conflicts, "safety_decision.rejected")
		}
	}
	check(input.RollbackOutcome == nil, "rollback_outcome")
	check(input.ObservabilityOutcome == nil, "observability_outcome")
	check(input.MutationSummary == nil, "mutation_summary")
	check(input.CommandSummary == nil, "command_summary")
	check(input.NetworkSummary == nil, "network_summary")
	check(input.FileWriteSummary == nil, "file_write_summary")
	check(input.StatusPublicationSummary == nil, "status_publication_summary")
	if input.AuthorityRequirements == nil || !input.AuthorityRequirements.Present {
		missing = appendUnique(missing, "authority_requirements")
	} else if !requirementsValid(input.AuthorityRequirements) {
		missing = appendUnique(missing, "authority_requirements.valid")
	}
	if input.ReviewPolicy == nil || !input.ReviewPolicy.Present {
		missing = appendUnique(missing, "review_policy")
	} else if !policyValid(input.ReviewPolicy) {
		missing = appendUnique(missing, "review_policy.valid")
	}
	c := input.Claims
	if c != nil {
		if c.PassGold {
			unsafe = appendUnique(unsafe, "pass_gold")
		}
		if c.PassSecure {
			unsafe = appendUnique(unsafe, "pass_secure")
		}
		if c.AuthorityGranted {
			unsafe = appendUnique(unsafe, "authority_granted")
		}
		if c.PromotionAllowed {
			unsafe = appendUnique(unsafe, "promotion_allowed")
		}
		if c.DeployAllowed {
			unsafe = appendUnique(unsafe, "deploy_allowed")
		}
		if c.StatusPublishAllowed {
			unsafe = appendUnique(unsafe, "status_publish_allowed")
		}
		if c.MutationAllowed {
			unsafe = appendUnique(unsafe, "mutation_allowed")
		}
		if c.MemoryWriteAllowed {
			unsafe = appendUnique(unsafe, "memory_write_allowed")
		}
		if c.StablePromoted {
			unsafe = appendUnique(unsafe, "stable_promoted")
		}
		if c.ResultTrustedWithoutReview {
			unsafe = appendUnique(unsafe, "result_trusted_without_review")
		}
		if c.ReviewBypassed {
			unsafe = appendUnique(unsafe, "review_bypassed")
		}
		if c.HumanReviewSkipped {
			unsafe = appendUnique(unsafe, "human_review_skipped")
		}
		if c.RevalidationSkipped {
			unsafe = appendUnique(unsafe, "revalidation_skipped")
		}
	}
	if isMCP(input.Executor) {
		if c != nil && c.StatusPublishAllowed {
			conflicts = appendUnique(conflicts, "payload_attempts_status_publication_inside_mcp")
		}
		if c != nil && c.MemoryWriteAllowed {
			conflicts = appendUnique(conflicts, "payload_attempts_memory_write_inside_mcp")
		}
		if c != nil && c.AuthorityGranted {
			conflicts = appendUnique(conflicts, "payload_attempts_authority_inside_mcp")
		}
	}
	return missing, unsafe, conflicts
}

func reviewStatus(missing, unsafe, conflicts []string, rejected bool) string {
	if hasAny(unsafe, "pass_gold", "pass_secure") {
		return StatusUnsafeAutoGoldAttempt
	}
	if hasAny(unsafe, "authority_granted") {
		return StatusUnsafeAuthorityGrant
	}
	if hasAny(unsafe, "promotion_allowed", "deploy_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "stable_promoted") {
		return StatusUnsafeAutoPromotionAttempt
	}
	if rejected {
		return StatusReviewRejected
	}
	if len(unsafe) > 0 || len(conflicts) > 0 {
		return StatusBlocked
	}
	if len(missing) > 0 {
		return StatusIncomplete
	}
	return StatusReadyDryRun
}

func requirementsValid(r *AuthorityRequirements) bool {
	return r.RequiresPassGoldReal && r.RequiresPassSecureReal && r.RequiresEvidenceBundle && r.RequiresAuditTrail && r.RequiresSafetyDecision && r.RequiresNoAutoPromotion && r.RequiresNoMemoryWrite && r.RequiresNoTrustBypass
}
func policyValid(p *AuthorityReviewPolicy) bool {
	return p.RequireHumanReview && p.RequireRevalidation && p.RequireRealPassGoldGate && p.RequireRealPassSecureGate && p.RejectAutoGoldClaims && p.RejectAutoPromotionClaims && p.RejectMemoryWriteClaims && p.RejectTrustWithoutReview
}
func isMCP(executor string) bool {
	e := strings.ToLower(strings.TrimSpace(executor))
	return e == "mcp" || e == "mcp_readonly" || e == "mcp-readonly"
}
func hasAny(items []string, needles ...string) bool {
	for _, n := range needles {
		for _, it := range items {
			if it == n {
				return true
			}
		}
	}
	return false
}
func appendUnique(items []string, item string) []string {
	for _, it := range items {
		if it == item {
			return items
		}
	}
	return append(items, item)
}
func recommendations(missing, unsafe, conflicts []string, rejected bool) []string {
	out := []string{"keep V9.9 read-only and dry-run", "do not grant authority, PASS GOLD, PASS SECURE, promotion, deployment, status publication, mutation, or memory writes"}
	if len(missing) > 0 {
		out = append(out, "supply all missing review items before future authority review")
	}
	if len(unsafe) > 0 {
		out = append(out, "remove unsafe claims from external result payload")
	}
	if len(conflicts) > 0 {
		out = append(out, "resolve authority review conflicts before continuing")
	}
	if rejected {
		out = append(out, "do not continue rejected result intake without new independent review")
	}
	return out
}

func mergeInput(base, nested AuthorityReviewInput) AuthorityReviewInput {
	if base.ReviewID == "" {
		base.ReviewID = nested.ReviewID
	}
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
	if base.ResultIntake == nil {
		base.ResultIntake = nested.ResultIntake
	}
	if base.EvidenceBundle == nil {
		base.EvidenceBundle = nested.EvidenceBundle
	}
	if base.AuditTrail == nil {
		base.AuditTrail = nested.AuditTrail
	}
	if base.SafetyDecision == nil {
		base.SafetyDecision = nested.SafetyDecision
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
	if base.AuthorityRequirements == nil {
		base.AuthorityRequirements = nested.AuthorityRequirements
	}
	if base.ReviewPolicy == nil {
		base.ReviewPolicy = nested.ReviewPolicy
	}
	if base.Claims == nil {
		base.Claims = nested.Claims
	}
	return base
}
