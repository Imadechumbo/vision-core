package executionadapter

import (
	"testing"

	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func validInput() ExecutionAdapterInput {
	pv := func() *PresenceValid { return &PresenceValid{Present: true, Valid: true} }
	return ExecutionAdapterInput{
		AdapterInterfaceID:   "adapter-iface-1",
		FinalAuthorizationID: "fa-1",
		SimulationID:         "sim-1",
		FirewallID:           "fw-1",
		DecisionID:           "dec-1",
		InvocationID:         "inv-1",
		Executor:             "external_promotion_executor",
		ExecutorMode:         "external_only",
		AdapterName:          "external-execution-adapter",
		AdapterVersion:       "1.0.0",
		AdapterType:          "promotion_executor_adapter",
		Project:              "vision-core",
		Branch:               "v6-go-enterprise-runtime",
		CommitSHA:            "59a6624",
		Target:               "stable",
		Environment:          "production",
		FinalAuthorization:   &FinalAuthorizationEvidence{Version: "V10.3", DryRun: true, ReadOnly: true, Valid: true, FinalAuthorizationReadyDryRun: true},
		PromotionSimulation:  &SimulationEvidence{Version: "V10.2", DryRun: true, ReadOnly: true, Valid: true, SimulationRecordReadyDryRun: true, ExecutionSimulationCandidate: true},
		PromotionFirewall:    &FirewallEvidence{Version: "V10.1", DryRun: true, ReadOnly: true, Valid: true, FirewallValid: true, ExecutionEligibilityReadyDryRun: true},
		SovereignDecision:    &SovereignDecisionEvidence{Version: "V10.0", DryRun: true, ReadOnly: true, Valid: true, SovereignDecisionValid: true, PromotionDecisionCandidate: true},
		RealGates: []sovereigndecision.SovereignRealGate{
			{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true},
			{Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true},
		},
		HumanApproval:           &HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true},
		IndependentRevalidation: &IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		AdapterContractSchema:   pv(),
		InputContract:           pv(),
		OutputContract:          pv(),
		ErrorContract:           pv(),
		TimeoutContract:         pv(),
		IdempotencyContract:     pv(),
		KillSwitchContract:      pv(),
		RollbackContract:        pv(),
		ObservabilityContract:   pv(),
		AuditContract:           pv(),
		SecurityContract:        pv(),
		PolicyContract:          pv(),
		SafetyControls:          &SafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoAdapterCallInsideMCP: true, NoNetworkInsideMCP: true, NoCommandInsideMCP: true, NoFileWriteInsideMCP: true, NoDeployInsideMCP: true, NoStatusPublishInsideMCP: true, NoMemoryStableWriteInsideMCP: true},
	}
}

func TestBuildExecutionAdapterInterfaceReadyDryRunAlwaysDeniesRealPermissions(t *testing.T) {
	got := BuildExecutionAdapterInterface(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Valid || got.Blocked || !got.AdapterInterfaceReadyDryRun || got.AdapterInterfaceStatus != StatusReadyDryRun {
		t.Fatalf("unexpected result: %+v", got)
	}
	if got.MCPExecutionAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.PromotionAllowed || got.DeployAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.AdapterPersistenceAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("real permissions must stay false even when ready: %+v", got)
	}
}

func TestValidateExecutionAdapterInterfaceBlocksRequiredFailuresAndClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*ExecutionAdapterInput)
		want   string
	}{
		{"executor mcp", func(i *ExecutionAdapterInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *ExecutionAdapterInput) { i.ExecutorMode = "mcp_readonly" }, "executor_mode_must_be_external_only"},
		{"adapter name", func(i *ExecutionAdapterInput) { i.AdapterName = "" }, "adapter_name"},
		{"adapter version", func(i *ExecutionAdapterInput) { i.AdapterVersion = "" }, "adapter_version"},
		{"adapter type", func(i *ExecutionAdapterInput) { i.AdapterType = "" }, "adapter_type"},
		{"final authorization missing", func(i *ExecutionAdapterInput) { i.FinalAuthorization = nil }, "final_authorization_missing"},
		{"final authorization blocked", func(i *ExecutionAdapterInput) { i.FinalAuthorization.Valid = false }, "final_authorization_blocked"},
		{"final authorization ready false", func(i *ExecutionAdapterInput) { i.FinalAuthorization.FinalAuthorizationReadyDryRun = false }, "final_authorization_ready_dry_run"},
		{"simulation missing", func(i *ExecutionAdapterInput) { i.PromotionSimulation = nil }, "simulation_missing"},
		{"simulation blocked", func(i *ExecutionAdapterInput) { i.PromotionSimulation.Valid = false }, "simulation_blocked"},
		{"firewall missing", func(i *ExecutionAdapterInput) { i.PromotionFirewall = nil }, "firewall_missing"},
		{"firewall blocked", func(i *ExecutionAdapterInput) { i.PromotionFirewall.FirewallValid = false }, "firewall_blocked"},
		{"sovereign missing", func(i *ExecutionAdapterInput) { i.SovereignDecision = nil }, "sovereign_candidate_missing"},
		{"missing gold", func(i *ExecutionAdapterInput) { i.RealGates = i.RealGates[1:] }, "PASS_GOLD_REAL"},
		{"dry run gate", func(i *ExecutionAdapterInput) { i.RealGates[0].DryRun = true }, "PASS_GOLD_dry_run_gate_claim"},
		{"synthesized gate", func(i *ExecutionAdapterInput) { i.RealGates[0].Synthesized = true }, "PASS_GOLD_synthesized_gate_claim"},
		{"unrecognized gate", func(i *ExecutionAdapterInput) { i.RealGates[0].RecognizedByAuthority = false }, "PASS_GOLD_not_recognized_by_authority"},
		{"human missing", func(i *ExecutionAdapterInput) { i.HumanApproval = nil }, "human_approval"},
		{"human placeholder", func(i *ExecutionAdapterInput) { i.HumanApproval.Placeholder = true }, "human_approval_placeholder"},
		{"revalidation missing", func(i *ExecutionAdapterInput) { i.IndependentRevalidation = nil }, "independent_revalidation"},
		{"revalidation incomplete", func(i *ExecutionAdapterInput) { i.IndependentRevalidation.Completed = false }, "independent_revalidation_completed_false"},
		{"gold not revalidated", func(i *ExecutionAdapterInput) { i.IndependentRevalidation.PassGoldRevalidated = false }, "pass_gold_revalidated_false"},
		{"input contract missing", func(i *ExecutionAdapterInput) { i.InputContract = nil }, "input_contract"},
		{"output contract invalid", func(i *ExecutionAdapterInput) { i.OutputContract.Valid = false }, "output_contract_invalid"},
		{"error contract missing", func(i *ExecutionAdapterInput) { i.ErrorContract = nil }, "error_contract"},
		{"timeout contract missing", func(i *ExecutionAdapterInput) { i.TimeoutContract = nil }, "timeout_contract"},
		{"idempotency contract missing", func(i *ExecutionAdapterInput) { i.IdempotencyContract = nil }, "idempotency_contract"},
		{"kill switch contract missing", func(i *ExecutionAdapterInput) { i.KillSwitchContract = nil }, "kill_switch_contract"},
		{"rollback contract missing", func(i *ExecutionAdapterInput) { i.RollbackContract = nil }, "rollback_contract"},
		{"observability contract missing", func(i *ExecutionAdapterInput) { i.ObservabilityContract = nil }, "observability_contract"},
		{"audit contract missing", func(i *ExecutionAdapterInput) { i.AuditContract = nil }, "audit_contract"},
		{"security contract missing", func(i *ExecutionAdapterInput) { i.SecurityContract = nil }, "security_contract"},
		{"policy contract missing", func(i *ExecutionAdapterInput) { i.PolicyContract = nil }, "policy_contract"},
		{"safety controls invalid", func(i *ExecutionAdapterInput) { i.SafetyControls.NoAdapterCallInsideMCP = false }, "safety_controls_invalid"},
		{"adapter call claim", func(i *ExecutionAdapterInput) { i.AdapterCallAllowed = true }, "adapter_call_allowed"},
		{"execution claim", func(i *ExecutionAdapterInput) { i.Claims = &ExecutionAdapterClaims{ExecutionAllowed: true} }, "execution_allowed"},
		{"network claim", func(i *ExecutionAdapterInput) { i.NetworkCallAllowed = true }, "network_call_allowed"},
		{"persistence claim", func(i *ExecutionAdapterInput) { i.Claims = &ExecutionAdapterClaims{AdapterContractPersisted: true} }, "adapter_contract_persisted"},
		{"pass gold claim", func(i *ExecutionAdapterInput) { i.Claims = &ExecutionAdapterClaims{PassGold: true} }, "pass_gold"},
		{"authority claim", func(i *ExecutionAdapterInput) { i.AuthorityGrantAllowed = true }, "authority_grant_allowed"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := ValidateExecutionAdapterInterface(in)
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
	b := BuildExecutionAdapterBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("bad boundary: %+v", b)
	}
	for _, want := range []string{"execute", "call_adapter", "call_executor", "persist_adapter_contract", "mark_PASS_GOLD", "grant_authority"} {
		if !has(b.MCPCannot, want) {
			t.Fatalf("boundary missing %s: %+v", want, b)
		}
	}
	for _, want := range []string{"mcp_execution_allowed", "adapter_call_allowed", "adapter_persistence_allowed", "authority_grant_allowed"} {
		if !has(b.AlwaysDenied, want) {
			t.Fatalf("always denied missing %s: %+v", want, b)
		}
	}

	in := validInput()
	in.Claims = &ExecutionAdapterClaims{AdapterCallAllowed: true, ExecutionAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, RealLockAcquired: true, RollbackPerformed: true, AdapterContractPersisted: true, PassGold: true, AuthorityGranted: true, DryRunGateClaim: true, SynthesizedGateClaim: true, HumanApprovalBypassed: true, RevalidationBypassed: true, ContractBypassed: true}
	a := AuditExecutionAdapterInterface(in)
	if !a.AdapterCallAttemptFound || !a.ExecutionAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.PromotionAttemptFound || !a.DeployAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.AdapterPersistenceAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.DryRunGateClaimFound || !a.SynthesizedGateClaimFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.ContractBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainExecutionAdapterInterface(validInput())
	if e.Version != Version || !e.DryRun || !e.ReadOnly || len(e.WhyAdapterInterfaceIsNotExecution) == 0 || len(e.WhyAdapterCallIsBlockedInsideMCP) == 0 || len(e.WhyContractsAreRequired) == 0 || len(e.RequiredGates) != 2 || !has(e.AlwaysDenied, "adapter_call_allowed") {
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
