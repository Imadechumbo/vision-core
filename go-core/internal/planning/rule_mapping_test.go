// internal/planning/rule_mapping_test.go
// VISION AEGIS CORE ENTERPRISE — V6.8 RULE MAPPING TESTS
package planning

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func prodInput(ruleID, file string, line int) RuleMappingInput {
	return RuleMappingInput{
		RuleID:        ruleID,
		Severity:      "HIGH",
		File:          file,
		Line:          line,
		SourceContext: "production",
		Disposition:   "blocking",
		FalsePositive: false,
	}
}

func writeFile(t *testing.T, root, rel, content string) {
	t.Helper()
	abs := filepath.Join(root, filepath.FromSlash(rel))
	_ = os.MkdirAll(filepath.Dir(abs), 0755)
	if err := os.WriteFile(abs, []byte(content), 0644); err != nil {
		t.Fatalf("writeFile: %v", err)
	}
}

// ─── Eligibility gates ────────────────────────────────────────────────────────

func TestMapViolation_RejectsTestFixture(t *testing.T) {
	root := t.TempDir()
	v := prodInput("AEGIS_API_007", "handler_test.go", 1)
	res := MapViolationToOperation(root, v)
	if res.OK {
		t.Error("test_fixture file must not generate operation")
	}
}

func TestMapViolation_RejectsReportOnly(t *testing.T) {
	root := t.TempDir()
	v := prodInput("AEGIS_API_007", "server.js", 1)
	v.Disposition = "report_only"
	res := MapViolationToOperation(root, v)
	if res.OK {
		t.Error("report_only disposition must not generate operation")
	}
}

func TestMapViolation_RejectsFalsePositive(t *testing.T) {
	root := t.TempDir()
	v := prodInput("AEGIS_API_007", "server.js", 1)
	v.FalsePositive = true
	res := MapViolationToOperation(root, v)
	if res.OK {
		t.Error("false_positive must not generate operation")
	}
}

func TestMapViolation_RejectsNonProductionContext(t *testing.T) {
	root := t.TempDir()
	for _, ctx := range []string{"generated", "vendor", "snapshot", "unknown", "test_fixture"} {
		v := prodInput("AEGIS_API_004", "server.js", 1)
		v.SourceContext = ctx
		res := MapViolationToOperation(root, v)
		if res.OK {
			t.Errorf("source_context=%q must not generate operation", ctx)
		}
	}
}

func TestMapViolation_RejectsUnsafeFile(t *testing.T) {
	root := t.TempDir()
	bad := []string{
		"../escape.js", ".git/config", "node_modules/lib.js",
		"vendor/lib.go", "dist/out.js", "/absolute/file.js",
	}
	for _, f := range bad {
		v := prodInput("AEGIS_API_004", f, 1)
		res := MapViolationToOperation(root, v)
		if res.OK {
			t.Errorf("unsafe file %q must be rejected", f)
		}
	}
}

func TestMapViolation_RejectsUnknownRule(t *testing.T) {
	root := t.TempDir()
	v := prodInput("AEGIS_UNKNOWN_999", "server.js", 1)
	res := MapViolationToOperation(root, v)
	if res.OK {
		t.Error("unknown rule must not generate operation")
	}
	if !strings.Contains(res.Reason, "allowlist") {
		t.Errorf("reason should mention allowlist, got: %q", res.Reason)
	}
}

// ─── AEGIS_API_007 — redaction ────────────────────────────────────────────────

func TestMap_API007_Redaction_ConsoleLog(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "auth.js", `
function login(token) {
  console.log("token:", token)
  return token
}
`)
	v := prodInput("AEGIS_API_007", "auth.js", 3)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation, got reason: %s", res.Reason)
	}
	if res.Operation.OperationType != "redaction" {
		t.Errorf("expected redaction, got %q", res.Operation.OperationType)
	}
	if res.Operation.Before == "" {
		t.Error("Before must not be empty")
	}
	if res.Operation.After == "" {
		t.Error("After must not be empty")
	}
	// After must contain REDACTED
	if !strings.Contains(res.Operation.After, "[REDACTED]") {
		t.Errorf("After must contain [REDACTED], got: %q", res.Operation.After)
	}
}

func TestMap_API007_Redaction_DoesNotLeakSecret(t *testing.T) {
	root := t.TempDir()
	secret := "SUPER_SECRET_TOKEN_VALUE"
	writeFile(t, root, "handler.js", `console.log("key:", "`+secret+`")`)
	v := prodInput("AEGIS_API_007", "handler.js", 1)
	res := MapViolationToOperation(root, v)
	// Reason must never contain the secret
	if strings.Contains(res.Reason, secret) {
		t.Errorf("Reason leaks secret: %q", res.Reason)
	}
	if res.OK {
		// After should contain REDACTED or process.env, not the raw secret
		if strings.Contains(res.Operation.After, secret) {
			t.Errorf("After must not contain raw secret, got: %q", res.Operation.After)
		}
	}
}

func TestMap_API007_FailsWhenNotLogStatement(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "config.js", `const token = "abc123"`)
	v := prodInput("AEGIS_API_007", "config.js", 1)
	res := MapViolationToOperation(root, v)
	if res.OK {
		t.Error("non-log line should not generate redaction")
	}
}

// ─── AEGIS_API_004 — CORS wildcard ───────────────────────────────────────────

func TestMap_API004_CORSFix_OriginWildcard(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `app.use(cors({ origin: '*' }));`)
	v := prodInput("AEGIS_API_004", "server.js", 1)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation for CORS wildcard, got: %s", res.Reason)
	}
	if res.Operation.OperationType != "policy_fix" {
		t.Errorf("expected policy_fix, got %q", res.Operation.OperationType)
	}
	// After must not contain wildcard
	if strings.Contains(res.Operation.After, `'*'`) || strings.Contains(res.Operation.After, `"*"`) {
		t.Errorf("After must not contain wildcard, got: %q", res.Operation.After)
	}
}

func TestMap_API004_CORSFix_DoubleQuoteWildcard(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `cors({ origin: "*" })`)
	v := prodInput("AEGIS_API_004", "server.js", 1)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation, got: %s", res.Reason)
	}
	if strings.Contains(res.Operation.After, `"*"`) {
		t.Error("After must not contain wildcard")
	}
}

func TestMap_API004_FailsWhenNoCORSWildcard(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `app.use(cors({ origin: 'https://example.com' }));`)
	v := prodInput("AEGIS_API_004", "server.js", 1)
	res := MapViolationToOperation(root, v)
	if res.OK {
		t.Error("should not generate operation when no wildcard present")
	}
}

// ─── AEGIS_API_008 — rate limiting ───────────────────────────────────────────

func TestMap_API008_AppendGuarded_WhenNoCommentedLine(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `const express = require('express');`)
	// Line without commented rateLimit → should produce append_guarded
	v := prodInput("AEGIS_API_008", "server.js", 1)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation, got: %s", res.Reason)
	}
}

func TestMap_API008_PolicyFix_WhenCommentedRateLimit(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `
const express = require('express');
// rateLimit({ windowMs: 60000, max: 100 })
`)
	v := prodInput("AEGIS_API_008", "server.js", 3)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation, got: %s", res.Reason)
	}
	// Should be policy_fix (uncomment) or append_guarded — either is valid
	valid := res.Operation.OperationType == "policy_fix" || res.Operation.OperationType == "append_guarded"
	if !valid {
		t.Errorf("expected policy_fix or append_guarded, got %q", res.Operation.OperationType)
	}
}

func TestMap_API008_GuardMarkerIsStable(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `const x = 1;`)
	v := prodInput("AEGIS_API_008", "server.js", 1)
	res := MapViolationToOperation(root, v)
	if res.OK && res.Operation.OperationType == "append_guarded" {
		if res.Operation.Anchor != "AEGIS_API_008_RATE_LIMIT_GUARD" {
			t.Errorf("guard anchor must be stable, got %q", res.Operation.Anchor)
		}
	}
}

// ─── AEGIS_API_006 — auth bypass ─────────────────────────────────────────────

func TestMap_API006_ExactReplace_SkipAuth(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "auth.go", "package auth\n\nconst skipAuth = true\n")
	// skipAuth is on line 3 (package=1, blank=2, const=3)
	v := prodInput("AEGIS_API_006", "auth.go", 3)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation for skipAuth=true, got: %s", res.Reason)
	}
	if res.Operation.After == res.Operation.Before {
		t.Error("After must differ from Before")
	}
	// After must not have = true
	if strings.HasSuffix(strings.TrimSpace(res.Operation.After), "= true") {
		t.Errorf("After must disable the flag, got: %q", res.Operation.After)
	}
}

func TestMap_API006_ExactReplace_AuthDisabled(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "middleware.js", `const authDisabled = true;`)
	v := prodInput("AEGIS_API_006", "middleware.js", 1)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation for authDisabled=true, got: %s", res.Reason)
	}
}

func TestMap_API006_FailsWithNoBypassPattern(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.go", `package main`)
	v := prodInput("AEGIS_API_006", "server.go", 1)
	res := MapViolationToOperation(root, v)
	if res.OK {
		t.Error("should not generate operation when no auth bypass pattern present")
	}
}

// ─── AEGIS_SECRET_010 — hardcoded secret ─────────────────────────────────────

func TestMap_Secret010_RedactionJS(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "config.js", `const apiKey = "sk_live_supersecret";`)
	v := prodInput("AEGIS_SECRET_010", "config.js", 1)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation, got: %s", res.Reason)
	}
	if res.Operation.OperationType != "redaction" {
		t.Errorf("expected redaction, got %q", res.Operation.OperationType)
	}
	// After should use process.env or [REDACTED]
	safeAfter := strings.Contains(res.Operation.After, "process.env") ||
		strings.Contains(res.Operation.After, "[REDACTED]")
	if !safeAfter {
		t.Errorf("After should use process.env or [REDACTED], got: %q", res.Operation.After)
	}
}

func TestMap_Secret010_RedactionGo(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "config.go", `const key = "AKIAIOSFODNN7EXAMPLE"`)
	v := prodInput("AEGIS_SECRET_010", "config.go", 1)
	res := MapViolationToOperation(root, v)
	if !res.OK {
		t.Errorf("expected operation, got: %s", res.Reason)
	}
	// After should use os.Getenv or [REDACTED]
	safeAfter := strings.Contains(res.Operation.After, "os.Getenv") ||
		strings.Contains(res.Operation.After, "[REDACTED]")
	if !safeAfter {
		t.Errorf("After should use os.Getenv or [REDACTED], got: %q", res.Operation.After)
	}
}

// ─── AttachOperationsFromViolations ──────────────────────────────────────────

func TestAttachOperations_GeneratesOpsForEligibleViolations(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `cors({ origin: '*' })`)

	plan := PatchPlan{ApplyMode: "supervised"}
	violations := []RuleMappingInput{
		{
			RuleID:        "AEGIS_API_004",
			File:          "server.js",
			Line:          1,
			SourceContext: "production",
			Disposition:   "blocking",
			FalsePositive: false,
		},
	}
	plan = AttachOperationsFromViolations(root, plan, violations)
	if len(plan.Operations) == 0 {
		t.Error("expected at least one operation generated")
	}
}

func TestAttachOperations_SkipsTestFixture(t *testing.T) {
	root := t.TempDir()
	plan := PatchPlan{ApplyMode: "supervised"}
	violations := []RuleMappingInput{
		{
			RuleID:        "AEGIS_API_004",
			File:          "server_test.go",
			Line:          1,
			SourceContext: "test_fixture",
			Disposition:   "report_only",
			FalsePositive: false,
		},
	}
	plan = AttachOperationsFromViolations(root, plan, violations)
	if len(plan.Operations) > 0 {
		t.Error("test_fixture must not generate operations")
	}
}

func TestAttachOperations_SkipsFalsePositive(t *testing.T) {
	root := t.TempDir()
	plan := PatchPlan{ApplyMode: "supervised"}
	violations := []RuleMappingInput{
		{
			RuleID:        "AEGIS_API_004",
			File:          "server.js",
			Line:          1,
			SourceContext: "production",
			Disposition:   "blocking",
			FalsePositive: true,
		},
	}
	plan = AttachOperationsFromViolations(root, plan, violations)
	if len(plan.Operations) > 0 {
		t.Error("false_positive must not generate operations")
	}
}

func TestAttachOperations_Deduplicates(t *testing.T) {
	root := t.TempDir()
	writeFile(t, root, "server.js", `cors({ origin: '*' })`)

	plan := PatchPlan{ApplyMode: "supervised"}
	v := RuleMappingInput{
		RuleID:        "AEGIS_API_004",
		File:          "server.js",
		Line:          1,
		SourceContext: "production",
		Disposition:   "blocking",
		FalsePositive: false,
	}
	// Same violation twice
	plan = AttachOperationsFromViolations(root, plan, []RuleMappingInput{v, v})
	if len(plan.Operations) > 1 {
		t.Errorf("duplicate violation should generate only one operation, got %d", len(plan.Operations))
	}
}

func TestAttachOperations_RejectionNotesNoSecret(t *testing.T) {
	root := t.TempDir()
	secret := "SUPER_SECRET_VALUE"
	writeFile(t, root, "config.js", `const x = "`+secret+`";`)
	plan := PatchPlan{ApplyMode: "supervised"}
	violations := []RuleMappingInput{
		{
			RuleID:        "AEGIS_UNKNOWN_999", // unknown → rejected
			File:          "config.js",
			Line:          1,
			SourceContext: "production",
			Disposition:   "blocking",
			FalsePositive: false,
		},
	}
	plan = AttachOperationsFromViolations(root, plan, violations)
	for _, note := range plan.Notes {
		if strings.Contains(note, secret) {
			t.Errorf("rejection note leaks secret: %q", note)
		}
	}
}
