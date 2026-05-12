package promotioncontract

import "testing"

func contains(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}

func completeInput() PromotionContractInput {
	return PromotionContractInput{
		Operation: "promote",
		Request: PromotionRequest{
			RequestID: "promo-001", MissionID: "mission-001", Project: "vision-core", Branch: "v6-go-enterprise-runtime", CommitSHA: "69d210e",
			Target: "stable", Environment: "local", Executor: "external_promotion_executor", Operation: "promote",
		},
		Gates: []PromotionGate{
			{Gate: "PASS_GOLD", Status: "pass", Source: "sddf_passgold_validator", ArtifactID: "pg-123", ArtifactType: "pass_gold_report", RealEvidence: true, DryRun: false, Synthesized: false, RecognizedByAuthority: true},
			{Gate: "PASS_SECURE", Status: "pass", Source: "passsecure_runner", ArtifactID: "ps-123", ArtifactType: "pass_secure_report", RealEvidence: true, DryRun: false, Synthesized: false, RecognizedByAuthority: true},
		},
		Artifacts: []PromotionArtifact{
			{ID: "pg-123", Type: "pass_gold_report", Required: true, Present: true, Trusted: true},
			{ID: "ps-123", Type: "pass_secure_report", Required: true, Present: true, Trusted: true},
			{ID: "auth-001", Type: "authority_snapshot", Required: true, Present: true, Trusted: true},
			{ID: "promo-001", Type: "promotion_request", Required: true, Present: true, Trusted: true},
		},
	}
}

func TestBuildBoundaryReadOnlyDryRunV91(t *testing.T) {
	b := BuildBoundary()
	if b.Version != Version || !b.DryRun || !b.ReadOnly {
		t.Fatalf("boundary must be V9.1 dry-run/read-only: %+v", b)
	}
}

func TestBoundaryDefinesMCPValidateAuditExplainOnly(t *testing.T) {
	b := BuildBoundary()
	for _, want := range []string{"validate", "audit", "explain", "simulate_contract"} {
		if !contains(b.MCPScope, want) {
			t.Fatalf("mcp_scope missing %s: %+v", want, b.MCPScope)
		}
	}
}

func TestBoundaryForbidsMutationsInsideMCP(t *testing.T) {
	b := BuildBoundary()
	for _, want := range []string{"promote", "deploy", "publish_status", "push", "PR", "write_memory"} {
		if !contains(b.ForbiddenInsideMCP, want) {
			t.Fatalf("forbidden_inside_mcp missing %s: %+v", want, b.ForbiddenInsideMCP)
		}
	}
}

func TestValidateContractBlocksMCPExecutor(t *testing.T) {
	in := completeInput()
	in.Request.Executor = "mcp"
	got := ValidateContract(in)
	if !got.Blocked || got.Valid || !contains(got.UnsafeClaims, "executor=mcp is forbidden for promotion execution") {
		t.Fatalf("expected executor=mcp block: %+v", got)
	}
}

func TestValidateContractBlocksPromotionAllowedInsideMCP(t *testing.T) {
	in := completeInput()
	in.Request.PromotionAllowed = true
	got := ValidateContract(in)
	if !got.Blocked || !contains(got.UnsafeClaims, "promotion_allowed=true is forbidden inside MCP") {
		t.Fatalf("expected promotion_allowed block: %+v", got)
	}
}

func TestValidateContractBlocksAllExecutionAllowFlags(t *testing.T) {
	in := completeInput()
	in.Request.DeployAllowed = true
	in.Request.StatusPublishAllowed = true
	in.Request.MutationAllowed = true
	in.Request.MemoryWriteAllowed = true
	got := ValidateContract(in)
	for _, want := range []string{"deploy_allowed=true is forbidden inside MCP", "status_publish_allowed=true is forbidden inside MCP", "mutation_allowed=true is forbidden inside MCP", "memory_write_allowed=true is forbidden inside MCP"} {
		if !contains(got.UnsafeClaims, want) {
			t.Fatalf("missing unsafe claim %s: %+v", want, got)
		}
	}
}

func TestValidateContractDetectsMissingPassGoldReal(t *testing.T) {
	in := completeInput()
	in.Gates = in.Gates[1:]
	got := ValidateContract(in)
	if !contains(got.MissingGates, "PASS_GOLD_REAL") {
		t.Fatalf("expected PASS_GOLD_REAL missing: %+v", got)
	}
}

func TestValidateContractDetectsMissingPassSecureReal(t *testing.T) {
	in := completeInput()
	in.Gates = in.Gates[:1]
	got := ValidateContract(in)
	if !contains(got.MissingGates, "PASS_SECURE_REAL") {
		t.Fatalf("expected PASS_SECURE_REAL missing: %+v", got)
	}
}

func TestValidateContractRejectsDryRunGateAsReal(t *testing.T) {
	in := completeInput()
	in.Gates[0].DryRun = true
	got := ValidateContract(in)
	if !got.Blocked || !contains(got.MissingGates, "PASS_GOLD_REAL") {
		t.Fatalf("expected dry-run gate rejection: %+v", got)
	}
}

func TestValidateContractRejectsSynthesizedGate(t *testing.T) {
	in := completeInput()
	in.Gates[0].Synthesized = true
	got := ValidateContract(in)
	if !got.Blocked || !contains(got.MissingGates, "PASS_GOLD_REAL") {
		t.Fatalf("expected synthesized gate rejection: %+v", got)
	}
}

func TestValidateContractRejectsAdvisorySourceAsRealGate(t *testing.T) {
	in := completeInput()
	in.Gates[0].Source = "readiness"
	got := ValidateContract(in)
	if !got.Blocked || !contains(got.MissingGates, "PASS_GOLD_REAL") {
		t.Fatalf("expected advisory source rejection: %+v", got)
	}
}

func TestBuildContractSnapshotCompleteExternallyEligibleDryRun(t *testing.T) {
	got := BuildContractSnapshot(completeInput())
	if got.ContractStatus != "externally_eligible_dry_run" || !got.WouldAllowExternalExecutor {
		t.Fatalf("expected externally eligible dry-run: %+v", got)
	}
}

func TestExternallyEligibleStillBlocksMCPExecutionAllowFlags(t *testing.T) {
	got := BuildContractSnapshot(completeInput())
	if got.PromotionAllowed || got.DeployAllowed || got.StatusPublishAllowed || got.MutationAllowed || got.MemoryWriteAllowed || got.MCPExecutionAllowed {
		t.Fatalf("snapshot must never permit MCP execution: %+v", got)
	}
}

func TestAuditContractDetectsAttemptExternalCall(t *testing.T) {
	in := completeInput()
	in.AttemptExternalCall = true
	got := AuditContract(in)
	if !got.ExecutorCallAttemptFound || !got.UnsafeClaimsFound {
		t.Fatalf("expected external call attempt detection: %+v", got)
	}
}

func TestExplainContractReturnsWhyMCPCannotExecute(t *testing.T) {
	got := ExplainContract(PromotionContractInput{})
	if len(got.WhyMCPCannotExecute) == 0 {
		t.Fatalf("expected why_mcp_cannot_execute: %+v", got)
	}
}

func TestRequiredGatesAlwaysContainPassGoldAndPassSecure(t *testing.T) {
	checks := [][]string{RequiredGates(), BuildBoundary().RequiredBeforeExternalExecution, ValidateContract(completeInput()).RequiredGates, BuildContractSnapshot(completeInput()).RequiredGates, ExplainContract(PromotionContractInput{}).RequiredGates}
	for _, gates := range checks {
		if !(contains(gates, "PASS_GOLD") || contains(gates, "PASS_GOLD_REAL")) || !(contains(gates, "PASS_SECURE") || contains(gates, "PASS_SECURE_REAL")) {
			t.Fatalf("required gates missing PASS_GOLD/PASS_SECURE: %+v", gates)
		}
	}
}
