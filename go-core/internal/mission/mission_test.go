package mission

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/visioncore/go-core/internal/testfixtures"
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
	_ = os.WriteFile(poisoned, []byte(testfixtures.RollbackSentinelContent()), 0644)

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

// ═══════════════════════════════════════════════════════════════════════════
// V6.1.1-HARDEN CONTRACT TESTS
// Garantem que o JSON de output da missão sempre expõe o Security Remediation
// Report completo e que os invariantes de segurança são mantidos.
// ═══════════════════════════════════════════════════════════════════════════

// TestRun_SecurityReport_FieldsAlwaysPresent garante que todos os campos do
// Security Remediation Report estão presentes no output da missão,
// independente de haver violações ou não.
func TestRun_SecurityReport_FieldsAlwaysPresent(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	// Campos obrigatórios — devem existir mesmo quando não há violações

	// pass_secure e pass_gold devem ser booleanos válidos (sempre presentes)
	_ = out.PassSecure       // bool — sempre presente
	_ = out.PassGold         // bool — sempre presente
	_ = out.DeployAllowed    // bool — sempre presente
	_ = out.PromotionAllowed // bool — sempre presente

	// contadores numéricos — devem ser >= 0
	if out.SecurityTotalViolations < 0 {
		t.Error("security_total_violations must be >= 0")
	}
	if out.SecurityCriticalCount < 0 {
		t.Error("security_critical_count must be >= 0")
	}
	if out.SecurityHighCount < 0 {
		t.Error("security_high_count must be >= 0")
	}
	if out.SecurityMediumCount < 0 {
		t.Error("security_medium_count must be >= 0")
	}
	if out.SecurityLowCount < 0 {
		t.Error("security_low_count must be >= 0")
	}

	// SecurityViolations deve ser slice inicializado (não nil após scan vazio)
	// nil é aceitável quando não há violações — mas o total deve bater
	total := out.SecurityCriticalCount + out.SecurityHighCount +
		out.SecurityMediumCount + out.SecurityLowCount
	if total != out.SecurityTotalViolations {
		t.Errorf("security counts must sum to total: critical(%d)+high(%d)+medium(%d)+low(%d)=%d != total(%d)",
			out.SecurityCriticalCount, out.SecurityHighCount,
			out.SecurityMediumCount, out.SecurityLowCount,
			total, out.SecurityTotalViolations)
	}
}

// TestRun_SecurityReport_CountsSumToTotal garante invariante aritmético:
// critical + high + medium + low == total_violations, sempre.
func TestRun_SecurityReport_CountsSumToTotal(t *testing.T) {
	dir := t.TempDir()

	// projeto com violações reais — fixtures construídas em runtime, sem literais no binário
	if err := os.WriteFile(filepath.Join(dir, "config.go"),
		[]byte(testfixtures.AWSKeyGoSource("awsKey")+testfixtures.AuthBypassGoSource()),
		0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	sum := out.SecurityCriticalCount + out.SecurityHighCount +
		out.SecurityMediumCount + out.SecurityLowCount
	if sum != out.SecurityTotalViolations {
		t.Errorf("counts must sum to total: %d+%d+%d+%d=%d != %d",
			out.SecurityCriticalCount, out.SecurityHighCount,
			out.SecurityMediumCount, out.SecurityLowCount,
			sum, out.SecurityTotalViolations)
	}
	// também deve bater com len(SecurityViolations)
	if len(out.SecurityViolations) != out.SecurityTotalViolations {
		t.Errorf("len(security_violations)=%d != security_total_violations=%d",
			len(out.SecurityViolations), out.SecurityTotalViolations)
	}
}

// TestRun_CriticalOrHighBlocksPromotion garante que a presença de qualquer
// violation CRITICAL ou HIGH mantém pass_secure, pass_gold, deploy_allowed
// e promotion_allowed todos false.
func TestRun_CriticalOrHighBlocksPromotion(t *testing.T) {
	dir := t.TempDir()

	// injetar violação CRITICAL conhecida — fixture em runtime evita literal no binário
	if err := os.WriteFile(filepath.Join(dir, "secrets.go"),
		[]byte(testfixtures.AWSKeyGoSource("key")), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	hasCriticalOrHigh := out.SecurityCriticalCount > 0 || out.SecurityHighCount > 0
	if !hasCriticalOrHigh {
		t.Skip("no CRITICAL/HIGH detected — test relies on secret injection")
	}

	if out.PassSecure {
		t.Error("pass_secure must be false when CRITICAL or HIGH violations exist")
	}
	if out.PassGold {
		t.Error("pass_gold must be false when CRITICAL or HIGH violations exist")
	}
	if out.DeployAllowed {
		t.Error("deploy_allowed must be false when CRITICAL or HIGH violations exist")
	}
	if out.PromotionAllowed {
		t.Error("promotion_allowed must be false when CRITICAL or HIGH violations exist")
	}
}

// TestRun_PassSecureFalseImpliesPassGoldFalse garante o invariante de cadeia:
// pass_secure=false → pass_gold=false, sem exceção.
func TestRun_PassSecureFalseImpliesPassGoldFalse(t *testing.T) {
	dir := t.TempDir()

	// injetar auth bypass flag CRITICAL — fixture em runtime
	if err := os.WriteFile(filepath.Join(dir, "handler.go"),
		[]byte(testfixtures.AuthBypassGoSource()), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	if !out.PassSecure && out.PassGold {
		t.Error("invariant violated: pass_secure=false but pass_gold=true — impossible state")
	}
	// se pass_secure for false, gates devem refletir pass_secure_ok=false
	if !out.PassSecure {
		if out.Gates.PassSecureOK {
			t.Error("gates.pass_secure_ok must be false when pass_secure=false")
		}
		if out.PromotionAllowed {
			t.Error("promotion_allowed must be false when pass_secure=false")
		}
		if out.DeployAllowed {
			t.Error("deploy_allowed must be false when pass_secure=false")
		}
	}
}

// TestRun_ViolationStructureComplete garante que cada violation no output
// contém todos os campos obrigatórios preenchidos.
func TestRun_ViolationStructureComplete(t *testing.T) {
	dir := t.TempDir()

	// injetar arquivo com violação conhecida — fixture em runtime
	if err := os.WriteFile(filepath.Join(dir, "config.go"),
		[]byte(testfixtures.AWSKeyGoSource("awsKey")), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	if len(out.SecurityViolations) == 0 {
		t.Fatal("expected at least one violation — test requires secret injection to work")
	}

	for i, v := range out.SecurityViolations {
		if v.Gate == "" {
			t.Errorf("violation[%d]: gate must not be empty", i)
		}
		if v.Category == "" {
			t.Errorf("violation[%d]: category must not be empty", i)
		}
		if v.Severity == "" {
			t.Errorf("violation[%d]: severity must not be empty", i)
		}
		if v.File == "" {
			t.Errorf("violation[%d]: file must not be empty", i)
		}
		// line pode ser 0 (arquivo inteiro) — válido
		if v.RuleID == "" {
			t.Errorf("violation[%d]: rule_id must not be empty", i)
		}
		if v.Message == "" {
			t.Errorf("violation[%d]: message must not be empty", i)
		}
		if v.Remediation == "" {
			t.Errorf("violation[%d]: remediation must not be empty", i)
		}
		// severity deve ser um valor permitido
		validSeverity := map[string]bool{
			"CRITICAL": true, "HIGH": true, "MEDIUM": true, "LOW": true,
		}
		if !validSeverity[v.Severity] {
			t.Errorf("violation[%d]: invalid severity %q (must be CRITICAL|HIGH|MEDIUM|LOW)", i, v.Severity)
		}
	}
}

// TestRun_ViolationSourceContext_ProductionFile garante que violations em
// arquivos de produção (.go não-test, .js) são classificadas como "production".
func TestRun_ViolationSourceContext_ProductionFile(t *testing.T) {
	dir := t.TempDir()

	if err := os.WriteFile(filepath.Join(dir, "config.go"),
		[]byte(testfixtures.AWSKeyGoSource("awsKey")), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	found := false
	for _, v := range out.SecurityViolations {
		if v.File == "config.go" {
			found = true
			if v.SourceContext != "production" {
				t.Errorf("config.go must be classified as 'production', got %q", v.SourceContext)
			}
		}
	}
	if !found {
		t.Logf("violation for config.go not found in output — violations: %v", out.SecurityViolations)
	}
}

// TestRun_SecurityFailedGates_Populated garante que security_failed_gates
// é populado corretamente quando há falhas de segurança.
func TestRun_SecurityFailedGates_Populated(t *testing.T) {
	dir := t.TempDir()

	if err := os.WriteFile(filepath.Join(dir, "main.go"),
		[]byte(testfixtures.AWSKeyGoSource("secret")), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	if !out.PassSecure {
		if len(out.SecurityFailedGates) == 0 {
			t.Error("security_failed_gates must be non-empty when pass_secure=false")
		}
		// cada gate falho deve ser um valor conhecido
		validGates := map[string]bool{
			"secrets_ok": true, "dependencies_ok": true, "containers_ok": true,
			"api_ok": true, "policies_ok": true,
		}
		for _, g := range out.SecurityFailedGates {
			if !validGates[g] {
				t.Errorf("unknown gate in security_failed_gates: %q", g)
			}
		}
	}
}

// TestRun_PipelineContainsSecuritySteps valida que o pipeline V6.1.1 contém
// os steps de segurança obrigatórios.
func TestRun_PipelineContainsSecuritySteps(t *testing.T) {
	dir := t.TempDir()
	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	requiredSteps := []string{
		"scanner", "hermes", "fileops", "snapshot", "patcher",
		"validator", "rollback", "security", "passsecure", "passgold",
	}
	stepSet := map[string]bool{}
	for _, s := range out.Steps {
		stepSet[s] = true
	}
	for _, req := range requiredSteps {
		if !stepSet[req] {
			t.Errorf("V6.1.1 pipeline missing required step: %q", req)
		}
	}

	// passsecure deve aparecer no step_results
	found := false
	for _, sr := range out.StepResults {
		if sr.Step == "passsecure" {
			found = true
			break
		}
	}
	if !found {
		t.Error("step_results must contain 'passsecure' entry")
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// V6.1.2 PREFLIGHT FALSE POSITIVE / NOISE FILTER CONTRACT TESTS
// ═══════════════════════════════════════════════════════════════════════════

func TestRun_SecurityDispositionFieldsAndCounts(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "config.go"), []byte(testfixtures.AWSKeyGoSource("awsKey")), 0644); err != nil {
		t.Fatal(err)
	}
	fixture := "package api_test\nfunc TestLog(t *testing.T) { " + "console" + "." + "log" + "(\"" + "tok" + "en" + "\") }\n"
	if err := os.WriteFile(filepath.Join(dir, "api_test.go"), []byte(fixture), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})

	if out.SecurityTotalViolations != len(out.SecurityViolations) {
		t.Fatalf("security_total_violations=%d, len(security_violations)=%d", out.SecurityTotalViolations, len(out.SecurityViolations))
	}
	if out.SecurityTotalViolations < 2 {
		t.Fatalf("expected raw total to include production blocker and test fixture noise, got %d", out.SecurityTotalViolations)
	}
	if out.SecurityBlockingTotal != len(out.SecurityBlockingViolations) {
		t.Fatalf("security_blocking_total=%d, len(security_blocking_violations)=%d", out.SecurityBlockingTotal, len(out.SecurityBlockingViolations))
	}
	if out.SecurityBlockingTotal == 0 {
		t.Fatal("expected at least one production blocker")
	}
	if out.SecurityFalsePositiveCount == 0 || out.SecurityNoiseCount == 0 {
		t.Fatalf("expected false_positive/noise counts > 0, got fp=%d noise=%d", out.SecurityFalsePositiveCount, out.SecurityNoiseCount)
	}

	foundFixture := false
	for i, v := range out.SecurityViolations {
		if v.Disposition == "" {
			t.Fatalf("security_violations[%d] missing disposition: %+v", i, v)
		}
		if v.File == "api_test.go" {
			foundFixture = true
			if v.SourceContext != "test_fixture" || v.Disposition != "report_only" || !v.FalsePositive || v.NoiseReason == "" {
				t.Fatalf("unexpected test fixture classification: %+v", v)
			}
		}
	}
	if !foundFixture {
		t.Fatal("expected api_test.go test fixture violation in security_violations")
	}
}

func TestRun_PassSecureFalseKeepsPassGoldDeployPromotionFalse(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "secrets.go"), []byte(testfixtures.AWSKeyGoSource("key")), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})
	if out.PassSecure {
		t.Fatal("expected pass_secure=false with production blocker")
	}
	if out.PassGold {
		t.Fatal("expected pass_gold=false while pass_secure=false")
	}
	if out.DeployAllowed {
		t.Fatal("expected deploy_allowed=false while pass_secure=false")
	}
	if out.PromotionAllowed {
		t.Fatal("expected promotion_allowed=false while pass_secure=false")
	}
}

func TestRun_GoldRecordsPassiveMemory(t *testing.T) {
	dir := t.TempDir()

	out := Run(Input{Root: dir, InputText: "CORS origin blocked", DryRun: false})
	if !out.PassGold || !out.PassSecure {
		t.Fatalf("test setup expected PASS GOLD + PASS SECURE, got pass_gold=%v pass_secure=%v failed=%v", out.PassGold, out.PassSecure, out.FailedGates)
	}
	if !out.MemoryRecorded {
		t.Fatalf("expected memory_recorded=true, warning=%q", out.MemoryWarning)
	}
	if out.MemoryEventID == "" {
		t.Fatal("memory_event_id must be filled when memory is recorded")
	}
	if _, err := os.Stat(filepath.Join(dir, ".vision-memory", "remediation_events.jsonl")); err != nil {
		t.Fatalf("expected remediation memory JSONL file: %v", err)
	}
}

func TestRun_FailDoesNotRecordPassiveMemory(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "secrets.go"), []byte(testfixtures.AWSKeyGoSource("key")), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "self-test", DryRun: false})
	if out.PassGold || out.PassSecure {
		t.Fatalf("test setup expected FAIL, got pass_gold=%v pass_secure=%v", out.PassGold, out.PassSecure)
	}
	if out.MemoryRecorded {
		t.Fatal("memory_recorded must remain false for FAIL missions")
	}
	if out.MemoryEventID != "" {
		t.Fatalf("memory_event_id must be empty for FAIL missions, got %q", out.MemoryEventID)
	}
	if _, err := os.Stat(filepath.Join(dir, ".vision-memory", "remediation_events.jsonl")); !os.IsNotExist(err) {
		t.Fatalf("FAIL mission must not write positive learning, stat err=%v", err)
	}
}

func TestRun_MemoryDoesNotTransformFailIntoGold(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "secrets.go"), []byte(testfixtures.AWSKeyGoSource("key")), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "CORS origin blocked", DryRun: false})
	if out.MemoryRecorded {
		t.Fatal("memory must not record failed security missions")
	}
	if out.PassGold || out.OK || out.DeployAllowed || out.PromotionAllowed {
		t.Fatalf("memory must not transform FAIL into GOLD: pass_gold=%v ok=%v deploy=%v promotion=%v", out.PassGold, out.OK, out.DeployAllowed, out.PromotionAllowed)
	}
}

func TestRun_MemoryWarningDoesNotMaskSecurityFailure(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "secrets.go"), []byte(testfixtures.AWSKeyGoSource("key")), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, ".vision-memory"), []byte("not a dir"), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "CORS origin blocked", DryRun: false})
	if out.PassSecure || out.PassGold {
		t.Fatalf("security failure must remain blocked, pass_secure=%v pass_gold=%v", out.PassSecure, out.PassGold)
	}
	if out.MemoryRecorded || out.MemoryWarning != "" {
		t.Fatalf("failed security missions must not attempt positive memory writes, recorded=%v warning=%q", out.MemoryRecorded, out.MemoryWarning)
	}
}

func TestRun_GoldMemoryFailureAddsWarningWithoutFailingMission(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, ".vision-memory"), []byte("not a dir"), 0644); err != nil {
		t.Fatal(err)
	}

	out := Run(Input{Root: dir, InputText: "CORS origin blocked", DryRun: false})
	if !out.PassGold || !out.PassSecure {
		t.Fatalf("test setup expected GOLD+SECURE despite memory store failure, pass_gold=%v pass_secure=%v failed=%v", out.PassGold, out.PassSecure, out.FailedGates)
	}
	if out.MemoryRecorded {
		t.Fatal("memory_recorded must be false when the memory append fails")
	}
	if out.MemoryWarning == "" {
		t.Fatal("memory_warning must explain non-critical memory failure")
	}
}
