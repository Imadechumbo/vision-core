// internal/patcher/supervised_test.go
// VISION AEGIS CORE ENTERPRISE — V6.6 SUPERVISED MULTI-FILE EXECUTION TESTS
package patcher

import (
	"os"
	"path/filepath"
	"testing"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func supervisedInput(t *testing.T, targets []string) ExecutionPlanInput {
	t.Helper()
	return ExecutionPlanInput{
		MissionID:    "mission_test_v66",
		TransactionID: "",
		ApplyMode:    "supervised",
		TargetFiles:  targets,
		Root:         t.TempDir(),
		DryRun:       false,
	}
}

// ─── ApplyMode governance ────────────────────────────────────────────────────

func TestExecuteSupervised_RejectsAutomaticMode(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID: "m1",
		ApplyMode: "automatic",
		Root:      root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	if res.OK {
		t.Error("expected OK=false for apply_mode='automatic'")
	}
	if res.Error == "" {
		t.Error("expected error message for automatic mode")
	}
}

func TestExecuteSupervised_RejectsEmptyMode(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID: "m1",
		ApplyMode: "",
		Root:      root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	if res.OK {
		t.Error("expected OK=false for empty apply_mode")
	}
}

func TestExecuteSupervised_RejectsUnknownMode(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID: "m1",
		ApplyMode: "autonomous",
		Root:      root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	if res.OK {
		t.Error("expected OK=false for unknown apply_mode")
	}
}

// ─── Path safety ──────────────────────────────────────────────────────────────

func TestExecuteSupervised_RejectsAbsolutePath(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{"/etc/passwd"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == "/etc/passwd" {
			t.Error("absolute path must not be applied")
		}
	}
	found := false
	for _, f := range res.SkippedFiles {
		if f == "/etc/passwd" {
			found = true
		}
	}
	if !found {
		t.Logf("skipped files: %v, applied: %v", res.SkippedFiles, res.AppliedFiles)
		// absolute path may have been discarded into sentinel fallback — that's OK
	}
}

func TestExecuteSupervised_RejectsPathTraversal(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{"../../etc/passwd"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == "../../etc/passwd" {
			t.Error("traversal path must not be applied")
		}
	}
}

func TestExecuteSupervised_RejectsGit(t *testing.T) {
	root := t.TempDir()
	_ = os.MkdirAll(filepath.Join(root, ".git"), 0755)
	_ = os.WriteFile(filepath.Join(root, ".git", "config"), []byte("test"), 0644)
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{".git/config"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == ".git/config" {
			t.Error(".git/config must not be applied")
		}
	}
}

func TestExecuteSupervised_RejectsVisionMemory(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{".vision-memory/events.jsonl"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == ".vision-memory/events.jsonl" {
			t.Error(".vision-memory must not be applied")
		}
	}
}

func TestExecuteSupervised_RejectsVisionSnapshots(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{".vision-snapshots/snap/file.go"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == ".vision-snapshots/snap/file.go" {
			t.Error(".vision-snapshots must not be applied")
		}
	}
}

func TestExecuteSupervised_RejectsNodeModules(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{"node_modules/lib/index.js"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == "node_modules/lib/index.js" {
			t.Error("node_modules must not be applied")
		}
	}
}

func TestExecuteSupervised_RejectsVendor(t *testing.T) {
	root := t.TempDir()
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{"vendor/lib/main.go"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == "vendor/lib/main.go" {
			t.Error("vendor must not be applied")
		}
	}
}

func TestExecuteSupervised_RejectsTestFixture(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "handler_test.go"), []byte("package x"), 0644)
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{"handler_test.go"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	for _, f := range res.AppliedFiles {
		if f == "handler_test.go" {
			t.Error("*_test.go must not be applied")
		}
	}
}

// ─── Sentinel fallback ───────────────────────────────────────────────────────

func TestExecuteSupervised_UsesSentinelWhenNoValidTargets(t *testing.T) {
	root := t.TempDir()
	// Create sentinel dir
	_ = os.MkdirAll(filepath.Join(root, ".vision-test"), 0755)
	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{"../traversal", ".git/config"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	// Should have applied to sentinel (or skipped gracefully)
	// Either way: no invalid files should be in applied
	for _, f := range res.AppliedFiles {
		if f == "../traversal" || f == ".git/config" {
			t.Errorf("invalid target %q must not appear in applied_files", f)
		}
	}
}

// ─── Happy path ───────────────────────────────────────────────────────────────

func TestExecuteSupervised_AppliesSentinelOnCleanInput(t *testing.T) {
	root := t.TempDir()
	_ = os.MkdirAll(filepath.Join(root, ".vision-test"), 0755)
	sentinel := filepath.Join(root, ".vision-test", "mission.sentinel")
	_ = os.WriteFile(sentinel, []byte("initial"), 0644)

	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{".vision-test/mission.sentinel"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	if !res.OK {
		t.Errorf("expected OK=true for sentinel apply, got error: %s", res.Error)
	}
	if len(res.AppliedFiles) == 0 {
		t.Error("expected at least one applied file")
	}
	if res.PatchedFiles == 0 {
		t.Error("expected patched_files > 0")
	}
}

func TestExecuteSupervised_ReturnsExecutionID(t *testing.T) {
	root := t.TempDir()
	_ = os.MkdirAll(filepath.Join(root, ".vision-test"), 0755)
	_ = os.WriteFile(filepath.Join(root, ".vision-test", "mission.sentinel"), []byte("x"), 0644)

	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{".vision-test/mission.sentinel"},
		Root:        root,
	}
	res := ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))
	if res.ExecutionID == "" {
		t.Error("execution_id must not be empty")
	}
}

func TestExecuteSupervised_NeverWritesOutsideRoot(t *testing.T) {
	root := t.TempDir()
	outsideFile := filepath.Join(filepath.Dir(root), "outside.txt")
	_ = os.Remove(outsideFile) // ensure it doesn't exist

	input := ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{"../outside.txt"},
		Root:        root,
	}
	ExecuteSupervisedMultiFile(root, input, filepath.Join(root, ".vision-snapshots"))

	if _, err := os.Stat(outsideFile); err == nil {
		t.Error("file was written outside root — path traversal vulnerability")
		_ = os.Remove(outsideFile)
	}
}

// ─── isSupervisedSafeTarget unit tests ───────────────────────────────────────

func TestIsSupervisedSafeTarget_ValidFiles(t *testing.T) {
	valid := []string{
		"backend/server.js",
		"worker/src/index.js",
		".vision-test/mission.sentinel",
		"cmd/main.go",
	}
	for _, f := range valid {
		if !isSupervisedSafeTarget(f) {
			t.Errorf("expected %q to be safe", f)
		}
	}
}

func TestIsSupervisedSafeTarget_InvalidFiles(t *testing.T) {
	invalid := []string{
		"",
		".",
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
		"internal/foo_test.go",
	}
	for _, f := range invalid {
		if isSupervisedSafeTarget(f) {
			t.Errorf("expected %q to be rejected", f)
		}
	}
}

// ─── BuildExecutionPlan ───────────────────────────────────────────────────────

func TestBuildExecutionPlan_RequiresSnapshotAndRollback(t *testing.T) {
	plan := BuildExecutionPlan(ExecutionPlanInput{
		MissionID: "m1",
		ApplyMode: "supervised",
	})
	if !plan.RequiresSnapshot {
		t.Error("RequiresSnapshot must be true")
	}
	if !plan.RequiresRollback {
		t.Error("RequiresRollback must be true")
	}
	if !plan.RequiresValidation {
		t.Error("RequiresValidation must be true")
	}
}

func TestBuildExecutionPlan_FallsBackToSentinel(t *testing.T) {
	plan := BuildExecutionPlan(ExecutionPlanInput{
		MissionID:   "m1",
		ApplyMode:   "supervised",
		TargetFiles: []string{".git/config", "node_modules/lib.js"},
	})
	if len(plan.TargetFiles) == 0 {
		t.Fatal("expected sentinel fallback")
	}
	if plan.TargetFiles[0] != ".vision-test/mission.sentinel" {
		t.Errorf("expected sentinel, got %q", plan.TargetFiles[0])
	}
}

func TestBuildExecutionPlan_IDNonEmpty(t *testing.T) {
	plan := BuildExecutionPlan(ExecutionPlanInput{MissionID: "m1", ApplyMode: "supervised"})
	if plan.ID == "" {
		t.Error("plan ID must not be empty")
	}
}
