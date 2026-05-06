// internal/memory/v63_v64_test.go
// VISION AEGIS CORE ENTERPRISE — V6.3 + V6.4 MEMORY TESTS
package memory

import (
	"testing"
)

// ─── V6.3: DiffStringSlices ───────────────────────────────────────────────────

func TestDiffStringSlices_Basic(t *testing.T) {
	diff := DiffStringSlices([]string{"A", "B", "C"}, []string{"B"})
	if len(diff) != 2 {
		t.Fatalf("expected 2, got %v", diff)
	}
	if diff[0] != "A" || diff[1] != "C" {
		t.Errorf("unexpected diff: %v", diff)
	}
}

func TestDiffStringSlices_EmptyAfter(t *testing.T) {
	diff := DiffStringSlices([]string{"X", "Y"}, []string{})
	if len(diff) != 2 {
		t.Errorf("expected 2, got %v", diff)
	}
}

func TestDiffStringSlices_EmptyBefore(t *testing.T) {
	diff := DiffStringSlices([]string{}, []string{"X"})
	if len(diff) != 0 {
		t.Errorf("expected 0, got %v", diff)
	}
}

func TestDiffStringSlices_NoDuplicates(t *testing.T) {
	diff := DiffStringSlices([]string{"A", "A", "B"}, []string{"B"})
	if len(diff) != 1 || diff[0] != "A" {
		t.Errorf("expected [A], got %v", diff)
	}
}

func TestDiffStringSlices_NoneFixed(t *testing.T) {
	diff := DiffStringSlices([]string{"A", "B"}, []string{"A", "B", "C"})
	if len(diff) != 0 {
		t.Errorf("expected 0, got %v", diff)
	}
}

func TestDeduplicateStrings(t *testing.T) {
	result := DeduplicateStrings([]string{"a", "b", "a", "", "c", "b"})
	if len(result) != 3 {
		t.Errorf("expected 3, got %v", result)
	}
}

// ─── V6.3: RemediationEvent before/after fields persist ──────────────────────

func TestRemediationEvent_V63FieldsPersistInJSONL(t *testing.T) {
	root := t.TempDir()
	event := RemediationEvent{
		ID:              "mem_v63_001",
		Timestamp:       "2026-05-06T00:00:00Z",
		Outcome:         "gold",
		PassGold:        true,
		PassSecure:      true,
		RuleIDsBefore:   []string{"AEGIS_API_004", "AEGIS_SECRET_001"},
		RuleIDsAfter:    []string{},
		FixedRuleIDs:    []string{"AEGIS_API_004", "AEGIS_SECRET_001"},
		FilesBefore:     []string{"backend/server.js"},
		FilesAfter:      []string{},
		FixedFiles:      []string{"backend/server.js"},
		PatchSummary:    "patched 1/1 files via transaction tx_abc",
		ChangedFiles:    []string{"backend/server.js"},
		DiffAvailable:   false,
		BlockingBefore:  2,
		BlockingAfter:   0,
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
	if len(e.FixedRuleIDs) != 2 {
		t.Errorf("fixed_rule_ids not persisted: %v", e.FixedRuleIDs)
	}
	if len(e.FixedFiles) != 1 {
		t.Errorf("fixed_files not persisted: %v", e.FixedFiles)
	}
	if e.PatchSummary == "" {
		t.Error("patch_summary must not be empty")
	}
	if e.DiffAvailable {
		t.Error("diff_available must be false in V6.3")
	}
	if e.BlockingBefore != 2 {
		t.Errorf("blocking_before=%d, want 2", e.BlockingBefore)
	}
	if e.BlockingAfter != 0 {
		t.Errorf("blocking_after=%d, want 0", e.BlockingAfter)
	}
}

func TestRemediationEvent_BackwardCompat_V62NoV63Fields(t *testing.T) {
	root := t.TempDir()
	old := RemediationEvent{
		ID:        "mem_v62_compat",
		Timestamp: "2026-05-06T00:00:00Z",
		Outcome:   "gold",
		PassGold:  true,
		PassSecure: true,
		RuleIDs:   []string{"aegis.cors"},
		Files:     []string{"server.js"},
	}
	_ = AppendRemediationEvent(root, old)
	events, err := ListRemediationEvents(root)
	if err != nil {
		t.Fatalf("backward compat read failed: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event")
	}
	// V6.3 fields should be zero-value for old events
	if events[0].BlockingBefore != 0 {
		t.Errorf("expected blocking_before=0 for old event")
	}
}

// ─── V6.4: isEligibleForSuggestion ───────────────────────────────────────────

func goldEvent64(id, issueType, strategy string) RemediationEvent {
	return RemediationEvent{
		ID:                id,
		MissionID:         "mission_" + id,
		Outcome:           "gold",
		PassGold:          true,
		PassSecure:        true,
		RollbackApplied:   false,
		IssueType:         issueType,
		SuggestedStrategy: strategy,
		PatchSummary:      "patched via tx_" + id,
	}
}

func TestEligibility_GoldSecure(t *testing.T) {
	if !isEligibleForSuggestion(goldEvent64("e1", "cors", "fix")) {
		t.Error("gold+secure event should be eligible")
	}
}

func TestEligibility_PassGoldFalse(t *testing.T) {
	e := goldEvent64("e2", "cors", "fix")
	e.PassGold = false
	if isEligibleForSuggestion(e) {
		t.Error("pass_gold=false must not be eligible")
	}
}

func TestEligibility_PassSecureFalse(t *testing.T) {
	e := goldEvent64("e3", "cors", "fix")
	e.PassSecure = false
	if isEligibleForSuggestion(e) {
		t.Error("pass_secure=false must not be eligible")
	}
}

func TestEligibility_RollbackApplied(t *testing.T) {
	e := goldEvent64("e4", "cors", "fix")
	e.RollbackApplied = true
	if isEligibleForSuggestion(e) {
		t.Error("rollback_applied must not be eligible")
	}
}

func TestEligibility_BadOutcome(t *testing.T) {
	e := goldEvent64("e5", "cors", "fix")
	e.Outcome = "failed"
	if isEligibleForSuggestion(e) {
		t.Error("outcome=failed must not be eligible")
	}
}

func TestEligibility_EmptyID(t *testing.T) {
	e := goldEvent64("", "cors", "fix")
	if isEligibleForSuggestion(e) {
		t.Error("empty ID must not be eligible")
	}
}

// ─── V6.4: RankRemediationMatches ────────────────────────────────────────────

func TestRank_EmptyMemory(t *testing.T) {
	matches := RankRemediationMatches(nil, RemediationQuery{IssueType: "cors"})
	if len(matches) != 0 {
		t.Errorf("expected 0 matches, got %d", len(matches))
	}
}

func TestRank_IssueTypeMatch(t *testing.T) {
	events := []RemediationEvent{
		goldEvent64("e1", "cors_blocked", "fix_cors"),
		goldEvent64("e2", "jwt_invalid", "fix_jwt"),
	}
	q := RemediationQuery{IssueType: "cors_blocked"}
	matches := RankRemediationMatches(events, q)
	if len(matches) == 0 {
		t.Fatal("expected at least one match")
	}
	if matches[0].EventID != "e1" {
		t.Errorf("expected e1, got %s", matches[0].EventID)
	}
	if !matches[0].MatchedIssueType {
		t.Error("expected matched_issue_type=true")
	}
}

func TestRank_ScoreAlwaysBetween0And1(t *testing.T) {
	events := []RemediationEvent{goldEvent64("e1", "cors_blocked", "fix_cors")}
	q := RemediationQuery{IssueType: "cors_blocked", SuggestedStrategy: "fix_cors", Severity: "HIGH"}
	matches := RankRemediationMatches(events, q)
	if len(matches) == 0 {
		t.Fatal("expected match")
	}
	score := matches[0].Score
	if score < 0 || score > 1.0 {
		t.Errorf("score out of bounds: %f", score)
	}
}

func TestRank_IneligibleEventsIgnored(t *testing.T) {
	events := []RemediationEvent{
		{ID: "bad1", IssueType: "cors_blocked", PassGold: false, PassSecure: true, Outcome: "gold"},
		{ID: "bad2", IssueType: "cors_blocked", PassGold: true, PassSecure: true, RollbackApplied: true, Outcome: "gold"},
		goldEvent64("good1", "cors_blocked", "fix"),
	}
	q := RemediationQuery{IssueType: "cors_blocked"}
	matches := RankRemediationMatches(events, q)
	for _, m := range matches {
		if m.EventID == "bad1" || m.EventID == "bad2" {
			t.Errorf("ineligible event %s appeared in matches", m.EventID)
		}
	}
}

// ─── V6.4: BuildSuggestion ───────────────────────────────────────────────────

func TestBuildSuggestion_EmptyMatches(t *testing.T) {
	s := BuildSuggestion(nil)
	if s.Available {
		t.Error("expected available=false with no matches")
	}
	if s.Matches == nil {
		t.Error("Matches must be empty slice, not nil")
	}
}

func TestBuildSuggestion_WithMatches(t *testing.T) {
	matches := []RemediationMatch{
		{EventID: "e1", Score: 0.85, PatchSummary: "patched via tx_e1"},
		{EventID: "e2", Score: 0.60, PatchSummary: "patched via tx_e2"},
	}
	s := BuildSuggestion(matches)
	if !s.Available {
		t.Error("expected available=true")
	}
	if s.BestEventID != "e1" {
		t.Errorf("expected e1, got %s", s.BestEventID)
	}
	if s.Confidence != 0.85 {
		t.Errorf("expected 0.85, got %f", s.Confidence)
	}
}

// ─── V6.4: FindSimilarRemediations integration ───────────────────────────────

func TestFindSimilarRemediations_EmptyStore(t *testing.T) {
	root := t.TempDir()
	matches, err := FindSimilarRemediations(root, RemediationQuery{IssueType: "cors"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) != 0 {
		t.Errorf("expected 0 matches, got %d", len(matches))
	}
}

func TestFindSimilarRemediations_WithGoldEvent(t *testing.T) {
	root := t.TempDir()
	e := goldEvent64("e_find_1", "cors_blocked", "align_cors")
	_ = AppendRemediationEvent(root, e)

	matches, err := FindSimilarRemediations(root, RemediationQuery{IssueType: "cors_blocked"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) == 0 {
		t.Fatal("expected at least one match")
	}
	if matches[0].EventID != "e_find_1" {
		t.Errorf("expected e_find_1, got %s", matches[0].EventID)
	}
}

func TestFindSimilarRemediations_IgnoresBadEvents(t *testing.T) {
	root := t.TempDir()
	bad := RemediationEvent{
		ID:        "bad_learn",
		Outcome:   "gold",
		PassGold:  false,
		PassSecure: true,
		IssueType: "cors_blocked",
	}
	_ = AppendRemediationEvent(root, bad)

	matches, _ := FindSimilarRemediations(root, RemediationQuery{IssueType: "cors_blocked"})
	for _, m := range matches {
		if m.EventID == "bad_learn" {
			t.Error("ineligible event must not appear in suggestions")
		}
	}
}
