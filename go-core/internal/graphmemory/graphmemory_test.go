package graphmemory_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/graphmemory"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func makeTempRepo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()

	write := func(rel, content string) {
		t.Helper()
		full := filepath.Join(root, filepath.FromSlash(rel))
		os.MkdirAll(filepath.Dir(full), 0o755)
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			t.Fatalf("write %s: %v", rel, err)
		}
	}

	write("go.mod", "module example.com/test\n\ngo 1.22\n")
	write("internal/github/flow.go", `package github
import (
	"fmt"
	"os"
)
func RunFlow(owner, repo string) error {
	fmt.Println(owner, repo)
	_ = os.Getenv("HOME")
	return nil
}
func GitHubFlow() {}
`)
	write("internal/github/flow_test.go", `package github_test
import "testing"
func TestRunFlow(t *testing.T) {}
`)
	write("README.md", "# Test Repo\n")
	write("config.yaml", "env: test\n")
	write("data.json", `{"key":"value"}`)
	write("frontend/index.html", "<html></html>")
	write("reports/summary.json", `{"ok":true}`)

	// Excluded — must NOT be indexed
	write(".git/config", "[core]\n")
	write("node_modules/lib/index.js", "module.exports={}")
	write("vendor/pkg/lib.go", "package pkg")
	write("bin/binary", "ELF")

	return root
}

// ─── TestGraphIndexWritesIndexFile ───────────────────────────────────────────

func TestGraphIndexWritesIndexFile(t *testing.T) {
	root := makeTempRepo(t)

	path, err := graphmemory.Index(root)
	if err != nil {
		t.Fatalf("Index: %v", err)
	}
	if path == "" {
		t.Fatal("expected non-empty path")
	}

	// File must exist at the expected location
	expected := graphmemory.IndexPath(root)
	if path != expected {
		t.Errorf("path mismatch: got %q want %q", path, expected)
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("index file must exist: %v", err)
	}
}

// ─── TestGraphSummaryRequiresExistingIndex ────────────────────────────────────

func TestGraphSummaryRequiresExistingIndex(t *testing.T) {
	root := t.TempDir()
	// No index built — Summary must fail with ErrIndexMissing message
	_, err := graphmemory.Summary(root)
	if err == nil {
		t.Fatal("expected error when no index exists")
	}
	if !strings.Contains(err.Error(), "graph index not found") {
		t.Errorf("expected 'graph index not found' in error, got: %q", err.Error())
	}
}

// ─── TestGraphQueryRequiresExistingIndex ──────────────────────────────────────

func TestGraphQueryRequiresExistingIndex(t *testing.T) {
	root := t.TempDir()
	_, err := graphmemory.Query(root, "anything", 10)
	if err == nil {
		t.Fatal("expected error when no index exists")
	}
	if !strings.Contains(err.Error(), "graph index not found") {
		t.Errorf("expected 'graph index not found' in error, got: %q", err.Error())
	}
}

// ─── Excluded dirs never appear in index ─────────────────────────────────────

func TestBuildExcludedDirs(t *testing.T) {
	root := makeTempRepo(t)
	idx, err := graphmemory.Build(root)
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	excluded := []string{".git", "node_modules", "vendor", "bin"}
	for _, n := range idx.Nodes {
		for _, ex := range excluded {
			if strings.HasPrefix(n.Path, ex+"/") || n.Path == ex {
				t.Errorf("excluded dir leaked: node.Path=%q (excluded=%q)", n.Path, ex)
			}
		}
	}
}

// ─── Load returns ErrIndexMissing when file absent ───────────────────────────

func TestLoadIndexMissingReturnsCanonicalError(t *testing.T) {
	root := t.TempDir()
	_, err := graphmemory.Load(root)
	if err == nil {
		t.Fatal("expected error")
	}
	if err.Error() != graphmemory.ErrIndexMissing {
		t.Errorf("expected canonical error %q, got %q", graphmemory.ErrIndexMissing, err.Error())
	}
}

// ─── Corrupt index returns error ──────────────────────────────────────────────

func TestLoadCorruptIndexReturnsError(t *testing.T) {
	root := t.TempDir()
	dir := graphmemory.GraphPath(root)
	os.MkdirAll(dir, 0o755)
	os.WriteFile(graphmemory.IndexPath(root), []byte("NOT JSON {{{{"), 0o644)

	_, err := graphmemory.Load(root)
	if err == nil {
		t.Error("expected error for corrupt index")
	}
}

// ─── Save/Load round-trip ─────────────────────────────────────────────────────

func TestWriteLoadRoundTrip(t *testing.T) {
	root := makeTempRepo(t)
	idx, err := graphmemory.Build(root)
	if err != nil {
		t.Fatalf("Build: %v", err)
	}

	path, err := graphmemory.WriteIndex(root, idx)
	if err != nil {
		t.Fatalf("WriteIndex: %v", err)
	}

	loaded, err := graphmemory.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	if loaded.Version != idx.Version {
		t.Errorf("version mismatch: %q != %q", loaded.Version, idx.Version)
	}
	if len(loaded.Nodes) != len(idx.Nodes) {
		t.Errorf("node count mismatch: %d != %d", len(loaded.Nodes), len(idx.Nodes))
	}
	_ = path
}

// ─── Query: case-insensitive ──────────────────────────────────────────────────

func TestQueryCaseInsensitive(t *testing.T) {
	root := makeTempRepo(t)
	graphmemory.Index(root)

	r, err := graphmemory.Query(root, "GITHUB", 100)
	if err != nil {
		t.Fatalf("Query: %v", err)
	}
	if r.Total == 0 {
		t.Error("expected results for 'GITHUB'")
	}
}

// ─── Query: limit respected ───────────────────────────────────────────────────

func TestQueryLimitRespected(t *testing.T) {
	root := makeTempRepo(t)
	graphmemory.Index(root)

	r, err := graphmemory.Query(root, "", 3)
	if err != nil {
		t.Fatalf("Query: %v", err)
	}
	if len(r.Results) > 3 {
		t.Errorf("limit not respected: got %d", len(r.Results))
	}
}

// ─── Redaction: token not stored in index ────────────────────────────────────

func TestRedactTokenNotStoredInIndex(t *testing.T) {
	root := t.TempDir()
	os.WriteFile(filepath.Join(root, "secret.go"), []byte(
		"package main\n// ghp_FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAK\nfunc main() {}\n",
	), 0o644)

	path, err := graphmemory.Index(root)
	if err != nil {
		t.Fatalf("Index: %v", err)
	}
	raw, _ := os.ReadFile(path)
	if strings.Contains(string(raw), "ghp_") {
		t.Error("token leaked into index.json")
	}
}

// ─── Redact function ──────────────────────────────────────────────────────────

func TestRedactGHPToken(t *testing.T) {
	s := graphmemory.Redact("token=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ12345")
	if strings.Contains(s, "ghp_") {
		t.Errorf("token not redacted: %q", s)
	}
}

func TestRedactGithubPAT(t *testing.T) {
	s := graphmemory.Redact("TOKEN=github_pat_ABCDEFGHIJKLMNOP_QRSTUVWXYZ")
	if strings.Contains(s, "github_pat_") {
		t.Errorf("PAT not redacted: %q", s)
	}
}

func TestRedactAWSKey(t *testing.T) {
	s := graphmemory.Redact("AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE")
	if strings.Contains(s, "AKIA") {
		t.Errorf("AWS key not redacted: %q", s)
	}
}

// ─── PathHelper ───────────────────────────────────────────────────────────────

func TestGraphPathAndIndexPath(t *testing.T) {
	root := t.TempDir()
	gp := graphmemory.GraphPath(root)
	ip := graphmemory.IndexPath(root)

	if !strings.HasSuffix(filepath.ToSlash(gp), ".vision-graph") {
		t.Errorf("GraphPath should end in .vision-graph: %q", gp)
	}
	if !strings.HasSuffix(filepath.ToSlash(ip), ".vision-graph/index.json") {
		t.Errorf("IndexPath should end in .vision-graph/index.json: %q", ip)
	}
}

// ─── Summary round-trip ───────────────────────────────────────────────────────

func TestSummaryAfterIndex(t *testing.T) {
	root := makeTempRepo(t)
	if _, err := graphmemory.Index(root); err != nil {
		t.Fatalf("Index: %v", err)
	}

	sum, err := graphmemory.Summary(root)
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}
	if sum.TotalNodes == 0 {
		t.Error("expected nodes in summary")
	}
	if len(sum.ByKind) == 0 {
		t.Error("expected by_kind entries")
	}
}
