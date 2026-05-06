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
