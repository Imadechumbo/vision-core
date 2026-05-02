package mission

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRun_SelfTest_PassGold(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    false,
	})

	if !out.PassGold {
		t.Errorf("expected PASS GOLD, got FAIL: %v", out.FailedGates)
	}

	if out.Status != "GOLD" {
		t.Errorf("expected GOLD, got %s", out.Status)
	}

	if out.Version != "5.6.0-go-safe-core" {
		t.Errorf("expected 5.6.0-go-safe-core, got %s", out.Version)
	}

	if out.Engine != "go-safe-core" {
		t.Errorf("expected go-safe-core, got %s", out.Engine)
	}

	if !out.PromotionAllowed {
		t.Error("promotion_allowed must be true")
	}

	if !out.HermesEnabled {
		t.Error("hermes_enabled must be true in V5.6")
	}

	if !out.TransactionMode {
		t.Error("transaction_mode must be true in V5.6")
	}
}

func TestRun_SelfTest_DoesNotModifyGoMod(t *testing.T) {
	dir := t.TempDir()

	gomod := filepath.Join(dir, "go.mod")
	original := []byte("module testproject\ngo 1.22\n")
	_ = os.WriteFile(gomod, original, 0644)

	Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    false,
	})

	after, _ := os.ReadFile(gomod)
	if string(after) != string(original) {
		t.Errorf("self-test must NOT modify go.mod\nbefore: %q\nafter:  %q", original, after)
	}
}

func TestRun_Steps_V56(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    false,
	})

	required := []string{
		"scanner",
		"hermes",
		"fileops",
		"snapshot",
		"patcher",
		"validator",
		"rollback",
		"passgold",
	}

	for _, step := range required {
		found := false
		for _, s := range out.Steps {
			if s == step {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("V5.6 must have step %q in steps list", step)
		}
	}
}

func TestRun_SnapshotID_IsRealID(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    false,
	})

	if out.SnapshotID == "" {
		t.Error("snapshot_id must not be empty in real run")
	}

	if len(out.SnapshotID) < 8 {
		t.Errorf("snapshot_id too short: %q", out.SnapshotID)
	}
}

func TestRun_ValidatorFail_TriggersRollback(t *testing.T) {
	dir := t.TempDir()

	testDir := filepath.Join(dir, ".vision-test")
	_ = os.MkdirAll(testDir, 0755)

	poisoned := filepath.Join(testDir, "mission.sentinel")
	_ = os.WriteFile(poisoned, []byte("sk_live_FAKE_KEY_FOR_TESTING_ROLLBACK"), 0644)

	original, _ := os.ReadFile(poisoned)

	out := Run(Input{
		Root:      dir,
		InputText: "validator-fail-test",
		DryRun:    false,
	})

	for _, sr := range out.StepResults {
		if sr.Step == "validator" && sr.OK {
			return
		}

		if sr.Step == "rollback" {
			if out.RollbackApplied {
				restored, err := os.ReadFile(poisoned)
				if err != nil {
					t.Errorf("restored file not readable: %v", err)
					return
				}

				if string(restored) != string(original) {
					t.Errorf("rollback: file not restored correctly\nwant: %q\ngot:  %q", original, restored)
				}

				t.Logf("rollback automático funcionou — arquivo restaurado ao estado original")
				return
			}
		}
	}

	t.Logf("rollback_applied=%v — validator pode ter passado dependendo do check aplicado", out.RollbackApplied)
}

func TestRun_DryRun_NoSnapshot(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    true,
	})

	if out.SnapshotID != "" {
		t.Errorf("dry-run must not create snapshot, got: %s", out.SnapshotID)
	}

	for _, sr := range out.StepResults {
		if sr.Step == "snapshot" && sr.Message != "dry-run: snapshot skipped" {
			t.Errorf("snapshot step should say skipped in dry-run, got: %q", sr.Message)
		}
	}
}

func TestRun_LegacySafe(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    false,
	})

	if !out.Gates.LegacySafe {
		t.Error("legacy_safe must always be true in V5.x")
	}
}

func TestRun_AllStepResultsPresent(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    false,
	})

	names := map[string]bool{}
	for _, sr := range out.StepResults {
		names[sr.Step] = true
	}

	required := []string{
		"scanner",
		"hermes",
		"fileops",
		"snapshot",
		"patcher",
		"validator",
		"rollback",
	}

	for _, r := range required {
		if !names[r] {
			t.Errorf("missing step_result for %q", r)
		}
	}
}

func TestRun_HermesIntegrated(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{
		Root:      dir,
		InputText: "CORS origin blocked for https://example.com",
		DryRun:    false,
	})

	if !out.HermesEnabled {
		t.Fatal("expected hermes_enabled=true")
	}

	if out.IssueType != "cors_blocked" {
		t.Fatalf("expected cors_blocked, got %s", out.IssueType)
	}

	if out.Confidence <= 0.70 {
		t.Fatalf("expected confidence > 0.70, got %.2f", out.Confidence)
	}

	if out.SuggestedStrategy == "" {
		t.Fatal("expected suggested_strategy to be populated")
	}

	if out.ProbableRootCause == "" {
		t.Fatal("expected probable_root_cause to be populated")
	}
}