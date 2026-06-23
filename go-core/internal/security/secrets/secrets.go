// internal/security/secrets/secrets.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1 Secrets Guard
// Detecta vazamento de credenciais com Violations estruturadas.
package secrets

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/visioncore/go-core/internal/security/types"
)

// Result é o resultado do Secrets Guard.
type Result struct {
	OK         bool              `json:"ok"`
	Violations []types.Violation `json:"violations"`
	Error      string            `json:"error,omitempty"`
	Findings   []Finding         `json:"findings"` // retrocompat
}

// Finding — compatibilidade retroativa.
type Finding struct {
	File    string `json:"file"`
	Line    int    `json:"line"`
	Kind    string `json:"kind"`
	Excerpt string `json:"excerpt"`
}

type secretRule struct {
	ruleID      string
	kind        string
	pattern     *regexp.Regexp
	severity    string
	message     string
	remediation string
}

var rules = []secretRule{
	{
		ruleID:      "AEGIS_SECRET_001",
		kind:        "aws_access_key",
		pattern:     regexp.MustCompile(`(?i)(AKIA|ASIA|AROA)[A-Z0-9]{16}`),
		severity:    types.SeverityCritical,
		message:     "AWS Access Key ID hardcoded in source",
		remediation: "Remove key from source. Use AWS IAM roles or env var AWS_ACCESS_KEY_ID. Rotate the exposed key immediately via AWS IAM console.",
	},
	{
		ruleID:      "AEGIS_SECRET_002",
		kind:        "aws_secret_key",
		pattern:     regexp.MustCompile(`(?i)aws.{0,20}secret.{0,20}[=:]\s*["']?[A-Za-z0-9/+=]{40}`),
		severity:    types.SeverityCritical,
		message:     "AWS Secret Access Key hardcoded in source",
		remediation: "Remove secret. Use AWS Secrets Manager or env var. Rotate immediately via AWS IAM.",
	},
	{
		ruleID:      "AEGIS_SECRET_003",
		kind:        "github_token",
		pattern:     regexp.MustCompile(`gh[pousr]_[A-Za-z0-9]{36,}`),
		severity:    types.SeverityCritical,
		message:     "GitHub Personal Access Token exposed in source",
		remediation: "Revoke at github.com/settings/tokens. Use GITHUB_TOKEN env var or GitHub Actions secrets.",
	},
	{
		ruleID:      "AEGIS_SECRET_004",
		kind:        "github_fine_grained",
		pattern:     regexp.MustCompile(`github_pat_[A-Za-z0-9_]{82,}`),
		severity:    types.SeverityCritical,
		message:     "GitHub Fine-Grained PAT exposed in source",
		remediation: "Revoke immediately. Inject via GitHub Actions secrets or vault.",
	},
	{
		ruleID:      "AEGIS_SECRET_005",
		kind:        "stripe_secret",
		pattern:     regexp.MustCompile(`sk_(live|test)_[A-Za-z0-9]{24,}`),
		severity:    types.SeverityCritical,
		message:     "Stripe Secret Key hardcoded in source",
		remediation: "Roll key at dashboard.stripe.com/apikeys. Inject via STRIPE_SECRET_KEY env var.",
	},
	{
		ruleID:      "AEGIS_SECRET_006",
		kind:        "stripe_restricted",
		pattern:     regexp.MustCompile(`rk_(live|test)_[A-Za-z0-9]{24,}`),
		severity:    types.SeverityHigh,
		message:     "Stripe Restricted Key hardcoded in source",
		remediation: "Roll key at Stripe dashboard. Use env var injection.",
	},
	{
		ruleID:      "AEGIS_SECRET_007",
		kind:        "next_public_secret",
		pattern:     regexp.MustCompile(`NEXT_PUBLIC_(?:SECRET|KEY|TOKEN|PASSWORD|API_KEY)\s*[=:]\s*["']?[^\s"']{8,}`),
		severity:    types.SeverityHigh,
		message:     "Secret exposed via NEXT_PUBLIC_ prefix — visible to browser bundle",
		remediation: "Move to server-side env var without NEXT_PUBLIC_ prefix. Never expose secrets to client.",
	},
	{
		ruleID:      "AEGIS_SECRET_008",
		kind:        "vite_secret",
		pattern:     regexp.MustCompile(`VITE_(?:SECRET|KEY|TOKEN|PASSWORD|API_KEY)\s*[=:]\s*["']?[^\s"']{8,}`),
		severity:    types.SeverityHigh,
		message:     "Secret exposed via VITE_ prefix — embedded in client bundle at build time",
		remediation: "Move secret to backend only. VITE_ vars are publicly accessible in the built output.",
	},
	{
		ruleID:      "AEGIS_SECRET_009",
		kind:        "hardcoded_password",
		pattern:     regexp.MustCompile(`(?i)(password|passwd|pwd)\s*[=:]\s*["'][^"']{8,}["']`),
		severity:    types.SeverityHigh,
		message:     "Password hardcoded in source code",
		remediation: "Use env vars or a secrets manager (HashiCorp Vault, AWS Secrets Manager). Never hardcode credentials.",
	},
	{
		ruleID:      "AEGIS_SECRET_010",
		kind:        "hardcoded_secret",
		pattern:     regexp.MustCompile(`(?i)(secret|api_key|apikey|auth_token|access_token)\s*[=:]\s*["'][^"']{8,}["']`),
		severity:    types.SeverityHigh,
		message:     "API key or token hardcoded in source code",
		remediation: "Inject credentials via environment variables at runtime. Rotate any exposed values.",
	},
}

var scanExts = map[string]bool{
	".go": true, ".js": true, ".ts": true, ".jsx": true, ".tsx": true,
	".py": true, ".java": true, ".yaml": true, ".yml": true,
	".toml": true, ".json": true, ".sh": true, ".env": true,
	".conf": true, ".config": true, ".properties": true,
}

var dirSkip = map[string]bool{
	"node_modules": true, ".git": true, "vendor": true,
	".vision-snapshots": true, ".vision-test": true,
	"dist": true, "build": true, ".next": true,
	"_fixture_stress": true, "_archive": true, // §132: fixture + archive dirs are test fixtures
}

// Scan varre root em busca de segredos expostos.
func Scan(root string) Result {
	var violations []types.Violation

	_ = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if dirSkip[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if !scanExts[ext] {
			return nil
		}
		vv := scanFile(root, path)
		violations = append(violations, vv...)
		return nil
	})

	// retrocompat Findings
	findings := make([]Finding, 0, len(violations))
	for _, v := range violations {
		findings = append(findings, Finding{File: v.File, Line: v.Line, Kind: v.RuleID, Excerpt: v.Message})
	}

	return Result{OK: len(violations) == 0, Violations: violations, Findings: findings}
}

func scanFile(root, path string) []types.Violation {
	f, err := os.Open(path)
	if err != nil {
		return nil
	}
	defer f.Close()

	rel, _ := filepath.Rel(root, path)
	var violations []types.Violation
	sc := bufio.NewScanner(f)
	lineNum := 0
	for sc.Scan() {
		lineNum++
		line := sc.Text()
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}
		for _, r := range rules {
			if r.pattern.MatchString(line) {
				violations = append(violations, types.Violation{
					Gate:        "secrets_ok",
					Category:    "secrets",
					Severity:    r.severity,
					File:        rel,
					Line:        lineNum,
					RuleID:      r.ruleID,
					Message:     r.message,
					Remediation: r.remediation,
				})
				break
			}
		}
	}
	return filterNoise(path, violations)
}

func filterNoise(path string, violations []types.Violation) []types.Violation {
	name := strings.ToLower(filepath.Base(path))
	if strings.Contains(name, "lock") || strings.Contains(name, ".sum") || strings.Contains(name, "checksum") {
		return nil
	}
	return violations
}

func (r Result) Summary() string {
	if r.OK {
		return "secrets_guard: PASS — no secrets detected"
	}
	return fmt.Sprintf("secrets_guard: FAIL — %d violation(s)", len(r.Violations))
}
