// internal/patcher/patcher.go
// Vision Core Go Safe Core — Patcher
// Aplica patches seguros. NUNCA toca node_modules, dist, .git, .env, sem snapshot.
package patcher

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/visioncore/go-core/internal/fileops"
)

// Op é uma operação de patch.
type Op struct {
	Type    string `json:"type"`    // "replace" | "append" | "prepend" | "delete"
	Target  string `json:"target"`  // string a substituir
	Content string `json:"content"` // novo conteúdo
}

// Plan é um plano de patch completo.
type Plan struct {
	MissionID string `json:"mission_id"`
	File      string `json:"file"`      // relativo ao root
	DryRun    bool   `json:"dry_run"`   // se true: valida sem alterar
	Ops       []Op   `json:"ops"`
}

// Result é o resultado do patch.
type Result struct {
	OK         bool     `json:"ok"`
	DryRun     bool     `json:"dry_run"`
	File       string   `json:"file"`
	SnapshotID string   `json:"snapshot_id,omitempty"`
	Applied    int      `json:"applied"`
	Skipped    int      `json:"skipped"`
	Errors     []string `json:"errors,omitempty"`
	Error      string   `json:"error,omitempty"`
}

// Dirs bloqueados — nunca alterar
var blockedDirs = []string{
	"node_modules", "dist", ".git", "build",
	".cache", "out", "release", ".env",
}

// Apply aplica um plano de patch no root informado.
// Se DryRun=true: valida sem escrever nada.
func Apply(root string, plan Plan, snapshotDir string) Result {
	res := Result{File: plan.File, DryRun: plan.DryRun}

	// Validar path do arquivo
	if err := fileops.ValidateSafePath(root, plan.File); err != nil {
		res.Error = err.Error()
		return res
	}

	// Bloquear dirs proibidos
	if blocked, dir := isBlockedPath(plan.File); blocked {
		res.Error = fmt.Sprintf("patch blocked in %s", dir)
		return res
	}

	// Ler arquivo original
	data, readRes := fileops.ReadFile(root, plan.File)
	if !readRes.OK {
		res.Error = "cannot read file: " + readRes.Error
		return res
	}

	// Criar snapshot ANTES de alterar (obrigatório, exceto dry-run)
	if !plan.DryRun {
		snap, snapRes := fileops.CreateSnapshot(root, plan.File, plan.MissionID, snapshotDir)
		if !snapRes.OK {
			res.Error = "snapshot failed: " + snapRes.Error
			return res
		}
		res.SnapshotID = snap.ID
	}

	// Aplicar operações
	content := string(data)
	for _, op := range plan.Ops {
		switch op.Type {
		case "replace":
			if strings.Contains(content, op.Target) {
				if !plan.DryRun {
					content = strings.Replace(content, op.Target, op.Content, 1)
				}
				res.Applied++
			} else {
				res.Skipped++
				res.Errors = append(res.Errors, fmt.Sprintf("target not found: %.60s", op.Target))
			}
		case "append":
			if !plan.DryRun {
				content = content + op.Content
			}
			res.Applied++
		case "prepend":
			if !plan.DryRun {
				content = op.Content + content
			}
			res.Applied++
		case "delete":
			if strings.Contains(content, op.Target) {
				if !plan.DryRun {
					content = strings.Replace(content, op.Target, "", 1)
				}
				res.Applied++
			} else {
				res.Skipped++
			}
		default:
			res.Errors = append(res.Errors, "unknown op: "+op.Type)
			res.Skipped++
		}
	}

	// Escrever resultado (não em dry-run)
	if !plan.DryRun {
		fullPath := filepath.Join(root, plan.File)
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			res.Error = "write failed: " + err.Error()
			return res
		}
	}

	res.OK = true
	return res
}

func isBlockedPath(relPath string) (bool, string) {
	normalized := filepath.ToSlash(relPath)
	for _, dir := range blockedDirs {
		if strings.HasPrefix(normalized, dir+"/") ||
			strings.Contains(normalized, "/"+dir+"/") ||
			normalized == dir {
			return true, dir
		}
	}
	return false, ""
}
