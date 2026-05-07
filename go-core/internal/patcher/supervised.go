// internal/patcher/supervised.go
// VISION AEGIS CORE ENTERPRISE — V6.6 SUPERVISED MULTI-FILE PATCH EXECUTION
//
// REGRA CENTRAL:
//   Patch multi-arquivo só é executado se ApplyMode="supervised".
//   "automatic" não existe nesta versão.
//   Snapshot antes. Rollback pronto. Validator e PASS SECURE/PASS GOLD depois.
//
// Memory-guided patch planning is advisory and supervised.
// It cannot bypass validation, rollback, PASS SECURE or PASS GOLD.
package patcher

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"
)

// ─── Types ────────────────────────────────────────────────────────────────────

// PatchOperation descreve uma operação atômica dentro do plano de execução.
type PatchOperation struct {
	File          string `json:"file"`
	Description   string `json:"description"`
	OperationType string `json:"operation_type"` // append | replace | noop | redaction | policy_fix
	Before        string `json:"before,omitempty"`
	After         string `json:"after,omitempty"`
	Status        string `json:"status"` // pending | applied | skipped | failed
	Error         string `json:"error,omitempty"`
}

// ExecutionPlan descreve o plano de execução supervisionado gerado a partir
// de um PatchPlan da V6.5. Sempre supervised — nunca automatic.
type ExecutionPlan struct {
	ID                 string           `json:"id"`
	MissionID          string           `json:"mission_id"`
	TransactionID      string           `json:"transaction_id"`
	ApplyMode          string           `json:"apply_mode"` // "supervised" only
	TargetFiles        []string         `json:"target_files"`
	Operations         []PatchOperation `json:"operations"`
	RequiresSnapshot   bool             `json:"requires_snapshot"`
	RequiresRollback   bool             `json:"requires_rollback"`
	RequiresValidation bool             `json:"requires_validation"`
}

// ExecutionResult é o resultado da execução supervisionada multi-arquivo.
type ExecutionResult struct {
	OK            bool             `json:"ok"`
	ExecutionID   string           `json:"execution_id"`
	TransactionID string           `json:"transaction_id"`
	AppliedFiles  []string         `json:"applied_files"`
	SkippedFiles  []string         `json:"skipped_files"`
	FailedFiles   []string         `json:"failed_files"`
	Operations    []PatchOperation `json:"operations"`
	PatchedFiles  int              `json:"patched_files"`
	TotalFiles    int              `json:"total_files"`
	DurationMs    int64            `json:"duration_ms"`
	Error         string           `json:"error,omitempty"`
}

// ─── ExecutionPlanInput ───────────────────────────────────────────────────────

// ExecutionPlanInput descreve os dados necessários para construir um
// ExecutionPlan a partir do PatchPlan e do contexto da missão.
// Evita import cycle: não depende do pacote planning.
type ExecutionPlanInput struct {
	MissionID    string
	TransactionID string
	ApplyMode    string   // deve ser "supervised"
	TargetFiles  []string // já validados pelo planning.IsSafeTarget
	Root         string
	DryRun       bool
}

// ─── ExecuteSupervisedMultiFile ───────────────────────────────────────────────

// ExecuteSupervisedMultiFile executa um plano de patch em múltiplos arquivos
// em modo supervisionado com snapshot, transação e rollback.
//
// Rejeita imediatamente se:
//   - ApplyMode != "supervised"
//   - ApplyMode vazio
//   - qualquer target falhar na validação de path seguro
//
// Comportamento:
//   - targets seguros recebem operação de auditoria segura (append)
//   - targets inválidos são marcados como skipped
//   - se não houver targets válidos, usa sentinel
//   - transaction_id preservado do input
//   - retorna applied/skipped/failed separados
func ExecuteSupervisedMultiFile(root string, planInput ExecutionPlanInput, snapshotDir string) ExecutionResult {
	start := time.Now()
	execID := "exec_" + newTxID()

	result := ExecutionResult{
		ExecutionID:   execID,
		TransactionID: planInput.TransactionID,
		AppliedFiles:  []string{},
		SkippedFiles:  []string{},
		FailedFiles:   []string{},
		Operations:    []PatchOperation{},
	}

	// ── Governance gate: only "supervised" allowed ────────────────
	if planInput.ApplyMode == "" {
		result.Error = "execution rejected: apply_mode is empty — only 'supervised' is allowed"
		result.DurationMs = time.Since(start).Milliseconds()
		return result
	}
	if planInput.ApplyMode == "automatic" {
		result.Error = "execution rejected: apply_mode='automatic' is not allowed in V6.6"
		result.DurationMs = time.Since(start).Milliseconds()
		return result
	}
	if planInput.ApplyMode != "supervised" {
		result.Error = fmt.Sprintf("execution rejected: unknown apply_mode %q — only 'supervised' is allowed", planInput.ApplyMode)
		result.DurationMs = time.Since(start).Milliseconds()
		return result
	}

	// ── Validate and partition target files ────────────────────────
	var validTargets []string
	for _, f := range planInput.TargetFiles {
		if !isSupervisedSafeTarget(f) {
			op := PatchOperation{
				File:          f,
				OperationType: "noop",
				Status:        "skipped",
				Description:   "path failed supervised safety validation",
				Error:         fmt.Sprintf("target %q discarded: failed supervised safety validation", f),
			}
			result.Operations = append(result.Operations, op)
			result.SkippedFiles = append(result.SkippedFiles, f)
			continue
		}
		validTargets = append(validTargets, f)
	}

	// ── Fallback to sentinel if no valid targets ───────────────────
	const sentinel = ".vision-test/mission.sentinel"
	if len(validTargets) == 0 {
		validTargets = []string{sentinel}
		op := PatchOperation{
			File:          sentinel,
			OperationType: "noop",
			Status:        "pending",
			Description:   "no valid production targets — fallback to safe sentinel",
		}
		result.Operations = append(result.Operations, op)
	}

	result.TotalFiles = len(validTargets)

	// ── Build BatchPlan from valid targets ────────────────────────
	txID := planInput.TransactionID
	if txID == "" {
		txID = newTxID()
		result.TransactionID = txID
	}

	var filePlans []FilePlan
	for _, target := range validTargets {
		filePlans = append(filePlans, FilePlan{
			File: target,
			Ops: []Op{
				{
					Type: "append",
					// Audit trail append — safe noop that records supervised execution.
					// V6.7 will introduce concrete remediation operations.
					Content: fmt.Sprintf("\n// [AEGIS-V6.6] supervised execution: exec_id=%s tx=%s\n",
						execID, txID),
				},
			},
		})
	}

	batch := BatchPlan{
		MissionID:   planInput.MissionID,
		Files:       filePlans,
		DryRun:      planInput.DryRun,
		Description: fmt.Sprintf("supervised multi-file execution %s", execID),
	}

	// ── Execute via existing transactional BatchPlan ───────────────
	batchRes := ApplyBatch(root, batch, snapshotDir)

	// ── Map BatchResult to ExecutionResult ────────────────────────
	for i, fr := range batchRes.FileResults {
		var opStatus string
		var opErr string
		if fr.OK {
			opStatus = "applied"
			result.AppliedFiles = append(result.AppliedFiles, fr.File)
			result.PatchedFiles++
		} else {
			opStatus = "failed"
			opErr = fr.Error
			result.FailedFiles = append(result.FailedFiles, fr.File)
		}

		// Find or create matching operation
		desc := "supervised audit append"
		if i < len(validTargets) && validTargets[i] == sentinel {
			desc = "safe sentinel audit append (fallback)"
		}
		op := PatchOperation{
			File:          fr.File,
			OperationType: "append",
			Status:        opStatus,
			Description:   desc,
			Error:         opErr,
		}
		// Update existing operation if sentinel was pre-created
		replaced := false
		for j, existing := range result.Operations {
			if existing.File == fr.File && existing.Status == "pending" {
				result.Operations[j] = op
				replaced = true
				break
			}
		}
		if !replaced {
			result.Operations = append(result.Operations, op)
		}
	}

	result.OK = batchRes.OK && len(result.FailedFiles) == 0
	if !batchRes.OK && batchRes.Error != "" {
		result.Error = batchRes.Error
	}
	result.DurationMs = time.Since(start).Milliseconds()
	return result
}

// ─── BuildExecutionPlan ───────────────────────────────────────────────────────

// BuildExecutionPlan constrói um ExecutionPlan a partir de um ExecutionPlanInput.
// Valida apply_mode e paths antes de criar o plano.
func BuildExecutionPlan(planInput ExecutionPlanInput) ExecutionPlan {
	txID := planInput.TransactionID
	if txID == "" {
		txID = newTxID()
	}

	var safeTargets []string
	var ops []PatchOperation

	for _, f := range planInput.TargetFiles {
		if isSupervisedSafeTarget(f) {
			safeTargets = append(safeTargets, f)
			ops = append(ops, PatchOperation{
				File:          f,
				OperationType: "append",
				Status:        "pending",
				Description:   "supervised audit append",
			})
		} else {
			ops = append(ops, PatchOperation{
				File:          f,
				OperationType: "noop",
				Status:        "skipped",
				Description:   "path failed safety validation",
			})
		}
	}

	if len(safeTargets) == 0 {
		safeTargets = []string{".vision-test/mission.sentinel"}
		ops = append(ops, PatchOperation{
			File:          ".vision-test/mission.sentinel",
			OperationType: "noop",
			Status:        "pending",
			Description:   "no valid targets — sentinel fallback",
		})
	}

	return ExecutionPlan{
		ID:                 "eplan_" + newTxID(),
		MissionID:          planInput.MissionID,
		TransactionID:      txID,
		ApplyMode:          planInput.ApplyMode,
		TargetFiles:        safeTargets,
		Operations:         ops,
		RequiresSnapshot:   true,
		RequiresRollback:   true,
		RequiresValidation: true,
	}
}

// ─── Path safety for supervised execution ─────────────────────────────────────

// isSupervisedSafeTarget applies the same rules as planning.IsSafeTarget
// but is duplicated here to avoid import cycle (patcher → planning → memory).
// Both must be kept in sync. See planning.IsSafeTarget for canonical version.
func isSupervisedSafeTarget(path string) bool {
	raw := strings.TrimSpace(path)
	if raw == "" {
		return false
	}
	if filepath.IsAbs(raw) {
		return false
	}
	cleaned := filepath.ToSlash(filepath.Clean(raw))
	if cleaned == "." || cleaned == "" {
		return false
	}
	if strings.HasPrefix(cleaned, "/") {
		return false
	}
	if strings.Contains(cleaned, "..") {
		return false
	}
	if strings.HasSuffix(cleaned, "_test.go") {
		return false
	}
	blocked := map[string]bool{
		".git":              true,
		".vision-memory":    true,
		".vision-snapshots": true,
		"node_modules":      true,
		"vendor":            true,
		"dist":              true,
		"build":             true,
		".next":             true,
	}
	for _, part := range strings.Split(cleaned, "/") {
		if blocked[part] {
			return false
		}
	}
	return true
}
