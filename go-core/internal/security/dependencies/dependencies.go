// internal/security/dependencies/dependencies.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1 Dependency Guard
package dependencies

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/visioncore/go-core/internal/security/types"
)

type Result struct {
	OK           bool              `json:"ok"`
	Violations   []types.Violation `json:"violations"`
	ScannedFiles []string          `json:"scanned_files"`
	Error        string            `json:"error,omitempty"`
	// retrocompat
	Findings []Finding `json:"findings"`
}

type Finding struct {
	Manager string `json:"manager"`
	Package string `json:"package"`
	Version string `json:"version"`
	Reason  string `json:"reason"`
}

type depRule struct {
	ruleID      string
	severity    string
	remediation string
}

var knownVulnNPM = map[string]struct {
	safeVersion string
	ruleID      string
	severity    string
}{
	"lodash":        {"4.17.21", "AEGIS_DEP_NPM_001", types.SeverityHigh},
	"minimist":      {"1.2.6", "AEGIS_DEP_NPM_002", types.SeverityHigh},
	"node-fetch":    {"2.6.7", "AEGIS_DEP_NPM_003", types.SeverityHigh},
	"axios":         {"0.21.2", "AEGIS_DEP_NPM_004", types.SeverityMedium},
	"express":       {"4.18.2", "AEGIS_DEP_NPM_005", types.SeverityHigh},
	"jsonwebtoken":  {"9.0.0", "AEGIS_DEP_NPM_006", types.SeverityCritical},
	"semver":        {"7.5.2", "AEGIS_DEP_NPM_007", types.SeverityMedium},
	"tough-cookie":  {"4.1.3", "AEGIS_DEP_NPM_008", types.SeverityHigh},
	"ws":            {"8.17.1", "AEGIS_DEP_NPM_009", types.SeverityHigh},
}

var knownVulnPip = map[string]struct {
	safeVersion string
	ruleID      string
	severity    string
}{
	"pillow":       {"10.0.1", "AEGIS_DEP_PIP_001", types.SeverityHigh},
	"requests":     {"2.31.0", "AEGIS_DEP_PIP_002", types.SeverityMedium},
	"cryptography": {"41.0.0", "AEGIS_DEP_PIP_003", types.SeverityCritical},
	"urllib3":      {"2.0.7", "AEGIS_DEP_PIP_004", types.SeverityHigh},
	"setuptools":   {"65.5.1", "AEGIS_DEP_PIP_005", types.SeverityMedium},
	"django":       {"4.2.4", "AEGIS_DEP_PIP_006", types.SeverityHigh},
	"flask":        {"2.3.2", "AEGIS_DEP_PIP_007", types.SeverityMedium},
	"aiohttp":      {"3.9.4", "AEGIS_DEP_PIP_008", types.SeverityHigh},
}

var knownVulnGo = map[string]struct {
	safeVersion string
	ruleID      string
	severity    string
}{
	"golang.org/x/net":          {"0.17.0", "AEGIS_DEP_GO_001", types.SeverityHigh},
	"golang.org/x/crypto":       {"0.17.0", "AEGIS_DEP_GO_002", types.SeverityCritical},
	"golang.org/x/text":         {"0.14.0", "AEGIS_DEP_GO_003", types.SeverityMedium},
	"github.com/golang-jwt/jwt": {"4.5.1", "AEGIS_DEP_GO_004", types.SeverityHigh},
}

type pkgJSON struct {
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
}

func Scan(root string) Result {
	var violations []types.Violation
	var scanned []string

	pkgPath := filepath.Join(root, "package.json")
	if vv, files, err := scanNPM(root, pkgPath); err == nil {
		violations = append(violations, vv...)
		scanned = append(scanned, files...)
	}

	reqPath := filepath.Join(root, "requirements.txt")
	if vv, files, err := scanPip(root, reqPath); err == nil {
		violations = append(violations, vv...)
		scanned = append(scanned, files...)
	}

	goModPath := filepath.Join(root, "go.mod")
	if vv, files, err := scanGoMod(root, goModPath); err == nil {
		violations = append(violations, vv...)
		scanned = append(scanned, files...)
	}

	findings := make([]Finding, 0, len(violations))
	for _, v := range violations {
		findings = append(findings, Finding{Manager: v.Category, Package: v.File, Version: "", Reason: v.Message})
	}

	return Result{OK: len(violations) == 0, Violations: violations, ScannedFiles: scanned, Findings: findings}
}

func scanNPM(root, path string) ([]types.Violation, []string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, err
	}
	var pkg pkgJSON
	if err := json.Unmarshal(data, &pkg); err != nil {
		return nil, nil, err
	}
	rel, _ := filepath.Rel(root, path)

	all := make(map[string]string)
	for k, v := range pkg.Dependencies {
		all[k] = v
	}
	for k, v := range pkg.DevDependencies {
		all[k] = v
	}

	var violations []types.Violation
	for name, ver := range all {
		if ver == "*" || ver == "latest" || ver == "next" {
			violations = append(violations, types.Violation{
				Gate:        "dependencies_ok",
				Category:    "dependencies",
				Severity:    types.SeverityHigh,
				File:        rel,
				Line:        0,
				RuleID:      "AEGIS_DEP_NPM_UNPIN",
				Message:     fmt.Sprintf("npm package '%s' has unpinned version '%s'", name, ver),
				Remediation: fmt.Sprintf("Pin '%s' to a specific semver (e.g. ^%s). Unpinned versions allow supply-chain attacks.", name, "1.0.0"),
			})
			continue
		}
		if info, ok := knownVulnNPM[name]; ok {
			clean := regexp.MustCompile(`[^0-9.]`).ReplaceAllString(ver, "")
			if clean != "" && versionLess(clean, info.safeVersion) {
				violations = append(violations, types.Violation{
					Gate:        "dependencies_ok",
					Category:    "dependencies",
					Severity:    info.severity,
					File:        rel,
					Line:        0,
					RuleID:      info.ruleID,
					Message:     fmt.Sprintf("npm '%s@%s' has known vulnerability (safe: >=%s)", name, ver, info.safeVersion),
					Remediation: fmt.Sprintf("Upgrade to '%s@^%s' or later. Run: npm install %s@latest", name, info.safeVersion, name),
				})
			}
		}
	}
	return violations, []string{path}, nil
}

func scanPip(root, path string) ([]types.Violation, []string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, err
	}
	rel, _ := filepath.Rel(root, path)

	var violations []types.Violation
	lines := strings.Split(string(data), "\n")
	re := regexp.MustCompile(`^([A-Za-z0-9_\-]+)\s*([=><!]+)\s*([\d.]+)`)

	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if !strings.ContainsAny(line, "=><") {
			violations = append(violations, types.Violation{
				Gate:        "dependencies_ok",
				Category:    "dependencies",
				Severity:    types.SeverityHigh,
				File:        rel,
				Line:        i + 1,
				RuleID:      "AEGIS_DEP_PIP_UNPIN",
				Message:     fmt.Sprintf("pip package '%s' has no version pin", line),
				Remediation: fmt.Sprintf("Pin the version: '%s==X.Y.Z'. Run: pip freeze | grep %s", line, line),
			})
			continue
		}
		m := re.FindStringSubmatch(line)
		if len(m) < 4 {
			continue
		}
		name, op, ver := strings.ToLower(m[1]), m[2], m[3]
		if info, ok := knownVulnPip[name]; ok && op == "==" {
			if versionLess(ver, info.safeVersion) {
				violations = append(violations, types.Violation{
					Gate:        "dependencies_ok",
					Category:    "dependencies",
					Severity:    info.severity,
					File:        rel,
					Line:        i + 1,
					RuleID:      info.ruleID,
					Message:     fmt.Sprintf("pip '%s==%s' has known vulnerability (safe: >=%s)", name, ver, info.safeVersion),
					Remediation: fmt.Sprintf("Upgrade: pip install '%s>=%s'", name, info.safeVersion),
				})
			}
		}
	}
	return violations, []string{path}, nil
}

func scanGoMod(root, path string) ([]types.Violation, []string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, err
	}
	rel, _ := filepath.Rel(root, path)

	var violations []types.Violation
	lines := strings.Split(string(data), "\n")
	re := regexp.MustCompile(`^\s*(require\s+)?([^\s]+)\s+v([\d.]+)`)

	for i, line := range lines {
		m := re.FindStringSubmatch(line)
		if len(m) < 4 {
			continue
		}
		mod, ver := m[2], m[3]
		if info, ok := knownVulnGo[mod]; ok {
			if versionLess(ver, info.safeVersion) {
				violations = append(violations, types.Violation{
					Gate:        "dependencies_ok",
					Category:    "dependencies",
					Severity:    info.severity,
					File:        rel,
					Line:        i + 1,
					RuleID:      info.ruleID,
					Message:     fmt.Sprintf("go module '%s@v%s' has known vulnerability (safe: >=%s)", mod, ver, info.safeVersion),
					Remediation: fmt.Sprintf("Run: go get %s@v%s", mod, info.safeVersion),
				})
			}
		}
	}
	return violations, []string{path}, nil
}

func versionLess(a, b string) bool {
	ap := versionParts(a)
	bp := versionParts(b)
	for i := 0; i < 3; i++ {
		if ap[i] < bp[i] {
			return true
		}
		if ap[i] > bp[i] {
			return false
		}
	}
	return false
}

func versionParts(v string) [3]int {
	parts := strings.SplitN(v, ".", 3)
	var out [3]int
	for i := 0; i < 3 && i < len(parts); i++ {
		fmt.Sscanf(parts[i], "%d", &out[i])
	}
	return out
}

func (r Result) Summary() string {
	if r.OK {
		return fmt.Sprintf("dependency_guard: PASS — %d file(s) scanned", len(r.ScannedFiles))
	}
	return fmt.Sprintf("dependency_guard: FAIL — %d violation(s)", len(r.Violations))
}
