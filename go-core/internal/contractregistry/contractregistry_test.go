package contractregistry

import "testing"

func TestBuildRegistryV87ReadOnlyDryRun(t *testing.T) {
	s := BuildRegistry()
	if s.Version != Version || !s.DryRun || !s.ReadOnly || s.RegistryStatus != "safe_read_only" {
		t.Fatalf("unexpected registry safety markers: %+v", s)
	}
}

func TestRegistryIncludesContractsV80ThroughV87(t *testing.T) {
	s := BuildRegistry()
	seen := map[string]bool{}
	for _, c := range s.Contracts {
		seen[c.Version] = true
	}
	for _, v := range []string{"V8.0", "V8.1", "V8.2", "V8.3", "V8.4", "V8.5", "V8.6", "V8.7"} {
		if !seen[v] {
			t.Fatalf("registry missing contracts for %s", v)
		}
	}
}

func TestRegistryIncludesMutatingToolsBlocked(t *testing.T) {
	for _, tool := range blockedMutatingTools() {
		c := GetContract(tool)
		if !c.Blocked || !c.Mutating {
			t.Fatalf("mutating tool %s must be blocked and mutating: %+v", tool, c)
		}
	}
}

func TestGetContractDashboardSnapshot(t *testing.T) {
	c := GetContract("vision.dashboard_snapshot")
	if c.Name != "vision.dashboard_snapshot" || c.Category != "dashboard" || !c.ReadOnly || !c.DryRun || c.Mutating || c.Blocked {
		t.Fatalf("unexpected dashboard contract: %+v", c)
	}
}

func TestGetContractDeployBlocked(t *testing.T) {
	c := GetContract("vision.deploy")
	if !c.Blocked || !c.Mutating {
		t.Fatalf("deploy must be blocked mutating contract: %+v", c)
	}
}

func TestGetContractUnknownConservativeBlocked(t *testing.T) {
	c := GetContract("vision.future_tool")
	if c.Category != "unknown" || !c.Blocked || !c.ReadOnly || !c.DryRun {
		t.Fatalf("unknown tool must be conservative blocked contract: %+v", c)
	}
}

func TestValidateContractAcceptsValidPolicyDecidePayload(t *testing.T) {
	res := ValidateContract(ContractInput{Tool: "vision.policy_decide", Strict: true, Payload: map[string]interface{}{
		"agent": "PatchEngine", "action": "apply_patch", "tool": "vision.apply_patch", "operation": "patch", "requested_mode": "dry_run",
	}})
	if !res.Valid || res.Blocked || len(res.MissingFields) != 0 || len(res.UnknownFields) != 0 {
		t.Fatalf("expected valid policy_decide payload: %+v", res)
	}
}

func TestValidateContractBlocksMutatingTool(t *testing.T) {
	res := ValidateContract(ContractInput{Tool: "vision.deploy"})
	if res.Valid || !res.Blocked || len(res.BlockedReasons) == 0 {
		t.Fatalf("mutating tool must be invalid and blocked: %+v", res)
	}
}

func TestValidateContractDetectsMissingRequiredFields(t *testing.T) {
	res := ValidateContract(ContractInput{Tool: "vision.policy_decide", Payload: map[string]interface{}{"agent": "PatchEngine"}})
	if res.Valid || len(res.MissingFields) == 0 {
		t.Fatalf("expected missing required fields: %+v", res)
	}
}

func TestValidateContractStrictDetectsUnknownFields(t *testing.T) {
	res := ValidateContract(ContractInput{Tool: "vision.policy_decide", Strict: true, Payload: map[string]interface{}{
		"agent": "PatchEngine", "action": "apply_patch", "tool": "vision.apply_patch", "operation": "patch", "requested_mode": "dry_run", "extra": true,
	}})
	if res.Valid || len(res.UnknownFields) != 1 || res.UnknownFields[0] != "extra" {
		t.Fatalf("strict validation must reject unknown fields: %+v", res)
	}
}

func TestAuditRegistryClean(t *testing.T) {
	res := AuditRegistry()
	if res.ConflictsFound || len(res.Conflicts) != 0 || len(res.MissingContracts) != 0 || len(res.DuplicateContracts) != 0 {
		t.Fatalf("registry should audit clean: %+v", res)
	}
}

func TestBuildRuntimeModulesIncludesExpected(t *testing.T) {
	seen := map[string]bool{}
	for _, m := range BuildRuntimeModules() {
		seen[m.Name] = true
		if m.MutationAllowed {
			t.Fatalf("module %s must not allow MCP mutation", m.Name)
		}
	}
	for _, name := range []string{"GraphMemory", "MCPReadOnly", "DryRun", "CodeBurn", "Impeccable", "Dashboard", "PolicyMatrix", "ContractRegistry", "PASS_GOLD", "PASS_SECURE"} {
		if !seen[name] {
			t.Fatalf("missing runtime module %s", name)
		}
	}
}

func TestExplainContractReturnsRequiredNarrative(t *testing.T) {
	res := ExplainContract(ContractInput{Tool: "vision.deploy", Operation: "deploy"})
	if res.Summary == "" || len(res.ContractScope) == 0 || len(res.SafestNextSteps) == 0 || !res.DryRun || !res.ReadOnly {
		t.Fatalf("explain result missing narrative fields: %+v", res)
	}
}

func TestAllContractsIncludePassGoldPassSecure(t *testing.T) {
	for _, c := range BuildRegistry().Contracts {
		if !hasGate(c.RequiredGates, "PASS_GOLD") || !hasGate(c.RequiredGates, "PASS_SECURE") {
			t.Fatalf("contract %s missing required gates: %+v", c.Name, c.RequiredGates)
		}
	}
}
