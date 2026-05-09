package resultintake

import "testing"

func completeInput() ResultIntakeInput {
	return ResultIntakeInput{IntakeID: "intake-001", InvocationID: "invoke-001", Executor: "external_promotion_executor", ExecutorMode: "external_only", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "e299103", Target: "stable", Environment: "local", InvocationBoundary: &BoundaryReference{Present: true, Version: "V9.7", Valid: true}, HandoffPackage: &BoundaryReference{Present: true, Version: "V9.6", Valid: true}, FinalPreflight: &BoundaryReference{Present: true, Version: "V9.5", Valid: true}, AuthorizationManifest: &BoundaryReference{Present: true, Version: "V9.4", Valid: true}, ResultPayload: &ResultPayload{Present: true, ResultID: "result-001", InvocationID: "invoke-001", Executor: "external_promotion_executor", ExecutorMode: "external_only", ExternalOnly: true, Completed: true, Status: "completed"}, ExecutionResult: &ExecutionResult{Present: true, Status: "completed", Success: true, ExternalExecutorReported: true}, EvidenceBundle: &EvidenceBundle{Present: true, EvidenceID: "evidence-001", ContainsExecutorLogs: true}, AuditTrail: &AuditTrail{Present: true, AuditID: "audit-001", RecordsInvocationID: true}, RollbackOutcome: &RollbackOutcome{Present: true}, ObservabilityOutcome: &ObservabilityOutcome{Present: true, HealthChecksReported: true}, MutationSummary: &MutationSummary{Present: true}, CommandSummary: &CommandSummary{Present: true, ExecutorSideOnly: true}, NetworkSummary: &NetworkSummary{Present: true, ExecutorSideOnly: true}, FileWriteSummary: &FileWriteSummary{Present: true, ExecutorSideOnly: true}, StatusPublicationSummary: &StatusPublicationSummary{Present: true, ExecutorSideOnly: true}, Attestation: &ResultAttestation{Present: true, AttestationID: "attest-001", SignaturePlaceholder: "SIGNATURE_PLACEHOLDER", VerifierDeclared: true}, Idempotency: &ResultIdempotency{Present: true, Key: "invoke-001", InvocationIDMatched: true}, SafetyDecision: &SafetyDecision{Present: true, Decision: "requires_authority_review", RequiresHumanReview: true, RequiresRevalidation: true, EligibleForAuthorityReview: true}, Claims: &ResultClaims{}}
}

func has(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}

func TestBuildResultIntakeBoundaryDryRunReadOnlyAndScopes(t *testing.T) {
	b := BuildResultIntakeBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("bad boundary metadata: %+v", b)
	}
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate_result_intake"} {
		if !has(b.MCPScope, want) {
			t.Fatalf("missing mcp scope %s", want)
		}
	}
	for _, want := range []string{"trust_result_automatically", "mark_PASS_GOLD", "mark_PASS_SECURE", "promote_stable", "deploy", "publish_status", "write_memory", "grant_authority", "learn_stable", "perform_rollback"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Fatalf("missing forbidden action %s", want)
		}
	}
}

func TestBuildResultIntakeAlwaysDeniesAuthorityAndMutations(t *testing.T) {
	r := BuildResultIntake(completeInput())
	if r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed || r.StablePromotionAllowed || r.AuthorityGrantAllowed || r.PassGoldAllowed || r.PassSecureAllowed || r.TrustWithoutReviewAllowed || r.MCPExecutionAllowed {
		t.Fatalf("unexpected allowed action: %+v", r)
	}
	if !r.ResultRequiresHumanReview || !r.ResultRequiresRevalidation {
		t.Fatalf("review and revalidation must always be required")
	}
}

func TestValidateResultIntakeDetectsMissingItems(t *testing.T) {
	v := ValidateResultIntake(ResultIntakeInput{})
	for _, want := range []string{"intake_id", "invocation_id", "executor", "executor_mode", "external_only", "project", "branch", "commit_sha", "target", "environment", "invocation_boundary_reference", "handoff_package_reference", "final_preflight_reference", "authorization_manifest_reference", "result_payload", "execution_result", "evidence_bundle", "audit_trail", "rollback_outcome", "observability_outcome", "mutation_summary", "command_summary", "network_summary", "file_write_summary", "attestation", "idempotency", "safety_decision"} {
		if !has(v.MissingItems, want) {
			t.Fatalf("missing item %s not detected in %#v", want, v.MissingItems)
		}
	}
}

func TestValidateResultIntakeBlocksMCPAndNonExternalMode(t *testing.T) {
	in := completeInput()
	in.Executor = "mcp"
	in.ExecutorMode = "inside_mcp"
	v := ValidateResultIntake(in)
	if v.Valid || !v.Blocked || !has(v.UnsafeClaims, "mcp_executor_claim") || !has(v.UnsafeClaims, "non_external_only_executor_mode") {
		t.Fatalf("mcp/non external mode not blocked: %+v", v)
	}
}

func TestValidateResultIntakeBlocksUnsafeClaimsAndSecrets(t *testing.T) {
	in := completeInput()
	in.Claims = &ResultClaims{PassGold: true, PassSecure: true, PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, StablePromoted: true, AuthorityGranted: true, ResultTrustedWithoutReview: true}
	in.Attestation.PlaintextSecretPresent = true
	v := ValidateResultIntake(in)
	for _, want := range []string{"pass_gold_claim", "pass_secure_claim", "promotion_allowed_claim", "deploy_allowed_claim", "status_publish_allowed_claim", "memory_write_allowed_claim", "stable_promoted_claim", "authority_granted_claim", "result_trusted_without_review_claim", "plaintext_secret_present"} {
		if !has(v.UnsafeClaims, want) {
			t.Fatalf("unsafe claim %s not detected in %#v", want, v.UnsafeClaims)
		}
	}
}

func TestValidateResultIntakeIdempotencyAndDryRunEvidenceConflicts(t *testing.T) {
	in := completeInput()
	in.Idempotency.InvocationIDMatched = false
	in.EvidenceBundle.DryRunEvidenceOnly = true
	in.EvidenceBundle.Trusted = true
	v := ValidateResultIntake(in)
	if !has(v.Conflicts, "idempotency_invocation_id_not_matched") || !has(v.UnsafeClaims, "dry_run_evidence_used_as_real") {
		t.Fatalf("expected idempotency conflict and dry-run evidence unsafe claim: %+v", v)
	}
}

func TestBuildResultIntakeCompleteReadyAndRejectedNotEligible(t *testing.T) {
	r := BuildResultIntake(completeInput())
	if !r.ResultIntakeValid || r.IntakeStatus != StatusReadyDryRun || !r.ResultEligibleForAuthorityReview {
		t.Fatalf("complete payload not ready: %+v", r)
	}
	in := completeInput()
	in.SafetyDecision.Rejected = true
	r = BuildResultIntake(in)
	if r.ResultIntakeValid || !r.ResultRejected || r.ResultEligibleForAuthorityReview || r.IntakeStatus != StatusResultRejected {
		t.Fatalf("rejected payload eligible: %+v", r)
	}
}

func TestAuditResultIntakeFindsUnsafeAttempts(t *testing.T) {
	in := completeInput()
	in.Claims = &ResultClaims{PassGold: true, PromotionAllowed: true, MemoryWriteAllowed: true, StatusPublishAllowed: true, ResultTrustedWithoutReview: true}
	in.Attestation.PlaintextSecretPresent = true
	a := AuditResultIntake(in)
	if !a.TrustBypassAttemptFound || !a.AutoGoldAttemptFound || !a.AutoPromotionAttemptFound || !a.MemoryWriteAttemptFound || !a.StatusPublishClaimFound || !a.PlaintextSecretFound {
		t.Fatalf("audit missed unsafe attempts: %+v", a)
	}
}

func TestExplainResultIntakeExplainsReviewAndGates(t *testing.T) {
	e := ExplainResultIntake(ResultIntakeInput{})
	if len(e.WhyResultIsNotPassGold) == 0 || len(e.WhyResultIsNotAuthority) == 0 || len(e.WhyResultRequiresReview) == 0 {
		t.Fatalf("missing explanations: %+v", e)
	}
	if !has(e.RequiredGates, "PASS_GOLD") || !has(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("missing required gates: %#v", e.RequiredGates)
	}
}
