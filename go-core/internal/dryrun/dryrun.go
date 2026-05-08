// Package dryrun implements V8.2 dry-run simulation tools.
// All functions are strictly read-only — no files, git ops, network, or patches.
package dryrun

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const Version = "V8.2"

type RiskLevel string

const (
	RiskLow      RiskLevel = "low"
	RiskMedium   RiskLevel = "medium"
	RiskHigh     RiskLevel = "high"
	RiskCritical RiskLevel = "critical"
)

// riskOrder maps RiskLevel to numeric value for comparison.
var riskOrder = map[RiskLevel]int{
	RiskLow: 0, RiskMedium: 1, RiskHigh: 2, RiskCritical: 3,
}

func riskAtLeast(r, level RiskLevel) bool {
	return riskOrder[r] >= riskOrder[level]
}

func maxRisk(a, b RiskLevel) RiskLevel {
	if riskOrder[a] >= riskOrder[b] {
		return a
	}
	return b
}

func riskScore(r RiskLevel) int {
	switch r {
	case RiskLow:
		return 15
	case RiskMedium:
		return 40
	case RiskHigh:
		return 75
	case RiskCritical:
		return 100
	default:
		return 50
	}
}

// ── Path risk assessment ──────────────────────────────────────────────────────

var dangerousDirSegments = []string{
	".git", "node_modules", "vendor", "bin", "dist",
	"build", ".next", ".vision-memory", ".vision-snapshots",
}

var dangerousExtensions = []string{
	".key", ".pem", ".crt", ".pfx", ".p12", ".der",
	".exe", ".dll", ".so", ".dylib",
	".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
}

func assessPathRisk(p string) (RiskLevel, []string) {
	if p == "" {
		return RiskLow, nil
	}

	var reasons []string
	risk := RiskLow
	norm := filepath.ToSlash(filepath.Clean(p))

	// Path traversal or absolute path
	if strings.HasPrefix(norm, "../") || norm == ".." ||
		strings.Contains(norm, "/../") || filepath.IsAbs(p) {
		reasons = append(reasons, fmt.Sprintf("path traversal or absolute path: %q", p))
		return RiskCritical, reasons
	}

	parts := strings.Split(norm, "/")
	base := parts[len(parts)-1]
	baseLower := strings.ToLower(base)

	// Dangerous directory segments (not the filename)
	for _, part := range parts[:len(parts)-1] {
		for _, danger := range dangerousDirSegments {
			if strings.EqualFold(part, danger) {
				reasons = append(reasons, fmt.Sprintf("dangerous directory segment: %q", danger))
				risk = maxRisk(risk, RiskHigh)
			}
		}
	}

	// Dangerous file names
	if baseLower == ".env" || strings.HasPrefix(baseLower, ".env.") {
		reasons = append(reasons, fmt.Sprintf("dangerous file name: %q", base))
		risk = maxRisk(risk, RiskCritical)
	}
	for _, dname := range []string{"id_rsa", "id_ed25519", "id_ecdsa"} {
		if baseLower == dname {
			reasons = append(reasons, fmt.Sprintf("dangerous file name: %q", base))
			risk = maxRisk(risk, RiskCritical)
		}
	}

	// Dangerous extensions
	ext := strings.ToLower(filepath.Ext(base))
	for _, dext := range dangerousExtensions {
		if ext == dext {
			reasons = append(reasons, fmt.Sprintf("dangerous extension: %q", ext))
			risk = maxRisk(risk, RiskHigh)
		}
	}

	// Secrets in name
	lowerNorm := strings.ToLower(norm)
	if strings.Contains(lowerNorm, "secret") ||
		strings.Contains(lowerNorm, "password") ||
		strings.Contains(lowerNorm, "credential") {
		reasons = append(reasons, "file name suggests sensitive content")
		risk = maxRisk(risk, RiskHigh)
	}

	return risk, reasons
}

// ── ApplyPatch ────────────────────────────────────────────────────────────────

type ApplyPatchInput struct {
	Root    string `json:"root"`
	File    string `json:"file"`
	Find    string `json:"find"`
	Replace string `json:"replace"`
	Mode    string `json:"mode"`
}

type ApplyPatchResult struct {
	DryRun             bool      `json:"dry_run"`
	ReadOnly           bool      `json:"read_only"`
	WouldApply         bool      `json:"would_apply"`
	File               string    `json:"file"`
	Mode               string    `json:"mode"`
	RiskLevel          RiskLevel `json:"risk_level"`
	Blocked            bool      `json:"blocked"`
	BlockedReasons     []string  `json:"blocked_reasons"`
	ValidationHints    []string  `json:"validation_hints"`
	PassGoldRequired   bool      `json:"pass_gold_required"`
	PassSecureRequired bool      `json:"pass_secure_required"`
	Version            string    `json:"version"`
}

func DryRunApplyPatch(input ApplyPatchInput) ApplyPatchResult {
	mode := input.Mode
	if mode == "" {
		mode = "exact_match"
	}
	result := ApplyPatchResult{
		DryRun:             true,
		ReadOnly:           true,
		File:               input.File,
		Mode:               mode,
		PassGoldRequired:   true,
		PassSecureRequired: true,
		BlockedReasons:     []string{},
		ValidationHints:    []string{},
		Version:            Version,
	}

	var blocked bool
	var reasons []string
	risk := RiskLow

	validModes := map[string]bool{"exact_match": true, "normalized_match": true, "line_anchor_match": true}
	if !validModes[mode] {
		reasons = append(reasons, fmt.Sprintf("unknown mode %q", mode))
		blocked = true
	}

	if input.File == "" {
		reasons = append(reasons, "file path is required")
		blocked = true
	}

	if input.File != "" {
		pathRisk, pathReasons := assessPathRisk(input.File)
		risk = maxRisk(risk, pathRisk)
		reasons = append(reasons, pathReasons...)
		if riskAtLeast(pathRisk, RiskHigh) {
			blocked = true
		}
	}

	// Check file content (read-only) — only if not already blocked and root given
	if !blocked && input.Root != "" && input.File != "" {
		target := filepath.Join(input.Root, filepath.FromSlash(input.File))
		if _, err := os.Stat(target); os.IsNotExist(err) {
			reasons = append(reasons, fmt.Sprintf("file not found: %q", input.File))
			blocked = true
		} else if err == nil {
			raw, rerr := os.ReadFile(target)
			if rerr != nil {
				reasons = append(reasons, "cannot read file for validation")
				blocked = true
			} else {
				content := string(raw)
				if input.Find == "" {
					reasons = append(reasons, "find string is empty")
					blocked = true
				} else if strings.Contains(content, input.Find) {
					result.WouldApply = true
					result.ValidationHints = append(result.ValidationHints, "find string present — patch would match")
				} else {
					result.ValidationHints = append(result.ValidationHints, "find string not present — patch would not match")
				}
				if len(raw) > 100_000 {
					result.ValidationHints = append(result.ValidationHints, "large file — patch may have wide impact")
					risk = maxRisk(risk, RiskMedium)
				}
			}
		}
	}

	result.Blocked = blocked
	result.RiskLevel = risk
	result.BlockedReasons = reasons
	if blocked {
		result.WouldApply = false
	}
	return result
}

// ── WriteFile ─────────────────────────────────────────────────────────────────

type WriteFileInput struct {
	Root      string `json:"root"`
	File      string `json:"file"`
	Content   string `json:"content"`
	Operation string `json:"operation"`
}

type WriteFileResult struct {
	DryRun             bool      `json:"dry_run"`
	ReadOnly           bool      `json:"read_only"`
	WouldWrite         bool      `json:"would_write"`
	Operation          string    `json:"operation"`
	File               string    `json:"file"`
	RiskLevel          RiskLevel `json:"risk_level"`
	Blocked            bool      `json:"blocked"`
	BlockedReasons     []string  `json:"blocked_reasons"`
	PassGoldRequired   bool      `json:"pass_gold_required"`
	PassSecureRequired bool      `json:"pass_secure_required"`
	Version            string    `json:"version"`
}

func DryRunWriteFile(input WriteFileInput) WriteFileResult {
	op := input.Operation
	if op == "" {
		op = "create"
	}
	result := WriteFileResult{
		DryRun:             true,
		ReadOnly:           true,
		File:               input.File,
		Operation:          op,
		PassGoldRequired:   true,
		PassSecureRequired: true,
		BlockedReasons:     []string{},
		Version:            Version,
	}

	var blocked bool
	var reasons []string
	risk := RiskLow

	validOps := map[string]bool{"create": true, "overwrite": true, "append": true}
	if !validOps[op] {
		reasons = append(reasons, fmt.Sprintf("unknown operation %q", op))
		blocked = true
	}

	if input.File == "" {
		reasons = append(reasons, "file path is required")
		blocked = true
	}

	if input.File != "" {
		pathRisk, pathReasons := assessPathRisk(input.File)
		risk = maxRisk(risk, pathRisk)
		reasons = append(reasons, pathReasons...)
		if riskAtLeast(pathRisk, RiskHigh) {
			blocked = true
		}
	}

	// Secret content check
	lower := strings.ToLower(input.Content)
	if strings.Contains(lower, "ghp_") || strings.Contains(lower, "github_pat_") ||
		strings.Contains(lower, "aws_secret") || strings.Contains(lower, "password=") {
		risk = RiskCritical
		reasons = append(reasons, "content contains sensitive data (token/secret pattern)")
		blocked = true
	}

	// Overwrite/append on existing file raises risk
	if !blocked && input.Root != "" && input.File != "" {
		target := filepath.Join(input.Root, filepath.FromSlash(input.File))
		if _, err := os.Stat(target); err == nil {
			if op == "overwrite" || op == "append" {
				risk = maxRisk(risk, RiskMedium)
			}
		}
	}

	result.Blocked = blocked
	result.RiskLevel = risk
	result.BlockedReasons = reasons
	result.WouldWrite = !blocked
	return result
}

// ── GitHubFlow ────────────────────────────────────────────────────────────────

type GitHubFlowInput struct {
	MissionID    string   `json:"mission_id"`
	IssueType    string   `json:"issue_type"`
	BaseBranch   string   `json:"base_branch"`
	WorkBranch   string   `json:"work_branch"`
	Title        string   `json:"title"`
	ChangedFiles []string `json:"changed_files"`
}

type GitHubFlowResult struct {
	DryRun             bool     `json:"dry_run"`
	ReadOnly           bool     `json:"read_only"`
	WouldCreateBranch  bool     `json:"would_create_branch"`
	WouldCommit        bool     `json:"would_commit"`
	WouldPush          bool     `json:"would_push"`
	WouldOpenPR        bool     `json:"would_open_pr"`
	WouldPublishStatus bool     `json:"would_publish_status"`
	Blocked            bool     `json:"blocked"`
	BlockedReasons     []string `json:"blocked_reasons"`
	RequiredGates      []string `json:"required_gates"`
	WorkBranch         string   `json:"work_branch"`
	BaseBranch         string   `json:"base_branch"`
	ChangedFilesCount  int      `json:"changed_files_count"`
	Version            string   `json:"version"`
}

func DryRunGitHubFlow(input GitHubFlowInput) GitHubFlowResult {
	wb := input.WorkBranch
	if wb == "" && input.MissionID != "" {
		wb = "vision/remediation/" + input.MissionID
	}
	bb := input.BaseBranch
	if bb == "" {
		bb = "v6-go-enterprise-runtime"
	}

	result := GitHubFlowResult{
		DryRun:         true,
		ReadOnly:       true,
		RequiredGates:  []string{"PASS_GOLD", "PASS_SECURE"},
		WorkBranch:     wb,
		BaseBranch:     bb,
		BlockedReasons: []string{},
		Version:        Version,
	}

	var blocked bool
	var reasons []string

	if wb == "" {
		reasons = append(reasons, "work_branch or mission_id is required")
		blocked = true
	}
	if wb != "" && wb == bb {
		reasons = append(reasons, "work_branch must differ from base_branch")
		blocked = true
	}
	if bb == "main" || bb == "master" {
		reasons = append(reasons, fmt.Sprintf("base_branch %q is not allowed", bb))
		blocked = true
	}
	if len(input.ChangedFiles) == 0 {
		reasons = append(reasons, "changed_files is required")
		blocked = true
	}
	for _, f := range input.ChangedFiles {
		pathRisk, pathReasons := assessPathRisk(f)
		if riskAtLeast(pathRisk, RiskHigh) {
			reasons = append(reasons, pathReasons...)
			blocked = true
		}
	}

	result.ChangedFilesCount = len(input.ChangedFiles)
	result.Blocked = blocked
	result.BlockedReasons = reasons

	if !blocked {
		result.WouldCreateBranch = true
		result.WouldCommit = true
		result.WouldPush = true
		result.WouldOpenPR = true
		result.WouldPublishStatus = true
	}
	return result
}

// ── Mission ───────────────────────────────────────────────────────────────────

type MissionInput struct {
	Input string `json:"input"`
	Root  string `json:"root"`
	Mode  string `json:"mode"`
}

type MissionResult struct {
	DryRun            bool     `json:"dry_run"`
	ReadOnly          bool     `json:"read_only"`
	WouldScan         bool     `json:"would_scan"`
	WouldDiagnose     bool     `json:"would_diagnose"`
	WouldPatch        bool     `json:"would_patch"`
	WouldValidate     bool     `json:"would_validate"`
	WouldCreateReport bool     `json:"would_create_report"`
	Agents            []string `json:"agents"`
	RiskHints         []string `json:"risk_hints"`
	Blocked           bool     `json:"blocked"`
	BlockedReasons    []string `json:"blocked_reasons"`
	Mode              string   `json:"mode"`
	Version           string   `json:"version"`
}

func DryRunMission(input MissionInput) MissionResult {
	mode := input.Mode
	if mode == "" {
		mode = "analysis"
	}
	result := MissionResult{
		DryRun:         true,
		ReadOnly:       true,
		Mode:           mode,
		Agents:         []string{"Scanner", "Hermes", "PatchEngine", "Aegis", "PASS GOLD"},
		RiskHints:      []string{},
		BlockedReasons: []string{},
		Version:        Version,
	}

	if input.Input == "" {
		result.Blocked = true
		result.BlockedReasons = []string{"input text is required"}
		return result
	}

	result.WouldScan = true
	result.WouldDiagnose = true
	result.WouldValidate = true
	result.WouldPatch = false        // never in dry-run
	result.WouldCreateReport = false // never in dry-run

	lower := strings.ToLower(input.Input)
	if strings.Contains(lower, "deploy") || strings.Contains(lower, "production") {
		result.RiskHints = append(result.RiskHints, "input mentions deploy/production — requires PASS GOLD + PASS SECURE")
	}
	if strings.Contains(lower, "delete") || strings.Contains(lower, "remove") || strings.Contains(lower, "drop") {
		result.RiskHints = append(result.RiskHints, "input mentions destructive operation — high caution required")
	}
	if strings.Contains(lower, "cors") {
		result.RiskHints = append(result.RiskHints, "CORS issue — Scanner identifies endpoints; Hermes classifies severity")
	}
	if strings.Contains(lower, "secret") || strings.Contains(lower, "token") || strings.Contains(lower, "password") {
		result.RiskHints = append(result.RiskHints, "input mentions secrets/credentials — security scanner invoked")
	}
	if len(result.RiskHints) == 0 {
		result.RiskHints = append(result.RiskHints, "no elevated risk signals detected in input")
	}
	return result
}

// ── RiskAssessment ────────────────────────────────────────────────────────────

type RiskAssessmentInput struct {
	Files       []string `json:"files"`
	Operation   string   `json:"operation"`
	Description string   `json:"description"`
}

type RiskAssessmentResult struct {
	DryRun          bool      `json:"dry_run"`
	ReadOnly        bool      `json:"read_only"`
	RiskLevel       RiskLevel `json:"risk_level"`
	RiskScore       int       `json:"risk_score"`
	Blocked         bool      `json:"blocked"`
	BlockedReasons  []string  `json:"blocked_reasons"`
	SecurityHints   []string  `json:"security_hints"`
	ValidationHints []string  `json:"validation_hints"`
	RequiredGates   []string  `json:"required_gates"`
	Version         string    `json:"version"`
}

func DryRunRiskAssessment(input RiskAssessmentInput) RiskAssessmentResult {
	result := RiskAssessmentResult{
		DryRun:          true,
		ReadOnly:        true,
		RequiredGates:   []string{"PASS_GOLD", "PASS_SECURE"},
		BlockedReasons:  []string{},
		SecurityHints:   []string{},
		ValidationHints: []string{},
		Version:         Version,
	}

	var blocked bool
	var reasons, secHints, valHints []string
	risk := RiskLow

	validOps := map[string]bool{
		"patch": true, "write": true, "github_flow": true, "mission": true, "deploy": true,
	}
	if input.Operation == "" {
		reasons = append(reasons, "operation is required")
		blocked = true
	} else if !validOps[input.Operation] {
		reasons = append(reasons, fmt.Sprintf("unknown operation %q", input.Operation))
		blocked = true
	}

	if input.Operation == "deploy" {
		risk = maxRisk(risk, RiskHigh)
		secHints = append(secHints, "deploy requires PASS GOLD + PASS SECURE")
		blocked = true
		reasons = append(reasons, "deploy is blocked in dry-run MCP control plane")
	}

	for _, f := range input.Files {
		pathRisk, pathReasons := assessPathRisk(f)
		risk = maxRisk(risk, pathRisk)
		if riskAtLeast(pathRisk, RiskHigh) {
			blocked = true
			reasons = append(reasons, pathReasons...)
			secHints = append(secHints, fmt.Sprintf("dangerous path: %q", f))
		} else if pathRisk == RiskMedium {
			valHints = append(valHints, fmt.Sprintf("elevated risk path: %q", f))
		}
	}

	if len(input.Files) == 0 {
		valHints = append(valHints, "no files specified — provide files for more accurate assessment")
	}

	if input.Description != "" {
		lower := strings.ToLower(input.Description)
		if strings.Contains(lower, "token") || strings.Contains(lower, "secret") ||
			strings.Contains(lower, "password") {
			risk = maxRisk(risk, RiskHigh)
			secHints = append(secHints, "description mentions sensitive data")
			blocked = true
			reasons = append(reasons, "description suggests secrets/credentials")
		}
		if strings.Contains(lower, "delete") || strings.Contains(lower, "drop") || strings.Contains(lower, "truncate") {
			risk = maxRisk(risk, RiskHigh)
			secHints = append(secHints, "description mentions destructive operation")
		}
	}

	result.Blocked = blocked
	result.RiskLevel = risk
	result.RiskScore = riskScore(risk)
	result.BlockedReasons = reasons
	result.SecurityHints = secHints
	result.ValidationHints = valHints
	return result
}
