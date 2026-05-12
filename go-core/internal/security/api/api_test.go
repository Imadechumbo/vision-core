// internal/security/api/api_test.go
package api

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/visioncore/go-core/internal/testfixtures"
)

func TestAPIGuard_EmptyProject(t *testing.T) {
	root := t.TempDir()
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true for empty project, got: %v", res.Violations)
	}
}

func TestAPIGuard_JWTNoneAlgorithm(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "auth.js"),
		[]byte(testfixtures.JWTNoneAlgJSSource()), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for JWT 'none' algorithm")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_API_001" {
			found = true
			if v.Remediation == "" {
				t.Error("Remediation should not be empty")
			}
		}
	}
	if !found {
		t.Errorf("expected AEGIS_API_001, got: %v", res.Violations)
	}
}

func TestAPIGuard_CORSWildcard(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "server.js"),
		[]byte(testfixtures.CORSWildcardJSSource()), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for CORS wildcard")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_API_004" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected AEGIS_API_004, got: %v", res.Violations)
	}
}

func TestAPIGuard_AuthBypass(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "middleware.go"),
		[]byte(testfixtures.AuthBypassGoSource()), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for auth bypass flag")
	}
}

func TestAPIGuard_CleanGoServer(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "server.go"), []byte(`
package main
import (
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/cors"
)
func AuthRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" { http.Error(w, "unauthorized", 401); return }
		next.ServeHTTP(w, r)
	})
}
`), 0644)
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true for clean Go server, violations: %v", res.Violations)
	}
	if !res.JWTDetected {
		t.Error("expected JWTDetected=true")
	}
	if !res.CORSDetected {
		t.Error("expected CORSDetected=true")
	}
	if !res.AuthDetected {
		t.Error("expected AuthDetected=true")
	}
}

func TestAPIGuard_TokenLogged(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "handler.go"), []byte(`
package handler
import "fmt"
func Login(token string) {
	fmt.Println("user token:", token)
}
`), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for token logged")
	}
}

func TestAPIGuard_ViolationStructure(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "auth.js"),
		[]byte(testfixtures.AuthBypassJSSource()), 0644)
	res := Scan(root)
	if len(res.Violations) == 0 {
		t.Fatal("expected violations")
	}
	v := res.Violations[0]
	if v.Gate != "api_ok" {
		t.Errorf("expected gate=api_ok, got %s", v.Gate)
	}
	if v.Category != "api" {
		t.Errorf("expected category=api, got %s", v.Category)
	}
	if v.RuleID == "" {
		t.Error("RuleID empty")
	}
	if v.Remediation == "" {
		t.Error("Remediation empty")
	}
}

func TestAPIGuard_RateLimitDocumentationCommentIgnored(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "worker.js"), []byte(`
// Fallback simples. Para produção pesada, use binding de Rate Limiting API ou Durable Object.
const RATE_LIMIT_MAX = 120;
`), 0644)
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true for rate limit documentation comment, violations: %v", res.Violations)
	}
}

func TestAPIGuard_CommentedRateLimitMiddlewareDetected(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "server.js"), []byte(`
// app.use(rateLimit({ windowMs: 60000, max: 120 }));
`), 0644)
	res := Scan(root)
	if res.OK {
		t.Fatal("expected commented rate limit middleware to be flagged")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_API_008" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected AEGIS_API_008, got: %v", res.Violations)
	}
}
