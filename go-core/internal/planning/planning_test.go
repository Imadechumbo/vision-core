// internal/planning/planning_test.go
// VISION AEGIS CORE ENTERPRISE — V6.5 PLANNING TESTS
package planning

import (
	"testing"

	"github.com/visioncore/go-core/internal/memory"
)

func noSuggestion() memory.RemediationSuggestion {
	return memory.RemediationSuggestion{Available: false}
}

func goodSuggestion(confidence float64, eventID string) memory.RemediationSuggestion {
	return memory.RemediationSuggestion{
		Available:         true,
		Confidence:        confidence,
		BestEventID:       eventID,
		SuggestedStrategy: "patched via tx_" + eventID,
		PatchSummary:      "patched 1/1 files via transaction tx_" + eventID,
	}
}

// ─── Invariants ───────────────────────────────────────────────────────────────

func TestBuildPatchPlan_RequiresValidationAlwaysTrue(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{MissionID: "m1", MemorySuggestion: noSuggestion()})
	if !plan.RequiresValidation {
		t.Error("RequiresValidation must always be true")
	}
}

func TestBuildPatchPlan_RequiresRollbackAlwaysTrue(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{MissionID: "m1", MemorySuggestion: noSuggestion()})
	if !plan.RequiresRollback {
		t.Error("RequiresRollback must always be true")
	}
}

func TestBuildPatchPlan_ApplyModeNeverAutomatic(t *testing.T) {
	// Even with high-confidence memory suggestion, apply_mode must not be automatic
	plan := BuildPatchPlan(PlanInput{
		MissionID:        "m1",
		MemorySuggestion: goodSuggestion(0.99, "ev1"),
	})
	if plan.ApplyMode == "automatic" {
		t.Error("apply_mode must never be 'automatic' in V6.5")
	}
	if plan.ApplyMode != "supervised" {
		t.Errorf("apply_mode must be 'supervised', got %q", plan.ApplyMode)
	}
}

func TestBuildPatchPlan_IDNonEmpty(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{MissionID: "m1", MemorySuggestion: noSuggestion()})
	if plan.ID == "" {
		t.Error("plan ID must not be empty")
	}
}

// ─── Memory guidance ─────────────────────────────────────────────────────────

func TestBuildPatchPlan_MemoryGuidedTrue_WhenConfidenceGte60(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:        "m1",
		MemorySuggestion: goodSuggestion(0.60, "ev_high"),
	})
	if !plan.MemoryGuided {
		t.Error("expected MemoryGuided=true when confidence >= 0.60")
	}
	if plan.MemoryEventID != "ev_high" {
		t.Errorf("expected MemoryEventID=ev_high, got %q", plan.MemoryEventID)
	}
	if plan.MemoryConfidence != 0.60 {
		t.Errorf("expected MemoryConfidence=0.60, got %f", plan.MemoryConfidence)
	}
}

func TestBuildPatchPlan_MemoryGuidedFalse_WhenConfidenceLt60(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:        "m1",
		MemorySuggestion: goodSuggestion(0.59, "ev_low"),
	})
	if plan.MemoryGuided {
		t.Error("expected MemoryGuided=false when confidence < 0.60")
	}
}

func TestBuildPatchPlan_MemoryGuidedFalse_WhenNoSuggestion(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{MissionID: "m1", MemorySuggestion: noSuggestion()})
	if plan.MemoryGuided {
		t.Error("expected MemoryGuided=false with no memory suggestion")
	}
}

func TestBuildPatchPlan_MemoryGuidedUsesMemoryStrategy(t *testing.T) {
	sugg := goodSuggestion(0.80, "ev1")
	sugg.SuggestedStrategy = "memory_strategy_override"
	plan := BuildPatchPlan(PlanInput{
		MissionID:         "m1",
		SuggestedStrategy: "hermes_strategy",
		MemorySuggestion:  sugg,
	})
	if plan.MemoryGuided && plan.Strategy != "memory_strategy_override" {
		t.Errorf("memory-guided plan should use memory strategy, got %q", plan.Strategy)
	}
}

func TestBuildPatchPlan_WithoutMemory_UsesHermesStrategy(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:         "m1",
		SuggestedStrategy: "hermes_fix",
		MemorySuggestion:  noSuggestion(),
	})
	if plan.Strategy != "hermes_fix" {
		t.Errorf("expected hermes_fix strategy, got %q", plan.Strategy)
	}
}

// ─── Risk level ───────────────────────────────────────────────────────────────

func TestSeverityToRisk_Critical(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{Severity: "CRITICAL", MemorySuggestion: noSuggestion()})
	if plan.RiskLevel != "high" {
		t.Errorf("CRITICAL should map to high risk, got %q", plan.RiskLevel)
	}
}

func TestSeverityToRisk_High(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{Severity: "HIGH", MemorySuggestion: noSuggestion()})
	if plan.RiskLevel != "high" {
		t.Errorf("HIGH should map to high risk, got %q", plan.RiskLevel)
	}
}

func TestSeverityToRisk_Medium(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{Severity: "MEDIUM", MemorySuggestion: noSuggestion()})
	if plan.RiskLevel != "medium" {
		t.Errorf("MEDIUM should map to medium risk, got %q", plan.RiskLevel)
	}
}

func TestSeverityToRisk_Low(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{Severity: "LOW", MemorySuggestion: noSuggestion()})
	if plan.RiskLevel != "low" {
		t.Errorf("LOW should map to low risk, got %q", plan.RiskLevel)
	}
}

// ─── Target file validation ───────────────────────────────────────────────────

func TestBuildPatchPlan_InsecureTargetsDiscarded(t *testing.T) {
	badTargets := []string{
		"../etc/passwd",
		".git/config",
		".vision-memory/events.jsonl",
		".vision-snapshots/snap/file.go",
		"node_modules/lib/index.js",
		"vendor/some/lib.go",
		"/absolute/path/file.go",
		"internal/foo_test.go",
	}
	plan := BuildPatchPlan(PlanInput{
		MissionID:       "m1",
		BlockingFiles:   badTargets,
		MemorySuggestion: noSuggestion(),
	})
	for _, f := range plan.TargetFiles {
		for _, bad := range badTargets {
			if f == bad {
				t.Errorf("insecure target %q must not appear in TargetFiles", f)
			}
		}
	}
}

func TestBuildPatchPlan_FallsBackToSentinelWhenNoValidTargets(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:       "m1",
		BlockingFiles:   []string{"../traversal", ".git/hooks/pre-commit"},
		MemorySuggestion: noSuggestion(),
	})
	if len(plan.TargetFiles) == 0 {
		t.Fatal("TargetFiles must not be empty")
	}
	if plan.TargetFiles[0] != SafeSentinel {
		t.Errorf("expected sentinel fallback, got %q", plan.TargetFiles[0])
	}
}

func TestBuildPatchPlan_ValidProductionTargetAccepted(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:       "m1",
		BlockingFiles:   []string{"backend/server.js", "worker/index.js"},
		MemorySuggestion: noSuggestion(),
	})
	if len(plan.TargetFiles) == 0 {
		t.Fatal("expected at least one valid target")
	}
	for _, f := range plan.TargetFiles {
		if f == SafeSentinel {
			t.Error("sentinel should not appear when valid targets exist")
		}
	}
}

func TestBuildPatchPlan_TestFixtureNotInTargets(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:       "m1",
		BlockingFiles:   []string{"internal/foo_test.go", "backend/server.go"},
		MemorySuggestion: noSuggestion(),
	})
	for _, f := range plan.TargetFiles {
		if f == "internal/foo_test.go" {
			t.Error("test fixture must not be a patch target")
		}
	}
	// backend/server.go should survive
	found := false
	for _, f := range plan.TargetFiles {
		if f == "backend/server.go" {
			found = true
		}
	}
	if !found {
		t.Error("valid production file backend/server.go should be in targets")
	}
}

// ─── Notes & governance ───────────────────────────────────────────────────────

func TestBuildPatchPlan_AlwaysHasGovernanceNotes(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{MissionID: "m1", MemorySuggestion: noSuggestion()})
	if len(plan.Notes) == 0 {
		t.Error("plan must always have governance notes")
	}
	found := false
	for _, n := range plan.Notes {
		if len(n) > 10 {
			found = true
		}
	}
	if !found {
		t.Error("at least one substantive governance note expected")
	}
}

func TestBuildPatchPlan_MemoryGuidedAddsEventNote(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:        "m1",
		MemorySuggestion: goodSuggestion(0.75, "ev_note"),
	})
	if !plan.MemoryGuided {
		t.Skip("not memory-guided")
	}
	found := false
	for _, n := range plan.Notes {
		if len(n) > 5 {
			found = true
		}
	}
	if !found {
		t.Error("memory-guided plan should have event note")
	}
}

// ─── CandidateRuleIDs ────────────────────────────────────────────────────────

func TestBuildPatchPlan_CandidateRuleIDsDeduplicated(t *testing.T) {
	plan := BuildPatchPlan(PlanInput{
		MissionID:       "m1",
		BlockingRuleIDs: []string{"AEGIS_API_004", "AEGIS_API_004", "AEGIS_SECRET_001"},
		MemorySuggestion: noSuggestion(),
	})
	if len(plan.CandidateRuleIDs) != 2 {
		t.Errorf("expected 2 unique rule IDs, got %v", plan.CandidateRuleIDs)
	}
}
