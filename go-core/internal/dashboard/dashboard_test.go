package dashboard

import "testing"

func TestBuildSnapshotAlwaysDryRunReadOnlyV85(t *testing.T) {
	s := BuildSnapshot(DashboardInput{Root: t.TempDir(), Operation: "mission", MissionInput: "CORS origin blocked"})
	if !s.DryRun || !s.ReadOnly || s.Version != Version {
		t.Fatalf("snapshot must be dry_run/read_only/%s: %+v", Version, s)
	}
}

func TestBuildSnapshotAlwaysBlocksPromotionDeployMutationStatus(t *testing.T) {
	s := BuildSnapshot(DashboardInput{Root: t.TempDir(), Operation: "mission"})
	if s.PromotionAllowed || s.DeployAllowed || s.MutationAllowed || s.StatusPublishAllowed {
		t.Fatalf("dashboard must never allow promotion/deploy/mutation/status publish: %+v", s)
	}
}

func TestBuildSnapshotUIFilesRequireVisualDiff(t *testing.T) {
	s := BuildSnapshot(DashboardInput{Root: t.TempDir(), Operation: "patch", Files: []string{"frontend/index.html"}})
	if !containsString(s.RequiredGates, "VISUAL_DIFF_REQUIRED") {
		t.Fatalf("UI files must require visual diff, gates=%v", s.RequiredGates)
	}
}

func TestBuildSnapshotMutableOperationRequiresDryRun(t *testing.T) {
	for _, op := range []string{"patch", "mission"} {
		s := BuildSnapshot(DashboardInput{Root: t.TempDir(), Operation: op})
		if !containsString(s.RequiredGates, "DRY_RUN_REQUIRED") {
			t.Fatalf("operation %s must require dry-run, gates=%v", op, s.RequiredGates)
		}
	}
}

func TestBuildSnapshotLocalOfflineCostZeroSafeRecommendation(t *testing.T) {
	s := BuildSnapshot(DashboardInput{Root: t.TempDir(), Operation: "patch", Provider: "local", Model: "offline"})
	if s.CodeBurnStatus.Name != "CodeBurn" {
		t.Fatalf("expected CodeBurn section: %+v", s.CodeBurnStatus)
	}
	if !sliceContains(s.CodeBurnStatus.Findings, "estimated_cost_usd=0") {
		t.Fatalf("local/offline must include zero-cost finding: %+v", s.CodeBurnStatus.Findings)
	}
	if !recommendationAction(s.Recommendations, "prefer-local-offline") {
		t.Fatalf("expected local/offline recommendation: %+v", s.Recommendations)
	}
}

func TestDashboardDoesNotFailWhenGraphOrReportsMissing(t *testing.T) {
	s := BuildSnapshot(DashboardInput{Root: t.TempDir(), Operation: "mission", IncludeGraph: true, IncludeReports: true})
	if !s.DryRun || !s.ReadOnly {
		t.Fatalf("snapshot must still be returned: %+v", s)
	}
	if s.GraphStatus.Status != "recommended" {
		t.Fatalf("missing graph should be recommended, got %+v", s.GraphStatus)
	}
	if s.ReportStatus.Status != "recommended" {
		t.Fatalf("missing reports should be recommended, got %+v", s.ReportStatus)
	}
}

func TestBuildReadinessRequiresPassGoldPassSecure(t *testing.T) {
	r := BuildReadiness(DashboardInput{Operation: "patch", Files: []string{"frontend/index.html"}})
	if !r.PassGoldRequired || !r.PassSecureRequired {
		t.Fatalf("PASS gates required: %+v", r)
	}
	if !r.VisualDiffRequired || !r.DryRunRequired || !r.CostGuardRequired || !r.GraphContextRecommended {
		t.Fatalf("expected conservative readiness requirements: %+v", r)
	}
	if r.PromotionAllowed || r.DeployAllowed || r.MutationAllowed {
		t.Fatalf("readiness must deny promotion/deploy/mutation: %+v", r)
	}
}

func TestBuildToolInventoryListsAllGroups(t *testing.T) {
	inv := BuildToolInventory()
	groups := map[string][]string{
		"graph":      inv.GraphTools,
		"dryrun":     inv.DryRunTools,
		"codeburn":   inv.CodeBurnTools,
		"impeccable": inv.ImpeccableTools,
		"dashboard":  inv.DashboardTools,
		"blocked":    inv.BlockedMutatingTools,
	}
	for name, tools := range groups {
		if len(tools) == 0 {
			t.Fatalf("inventory group %s must not be empty", name)
		}
	}
	if !sliceContains(inv.BlockedMutatingTools, "vision.deploy") || !sliceContains(inv.DashboardTools, "vision.dashboard_snapshot") {
		t.Fatalf("inventory missing blocked/dashboard tools: %+v", inv)
	}
}

func TestBuildMissionControlListsExpectedModules(t *testing.T) {
	mc := BuildMissionControl(DashboardInput{Root: t.TempDir(), Operation: "mission"})
	for _, want := range []string{"GraphMemory", "MCPReadOnly", "DryRun", "CodeBurn", "Impeccable", "PASS_GOLD", "PASS_SECURE"} {
		if !moduleNamed(mc.Modules, want) {
			t.Fatalf("mission control missing module %s: %+v", want, mc.Modules)
		}
	}
}

func TestSummarizeIntelligenceReturnsRequiredFields(t *testing.T) {
	s := SummarizeIntelligence(DashboardInput{Root: t.TempDir(), MissionInput: "CORS origin blocked", Operation: "mission", Files: []string{"frontend/index.html"}})
	if s.ExecutiveSummary == "" || len(s.TopRisks) == 0 || len(s.SafestNextSteps) == 0 || len(s.BlockedActions) == 0 {
		t.Fatalf("summary missing required content: %+v", s)
	}
	if !s.DryRun || !s.ReadOnly || s.Version != Version {
		t.Fatalf("summary must be dry_run/read_only/%s: %+v", Version, s)
	}
}

func sliceContains(values []string, want string) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}
	return false
}

func recommendationAction(recs []DashboardRecommendation, action string) bool {
	for _, r := range recs {
		if r.Action == action {
			return true
		}
	}
	return false
}

func moduleNamed(modules []MissionControlModule, name string) bool {
	for _, m := range modules {
		if m.Name == name && m.ReadOnly && !m.MutationAllowed {
			return true
		}
	}
	return false
}
