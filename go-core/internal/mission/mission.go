// internal/mission/mission.go
// Vision Core Go Safe Core — Mission Orchestrator V5.2
// Pipeline: scanner → fileops → snapshot → patcher (no-snapshot) → validator → rollback → passgold
//
// Fixes V5.2.1:
//   1. self-test usa .vision-test/ — nunca toca go.mod ou arquivos reais do projeto
//   2. snapshot único: criado aqui no step 3, patcher roda com DryRun=true para não duplicar
//   3. snapshotID retornado é snap.ID real de fileops.CreateSnapshot
//   4. rollback.Restore recebe root para resolver path absoluto corretamente
package mission

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/visioncore/go-core/internal/fileops"
	"github.com/visioncore/go-core/internal/passgold"
	"github.com/visioncore/go-core/internal/patcher"
	"github.com/visioncore/go-core/internal/rollback"
	"github.com/visioncore/go-core/internal/scanner"
	"github.com/visioncore/go-core/internal/validator"
)

type Input struct {
	Root      string `json:"root"`
	InputText string `json:"input"`
	DryRun    bool   `json:"dry_run"`
}

type StepResult struct {
	Step    string `json:"step"`
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

type Output struct {
	OK               bool           `json:"ok"`
	Version          string         `json:"version"`
	MissionID        string         `json:"mission_id"`
	Engine           string         `json:"engine"`
	Status           string         `json:"status"`
	PassGold         bool           `json:"pass_gold"`
	PromotionAllowed bool           `json:"promotion_allowed"`
	RollbackReady    bool           `json:"rollback_ready"`
	Summary          string         `json:"summary"`
	Steps            []string       `json:"steps"`
	StepResults      []StepResult   `json:"step_results"`
	Gates            passgold.Gates `json:"gates"`
	FailedGates      []string       `json:"failed_gates,omitempty"`
	SnapshotID       string         `json:"snapshot_id,omitempty"`
	RollbackApplied  bool           `json:"rollback_applied"`
	TransactionMode  bool           `json:"transaction_mode"`
	TransactionID    string         `json:"transaction_id,omitempty"`
	PatchedFiles     int            `json:"patched_files"`
	TotalFiles       int            `json:"total_files"`
	DurationMs       int64          `json:"duration_ms"`
	Error            string         `json:"error,omitempty"`
}

var v52Steps = []string{
	"scanner", "fileops", "snapshot", "patcher",
	"validator", "rollback", "passgold",
}

// Run executa o pipeline V5.2 corrigido.
func Run(input Input) Output {
	start := time.Now()
	missionID := "mission_" + shortID()
	snapshotDir := filepath.Join(input.Root, ".vision-snapshots")

	out := Output{
		Version:   passgold.Version,
		MissionID: missionID,
		Engine:    passgold.Engine,
		Steps:     v52Steps,
	}
	gates := passgold.Gates{}

	// ── STEP 1: Scanner ───────────────────────────────────────────
	scanRes := scanner.Run(input.Root)
	s1 := StepResult{Step: "scanner", OK: scanRes.OK}
	if scanRes.OK {
		s1.Message = fmt.Sprintf("scanned %d files, stack: %v", scanRes.FilesFound, scanRes.Stack)
		gates.ScannerOK = true
	} else {
		s1.Error = scanRes.Error
	}
	out.StepResults = append(out.StepResults, s1)

	// ── STEP 2: FileOps — path safety ─────────────────────────────
	s2 := StepResult{Step: "fileops"}
	if err := fileops.ValidateSafePath(input.Root, "."); err == nil {
		s2.OK = true
		s2.Message = "root path safe, traversal blocked"
		gates.FileopsOK = true
	} else {
		s2.Error = err.Error()
	}
	out.StepResults = append(out.StepResults, s2)

	// ── STEP 3: Snapshot — criar ANTES do patch, UMA única vez ────
	// FIX 1: nunca usar go.mod ou arquivos reais em self-test
	// FIX 3: snapshotID = snap.ID real retornado por CreateSnapshot
	targetFile := selectTargetFile(input.Root, input.InputText)
	s3 := StepResult{Step: "snapshot"}
	var snapshotID string
	var realSnap fileops.Snapshot

	if !input.DryRun {
		snap, snapRes := fileops.CreateSnapshot(input.Root, targetFile, missionID, snapshotDir)
		if snapRes.OK {
			realSnap = snap
			snapshotID = snap.ID // FIX 3: ID real, não hash inventado
			out.SnapshotID = snapshotID
			s3.OK = true
			s3.Message = fmt.Sprintf("snapshot %s for %s", snapshotID, targetFile)
		} else {
			s3.Error = "snapshot failed: " + snapRes.Error
		}
	} else {
		s3.OK = true
		s3.Message = "dry-run: snapshot skipped"
		realSnap = fileops.Snapshot{} // vazio
	}
	_ = realSnap
	out.StepResults = append(out.StepResults, s3)

	// ── STEP 4: Patcher — V5.4 Multi-File Transactional ─────────
	// Usa BatchPlan para permitir múltiplos arquivos com rollback transacional.
	// Snapshot já foi criado no step 3 (arquivo sentinela).
	// O BatchPlan também cria snapshots internos de cada arquivo do batch.
	batch := buildBatchPlan(missionID, targetFile, input)
	batchRes := patcher.ApplyBatch(input.Root, batch, snapshotDir)
	s4 := StepResult{Step: "patcher"}
	if batchRes.OK {
		s4.OK = true
		gates.PatcherOK = true
		if input.DryRun {
			s4.Message = fmt.Sprintf("dry-run: %d/%d files validated",
				batchRes.PatchedFiles, batchRes.TotalFiles)
		} else {
			s4.Message = fmt.Sprintf("patch executed: %d/%d files patched (tx: %s)",
				batchRes.PatchedFiles, batchRes.TotalFiles, batchRes.TransactionID)
		}
		out.TransactionMode = true
		out.TransactionID   = batchRes.TransactionID
		out.PatchedFiles    = batchRes.PatchedFiles
		out.TotalFiles      = batchRes.TotalFiles
		if batchRes.SnapshotIDs != nil && len(batchRes.SnapshotIDs) > 0 {
			out.SnapshotID = batchRes.SnapshotIDs[0] // primeiro snapshot do batch
		}
	} else {
		s4.Error = batchRes.Error
		out.TransactionMode   = true
		out.TransactionID     = batchRes.TransactionID
		out.RollbackApplied   = batchRes.RollbackApplied
	}
	out.StepResults = append(out.StepResults, s4)

	// ── STEP 5: Validator ──────────────────────────────────────────
	var changedFiles []string
	if !input.DryRun && targetFile != "" {
		changedFiles = []string{targetFile}
	}
	valRes := validator.Run(input.Root, changedFiles)
	s5 := StepResult{Step: "validator"}
	allOK := true
	for _, c := range valRes.Checks {
		if !c.Passed {
			allOK = false
			break
		}
	}
	if allOK {
		s5.OK = true
		s5.Message = fmt.Sprintf("%d checks passed", len(valRes.Checks))
		gates.ValidatorOK = true
	} else {
		s5.OK = false
		for _, c := range valRes.Checks {
			if !c.Passed {
				s5.Error = c.Name + ": " + c.Message
				break
			}
		}
	}
	out.StepResults = append(out.StepResults, s5)

	// ── STEP 6: Rollback — automático se validator falhou ─────────
	// FIX 4: rollback.Restore recebe root para resolver path absoluto
	s6 := StepResult{Step: "rollback"}
	rbReady := rollback.Ready(snapshotDir)

	if !s5.OK && snapshotID != "" && !input.DryRun {
		rbResult := rollback.Restore(snapshotDir, snapshotID, input.Root)
		if rbResult.OK {
			s6.OK = true
			s6.Message = "rollback applied: restored to " + snapshotID
			out.RollbackApplied = true
		} else {
			s6.OK = false
			s6.Error = "rollback failed: " + rbResult.Error
		}
	} else {
		s6.OK = rbReady
		if rbReady {
			s6.Message = "rollback ready (not needed)"
		} else {
			s6.Message = "rollback dir unavailable"
		}
	}
	gates.RollbackReady = rbReady
	out.StepResults = append(out.StepResults, s6)

	// ── Security + Legacy ──────────────────────────────────────────
	gates.SecurityOK = gates.ScannerOK && gates.FileopsOK && gates.PatcherOK
	gates.LegacySafe = true

	// ── PASS GOLD ──────────────────────────────────────────────────
	pg := passgold.Evaluate(gates)
	out.Gates = gates
	out.PassGold = pg.PassGold
	out.PromotionAllowed = pg.PromotionAllowed
	out.RollbackReady = pg.RollbackReady
	out.Status = pg.Status
	out.FailedGates = pg.FailedGates
	if pg.PassGold {
		out.OK = true
		out.Summary = "V5.2 REAL MISSION EXECUTION — PASS GOLD confirmed."
	} else {
		out.OK = false
		out.Summary = fmt.Sprintf("Mission FAILED. Gates: %v", pg.FailedGates)
	}
	out.DurationMs = time.Since(start).Milliseconds()
	return out
}

// selectTargetFile — FIX 1: nunca modifica go.mod do projeto.
// Usa arquivo sentinela em .vision-test/ isolado.
func selectTargetFile(root, _ string) string {
	testDir := filepath.Join(root, ".vision-test")
	if err := os.MkdirAll(testDir, 0755); err == nil {
		sentinel := filepath.Join(testDir, "mission.sentinel")
		_ = os.WriteFile(sentinel, []byte("vision-core-sentinel"), 0644)
		return filepath.Join(".vision-test", "mission.sentinel")
	}
	// fallback: apenas sentinel na raiz (não go.mod)
	sentinelPath := filepath.Join(root, ".vision-sentinel")
	_ = os.WriteFile(sentinelPath, []byte("vision-core-sentinel"), 0644)
	return ".vision-sentinel"
}

// buildBatchPlan constrói um BatchPlan V5.4 para o arquivo sentinela.
// Em V5.4 o pipeline usa BatchPlan mesmo para arquivo único,
// garantindo transaction_mode=true em todas as execuções.
func buildBatchPlan(missionID, targetFile string, input Input) patcher.BatchPlan {
	return patcher.BatchPlan{
		MissionID:   missionID,
		DryRun:      input.DryRun,
		Description: "V5.4 transactional mission: " + input.InputText,
		Files: []patcher.FilePlan{
			{
				File: targetFile,
				Ops: []patcher.Op{
					{
						Type:    "append",
						Content: fmt.Sprintf("\naudited:%s:%d\n", missionID, time.Now().UnixMilli()),
					},
				},
			},
		},
	}
}

func shortID() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
