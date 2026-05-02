// internal/scanner/scanner.go
// Vision Core Go Safe Core — Scanner
// Responsabilidade: ler o projeto. NUNCA altera arquivos.
package scanner

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// Result é o resultado do scan do projeto.
type Result struct {
	OK           bool     `json:"ok"`
	Root         string   `json:"root"`
	FilesFound   int      `json:"files_found"`
	Stack        []string `json:"stack"`
	Endpoints    []string `json:"endpoints"`
	HasGoMod     bool     `json:"has_go_mod"`
	HasPackageJSON bool   `json:"has_package_json"`
	HasDockerfile bool    `json:"has_dockerfile"`
	Error        string   `json:"error,omitempty"`
}

var (
	reEndpoint = regexp.MustCompile(`app\.(get|post|put|patch|delete|all|use)\s*\(\s*['"]([^'"]+)['"]`)
	skipDirs   = map[string]bool{
		"node_modules": true, ".git": true, "dist": true,
		"build": true, ".cache": true, "bin": true, "out": true,
	}
	jsExts = map[string]bool{
		".js": true, ".jsx": true, ".ts": true, ".tsx": true,
		".mjs": true, ".cjs": true, ".go": true,
	}
)

// Run executa o scan no root informado.
// PROIBIDO: alterar arquivos, seguir ../
func Run(root string) Result {
	res := Result{Root: root}

	info, err := os.Stat(root)
	if err != nil {
		res.Error = "root not found: " + err.Error()
		return res
	}
	if !info.IsDir() {
		res.Error = "root is not a directory"
		return res
	}

	// Detectar markers de stack
	res.HasGoMod = fileExists(filepath.Join(root, "go.mod"))
	res.HasPackageJSON = fileExists(filepath.Join(root, "package.json")) ||
		fileExists(filepath.Join(root, "backend", "package.json"))
	res.HasDockerfile = fileExists(filepath.Join(root, "Dockerfile")) ||
		fileExists(filepath.Join(root, "docker-compose.yml"))

	// Stack detection
	if res.HasGoMod {
		res.Stack = append(res.Stack, "go")
	}
	if res.HasPackageJSON {
		res.Stack = append(res.Stack, "node")
	}
	if res.HasDockerfile {
		res.Stack = append(res.Stack, "docker")
	}

	// Coletar arquivos e endpoints
	endpointSet := map[string]bool{}
	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if skipDirs[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if !jsExts[ext] {
			return nil
		}
		res.FilesFound++

		// Extrair endpoints dos arquivos JS
		if ext != ".go" {
			data, e := os.ReadFile(path)
			if e == nil {
				for _, m := range reEndpoint.FindAllSubmatch(data, -1) {
					ep := strings.ToUpper(string(m[1])) + " " + string(m[2])
					if !endpointSet[ep] {
						endpointSet[ep] = true
						res.Endpoints = append(res.Endpoints, ep)
					}
				}
			}
		}
		return nil
	})

	res.OK = true
	return res
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
