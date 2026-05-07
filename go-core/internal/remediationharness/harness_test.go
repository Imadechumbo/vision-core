package remediationharness

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/passgold"
	"github.com/visioncore/go-core/internal/passsecure"
	"github.com/visioncore/go-core/internal/patcher"
	"github.com/visioncore/go-core/internal/planning"
	"github.com/visioncore/go-core/internal/security/types"
)

func TestHarness_CORSWildcard_RemediatesToGold(t *testing.T) {
	wildcard := `"` + `*` + `"`
	s := Scenario{
		ID:              "cors",
		Name:            "CORS wildcard remediation",
		RuleID:          "AEGIS_API_004",
		Category:        "api",
		Severity:        types.SeverityHigh,
		FilePath:        "backend/server.js",
		BeforeContent:   "function setCors(res) {\n  res.setHeader(\"Access-Control-Allow-Origin\", " + wildcard + ");\n}\n",
		ExpectedContent: "process.env.ALLOWED_ORIGINS",
		MissionInput:    "CORS origin blocked",
	}
	assertGoldScenario(t, s, `Access-Control-Allow-Origin", `+wildcard)
}

func TestHarness_SensitiveLog_RedactsAndPasses(t *testing.T) {
	s := Scenario{
		ID:              "sensitive-log",
		Name:            "Sensitive log remediation",
		RuleID:          "AEGIS_API_007",
		Category:        "api",
		Severity:        types.SeverityMedium,
		FilePath:        "backend/logger.js",
		BeforeContent:   "function logToken(token) {\n  console.log(\"token:\", token);\n}\n",
		ExpectedContent: `console.log("token:", "[REDACTED]")`,
		MissionInput:    "token logging blocked",
	}
	assertGoldScenario(t, s, `console.log("token:", token)`)
}

func TestHarness_RateLimitComment_AddsGuard(t *testing.T) {
	s := Scenario{
		ID:              "rate-limit",
		Name:            "Rate limit remediation",
		RuleID:          "AEGIS_API_008",
		Category:        "api",
		Severity:        types.SeverityMedium,
		FilePath:        "backend/server.js",
		BeforeContent:   "function configure(app) {\n  // rateLimit()\n}\n",
		ExpectedContent: "rateLimit()",
		MissionInput:    "rate limiting blocked",
	}
	assertGoldScenario(t, s, `// rateLimit()`)
}

func TestHarness_AuthBypass_DisablesBypass(t *testing.T) {
	s := Scenario{
		ID:              "auth-bypass",
		Name:            "Auth bypass remediation",
		RuleID:          "AEGIS_API_005",
		Category:        "api",
		Severity:        types.SeverityCritical,
		FilePath:        "backend/auth.js",
		BeforeContent:   "const skipAuth = true;\nmodule.exports = { skipAuth };\n",
		ExpectedContent: "skipAuth = false",
		MissionInput:    "auth bypass blocked",
	}
	assertGoldScenario(t, s, `skipAuth = true`)
}

func TestHarness_HardcodedSecret_RedactsOrEnvReplaces(t *testing.T) {
	secret := "sk_" + "test_" + "REALISTIC_BUT_FAKE_KEY"
	s := Scenario{
		ID:              "hardcoded-secret",
		Name:            "Hardcoded secret remediation",
		RuleID:          "AEGIS_SECRET_010",
		Category:        "secrets",
		Severity:        types.SeverityHigh,
		FilePath:        "backend/config.js",
		BeforeContent:   "const apiKey = \"" + secret + "\";\nmodule.exports = { apiKey };\n",
		ExpectedContent: "process.env.SECRET_KEY",
		MissionInput:    "hardcoded API key blocked",
	}
	assertGoldScenario(t, s, secret)
}

func TestHarness_TestFixtureDoesNotMap(t *testing.T) {
	root := t.TempDir()
	content := "package fixture\n\nfunc TestFixture(t *testing.T) {\n\t_ = \"console.log token\"\n}\n"
	writeFile(t, root, "backend/logger_test.go", content)

	ps := passsecure.Evaluate(root)
	violations := passsecure.AnnotateViolations(ps.Summary_.Violations)
	found := false
	for _, v := range violations {
		if v.RuleID != "AEGIS_API_007" {
			continue
		}
		found = true
		if v.SourceContext != types.SourceContextTestFixture || v.Disposition != types.DispositionReportOnly || !v.FalsePositive {
			t.Fatalf("expected test fixture report_only false positive, got source=%s disposition=%s false_positive=%v", v.SourceContext, v.Disposition, v.FalsePositive)
		}
		res := planning.MapViolationToOperation(root, planning.RuleMappingInput{
			RuleID: v.RuleID, File: v.File, Line: v.Line, SourceContext: v.SourceContext,
			Disposition: v.Disposition, FalsePositive: v.FalsePositive,
		})
		if res.OK {
			t.Fatalf("test_fixture violation generated operation: %+v", res.Operation)
		}
	}
	if !found {
		t.Fatal("expected API log fixture violation to be detected")
	}
}

func TestHarness_ReportOnlyDoesNotMap(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "backend/logger.js", "console.log('hello');\n")
	res := planning.MapViolationToOperation(root, planning.RuleMappingInput{
		RuleID:        "AEGIS_API_007",
		File:          "backend/logger.js",
		Line:          1,
		SourceContext: types.SourceContextProduction,
		Disposition:   types.DispositionReportOnly,
	})
	if res.OK {
		t.Fatalf("report_only violation generated operation: %+v", res.Operation)
	}
}

func TestHarness_FalsePositiveDoesNotMap(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "backend/logger.js", "console.log('token:', token);\n")
	res := planning.MapViolationToOperation(root, planning.RuleMappingInput{
		RuleID:        "AEGIS_API_007",
		File:          "backend/logger.js",
		Line:          1,
		SourceContext: types.SourceContextProduction,
		Disposition:   types.DispositionBlocking,
		FalsePositive: true,
	})
	if res.OK {
		t.Fatalf("false_positive violation generated operation: %+v", res.Operation)
	}
}

func TestHarness_UnsafeTargetDoesNotPatch(t *testing.T) {
	root := t.TempDir()
	outside := filepath.Join(root, "outside.js")
	if err := os.WriteFile(outside, []byte("safe\n"), 0644); err != nil {
		t.Fatal(err)
	}
	res := patcher.ExecuteSupervisedMultiFile(root, patcher.ExecutionPlanInput{
		MissionID:   "unsafe-target",
		ApplyMode:   "supervised",
		TargetFiles: []string{"../outside.js"},
		Operations: []patcher.PatchOperation{{
			File: "../outside.js", OperationType: "exact_replace", Before: "safe", After: "patched",
		}},
	}, filepath.Join(root, ".vision-snapshots"))
	if res.OK || len(res.FailedFiles) == 0 {
		t.Fatalf("unsafe target should fail and not patch: %+v", res)
	}
	data, err := os.ReadFile(outside)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "safe\n" {
		t.Fatalf("unsafe target was patched: %q", string(data))
	}
}

func TestHarness_MissingBeforeAfterFallsBackToSentinel(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, planning.SafeSentinel, "sentinel\n")
	plan := planning.BuildPatchPlan(planning.PlanInput{MissionID: "sentinel", Root: root})
	if len(plan.TargetFiles) != 1 || plan.TargetFiles[0] != planning.SafeSentinel {
		t.Fatalf("expected sentinel fallback target, got %+v", plan.TargetFiles)
	}
	res := patcher.ExecuteSupervisedMultiFile(root, patcher.ExecutionPlanInput{
		MissionID:   "sentinel",
		ApplyMode:   "supervised",
		TargetFiles: plan.TargetFiles,
	}, filepath.Join(root, ".vision-snapshots"))
	if !res.OK || len(res.AppliedFiles) != 1 || res.AppliedFiles[0] != planning.SafeSentinel {
		t.Fatalf("sentinel fallback should apply safe audit patch: %+v", res)
	}
}

func TestHarness_FailedOperationBlocksGold(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "backend/logger.js", "console.log('token:', token);\n")
	res := patcher.ExecuteSupervisedMultiFile(root, patcher.ExecutionPlanInput{
		MissionID:   "failed-op",
		ApplyMode:   "supervised",
		TargetFiles: []string{"backend/logger.js"},
		Operations: []patcher.PatchOperation{{
			File: "backend/logger.js", OperationType: "exact_replace", Before: "missing", After: "console.log('token:', '[REDACTED]')",
		}},
	}, filepath.Join(root, ".vision-snapshots"))
	pg := passgold.Evaluate(passgold.Gates{
		ScannerOK: true, FileopsOK: true, PatcherOK: res.OK, ValidatorOK: true,
		RollbackReady: true, SecurityOK: false, LegacySafe: true, PassSecureOK: false,
	})
	if res.OK || pg.PassGold {
		t.Fatalf("failed mandatory operation must block gold: patch=%+v passgold=%+v", res, pg)
	}
}

func assertGoldScenario(t *testing.T, s Scenario, insecurePattern string) {
	t.Helper()
	res := Run(t.TempDir(), s)
	if !res.OK {
		t.Fatalf("scenario failed: %+v", res)
	}
	if !res.DetectedBlockingBefore {
		t.Fatalf("expected blocker before: %+v", res)
	}
	if res.SourceContext != types.SourceContextProduction {
		t.Fatalf("expected production source context, got %q", res.SourceContext)
	}
	if res.Disposition != types.DispositionBlocking {
		t.Fatalf("expected blocking disposition, got %q", res.Disposition)
	}
	if !res.BeforeRuleIDPresent {
		t.Fatalf("expected rule %s before", s.RuleID)
	}
	if res.RuleMappingOperations < 1 || !res.RuleMappingGeneratedOperation {
		t.Fatalf("expected generated rule mapping operation: %+v", res)
	}
	if !res.RealRemediationApplied {
		t.Fatalf("expected real remediation applied: %+v", res)
	}
	if !contains(res.ChangedFiles, s.FilePath) {
		t.Fatalf("expected changed file %s in %+v", s.FilePath, res.ChangedFiles)
	}
	if res.BlockingAfter != 0 || !res.PassSecure || !res.PassGold || !res.RollbackReady || !res.MemoryRecorded {
		t.Fatalf("expected clean gold state: %+v", res)
	}
	if !strings.Contains(res.FinalContent, s.ExpectedContent) {
		t.Fatalf("final content missing expected %q:\n%s", s.ExpectedContent, res.FinalContent)
	}
	if strings.Contains(res.FinalContent, insecurePattern) {
		t.Fatalf("final content still contains insecure pattern %q:\n%s", insecurePattern, res.FinalContent)
	}
}

func writeFile(t *testing.T, root, rel, content string) {
	t.Helper()
	path := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
}

func contains(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}
