// internal/report/report.go
// VISION AEGIS CORE ENTERPRISE — V7.7 GITHUB FLOW EXECUTION REPORT
//
// Generates auditable JSON and Markdown artifacts for github-flow CLI executions.
// Reports are written to a safe local directory; never outside the project root.
// All strings are sanitized with RedactSecrets before writing.
// GITHUB_TOKEN, ghp_, github_pat_, x-access-token never appear in reports.
package report

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ─── Constants ───────────────────────────────────────────────────────────────

const Version = "V7.7"

// DefaultReportDir is the default relative path for report artifacts.
const DefaultReportDir = ".vision-reports/github-flow"

// blockedReportDirs are directory segments that must not appear in report-dir.
var blockedReportDirs = []string{
	".git", ".vision-memory", ".vision-snapshots",
	"bin", "node_modules", "vendor", "dist", "build", ".next",
}

// ─── Types ───────────────────────────────────────────────────────────────────

// GitHubFlowExecutionReport is the canonical audit record for a github-flow execution.
type GitHubFlowExecutionReport struct {
	FlowID       string `json:"flow_id"`
	Version      string `json:"version"`
	CreatedAtUTC string `json:"created_at_utc"`
	Mode         string `json:"mode"`
	DryRun       bool   `json:"dry_run"`
	ApplyReal    bool   `json:"apply_real"`

	Root   string `json:"root"`
	Owner  string `json:"owner"`
	Repo   string `json:"repo"`
	Remote string `json:"remote"`

	MissionID    string   `json:"mission_id"`
	IssueType    string   `json:"issue_type"`
	BaseBranch   string   `json:"base_branch"`
	WorkBranch   string   `json:"work_branch"`
	ChangedFiles []string `json:"changed_files"`

	PublishRemote bool `json:"publish_remote"`
	OpenPR        bool `json:"open_pr"`
	PublishStatus bool `json:"publish_status"`

	Gates  map[string]bool `json:"gates"`
	Plan   interface{}     `json:"plan"`
	Result interface{}     `json:"result"`

	OK          bool   `json:"ok"`
	Blocked     bool   `json:"blocked"`
	BlockReason string `json:"block_reason,omitempty"`
	Error       string `json:"error,omitempty"`

	JSONPath     string `json:"json_path,omitempty"`
	MarkdownPath string `json:"markdown_path,omitempty"`
}

// ReportFormat controls which artifact files are generated.
type ReportFormat string

const (
	FormatBoth     ReportFormat = "both"
	FormatJSON     ReportFormat = "json"
	FormatMarkdown ReportFormat = "markdown"
	FormatNone     ReportFormat = "none"
)

// IsValid returns true for known format values.
func (f ReportFormat) IsValid() bool {
	switch f {
	case FormatBoth, FormatJSON, FormatMarkdown, FormatNone:
		return true
	}
	return false
}

// ─── FlowID ──────────────────────────────────────────────────────────────────

// NewFlowID generates a deterministic-enough flow ID for auditing.
// Format: github_flow_<timestamp>_<short_hash>
// Derived from missionID + workBranch + changedFiles + timestamp — no secrets.
func NewFlowID(missionID, workBranch string, changedFiles []string, ts time.Time) string {
	h := sha256.New()
	fmt.Fprintf(h, "%s|%s|%s|%d", missionID, workBranch, strings.Join(changedFiles, ","), ts.UnixNano())
	short := fmt.Sprintf("%x", h.Sum(nil))[:8]
	return fmt.Sprintf("github_flow_%sZ_%s", ts.UTC().Format("20060102T150405"), short)
}

// ─── Path validation ──────────────────────────────────────────────────────────

// ValidateReportDir checks that dir is a safe relative path for report artifacts.
func ValidateReportDir(dir string) error {
	if strings.TrimSpace(dir) == "" {
		return fmt.Errorf("report-dir must not be empty")
	}

	// Cross-platform absolute path detection:
	// 1. stdlib filepath.IsAbs (covers /path on Unix, C:\path on Windows)
	if filepath.IsAbs(dir) {
		return fmt.Errorf("report-dir must be a relative path, got absolute: %q", dir)
	}
	// 2. Explicit slash/backslash prefix (catches "/path" on Windows where
	//    filepath.IsAbs returns false for paths starting with "/" but not a drive)
	if strings.HasPrefix(dir, "/") || strings.HasPrefix(dir, "\\") {
		return fmt.Errorf("report-dir must be a relative path, got absolute: %q", dir)
	}
	// 3. Windows drive-letter pattern: e.g. C:\path or C:/path
	if len(dir) >= 3 && dir[1] == ':' && (dir[2] == '\\' || dir[2] == '/') {
		return fmt.Errorf("report-dir must be a relative path, got absolute: %q", dir)
	}

	norm := filepath.ToSlash(filepath.Clean(dir))
	if norm == "." || strings.HasPrefix(norm, "../") || norm == ".." {
		return fmt.Errorf("report-dir contains path traversal: %q", dir)
	}
	if strings.Contains(norm, "..") {
		return fmt.Errorf("report-dir contains path traversal: %q", dir)
	}
	for _, seg := range strings.Split(norm, "/") {
		for _, blocked := range blockedReportDirs {
			if seg == blocked {
				return fmt.Errorf("report-dir contains blocked segment %q: %q", blocked, dir)
			}
		}
	}
	return nil
}

// ─── Write ────────────────────────────────────────────────────────────────────

// Write generates report artifacts according to format and stores them in
// root/reportDir/. Returns the report with JSONPath and MarkdownPath set.
// All content is sanitized with redactSecrets before writing.
func Write(root string, reportDir string, format ReportFormat, r *GitHubFlowExecutionReport) error {
	if format == FormatNone {
		return nil
	}

	absDir := filepath.Join(root, filepath.FromSlash(reportDir))
	if err := os.MkdirAll(absDir, 0755); err != nil {
		return fmt.Errorf("cannot create report dir %q: %w", absDir, err)
	}

	base := r.FlowID
	if base == "" {
		base = "github_flow_unknown"
	}

	if format == FormatJSON || format == FormatBoth {
		jsonPath := filepath.Join(absDir, base+".json")
		data, err := json.MarshalIndent(r, "", "  ")
		if err != nil {
			return fmt.Errorf("cannot marshal report JSON: %w", err)
		}
		safe := []byte(redactSecrets(string(data)))
		if err := os.WriteFile(jsonPath, safe, 0644); err != nil {
			return fmt.Errorf("cannot write report JSON: %w", err)
		}
		r.JSONPath = jsonPath
	}

	if format == FormatMarkdown || format == FormatBoth {
		mdPath := filepath.Join(absDir, base+".md")
		md := buildMarkdown(r)
		if err := os.WriteFile(mdPath, []byte(md), 0644); err != nil {
			return fmt.Errorf("cannot write report Markdown: %w", err)
		}
		r.MarkdownPath = mdPath
	}

	return nil
}

// ─── Markdown builder ────────────────────────────────────────────────────────

func buildMarkdown(r *GitHubFlowExecutionReport) string {
	var sb strings.Builder

	sb.WriteString("# VISION GitHub Flow Execution Report\n\n")

	// Summary
	sb.WriteString("## Summary\n\n")
	sb.WriteString(fmt.Sprintf("| Field | Value |\n|---|---|\n"))
	sb.WriteString(fmt.Sprintf("| Flow ID | `%s` |\n", r.FlowID))
	sb.WriteString(fmt.Sprintf("| Version | %s |\n", r.Version))
	sb.WriteString(fmt.Sprintf("| Created UTC | %s |\n", r.CreatedAtUTC))
	sb.WriteString(fmt.Sprintf("| Mode | **%s** |\n", r.Mode))
	sb.WriteString(fmt.Sprintf("| Dry Run | %v |\n", r.DryRun))
	sb.WriteString(fmt.Sprintf("| Apply Real | %v |\n", r.ApplyReal))
	sb.WriteString(fmt.Sprintf("| OK | %v |\n", r.OK))
	if r.Blocked {
		sb.WriteString(fmt.Sprintf("| Blocked | ⚠️ true |\n"))
		sb.WriteString(fmt.Sprintf("| Block Reason | %s |\n", redactSecrets(r.BlockReason)))
	}
	if r.Error != "" {
		sb.WriteString(fmt.Sprintf("| Error | %s |\n", redactSecrets(r.Error)))
	}
	sb.WriteString("\n")

	// Repository
	sb.WriteString("## Repository\n\n")
	sb.WriteString(fmt.Sprintf("| Field | Value |\n|---|---|\n"))
	sb.WriteString(fmt.Sprintf("| Root | `%s` |\n", r.Root))
	sb.WriteString(fmt.Sprintf("| Owner | %s |\n", r.Owner))
	sb.WriteString(fmt.Sprintf("| Repo | %s |\n", r.Repo))
	sb.WriteString(fmt.Sprintf("| Remote | %s |\n", r.Remote))
	sb.WriteString("\n")

	// PR Plan
	sb.WriteString("## PR Plan\n\n")
	sb.WriteString(fmt.Sprintf("| Field | Value |\n|---|---|\n"))
	sb.WriteString(fmt.Sprintf("| Mission ID | %s |\n", r.MissionID))
	sb.WriteString(fmt.Sprintf("| Issue Type | %s |\n", r.IssueType))
	sb.WriteString(fmt.Sprintf("| Base Branch | `%s` |\n", r.BaseBranch))
	sb.WriteString(fmt.Sprintf("| Work Branch | `%s` |\n", r.WorkBranch))
	sb.WriteString("\n")

	sb.WriteString("### Changed Files\n\n")
	if len(r.ChangedFiles) == 0 {
		sb.WriteString("_(none)_\n")
	} else {
		for _, f := range r.ChangedFiles {
			sb.WriteString(fmt.Sprintf("- `%s`\n", f))
		}
	}
	sb.WriteString("\n")

	// Gates
	sb.WriteString("## Gates\n\n")
	sb.WriteString("| Gate | Passed |\n|---|---|\n")
	for gate, passed := range r.Gates {
		icon := "✅"
		if !passed {
			icon = "❌"
		}
		sb.WriteString(fmt.Sprintf("| %s | %s |\n", gate, icon))
	}
	sb.WriteString("\n")

	// Requested actions
	sb.WriteString("## Requested Actions\n\n")
	sb.WriteString(fmt.Sprintf("| Action | Requested |\n|---|---|\n"))
	sb.WriteString(fmt.Sprintf("| Publish Remote | %v |\n", r.PublishRemote))
	sb.WriteString(fmt.Sprintf("| Open PR | %v |\n", r.OpenPR))
	sb.WriteString(fmt.Sprintf("| Publish Status | %v |\n", r.PublishStatus))
	sb.WriteString("\n")

	// Execution result
	sb.WriteString("## Execution Result\n\n")
	if r.Result == nil {
		sb.WriteString("_(no result — dry-run simulation without local git)_\n")
	} else {
		resultJSON, _ := json.MarshalIndent(r.Result, "", "  ")
		safe := redactSecrets(string(resultJSON))
		sb.WriteString("```json\n")
		sb.WriteString(safe)
		sb.WriteString("\n```\n")
	}
	sb.WriteString("\n")

	// Artifacts
	sb.WriteString("## Artifacts\n\n")
	if r.JSONPath != "" {
		sb.WriteString(fmt.Sprintf("- JSON: `%s`\n", r.JSONPath))
	}
	if r.MarkdownPath != "" {
		sb.WriteString(fmt.Sprintf("- Markdown: `%s`\n", r.MarkdownPath))
	}
	if r.JSONPath == "" && r.MarkdownPath == "" {
		sb.WriteString("_(no artifacts generated)_\n")
	}
	sb.WriteString("\n")

	// Safety notes
	sb.WriteString("## Safety Notes\n\n")
	if r.DryRun {
		sb.WriteString("- ✅ **Dry-run mode**: no external effects. No push, no PR, no status published.\n")
	} else {
		sb.WriteString("- ⚠️ **Real mode**: external effects may have occurred.\n")
	}
	sb.WriteString("- ✅ Tokens and credentials are never stored in this report.\n")
	sb.WriteString("- ✅ PASS GOLD and PASS SECURE gates required for real execution.\n")
	sb.WriteString("- ✅ No automatic merge. Branch: `vision/remediation/*` only.\n")
	sb.WriteString("\n")

	return redactSecrets(sb.String())
}

// ─── Redaction ────────────────────────────────────────────────────────────────

// redactSecrets removes known secret patterns from s.
// Mirrors the logic in internal/github/redact.go to avoid import cycle.
func redactSecrets(s string) string {
	patterns := []string{
		"ghp_", "github_pat_", "x-access-token", "Authorization: Bearer",
		"ghs_", "ghr_",
	}
	// Also redact the actual GITHUB_TOKEN value if set
	if tok := os.Getenv("GITHUB_TOKEN"); tok != "" && len(tok) > 4 {
		s = strings.ReplaceAll(s, tok, "[REDACTED_TOKEN]")
	}
	for _, p := range patterns {
		idx := strings.Index(s, p)
		for idx >= 0 {
			// Find end of token-like string (alphanumeric + _-)
			end := idx + len(p)
			for end < len(s) && isTokenChar(s[end]) {
				end++
			}
			s = s[:idx] + "[REDACTED]" + s[end:]
			idx = strings.Index(s, p)
		}
	}
	return s
}

func isTokenChar(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
		(c >= '0' && c <= '9') || c == '_' || c == '-'
}
