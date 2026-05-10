package executionrequest

import (
	"testing"

	"github.com/visioncore/go-core/internal/sovereigndecision"
)

func validInput() ExecutionRequestInput {
	pv := func() *PresenceValid { return &PresenceValid{Present: true, Valid: true} }
	return ExecutionRequestInput{
		RequestEnvelopeID:       "req-env-1",
		AdapterInterfaceID:      "adapter-iface-1",
		FinalAuthorizationID:    "fa-1",
		SimulationID:            "sim-1",
		FirewallID:              "fw-1",
		DecisionID:              "dec-1",
		InvocationID:            "inv-1",
		Executor:                "external_promotion_executor",
		ExecutorMode:            "external_only",
		AdapterName:             "external-execution-adapter",
		AdapterVersion:          "1.0.0",
		AdapterType:             "promotion_executor_adapter",
		Project:                 "vision-core",
		Branch:                  "v6-go-enterprise-runtime",
		CommitSHA:               "59a6624",
		Target:                  "stable",
		Environment:             "production",
		AdapterInterface:        &AdapterInterfaceEvidence{Version: "V10.4", DryRun: true, ReadOnly: true, Valid: true, AdapterInterfaceReadyDryRun: true},
		FinalAuthorization:      &FinalAuthorizationEvidence{Version: "V10.3", DryRun: true, ReadOnly: true, Valid: true, FinalAuthorizationReadyDryRun: true},
		PromotionSimulation:     &SimulationEvidence{Version: "V10.2", DryRun: true, ReadOnly: true, Valid: true, SimulationRecordReadyDryRun: true, ExecutionSimulationCandidate: true},
		PromotionFirewall:       &FirewallEvidence{Version: "V10.1", DryRun: true, ReadOnly: true, Valid: true, FirewallValid: true, ExecutionEligibilityReadyDryRun: true},
		SovereignDecision:       &SovereignDecisionEvidence{Version: "V10.0", DryRun: true, ReadOnly: true, Valid: true, SovereignDecisionValid: true, PromotionDecisionCandidate: true},
		RealGates:               []sovereigndecision.SovereignRealGate{{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}, {Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true}},
		HumanApproval:           &HumanApproval{Present: true, Approved: true, Approver: "release-manager", ApprovalReference: "approval-1", Valid: true},
		IndependentRevalidation: &IndependentRevalidation{Present: true, Completed: true, Validator: "independent-validator", RevalidationReference: "reval-1", PassGoldRevalidated: true, PassSecureRevalidated: true, Valid: true},
		RequestPayloadSchema:    pv(),
		RequestMetadata:         pv(),
		CorrelationID:           "corr-1",
		IdempotencyKey:          "idem-1",
		TargetDescriptor:        pv(), OperationDescriptor: pv(), ExecutionConstraints: pv(), SafetyConstraints: pv(), AuditDescriptor: pv(), RollbackDescriptor: pv(), ObservabilityDescriptor: pv(), TimeoutDescriptor: pv(), KillSwitchDescriptor: pv(), ErrorHandlingDescriptor: pv(), SecurityDescriptor: pv(), PolicyDescriptor: pv(),
		SafetyControls: &SafetyControls{Present: true, Valid: true, NoMCPExecution: true, NoRequestSendInsideMCP: true, NoAdapterCallInsideMCP: true, NoNetworkInsideMCP: true, NoCommandInsideMCP: true, NoFileWriteInsideMCP: true, NoDeployInsideMCP: true, NoStatusPublishInsideMCP: true, NoMemoryStableWriteInsideMCP: true},
	}
}

func TestBuildExecutionRequestEnvelopeReadyDryRunAlwaysDeniesRealPermissions(t *testing.T) {
	got := BuildExecutionRequestEnvelope(validInput())
	if got.Version != Version || !got.DryRun || !got.ReadOnly || !got.Valid || got.Blocked || !got.RequestEnvelopeReadyDryRun || got.RequestEnvelopeStatus != StatusReadyDryRun {
		t.Fatalf("unexpected result: %+v", got)
	}
	if got.MCPExecutionAllowed || got.RequestSendAllowed || got.AdapterCallAllowed || got.ExecutorCallAllowed || got.NetworkCallAllowed || got.CommandExecutionAllowed || got.FileWriteAllowed || got.PromotionAllowed || got.DeployAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.StablePromotionAllowed || got.LearningAllowed || got.RealLockAllowed || got.RollbackAllowed || got.RequestPersistenceAllowed || got.PassGoldAllowed || got.PassSecureAllowed || got.AuthorityGrantAllowed {
		t.Fatalf("real permissions must stay false even when ready: %+v", got)
	}
}

func TestValidateExecutionRequestEnvelopeBlocksRequiredFailuresAndClaims(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*ExecutionRequestInput)
		want   string
	}{
		{"executor mcp", func(i *ExecutionRequestInput) { i.Executor = "mcp" }, "executor_must_not_be_mcp"},
		{"executor mode", func(i *ExecutionRequestInput) { i.ExecutorMode = "mcp_readonly" }, "executor_mode_must_be_external_only"},
		{"adapter missing", func(i *ExecutionRequestInput) { i.AdapterInterface = nil }, "adapter_interface_missing"},
		{"adapter blocked", func(i *ExecutionRequestInput) { i.AdapterInterface.Valid = false }, "adapter_interface_blocked"},
		{"adapter ready false", func(i *ExecutionRequestInput) { i.AdapterInterface.AdapterInterfaceReadyDryRun = false }, "adapter_interface_ready_dry_run"},
		{"request schema", func(i *ExecutionRequestInput) { i.RequestPayloadSchema = nil }, "request_payload_schema"},
		{"metadata invalid", func(i *ExecutionRequestInput) { i.RequestMetadata.Valid = false }, "request_metadata_invalid"},
		{"correlation", func(i *ExecutionRequestInput) { i.CorrelationID = "" }, "correlation_id"},
		{"idempotency", func(i *ExecutionRequestInput) { i.IdempotencyKey = "" }, "idempotency_key"},
		{"request send", func(i *ExecutionRequestInput) { i.Claims = &ExecutionRequestClaims{RequestSendAllowed: true} }, "request_send_allowed"},
		{"adapter call", func(i *ExecutionRequestInput) { i.Claims = &ExecutionRequestClaims{AdapterCallAllowed: true} }, "adapter_call_allowed"},
		{"persisted", func(i *ExecutionRequestInput) { i.Claims = &ExecutionRequestClaims{RequestEnvelopePersisted: true} }, "request_envelope_persisted"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := validInput()
			tc.mutate(&in)
			got := ValidateExecutionRequestEnvelope(in)
			if got.Valid || !got.Blocked || !(contains(got.MissingItems, tc.want) || contains(got.Conflicts, tc.want) || contains(got.UnsafeClaims, tc.want)) {
				t.Fatalf("expected %s to block: %+v", tc.want, got)
			}
		})
	}
}

func TestBoundaryAuditAndExplain(t *testing.T) {
	b := BuildExecutionRequestBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly || !contains(b.MCPCan, "simulate external execution request envelope") || !contains(b.MCPCannot, "send_request") || !contains(b.MCPCannot, "persist_request_envelope") {
		t.Fatalf("unexpected boundary: %+v", b)
	}
	a := AuditExecutionRequestEnvelope(ExecutionRequestInput{Claims: &ExecutionRequestClaims{RequestSendAllowed: true, AdapterCallAllowed: true, ExecutionAllowed: true, RequestEnvelopePersisted: true, PassGold: true, AuthorityGranted: true, DryRunGateClaim: true, SynthesizedGateClaim: true, HumanApprovalBypassed: true, RevalidationBypassed: true, RequestContractBypassed: true}})
	if !a.RequestSendAttemptFound || !a.AdapterCallAttemptFound || !a.ExecutionAttemptFound || !a.RequestPersistenceAttemptFound || !a.AutoGoldAttemptFound || !a.AuthorityGrantAttemptFound || !a.DryRunGateClaimFound || !a.SynthesizedGateClaimFound || !a.HumanApprovalBypassAttemptFound || !a.RevalidationBypassAttemptFound || !a.RequestContractBypassAttemptFound {
		t.Fatalf("audit did not detect attempts: %+v", a)
	}
	e := ExplainExecutionRequestEnvelope(ExecutionRequestInput{})
	if e.Version != Version || !e.DryRun || !e.ReadOnly || len(e.WhyRequestEnvelopeIsNotExecution) == 0 || len(e.WhyRequestSendIsBlockedInsideMCP) == 0 || !contains(e.RequiredGates, "PASS_GOLD") || !contains(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("unexpected explain: %+v", e)
	}
}
