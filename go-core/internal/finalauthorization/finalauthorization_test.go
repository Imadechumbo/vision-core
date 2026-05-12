package finalauthorization

import (
	"testing"

	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func validInput() FinalAuthorizationInput {
	pv := func() *PresenceValid { return &PresenceValid{Present: true, Valid: true} }
	return FinalAuthorizationInput{
		FinalAuthorizationID: "fa-1",
		SimulationID:         "sim-1",
		FirewallID:           "fw-1",
		DecisionID:           "dec-1",
		ReviewID:             "rev-1",
		IntakeID:             "intake-1",
		InvocationID:         "inv-1",
		Executor:             "external_promotion_executor",
		ExecutorMode:         "external_only",
		Project:              "vision-core",
		Branch:               "v6-go-enterprise-runtime",
		CommitSHA:            "088f7aa",
		Target:               "stable",
		Environment:          "production",
		PromotionSimulation:  &SimulationEvidence{Version: "V10.2", DryRun: true, ReadOnly: true, Valid: true, SimulationRecordReadyDryRun: true, ExecutionSimulationCandidate: true},
		PromotionFirewall:    &FirewallEvidence{Version: "V10.1", DryRun: true, ReadOnly: true, Valid: true, FirewallValid: true, ExecutionEligibilityReadyDryRun: true},
		SovereignDecision:    &SovereignDecisionEvidence{Version: "V10.0", DryRun: true, ReadOnly: true, Valid: true, SovereignDecisionValid: true, PromotionDecisionCandidate: true},
		RealGates: []sovereigndecision.SovereignRealGate{
			{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true},
			{Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true},
		},
		HumanApproval:           &HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true},
		IndependentRevalidation: &IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		RollbackPlan:            pv(),
		ObservabilityPlan:       pv(),
		Idempotency:             pv(),
		KillSwitch:              pv(),
		Timeout:                 pv(),
		FinalExecutionPolicy:    pv(),
		SafetyControls:          &SafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoExecutorCallInsideMCP: true, NoNetworkInsideMCP: true, NoCommandInsideMCP: true, NoFileWriteInsideMCP: true, NoDeployInsideMCP: true, NoStatusPublishInsideMCP: true, NoMemoryStableWriteInsideMCP: true},
	}
}

func TestBuildFinalAuthorizationReadyDryRunAlwaysDeniesRealPermissions(t *testing.T) {
	got := BuildFinalAuthorization(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Valid || got.Blocked || !got.FinalAuthorizationReadyDryRun || got.FinalAuthorizationStatus != StatusReadyDryRun {
		t.Fatalf("unexpected result: %+v", got)
	}
	if got.MCPExecutionAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.PromotionAllowed || got.DeployAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.FinalAuthorizationPersistenceAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("real permissions must stay false even when ready: %+v", got)
	}
}

func TestValidateFinalAuthorizationBlocksRequiredFailuresAndClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*FinalAuthorizationInput)
		want   string
	}{
		{"executor mcp", func(i *FinalAuthorizationInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *FinalAuthorizationInput) { i.ExecutorMode = "mcp_readonly" }, "executor_mode_must_be_external_only"},
		{"simulation missing", func(i *FinalAuthorizationInput) { i.PromotionSimulation = nil }, "simulation_missing"},
		{"simulation blocked", func(i *FinalAuthorizationInput) { i.PromotionSimulation.Valid = false }, "simulation_blocked"},
		{"simulation ready false", func(i *FinalAuthorizationInput) { i.PromotionSimulation.SimulationRecordReadyDryRun = false }, "simulation_record_ready_dry_run"},
		{"simulation candidate false", func(i *FinalAuthorizationInput) { i.PromotionSimulation.ExecutionSimulationCandidate = false }, "execution_simulation_candidate"},
		{"firewall missing", func(i *FinalAuthorizationInput) { i.PromotionFirewall = nil }, "firewall_missing"},
		{"firewall blocked", func(i *FinalAuthorizationInput) { i.PromotionFirewall.FirewallValid = false }, "firewall_blocked"},
		{"sovereign missing", func(i *FinalAuthorizationInput) { i.SovereignDecision = nil }, "sovereign_candidate_missing"},
		{"promotion candidate false", func(i *FinalAuthorizationInput) { i.SovereignDecision.PromotionDecisionCandidate = false }, "promotion_decision_candidate"},
		{"missing gold", func(i *FinalAuthorizationInput) { i.RealGates = i.RealGates[1:] }, "PASS_GOLD_REAL"},
		{"dry run gate", func(i *FinalAuthorizationInput) { i.RealGates[0].DryRun = true }, "PASS_GOLD_dry_run_gate_claim"},
		{"synthesized gate", func(i *FinalAuthorizationInput) { i.RealGates[0].Synthesized = true }, "PASS_GOLD_synthesized_gate_claim"},
		{"unrecognized gate", func(i *FinalAuthorizationInput) { i.RealGates[0].RecognizedByAuthority = false }, "PASS_GOLD_not_recognized_by_authority"},
		{"human missing", func(i *FinalAuthorizationInput) { i.HumanApproval = nil }, "human_approval"},
		{"human placeholder", func(i *FinalAuthorizationInput) { i.HumanApproval.Placeholder = true }, "human_approval_placeholder"},
		{"human not approved", func(i *FinalAuthorizationInput) { i.HumanApproval.Approved = false }, "human_approval_approved_false"},
		{"revalidation missing", func(i *FinalAuthorizationInput) { i.IndependentRevalidation = nil }, "independent_revalidation"},
		{"revalidation placeholder", func(i *FinalAuthorizationInput) { i.IndependentRevalidation.Placeholder = true }, "independent_revalidation_placeholder"},
		{"revalidation incomplete", func(i *FinalAuthorizationInput) { i.IndependentRevalidation.Completed = false }, "independent_revalidation_completed_false"},
		{"gold not revalidated", func(i *FinalAuthorizationInput) { i.IndependentRevalidation.PassGoldRevalidated = false }, "pass_gold_revalidated_false"},
		{"secure not revalidated", func(i *FinalAuthorizationInput) { i.IndependentRevalidation.PassSecureRevalidated = false }, "pass_secure_revalidated_false"},
		{"rollback missing", func(i *FinalAuthorizationInput) { i.RollbackPlan = nil }, "rollback_plan"},
		{"observability missing", func(i *FinalAuthorizationInput) { i.ObservabilityPlan = nil }, "observability_plan"},
		{"idempotency missing", func(i *FinalAuthorizationInput) { i.Idempotency = nil }, "idempotency"},
		{"kill switch missing", func(i *FinalAuthorizationInput) { i.KillSwitch = nil }, "kill_switch"},
		{"timeout missing", func(i *FinalAuthorizationInput) { i.Timeout = nil }, "timeout"},
		{"policy missing", func(i *FinalAuthorizationInput) { i.FinalExecutionPolicy = nil }, "final_execution_policy"},
		{"safety controls invalid", func(i *FinalAuthorizationInput) { i.SafetyControls.NoNetworkInsideMCP = false }, "safety_controls_invalid"},
		{"execution claim", func(i *FinalAuthorizationInput) { i.ExecutionAllowed = true }, "execution_allowed"},
		{"executor call claim", func(i *FinalAuthorizationInput) { i.ExecutorCallAllowed = true }, "executor_call_allowed"},
		{"network claim", func(i *FinalAuthorizationInput) { i.NetworkCallAllowed = true }, "network_call_allowed"},
		{"command claim", func(i *FinalAuthorizationInput) { i.CommandExecutionAllowed = true }, "command_execution_allowed"},
		{"file write claim", func(i *FinalAuthorizationInput) { i.FileWriteAllowed = true }, "file_write_allowed"},
		{"promotion claim", func(i *FinalAuthorizationInput) { i.PromotionAllowed = true }, "promotion_allowed"},
		{"deploy claim", func(i *FinalAuthorizationInput) { i.DeployAllowed = true }, "deploy_allowed"},
		{"status claim", func(i *FinalAuthorizationInput) { i.StatusPublishAllowed = true }, "status_publish_allowed"},
		{"memory claim", func(i *FinalAuthorizationInput) { i.MemoryWriteAllowed = true }, "memory_write_allowed"},
		{"persistence claim", func(i *FinalAuthorizationInput) { i.FinalAuthorizationPersistenceAllowed = true }, "final_authorization_persistence_allowed"},
		{"pass gold claim", func(i *FinalAuthorizationInput) { i.Claims = &FinalAuthorizationClaims{PassGold: true} }, "pass_gold"},
		{"authority claim", func(i *FinalAuthorizationInput) { i.AuthorityGrantAllowed = true }, "authority_grant_allowed"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := ValidateFinalAuthorization(in)
			if got.Valid || !got.Blocked {
				t.Fatalf("expected blocked invalid: %+v", got)
			}
			if !has(got.MissingItems, tc.want) && !has(got.Conflicts, tc.want) && !has(got.UnsafeClaims, tc.want) {
				t.Fatalf("missing %s in %+v", tc.want, got)
			}
		})
	}
}

func TestBoundaryAuditAndExplain(t *testing.T) {
	b := BuildFinalAuthorizationBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("bad boundary: %+v", b)
	}
	for _, want := range []string{"execute", "call_executor", "persist_final_authorization", "mark_PASS_GOLD", "grant_authority"} {
		if !has(b.MCPCannot, want) {
			t.Fatalf("boundary missing %s: %+v", want, b)
		}
	}
	for _, want := range []string{"mcp_execution_allowed", "final_authorization_persistence_allowed", "authority_grant_allowed"} {
		if !has(b.AlwaysDenied, want) {
			t.Fatalf("always denied missing %s: %+v", want, b)
		}
	}

	in := validInput()
	in.Claims = &FinalAuthorizationClaims{ExecutionAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, RealLockAcquired: true, RollbackPerformed: true, FinalAuthorizationPersisted: true, PassGold: true, AuthorityGranted: true, DryRunGateClaim: true, SynthesizedGateClaim: true, HumanApprovalBypassed: true, RevalidationBypassed: true}
	a := AuditFinalAuthorization(in)
	if !a.ExecutionAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.PromotionAttemptFound || !a.DeployAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.FinalAuthorizationPersistenceAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.DryRunGateClaimFound || !a.SynthesizedGateClaimFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainFinalAuthorization(validInput())
	if e.Version != Version || !e.DryRun || !e.ReadOnly || len(e.WhyFinalAuthorizationIsNotExecution) == 0 || len(e.WhyMCPCannotExecute) == 0 || len(e.RequiredGates) != 2 || !has(e.AlwaysDenied, "executor_call_allowed") {
		t.Fatalf("bad explain: %+v", e)
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
