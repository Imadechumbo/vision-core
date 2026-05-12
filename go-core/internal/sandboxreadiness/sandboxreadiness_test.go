package sandboxreadiness

import (
	"testing"

	"github.com/visioncore/go-core/internal/executionresponse"
)

func validInput() SandboxToControlledReadinessInput {
	p := func() *executionresponse.PresenceValid {
		return &executionresponse.PresenceValid{Present: true, Valid: true}
	}
	return SandboxToControlledReadinessInput{
		ReadinessGateID: "ready-1", AuditReportID: "audit-1", ReplayGateID: "replay-1", PersistenceGateID: "persist-1", SandboxTraceID: "trace-1", SandboxAdapterID: "adapter-1", RuntimeID: "runtime-1", RuntimeSessionID: "session-1", EvidenceBindingID: "binding-1", VerificationID: "verify-1", ResponseContractID: "response-1", RequestEnvelopeID: "request-1", AdapterInterfaceID: "iface-1", FinalAuthorizationID: "final-1", SimulationID: "sim-1", FirewallID: "firewall-1", DecisionID: "decision-1", InvocationID: "invocation-1", Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "sandbox", AdapterVersion: "1", AdapterType: "sandbox_noop", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "03c35b6", Target: "runtime", Environment: "sandbox",
		SandboxTraceAuditReport: p(), SandboxTraceReplayGate: p(), SandboxTracePersistenceGate: p(), SandboxTrace: p(), SandboxAdapter: p(), ControlledRuntime: p(), EvidenceBinding: p(), ResultVerification: p(), ResponseContract: p(), RequestEnvelope: p(), AdapterInterface: p(), FinalAuthorization: p(), Simulation: p(), Firewall: p(), SovereignCandidate: p(),
		SandboxTraceAuditReportReadyDryRun: true, AuditReportCandidate: true, ReplaySummaryReadyDryRun: true, PersistenceSummaryReadyDryRun: true, DeniedPermissionsSummaryReady: true, BlockedActionsSummaryReady: true, GateSummaryReadyDryRun: true, BlockerSummaryReadyDryRun: true, RiskSummaryReadyDryRun: true, ReadinessPreviewReadyDryRun: true, ReportCompleteDryRun: true,
		SandboxTraceReplayReadyDryRun: true, ReplayCandidate: true, ReplayReferenceValidDryRun: true, EventOrderValidDryRun: true, DeniedPermissionsReplayed: true, BlockedActionsReplayed: true, TraceHashVerifiedDryRun: true, AuditIndexReplayableDryRun: true, ReplayCompleteDryRun: true,
		SandboxTracePersistenceReadyDryRun: true, PersistenceCandidate: true, IsolatedStorageCandidate: true, TraceReplayReferenceReadyDryRun: true, AuditIndexCandidate: true, SandboxTraceReadyDryRun: true, TraceCompleteDryRun: true, DeniedPermissionsRecorded: true, BlockedActionsRecorded: true, SandboxAdapterReadyDryRun: true, SimulatedAdapterResponseReady: true, RuntimeReadyDryRun: true, ControlledRuntimeReady: true,
		PassGoldReal: p(), PassSecureReal: p(), RealGateRecognizedByAuthority: true, HumanApproval: &Approval{Present: true, Approved: true, Valid: true}, IndependentRevalidation: &Revalidation{Present: true, Completed: true, PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		ReadinessPolicy: p(), ReadinessScope: p(), ReadinessSchemaVersion: "readiness.v1", ReadinessScorePolicy: p(), ReadinessThresholdPolicy: p(), ReadinessBlockerPolicy: p(), ReadinessRiskPolicy: p(), ReadinessDeniedPermissionsPolicy: p(), RequiredBeforeV12Section: p(), V12IsolationRequirementsSection: p(), V12ExecutionConstraintsSection: p(), V12RollbackRequirementsSection: p(), V12LockRequirementsSection: p(), V12ObservabilityRequirementsSection: p(), V12ApprovalRequirementsSection: p(), V12AdapterRequirementsSection: p(), V12CommandAllowlistRequirementsSection: p(), V12FilesystemIsolationRequirementsSection: p(), V12NetworkPolicyRequirementsSection: p(), V12ArtifactPolicyRequirementsSection: p(), V12AuditPolicyRequirementsSection: p(), V12KillSwitchRequirementsSection: p(), ReadinessRecommendation: "eligible_for_future_v12_isolated_runtime_review", CorrelationID: "corr-1", IdempotencyKey: "idem-1", ReadinessRedactionPolicy: p(), ReadinessPrivacyPolicy: p(), ReadinessRetentionPolicy: p(), ReadinessTamperEvidenceModel: p(),
	}
}

func TestBuildSandboxToControlledReadinessGateReadyDryRun(t *testing.T) {
	gate := BuildSandboxToControlledReadinessGate(validInput())
	if !gate.Valid || !gate.SandboxReadinessReadyDryRun || !gate.SandboxToControlledExecutionCandidate || !gate.V12TransitionCandidate {
		t.Fatalf("expected advisory readiness candidate: %#v", gate)
	}
	if gate.RealExecutionAllowed || gate.IsolatedRealExecutionAllowed || gate.AdapterCallAllowed || gate.NetworkCallAllowed || gate.CommandExecutionAllowed || gate.FileWriteAllowed || gate.DatabaseWriteAllowed || gate.LedgerWriteAllowed || gate.ReadinessPersistenceAllowed || gate.ReportPersistenceAllowed || gate.ReplayPersistenceAllowed || gate.TracePersistenceAllowed || gate.AuthorityGrantAllowed {
		t.Fatalf("readiness gate must not grant real permissions: %#v", gate.SafetyDenials)
	}
	if gate.Version != Version || gate.ReadinessMode != ReadinessMode || gate.NextPhase != NextPhase || gate.Recommendation != "eligible_for_future_v12_isolated_runtime_review" {
		t.Fatalf("unexpected metadata: %#v", gate)
	}
}

func TestValidateSandboxToControlledReadinessGateBlocksUnsafeClaims(t *testing.T) {
	input := validInput()
	input.Executor = "mcp"
	input.Claims = &SandboxReadinessClaims{RealExecutionAllowed: true, IsolatedRealExecutionAllowed: true, RealAdapterCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, DatabaseWriteAllowed: true, ReadinessPersisted: true, ReportPersisted: true, ReplayPersisted: true, TracePersisted: true, LedgerWritten: true, DeployAllowed: true, PromotionAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, EvidenceTrusted: true}
	gate := ValidateSandboxToControlledReadinessGate(input)
	for _, want := range []string{StatusBlocked, "executor_must_not_be_mcp", StatusUnsafeRealExecutionAttempt, StatusUnsafeIsolatedRealExecutionAttempt, StatusUnsafeRealAdapterCallAttempt, StatusUnsafeNetworkAttempt, StatusUnsafeCommandAttempt, StatusUnsafeFileWriteAttempt, StatusUnsafeDatabaseWriteAttempt, StatusUnsafeReadinessPersistenceAttempt, StatusUnsafeReportPersistenceAttempt, StatusUnsafeReplayPersistenceAttempt, StatusUnsafeTracePersistenceAttempt, StatusUnsafeLedgerWriteAttempt, StatusUnsafeDeployAttempt, StatusUnsafePromotionAttempt, StatusUnsafeStatusPublishAttempt, StatusUnsafeMemoryWriteAttempt, StatusUnsafeTrustEscalationAttempt} {
		if want == StatusBlocked {
			if gate.ReadinessStatus != StatusBlocked {
				t.Fatalf("expected blocked status, got %s", gate.ReadinessStatus)
			}
			continue
		}
		if !contains(gate.Conflicts, want) {
			t.Fatalf("missing conflict %s in %#v", want, gate.Conflicts)
		}
	}
}

func TestBoundaryAuditExplain(t *testing.T) {
	b := BuildSandboxReadinessBoundary()
	if b.RealExecutionAllowed || len(b.MCPCan) == 0 || len(b.MCPCannot) == 0 {
		t.Fatalf("bad boundary: %#v", b)
	}
	input := validInput()
	input.Claims = &SandboxReadinessClaims{ReadinessTrusted: true, AuthorityGranted: true, SandboxEscaped: true, V12KillSwitchBypassed: true}
	a := AuditSandboxReadinessGate(input)
	if !a.ReadinessTrustAttemptFound || !a.AuthorityGrantAttemptFound || !a.SandboxEscapeAttemptFound || !a.V12KillSwitchBypassAttemptFound {
		t.Fatalf("audit did not detect attempts: %#v", a)
	}
	e := ExplainSandboxReadinessGate(validInput())
	if len(e.WhyReadinessGateIsNotExecution) == 0 || len(e.RequiredGates) != 2 || len(e.AlwaysDenied) == 0 {
		t.Fatalf("bad explain: %#v", e)
	}
}
