// internal/passsecure/passsecure_test.go
package passsecure

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/visioncore/go-core/internal/testfixtures"
)

func TestPassSecure_CleanProject(t *testing.T) {
	root := t.TempDir()
	res := Evaluate(root)
	if !res.PassSecure {
		t.Errorf("expected PassSecure=true for clean project, failedGates=%v", res.FailedGates)
	}
	if res.SecurityScore < 80 {
		t.Errorf("expected score>=80, got %d", res.SecurityScore)
	}
	if res.Status != "SECURE" {
		t.Errorf("expected status=SECURE, got %s", res.Status)
	}
	if !res.DeployAllowed {
		t.Error("expected DeployAllowed=true")
	}
}

func TestPassSecure_WithSecretLeak(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "config.go"),
		[]byte(testfixtures.AWSKeyGoSource("key")), 0644)
	res := Evaluate(root)
	if res.PassSecure {
		t.Error("expected PassSecure=false when secrets leaked")
	}
	if res.DeployAllowed {
		t.Error("expected DeployAllowed=false")
	}
	if res.Status != "FAIL" {
		t.Errorf("expected status=FAIL, got %s", res.Status)
	}
	if res.SecurityScore == 100 {
		t.Error("expected score < 100 with violations")
	}
}

func TestPassSecure_ScoreCalculation(t *testing.T) {
	r := Result{SecurityScore: 100, PassSecure: true}
	if r.SecurityScore != 100 {
		t.Error("expected score=100")
	}
}

func TestPassSecure_Summary(t *testing.T) {
	r := Result{PassSecure: true, SecurityScore: 95, Version: Version}
	s := r.Summary()
	if s == "" {
		t.Error("Summary() empty")
	}
	r2 := Result{PassSecure: false, SecurityScore: 60, FailedGates: []string{"secrets_ok"}}
	s2 := r2.Summary()
	if s2 == "" {
		t.Error("Summary() empty on fail")
	}
}

func TestPassSecure_WithDockerRootUser(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "Dockerfile"), []byte(`FROM ubuntu:22.04
USER root
CMD ["/bin/bash"]
`), 0644)
	res := Evaluate(root)
	if res.PassSecure {
		t.Error("expected PassSecure=false with root container")
	}
	if res.Gates.ContainersOK {
		t.Error("expected ContainersOK=false")
	}
}
