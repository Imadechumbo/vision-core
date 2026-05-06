// internal/security/types/types_test.go
// VISION AEGIS CORE ENTERPRISE — V6.1.1-HARDEN
// Testes de contrato para ClassifySourceContext e Annotate.
package types

import (
	"testing"
)

// ─── ClassifySourceContext ────────────────────────────────────────────────────

func TestClassify_TestGoFile(t *testing.T) {
	cases := []string{
		"internal/mission/mission_test.go",
		"security/secrets/secrets_test.go",
		"mission_test.go",
		"some/deep/path/foo_test.go",
	}
	for _, c := range cases {
		got := ClassifySourceContext(c)
		if got != SourceContextTestFixture {
			t.Errorf("ClassifySourceContext(%q) = %q, want %q", c, got, SourceContextTestFixture)
		}
	}
}

func TestClassify_ProductionGoFile(t *testing.T) {
	cases := []string{
		"internal/mission/mission.go",
		"cmd/vision-core/main.go",
		"server.go",
		"handler.go",
	}
	for _, c := range cases {
		got := ClassifySourceContext(c)
		if got != SourceContextProduction {
			t.Errorf("ClassifySourceContext(%q) = %q, want %q", c, got, SourceContextProduction)
		}
	}
}

func TestClassify_VendorPath(t *testing.T) {
	cases := []string{
		"vendor/github.com/some/lib/file.go",
		"node_modules/lodash/lodash.js",
		"node_modules/.bin/webpack",
	}
	for _, c := range cases {
		got := ClassifySourceContext(c)
		if got != SourceContextVendor {
			t.Errorf("ClassifySourceContext(%q) = %q, want %q", c, got, SourceContextVendor)
		}
	}
}

func TestClassify_GeneratedPath(t *testing.T) {
	cases := []string{
		"dist/bundle.js",
		"build/output/main.js",
		".next/server/pages/index.js",
	}
	for _, c := range cases {
		got := ClassifySourceContext(c)
		if got != SourceContextGenerated {
			t.Errorf("ClassifySourceContext(%q) = %q, want %q", c, got, SourceContextGenerated)
		}
	}
}

func TestClassify_SnapshotPath(t *testing.T) {
	cases := []string{
		".vision-snapshots/snap_abc123/server.js",
		"project/.vision-snapshots/snap_001/config.go",
	}
	for _, c := range cases {
		got := ClassifySourceContext(c)
		if got != SourceContextSnapshot {
			t.Errorf("ClassifySourceContext(%q) = %q, want %q", c, got, SourceContextSnapshot)
		}
	}
}

func TestClassify_VisionTestPath(t *testing.T) {
	cases := []string{
		".vision-test/mission.sentinel",
		"project/.vision-test/foo",
	}
	for _, c := range cases {
		got := ClassifySourceContext(c)
		if got != SourceContextGenerated {
			t.Errorf("ClassifySourceContext(%q) = %q, want %q", c, got, SourceContextGenerated)
		}
	}
}

func TestClassify_EmptyPath(t *testing.T) {
	got := ClassifySourceContext("")
	if got != SourceContextUnknown {
		t.Errorf("ClassifySourceContext(\"\") = %q, want %q", got, SourceContextUnknown)
	}
}

func TestClassify_JavaScriptProductionFile(t *testing.T) {
	cases := []string{
		"backend/server.js",
		"worker/src/index.js",
		"frontend/assets/app.js",
	}
	for _, c := range cases {
		got := ClassifySourceContext(c)
		if got != SourceContextProduction {
			t.Errorf("ClassifySourceContext(%q) = %q, want %q", c, got, SourceContextProduction)
		}
	}
}

// ─── Annotate ────────────────────────────────────────────────────────────────

func TestAnnotate_SetsSourceContext(t *testing.T) {
	violations := []Violation{
		{File: "cmd/main.go", Gate: "secrets_ok"},
		{File: "internal/foo_test.go", Gate: "api_ok"},
		{File: "vendor/lib/foo.go", Gate: "dependencies_ok"},
		{File: "dist/bundle.js", Gate: "api_ok"},
		{File: ".vision-snapshots/snap/f.go", Gate: "secrets_ok"},
	}

	annotated := Annotate(violations)

	expected := []string{
		SourceContextProduction,
		SourceContextTestFixture,
		SourceContextVendor,
		SourceContextGenerated,
		SourceContextSnapshot,
	}

	for i, v := range annotated {
		if v.SourceContext != expected[i] {
			t.Errorf("annotated[%d] (%q): got source_context=%q, want %q",
				i, v.File, v.SourceContext, expected[i])
		}
	}
}

func TestAnnotate_DoesNotOverrideExisting(t *testing.T) {
	// Violation que já tem SourceContext definido não deve ser alterada
	violations := []Violation{
		{
			File:          "backend/server.js",
			SourceContext: SourceContextVendor, // pré-definido
		},
	}
	annotated := Annotate(violations)
	if annotated[0].SourceContext != SourceContextVendor {
		t.Errorf("Annotate must not override existing SourceContext, got %q", annotated[0].SourceContext)
	}
}

func TestAnnotate_EmptySlice(t *testing.T) {
	result := Annotate([]Violation{})
	if len(result) != 0 {
		t.Errorf("expected empty slice, got %d items", len(result))
	}
}

func TestAnnotate_NilSlice(t *testing.T) {
	result := Annotate(nil)
	if len(result) != 0 {
		t.Errorf("expected empty result for nil input, got %d items", len(result))
	}
}

// ─── Build + HasBlockers ──────────────────────────────────────────────────────

func TestBuild_EmptyViolations(t *testing.T) {
	vs := Build(nil)
	if vs.TotalCount != 0 || vs.CriticalCount != 0 || vs.HighCount != 0 {
		t.Error("Build(nil) should produce zero counts")
	}
	if vs.HasBlockers() {
		t.Error("HasBlockers() must be false with no violations")
	}
}

func TestBuild_CriticalHigh(t *testing.T) {
	vs := Build([]Violation{
		{Severity: SeverityCritical},
		{Severity: SeverityHigh},
		{Severity: SeverityMedium},
		{Severity: SeverityLow},
	})
	if vs.TotalCount != 4 {
		t.Errorf("TotalCount=%d, want 4", vs.TotalCount)
	}
	if vs.CriticalCount != 1 {
		t.Errorf("CriticalCount=%d, want 1", vs.CriticalCount)
	}
	if vs.HighCount != 1 {
		t.Errorf("HighCount=%d, want 1", vs.HighCount)
	}
	if !vs.HasBlockers() {
		t.Error("HasBlockers() must be true with CRITICAL or HIGH")
	}
}

func TestBuild_MediumLowOnly_NoBlocker(t *testing.T) {
	vs := Build([]Violation{
		{Severity: SeverityMedium},
		{Severity: SeverityLow},
	})
	if vs.HasBlockers() {
		t.Error("HasBlockers() must be false with only MEDIUM/LOW")
	}
}

func TestBuild_CountsSumToTotal(t *testing.T) {
	violations := []Violation{
		{Severity: SeverityCritical},
		{Severity: SeverityCritical},
		{Severity: SeverityHigh},
		{Severity: SeverityMedium},
		{Severity: SeverityMedium},
		{Severity: SeverityLow},
	}
	vs := Build(violations)
	sum := vs.CriticalCount + vs.HighCount + vs.MediumCount + vs.LowCount
	if sum != vs.TotalCount {
		t.Errorf("counts must sum to total: %d+%d+%d+%d=%d != %d",
			vs.CriticalCount, vs.HighCount, vs.MediumCount, vs.LowCount,
			sum, vs.TotalCount)
	}
}

// ─── Constants sanity ────────────────────────────────────────────────────────

func TestSourceContextConstants(t *testing.T) {
	valid := map[string]bool{
		SourceContextProduction: true,
		SourceContextTestFixture: true,
		SourceContextGenerated:  true,
		SourceContextVendor:     true,
		SourceContextSnapshot:   true,
		SourceContextUnknown:    true,
	}
	all := []string{
		SourceContextProduction,
		SourceContextTestFixture,
		SourceContextGenerated,
		SourceContextVendor,
		SourceContextSnapshot,
		SourceContextUnknown,
	}
	for _, c := range all {
		if !valid[c] {
			t.Errorf("constant %q not in valid set", c)
		}
		if c == "" {
			t.Errorf("SourceContext constant must not be empty string")
		}
	}
}
