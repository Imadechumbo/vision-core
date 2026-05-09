package sovereigndecision

import "testing"

func validInput() SovereignDecisionInput {
	return SovereignDecisionInput{
		DecisionID: "decision-001", ReviewID: "review-001", IntakeID: "intake-001", InvocationID: "invoke-001", Executor: "external_promotion_executor", ExecutorMode: "external_only", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "e2c3203", Target: "stable", Environment: "local",
		AuthorityReview:           &AuthorityReviewReference{Present: true, Version: "V9.9", ReviewID: "review-001", ReviewStatus: "authority_review_ready_dry_run", AuthorityReviewValid: true, AuthorityReviewReadyDryRun: true, RequiresHumanReview: true, RequiresRevalidation: true, EligibleForFutureAuthorityDecision: true, Valid: true},
		ResultIntake:              &SovereignResultIntakeReference{Present: true, Version: "V9.8", IntakeID: "intake-001", ResultIntakeValid: true, ResultRequiresHumanReview: true, ResultRequiresRevalidation: true, ResultEligibleForAuthorityReview: true, Valid: true},
		EvidenceBundle:            &SovereignEvidence{Present: true, EvidenceID: "evidence-001", ContainsExecutorLogs: true, ContainsDiffSummary: true, ContainsValidationSummary: true, ContainsSecuritySummary: true, ContainsRealPassGold: true, ContainsRealPassSecure: true, SufficientForDecision: true},
		AuditTrail:                &SovereignAuditTrail{Present: true, AuditID: "audit-001", RecordsInvocationID: true, RecordsExecutor: true, RecordsInputs: true, RecordsOutputs: true, RecordsStartedFinished: true, RecordsDecisions: true, ImmutableTargetDeclared: true, SufficientForDecision: true},
		RealGates:                 []SovereignRealGate{{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, Source: "validator", ArtifactID: "pg", RecognizedByAuthority: true}, {Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, Source: "runner", ArtifactID: "ps", RecognizedByAuthority: true}},
		PromotionRequirements:     &PromotionRequirements{Present: true, RequiresPassGoldReal: true, RequiresPassSecureReal: true, RequiresAuthorityReviewValid: true, RequiresResultIntakeValid: true, RequiresEvidenceBundle: true, RequiresAuditTrail: true, RequiresHumanApproval: true, RequiresRevalidation: true, RequiresRollbackPlan: true, RequiresObservability: true, RequiresNoUnsafeClaims: true},
		RiskAssessment:            &SovereignRiskAssessment{Present: true, RiskLevel: "medium", MediumRisks: 1, LowRisks: 2, AcceptableForCandidate: true},
		RollbackRequirements:      &SovereignRollbackRequirements{Present: true, RollbackRequired: true, RollbackPlanPresent: true, SnapshotRequired: true, ValidationRequired: true, ManualInterventionRequired: true},
		ObservabilityRequirements: &SovereignObservabilityRequirements{Present: true, HealthChecksRequired: true, MetricsRequired: true, LogsRequired: true, AlertingRequired: true, WatchWindowSeconds: 900},
		HumanApproval:             &HumanApproval{Present: true, Required: true, Approved: true, Approver: "operator", ApprovalReference: "approval-001"},
		Policy:                    &SovereignPolicy{Present: true, RejectAutoGoldClaims: true, RejectAutoAuthorityClaims: true, RejectAutoPromotionClaims: true, RejectMemoryWriteClaims: true, RejectStablePromotionClaims: true, RejectTrustWithoutReview: true, RequireRealPassGoldGate: true, RequireRealPassSecureGate: true, RequireHumanApproval: true, RequireRevalidation: true},
		Claims:                    &SovereignClaims{},
	}
}

func has(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}

func TestBuildSovereignDecisionBoundaryDryRunReadOnlyVersion(t *testing.T) {
	b := BuildSovereignDecisionBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("bad boundary metadata: %+v", b)
	}
}

func TestBoundaryDefinesReadOnlyMCPScope(t *testing.T) {
	b := BuildSovereignDecisionBoundary()
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate_sovereign_promotion_decision"} {
		if !has(b.MCPScope, want) {
			t.Fatalf("missing MCP scope %s in %+v", want, b.MCPScope)
		}
	}
}

func TestBoundaryForbidsUnsafeActionsInsideMCP(t *testing.T) {
	b := BuildSovereignDecisionBoundary()
	for _, want := range []string{"mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "promote", "deploy", "publish_status", "write_memory", "learn_stable", "trust_result_automatically", "bypass_human_review", "bypass_revalidation"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Fatalf("missing forbidden %s", want)
		}
	}
}

func TestBuildSovereignDecisionAlwaysDeniesRealAuthorities(t *testing.T) {
	r := BuildSovereignDecision(validInput())
	if r.PassGoldAllowed || r.PassSecureAllowed || r.AuthorityGrantAllowed || r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed || r.StablePromotionAllowed || r.LearningAllowed || r.TrustWithoutReviewAllowed || r.MCPExecutionAllowed {
		t.Fatalf("decision granted forbidden authority: %+v", r)
	}
}

func TestValidateSovereignDecisionDetectsRequiredFailures(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*SovereignDecisionInput)
		want   string
	}{
		{"executor mcp", func(i *SovereignDecisionInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *SovereignDecisionInput) { i.ExecutorMode = "inside_mcp" }, "executor_mode_must_be_external_only"},
		{"authority missing", func(i *SovereignDecisionInput) { i.AuthorityReview = nil }, "authority_review"},
		{"authority invalid", func(i *SovereignDecisionInput) { i.AuthorityReview.AuthorityReviewValid = false }, "authority_review_valid"},
		{"authority not ready", func(i *SovereignDecisionInput) { i.AuthorityReview.AuthorityReviewReadyDryRun = false }, "authority_review_ready_dry_run"},
		{"result missing", func(i *SovereignDecisionInput) { i.ResultIntake = nil }, "result_intake"},
		{"result invalid", func(i *SovereignDecisionInput) { i.ResultIntake.ResultIntakeValid = false }, "result_intake_valid"},
		{"evidence missing", func(i *SovereignDecisionInput) { i.EvidenceBundle = nil }, "evidence_bundle"},
		{"evidence insufficient", func(i *SovereignDecisionInput) { i.EvidenceBundle.SufficientForDecision = false }, "evidence_bundle_sufficient"},
		{"dry run evidence", func(i *SovereignDecisionInput) { i.EvidenceBundle.DryRunEvidenceOnly = true }, "dry_run_evidence_used_as_real"},
		{"audit missing", func(i *SovereignDecisionInput) { i.AuditTrail = nil }, "audit_trail"},
		{"audit insufficient", func(i *SovereignDecisionInput) { i.AuditTrail.SufficientForDecision = false }, "audit_trail_sufficient"},
		{"pass gold missing", func(i *SovereignDecisionInput) { i.RealGates = i.RealGates[1:] }, "PASS_GOLD_REAL"},
		{"pass secure missing", func(i *SovereignDecisionInput) { i.RealGates = i.RealGates[:1] }, "PASS_SECURE_REAL"},
		{"dry run gate", func(i *SovereignDecisionInput) { i.RealGates[0].DryRun = true }, "PASS_GOLD_dry_run_gate_claim"},
		{"synth gate", func(i *SovereignDecisionInput) { i.RealGates[0].Synthesized = true }, "PASS_GOLD_synthesized_gate_claim"},
		{"unrecognized gate", func(i *SovereignDecisionInput) { i.RealGates[0].RecognizedByAuthority = false }, "PASS_GOLD_not_recognized_by_authority"},
		{"promotion req missing", func(i *SovereignDecisionInput) { i.PromotionRequirements = nil }, "promotion_requirements"},
		{"risk missing", func(i *SovereignDecisionInput) { i.RiskAssessment = nil }, "risk_assessment"},
		{"risk unacceptable", func(i *SovereignDecisionInput) { i.RiskAssessment.AcceptableForCandidate = false }, "risk_assessment_not_acceptable_for_candidate"},
		{"critical risks", func(i *SovereignDecisionInput) { i.RiskAssessment.CriticalRisks = 1 }, "critical_risks_present"},
		{"rollback missing", func(i *SovereignDecisionInput) { i.RollbackRequirements = nil }, "rollback_requirements"},
		{"observability missing", func(i *SovereignDecisionInput) { i.ObservabilityRequirements = nil }, "observability_requirements"},
		{"human approval missing", func(i *SovereignDecisionInput) { i.HumanApproval = nil }, "human_approval"},
		{"approval placeholder", func(i *SovereignDecisionInput) { i.HumanApproval.ApprovalIsPlaceholder = true }, "human_approval_placeholder"},
		{"policy missing", func(i *SovereignDecisionInput) { i.Policy = nil }, "sovereign_policy"},
		{"pass gold claim", func(i *SovereignDecisionInput) { i.Claims.PassGold = true; i.Claims.PassSecure = true }, "pass_gold"},
		{"authority claim", func(i *SovereignDecisionInput) { i.Claims.AuthorityGranted = true }, "authority_granted"},
		{"promotion claims", func(i *SovereignDecisionInput) {
			i.Claims.PromotionAllowed = true
			i.Claims.DeployAllowed = true
			i.Claims.StatusPublishAllowed = true
			i.Claims.MemoryWriteAllowed = true
		}, "promotion_allowed"},
		{"stable claims", func(i *SovereignDecisionInput) { i.Claims.StablePromoted = true; i.Claims.LearnedAsStable = true }, "stable_promoted"},
		{"trust bypass", func(i *SovereignDecisionInput) { i.Claims.ResultTrustedWithoutReview = true }, "result_trusted_without_review"},
		{"approval bypass", func(i *SovereignDecisionInput) {
			i.Claims.HumanApprovalBypassed = true
			i.Claims.RevalidationBypassed = true
		}, "human_approval_bypassed"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			v := ValidateSovereignDecision(in)
			if v.Valid || !v.Blocked {
				t.Fatalf("expected blocked invalid: %+v", v)
			}
			if !has(v.MissingItems, tc.want) && !has(v.UnsafeClaims, tc.want) && !has(v.Conflicts, tc.want) {
				t.Fatalf("missing %s: %+v", tc.want, v)
			}
		})
	}
}

func TestBuildSovereignDecisionCompleteReturnsCandidateButNoAuthority(t *testing.T) {
	r := BuildSovereignDecision(validInput())
	if r.DecisionStatus != StatusCandidateReadyDryRun || !r.SovereignDecisionValid || !r.PromotionDecisionCandidate {
		t.Fatalf("expected ready candidate: %+v", r)
	}
	if r.PromotionAllowed || r.PassGoldAllowed || r.AuthorityGrantAllowed {
		t.Fatalf("candidate must not authorize real action: %+v", r)
	}
}

func TestAuditSovereignDecisionDetectsUnsafeAttempts(t *testing.T) {
	in := validInput()
	in.Executor = "mcp"
	in.Claims = &SovereignClaims{PassGold: true, PassSecure: true, AuthorityGranted: true, PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, StablePromoted: true, LearnedAsStable: true, ResultTrustedWithoutReview: true, HumanApprovalBypassed: true, RevalidationBypassed: true}
	in.RealGates[0].DryRun = true
	in.RealGates[0].Synthesized = true
	a := AuditSovereignDecision(in)
	if !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.AutoPromotionAttemptFound || !a.DeployAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.TrustBypassAttemptFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.DryRunGateClaimFound || !a.SynthesizedGateClaimFound {
		t.Fatalf("audit missed unsafe attempt: %+v", a)
	}
}

func TestExplainSovereignDecisionAndRequiredGates(t *testing.T) {
	e := ExplainSovereignDecision(SovereignDecisionInput{})
	if len(e.WhyDecisionIsNotPassGold) == 0 || len(e.WhyDecisionIsNotAuthority) == 0 || len(e.WhyDecisionCannotPromote) == 0 || len(e.WhyCandidateIsOnlyAdvisory) == 0 {
		t.Fatalf("missing explanations: %+v", e)
	}
	if !has(e.RequiredGates, "PASS_GOLD") || !has(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("missing gates: %+v", e.RequiredGates)
	}
}
