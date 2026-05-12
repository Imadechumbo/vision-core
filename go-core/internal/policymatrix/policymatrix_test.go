package policymatrix

import "testing"

func has(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

func TestBuildMatrixDryRunReadOnlyVersion(t *testing.T) {
	m := BuildMatrix()
	if !m.DryRun || !m.ReadOnly || m.Version != Version {
		t.Fatalf("matrix must be V8.6 dry-run read-only: %+v", m)
	}
}

func TestBuildMatrixIncludesOfficialAgents(t *testing.T) {
	m := BuildMatrix()
	for _, agent := range officialAgents {
		if !has(m.Agents, agent) {
			t.Fatalf("missing official agent %s", agent)
		}
	}
}

func TestBuildMatrixListsBlockedMutatingTools(t *testing.T) {
	m := BuildMatrix()
	for _, tool := range mutatingTools {
		if !has(m.BlockedMutatingTools, tool) {
			t.Fatalf("missing blocked mutating tool %s", tool)
		}
	}
}

func TestScannerPolicyAllowsScanBlocksPatch(t *testing.T) {
	p := GetAgentPolicy("Scanner")
	if !p.ReadAllowed || !has(p.AllowedActions, "scan") {
		t.Fatalf("scanner must allow read/scan: %+v", p)
	}
	if !has(p.BlockedActions, "patch") {
		t.Fatalf("scanner must block patch: %+v", p.BlockedActions)
	}
}

func TestHermesPolicyAllowsDiagnoseRecommendBlocksMutation(t *testing.T) {
	p := GetAgentPolicy("Hermes")
	if !p.RecommendAllowed || !has(p.AllowedActions, "diagnose") || !has(p.AllowedActions, "recommend") {
		t.Fatalf("hermes must diagnose/recommend: %+v", p)
	}
	if p.MutateAllowed || !has(p.ForbiddenResponsibilities, "mutation") {
		t.Fatalf("hermes must block mutation: %+v", p)
	}
}

func TestPatchEngineBlocksApplyPatchInMCP(t *testing.T) {
	d := Decide(PolicyInput{Agent: "PatchEngine", Action: "apply_patch", Tool: "vision.apply_patch", Operation: "patch", RequestedMode: "dry_run"})
	if d.Allowed || !d.Blocked || len(d.BlockedReasons) == 0 {
		t.Fatalf("PatchEngine apply_patch must be blocked: %+v", d)
	}
}

func TestDashboardBlocksDeployExecute(t *testing.T) {
	for _, in := range []PolicyInput{{Agent: "Dashboard", Action: "deploy", Tool: "vision.deploy", Operation: "deploy", RequestedMode: "dry_run"}, {Agent: "Dashboard", Action: "execute", Operation: "command", RequestedMode: "dry_run"}} {
		d := Decide(in)
		if d.Allowed || !d.Blocked {
			t.Fatalf("dashboard deploy/execute must be blocked: %+v", d)
		}
	}
}

func TestMemoryBlocksWriteWithoutRealPassGold(t *testing.T) {
	d := Decide(PolicyInput{Agent: "Memory", Action: "memory_write", Operation: "learn", RequestedMode: "dry_run", PassGoldStatus: "unknown", PassSecureStatus: "unknown"})
	if d.Allowed || !d.Blocked || len(d.BlockedReasons) == 0 {
		t.Fatalf("memory write without real gates must be blocked: %+v", d)
	}
}

func TestDecideBlocksMutatingToolsWithRequiredGates(t *testing.T) {
	d := Decide(PolicyInput{Agent: "PatchEngine", Action: "apply_patch", Tool: "vision.apply_patch", Operation: "patch", RequestedMode: "dry_run"})
	if d.Allowed || !d.Blocked || !has(d.RequiredGates, "PASS_GOLD") || !has(d.RequiredGates, "PASS_SECURE") {
		t.Fatalf("mutating tool must be blocked with gates: %+v", d)
	}
}

func TestDecideAllowsCompatibleReadOnlyAction(t *testing.T) {
	d := Decide(PolicyInput{Agent: "Scanner", Action: "scan", Tool: "vision.graph_query", Operation: "read", RequestedMode: "dry_run"})
	if !d.Allowed || d.Blocked {
		t.Fatalf("scanner scan/read must be allowed: %+v", d)
	}
}

func TestValidatePlanBlocksPatchEngineApplyPatch(t *testing.T) {
	result := ValidatePlan(PlanValidationInput{Steps: []PlanStep{{Agent: "Scanner", Action: "scan", Tool: "vision.graph_query", Operation: "read"}, {Agent: "PatchEngine", Action: "apply_patch", Tool: "vision.apply_patch", Operation: "patch"}}})
	if result.Valid || !result.Blocked || len(result.Findings) != 2 || !result.Findings[1].Blocked {
		t.Fatalf("plan with apply_patch must be blocked: %+v", result)
	}
}

func TestValidatePlanApprovesReadOnlyPlan(t *testing.T) {
	result := ValidatePlan(PlanValidationInput{Steps: []PlanStep{{Agent: "Scanner", Action: "scan", Tool: "vision.graph_query", Operation: "read"}, {Agent: "Dashboard", Action: "summarize", Tool: "vision.dashboard_intelligence_summary", Operation: "read"}}})
	if !result.Valid || result.Blocked {
		t.Fatalf("read-only plan must be valid: %+v", result)
	}
}

func TestDetectConflictsCleanMatrix(t *testing.T) {
	r := DetectConflicts()
	if r.ConflictsFound || len(r.Conflicts) != 0 {
		t.Fatalf("correct matrix should have no conflicts: %+v", r)
	}
}

func TestExplainDecisionIncludesSummaryWhyBlockedAndNextSteps(t *testing.T) {
	ex := ExplainDecision(PolicyInput{Agent: "Dashboard", Action: "deploy", Tool: "vision.deploy", Operation: "deploy", RequestedMode: "dry_run"})
	if ex.Summary == "" || len(ex.WhyBlocked) == 0 || len(ex.SafestNextSteps) == 0 || !ex.DryRun || !ex.ReadOnly {
		t.Fatalf("explanation missing required fields: %+v", ex)
	}
}

func TestUnknownAgentBlocksNonReadOnlyAction(t *testing.T) {
	d := Decide(PolicyInput{Agent: "Mystery", Action: "deploy", Tool: "vision.deploy", Operation: "deploy", RequestedMode: "dry_run"})
	if d.Allowed || !d.Blocked {
		t.Fatalf("unknown agent non-read-only action must be blocked: %+v", d)
	}
}
