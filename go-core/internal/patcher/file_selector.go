// internal/patcher/file_selector.go
// Vision Core Go Safe Core — Multi-File Selector
//
// Seleciona quais arquivos incluir em um BatchPlan com base em:
//   - extensão, padrão de nome ou lista explícita
//   - nunca inclui dirs bloqueados
//   - nunca inclui arquivos de infraestrutura
package patcher

import (
	"os"
	"path/filepath"
	"strings"
)

// SelectCriteria define os critérios de seleção de arquivos.
type SelectCriteria struct {
	Root        string   // root do projeto
	Extensions  []string // ex: [".js", ".go"]
	Patterns    []string // ex: ["server", "config"]
	Explicit    []string // lista explícita de paths relativos
	MaxFiles    int      // limite máximo (0 = sem limite, default 20)
	ExcludeDirs []string // dirs adicionais a excluir (além dos já bloqueados)
}

// SelectResult contém os arquivos selecionados e o motivo.
type SelectResult struct {
	Files   []string `json:"files"`
	Total   int      `json:"total"`
	Skipped int      `json:"skipped"` // ignorados por regra de bloqueio
}

// SelectFiles seleciona arquivos para o batch respeitando todas as regras de segurança.
func SelectFiles(criteria SelectCriteria) SelectResult {
	if criteria.MaxFiles <= 0 {
		criteria.MaxFiles = 20
	}

	result := SelectResult{}
	seen := make(map[string]bool)

	// Modo explícito: lista fornecida diretamente
	if len(criteria.Explicit) > 0 {
		for _, f := range criteria.Explicit {
			if len(result.Files) >= criteria.MaxFiles {
				break
			}
			if isValidTarget(f) {
				if !seen[f] {
					seen[f] = true
					result.Files = append(result.Files, f)
				}
			} else {
				result.Skipped++
			}
		}
		result.Total = len(result.Files)
		return result
	}

	// Modo de descoberta: caminhar pelo root
	_ = filepath.WalkDir(criteria.Root, func(path string, d os.DirEntry, err error) error {
		if err != nil || len(result.Files) >= criteria.MaxFiles {
			return nil
		}

		// Pular dirs bloqueados
		if d.IsDir() {
			name := d.Name()
			if isSkippedDir(name, criteria.ExcludeDirs) {
				return filepath.SkipDir
			}
			return nil
		}

		// Path relativo ao root
		rel, err := filepath.Rel(criteria.Root, path)
		if err != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)

		// Verificar se é alvo válido
		if !isValidTarget(rel) {
			result.Skipped++
			return nil
		}

		// Filtro de extensão
		if len(criteria.Extensions) > 0 {
			ext := strings.ToLower(filepath.Ext(rel))
			matched := false
			for _, e := range criteria.Extensions {
				if e == ext {
					matched = true
					break
				}
			}
			if !matched {
				return nil
			}
		}

		// Filtro de padrão
		if len(criteria.Patterns) > 0 {
			matched := false
			name := strings.ToLower(filepath.Base(rel))
			for _, p := range criteria.Patterns {
				if strings.Contains(name, strings.ToLower(p)) {
					matched = true
					break
				}
			}
			if !matched {
				return nil
			}
		}

		if !seen[rel] {
			seen[rel] = true
			result.Files = append(result.Files, rel)
		}
		return nil
	})

	result.Total = len(result.Files)
	return result
}

// BuildBatchFromSelector constrói um BatchPlan a partir de critérios de seleção.
// Op padrão: append de comentário de auditoria.
func BuildBatchFromSelector(missionID string, criteria SelectCriteria, ops []Op) BatchPlan {
	selected := SelectFiles(criteria)

	// Ordenar por dependência
	filePlans := make([]FilePlan, 0, len(selected.Files))
	for _, f := range selected.Files {
		filePlans = append(filePlans, FilePlan{File: f, Ops: ops})
	}

	// Aplicar ordenação por dependência
	sorted := SortByDependency(criteria.Root, filePlans)

	return BatchPlan{
		MissionID:   missionID,
		Files:       sorted,
		Description: "auto-selected batch",
	}
}

// ── Helpers ──────────────────────────────────────────────────────

// infraFiles são arquivos de infraestrutura que nunca devem ser patchados automaticamente.
var infraFiles = map[string]bool{
	"go.sum": true, "package-lock.json": true, "yarn.lock": true,
	"pnpm-lock.yaml": true, ".gitignore": true, ".npmignore": true,
	"Makefile": true, "Dockerfile": true,
}

func isValidTarget(relPath string) bool {
	// Bloquear path traversal
	if strings.Contains(relPath, "..") {
		return false
	}

	// Bloquear dirs proibidos
	if blocked, _ := isBlockedPath(relPath); blocked {
		return false
	}

	// Bloquear arquivos de infra
	base := filepath.Base(relPath)
	if infraFiles[base] {
		return false
	}

	return true
}

var alwaysSkippedDirs = []string{
	"node_modules", ".git", "dist", "build",
	".cache", "out", "release", "vendor",
	".vision-snapshots", ".vision-test",
}

func isSkippedDir(name string, extra []string) bool {
	for _, d := range alwaysSkippedDirs {
		if name == d {
			return true
		}
	}
	for _, d := range extra {
		if name == d {
			return true
		}
	}
	return false
}
