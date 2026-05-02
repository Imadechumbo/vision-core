package hermes

import "strings"

// Diagnosis carries RCA metadata produced by Hermes before patch execution.
type Diagnosis struct {
	HermesEnabled     bool    `json:"hermes_enabled"`
	IssueType         string  `json:"issue_type"`
	ProbableRootCause string  `json:"probable_root_cause"`
	Confidence        float64 `json:"confidence"`
	Severity          string  `json:"severity"`
	SuggestedStrategy string  `json:"suggested_strategy"`
}

// Analyze creates a deterministic diagnosis from mission input and scanner evidence.
func Analyze(input, scannerEvidence string) Diagnosis {
	s := strings.ToLower(input + " " + scannerEvidence)

	d := Diagnosis{
		HermesEnabled:     true,
		IssueType:         "logic_flow",
		ProbableRootCause: "insufficient diagnostic signal; defaulting to transactional validation path",
		Confidence:        0.76,
		Severity:          "MEDIUM",
		SuggestedStrategy: "targeted_patch_with_transactional_validation",
	}

	switch {
	case strings.Contains(s, "cannot read properties of undefined") || strings.Contains(s, "undefined"):
		d.IssueType = "js_runtime_error"
		d.ProbableRootCause = "JavaScript accessed an undefined value before validating object shape"
		d.Confidence = 0.91
		d.Severity = "HIGH"
		d.SuggestedStrategy = "add_guard_and_validate_object_shape"
	case strings.Contains(s, "req.file") && strings.Contains(s, "null"):
		d.IssueType = "upload_missing_file"
		d.ProbableRootCause = "multipart upload middleware did not populate req.file"
		d.Confidence = 0.87
		d.Severity = "MEDIUM"
		d.SuggestedStrategy = "validate_multer_order_and_enforce_file_required_check"
	case strings.Contains(s, "cors") && (strings.Contains(s, "origin") || strings.Contains(s, "blocked")):
		d.IssueType = "cors_blocked"
		d.ProbableRootCause = "origin blocked by CORS policy or missing preflight headers"
		d.Confidence = 0.88
		d.Severity = "MEDIUM"
		d.SuggestedStrategy = "align_allowed_origins_headers_methods_and_options_preflight"
	case strings.Contains(s, "missing route") || strings.Contains(s, "404") || strings.Contains(s, "not found"):
		d.IssueType = "missing_route"
		d.ProbableRootCause = "route registration or HTTP method contract mismatch"
		d.Confidence = 0.86
		d.Severity = "HIGH"
		d.SuggestedStrategy = "register_route_and_validate_http_contract"
	case strings.Contains(s, "json parse") || strings.Contains(s, "unexpected token") || strings.Contains(s, "invalid character"):
		d.IssueType = "json_parse_error"
		d.ProbableRootCause = "malformed JSON payload or content-type/parser mismatch"
		d.Confidence = 0.84
		d.Severity = "MEDIUM"
		d.SuggestedStrategy = "validate_payload_schema_and_parser_order"
	case strings.Contains(s, "nil pointer") || strings.Contains(s, "invalid memory address"):
		d.IssueType = "go_nil_pointer"
		d.ProbableRootCause = "Go execution path dereferenced a nil dependency"
		d.Confidence = 0.9
		d.Severity = "CRITICAL"
		d.SuggestedStrategy = "add_nil_guards_and_initialize_dependencies_before_use"
	case strings.Contains(s, "import cycle"):
		d.IssueType = "go_import_cycle"
		d.ProbableRootCause = "circular dependency between Go packages"
		d.Confidence = 0.89
		d.Severity = "HIGH"
		d.SuggestedStrategy = "extract_interface_or_restructure_package_boundary"
	case strings.Contains(s, "module declares its path") || strings.Contains(s, "module mismatch"):
		d.IssueType = "go_module_mismatch"
		d.ProbableRootCause = "go.mod module path does not match import path"
		d.Confidence = 0.86
		d.Severity = "HIGH"
		d.SuggestedStrategy = "reconcile_module_path_and_import_namespace"
	case strings.Contains(s, "path traversal") || strings.Contains(s, "../"):
		d.IssueType = "path_traversal"
		d.ProbableRootCause = "untrusted path may escape project root"
		d.Confidence = 0.88
		d.Severity = "CRITICAL"
		d.SuggestedStrategy = "normalize_paths_and_block_traversal_before_fileops"
	case strings.Contains(s, "being used by another process") || strings.Contains(s, "file lock"):
		d.IssueType = "windows_file_lock"
		d.ProbableRootCause = "Windows process is holding a file handle"
		d.Confidence = 0.9
		d.Severity = "MEDIUM"
		d.SuggestedStrategy = "close_process_handle_and_retry_with_backoff"
	case strings.Contains(s, "port already in use") || strings.Contains(s, "address already in use"):
		d.IssueType = "port_in_use"
		d.ProbableRootCause = "service port is already bound by another process"
		d.Confidence = 0.86
		d.Severity = "HIGH"
		d.SuggestedStrategy = "release_conflicting_process_or_select_alternate_port"
	case strings.Contains(s, "missing env") || strings.Contains(s, "environment variable") || strings.Contains(s, "not set"):
		d.IssueType = "missing_env"
		d.ProbableRootCause = "required environment variable is not configured"
		d.Confidence = 0.84
		d.Severity = "HIGH"
		d.SuggestedStrategy = "define_required_env_and_validate_startup_config"
	case strings.Contains(s, "permission denied") || strings.Contains(s, "eacces") || strings.Contains(s, "operation not permitted"):
		d.IssueType = "permission_denied"
		d.ProbableRootCause = "filesystem or process permission denied"
		d.Confidence = 0.85
		d.Severity = "HIGH"
		d.SuggestedStrategy = "adjust_runtime_permissions_and_ownership"
	}

	return d
}
