// Package graphmemory implements a lightweight, persistent local graph index.
//
// Contract V8.0:
//   - graph-index  → Build(root) + Index(root) → writes .vision-graph/index.json
//   - graph-summary → Load(root) + Summarize(index) — reads index, NO filesystem scan
//   - graph-query   → Load(root) + Query(root,query,limit) — reads index, NO filesystem scan
//   - If index missing: returns error "graph index not found; run graph-index first"
//   - Only .vision-graph/index.json is ever written
//   - Secrets are redacted before storing
//   - Path traversal is blocked
package graphmemory

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// ── Constants ────────────────────────────────────────────────────────────────

const (
	IndexVersion    = "v8.0"
	graphDir        = ".vision-graph"
	indexFileName   = "index.json"
	ErrIndexMissing = "graph index not found; run graph-index first"
)

// NodeKind classifies a graph node.
type NodeKind string

const (
	KindGoFile   NodeKind = "go_file"
	KindGoTest   NodeKind = "go_test"
	KindGoMod    NodeKind = "go_mod"
	KindMarkdown NodeKind = "markdown"
	KindJSON     NodeKind = "json"
	KindYAML     NodeKind = "yaml"
	KindWeb      NodeKind = "web"
	KindReport   NodeKind = "report"
	KindPackage  NodeKind = "package"
	KindFunction NodeKind = "function"
	KindImport   NodeKind = "import"
	KindCLICmd   NodeKind = "cli_cmd"
	KindOther    NodeKind = "other"
)

// ── Types ────────────────────────────────────────────────────────────────────

// GraphNode is a single entity in the index.
type GraphNode struct {
	ID      string            `json:"id"`
	Kind    NodeKind          `json:"kind"`
	Label   string            `json:"label"`
	Path    string            `json:"path,omitempty"`
	Package string            `json:"package,omitempty"`
	Tags    []string          `json:"tags,omitempty"`
	Meta    map[string]string `json:"meta,omitempty"`
}

// GraphEdge is a directed relationship between two nodes.
type GraphEdge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Relation string `json:"relation"`
}

// GraphIndex is the full persisted graph.
type GraphIndex struct {
	Version   string      `json:"version"`
	Root      string      `json:"root"`
	BuildTime time.Time   `json:"build_time"`
	Nodes     []GraphNode `json:"nodes"`
	Edges     []GraphEdge `json:"edges"`
}

// GraphSummary is a compact overview.
type GraphSummary struct {
	TotalNodes int            `json:"total_nodes"`
	TotalEdges int            `json:"total_edges"`
	ByKind     map[string]int `json:"by_kind"`
	TopPaths   []string       `json:"top_paths"`
	Root       string         `json:"root"`
	BuildTime  time.Time      `json:"build_time"`
}

// GraphQueryResult holds query results.
type GraphQueryResult struct {
	Query   string      `json:"query"`
	Limit   int         `json:"limit"`
	Total   int         `json:"total"`
	Results []GraphNode `json:"results"`
}

// ── Path helpers ─────────────────────────────────────────────────────────────

// GraphPath returns the absolute path to the .vision-graph directory.
func GraphPath(root string) string {
	abs, err := filepath.Abs(root)
	if err != nil {
		abs = root
	}
	return filepath.Join(abs, graphDir)
}

// IndexPath returns the absolute path to .vision-graph/index.json.
func IndexPath(root string) string {
	return filepath.Join(GraphPath(root), indexFileName)
}

// ── Exclusion ────────────────────────────────────────────────────────────────

var excludedDirs = []string{
	".git", "node_modules", "bin", "dist", "build",
	".next", ".vision-memory", ".vision-snapshots",
	".vision-reports", ".vision-test", "vendor",
	"coverage", "tmp", "temp", ".vision-graph",
}

func isExcluded(rel string) bool {
	parts := strings.Split(filepath.ToSlash(rel), "/")
	for _, part := range parts {
		for _, ex := range excludedDirs {
			if part == ex {
				return true
			}
		}
	}
	return false
}

// ── Redaction ────────────────────────────────────────────────────────────────

var secretPatterns = []*regexp.Regexp{
	regexp.MustCompile(`ghp_[A-Za-z0-9_]+`),
	regexp.MustCompile(`github_pat_[A-Za-z0-9_]+`),
	regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
	regexp.MustCompile(`(?i)Authorization:\s*Bearer\s+\S+`),
	regexp.MustCompile(`(?i)x-access-token:\s*\S+`),
	regexp.MustCompile(`ghs_[A-Za-z0-9_]+`),
	regexp.MustCompile(`ghr_[A-Za-z0-9_]+`),
}

// Redact replaces secrets with [REDACTED].
func Redact(s string) string {
	// Redact actual GITHUB_TOKEN value if set
	if tok := os.Getenv("GITHUB_TOKEN"); tok != "" && len(tok) > 4 {
		s = strings.ReplaceAll(s, tok, "[REDACTED_TOKEN]")
	}
	for _, re := range secretPatterns {
		s = re.ReplaceAllString(s, "[REDACTED]")
	}
	return s
}

// ── File-kind detection ──────────────────────────────────────────────────────

func kindForFile(path string) NodeKind {
	base := strings.ToLower(filepath.Base(path))
	ext := strings.ToLower(filepath.Ext(path))
	switch {
	case base == "go.mod" || base == "go.sum":
		return KindGoMod
	case strings.HasSuffix(base, "_test.go"):
		return KindGoTest
	case ext == ".go":
		return KindGoFile
	case ext == ".md":
		return KindMarkdown
	case ext == ".json":
		return KindJSON
	case ext == ".yaml" || ext == ".yml":
		return KindYAML
	case ext == ".js" || ext == ".ts" || ext == ".html" || ext == ".css":
		return KindWeb
	default:
		return KindOther
	}
}

// ── Go source extraction ─────────────────────────────────────────────────────

var (
	rePackage = regexp.MustCompile(`(?m)^package\s+(\w+)`)
	reFunc    = regexp.MustCompile(`(?m)^func\s+(\w+)\s*\(`)
	reImportB = regexp.MustCompile(`"([^"]+)"`)
)

func extractPackage(src string) string {
	if m := rePackage.FindStringSubmatch(src); len(m) > 1 {
		return m[1]
	}
	return ""
}

func extractFunctions(src string) []string {
	ms := reFunc.FindAllStringSubmatch(src, -1)
	fns := make([]string, 0, len(ms))
	for _, m := range ms {
		if len(m) > 1 {
			fns = append(fns, m[1])
		}
	}
	return fns
}

func extractImports(src string) []string {
	blockRe := regexp.MustCompile(`(?s)import\s*\(([^)]+)\)`)
	single := regexp.MustCompile(`(?m)^import\s+"([^"]+)"`)
	seen := map[string]bool{}
	var out []string
	for _, m := range single.FindAllStringSubmatch(src, -1) {
		if len(m) > 1 && !seen[m[1]] {
			seen[m[1]] = true
			out = append(out, m[1])
		}
	}
	for _, b := range blockRe.FindAllStringSubmatch(src, -1) {
		if len(b) > 1 {
			for _, m := range reImportB.FindAllStringSubmatch(b[1], -1) {
				if len(m) > 1 && !seen[m[1]] {
					seen[m[1]] = true
					out = append(out, m[1])
				}
			}
		}
	}
	return out
}

// ── Known CLI commands ───────────────────────────────────────────────────────

var knownCLICmds = []string{
	"mission", "version", "help",
	"github-flow", "github-flow-drill", "github-flow-reports",
	"graph-index", "graph-query", "graph-summary",
	"mcp-readonly",
}

// ── Build ────────────────────────────────────────────────────────────────────

// Build walks root and produces a GraphIndex (in-memory, not persisted).
// Secrets are redacted from source content before indexing.
func Build(root string) (GraphIndex, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return GraphIndex{}, fmt.Errorf("graphmemory: abs root: %w", err)
	}

	idx := GraphIndex{
		Version:   IndexVersion,
		Root:      absRoot,
		BuildTime: time.Now().UTC(),
	}

	nodeSet := map[string]bool{}

	addNode := func(n GraphNode) {
		if !nodeSet[n.ID] {
			nodeSet[n.ID] = true
			idx.Nodes = append(idx.Nodes, n)
		}
	}
	addEdge := func(e GraphEdge) {
		idx.Edges = append(idx.Edges, e)
	}

	// Add CLI commands as nodes
	for _, cmd := range knownCLICmds {
		addNode(GraphNode{
			ID:    "cli:" + cmd,
			Kind:  KindCLICmd,
			Label: cmd,
			Tags:  []string{"cli"},
		})
	}

	err = filepath.Walk(absRoot, func(path string, info os.FileInfo, werr error) error {
		if werr != nil {
			return nil
		}
		rel, _ := filepath.Rel(absRoot, path)
		rel = filepath.ToSlash(rel)

		if info.IsDir() {
			if isExcluded(rel) {
				return filepath.SkipDir
			}
			return nil
		}
		if isExcluded(rel) {
			return nil
		}

		kind := kindForFile(path)
		if kind == KindOther {
			return nil
		}

		fileID := "file:" + rel
		fileNode := GraphNode{
			ID:    fileID,
			Kind:  kind,
			Label: rel,
			Path:  rel,
			Tags:  []string{string(kind)},
		}

		if kind == KindGoFile || kind == KindGoTest {
			raw, rerr := os.ReadFile(path)
			if rerr == nil {
				src := Redact(string(raw))
				if pkg := extractPackage(src); pkg != "" {
					fileNode.Package = pkg
					pkgID := "pkg:" + pkg
					addNode(GraphNode{ID: pkgID, Kind: KindPackage, Label: pkg, Tags: []string{"package"}})
					addEdge(GraphEdge{From: fileID, To: pkgID, Relation: "belongs_to"})
				}
				for _, fn := range extractFunctions(src) {
					fnID := "fn:" + rel + ":" + fn
					addNode(GraphNode{ID: fnID, Kind: KindFunction, Label: fn, Path: rel, Tags: []string{"function"}})
					addEdge(GraphEdge{From: fileID, To: fnID, Relation: "contains"})
				}
				for _, imp := range extractImports(src) {
					impID := "import:" + imp
					addNode(GraphNode{ID: impID, Kind: KindImport, Label: imp, Tags: []string{"import"}})
					addEdge(GraphEdge{From: fileID, To: impID, Relation: "imports"})
				}
			}
		}

		if strings.Contains(strings.ToLower(rel), "report") {
			fileNode.Kind = KindReport
			fileNode.Tags = append(fileNode.Tags, "report")
		}

		addNode(fileNode)
		return nil
	})
	if err != nil {
		return GraphIndex{}, fmt.Errorf("graphmemory: walk: %w", err)
	}

	return idx, nil
}

// ── Persistence ──────────────────────────────────────────────────────────────

// Index builds the graph index from root and writes it to .vision-graph/index.json.
// This is the only function that writes to disk.
// Returns the absolute path to the written file.
func Index(root string) (string, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", fmt.Errorf("graphmemory: abs root: %w", err)
	}

	idx, err := Build(absRoot)
	if err != nil {
		return "", err
	}

	return WriteIndex(absRoot, idx)
}

// WriteIndex serialises idx to <root>/.vision-graph/index.json.
// Path traversal is blocked — only writes within root/.vision-graph.
func WriteIndex(root string, idx GraphIndex) (string, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", fmt.Errorf("graphmemory: abs root: %w", err)
	}

	target := IndexPath(absRoot)
	absTarget := filepath.Clean(target)
	absGraph := filepath.Clean(GraphPath(absRoot))

	// Block path traversal
	if !strings.HasPrefix(absTarget, absGraph) {
		return "", errors.New("graphmemory: path traversal blocked")
	}

	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return "", fmt.Errorf("graphmemory: mkdir: %w", err)
	}

	data, err := json.MarshalIndent(idx, "", "  ")
	if err != nil {
		return "", fmt.Errorf("graphmemory: marshal: %w", err)
	}
	if err := os.WriteFile(target, data, 0o644); err != nil {
		return "", fmt.Errorf("graphmemory: write: %w", err)
	}

	return target, nil
}

// Load reads and parses .vision-graph/index.json from root.
// If the file does not exist, returns error with message ErrIndexMissing.
func Load(root string) (GraphIndex, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return GraphIndex{}, fmt.Errorf("graphmemory: abs root: %w", err)
	}

	target := IndexPath(absRoot)

	// Block path traversal
	if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(GraphPath(absRoot))) {
		return GraphIndex{}, errors.New("graphmemory: path traversal blocked")
	}

	raw, err := os.ReadFile(target)
	if err != nil {
		if os.IsNotExist(err) {
			return GraphIndex{}, errors.New(ErrIndexMissing)
		}
		return GraphIndex{}, fmt.Errorf("graphmemory: read index: %w", err)
	}

	var idx GraphIndex
	if err := json.Unmarshal(raw, &idx); err != nil {
		return GraphIndex{}, fmt.Errorf("graphmemory: corrupt index: %w", err)
	}
	return idx, nil
}

// ── Summary (reads index — NO filesystem scan) ───────────────────────────────

// Summary loads the index from disk and returns a compact GraphSummary.
// Returns ErrIndexMissing if the index has not been built yet.
func Summary(root string) (GraphSummary, error) {
	idx, err := Load(root)
	if err != nil {
		return GraphSummary{}, err
	}
	return Summarize(idx), nil
}

// Summarize computes a GraphSummary from an already-loaded index.
func Summarize(idx GraphIndex) GraphSummary {
	byKind := map[string]int{}
	for _, n := range idx.Nodes {
		byKind[string(n.Kind)]++
	}
	var paths []string
	for _, n := range idx.Nodes {
		if n.Path != "" {
			paths = append(paths, n.Path)
		}
	}
	sort.Strings(paths)
	top := paths
	if len(top) > 10 {
		top = top[:10]
	}
	return GraphSummary{
		TotalNodes: len(idx.Nodes),
		TotalEdges: len(idx.Edges),
		ByKind:     byKind,
		TopPaths:   top,
		Root:       idx.Root,
		BuildTime:  idx.BuildTime,
	}
}

// ── Query (reads index — NO filesystem scan) ─────────────────────────────────

// Query loads the index from disk and performs a case-insensitive search.
// Returns ErrIndexMissing if the index has not been built yet.
func Query(root, query string, limit int) (GraphQueryResult, error) {
	idx, err := Load(root)
	if err != nil {
		return GraphQueryResult{}, err
	}
	return QueryIndex(idx, query, limit), nil
}

// QueryIndex performs a case-insensitive substring search over a loaded index.
func QueryIndex(idx GraphIndex, query string, limit int) GraphQueryResult {
	if limit <= 0 {
		limit = 10
	}
	q := strings.ToLower(query)
	var matched []GraphNode
	for _, n := range idx.Nodes {
		if matchNode(n, q) {
			matched = append(matched, n)
		}
	}
	sort.Slice(matched, func(i, j int) bool { return matched[i].ID < matched[j].ID })
	total := len(matched)
	if len(matched) > limit {
		matched = matched[:limit]
	}
	return GraphQueryResult{Query: query, Limit: limit, Total: total, Results: matched}
}

func matchNode(n GraphNode, q string) bool {
	if strings.Contains(strings.ToLower(n.Label), q) {
		return true
	}
	if strings.Contains(strings.ToLower(string(n.Kind)), q) {
		return true
	}
	if strings.Contains(strings.ToLower(n.Path), q) {
		return true
	}
	for _, t := range n.Tags {
		if strings.Contains(strings.ToLower(t), q) {
			return true
		}
	}
	return false
}
