package sandboxauditreport

import (
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/executionresponse"
)

func pv() *executionresponse.PresenceValid { return &executionresponse.PresenceValid{Present: true, Valid: true} }

func validInput() SandboxTraceAuditReportInput {
	return SandboxTraceAuditReportInput{
		AuditReportID: "ar-1", ReplayGateID: "rg-1", PersistenceGateID: "pg-1", SandboxTraceID: "st-1", SandboxAdapterID: "sa-1", RuntimeID: "rt-1", RuntimeSessionID: "rs-1", EvidenceBindingID: "eb-1", VerificationID: "vf-1", ResponseContractID: "rc-1", RequestEnvelopeID: "re-1", AdapterInterfaceID: "ai-1", FinalAuthorizationID: "fa-1", SimulationID: "sim-1", FirewallID: "fw-1", DecisionID: "dec-1", InvocationID: "inv-1",
		Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "noop", AdapterVersion: "1", AdapterType: "sandbox_noop", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "aa48d15", Target: "test", Environment: "sandbox",
		SandboxTraceReplayGate: pv(), SandboxTraceReplayReadyDryRun: true, ReplayCandidate: true, ReplayReferenceValidDryRun: true, EventOrderValidDryRun: true, DeniedPermissionsReplayed: true, BlockedActionsReplayed: true, TraceHashVerifiedDryRun: true, AuditIndexReplayableDryRun: true, ReplayCompleteDryRun: true,
		SandboxTracePersistenceGate: pv(), SandboxTracePersistenceReadyDryRun: true, PersistenceCandidate: true, IsolatedStorageCandidate: true, TraceReplayReferenceReadyDryRun: true, AuditIndexCandidate: true,
		SandboxTrace: pv(), SandboxTraceReadyDryRun: true, TraceCompleteDryRun: true, DeniedPermissionsRecorded: true, BlockedActionsRecorded: true,
		SandboxAdapter: pv(), SandboxAdapterReadyDryRun: true, ControlledRuntime: pv(), RuntimeReadyDryRun: true, ControlledRuntimeReady: true,
		EvidenceBinding: pv(), ResultVerification: pv(), ResponseContract: pv(), RequestEnvelope: pv(), AdapterInterface: pv(), FinalAuthorization: pv(), Simulation: pv(), Firewall: pv(), SovereignCandidate: pv(), PassGoldReal: pv(), PassSecureReal: pv(), RecognizedByAuthority: true,
		HumanApproval: &Approval{Present: true, Approved: true, Valid: true}, IndependentRevalidation: &Revalidation{Present: true, Completed: true, PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		ReportPolicy: pv(), ReportScope: pv(), ReportSchemaVersion: "audit-report.v1", ReportSummarySection: pv(), ReplaySummarySection: pv(), PersistenceSummarySection: pv(), TraceSummarySection: pv(), DeniedPermissionsSection: pv(), BlockedActionsSection: pv(), SafetyDecisionsSection: pv(), GateSummarySection: pv(), BlockerSummarySection: pv(), RiskSummarySection: pv(), ReadinessPreviewSection: pv(), AuditTrailSection: pv(), HashSummary: pv(), ReplayReferenceSummary: pv(), AuditIndexSummary: pv(), CorrelationID: "corr-1", IdempotencyKey: "idem-1",
		ReplayReference: pv(), ReplayReferenceValue: "replay-ref-1", ReplayEvents: []string{"start", "deny", "block", "finish"}, ReplayEventOrderPolicy: pv(), ReplayEventOrderResult: pv(), ReplayTimestampModel: pv(), ReplayCorrelationID: "corr-1", ReplayIdempotencyKey: "idem-1", ReplayTraceHash: "sha256:abc", ReplayHashVerification: pv(), ReplayAuditIndexDescriptor: pv(), ReplayAuditTrail: pv(), ReplayDeniedPermissions: []string{"network_call"}, ReplayBlockedActions: []string{"file_write"}, ReplaySafetyDecisions: pv(), ReplayCheckResults: pv(), ReplayIntegrityChecks: pv(), ReplayCompletenessChecks: pv(), ReportRedactionPolicy: pv(), ReportPrivacyPolicy: pv(), ReportRetentionPolicy: pv(), ReportTamperEvidenceModel: pv(),
	}
}

func TestBuildSandboxTraceAuditReportReadyDryRunOnly(t *testing.T) {
	got := BuildSandboxTraceAuditReport(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Sandbox || got.TraceMode != TraceMode || got.ReportMode != ReportMode || got.ReportStatus != StatusSandboxTraceAuditReportReadyDryRun || !got.Valid || got.Blocked {
		t.Fatalf("unexpected audit report: %+v", got)
	}
	if !got.SandboxTraceAuditReportReadyDryRun || !got.AuditReportCandidate || !got.ReplaySummaryReadyDryRun || !got.PersistenceSummaryReadyDryRun || !got.DeniedPermissionsSummaryReady || !got.BlockedActionsSummaryReady || !got.GateSummaryReadyDryRun || !got.BlockerSummaryReadyDryRun || !got.RiskSummaryReadyDryRun || !got.ReadinessPreviewReadyDryRun || !got.ReportCompleteDryRun {
		t.Fatalf("consultative report flags should be true on valid dry-run: %+v", got)
	}
	if got.RealExecutionAllowed || got.MCPExecutionAllowed || got.RealAdapterCallAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.TracePersistenceAllowed || got.ReplayPersistenceAllowed || got.ReportPersistenceAllowed || got.TracePersisted || got.ReplayPersisted || got.ReportPersisted || got.DatabaseWriteAllowed || got.LedgerWriteAllowed || got.DeployAllowed || got.PromotionAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.EvidenceTrustAllowed || got.ResultTrustAllowed || got.TraceTrustAllowed || got.ReplayTrustAllowed || got.ReportTrustAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("all real permissions must remain false: %+v", got)
	}
}

func TestValidateSandboxTraceAuditReportBlocksMissingAndUnsafe(t *testing.T) {
	input := validInput()
	input.SandboxTraceReplayReadyDryRun = false
	input.ReplayCandidate = false
	input.ReportSummarySection = nil
	input.ReportSchemaVersion = ""
	input.CorrelationID = ""
	input.Claims = &SandboxTraceAuditReportClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DatabaseWriteAllowed: true, TracePersisted: true, ReplayPersisted: true, ReportPersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, EvidenceTrusted: true, ResultTrusted: true, TraceTrusted: true, ReplayTrusted: true, ReportTrusted: true, PassGold: true, AuthorityGranted: true}
	got := ValidateSandboxTraceAuditReport(input)
	for _, want := range []string{StatusSandboxTraceReplayBlocked, StatusReportSummaryMissing, StatusReportSchemaVersionMissing, StatusCorrelationIDMissing, StatusUnsafeRealExecutionAttempt, StatusUnsafeRealAdapterCallAttempt, StatusUnsafeNetworkAttempt, StatusUnsafeCommandAttempt, StatusUnsafeFileWriteAttempt, StatusUnsafeDatabaseWriteAttempt, StatusUnsafeTracePersistenceAttempt, StatusUnsafeReplayPersistenceAttempt, StatusUnsafeReportPersistenceAttempt, StatusUnsafeLedgerWriteAttempt, StatusUnsafeDeployAttempt, StatusUnsafePromotionAttempt, StatusUnsafeStatusPublishAttempt, StatusUnsafeMemoryWriteAttempt, StatusUnsafeTrustEscalationAttempt, "real_execution_allowed", "report_persisted", "report_trusted"} {
		if !contains(got.Conflicts, want) && !contains(got.UnsafeClaims, want) && !contains(got.BlockingReasons, want) && !contains(got.MissingItems, want) {
			t.Fatalf("missing %s in %+v", want, got)
		}
	}
	if got.Valid || !got.Blocked || got.SandboxTraceAuditReportReadyDryRun || got.AuditReportCandidate || got.RealExecutionAllowed || got.ReportPersistenceAllowed {
		t.Fatalf("blocked audit report should not expose ready flags or permissions: %+v", got)
	}
}

func TestSandboxTraceAuditReportBoundaryAuditExplain(t *testing.T) {
	b := BuildSandboxTraceAuditReportBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !b.Sandbox || b.TraceMode != TraceMode || b.ReportMode != ReportMode || b.RealExecutionAllowed || !contains(b.MCPCan, "simulate sandbox trace audit report") || !contains(b.MCPCan, "build audit report payload") || !contains(b.MCPCannot, "persist_report") || !contains(b.MCPCannot, "trust_report") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	a := AuditSandboxTraceAuditReport(SandboxTraceAuditReportInput{Claims: &SandboxTraceAuditReportClaims{RealExecutionAllowed: true, RealAdapterCallAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DatabaseWriteAllowed: true, TracePersisted: true, ReplayPersisted: true, ReportPersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, TraceTrusted: true, ReplayTrusted: true, ReportTrusted: true, EvidenceTrusted: true, ResultTrusted: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, HumanApprovalBypassed: true, RevalidationBypassed: true, RuntimeBypassed: true, SandboxAdapterBypassed: true, SandboxTraceBypassed: true, PersistenceGateBypassed: true, ReplayGateBypassed: true, EvidenceBindingBypassed: true, VerificationBypassed: true, ReportPolicyBypassed: true, ReportRedactionBypassed: true, ReportRetentionBypassed: true, ReportAuditTrailBypassed: true, SandboxEscaped: true, KillSwitchBypassed: true, RollbackBypassed: true, ObservabilityBypassed: true}})
	if !a.RealExecutionAttemptFound || !a.RealAdapterCallAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutorCallAttemptFound || !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.DatabaseWriteAttemptFound || !a.TracePersistenceAttemptFound || !a.ReplayPersistenceAttemptFound || !a.ReportPersistenceAttemptFound || !a.LedgerWriteAttemptFound || !a.DeployAttemptFound || !a.PromotionAttemptFound || !a.StatusPublishAttemptFound || !a.MemoryWriteAttemptFound || !a.StableLearningAttemptFound || !a.TraceTrustAttemptFound || !a.ReplayTrustAttemptFound || !a.ReportTrustAttemptFound || !a.EvidenceTrustAttemptFound || !a.ResultTrustAttemptFound || !a.RealLockAttemptFound || !a.RollbackAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.RuntimeBypassAttemptFound || !a.SandboxAdapterBypassAttemptFound || !a.SandboxTraceBypassAttemptFound || !a.PersistenceGateBypassAttemptFound || !a.ReplayGateBypassAttemptFound || !a.EvidenceBindingBypassAttemptFound || !a.VerificationBypassAttemptFound || !a.ReportPolicyBypassAttemptFound || !a.ReportRedactionBypassAttemptFound || !a.ReportRetentionBypassAttemptFound || !a.ReportAuditTrailBypassAttemptFound || !a.SandboxEscapeAttemptFound || !a.KillSwitchBypassAttemptFound || !a.RollbackBypassAttemptFound || !a.ObservabilityBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainSandboxTraceAuditReport(SandboxTraceAuditReportInput{})
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !e.Sandbox || e.TraceMode != TraceMode || e.ReportMode != ReportMode || e.RealExecutionAllowed || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "report_persistence_allowed") || len(e.WhyAuditReportIsNotExecution) == 0 || len(e.WhyReportCanOnlyBePersistedByFutureExplicitRelease) == 0 || len(e.WhyV116ReadinessGateIsNext) == 0 {
		t.Fatalf("unexpected explain: %+v", e)
	}
}
