// internal/patcher/dependency_graph.go
// Vision Core Go Safe Core — Dependency Graph for Patch Ordering
//
// Ordena arquivos a serem patchados respeitando dependências:
// arquivos que outros importam devem ser patchados primeiro.
package patcher

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// DepNode é um nó no grafo de dependências.
type DepNode struct {
	File    string   `json:"file"`
	Imports []string `json:"imports"`
	Level   int      `json:"level"` // 0 = sem dependências, n = depende de n arquivos
}

// DepGraph é o grafo de dependências do batch.
type DepGraph struct {
	Nodes []DepNode `json:"nodes"`
	Order []string  `json:"order"` // ordem de patch recomendada
}

var (
	reImport  = regexp.MustCompile(`(?:require|import)\s*\(?['"]([^'"]+)['"]\)?`)
	reGoImport = regexp.MustCompile(`"([^"]+)"`)
)

// BuildDepGraph constrói o grafo de dependências entre os arquivos do batch.
// Retorna a ordem recomendada para aplicar os patches (topológica).
func BuildDepGraph(root string, files []string) DepGraph {
	graph := DepGraph{}

	// Conjunto de arquivos no batch (para detectar deps internas)
	fileSet := make(map[string]bool, len(files))
	for _, f := range files {
		fileSet[f] = true
	}

	// Construir nós
	nodeMap := make(map[string]*DepNode, len(files))
	for _, f := range files {
		imports := extractLocalImports(root, f, fileSet)
		node := &DepNode{File: f, Imports: imports}
		nodeMap[f] = node
		graph.Nodes = append(graph.Nodes, *node)
	}

	// Ordenação topológica simples (Kahn's algorithm)
	graph.Order = topoSort(files, nodeMap)

	// Atribuir níveis
	levels := computeLevels(graph.Order, nodeMap)
	for i := range graph.Nodes {
		graph.Nodes[i].Level = levels[graph.Nodes[i].File]
	}

	return graph
}

// SortByDependency retorna os FilePlans ordenados por dependência.
// Arquivos base (sem deps) vêm primeiro.
func SortByDependency(root string, plans []FilePlan) []FilePlan {
	files := make([]string, len(plans))
	for i, p := range plans {
		files[i] = p.File
	}

	graph := BuildDepGraph(root, files)

	// Mapear FilePlan por file
	planMap := make(map[string]FilePlan, len(plans))
	for _, p := range plans {
		planMap[p.File] = p
	}

	// Reconstruir na ordem do grafo
	sorted := make([]FilePlan, 0, len(plans))
	seen := make(map[string]bool)
	for _, f := range graph.Order {
		if p, ok := planMap[f]; ok && !seen[f] {
			sorted = append(sorted, p)
			seen[f] = true
		}
	}

	// Adicionar qualquer file que não entrou na ordenação
	for _, p := range plans {
		if !seen[p.File] {
			sorted = append(sorted, p)
		}
	}

	return sorted
}

// ── Internos ─────────────────────────────────────────────────────

func extractLocalImports(root, file string, fileSet map[string]bool) []string {
	fullPath := filepath.Join(root, file)
	f, err := os.Open(fullPath)
	if err != nil {
		return nil
	}
	defer f.Close()

	ext := strings.ToLower(filepath.Ext(file))
	var imports []string
	seen := make(map[string]bool)

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		var matches [][]string
		if ext == ".go" {
			matches = reGoImport.FindAllStringSubmatch(line, -1)
		} else {
			matches = reImport.FindAllStringSubmatch(line, -1)
		}

		for _, m := range matches {
			if len(m) < 2 {
				continue
			}
			imported := m[1]

			// Apenas imports locais relativos (./xxx ou ../xxx)
			if !strings.HasPrefix(imported, ".") {
				continue
			}

			// Resolver o path relativo
			base := filepath.Dir(file)
			resolved := filepath.ToSlash(filepath.Join(base, imported))

			// Checar se o arquivo resolvido está no batch
			for f := range fileSet {
				if f == resolved ||
					strings.TrimSuffix(f, filepath.Ext(f)) == resolved ||
					strings.TrimSuffix(resolved, filepath.Ext(resolved)) == strings.TrimSuffix(f, filepath.Ext(f)) {
					if !seen[f] {
						seen[f] = true
						imports = append(imports, f)
					}
				}
			}
		}
	}
	return imports
}

func topoSort(files []string, nodeMap map[string]*DepNode) []string {
	visited := make(map[string]bool)
	order := make([]string, 0, len(files))

	var visit func(f string)
	visit = func(f string) {
		if visited[f] {
			return
		}
		visited[f] = true
		if node, ok := nodeMap[f]; ok {
			for _, dep := range node.Imports {
				visit(dep)
			}
		}
		order = append(order, f)
	}

	for _, f := range files {
		visit(f)
	}

	// Inverter: dependências primeiro
	reversed := make([]string, len(order))
	for i, v := range order {
		reversed[len(order)-1-i] = v
	}
	return reversed
}

func computeLevels(order []string, nodeMap map[string]*DepNode) map[string]int {
	levels := make(map[string]int, len(order))
	for _, f := range order {
		level := 0
		if node, ok := nodeMap[f]; ok {
			for _, dep := range node.Imports {
				if depLevel, exists := levels[dep]; exists && depLevel+1 > level {
					level = depLevel + 1
				}
			}
		}
		levels[f] = level
	}
	return levels
}
