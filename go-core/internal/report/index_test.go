// internal/report/index_test.go
// VISION AEGIS CORE ENTERPRISE — V7.8 INDEX TESTS
package report

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func sampleEntry(flowID string) FlowReportIndexEntry {
	return FlowReportIndexEntry{
		FlowID:       flowID,
		CreatedAtUTC: "2026-05-08T02:00:00Z",
		Version:      IndexVersion,
		Mode:         "dry-run",
		DryRun:       true,
		OK:           true,
		Owner:        "testorg",
		Repo:         "testrepo",
		MissionID:    "test_mission",
		IssueType:    "cors_blocked",
		BaseBranch:   "v6-go-enterprise-runtime",
		WorkBranch:   "vision/remediation/test_mission",
		ChangedFiles: []string{"server.js"},
	}
}

func makeReportDir(t *testing.T) (string, string) {
	t.Helper()
	root := t.TempDir()
	dir := "reports"
	abs := filepath.Join(root, dir)
	os.MkdirAll(abs, 0755)
	return root, dir
}

// ─── A: Index append ──────────────────────────────────────────────────────────

func TestIndexAppend_CreatesIndexWithEntry(t *testing.T) {
	root, dir := makeReportDir(t)
	e := sampleEntry("github_flow_20260508T000000Z_aabbccdd")

	if err := AppendOrUpdateEntry(root, dir, e); err != nil {
		t.Fatalf("AppendOrUpdateEntry: %v", err)
	}

	idxPath := IndexPath(root, dir)
	if _, err := os.Stat(idxPath); err != nil {
		t.Fatalf("index.json not created: %v", err)
	}

	idx, err := LoadIndex(idxPath)
	if err != nil {
		t.Fatalf("LoadIndex: %v", err)
	}
	if len(idx.Entries) != 1 {
		t.Errorf("expected 1 entry, got %d", len(idx.Entries))
	}
	if idx.Entries[0].FlowID != e.FlowID {
		t.Errorf("flow_id mismatch: got %q", idx.Entries[0].FlowID)
	}
}

func TestIndexAppend_TwoEntriesCount(t *testing.T) {
	root, dir := makeReportDir(t)
	e1 := sampleEntry("github_flow_20260508T000001Z_aabbccdd")
	e2 := sampleEntry("github_flow_20260508T000002Z_eeffaabb")

	AppendOrUpdateEntry(root, dir, e1)
	AppendOrUpdateEntry(root, dir, e2)

	idx, _ := LoadIndex(IndexPath(root, dir))
	if len(idx.Entries) != 2 {
		t.Errorf("expected 2 entries, got %d", len(idx.Entries))
	}
}

// ─── B: Index upsert ─────────────────────────────────────────────────────────

func TestIndexUpsert_SameFlowIDNosDuplicate(t *testing.T) {
	root, dir := makeReportDir(t)
	flowID := "github_flow_20260508T000003Z_11223344"
	e := sampleEntry(flowID)

	AppendOrUpdateEntry(root, dir, e)

	// Update with modified entry
	e2 := e
	e2.OK = false
	AppendOrUpdateEntry(root, dir, e2)

	idx, _ := LoadIndex(IndexPath(root, dir))
	if len(idx.Entries) != 1 {
		t.Errorf("expected 1 entry after upsert, got %d", len(idx.Entries))
	}
	if idx.Entries[0].OK != false {
		t.Error("updated entry should have OK=false")
	}
}

// ─── C: Corrupt index ────────────────────────────────────────────────────────

func TestIndexCorrupt_ReturnsError(t *testing.T) {
	root := t.TempDir()
	dir := "reports"
	os.MkdirAll(filepath.Join(root, dir), 0755)

	// Write corrupt JSON
	idxPath := IndexPath(root, dir)
	os.WriteFile(idxPath, []byte("{not valid json}"), 0644)

	_, err := LoadIndex(idxPath)
	if err == nil {
		t.Error("expected error for corrupt index.json")
	}
	if err != nil && len(err.Error()) == 0 {
		t.Error("error message must not be empty")
	}
}

func TestIndexCorrupt_DoesNotSilentlyOverwrite(t *testing.T) {
	root := t.TempDir()
	dir := "reports"
	os.MkdirAll(filepath.Join(root, dir), 0755)
	idxPath := IndexPath(root, dir)
	original := []byte("{corrupt_content}")
	os.WriteFile(idxPath, original, 0644)

	// Attempt to append should fail, not silently overwrite
	e := sampleEntry("github_flow_20260508T000004Z_aaaabbbb")
	err := AppendOrUpdateEntry(root, dir, e)
	if err == nil {
		t.Error("expected error when index is corrupt; must not silently overwrite")
	}

	// Verify original content is preserved
	current, _ := os.ReadFile(idxPath)
	if string(current) != string(original) {
		t.Error("corrupt index.json was overwritten — must not overwrite on parse error")
	}
}

// ─── D: List reports ─────────────────────────────────────────────────────────

func TestListEntries_ReturnsAllEntries(t *testing.T) {
	root, dir := makeReportDir(t)
	for i := 0; i < 3; i++ {
		e := sampleEntry("github_flow_20260508T00000" + string(rune('1'+i)) + "Z_list" + string(rune('a'+i)))
		AppendOrUpdateEntry(root, dir, e)
	}

	idx, err := ListEntries(root, dir, 0)
	if err != nil {
		t.Fatalf("ListEntries: %v", err)
	}
	if len(idx.Entries) != 3 {
		t.Errorf("expected 3 entries, got %d", len(idx.Entries))
	}
}

func TestListEntries_RespectsLimit(t *testing.T) {
	root, dir := makeReportDir(t)
	for i := 0; i < 5; i++ {
		e := sampleEntry("github_flow_2026050" + string(rune('1'+i)) + "T000000Z_lim" + string(rune('a'+i)))
		AppendOrUpdateEntry(root, dir, e)
	}
	idx, _ := ListEntries(root, dir, 2)
	if len(idx.Entries) != 2 {
		t.Errorf("expected 2 entries with limit=2, got %d", len(idx.Entries))
	}
}

func TestListEntries_EmptyWhenNoIndex(t *testing.T) {
	root := t.TempDir()
	idx, err := ListEntries(root, "reports", 0)
	if err != nil {
		t.Fatalf("ListEntries on missing index: %v", err)
	}
	if len(idx.Entries) != 0 {
		t.Errorf("expected 0 entries for missing index, got %d", len(idx.Entries))
	}
}

// ─── E: Get by flow_id ───────────────────────────────────────────────────────

func TestGetEntry_ReturnsCorrectEntry(t *testing.T) {
	root, dir := makeReportDir(t)
	flowID := "github_flow_20260508T000005Z_gettest"
	e := sampleEntry(flowID)
	e.IssueType = "auth_bypass"
	AppendOrUpdateEntry(root, dir, e)

	found, err := GetEntry(root, dir, flowID)
	if err != nil {
		t.Fatalf("GetEntry: %v", err)
	}
	if found.FlowID != flowID {
		t.Errorf("expected %q, got %q", flowID, found.FlowID)
	}
	if found.IssueType != "auth_bypass" {
		t.Errorf("issue_type mismatch: %q", found.IssueType)
	}
}

func TestGetEntry_NotFound_ReturnsError(t *testing.T) {
	root, dir := makeReportDir(t)
	_, err := GetEntry(root, dir, "github_flow_20260508T000000Z_notexist")
	if err == nil {
		t.Error("expected error for non-existent flow_id")
	}
}

// ─── F: Clean dry-run ────────────────────────────────────────────────────────

func TestClean_DryRun_DoesNotDeleteFiles(t *testing.T) {
	root, dir := makeReportDir(t)

	// Create 3 entries with real files
	var flowIDs []string
	for i := 0; i < 3; i++ {
		fid := "github_flow_2026050" + string(rune('1'+i)) + "T000000Z_dryrun"
		e := sampleEntry(fid)
		e.JSONPath = filepath.Join(root, dir, fid+".json")
		os.WriteFile(e.JSONPath, []byte("{}"), 0644)
		AppendOrUpdateEntry(root, dir, e)
		flowIDs = append(flowIDs, fid)
	}

	result, err := Clean(root, dir, 1, true /* dry-run */)
	if err != nil {
		t.Fatalf("Clean dry-run: %v", err)
	}
	if result.DryRun != true {
		t.Error("expected DryRun=true in result")
	}
	if result.RemovedCount != 2 {
		t.Errorf("expected 2 would-remove, got %d", result.RemovedCount)
	}
	if len(result.WouldDelete) == 0 {
		t.Error("expected would_delete to be populated")
	}

	// Files must still exist
	for _, fid := range flowIDs {
		p := filepath.Join(root, dir, fid+".json")
		if _, err := os.Stat(p); err != nil {
			t.Errorf("file was deleted in dry-run: %s", p)
		}
	}
}

// ─── G: Clean real ────────────────────────────────────────────────────────────

func TestClean_Real_DeletesOldFilesAndUpdatesIndex(t *testing.T) {
	root, dir := makeReportDir(t)

	var entries []FlowReportIndexEntry
	for i := 0; i < 4; i++ {
		ts := time.Date(2026, 5, i+1, 0, 0, 0, 0, time.UTC)
		fid := NewFlowID("m", "vision/remediation/m", []string{"f"}, ts)
		e := sampleEntry(fid)
		e.CreatedAtUTC = ts.Format(time.RFC3339)
		e.JSONPath = filepath.Join(root, dir, fid+".json")
		os.WriteFile(e.JSONPath, []byte("{}"), 0644)
		AppendOrUpdateEntry(root, dir, e)
		entries = append(entries, e)
	}

	result, err := Clean(root, dir, 2, false /* real */)
	if err != nil {
		t.Fatalf("Clean real: %v", err)
	}
	if result.RemovedCount != 2 {
		t.Errorf("expected 2 removed, got %d", result.RemovedCount)
	}

	// Index must have 2 entries
	idx, _ := LoadIndex(IndexPath(root, dir))
	if len(idx.Entries) != 2 {
		t.Errorf("expected 2 entries after clean, got %d", len(idx.Entries))
	}

	// index.json must still exist
	idxPath := IndexPath(root, dir)
	if _, err := os.Stat(idxPath); err != nil {
		t.Error("index.json must not be deleted during clean")
	}
}

// ─── H: Path safety ──────────────────────────────────────────────────────────

func TestValidateReportDir_Blocks(t *testing.T) {
	bad := []string{
		"/absolute/path",
		"\\absolute\\path",
		"C:\\path",
		"../traversal",
		".git/reports",
		".vision-memory/reports",
		"bin/reports",
		"node_modules/reports",
	}
	for _, b := range bad {
		if err := ValidateReportDir(b); err == nil {
			t.Errorf("ValidateReportDir(%q) should fail", b)
		}
	}
}

func TestValidateReportDir_Allows(t *testing.T) {
	good := []string{
		".vision-reports/github-flow",
		"reports",
		"audit/flows",
	}
	for _, g := range good {
		if err := ValidateReportDir(g); err != nil {
			t.Errorf("ValidateReportDir(%q) should pass: %v", g, err)
		}
	}
}

// ─── I: flow_id safety ───────────────────────────────────────────────────────

func TestValidateFlowID_Blocks(t *testing.T) {
	bad := []string{
		"",
		"not_flow_prefixed",
		"github_flow_with/slash",
		"github_flow_with ..dots",
		"github_flow_with space",
		"github_flow_with;semicolon",
		"github_flow_with|pipe",
	}
	for _, b := range bad {
		if err := ValidateFlowID(b); err == nil {
			t.Errorf("ValidateFlowID(%q) should fail", b)
		}
	}
}

func TestValidateFlowID_Allows(t *testing.T) {
	good := []string{
		"github_flow_20260508T020443Z_a1b2c3d4",
		"github_flow_20260101T000000Z_deadbeef",
	}
	for _, g := range good {
		if err := ValidateFlowID(g); err != nil {
			t.Errorf("ValidateFlowID(%q) should pass: %v", g, err)
		}
	}
}

// ─── J: Redaction ────────────────────────────────────────────────────────────

func TestRedactSecrets_RemovesGHPToken(t *testing.T) {
	t.Setenv("GITHUB_TOKEN", "ghp_REAL_SECRET_TOKEN_VALUE_HERE")
	s := "error: ghp_REAL_SECRET_TOKEN_VALUE_HERE leaked"
	result := redactSecrets(s)
	if result == s {
		t.Error("redactSecrets should have changed the string")
	}
	if len(result) == 0 {
		t.Error("result must not be empty")
	}
}

func TestEntryFromReport_NeverIncludesToken(t *testing.T) {
	t.Setenv("GITHUB_TOKEN", "ghp_SHOULD_NOT_APPEAR")
	r := &GitHubFlowExecutionReport{
		FlowID:    "github_flow_20260508T000000Z_tokentest",
		Version:   IndexVersion,
		Owner:     "org",
		Repo:      "repo",
		MissionID: "m1",
	}
	entry := EntryFromReport(r)
	data, _ := json.Marshal(entry)
	if len(data) == 0 {
		t.Fatal("marshalled entry is empty")
	}
	s := string(data)
	if contains(s, "ghp_SHOULD_NOT_APPEAR") {
		t.Error("EntryFromReport must not include GITHUB_TOKEN value")
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 ||
		func() bool {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
			return false
		}())
}

// ─── NewFlowID ────────────────────────────────────────────────────────────────

func TestNewFlowID_Format(t *testing.T) {
	ts := time.Date(2026, 5, 8, 2, 4, 43, 0, time.UTC)
	id := NewFlowID("mission_1", "vision/remediation/m1", []string{"server.js"}, ts)
	if id == "" {
		t.Fatal("flow_id must not be empty")
	}
	if err := ValidateFlowID(id); err != nil {
		t.Errorf("NewFlowID generated invalid id %q: %v", id, err)
	}
	if len(id) < 20 {
		t.Errorf("flow_id too short: %q", id)
	}
}

func TestNewFlowID_Deterministic(t *testing.T) {
	ts := time.Date(2026, 5, 8, 12, 0, 0, 0, time.UTC)
	id1 := NewFlowID("m", "vision/remediation/m", []string{"f.js"}, ts)
	id2 := NewFlowID("m", "vision/remediation/m", []string{"f.js"}, ts)
	if id1 != id2 {
		t.Errorf("same inputs must produce same flow_id: %q vs %q", id1, id2)
	}
}

func TestNewFlowID_DifferentInputsDifferentID(t *testing.T) {
	ts := time.Date(2026, 5, 8, 12, 0, 0, 0, time.UTC)
	id1 := NewFlowID("m1", "vision/remediation/m1", []string{"f.js"}, ts)
	id2 := NewFlowID("m2", "vision/remediation/m2", []string{"g.js"}, ts)
	if id1 == id2 {
		t.Error("different inputs should produce different flow_ids")
	}
}
