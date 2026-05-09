package invocationboundary

import (
	"encoding/json"
	"strings"
	"testing"
)

func fullInvocationInput() InvocationInput {
	return InvocationInput{
		InvocationID: "invoke-001", Executor: "external_promotion_executor", ExecutorMode: "external_only", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "de9fa3b", Target: "stable", Environment: "local",
		InvocationPayload: &InvocationPayload{Present: true, PayloadID: "payload-001", Executor: "external_promotion_executor", ExecutorMode: "external_only", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "de9fa3b", Target: "stable", Environment: "local", ExternalOnly: true},
		HandoffPackage:    &InvocationSummary{Present: true, Version: "V9.6", ExternalExecutorHandoffReady: true, Valid: true}, FinalPreflight: &InvocationSummary{Present: true, Version: "V9.5", ExternalExecutionPreflightReady: true, Valid: true}, AuthorizationManifest: &InvocationSummary{Present: true, Version: "V9.4", WouldAuthorizeExternalExecutor: true, Valid: true}, SafetyEnvelope: &InvocationSummary{Present: true, Version: "V9.2", WouldAllowExternalExecutor: true, Valid: true}, Authority: &AuthoritySummary{Present: true, Version: "V9.0", PassGoldReal: true, PassSecureReal: true, Valid: true},
		Gates:         []InvocationGate{{Gate: "PASS_GOLD", Status: "pass", RealEvidence: true, RecognizedByAuthority: true, ArtifactID: "pg-123"}, {Gate: "PASS_SECURE", Status: "pass", RealEvidence: true, RecognizedByAuthority: true, ArtifactID: "ps-123"}},
		Artifacts:     []InvocationArtifact{{ID: "pg-123", Type: "pass_gold_report", Required: true, Present: true, Trusted: true}, {ID: "ps-123", Type: "pass_secure_report", Required: true, Present: true, Trusted: true}, {ID: "handoff-001", Type: "handoff_package", Required: true, Present: true, Trusted: true}},
		Authorization: &InvocationAuthorization{Present: true, AuthorizationID: "authz-001", TokenPlaceholder: "AUTH_TOKEN_PLACEHOLDER", Source: "authorization_manifest"}, Signature: &InvocationSignature{Present: true, SignaturePlaceholder: "SIGNATURE_PLACEHOLDER", SignatureAlgorithmDeclared: true},
		Idempotency: &InvocationIdempotency{Present: true, Key: "invoke-001", Scope: "project-branch-target", DuplicateActionBehavior: "block", ReplayProtection: true}, Timeout: &InvocationTimeout{Present: true, MaxSeconds: 900, GracefulAbort: true, HardAbort: true}, KillSwitch: &InvocationKillSwitch{Present: true, Enabled: true, Trigger: "manual_or_policy", ManualOverride: true}, Rollback: &InvocationRollback{Present: true, Mandatory: true, Strategy: "snapshot_restore", SnapshotRequired: true, ValidationRequired: true, ManualInterventionRequired: true}, Audit: &InvocationAudit{Present: true, AuditID: "invoke-audit-001", RecordsPayload: true, RecordsAuthorization: true, RecordsSignaturePlaceholder: true, RecordsIdempotency: true, RecordsDecision: true, ImmutableTargetDeclared: true}, Boundary: &InvocationBoundary{Present: true, ExternalOnly: true, MCPHardDeny: true, NoExecutorCallInsideMCP: true, NoNetworkCall: true, NoCommandExecution: true, NoFileWrite: true},
	}
}

func contains(list []string, part string) bool {
	for _, x := range list {
		if strings.Contains(x, part) {
			return true
		}
	}
	return false
}
func asJSON(v interface{}) string { b, _ := json.Marshal(v); return string(b) }

func TestBuildInvocationHardDenyBoundaryReadOnlyDryRunAndScopes(t *testing.T) {
	b := BuildInvocationHardDenyBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("unexpected boundary header: %+v", b)
	}
	for _, want := range []string{"read", "validate", "audit", "explain", "simulate_invocation_boundary"} {
		if !contains(b.MCPScope, want) {
			t.Fatalf("MCP scope missing %s: %+v", want, b.MCPScope)
		}
	}
	for _, want := range []string{"invoke_executor", "network_call", "command_execution", "file_write", "authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "open_pr", "write_memory", "acquire_real_lock", "perform_rollback"} {
		if !contains(b.ForbiddenInsideMCP, want) {
			t.Fatalf("forbidden missing %s: %+v", want, b.ForbiddenInsideMCP)
		}
	}
}

func TestBuildInvocationBoundaryAlwaysDeniesMCPMutationAndPassUse(t *testing.T) {
	r := BuildInvocationBoundary(fullInvocationInput())
	if r.PromotionAllowed || r.DeployAllowed || r.StatusPublishAllowed || r.MutationAllowed || r.MemoryWriteAllowed || r.ExecutorCallAllowedInsideMCP || r.NetworkCallAllowed || r.CommandExecutionAllowed || r.FileWriteAllowed || r.UsableForPassGold || r.UsableForPassSecure {
		t.Fatalf("boundary must deny all MCP execution/mutation/pass usage: %+v", r)
	}
}

func TestValidateInvocationBoundaryBlocksUnsafeExecutorAndModeAndPayload(t *testing.T) {
	in := fullInvocationInput()
	in.Executor = "mcp"
	in.ExecutorMode = "inside_mcp"
	in.InvocationPayload.ExternalOnly = false
	v := ValidateInvocationBoundary(in)
	for _, want := range []string{"executor cannot be mcp", "executor_mode must be external_only", "invocation_payload.external_only"} {
		if !contains(v.UnsafeClaims, want) {
			t.Fatalf("missing unsafe %s: %+v", want, v.UnsafeClaims)
		}
	}
	if v.Valid || !v.Blocked || v.ExternalInvocationBoundaryReady {
		t.Fatalf("unsafe validation should be blocked: %+v", v)
	}
}

func TestValidateInvocationBoundaryBlocksAllowedAndAttemptFlags(t *testing.T) {
	in := fullInvocationInput()
	in.ExecutorCallAllowedInsideMCP = true
	in.NetworkCallAllowed = true
	in.CommandExecutionAllowed = true
	in.FileWriteAllowed = true
	in.PromotionAllowed = true
	in.DeployAllowed = true
	in.StatusPublishAllowed = true
	in.MutationAllowed = true
	in.MemoryWriteAllowed = true
	in.AttemptExternalCall = true
	in.AttemptRealExecutorCall = true
	in.FileWrite = true
	in.CommandExecution = true
	in.NetworkCall = true
	v := ValidateInvocationBoundary(in)
	for _, want := range []string{"executor_call_allowed_inside_mcp", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "promotion_allowed", "deploy_allowed", "status_publish_allowed", "mutation_allowed", "memory_write_allowed", "attempt_external_call", "attempt_real_executor_call", "file_write cannot", "command_execution cannot", "network_call cannot"} {
		if !contains(v.UnsafeClaims, want) {
			t.Fatalf("missing unsafe %s in %v", want, v.UnsafeClaims)
		}
	}
}

func TestValidateInvocationBoundaryDetectsMissingCoreArtifactsAndGates(t *testing.T) {
	v := ValidateInvocationBoundary(InvocationInput{})
	for _, want := range []string{"handoff_package_valid", "final_preflight_valid", "authorization_manifest_valid", "safety_envelope_valid", "authority_valid", "authorization_token_placeholder", "signature_placeholder", "idempotency_key", "timeout", "kill_switch", "rollback", "audit", "mcp_hard_deny_boundary"} {
		if !contains(v.MissingItems, want) {
			t.Fatalf("missing item %s not detected: %v", want, v.MissingItems)
		}
	}
	for _, want := range []string{"PASS_GOLD_REAL", "PASS_SECURE_REAL"} {
		if !contains(v.MissingGates, want) {
			t.Fatalf("missing gate %s not detected: %v", want, v.MissingGates)
		}
	}
}

func TestValidateInvocationBoundaryRejectsDryRunSynthesizedAdvisoryGatesAndSecrets(t *testing.T) {
	in := fullInvocationInput()
	in.Gates = append(in.Gates, InvocationGate{Gate: "PASS_GOLD", DryRun: true, Synthesized: true, Advisory: true})
	in.Authorization.TokenPlaceholder = ""
	in.Authorization.TokenPlaintextPresent = true
	in.Signature.SignaturePlaceholder = ""
	in.Signature.SignaturePlaintextSecretPresent = true
	v := ValidateInvocationBoundary(in)
	for _, want := range []string{"gate dry-run", "gate synthesized", "gate advisory", "real or plaintext authorization token", "plaintext signature secret"} {
		if !contains(v.UnsafeClaims, want) {
			t.Fatalf("missing unsafe %s: %v", want, v.UnsafeClaims)
		}
	}
	for _, want := range []string{"authorization_token_placeholder", "signature_placeholder"} {
		if !contains(v.MissingItems, want) {
			t.Fatalf("missing item %s: %v", want, v.MissingItems)
		}
	}
}

func TestValidateInvocationBoundaryDetectsBoundaryHardDenyFalse(t *testing.T) {
	in := fullInvocationInput()
	in.Boundary.MCPHardDeny = false
	in.Boundary.NoNetworkCall = false
	in.Boundary.NoCommandExecution = false
	in.Boundary.NoFileWrite = false
	v := ValidateInvocationBoundary(in)
	for _, want := range []string{"boundary.mcp_hard_deny", "boundary.no_network_call", "boundary.no_command_execution", "boundary.no_file_write"} {
		if !contains(v.UnsafeClaims, want) {
			t.Fatalf("missing %s: %v", want, v.UnsafeClaims)
		}
	}
}

func TestBuildInvocationBoundaryCompleteReadyDryRunButNoPromotion(t *testing.T) {
	r := BuildInvocationBoundary(fullInvocationInput())
	if r.BoundaryStatus != StatusReadyDryRun || !r.ExternalInvocationBoundaryReady {
		t.Fatalf("expected ready dry-run: %s", asJSON(r))
	}
	if r.PromotionAllowed || r.DeployAllowed {
		t.Fatalf("ready boundary must not allow promotion/deploy: %+v", r)
	}
}

func TestAuditInvocationBoundaryDetectsAttemptsAndPlaintext(t *testing.T) {
	in := fullInvocationInput()
	in.Executor = "mcp"
	in.NetworkCall = true
	in.CommandExecution = true
	in.FileWrite = true
	in.ExecutorCallAllowedInsideMCP = true
	in.Authorization.TokenPlaintextPresent = true
	in.Signature.SignaturePlaintextSecretPresent = true
	a := AuditInvocationBoundary(in)
	if !a.NetworkAttemptFound || !a.CommandAttemptFound || !a.FileWriteAttemptFound || !a.MCPExecutorCallAttemptFound || !a.PlaintextSecretFound {
		t.Fatalf("audit missed attempt/plaintext: %+v", a)
	}
}

func TestExplainInvocationBoundaryExplainsMCPPassGoldTokensAndRequiredGates(t *testing.T) {
	e := ExplainInvocationBoundary(InvocationInput{})
	if len(e.WhyMCPCannotInvokeExecutor) == 0 || len(e.WhyInvocationBoundaryIsNotPassGold) == 0 || len(e.WhyTokensArePlaceholdersOnly) == 0 {
		t.Fatalf("explain missing required sections: %+v", e)
	}
	if !contains(e.RequiredGates, "PASS_GOLD") || !contains(e.RequiredGates, "PASS_SECURE") {
		t.Fatalf("required gates missing: %+v", e.RequiredGates)
	}
}
