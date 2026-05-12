package sandboxtracereplay

import (
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/executionresponse"
)

func pv() *executionresponse.PresenceValid {
	return &executionresponse.PresenceValid{Present: true, Valid: true}
}

func validInput() SandboxTraceReplayInput {
	return SandboxTraceReplayInput{
		ReplayGateID: "rg-1", PersistenceGateID: "pg-1", SandboxTraceID: "st-1", SandboxAdapterID: "sa-1", RuntimeID: "rt-1", RuntimeSessionID: "rs-1", EvidenceBindingID: "eb-1", VerificationID: "vf-1", ResponseContractID: "rc-1", RequestEnvelopeID: "re-1", AdapterInterfaceID: "ai-1", FinalAuthorizationID: "fa-1", SimulationID: "sim-1", FirewallID: "fw-1", DecisionID: "dec-1", InvocationID: "inv-1",
		Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "noop", AdapterVersion: "1", AdapterType: "sandbox_noop", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "a562f13", Target: "test", Environment: "sandbox",
		SandboxTracePersistenceGate: pv(), SandboxTracePersistenceReadyDryRun: true, PersistenceCandidate: true, IsolatedStorageCandidate: true, TraceReplayReferenceReadyDryRun: true, AuditIndexCandidate: true,
		SandboxTrace: pv(), SandboxTraceReadyDryRun: true, TraceCompleteDryRun: true, DeniedPermissionsRecorded: true, BlockedActionsRecorded: true,
		SandboxAdapter: pv(), SandboxAdapterReadyDryRun: true, ControlledRuntime: pv(), RuntimeReadyDryRun: true, ControlledRuntimeReady: true,
		EvidenceBinding: pv(), ResultVerification: pv(), ResponseContract: pv(), RequestEnvelope: pv(), AdapterInterface: pv(), FinalAuthorization: pv(), Simulation: pv(), Firewall: pv(), SovereignCandidate: pv(), PassGoldReal: pv(), PassSecureReal: pv(), RecognizedByAuthority: true,
		HumanApproval: &Approval{Present: true, Approved: true, Valid: true}, IndependentRevalidation: &Revalidation{Present: true, Completed: true, PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		ReplayPolicy: pv(), ReplayScope: pv(), ReplayReference: pv(), ReplayReferenceValue: "replay-ref-1", ReplayEvents: []string{"start", "deny", "block", "finish"}, ReplayEventOrderPolicy: pv(), ReplayEventOrderResult: pv(), ReplayTimestampModel: pv(), ReplayCorrelationID: "corr-1", ReplayIdempotencyKey: "idem-1", ReplayTraceHash: "sha256:abc", ReplayHashVerification: pv(), ReplayAuditIndexDescriptor: pv(), ReplayAuditTrail: pv(), ReplayDeniedPermissions: []string{"network_call"}, ReplayBlockedActions: []string{"file_write"}, ReplaySafetyDecisions: pv(), ReplayCheckResults: pv(), ReplayIntegrityChecks: pv(), ReplayCompletenessChecks: pv(), ReplayRedactionPolicy: pv(), ReplayPrivacyPolicy: pv(), ReplayRetentionPolicy: pv(), ReplayTamperEvidenceModel: pv(),
	}
}

func TestBuildSandboxTraceReplayGateReadyDryRunOnly(t *testing.T) {
	got := BuildSandboxTraceReplayGate(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Sandbox || got.TraceMode != TraceMode || got.ReplayMode != ReplayMode || got.ReplayStatus != StatusSandboxTraceReplayReadyDryRun || !got.Valid || got.Blocked {
		t.Fatalf("unexpected replay gate: %+v", got)
	}
	if !got.SandboxTraceReplayReadyDryRun || !got.ReplayCandidate || !got.ReplayReferenceValidDryRun || !got.EventOrderValidDryRun || !got.DeniedPermissionsReplayed || !got.BlockedActionsReplayed || !got.TraceHashVerifiedDryRun || !got.AuditIndexReplayableDryRun || !got.ReplayCompleteDryRun {
		t.Fatalf("consultative replay flags should be true on valid dry-run: %+v", got)
	}
	if got.RealExecutionAllowed || got.MCPExecutionAllowed || got.RealAdapterCallAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.TracePersistenceAllowed || got.ReplayPersistenceAllowed || got.TracePersisted || got.ReplayPersisted || got.DatabaseWriteAllowed || got.LedgerWriteAllowed || got.DeployAllowed || got.PromotionAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.EvidenceTrustAllowed || got.ResultTrustAllowed || got.TraceTrustAllowed || got.ReplayTrustAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("all real permissions must remain false: %+v", got)
	}
}

func TestValidateSandboxTraceReplayGateBlocksMissingAndUnsafe(t *testing.T) {
	input := validInput()
	input.SandboxTracePersistenceReadyDryRun = false
	input.PersistenceCandidate = false
	input.ReplayReference = nil
	input.ReplayEvents = nil
	input.ReplayEventOrderResult = &executionresponse.PresenceValid{Present: true, Valid: false}
	input.Claims = &SandboxTraceReplayClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DatabaseWriteAllowed: true, TracePersisted: true, ReplayPersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, EvidenceTrusted: true, ResultTrusted: true, TraceTrusted: true, ReplayTrusted: true, PassGold: true, AuthorityGranted: true}
	got := ValidateSandboxTraceReplayGate(input)
	for _, want := range []string{StatusSandboxTracePersistenceBlocked, StatusReplayReferenceMissing, StatusReplayEventListMissing, StatusReplayEventOrderInvalid, StatusUnsafeRealExecutionAttempt, StatusUnsafeRealAdapterCallAttempt, StatusUnsafeNetworkAttempt, StatusUnsafeCommandAttempt, StatusUnsafeFileWriteAttempt, StatusUnsafeDatabaseWriteAttempt, StatusUnsafeTracePersistenceAttempt, StatusUnsafeReplayPersistenceAttempt, StatusUnsafeLedgerWriteAttempt, StatusUnsafeDeployAttempt, StatusUnsafePromotionAttempt, StatusUnsafeStatusPublishAttempt, StatusUnsafeMemoryWriteAttempt, StatusUnsafeTrustEscalationAttempt, "real_execution_allowed", "replay_persisted", "replay_trusted"} {
		if !contains(got.Conflicts, want) && !contains(got.UnsafeClaims, want) && !contains(got.BlockingReasons, want) && !contains(got.MissingItems, want) {
			t.Fatalf("missing %s in %+v", want, got)
		}
	}
	if got.Valid || !got.Blocked || got.SandboxTraceReplayReadyDryRun || got.ReplayCandidate || got.RealExecutionAllowed || got.ReplayPersistenceAllowed {
		t.Fatalf("blocked replay gate should not expose ready flags or permissions: %+v", got)
	}
}

func TestSandboxTraceReplayBoundaryAuditExplain(t *testing.T) {
	b := BuildSandboxTraceReplayBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !b.Sandbox || b.TraceMode != TraceMode || b.ReplayMode != ReplayMode || b.RealExecutionAllowed || !contains(b.MCPCan, "simulate sandbox trace replay gate") || !contains(b.MCPCan, "verify event order in dry-run") || !contains(b.MCPCannot, "persist_replay") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	a := AuditSandboxTraceReplayGate(SandboxTraceReplayInput{Claims: &SandboxTraceReplayClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DatabaseWriteAllowed: true, TracePersisted: true, ReplayPersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, TraceTrusted: true, ReplayTrusted: true, EvidenceTrusted: true, ResultTrusted: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, HumanApprovalBypassed: true, RevalidationBypassed: true, RuntimeBypassed: true, SandboxAdapterBypassed: true, SandboxTraceBypassed: true, PersistenceGateBypassed: true, EvidenceBindingBypassed: true, VerificationBypassed: true, ReplayPolicyBypassed: true, ReplayHashBypassed: true, ReplayEventOrderBypassed: true, ReplayAuditIndexBypassed: true, ReplayRedactionBypassed: true, SandboxEscaped: true, KillSwitchBypassed: true, RollbackBypassed: true, ObservabilityBypassed: true}})
	if !a.RealExecutionAttemptFound || !a.RealAdapterCallAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.DatabaseWriteAttemptFound || !a.TracePersistenceAttemptFound || !a.ReplayPersistenceAttemptFound || !a.LedgerWriteAttemptFound || !a.DeployAttemptFound || !a.PromotionAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.TraceTrustAttemptFound || !a.ReplayTrustAttemptFound || !a.EvidenceTrustAttemptFound || !a.ResultTrustAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.RuntimeBypassAttemptFound || !a.SandboxAdapterBypassAttemptFound || !a.SandboxTraceBypassAttemptFound || !a.PersistenceGateBypassAttemptFound || !a.EvidenceBindingBypassAttemptFound || !a.VerificationBypassAttemptFound || !a.ReplayPolicyBypassAttemptFound || !a.ReplayHashBypassAttemptFound || !a.ReplayEventOrderBypassAttemptFound || !a.ReplayAuditIndexBypassAttemptFound || !a.ReplayRedactionBypassAttemptFound || !a.SandboxEscapeAttemptFound || !a.KillSwitchBypassAttemptFound || !a.RollbackBypassAttemptFound || !a.ObservabilityBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainSandboxTraceReplayGate(SandboxTraceReplayInput{})
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !e.Sandbox || e.TraceMode != TraceMode || e.ReplayMode != ReplayMode || e.RealExecutionAllowed || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "replay_persistence_allowed") || len(e.WhyReplayGateIsNotExecution) == 0 || len(e.WhyReplayCanOnlyBePersistedByFutureExplicitRelease) == 0 {
		t.Fatalf("unexpected explain: %+v", e)
	}
}
