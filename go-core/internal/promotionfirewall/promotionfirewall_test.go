package promotionfirewall

import (
	"testing"

	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func validFirewallInput() PromotionFirewallInput {
	return PromotionFirewallInput{
		DecisionID:                 "decision-001",
		Executor:                   "external_promotion_executor",
		ExecutorMode:               "external_only",
		PromotionDecisionCandidate: true,
		RealGates: []sovereigndecision.SovereignRealGate{
			{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, Source: "validator", ArtifactID: "pg", RecognizedByAuthority: true},
			{Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, Source: "runner", ArtifactID: "ps", RecognizedByAuthority: true},
		},
		HumanApproval:             &HumanApproval{Present: true, Approved: true, Approver: "operator", ApprovalReference: "approval-001"},
		IndependentRevalidation:   &IndependentRevalidation{Present: true, Completed: true, Validator: "reviewer", RevalidationReference: "reval-001"},
		RollbackRequirements:      &RollbackRequirements{Present: true, RollbackPlanPresent: true},
		ObservabilityRequirements: &ObservabilityRequirements{Present: true, HealthChecksPresent: true, MetricsPresent: true, AlertingPresent: true},
		Policy:                    &FirewallPolicy{Present: true, RejectExecutionClaims: true, RequireExternalOnly: true, RequireReadOnlyDryRun: true},
		Controls:                  &FirewallControls{Present: true, ReadOnly: true, DryRun: true, NoExecutorCall: true, NoNetworkCall: true, NoCommandExecution: true, NoFileWrite: true, NoRealLock: true},
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

func TestBuildPromotionFirewallReadyDryRunStillDeniesEverything(t *testing.T) {
	r := BuildPromotionFirewall(validFirewallInput())
	if !r.Valid || r.Blocked || r.FirewallStatus != StatusExecutionEligibilityReadyDryRun || !r.ExecutionEligibilityReadyDryRun {
		t.Fatalf("expected ready dry-run firewall: %+v", r)
	}
	if r.MCPExecutionAllowed || r.ExecutorCallAllowed || r.NetworkCallAllowed || r.CommandExecutionAllowed || r.FileWriteAllowed || r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MemoryWriteAllowed || r.StablePromotionAllowed || r.LearningAllowed {
		t.Fatalf("firewall granted forbidden authority: %+v", r)
	}
}

func TestValidatePromotionFirewallBlocksMandatoryFailures(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*PromotionFirewallInput)
		want   string
	}{
		{"executor mcp", func(i *PromotionFirewallInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *PromotionFirewallInput) { i.ExecutorMode = "inside_mcp" }, "executor_mode_must_be_external_only"},
		{"candidate false", func(i *PromotionFirewallInput) { i.PromotionDecisionCandidate = false }, "promotion_decision_candidate"},
		{"missing gold", func(i *PromotionFirewallInput) { i.RealGates = i.RealGates[1:] }, "PASS_GOLD_REAL"},
		{"dry run gate", func(i *PromotionFirewallInput) { i.RealGates[0].DryRun = true }, "PASS_GOLD_dry_run_gate_claim"},
		{"synthesized gate", func(i *PromotionFirewallInput) { i.RealGates[0].Synthesized = true }, "PASS_GOLD_synthesized_gate_claim"},
		{"unrecognized gate", func(i *PromotionFirewallInput) { i.RealGates[0].RecognizedByAuthority = false }, "PASS_GOLD_not_recognized_by_authority"},
		{"human missing", func(i *PromotionFirewallInput) { i.HumanApproval = nil }, "human_approval"},
		{"human placeholder", func(i *PromotionFirewallInput) { i.HumanApproval.ApprovalIsPlaceholder = true }, "human_approval_placeholder"},
		{"revalidation missing", func(i *PromotionFirewallInput) { i.IndependentRevalidation = nil }, "independent_revalidation"},
		{"revalidation placeholder", func(i *PromotionFirewallInput) { i.IndependentRevalidation.RevalidationIsPlaceholder = true }, "independent_revalidation_placeholder"},
		{"rollback missing", func(i *PromotionFirewallInput) { i.RollbackRequirements = nil }, "rollback_requirements"},
		{"observability missing", func(i *PromotionFirewallInput) { i.ObservabilityRequirements = nil }, "observability_requirements"},
		{"policy missing", func(i *PromotionFirewallInput) { i.Policy = nil }, "policy"},
		{"controls missing", func(i *PromotionFirewallInput) { i.Controls = nil }, "controls"},
		{"execution claim", func(i *PromotionFirewallInput) { i.ExecutionAllowed = true }, "execution_allowed"},
		{"executor claim", func(i *PromotionFirewallInput) { i.ExecutorCallAllowed = true }, "executor_call_allowed"},
		{"network claim", func(i *PromotionFirewallInput) { i.NetworkCallAllowed = true }, "network_call_allowed"},
		{"command claim", func(i *PromotionFirewallInput) { i.CommandExecutionAllowed = true }, "command_execution_allowed"},
		{"file claim", func(i *PromotionFirewallInput) { i.FileWriteAllowed = true }, "file_write_allowed"},
		{"promotion claim", func(i *PromotionFirewallInput) { i.PromotionAllowed = true }, "promotion_allowed"},
		{"deploy claim", func(i *PromotionFirewallInput) { i.DeployAllowed = true }, "deploy_allowed"},
		{"status claim", func(i *PromotionFirewallInput) { i.StatusPublishAllowed = true }, "status_publish_allowed"},
		{"memory claim", func(i *PromotionFirewallInput) { i.MemoryWriteAllowed = true }, "memory_write_allowed"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validFirewallInput()
			tc.mutate(&in)
			v := ValidatePromotionFirewall(in)
			if v.Valid || !v.Blocked {
				t.Fatalf("expected blocked invalid result: %+v", v)
			}
			if !has(v.MissingItems, tc.want) && !has(v.Conflicts, tc.want) && !has(v.UnsafeClaims, tc.want) {
				t.Fatalf("missing expected %s in %+v", tc.want, v)
			}
		})
	}
}

func TestPromotionFirewallBoundaryDryRunReadOnlyAndForbidden(t *testing.T) {
	b := BuildPromotionFirewallBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("bad boundary metadata: %+v", b)
	}
	for _, want := range []string{"call_executor", "acquire_lock", "promote", "deploy", "publish_status", "write_memory", "execute_rollback"} {
		if !has(b.ForbiddenInsideMCP, want) {
			t.Fatalf("missing forbidden %s", want)
		}
	}
	for _, want := range []string{"mcp_execution_allowed", "executor_call_allowed", "promotion_allowed", "learning_allowed"} {
		if !has(b.AlwaysDenied, want) {
			t.Fatalf("missing always denied %s", want)
		}
	}
}

func TestPromotionFirewallAuditAndExplain(t *testing.T) {
	in := validFirewallInput()
	in.ExecutorCallAllowed = true
	in.FileWriteAllowed = true
	a := AuditPromotionFirewall(in)
	if !a.UnsafeClaimsFound || !a.ExecutorCallAttemptFound || !a.FileWriteAttemptFound {
		t.Fatalf("expected unsafe audit findings: %+v", a)
	}
	e := ExplainPromotionFirewall(in)
	if e.Version != Version || !e.DryRun || !e.ReadOnly || len(e.AlwaysDenied) == 0 || len(e.WhyEligibilityIsNotExecution) == 0 {
		t.Fatalf("bad explain payload: %+v", e)
	}
}
