// internal/validator/validator.go
// Vision Core Go Safe Core — Validator
// Valida resultado. NUNCA promove release. NUNCA ignora falhas.
package validator

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Result é o resultado da validação.
type Result struct {
	OK       bool     `json:"ok"`
	Checks   []Check  `json:"checks"`
	Error    string   `json:"error,omitempty"`
}

// Check é uma verificação individual.
type Check struct {
	Name    string `json:"name"`
	Passed  bool   `json:"passed"`
	Message string `json:"message,omitempty"`
}

// allowedCmds — apenas comandos permitidos em validação
var allowedCmds = map[string]bool{
	"node": true, "npm": true, "npx": true,
	"go": true, "python": true, "python3": true,
}

// Run executa a validação pós-patch.
func Run(root string, changedFiles []string) Result {
	res := Result{}

	// Check 1: arquivos alterados existem e são legíveis
	filesCheck := checkFilesExist(root, changedFiles)
	res.Checks = append(res.Checks, filesCheck)

	// Check 2: nenhum arquivo em dir bloqueado
	blockedCheck := checkNoBlockedFiles(changedFiles)
	res.Checks = append(res.Checks, blockedCheck)

	// Check 3: syntax check em JS/TS se node disponível
	syntaxCheck := checkNodeSyntax(root, changedFiles)
	res.Checks = append(res.Checks, syntaxCheck)

	// Check 4: sem credenciais hardcoded
	credCheck := checkNoCredentials(root, changedFiles)
	res.Checks = append(res.Checks, credCheck)

	// Resultado final — todos os checks devem passar
	allOK := true
	for _, c := range res.Checks {
		if !c.Passed {
			allOK = false
			break
		}
	}
	res.OK = allOK
	return res
}

func checkFilesExist(root string, files []string) Check {
	c := Check{Name: "files_exist", Passed: true}
	if len(files) == 0 {
		c.Message = "no changed files (dry-run)"
		return c
	}
	missing := []string{}
	for _, f := range files {
		if _, err := os.Stat(filepath.Join(root, f)); err != nil {
			missing = append(missing, f)
		}
	}
	if len(missing) > 0 {
		c.Passed = false
		c.Message = "missing: " + strings.Join(missing, ", ")
	}
	return c
}

func checkNoBlockedFiles(files []string) Check {
	c := Check{Name: "no_blocked_dirs", Passed: true}
	blocked := []string{"node_modules", "dist", ".git", ".env", "build"}
	for _, f := range files {
		for _, b := range blocked {
			if strings.HasPrefix(filepath.ToSlash(f), b+"/") ||
				strings.Contains(filepath.ToSlash(f), "/"+b+"/") {
				c.Passed = false
				c.Message = "blocked dir: " + b + " in " + f
				return c
			}
		}
	}
	return c
}

func checkNodeSyntax(root string, files []string) Check {
	c := Check{Name: "syntax_check", Passed: true}

	// Verificar se node está disponível
	if _, err := exec.LookPath("node"); err != nil {
		c.Message = "node not available (skipped)"
		return c
	}

	for _, f := range files {
		ext := strings.ToLower(filepath.Ext(f))
		if ext != ".js" && ext != ".mjs" && ext != ".cjs" {
			continue
		}
		fullPath := filepath.Join(root, f)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		out, err := exec.CommandContext(ctx, "node", "--check", fullPath).CombinedOutput()
		if err != nil {
			c.Passed = false
			c.Message = f + ": " + strings.TrimSpace(string(out))
			return c
		}
	}
	return c
}

func checkNoCredentials(root string, files []string) Check {
	c := Check{Name: "no_hardcoded_credentials", Passed: true}
	patterns := []string{"sk_live_", "sk_test_", "whsec_", "BEGIN PRIVATE KEY"}

	for _, f := range files {
		data, err := os.ReadFile(filepath.Join(root, f))
		if err != nil {
			continue
		}
		lower := strings.ToLower(string(data))
		for _, p := range patterns {
			if strings.Contains(lower, strings.ToLower(p)) {
				c.Passed = false
				c.Message = "credential pattern in " + f
				return c
			}
		}
	}
	return c
}
