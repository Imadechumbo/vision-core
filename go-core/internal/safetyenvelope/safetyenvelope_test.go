package safetyenvelope

import "testing"

func completeInput() SafetyEnvelopeInput {
	return SafetyEnvelopeInput{
		Operation:              "external_executor_safety_check",
		Executor:               "external_promotion_executor",
		Target:                 "stable",
		Environment:            "local",
		PromotionContractValid: true,
		Gates: []SafetyGate{
			{Gate: "PASS_GOLD", RealEvidence: true, RecognizedByAuthority: true},
			{Gate: "PASS_SECURE", RealEvidence: true, RecognizedByAuthority: true},
		},
		RollbackPolicy:  RollbackPolicy{Present: true, Strategy: "snapshot_restore", SnapshotRequired: true, RestoreCommandDeclared: true, ValidationAfterRollback: true, MaxAttempts: 1, ManualInterventionRequired: true},
		Idempotency:     IdempotencyPolicy{Present: true, Key: "promo-001", Scope: "project-branch-target", ReplayProtection: true, DuplicateActionBehavior: "block"},
		Lock:            LockPolicy{Present: true, LockID: "vision-core-stable", LeaseSeconds: 900, Owner: "external_promotion_executor", PreventsConcurrentExecution: true},
		Timeout:         TimeoutPolicy{Present: true, MaxSeconds: 900, GracefulAbort: true, HardAbort: true},
		KillSwitch:      KillSwitchPolicy{Present: true, Enabled: true, Trigger: "manual_or_policy", ManualOverride: true},
		AuditTrail:      AuditTrailPolicy{Present: true, AuditID: "audit-001", RecordsInputs: true, RecordsOutputs: true, RecordsGateArtifacts: true, RecordsDecisions: true, ImmutableTargetDeclared: true},
		DryRunRehearsal: DryRunRehearsalPolicy{Present: true, RehearsalID: "dryrun-001", Completed: true, MatchedTarget: true, MatchedEnvironment: true, NoMutationConfirmed: true},
		Observability:   ObservabilityPolicy{Present: true, HealthChecks: true, Metrics: true, Logs: true, PostExecutionWatchSeconds: 600, AlertingDeclared: true},
		Fallback:        FallbackPolicy{Present: true, FallbackTarget: "previous-stable", FallbackStrategy: "manual_hold_then_restore", ManualHoldRequired: true},
	}
}

func has(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}

func TestBuildSafetyBoundaryDryRunReadOnlyVersion(t *testing.T) {
	b := BuildSafetyBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("unexpected boundary identity: %+v", b)
	}
}

func TestBoundaryDefinesMCPScope(t *testing.T) {
	b := BuildSafetyBoundary()
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate_safety_envelope"} {
		if !has(b.MCPScope, want) {
			t.Fatalf("MCP scope missing %s: %+v", want, b.MCPScope)
		}
	}
}

func TestBoundaryForbidsMutatingExternalActionsInsideMCP(t *testing.T) {
	b := BuildSafetyBoundary()
	for _, want := range []string{"promote", "deploy", "publish_status", "push", "PR", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Fatalf("forbidden_inside_mcp missing %s: %+v", want, b.ForbiddenInsideMCP)
		}
	}
}

func TestValidateSafetyEnvelopeBlocksExecutorMCP(t *testing.T) {
	in := completeInput()
	in.Executor = "mcp"
	v := ValidateSafetyEnvelope(in)
	if !v.Blocked || !has(v.UnsafeClaims, "executor=mcp is forbidden for external execution") {
		t.Fatalf("expected executor=mcp blocked: %+v", v)
	}
}

func TestValidateSafetyEnvelopeBlocksPromotionAllowed(t *testing.T) {
	in := completeInput()
	in.PromotionAllowed = true
	v := ValidateSafetyEnvelope(in)
	if !v.Blocked || !has(v.UnsafeClaims, "promotion_allowed=true is forbidden inside MCP") {
		t.Fatalf("expected promotion_allowed blocked: %+v", v)
	}
}

func TestValidateSafetyEnvelopeBlocksOtherAllowedClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*SafetyEnvelopeInput)
		claim  string
	}{
		{"deploy", func(in *SafetyEnvelopeInput) { in.DeployAllowed = true }, "deploy_allowed=true is forbidden inside MCP"},
		{"status", func(in *SafetyEnvelopeInput) { in.StatusPublishAllowed = true }, "status_publish_allowed=true is forbidden inside MCP"},
		{"mutation", func(in *SafetyEnvelopeInput) { in.MutationAllowed = true }, "mutation_allowed=true is forbidden inside MCP"},
		{"memory", func(in *SafetyEnvelopeInput) { in.MemoryWriteAllowed = true }, "memory_write_allowed=true is forbidden inside MCP"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := completeInput()
			tc.mutate(&in)
			v := ValidateSafetyEnvelope(in)
			if !v.Blocked || !has(v.UnsafeClaims, tc.claim) {
				t.Fatalf("expected claim %q blocked: %+v", tc.claim, v)
			}
		})
	}
}

func TestValidateSafetyEnvelopeBlocksAttemptExternalCall(t *testing.T) {
	in := completeInput()
	in.AttemptExternalCall = true
	v := ValidateSafetyEnvelope(in)
	if !v.Blocked || !has(v.UnsafeClaims, "attempt_external_call=true is forbidden inside MCP") {
		t.Fatalf("expected external call blocked: %+v", v)
	}
}

func TestValidateSafetyEnvelopeBlocksAttemptRealRollback(t *testing.T) {
	in := completeInput()
	in.AttemptRealRollback = true
	v := ValidateSafetyEnvelope(in)
	if !v.Blocked || !has(v.UnsafeClaims, "attempt_real_rollback=true is forbidden inside MCP") {
		t.Fatalf("expected rollback blocked: %+v", v)
	}
}

func TestValidateSafetyEnvelopeDetectsMissingControls(t *testing.T) {
	cases := []struct {
		name    string
		mutate  func(*SafetyEnvelopeInput)
		missing string
	}{
		{"gold", func(in *SafetyEnvelopeInput) { in.Gates = in.Gates[1:] }, "PASS_GOLD_REAL"},
		{"secure", func(in *SafetyEnvelopeInput) { in.Gates = in.Gates[:1] }, "PASS_SECURE_REAL"},
		{"contract", func(in *SafetyEnvelopeInput) { in.PromotionContractValid = false }, "promotion_contract_valid"},
		{"rollback", func(in *SafetyEnvelopeInput) { in.RollbackPolicy = RollbackPolicy{} }, "rollback_policy"},
		{"idempotency", func(in *SafetyEnvelopeInput) { in.Idempotency = IdempotencyPolicy{} }, "idempotency_key"},
		{"lock", func(in *SafetyEnvelopeInput) { in.Lock = LockPolicy{} }, "concurrency_lock_or_lease"},
		{"timeout", func(in *SafetyEnvelopeInput) { in.Timeout = TimeoutPolicy{} }, "timeout_policy"},
		{"kill", func(in *SafetyEnvelopeInput) { in.KillSwitch = KillSwitchPolicy{} }, "kill_switch"},
		{"audit", func(in *SafetyEnvelopeInput) { in.AuditTrail = AuditTrailPolicy{} }, "audit_trail"},
		{"rehearsal", func(in *SafetyEnvelopeInput) { in.DryRunRehearsal = DryRunRehearsalPolicy{} }, "dry_run_rehearsal"},
		{"observability", func(in *SafetyEnvelopeInput) { in.Observability = ObservabilityPolicy{} }, "observability_plan"},
		{"fallback", func(in *SafetyEnvelopeInput) { in.Fallback = FallbackPolicy{} }, "fallback_plan"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := completeInput()
			tc.mutate(&in)
			v := ValidateSafetyEnvelope(in)
			if !has(v.MissingControls, tc.missing) {
				t.Fatalf("expected missing %s: %+v", tc.missing, v.MissingControls)
			}
		})
	}
}

func TestValidateSafetyEnvelopeRejectsDryRunSynthesizedAdvisoryGate(t *testing.T) {
	cases := []struct {
		name  string
		gate  SafetyGate
		claim string
	}{
		{"dryrun", SafetyGate{Gate: "PASS_GOLD", RealEvidence: true, DryRun: true, RecognizedByAuthority: true}, "PASS_GOLD dry_run evidence cannot be used as a real gate"},
		{"synthesized", SafetyGate{Gate: "PASS_GOLD", RealEvidence: true, Synthesized: true, RecognizedByAuthority: true}, "PASS_GOLD synthesized gate cannot be used as real evidence"},
		{"advisory", SafetyGate{Gate: "PASS_GOLD", RealEvidence: true, Advisory: true, RecognizedByAuthority: true}, "PASS_GOLD advisory source cannot be used as a real gate"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := completeInput()
			in.Gates[0] = tc.gate
			v := ValidateSafetyEnvelope(in)
			if !v.Blocked || !has(v.UnsafeClaims, tc.claim) {
				t.Fatalf("expected gate unsafe claim %q: %+v", tc.claim, v)
			}
		})
	}
}

func TestBuildSafetyEnvelopeCompleteIsReadyButDoesNotAllowMCPMutation(t *testing.T) {
	env := BuildSafetyEnvelope(completeInput())
	if env.EnvelopeStatus != "safety_ready_dry_run" || !env.WouldAllowExternalExecutor {
		t.Fatalf("expected safety ready dry-run: %+v", env)
	}
	if env.PromotionAllowed || env.DeployAllowed || env.StatusPublishAllowed || env.MutationAllowed || env.MemoryWriteAllowed || env.MCPExecutionAllowed {
		t.Fatalf("MCP action flags must remain false: %+v", env)
	}
}

func TestAuditSafetyEnvelopeDetectsAttempts(t *testing.T) {
	in := completeInput()
	in.AttemptExternalCall = true
	in.AttemptRealRollback = true
	a := AuditSafetyEnvelope(in)
	if !a.ExecutorCallAttemptFound || !has(a.UnsafeClaims, "attempt_real_rollback=true is forbidden inside MCP") {
		t.Fatalf("expected audit attempts: %+v", a)
	}
}

func TestExplainSafetyEnvelopeIncludesWhyAndRequiredGates(t *testing.T) {
	ex := ExplainSafetyEnvelope(SafetyEnvelopeInput{})
	if len(ex.WhyMCPCannotExecute) == 0 {
		t.Fatalf("expected why_mcp_cannot_execute: %+v", ex)
	}
	if !has(ex.RequiredGates, "PASS_GOLD") || !has(ex.RequiredGates, "PASS_SECURE") {
		t.Fatalf("expected required gates: %+v", ex.RequiredGates)
	}
}
