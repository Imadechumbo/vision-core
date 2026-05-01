// internal/rollback/rollback.go
// Vision Core Go Safe Core — Rollback
// Restauração segura. Se FAIL crítico → rollback automático.
package rollback

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/visioncore/go-core/internal/fileops"
)

// Result é o resultado do rollback.
type Result struct {
	OK         bool   `json:"ok"`
	SnapshotID string `json:"snapshot_id"`
	File       string `json:"file"`
	HashMatch  bool   `json:"hash_match"`
	Error      string `json:"error,omitempty"`
}

// Restore restaura um arquivo a partir do snapshot ID.
func Restore(snapshotDir, snapshotID string) Result {
	res := Result{SnapshotID: snapshotID}

	// Ler metadata do snapshot
	metaPath := filepath.Join(snapshotDir, snapshotID+".json")
	metaData, err := os.ReadFile(metaPath)
	if err != nil {
		res.Error = "snapshot metadata not found: " + snapshotID
		return res
	}

	var snap fileops.Snapshot
	if err := json.Unmarshal(metaData, &snap); err != nil {
		res.Error = "corrupt snapshot metadata: " + err.Error()
		return res
	}

	res.File = snap.OriginalPath

	// Ler backup
	backupData, err := os.ReadFile(snap.BackupPath)
	if err != nil {
		res.Error = "backup file missing: " + snap.BackupPath
		return res
	}

	// Verificar integridade do backup
	h := fileops.HashBytes(backupData)
	res.HashMatch = h == snap.Hash
	if !res.HashMatch {
		res.Error = fmt.Sprintf("backup integrity check failed (expected %s, got %s)", snap.Hash, h)
		return res
	}

	// Restaurar arquivo original
	if err := os.MkdirAll(filepath.Dir(snap.OriginalPath), 0755); err != nil {
		res.Error = "cannot create dirs: " + err.Error()
		return res
	}
	if err := os.WriteFile(snap.OriginalPath, backupData, 0644); err != nil {
		res.Error = "restore write failed: " + err.Error()
		return res
	}

	res.OK = true
	return res
}

// ListSnapshots lista todos os snapshots disponíveis.
func ListSnapshots(snapshotDir string) ([]fileops.Snapshot, error) {
	entries, err := os.ReadDir(snapshotDir)
	if err != nil {
		return nil, err
	}

	var snaps []fileops.Snapshot
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(snapshotDir, e.Name()))
		if err != nil {
			continue
		}
		var s fileops.Snapshot
		if json.Unmarshal(data, &s) == nil {
			snaps = append(snaps, s)
		}
	}
	return snaps, nil
}

// Ready verifica se o sistema de rollback está operacional.
func Ready(snapshotDir string) bool {
	if err := os.MkdirAll(snapshotDir, 0755); err != nil {
		return false
	}
	// Tentar criar e deletar um arquivo de teste
	testFile := filepath.Join(snapshotDir, ".rollback-ready-test")
	if err := os.WriteFile(testFile, []byte("ok"), 0644); err != nil {
		return false
	}
	_ = os.Remove(testFile)
	return true
}
