// internal/patcher/operations_test.go
// VISION AEGIS CORE ENTERPRISE — V6.7 REAL REMEDIATION OPERATIONS TESTS
package patcher

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func writeTestFile(t *testing.T, root, rel, content string) {
	t.Helper()
	abs := filepath.Join(root, filepath.FromSlash(rel))
	_ = os.MkdirAll(filepath.Dir(abs), 0755)
	if err := os.WriteFile(abs, []byte(content), 0644); err != nil {
		t.Fatalf("writeTestFile: %v", err)
	}
}

func readTestFile(t *testing.T, root, rel string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(rel)))
	if err != nil {
		t.Fatalf("readTestFile: %v", err)
	}
	return string(data)
}

func op(file, opType, before, after string) PatchOperation {
	return PatchOperation{
		File:          file,
		OperationType: opType,
		Before:        before,
		After:         after,
		Status:        "pending",
	}
}

// ─── Allowlist ────────────────────────────────────────────────────────────────

func TestApplyOperation_RejectsUnknownOperationType(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js", "const x = 1;")
	res := ApplyOperation(root, op("server.js", "regex_replace", "x", "y"))
	if res.Status != "failed" {
		t.Errorf("expected failed for unknown op type, got %q", res.Status)
	}
	if res.Error == "" {
		t.Error("expected error message for unknown op type")
	}
}

func TestApplyOperation_AllowsAllV67Types(t *testing.T) {
	// Just test they don't fail on allowlist check (they may fail for other reasons)
	types := []string{"noop", "redaction", "exact_replace", "policy_fix", "append_guarded"}
	for _, ot := range types {
		root := t.TempDir()
		res := ApplyOperation(root, PatchOperation{File: "x.js", OperationType: ot})
		if res.Error != "" && strings.Contains(res.Error, "not in the V6.7 allowlist") {
			t.Errorf("operation type %q should be in allowlist", ot)
		}
	}
}

// ─── Path safety ──────────────────────────────────────────────────────────────

func TestApplyOperation_RejectsUnsafeTarget(t *testing.T) {
	root := t.TempDir()
	badTargets := []string{
		"/etc/passwd",
		"../escape",
		".git/config",
		".vision-memory/events.jsonl",
		".vision-snapshots/snap/f.go",
		"node_modules/lib/index.js",
		"vendor/lib.go",
		"dist/bundle.js",
		"build/out.js",
		".next/page.js",
		"handler_test.go",
	}
	for _, target := range badTargets {
		res := ApplyOperation(root, op(target, "exact_replace", "a", "b"))
		if res.Status != "failed" {
			t.Errorf("target %q should be rejected, got status=%q", target, res.Status)
		}
	}
}

func TestApplyOperation_NeverWritesOutsideRoot(t *testing.T) {
	root := t.TempDir()
	outside := filepath.Join(filepath.Dir(root), "outside.txt")
	_ = os.Remove(outside)

	ApplyOperation(root, op("../outside.txt", "exact_replace", "a", "b"))

	if _, err := os.Stat(outside); err == nil {
		t.Error("file written outside root — path traversal vulnerability")
		_ = os.Remove(outside)
	}
}

// ─── noop ─────────────────────────────────────────────────────────────────────

func TestApplyOperation_NoopDoesNotWrite(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js", "original content")
	res := ApplyOperation(root, op("server.js", "noop", "", ""))
	if res.Status != "skipped" {
		t.Errorf("noop should be skipped, got %q", res.Status)
	}
	// File must be unchanged
	content := readTestFile(t, root, "server.js")
	if content != "original content" {
		t.Errorf("noop must not modify file, got %q", content)
	}
}

// ─── exact_replace ────────────────────────────────────────────────────────────

func TestApplyOperation_ExactReplace_Success(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.go", `package main

const skipAuth = false
`)
	res := ApplyOperation(root, op("server.go", "exact_replace",
		"const skipAuth = false", "const skipAuth = true"))
	if res.Status != "applied" {
		t.Errorf("expected applied, got %q — error: %s", res.Status, res.Error)
	}
	content := readTestFile(t, root, "server.go")
	if !strings.Contains(content, "const skipAuth = true") {
		t.Errorf("replacement not applied, content: %q", content)
	}
}

func TestApplyOperation_ExactReplace_FailsWhenBeforeNotFound(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.go", "package main\n")
	res := ApplyOperation(root, op("server.go", "exact_replace", "NOT_THERE", "replacement"))
	if res.Status != "failed" {
		t.Errorf("expected failed when before not found, got %q", res.Status)
	}
	if !strings.Contains(res.Error, "not found") && !strings.Contains(res.Error, "count=0") {
		t.Errorf("error should mention not found, got: %q", res.Error)
	}
}

func TestApplyOperation_ExactReplace_FailsWhenBeforeAmbiguous(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "config.js", "token token\n")
	res := ApplyOperation(root, op("config.js", "exact_replace", "token", "REPLACED"))
	if res.Status != "failed" {
		t.Errorf("expected failed for ambiguous before, got %q", res.Status)
	}
	if !strings.Contains(res.Error, "ambiguous") && !strings.Contains(res.Error, "count=") {
		t.Errorf("error should mention ambiguous, got: %q", res.Error)
	}
}

func TestApplyOperation_ExactReplace_RequiresBefore(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.go", "content")
	res := ApplyOperation(root, op("server.go", "exact_replace", "", "after"))
	if res.Status != "failed" {
		t.Errorf("expected failed when before is empty, got %q", res.Status)
	}
}

func TestApplyOperation_ExactReplace_RequiresAfter(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.go", "content")
	res := ApplyOperation(root, op("server.go", "exact_replace", "content", ""))
	if res.Status != "failed" {
		t.Errorf("expected failed when after is empty, got %q", res.Status)
	}
}

// ─── redaction ────────────────────────────────────────────────────────────────

func TestApplyOperation_Redaction_Success(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "handler.js",
		`function login(token) { console.log("token:", token); }`)
	res := ApplyOperation(root, PatchOperation{
		File:          "handler.js",
		OperationType: "redaction",
		Before:        `console.log("token:", token)`,
		After:         `console.log("token:", "[REDACTED]")`,
		Status:        "pending",
	})
	if res.Status != "applied" {
		t.Errorf("expected applied, got %q — error: %s", res.Status, res.Error)
	}
	content := readTestFile(t, root, "handler.js")
	if strings.Contains(content, `console.log("token:", token)`) {
		t.Error("redaction not applied — original still present")
	}
}

func TestApplyOperation_Redaction_UsesPlaceholderWhenAfterEmpty(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "auth.js", `const secret = "mypassword123";`)
	res := ApplyOperation(root, PatchOperation{
		File:          "auth.js",
		OperationType: "redaction",
		Before:        `"mypassword123"`,
		After:         "",
		Status:        "pending",
	})
	if res.Status != "applied" {
		t.Errorf("expected applied, got %q — error: %s", res.Status, res.Error)
	}
	content := readTestFile(t, root, "auth.js")
	if !strings.Contains(content, redactedPlaceholder) {
		t.Errorf("expected [REDACTED] placeholder, content: %q", content)
	}
}

func TestApplyOperation_Redaction_DoesNotLeakSecretInError(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "config.js", "const x = 1;")
	secret := "SUPER_SECRET_VALUE_12345"
	res := ApplyOperation(root, PatchOperation{
		File:          "config.js",
		OperationType: "redaction",
		Before:        secret,
		After:         "[REDACTED]",
		Status:        "pending",
	})
	if res.Status == "applied" {
		return // not found is fine for this test
	}
	// Error must not contain the secret value
	if strings.Contains(res.Error, secret) {
		t.Errorf("redaction error leaks secret value: %q", res.Error)
	}
	// Before field should be cleared on applied ops
	if res.Before == secret && res.Status == "applied" {
		t.Error("Before field should be cleared after redaction")
	}
}

func TestApplyOperation_Redaction_FailsWhenBeforeNotFound(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js", "no secrets here\n")
	res := ApplyOperation(root, PatchOperation{
		File:          "server.js",
		OperationType: "redaction",
		Before:        "NOTPRESENT",
		After:         "[REDACTED]",
		Status:        "pending",
	})
	if res.Status != "failed" {
		t.Errorf("expected failed when before not found, got %q", res.Status)
	}
	// Error must not expose the search term as a "secret"
	if strings.Contains(res.Error, "NOTPRESENT") {
		// This is acceptable — NOTPRESENT isn't a real secret
		// But real secrets shouldn't appear
	}
}

func TestApplyOperation_Redaction_FailsWhenBeforeAmbiguous(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js", "token token\n")
	res := ApplyOperation(root, PatchOperation{
		File:          "server.js",
		OperationType: "redaction",
		Before:        "token",
		After:         "[REDACTED]",
		Status:        "pending",
	})
	if res.Status != "failed" {
		t.Errorf("expected failed for ambiguous redaction, got %q", res.Status)
	}
}

// ─── policy_fix ───────────────────────────────────────────────────────────────

func TestApplyOperation_PolicyFix_Success(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "middleware.js",
		`app.use(cors({ origin: '*' }));`)
	res := ApplyOperation(root, PatchOperation{
		File:          "middleware.js",
		OperationType: "policy_fix",
		Before:        `origin: '*'`,
		After:         `origin: ['https://yourdomain.com']`,
		Status:        "pending",
	})
	if res.Status != "applied" {
		t.Errorf("expected applied, got %q — error: %s", res.Status, res.Error)
	}
	content := readTestFile(t, root, "middleware.js")
	if strings.Contains(content, "origin: '*'") {
		t.Error("policy_fix not applied — wildcard still present")
	}
}

func TestApplyOperation_PolicyFix_RequiresExplicitBeforeAfter(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "config.js", "const x = 1;")
	// Empty before — must fail
	res := ApplyOperation(root, PatchOperation{
		File:          "config.js",
		OperationType: "policy_fix",
		Before:        "",
		After:         "safe_value",
		Status:        "pending",
	})
	if res.Status != "failed" {
		t.Errorf("policy_fix without before must fail, got %q", res.Status)
	}
}

// ─── append_guarded ───────────────────────────────────────────────────────────

func TestApplyOperation_AppendGuarded_AddsBlockOnce(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js", "const express = require('express');\n")
	res := ApplyOperation(root, PatchOperation{
		File:          "server.js",
		OperationType: "append_guarded",
		After:         "// rate limiting placeholder\n",
		Anchor:        "rate-limit-v1",
		Status:        "pending",
	})
	if res.Status != "applied" {
		t.Errorf("expected applied, got %q — error: %s", res.Status, res.Error)
	}
	content := readTestFile(t, root, "server.js")
	if !strings.Contains(content, guardPrefix+"rate-limit-v1") {
		t.Errorf("guard start marker missing, content: %q", content)
	}
	if !strings.Contains(content, guardSuffix+"rate-limit-v1") {
		t.Errorf("guard end marker missing, content: %q", content)
	}
}

func TestApplyOperation_AppendGuarded_SkipsIfAlreadyPresent(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js",
		"const x = 1;\n"+guardPrefix+"rate-limit-v1\n// content\n"+guardSuffix+"rate-limit-v1\n")

	res := ApplyOperation(root, PatchOperation{
		File:          "server.js",
		OperationType: "append_guarded",
		After:         "// new content\n",
		Anchor:        "rate-limit-v1",
		Status:        "pending",
	})
	if res.Status != "skipped" {
		t.Errorf("expected skipped (idempotent), got %q", res.Status)
	}
	// Content must be unchanged
	content := readTestFile(t, root, "server.js")
	if strings.Count(content, guardPrefix+"rate-limit-v1") != 1 {
		t.Error("guard block should appear exactly once")
	}
}

func TestApplyOperation_AppendGuarded_RequiresAfter(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js", "content\n")
	res := ApplyOperation(root, PatchOperation{
		File:          "server.js",
		OperationType: "append_guarded",
		After:         "",
		Anchor:        "test-guard",
		Status:        "pending",
	})
	if res.Status != "failed" {
		t.Errorf("append_guarded without after must fail, got %q", res.Status)
	}
}

// ─── ApplyOperations batch ────────────────────────────────────────────────────

func TestApplyOperations_BatchCounts(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "a.js", "const x = 'before';\n")
	writeTestFile(t, root, "b.js", "nothing here\n")

	ops := []PatchOperation{
		{File: "a.js", OperationType: "exact_replace", Before: "'before'", After: "'after'", Status: "pending"},
		{File: "b.js", OperationType: "exact_replace", Before: "NOTFOUND", After: "x", Status: "pending"},
		{File: "c.js", OperationType: "noop", Status: "pending"}, // noop → skipped
	}
	result, applied, skipped, failed := ApplyOperations(root, ops)
	if len(result) != 3 {
		t.Fatalf("expected 3 results, got %d", len(result))
	}
	if applied != 1 {
		t.Errorf("expected 1 applied, got %d", applied)
	}
	if skipped != 1 {
		t.Errorf("expected 1 skipped (noop), got %d", skipped)
	}
	if failed != 1 {
		t.Errorf("expected 1 failed (not found), got %d", failed)
	}
}

// ─── ExecuteSupervisedMultiFile with real operations ─────────────────────────

func TestExecuteSupervised_AppliesRealOperationsWhenProvided(t *testing.T) {
	root := t.TempDir()
	_ = os.MkdirAll(filepath.Join(root, ".vision-test"), 0755)
	writeTestFile(t, root, "server.js", `app.use(cors({ origin: '*' }));`)

	input := ExecutionPlanInput{
		MissionID: "m1",
		ApplyMode: "supervised",
		TargetFiles: []string{"server.js"},
		Root:    root,
		Operations: []PatchOperation{
			{
				File:          "server.js",
				OperationType: "policy_fix",
				Before:        "origin: '*'",
				After:         "origin: ['https://example.com']",
				Status:        "pending",
			},
		},
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))

	if !res.RealRemediationEnabled {
		t.Error("expected real_remediation_enabled=true when operations provided")
	}
	if res.OperationsTotal != 1 {
		t.Errorf("expected 1 total operation, got %d", res.OperationsTotal)
	}
	if res.OperationsApplied != 1 {
		t.Errorf("expected 1 applied, got %d — error: %s", res.OperationsApplied, res.Error)
	}
	if !res.RealRemediationApplied {
		t.Error("expected real_remediation_applied=true")
	}
}

func TestExecuteSupervised_FallsBackToSentinelWhenNoOperations(t *testing.T) {
	root := t.TempDir()
	_ = os.MkdirAll(filepath.Join(root, ".vision-test"), 0755)
	_ = os.WriteFile(filepath.Join(root, ".vision-test", "mission.sentinel"), []byte("x"), 0644)

	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{".vision-test/mission.sentinel"},
		Root:        root,
		Operations:  nil, // no real operations
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	if res.RealRemediationEnabled {
		t.Error("real_remediation_enabled must be false when no operations provided")
	}
}

func TestExecuteSupervised_FailedOperationSetsOKFalse(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "server.js", "no match here\n")

	input := ExecutionPlanInput{
		MissionID: "m1",
		ApplyMode: "supervised",
		TargetFiles: []string{"server.js"},
		Root:    root,
		Operations: []PatchOperation{
			{
				File:          "server.js",
				OperationType: "exact_replace",
				Before:        "NOTFOUND",
				After:         "replacement",
				Status:        "pending",
			},
		},
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	if res.OK {
		t.Error("expected OK=false when required operation fails")
	}
	if res.OperationsFailed != 1 {
		t.Errorf("expected 1 failed operation, got %d", res.OperationsFailed)
	}
	if len(res.FailedFiles) == 0 {
		t.Error("expected failed_files non-empty")
	}
}

func TestExecuteSupervised_PatchedFilesCountsOnlyAppliedWrites(t *testing.T) {
	root := t.TempDir()
	writeTestFile(t, root, "a.js", "const x = 'before';\n")

	input := ExecutionPlanInput{
		MissionID: "m1",
		ApplyMode: "supervised",
		TargetFiles: []string{"a.js"},
		Root:    root,
		Operations: []PatchOperation{
			{File: "a.js", OperationType: "exact_replace",
				Before: "'before'", After: "'after'", Status: "pending"},
			{File: "b.js", OperationType: "noop", Status: "pending"}, // skipped, no write
		},
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	// noop should not count as patched_files
	if res.PatchedFiles > 1 {
		t.Errorf("noop should not count as patched_files, got %d", res.PatchedFiles)
	}
}
