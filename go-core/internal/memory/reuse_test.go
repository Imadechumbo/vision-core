// internal/memory/reuse_test.go
// VISION AEGIS CORE ENTERPRISE — V6.4 REMEDIATION MEMORY REUSE TESTS
package memory

import (
	"testing"
)

// ─── goldEvent helper ────────────────────────────────────────────────────────

func goldEvent(id, issueType, strategy, severity string, ruleIDs, files []string) RemediationEvent {
	return RemediationEvent{
		ID:                id,
		MissionID:         "mission_" + id,
		Outcome:           "gold",
		PassGold:          true,
		PassSecure:        true,
		RollbackApplied:   false,
		IssueType:         issueType,
		SuggestedStrategy: strategy,
		Severity:          severity,
		RuleIDsBefore:     ruleIDs,
		FilesBefore:       files,
		PatchSummary:      "patched via tx_" + id,
	}
}

// ─── isEligibleForSuggestion tests ───────────────────────────────────────────

func TestEligibility_GoldSecure(t *testing.T) {
	e := goldEvent("e1", "cors", "add_cors_header", "HIGH", nil, nil)
	if !isEligibleForSuggestion(e) {
		t.Error("expected gold+secure event to be eligible")
	}
}

func TestEligibility_PassGoldFalse(t *testing.T) {
	e := goldEvent("e2", "cors", "add_cors_header", "HIGH", nil, nil)
	e.PassGold = false
	if isEligibleForSuggestion(e) {
		t.Error("pass_gold=false must not be eligible")
	}
}

func TestEligibility_PassSecureFalse(t *testing.T) {
	e := goldEvent("e3", "cors", "add_cors_header", "HIGH", nil, nil)
	e.PassSecure = false
	if isEligibleForSuggestion(e) {
		t.Error("pass_secure=false must not be eligible")
	}
}

func TestEligibility_RollbackApplied(t *testing.T) {
	e := goldEvent("e4", "cors", "add_cors_header", "HIGH", nil, nil)
	e.RollbackApplied = true
	if isEligibleForSuggestion(e) {
		t.Error("rollback_applied=true must not be eligible")
	}
}

func TestEligibility_BadOutcome(t *testing.T) {
	e := goldEvent("e5", "cors", "add_cors_header", "HIGH", nil, nil)
	e.Outcome = "failed"
	if isEligibleForSuggestion(e) {
		t.Error("outcome=failed must not be eligible")
	}
}

func TestEligibility_CorruptedNoID(t *testing.T) {
	e := goldEvent("", "cors", "add_cors_header", "HIGH", nil, nil)
	if isEligibleForSuggestion(e) {
		t.Error("event without ID must not be eligible")
	}
}

// ─── RankRemediationMatches tests ────────────────────────────────────────────

func TestRank_EmptyMemory(t *testing.T) {
	matches := RankRemediationMatches(nil, RemediationQuery{IssueType: "cors"})
	if len(matches) != 0 {
		t.Errorf("expected 0 matches with empty memory, got %d", len(matches))
	}
}

func TestRank_IssueTypeMatch(t *testing.T) {
	events := []RemediationEvent{
		goldEvent("e1", "cors_blocked", "fix_cors", "HIGH", nil, nil),
		goldEvent("e2", "jwt_invalid", "fix_jwt", "HIGH", nil, nil),
	}
	q := RemediationQuery{IssueType: "cors_blocked"}
	matches := RankRemediationMatches(events, q)
	if len(matches) == 0 {
		t.Fatal("expected at least one match")
	}
	if matches[0].EventID != "e1" {
		t.Errorf("expected e1 as best match, got %s", matches[0].EventID)
	}
	if !matches[0].MatchedIssueType {
		t.Error("expected matched_issue_type=true")
	}
}

func TestRank_StrategyMatch(t *testing.T) {
	events := []RemediationEvent{
		goldEvent("e1", "cors_blocked", "align_cors_headers", "HIGH", nil, nil),
		goldEvent("e2", "cors_blocked", "other_strategy", "HIGH", nil, nil),
	}
	q := RemediationQuery{IssueType: "cors_blocked", SuggestedStrategy: "align_cors_headers"}
	matches := RankRemediationMatches(events, q)
	if len(matches) == 0 {
		t.Fatal("expected matches")
	}
	if matches[0].EventID != "e1" {
		t.Errorf("strategy match should rank e1 higher, got %s", matches[0].EventID)
	}
	if !matches[0].MatchedStrategy {
		t.Error("expected matched_strategy=true")
	}
}

func TestRank_RuleIDsIntersection(t *testing.T) {
	events := []RemediationEvent{
		goldEvent("e1", "", "", "", []string{"AEGIS_API_004", "AEGIS_SECRET_001"}, nil),
		goldEvent("e2", "", "", "", []string{"AEGIS_API_004"}, nil),
	}
	q := RemediationQuery{RuleIDs: []string{"AEGIS_API_004", "AEGIS_SECRET_001"}}
	matches := RankRemediationMatches(events, q)
	// e1 tem melhor interseção de rule_ids
	if len(matches) == 0 {
		t.Fatal("expected matches")
	}
	if matches[0].EventID != "e1" {
		t.Errorf("expected e1 (better rule_ids match), got %s", matches[0].EventID)
	}
	if len(matches[0].MatchedRuleIDs) == 0 {
		t.Error("expected matched_rule_ids non-empty")
	}
}

func TestRank_FilesIntersection(t *testing.T) {
	events := []RemediationEvent{
		goldEvent("e1", "", "", "", nil, []string{"backend/server.js", "worker/index.js"}),
		goldEvent("e2", "", "", "", nil, []string{"other/file.js"}),
	}
	q := RemediationQuery{Files: []string{"backend/server.js"}}
	matches := RankRemediationMatches(events, q)
	if len(matches) == 0 {
		t.Fatal("expected matches for file")
	}
	if matches[0].EventID != "e1" {
		t.Errorf("expected e1 (file match), got %s", matches[0].EventID)
	}
}

func TestRank_SeverityMatch(t *testing.T) {
	events := []RemediationEvent{
		goldEvent("e1", "cors_blocked", "", "HIGH", nil, nil),
		goldEvent("e2", "cors_blocked", "", "MEDIUM", nil, nil),
	}
	q := RemediationQuery{IssueType: "cors_blocked", Severity: "HIGH"}
	matches := RankRemediationMatches(events, q)
	if len(matches) == 0 {
		t.Fatal("expected matches")
	}
	if matches[0].EventID != "e1" {
		t.Errorf("severity match should rank e1 higher, got %s", matches[0].EventID)
	}
}

func TestRank_IneligibleEventsIgnored(t *testing.T) {
	events := []RemediationEvent{
		// ineligível — pass_gold=false
		{ID: "bad1", IssueType: "cors_blocked", PassGold: false, PassSecure: true, Outcome: "gold"},
		// ineligível — rollback_applied=true
		{ID: "bad2", IssueType: "cors_blocked", PassGold: true, PassSecure: true, RollbackApplied: true, Outcome: "gold"},
		// elegível
		goldEvent("good1", "cors_blocked", "", "HIGH", nil, nil),
	}
	q := RemediationQuery{IssueType: "cors_blocked"}
	matches := RankRemediationMatches(events, q)
	for _, m := range matches {
		if m.EventID == "bad1" || m.EventID == "bad2" {
			t.Errorf("ineligible event %s should not appear in matches", m.EventID)
		}
	}
	found := false
	for _, m := range matches {
		if m.EventID == "good1" {
			found = true
		}
	}
	if !found {
		t.Error("eligible event good1 should appear in matches")
	}
}

func TestRank_ScoreAlwaysBetween0And1(t *testing.T) {
	events := []RemediationEvent{
		goldEvent("e1", "cors_blocked", "fix_cors", "HIGH", []string{"A", "B"}, []string{"f.js"}),
	}
	q := RemediationQuery{
		IssueType:         "cors_blocked",
		SuggestedStrategy: "fix_cors",
		RuleIDs:           []string{"A", "B"},
		Files:             []string{"f.js"},
		Severity:          "HIGH",
	}
	matches := RankRemediationMatches(events, q)
	if len(matches) == 0 {
		t.Fatal("expected match")
	}
	score := matches[0].Score
	if score < 0 || score > 1.0 {
		t.Errorf("score out of bounds: %f", score)
	}
}

// ─── BuildSuggestion tests ───────────────────────────────────────────────────

func TestBuildSuggestion_EmptyMatches(t *testing.T) {
	s := BuildSuggestion(nil)
	if s.Available {
		t.Error("expected available=false with no matches")
	}
	if s.Matches == nil {
		t.Error("Matches should be empty slice, not nil")
	}
}

func TestBuildSuggestion_WithMatches(t *testing.T) {
	matches := []RemediationMatch{
		{EventID: "e1", Score: 0.85, PatchSummary: "patched via tx_e1"},
		{EventID: "e2", Score: 0.60, PatchSummary: "patched via tx_e2"},
	}
	s := BuildSuggestion(matches)
	if !s.Available {
		t.Error("expected available=true with matches")
	}
	if s.BestEventID != "e1" {
		t.Errorf("expected best event e1, got %s", s.BestEventID)
	}
	if s.Confidence != 0.85 {
		t.Errorf("expected confidence=0.85, got %f", s.Confidence)
	}
	if s.PatchSummary == "" {
		t.Error("expected patch_summary non-empty")
	}
	if len(s.Matches) != 2 {
		t.Errorf("expected 2 matches, got %d", len(s.Matches))
	}
}

// ─── FindSimilarRemediations integration ─────────────────────────────────────

func TestFindSimilarRemediations_EmptyStore(t *testing.T) {
	root := t.TempDir()
	matches, err := FindSimilarRemediations(root, RemediationQuery{IssueType: "cors"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) != 0 {
		t.Errorf("expected 0 matches from empty store, got %d", len(matches))
	}
}

func TestFindSimilarRemediations_WithGoldEvent(t *testing.T) {
	root := t.TempDir()
	e := goldEvent("e_find_1", "cors_blocked", "align_cors", "HIGH",
		[]string{"AEGIS_API_004"}, []string{"backend/server.js"})
	_ = AppendRemediationEvent(root, e)

	q := RemediationQuery{
		IssueType:         "cors_blocked",
		SuggestedStrategy: "align_cors",
		RuleIDs:           []string{"AEGIS_API_004"},
	}
	matches, err := FindSimilarRemediations(root, q)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) == 0 {
		t.Fatal("expected at least one match")
	}
	if matches[0].EventID != "e_find_1" {
		t.Errorf("expected event e_find_1, got %s", matches[0].EventID)
	}
}

func TestFindSimilarRemediations_IgnoresBadEvents(t *testing.T) {
	root := t.TempDir()
	// evento com pass_gold=false — não elegível
	bad := RemediationEvent{
		ID:        "bad_learn",
		Outcome:   "gold",
		PassGold:  false,
		PassSecure: true,
		IssueType: "cors_blocked",
	}
	_ = AppendRemediationEvent(root, bad)

	q := RemediationQuery{IssueType: "cors_blocked"}
	matches, _ := FindSimilarRemediations(root, q)
	for _, m := range matches {
		if m.EventID == "bad_learn" {
			t.Error("ineligible event must not appear in suggestions")
		}
	}
}
