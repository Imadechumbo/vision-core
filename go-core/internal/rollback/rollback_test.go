package rollback

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/visioncore/go-core/internal/fileops"
)

func TestReady(t *testing.T) {
	dir := t.TempDir()
	if !Ready(dir) {
		t.Error("Ready should return true for valid dir")
	}
}

func TestRestore_Valid(t *testing.T) {
	root := t.TempDir()
	snapDir := t.TempDir()

	targetPath := filepath.Join(root, "server.js")
	_ = os.WriteFile(targetPath, []byte("original content"), 0644)

	snap, res := fileops.CreateSnapshot(root, "server.js", "m001", snapDir)
	if !res.OK {
		t.Fatalf("snapshot failed: %s", res.Error)
	}

	// Modificar
	_ = os.WriteFile(targetPath, []byte("modified content"), 0644)

	// Restore com root — path absoluto resolvido corretamente
	rRes := Restore(snapDir, snap.ID, root)
	if !rRes.OK {
		t.Fatalf("restore failed: %s", rRes.Error)
	}

	data, _ := os.ReadFile(targetPath)
	if string(data) != "original content" {
		t.Errorf("restore failed: got %q", string(data))
	}
}

func TestRestore_AbsolutePath(t *testing.T) {
	// Verificar que Restore funciona com OriginalPath absoluto (não relativo)
	root := t.TempDir()
	snapDir := t.TempDir()

	target := filepath.Join(root, "abs.js")
	_ = os.WriteFile(target, []byte("absolute path test"), 0644)

	snap, res := fileops.CreateSnapshot(root, "abs.js", "m002", snapDir)
	if !res.OK {
		t.Fatalf("snapshot failed: %s", res.Error)
	}

	// Salvar metadata com path absoluto
	snap.OriginalPath = target
	metaData, _ := json.MarshalIndent(snap, "", "  ")
	_ = os.WriteFile(filepath.Join(snapDir, snap.ID+".json"), metaData, 0644)

	_ = os.WriteFile(target, []byte("modified"), 0644)

	// Restore sem root (path já absoluto)
	rRes := Restore(snapDir, snap.ID, "")
	if !rRes.OK {
		t.Fatalf("restore with absolute path failed: %s", rRes.Error)
	}
	data, _ := os.ReadFile(target)
	if string(data) != "absolute path test" {
		t.Errorf("restore failed: got %q", string(data))
	}
}

func TestRestore_MissingSnapshot(t *testing.T) {
	dir := t.TempDir()
	res := Restore(dir, "nonexistent-snapshot-id", "")
	if res.OK {
		t.Error("should fail for missing snapshot")
	}
}

func TestListSnapshots_Empty(t *testing.T) {
	dir := t.TempDir()
	snaps, err := ListSnapshots(dir)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(snaps) != 0 {
		t.Error("expected empty list")
	}
}
