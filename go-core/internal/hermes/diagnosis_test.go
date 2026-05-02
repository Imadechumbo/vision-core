package hermes

import "testing"

func TestAnalyze_JSRuntimeError(t *testing.T) {
	r := Analyze("TypeError: Cannot read properties of undefined (reading 'x') stack trace at src/app.js", "")
	if r.IssueType != "js_runtime_error" || r.Severity != "HIGH" || r.Confidence <= 0.7 {
		t.Fatalf("unexpected diagnosis: %#v", r)
	}
}

func TestAnalyze_CORS(t *testing.T) {
	r := Analyze("CORS origin blocked for https://example.com", "")
	if r.IssueType != "cors_blocked" {
		t.Fatalf("unexpected issue type: %s", r.IssueType)
	}
}

func TestAnalyze_MissingRoute(t *testing.T) {
	r := Analyze("404 not found missing route /api/run-live", "")
	if r.IssueType != "missing_route" {
		t.Fatalf("unexpected issue type: %s", r.IssueType)
	}
}

func TestAnalyze_GoImportCycle(t *testing.T) {
	r := Analyze("import cycle not allowed in package internal/mission", "")
	if r.IssueType != "go_import_cycle" {
		t.Fatalf("unexpected issue type: %s", r.IssueType)
	}
}

func TestAnalyze_WindowsFileLock(t *testing.T) {
	r := Analyze("The process cannot access the file because it is being used by another process. file lock", "")
	if r.IssueType != "windows_file_lock" {
		t.Fatalf("unexpected issue type: %s", r.IssueType)
	}
}
