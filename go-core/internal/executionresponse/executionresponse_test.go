package executionresponse

import (
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func validInput() ExecutionResponseInput {
	pv := func() *PresenceValid { return &PresenceValid{Present: true, Valid: true} }
	return ExecutionResponseInput{
		ResponseContractID: "resp-contract-1", RequestEnvelopeID: "req-env-1", AdapterInterfaceID: "adapter-iface-1", FinalAuthorizationID: "fa-1", SimulationID: "sim-1", FirewallID: "fw-1", DecisionID: "dec-1", InvocationID: "inv-1",
		Executor: "external_promotion_executor", ExecutorMode: "external_only", AdapterName: "external-execution-adapter", AdapterVersion: "1.0.0", AdapterType: "promotion_executor_adapter", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "e68ac0c", Target: "stable", Environment: "production",
		RequestEnvelope: &RequestEnvelopeEvidence{Version: "V10.5", DryRun: true, ReadOnly: true, Valid: true, RequestEnvelopeReadyDryRun: true}, AdapterInterface: &AdapterInterfaceEvidence{Version: "V10.4", DryRun: true, ReadOnly: true, Valid: true, AdapterInterfaceReadyDryRun: true}, FinalAuthorization: &FinalAuthorizationEvidence{Version: "V10.3", DryRun: true, ReadOnly: true, Valid: true, FinalAuthorizationReadyDryRun: true}, PromotionSimulation: &SimulationEvidence{Version: "V10.2", DryRun: true, ReadOnly: true, Valid: true, SimulationRecordReadyDryRun: true, ExecutionSimulationCandidate: true}, PromotionFirewall: &FirewallEvidence{Version: "V10.1", DryRun: true, ReadOnly: true, Valid: true, FirewallValid: true, ExecutionEligibilityReadyDryRun: true}, SovereignDecision: &SovereignDecisionEvidence{Version: "V10.0", DryRun: true, ReadOnly: true, Valid: true, SovereignDecisionValid: true, PromotionDecisionCandidate: true},
		RealGates: []sovereigndecision.SovereignRealGate{{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}, {Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}}, HumanApproval: &HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true}, IndependentRevalidation: &IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		ResponseSchema: pv(), ResponseMetadata: pv(), CorrelationID: "corr-1", IdempotencyKey: "idem-1", AdapterResultDescriptor: pv(), ExecutionOutcomeDescriptor: pv(), ArtifactDescriptor: pv(), EvidenceDescriptor: pv(), ErrorDescriptor: pv(), TimeoutDescriptor: pv(), RollbackDescriptor: pv(), ObservabilityDescriptor: pv(), AuditDescriptor: pv(), SecurityDescriptor: pv(), PolicyDescriptor: pv(), TrustPolicy: pv(), SafetyControls: &SafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoResponseTrustInsideMCP: true, NoResponsePersistenceInsideMCP: true, NoAdapterCallInsideMCP: true, NoNetworkInsideMCP: true, NoCommandInsideMCP: true, NoFileWriteInsideMCP: true, NoDeployInsideMCP: true, NoStatusPublishInsideMCP: true, NoMemoryStableWriteInsideMCP: true},
	}
}

func TestBuildExecutionResponseContractReadyDryRunAlwaysDeniesRealPermissions(t *testing.T) {
	got := BuildExecutionResponseContract(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Valid || got.Blocked || !got.ResponseContractReadyDryRun || got.ResponseContractStatus != StatusReadyDryRun {
		t.Fatalf("unexpected result: %+v", got)
	}
	if got.MCPExecutionAllowed || got.ResponseTrustAllowed || got.ResponsePersistenceAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.PromotionAllowed || got.DeployAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("real permissions must stay false even when ready: %+v", got)
	}
}

func TestValidateExecutionResponseContractBlocksRequiredFailuresAndClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*ExecutionResponseInput)
		want   string
	}{
		{"executor mcp", func(i *ExecutionResponseInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"}, {"executor mode", func(i *ExecutionResponseInput) { i.ExecutorMode = "mcp_readonly" }, "executor_mode_must_be_external_only"}, {"request missing", func(i *ExecutionResponseInput) { i.RequestEnvelope = nil }, "request_envelope_missing"}, {"request ready false", func(i *ExecutionResponseInput) { i.RequestEnvelope.RequestEnvelopeReadyDryRun = false }, "request_envelope_ready_dry_run"}, {"adapter blocked", func(i *ExecutionResponseInput) { i.AdapterInterface.Valid = false }, "adapter_interface_blocked"}, {"response schema", func(i *ExecutionResponseInput) { i.ResponseSchema = nil }, "response_schema"}, {"metadata invalid", func(i *ExecutionResponseInput) { i.ResponseMetadata.Valid = false }, "response_metadata_invalid"}, {"trust policy", func(i *ExecutionResponseInput) { i.TrustPolicy = nil }, "trust_policy_missing"}, {"response trust", func(i *ExecutionResponseInput) { i.Claims = &ExecutionResponseClaims{ResponseTrustAllowed: true} }, "response_trust_allowed"}, {"persisted", func(i *ExecutionResponseInput) { i.Claims = &ExecutionResponseClaims{ResponseContractPersisted: true} }, "response_contract_persisted"}, {"external trusted", func(i *ExecutionResponseInput) { i.Claims = &ExecutionResponseClaims{ExternalResponseTrusted: true} }, "external_response_trusted"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := ValidateExecutionResponseContract(in)
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
	b := BuildExecutionResponseBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !contains(b.MCPCan, "simulate external execution response contract") || !contains(b.MCPCannot, "trust_response") || !contains(b.MCPCannot, "persist_response_contract") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	in := validInput()
	in.Claims = &ExecutionResponseClaims{ResponseTrustAllowed: true, ResponsePersistenceAllowed: true, AdapterCallAllowed: true, ExecutionAllowed: true, ExecutorCallAllowed: true, NetworkCallAllowed: true, CommandExecutionAllowed: true, FileWriteAllowed: true, PromotionAllowed: true, DeployAllowed: true, StatusPublishAllowed: true, MemoryWriteAllowed: true, LearnedAsStable: true, RealLockAcquired: true, RollbackPerformed: true, PassGold: true, AuthorityGranted: true, DryRunGateClaim: true, SynthesizedGateClaim: true, HumanApprovalBypassed: true, RevalidationBypassed: true, ResponseContractBypassed: true, ExternalResponseTrustBypassed: true}
	a := AuditExecutionResponseContract(in)
	if !a.ResponseTrustAttemptFound || !a.ResponsePersistenceAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutionAttemptFound || !a.ExternalResponseTrustBypassAttemptFound {
		t.Fatalf("audit missed attempts: %+v", a)
	}
	e := ExplainExecutionResponseContract(validInput())
	if e.Version != Version || !e.DryRun || !e.ReadOnly || !contains(e.RequiredGates, "PASS_GOLD") || !strings.Contains(strings.Join(e.AlwaysDenied, ","), "response_trust_allowed") {
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
