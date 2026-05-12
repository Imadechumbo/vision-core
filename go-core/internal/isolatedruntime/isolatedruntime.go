// Package isolatedruntime implements the V12.0 Isolated Controlled Runtime MCP contract.
//
// V12.0 keeps the MCP surface read-only. It may plan, validate, audit, describe
// boundaries, and explain a future isolated runtime, but it never executes
// commands, shells, adapters, network calls, file writes, deploys, promotions,
// status publication, repository mutation, PASS marking, trust elevation, or
// authority grants inside MCP.
package isolatedruntime

import "strings"

const (
	Version     = "V12.0"
	RuntimeMode = "isolated_controlled_runtime"
)

type Request struct {
	Root    string                 `json:"root,omitempty"`
	Command interface{}            `json:"command,omitempty"`
	Claims  map[string]interface{} `json:"claims,omitempty"`
}

type CommandDecision struct {
	Command                         []string `json:"command"`
	CommandString                   string   `json:"command_string"`
	CrossPlatformAllowlisted        bool     `json:"cross_platform_allowlisted"`
	RealExecutionAllowed            bool     `json:"real_execution_allowed"`
	MCPExecutionAllowed             bool     `json:"mcp_execution_allowed"`
	Blocked                         bool     `json:"blocked"`
	BlockedReason                   string   `json:"blocked_reason,omitempty"`
	EchoBlockedForRealWindowsExec   bool     `json:"echo_blocked_for_real_windows_exec"`
	ShellExecutionBlocked           bool     `json:"shell_execution_blocked"`
	CmdExeBlocked                   bool     `json:"cmd_exe_blocked"`
	PowerShellBlocked               bool     `json:"powershell_blocked"`
	BashBlocked                     bool     `json:"bash_blocked"`
	WouldExecute                    bool     `json:"would_execute"`
	ReadOnlyDecision                bool     `json:"read_only_decision"`
	AllowedForFutureExternalRuntime bool     `json:"allowed_for_future_external_runtime"`
}

type DeniedPermissions struct {
	MCPExecutionAllowed          bool `json:"mcp_execution_allowed"`
	RealExecutionAllowed         bool `json:"real_execution_allowed"`
	IsolatedRealExecutionAllowed bool `json:"isolated_real_execution_allowed"`
	RealAdapterCallAllowed       bool `json:"real_adapter_call_allowed"`
	AdapterCallAllowed           bool `json:"adapter_call_allowed"`
	ExecutorCallAllowed          bool `json:"executor_call_allowed"`
	NetworkCallAllowed           bool `json:"network_call_allowed"`
	CommandExecutionAllowed      bool `json:"command_execution_allowed"`
	FileWriteAllowed             bool `json:"file_write_allowed"`
	DatabaseWriteAllowed         bool `json:"database_write_allowed"`
	LedgerWriteAllowed           bool `json:"ledger_write_allowed"`
	DeployAllowed                bool `json:"deploy_allowed"`
	PromotionAllowed             bool `json:"promotion_allowed"`
	StatusPublishAllowed         bool `json:"status_publish_allowed"`
	RepoMutationAllowed          bool `json:"repo_mutation_allowed"`
	MutationAllowed              bool `json:"mutation_allowed"`
	MemoryWriteAllowed           bool `json:"memory_write_allowed"`
	StablePromotionAllowed       bool `json:"stable_promotion_allowed"`
	LearningAllowed              bool `json:"learning_allowed"`
	TrustAllowed                 bool `json:"trust_allowed"`
	EvidenceTrustAllowed         bool `json:"evidence_trust_allowed"`
	ResultTrustAllowed           bool `json:"result_trust_allowed"`
	TraceTrustAllowed            bool `json:"trace_trust_allowed"`
	ReadinessTrustAllowed        bool `json:"readiness_trust_allowed"`
	PassGoldAllowed              bool `json:"pass_gold_allowed"`
	PassSecureAllowed            bool `json:"pass_secure_allowed"`
	AuthorityGrantAllowed        bool `json:"authority_grant_allowed"`
	RealLockAllowed              bool `json:"real_lock_allowed"`
	RollbackAllowed              bool `json:"rollback_allowed"`
}

type Plan struct {
	Version                      string            `json:"version"`
	DryRun                       bool              `json:"dry_run"`
	ReadOnly                     bool              `json:"read_only"`
	RuntimeMode                  string            `json:"runtime_mode"`
	PlanReadyDryRun              bool              `json:"plan_ready_dry_run"`
	MCPReadOnly                  bool              `json:"mcp_read_only"`
	MCPExecutionAllowed          bool              `json:"mcp_execution_allowed"`
	CommandPolicy                CommandDecision   `json:"command_policy"`
	AllowedCommands              []string          `json:"allowed_commands"`
	BlockedCommands              []string          `json:"blocked_commands"`
	DeniedPermissions            DeniedPermissions `json:"denied_permissions"`
	DeployAllowed                bool              `json:"deploy_allowed"`
	PromotionAllowed             bool              `json:"promotion_allowed"`
	StatusPublishAllowed         bool              `json:"status_publish_allowed"`
	NetworkCallAllowed           bool              `json:"network_call_allowed"`
	RepoMutationAllowed          bool              `json:"repo_mutation_allowed"`
	TrustAllowed                 bool              `json:"trust_allowed"`
	PassGoldAllowed              bool              `json:"pass_gold_allowed"`
	PassSecureAllowed            bool              `json:"pass_secure_allowed"`
	AuthorityGrantAllowed        bool              `json:"authority_grant_allowed"`
	Steps                        []string          `json:"steps"`
	ForbiddenInsideMCP           []string          `json:"forbidden_inside_mcp"`
	RequiredExternalRuntimeGates []string          `json:"required_external_runtime_gates"`
}

type Validation struct {
	Version                 string            `json:"version"`
	Valid                   bool              `json:"valid"`
	Blocked                 bool              `json:"blocked"`
	DryRun                  bool              `json:"dry_run"`
	ReadOnly                bool              `json:"read_only"`
	RuntimeMode             string            `json:"runtime_mode"`
	MCPExecutionAllowed     bool              `json:"mcp_execution_allowed"`
	CommandPolicy           CommandDecision   `json:"command_policy"`
	DeniedPermissions       DeniedPermissions `json:"denied_permissions"`
	DeployAllowed           bool              `json:"deploy_allowed"`
	PromotionAllowed        bool              `json:"promotion_allowed"`
	StatusPublishAllowed    bool              `json:"status_publish_allowed"`
	NetworkCallAllowed      bool              `json:"network_call_allowed"`
	RepoMutationAllowed     bool              `json:"repo_mutation_allowed"`
	TrustAllowed            bool              `json:"trust_allowed"`
	PassGoldAllowed         bool              `json:"pass_gold_allowed"`
	PassSecureAllowed       bool              `json:"pass_secure_allowed"`
	AuthorityGrantAllowed   bool              `json:"authority_grant_allowed"`
	ValidationErrors        []string          `json:"validation_errors"`
	UnsafeAttemptsDetected  []string          `json:"unsafe_attempts_detected"`
	GoVersionAllowlistValid bool              `json:"go_version_allowlist_valid"`
}

type Boundary struct {
	Version             string            `json:"version"`
	DryRun              bool              `json:"dry_run"`
	ReadOnly            bool              `json:"read_only"`
	RuntimeMode         string            `json:"runtime_mode"`
	MCPExecutionAllowed bool              `json:"mcp_execution_allowed"`
	AllowedInsideMCP    []string          `json:"allowed_inside_mcp"`
	ForbiddenInsideMCP  []string          `json:"forbidden_inside_mcp"`
	AllowedCommands     []string          `json:"allowed_commands"`
	BlockedCommands     []string          `json:"blocked_commands"`
	DeniedPermissions   DeniedPermissions `json:"denied_permissions"`
}

type Audit struct {
	Version                           string            `json:"version"`
	DryRun                            bool              `json:"dry_run"`
	ReadOnly                          bool              `json:"read_only"`
	RuntimeMode                       string            `json:"runtime_mode"`
	MCPExecutionAllowed               bool              `json:"mcp_execution_allowed"`
	CommandPolicy                     CommandDecision   `json:"command_policy"`
	DeniedPermissions                 DeniedPermissions `json:"denied_permissions"`
	DeployAttemptFound                bool              `json:"deploy_attempt_found"`
	PromotionAttemptFound             bool              `json:"promotion_attempt_found"`
	StatusPublishAttemptFound         bool              `json:"status_publish_attempt_found"`
	NetworkAttemptFound               bool              `json:"network_attempt_found"`
	RepoMutationAttemptFound          bool              `json:"repo_mutation_attempt_found"`
	TrustAttemptFound                 bool              `json:"trust_attempt_found"`
	PassGoldAttemptFound              bool              `json:"pass_gold_attempt_found"`
	PassSecureAttemptFound            bool              `json:"pass_secure_attempt_found"`
	AuthorityGrantAttemptFound        bool              `json:"authority_grant_attempt_found"`
	ShellExecutionAttemptFound        bool              `json:"shell_execution_attempt_found"`
	BlockedEchoWindowsAttemptFound    bool              `json:"blocked_echo_windows_attempt_found"`
	BlockedGoVersionExecutionInMCP    bool              `json:"blocked_go_version_execution_in_mcp"`
	UnsafeAttemptsDetected            []string          `json:"unsafe_attempts_detected"`
	AllMutationAndTrustFlagsStayFalse bool              `json:"all_mutation_and_trust_flags_stay_false"`
}

type Explain struct {
	Version                            string            `json:"version"`
	DryRun                             bool              `json:"dry_run"`
	ReadOnly                           bool              `json:"read_only"`
	RuntimeMode                        string            `json:"runtime_mode"`
	MCPExecutionAllowed                bool              `json:"mcp_execution_allowed"`
	DeniedPermissions                  DeniedPermissions `json:"denied_permissions"`
	WhyMCPIsReadOnly                   []string          `json:"why_mcp_is_read_only"`
	WhyGoVersionIsAllowlisted          []string          `json:"why_go_version_is_allowlisted"`
	WhyEchoIsBlockedForWindowsRealExec []string          `json:"why_echo_is_blocked_for_windows_real_exec"`
	WhyShellsAreBlocked                []string          `json:"why_shells_are_blocked"`
	WhyMutationAndTrustAreAlwaysFalse  []string          `json:"why_mutation_and_trust_are_always_false"`
	AlwaysDenied                       []string          `json:"always_denied"`
}

func BuildPlan(req Request) Plan {
	return Plan{Version: Version, DryRun: true, ReadOnly: true, RuntimeMode: RuntimeMode, PlanReadyDryRun: true, MCPReadOnly: true, MCPExecutionAllowed: false, CommandPolicy: DecideCommand(req.Command), AllowedCommands: allowedCommands(), BlockedCommands: blockedCommands(), DeniedPermissions: AlwaysDeniedPermissions(), Steps: []string{"build isolated runtime dry-run plan", "validate command allowlist without executing", "return read-only MCP decision payload"}, ForbiddenInsideMCP: forbiddenInsideMCP(), RequiredExternalRuntimeGates: []string{"isolation", "real external executor", "explicit human approval", "independent revalidation", "rollback", "lock", "observability", "network policy", "filesystem isolation", "kill switch"}}
}

func Validate(req Request) Validation {
	decision := DecideCommand(req.Command)
	valid := decision.CrossPlatformAllowlisted && !decision.ShellExecutionBlocked && !decision.EchoBlockedForRealWindowsExec
	unsafe := unsafeClaims(req.Claims)
	if len(unsafe) > 0 || decision.Blocked || !decision.CrossPlatformAllowlisted {
		valid = false
	}
	errors := []string{}
	if !decision.CrossPlatformAllowlisted {
		errors = append(errors, "command_not_cross_platform_allowlisted")
	}
	if decision.EchoBlockedForRealWindowsExec {
		errors = append(errors, "echo_blocked_for_real_windows_execution")
	}
	if decision.ShellExecutionBlocked {
		errors = append(errors, "shell_command_blocked")
	}
	if len(unsafe) > 0 {
		errors = append(errors, unsafe...)
	}
	return Validation{Version: Version, Valid: valid, Blocked: !valid, DryRun: true, ReadOnly: true, RuntimeMode: RuntimeMode, MCPExecutionAllowed: false, CommandPolicy: decision, DeniedPermissions: AlwaysDeniedPermissions(), ValidationErrors: errors, UnsafeAttemptsDetected: unsafe, GoVersionAllowlistValid: isGoVersion(commandParts(req.Command))}
}

func BuildBoundary() Boundary {
	return Boundary{Version: Version, DryRun: true, ReadOnly: true, RuntimeMode: RuntimeMode, MCPExecutionAllowed: false, AllowedInsideMCP: []string{"plan", "validate", "boundary", "audit", "explain", "evaluate_go_version_allowlist_without_execution"}, ForbiddenInsideMCP: forbiddenInsideMCP(), AllowedCommands: allowedCommands(), BlockedCommands: blockedCommands(), DeniedPermissions: AlwaysDeniedPermissions()}
}

func AuditRuntime(req Request) Audit {
	decision := DecideCommand(req.Command)
	unsafe := unsafeClaims(req.Claims)
	return Audit{Version: Version, DryRun: true, ReadOnly: true, RuntimeMode: RuntimeMode, MCPExecutionAllowed: false, CommandPolicy: decision, DeniedPermissions: AlwaysDeniedPermissions(), DeployAttemptFound: claimTrue(req.Claims, "deploy_allowed", "deploy_performed"), PromotionAttemptFound: claimTrue(req.Claims, "promotion_allowed", "promoted"), StatusPublishAttemptFound: claimTrue(req.Claims, "status_publish_allowed", "status_published"), NetworkAttemptFound: claimTrue(req.Claims, "network_call_allowed", "network_called"), RepoMutationAttemptFound: claimTrue(req.Claims, "repo_mutation_allowed", "mutation_allowed", "file_write_allowed", "commit_created", "push_performed"), TrustAttemptFound: claimTrue(req.Claims, "trust_allowed", "evidence_trusted", "result_trusted", "trace_trusted"), PassGoldAttemptFound: claimTrue(req.Claims, "pass_gold", "pass_gold_allowed"), PassSecureAttemptFound: claimTrue(req.Claims, "pass_secure", "pass_secure_allowed"), AuthorityGrantAttemptFound: claimTrue(req.Claims, "authority_granted", "authority_grant_allowed"), ShellExecutionAttemptFound: decision.ShellExecutionBlocked, BlockedEchoWindowsAttemptFound: decision.EchoBlockedForRealWindowsExec, BlockedGoVersionExecutionInMCP: isGoVersion(commandParts(req.Command)) && !decision.MCPExecutionAllowed, UnsafeAttemptsDetected: unsafe, AllMutationAndTrustFlagsStayFalse: len(unsafe) == 0}
}

func ExplainRuntime() Explain {
	return Explain{Version: Version, DryRun: true, ReadOnly: true, RuntimeMode: RuntimeMode, MCPExecutionAllowed: false, DeniedPermissions: AlwaysDeniedPermissions(), WhyMCPIsReadOnly: []string{"MCP exposes only V12.0 control-plane inspection tools and never invokes an executor.", "plan, validate, boundary, audit, and explain return data only."}, WhyGoVersionIsAllowlisted: []string{"go version is a cross-platform binary invocation with no shell built-ins and is safe to allowlist for a future external runtime preflight.", "inside MCP it is evaluated as policy only and is not executed."}, WhyEchoIsBlockedForWindowsRealExec: []string{"echo is shell-dependent on Windows and previously triggered cmd/shell portability failures.", "real Windows execution must not use echo through MCP or shell wrappers."}, WhyShellsAreBlocked: []string{"shell, cmd.exe, powershell, pwsh, bash, and sh can expand commands and bypass allowlists."}, WhyMutationAndTrustAreAlwaysFalse: []string{"deploy, promotion, status, network, repo mutation, trust, PASS, and authority flags remain false in every V12.0 MCP response."}, AlwaysDenied: forbiddenInsideMCP()}
}

func DecideCommand(raw interface{}) CommandDecision {
	parts := commandParts(raw)
	cmd := strings.Join(parts, " ")
	lower0 := ""
	if len(parts) > 0 {
		lower0 = strings.ToLower(parts[0])
	}
	isShell := lower0 == "shell" || lower0 == "cmd" || lower0 == "cmd.exe" || lower0 == "powershell" || lower0 == "powershell.exe" || lower0 == "pwsh" || lower0 == "pwsh.exe" || lower0 == "bash" || lower0 == "sh"
	isEcho := lower0 == "echo"
	allowlisted := isGoVersion(parts)
	blocked := isShell || isEcho || !allowlisted
	reason := ""
	switch {
	case isShell:
		reason = "shell/cmd.exe/powershell/bash execution is blocked"
	case isEcho:
		reason = "echo is blocked for real Windows command execution"
	case !allowlisted:
		reason = "command is not in the V12.0 cross-platform allowlist"
	}
	return CommandDecision{Command: parts, CommandString: cmd, CrossPlatformAllowlisted: allowlisted, RealExecutionAllowed: false, MCPExecutionAllowed: false, Blocked: blocked, BlockedReason: reason, EchoBlockedForRealWindowsExec: isEcho, ShellExecutionBlocked: isShell, CmdExeBlocked: lower0 == "cmd" || lower0 == "cmd.exe", PowerShellBlocked: lower0 == "powershell" || lower0 == "powershell.exe" || lower0 == "pwsh" || lower0 == "pwsh.exe", BashBlocked: lower0 == "bash" || lower0 == "sh", WouldExecute: false, ReadOnlyDecision: true, AllowedForFutureExternalRuntime: allowlisted && !blocked}
}

func AlwaysDeniedPermissions() DeniedPermissions { return DeniedPermissions{} }

func commandParts(raw interface{}) []string {
	switch v := raw.(type) {
	case nil:
		return []string{}
	case string:
		return strings.Fields(v)
	case []string:
		return clean(v)
	case []interface{}:
		out := make([]string, 0, len(v))
		for _, p := range v {
			if s, ok := p.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, strings.TrimSpace(s))
			}
		}
		return out
	default:
		return []string{}
	}
}

func clean(in []string) []string {
	out := make([]string, 0, len(in))
	for _, s := range in {
		if strings.TrimSpace(s) != "" {
			out = append(out, strings.TrimSpace(s))
		}
	}
	return out
}

func isGoVersion(parts []string) bool {
	return len(parts) == 2 && strings.EqualFold(parts[0], "go") && strings.EqualFold(parts[1], "version")
}

func allowedCommands() []string { return []string{"go version"} }

func blockedCommands() []string {
	return []string{"echo", "shell", "cmd.exe", "powershell", "pwsh", "bash", "sh"}
}

func forbiddenInsideMCP() []string {
	return []string{"execute_runtime", "call_real_adapter", "call_executor", "network_call", "command_execution", "file_write", "database_write", "write_ledger", "deploy", "promote", "publish_status", "repo_mutation", "write_memory", "learn_stable", "trust_evidence", "trust_result", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority", "shell", "cmd.exe", "powershell", "bash", "echo_real_windows_execution"}
}

func unsafeClaims(claims map[string]interface{}) []string {
	if claims == nil {
		return nil
	}
	keys := []string{"mcp_execution_allowed", "real_execution_allowed", "isolated_real_execution_allowed", "real_adapter_call_allowed", "adapter_call_allowed", "executor_call_allowed", "network_call_allowed", "command_execution_allowed", "file_write_allowed", "database_write_allowed", "ledger_write_allowed", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "repo_mutation_allowed", "mutation_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "trust_allowed", "evidence_trusted", "result_trusted", "trace_trusted", "readiness_trusted", "pass_gold", "pass_gold_allowed", "pass_secure", "pass_secure_allowed", "authority_granted", "authority_grant_allowed"}
	out := []string{}
	for _, k := range keys {
		if claimTrue(claims, k) {
			out = append(out, k)
		}
	}
	return out
}

func claimTrue(claims map[string]interface{}, keys ...string) bool {
	for _, k := range keys {
		if v, ok := claims[k]; ok {
			if b, ok := v.(bool); ok && b {
				return true
			}
		}
	}
	return false
}
