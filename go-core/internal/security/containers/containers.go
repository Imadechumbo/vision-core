// internal/security/containers/containers.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1 Container Guard
package containers

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/visioncore/go-core/internal/security/types"
)

type Result struct {
	OK         bool              `json:"ok"`
	Violations []types.Violation `json:"violations"`
	Error      string            `json:"error,omitempty"`
	Findings   []Finding         `json:"findings"` // retrocompat
}

type Finding struct {
	File   string `json:"file"`
	Line   int    `json:"line"`
	Kind   string `json:"kind"`
	Detail string `json:"detail"`
}

type dockerRule struct {
	ruleID      string
	kind        string
	pattern     *regexp.Regexp
	severity    string
	message     string
	remediation string
}

var dockerfileRules = []dockerRule{
	{
		ruleID:      "AEGIS_CONT_001",
		kind:        "root_user",
		pattern:     regexp.MustCompile(`(?i)^USER\s+root\s*$`),
		severity:    types.SeverityCritical,
		message:     "Container running as root user",
		remediation: "Add 'USER nonroot' or create a dedicated app user: RUN adduser -D appuser && USER appuser",
	},
	{
		ruleID:      "AEGIS_CONT_002",
		kind:        "hardcoded_env_secret",
		pattern:     regexp.MustCompile(`(?i)^ENV\s+.*(PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)\s*[=\s]+\S+`),
		severity:    types.SeverityCritical,
		message:     "Secret hardcoded via Dockerfile ENV directive",
		remediation: "Remove ENV secret from Dockerfile. Use Docker secrets, --env-file at runtime, or a secrets manager.",
	},
	{
		ruleID:      "AEGIS_CONT_003",
		kind:        "curl_pipe_bash",
		pattern:     regexp.MustCompile(`(?i)curl.+\|\s*(bash|sh)\b`),
		severity:    types.SeverityHigh,
		message:     "curl|bash pattern — arbitrary remote code execution risk",
		remediation: "Download and verify checksum before executing: curl -o install.sh URL && sha256sum install.sh && bash install.sh",
	},
	{
		ruleID:      "AEGIS_CONT_004",
		kind:        "add_sensitive",
		pattern:     regexp.MustCompile(`(?i)^ADD\s+.*(\.env|\.pem|\.key|id_rsa|credentials)`),
		severity:    types.SeverityHigh,
		message:     "Sensitive file copied into image via ADD directive",
		remediation: "Remove sensitive files from image. Use Docker secrets or mount at runtime with --secret.",
	},
	{
		ruleID:      "AEGIS_CONT_005",
		kind:        "exposed_privileged_port",
		pattern:     regexp.MustCompile(`(?i)^EXPOSE\s+([1-9]|[1-9][0-9]{1,2}|10[01][0-9]|102[0-3])\b`),
		severity:    types.SeverityMedium,
		message:     "Privileged port (<1024) exposed in container",
		remediation: "Use ports >=1024 inside container and map with -p 80:8080 at runtime.",
	},
}

var composeRules = []dockerRule{
	{
		ruleID:      "AEGIS_CONT_006",
		kind:        "privileged_container",
		pattern:     regexp.MustCompile(`(?i)privileged:\s*true`),
		severity:    types.SeverityCritical,
		message:     "Container running in privileged mode — full host access",
		remediation: "Remove 'privileged: true'. Use specific capabilities with 'cap_add' only if required.",
	},
	{
		ruleID:      "AEGIS_CONT_007",
		kind:        "host_network",
		pattern:     regexp.MustCompile(`(?i)network_mode:\s*["']?host`),
		severity:    types.SeverityHigh,
		message:     "Container using host network mode — bypasses network isolation",
		remediation: "Use bridge or custom networks. Define explicit 'networks:' in compose file.",
	},
	{
		ruleID:      "AEGIS_CONT_008",
		kind:        "hardcoded_compose_secret",
		pattern:     regexp.MustCompile(`(?i)(PASSWORD|SECRET|TOKEN|API_KEY)\s*[:=]\s*\S{4,}`),
		severity:    types.SeverityHigh,
		message:     "Secret hardcoded in docker-compose file",
		remediation: "Use Docker secrets or env_file referencing a .env not committed to version control.",
	},
	{
		ruleID:      "AEGIS_CONT_009",
		kind:        "pid_host",
		pattern:     regexp.MustCompile(`(?i)pid:\s*["']?host`),
		severity:    types.SeverityHigh,
		message:     "Container sharing host PID namespace",
		remediation: "Remove 'pid: host' unless strictly required for debugging tools.",
	},
}

func Scan(root string) Result {
	var violations []types.Violation

	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			skip := map[string]bool{"node_modules": true, ".git": true, "vendor": true, ".vision-snapshots": true, ".vision-test": true}
			if skip[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		name := d.Name()
		nameLower := strings.ToLower(name)
		if name == "Dockerfile" || strings.HasPrefix(nameLower, "dockerfile") {
			violations = append(violations, scanDockerfile(root, path)...)
		}
		if nameLower == "docker-compose.yml" || nameLower == "docker-compose.yaml" || strings.HasPrefix(nameLower, "docker-compose.") {
			violations = append(violations, scanCompose(root, path)...)
		}
		return nil
	})

	findings := make([]Finding, 0, len(violations))
	for _, v := range violations {
		findings = append(findings, Finding{File: v.File, Line: v.Line, Kind: v.RuleID, Detail: v.Message})
	}

	return Result{OK: len(violations) == 0, Violations: violations, Findings: findings}
}

func scanDockerfile(root, path string) []types.Violation {
	lines, err := readLines(path)
	if err != nil {
		return nil
	}
	rel, _ := filepath.Rel(root, path)
	var violations []types.Violation
	hasUser := false

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") {
			continue
		}
		if regexp.MustCompile(`(?i)^USER\s+\S+`).MatchString(trimmed) {
			hasUser = true
		}
		for _, r := range dockerfileRules {
			if r.kind == "no_user_set" {
				continue
			}
			if r.pattern != nil && r.pattern.MatchString(trimmed) {
				violations = append(violations, types.Violation{
					Gate: "containers_ok", Category: "containers",
					Severity: r.severity, File: rel, Line: i + 1,
					RuleID: r.ruleID, Message: r.message, Remediation: r.remediation,
				})
			}
		}
	}
	if !hasUser {
		violations = append(violations, types.Violation{
			Gate: "containers_ok", Category: "containers",
			Severity: types.SeverityCritical, File: rel, Line: 0,
			RuleID:      "AEGIS_CONT_010",
			Message:     "No USER directive in Dockerfile — defaults to root",
			Remediation: "Add 'USER nonroot' before CMD/ENTRYPOINT. Create user with: RUN adduser -D appuser",
		})
	}
	return violations
}

func scanCompose(root, path string) []types.Violation {
	lines, err := readLines(path)
	if err != nil {
		return nil
	}
	rel, _ := filepath.Rel(root, path)
	var violations []types.Violation
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") {
			continue
		}
		for _, r := range composeRules {
			if r.pattern.MatchString(trimmed) {
				violations = append(violations, types.Violation{
					Gate: "containers_ok", Category: "containers",
					Severity: r.severity, File: rel, Line: i + 1,
					RuleID: r.ruleID, Message: r.message, Remediation: r.remediation,
				})
			}
		}
	}
	return violations
}

func readLines(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var lines []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		lines = append(lines, sc.Text())
	}
	return lines, sc.Err()
}

func (r Result) Summary() string {
	if r.OK {
		return "container_guard: PASS — no container issues"
	}
	return fmt.Sprintf("container_guard: FAIL — %d violation(s)", len(r.Violations))
}
