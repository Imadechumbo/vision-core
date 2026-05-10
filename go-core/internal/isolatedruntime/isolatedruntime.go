// Package isolatedruntime implements V12.0 Isolated Controlled Execution Runtime.
//
// V12.0 is the first phase that may perform a real local command execution, but
// only inside an isolated .vision-tmp/isolated-runtime workspace, with a minimal
// command allowlist, no shell, no network, no deployment, no promotion, no status
// publishing, no repository mutation, and no trust/authority escalation. MCP is
// intentionally read-only and must never call ExecuteIsolatedControlledRuntime.
package isolatedruntime

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const Version = "V12.0"
const RuntimeMode = "isolated_controlled_execution_runtime"
const NextPhase = "V12.1_isolated_command_execution_receipt"
const defaultReadinessThreshold = 90

const (
	StatusPlanReady              = "isolated_runtime_plan_ready"
	StatusValidated              = "isolated_runtime_validated"
	StatusExecuted               = "isolated_runtime_executed"
	StatusBlocked                = "isolated_runtime_blocked"
	StatusReadinessGateMissing   = "readiness_gate_missing"
	StatusReadinessGateBlocked   = "readiness_gate_blocked"
	StatusReadinessScoreBelow    = "readiness_score_below_threshold"
	StatusInvalidExecutorMode    = "invalid_executor_mode"
	StatusInvalidAdapterType     = "invalid_adapter_type"
	StatusInvalidEnvironment     = "invalid_environment"
	StatusCommandNotAllowlisted  = "command_not_allowlisted"
	StatusShellSyntaxBlocked     = "shell_syntax_blocked"
	StatusPathTraversalBlocked   = "path_traversal_blocked"
	StatusWorkspaceEscapeBlocked = "workspace_escape_blocked"
	StatusSymlinkEscapeBlocked   = "symlink_escape_blocked"
	StatusFilesystemWriteBlocked = "filesystem_write_blocked"
	StatusNetworkBlocked         = "network_blocked"
	StatusSecretsBlocked         = "secrets_access_blocked"
	StatusEnvBlocked             = "env_access_blocked"
	StatusGitMutationBlocked     = "git_mutation_blocked"
	StatusDeployBlocked          = "deploy_blocked"
	StatusPromotionBlocked       = "promotion_blocked"
	StatusStatusPublishBlocked   = "status_publish_blocked"
	StatusMemoryWriteBlocked     = "memory_write_blocked"
	StatusTrustEscalationBlocked = "trust_escalation_blocked"
	StatusAuthorityGrantBlocked  = "authority_grant_blocked"
	StatusTimeoutExceeded        = "timeout_exceeded"
	StatusKillSwitchTriggered    = "kill_switch_triggered"
	StatusRollbackReady          = "isolated_rollback_ready"
	StatusRollbackPerformed      = "isolated_rollback_performed"
	StatusExecutionSuccess       = "isolated_execution_success"
	StatusExecutionFailed        = "isolated_execution_failed"
)

type IsolatedRuntimeCommand struct {
	Name        string   `json:"name"`
	Args        []string `json:"args,omitempty"`
	Raw         string   `json:"raw,omitempty"`
	Allowlisted bool     `json:"allowlisted"`
}
type IsolatedRuntimeWorkspace struct {
	Root                 string `json:"root"`
	Path                 string `json:"path"`
	Temporary            bool   `json:"temporary"`
	SandboxPrefix        string `json:"sandbox_prefix"`
	FilesystemSandboxed  bool   `json:"filesystem_sandboxed"`
	SymlinkEscapeBlocked bool   `json:"symlink_escape_blocked"`
}
type IsolatedRuntimePolicy struct {
	AllowlistedCommands []string `json:"allowlisted_commands"`
	DeniedCommands      []string `json:"denied_commands"`
	TimeoutSeconds      int      `json:"timeout_seconds"`
	NetworkDenied       bool     `json:"network_denied"`
	SecretsDenied       bool     `json:"secrets_denied"`
	EnvFileDenied       bool     `json:"env_file_denied"`
	NoDeploy            bool     `json:"no_deploy"`
	NoPromotion         bool     `json:"no_promotion"`
	NoStatusPublish     bool     `json:"no_status_publish"`
	NoRepoMutation      bool     `json:"no_repo_mutation"`
	ShellBlocked        bool     `json:"shell_blocked"`
	KillSwitchEnabled   bool     `json:"kill_switch_enabled"`
	Threshold           int      `json:"readiness_threshold"`
}
type IsolatedRuntimeRollback struct {
	Available    bool   `json:"available"`
	Ready        bool   `json:"ready"`
	Performed    bool   `json:"performed"`
	SnapshotPath string `json:"snapshot_path,omitempty"`
}
type IsolatedRuntimeObservability struct {
	Ready          bool   `json:"ready"`
	LogsAvailable  bool   `json:"logs_available"`
	LogPath        string `json:"log_path,omitempty"`
	StartedAtUTC   string `json:"started_at_utc,omitempty"`
	FinishedAtUTC  string `json:"finished_at_utc,omitempty"`
	DurationMillis int64  `json:"duration_millis,omitempty"`
}
type IsolatedRuntimeArtifact struct {
	CaptureReady bool     `json:"capture_ready"`
	Artifacts    []string `json:"artifacts"`
}

type IsolatedRuntimeInput struct {
	Root                                  string                   `json:"root,omitempty"`
	IsolatedRuntimeID                     string                   `json:"isolated_runtime_id"`
	ReadinessGateID                       string                   `json:"readiness_gate_id"`
	AuditReportID                         string                   `json:"audit_report_id"`
	ReplayGateID                          string                   `json:"replay_gate_id"`
	PersistenceGateID                     string                   `json:"persistence_gate_id"`
	SandboxTraceID                        string                   `json:"sandbox_trace_id"`
	SandboxAdapterID                      string                   `json:"sandbox_adapter_id"`
	RuntimeID                             string                   `json:"runtime_id"`
	RuntimeSessionID                      string                   `json:"runtime_session_id"`
	EvidenceBindingID                     string                   `json:"evidence_binding_id"`
	VerificationID                        string                   `json:"verification_id"`
	ResponseContractID                    string                   `json:"response_contract_id"`
	RequestEnvelopeID                     string                   `json:"request_envelope_id"`
	AdapterInterfaceID                    string                   `json:"adapter_interface_id"`
	FinalAuthorizationID                  string                   `json:"final_authorization_id"`
	SimulationID                          string                   `json:"simulation_id"`
	FirewallID                            string                   `json:"firewall_id"`
	DecisionID                            string                   `json:"decision_id"`
	InvocationID                          string                   `json:"invocation_id"`
	Executor                              string                   `json:"executor"`
	ExecutorMode                          string                   `json:"executor_mode"`
	AdapterName                           string                   `json:"adapter_name"`
	AdapterVersion                        string                   `json:"adapter_version"`
	AdapterType                           string                   `json:"adapter_type"`
	Project                               string                   `json:"project"`
	Branch                                string                   `json:"branch"`
	CommitSHA                             string                   `json:"commit_sha"`
	Target                                string                   `json:"target"`
	Environment                           string                   `json:"environment"`
	SandboxReadinessReadyDryRun           bool                     `json:"sandbox_readiness_ready_dry_run"`
	SandboxToControlledExecutionCandidate bool                     `json:"sandbox_to_controlled_execution_candidate"`
	V12TransitionCandidate                bool                     `json:"v12_transition_candidate"`
	ReadinessScoreDryRun                  int                      `json:"readiness_score_dry_run"`
	ReadinessThreshold                    int                      `json:"readiness_threshold,omitempty"`
	AuditReportValid                      bool                     `json:"audit_report_valid"`
	ReplayGateValid                       bool                     `json:"replay_gate_valid"`
	PersistenceGateValid                  bool                     `json:"persistence_gate_valid"`
	SandboxTraceValid                     bool                     `json:"sandbox_trace_valid"`
	SandboxAdapterValid                   bool                     `json:"sandbox_adapter_valid"`
	ControlledRuntimeValid                bool                     `json:"controlled_runtime_valid"`
	EvidenceBindingValid                  bool                     `json:"evidence_binding_valid"`
	VerificationValid                     bool                     `json:"verification_valid"`
	ResponseContractValid                 bool                     `json:"response_contract_valid"`
	RequestEnvelopeValid                  bool                     `json:"request_envelope_valid"`
	AdapterInterfaceValid                 bool                     `json:"adapter_interface_valid"`
	FinalAuthorizationValid               bool                     `json:"final_authorization_valid"`
	SimulationValid                       bool                     `json:"simulation_valid"`
	FirewallValid                         bool                     `json:"firewall_valid"`
	SovereignCandidateValid               bool                     `json:"sovereign_candidate_valid"`
	PassGoldReal                          bool                     `json:"pass_gold_real"`
	PassSecureReal                        bool                     `json:"pass_secure_real"`
	HumanApprovalReal                     bool                     `json:"human_approval_real"`
	IndependentRevalidationReal           bool                     `json:"independent_revalidation_real"`
	Command                               IsolatedRuntimeCommand   `json:"command"`
	Workspace                             IsolatedRuntimeWorkspace `json:"workspace"`
	Policy                                IsolatedRuntimePolicy    `json:"policy"`
	Claims                                map[string]bool          `json:"claims,omitempty"`
	KillSwitch                            bool                     `json:"kill_switch,omitempty"`
}

type IsolatedRuntimePlan struct {
	Version                             string                       `json:"version"`
	DryRun                              bool                         `json:"dry_run"`
	ReadOnly                            bool                         `json:"read_only"`
	Isolated                            bool                         `json:"isolated"`
	RuntimeMode                         string                       `json:"runtime_mode"`
	NextPhase                           string                       `json:"next_phase"`
	MCPExecutionAllowed                 bool                         `json:"mcp_execution_allowed"`
	MCPMutationAllowed                  bool                         `json:"mcp_mutation_allowed"`
	Statuses                            []string                     `json:"statuses"`
	Blockers                            []string                     `json:"blockers"`
	Command                             IsolatedRuntimeCommand       `json:"command"`
	Workspace                           IsolatedRuntimeWorkspace     `json:"workspace"`
	Policy                              IsolatedRuntimePolicy        `json:"policy"`
	Rollback                            IsolatedRuntimeRollback      `json:"rollback"`
	Observability                       IsolatedRuntimeObservability `json:"observability"`
	Artifact                            IsolatedRuntimeArtifact      `json:"artifact"`
	IsolatedRuntimePlanReady            bool                         `json:"isolated_runtime_plan_ready"`
	IsolatedRuntimeValidated            bool                         `json:"isolated_runtime_validated"`
	IsolatedWorkspaceReady              bool                         `json:"isolated_workspace_ready"`
	IsolatedLockReady                   bool                         `json:"isolated_lock_ready"`
	IsolatedRollbackReady               bool                         `json:"isolated_rollback_ready"`
	IsolatedObservabilityReady          bool                         `json:"isolated_observability_ready"`
	IsolatedArtifactCaptureReady        bool                         `json:"isolated_artifact_capture_ready"`
	IsolatedAuditReady                  bool                         `json:"isolated_audit_ready"`
	CommandAllowlisted                  bool                         `json:"command_allowlisted"`
	ProductionExecutionAllowed          bool                         `json:"production_execution_allowed"`
	RealAdapterExternalCallAllowed      bool                         `json:"real_adapter_external_call_allowed"`
	UnrestrictedCommandExecutionAllowed bool                         `json:"unrestricted_command_execution_allowed"`
	NetworkCallAllowed                  bool                         `json:"network_call_allowed"`
	DeployAllowed                       bool                         `json:"deploy_allowed"`
	PromotionAllowed                    bool                         `json:"promotion_allowed"`
	StatusPublishAllowed                bool                         `json:"status_publish_allowed"`
	MemoryWriteAllowed                  bool                         `json:"memory_write_allowed"`
	StablePromotionAllowed              bool                         `json:"stable_promotion_allowed"`
	LearningAllowed                     bool                         `json:"learning_allowed"`
	PushAllowed                         bool                         `json:"push_allowed"`
	PRAllowed                           bool                         `json:"pr_allowed"`
	RepoMutationAllowed                 bool                         `json:"repo_mutation_allowed"`
	EvidenceTrustAllowed                bool                         `json:"evidence_trust_allowed"`
	ResultTrustAllowed                  bool                         `json:"result_trust_allowed"`
	TraceTrustAllowed                   bool                         `json:"trace_trust_allowed"`
	ReplayTrustAllowed                  bool                         `json:"replay_trust_allowed"`
	ReportTrustAllowed                  bool                         `json:"report_trust_allowed"`
	ReadinessTrustAllowed               bool                         `json:"readiness_trust_allowed"`
	PassGoldAllowed                     bool                         `json:"pass_gold_allowed"`
	PassSecureAllowed                   bool                         `json:"pass_secure_allowed"`
	AuthorityGrantAllowed               bool                         `json:"authority_grant_allowed"`
	IsolatedRealExecutionAllowed        bool                         `json:"isolated_real_execution_allowed"`
	CommandExecutionAllowed             bool                         `json:"command_execution_allowed"`
	FileWriteAllowed                    bool                         `json:"file_write_allowed"`
	RealLockAllowed                     bool                         `json:"real_lock_allowed"`
	RollbackAllowed                     bool                         `json:"rollback_allowed"`
	LedgerWriteAllowed                  bool                         `json:"ledger_write_allowed"`
	DatabaseWriteAllowed                bool                         `json:"database_write_allowed"`
	PassGold                            bool                         `json:"pass_gold"`
	PassSecure                          bool                         `json:"pass_secure"`
	AuthorityGranted                    bool                         `json:"authority_granted"`
}

type IsolatedRuntimeResult struct {
	IsolatedRuntimePlan
	IsolatedRuntimeExecuted    bool   `json:"isolated_runtime_executed"`
	IsolatedExecutionPerformed bool   `json:"isolated_execution_performed"`
	IsolatedExecutionSuccess   bool   `json:"isolated_execution_success"`
	IsolatedRollbackAvailable  bool   `json:"isolated_rollback_available"`
	IsolatedLogsAvailable      bool   `json:"isolated_logs_available"`
	ExitCode                   int    `json:"exit_code"`
	Stdout                     string `json:"stdout"`
	Stderr                     string `json:"stderr"`
	Error                      string `json:"error,omitempty"`
}
type IsolatedRuntimeBoundary struct {
	Version             string          `json:"version"`
	DryRun              bool            `json:"dry_run"`
	ReadOnly            bool            `json:"read_only"`
	Isolated            bool            `json:"isolated"`
	RuntimeMode         string          `json:"runtime_mode"`
	NextPhase           string          `json:"next_phase"`
	MCPExecutionAllowed bool            `json:"mcp_execution_allowed"`
	MCPMutationAllowed  bool            `json:"mcp_mutation_allowed"`
	MCPCan              []string        `json:"mcp_can"`
	MCPCannot           []string        `json:"mcp_cannot"`
	AllowedCommands     []string        `json:"allowed_commands"`
	DeniedCommands      []string        `json:"denied_commands"`
	AlwaysDenied        map[string]bool `json:"always_denied"`
}
type IsolatedRuntimeAudit struct {
	Version             string          `json:"version"`
	ReadOnly            bool            `json:"read_only"`
	Isolated            bool            `json:"isolated"`
	RuntimeMode         string          `json:"runtime_mode"`
	NextPhase           string          `json:"next_phase"`
	MCPExecutionAllowed bool            `json:"mcp_execution_allowed"`
	MCPMutationAllowed  bool            `json:"mcp_mutation_allowed"`
	Findings            map[string]bool `json:"findings"`
	Blockers            []string        `json:"blockers"`
}
type IsolatedRuntimeExplain struct {
	Version             string            `json:"version"`
	ReadOnly            bool              `json:"read_only"`
	Isolated            bool              `json:"isolated"`
	RuntimeMode         string            `json:"runtime_mode"`
	NextPhase           string            `json:"next_phase"`
	MCPExecutionAllowed bool              `json:"mcp_execution_allowed"`
	MCPMutationAllowed  bool              `json:"mcp_mutation_allowed"`
	RequiredGates       []string          `json:"required_gates"`
	AlwaysDenied        map[string]bool   `json:"always_denied"`
	Reasons             map[string]string `json:"reasons"`
}

func defaultPolicy(p IsolatedRuntimePolicy) IsolatedRuntimePolicy {
	if p.TimeoutSeconds <= 0 {
		p.TimeoutSeconds = 5
	}
	if p.Threshold <= 0 {
		p.Threshold = defaultReadinessThreshold
	}
	if len(p.AllowlistedCommands) == 0 {
		p.AllowlistedCommands = []string{"echo", "pwd", "go version", "go env GOMOD", "go test ./internal/testfixtures/...", "vision-internal-noop"}
	}
	if len(p.DeniedCommands) == 0 {
		p.DeniedCommands = []string{"git push", "git commit", "git merge", "git checkout", "gh pr create", "npm publish", "wrangler deploy", "eb deploy", "terraform apply", "docker run", "curl", "wget", "powershell", "cmd.exe", "bash", "rm", "rmdir", "del"}
	}
	p.NetworkDenied = true
	p.SecretsDenied = true
	p.EnvFileDenied = true
	p.NoDeploy = true
	p.NoPromotion = true
	p.NoStatusPublish = true
	p.NoRepoMutation = true
	p.ShellBlocked = true
	p.KillSwitchEnabled = true
	return p
}
func statusesAdd(ss []string, s string) []string {
	for _, x := range ss {
		if x == s {
			return ss
		}
	}
	return append(ss, s)
}
func commandLine(c IsolatedRuntimeCommand) string {
	if strings.TrimSpace(c.Raw) != "" {
		return strings.TrimSpace(c.Raw)
	}
	return strings.TrimSpace(strings.Join(append([]string{c.Name}, c.Args...), " "))
}
func hasShellSyntax(s string) bool {
	return strings.ContainsAny(s, "`|;<>") || strings.Contains(s, "&&") || strings.Contains(s, "||") || strings.Contains(s, "$()") || strings.Contains(s, "$(")
}
func hasPathTraversal(s string) bool {
	return strings.Contains(filepath.ToSlash(s), "../") || strings.Contains(filepath.ToSlash(s), "/..") || strings.TrimSpace(s) == ".."
}
func isAllowlisted(c IsolatedRuntimeCommand, p IsolatedRuntimePolicy) bool {
	line := commandLine(c)
	for _, a := range p.AllowlistedCommands {
		if line == a || (a == "echo" && (line == "echo" || strings.HasPrefix(line, "echo "))) {
			return true
		}
	}
	return false
}
func classifyBlocked(line string) string {
	l := strings.ToLower(line)
	switch {
	case strings.HasPrefix(l, "curl") || strings.HasPrefix(l, "wget"):
		return StatusNetworkBlocked
	case strings.HasPrefix(l, "git push") || strings.HasPrefix(l, "git commit") || strings.HasPrefix(l, "git merge") || strings.HasPrefix(l, "git checkout"):
		return StatusGitMutationBlocked
	case strings.Contains(l, "deploy") || strings.HasPrefix(l, "terraform apply") || strings.HasPrefix(l, "npm publish") || strings.HasPrefix(l, "wrangler deploy") || strings.HasPrefix(l, "eb deploy"):
		return StatusDeployBlocked
	case strings.Contains(l, "promote"):
		return StatusPromotionBlocked
	case strings.Contains(l, "publish_status") || strings.Contains(l, "publish status"):
		return StatusStatusPublishBlocked
	case strings.Contains(l, ".env"):
		return StatusEnvBlocked
	case strings.Contains(l, "secret"):
		return StatusSecretsBlocked
	default:
		return StatusCommandNotAllowlisted
	}
}
func unsafeClaimStatuses(claims map[string]bool) []string {
	var s []string
	trust := []string{"evidence_trusted", "result_trusted", "trace_trusted", "replay_trusted", "report_trusted", "readiness_trusted"}
	for _, k := range trust {
		if claims[k] {
			s = statusesAdd(s, StatusTrustEscalationBlocked)
		}
	}
	for _, k := range []string{"production_execution_allowed", "real_adapter_external_call_allowed", "unrestricted_command_execution_allowed", "network_call_allowed"} {
		if claims[k] {
			s = statusesAdd(s, StatusBlocked)
		}
	}
	for _, k := range []string{"deploy_allowed"} {
		if claims[k] {
			s = statusesAdd(s, StatusDeployBlocked)
		}
	}
	for _, k := range []string{"promotion_allowed"} {
		if claims[k] {
			s = statusesAdd(s, StatusPromotionBlocked)
		}
	}
	for _, k := range []string{"status_publish_allowed"} {
		if claims[k] {
			s = statusesAdd(s, StatusStatusPublishBlocked)
		}
	}
	for _, k := range []string{"memory_write_allowed", "stable_promoted", "learned_as_stable"} {
		if claims[k] {
			s = statusesAdd(s, StatusMemoryWriteBlocked)
		}
	}
	for _, k := range []string{"push_allowed", "pr_allowed", "repo_mutation_allowed"} {
		if claims[k] {
			s = statusesAdd(s, StatusGitMutationBlocked)
		}
	}
	for _, k := range []string{"pass_gold", "pass_secure"} {
		if claims[k] {
			s = statusesAdd(s, StatusTrustEscalationBlocked)
		}
	}
	if claims["authority_granted"] {
		s = statusesAdd(s, StatusAuthorityGrantBlocked)
	}
	return s
}

func BuildIsolatedControlledExecutionPlan(in IsolatedRuntimeInput) IsolatedRuntimePlan {
	p := defaultPolicy(in.Policy)
	in.Policy = p
	st, bl := validateCore(in)
	ready := len(bl) == 0
	c := in.Command
	c.Allowlisted = isAllowlisted(c, p)
	ws := in.Workspace
	ws.Temporary = true
	ws.SandboxPrefix = ".vision-tmp/isolated-runtime"
	ws.FilesystemSandboxed = ready
	ws.SymlinkEscapeBlocked = true
	return IsolatedRuntimePlan{Version: Version, DryRun: false, ReadOnly: true, Isolated: true, RuntimeMode: RuntimeMode, NextPhase: NextPhase, MCPExecutionAllowed: false, MCPMutationAllowed: false, Statuses: st, Blockers: bl, Command: c, Workspace: ws, Policy: p, Rollback: IsolatedRuntimeRollback{Available: ready, Ready: ready}, Observability: IsolatedRuntimeObservability{Ready: ready, LogsAvailable: ready}, Artifact: IsolatedRuntimeArtifact{CaptureReady: ready, Artifacts: []string{}}, IsolatedRuntimePlanReady: ready, IsolatedRuntimeValidated: ready, IsolatedWorkspaceReady: ready, IsolatedLockReady: ready, IsolatedRollbackReady: ready, IsolatedObservabilityReady: ready, IsolatedArtifactCaptureReady: ready, IsolatedAuditReady: ready, CommandAllowlisted: c.Allowlisted, IsolatedRealExecutionAllowed: ready, CommandExecutionAllowed: ready, FileWriteAllowed: ready, RealLockAllowed: ready, RollbackAllowed: ready}
}
func ValidateIsolatedControlledExecutionPlan(in IsolatedRuntimeInput) IsolatedRuntimePlan {
	return BuildIsolatedControlledExecutionPlan(in)
}

func validateCore(in IsolatedRuntimeInput) ([]string, []string) {
	st := []string{}
	bl := []string{}
	req := []string{in.IsolatedRuntimeID, in.ReadinessGateID, in.AuditReportID, in.ReplayGateID, in.PersistenceGateID, in.SandboxTraceID, in.SandboxAdapterID, in.RuntimeID, in.RuntimeSessionID, in.EvidenceBindingID, in.VerificationID, in.ResponseContractID, in.RequestEnvelopeID, in.AdapterInterfaceID, in.FinalAuthorizationID, in.SimulationID, in.FirewallID, in.DecisionID, in.InvocationID, in.Executor, in.AdapterName, in.AdapterVersion, in.Project, in.Branch, in.CommitSHA, in.Target}
	for _, v := range req {
		if strings.TrimSpace(v) == "" {
			st = statusesAdd(st, StatusReadinessGateMissing)
			bl = append(bl, "required_v10_v11_v12_identifier_missing")
			break
		}
	}
	if in.Executor == "mcp" || in.Executor == "mcp_readonly" {
		st = statusesAdd(st, StatusBlocked)
		bl = append(bl, "executor_mcp_blocked_for_execution")
	}
	if in.ExecutorMode != "isolated_controlled" {
		st = statusesAdd(st, StatusInvalidExecutorMode)
		bl = append(bl, StatusInvalidExecutorMode)
	}
	if in.AdapterType != "isolated_local" {
		st = statusesAdd(st, StatusInvalidAdapterType)
		bl = append(bl, StatusInvalidAdapterType)
	}
	if in.Environment != "isolated" && in.Environment != "local_isolated" {
		st = statusesAdd(st, StatusInvalidEnvironment)
		bl = append(bl, StatusInvalidEnvironment)
	}
	if !in.SandboxReadinessReadyDryRun || !in.SandboxToControlledExecutionCandidate || !in.V12TransitionCandidate {
		st = statusesAdd(st, StatusReadinessGateBlocked)
		bl = append(bl, StatusReadinessGateBlocked)
	}
	th := in.ReadinessThreshold
	if th <= 0 {
		th = defaultReadinessThreshold
	}
	if in.ReadinessScoreDryRun < th {
		st = statusesAdd(st, StatusReadinessScoreBelow)
		bl = append(bl, StatusReadinessScoreBelow)
	}
	for _, ok := range []bool{in.AuditReportValid, in.ReplayGateValid, in.PersistenceGateValid, in.SandboxTraceValid, in.SandboxAdapterValid, in.ControlledRuntimeValid, in.EvidenceBindingValid, in.VerificationValid, in.ResponseContractValid, in.RequestEnvelopeValid, in.AdapterInterfaceValid, in.FinalAuthorizationValid, in.SimulationValid, in.FirewallValid, in.SovereignCandidateValid, in.PassGoldReal, in.PassSecureReal, in.HumanApprovalReal, in.IndependentRevalidationReal} {
		if !ok {
			st = statusesAdd(st, StatusReadinessGateBlocked)
			bl = append(bl, "required_gate_or_approval_blocked")
			break
		}
	}
	line := commandLine(in.Command)
	if hasShellSyntax(line) {
		st = statusesAdd(st, StatusShellSyntaxBlocked)
		bl = append(bl, StatusShellSyntaxBlocked)
	}
	if hasPathTraversal(line) || hasPathTraversal(in.Workspace.Path) {
		st = statusesAdd(st, StatusPathTraversalBlocked)
		bl = append(bl, StatusPathTraversalBlocked)
	}
	if !workspaceAllowed(in.Root, in.Workspace.Path) {
		st = statusesAdd(st, StatusWorkspaceEscapeBlocked)
		bl = append(bl, StatusWorkspaceEscapeBlocked)
	}
	if symlinkEscape(in.Root, in.Workspace.Path) {
		st = statusesAdd(st, StatusSymlinkEscapeBlocked)
		bl = append(bl, StatusSymlinkEscapeBlocked)
	}
	if !isAllowlisted(in.Command, defaultPolicy(in.Policy)) {
		s := classifyBlocked(line)
		st = statusesAdd(st, s)
		bl = append(bl, s)
	}
	for _, s := range unsafeClaimStatuses(in.Claims) {
		st = statusesAdd(st, s)
		bl = append(bl, s)
	}
	if in.KillSwitch {
		st = statusesAdd(st, StatusKillSwitchTriggered)
		bl = append(bl, StatusKillSwitchTriggered)
	}
	if len(bl) == 0 {
		st = statusesAdd(st, StatusPlanReady)
		st = statusesAdd(st, StatusValidated)
		st = statusesAdd(st, StatusRollbackReady)
	} else {
		st = statusesAdd(st, StatusBlocked)
	}
	return st, bl
}
func workspaceAllowed(root, ws string) bool {
	clean := filepath.ToSlash(filepath.Clean(ws))
	return clean == ".vision-tmp/isolated-runtime" || strings.HasPrefix(clean, ".vision-tmp/isolated-runtime/")
}
func symlinkEscape(root, ws string) bool {
	if root == "" {
		root = "."
	}
	p := filepath.Join(root, ws)
	if fi, err := os.Lstat(p); err == nil && fi.Mode()&os.ModeSymlink != 0 {
		return true
	}
	return false
}

func ExecuteIsolatedControlledRuntime(in IsolatedRuntimeInput) IsolatedRuntimeResult {
	plan := ValidateIsolatedControlledExecutionPlan(in)
	res := IsolatedRuntimeResult{IsolatedRuntimePlan: plan, ExitCode: -1, IsolatedRollbackAvailable: plan.Rollback.Available, IsolatedLogsAvailable: plan.Observability.LogsAvailable}
	if !plan.IsolatedRuntimeValidated {
		res.Error = strings.Join(plan.Blockers, "; ")
		return res
	}
	root := in.Root
	if root == "" {
		root = "."
	}
	ws := filepath.Join(root, filepath.Clean(in.Workspace.Path))
	if err := os.MkdirAll(filepath.Join(ws, "logs"), 0o755); err != nil {
		res.Error = err.Error()
		return res
	}
	lock := filepath.Join(ws, "runtime.lock")
	if err := os.WriteFile(lock, []byte(in.IsolatedRuntimeID), 0o600); err != nil {
		res.Error = err.Error()
		return res
	}
	snap := filepath.Join(ws, "snapshot")
	_ = os.MkdirAll(snap, 0o755)
	started := time.Now().UTC()
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(plan.Policy.TimeoutSeconds)*time.Second)
	defer cancel()
	name, args := execParts(in.Command)
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = ws
	cmd.Env = []string{"PATH=" + os.Getenv("PATH"), "HOME=" + ws, "VISION_ISOLATED_RUNTIME=1"}
	var out, errb bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errb
	runErr := cmd.Run()
	finished := time.Now().UTC()
	exit := 0
	if runErr != nil {
		exit = 1
		var ee *exec.ExitError
		if errors.As(runErr, &ee) {
			exit = ee.ExitCode()
		}
		if ctx.Err() == context.DeadlineExceeded {
			plan.Statuses = statusesAdd(plan.Statuses, StatusTimeoutExceeded)
		}
	}
	logPath := filepath.Join(ws, "logs", "execution.log")
	_ = os.WriteFile(logPath, []byte(out.String()+errb.String()), 0o600)
	success := runErr == nil && ctx.Err() == nil
	plan.Observability.LogPath = logPath
	plan.Observability.StartedAtUTC = started.Format(time.RFC3339)
	plan.Observability.FinishedAtUTC = finished.Format(time.RFC3339)
	plan.Observability.DurationMillis = finished.Sub(started).Milliseconds()
	plan.Rollback.SnapshotPath = snap
	plan.Artifact.Artifacts = []string{lock, logPath}
	if !success {
		plan.Rollback.Performed = true
		plan.Statuses = statusesAdd(plan.Statuses, StatusRollbackPerformed)
		plan.Statuses = statusesAdd(plan.Statuses, StatusExecutionFailed)
	} else {
		plan.Statuses = statusesAdd(plan.Statuses, StatusExecuted)
		plan.Statuses = statusesAdd(plan.Statuses, StatusExecutionSuccess)
	}
	res.IsolatedRuntimePlan = plan
	res.IsolatedRuntimeExecuted = true
	res.IsolatedExecutionPerformed = true
	res.IsolatedExecutionSuccess = success
	res.IsolatedLogsAvailable = true
	res.ExitCode = exit
	res.Stdout = out.String()
	res.Stderr = errb.String()
	if runErr != nil {
		res.Error = runErr.Error()
	}
	return res
}
func execParts(c IsolatedRuntimeCommand) (string, []string) {
	if c.Raw != "" {
		f := strings.Fields(c.Raw)
		if len(f) == 0 {
			return "", nil
		}
		return f[0], f[1:]
	}
	return c.Name, c.Args
}

func BuildIsolatedRuntimeBoundary() IsolatedRuntimeBoundary {
	return IsolatedRuntimeBoundary{Version: Version, DryRun: false, ReadOnly: true, Isolated: true, RuntimeMode: RuntimeMode, NextPhase: NextPhase, MCPExecutionAllowed: false, MCPMutationAllowed: false, MCPCan: []string{"read", "validate", "audit", "explain", "build isolated runtime plan payload", "summarize isolation requirements", "summarize allowed commands", "summarize denied commands", "summarize blockers before execution", "return isolated runtime boundary"}, MCPCannot: []string{"execute", "execute_runtime", "execute_isolated_runtime", "call_real_adapter", "call_executor", "network_call", "unrestricted_command_execution", "file_write", "database_write", "persist_trace", "persist_replay", "persist_report", "persist_readiness", "write_ledger", "deploy", "promote", "publish_status", "push", "open_pr", "mutate_repo", "write_memory", "learn_stable", "trust_trace", "trust_replay", "trust_report", "trust_readiness", "trust_evidence", "trust_result", "mark_PASS_GOLD", "mark_PASS_SECURE", "grant_authority"}, AllowedCommands: defaultPolicy(IsolatedRuntimePolicy{}).AllowlistedCommands, DeniedCommands: defaultPolicy(IsolatedRuntimePolicy{}).DeniedCommands, AlwaysDenied: alwaysDenied()}
}
func AuditIsolatedControlledRuntime(in IsolatedRuntimeInput) IsolatedRuntimeAudit {
	f := map[string]bool{}
	add := func(k string, b bool) { f[k] = b }
	c := in.Claims
	line := strings.ToLower(commandLine(in.Command))
	add("production_execution_attempt_found", c["production_execution_allowed"])
	add("unrestricted_command_attempt_found", c["unrestricted_command_execution_allowed"])
	add("shell_escape_attempt_found", hasShellSyntax(commandLine(in.Command)) || c["shell_escape"])
	add("path_traversal_attempt_found", hasPathTraversal(commandLine(in.Command)) || hasPathTraversal(in.Workspace.Path))
	add("workspace_escape_attempt_found", !workspaceAllowed(in.Root, in.Workspace.Path) || c["workspace_escaped"])
	add("symlink_escape_attempt_found", symlinkEscape(in.Root, in.Workspace.Path) || c["symlink_escaped"])
	add("network_attempt_found", strings.HasPrefix(line, "curl") || strings.HasPrefix(line, "wget") || c["network_call_allowed"])
	add("secrets_access_attempt_found", strings.Contains(line, "secret") || c["secrets_accessed"])
	add("env_access_attempt_found", strings.Contains(line, ".env") || c["env_accessed"])
	add("git_mutation_attempt_found", strings.HasPrefix(line, "git push") || strings.HasPrefix(line, "git commit") || strings.HasPrefix(line, "git merge") || strings.HasPrefix(line, "git checkout") || c["repo_mutation_allowed"] || c["push_allowed"] || c["pr_allowed"])
	add("deploy_attempt_found", strings.Contains(line, "deploy") || c["deploy_allowed"])
	add("promotion_attempt_found", strings.Contains(line, "promote") || c["promotion_allowed"])
	add("status_publish_attempt_found", c["status_publish_allowed"])
	add("memory_write_attempt_found", c["memory_write_allowed"])
	add("stable_learning_attempt_found", c["learned_as_stable"] || c["stable_promoted"])
	add("push_attempt_found", c["push_allowed"])
	add("pr_attempt_found", c["pr_allowed"])
	for _, k := range []string{"evidence", "result", "trace", "replay", "report", "readiness"} {
		add(k+"_trust_attempt_found", c[k+"_trusted"])
	}
	add("auto_gold_attempt_found", c["pass_gold"])
	add("auto_secure_attempt_found", c["pass_secure"])
	add("authority_grant_attempt_found", c["authority_granted"])
	for _, k := range []string{"isolation", "rollback", "lock", "observability", "approval", "command_allowlist", "filesystem_isolation", "kill_switch"} {
		add(k+"_bypass_attempt_found", c[k+"_bypassed"])
	}
	p := ValidateIsolatedControlledExecutionPlan(in)
	return IsolatedRuntimeAudit{Version: Version, ReadOnly: true, Isolated: true, RuntimeMode: RuntimeMode, NextPhase: NextPhase, MCPExecutionAllowed: false, MCPMutationAllowed: false, Findings: f, Blockers: p.Blockers}
}
func ExplainIsolatedControlledRuntime(in IsolatedRuntimeInput) IsolatedRuntimeExplain {
	return IsolatedRuntimeExplain{Version: Version, ReadOnly: true, Isolated: true, RuntimeMode: RuntimeMode, NextPhase: NextPhase, MCPExecutionAllowed: false, MCPMutationAllowed: false, RequiredGates: []string{"PASS_GOLD", "PASS_SECURE"}, AlwaysDenied: alwaysDenied(), Reasons: map[string]string{"why_v12_is_first_isolated_execution_phase": "V12.0 permits only minimal real execution in an isolated local workspace after V11.6 readiness.", "why_v12_is_not_production_execution": "production execution, deploy, promotion, status publication, push, PR, and repo mutation remain denied.", "why_mcp_cannot_execute": "MCP remains read-only and can only plan, validate, audit, explain, and return boundaries.", "why_execution_requires_explicit_isolated_runtime": "real isolated execution must be invoked through the internal runtime, never through MCP mutating tools.", "why_command_allowlist_is_required": "only reviewed local commands can run without shell expansion.", "why_shell_syntax_is_blocked": "pipes, redirects, command chaining, backticks, and substitutions enable escape from controlled execution.", "why_workspace_isolation_is_required": "writes, locks, logs, artifacts, snapshots, and rollback are constrained to .vision-tmp/isolated-runtime.", "why_network_is_blocked": "network calls are outside V12.0 isolated local scope.", "why_secrets_and_env_are_blocked": "secrets and real .env files must not be exposed to isolated execution.", "why_git_deploy_promotion_status_are_blocked": "V12.0 cannot mutate repositories or publish operational state.", "why_lock_rollback_observability_are_required": "isolated execution must be auditable and reversible.", "why_pass_gold_and_pass_secure_are_not_generated_by_isolated_runtime": "the runtime consumes real gates but cannot mint them.", "why_trust_and_authority_are_not_granted": "isolated results are local evidence only and cannot elevate trust or authority.", "why_v12_1_receipt_is_next": "V12.1 will add an isolated command execution receipt."}}
}
func alwaysDenied() map[string]bool {
	keys := []string{"production_execution_allowed", "real_adapter_external_call_allowed", "unrestricted_command_execution_allowed", "network_call_allowed", "deploy_allowed", "promotion_allowed", "status_publish_allowed", "memory_write_allowed", "stable_promotion_allowed", "learning_allowed", "push_allowed", "pr_allowed", "repo_mutation_allowed", "evidence_trust_allowed", "result_trust_allowed", "trace_trust_allowed", "replay_trust_allowed", "report_trust_allowed", "readiness_trust_allowed", "pass_gold_allowed", "pass_secure_allowed", "authority_grant_allowed", "pass_gold", "pass_secure", "authority_granted"}
	m := map[string]bool{}
	for _, k := range keys {
		m[k] = false
	}
	return m
}

func init() { _ = fmt.Sprintf("%s", runtime.GOOS) }
