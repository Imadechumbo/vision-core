package authorityreview

import "testing"

func completeInput() AuthorityReviewInput {
	return AuthorityReviewInput{
		ReviewID: "review-001", IntakeID: "intake-001", InvocationID: "invoke-001", Executor: "external_promotion_executor", ExecutorMode: "external_only",
		Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "bd56cf1", Target: "stable", Environment: "local",
		ResultIntake:    &ResultIntakeReference{Present: true, Version: "V9.8", IntakeID: "intake-001", IntakeStatus: "result_intake_ready_dry_run", ResultIntakeValid: true, ResultRequiresHumanReview: true, ResultRequiresRevalidation: true, ResultEligibleForAuthorityReview: true, Valid: true},
		EvidenceBundle:  &AuthorityEvidenceReview{Present: true, EvidenceID: "evidence-001", ContainsExecutorLogs: true, ContainsDiffSummary: true, ContainsValidationSummary: true, ContainsSecuritySummary: true, SufficientForReview: true},
		AuditTrail:      &AuthorityAuditReview{Present: true, AuditID: "audit-001", RecordsInvocationID: true, RecordsExecutor: true, RecordsInputs: true, RecordsOutputs: true, RecordsStartedFinished: true, RecordsDecisions: true, ImmutableTargetDeclared: true, SufficientForReview: true},
		SafetyDecision:  &AuthoritySafetyReview{Present: true, Decision: "requires_authority_review", RequiresHumanReview: true, RequiresRevalidation: true, EligibleForAuthorityReview: true},
		RollbackOutcome: map[string]interface{}{"present": true}, ObservabilityOutcome: map[string]interface{}{"present": true}, MutationSummary: map[string]interface{}{"present": true}, CommandSummary: map[string]interface{}{"present": true}, NetworkSummary: map[string]interface{}{"present": true}, FileWriteSummary: map[string]interface{}{"present": true}, StatusPublicationSummary: map[string]interface{}{"present": true},
		AuthorityRequirements: &AuthorityRequirements{Present: true, RequiresPassGoldReal: true, RequiresPassSecureReal: true, RequiresEvidenceBundle: true, RequiresAuditTrail: true, RequiresSafetyDecision: true, RequiresNoAutoPromotion: true, RequiresNoMemoryWrite: true, RequiresNoTrustBypass: true},
		ReviewPolicy:          &AuthorityReviewPolicy{Present: true, RequireHumanReview: true, RequireRevalidation: true, RequireRealPassGoldGate: true, RequireRealPassSecureGate: true, RejectAutoGoldClaims: true, RejectAutoPromotionClaims: true, RejectMemoryWriteClaims: true, RejectTrustWithoutReview: true},
		Claims:                &AuthorityReviewClaims{},
	}
}

func contains(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}

func TestBuildAuthorityReviewBoundaryDryRunReadOnlyAndScopes(t *testing.T) {
	b := BuildAuthorityReviewBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("unexpected boundary metadata: %+v", b)
	}
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate_authority_review_gate"} {
		if !contains(b.MCPScope, want) {
			t.Fatalf("missing MCP scope %q in %+v", want, b.MCPScope)
		}
	}
	for _, want := range []string{"mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "promote", "deploy", "publish_status", "write_memory", "learn_stable", "trust_result_automatically", "bypass_human_review", "bypass_revalidation"} {
		if !contains(b.ForbiddenInsideMCP, want) {
			t.Fatalf("missing forbidden action %q in %+v", want, b.ForbiddenInsideMCP)
		}
	}
}

func TestBuildAuthorityReviewNeverAllowsAuthorityOrMutation(t *testing.T) {
	r := BuildAuthorityReview(completeInput())
	if r.PassGoldAllowed || r.PassSecureAllowed || r.AuthorityGrantAllowed || r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed || r.StablePromotionAllowed || r.TrustWithoutReviewAllowed || r.MCPExecutionAllowed {
		t.Fatalf("review allowed forbidden action: %+v", r)
	}
	if !r.RequiresHumanReview || !r.RequiresRevalidation {
		t.Fatalf("review must always require human review and revalidation: %+v", r)
	}
}

func TestValidateAuthorityReviewDetectsMissingInvalidAndUnsafeInputs(t *testing.T) {
	cases := []struct {
		name                      string
		mutate                    func(*AuthorityReviewInput)
		missing, unsafe, conflict string
	}{
		{"executor mcp", func(i *AuthorityReviewInput) { i.Executor = "mcp" }, "", "", "executor_must_not_be_mcp"},
		{"executor mode", func(i *AuthorityReviewInput) { i.ExecutorMode = "inside_mcp" }, "", "", "executor_mode_must_be_external_only"},
		{"result intake absent", func(i *AuthorityReviewInput) { i.ResultIntake = nil }, "result_intake", "", ""},
		{"result intake invalid", func(i *AuthorityReviewInput) { i.ResultIntake.ResultIntakeValid = false }, "result_intake_valid", "", ""},
		{"result ineligible", func(i *AuthorityReviewInput) { i.ResultIntake.ResultEligibleForAuthorityReview = false }, "result_eligible_for_authority_review", "", ""},
		{"result rejected", func(i *AuthorityReviewInput) { i.ResultIntake.ResultRejected = true }, "", "", "result_intake_rejected"},
		{"evidence absent", func(i *AuthorityReviewInput) { i.EvidenceBundle = nil }, "evidence_bundle", "", ""},
		{"evidence insufficient", func(i *AuthorityReviewInput) { i.EvidenceBundle.SufficientForReview = false }, "evidence_bundle.sufficient_for_review", "", ""},
		{"dry run evidence trusted", func(i *AuthorityReviewInput) {
			i.EvidenceBundle.DryRunEvidenceOnly = true
			i.EvidenceBundle.Trusted = true
		}, "", "", "dry_run_evidence_used_as_real"},
		{"audit absent", func(i *AuthorityReviewInput) { i.AuditTrail = nil }, "audit_trail", "", ""},
		{"audit insufficient", func(i *AuthorityReviewInput) { i.AuditTrail.SufficientForReview = false }, "audit_trail.sufficient_for_review", "", ""},
		{"safety absent", func(i *AuthorityReviewInput) { i.SafetyDecision = nil }, "safety_decision", "", ""},
		{"safety human", func(i *AuthorityReviewInput) { i.SafetyDecision.RequiresHumanReview = false }, "", "", "safety_decision.requires_human_review"},
		{"safety revalidation", func(i *AuthorityReviewInput) { i.SafetyDecision.RequiresRevalidation = false }, "", "", "safety_decision.requires_revalidation"},
		{"summaries absent", func(i *AuthorityReviewInput) {
			i.RollbackOutcome = nil
			i.ObservabilityOutcome = nil
			i.MutationSummary = nil
			i.CommandSummary = nil
			i.NetworkSummary = nil
			i.FileWriteSummary = nil
			i.StatusPublicationSummary = nil
		}, "rollback_outcome", "", ""},
		{"requirements absent", func(i *AuthorityReviewInput) { i.AuthorityRequirements = nil }, "authority_requirements", "", ""},
		{"policy absent", func(i *AuthorityReviewInput) { i.ReviewPolicy = nil }, "review_policy", "", ""},
		{"pass gold", func(i *AuthorityReviewInput) { i.Claims.PassGold = true; i.Claims.PassSecure = true }, "", "pass_gold", ""},
		{"authority", func(i *AuthorityReviewInput) { i.Claims.AuthorityGranted = true }, "", "authority_granted", ""},
		{"promotion", func(i *AuthorityReviewInput) {
			i.Claims.PromotionAllowed = true
			i.Claims.DeployAllowed = true
			i.Claims.StatusPublishAllowed = true
			i.Claims.MemoryWriteAllowed = true
		}, "", "promotion_allowed", ""},
		{"stable", func(i *AuthorityReviewInput) { i.Claims.StablePromoted = true }, "", "stable_promoted", ""},
		{"trust", func(i *AuthorityReviewInput) { i.Claims.ResultTrustedWithoutReview = true }, "", "result_trusted_without_review", ""},
		{"bypass", func(i *AuthorityReviewInput) {
			i.Claims.ReviewBypassed = true
			i.Claims.HumanReviewSkipped = true
			i.Claims.RevalidationSkipped = true
		}, "", "review_bypassed", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := completeInput()
			tc.mutate(&in)
			v := ValidateAuthorityReview(in)
			if v.Valid || !v.Blocked {
				t.Fatalf("expected blocked invalid validation: %+v", v)
			}
			if tc.missing != "" && !contains(v.MissingItems, tc.missing) {
				t.Fatalf("missing %q not found in %+v", tc.missing, v.MissingItems)
			}
			if tc.unsafe != "" && !contains(v.UnsafeClaims, tc.unsafe) {
				t.Fatalf("unsafe %q not found in %+v", tc.unsafe, v.UnsafeClaims)
			}
			if tc.conflict != "" && !contains(v.Conflicts, tc.conflict) {
				t.Fatalf("conflict %q not found in %+v", tc.conflict, v.Conflicts)
			}
		})
	}
}

func TestBuildAuthorityReviewCompletePayloadReadyDryRunOnly(t *testing.T) {
	r := BuildAuthorityReview(completeInput())
	if r.ReviewStatus != StatusReadyDryRun || !r.AuthorityReviewValid || !r.AuthorityReviewReadyDryRun || !r.EligibleForFutureAuthorityDecision {
		t.Fatalf("expected ready valid review: %+v", r)
	}
	if r.AuthorityGrantAllowed || r.PassGoldAllowed {
		t.Fatalf("ready review must not allow authority or PASS GOLD: %+v", r)
	}
}

func TestAuditAuthorityReviewDetectsUnsafeAttempts(t *testing.T) {
	in := completeInput()
	in.Claims = &AuthorityReviewClaims{PassGold: true, PassSecure: true, AuthorityGranted: true, PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, StablePromoted: true, ResultTrustedWithoutReview: true, ReviewBypassed: true, HumanReviewSkipped: true, RevalidationSkipped: true}
	a := AuditAuthorityReview(in)
	if !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.AutoPromotionAttemptFound || !a.MemoryWriteAttemptFound || !a.TrustBypassAttemptFound || !a.ReviewBypassAttemptFound || !a.RevalidationBypassAttemptFound {
		t.Fatalf("audit did not detect unsafe attempts: %+v", a)
	}
}

func TestExplainAuthorityReview(t *testing.T) {
	e := ExplainAuthorityReview(AuthorityReviewInput{})
	if len(e.WhyReviewIsNotPassGold) == 0 || len(e.WhyReviewIsNotAuthority) == 0 || len(e.WhyReviewCannotPromote) == 0 || len(e.WhyHumanReviewIsRequired) == 0 {
		t.Fatalf("incomplete explain payload: %+v", e)
	}
	if !contains(e.RequiredGates, "PASS_GOLD") || !contains(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("missing required gates: %+v", e.RequiredGates)
	}
}
