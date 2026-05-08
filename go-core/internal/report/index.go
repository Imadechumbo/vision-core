// internal/report/index.go
// VISION AEGIS CORE ENTERPRISE — V7.8 GITHUB FLOW REPORT INDEX AND RETENTION
//
// Maintains a local auditable index of github-flow executions in index.json.
// All entries are safe relative paths within the project root.
// Tokens and credentials are never stored in the index.
package report

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// ─── Index constants ──────────────────────────────────────────────────────────

const IndexFileName = "index.json"
const IndexVersion = "V7.8"

// safeFlowIDRE matches valid flow IDs: github_flow_<timestamp>_<hash>
var safeFlowIDRE = regexp.MustCompile(`^github_flow_[A-Za-z0-9_-]+$`)

// ─── Types ───────────────────────────────────────────────────────────────────

// FlowReportIndexEntry is a single audit entry in the index.
// It mirrors the key fields from GitHubFlowExecutionReport — never includes tokens.
type FlowReportIndexEntry struct {
	FlowID       string   `json:"flow_id"`
	CreatedAtUTC string   `json:"created_at_utc"`
	Version      string   `json:"version"`
	Mode         string   `json:"mode"`
	DryRun       bool     `json:"dry_run"`
	ApplyReal    bool     `json:"apply_real"`
	OK           bool     `json:"ok"`
	Blocked      bool     `json:"blocked"`
	Owner        string   `json:"owner"`
	Repo         string   `json:"repo"`
	MissionID    string   `json:"mission_id"`
	IssueType    string   `json:"issue_type"`
	BaseBranch   string   `json:"base_branch"`
	WorkBranch   string   `json:"work_branch"`
	ChangedFiles []string `json:"changed_files"`
	JSONPath     string   `json:"json_path,omitempty"`
	MarkdownPath string   `json:"markdown_path,omitempty"`
}

// FlowReportIndex is the full index document written to index.json.
type FlowReportIndex struct {
	Version      string                 `json:"version"`
	UpdatedAtUTC string                 `json:"updated_at_utc"`
	Entries      []FlowReportIndexEntry `json:"entries"`
}

// CleanResult describes what was (or would be) removed during retention clean.
type CleanResult struct {
	DryRun       bool     `json:"dry_run"`
	KeepLast     int      `json:"keep_last"`
	TotalBefore  int      `json:"total_before"`
	TotalAfter   int      `json:"total_after"`
	RemovedCount int      `json:"removed_count"`
	WouldDelete  []string `json:"would_delete,omitempty"`
	Deleted      []string `json:"deleted,omitempty"`
	Missing      []string `json:"missing,omitempty"`
	Error        string   `json:"error,omitempty"`
}

// ─── Path for index ──────────────────────────────────────────────────────────

// IndexPath returns the absolute path to index.json inside root/reportDir.
func IndexPath(root, reportDir string) string {
	return filepath.Join(root, filepath.FromSlash(reportDir), IndexFileName)
}

// ─── flow_id validation ───────────────────────────────────────────────────────

// ValidateFlowID checks that id is a safe, canonical flow ID.
func ValidateFlowID(id string) error {
	if id == "" {
		return fmt.Errorf("flow_id is empty")
	}
	if !strings.HasPrefix(id, "github_flow_") {
		return fmt.Errorf("flow_id must start with \"github_flow_\": %q", id)
	}
	if strings.ContainsAny(id, "/ \\ \t\n\r..;|&$`(){}!<>") {
		return fmt.Errorf("flow_id contains unsafe characters: %q", id)
	}
	if !safeFlowIDRE.MatchString(id) {
		return fmt.Errorf("flow_id contains invalid characters: %q", id)
	}
	return nil
}

// ─── Load / Save ─────────────────────────────────────────────────────────────

// LoadIndex reads and parses index.json. Returns an empty index if file not found.
// Returns error (not silent) if the file exists but is corrupt.
func LoadIndex(indexPath string) (FlowReportIndex, error) {
	data, err := os.ReadFile(indexPath)
	if os.IsNotExist(err) {
		return FlowReportIndex{Version: IndexVersion, Entries: []FlowReportIndexEntry{}}, nil
	}
	if err != nil {
		return FlowReportIndex{}, fmt.Errorf("cannot read index: %w", err)
	}
	var idx FlowReportIndex
	if err := json.Unmarshal(data, &idx); err != nil {
		return FlowReportIndex{}, fmt.Errorf("index.json is corrupt (parse error): %w — run with --clean to recover", err)
	}
	if idx.Entries == nil {
		idx.Entries = []FlowReportIndexEntry{}
	}
	return idx, nil
}

// saveIndex writes the index atomically by writing to a temp file then renaming.
func saveIndex(indexPath string, idx FlowReportIndex) error {
	idx.Version = IndexVersion
	idx.UpdatedAtUTC = time.Now().UTC().Format(time.RFC3339)
	if idx.Entries == nil {
		idx.Entries = []FlowReportIndexEntry{}
	}
	data, err := json.MarshalIndent(idx, "", "  ")
	if err != nil {
		return fmt.Errorf("cannot marshal index: %w", err)
	}
	// Write to temp file then rename for atomic update
	dir := filepath.Dir(indexPath)
	tmp, err := os.CreateTemp(dir, ".index_tmp_*.json")
	if err != nil {
		return fmt.Errorf("cannot create temp index file: %w", err)
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("cannot write temp index: %w", err)
	}
	tmp.Close()
	if err := os.Rename(tmpName, indexPath); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("cannot commit index: %w", err)
	}
	return nil
}

// ─── AppendOrUpdateEntry ──────────────────────────────────────────────────────

// AppendOrUpdateEntry adds entry to the index, replacing any existing entry
// with the same FlowID (upsert semantics). Saves the updated index atomically.
func AppendOrUpdateEntry(root, reportDir string, entry FlowReportIndexEntry) error {
	if err := ValidateReportDir(reportDir); err != nil {
		return fmt.Errorf("invalid report-dir: %w", err)
	}
	if err := ValidateFlowID(entry.FlowID); err != nil {
		return fmt.Errorf("invalid flow_id: %w", err)
	}

	// Ensure directory exists
	absDir := filepath.Join(root, filepath.FromSlash(reportDir))
	if err := os.MkdirAll(absDir, 0755); err != nil {
		return fmt.Errorf("cannot create report dir: %w", err)
	}

	indexPath := IndexPath(root, reportDir)
	idx, err := LoadIndex(indexPath)
	if err != nil {
		return err
	}

	// Upsert: replace existing entry with same FlowID
	found := false
	for i, e := range idx.Entries {
		if e.FlowID == entry.FlowID {
			idx.Entries[i] = entry
			found = true
			break
		}
	}
	if !found {
		idx.Entries = append(idx.Entries, entry)
	}

	return saveIndex(indexPath, idx)
}

// ─── GetEntry ────────────────────────────────────────────────────────────────

// GetEntry returns the index entry matching flowID, or error if not found.
func GetEntry(root, reportDir, flowID string) (FlowReportIndexEntry, error) {
	if err := ValidateFlowID(flowID); err != nil {
		return FlowReportIndexEntry{}, err
	}
	indexPath := IndexPath(root, reportDir)
	idx, err := LoadIndex(indexPath)
	if err != nil {
		return FlowReportIndexEntry{}, err
	}
	for _, e := range idx.Entries {
		if e.FlowID == flowID {
			return e, nil
		}
	}
	return FlowReportIndexEntry{}, fmt.Errorf("flow_id %q not found in index", flowID)
}

// ─── ListEntries ─────────────────────────────────────────────────────────────

// ListEntries returns up to limit entries from the index, sorted newest-first.
// limit <= 0 returns all entries.
func ListEntries(root, reportDir string, limit int) (FlowReportIndex, error) {
	indexPath := IndexPath(root, reportDir)
	idx, err := LoadIndex(indexPath)
	if err != nil {
		return FlowReportIndex{}, err
	}
	// Sort newest-first by CreatedAtUTC
	sort.Slice(idx.Entries, func(i, j int) bool {
		return idx.Entries[i].CreatedAtUTC > idx.Entries[j].CreatedAtUTC
	})
	if limit > 0 && len(idx.Entries) > limit {
		idx.Entries = idx.Entries[:limit]
	}
	return idx, nil
}

// ─── Clean ───────────────────────────────────────────────────────────────────

// Clean removes report artifacts beyond keepLast entries, updating the index.
// If dryRun=true, no files are deleted and no index is updated.
// keepLast must be >= 1.
func Clean(root, reportDir string, keepLast int, dryRun bool) (CleanResult, error) {
	result := CleanResult{DryRun: dryRun, KeepLast: keepLast}

	if keepLast < 1 {
		return result, fmt.Errorf("keep-last must be >= 1, got %d", keepLast)
	}
	if err := ValidateReportDir(reportDir); err != nil {
		return result, fmt.Errorf("invalid report-dir: %w", err)
	}

	indexPath := IndexPath(root, reportDir)
	idx, err := LoadIndex(indexPath)
	if err != nil {
		return result, err
	}

	// Sort newest-first
	sort.Slice(idx.Entries, func(i, j int) bool {
		return idx.Entries[i].CreatedAtUTC > idx.Entries[j].CreatedAtUTC
	})

	result.TotalBefore = len(idx.Entries)

	if len(idx.Entries) <= keepLast {
		result.TotalAfter = len(idx.Entries)
		return result, nil // nothing to clean
	}

	toKeep := idx.Entries[:keepLast]
	toRemove := idx.Entries[keepLast:]
	result.TotalAfter = keepLast
	result.RemovedCount = len(toRemove)

	absReportDir := filepath.Join(root, filepath.FromSlash(reportDir))

	for _, entry := range toRemove {
		for _, p := range []string{entry.JSONPath, entry.MarkdownPath} {
			if p == "" {
				continue
			}
			// Safety: only delete files inside the report dir
			if !strings.HasPrefix(filepath.Clean(p), filepath.Clean(absReportDir)) {
				result.Missing = append(result.Missing, p+" (outside report-dir, skipped)")
				continue
			}
			if dryRun {
				result.WouldDelete = append(result.WouldDelete, p)
			} else {
				if err := os.Remove(p); err != nil {
					if os.IsNotExist(err) {
						result.Missing = append(result.Missing, p)
					} else {
						result.Error = redactSecrets(err.Error())
					}
				} else {
					result.Deleted = append(result.Deleted, p)
				}
			}
		}
	}

	if !dryRun {
		idx.Entries = toKeep
		if err := saveIndex(indexPath, idx); err != nil {
			return result, fmt.Errorf("cannot update index after clean: %w", err)
		}
	}

	return result, nil
}

// ─── EntryFromReport ─────────────────────────────────────────────────────────

// EntryFromReport converts a GitHubFlowExecutionReport to a FlowReportIndexEntry.
// Never includes tokens or secrets.
func EntryFromReport(r *GitHubFlowExecutionReport) FlowReportIndexEntry {
	return FlowReportIndexEntry{
		FlowID:       r.FlowID,
		CreatedAtUTC: r.CreatedAtUTC,
		Version:      r.Version,
		Mode:         r.Mode,
		DryRun:       r.DryRun,
		ApplyReal:    r.ApplyReal,
		OK:           r.OK,
		Blocked:      r.Blocked,
		Owner:        r.Owner,
		Repo:         r.Repo,
		MissionID:    r.MissionID,
		IssueType:    r.IssueType,
		BaseBranch:   r.BaseBranch,
		WorkBranch:   r.WorkBranch,
		ChangedFiles: r.ChangedFiles,
		JSONPath:     r.JSONPath,
		MarkdownPath: r.MarkdownPath,
	}
}
