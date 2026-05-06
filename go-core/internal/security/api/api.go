// internal/security/api/api.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1 API Guard
package api

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
	OK                bool              `json:"ok"`
	Violations        []types.Violation `json:"violations"`
	JWTDetected       bool              `json:"jwt_detected"`
	CORSDetected      bool              `json:"cors_detected"`
	RateLimitDetected bool              `json:"rate_limit_detected"`
	AuthDetected      bool              `json:"auth_detected"`
	Error             string            `json:"error,omitempty"`
	Findings          []Finding         `json:"findings"` // retrocompat
}

type Finding struct {
	File   string `json:"file"`
	Line   int    `json:"line"`
	Kind   string `json:"kind"`
	Detail string `json:"detail"`
}

type apiRule struct {
	ruleID      string
	kind        string
	pattern     *regexp.Regexp
	severity    string
	message     string
	remediation string
}

var dangerRules = []apiRule{
	{
		ruleID:      "AEGIS_API_001",
		kind:        "jwt_none_algorithm",
		pattern:     regexp.MustCompile(`(?i)(algorithm|alg)\s*[:=]\s*["']none["']`),
		severity:    types.SeverityCritical,
		message:     "JWT algorithm set to 'none' — authentication bypass vulnerability (CVE-2015-9235)",
		remediation: "Use RS256 or HS256. Never allow 'none'. Validate alg header server-side.",
	},
	{
		ruleID:      "AEGIS_API_002",
		kind:        "jwt_weak_secret",
		pattern:     regexp.MustCompile(`(?i)(jwt.secret|jwt_secret|jwtSecret)\s*[:=]\s*["'][^"']{1,16}["']`),
		severity:    types.SeverityHigh,
		message:     "JWT secret is shorter than 16 characters — brute-force risk",
		remediation: "Use a cryptographically random secret of at least 32 chars. Store in env var JWT_SECRET.",
	},
	{
		ruleID:      "AEGIS_API_003",
		kind:        "jwt_hardcoded",
		pattern:     regexp.MustCompile(`(?i)(jwt.secret|jwtSecret|jwt_secret)\s*[:=]\s*["'][^"']+["']`),
		severity:    types.SeverityHigh,
		message:     "JWT secret hardcoded in source — must be injected via environment variable",
		remediation: "Replace with process.env.JWT_SECRET or os.Getenv('JWT_SECRET'). Rotate the exposed secret.",
	},
	{
		ruleID:      "AEGIS_API_004",
		kind:        "cors_wildcard",
		pattern:     regexp.MustCompile(`(?i)(Access-Control-Allow-Origin|allowedOrigins?|origin)\s*[:=]\s*["']\*["']`),
		severity:    types.SeverityHigh,
		message:     "CORS configured with wildcard (*) — allows requests from any origin",
		remediation: "Restrict to known origins: allowedOrigins: ['https://yourdomain.com']. Never use '*' with credentials.",
	},
	{
		ruleID:      "AEGIS_API_005",
		kind:        "auth_skip_flag",
		pattern:     regexp.MustCompile(`(?i)(skipAuth|skip_auth|bypass.?auth|noAuth|no_auth)\s*[:=]\s*(true|1)`),
		severity:    types.SeverityCritical,
		message:     "Authentication bypass flag is set to true",
		remediation: "Remove the bypass flag. Authentication must not be skippable in any execution path.",
	},
	{
		ruleID:      "AEGIS_API_006",
		kind:        "debug_auth_disabled",
		pattern:     regexp.MustCompile(`(?i)(if.*dev|if.*debug|if.*local).*(skip|disable|bypass).*(auth|jwt|token)`),
		severity:    types.SeverityHigh,
		message:     "Authentication disabled in debug/dev mode — risk of misconfigured production deploy",
		remediation: "Never disable auth based on NODE_ENV or similar flags. Use test tokens with limited scope instead.",
	},
	{
		ruleID:      "AEGIS_API_007",
		kind:        "token_logged",
		pattern:     regexp.MustCompile(`(?i)(console\.log|log\.print|fmt\.print).*(token|jwt|secret|password)`),
		severity:    types.SeverityMedium,
		message:     "Sensitive credential may be written to logs",
		remediation: "Remove logging of tokens/secrets. If debugging, use a redacted placeholder.",
	},
	{
		ruleID:      "AEGIS_API_008",
		kind:        "rate_limit_commented",
		pattern:     regexp.MustCompile(`(?i)^\s*//\s*(app\.use|router\.use|server\.use|.*rateLimit\(|.*RateLimiter|.*limiter\.New)`),
		severity:    types.SeverityMedium,
		message:     "Rate limiting appears commented out in source",
		remediation: "Re-enable rate limiting middleware. Without it the API is vulnerable to brute-force and DoS attacks.",
	},
}

var positivePatterns = map[string]*regexp.Regexp{
	"jwt":        regexp.MustCompile(`(?i)(jwt|jsonwebtoken|golang-jwt)`),
	"cors":       regexp.MustCompile(`(?i)(cors|CORS|Access-Control)`),
	"rate_limit": regexp.MustCompile(`(?i)(rateLimit|rate.limit|RateLimiter|limiter\.New)`),
	"auth":       regexp.MustCompile(`(?i)(middleware|AuthRequired|RequireAuth|authenticate|verifyToken|JWTMiddleware)`),
}

var scanExts = map[string]bool{
	".go": true, ".js": true, ".ts": true, ".jsx": true, ".tsx": true, ".py": true,
}

var dirSkip = map[string]bool{
	"node_modules": true, ".git": true, "vendor": true,
	".vision-snapshots": true, ".vision-test": true,
	"dist": true, "build": true, ".next": true,
}

func Scan(root string) Result {
	var violations []types.Violation
	res := Result{}

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
		vv, positive := scanFile(root, path)
		violations = append(violations, vv...)
		if positive["jwt"] {
			res.JWTDetected = true
		}
		if positive["cors"] {
			res.CORSDetected = true
		}
		if positive["rate_limit"] {
			res.RateLimitDetected = true
		}
		if positive["auth"] {
			res.AuthDetected = true
		}
		return nil
	})

	findings := make([]Finding, 0, len(violations))
	for _, v := range violations {
		findings = append(findings, Finding{File: v.File, Line: v.Line, Kind: v.RuleID, Detail: v.Message})
	}

	res.OK = len(violations) == 0
	res.Violations = violations
	res.Findings = findings
	return res
}

func scanFile(root, path string) ([]types.Violation, map[string]bool) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil
	}
	defer f.Close()

	rel, _ := filepath.Rel(root, path)
	positive := make(map[string]bool)
	var violations []types.Violation

	sc := bufio.NewScanner(f)
	lineNum := 0
	for sc.Scan() {
		lineNum++
		line := sc.Text()
		trimmed := strings.TrimSpace(line)

		for key, pat := range positivePatterns {
			if pat.MatchString(trimmed) {
				positive[key] = true
			}
		}

		if strings.Contains(trimmed, "regexp.MustCompile") {
			continue
		}

		// comentários: apenas checar middleware de quota inativo
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			for _, r := range dangerRules {
				if r.kind == "rate_limit_commented" && r.pattern.MatchString(trimmed) {
					violations = append(violations, types.Violation{
						Gate: "api_ok", Category: "api",
						Severity: r.severity, File: rel, Line: lineNum,
						RuleID: r.ruleID, Message: r.message, Remediation: r.remediation,
					})
				}
			}
			continue
		}

		for _, r := range dangerRules {
			if r.kind == "rate_limit_commented" {
				continue
			}
			if r.pattern.MatchString(trimmed) {
				violations = append(violations, types.Violation{
					Gate: "api_ok", Category: "api",
					Severity: r.severity, File: rel, Line: lineNum,
					RuleID: r.ruleID, Message: r.message, Remediation: r.remediation,
				})
			}
		}
	}
	return violations, positive
}

func (r Result) Summary() string {
	if r.OK {
		return fmt.Sprintf("api_guard: PASS — JWT=%v CORS=%v RateLimit=%v Auth=%v",
			r.JWTDetected, r.CORSDetected, r.RateLimitDetected, r.AuthDetected)
	}
	return fmt.Sprintf("api_guard: FAIL — %d violation(s)", len(r.Violations))
}
