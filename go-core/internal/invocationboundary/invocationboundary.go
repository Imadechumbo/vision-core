// Package invocationboundary implements V9.7 External Executor Invocation Boundary.
//
// The invocation boundary is deliberately read-only and dry-run. It validates
// whether a future payload is formally ready to leave the MCP control plane for
// an external executor, but it never invokes that executor, calls networks,
// executes commands, writes files, stores tokens, signs payloads, promotes,
// deploys, publishes status, mutates memory, acquires locks, or rolls back.
package invocationboundary

import "strings"

const Version = "V9.7"

const (
	StatusReadyDryRun      = "invocation_boundary_ready_dry_run"
	StatusIncomplete       = "incomplete"
	StatusMissingRealGates = "missing_real_gates"
	StatusBlocked          = "blocked"
	StatusUnsafeInvocation = "unsafe_invocation_attempt"
)

var requiredItems = []string{
	"invocation_id", "executor", "executor_mode", "external_only", "project", "branch", "commit_sha", "target", "environment",
	"handoff_package_valid", "final_preflight_valid", "authorization_manifest_valid", "safety_envelope_valid", "authority_valid",
	"PASS_GOLD_REAL", "PASS_SECURE_REAL", "required_artifacts", "invocation_payload", "authorization_token_placeholder",
	"signature_placeholder", "idempotency_key", "timeout", "kill_switch", "rollback", "audit", "mcp_hard_deny_boundary",
	"no_network_call", "no_command_execution", "no_file_write",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var forbiddenInsideMCP = []string{
	"invoke_executor", "call_external_executor", "network_call", "command_execution", "file_write", "authorize_execution_inside_mcp",
	"promote", "deploy", "publish_status", "push", "open_pr", "mutate", "write_memory", "acquire_real_lock", "perform_rollback",
}

// InvocationInput is the V9.7 advisory payload accepted by MCP tools.
type InvocationInput struct {
	Root                         string                   `json:"root,omitempty"`
	MissionInput                 string                   `json:"mission_input,omitempty"`
	Operation                    string                   `json:"operation,omitempty"`
	Invocation                   *InvocationInput         `json:"invocation,omitempty"`
	InvocationID                 string                   `json:"invocation_id,omitempty"`
	Executor                     string                   `json:"executor,omitempty"`
	ExecutorMode                 string                   `json:"executor_mode,omitempty"`
	Project                      string                   `json:"project,omitempty"`
	Branch                       string                   `json:"branch,omitempty"`
	CommitSHA                    string                   `json:"commit_sha,omitempty"`
	Target                       string                   `json:"target,omitempty"`
	Environment                  string                   `json:"environment,omitempty"`
	HandoffPackage               *InvocationSummary       `json:"handoff_package,omitempty"`
	FinalPreflight               *InvocationSummary       `json:"final_preflight,omitempty"`
	AuthorizationManifest        *InvocationSummary       `json:"authorization_manifest,omitempty"`
	SafetyEnvelope               *InvocationSummary       `json:"safety_envelope,omitempty"`
	Authority                    *AuthoritySummary        `json:"authority,omitempty"`
	Gates                        []InvocationGate         `json:"gates,omitempty"`
	Artifacts                    []InvocationArtifact     `json:"artifacts,omitempty"`
	InvocationPayload            *InvocationPayload       `json:"invocation_payload,omitempty"`
	Authorization                *InvocationAuthorization `json:"authorization,omitempty"`
	Signature                    *InvocationSignature     `json:"signature,omitempty"`
	Idempotency                  *InvocationIdempotency   `json:"idempotency,omitempty"`
	Timeout                      *InvocationTimeout       `json:"timeout,omitempty"`
	KillSwitch                   *InvocationKillSwitch    `json:"kill_switch,omitempty"`
	Rollback                     *InvocationRollback      `json:"rollback,omitempty"`
	Audit                        *InvocationAudit         `json:"audit,omitempty"`
	Boundary                     *InvocationBoundary      `json:"boundary,omitempty"`
	Strict                       bool                     `json:"strict,omitempty"`
	ExternalInvocationReadyClaim bool                     `json:"external_invocation_boundary_ready,omitempty"`
	MCPExecutionAllowed          bool                     `json:"mcp_execution_allowed,omitempty"`
	ExecutorCallAllowedInsideMCP bool                     `json:"executor_call_allowed_inside_mcp,omitempty"`
	NetworkCallAllowed           bool                     `json:"network_call_allowed,omitempty"`
	CommandExecutionAllowed      bool                     `json:"command_execution_allowed,omitempty"`
	FileWriteAllowed             bool                     `json:"file_write_allowed,omitempty"`
	PromotionAllowed             bool                     `json:"promotion_allowed,omitempty"`
	DeployAllowed                bool                     `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed         bool                     `json:"status_publish_allowed,omitempty"`
	MutationAllowed              bool                     `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed           bool                     `json:"memory_write_allowed,omitempty"`
	AttemptExternalCall          bool                     `json:"attempt_external_call,omitempty"`
	AttemptRealExecutorCall      bool                     `json:"attempt_real_executor_call,omitempty"`
	AttemptRealRollback          bool                     `json:"attempt_real_rollback,omitempty"`
	AttemptRealLock              bool                     `json:"attempt_real_lock,omitempty"`
	CommandExecution             bool                     `json:"command_execution,omitempty"`
	NetworkCall                  bool                     `json:"network_call,omitempty"`
	FileWrite                    bool                     `json:"file_write,omitempty"`
	PassGold                     bool                     `json:"pass_gold,omitempty"`
	PassSecure                   bool                     `json:"pass_secure,omitempty"`
	ExecutionAuthorizedInsideMCP bool                     `json:"execution_authorized_inside_mcp,omitempty"`
}

type InvocationSummary struct {
	Present                         bool   `json:"present,omitempty"`
	Version                         string `json:"version,omitempty"`
	Status                          string `json:"status,omitempty"`
	ExternalExecutorHandoffReady    bool   `json:"external_executor_handoff_ready,omitempty"`
	ExternalExecutionPreflightReady bool   `json:"external_execution_preflight_ready,omitempty"`
	WouldAuthorizeExternalExecutor  bool   `json:"would_authorize_external_executor,omitempty"`
	WouldAllowExternalExecutor      bool   `json:"would_allow_external_executor,omitempty"`
	Valid                           bool   `json:"valid,omitempty"`
}

type AuthoritySummary struct {
	Present        bool   `json:"present,omitempty"`
	Version        string `json:"version,omitempty"`
	Status         string `json:"status,omitempty"`
	PassGoldReal   bool   `json:"pass_gold_real,omitempty"`
	PassSecureReal bool   `json:"pass_secure_real,omitempty"`
	Valid          bool   `json:"valid,omitempty"`
}

type InvocationPayload struct {
	Present         bool   `json:"present,omitempty"`
	PayloadID       string `json:"payload_id,omitempty"`
	Operation       string `json:"operation,omitempty"`
	Executor        string `json:"executor,omitempty"`
	ExecutorMode    string `json:"executor_mode,omitempty"`
	Project         string `json:"project,omitempty"`
	Branch          string `json:"branch,omitempty"`
	CommitSHA       string `json:"commit_sha,omitempty"`
	Target          string `json:"target,omitempty"`
	Environment     string `json:"environment,omitempty"`
	HandoffID       string `json:"handoff_id,omitempty"`
	PreflightID     string `json:"preflight_id,omitempty"`
	AuthorizationID string `json:"authorization_id,omitempty"`
	DryRun          bool   `json:"dry_run,omitempty"`
	ReadOnly        bool   `json:"read_only,omitempty"`
	ExternalOnly    bool   `json:"external_only,omitempty"`
	Valid           bool   `json:"valid,omitempty"`
}

type InvocationAuthorization struct {
	Present               bool   `json:"present,omitempty"`
	AuthorizationID       string `json:"authorization_id,omitempty"`
	TokenPlaceholder      string `json:"token_placeholder,omitempty"`
	TokenPresent          bool   `json:"token_present,omitempty"`
	TokenPlaintextPresent bool   `json:"token_plaintext_present,omitempty"`
	Source                string `json:"source,omitempty"`
	Valid                 bool   `json:"valid,omitempty"`
}

type InvocationSignature struct {
	Present                         bool   `json:"present,omitempty"`
	SignaturePlaceholder            string `json:"signature_placeholder,omitempty"`
	SignaturePresent                bool   `json:"signature_present,omitempty"`
	SignatureAlgorithmDeclared      bool   `json:"signature_algorithm_declared,omitempty"`
	SignaturePlaintextSecretPresent bool   `json:"signature_plaintext_secret_present,omitempty"`
	Valid                           bool   `json:"valid,omitempty"`
}

type InvocationIdempotency struct {
	Present                 bool   `json:"present,omitempty"`
	Key                     string `json:"key,omitempty"`
	Scope                   string `json:"scope,omitempty"`
	DuplicateActionBehavior string `json:"duplicate_action_behavior,omitempty"`
	ReplayProtection        bool   `json:"replay_protection,omitempty"`
	Valid                   bool   `json:"valid,omitempty"`
}

type InvocationTimeout struct {
	Present       bool `json:"present,omitempty"`
	MaxSeconds    int  `json:"max_seconds,omitempty"`
	GracefulAbort bool `json:"graceful_abort,omitempty"`
	HardAbort     bool `json:"hard_abort,omitempty"`
	Valid         bool `json:"valid,omitempty"`
}
type InvocationKillSwitch struct {
	Present        bool   `json:"present,omitempty"`
	Enabled        bool   `json:"enabled,omitempty"`
	Trigger        string `json:"trigger,omitempty"`
	ManualOverride bool   `json:"manual_override,omitempty"`
	Valid          bool   `json:"valid,omitempty"`
}
type InvocationRollback struct {
	Present                    bool   `json:"present,omitempty"`
	Mandatory                  bool   `json:"mandatory,omitempty"`
	Strategy                   string `json:"strategy,omitempty"`
	SnapshotRequired           bool   `json:"snapshot_required,omitempty"`
	ValidationRequired         bool   `json:"validation_required,omitempty"`
	ManualInterventionRequired bool   `json:"manual_intervention_required,omitempty"`
	Valid                      bool   `json:"valid,omitempty"`
}
type InvocationAudit struct {
	Present                     bool   `json:"present,omitempty"`
	AuditID                     string `json:"audit_id,omitempty"`
	RecordsPayload              bool   `json:"records_payload,omitempty"`
	RecordsAuthorization        bool   `json:"records_authorization,omitempty"`
	RecordsSignaturePlaceholder bool   `json:"records_signature_placeholder,omitempty"`
	RecordsIdempotency          bool   `json:"records_idempotency,omitempty"`
	RecordsDecision             bool   `json:"records_decision,omitempty"`
	ImmutableTargetDeclared     bool   `json:"immutable_target_declared,omitempty"`
	Valid                       bool   `json:"valid,omitempty"`
}

type InvocationBoundary struct {
	Present                 bool     `json:"present,omitempty"`
	ExternalOnly            bool     `json:"external_only,omitempty"`
	MCPHardDeny             bool     `json:"mcp_hard_deny,omitempty"`
	NoExecutorCallInsideMCP bool     `json:"no_executor_call_inside_mcp,omitempty"`
	NoNetworkCall           bool     `json:"no_network_call,omitempty"`
	NoCommandExecution      bool     `json:"no_command_execution,omitempty"`
	NoFileWrite             bool     `json:"no_file_write,omitempty"`
	ForbiddenInsideMCP      []string `json:"forbidden_inside_mcp,omitempty"`
	AllowedOnlyOutsideMCP   []string `json:"allowed_only_outside_mcp,omitempty"`
	Valid                   bool     `json:"valid,omitempty"`
}

type InvocationGate struct {
	Gate                  string `json:"gate,omitempty"`
	Status                string `json:"status,omitempty"`
	RealEvidence          bool   `json:"real_evidence,omitempty"`
	DryRun                bool   `json:"dry_run,omitempty"`
	Synthesized           bool   `json:"synthesized,omitempty"`
	Advisory              bool   `json:"advisory,omitempty"`
	RecognizedByAuthority bool   `json:"recognized_by_authority,omitempty"`
	Source                string `json:"source,omitempty"`
	ArtifactID            string `json:"artifact_id,omitempty"`
	Valid                 bool   `json:"valid,omitempty"`
}
type InvocationArtifact struct {
	ID       string `json:"id,omitempty"`
	Type     string `json:"type,omitempty"`
	Required bool   `json:"required,omitempty"`
	Present  bool   `json:"present,omitempty"`
	Trusted  bool   `json:"trusted,omitempty"`
	Source   string `json:"source,omitempty"`
	Valid    bool   `json:"valid,omitempty"`
}

type InvocationBoundaryResult struct {
	Version                         string                   `json:"version"`
	DryRun                          bool                     `json:"dry_run"`
	ReadOnly                        bool                     `json:"read_only"`
	InvocationID                    string                   `json:"invocation_id,omitempty"`
	BoundaryStatus                  string                   `json:"boundary_status"`
	ExternalInvocationBoundaryReady bool                     `json:"external_invocation_boundary_ready"`
	Executor                        string                   `json:"executor,omitempty"`
	ExecutorMode                    string                   `json:"executor_mode,omitempty"`
	Project                         string                   `json:"project,omitempty"`
	Branch                          string                   `json:"branch,omitempty"`
	CommitSHA                       string                   `json:"commit_sha,omitempty"`
	Target                          string                   `json:"target,omitempty"`
	Environment                     string                   `json:"environment,omitempty"`
	InvocationPayload               *InvocationPayload       `json:"invocation_payload,omitempty"`
	HandoffPackage                  *InvocationSummary       `json:"handoff_package,omitempty"`
	FinalPreflight                  *InvocationSummary       `json:"final_preflight,omitempty"`
	AuthorizationManifest           *InvocationSummary       `json:"authorization_manifest,omitempty"`
	SafetyEnvelope                  *InvocationSummary       `json:"safety_envelope,omitempty"`
	Authority                       *AuthoritySummary        `json:"authority,omitempty"`
	Gates                           []InvocationGate         `json:"gates,omitempty"`
	Artifacts                       []InvocationArtifact     `json:"artifacts,omitempty"`
	Authorization                   *InvocationAuthorization `json:"authorization,omitempty"`
	Signature                       *InvocationSignature     `json:"signature,omitempty"`
	Idempotency                     *InvocationIdempotency   `json:"idempotency,omitempty"`
	Timeout                         *InvocationTimeout       `json:"timeout,omitempty"`
	KillSwitch                      *InvocationKillSwitch    `json:"kill_switch,omitempty"`
	Rollback                        *InvocationRollback      `json:"rollback,omitempty"`
	Audit                           *InvocationAudit         `json:"audit,omitempty"`
	Boundary                        *InvocationBoundary      `json:"boundary,omitempty"`
	MissingItems                    []string                 `json:"missing_items"`
	MissingGates                    []string                 `json:"missing_gates"`
	UnsafeClaims                    []string                 `json:"unsafe_claims"`
	Conflicts                       []string                 `json:"conflicts"`
	MCPExecutionAllowed             bool                     `json:"mcp_execution_allowed"`
	ExecutorCallAllowedInsideMCP    bool                     `json:"executor_call_allowed_inside_mcp"`
	NetworkCallAllowed              bool                     `json:"network_call_allowed"`
	CommandExecutionAllowed         bool                     `json:"command_execution_allowed"`
	FileWriteAllowed                bool                     `json:"file_write_allowed"`
	PromotionAllowed                bool                     `json:"promotion_allowed"`
	DeployAllowed                   bool                     `json:"deploy_allowed"`
	StatusPublishAllowed            bool                     `json:"status_publish_allowed"`
	MutationAllowed                 bool                     `json:"mutation_allowed"`
	MemoryWriteAllowed              bool                     `json:"memory_write_allowed"`
	UsableForPassGold               bool                     `json:"usable_for_pass_gold"`
	UsableForPassSecure             bool                     `json:"usable_for_pass_secure"`
	Recommendations                 []string                 `json:"recommendations"`
}

type InvocationValidation struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	Valid                           bool     `json:"valid"`
	Blocked                         bool     `json:"blocked"`
	BoundaryStatus                  string   `json:"boundary_status"`
	ExternalInvocationBoundaryReady bool     `json:"external_invocation_boundary_ready"`
	MissingItems                    []string `json:"missing_items"`
	MissingGates                    []string `json:"missing_gates"`
	UnsafeClaims                    []string `json:"unsafe_claims"`
	Conflicts                       []string `json:"conflicts"`
	RequiredItems                   []string `json:"required_items"`
	MCPExecutionAllowed             bool     `json:"mcp_execution_allowed"`
	ExecutorCallAllowedInsideMCP    bool     `json:"executor_call_allowed_inside_mcp"`
	NetworkCallAllowed              bool     `json:"network_call_allowed"`
	CommandExecutionAllowed         bool     `json:"command_execution_allowed"`
	FileWriteAllowed                bool     `json:"file_write_allowed"`
	PromotionAllowed                bool     `json:"promotion_allowed"`
	DeployAllowed                   bool     `json:"deploy_allowed"`
	StatusPublishAllowed            bool     `json:"status_publish_allowed"`
	MutationAllowed                 bool     `json:"mutation_allowed"`
	MemoryWriteAllowed              bool     `json:"memory_write_allowed"`
	UsableForPassGold               bool     `json:"usable_for_pass_gold"`
	UsableForPassSecure             bool     `json:"usable_for_pass_secure"`
	Recommendations                 []string `json:"recommendations"`
}

type HardDenyBoundary struct {
	Version                          string   `json:"version"`
	DryRun                           bool     `json:"dry_run"`
	ReadOnly                         bool     `json:"read_only"`
	MCPScope                         []string `json:"mcp_scope"`
	ExternalExecutorScope            []string `json:"external_executor_scope"`
	ForbiddenInsideMCP               []string `json:"forbidden_inside_mcp"`
	RequiredBeforeExternalInvocation []string `json:"required_before_external_invocation"`
	AllowedOnlyOutsideMCP            []string `json:"allowed_only_outside_mcp"`
	RequiredInvocationItems          []string `json:"required_invocation_items"`
	Notes                            []string `json:"notes"`
}

type InvocationAuditResult struct {
	Version                     string   `json:"version"`
	DryRun                      bool     `json:"dry_run"`
	ReadOnly                    bool     `json:"read_only"`
	ConflictsFound              bool     `json:"conflicts_found"`
	Conflicts                   []string `json:"conflicts"`
	UnsafeClaimsFound           bool     `json:"unsafe_claims_found"`
	UnsafeClaims                []string `json:"unsafe_claims"`
	MissingItemsFound           bool     `json:"missing_items_found"`
	MissingItems                []string `json:"missing_items"`
	ExecutionAttemptFound       bool     `json:"execution_attempt_found"`
	MutationAttemptFound        bool     `json:"mutation_attempt_found"`
	NetworkAttemptFound         bool     `json:"network_attempt_found"`
	CommandAttemptFound         bool     `json:"command_attempt_found"`
	FileWriteAttemptFound       bool     `json:"file_write_attempt_found"`
	MCPExecutorCallAttemptFound bool     `json:"mcp_executor_call_attempt_found"`
	DryRunGateClaimFound        bool     `json:"dry_run_gate_claim_found"`
	SynthesizedGateClaimFound   bool     `json:"synthesized_gate_claim_found"`
	PlaintextSecretFound        bool     `json:"plaintext_secret_found"`
	Recommendations             []string `json:"recommendations"`
}

type InvocationExplain struct {
	Version                             string   `json:"version"`
	DryRun                              bool     `json:"dry_run"`
	ReadOnly                            bool     `json:"read_only"`
	Summary                             string   `json:"summary"`
	InvocationModel                     []string `json:"invocation_model"`
	RequiredItems                       []string `json:"required_items"`
	WhyMCPCannotInvokeExecutor          []string `json:"why_mcp_cannot_invoke_executor"`
	WhyInvocationBoundaryIsNotPassGold  []string `json:"why_invocation_boundary_is_not_pass_gold"`
	WhyInvocationBoundaryIsNotExecution []string `json:"why_invocation_boundary_is_not_execution"`
	WhyTokensArePlaceholdersOnly        []string `json:"why_tokens_are_placeholders_only"`
	BlockedActions                      []string `json:"blocked_actions"`
	SafestNextSteps                     []string `json:"safest_next_steps"`
	RequiredGates                       []string `json:"required_gates"`
}

func NormalizeInvocation(input InvocationInput) InvocationInput {
	if input.Invocation != nil {
		nested := *input.Invocation
		if input.InvocationID == "" {
			input.InvocationID = nested.InvocationID
		}
		if input.Executor == "" {
			input.Executor = nested.Executor
		}
		if input.ExecutorMode == "" {
			input.ExecutorMode = nested.ExecutorMode
		}
		if input.Project == "" {
			input.Project = nested.Project
		}
		if input.Branch == "" {
			input.Branch = nested.Branch
		}
		if input.CommitSHA == "" {
			input.CommitSHA = nested.CommitSHA
		}
		if input.Target == "" {
			input.Target = nested.Target
		}
		if input.Environment == "" {
			input.Environment = nested.Environment
		}
	}
	return input
}

func BuildInvocationBoundary(input InvocationInput) InvocationBoundaryResult {
	in := NormalizeInvocation(input)
	v := ValidateInvocationBoundary(in)
	status := v.BoundaryStatus
	return InvocationBoundaryResult{Version: Version, DryRun: true, ReadOnly: true, InvocationID: in.InvocationID, BoundaryStatus: status, ExternalInvocationBoundaryReady: v.ExternalInvocationBoundaryReady, Executor: in.Executor, ExecutorMode: in.ExecutorMode, Project: in.Project, Branch: in.Branch, CommitSHA: in.CommitSHA, Target: in.Target, Environment: in.Environment, InvocationPayload: in.InvocationPayload, HandoffPackage: in.HandoffPackage, FinalPreflight: in.FinalPreflight, AuthorizationManifest: in.AuthorizationManifest, SafetyEnvelope: in.SafetyEnvelope, Authority: in.Authority, Gates: in.Gates, Artifacts: in.Artifacts, Authorization: in.Authorization, Signature: in.Signature, Idempotency: in.Idempotency, Timeout: in.Timeout, KillSwitch: in.KillSwitch, Rollback: in.Rollback, Audit: in.Audit, Boundary: in.Boundary, MissingItems: v.MissingItems, MissingGates: v.MissingGates, UnsafeClaims: v.UnsafeClaims, Conflicts: v.Conflicts, Recommendations: v.Recommendations}
}

func ValidateInvocationBoundary(input InvocationInput) InvocationValidation {
	in := NormalizeInvocation(input)
	missing, missingGates, unsafe, conflicts := analyze(in)
	status := StatusReadyDryRun
	if len(unsafe) > 0 {
		status = StatusBlocked
	}
	if hasExecutionAttempt(in) {
		status = StatusUnsafeInvocation
	}
	if len(missingGates) > 0 && status == StatusReadyDryRun {
		status = StatusMissingRealGates
	}
	if len(missing) > 0 && status == StatusReadyDryRun {
		status = StatusIncomplete
	}
	ready := len(missing) == 0 && len(missingGates) == 0 && len(unsafe) == 0 && len(conflicts) == 0
	if in.ExternalInvocationReadyClaim && !ready {
		conflicts = appendUnique(conflicts, "external_invocation_boundary_ready cannot be true while required items are missing or unsafe")
	}
	return InvocationValidation{Version: Version, DryRun: true, ReadOnly: true, Valid: ready, Blocked: len(unsafe) > 0 || hasExecutionAttempt(in) || len(conflicts) > 0, BoundaryStatus: status, ExternalInvocationBoundaryReady: ready, MissingItems: missing, MissingGates: missingGates, UnsafeClaims: unsafe, Conflicts: conflicts, RequiredItems: clone(requiredItems), Recommendations: recommendations(missing, unsafe, conflicts)}
}

func BuildInvocationHardDenyBoundary() HardDenyBoundary {
	return HardDenyBoundary{Version: Version, DryRun: true, ReadOnly: true, MCPScope: []string{"read", "validate", "audit", "explain", "simulate_invocation_boundary"}, ExternalExecutorScope: []string{"receive_payload_only_outside_mcp", "verify_real_authorization_outside_mcp", "execute_only_outside_mcp_after_real_gates"}, ForbiddenInsideMCP: clone(forbiddenInsideMCP), RequiredBeforeExternalInvocation: clone(requiredItems), AllowedOnlyOutsideMCP: []string{"invoke_executor", "network_call_to_executor", "command_execution", "promotion", "deployment", "status_publish", "real_lock", "real_rollback"}, RequiredInvocationItems: clone(requiredItems), Notes: []string{"V9.7 does not implement real invocation", "V9.7 does not implement real signatures", "V9.7 never stores real tokens", "V9.7 does not export payloads"}}
}

func AuditInvocationBoundary(input InvocationInput) InvocationAuditResult {
	in := NormalizeInvocation(input)
	missing, _, unsafe, conflicts := analyze(in)
	dry, synth := false, false
	for _, g := range in.Gates {
		if g.DryRun {
			dry = true
		}
		if g.Synthesized {
			synth = true
		}
	}
	plain := (in.Authorization != nil && in.Authorization.TokenPlaintextPresent) || (in.Signature != nil && in.Signature.SignaturePlaintextSecretPresent)
	return InvocationAuditResult{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(conflicts) > 0, Conflicts: conflicts, UnsafeClaimsFound: len(unsafe) > 0, UnsafeClaims: unsafe, MissingItemsFound: len(missing) > 0, MissingItems: missing, ExecutionAttemptFound: hasExecutionAttempt(in), MutationAttemptFound: in.PromotionAllowed || in.DeployAllowed || in.StatusPublishAllowed || in.MutationAllowed || in.MemoryWriteAllowed || in.AttemptRealRollback || in.AttemptRealLock, NetworkAttemptFound: in.NetworkCallAllowed || in.NetworkCall || in.AttemptExternalCall || in.AttemptRealExecutorCall, CommandAttemptFound: in.CommandExecutionAllowed || in.CommandExecution, FileWriteAttemptFound: in.FileWriteAllowed || in.FileWrite, MCPExecutorCallAttemptFound: isMCPExecutor(in.Executor) || in.ExecutorCallAllowedInsideMCP || in.AttemptRealExecutorCall, DryRunGateClaimFound: dry, SynthesizedGateClaimFound: synth, PlaintextSecretFound: plain, Recommendations: recommendations(missing, unsafe, conflicts)}
}

func ExplainInvocationBoundary(input InvocationInput) InvocationExplain {
	return InvocationExplain{Version: Version, DryRun: true, ReadOnly: true, Summary: "V9.7 defines a read-only/dry-run boundary for a future external executor invocation; MCP never invokes the executor.", InvocationModel: []string{"MCP may assemble, validate, audit, explain, and simulate boundary readiness only", "A future external executor may receive a complete payload only outside MCP", "Boundary readiness is advisory and cannot become real execution inside MCP"}, RequiredItems: clone(requiredItems), WhyMCPCannotInvokeExecutor: []string{"MCP is a read-only control plane", "External executor calls require network/process side effects that are forbidden inside MCP", "PASS_GOLD_REAL and PASS_SECURE_REAL are prerequisites but do not authorize MCP execution"}, WhyInvocationBoundaryIsNotPassGold: []string{"Boundary validation is not PASS GOLD evidence", "It cannot synthesize PASS_GOLD_REAL or PASS_SECURE_REAL", "usable_for_pass_gold is always false"}, WhyInvocationBoundaryIsNotExecution: []string{"No HTTP call, command, file write, deployment, status publication, lock, or rollback is performed", "external_invocation_boundary_ready only means the payload appears complete for a future outside-MCP handoff"}, WhyTokensArePlaceholdersOnly: []string{"MCP must not store or expose real tokens", "Token placeholders indicate an external secret source without plaintext", "Signatures are placeholders; V9.7 does not sign payloads"}, BlockedActions: clone(forbiddenInsideMCP), SafestNextSteps: []string{"Collect real PASS_GOLD and PASS_SECURE evidence", "Keep authorization tokens and signatures outside MCP", "Use the boundary result only as advisory input to an external process"}, RequiredGates: clone(requiredGates)}
}

func EvaluateInvocationBoundaryEligibility(input InvocationInput) (bool, []string) {
	v := ValidateInvocationBoundary(input)
	if v.ExternalInvocationBoundaryReady {
		return true, nil
	}
	reasons := append([]string{}, v.MissingItems...)
	reasons = append(reasons, v.MissingGates...)
	reasons = append(reasons, v.UnsafeClaims...)
	reasons = append(reasons, v.Conflicts...)
	return false, reasons
}

func analyze(in InvocationInput) ([]string, []string, []string, []string) {
	missing, missingGates, unsafe, conflicts := []string{}, []string{}, []string{}, []string{}
	if in.InvocationID == "" {
		missing = append(missing, "invocation_id")
	}
	if in.Executor == "" {
		missing = append(missing, "executor")
	} else if isMCPExecutor(in.Executor) {
		unsafe = append(unsafe, "executor cannot be mcp or mcp_readonly")
	}
	if in.ExecutorMode == "" {
		missing = append(missing, "executor_mode")
	} else if in.ExecutorMode != "external_only" {
		unsafe = append(unsafe, "executor_mode must be external_only")
	}
	for name, value := range map[string]string{"project": in.Project, "branch": in.Branch, "commit_sha": in.CommitSHA, "target": in.Target, "environment": in.Environment} {
		if value == "" {
			missing = append(missing, name)
		}
	}
	if in.InvocationPayload == nil || !in.InvocationPayload.Present {
		missing = append(missing, "invocation_payload")
	} else {
		if !in.InvocationPayload.ExternalOnly {
			unsafe = append(unsafe, "invocation_payload.external_only must be true")
		}
		if in.InvocationPayload.Valid == false && in.InvocationPayload.PayloadID == "" { /* validity can be implicit by fields */
		}
	}
	checkSummary := func(name string, s *InvocationSummary, extra func(*InvocationSummary) bool) {
		if s == nil || !s.Present || !s.Valid || !extra(s) {
			missing = append(missing, name)
		}
	}
	checkSummary("handoff_package_valid", in.HandoffPackage, func(s *InvocationSummary) bool { return s.ExternalExecutorHandoffReady })
	checkSummary("final_preflight_valid", in.FinalPreflight, func(s *InvocationSummary) bool { return s.ExternalExecutionPreflightReady })
	checkSummary("authorization_manifest_valid", in.AuthorizationManifest, func(s *InvocationSummary) bool { return true })
	checkSummary("safety_envelope_valid", in.SafetyEnvelope, func(s *InvocationSummary) bool { return true })
	if in.Authority == nil || !in.Authority.Present || !in.Authority.Valid {
		missing = append(missing, "authority_valid")
	}
	passGold, passSecure := false, false
	if in.Authority != nil {
		passGold = in.Authority.PassGoldReal
		passSecure = in.Authority.PassSecureReal
	}
	for _, g := range in.Gates {
		n := strings.ToUpper(g.Gate)
		if g.DryRun {
			unsafe = appendUnique(unsafe, "gate dry-run used as real")
		}
		if g.Synthesized {
			unsafe = appendUnique(unsafe, "gate synthesized used as real")
		}
		if g.Advisory {
			unsafe = appendUnique(unsafe, "gate advisory used as real")
		}
		if g.RealEvidence && !g.DryRun && !g.Synthesized && g.RecognizedByAuthority {
			if n == "PASS_GOLD" {
				passGold = true
			}
			if n == "PASS_SECURE" {
				passSecure = true
			}
		}
	}
	if !passGold {
		missingGates = append(missingGates, "PASS_GOLD_REAL")
	}
	if !passSecure {
		missingGates = append(missingGates, "PASS_SECURE_REAL")
	}
	requiredArtifacts := false
	for _, a := range in.Artifacts {
		if a.Required {
			requiredArtifacts = true
			if !a.Present || !a.Trusted {
				missing = appendUnique(missing, "required_artifacts")
			}
		}
	}
	if !requiredArtifacts {
		missing = appendUnique(missing, "required_artifacts")
	}
	if in.Authorization == nil || !in.Authorization.Present || in.Authorization.TokenPlaceholder == "" {
		missing = append(missing, "authorization_token_placeholder")
	}
	if in.Authorization != nil && (in.Authorization.TokenPresent || in.Authorization.TokenPlaintextPresent) {
		unsafe = append(unsafe, "real or plaintext authorization token cannot be present")
	}
	if in.Signature == nil || !in.Signature.Present || in.Signature.SignaturePlaceholder == "" {
		missing = append(missing, "signature_placeholder")
	}
	if in.Signature != nil && in.Signature.SignaturePlaintextSecretPresent {
		unsafe = append(unsafe, "plaintext signature secret cannot be present")
	}
	if in.Idempotency == nil || !in.Idempotency.Present || in.Idempotency.Key == "" || !in.Idempotency.ReplayProtection {
		missing = append(missing, "idempotency_key")
	}
	if in.Timeout == nil || !in.Timeout.Present || in.Timeout.MaxSeconds <= 0 || !in.Timeout.GracefulAbort || !in.Timeout.HardAbort {
		missing = append(missing, "timeout")
	}
	if in.KillSwitch == nil || !in.KillSwitch.Present || !in.KillSwitch.Enabled || in.KillSwitch.Trigger == "" {
		missing = append(missing, "kill_switch")
	}
	if in.Rollback == nil || !in.Rollback.Present || !in.Rollback.Mandatory || in.Rollback.Strategy == "" || !in.Rollback.SnapshotRequired || !in.Rollback.ValidationRequired {
		missing = append(missing, "rollback")
	}
	if in.Audit == nil || !in.Audit.Present || in.Audit.AuditID == "" || !in.Audit.RecordsPayload || !in.Audit.RecordsAuthorization || !in.Audit.RecordsSignaturePlaceholder || !in.Audit.RecordsIdempotency || !in.Audit.RecordsDecision || !in.Audit.ImmutableTargetDeclared {
		missing = append(missing, "audit")
	}
	if in.Boundary == nil || !in.Boundary.Present {
		missing = append(missing, "mcp_hard_deny_boundary")
	} else {
		if !in.Boundary.ExternalOnly {
			missing = appendUnique(missing, "external_only")
		}
		if !in.Boundary.MCPHardDeny {
			unsafe = append(unsafe, "boundary.mcp_hard_deny cannot be false")
		}
		if !in.Boundary.NoExecutorCallInsideMCP {
			unsafe = append(unsafe, "boundary.no_executor_call_inside_mcp cannot be false")
		}
		if !in.Boundary.NoNetworkCall {
			unsafe = append(unsafe, "boundary.no_network_call cannot be false")
		}
		if !in.Boundary.NoCommandExecution {
			unsafe = append(unsafe, "boundary.no_command_execution cannot be false")
		}
		if !in.Boundary.NoFileWrite {
			unsafe = append(unsafe, "boundary.no_file_write cannot be false")
		}
	}
	if in.MCPExecutionAllowed {
		unsafe = append(unsafe, "mcp_execution_allowed cannot be true")
	}
	if in.ExecutorCallAllowedInsideMCP {
		unsafe = append(unsafe, "executor_call_allowed_inside_mcp cannot be true")
	}
	if in.NetworkCallAllowed {
		unsafe = append(unsafe, "network_call_allowed cannot be true")
	}
	if in.CommandExecutionAllowed {
		unsafe = append(unsafe, "command_execution_allowed cannot be true")
	}
	if in.FileWriteAllowed {
		unsafe = append(unsafe, "file_write_allowed cannot be true")
	}
	if in.PromotionAllowed {
		unsafe = append(unsafe, "promotion_allowed cannot be true inside MCP")
	}
	if in.DeployAllowed {
		unsafe = append(unsafe, "deploy_allowed cannot be true inside MCP")
	}
	if in.StatusPublishAllowed {
		unsafe = append(unsafe, "status_publish_allowed cannot be true inside MCP")
	}
	if in.MutationAllowed {
		unsafe = append(unsafe, "mutation_allowed cannot be true inside MCP")
	}
	if in.MemoryWriteAllowed {
		unsafe = append(unsafe, "memory_write_allowed cannot be true inside MCP")
	}
	if in.AttemptExternalCall {
		unsafe = append(unsafe, "attempt_external_call cannot be true")
	}
	if in.AttemptRealExecutorCall {
		unsafe = append(unsafe, "attempt_real_executor_call cannot be true")
	}
	if in.AttemptRealRollback {
		unsafe = append(unsafe, "attempt_real_rollback cannot be true")
	}
	if in.AttemptRealLock {
		unsafe = append(unsafe, "attempt_real_lock cannot be true")
	}
	if in.CommandExecution {
		unsafe = append(unsafe, "command_execution cannot be true")
	}
	if in.NetworkCall {
		unsafe = append(unsafe, "network_call cannot be true")
	}
	if in.FileWrite {
		unsafe = append(unsafe, "file_write cannot be true")
	}
	if in.PassGold {
		conflicts = append(conflicts, "boundary cannot declare pass_gold=true")
	}
	if in.PassSecure {
		conflicts = append(conflicts, "boundary cannot declare pass_secure=true")
	}
	if in.ExecutionAuthorizedInsideMCP {
		conflicts = append(conflicts, "boundary cannot declare execution_authorized_inside_mcp=true")
	}
	return dedupe(missing), dedupe(missingGates), dedupe(unsafe), dedupe(conflicts)
}

func hasExecutionAttempt(in InvocationInput) bool {
	return in.AttemptExternalCall || in.AttemptRealExecutorCall || in.AttemptRealRollback || in.AttemptRealLock || in.CommandExecution || in.NetworkCall || in.FileWrite || in.ExecutorCallAllowedInsideMCP || in.NetworkCallAllowed || in.CommandExecutionAllowed || in.FileWriteAllowed || in.PromotionAllowed || in.DeployAllowed || in.StatusPublishAllowed || in.MutationAllowed || in.MemoryWriteAllowed
}
func isMCPExecutor(e string) bool {
	s := strings.ToLower(strings.TrimSpace(e))
	return s == "mcp" || s == "mcp_readonly"
}
func clone(in []string) []string { out := make([]string, len(in)); copy(out, in); return out }
func appendUnique(in []string, v string) []string {
	for _, x := range in {
		if x == v {
			return in
		}
	}
	return append(in, v)
}
func dedupe(in []string) []string {
	out := []string{}
	for _, v := range in {
		out = appendUnique(out, v)
	}
	return out
}
func recommendations(missing, unsafe, conflicts []string) []string {
	out := []string{}
	if len(missing) > 0 {
		out = append(out, "provide all required invocation boundary items before any external advisory handoff")
	}
	if len(unsafe) > 0 {
		out = append(out, "remove unsafe MCP execution, mutation, network, command, file, token, or signature claims")
	}
	if len(conflicts) > 0 {
		out = append(out, "remove conflicting claims that convert advisory boundary into PASS or execution authority")
	}
	if len(out) == 0 {
		out = append(out, "boundary is advisory-ready for a future external executor outside MCP only")
	}
	return out
}
