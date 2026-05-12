package executionruntime

import (
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func pv() *executionresponse.PresenceValid {
	return &executionresponse.PresenceValid{Present: true, Valid: true}
}

func validInput() ControlledExecutionRuntimeInput {
	return ControlledExecutionRuntimeInput{
		RuntimeID: "runtime-1", RuntimeSessionID: "session-1", EvidenceBindingID: "binding-1", VerificationID: "verify-1", ResponseContractID: "resp-1", RequestEnvelopeID: "req-1", AdapterInterfaceID: "adapter-iface-1", FinalAuthorizationID: "auth-1", SimulationID: "sim-1", FirewallID: "fw-1", DecisionID: "decision-1", InvocationID: "invoke-1", Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "adapter", AdapterVersion: "1.0.0", AdapterType: "cli", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "abc123", Target: "prod", Environment: "prod", RuntimeMode: "controlled_dry_run_rehearsal",
		RealGates:               []sovereigndecision.SovereignRealGate{{Gate: "PASS_GOLD", RealEvidence: true, RecognizedByAuthority: true}, {Gate: "PASS_SECURE", RealEvidence: true, RecognizedByAuthority: true}},
		HumanApproval:           &executionresponse.HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true},
		IndependentRevalidation: &executionresponse.IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		RuntimePlan:             pv(), RuntimePolicy: pv(), RuntimeScope: pv(), RuntimeConstraints: pv(), RuntimeSafetyEnvelope: pv(), RuntimeAuditEnvelope: pv(), RuntimeObservabilityPlan: pv(), RuntimeRollbackPlan: pv(), RuntimeKillSwitch: pv(), RuntimeTimeout: pv(), RuntimeLockPlan: pv(), RuntimeStopCriteria: pv(), RuntimePreflightChecks: pv(), RuntimePostflightChecks: pv(), RuntimeIdempotencyKey: "idem-1",
		SafetyControls: &RuntimeSafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoAdapterCallInsideMCP: true, NoNetworkInsideMCP: true, NoCommandInsideMCP: true, NoFileWriteInsideMCP: true, NoDeployInsideMCP: true, NoStatusPublishInsideMCP: true, NoPromotionInsideMCP: true, NoMemoryStableWriteInsideMCP: true, NoTrustEscalationInsideMCP: true},
	}
}

func TestBuildControlledExecutionRuntimeBlocksWithoutEvidenceBindingAndDeniesRealPermissions(t *testing.T) {
	got := BuildControlledExecutionRuntime(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.ControlledRuntime || got.Valid || !got.Blocked || got.RuntimeReadyDryRun || got.RuntimeStatus != StatusBlocked {
		t.Fatalf("unexpected result: %+v", got)
	}
	if !contains(got.BlockingReasons, StatusEvidenceBindingMissing) {
		t.Fatalf("missing evidence binding status: %+v", got)
	}
	if got.MCPExecutionAllowed || got.RealExecutionAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.DeployAllowed || got.PromotionAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.EvidenceTrustAllowed || got.ResultTrustAllowed || got.LedgerWriteAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("real permissions must stay false: %+v", got)
	}
}

func TestValidateControlledExecutionRuntimeBlocksRequiredFailuresAndClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*ControlledExecutionRuntimeInput)
		want   string
	}{
		{"executor mcp", func(i *ControlledExecutionRuntimeInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *ControlledExecutionRuntimeInput) { i.ExecutorMode = "mcp_readonly" }, "executor_mode_must_be_external_only"},
		{"real mode", func(i *ControlledExecutionRuntimeInput) { i.RuntimeMode = "real_execution" }, StatusRuntimeModeBlocked},
		{"plan", func(i *ControlledExecutionRuntimeInput) { i.RuntimePlan = nil }, StatusRuntimePlanMissing},
		{"policy", func(i *ControlledExecutionRuntimeInput) { i.RuntimePolicy = nil }, StatusRuntimePolicyMissing},
		{"scope", func(i *ControlledExecutionRuntimeInput) { i.RuntimeScope = nil }, StatusRuntimeScopeMissing},
		{"safety", func(i *ControlledExecutionRuntimeInput) { i.RuntimeSafetyEnvelope = nil }, StatusSafetyEnvelopeMissing},
		{"audit", func(i *ControlledExecutionRuntimeInput) { i.RuntimeAuditEnvelope = nil }, StatusAuditEnvelopeMissing},
		{"observability", func(i *ControlledExecutionRuntimeInput) { i.RuntimeObservabilityPlan = nil }, StatusObservabilityPlanMissing},
		{"rollback", func(i *ControlledExecutionRuntimeInput) { i.RuntimeRollbackPlan = nil }, StatusRollbackPlanMissing},
		{"idempotency", func(i *ControlledExecutionRuntimeInput) { i.RuntimeIdempotencyKey = "" }, StatusIdempotencyMissing},
		{"kill switch", func(i *ControlledExecutionRuntimeInput) { i.RuntimeKillSwitch = nil }, StatusKillSwitchMissing},
		{"timeout", func(i *ControlledExecutionRuntimeInput) { i.RuntimeTimeout = nil }, StatusTimeoutMissing},
		{"lock plan", func(i *ControlledExecutionRuntimeInput) { i.RuntimeLockPlan = nil }, StatusLockPlanMissing},
		{"preflight", func(i *ControlledExecutionRuntimeInput) { i.RuntimePreflightChecks = nil }, StatusPreflightChecksMissing},
		{"claim", func(i *ControlledExecutionRuntimeInput) {
			i.Claims = &ControlledExecutionRuntimeClaims{RealExecutionAllowed: true, AdapterCallAllowed: true, EvidenceTrusted: true}
		}, "real_execution_allowed"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := ValidateControlledExecutionRuntime(in)
			if got.Valid || !got.Blocked {
				t.Fatalf("expected blocked invalid: %+v", got)
			}
			if !contains(got.BlockingReasons, tc.want) && !contains(got.MissingItems, tc.want) && !contains(got.UnsafeClaims, tc.want) && !contains(got.Conflicts, tc.want) {
				t.Fatalf("missing %s in %+v", tc.want, got)
			}
		})
	}
}

func TestBoundaryAuditAndExplain(t *testing.T) {
	b := BuildExecutionRuntimeBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !b.ControlledRuntime || b.RealExecutionAllowed || !contains(b.MCPCan, "simulate controlled execution runtime") || !contains(b.MCPCannot, "execute_runtime") || !contains(b.MCPCannot, "call_adapter") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	in := validInput()
	in.Claims = &ControlledExecutionRuntimeClaims{RealExecutionAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, EvidenceTrusted: true, ResultTrusted: true, LedgerWritten: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, HumanApprovalBypassed: true, RevalidationBypassed: true, EvidenceBindingBypassed: true, VerificationBypassed: true, RuntimePolicyBypassed: true, KillSwitchBypassed: true, RollbackBypassed: true, ObservabilityBypassed: true}
	a := AuditControlledExecutionRuntime(in)
	if !a.RuntimeExecutionAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.DeployAttemptFound || !a.PromotionAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.EvidenceTrustAttemptFound || !a.ResultTrustAttemptFound || !a.LedgerWriteAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.EvidenceBindingBypassAttemptFound || !a.VerificationBypassAttemptFound || !a.RuntimePolicyBypassAttemptFound || !a.KillSwitchBypassAttemptFound || !a.RollbackBypassAttemptFound || !a.ObservabilityBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainControlledExecutionRuntime(validInput())
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !e.ControlledRuntime || e.RealExecutionAllowed || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "real_execution_allowed") || len(e.WhyRealExecutionRequiresFutureExplicitRelease) == 0 {
		t.Fatalf("unexpected explain: %+v", e)
	}
}

func contains(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}
