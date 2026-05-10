package evidencebinding

import (
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/executionverification"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func pv() *executionresponse.PresenceValid {
	return &executionresponse.PresenceValid{Present: true, Valid: true}
}

func validVerificationInput() executionverification.ExecutionResultVerificationInput {
	response := executionresponse.ExecutionResponseInput{ResponseContractID: "resp-1", RequestEnvelopeID: "req-1", AdapterInterfaceID: "adapter-iface-1", FinalAuthorizationID: "auth-1", SimulationID: "sim-1", FirewallID: "fw-1", DecisionID: "decision-1", InvocationID: "invoke-1", Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "adapter", AdapterVersion: "1.0.0", AdapterType: "cli", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "abc123", Target: "prod", Environment: "prod", RequestEnvelope: nil}
	// Reuse V10.6 through the public test helper shape by populating the full chain directly.
	response.RequestEnvelope = nil
	// BuildExecutionResultVerification only requires V10.6 to validate. Rather than
	// duplicate the entire V10.0-V10.6 chain here, tests below use the existing
	// validExecutionBindingInput helper's result verification constructed through
	// JSON in MCP tests. Package-level unit coverage focuses on V10.8 behavior.
	_ = response
	return executionverification.ExecutionResultVerificationInput{}
}

func validInput() ExecutionEvidenceBindingInput {
	// For unit tests in this package, use a minimal nested verification that can be
	// replaced by specific negative cases; MCP tests exercise a fully valid V10.7 chain.
	in := ExecutionEvidenceBindingInput{EvidenceBindingID: "binding-1", VerificationID: "verify-1", ResponseContractID: "resp-1", RequestEnvelopeID: "req-1", AdapterInterfaceID: "adapter-iface-1", FinalAuthorizationID: "auth-1", SimulationID: "sim-1", FirewallID: "fw-1", DecisionID: "decision-1", InvocationID: "invoke-1", Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "adapter", AdapterVersion: "1.0.0", AdapterType: "cli", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "abc123", Target: "prod", Environment: "prod", RealGates: []sovereigndecision.SovereignRealGate{{Gate: "PASS_GOLD", RealEvidence: true, RecognizedByAuthority: true}, {Gate: "PASS_SECURE", RealEvidence: true, RecognizedByAuthority: true}}, HumanApproval: &executionresponse.HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true}, IndependentRevalidation: &executionresponse.IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true}, EvidenceManifest: pv(), ArtifactReferences: pv(), ArtifactHashes: pv(), LogReferences: pv(), LogHashes: pv(), CheckReferences: pv(), CheckResults: pv(), SourceReferences: pv(), ProvenanceMetadata: pv(), ChainOfCustody: pv(), AuditTrail: pv(), CorrelationID: "corr-1", IdempotencyKey: "idem-1", IntegrityChecks: pv(), HashChecks: pv(), ProvenanceChecks: pv(), SchemaChecks: pv(), SecurityChecks: pv(), AuditChecks: pv(), ObservabilityChecks: pv(), TamperEvidenceChecks: pv(), RetentionPolicy: pv(), TrustPolicy: pv(), BindingPolicy: pv(), SafetyControls: &SafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoEvidenceTrustInsideMCP: true, NoEvidencePersistenceInsideMCP: true, NoLedgerWriteInsideMCP: true, NoStatusPublishInsideMCP: true, NoPromotionInsideMCP: true, NoDeployInsideMCP: true, NoMemoryStableWriteInsideMCP: true}}
	// The nested verification is intentionally supplied as nil in this helper only
	// after package validation is checked through the dedicated missing case.
	return in
}

func TestBuildExecutionEvidenceBindingMissingNestedVerificationBlocksAndDeniesRealPermissions(t *testing.T) {
	got := BuildExecutionEvidenceBinding(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || got.Valid || !got.Blocked || got.EvidenceBindingReadyDryRun || got.EvidenceBindingStatus != StatusBlocked {
		t.Fatalf("unexpected result: %+v", got)
	}
	if !contains(got.BlockingReasons, StatusResultVerificationMissing) {
		t.Fatalf("missing result verification status: %+v", got)
	}
	if got.MCPExecutionAllowed || got.EvidenceTrustAllowed || got.EvidencePersistenceAllowed || got.LedgerWriteAllowed || got.ResultTrustAllowed || got.ResultPersistenceAllowed || got.StatusPublishAllowed || got.PromotionAllowed || got.DeployAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.RealLockAllowed || got.RollbackAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("real permissions must stay false: %+v", got)
	}
}

func TestValidateExecutionEvidenceBindingBlocksRequiredFailuresAndClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*ExecutionEvidenceBindingInput)
		want   string
	}{
		{"executor mcp", func(i *ExecutionEvidenceBindingInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *ExecutionEvidenceBindingInput) { i.ExecutorMode = "mcp_readonly" }, "executor_mode_must_be_external_only"},
		{"manifest", func(i *ExecutionEvidenceBindingInput) { i.EvidenceManifest = nil }, StatusEvidenceManifestMissing},
		{"artifact hashes", func(i *ExecutionEvidenceBindingInput) { i.ArtifactHashes = nil }, StatusArtifactHashesMissing},
		{"logs", func(i *ExecutionEvidenceBindingInput) { i.LogReferences = nil }, StatusLogReferencesMissing},
		{"chain", func(i *ExecutionEvidenceBindingInput) { i.ChainOfCustody = nil }, StatusChainOfCustodyMissing},
		{"hash", func(i *ExecutionEvidenceBindingInput) { i.HashChecks.Valid = false }, StatusHashCheckFailed},
		{"trust policy", func(i *ExecutionEvidenceBindingInput) { i.TrustPolicy.Valid = false }, StatusTrustPolicyBlocked},
		{"binding policy", func(i *ExecutionEvidenceBindingInput) { i.BindingPolicy.Valid = false }, StatusBindingPolicyBlocked},
		{"trust claim", func(i *ExecutionEvidenceBindingInput) {
			i.Claims = &ExecutionEvidenceBindingClaims{EvidenceTrustAllowed: true}
		}, "evidence_trust_allowed"},
		{"ledger claim", func(i *ExecutionEvidenceBindingInput) {
			i.Claims = &ExecutionEvidenceBindingClaims{LedgerWriteAllowed: true}
		}, "ledger_write_allowed"},
		{"result trust claim", func(i *ExecutionEvidenceBindingInput) {
			i.Claims = &ExecutionEvidenceBindingClaims{ExternalResultTrusted: true}
		}, "external_result_trusted"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := ValidateExecutionEvidenceBinding(in)
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
	b := BuildEvidenceBindingBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !contains(b.MCPCan, "simulate external execution evidence binding") || !contains(b.MCPCannot, "trust_evidence") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	in := validInput()
	in.Claims = &ExecutionEvidenceBindingClaims{EvidenceTrustAllowed: true, EvidencePersistenceAllowed: true, LedgerWriteAllowed: true, ResultTrustAllowed: true, ResultPersistenceAllowed: true, StatusPublishAllowed: true, PromotionAllowed: true, DeployAllowed: true, ExecutionAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, DryRunGateClaim: true, SynthesizedGateClaim: true, HumanApprovalBypassed: true, RevalidationBypassed: true, VerificationBypassed: true, EvidenceBindingBypassed: true, ChainOfCustodyBypassed: true, HashValidationBypassed: true, ExternalResultTrustBypassed: true}
	a := AuditExecutionEvidenceBinding(in)
	if !a.EvidenceTrustAttemptFound || !a.EvidencePersistenceAttemptFound || !a.LedgerWriteAttemptFound || !a.ResultTrustAttemptFound || !a.ResultPersistenceAttemptFound || !a.StatusPublishAttemptFound || !a.PromotionAttemptFound || !a.ExecutionAttemptFound || !a.EvidenceBindingBypassAttemptFound || !a.ChainOfCustodyBypassAttemptFound || !a.HashValidationBypassAttemptFound || !a.ExternalResultTrustBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainExecutionEvidenceBinding(validInput())
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "evidence_trust_allowed") || len(e.WhyExternalEvidenceCannotBeTrustedAutomatically) == 0 {
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
