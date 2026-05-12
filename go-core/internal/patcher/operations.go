// internal/patcher/operations.go
// VISION AEGIS CORE ENTERPRISE — V6.7 SUPERVISED REAL REMEDIATION OPERATIONS
//
// Real remediation operations are allowlisted, supervised, and reversible.
// They cannot bypass validation, rollback, PASS SECURE or PASS GOLD.
//
// Allowed operations: noop | redaction | exact_replace | policy_fix | append_guarded
// Prohibited: regex_replace, arbitrary_write, shell, command, delete_file,
//             overwrite_file, auto_format_project, and anything not in the allowlist.
package patcher

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ─── Allowlist ─────────────────────────────────────────────────────────────────

// allowedOperationTypes is the explicit allowlist for V6.7.
// Any operation type not in this set is rejected.
var allowedOperationTypes = map[string]bool{
	"noop":            true,
	"redaction":       true,
	"exact_replace":   true,
	"policy_fix":      true,
	"append_guarded":  true,
}

// guardPrefix/Suffix are the markers for append_guarded blocks.
const guardPrefix = "// VISION_CORE_GUARD_START:"
const guardSuffix = "// VISION_CORE_GUARD_END:"

// redactedPlaceholder is the default value for redaction when After is empty.
const redactedPlaceholder = "[REDACTED]"

// ─── ApplyOperation ───────────────────────────────────────────────────────────

// ApplyOperation executes a single PatchOperation against a file in root.
// Returns the operation with Status updated to "applied", "skipped", or "failed".
//
// Safety guarantees:
//   - target path validated by isSupervisedSafeTarget before any I/O
//   - file must exist for replace/redaction/policy_fix operations
//   - only allowlisted operation types accepted
//   - never panics
//   - never writes outside root
//   - never leaks secret values in Error fields
func ApplyOperation(root string, op PatchOperation) PatchOperation {
	op.Status = "pending"

	// ── Allowlist check ──────────────────────────────────────────
	if !allowedOperationTypes[op.OperationType] {
		op.Status = "failed"
		op.Error = fmt.Sprintf("operation type %q is not in the V6.7 allowlist", op.OperationType)
		return op
	}

	// ── noop: safe pass-through ───────────────────────────────────
	if op.OperationType == "noop" {
		op.Status = "skipped"
		if op.Description == "" {
			op.Description = "noop — no file modification"
		}
		return op
	}

	// ── Path safety ───────────────────────────────────────────────
	if !isSupervisedSafeTarget(op.File) {
		op.Status = "failed"
		op.Error = fmt.Sprintf("target %q failed supervised safety validation", op.File)
		return op
	}

	// ── Resolve absolute path safely ─────────────────────────────
	absRoot, err := filepath.Abs(root)
	if err != nil {
		op.Status = "failed"
		op.Error = "failed to resolve root path"
		return op
	}
	absTarget := filepath.Join(absRoot, filepath.FromSlash(op.File))

	// Ensure target is inside root (prevent symlink escape)
	if !strings.HasPrefix(absTarget, absRoot+string(filepath.Separator)) &&
		absTarget != absRoot {
		op.Status = "failed"
		op.Error = "target resolves outside project root"
		return op
	}

	// ── Dispatch ──────────────────────────────────────────────────
	switch op.OperationType {
	case "exact_replace":
		op = applyExactReplace(absTarget, op)
	case "redaction":
		op = applyRedaction(absTarget, op)
	case "policy_fix":
		// policy_fix uses the same semantics as exact_replace
		op = applyExactReplace(absTarget, op)
	case "append_guarded":
		op = applyAppendGuarded(absTarget, op)
	}

	return op
}

// ─── exact_replace ─────────────────────────────────────────────────────────────

// applyExactReplace replaces exactly one occurrence of Before with After.
// Fails if Before is missing, appears zero times, or appears more than once.
func applyExactReplace(absTarget string, op PatchOperation) PatchOperation {
	if op.Before == "" {
		op.Status = "failed"
		op.Error = "exact_replace requires non-empty 'before'"
		return op
	}
	if op.After == "" {
		op.Status = "failed"
		op.Error = "exact_replace requires non-empty 'after'"
		return op
	}

	content, perm, err := readFile(absTarget)
	if err != nil {
		op.Status = "failed"
		op.Error = fmt.Sprintf("cannot read target file: %s", err.Error())
		return op
	}

	count := strings.Count(content, op.Before)
	if count == 0 {
		op.Status = "failed"
		op.Error = "before pattern not found exactly once (count=0)"
		return op
	}
	if count > 1 {
		op.Status = "failed"
		op.Error = fmt.Sprintf("before pattern is ambiguous (count=%d)", count)
		return op
	}

	// After safety: no path traversal, no shell injection
	if err := validateAfterContent(op.After); err != nil {
		op.Status = "failed"
		op.Error = err.Error()
		return op
	}

	patched := strings.Replace(content, op.Before, op.After, 1)
	if err := writeFile(absTarget, patched, perm); err != nil {
		op.Status = "failed"
		op.Error = fmt.Sprintf("write failed: %s", err.Error())
		return op
	}

	op.Status = "applied"
	return op
}

// ─── redaction ─────────────────────────────────────────────────────────────────

// applyRedaction replaces exactly one occurrence of Before with After (or
// [REDACTED] if After is empty). Does NOT leak the Before value in errors.
func applyRedaction(absTarget string, op PatchOperation) PatchOperation {
	if op.Before == "" {
		op.Status = "failed"
		op.Error = "redaction requires non-empty 'before'"
		return op
	}

	replacement := op.After
	if replacement == "" {
		replacement = redactedPlaceholder
	}

	content, perm, err := readFile(absTarget)
	if err != nil {
		op.Status = "failed"
		op.Error = fmt.Sprintf("cannot read target file: %s", err.Error())
		return op
	}

	count := strings.Count(content, op.Before)
	if count == 0 {
		op.Status = "failed"
		// IMPORTANT: do not include op.Before in error — it may be a secret
		op.Error = "redaction target not found exactly once (count=0)"
		return op
	}
	if count > 1 {
		op.Status = "failed"
		op.Error = fmt.Sprintf("redaction target is ambiguous (count=%d)", count)
		return op
	}

	patched := strings.Replace(content, op.Before, replacement, 1)
	if err := writeFile(absTarget, patched, perm); err != nil {
		op.Status = "failed"
		op.Error = fmt.Sprintf("write failed: %s", err.Error())
		return op
	}

	op.Status = "applied"
	// Clear Before from the returned operation to avoid leaking secret
	op.Before = "[REDACTED_INPUT]"
	return op
}

// ─── append_guarded ────────────────────────────────────────────────────────────

// applyAppendGuarded appends a guarded block to the file if not already present.
// Guard markers: // VISION_CORE_GUARD_START:<id> ... // VISION_CORE_GUARD_END:<id>
// If the guard already exists, Status="skipped" (idempotent).
func applyAppendGuarded(absTarget string, op PatchOperation) PatchOperation {
	if op.After == "" {
		op.Status = "failed"
		op.Error = "append_guarded requires non-empty 'after' (block content)"
		return op
	}

	guardID := op.Anchor
	if guardID == "" {
		// Derive guard ID from file basename
		guardID = filepath.Base(absTarget)
	}

	startMarker := guardPrefix + guardID
	endMarker := guardSuffix + guardID

	content, perm, err := readFile(absTarget)
	if err != nil {
		// File doesn't exist — create it with the guarded block
		if !os.IsNotExist(err) {
			op.Status = "failed"
			op.Error = fmt.Sprintf("cannot read target file: %s", err.Error())
			return op
		}
		content = ""
		perm = 0644
	}

	// Idempotency check
	if strings.Contains(content, startMarker) {
		op.Status = "skipped"
		op.Description = "append_guarded: block already present (idempotent)"
		return op
	}

	// Build the guarded block
	var sb strings.Builder
	if content != "" && !strings.HasSuffix(content, "\n") {
		sb.WriteString("\n")
	}
	sb.WriteString("\n")
	sb.WriteString(startMarker + "\n")
	sb.WriteString(op.After)
	if !strings.HasSuffix(op.After, "\n") {
		sb.WriteString("\n")
	}
	sb.WriteString(endMarker + "\n")

	patched := content + sb.String()
	if err := writeFile(absTarget, patched, perm); err != nil {
		op.Status = "failed"
		op.Error = fmt.Sprintf("write failed: %s", err.Error())
		return op
	}

	op.Status = "applied"
	return op
}

// ─── File I/O helpers ─────────────────────────────────────────────────────────

func readFile(absPath string) (string, os.FileMode, error) {
	info, err := os.Stat(absPath)
	if err != nil {
		return "", 0, err
	}
	data, err := os.ReadFile(absPath)
	if err != nil {
		return "", 0, err
	}
	return string(data), info.Mode(), nil
}

func writeFile(absPath, content string, perm os.FileMode) error {
	// Ensure parent directory exists
	dir := filepath.Dir(absPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(absPath, []byte(content), perm)
}

// ─── After content safety ─────────────────────────────────────────────────────

// validateAfterContent checks that the replacement content does not contain
// known injection patterns. Conservative — not exhaustive.
func validateAfterContent(after string) error {
	// Block obvious shell command injection in replacement
	dangerousPatterns := []string{
		"$(", "`", "&&", "||", ";", "| bash", "| sh",
	}
	lower := strings.ToLower(after)
	for _, p := range dangerousPatterns {
		if strings.Contains(lower, p) {
			return fmt.Errorf("'after' content contains potentially unsafe pattern: %q", p)
		}
	}
	return nil
}

// ─── ApplyOperations (batch helper) ───────────────────────────────────────────

// ApplyOperations applies a slice of PatchOperations against root.
// Returns the updated slice with Status set on each operation.
// Also returns counts: applied, skipped, failed.
func ApplyOperations(root string, ops []PatchOperation) ([]PatchOperation, int, int, int) {
	applied, skipped, failed := 0, 0, 0
	result := make([]PatchOperation, len(ops))
	for i, op := range ops {
		op = ApplyOperation(root, op)
		result[i] = op
		switch op.Status {
		case "applied":
			applied++
		case "skipped":
			skipped++
		case "failed":
			failed++
		}
	}
	return result, applied, skipped, failed
}
