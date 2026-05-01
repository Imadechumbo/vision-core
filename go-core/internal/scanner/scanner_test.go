package scanner

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRun_ValidRoot(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "package.json"), []byte(`{"name":"test"}`), 0644)
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte(`app.get('/api/health', handler)`), 0644)

	res := Run(dir)
	if !res.OK {
		t.Fatalf("expected OK, got error: %s", res.Error)
	}
	if !res.HasPackageJSON {
		t.Error("expected HasPackageJSON=true")
	}
	if res.FilesFound == 0 {
		t.Error("expected at least 1 file found")
	}
	found := false
	for _, ep := range res.Endpoints {
		if ep == "GET /api/health" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected endpoint GET /api/health, got: %v", res.Endpoints)
	}
}

func TestRun_InvalidRoot(t *testing.T) {
	// Usar um arquivo como root (não é diretório) — sempre falha
	tmpFile, _ := os.CreateTemp("", "vision-test-*.txt")
	tmpFile.Close()
	defer os.Remove(tmpFile.Name())

	res := Run(tmpFile.Name())
	if res.OK {
		t.Error("expected OK=false when root is a file, not a directory")
	}
	if res.Error == "" {
		t.Error("expected error message")
	}
}

func TestRun_NonExistentRoot(t *testing.T) {
	// Criar um dir, deletar, usar o path
	dir := t.TempDir()
	missing := filepath.Join(dir, "does-not-exist-subdir")
	res := Run(missing)
	if res.OK {
		t.Error("expected OK=false for non-existent path")
	}
}

func TestRun_SkipsNodeModules(t *testing.T) {
	dir := t.TempDir()
	nm := filepath.Join(dir, "node_modules", "pkg")
	_ = os.MkdirAll(nm, 0755)
	_ = os.WriteFile(filepath.Join(nm, "index.js"), []byte(`app.get('/internal', h)`), 0644)
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte(`app.get('/real', h)`), 0644)

	res := Run(dir)
	for _, ep := range res.Endpoints {
		if ep == "GET /internal" {
			t.Error("should not scan node_modules")
		}
	}
}

func TestRun_NeverModifiesFiles(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "server.js")
	original := []byte("app.get('/health', h)")
	_ = os.WriteFile(target, original, 0644)

	Run(dir)

	after, _ := os.ReadFile(target)
	if string(after) != string(original) {
		t.Error("scanner must never modify files")
	}
}
