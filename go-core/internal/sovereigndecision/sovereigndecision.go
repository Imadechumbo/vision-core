// Package sovereigndecision implements V10.0 Sovereign Promotion Decision Kernel.
//
// The kernel is read-only and dry-run. It evaluates whether a reviewed external
// result can be a future promotion candidate. It never promotes, deploys,
// publishes status, writes memory, learns stable state, grants authority, marks
// PASS GOLD/PASS SECURE, opens PRs, pushes, calls networks, executes commands,
// or mutates files.
package sovereigndecision

import "strings"

const Version = "V10.0"

const (
	StatusCandidateReadyDryRun        = "promotion_candidate_ready_dry_run"
	StatusIncomplete                  = "incomplete"
	StatusBlocked                     = "blocked"
	StatusMissingRealGates            = "missing_real_gates"
	StatusHumanApprovalRequired       = "human_approval_required"
	StatusRevalidationRequired        = "revalidation_required"
	StatusRiskBlocked                 = "risk_blocked"
	StatusUnsafeAutoGoldAttempt       = "unsafe_auto_gold_attempt"
	StatusUnsafeAuthorityGrantAttempt = "unsafe_authority_grant_attempt"
	StatusUnsafeAutoPromotionAttempt  = "unsafe_auto_promotion_attempt"
)

var requiredItems = []string{
	"decision_id", "review_id", "intake_id", "invocation_id", "executor", "executor_mode", "external_only", "project", "branch", "commit_sha", "target", "environment",
	"authority_review_valid", "authority_review_ready_dry_run", "result_intake_valid", "evidence_bundle_sufficient", "audit_trail_sufficient", "PASS_GOLD_REAL", "PASS_SECURE_REAL",
	"promotion_requirements", "risk_assessment", "rollback_requirements", "observability_requirements", "human_approval", "sovereign_policy",
	"no_auto_gold_claim", "no_authority_grant_claim", "no_auto_promotion_claim", "no_deploy_claim", "no_status_publish_claim", "no_memory_write_claim", "no_stable_learning_claim", "no_trust_without_review",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var forbiddenInsideMCP = []string{
	"mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "promote", "promote_stable", "deploy", "publish_status", "push", "PR", "open_pr", "mutate", "write_memory", "learn_stable",
	"trust_result_automatically", "bypass_human_review", "bypass_revalidation", "execute_rollback", "command_execution", "network_call", "file_write", "status_publication", "memory_persistence", "stable_promotion",
}

type SovereignDecisionInput struct {
	Root                       string                              `json:"root,omitempty"`
	MissionInput               string                              `json:"mission_input,omitempty"`
	Operation                  string                              `json:"operation,omitempty"`
	SovereignDecision          *SovereignDecisionInput             `json:"sovereign_decision,omitempty"`
	Decision                   *SovereignDecisionInput             `json:"decision,omitempty"`
	DecisionID                 string                              `json:"decision_id,omitempty"`
	ReviewID                   string                              `json:"review_id,omitempty"`
	IntakeID                   string                              `json:"intake_id,omitempty"`
	InvocationID               string                              `json:"invocation_id,omitempty"`
	Executor                   string                              `json:"executor,omitempty"`
	ExecutorMode               string                              `json:"executor_mode,omitempty"`
	Project                    string                              `json:"project,omitempty"`
	Branch                     string                              `json:"branch,omitempty"`
	CommitSHA                  string                              `json:"commit_sha,omitempty"`
	Target                     string                              `json:"target,omitempty"`
	Environment                string                              `json:"environment,omitempty"`
	AuthorityReview            *AuthorityReviewReference           `json:"authority_review,omitempty"`
	ResultIntake               *SovereignResultIntakeReference     `json:"result_intake,omitempty"`
	EvidenceBundle             *SovereignEvidence                  `json:"evidence_bundle,omitempty"`
	AuditTrail                 *SovereignAuditTrail                `json:"audit_trail,omitempty"`
	SafetyDecision             map[string]interface{}              `json:"safety_decision,omitempty"`
	RealGates                  []SovereignRealGate                 `json:"real_gates,omitempty"`
	PromotionRequirements      *PromotionRequirements              `json:"promotion_requirements,omitempty"`
	RiskAssessment             *SovereignRiskAssessment            `json:"risk_assessment,omitempty"`
	RollbackRequirements       *SovereignRollbackRequirements      `json:"rollback_requirements,omitempty"`
	ObservabilityRequirements  *SovereignObservabilityRequirements `json:"observability_requirements,omitempty"`
	HumanApproval              *HumanApproval                      `json:"human_approval,omitempty"`
	Policy                     *SovereignPolicy                    `json:"policy,omitempty"`
	Claims                     *SovereignClaims                    `json:"claims,omitempty"`
	Strict                     bool                                `json:"strict,omitempty"`
	PassGold                   bool                                `json:"pass_gold,omitempty"`
	PassSecure                 bool                                `json:"pass_secure,omitempty"`
	AuthorityGranted           bool                                `json:"authority_granted,omitempty"`
	PromotionAllowed           bool                                `json:"promotion_allowed,omitempty"`
	DeployAllowed              bool                                `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed       bool                                `json:"status_publish_allowed,omitempty"`
	MutationAllowed            bool                                `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed         bool                                `json:"memory_write_allowed,omitempty"`
	StablePromoted             bool                                `json:"stable_promoted,omitempty"`
	LearnedAsStable            bool                                `json:"learned_as_stable,omitempty"`
	ResultTrustedWithoutReview bool                                `json:"result_trusted_without_review,omitempty"`
	HumanApprovalBypassed      bool                                `json:"human_approval_bypassed,omitempty"`
	RevalidationBypassed       bool                                `json:"revalidation_bypassed,omitempty"`
}

type AuthorityReviewReference struct {
	Present                            bool   `json:"present"`
	Version                            string `json:"version,omitempty"`
	ReviewID                           string `json:"review_id,omitempty"`
	ReviewStatus                       string `json:"review_status,omitempty"`
	AuthorityReviewValid               bool   `json:"authority_review_valid"`
	AuthorityReviewReadyDryRun         bool   `json:"authority_review_ready_dry_run"`
	RequiresHumanReview                bool   `json:"requires_human_review"`
	RequiresRevalidation               bool   `json:"requires_revalidation"`
	EligibleForFutureAuthorityDecision bool   `json:"eligible_for_future_authority_decision"`
	Rejected                           bool   `json:"rejected"`
	Valid                              bool   `json:"valid"`
}

type SovereignResultIntakeReference struct {
	Present                          bool   `json:"present"`
	Version                          string `json:"version,omitempty"`
	IntakeID                         string `json:"intake_id,omitempty"`
	ResultIntakeValid                bool   `json:"result_intake_valid"`
	ResultRequiresHumanReview        bool   `json:"result_requires_human_review"`
	ResultRequiresRevalidation       bool   `json:"result_requires_revalidation"`
	ResultEligibleForAuthorityReview bool   `json:"result_eligible_for_authority_review"`
	ResultRejected                   bool   `json:"result_rejected"`
	Valid                            bool   `json:"valid"`
}

type SovereignEvidence struct {
	Present                   bool   `json:"present"`
	EvidenceID                string `json:"evidence_id,omitempty"`
	ContainsExecutorLogs      bool   `json:"contains_executor_logs"`
	ContainsDiffSummary       bool   `json:"contains_diff_summary"`
	ContainsValidationSummary bool   `json:"contains_validation_summary"`
	ContainsSecuritySummary   bool   `json:"contains_security_summary"`
	ContainsRealPassGold      bool   `json:"contains_real_pass_gold"`
	ContainsRealPassSecure    bool   `json:"contains_real_pass_secure"`
	Trusted                   bool   `json:"trusted"`
	SufficientForDecision     bool   `json:"sufficient_for_decision"`
	DryRunEvidenceOnly        bool   `json:"dry_run_evidence_only"`
	Valid                     bool   `json:"valid"`
}

type SovereignAuditTrail struct {
	Present                 bool   `json:"present"`
	AuditID                 string `json:"audit_id,omitempty"`
	RecordsInvocationID     bool   `json:"records_invocation_id"`
	RecordsExecutor         bool   `json:"records_executor"`
	RecordsInputs           bool   `json:"records_inputs"`
	RecordsOutputs          bool   `json:"records_outputs"`
	RecordsStartedFinished  bool   `json:"records_started_finished"`
	RecordsDecisions        bool   `json:"records_decisions"`
	ImmutableTargetDeclared bool   `json:"immutable_target_declared"`
	SufficientForDecision   bool   `json:"sufficient_for_decision"`
	Valid                   bool   `json:"valid"`
}

type SovereignRealGate struct {
	Gate                  string `json:"gate"`
	Status                string `json:"status"`
	RealEvidence          bool   `json:"real_evidence"`
	Source                string `json:"source,omitempty"`
	ArtifactID            string `json:"artifact_id,omitempty"`
	RecognizedByAuthority bool   `json:"recognized_by_authority"`
	DryRun                bool   `json:"dry_run"`
	Synthesized           bool   `json:"synthesized"`
	Valid                 bool   `json:"valid"`
}

type PromotionRequirements struct {
	Present                      bool `json:"present"`
	RequiresPassGoldReal         bool `json:"requires_pass_gold_real"`
	RequiresPassSecureReal       bool `json:"requires_pass_secure_real"`
	RequiresAuthorityReviewValid bool `json:"requires_authority_review_valid"`
	RequiresResultIntakeValid    bool `json:"requires_result_intake_valid"`
	RequiresEvidenceBundle       bool `json:"requires_evidence_bundle"`
	RequiresAuditTrail           bool `json:"requires_audit_trail"`
	RequiresHumanApproval        bool `json:"requires_human_approval"`
	RequiresRevalidation         bool `json:"requires_revalidation"`
	RequiresRollbackPlan         bool `json:"requires_rollback_plan"`
	RequiresObservability        bool `json:"requires_observability"`
	RequiresNoUnsafeClaims       bool `json:"requires_no_unsafe_claims"`
	Valid                        bool `json:"valid"`
}

type SovereignRiskAssessment struct {
	Present                bool     `json:"present"`
	RiskLevel              string   `json:"risk_level,omitempty"`
	CriticalRisks          int      `json:"critical_risks"`
	HighRisks              int      `json:"high_risks"`
	MediumRisks            int      `json:"medium_risks"`
	LowRisks               int      `json:"low_risks"`
	BlockingRisks          []string `json:"blocking_risks,omitempty"`
	AcceptableForCandidate bool     `json:"acceptable_for_candidate"`
	Valid                  bool     `json:"valid"`
}

type SovereignRollbackRequirements struct {
	Present                    bool `json:"present"`
	RollbackRequired           bool `json:"rollback_required"`
	RollbackPlanPresent        bool `json:"rollback_plan_present"`
	SnapshotRequired           bool `json:"snapshot_required"`
	ValidationRequired         bool `json:"validation_required"`
	ManualInterventionRequired bool `json:"manual_intervention_required"`
	Valid                      bool `json:"valid"`
}

type SovereignObservabilityRequirements struct {
	Present              bool `json:"present"`
	HealthChecksRequired bool `json:"health_checks_required"`
	MetricsRequired      bool `json:"metrics_required"`
	LogsRequired         bool `json:"logs_required"`
	AlertingRequired     bool `json:"alerting_required"`
	WatchWindowSeconds   int  `json:"watch_window_seconds"`
	Valid                bool `json:"valid"`
}

type HumanApproval struct {
	Present               bool   `json:"present"`
	Required              bool   `json:"required"`
	Approved              bool   `json:"approved"`
	Approver              string `json:"approver,omitempty"`
	ApprovalReference     string `json:"approval_reference,omitempty"`
	ApprovalIsPlaceholder bool   `json:"approval_is_placeholder"`
	Valid                 bool   `json:"valid"`
}

type SovereignPolicy struct {
	Present                     bool `json:"present"`
	RejectAutoGoldClaims        bool `json:"reject_auto_gold_claims"`
	RejectAutoAuthorityClaims   bool `json:"reject_auto_authority_claims"`
	RejectAutoPromotionClaims   bool `json:"reject_auto_promotion_claims"`
	RejectMemoryWriteClaims     bool `json:"reject_memory_write_claims"`
	RejectStablePromotionClaims bool `json:"reject_stable_promotion_claims"`
	RejectTrustWithoutReview    bool `json:"reject_trust_without_review"`
	RequireRealPassGoldGate     bool `json:"require_real_pass_gold_gate"`
	RequireRealPassSecureGate   bool `json:"require_real_pass_secure_gate"`
	RequireHumanApproval        bool `json:"require_human_approval"`
	RequireRevalidation         bool `json:"require_revalidation"`
	Valid                       bool `json:"valid"`
}

type SovereignClaims struct {
	PassGold                   bool `json:"pass_gold"`
	PassSecure                 bool `json:"pass_secure"`
	AuthorityGranted           bool `json:"authority_granted"`
	PromotionAllowed           bool `json:"promotion_allowed"`
	DeployAllowed              bool `json:"deploy_allowed"`
	StatusPublishAllowed       bool `json:"status_publish_allowed"`
	MutationAllowed            bool `json:"mutation_allowed"`
	MemoryWriteAllowed         bool `json:"memory_write_allowed"`
	StablePromoted             bool `json:"stable_promoted"`
	LearnedAsStable            bool `json:"learned_as_stable"`
	ResultTrustedWithoutReview bool `json:"result_trusted_without_review"`
	HumanApprovalBypassed      bool `json:"human_approval_bypassed"`
	RevalidationBypassed       bool `json:"revalidation_bypassed"`
}

type SovereignDecisionResult struct {
	Version                          string                              `json:"version"`
	DryRun                           bool                                `json:"dry_run"`
	ReadOnly                         bool                                `json:"read_only"`
	DecisionID                       string                              `json:"decision_id,omitempty"`
	DecisionStatus                   string                              `json:"decision_status"`
	SovereignDecisionStatus          string                              `json:"sovereign_decision_status"`
	SovereignDecisionValid           bool                                `json:"sovereign_decision_valid"`
	PromotionDecisionCandidate       bool                                `json:"promotion_decision_candidate"`
	CandidateScore                   int                                 `json:"candidate_score"`
	CandidateConfidence              string                              `json:"candidate_confidence"`
	Blocked                          bool                                `json:"blocked"`
	BlockingReasons                  []string                            `json:"blocking_reasons"`
	RequiredEvidence                 []string                            `json:"required_evidence"`
	RequiredRealGates                []string                            `json:"required_real_gates"`
	RequiredHumanActions             []string                            `json:"required_human_actions"`
	RiskSummary                      []string                            `json:"risk_summary"`
	AuthorityReviewSummary           []string                            `json:"authority_review_summary"`
	PromotionDecisionRecommendations []string                            `json:"promotion_decision_recommendations"`
	ReviewID                         string                              `json:"review_id,omitempty"`
	IntakeID                         string                              `json:"intake_id,omitempty"`
	InvocationID                     string                              `json:"invocation_id,omitempty"`
	Executor                         string                              `json:"executor,omitempty"`
	ExecutorMode                     string                              `json:"executor_mode,omitempty"`
	Project                          string                              `json:"project,omitempty"`
	Branch                           string                              `json:"branch,omitempty"`
	CommitSHA                        string                              `json:"commit_sha,omitempty"`
	Target                           string                              `json:"target,omitempty"`
	Environment                      string                              `json:"environment,omitempty"`
	AuthorityReview                  *AuthorityReviewReference           `json:"authority_review,omitempty"`
	ResultIntake                     *SovereignResultIntakeReference     `json:"result_intake,omitempty"`
	EvidenceBundle                   *SovereignEvidence                  `json:"evidence_bundle,omitempty"`
	AuditTrail                       *SovereignAuditTrail                `json:"audit_trail,omitempty"`
	RealGates                        []SovereignRealGate                 `json:"real_gates,omitempty"`
	PromotionRequirements            *PromotionRequirements              `json:"promotion_requirements,omitempty"`
	RiskAssessment                   *SovereignRiskAssessment            `json:"risk_assessment,omitempty"`
	RollbackRequirements             *SovereignRollbackRequirements      `json:"rollback_requirements,omitempty"`
	ObservabilityRequirements        *SovereignObservabilityRequirements `json:"observability_requirements,omitempty"`
	HumanApproval                    *HumanApproval                      `json:"human_approval,omitempty"`
	Policy                           *SovereignPolicy                    `json:"policy,omitempty"`
	MissingItems                     []string                            `json:"missing_items"`
	UnsafeClaims                     []string                            `json:"unsafe_claims"`
	Conflicts                        []string                            `json:"conflicts"`
	MCPExecutionAllowed              bool                                `json:"mcp_execution_allowed"`
	PassGoldAllowed                  bool                                `json:"pass_gold_allowed"`
	PassSecureAllowed                bool                                `json:"pass_secure_allowed"`
	AuthorityGrantAllowed            bool                                `json:"authority_grant_allowed"`
	PromotionAllowed                 bool                                `json:"promotion_allowed"`
	DeployAllowed                    bool                                `json:"deploy_allowed"`
	StatusPublishAllowed             bool                                `json:"status_publish_allowed"`
	MutationAllowed                  bool                                `json:"mutation_allowed"`
	MemoryWriteAllowed               bool                                `json:"memory_write_allowed"`
	StablePromotionAllowed           bool                                `json:"stable_promotion_allowed"`
	LearningAllowed                  bool                                `json:"learning_allowed"`
	TrustWithoutReviewAllowed        bool                                `json:"trust_without_review_allowed"`
	Recommendations                  []string                            `json:"recommendations"`
}

type SovereignDecisionValidation struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	Valid                      bool     `json:"valid"`
	Blocked                    bool     `json:"blocked"`
	DecisionStatus             string   `json:"decision_status"`
	SovereignDecisionValid     bool     `json:"sovereign_decision_valid"`
	PromotionDecisionCandidate bool     `json:"promotion_decision_candidate"`
	MissingItems               []string `json:"missing_items"`
	UnsafeClaims               []string `json:"unsafe_claims"`
	Conflicts                  []string `json:"conflicts"`
	BlockingReasons            []string `json:"blocking_reasons"`
	RequiredItems              []string `json:"required_items"`
	RequiredRealGates          []string `json:"required_real_gates"`
	RequiredHumanActions       []string `json:"required_human_actions"`
	PassGoldAllowed            bool     `json:"pass_gold_allowed"`
	PassSecureAllowed          bool     `json:"pass_secure_allowed"`
	AuthorityGrantAllowed      bool     `json:"authority_grant_allowed"`
	PromotionAllowed           bool     `json:"promotion_allowed"`
	DeployAllowed              bool     `json:"deploy_allowed"`
	StatusPublishAllowed       bool     `json:"status_publish_allowed"`
	MutationAllowed            bool     `json:"mutation_allowed"`
	MemoryWriteAllowed         bool     `json:"memory_write_allowed"`
	StablePromotionAllowed     bool     `json:"stable_promotion_allowed"`
	LearningAllowed            bool     `json:"learning_allowed"`
	TrustWithoutReviewAllowed  bool     `json:"trust_without_review_allowed"`
	Recommendations            []string `json:"recommendations"`
}

type SovereignDecisionAudit struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	ConflictsFound                  bool     `json:"conflicts_found"`
	Conflicts                       []string `json:"conflicts"`
	UnsafeClaimsFound               bool     `json:"unsafe_claims_found"`
	UnsafeClaims                    []string `json:"unsafe_claims"`
	MissingItemsFound               bool     `json:"missing_items_found"`
	MissingItems                    []string `json:"missing_items"`
	AutoGoldAttemptFound            bool     `json:"auto_gold_attempt_found"`
	AuthorityGrantAttemptFound      bool     `json:"authority_grant_attempt_found"`
	AutoPromotionAttemptFound       bool     `json:"auto_promotion_attempt_found"`
	DeployAttemptFound              bool     `json:"deploy_attempt_found"`
	StatusPublishAttemptFound       bool     `json:"status_publish_attempt_found"`
	MemoryWriteAttemptFound         bool     `json:"memory_write_attempt_found"`
	StableLearningAttemptFound      bool     `json:"stable_learning_attempt_found"`
	TrustBypassAttemptFound         bool     `json:"trust_bypass_attempt_found"`
	HumanApprovalBypassAttemptFound bool     `json:"human_approval_bypass_attempt_found"`
	RevalidationBypassAttemptFound  bool     `json:"revalidation_bypass_attempt_found"`
	DryRunGateClaimFound            bool     `json:"dry_run_gate_claim_found"`
	SynthesizedGateClaimFound       bool     `json:"synthesized_gate_claim_found"`
	Recommendations                 []string `json:"recommendations"`
}

type SovereignDecisionBoundary struct {
	Version                           string   `json:"version"`
	DryRun                            bool     `json:"dry_run"`
	ReadOnly                          bool     `json:"read_only"`
	MCPScope                          []string `json:"mcp_scope"`
	AuthorityScope                    []string `json:"authority_scope"`
	PromotionScope                    []string `json:"promotion_scope"`
	ForbiddenInsideMCP                []string `json:"forbidden_inside_mcp"`
	RequiredBeforeCandidateDecision   []string `json:"required_before_candidate_decision"`
	AllowedOnlyInFuturePromotionLayer []string `json:"allowed_only_in_future_promotion_layer"`
	RequiredDecisionItems             []string `json:"required_decision_items"`
}

type SovereignDecisionExplain struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	Summary                    string   `json:"summary"`
	DecisionModel              []string `json:"decision_model"`
	RequiredItems              []string `json:"required_items"`
	WhyDecisionIsNotPassGold   []string `json:"why_decision_is_not_pass_gold"`
	WhyDecisionIsNotAuthority  []string `json:"why_decision_is_not_authority"`
	WhyDecisionCannotPromote   []string `json:"why_decision_cannot_promote"`
	WhyCandidateIsOnlyAdvisory []string `json:"why_candidate_is_only_advisory"`
	BlockedActions             []string `json:"blocked_actions"`
	SafestNextSteps            []string `json:"safest_next_steps"`
	RequiredGates              []string `json:"required_gates"`
}

func NormalizeSovereignDecision(input SovereignDecisionInput) SovereignDecisionInput {
	if input.SovereignDecision != nil {
		input = mergeInput(input, *input.SovereignDecision)
	}
	if input.Decision != nil {
		input = mergeInput(input, *input.Decision)
	}
	if input.Claims == nil {
		input.Claims = &SovereignClaims{}
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
	input.Claims.LearnedAsStable = input.Claims.LearnedAsStable || input.LearnedAsStable
	input.Claims.ResultTrustedWithoutReview = input.Claims.ResultTrustedWithoutReview || input.ResultTrustedWithoutReview
	input.Claims.HumanApprovalBypassed = input.Claims.HumanApprovalBypassed || input.HumanApprovalBypassed
	input.Claims.RevalidationBypassed = input.Claims.RevalidationBypassed || input.RevalidationBypassed
	return input
}

func mergeInput(base, nested SovereignDecisionInput) SovereignDecisionInput {
	if base.DecisionID == "" {
		base.DecisionID = nested.DecisionID
	}
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
	if base.AuthorityReview == nil {
		base.AuthorityReview = nested.AuthorityReview
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
	if len(base.RealGates) == 0 {
		base.RealGates = nested.RealGates
	}
	if base.PromotionRequirements == nil {
		base.PromotionRequirements = nested.PromotionRequirements
	}
	if base.RiskAssessment == nil {
		base.RiskAssessment = nested.RiskAssessment
	}
	if base.RollbackRequirements == nil {
		base.RollbackRequirements = nested.RollbackRequirements
	}
	if base.ObservabilityRequirements == nil {
		base.ObservabilityRequirements = nested.ObservabilityRequirements
	}
	if base.HumanApproval == nil {
		base.HumanApproval = nested.HumanApproval
	}
	if base.Policy == nil {
		base.Policy = nested.Policy
	}
	if base.Claims == nil {
		base.Claims = nested.Claims
	}
	return base
}

func BuildSovereignDecision(input SovereignDecisionInput) SovereignDecisionResult {
	input = NormalizeSovereignDecision(input)
	v := ValidateSovereignDecision(input)
	valid := v.Valid && !v.Blocked
	score := candidateScore(v)
	status := v.DecisionStatus
	if valid {
		status = StatusCandidateReadyDryRun
	}
	return SovereignDecisionResult{
		Version: Version, DryRun: true, ReadOnly: true, DecisionID: input.DecisionID, DecisionStatus: status, SovereignDecisionStatus: status,
		SovereignDecisionValid: valid, PromotionDecisionCandidate: valid, CandidateScore: score, CandidateConfidence: confidence(score), Blocked: !valid,
		BlockingReasons: v.BlockingReasons, RequiredEvidence: requiredEvidence(v.MissingItems), RequiredRealGates: clone(requiredGates), RequiredHumanActions: v.RequiredHumanActions,
		RiskSummary: riskSummary(input), AuthorityReviewSummary: authoritySummary(input), PromotionDecisionRecommendations: recommendationsFor(v),
		ReviewID: input.ReviewID, IntakeID: input.IntakeID, InvocationID: input.InvocationID, Executor: input.Executor, ExecutorMode: input.ExecutorMode, Project: input.Project,
		Branch: input.Branch, CommitSHA: input.CommitSHA, Target: input.Target, Environment: input.Environment, AuthorityReview: input.AuthorityReview, ResultIntake: input.ResultIntake,
		EvidenceBundle: input.EvidenceBundle, AuditTrail: input.AuditTrail, RealGates: input.RealGates, PromotionRequirements: input.PromotionRequirements,
		RiskAssessment: input.RiskAssessment, RollbackRequirements: input.RollbackRequirements, ObservabilityRequirements: input.ObservabilityRequirements, HumanApproval: input.HumanApproval, Policy: input.Policy,
		MissingItems: v.MissingItems, UnsafeClaims: v.UnsafeClaims, Conflicts: v.Conflicts, Recommendations: v.Recommendations,
	}
}

func ValidateSovereignDecision(input SovereignDecisionInput) SovereignDecisionValidation {
	input = NormalizeSovereignDecision(input)
	missing, unsafe, conflicts, blocking, humanActions := []string{}, []string{}, []string{}, []string{}, []string{}
	addMissing := func(s string) { missing = appendUnique(missing, s); blocking = appendUnique(blocking, s) }
	addUnsafe := func(s string) { unsafe = appendUnique(unsafe, s); blocking = appendUnique(blocking, s) }
	addConflict := func(s string) { conflicts = appendUnique(conflicts, s); blocking = appendUnique(blocking, s) }

	if input.DecisionID == "" {
		addMissing("decision_id")
	}
	if input.ReviewID == "" {
		addMissing("review_id")
	}
	if input.IntakeID == "" {
		addMissing("intake_id")
	}
	if input.InvocationID == "" {
		addMissing("invocation_id")
	}
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
	if input.Project == "" {
		addMissing("project")
	}
	if input.Branch == "" {
		addMissing("branch")
	}
	if input.CommitSHA == "" {
		addMissing("commit_sha")
	}
	if input.Target == "" {
		addMissing("target")
	}
	if input.Environment == "" {
		addMissing("environment")
	}

	if input.AuthorityReview == nil || !input.AuthorityReview.Present || !input.AuthorityReview.Valid || input.AuthorityReview.Rejected {
		addMissing("authority_review")
	} else {
		if !input.AuthorityReview.AuthorityReviewValid {
			addMissing("authority_review_valid")
		}
		if !input.AuthorityReview.AuthorityReviewReadyDryRun {
			addMissing("authority_review_ready_dry_run")
		}
	}
	if input.ResultIntake == nil || !input.ResultIntake.Present || !input.ResultIntake.Valid || input.ResultIntake.ResultRejected {
		addMissing("result_intake")
	} else if !input.ResultIntake.ResultIntakeValid {
		addMissing("result_intake_valid")
	}
	if input.EvidenceBundle == nil || !input.EvidenceBundle.Present {
		addMissing("evidence_bundle")
	} else {
		if !input.EvidenceBundle.SufficientForDecision {
			addMissing("evidence_bundle_sufficient")
		}
		if input.EvidenceBundle.DryRunEvidenceOnly {
			addConflict("dry_run_evidence_used_as_real")
		}
	}
	if input.AuditTrail == nil || !input.AuditTrail.Present {
		addMissing("audit_trail")
	} else if !input.AuditTrail.SufficientForDecision {
		addMissing("audit_trail_sufficient")
	}
	gateGold, gateSecure := false, false
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
		if !g.RealEvidence {
			addConflict(gate + "_missing_real_evidence")
		}
		if strings.ToLower(g.Status) != "pass" {
			addConflict(gate + "_status_not_pass")
		}
		good := g.RealEvidence && !g.DryRun && !g.Synthesized && g.RecognizedByAuthority && strings.ToLower(g.Status) == "pass"
		if gate == "PASS_GOLD" && good {
			gateGold = true
		}
		if gate == "PASS_SECURE" && good {
			gateSecure = true
		}
	}
	if !gateGold {
		addMissing("PASS_GOLD_REAL")
	}
	if !gateSecure {
		addMissing("PASS_SECURE_REAL")
	}
	if input.PromotionRequirements == nil || !input.PromotionRequirements.Present {
		addMissing("promotion_requirements")
	}
	if input.RiskAssessment == nil || !input.RiskAssessment.Present {
		addMissing("risk_assessment")
	} else {
		if !input.RiskAssessment.AcceptableForCandidate {
			addConflict("risk_assessment_not_acceptable_for_candidate")
		}
		if input.RiskAssessment.CriticalRisks > 0 {
			addConflict("critical_risks_present")
		}
		if input.RiskAssessment.HighRisks > 0 && len(input.RiskAssessment.BlockingRisks) > 0 {
			addConflict("blocking_high_risks_present")
		}
	}
	if input.RollbackRequirements == nil || !input.RollbackRequirements.Present {
		addMissing("rollback_requirements")
	}
	if input.ObservabilityRequirements == nil || !input.ObservabilityRequirements.Present {
		addMissing("observability_requirements")
	}
	if input.Policy == nil || !input.Policy.Present {
		addMissing("sovereign_policy")
	}
	requireHuman := (input.Policy != nil && input.Policy.RequireHumanApproval) || (input.PromotionRequirements != nil && input.PromotionRequirements.RequiresHumanApproval)
	if requireHuman {
		if input.HumanApproval == nil || !input.HumanApproval.Present || !input.HumanApproval.Approved {
			addMissing("human_approval")
			humanActions = appendUnique(humanActions, "provide_real_human_approval")
		} else if input.HumanApproval.ApprovalIsPlaceholder {
			addConflict("human_approval_placeholder")
		}
	}
	if input.Policy != nil && input.Policy.RequireRevalidation {
		if input.AuthorityReview == nil || !input.AuthorityReview.RequiresRevalidation {
			addConflict("independent_revalidation_required")
		}
	}

	if input.Claims != nil {
		if input.Claims.PassGold {
			addUnsafe("pass_gold")
		}
		if input.Claims.PassSecure {
			addUnsafe("pass_secure")
		}
		if input.Claims.AuthorityGranted {
			addUnsafe("authority_granted")
		}
		if input.Claims.PromotionAllowed {
			addUnsafe("promotion_allowed")
		}
		if input.Claims.DeployAllowed {
			addUnsafe("deploy_allowed")
		}
		if input.Claims.StatusPublishAllowed {
			addUnsafe("status_publish_allowed")
		}
		if input.Claims.MutationAllowed {
			addUnsafe("mutation_allowed")
		}
		if input.Claims.MemoryWriteAllowed {
			addUnsafe("memory_write_allowed")
		}
		if input.Claims.StablePromoted {
			addUnsafe("stable_promoted")
		}
		if input.Claims.LearnedAsStable {
			addUnsafe("learned_as_stable")
		}
		if input.Claims.ResultTrustedWithoutReview {
			addUnsafe("result_trusted_without_review")
		}
		if input.Claims.HumanApprovalBypassed {
			addUnsafe("human_approval_bypassed")
		}
		if input.Claims.RevalidationBypassed {
			addUnsafe("revalidation_bypassed")
		}
	}
	status := decisionStatus(missing, unsafe, conflicts, input)
	valid := len(missing) == 0 && len(unsafe) == 0 && len(conflicts) == 0
	return SovereignDecisionValidation{Version: Version, DryRun: true, ReadOnly: true, Valid: valid, Blocked: !valid, DecisionStatus: status, SovereignDecisionValid: valid,
		PromotionDecisionCandidate: valid, MissingItems: missing, UnsafeClaims: unsafe, Conflicts: conflicts, BlockingReasons: blocking, RequiredItems: clone(requiredItems), RequiredRealGates: clone(requiredGates), RequiredHumanActions: humanActions, Recommendations: recommendations(missing, unsafe, conflicts)}
}

func BuildSovereignDecisionBoundary() SovereignDecisionBoundary {
	return SovereignDecisionBoundary{Version: Version, DryRun: true, ReadOnly: true,
		MCPScope:           []string{"read", "validate", "audit", "explain", "simulate_sovereign_promotion_decision"},
		AuthorityScope:     []string{"consume_v9_9_authority_review", "cross_check_review_only", "never_grant_authority"},
		PromotionScope:     []string{"candidate_true_is_advisory_input_only", "future_promotion_layer_must_require_real_PASS_GOLD_and_PASS_SECURE", "V10.0_does_not_promote"},
		ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeCandidateDecision: clone(requiredItems),
		AllowedOnlyInFuturePromotionLayer: []string{"consume_candidate_true_as_input", "run_real_promotion_gates", "perform_real_authority_decision_outside_MCP", "promote_only_after_real_PASS_GOLD_PASS_SECURE_and_human_approval"},
		RequiredDecisionItems:             clone(requiredItems)}
}

func AuditSovereignDecision(input SovereignDecisionInput) SovereignDecisionAudit {
	input = NormalizeSovereignDecision(input)
	v := ValidateSovereignDecision(input)
	a := SovereignDecisionAudit{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(v.Conflicts) > 0, Conflicts: v.Conflicts, UnsafeClaimsFound: len(v.UnsafeClaims) > 0, UnsafeClaims: v.UnsafeClaims, MissingItemsFound: len(v.MissingItems) > 0, MissingItems: v.MissingItems, Recommendations: v.Recommendations}
	if input.Claims != nil {
		a.AutoGoldAttemptFound = input.Claims.PassGold || input.Claims.PassSecure
		a.AuthorityGrantAttemptFound = input.Claims.AuthorityGranted
		a.AutoPromotionAttemptFound = input.Claims.PromotionAllowed || input.Claims.MutationAllowed
		a.DeployAttemptFound = input.Claims.DeployAllowed
		a.StatusPublishAttemptFound = input.Claims.StatusPublishAllowed
		a.MemoryWriteAttemptFound = input.Claims.MemoryWriteAllowed
		a.StableLearningAttemptFound = input.Claims.StablePromoted || input.Claims.LearnedAsStable
		a.TrustBypassAttemptFound = input.Claims.ResultTrustedWithoutReview
		a.HumanApprovalBypassAttemptFound = input.Claims.HumanApprovalBypassed
		a.RevalidationBypassAttemptFound = input.Claims.RevalidationBypassed
	}
	for _, g := range input.RealGates {
		a.DryRunGateClaimFound = a.DryRunGateClaimFound || g.DryRun
		a.SynthesizedGateClaimFound = a.SynthesizedGateClaimFound || g.Synthesized
	}
	return a
}

func ExplainSovereignDecision(input SovereignDecisionInput) SovereignDecisionExplain {
	return SovereignDecisionExplain{Version: Version, DryRun: true, ReadOnly: true,
		Summary:                    "V10.0 Sovereign Promotion Decision Kernel is a read-only dry-run advisory layer that computes future promotion candidacy after result intake and authority review.",
		DecisionModel:              []string{"normalize input without inventing missing artifacts", "validate authority review and result intake", "require real PASS_GOLD/PASS_SECURE evidence", "reject unsafe claims and bypasses", "emit candidate=true only as advisory"},
		RequiredItems:              clone(requiredItems),
		WhyDecisionIsNotPassGold:   []string{"The decision consumes PASS GOLD evidence but never marks PASS GOLD real.", "PASS GOLD must come from an independent real gate outside this MCP kernel."},
		WhyDecisionIsNotAuthority:  []string{"The kernel reviews authority signals but cannot grant authority.", "Authority requires a future real authority layer and cannot be synthesized by decision output."},
		WhyDecisionCannotPromote:   []string{"MCP scope is read-only/dry-run.", "promotion_allowed, deploy_allowed, status_publish_allowed, memory_write_allowed and stable_promotion_allowed are always false."},
		WhyCandidateIsOnlyAdvisory: []string{"candidate=true is an input for a future promotion layer, never a final authorization.", "Real PASS GOLD, PASS SECURE, human approval, and revalidation remain mandatory."},
		BlockedActions:             clone(forbiddenInsideMCP), SafestNextSteps: []string{"collect missing evidence", "run independent real PASS_GOLD and PASS_SECURE gates", "obtain real human approval", "perform independent revalidation outside MCP before any future promotion"}, RequiredGates: clone(requiredGates)}
}

func EvaluateSovereignDecisionEligibility(input SovereignDecisionInput) (bool, []string) {
	v := ValidateSovereignDecision(input)
	if v.Valid && !v.Blocked {
		return true, []string{"external reviewed result is structurally ready for future candidacy only"}
	}
	return false, v.BlockingReasons
}

func decisionStatus(missing, unsafe, conflicts []string, input SovereignDecisionInput) string {
	if contains(unsafe, "pass_gold") || contains(unsafe, "pass_secure") {
		return StatusUnsafeAutoGoldAttempt
	}
	if contains(unsafe, "authority_granted") {
		return StatusUnsafeAuthorityGrantAttempt
	}
	for _, u := range unsafe {
		if u == "promotion_allowed" || u == "deploy_allowed" || u == "status_publish_allowed" || u == "memory_write_allowed" || u == "stable_promoted" || u == "learned_as_stable" || u == "mutation_allowed" {
			return StatusUnsafeAutoPromotionAttempt
		}
	}
	if len(unsafe) > 0 {
		return StatusBlocked
	}
	if contains(missing, "PASS_GOLD_REAL") || contains(missing, "PASS_SECURE_REAL") {
		return StatusMissingRealGates
	}
	if contains(missing, "human_approval") || contains(conflicts, "human_approval_placeholder") {
		return StatusHumanApprovalRequired
	}
	if contains(conflicts, "independent_revalidation_required") {
		return StatusRevalidationRequired
	}
	if contains(conflicts, "critical_risks_present") || contains(conflicts, "risk_assessment_not_acceptable_for_candidate") || contains(conflicts, "blocking_high_risks_present") {
		return StatusRiskBlocked
	}
	if len(missing) > 0 {
		return StatusIncomplete
	}
	if len(conflicts) > 0 {
		return StatusBlocked
	}
	return StatusCandidateReadyDryRun
}

func candidateScore(v SovereignDecisionValidation) int {
	score := 100 - len(v.MissingItems)*4 - len(v.UnsafeClaims)*10 - len(v.Conflicts)*8
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}
func confidence(score int) string {
	if score >= 90 {
		return "high"
	}
	if score >= 60 {
		return "medium"
	}
	return "low"
}
func isMCP(s string) bool {
	s = strings.ToLower(strings.TrimSpace(s))
	return s == "mcp" || s == "mcp_readonly" || strings.Contains(s, "inside_mcp")
}
func normalizeGate(s string) string {
	s = strings.ToUpper(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, " ", "_")
	return s
}
func clone(in []string) []string { out := make([]string, len(in)); copy(out, in); return out }
func appendUnique(in []string, s string) []string {
	if !contains(in, s) {
		return append(in, s)
	}
	return in
}
func contains(in []string, s string) bool {
	for _, v := range in {
		if v == s {
			return true
		}
	}
	return false
}
func requiredEvidence(missing []string) []string {
	out := []string{}
	for _, m := range missing {
		if strings.Contains(m, "evidence") || strings.Contains(m, "audit") || strings.Contains(m, "PASS_") {
			out = appendUnique(out, m)
		}
	}
	return out
}
func recommendations(missing, unsafe, conflicts []string) []string {
	out := []string{"keep V10.0 read-only and dry-run"}
	if len(missing) > 0 {
		out = append(out, "provide missing decision items before future candidacy")
	}
	if len(unsafe) > 0 {
		out = append(out, "remove unsafe authorization or promotion claims")
	}
	if len(conflicts) > 0 {
		out = append(out, "resolve sovereign decision conflicts with independent evidence")
	}
	return out
}
func recommendationsFor(v SovereignDecisionValidation) []string { return v.Recommendations }
func riskSummary(input SovereignDecisionInput) []string {
	if input.RiskAssessment == nil {
		return []string{"risk_assessment_missing"}
	}
	return []string{"risk_level=" + input.RiskAssessment.RiskLevel, "acceptable_for_candidate=" + boolText(input.RiskAssessment.AcceptableForCandidate)}
}
func authoritySummary(input SovereignDecisionInput) []string {
	if input.AuthorityReview == nil {
		return []string{"authority_review_missing"}
	}
	return []string{"review_status=" + input.AuthorityReview.ReviewStatus, "authority_review_valid=" + boolText(input.AuthorityReview.AuthorityReviewValid), "ready_dry_run=" + boolText(input.AuthorityReview.AuthorityReviewReadyDryRun)}
}
func boolText(v bool) string {
	if v {
		return "true"
	}
	return "false"
}
