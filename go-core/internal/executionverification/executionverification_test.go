package executionverification

import (
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/executionresponse"
	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func pv() *executionresponse.PresenceValid {
	return &executionresponse.PresenceValid{Present: true, Valid: true}
}

func validResponseContract() *executionresponse.ExecutionResponseInput {
	return &executionresponse.ExecutionResponseInput{
		ResponseContractID: "resp-contract-1", RequestEnvelopeID: "req-1", AdapterInterfaceID: "adapter-1", FinalAuthorizationID: "auth-1", SimulationID: "sim-1", FirewallID: "firewall-1", DecisionID: "decision-1", InvocationID: "invoke-1", Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "adapter", AdapterVersion: "1.0.0", AdapterType: "external", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "bf28477", Target: "promotion", Environment: "prod",
		RequestEnvelope: &executionresponse.RequestEnvelopeEvidence{Version: "V10.5", DryRun: true, ReadOnly: true, Valid: true, RequestEnvelopeReadyDryRun: true}, AdapterInterface: &executionresponse.AdapterInterfaceEvidence{Version: "V10.4", DryRun: true, ReadOnly: true, Valid: true, AdapterInterfaceReadyDryRun: true}, FinalAuthorization: &executionresponse.FinalAuthorizationEvidence{Version: "V10.3", DryRun: true, ReadOnly: true, Valid: true, FinalAuthorizationReadyDryRun: true}, PromotionSimulation: &executionresponse.SimulationEvidence{Version: "V10.2", DryRun: true, ReadOnly: true, Valid: true, SimulationRecordReadyDryRun: true, ExecutionSimulationCandidate: true}, PromotionFirewall: &executionresponse.FirewallEvidence{Version: "V10.1", DryRun: true, ReadOnly: true, Valid: true, FirewallValid: true, ExecutionEligibilityReadyDryRun: true}, SovereignDecision: &executionresponse.SovereignDecisionEvidence{Version: "V10.0", DryRun: true, ReadOnly: true, Valid: true, SovereignDecisionValid: true, PromotionDecisionCandidate: true},
		RealGates: []sovereigndecision.SovereignRealGate{{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}, {Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}}, HumanApproval: &executionresponse.HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true}, IndependentRevalidation: &executionresponse.IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		ResponseSchema: pv(), ResponseMetadata: pv(), CorrelationID: "corr-1", IdempotencyKey: "idem-1", AdapterResultDescriptor: pv(), ExecutionOutcomeDescriptor: pv(), ArtifactDescriptor: pv(), EvidenceDescriptor: pv(), ErrorDescriptor: pv(), TimeoutDescriptor: pv(), RollbackDescriptor: pv(), ObservabilityDescriptor: pv(), AuditDescriptor: pv(), SecurityDescriptor: pv(), PolicyDescriptor: pv(), TrustPolicy: pv(), SafetyControls: &executionresponse.SafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoResponseTrustInsideMCP: true, NoResponsePersistenceInsideMCP: true, NoAdapterCallInsideMCP: true, NoNetworkInsideMCP: true, NoCommandInsideMCP: true, NoFileWriteInsideMCP: true, NoDeployInsideMCP: true, NoStatusPublishInsideMCP: true, NoMemoryStableWriteInsideMCP: true},
	}
}

func validInput() ExecutionResultVerificationInput {
	return ExecutionResultVerificationInput{VerificationID: "verify-1", ResponseContractID: "resp-contract-1", RequestEnvelopeID: "req-1", AdapterInterfaceID: "adapter-1", FinalAuthorizationID: "auth-1", SimulationID: "sim-1", FirewallID: "firewall-1", DecisionID: "decision-1", InvocationID: "invoke-1", Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "adapter", AdapterVersion: "1.0.0", AdapterType: "external", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "bf28477", Target: "promotion", Environment: "prod", ResponseContract: validResponseContract(), RealGates: []sovereigndecision.SovereignRealGate{{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}, {Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}}, HumanApproval: &executionresponse.HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true}, IndependentRevalidation: &executionresponse.IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true}, ExternalResultDescriptor: pv(), ResultMetadata: pv(), CorrelationID: "corr-1", IdempotencyKey: "idem-1", ArtifactReferences: pv(), EvidenceReferences: pv(), ExecutionOutcome: pv(), AdapterResult: pv(), ErrorSummary: pv(), VerificationPolicy: pv(), TrustPolicy: pv(), IntegrityChecks: pv(), ProvenanceChecks: pv(), SchemaChecks: pv(), SecurityChecks: pv(), AuditChecks: pv(), ObservabilityChecks: pv(), RollbackReadinessChecks: pv(), SafetyControls: &SafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoResultTrustInsideMCP: true, NoResultPersistenceInsideMCP: true, NoStatusPublishInsideMCP: true, NoPromotionInsideMCP: true, NoDeployInsideMCP: true, NoMemoryStableWriteInsideMCP: true}}
}

func TestBuildExecutionResultVerificationReadyDryRunAlwaysDeniesRealPermissions(t *testing.T) {
	got := BuildExecutionResultVerification(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Valid || got.Blocked || !got.ResultVerificationReadyDryRun || got.ResultVerificationStatus != StatusReadyDryRun {
		t.Fatalf("unexpected result: %+v", got)
	}
	if got.MCPExecutionAllowed || got.ResultTrustAllowed || got.ResultPersistenceAllowed || got.StatusPublishAllowed || got.PromotionAllowed || got.DeployAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.RealLockAllowed || got.RollbackAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("real permissions must stay false even when ready: %+v", got)
	}
}

func TestValidateExecutionResultVerificationBlocksRequiredFailuresAndClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*ExecutionResultVerificationInput)
		want   string
	}{
		{"executor mcp", func(i *ExecutionResultVerificationInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"}, {"executor mode", func(i *ExecutionResultVerificationInput) { i.ExecutorMode = "mcp_readonly" }, "executor_mode_must_be_external_only"}, {"response missing", func(i *ExecutionResultVerificationInput) { i.ResponseContract = nil }, StatusResponseContractMissing}, {"response ready false", func(i *ExecutionResultVerificationInput) { i.ResponseContract.ResponseMetadata.Valid = false }, StatusResponseContractBlocked}, {"descriptor", func(i *ExecutionResultVerificationInput) { i.ExternalResultDescriptor = nil }, StatusResultDescriptorMissing}, {"metadata invalid", func(i *ExecutionResultVerificationInput) { i.ResultMetadata.Valid = false }, "result_metadata_invalid"}, {"integrity", func(i *ExecutionResultVerificationInput) { i.IntegrityChecks.Valid = false }, StatusIntegrityCheckFailed}, {"trust policy", func(i *ExecutionResultVerificationInput) { i.TrustPolicy.Valid = false }, StatusTrustPolicyBlocked}, {"trust claim", func(i *ExecutionResultVerificationInput) {
			i.Claims = &ExecutionVerificationClaims{ResultTrustAllowed: true}
		}, "result_trust_allowed"}, {"persist claim", func(i *ExecutionResultVerificationInput) {
			i.Claims = &ExecutionVerificationClaims{ResultPersistenceAllowed: true}
		}, "result_persistence_allowed"}, {"external trusted", func(i *ExecutionResultVerificationInput) {
			i.Claims = &ExecutionVerificationClaims{ExternalResultTrusted: true}
		}, "external_result_trusted"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := ValidateExecutionResultVerification(in)
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
	b := BuildExecutionVerificationBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !contains(b.MCPCan, "simulate external execution result verification") || !contains(b.MCPCannot, "trust_result") || !contains(b.MCPCannot, "grant_authority") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	in := validInput()
	in.Claims = &ExecutionVerificationClaims{ResultTrustAllowed: true, ResultPersistenceAllowed: true, StatusPublishAllowed: true, PromotionAllowed: true, DeployAllowed: true, ExecutionAllowed: true, AdapterCallAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, DryRunGateClaim: true, SynthesizedGateClaim: true, HumanApprovalBypassed: true, RevalidationBypassed: true, VerificationBypassed: true, ExternalResultTrustBypassed: true}
	a := AuditExecutionResultVerification(in)
	if !a.ResultTrustAttemptFound || !a.ResultPersistenceAttemptFound || !a.StatusPublishAttemptFound || !a.PromotionAttemptFound || !a.ExecutionAttemptFound || !a.ExternalResultTrustBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainExecutionResultVerification(validInput())
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "result_trust_allowed") || len(e.WhyExternalResultCannotBeTrustedAutomatically) == 0 {
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
