package impeccable

import "testing"

func TestAnalyzeUIRiskAlwaysDryRunReadOnlyVersion(t *testing.T) {
	est := AnalyzeUIRisk(UIInput{Operation: "frontend_change", Files: []string{"frontend/index.html"}})
	if !est.DryRun || !est.ReadOnly || est.Version != Version {
		t.Fatalf("expected dry_run/read_only/%s, got %#v", Version, est)
	}
}

func TestFrontendFilesRequireVisualDiff(t *testing.T) {
	est := AnalyzeUIRisk(UIInput{Files: []string{"frontend/index.html", "frontend/styles.css"}})
	if est.RiskLevel != RiskMedium && est.RiskLevel != RiskHigh && est.RiskLevel != RiskCritical {
		t.Fatalf("frontend files should be medium+ risk: %#v", est)
	}
	assertContains(t, est.RequiredGates, "VISUAL_DIFF_REQUIRED")
	assertContains(t, est.RequiredGates, "ACCESSIBILITY_CHECK_RECOMMENDED")
}

func TestBackendOnlyFilesLowRisk(t *testing.T) {
	est := AnalyzeUIRisk(UIInput{Files: []string{"go-core/internal/github/github.go"}})
	if est.RiskLevel != RiskLow {
		t.Fatalf("backend-only file should be low risk, got %s (%d)", est.RiskLevel, est.RiskScore)
	}
}

func TestRoutingFilesGenerateRoutingRisk(t *testing.T) {
	est := AnalyzeUIRisk(UIInput{Files: []string{"frontend/_headers", "frontend/_redirects", "workers/proxy.ts"}})
	if est.RiskLevel != RiskHigh && est.RiskLevel != RiskCritical {
		t.Fatalf("routing files should be high+ risk: %#v", est)
	}
	assertContains(t, est.RequiredGates, "ROUTING_CHECK_REQUIRED")
}

func TestMobileViewportIncreasesRiskAndRecommendsValidation(t *testing.T) {
	base := AnalyzeUIRisk(UIInput{Files: []string{"frontend/index.html"}})
	mobile := AnalyzeUIRisk(UIInput{Files: []string{"frontend/index.html"}, Viewport: "mobile"})
	if mobile.RiskScore <= base.RiskScore {
		t.Fatalf("mobile should increase risk: base=%d mobile=%d", base.RiskScore, mobile.RiskScore)
	}
	assertContains(t, mobile.RequiredGates, "MOBILE_VIEWPORT_VALIDATION_REQUIRED")
}

func TestDangerousEnvAndTraversalBlockCritical(t *testing.T) {
	est := AnalyzeUIRisk(UIInput{Files: []string{".env", "../secret.txt"}})
	if !est.Blocked || est.RiskLevel != RiskCritical {
		t.Fatalf("dangerous files should block as critical: %#v", est)
	}
}

func TestVisualGatePlanNeverExecutesCommands(t *testing.T) {
	plan := BuildVisualGatePlan(UIInput{Files: []string{"frontend/index.html"}, Route: "/", Viewport: "mobile"})
	if plan.CommandsExecuted {
		t.Fatal("visual gate plan must never execute commands")
	}
	if !plan.DryRun || !plan.ReadOnly || plan.Version != Version {
		t.Fatalf("expected dry-run read-only V8.4 plan: %#v", plan)
	}
}

func TestGuardStatusBlocksBrowserScreenshotsAndMutations(t *testing.T) {
	status := GuardStatus()
	if !status.Enabled || !status.DryRun || !status.ReadOnly {
		t.Fatalf("guard should be enabled dry-run read-only: %#v", status)
	}
	if status.BrowserExecutionAllowed || status.ScreenshotsAllowed || status.MutationsAllowed || status.DeployAllowed || status.ExternalCallsAllowed {
		t.Fatalf("guard should deny browser/screenshots/mutations/deploy/external calls: %#v", status)
	}
}

func TestExplainReturnsSummaryWhyRiskyAndSafePath(t *testing.T) {
	est := AnalyzeUIRisk(UIInput{Files: []string{"frontend/index.html"}, Viewport: "mobile"})
	explain := ExplainUIRisk(ExplainInput{Estimate: est})
	if explain.Summary == "" || len(explain.WhyRisky) == 0 || len(explain.CheapestSafePath) == 0 {
		t.Fatalf("explain should include summary, why_risky, cheapest_safe_path: %#v", explain)
	}
}

func TestRequiredGatesContainPassGoldAndPassSecure(t *testing.T) {
	est := AnalyzeUIRisk(UIInput{Files: []string{"frontend/index.html"}})
	assertContains(t, est.RequiredGates, "PASS_GOLD")
	assertContains(t, est.RequiredGates, "PASS_SECURE")
}

func assertContains(t *testing.T, values []string, want string) {
	t.Helper()
	for _, v := range values {
		if v == want {
			return
		}
	}
	t.Fatalf("expected %q in %#v", want, values)
}
