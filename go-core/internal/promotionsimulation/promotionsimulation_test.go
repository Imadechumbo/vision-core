package promotionsimulation

import (
	"testing"

	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func validSimulationInput() PromotionSimulationInput {
	present := func() *PresenceValid { return &PresenceValid{Present: true, Valid: true} }
	return PromotionSimulationInput{
		Executor:                        "external_promotion_executor",
		ExecutorMode:                    "external_only",
		PromotionExecutionCandidate:     true,
		ExecutionEligibilityReadyDryRun: true,
		PromotionFirewall:               &PromotionFirewallEvidence{Version: "V10.1", DryRun: true, ReadOnly: true, Valid: true, FirewallValid: true, ExecutionEligibilityReadyDryRun: true},
		RealGates: []sovereigndecision.SovereignRealGate{
			{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, Source: "validator", ArtifactID: "pg", RecognizedByAuthority: true},
			{Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, Source: "runner", ArtifactID: "ps", RecognizedByAuthority: true},
		},
		ExecutionPlan:     &ExecutionPlan{Present: true, Valid: true},
		SimulationSteps:   []SimulationStep{{Name: "inspect", Action: "read", Mutating: false}},
		GatePlan:          present(),
		ControlsPlan:      &ControlsPlan{Present: true, Valid: true, ReadOnly: true, DryRun: true, NoExecutorCall: true, NoNetworkCall: true, NoCommandExecution: true, NoFileWrite: true, NoMutation: true, NoRealLock: true, NoRollbackExecution: true, NoSimulationPersistence: true},
		Rollback:          present(),
		Observability:     present(),
		StatusPublication: present(),
		Lock:              present(),
		Idempotency:       present(),
		KillSwitch:        present(),
		Timeout:           present(),
		StopCriteria:      present(),
		Evidence:          present(),
		Policy:            present(),
		Controls:          &SimulationControls{},
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

func TestBuildPromotionSimulationReadyDryRunStillDeniesEverything(t *testing.T) {
	r := BuildPromotionSimulation(validSimulationInput())
	if !r.Valid || r.Blocked || r.SimulationStatus != StatusSimulationReadyDryRun || !r.PromotionExecutionCandidate || !r.ExecutionEligibilityReadyDryRun {
		t.Fatalf("expected ready dry-run simulation: %+v", r)
	}
	if r.Version != Version || !r.DryRun || !r.ReadOnly {
		t.Fatalf("expected V10.2 dry-run read-only result: %+v", r)
	}
	if r.MCPExecutionAllowed || r.ExecutorCallAllowed || r.NetworkCallAllowed || r.CommandExecutionAllowed || r.FileWriteAllowed || r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed || r.StablePromotionAllowed || r.LearningAllowed || r.RealLockAllowed || r.RollbackAllowed || r.SimulationPersistenceAllowed || r.PassGoldAllowed || r.PassSecureAllowed || r.AuthorityGrantAllowed {
		t.Fatalf("simulation granted forbidden authority: %+v", r)
	}
}

func TestValidatePromotionSimulationBlocksMandatoryFailures(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*PromotionSimulationInput)
		want   string
	}{
		{"executor mcp", func(i *PromotionSimulationInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *PromotionSimulationInput) { i.ExecutorMode = "inside_mcp" }, "executor_mode_must_be_external_only"},
		{"firewall absent", func(i *PromotionSimulationInput) { i.PromotionFirewall = nil }, "promotion_firewall"},
		{"firewall invalid", func(i *PromotionSimulationInput) {
			i.PromotionFirewall.Valid = false
			i.PromotionFirewall.FirewallValid = false
		}, "promotion_firewall_invalid"},
		{"eligibility false", func(i *PromotionSimulationInput) {
			i.ExecutionEligibilityReadyDryRun = false
			i.PromotionFirewall.ExecutionEligibilityReadyDryRun = false
		}, "execution_eligibility_ready_dry_run"},
		{"candidate false", func(i *PromotionSimulationInput) { i.PromotionExecutionCandidate = false }, "promotion_execution_candidate"},
		{"missing gold", func(i *PromotionSimulationInput) { i.RealGates = i.RealGates[1:] }, "PASS_GOLD_REAL"},
		{"dry run gate", func(i *PromotionSimulationInput) { i.RealGates[0].DryRun = true }, "PASS_GOLD_dry_run_gate_claim"},
		{"synthesized gate", func(i *PromotionSimulationInput) { i.RealGates[0].Synthesized = true }, "PASS_GOLD_synthesized_gate_claim"},
		{"unrecognized gate", func(i *PromotionSimulationInput) { i.RealGates[0].RecognizedByAuthority = false }, "PASS_GOLD_not_recognized_by_authority"},
		{"execution plan missing", func(i *PromotionSimulationInput) { i.ExecutionPlan = nil }, "execution_plan"},
		{"steps missing", func(i *PromotionSimulationInput) { i.SimulationSteps = nil }, "simulation_steps"},
		{"mutating step", func(i *PromotionSimulationInput) { i.SimulationSteps[0].Mutating = true }, "simulation_step_mutating:inspect"},
		{"gate plan missing", func(i *PromotionSimulationInput) { i.GatePlan = nil }, "gate_plan"},
		{"controls plan missing", func(i *PromotionSimulationInput) { i.ControlsPlan = nil }, "controls_plan"},
		{"controls plan insecure", func(i *PromotionSimulationInput) { i.ControlsPlan.NoFileWrite = false }, "controls_plan_insecure"},
		{"rollback missing", func(i *PromotionSimulationInput) { i.Rollback = nil }, "rollback"},
		{"observability missing", func(i *PromotionSimulationInput) { i.Observability = nil }, "observability"},
		{"status publication missing", func(i *PromotionSimulationInput) { i.StatusPublication = nil }, "status_publication"},
		{"lock missing", func(i *PromotionSimulationInput) { i.Lock = nil }, "lock"},
		{"idempotency missing", func(i *PromotionSimulationInput) { i.Idempotency = nil }, "idempotency"},
		{"kill switch missing", func(i *PromotionSimulationInput) { i.KillSwitch = nil }, "kill_switch"},
		{"timeout missing", func(i *PromotionSimulationInput) { i.Timeout = nil }, "timeout"},
		{"stop criteria missing", func(i *PromotionSimulationInput) { i.StopCriteria = nil }, "stop_criteria"},
		{"evidence missing", func(i *PromotionSimulationInput) { i.Evidence = nil }, "evidence"},
		{"policy missing", func(i *PromotionSimulationInput) { i.Policy = nil }, "policy"},
		{"publish inside mcp", func(i *PromotionSimulationInput) { i.Controls.PublishInsideMCPAllowed = true }, "publish_inside_mcp_allowed"},
		{"real lock acquired", func(i *PromotionSimulationInput) { i.Controls.RealLockAcquired = true }, "real_lock_acquired"},
		{"execution claim", func(i *PromotionSimulationInput) { i.ExecutionAllowed = true }, "execution_allowed"},
		{"executor claim", func(i *PromotionSimulationInput) { i.ExecutorAllowed = true }, "executor_allowed"},
		{"network claim", func(i *PromotionSimulationInput) { i.NetworkCallAllowed = true }, "network_call_allowed"},
		{"command claim", func(i *PromotionSimulationInput) { i.CommandExecutionAllowed = true }, "command_execution_allowed"},
		{"file claim", func(i *PromotionSimulationInput) { i.FileWriteAllowed = true }, "file_write_allowed"},
		{"promotion claim", func(i *PromotionSimulationInput) { i.PromotionAllowed = true }, "promotion_allowed"},
		{"deploy claim", func(i *PromotionSimulationInput) { i.DeployAllowed = true }, "deploy_allowed"},
		{"status claim", func(i *PromotionSimulationInput) { i.StatusPublishAllowed = true }, "status_publish_allowed"},
		{"memory claim", func(i *PromotionSimulationInput) { i.MemoryWriteAllowed = true }, "memory_write_allowed"},
		{"stable claim", func(i *PromotionSimulationInput) { i.StablePromotionAllowed = true }, "stable_promotion_allowed"},
		{"rollback claim", func(i *PromotionSimulationInput) { i.RollbackAllowed = true }, "rollback_allowed"},
		{"simulation persistence claim", func(i *PromotionSimulationInput) { i.SimulationPersistenceAllowed = true }, "simulation_persistence_allowed"},
		{"pass gold claim", func(i *PromotionSimulationInput) { i.PassGoldAllowed = true }, "pass_gold_allowed"},
		{"pass secure claim", func(i *PromotionSimulationInput) { i.PassSecureAllowed = true }, "pass_secure_allowed"},
		{"authority claim", func(i *PromotionSimulationInput) { i.AuthorityGrantAllowed = true }, "authority_grant_allowed"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validSimulationInput()
			tc.mutate(&in)
			v := ValidatePromotionSimulation(in)
			if v.Valid || !v.Blocked {
				t.Fatalf("expected blocked invalid result: %+v", v)
			}
			if !has(v.MissingItems, tc.want) && !has(v.Conflicts, tc.want) && !has(v.UnsafeClaims, tc.want) {
				t.Fatalf("missing expected %s in %+v", tc.want, v)
			}
		})
	}
}

func TestPromotionSimulationBoundaryDryRunReadOnlyAndForbidden(t *testing.T) {
	b := BuildPromotionSimulationBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("boundary must be V10.2 dry-run read-only: %+v", b)
	}
	for _, want := range []string{"call_executor", "persist_simulation", "grant_authority"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Fatalf("boundary missing forbidden action %s: %+v", want, b)
		}
	}
	for _, want := range []string{"mcp_execution_allowed", "simulation_persistence_allowed", "authority_grant_allowed"} {
		if !has(b.AlwaysDenied, want) {
			t.Fatalf("boundary missing always-denied %s: %+v", want, b)
		}
	}
}

func TestPromotionSimulationAuditAndExplain(t *testing.T) {
	in := validSimulationInput()
	in.ExecutorCallAllowed = true
	in.FileWriteAllowed = true
	in.PromotionAllowed = true
	in.Claims = &SimulationClaims{SimulationPersisted: true, AuthorityGranted: true}
	a := AuditPromotionSimulation(in)
	if !a.UnsafeClaimsFound || !a.ExecutorCallAttemptFound || !a.FileWriteAttemptFound || !a.PromotionAttemptFound || !a.SimulationPersistedFound || !a.AuthorityGrantAttemptFound {
		t.Fatalf("audit did not detect unsafe attempts: %+v", a)
	}
	e := ExplainPromotionSimulation(validSimulationInput())
	if e.Version != Version || !e.DryRun || !e.ReadOnly || len(e.WhySimulationIsNotExecute) == 0 || len(e.RequiredGates) != 2 {
		t.Fatalf("unexpected explain payload: %+v", e)
	}
}
