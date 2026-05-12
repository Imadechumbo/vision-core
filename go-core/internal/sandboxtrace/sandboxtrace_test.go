package sandboxtrace

import (
	"strings"
	"testing"
)

func TestBuildSandboxExecutionTraceAlwaysDeniesRealPermissionsWhenIncomplete(t *testing.T) {
	got := BuildSandboxExecutionTrace(SandboxExecutionTraceInput{SandboxTraceID: "trace-1", AdapterType: "sandbox_noop", Environment: "sandbox", ExecutorMode: "external_only"})
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Sandbox || got.TraceMode != TraceMode {
		t.Fatalf("unexpected metadata: %+v", got)
	}
	if !got.Blocked || got.Valid || got.TraceStatus != StatusIncomplete {
		t.Fatalf("incomplete trace must be blocked: %+v", got)
	}
	if got.RealExecutionAllowed || got.MCPExecutionAllowed || got.RealAdapterCallAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.TracePersistenceAllowed || got.DeployAllowed || got.PromotionAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.EvidenceTrustAllowed || got.ResultTrustAllowed || got.LedgerWriteAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("all real permissions must remain false: %+v", got)
	}
}

func TestValidateSandboxExecutionTraceBlocksUnsafeExecutorModeAndClaims(t *testing.T) {
	got := ValidateSandboxExecutionTrace(SandboxExecutionTraceInput{
		Executor: "mcp", ExecutorMode: "inside_mcp", AdapterType: "real", Environment: "prod",
		Claims: &SandboxTraceClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, TracePersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, EvidenceTrusted: true, ResultTrusted: true, PassGold: true, AuthorityGranted: true},
	})
	for _, want := range []string{"executor_must_not_be_mcp", "executor_mode_must_be_external_only", "adapter_type_must_be_sandbox_noop", "environment_must_be_sandbox_or_local_sandbox", StatusSandboxAdapterMissing, StatusUnsafeRealExecutionAttempt, StatusUnsafeRealAdapterCallAttempt, StatusUnsafeNetworkAttempt, StatusUnsafeCommandAttempt, StatusUnsafeFileWriteAttempt, StatusUnsafeTracePersistenceAttempt, StatusUnsafeLedgerWriteAttempt, StatusUnsafeDeployAttempt, StatusUnsafePromotionAttempt, StatusUnsafeStatusPublishAttempt, StatusUnsafeMemoryWriteAttempt, StatusUnsafeTrustEscalationAttempt, "real_execution_allowed", "real_adapter_call_allowed", "trace_persisted"} {
		if !contains(got.Conflicts, want) && !contains(got.UnsafeClaims, want) && !contains(got.BlockingReasons, want) {
			t.Fatalf("missing %s in %+v", want, got)
		}
	}
}

func TestSandboxExecutionTraceBoundaryAuditExplain(t *testing.T) {
	b := BuildSandboxTraceBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !b.Sandbox || b.TraceMode != TraceMode || b.RealExecutionAllowed || !contains(b.MCPCan, "build sandbox execution trace") || !contains(b.MCPCannot, "persist_trace") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	a := AuditSandboxExecutionTrace(SandboxExecutionTraceInput{Claims: &SandboxTraceClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, TracePersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, EvidenceTrusted: true, ResultTrusted: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, HumanApprovalBypassed: true, RevalidationBypassed: true, RuntimeBypassed: true, SandboxAdapterBypassed: true, EvidenceBindingBypassed: true, VerificationBypassed: true, TracePolicyBypassed: true, TraceIntegrityBypassed: true, TraceCompletenessBypassed: true, TraceRedactionBypassed: true, SandboxEscaped: true, KillSwitchBypassed: true, RollbackBypassed: true, ObservabilityBypassed: true}})
	if !a.RealExecutionAttemptFound || !a.RealAdapterCallAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.TracePersistenceAttemptFound || !a.LedgerWriteAttemptFound || !a.DeployAttemptFound || !a.PromotionAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.EvidenceTrustAttemptFound || !a.ResultTrustAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.RuntimeBypassAttemptFound || !a.SandboxAdapterBypassAttemptFound || !a.EvidenceBindingBypassAttemptFound || !a.VerificationBypassAttemptFound || !a.TracePolicyBypassAttemptFound || !a.TraceIntegrityBypassAttemptFound || !a.TraceCompletenessBypassAttemptFound || !a.TraceRedactionBypassAttemptFound || !a.SandboxEscapeAttemptFound || !a.KillSwitchBypassAttemptFound || !a.RollbackBypassAttemptFound || !a.ObservabilityBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainSandboxExecutionTrace(SandboxExecutionTraceInput{})
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !e.Sandbox || e.TraceMode != TraceMode || e.RealExecutionAllowed || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "trace_persistence_allowed") || len(e.WhySandboxTraceIsNotRealExecution) == 0 || len(e.WhyTracePersistenceIsBlocked) == 0 {
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
