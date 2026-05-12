package sandboxadapter

import (
	"strings"
	"testing"
)

func TestBuildSandboxAdapterAlwaysDeniesRealPermissionsWhenIncomplete(t *testing.T) {
	got := BuildSandboxAdapter(SandboxAdapterInput{SandboxAdapterID: "sandbox-1", AdapterType: "sandbox_noop", Environment: "sandbox", ExecutorMode: "external_only"})
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Sandbox || got.AdapterType != "sandbox_noop" {
		t.Fatalf("unexpected metadata: %+v", got)
	}
	if !got.Blocked || got.Valid || got.AdapterStatus != StatusIncomplete {
		t.Fatalf("incomplete adapter must be blocked: %+v", got)
	}
	if got.RealExecutionAllowed || got.RealAdapterCallAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.DeployAllowed || got.PromotionAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.EvidenceTrustAllowed || got.ResultTrustAllowed || got.LedgerWriteAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("all real permissions must remain false: %+v", got)
	}
}

func TestValidateSandboxAdapterBlocksUnsafeExecutorModeAndClaims(t *testing.T) {
	got := ValidateSandboxAdapter(SandboxAdapterInput{
		Executor: "mcp", ExecutorMode: "inside_mcp", AdapterType: "real", Environment: "prod",
		Claims: &SandboxAdapterClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, EvidenceTrusted: true, ResultTrusted: true, LedgerWritten: true, PassGold: true, AuthorityGranted: true},
	})
	for _, want := range []string{"executor_must_not_be_mcp", "executor_mode_must_be_external_only", "adapter_type_must_be_sandbox_noop", "environment_must_be_sandbox_or_local_sandbox", StatusUnsafeRealExecutionAttempt, StatusUnsafeRealAdapterCallAttempt, StatusUnsafeNetworkAttempt, StatusUnsafeCommandAttempt, StatusUnsafeFileWriteAttempt, StatusUnsafeDeployAttempt, StatusUnsafePromotionAttempt, StatusUnsafeStatusPublishAttempt, StatusUnsafeMemoryWriteAttempt, StatusUnsafeTrustEscalationAttempt, "real_execution_allowed", "real_adapter_call_allowed"} {
		if !contains(got.Conflicts, want) && !contains(got.UnsafeClaims, want) && !contains(got.BlockingReasons, want) {
			t.Fatalf("missing %s in %+v", want, got)
		}
	}
}

func TestSandboxAdapterBoundaryAuditExplain(t *testing.T) {
	b := BuildSandboxAdapterBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !b.Sandbox || b.AdapterType != "sandbox_noop" || b.RealExecutionAllowed || !contains(b.MCPCan, "simulate sandbox adapter") || !contains(b.MCPCannot, "call_real_adapter") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	a := AuditSandboxAdapter(SandboxAdapterInput{Claims: &SandboxAdapterClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, EvidenceTrusted: true, ResultTrusted: true, LedgerWritten: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, HumanApprovalBypassed: true, RevalidationBypassed: true, RuntimeBypassed: true, EvidenceBindingBypassed: true, VerificationBypassed: true, SandboxPolicyBypassed: true, SandboxEscaped: true, KillSwitchBypassed: true, RollbackBypassed: true, ObservabilityBypassed: true}})
	if !a.RealExecutionAttemptFound || !a.RealAdapterCallAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.DeployAttemptFound || !a.PromotionAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.EvidenceTrustAttemptFound || !a.ResultTrustAttemptFound || !a.LedgerWriteAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.RuntimeBypassAttemptFound || !a.EvidenceBindingBypassAttemptFound || !a.VerificationBypassAttemptFound || !a.SandboxPolicyBypassAttemptFound || !a.SandboxEscapeAttemptFound || !a.KillSwitchBypassAttemptFound || !a.RollbackBypassAttemptFound || !a.ObservabilityBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainSandboxAdapter(SandboxAdapterInput{})
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !e.Sandbox || e.AdapterType != "sandbox_noop" || e.RealExecutionAllowed || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "real_adapter_call_allowed") || len(e.WhySandboxAdapterIsNotRealExecution) == 0 {
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
