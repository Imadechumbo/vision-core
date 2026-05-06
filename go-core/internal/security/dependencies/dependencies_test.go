// internal/security/dependencies/dependencies_test.go
package dependencies

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDependencyGuard_CleanNPM(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "package.json"), []byte(`{
  "dependencies": {
    "express": "^4.19.0",
    "jsonwebtoken": "^9.0.2"
  }
}`), 0644)

	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true for safe npm deps, findings: %v", res.Findings)
	}
}

func TestDependencyGuard_UnpinnedNPM(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "package.json"), []byte(`{
  "dependencies": {
    "somelib": "latest",
    "anotherlib": "*"
  }
}`), 0644)

	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false for unpinned npm deps")
	}
}

func TestDependencyGuard_PipUnpinned(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "requirements.txt"), []byte(`
requests
flask==2.3.3
pillow==9.0.0
`), 0644)

	res := Scan(root)
	if res.OK {
		t.Error("expected OK=false: requests unpinned + pillow vulnerable")
	}
}

func TestDependencyGuard_Clean(t *testing.T) {
	root := t.TempDir()
	// nenhum manifesto presente → sem findings
	res := Scan(root)
	if !res.OK {
		t.Errorf("expected OK=true with no manifests, got: %v", res.Findings)
	}
}

func TestVersionLess(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"4.17.20", "4.17.21", true},
		{"4.17.21", "4.17.21", false},
		{"4.17.22", "4.17.21", false},
		{"3.0.0", "4.0.0", true},
		{"5.0.0", "4.0.0", false},
	}
	for _, c := range cases {
		got := versionLess(c.a, c.b)
		if got != c.want {
			t.Errorf("versionLess(%q, %q) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}

func TestSummary(t *testing.T) {
	r := Result{OK: true, ScannedFiles: []string{"package.json"}}
	if r.Summary() == "" {
		t.Error("Summary() empty")
	}
	r2 := Result{OK: false, Findings: []Finding{{Package: "lodash"}}}
	if r2.Summary() == "" {
		t.Error("Summary() empty on fail")
	}
}
