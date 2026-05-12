package rehearsalrecorder

import "testing"

func completeInput() RehearsalInput {
	return RehearsalInput{
		MissionInput: "CORS origin blocked", Operation: "external_executor_rehearsal", RehearsalID: "rehearsal-001",
		Executor: "external_promotion_executor", Target: "stable", Environment: "local",
		SafetyEnvelopeValid: true, PromotionContractValid: true,
		ExpectedActions:        []ExpectedAction{{ID: "act-001", Name: "verify_authority_artifacts", Category: "validation", WouldExecuteOutsideMCP: true, InsideMCPAllowed: false, RequiresGate: "PASS_GOLD", Order: 1}},
		ForbiddenActions:       []string{"promote_inside_mcp", "deploy_inside_mcp", "publish_status_inside_mcp", "write_memory_inside_mcp", "call_external_executor_inside_mcp"},
		ReplayPlan:             ReplayPlan{Present: true, Steps: []string{"validate_gates", "verify_safety_envelope", "simulate_promotion_order", "confirm_no_mutation"}, Deterministic: true, TargetMatched: true, EnvironmentMatched: true},
		NoMutationProof:        NoMutationProof{Present: true, NoFilesWritten: true, NoCommandsExecuted: true, NoNetworkCalled: true, NoStatusPublished: true, NoDeployPerformed: true, NoLockAcquired: true, NoRollbackPerformed: true},
		AuditSummary:           RehearsalAuditSummary{Present: true, AuditID: "audit-rehearsal-001", RecordsInputs: true, RecordsExpectedActions: true, RecordsForbiddenActions: true, RecordsSafetyControls: true, RecordsNoMutation: true},
		EvidenceSummary:        RehearsalEvidenceSummary{Present: true, IncludesPassGoldRealReference: true, IncludesPassSecureRealReference: true, IncludesSafetyEnvelopeReference: true, IncludesPromotionContractReference: true, UsesDryRunAsRealGate: false},
		RollbackRehearsal:      RollbackRehearsal{Present: true, Strategy: "snapshot_restore", SimulatedOnly: true, RestorePathDeclared: true, ValidationAfterSimulatedRestore: true, NoRealRollbackPerformed: true},
		ObservabilityRehearsal: ObservabilityRehearsal{Present: true, HealthChecksPlanned: true, MetricsPlanned: true, LogsPlanned: true, AlertingPlanned: true, WatchWindowSeconds: 600},
		Checklist:              SafetyChecklist{Present: true, PassGoldRealChecked: true, PassSecureRealChecked: true, PromotionContractChecked: true, SafetyEnvelopeChecked: true, IdempotencyChecked: true, LockLeaseChecked: true, TimeoutChecked: true, KillSwitchChecked: true, AuditTrailChecked: true, RollbackChecked: true, ObservabilityChecked: true, FallbackChecked: true, NoMutationChecked: true},
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

func TestBuildRehearsalBoundaryReadOnlyV93(t *testing.T) {
	b := BuildRehearsalBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("boundary must be V9.3 dry_run/read_only: %#v", b)
	}
}

func TestBoundaryDefinesMCPScopeOnly(t *testing.T) {
	b := BuildRehearsalBoundary()
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate_rehearsal", "record_logical_payload"} {
		if !has(b.MCPScope, want) {
			t.Errorf("MCP scope missing %q", want)
		}
	}
}

func TestBoundaryForbidsMutationsInsideMCP(t *testing.T) {
	b := BuildRehearsalBoundary()
	for _, want := range []string{"promote", "deploy", "publish_status", "push", "PR", "write_memory", "call_external_executor", "acquire_real_lock", "perform_rollback", "write_rehearsal_file"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Errorf("forbidden_inside_mcp missing %q", want)
		}
	}
}

func TestBuildRehearsalRecordAlwaysDeniesMCPMutationPermissions(t *testing.T) {
	r := BuildRehearsalRecord(completeInput())
	if r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed || r.MCPExecutionAllowed {
		t.Fatalf("record must deny MCP mutation permissions: %#v", r)
	}
}

func TestBuildRehearsalRecordNeverUsableForPassGates(t *testing.T) {
	r := BuildRehearsalRecord(completeInput())
	if r.UsableForPassGold || r.UsableForPassSecure {
		t.Fatalf("rehearsal must never be usable for pass gates: %#v", r)
	}
}

func TestValidateRehearsalBlocksUnsafeInputs(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*RehearsalInput)
		claim  string
	}{
		{"executor mcp", func(i *RehearsalInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"promotion allowed", func(i *RehearsalInput) { i.PromotionAllowed = true }, "promotion_allowed_inside_mcp"},
		{"deploy allowed", func(i *RehearsalInput) { i.DeployAllowed = true }, "deploy_allowed_inside_mcp"},
		{"status publish allowed", func(i *RehearsalInput) { i.StatusPublishAllowed = true }, "status_publish_allowed_inside_mcp"},
		{"mutation allowed", func(i *RehearsalInput) { i.MutationAllowed = true }, "mutation_allowed_inside_mcp"},
		{"memory write allowed", func(i *RehearsalInput) { i.MemoryWriteAllowed = true }, "memory_write_allowed_inside_mcp"},
		{"attempt external call", func(i *RehearsalInput) { i.AttemptExternalCall = true }, "attempt_external_call_inside_mcp"},
		{"attempt real rollback", func(i *RehearsalInput) { i.AttemptRealRollback = true }, "attempt_real_rollback_inside_mcp"},
		{"attempt real lock", func(i *RehearsalInput) { i.AttemptRealLock = true }, "attempt_real_lock_inside_mcp"},
		{"command execution", func(i *RehearsalInput) { i.CommandExecution = true }, "command_execution_inside_mcp"},
		{"network call", func(i *RehearsalInput) { i.NetworkCall = true }, "network_call_inside_mcp"},
		{"file write", func(i *RehearsalInput) { i.FileWrite = true }, "file_write_inside_mcp"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := completeInput()
			tt.mutate(&in)
			v := ValidateRehearsal(in)
			if v.Valid || !v.Blocked || !has(v.UnsafeClaims, tt.claim) {
				t.Fatalf("expected blocked with %q, got %#v", tt.claim, v)
			}
		})
	}
}

func TestValidateRehearsalDetectsMissingItems(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*RehearsalInput)
		miss   string
	}{
		{"safety envelope", func(i *RehearsalInput) { i.SafetyEnvelopeValid = false }, "safety_envelope_valid"},
		{"promotion contract", func(i *RehearsalInput) { i.PromotionContractValid = false }, "promotion_contract_valid"},
		{"expected actions", func(i *RehearsalInput) { i.ExpectedActions = nil }, "expected_actions"},
		{"forbidden actions", func(i *RehearsalInput) { i.ForbiddenActions = nil }, "forbidden_actions"},
		{"replay plan", func(i *RehearsalInput) { i.ReplayPlan = ReplayPlan{} }, "replay_plan"},
		{"no mutation proof", func(i *RehearsalInput) { i.NoMutationProof = NoMutationProof{} }, "no_mutation_proof"},
		{"audit summary", func(i *RehearsalInput) { i.AuditSummary = RehearsalAuditSummary{} }, "audit_summary"},
		{"evidence summary", func(i *RehearsalInput) { i.EvidenceSummary = RehearsalEvidenceSummary{} }, "evidence_summary"},
		{"rollback rehearsal", func(i *RehearsalInput) { i.RollbackRehearsal = RollbackRehearsal{} }, "rollback_rehearsal"},
		{"observability rehearsal", func(i *RehearsalInput) { i.ObservabilityRehearsal = ObservabilityRehearsal{} }, "observability_rehearsal"},
		{"checklist", func(i *RehearsalInput) { i.Checklist = SafetyChecklist{} }, "checklist"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := completeInput()
			tt.mutate(&in)
			v := ValidateRehearsal(in)
			if v.Valid || !has(v.MissingItems, tt.miss) {
				t.Fatalf("expected missing %q, got %#v", tt.miss, v)
			}
		})
	}
}

func TestValidateDetectsNoMutationContradiction(t *testing.T) {
	in := completeInput()
	in.FileWrite = true
	in.CommandExecution = true
	in.NetworkCall = true
	v := ValidateRehearsal(in)
	for _, want := range []string{"no_mutation_proof_contradicts_file_write", "no_mutation_proof_contradicts_command_execution", "no_mutation_proof_contradicts_network_call"} {
		if !has(v.UnsafeClaims, want) {
			t.Fatalf("missing unsafe claim %q in %#v", want, v)
		}
	}
}

func TestBuildRehearsalRecordCompleteReadyAdvisoryOnly(t *testing.T) {
	r := BuildRehearsalRecord(completeInput())
	if r.RehearsalStatus != "rehearsal_ready_dry_run" || !r.WouldAllowExternalExecutor {
		t.Fatalf("complete rehearsal should be ready advisory-only: %#v", r)
	}
	if r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed {
		t.Fatalf("ready rehearsal must still deny MCP mutation permissions: %#v", r)
	}
}

func TestAuditRehearsalFindsExecutionMutationAndPassGold(t *testing.T) {
	in := completeInput()
	in.PromotionAllowed = true
	in.AttemptExternalCall = true
	in.FileWrite = true
	in.PassGold = true
	a := AuditRehearsal(in)
	if !a.ExecutionAttemptFound || !a.MutationAttemptFound || !a.UnsafeClaimsFound || !has(a.UnsafeClaims, "rehearsal_claims_pass_gold") {
		t.Fatalf("audit did not detect unsafe execution/mutation/pass gold: %#v", a)
	}
}

func TestExplainRehearsalExplainsNotPassGoldAndRequiredGates(t *testing.T) {
	e := ExplainRehearsal(RehearsalInput{})
	if len(e.WhyRehearsalIsNotPassGold) == 0 {
		t.Fatal("expected why_rehearsal_is_not_pass_gold")
	}
	if !has(e.RequiredGates, "PASS_GOLD") || !has(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("required_gates must contain PASS_GOLD/PASS_SECURE: %#v", e.RequiredGates)
	}
}
