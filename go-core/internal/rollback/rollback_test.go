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

	// Modificar o arquivo
	_ = os.WriteFile(targetPath, []byte("modified content"), 0644)

	// Re-salvar metadata com path absoluto para que restore funcione
	snap.OriginalPath = targetPath
	metaData, _ := json.MarshalIndent(snap, "", "  ")
	_ = os.WriteFile(filepath.Join(snapDir, snap.ID+".json"), metaData, 0644)

	rRes := Restore(snapDir, snap.ID)
	if !rRes.OK {
		t.Fatalf("restore failed: %s", rRes.Error)
	}

	data, _ := os.ReadFile(targetPath)
	if string(data) != "original content" {
		t.Errorf("restore failed: got %q", string(data))
	}
}

func TestRestore_MissingSnapshot(t *testing.T) {
	dir := t.TempDir()
	res := Restore(dir, "nonexistent-snapshot-id")
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
