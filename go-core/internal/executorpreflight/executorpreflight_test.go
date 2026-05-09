package executorpreflight

import "testing"

func fullInput() PreflightInput {
	return PreflightInput{
		PreflightID: "preflight-001", Executor: "external_promotion_executor", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "2b58abc", Target: "stable", Environment: "local",
		Authority:             &AuthorityPreflight{Present: true, Version: "V9.0", PassGoldReal: true, PassSecureReal: true, AllRealGatesRecognized: true, AuthorityStatus: "all_real_gates_recognized"},
		PromotionContract:     &PromotionContractPreflight{Present: true, Version: "V9.1", ContractStatus: "externally_eligible_dry_run", ExternallyEligibleDryRun: true, WouldAllowExternalExecutor: true},
		SafetyEnvelope:        &SafetyEnvelopePreflight{Present: true, Version: "V9.2", EnvelopeStatus: "safety_ready_dry_run", SafetyReadyDryRun: true, WouldAllowExternalExecutor: true, RequiredControlsPresent: true},
		Rehearsal:             &RehearsalPreflight{Present: true, Version: "V9.3", RehearsalStatus: "rehearsal_ready_dry_run", RehearsalReadyDryRun: true, NoMutationProof: true, WouldAllowExternalExecutor: true},
		AuthorizationManifest: &AuthorizationManifestPreflight{Present: true, Version: "V9.4", ManifestStatus: "authorization_ready_dry_run", AuthorizationReadyDryRun: true, WouldAuthorizeExternalExecutor: true, ValidityWithinWindow: true, ExplicitAuthorization: true},
		Gates: []PreflightGate{
			{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true, Source: "sddf_passgold_validator", ArtifactID: "pg-123"},
			{Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true, Source: "passsecure_runner", ArtifactID: "ps-123"},
		},
		Artifacts: []PreflightArtifact{
			{ID: "pg-123", Type: "pass_gold_report", Required: true, Present: true, Trusted: true},
			{ID: "ps-123", Type: "pass_secure_report", Required: true, Present: true, Trusted: true},
			{ID: "contract-001", Type: "promotion_contract", Required: true, Present: true, Trusted: true},
			{ID: "safety-001", Type: "safety_envelope", Required: true, Present: true, Trusted: true},
			{ID: "rehearsal-001", Type: "rehearsal_record", Required: true, Present: true, Trusted: true},
			{ID: "authz-001", Type: "authorization_manifest", Required: true, Present: true, Trusted: true},
		},
	}
}

func has(list []string, want string) bool {
	for _, got := range list {
		if got == want {
			return true
		}
	}
	return false
}

func TestBuildPreflightBoundaryReadOnlyDryRun(t *testing.T) {
	b := BuildPreflightBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("unexpected boundary identity: %#v", b)
	}
}

func TestBoundaryDefinesMCPScopeOnly(t *testing.T) {
	b := BuildPreflightBoundary()
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate_final_preflight"} {
		if !has(b.MCPScope, want) {
			t.Fatalf("missing MCP scope %q in %#v", want, b.MCPScope)
		}
	}
}

func TestBoundaryForbidsMutatingAndExecutionActionsInsideMCP(t *testing.T) {
	b := BuildPreflightBoundary()
	for _, want := range []string{"execute", "call_external_executor", "authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "PR", "write_memory", "acquire_real_lock", "perform_rollback", "write_preflight_file"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Fatalf("missing forbidden action %q in %#v", want, b.ForbiddenInsideMCP)
		}
	}
}

func TestBuildFinalPreflightNeverAllowsMutationOrPromotion(t *testing.T) {
	res := BuildFinalPreflight(fullInput())
	if res.PromotionAllowed || res.DeployAllowed || res.StatusPublishAllowed || res.MutationAllowed || res.MemoryWriteAllowed {
		t.Fatalf("preflight allowed forbidden action: %#v", res)
	}
}

func TestBuildFinalPreflightNeverAllowsExecutorCallInsideMCP(t *testing.T) {
	if BuildFinalPreflight(fullInput()).ExecutorCallAllowedInsideMCP {
		t.Fatal("executor call inside MCP must always be false")
	}
}

func TestBuildFinalPreflightNeverUsableForPassGates(t *testing.T) {
	res := BuildFinalPreflight(fullInput())
	if res.UsableForPassGold || res.UsableForPassSecure {
		t.Fatalf("preflight must not be usable as PASS gates: %#v", res)
	}
}

func TestValidatePreflightBlocksMCPExecutor(t *testing.T) {
	in := fullInput()
	in.Executor = "mcp"
	v := ValidatePreflight(in)
	if v.Valid || !v.Blocked || len(v.UnsafeClaims) == 0 {
		t.Fatalf("expected blocked MCP executor: %#v", v)
	}
}

func TestValidatePreflightBlocksExecutorCallInsideMCP(t *testing.T) {
	in := fullInput()
	in.ExecutorCallAllowedInsideMCP = true
	v := ValidatePreflight(in)
	if v.Valid || !has(v.UnsafeClaims, "executor_call_allowed_inside_mcp cannot be true") {
		t.Fatalf("expected executor call block: %#v", v)
	}
}

func TestValidatePreflightBlocksPromotionAllowedInsideMCP(t *testing.T) {
	in := fullInput()
	in.PromotionAllowed = true
	v := ValidatePreflight(in)
	if v.Valid || !has(v.UnsafeClaims, "payload attempts execution inside MCP") {
		t.Fatalf("expected promotion allowed block: %#v", v)
	}
}

func TestValidatePreflightBlocksDeployStatusMutationMemoryAllowed(t *testing.T) {
	in := fullInput()
	in.DeployAllowed, in.StatusPublishAllowed, in.MutationAllowed, in.MemoryWriteAllowed = true, true, true, true
	v := ValidatePreflight(in)
	if v.Valid || len(v.UnsafeClaims) == 0 {
		t.Fatalf("expected deploy/status/mutation/memory block: %#v", v)
	}
}

func TestValidatePreflightBlocksExternalCallFileCommandNetwork(t *testing.T) {
	in := fullInput()
	in.AttemptExternalCall, in.FileWrite, in.CommandExecution, in.NetworkCall = true, true, true, true
	v := ValidatePreflight(in)
	for _, want := range []string{"attempt_external_call cannot be true", "file_write cannot be true", "command_execution cannot be true", "network_call cannot be true"} {
		if !has(v.UnsafeClaims, want) {
			t.Fatalf("missing unsafe claim %q in %#v", want, v.UnsafeClaims)
		}
	}
}

func TestValidatePreflightDetectsAuthorityMissing(t *testing.T) {
	in := fullInput()
	in.Authority = nil
	if !has(ValidatePreflight(in).MissingItems, "authority_present") {
		t.Fatal("expected missing authority")
	}
}

func TestValidatePreflightDetectsPassGoldRealMissing(t *testing.T) {
	in := fullInput()
	in.Authority.PassGoldReal = false
	if !has(ValidatePreflight(in).MissingGates, "PASS_GOLD_REAL") {
		t.Fatal("expected missing PASS_GOLD_REAL")
	}
}

func TestValidatePreflightDetectsPassSecureRealMissing(t *testing.T) {
	in := fullInput()
	in.Authority.PassSecureReal = false
	if !has(ValidatePreflight(in).MissingGates, "PASS_SECURE_REAL") {
		t.Fatal("expected missing PASS_SECURE_REAL")
	}
}

func TestValidatePreflightRejectsDryRunSynthesizedAdvisoryGate(t *testing.T) {
	in := fullInput()
	in.Gates = []PreflightGate{{Gate: "PASS_GOLD", DryRun: true, Synthesized: true, Advisory: true, Source: "advisory"}}
	v := ValidatePreflight(in)
	if v.Valid || len(v.UnsafeClaims) < 3 {
		t.Fatalf("expected gate unsafe claims: %#v", v)
	}
}

func TestValidatePreflightDetectsInvalidPromotionContract(t *testing.T) {
	in := fullInput()
	in.PromotionContract = nil
	if !has(ValidatePreflight(in).MissingItems, "promotion_contract_valid") {
		t.Fatal("expected missing promotion contract")
	}
}

func TestValidatePreflightDetectsInvalidSafetyEnvelope(t *testing.T) {
	in := fullInput()
	in.SafetyEnvelope = nil
	if !has(ValidatePreflight(in).MissingItems, "safety_envelope_valid") {
		t.Fatal("expected missing safety envelope")
	}
}

func TestValidatePreflightDetectsInvalidRehearsal(t *testing.T) {
	in := fullInput()
	in.Rehearsal = nil
	if !has(ValidatePreflight(in).MissingItems, "rehearsal_valid") {
		t.Fatal("expected missing rehearsal")
	}
}

func TestValidatePreflightDetectsInvalidAuthorizationManifest(t *testing.T) {
	in := fullInput()
	in.AuthorizationManifest = nil
	if !has(ValidatePreflight(in).MissingItems, "authorization_manifest_valid") {
		t.Fatal("expected missing authorization manifest")
	}
}

func TestValidatePreflightDetectsRequiredArtifactsMissing(t *testing.T) {
	in := fullInput()
	in.Artifacts = nil
	if !has(ValidatePreflight(in).MissingItems, "required_artifacts") {
		t.Fatal("expected missing required artifacts")
	}
}

func TestValidatePreflightDetectsReadyClaimWithMissingItems(t *testing.T) {
	in := PreflightInput{PreflightID: "preflight-unsafe", Executor: "external_promotion_executor", ExternalExecutionPreflightReady: true}
	v := ValidatePreflight(in)
	if len(v.Conflicts) == 0 {
		t.Fatalf("expected conflicting readiness claim: %#v", v)
	}
}

func TestBuildFinalPreflightCompleteChainReadyDryRun(t *testing.T) {
	res := BuildFinalPreflight(fullInput())
	if res.PreflightStatus != StatusReadyDryRun || !res.ExternalExecutionPreflightReady {
		t.Fatalf("expected ready dry-run: %#v", res)
	}
}

func TestReadyPreflightStillBlocksPromotionAndDeploy(t *testing.T) {
	res := BuildFinalPreflight(fullInput())
	if res.PromotionAllowed || res.DeployAllowed {
		t.Fatalf("ready preflight cannot promote/deploy: %#v", res)
	}
}

func TestAuditPreflightDetectsExecutionAttempt(t *testing.T) {
	in := fullInput()
	in.PromotionAllowed = true
	if !AuditPreflight(in).ExecutionAttemptFound {
		t.Fatal("expected execution attempt")
	}
}

func TestAuditPreflightDetectsMutationAttempt(t *testing.T) {
	in := fullInput()
	in.FileWrite = true
	if !AuditPreflight(in).MutationAttemptFound {
		t.Fatal("expected mutation attempt")
	}
}

func TestAuditPreflightDetectsMCPExecutorCallAttempt(t *testing.T) {
	in := fullInput()
	in.ExecutorCallAllowedInsideMCP = true
	if !AuditPreflight(in).MCPExecutorCallAttemptFound {
		t.Fatal("expected MCP executor call attempt")
	}
}

func TestAuditPreflightDetectsDryRunGateClaim(t *testing.T) {
	in := fullInput()
	in.Gates[0].DryRun = true
	if !AuditPreflight(in).DryRunGateClaimFound {
		t.Fatal("expected dry-run gate claim")
	}
}

func TestAuditPreflightDetectsSynthesizedGateClaim(t *testing.T) {
	in := fullInput()
	in.Gates[0].Synthesized = true
	if !AuditPreflight(in).SynthesizedGateClaimFound {
		t.Fatal("expected synthesized gate claim")
	}
}

func TestExplainPreflightExplainsNotPassGoldAndNotExecution(t *testing.T) {
	ex := ExplainPreflight(PreflightInput{})
	if len(ex.WhyPreflightIsNotPassGold) == 0 || len(ex.WhyPreflightIsNotExecution) == 0 {
		t.Fatalf("expected explanations: %#v", ex)
	}
}

func TestRequiredGatesAlwaysContainPassGoldAndPassSecure(t *testing.T) {
	ex := ExplainPreflight(PreflightInput{})
	if !has(ex.RequiredGates, "PASS_GOLD") || !has(ex.RequiredGates, "PASS_SECURE") {
		t.Fatalf("missing required gates: %#v", ex.RequiredGates)
	}
}
