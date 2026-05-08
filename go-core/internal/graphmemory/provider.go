// Package graphmemory — provider.go
//
// V8.1: GraphProvider interface and implementations.
//
// LocalGraphProvider  — default, uses built-in indexer, always available.
// GraphifyProvider    — optional adapter; returns Available=false if Graphify
//                       is not installed. NEVER a required build dependency.
package graphmemory

import (
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

// V81Version identifies outputs from V8.1 provider layer.
const V81Version = "V8.1"

// GraphifyUnavailableReason is the canonical message when Graphify is absent.
const GraphifyUnavailableReason = "graphify provider not available; using local graph provider"

// ── Interface ─────────────────────────────────────────────────────────────────

// GraphProvider is the interface for graph index backends.
// V8.1 ships two implementations: LocalGraphProvider (default) and
// GraphifyProvider (optional adapter). Future providers implement this
// interface without modifying existing code.
type GraphProvider interface {
	// Name returns the unique identifier of the provider ("local", "graphify").
	Name() string

	// Available reports whether the provider can be used on this system.
	// LocalGraphProvider always returns true.
	// GraphifyProvider returns false unless the graphify binary is reachable.
	Available() bool

	// Build indexes root and returns a GraphIndex (in-memory).
	// Does NOT persist to disk — call WriteIndex separately.
	Build(root string) (GraphIndex, error)

	// Query searches an already-loaded index.
	Query(index GraphIndex, query string, limit int) (GraphQueryResult, error)
}

// ── ProviderInfo ──────────────────────────────────────────────────────────────

// ProviderInfo is a JSON-serialisable summary of a provider's status.
type ProviderInfo struct {
	Name      string `json:"name"`
	Available bool   `json:"available"`
	Default   bool   `json:"default"`
	Reason    string `json:"reason,omitempty"`
}

// ── LocalGraphProvider ────────────────────────────────────────────────────────

// LocalGraphProvider implements GraphProvider using the built-in graphmemory
// engine. It is always available, requires no external tools, and performs no
// network calls.
type LocalGraphProvider struct{}

func (LocalGraphProvider) Name() string      { return "local" }
func (LocalGraphProvider) Available() bool   { return true }

func (LocalGraphProvider) Build(root string) (GraphIndex, error) {
	return Build(root)
}

func (LocalGraphProvider) Query(index GraphIndex, query string, limit int) (GraphQueryResult, error) {
	return QueryIndex(index, query, limit), nil
}

// ── GraphifyProvider ──────────────────────────────────────────────────────────

// GraphifyProvider is an optional adapter for the Graphify external tool.
// If the graphify binary is not present on PATH, Available() returns false and
// all operations return GraphifyUnavailableReason — the build never fails.
//
// In V8.1 the adapter is a thin stub; full integration is planned for V8.2.
type GraphifyProvider struct{}

func (GraphifyProvider) Name() string { return "graphify" }

// Available checks whether the graphify binary exists on PATH.
// No network calls, no installs, no side-effects.
func (GraphifyProvider) Available() bool {
	_, err := exec.LookPath("graphify")
	return err == nil
}

func (g GraphifyProvider) Build(root string) (GraphIndex, error) {
	if !g.Available() {
		return GraphIndex{}, errors.New(GraphifyUnavailableReason)
	}
	// Stub: in V8.1 we delegate to the local engine even when graphify is
	// present, because the full protocol is defined in V8.2.
	return Build(root)
}

func (g GraphifyProvider) Query(index GraphIndex, query string, limit int) (GraphQueryResult, error) {
	if !g.Available() {
		return GraphQueryResult{}, errors.New(GraphifyUnavailableReason)
	}
	return QueryIndex(index, query, limit), nil
}

// ── Registry ──────────────────────────────────────────────────────────────────

// allProviders is the canonical ordered list of V8.1 providers.
// Local is always first (default).
var allProviders = []GraphProvider{
	LocalGraphProvider{},
	GraphifyProvider{},
}

// ListProviders returns ProviderInfo for every registered provider.
func ListProviders() []ProviderInfo {
	infos := make([]ProviderInfo, 0, len(allProviders))
	for i, p := range allProviders {
		info := ProviderInfo{
			Name:      p.Name(),
			Available: p.Available(),
			Default:   i == 0,
		}
		if !p.Available() {
			info.Reason = GraphifyUnavailableReason
		}
		infos = append(infos, info)
	}
	return infos
}

// GetProvider returns the named provider, or an error if unknown.
func GetProvider(name string) (GraphProvider, error) {
	for _, p := range allProviders {
		if p.Name() == strings.ToLower(strings.TrimSpace(name)) {
			return p, nil
		}
	}
	return nil, fmt.Errorf("unknown provider %q; available: local, graphify", name)
}

// DefaultProvider returns the LocalGraphProvider (always first, always available).
func DefaultProvider() GraphProvider {
	return allProviders[0]
}
