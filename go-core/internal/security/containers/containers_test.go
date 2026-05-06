// internal/security/containers/containers_test.go
package containers

import (
	"os"
	"path/filepath"
	"testing"
)

func TestContainerGuard_NoDockerfile(t *testing.T) {
	root := t.TempDir()
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true with no Dockerfiles, got: %v", res.Violations)
	}
}

func TestContainerGuard_SafeDockerfile(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "Dockerfile"), []byte(`FROM golang:1.22-alpine
WORKDIR /app
COPY . .
RUN go build -o vision-core ./cmd/vision-core
USER nobody
EXPOSE 8080
`), 0644)
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true for safe Dockerfile, violations: %v", res.Violations)
	}
}

func TestContainerGuard_RootUser(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "Dockerfile"), []byte(`FROM ubuntu:22.04
USER root
CMD ["/bin/bash"]
`), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for USER root")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_CONT_001" {
			found = true
			if v.Remediation == "" {
				t.Error("Remediation should not be empty")
			}
		}
	}
	if !found {
		t.Errorf("expected AEGIS_CONT_001, got: %v", res.Violations)
	}
}

func TestContainerGuard_NoUserDirective(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "Dockerfile"), []byte(`FROM alpine:3.18
RUN apk add --no-cache curl
CMD ["sh"]
`), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for missing USER directive")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_CONT_010" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected AEGIS_CONT_010, got: %v", res.Violations)
	}
}

func TestContainerGuard_HardcodedSecret(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "Dockerfile"), []byte(`FROM node:20
USER node
ENV DB_PASSWORD=supersecret123
CMD ["node", "server.js"]
`), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for hardcoded ENV secret")
	}
}

func TestContainerGuard_ComposePrivileged(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "docker-compose.yml"), []byte(`
version: "3.9"
services:
  app:
    image: myapp
    privileged: true
`), 0644)
	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for privileged compose service")
	}
	found := false
	for _, v := range res.Violations {
		if v.RuleID == "AEGIS_CONT_006" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected AEGIS_CONT_006, got: %v", res.Violations)
	}
}

func TestContainerGuard_ViolationStructure(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "Dockerfile"), []byte(`FROM ubuntu
USER root
CMD ["bash"]
`), 0644)
	res := Scan(root)
	if len(res.Violations) == 0 {
		t.Fatal("expected violations")
	}
	v := res.Violations[0]
	if v.Gate != "containers_ok" {
		t.Errorf("expected gate=containers_ok, got %s", v.Gate)
	}
	if v.Category != "containers" {
		t.Errorf("expected category=containers, got %s", v.Category)
	}
	if v.Severity == "" {
		t.Error("Severity empty")
	}
	if v.Remediation == "" {
		t.Error("Remediation empty")
	}
}
