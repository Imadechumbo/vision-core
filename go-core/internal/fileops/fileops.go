// internal/fileops/fileops.go
// Vision Core Go Safe Core — FileOps
// Operações seguras de arquivo. NUNCA escreve fora do root. NUNCA segue ../
package fileops

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Result é o resultado de uma operação de arquivo.
type Result struct {
	OK        bool   `json:"ok"`
	Operation string `json:"operation"`
	Path      string `json:"path"`
	Hash      string `json:"hash,omitempty"`
	Error     string `json:"error,omitempty"`
}

// Snapshot representa um backup atômico de arquivo.
type Snapshot struct {
	ID          string    `json:"id"`
	MissionID   string    `json:"mission_id"`
	OriginalPath string   `json:"original_path"`
	BackupPath  string    `json:"backup_path"`
	Hash        string    `json:"hash"`
	CreatedAt   time.Time `json:"created_at"`
}

// ReadFile lê um arquivo dentro do root seguro.
func ReadFile(root, relPath string) ([]byte, Result) {
	safe, err := safePath(root, relPath)
	if err != nil {
		return nil, Result{Operation: "read", Path: relPath, Error: err.Error()}
	}
	data, err := os.ReadFile(safe)
	if err != nil {
		return nil, Result{Operation: "read", Path: relPath, Error: err.Error()}
	}
	return data, Result{OK: true, Operation: "read", Path: relPath, Hash: HashBytes(data)}
}

// CopyFile copia um arquivo dentro do root seguro.
func CopyFile(root, srcRel, dstRel string) Result {
	src, err := safePath(root, srcRel)
	if err != nil {
		return Result{Operation: "copy", Error: err.Error()}
	}
	dst, err := safePath(root, dstRel)
	if err != nil {
		return Result{Operation: "copy", Error: err.Error()}
	}

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return Result{Operation: "copy", Error: err.Error()}
	}

	in, err := os.Open(src)
	if err != nil {
		return Result{Operation: "copy", Error: err.Error()}
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return Result{Operation: "copy", Error: err.Error()}
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return Result{Operation: "copy", Error: err.Error()}
	}

	return Result{OK: true, Operation: "copy", Path: dstRel}
}

// HashFile calcula SHA-256 de um arquivo.
func HashFile(root, relPath string) Result {
	data, res := ReadFile(root, relPath)
	if !res.OK {
		return res
	}
	return Result{OK: true, Operation: "hash", Path: relPath, Hash: HashBytes(data)}
}

// CreateSnapshot cria um backup seguro de um arquivo antes de patch.
func CreateSnapshot(root, relPath, missionID, snapshotDir string) (Snapshot, Result) {
	data, res := ReadFile(root, relPath)
	if !res.OK {
		return Snapshot{}, res
	}

	if err := os.MkdirAll(snapshotDir, 0755); err != nil {
		return Snapshot{}, Result{Operation: "snapshot", Error: err.Error()}
	}

	snap := Snapshot{
		ID:           fmt.Sprintf("%s-%d", missionID, time.Now().UnixMilli()),
		MissionID:    missionID,
		OriginalPath: relPath,
		Hash:         HashBytes(data),
		CreatedAt:    time.Now(),
	}

	backupFile := filepath.Join(snapshotDir, snap.ID+".bak")
	snap.BackupPath = backupFile

	if err := os.WriteFile(backupFile, data, 0644); err != nil {
		return Snapshot{}, Result{Operation: "snapshot", Error: err.Error()}
	}

	metaFile := filepath.Join(snapshotDir, snap.ID+".json")
	meta, _ := json.MarshalIndent(snap, "", "  ")
	_ = os.WriteFile(metaFile, meta, 0644)

	return snap, Result{OK: true, Operation: "snapshot", Path: backupFile, Hash: snap.Hash}
}

// ValidateSafePath verifica se um path é seguro (sem path traversal).
func ValidateSafePath(root, relPath string) error {
	_, err := safePath(root, relPath)
	return err
}

// --- internos ---

func safePath(root, relPath string) (string, error) {
	// Bloquear path traversal
	if strings.Contains(relPath, "..") {
		return "", fmt.Errorf("path traversal blocked: %s", relPath)
	}
	clean := filepath.Join(root, filepath.Clean(relPath))
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	absClean, err := filepath.Abs(clean)
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(absClean, absRoot) {
		return "", fmt.Errorf("path outside root blocked: %s", relPath)
	}
	return absClean, nil
}

func HashBytes(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}
