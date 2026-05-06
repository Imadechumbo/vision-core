// internal/security/secrets/secrets_test.go
package secrets

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/visioncore/go-core/internal/testfixtures"
)

func TestSecretsGuard_Clean(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "clean.go"), []byte(`package main
func main() { name := "vision"; _ = name }
`), 0644)
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true for clean project, got violations: %v", res.Violations)
	}
}

func TestSecretsGuard_AWSKey(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "config.go"),
		[]byte(testfixtures.AWSKeyGoSource("key")), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for AWS key leak")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_SECRET_001" {
			found = true
			if v.Gate != "secrets_ok" {
				t.Errorf("expected gate=secrets_ok, got %s", v.Gate)
			}
			if v.Remediation == "" {
				t.Error("Remediation should not be empty")
			}
		}
	}
	if !found {
		t.Errorf("expected AEGIS_SECRET_001 violation, got: %v", res.Violations)
	}
}

func TestSecretsGuard_GitHubToken(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "ci.yaml"),
		[]byte(testfixtures.GitHubPATYAMLSource()), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for GitHub token")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_SECRET_003" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected AEGIS_SECRET_003, got: %v", res.Violations)
	}
}

func TestSecretsGuard_StripeKey(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "payment.js"),
		[]byte(testfixtures.StripeKeyJSSource()), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for Stripe secret key")
	}
}

func TestSecretsGuard_SkipsNodeModules(t *testing.T) {
	root := t.TempDir()
	nmDir := filepath.Join(root, "node_modules", "lib")
	_ = os.MkdirAll(nmDir, 0755)
	// injetar key dentro de node_modules — deve ser ignorada pelo scanner
	_ = os.WriteFile(filepath.Join(nmDir, "index.js"),
		[]byte("const key = \""+testfixtures.AWSAccessKey()+"\";"), 0644)
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true (node_modules skipped), got: %v", res.Violations)
	}
}

func TestSecretsGuard_ViolationStructure(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "secrets.go"),
		[]byte(testfixtures.AWSKeyGoSource("secret")), 0644)
	res := Scan(root)
	if len(res.Violations) == 0 {
		t.Fatal("expected at least one violation")
	}
	v := res.Violations[0]
	if v.RuleID == "" {
		t.Error("RuleID should not be empty")
	}
	if v.Message == "" {
		t.Error("Message should not be empty")
	}
	if v.Remediation == "" {
		t.Error("Remediation should not be empty")
	}
	if v.Severity == "" {
		t.Error("Severity should not be empty")
	}
	if v.Gate == "" {
		t.Error("Gate should not be empty")
	}
	if v.Category == "" {
		t.Error("Category should not be empty")
	}
}

func TestSummary(t *testing.T) {
	r := Result{OK: true}
	if r.Summary() == "" {
		t.Error("Summary() empty")
	}
	r2 := Result{OK: false}
	if r2.Summary() == "" {
		t.Error("Summary() empty on fail")
	}
}
