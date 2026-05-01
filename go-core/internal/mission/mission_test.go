package mission

import (
	"os"
	"testing"
)

func TestRun_SelfTest(t *testing.T) {
	dir := t.TempDir()
	// Criar go.mod mínimo para o scanner detectar stack
	_ = os.WriteFile(dir+"/go.mod", []byte("module test\ngo 1.22"), 0644)

	out := Run(Input{
		Root:      dir,
		InputText: "self-test",
		DryRun:    true,
	})

	if !out.PassGold {
		t.Errorf("expected PASS GOLD, got FAIL. failed gates: %v", out.FailedGates)
	}
	if out.Status != "GOLD" {
		t.Errorf("expected status GOLD, got %s", out.Status)
	}
	if !out.PromotionAllowed {
		t.Error("expected promotion_allowed=true")
	}
	if out.Engine != "go-safe-core" {
		t.Errorf("expected engine go-safe-core, got %s", out.Engine)
	}
	if out.Version != "5.0.0-go-safe-core" {
		t.Errorf("expected version 5.0.0-go-safe-core, got %s", out.Version)
	}
	if out.MissionID == "" {
		t.Error("expected mission_id")
	}
	if len(out.Steps) == 0 {
		t.Error("expected steps")
	}
}

func TestRun_InvalidRoot(t *testing.T) {
	out := Run(Input{
		Root:      "/nonexistent/path/xyz",
		InputText: "test",
	})
	// scanner vai falhar, portanto pass_gold=false
	if out.PassGold {
		t.Error("should not PASS GOLD with invalid root")
	}
	if out.Status != "FAIL" {
		t.Errorf("expected FAIL, got %s", out.Status)
	}
}

func TestRun_StepsPresent(t *testing.T) {
	dir := t.TempDir()
	out := Run(Input{Root: dir, InputText: "self-test"})
	expected := []string{"scanner", "fileops", "patcher", "validator", "passgold"}
	if len(out.Steps) != len(expected) {
		t.Errorf("expected %d steps, got %d", len(expected), len(out.Steps))
	}
}

func TestRun_LegacySafeAlways(t *testing.T) {
	dir := t.TempDir()
	out := Run(Input{Root: dir, InputText: "self-test"})
	if !out.Gates.LegacySafe {
		t.Error("legacy_safe must always be true in V5.0")
	}
}

func TestRun_OutputJSON_Fields(t *testing.T) {
	dir := t.TempDir()
	out := Run(Input{Root: dir, InputText: "self-test"})
	// Verificar campos obrigatórios do contrato
	if out.Engine == "" {
		t.Error("engine must not be empty")
	}
	if out.Version == "" {
		t.Error("version must not be empty")
	}
	if out.MissionID == "" {
		t.Error("mission_id must not be empty")
	}
	if out.DurationMs < 0 {
		t.Error("duration_ms must be >= 0")
	}
}
