package sandboxtracepersistence

import (
	"strings"
	"testing"
)

func TestBuildSandboxTracePersistenceGateAlwaysDeniesRealPermissionsWhenIncomplete(t *testing.T) {
	got := BuildSandboxTracePersistenceGate(SandboxTracePersistenceInput{PersistenceGateID: "gate-1", SandboxTraceID: "trace-1", AdapterType: "sandbox_noop", Environment: "sandbox", ExecutorMode: "external_only"})
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Sandbox || got.TraceMode != TraceMode || got.PersistenceMode != PersistenceMode {
		t.Fatalf("unexpected metadata: %+v", got)
	}
	if !got.Blocked || got.Valid || got.PersistenceStatus != StatusIncomplete {
		t.Fatalf("incomplete persistence gate must be blocked: %+v", got)
	}
	if got.RealExecutionAllowed || got.MCPExecutionAllowed || got.RealAdapterCallAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.TracePersistenceAllowed || got.TracePersisted || got.DatabaseWriteAllowed || got.LedgerWriteAllowed || got.DeployAllowed || got.PromotionAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.EvidenceTrustAllowed || got.ResultTrustAllowed || got.TraceTrustAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("all real permissions must remain false: %+v", got)
	}
}

func TestValidateSandboxTracePersistenceGateBlocksUnsafeClaims(t *testing.T) {
	got := ValidateSandboxTracePersistenceGate(SandboxTracePersistenceInput{
		Executor: "mcp", ExecutorMode: "inside_mcp", AdapterType: "real", Environment: "prod",
		Claims: &SandboxTracePersistenceClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DatabaseWriteAllowed: true, TracePersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, EvidenceTrusted: true, ResultTrusted: true, TraceTrusted: true, PassGold: true, AuthorityGranted: true},
	})
	for _, want := range []string{"executor_must_not_be_mcp", "executor_mode_must_be_external_only", "adapter_type_must_be_sandbox_noop", "environment_must_be_sandbox_or_local_sandbox", StatusSandboxTraceMissing, StatusUnsafeRealExecutionAttempt, StatusUnsafeRealAdapterCallAttempt, StatusUnsafeNetworkAttempt, StatusUnsafeCommandAttempt, StatusUnsafeFileWriteAttempt, StatusUnsafeDatabaseWriteAttempt, StatusUnsafeTracePersistenceAttempt, StatusUnsafeLedgerWriteAttempt, StatusUnsafeDeployAttempt, StatusUnsafePromotionAttempt, StatusUnsafeStatusPublishAttempt, StatusUnsafeMemoryWriteAttempt, StatusUnsafeTrustEscalationAttempt, "real_execution_allowed", "real_adapter_call_allowed", "trace_persisted", "database_write_allowed"} {
		if !contains(got.Conflicts, want) && !contains(got.UnsafeClaims, want) && !contains(got.BlockingReasons, want) {
			t.Fatalf("missing %s in %+v", want, got)
		}
	}
}

func TestSandboxTracePersistenceBoundaryAuditExplain(t *testing.T) {
	b := BuildSandboxTracePersistenceBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !b.Sandbox || b.TraceMode != TraceMode || b.PersistenceMode != PersistenceMode || b.RealExecutionAllowed || !contains(b.MCPCan, "simulate sandbox trace persistence gate") || !contains(b.MCPCannot, "persist_trace") || !contains(b.MCPCannot, "database_write") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	a := AuditSandboxTracePersistenceGate(SandboxTracePersistenceInput{Claims: &SandboxTracePersistenceClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DatabaseWriteAllowed: true, TracePersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, EvidenceTrusted: true, ResultTrusted: true, TraceTrusted: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, HumanApprovalBypassed: true, RevalidationBypassed: true, RuntimeBypassed: true, SandboxAdapterBypassed: true, SandboxTraceBypassed: true, EvidenceBindingBypassed: true, VerificationBypassed: true, PersistencePolicyBypassed: true, PathSafetyBypassed: true, RedactionBypassed: true, RetentionBypassed: true, AuditIndexBypassed: true, SandboxEscaped: true, KillSwitchBypassed: true, RollbackBypassed: true, ObservabilityBypassed: true}})
	if !a.RealExecutionAttemptFound || !a.RealAdapterCallAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.DatabaseWriteAttemptFound || !a.TracePersistenceAttemptFound || !a.LedgerWriteAttemptFound || !a.DeployAttemptFound || !a.PromotionAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.TraceTrustAttemptFound || !a.EvidenceTrustAttemptFound || !a.ResultTrustAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.RuntimeBypassAttemptFound || !a.SandboxAdapterBypassAttemptFound || !a.SandboxTraceBypassAttemptFound || !a.EvidenceBindingBypassAttemptFound || !a.VerificationBypassAttemptFound || !a.PersistencePolicyBypassAttemptFound || !a.PathSafetyBypassAttemptFound || !a.RedactionBypassAttemptFound || !a.RetentionBypassAttemptFound || !a.AuditIndexBypassAttemptFound || !a.SandboxEscapeAttemptFound || !a.KillSwitchBypassAttemptFound || !a.RollbackBypassAttemptFound || !a.ObservabilityBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainSandboxTracePersistenceGate(SandboxTracePersistenceInput{})
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !e.Sandbox || e.TraceMode != TraceMode || e.PersistenceMode != PersistenceMode || e.RealExecutionAllowed || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "trace_persistence_allowed") || len(e.WhyPersistenceGateIsNotPersistence) == 0 || len(e.WhyTraceCanOnlyBePersistedByFutureExplicitRelease) == 0 {
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
