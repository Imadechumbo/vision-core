package validator

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRun_EmptyFiles(t *testing.T) {
	dir := t.TempDir()
	res := Run(dir, nil)
	// Com zero arquivos, deve passar (dry-run)
	for _, c := range res.Checks {
		if c.Name == "files_exist" && !c.Passed {
			t.Error("should pass with zero files")
		}
	}
}

func TestRun_FilesExist(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte("ok"), 0644)
	res := Run(dir, []string{"server.js"})
	for _, c := range res.Checks {
		if c.Name == "files_exist" && !c.Passed {
			t.Errorf("file should exist: %s", c.Message)
		}
	}
}

func TestRun_MissingFile(t *testing.T) {
	dir := t.TempDir()
	res := Run(dir, []string{"nonexistent.js"})
	found := false
	for _, c := range res.Checks {
		if c.Name == "files_exist" && !c.Passed {
			found = true
		}
	}
	if !found {
		t.Error("should fail for missing file")
	}
}

func TestRun_BlockedDir(t *testing.T) {
	dir := t.TempDir()
	res := Run(dir, []string{"node_modules/pkg/index.js"})
	found := false
	for _, c := range res.Checks {
		if c.Name == "no_blocked_dirs" && !c.Passed {
			found = true
		}
	}
	if !found {
		t.Error("should fail for node_modules")
	}
}

func TestRun_NoCredentials_Clean(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte("const x = 1;"), 0644)
	res := Run(dir, []string{"server.js"})
	for _, c := range res.Checks {
		if c.Name == "no_hardcoded_credentials" && !c.Passed {
			t.Error("should pass with no credentials")
		}
	}
}

func TestRun_NoCredentials_Dirty(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "server.js"), []byte(`const key = "sk_live_abc123";`), 0644)
	res := Run(dir, []string{"server.js"})
	found := false
	for _, c := range res.Checks {
		if c.Name == "no_hardcoded_credentials" && !c.Passed {
			found = true
		}
	}
	if !found {
		t.Error("should detect hardcoded credential")
	}
}
