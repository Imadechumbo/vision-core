package readiness

import "testing"

func dryRunReadinessInput() ReadinessInput {
	return ReadinessInput{MissionInput: "CORS origin blocked", Operation: "mission", Evidences: []map[string]interface{}{{"source": "contract_registry", "tool": "vision.contract_audit", "category": "contract", "status": "pass", "dry_run": true, "read_only": true, "summary": "contract audit conflicts_found=false"}}}
}

func has(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}

func moduleHas(mods []ModuleReadiness, name string) bool {
	for _, m := range mods {
		if m.Name == name {
			return true
		}
	}
	return false
}

func moduleByName(mods []ModuleReadiness, name string) ModuleReadiness {
	for _, m := range mods {
		if m.Name == name {
			return m
		}
	}
	return ModuleReadiness{}
}

func TestBuildReadinessAlwaysV89DryRunReadOnly(t *testing.T) {
	v := BuildReadiness(ReadinessInput{})
	if v.Version != Version || !v.DryRun || !v.ReadOnly {
		t.Fatalf("expected V8.9 dry_run/read_only verdict: %+v", v)
	}
}

func TestBuildReadinessReadyFalseByDefault(t *testing.T) {
	v := BuildReadiness(ReadinessInput{})
	if v.Ready {
		t.Fatalf("ready must be false by default: %+v", v)
	}
}

func TestBuildReadinessNeverAllowsPromotionOrMutation(t *testing.T) {
	v := BuildReadiness(dryRunReadinessInput())
	if v.PromotionAllowed || v.DeployAllowed || v.StatusPublishAllowed || v.MutationAllowed || v.MemoryWriteAllowed {
		t.Fatalf("MCP readiness must never allow promotion/deploy/status/mutation/memory write: %+v", v)
	}
}

func TestMissingRealPassGatesDetected(t *testing.T) {
	v := BuildReadiness(ReadinessInput{})
	if !has(v.MissingGates, "PASS_GOLD_REAL") || !has(v.MissingGates, "PASS_SECURE_REAL") {
		t.Fatalf("missing real gates not detected: %+v", v.MissingGates)
	}
}

func TestDryRunEvidenceNeverPromoted(t *testing.T) {
	v := BuildReadiness(dryRunReadinessInput())
	if v.ReadinessStatus == "promoted" {
		t.Fatalf("readiness must never be promoted: %+v", v)
	}
	if v.ReadinessStatus != "dry_run_only" && v.ReadinessStatus != "missing_real_gates" && v.ReadinessStatus != "advisory_ready" {
		t.Fatalf("unexpected dry-run readiness status: %+v", v)
	}
}

func TestValidateBlocksPassGoldTrueWithDryRun(t *testing.T) {
	v := ValidateReadiness(ReadinessInput{Evidences: []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "status": "pass", "dry_run": true, "pass_gold": true}}})
	if v.Valid || !v.Blocked || len(v.UnsafeClaims) == 0 {
		t.Fatalf("pass_gold dry-run claim must be unsafe: %+v", v)
	}
}

func TestValidateBlocksPromotionAllowedInsideMCP(t *testing.T) {
	v := ValidateReadiness(ReadinessInput{Evidences: []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "promotion_allowed": true}}})
	if v.Valid || !v.Blocked || len(v.UnsafeClaims) == 0 {
		t.Fatalf("promotion_allowed must be unsafe: %+v", v)
	}
}

func TestValidateBlocksDeployStatusMutationMemoryWrite(t *testing.T) {
	v := ValidateReadiness(ReadinessInput{Evidences: []map[string]interface{}{{"deploy_allowed": true, "status_publish_allowed": true, "mutation_allowed": true, "memory_write_allowed": true}}})
	if v.Valid || !v.Blocked || len(v.UnsafeClaims) < 4 {
		t.Fatalf("deploy/status/mutation/memory_write must be unsafe: %+v", v)
	}
}

func TestBuildModuleReadinessIncludesRequiredModules(t *testing.T) {
	mods := BuildModuleReadiness(ReadinessInput{})
	for _, name := range []string{"GraphMemory", "MCPReadOnly", "DryRun", "CodeBurn", "Impeccable", "Dashboard", "PolicyMatrix", "ContractRegistry", "EvidenceLedger", "PASS_GOLD", "PASS_SECURE", "GitHubFlow", "ReportIndex"} {
		if !moduleHas(mods, name) {
			t.Fatalf("missing module %s in %+v", name, mods)
		}
	}
}

func TestPassGoldPassSecureMissingRealGateWhenAbsent(t *testing.T) {
	mods := BuildModuleReadiness(ReadinessInput{})
	if moduleByName(mods, "PASS_GOLD").Status != "missing_real_gate" || moduleByName(mods, "PASS_SECURE").Status != "missing_real_gate" {
		t.Fatalf("PASS gates must be missing_real_gate when absent: %+v", mods)
	}
}

func TestAuditReadinessDetectsPromotionAttempt(t *testing.T) {
	a := AuditReadiness(ReadinessInput{Evidences: []map[string]interface{}{{"source": "dashboard", "tool": "vision.dashboard_snapshot", "dry_run": true, "promotion_allowed": true}}})
	if !a.PromotionAttemptFound || !a.UnsafeClaimsFound {
		t.Fatalf("promotion attempt must be detected: %+v", a)
	}
}

func TestAuditReadinessDetectsReadyWithMissingGatesContradiction(t *testing.T) {
	a := AuditReadiness(ReadinessInput{Ready: true})
	if !a.ConflictsFound || len(a.Conflicts) == 0 {
		t.Fatalf("ready=true with missing gates must conflict: %+v", a)
	}
}

func TestExplainReadinessReturnsWhyNotPromoted(t *testing.T) {
	e := ExplainReadiness(ReadinessInput{})
	if len(e.WhyNotPromoted) == 0 {
		t.Fatalf("expected why_not_promoted explanation: %+v", e)
	}
}

func TestScoreWithoutRealGatesDoesNotAllowReady(t *testing.T) {
	input := ReadinessInput{MissionInput: "x", IncludeDryRun: true, IncludeCodeBurn: true, IncludeImpeccable: true, IncludeDashboard: true, IncludePolicy: true, IncludeContracts: true, IncludeEvidence: true, Evidences: []map[string]interface{}{{"source": "contract_registry", "status": "pass", "dry_run": true}}}
	if score := ScoreReadiness(input); score > 80 {
		t.Fatalf("score without real gates must be capped at 80, got %d", score)
	}
	if BuildReadiness(input).Ready {
		t.Fatal("ready must remain false without real gates")
	}
}

func TestRequiredGatesAlwaysContainPassGoldAndPassSecure(t *testing.T) {
	checks := [][]string{BuildReadiness(ReadinessInput{}).RequiredGates, ValidateReadiness(ReadinessInput{}).RequiredGates, ExplainReadiness(ReadinessInput{}).RequiredGates}
	for _, gates := range checks {
		if !has(gates, "PASS_GOLD") || !has(gates, "PASS_SECURE") {
			t.Fatalf("required gates missing PASS_GOLD/PASS_SECURE: %+v", gates)
		}
	}
}
