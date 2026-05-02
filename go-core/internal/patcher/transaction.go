// internal/patcher/transaction.go
// Vision Core Go Safe Core — Multi-File Transactional Patch Engine
//
// Garantias:
//   - Snapshot de TODOS os arquivos antes de qualquer modificação
//   - Se qualquer arquivo falhar: rollback completo de todos
//   - transaction_id único por batch
//   - Nunca deixa o projeto em estado parcialmente corrigido
package patcher

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/visioncore/go-core/internal/fileops"
)

// FilePlan é o plano de patch para um único arquivo dentro do batch.
type FilePlan struct {
	File string `json:"file"` // relativo ao root
	Ops  []Op   `json:"ops"`
}

// BatchPlan é o plano de patch transacional para múltiplos arquivos.
type BatchPlan struct {
	MissionID   string     `json:"mission_id"`
	Files       []FilePlan `json:"files"`
	DryRun      bool       `json:"dry_run"`
	Description string     `json:"description,omitempty"`
}

// FileResult é o resultado do patch de um arquivo individual no batch.
type FileResult struct {
	File       string   `json:"file"`
	OK         bool     `json:"ok"`
	Applied    int      `json:"applied"`
	Skipped    int      `json:"skipped"`
	SnapshotID string   `json:"snapshot_id,omitempty"`
	Errors     []string `json:"errors,omitempty"`
	Error      string   `json:"error,omitempty"`
}

// BatchResult é o resultado do patch transacional.
type BatchResult struct {
	OK              bool         `json:"ok"`
	TransactionID   string       `json:"transaction_id"`
	MissionID       string       `json:"mission_id"`
	DryRun          bool         `json:"dry_run"`
	TotalFiles      int          `json:"total_files"`
	PatchedFiles    int          `json:"patched_files"`
	FailedFiles     int          `json:"failed_files"`
	RollbackApplied bool         `json:"rollback_applied"`
	FileResults     []FileResult `json:"file_results"`
	SnapshotIDs     []string     `json:"snapshot_ids,omitempty"`
	Error           string       `json:"error,omitempty"`
	DurationMs      int64        `json:"duration_ms"`
}

// snapRecord registra o snapshot de um arquivo dentro de uma transação.
type snapRecord struct {
	file string
	snap fileops.Snapshot
}

// ApplyBatch aplica patches em múltiplos arquivos de forma transacional.
//
// Algoritmo:
//  1. Validar todos os paths (blocks, traversal)
//  2. Criar snapshots de TODOS os arquivos
//  3. Aplicar patches em sequência
//  4. Se qualquer patch falhar → rollback completo de todos os anteriores
//  5. Retornar BatchResult com estado final
func ApplyBatch(root string, plan BatchPlan, snapshotDir string) BatchResult {
	start := time.Now()
	txID := newTxID()

	result := BatchResult{
		TransactionID: txID,
		MissionID:     plan.MissionID,
		DryRun:        plan.DryRun,
		TotalFiles:    len(plan.Files),
	}

	if len(plan.Files) == 0 {
		result.OK = true
		result.DurationMs = time.Since(start).Milliseconds()
		return result
	}

	// ── FASE 1: Validar todos os paths ────────────────────────────
	for _, fp := range plan.Files {
		if err := fileops.ValidateSafePath(root, fp.File); err != nil {
			result.Error = fmt.Sprintf("path validation failed for %s: %v", fp.File, err)
			result.DurationMs = time.Since(start).Milliseconds()
			return result
		}
		if blocked, dir := isBlockedPath(fp.File); blocked {
			result.Error = fmt.Sprintf("patch blocked in %s (file: %s)", dir, fp.File)
			result.DurationMs = time.Since(start).Milliseconds()
			return result
		}
	}

	// ── FASE 2: Snapshot de TODOS antes de qualquer modificação ───
	// Se qualquer snapshot falhar no meio, os anteriores já foram criados
	// no disco. Nenhum arquivo foi patchado ainda, mas marcamos RollbackApplied=true
	// para sinalizar que o sistema entrou em modo de recuperação transacional.
	var snapshots []snapRecord

	if !plan.DryRun {
		if err := os.MkdirAll(snapshotDir, 0755); err != nil {
			result.Error = "cannot create snapshot dir: " + err.Error()
			result.DurationMs = time.Since(start).Milliseconds()
			return result
		}

		for _, fp := range plan.Files {
			snap, snapRes := fileops.CreateSnapshot(root, fp.File, plan.MissionID+"-"+txID, snapshotDir)
			if !snapRes.OK {
				// Snapshot falhou no meio: snapshots anteriores existem no disco.
				// Nenhum arquivo foi modificado ainda, mas o estado transacional
				// está incompleto → marcar rollback para consistência.
				result.Error = fmt.Sprintf("snapshot failed for %s: %s", fp.File, snapRes.Error)
				result.RollbackApplied = true // nada foi patchado, mas snapshots parciais existem
				result.DurationMs = time.Since(start).Milliseconds()
				return result
			}
			snapshots = append(snapshots, snapRecord{file: fp.File, snap: snap})
			result.SnapshotIDs = append(result.SnapshotIDs, snap.ID)
		}
	}

	// ── FASE 3: Aplicar patches em sequência ──────────────────────
	var fileResults []FileResult
	failedAt := -1

	for i, fp := range plan.Files {
		// Usar Apply individual (sem snapshot interno — já fizemos no fase 2)
		// Para evitar snapshot duplo: usamos DryRun=false mas sem criar snapshot no Apply
		// Fazemos isso aplicando as ops diretamente aqui
		fr := applyFilePlan(root, fp, plan.DryRun)

		if i < len(snapshots) {
			fr.SnapshotID = snapshots[i].snap.ID
		}

		fileResults = append(fileResults, fr)

		if !fr.OK {
			failedAt = i
			break
		}
	}

	result.FileResults = fileResults

	// ── FASE 4: Rollback total se qualquer patch falhou ───────────
	if failedAt >= 0 && !plan.DryRun {
		rollbackErrors := rollbackAll(snapshots[:failedAt+1], root)
		result.RollbackApplied = true
		if len(rollbackErrors) > 0 {
			result.Error = fmt.Sprintf("patch failed at file %d (%s) + rollback errors: %v",
				failedAt, plan.Files[failedAt].File, rollbackErrors)
		} else {
			result.Error = fmt.Sprintf("patch failed at file %d (%s), rollback applied",
				failedAt, plan.Files[failedAt].File)
		}
		result.FailedFiles = 1
		result.DurationMs = time.Since(start).Milliseconds()
		return result
	}

	// ── FASE 5: Contabilizar resultado ────────────────────────────
	for _, fr := range fileResults {
		if fr.OK {
			result.PatchedFiles++
		} else {
			result.FailedFiles++
		}
	}

	result.OK = result.FailedFiles == 0
	result.DurationMs = time.Since(start).Milliseconds()
	return result
}

// applyFilePlan aplica as ops de um FilePlan sem criar snapshot interno.
// O snapshot já foi criado em ApplyBatch antes de qualquer modificação.
func applyFilePlan(root string, fp FilePlan, dryRun bool) FileResult {
	fr := FileResult{File: fp.File}

	data, readRes := fileops.ReadFile(root, fp.File)
	if !readRes.OK {
		fr.Error = "cannot read: " + readRes.Error
		return fr
	}

	content := string(data)

	for _, op := range fp.Ops {
		switch op.Type {
		case "replace":
			if containsStr(content, op.Target) {
				if !dryRun {
					content = replaceFirst(content, op.Target, op.Content)
				}
				fr.Applied++
			} else {
				fr.Skipped++
				fr.Errors = append(fr.Errors, fmt.Sprintf("target not found: %.60s", op.Target))
			}
		case "append":
			if !dryRun {
				content = content + op.Content
			}
			fr.Applied++
		case "prepend":
			if !dryRun {
				content = op.Content + content
			}
			fr.Applied++
		case "delete":
			if containsStr(content, op.Target) {
				if !dryRun {
					content = replaceFirst(content, op.Target, "")
				}
				fr.Applied++
			} else {
				fr.Skipped++
			}
		default:
			fr.Errors = append(fr.Errors, "unknown op: "+op.Type)
			fr.Skipped++
		}
	}

	if !dryRun {
		fullPath := filepath.Join(root, fp.File)
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			fr.Error = "write failed: " + err.Error()
			return fr
		}
	}

	fr.OK = true
	return fr
}

// rollbackAll restaura todos os snapshots registrados.
// Retorna lista de erros (vazia se tudo ok).
func rollbackAll(snapshots []snapRecord, root string) []string {
	var errs []string
	for _, sr := range snapshots {
		if err := restoreSnapshot(sr.snap, root); err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", sr.file, err))
		}
	}
	return errs
}

// restoreSnapshot restaura um arquivo a partir do Snapshot.
func restoreSnapshot(snap fileops.Snapshot, root string) error {
	backupData, err := os.ReadFile(snap.BackupPath)
	if err != nil {
		return fmt.Errorf("backup missing: %w", err)
	}

	// Verificar integridade
	h := fileops.HashBytes(backupData)
	if h != snap.Hash {
		return fmt.Errorf("integrity check failed (expected %s got %s)", snap.Hash, h)
	}

	// Resolver path: relativo ao root
	destPath := snap.OriginalPath
	if root != "" && !filepath.IsAbs(destPath) {
		destPath = filepath.Join(root, destPath)
	}

	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("mkdir failed: %w", err)
	}
	return os.WriteFile(destPath, backupData, 0644)
}

// SaveBatchResult persiste o resultado do batch em disco (para auditoria).
func SaveBatchResult(result BatchResult, snapshotDir string) error {
	if err := os.MkdirAll(snapshotDir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(
		filepath.Join(snapshotDir, result.TransactionID+"-result.json"),
		data, 0644,
	)
}

// ── helpers ──────────────────────────────────────────────────────

func newTxID() string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return "tx_" + hex.EncodeToString(b)
}

func containsStr(s, sub string) bool {
	return len(sub) > 0 && len(s) >= len(sub) && findSubstr(s, sub)
}

func findSubstr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func replaceFirst(s, old, new string) string {
	idx := -1
	for i := 0; i <= len(s)-len(old); i++ {
		if s[i:i+len(old)] == old {
			idx = i
			break
		}
	}
	if idx < 0 {
		return s
	}
	return s[:idx] + new + s[idx+len(old):]
}
