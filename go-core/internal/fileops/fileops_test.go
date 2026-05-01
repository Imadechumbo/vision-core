package fileops

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReadFile_Valid(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte("hello"), 0644)

	data, res := ReadFile(dir, "server.js")
	if !res.OK {
		t.Fatalf("expected OK: %s", res.Error)
	}
	if string(data) != "hello" {
		t.Errorf("unexpected content: %s", data)
	}
	if res.Hash == "" {
		t.Error("expected hash")
	}
}

func TestReadFile_PathTraversal(t *testing.T) {
	dir := t.TempDir()
	_, res := ReadFile(dir, "../etc/passwd")
	if res.OK {
		t.Error("should block path traversal")
	}
}

func TestValidateSafePath_Traversal(t *testing.T) {
	dir := t.TempDir()
	cases := []string{"../secret", "../../etc", "sub/../../other"}
	for _, c := range cases {
		if err := ValidateSafePath(dir, c); err == nil {
			t.Errorf("should block: %s", c)
		}
	}
}

func TestValidateSafePath_Safe(t *testing.T) {
	dir := t.TempDir()
	cases := []string{"server.js", "backend/server.js", "src/index.ts"}
	for _, c := range cases {
		if err := ValidateSafePath(dir, c); err != nil {
			t.Errorf("should allow %s: %v", c, err)
		}
	}
}

func TestCopyFile(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "orig.js"), []byte("content"), 0644)

	res := CopyFile(dir, "orig.js", "backup/orig.js.bak")
	if !res.OK {
		t.Fatalf("copy failed: %s", res.Error)
	}

	data, _ := os.ReadFile(filepath.Join(dir, "backup/orig.js.bak"))
	if string(data) != "content" {
		t.Error("copy content mismatch")
	}
}

func TestHashFile(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "f.js"), []byte("abc"), 0644)
	res := HashFile(dir, "f.js")
	if !res.OK || res.Hash == "" {
		t.Error("hash failed")
	}
}

func TestCreateSnapshot(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte("original"), 0644)
	snapDir := t.TempDir()

	snap, res := CreateSnapshot(dir, "server.js", "mission-001", snapDir)
	if !res.OK {
		t.Fatalf("snapshot failed: %s", res.Error)
	}
	if snap.ID == "" || snap.Hash == "" {
		t.Error("invalid snapshot")
	}
}
