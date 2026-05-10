package isolatedruntime

import (
	"strings"
	"testing"
)

func validInput(t *testing.T) IsolatedRuntimeInput {
	t.Helper()
	return IsolatedRuntimeInput{
		Root: t.TempDir(), IsolatedRuntimeID: "iso-1", ReadinessGateID: "ready-1", AuditReportID: "audit-1", ReplayGateID: "replay-1", PersistenceGateID: "persist-1", SandboxTraceID: "trace-1", SandboxAdapterID: "adapter-1", RuntimeID: "runtime-1", RuntimeSessionID: "session-1", EvidenceBindingID: "evidence-1", VerificationID: "verify-1", ResponseContractID: "response-1", RequestEnvelopeID: "request-1", AdapterInterfaceID: "adapter-interface-1", FinalAuthorizationID: "auth-1", SimulationID: "simulation-1", FirewallID: "firewall-1", DecisionID: "decision-1", InvocationID: "invocation-1",
		Executor: "isolated_runtime_executor", ExecutorMode: "isolated_controlled", AdapterName: "isolated-local", AdapterVersion: "V12.0", AdapterType: "isolated_local", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "a6c248c", Target: "noop", Environment: "local_isolated",
		SandboxReadinessReadyDryRun: true, SandboxToControlledExecutionCandidate: true, V12TransitionCandidate: true, ReadinessScoreDryRun: 100,
		AuditReportValid: true, ReplayGateValid: true, PersistenceGateValid: true, SandboxTraceValid: true, SandboxAdapterValid: true, ControlledRuntimeValid: true, EvidenceBindingValid: true, VerificationValid: true, ResponseContractValid: true, RequestEnvelopeValid: true, AdapterInterfaceValid: true, FinalAuthorizationValid: true, SimulationValid: true, FirewallValid: true, SovereignCandidateValid: true,
		PassGoldReal: true, PassSecureReal: true, HumanApprovalReal: true, IndependentRevalidationReal: true,
		Command: IsolatedRuntimeCommand{Raw: "echo V12 isolated runtime"}, Workspace: IsolatedRuntimeWorkspace{Path: ".vision-tmp/isolated-runtime"},
	}
}

func hasStatus(p IsolatedRuntimePlan, want string) bool {
	for _, s := range p.Statuses {
		if s == want {
			return true
		}
	}
	return false
}

func TestValidPlanReadyAndAllowlistedCommand(t *testing.T) {
	p := BuildIsolatedControlledExecutionPlan(validInput(t))
	if !p.IsolatedRuntimePlanReady || !p.CommandAllowlisted || !p.IsolatedWorkspaceReady || !p.IsolatedRollbackReady || !p.IsolatedObservabilityReady || !p.IsolatedArtifactCaptureReady || !p.IsolatedAuditReady {
		t.Fatalf("expected valid isolated plan: %+v", p)
	}
	if !p.IsolatedRealExecutionAllowed || !p.CommandExecutionAllowed || !p.FileWriteAllowed || !p.RealLockAllowed || !p.RollbackAllowed {
		t.Fatalf("expected isolated-only permissions: %+v", p)
	}
	if p.DeployAllowed || p.PromotionAllowed || p.StatusPublishAllowed || p.NetworkCallAllowed || p.ProductionExecutionAllowed || p.RepoMutationAllowed || p.PassGold || p.PassSecure || p.AuthorityGranted {
		t.Fatalf("unsafe permission enabled: %+v", p)
	}
}

func TestCommandOutsideAllowlistBlocked(t *testing.T) {
	in := validInput(t)
	in.Command.Raw = "python script.py"
	p := ValidateIsolatedControlledExecutionPlan(in)
	if p.IsolatedRuntimePlanReady || !hasStatus(p, StatusCommandNotAllowlisted) {
		t.Fatalf("expected command_not_allowlisted: %+v", p)
	}
}
func TestShellSyntaxBlocked(t *testing.T) {
	in := validInput(t)
	in.Command.Raw = "echo ok && echo bad"
	p := ValidateIsolatedControlledExecutionPlan(in)
	if !hasStatus(p, StatusShellSyntaxBlocked) {
		t.Fatalf("expected shell syntax blocked: %+v", p)
	}
}
func TestWorkspaceOutsideTmpBlocked(t *testing.T) {
	in := validInput(t)
	in.Workspace.Path = "tmp/not-isolated"
	p := ValidateIsolatedControlledExecutionPlan(in)
	if !hasStatus(p, StatusWorkspaceEscapeBlocked) {
		t.Fatalf("expected workspace escape blocked: %+v", p)
	}
}
func TestPathTraversalBlocked(t *testing.T) {
	in := validInput(t)
	in.Workspace.Path = ".vision-tmp/isolated-runtime/../../real"
	p := ValidateIsolatedControlledExecutionPlan(in)
	if !hasStatus(p, StatusPathTraversalBlocked) {
		t.Fatalf("expected path traversal blocked: %+v", p)
	}
}
func TestNetworkCommandBlocked(t *testing.T) {
	in := validInput(t)
	in.Command.Raw = "curl https://example.com"
	p := ValidateIsolatedControlledExecutionPlan(in)
	if !hasStatus(p, StatusNetworkBlocked) {
		t.Fatalf("expected network blocked: %+v", p)
	}
}
func TestGitMutationBlocked(t *testing.T) {
	in := validInput(t)
	in.Command.Raw = "git push origin main"
	p := ValidateIsolatedControlledExecutionPlan(in)
	if !hasStatus(p, StatusGitMutationBlocked) {
		t.Fatalf("expected git mutation blocked: %+v", p)
	}
}
func TestDeployCommandBlocked(t *testing.T) {
	in := validInput(t)
	in.Command.Raw = "wrangler deploy"
	p := ValidateIsolatedControlledExecutionPlan(in)
	if !hasStatus(p, StatusDeployBlocked) {
		t.Fatalf("expected deploy blocked: %+v", p)
	}
}

func TestUnsafeClaimsDetected(t *testing.T) {
	in := validInput(t)
	in.Claims = map[string]bool{"production_execution_allowed": true, "deploy_allowed": true, "promotion_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "repo_mutation_allowed": true, "evidence_trusted": true, "pass_gold": true, "pass_secure": true, "authority_granted": true}
	p := ValidateIsolatedControlledExecutionPlan(in)
	for _, want := range []string{StatusBlocked, StatusDeployBlocked, StatusPromotionBlocked, StatusStatusPublishBlocked, StatusMemoryWriteBlocked, StatusGitMutationBlocked, StatusTrustEscalationBlocked, StatusAuthorityGrantBlocked} {
		if !hasStatus(p, want) {
			t.Fatalf("missing %s in %+v", want, p)
		}
	}
}

func TestBoundaryDeniesProductionAndTrustAuthority(t *testing.T) {
	b := BuildIsolatedRuntimeBoundary()
	if b.Version != Version || b.RuntimeMode != RuntimeMode || b.NextPhase != NextPhase || !b.ReadOnly || b.MCPExecutionAllowed || b.MCPMutationAllowed {
		t.Fatalf("bad boundary: %+v", b)
	}
	for _, k := range []string{"deploy_allowed", "promotion_allowed", "status_publish_allowed", "evidence_trust_allowed", "pass_gold_allowed", "authority_grant_allowed"} {
		if b.AlwaysDenied[k] {
			t.Fatalf("%s must be false", k)
		}
	}
}

func TestAuditDetectsBypasses(t *testing.T) {
	in := validInput(t)
	in.Command.Raw = "curl https://example.com && git push"
	in.Workspace.Path = "../escape"
	in.Claims = map[string]bool{"production_execution_allowed": true, "unrestricted_command_execution_allowed": true, "network_call_allowed": true, "secrets_accessed": true, "env_accessed": true, "deploy_allowed": true, "promotion_allowed": true, "status_publish_allowed": true, "memory_write_allowed": true, "learned_as_stable": true, "push_allowed": true, "pr_allowed": true, "evidence_trusted": true, "result_trusted": true, "trace_trusted": true, "replay_trusted": true, "report_trusted": true, "readiness_trusted": true, "pass_gold": true, "pass_secure": true, "authority_granted": true, "isolation_bypassed": true, "rollback_bypassed": true, "lock_bypassed": true, "observability_bypassed": true, "approval_bypassed": true, "command_allowlist_bypassed": true, "filesystem_isolation_bypassed": true, "kill_switch_bypassed": true}
	a := AuditIsolatedControlledRuntime(in)
	for _, want := range []string{"production_execution_attempt_found", "unrestricted_command_attempt_found", "shell_escape_attempt_found", "path_traversal_attempt_found", "workspace_escape_attempt_found", "network_attempt_found", "secrets_access_attempt_found", "env_access_attempt_found", "git_mutation_attempt_found", "deploy_attempt_found", "promotion_attempt_found", "status_publish_attempt_found", "memory_write_attempt_found", "stable_learning_attempt_found", "push_attempt_found", "pr_attempt_found", "evidence_trust_attempt_found", "result_trust_attempt_found", "trace_trust_attempt_found", "replay_trust_attempt_found", "report_trust_attempt_found", "readiness_trust_attempt_found", "auto_gold_attempt_found", "auto_secure_attempt_found", "authority_grant_attempt_found", "isolation_bypass_attempt_found", "rollback_bypass_attempt_found", "lock_bypass_attempt_found", "observability_bypass_attempt_found", "approval_bypass_attempt_found", "command_allowlist_bypass_attempt_found", "filesystem_isolation_bypass_attempt_found", "kill_switch_bypass_attempt_found"} {
		if !a.Findings[want] {
			t.Fatalf("missing finding %s: %+v", want, a.Findings)
		}
	}
}

func TestExplainContainsRequiredGatesAndNextReceipt(t *testing.T) {
	e := ExplainIsolatedControlledRuntime(validInput(t))
	if e.NextPhase != NextPhase || len(e.RequiredGates) != 2 || e.RequiredGates[0] != "PASS_GOLD" || e.RequiredGates[1] != "PASS_SECURE" {
		t.Fatalf("bad explain: %+v", e)
	}
	if _, ok := e.Reasons["why_v12_1_receipt_is_next"]; !ok {
		t.Fatalf("missing v12.1 reason")
	}
}

func TestExecuteAllowlistedEchoInIsolatedWorkspace(t *testing.T) {
	res := ExecuteIsolatedControlledRuntime(validInput(t))
	if !res.IsolatedExecutionPerformed || !res.IsolatedExecutionSuccess || res.ExitCode != 0 || !strings.Contains(res.Stdout, "V12 isolated runtime") {
		t.Fatalf("expected successful isolated echo: %+v", res)
	}
	if res.DeployAllowed || res.PromotionAllowed || res.StatusPublishAllowed || res.NetworkCallAllowed || res.ProductionExecutionAllowed || res.RepoMutationAllowed || res.PassGold || res.PassSecure || res.AuthorityGranted {
		t.Fatalf("unsafe result: %+v", res)
	}
}
