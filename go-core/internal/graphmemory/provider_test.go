package graphmemory_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/visioncore/go-core/internal/graphmemory"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func makeProviderRepo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	os.WriteFile(filepath.Join(root, "main.go"), []byte(
		"package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"v81\") }\nfunc GitHubFlow() {}\n",
	), 0o644)
	return root
}

// ─── TestLocalGraphProviderAvailable ──────────────────────────────────────────

func TestLocalGraphProviderAvailable(t *testing.T) {
	p := graphmemory.LocalGraphProvider{}
	if p.Name() != "local" {
		t.Errorf("expected name 'local', got %q", p.Name())
	}
	if !p.Available() {
		t.Error("LocalGraphProvider must always be available")
	}
}

// ─── TestGraphifyProviderUnavailableDoesNotBreakBuild ─────────────────────────

func TestGraphifyProviderUnavailableDoesNotBreakBuild(t *testing.T) {
	// GraphifyProvider must compile and return meaningful results even when
	// the binary is absent. This test must always pass.
	p := graphmemory.GraphifyProvider{}
	if p.Name() != "graphify" {
		t.Errorf("expected name 'graphify', got %q", p.Name())
	}
	// Available() must not panic regardless of system state.
	_ = p.Available()
}

// ─── TestGraphifyProviderReturnsClearUnavailableError ─────────────────────────

func TestGraphifyProviderReturnsClearUnavailableError(t *testing.T) {
	p := graphmemory.GraphifyProvider{}
	if p.Available() {
		t.Skip("graphify is installed on this system; skipping unavailable test")
	}

	root := makeProviderRepo(t)
	_, err := p.Build(root)
	if err == nil {
		t.Fatal("expected error when graphify unavailable")
	}
	if !strings.Contains(err.Error(), "graphify provider not available") {
		t.Errorf("expected canonical unavailable message, got: %q", err.Error())
	}

	// Query on empty index must also return the canonical error
	idx := graphmemory.GraphIndex{}
	_, err = p.Query(idx, "anything", 5)
	if err == nil {
		t.Fatal("expected error from Query when graphify unavailable")
	}
	if !strings.Contains(err.Error(), "graphify provider not available") {
		t.Errorf("expected canonical unavailable message from Query, got: %q", err.Error())
	}
}

// ─── TestGraphProvidersListIncludesLocalAndGraphify ───────────────────────────

func TestGraphProvidersListIncludesLocalAndGraphify(t *testing.T) {
	infos := graphmemory.ListProviders()
	if len(infos) < 2 {
		t.Fatalf("expected at least 2 providers, got %d", len(infos))
	}

	names := map[string]graphmemory.ProviderInfo{}
	for _, info := range infos {
		names[info.Name] = info
	}

	local, ok := names["local"]
	if !ok {
		t.Fatal("local provider must be in list")
	}
	if !local.Available {
		t.Error("local provider must be available")
	}
	if !local.Default {
		t.Error("local must be the default provider")
	}

	graphify, ok := names["graphify"]
	if !ok {
		t.Fatal("graphify provider must be in list")
	}
	// Default must be false for graphify
	if graphify.Default {
		t.Error("graphify must not be the default provider")
	}
	// If unavailable, must have reason
	if !graphify.Available && graphify.Reason == "" {
		t.Error("unavailable graphify must have a reason")
	}
}

// ─── TestGraphIndexProviderLocalWritesIndex ───────────────────────────────────

func TestGraphIndexProviderLocalWritesIndex(t *testing.T) {
	root := makeProviderRepo(t)
	p := graphmemory.LocalGraphProvider{}

	idx, err := p.Build(root)
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	if len(idx.Nodes) == 0 {
		t.Error("expected nodes from Build")
	}

	// Write index and verify it exists
	path, err := graphmemory.WriteIndex(root, idx)
	if err != nil {
		t.Fatalf("WriteIndex: %v", err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("index file must exist: %v", err)
	}
}

// ─── TestGraphQueryProviderLocalUsesExistingIndex ────────────────────────────

func TestGraphQueryProviderLocalUsesExistingIndex(t *testing.T) {
	root := makeProviderRepo(t)
	p := graphmemory.LocalGraphProvider{}

	// Build and persist
	idx, _ := p.Build(root)
	graphmemory.WriteIndex(root, idx)

	// Load and query via provider
	loaded, err := graphmemory.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	result, err := p.Query(loaded, "github", 10)
	if err != nil {
		t.Fatalf("Query: %v", err)
	}
	if result.Total == 0 {
		t.Error("expected query results")
	}
}

// ─── TestGraphQueryRequiresExistingIndex (provider-aware) ─────────────────────

func TestGraphQueryRequiresExistingIndexProvider(t *testing.T) {
	root := t.TempDir()
	// No index built
	_, err := graphmemory.Query(root, "anything", 5)
	if err == nil {
		t.Fatal("expected error when no index exists")
	}
	if !strings.Contains(err.Error(), "graph index not found") {
		t.Errorf("expected 'graph index not found': %q", err.Error())
	}
}

// ─── TestGetProvider ──────────────────────────────────────────────────────────

func TestGetProviderLocal(t *testing.T) {
	p, err := graphmemory.GetProvider("local")
	if err != nil {
		t.Fatalf("GetProvider(local): %v", err)
	}
	if p.Name() != "local" {
		t.Errorf("expected local, got %q", p.Name())
	}
}

func TestGetProviderGraphify(t *testing.T) {
	p, err := graphmemory.GetProvider("graphify")
	if err != nil {
		t.Fatalf("GetProvider(graphify): %v", err)
	}
	if p.Name() != "graphify" {
		t.Errorf("expected graphify, got %q", p.Name())
	}
}

func TestGetProviderUnknown(t *testing.T) {
	_, err := graphmemory.GetProvider("unknown_provider_xyz")
	if err == nil {
		t.Error("expected error for unknown provider")
	}
}

func TestDefaultProvider(t *testing.T) {
	p := graphmemory.DefaultProvider()
	if p.Name() != "local" {
		t.Errorf("default provider must be local, got %q", p.Name())
	}
	if !p.Available() {
		t.Error("default provider must be available")
	}
}

// ─── TestV81Version ───────────────────────────────────────────────────────────

func TestV81VersionConstant(t *testing.T) {
	if graphmemory.V81Version == "" {
		t.Error("V81Version must not be empty")
	}
	if graphmemory.GraphifyUnavailableReason == "" {
		t.Error("GraphifyUnavailableReason must not be empty")
	}
}
