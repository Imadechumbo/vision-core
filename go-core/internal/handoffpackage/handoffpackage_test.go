package handoffpackage

import "testing"

func completeInput() HandoffInput {
	s := func(v string) *HandoffSummary {
		return &HandoffSummary{Present: true, Version: v, Status: "ready", Ready: true, Valid: true, Summary: "valid"}
	}
	return HandoffInput{
		HandoffID: "handoff-001", Executor: "external_promotion_executor", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "b916ea9", Target: "stable", Environment: "local",
		AuthoritySummary: s("V9.0"), PromotionContractSummary: s("V9.1"), SafetyEnvelopeSummary: s("V9.2"), RehearsalSummary: s("V9.3"), AuthorizationManifestSummary: s("V9.4"),
		FinalPreflightResult:      &FinalPreflightSummary{Present: true, Version: "V9.5", Status: "preflight_ready_dry_run", Ready: true, Valid: true, ExternalExecutionPreflightReady: true},
		Gates:                     []HandoffGate{{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true, Source: "sddf_passgold_validator", ArtifactID: "pg-123"}, {Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true, Source: "passsecure_runner", ArtifactID: "ps-123"}},
		Artifacts:                 []HandoffArtifact{{ID: "pg-123", Type: "pass_gold_report", Required: true, Present: true, Trusted: true}, {ID: "ps-123", Type: "pass_secure_report", Required: true, Present: true, Trusted: true}, {ID: "contract-001", Type: "promotion_contract", Required: true, Present: true, Trusted: true}},
		RollbackRequirements:      &RollbackRequirements{Present: true, Mandatory: true, Strategy: "snapshot_restore", SnapshotRequired: true, ValidationRequired: true, ManualInterventionRequired: true},
		KillSwitchRequirements:    &KillSwitchRequirements{Present: true, Mandatory: true, Enabled: true, Trigger: "manual_or_policy", ManualOverride: true},
		ObservabilityRequirements: &ObservabilityRequirements{Present: true, HealthChecks: true, Metrics: true, Logs: true, WatchWindowSeconds: 600, AlertingDeclared: true},
		Boundary:                  &HandoffBoundary{Present: true, NoWriteFile: true, NoNetworkCall: true, NoCommandExecution: true, MCPScope: []string{"read", "validate", "audit", "explain", "simulate handoff package"}, ForbiddenInsideMCP: []string{"write_handoff_file", "execute", "call_external_executor"}},
		Checklist:                 &HandoffChecklist{Present: true, AuthorityChecked: true, PromotionContractChecked: true, SafetyEnvelopeChecked: true, RehearsalChecked: true, AuthorizationManifestChecked: true, FinalPreflightChecked: true, PassGoldRealChecked: true, PassSecureRealChecked: true, RollbackChecked: true, KillSwitchChecked: true, ObservabilityChecked: true, MCPBoundaryChecked: true, NoMutationChecked: true},
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

func TestBuildHandoffBoundaryDryRunReadOnlyV96(t *testing.T) {
	b := BuildHandoffBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !b.Valid {
		t.Fatalf("invalid boundary: %+v", b)
	}
}

func TestBoundaryDefinesMCPScopeOnly(t *testing.T) {
	b := BuildHandoffBoundary()
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate handoff package"} {
		if !has(b.MCPScope, want) {
			t.Fatalf("missing mcp scope %q: %+v", want, b.MCPScope)
		}
	}
	if len(b.MCPScope) != 5 {
		t.Fatalf("unexpected mcp scope: %+v", b.MCPScope)
	}
}

func TestBoundaryForbidsMutatingExecutorActionsInsideMCP(t *testing.T) {
	b := BuildHandoffBoundary()
	for _, want := range []string{"write_handoff_file", "execute", "call_external_executor", "authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "PR", "memory_write", "acquire_real_lock", "perform_rollback"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Fatalf("missing forbidden action %q: %+v", want, b.ForbiddenInsideMCP)
		}
	}
}

func TestBuildHandoffPackageAlwaysDeniesMCPMutationPermissions(t *testing.T) {
	p := BuildHandoffPackage(HandoffInput{PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MutationAllowed: true, MemoryWriteAllowed: true, ExecutorCallAllowedInsideMCP: true, FileWriteAllowed: true, PassGold: true, PassSecure: true})
	if p.PromotionAllowed || p.DeployAllowed || p.StatusPublishAllowed || p.MutationAllowed || p.MemoryWriteAllowed || p.ExecutorCallAllowedInsideMCP || p.FileWriteAllowed || p.UsableForPassGold || p.UsableForPassSecure {
		t.Fatalf("package leaked permissions: %+v", p)
	}
}

func TestValidateHandoffBlocksUnsafeClaims(t *testing.T) {
	v := ValidateHandoff(HandoffInput{HandoffID: "handoff-unsafe", Executor: "mcp", Target: "stable", Environment: "local", PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MutationAllowed: true, MemoryWriteAllowed: true, ExecutorCallAllowedInsideMCP: true, FileWriteAllowed: true, WriteHandoffFile: true, AttemptExternalCall: true, FileWrite: true, CommandExecution: true, NetworkCall: true})
	for _, want := range []string{"executor cannot be mcp or mcp_readonly", "executor_call_allowed_inside_mcp cannot be true", "file_write_allowed cannot be true", "write_handoff_file cannot be true", "attempt_external_call cannot be true", "file_write cannot be true", "command_execution cannot be true", "network_call cannot be true"} {
		if !has(v.UnsafeClaims, want) {
			t.Fatalf("missing unsafe %q in %+v", want, v.UnsafeClaims)
		}
	}
	if v.Valid || !v.Blocked || v.PromotionAllowed || v.DeployAllowed || v.StatusPublishAllowed || v.MutationAllowed || v.MemoryWriteAllowed {
		t.Fatalf("unsafe validation leaked permissions: %+v", v)
	}
}

func TestValidateHandoffDetectsMissingSummaries(t *testing.T) {
	v := ValidateHandoff(HandoffInput{})
	for _, want := range []string{"authority_summary", "promotion_contract_summary", "safety_envelope_summary", "rehearsal_summary", "authorization_manifest_summary", "final_preflight_result"} {
		if !has(v.MissingItems, want) {
			t.Fatalf("missing item %q not detected: %+v", want, v.MissingItems)
		}
	}
}

func TestValidateHandoffDetectsPreflightNotReady(t *testing.T) {
	in := completeInput()
	in.FinalPreflightResult.ExternalExecutionPreflightReady = false
	v := ValidateHandoff(in)
	if !has(v.MissingItems, "final_preflight_result") || !has(v.MissingItems, "external_execution_preflight_ready") {
		t.Fatalf("preflight not ready not detected: %+v", v.MissingItems)
	}
}

func TestValidateHandoffDetectsMissingRealGates(t *testing.T) {
	in := completeInput()
	in.Gates = nil
	v := ValidateHandoff(in)
	if !has(v.MissingGates, "PASS_GOLD_REAL") || !has(v.MissingGates, "PASS_SECURE_REAL") {
		t.Fatalf("missing gates not detected: %+v", v.MissingGates)
	}
}

func TestValidateHandoffRejectsDryRunSynthesizedAdvisoryGate(t *testing.T) {
	in := completeInput()
	in.Gates = []HandoffGate{{Gate: "PASS_GOLD", DryRun: true, Synthesized: true, Advisory: true, Source: "advisory"}}
	v := ValidateHandoff(in)
	for _, want := range []string{"dry-run gate cannot be used as real evidence: PASS_GOLD", "synthesized gate cannot be used as real evidence: PASS_GOLD", "advisory gate cannot be used as real evidence: PASS_GOLD"} {
		if !has(v.UnsafeClaims, want) {
			t.Fatalf("missing unsafe gate %q: %+v", want, v.UnsafeClaims)
		}
	}
}

func TestValidateHandoffDetectsMissingControlsBoundaryChecklist(t *testing.T) {
	in := completeInput()
	in.Artifacts = nil
	in.RollbackRequirements = nil
	in.KillSwitchRequirements = nil
	in.ObservabilityRequirements = nil
	in.Boundary = nil
	in.Checklist = nil
	v := ValidateHandoff(in)
	for _, want := range []string{"required_artifacts", "rollback_requirements", "kill_switch_requirements", "observability_requirements", "handoff_boundary", "checklist"} {
		if !has(v.MissingItems, want) {
			t.Fatalf("missing item %q not detected: %+v", want, v.MissingItems)
		}
	}
}

func TestValidateHandoffDetectsReadyClaimWhileIncomplete(t *testing.T) {
	v := ValidateHandoff(HandoffInput{HandoffID: "h", Executor: "external", ExternalExecutorHandoffReady: true})
	if !has(v.Conflicts, "external_executor_handoff_ready=true while required items or real gates are missing") {
		t.Fatalf("ready conflict not detected: %+v", v.Conflicts)
	}
}

func TestBuildHandoffPackageCompleteReadyDryRun(t *testing.T) {
	p := BuildHandoffPackage(completeInput())
	if p.PackageStatus != StatusReadyDryRun || !p.ExternalExecutorHandoffReady {
		t.Fatalf("expected ready dry-run: %+v", p)
	}
	if p.PromotionAllowed || p.DeployAllowed || p.StatusPublishAllowed || p.MutationAllowed || p.MemoryWriteAllowed || p.ExecutorCallAllowedInsideMCP || p.FileWriteAllowed || p.UsableForPassGold || p.UsableForPassSecure {
		t.Fatalf("ready package leaked permissions: %+v", p)
	}
}

func TestAuditHandoffDetectsAttemptsAndGateClaims(t *testing.T) {
	a := AuditHandoff(HandoffInput{Executor: "mcp", PromotionAllowed: true, MutationAllowed: true, ExecutorCallAllowedInsideMCP: true, FileWriteAllowed: true, WriteHandoffFile: true, AttemptExternalCall: true, FileWrite: true, CommandExecution: true, NetworkCall: true, Gates: []HandoffGate{{Gate: "PASS_GOLD", DryRun: true, Synthesized: true}}})
	if !a.ExecutionAttemptFound || !a.MutationAttemptFound || !a.FileWriteAttemptFound || !a.MCPExecutorCallAttemptFound || !a.DryRunGateClaimFound || !a.SynthesizedGateClaimFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
}

func TestExplainHandoffExplainsNotPassGoldExecutionOrFile(t *testing.T) {
	e := ExplainHandoff(HandoffInput{})
	if len(e.WhyHandoffIsNotPassGold) == 0 || len(e.WhyHandoffIsNotExecution) == 0 || len(e.WhyHandoffIsNotAFile) == 0 {
		t.Fatalf("missing explanations: %+v", e)
	}
	if !has(e.RequiredGates, "PASS_GOLD") || !has(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("missing required gates: %+v", e.RequiredGates)
	}
}
