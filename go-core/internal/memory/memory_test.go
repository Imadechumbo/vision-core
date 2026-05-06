package memory

import (
	"os"
	"path/filepath"
	"testing"
)

type missionLike struct {
	PassSecure            bool
	PassGold              bool
	DeployAllowed         bool
	PromotionAllowed      bool
	SecurityBlockingTotal int
	RollbackApplied       bool
}

func TestEnsureStoreCreatesMemoryDir(t *testing.T) {
	root := t.TempDir()
	if err := EnsureStore(root); err != nil {
		t.Fatalf("EnsureStore returned error: %v", err)
	}
	info, err := os.Stat(filepath.Join(root, StoreDirName))
	if err != nil {
		t.Fatalf("expected memory dir: %v", err)
	}
	if !info.IsDir() {
		t.Fatal("memory path must be a directory")
	}
}

func TestAppendAndListRemediationEvents(t *testing.T) {
	root := t.TempDir()
	event := RemediationEvent{
		ID:                 "mem_test_1",
		Timestamp:          "2026-05-06T00:00:00Z",
		MissionID:          "mission_test",
		TransactionID:      "tx_test",
		SnapshotID:         "snap_test",
		Engine:             "go-safe-core",
		Version:            "5.6.0-go-safe-core",
		IssueType:          "cors_blocked",
		Confidence:         0.91,
		Severity:           "HIGH",
		SecurityScoreAfter: 100,
		BlockingAfter:      0,
		RuleIDs:            []string{"aegis.cors.origin"},
		Files:              []string{"backend/server.go"},
		PatchedFiles:       1,
		TotalFiles:         1,
		PassSecure:         true,
		PassGold:           true,
		DeployAllowed:      true,
		PromotionAllowed:   true,
		RollbackReady:      true,
		Outcome:            "gold",
	}
	if err := AppendRemediationEvent(root, event); err != nil {
		t.Fatalf("AppendRemediationEvent returned error: %v", err)
	}
	events, err := ListRemediationEvents(root)
	if err != nil {
		t.Fatalf("ListRemediationEvents returned error: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].ID != event.ID || events[0].Outcome != "gold" {
		t.Fatalf("unexpected event: %+v", events[0])
	}
}

func TestShouldLearnFromMissionTrueForGoldSecure(t *testing.T) {
	out := missionLike{PassSecure: true, PassGold: true, DeployAllowed: true, PromotionAllowed: true, SecurityBlockingTotal: 0}
	if !ShouldLearnFromMission(out) {
		t.Fatal("expected learning for PASS GOLD + PASS SECURE with no blockers")
	}
}

func TestShouldLearnFromMissionFalseCases(t *testing.T) {
	base := missionLike{PassSecure: true, PassGold: true, DeployAllowed: true, PromotionAllowed: true, SecurityBlockingTotal: 0}
	cases := map[string]missionLike{
		"pass_secure_false":           func() missionLike { v := base; v.PassSecure = false; return v }(),
		"pass_gold_false":             func() missionLike { v := base; v.PassGold = false; return v }(),
		"rollback_applied_true":       func() missionLike { v := base; v.RollbackApplied = true; return v }(),
		"security_blocking_total_gt0": func() missionLike { v := base; v.SecurityBlockingTotal = 1; return v }(),
		"deploy_allowed_false":        func() missionLike { v := base; v.DeployAllowed = false; return v }(),
		"promotion_allowed_false":     func() missionLike { v := base; v.PromotionAllowed = false; return v }(),
	}
	for name, out := range cases {
		t.Run(name, func(t *testing.T) {
			if ShouldLearnFromMission(out) {
				t.Fatal("expected no learning")
			}
		})
	}
}

// ═══════════════════════════════════════════════════════
// V6.3 REMEDIATION MEMORY BEFORE/AFTER TRACE TESTS
// ═══════════════════════════════════════════════════════

func TestRemediationEvent_AcceptsBeforeAfterFields(t *testing.T) {
	root := t.TempDir()
	event := RemediationEvent{
		ID:                  "mem_v63_001",
		Timestamp:           "2026-05-06T00:00:00Z",
		MissionID:           "mission_v63",
		Outcome:             "gold",
		PassSecure:          true,
		PassGold:            true,
		SecurityScoreBefore: 60,
		SecurityScoreAfter:  100,
		BlockingBefore:      2,
		BlockingAfter:       0,
		RuleIDsBefore:       []string{"AEGIS_API_004", "AEGIS_SECRET_001"},
		RuleIDsAfter:        []string{},
		FixedRuleIDs:        []string{"AEGIS_API_004", "AEGIS_SECRET_001"},
		FilesBefore:         []string{"backend/server.js"},
		FilesAfter:          []string{},
		FixedFiles:          []string{"backend/server.js"},
		PatchSummary:        "patched 1/1 files via transaction tx_abc",
		ChangedFiles:        []string{"backend/server.js"},
		DiffAvailable:       false,
	}
	if err := AppendRemediationEvent(root, event); err != nil {
		t.Fatalf("AppendRemediationEvent: %v", err)
	}
	events, err := ListRemediationEvents(root)
	if err != nil {
		t.Fatalf("ListRemediationEvents: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	e := events[0]
	if e.SecurityScoreBefore != 60 {
		t.Errorf("security_score_before=%d, want 60", e.SecurityScoreBefore)
	}
	if e.SecurityScoreAfter != 100 {
		t.Errorf("security_score_after=%d, want 100", e.SecurityScoreAfter)
	}
	if e.BlockingBefore != 2 {
		t.Errorf("blocking_before=%d, want 2", e.BlockingBefore)
	}
	if e.BlockingAfter != 0 {
		t.Errorf("blocking_after=%d, want 0", e.BlockingAfter)
	}
	if len(e.FixedRuleIDs) != 2 {
		t.Errorf("fixed_rule_ids=%v, want 2 entries", e.FixedRuleIDs)
	}
	if len(e.FixedFiles) != 1 {
		t.Errorf("fixed_files=%v, want 1 entry", e.FixedFiles)
	}
	if e.PatchSummary == "" {
		t.Error("patch_summary must not be empty")
	}
	if e.DiffAvailable {
		t.Error("diff_available must be false in V6.3")
	}
}

func TestRemediationEvent_FixedRuleIDsPersistedInJSONL(t *testing.T) {
	root := t.TempDir()
	event := RemediationEvent{
		ID:           "mem_v63_002",
		Timestamp:    "2026-05-06T00:00:00Z",
		Outcome:      "gold",
		PassGold:     true,
		PassSecure:   true,
		FixedRuleIDs: []string{"AEGIS_API_001", "AEGIS_API_004"},
		FixedFiles:   []string{"server.js"},
	}
	_ = AppendRemediationEvent(root, event)
	events, _ := ListRemediationEvents(root)
	if len(events) != 1 {
		t.Fatalf("expected 1 event")
	}
	if len(events[0].FixedRuleIDs) != 2 {
		t.Errorf("fixed_rule_ids not persisted: %v", events[0].FixedRuleIDs)
	}
	if len(events[0].FixedFiles) != 1 {
		t.Errorf("fixed_files not persisted: %v", events[0].FixedFiles)
	}
}

func TestRemediationEvent_BackwardCompatibility(t *testing.T) {
	// Evento antigo (V6.2) sem campos V6.3 deve ser lido sem erro.
	root := t.TempDir()
	old := RemediationEvent{
		ID:                 "mem_v62_compat",
		Timestamp:          "2026-05-06T00:00:00Z",
		Outcome:            "gold",
		PassGold:           true,
		PassSecure:         true,
		SecurityScoreAfter: 100,
		BlockingAfter:      0,
		RuleIDs:            []string{"aegis.cors"},
		Files:              []string{"server.js"},
	}
	_ = AppendRemediationEvent(root, old)
	events, err := ListRemediationEvents(root)
	if err != nil {
		t.Fatalf("backward compat read failed: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event")
	}
	// V6.3 fields should be zero-value but not cause errors
	if events[0].BlockingBefore != 0 {
		t.Errorf("expected blocking_before=0 for old event, got %d", events[0].BlockingBefore)
	}
	if events[0].FixedRuleIDs != nil && len(events[0].FixedRuleIDs) != 0 {
		t.Errorf("expected empty fixed_rule_ids for old event")
	}
}

// ─── DiffStringSlices tests ───────────────────────────────────────────────────

func TestDiffStringSlices_Basic(t *testing.T) {
	before := []string{"A", "B", "C"}
	after := []string{"B"}
	diff := DiffStringSlices(before, after)
	if len(diff) != 2 {
		t.Fatalf("expected 2 fixed, got %v", diff)
	}
	if diff[0] != "A" || diff[1] != "C" {
		t.Errorf("unexpected diff: %v", diff)
	}
}

func TestDiffStringSlices_EmptyAfter(t *testing.T) {
	before := []string{"X", "Y"}
	diff := DiffStringSlices(before, []string{})
	if len(diff) != 2 {
		t.Errorf("expected 2 when after is empty, got %v", diff)
	}
}

func TestDiffStringSlices_EmptyBefore(t *testing.T) {
	diff := DiffStringSlices([]string{}, []string{"X"})
	if len(diff) != 0 {
		t.Errorf("expected empty when before is empty, got %v", diff)
	}
}

func TestDiffStringSlices_AllFixed(t *testing.T) {
	before := []string{"A", "B"}
	diff := DiffStringSlices(before, []string{})
	if len(diff) != 2 {
		t.Errorf("expected all 2 fixed, got %v", diff)
	}
}

func TestDiffStringSlices_NoneFixed(t *testing.T) {
	before := []string{"A", "B"}
	after := []string{"A", "B", "C"}
	diff := DiffStringSlices(before, after)
	if len(diff) != 0 {
		t.Errorf("expected 0 fixed, got %v", diff)
	}
}

func TestDiffStringSlices_NoDuplicates(t *testing.T) {
	before := []string{"A", "A", "B"}
	after := []string{"B"}
	diff := DiffStringSlices(before, after)
	if len(diff) != 1 || diff[0] != "A" {
		t.Errorf("expected deduplicated result [A], got %v", diff)
	}
}

func TestDeduplicateStrings(t *testing.T) {
	ss := []string{"a", "b", "a", "", "c", "b"}
	result := DeduplicateStrings(ss)
	if len(result) != 3 {
		t.Errorf("expected 3 unique non-empty, got %v", result)
	}
}
