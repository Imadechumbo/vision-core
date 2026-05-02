package patcher

import (
	"os"
	"path/filepath"
	"testing"
)

func TestApply_DryRun(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte("hello world"), 0644)

	plan := Plan{
		MissionID: "m001",
		File:      "server.js",
		DryRun:    true,
		Ops:       []Op{{Type: "replace", Target: "hello", Content: "goodbye"}},
	}
	res := Apply(dir, plan, t.TempDir())
	if !res.OK {
		t.Fatalf("dry-run failed: %s", res.Error)
	}
	if res.Applied != 1 {
		t.Errorf("expected 1 applied, got %d", res.Applied)
	}
	// Arquivo deve estar inalterado
	data, _ := os.ReadFile(filepath.Join(dir, "server.js"))
	if string(data) != "hello world" {
		t.Error("dry-run must not modify file")
	}
}

func TestApply_Real(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte("hello world"), 0644)

	plan := Plan{
		MissionID: "m001",
		File:      "server.js",
		DryRun:    false,
		Ops:       []Op{{Type: "replace", Target: "hello", Content: "goodbye"}},
	}
	res := Apply(dir, plan, t.TempDir())
	if !res.OK {
		t.Fatalf("patch failed: %s", res.Error)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "server.js"))
	if string(data) != "goodbye world" {
		t.Errorf("expected 'goodbye world', got %s", data)
	}
	if res.SnapshotID == "" {
		t.Error("expected snapshot ID")
	}
}

func TestApply_BlockNodeModules(t *testing.T) {
	dir := t.TempDir()
	plan := Plan{
		File:  "node_modules/pkg/index.js",
		DryRun: true,
		Ops:   []Op{{Type: "replace", Target: "x", Content: "y"}},
	}
	res := Apply(dir, plan, t.TempDir())
	if res.OK {
		t.Error("should block node_modules")
	}
}

func TestApply_BlockDotGit(t *testing.T) {
	dir := t.TempDir()
	plan := Plan{
		File:  ".git/config",
		DryRun: true,
		Ops:   []Op{},
	}
	res := Apply(dir, plan, t.TempDir())
	if res.OK {
		t.Error("should block .git")
	}
}

func TestApply_BlockPathTraversal(t *testing.T) {
	dir := t.TempDir()
	plan := Plan{
		File:  "../etc/passwd",
		DryRun: true,
		Ops:   []Op{},
	}
	res := Apply(dir, plan, t.TempDir())
	if res.OK {
		t.Error("should block path traversal")
	}
}
