// Package executorpreflight implements the V9.5 External Executor Final Preflight.
//
// The final preflight is intentionally read-only and dry-run. It consolidates
// Gate Authority, Promotion Contract, Safety Envelope, Rehearsal Recorder, and
// Authorization Manifest inputs for advisory evaluation of a future external
// executor. It never executes, calls an executor, promotes, deploys, publishes
// status, writes files or memory, calls networks/APIs, acquires real locks, or
// performs rollback.
package executorpreflight

import "strings"

const Version = "V9.5"

const (
	StatusReadyDryRun            = "preflight_ready_dry_run"
	StatusIncomplete             = "incomplete"
	StatusMissingRealGates       = "missing_real_gates"
	StatusBlocked                = "blocked"
	StatusUnsafeExecutionAttempt = "unsafe_execution_attempt"
)

var requiredItems = []string{
	"preflight_id",
	"executor",
	"project",
	"branch",
	"commit_sha",
	"target",
	"environment",
	"authority_present",
	"PASS_GOLD_REAL",
	"PASS_SECURE_REAL",
	"promotion_contract_valid",
	"safety_envelope_valid",
	"rehearsal_valid",
	"authorization_manifest_valid",
	"required_artifacts",
	"no_unsafe_claims",
	"no_mcp_execution_attempt",
}

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}
var advisorySources = map[string]bool{
	"mcp": true, "mcp_readonly": true, "dashboard": true, "readiness": true,
	"evidenceledger": true, "contractregistry": true, "policymatrix": true,
	"codeburn": true, "impeccable": true, "dryrun": true, "graphmemory": true,
	"unknown": true, "advisory": true,
}

type PreflightInput struct {
	Root                            string                          `json:"root,omitempty"`
	MissionInput                    string                          `json:"mission_input,omitempty"`
	Operation                       string                          `json:"operation,omitempty"`
	Preflight                       *PreflightInput                 `json:"preflight,omitempty"`
	PreflightID                     string                          `json:"preflight_id,omitempty"`
	Executor                        string                          `json:"executor,omitempty"`
	Project                         string                          `json:"project,omitempty"`
	Branch                          string                          `json:"branch,omitempty"`
	CommitSHA                       string                          `json:"commit_sha,omitempty"`
	Target                          string                          `json:"target,omitempty"`
	Environment                     string                          `json:"environment,omitempty"`
	Authority                       *AuthorityPreflight             `json:"authority,omitempty"`
	PromotionContract               *PromotionContractPreflight     `json:"promotion_contract,omitempty"`
	SafetyEnvelope                  *SafetyEnvelopePreflight        `json:"safety_envelope,omitempty"`
	Rehearsal                       *RehearsalPreflight             `json:"rehearsal,omitempty"`
	AuthorizationManifest           *AuthorizationManifestPreflight `json:"authorization_manifest,omitempty"`
	Gates                           []PreflightGate                 `json:"gates,omitempty"`
	Artifacts                       []PreflightArtifact             `json:"artifacts,omitempty"`
	Strict                          bool                            `json:"strict,omitempty"`
	PromotionAllowed                bool                            `json:"promotion_allowed,omitempty"`
	DeployAllowed                   bool                            `json:"deploy_allowed,omitempty"`
	StatusPublishAllowed            bool                            `json:"status_publish_allowed,omitempty"`
	MutationAllowed                 bool                            `json:"mutation_allowed,omitempty"`
	MemoryWriteAllowed              bool                            `json:"memory_write_allowed,omitempty"`
	MCPExecutionAllowed             bool                            `json:"mcp_execution_allowed,omitempty"`
	ExecutorCallAllowedInsideMCP    bool                            `json:"executor_call_allowed_inside_mcp,omitempty"`
	AttemptExternalCall             bool                            `json:"attempt_external_call,omitempty"`
	AttemptRealRollback             bool                            `json:"attempt_real_rollback,omitempty"`
	AttemptRealLock                 bool                            `json:"attempt_real_lock,omitempty"`
	CommandExecution                bool                            `json:"command_execution,omitempty"`
	NetworkCall                     bool                            `json:"network_call,omitempty"`
	FileWrite                       bool                            `json:"file_write,omitempty"`
	PassGold                        bool                            `json:"pass_gold,omitempty"`
	PassSecure                      bool                            `json:"pass_secure,omitempty"`
	ExecutionAuthorizedInsideMCP    bool                            `json:"execution_authorized_inside_mcp,omitempty"`
	AuthorizationAsPassGold         bool                            `json:"authorization_as_pass_gold,omitempty"`
	AuthorizationAsPassSecure       bool                            `json:"authorization_as_pass_secure,omitempty"`
	RehearsalAsPassGold             bool                            `json:"rehearsal_as_pass_gold,omitempty"`
	RehearsalAsPassSecure           bool                            `json:"rehearsal_as_pass_secure,omitempty"`
	SafetyAsPassGold                bool                            `json:"safety_as_pass_gold,omitempty"`
	SafetyAsPassSecure              bool                            `json:"safety_as_pass_secure,omitempty"`
	ExternalExecutionPreflightReady bool                            `json:"external_execution_preflight_ready,omitempty"`
	UnsafeClaims                    []string                        `json:"unsafe_claims,omitempty"`
	Conflicts                       []string                        `json:"conflicts,omitempty"`
	Extra                           map[string]interface{}          `json:"extra,omitempty"`
}

type AuthorityPreflight struct {
	Present                bool   `json:"present,omitempty"`
	Version                string `json:"version,omitempty"`
	PassGoldReal           bool   `json:"pass_gold_real,omitempty"`
	PassSecureReal         bool   `json:"pass_secure_real,omitempty"`
	PassGoldSource         string `json:"pass_gold_source,omitempty"`
	PassSecureSource       string `json:"pass_secure_source,omitempty"`
	AllRealGatesRecognized bool   `json:"all_real_gates_recognized,omitempty"`
	AuthorityStatus        string `json:"authority_status,omitempty"`
	Valid                  bool   `json:"valid"`
}

type PromotionContractPreflight struct {
	Present                    bool   `json:"present,omitempty"`
	Version                    string `json:"version,omitempty"`
	ContractStatus             string `json:"contract_status,omitempty"`
	ExternallyEligibleDryRun   bool   `json:"externally_eligible_dry_run,omitempty"`
	WouldAllowExternalExecutor bool   `json:"would_allow_external_executor,omitempty"`
	Valid                      bool   `json:"valid"`
}

type SafetyEnvelopePreflight struct {
	Present                    bool   `json:"present,omitempty"`
	Version                    string `json:"version,omitempty"`
	EnvelopeStatus             string `json:"envelope_status,omitempty"`
	SafetyReadyDryRun          bool   `json:"safety_ready_dry_run,omitempty"`
	WouldAllowExternalExecutor bool   `json:"would_allow_external_executor,omitempty"`
	RequiredControlsPresent    bool   `json:"required_controls_present,omitempty"`
	Valid                      bool   `json:"valid"`
}

type RehearsalPreflight struct {
	Present                    bool   `json:"present,omitempty"`
	Version                    string `json:"version,omitempty"`
	RehearsalStatus            string `json:"rehearsal_status,omitempty"`
	RehearsalReadyDryRun       bool   `json:"rehearsal_ready_dry_run,omitempty"`
	NoMutationProof            bool   `json:"no_mutation_proof,omitempty"`
	WouldAllowExternalExecutor bool   `json:"would_allow_external_executor,omitempty"`
	Valid                      bool   `json:"valid"`
}

type AuthorizationManifestPreflight struct {
	Present                        bool   `json:"present,omitempty"`
	Version                        string `json:"version,omitempty"`
	ManifestStatus                 string `json:"manifest_status,omitempty"`
	AuthorizationReadyDryRun       bool   `json:"authorization_ready_dry_run,omitempty"`
	WouldAuthorizeExternalExecutor bool   `json:"would_authorize_external_executor,omitempty"`
	ValidityWithinWindow           bool   `json:"validity_within_window,omitempty"`
	ExplicitAuthorization          bool   `json:"explicit_authorization,omitempty"`
	Valid                          bool   `json:"valid"`
}

type PreflightGate struct {
	Gate                  string `json:"gate,omitempty"`
	Status                string `json:"status,omitempty"`
	RealEvidence          bool   `json:"real_evidence,omitempty"`
	DryRun                bool   `json:"dry_run,omitempty"`
	Synthesized           bool   `json:"synthesized,omitempty"`
	Advisory              bool   `json:"advisory,omitempty"`
	RecognizedByAuthority bool   `json:"recognized_by_authority,omitempty"`
	Source                string `json:"source,omitempty"`
	ArtifactID            string `json:"artifact_id,omitempty"`
	Valid                 bool   `json:"valid"`
}

type PreflightArtifact struct {
	ID       string `json:"id,omitempty"`
	Type     string `json:"type,omitempty"`
	Required bool   `json:"required,omitempty"`
	Present  bool   `json:"present,omitempty"`
	Trusted  bool   `json:"trusted,omitempty"`
	Source   string `json:"source,omitempty"`
	Valid    bool   `json:"valid"`
}

type FinalPreflightResult struct {
	Version                         string                          `json:"version"`
	DryRun                          bool                            `json:"dry_run"`
	ReadOnly                        bool                            `json:"read_only"`
	PreflightID                     string                          `json:"preflight_id,omitempty"`
	PreflightStatus                 string                          `json:"preflight_status"`
	ExternalExecutionPreflightReady bool                            `json:"external_execution_preflight_ready"`
	Executor                        string                          `json:"executor,omitempty"`
	Project                         string                          `json:"project,omitempty"`
	Branch                          string                          `json:"branch,omitempty"`
	CommitSHA                       string                          `json:"commit_sha,omitempty"`
	Target                          string                          `json:"target,omitempty"`
	Environment                     string                          `json:"environment,omitempty"`
	Authority                       *AuthorityPreflight             `json:"authority,omitempty"`
	PromotionContract               *PromotionContractPreflight     `json:"promotion_contract,omitempty"`
	SafetyEnvelope                  *SafetyEnvelopePreflight        `json:"safety_envelope,omitempty"`
	Rehearsal                       *RehearsalPreflight             `json:"rehearsal,omitempty"`
	AuthorizationManifest           *AuthorizationManifestPreflight `json:"authorization_manifest,omitempty"`
	Gates                           []PreflightGate                 `json:"gates,omitempty"`
	Artifacts                       []PreflightArtifact             `json:"artifacts,omitempty"`
	MissingItems                    []string                        `json:"missing_items"`
	MissingGates                    []string                        `json:"missing_gates"`
	UnsafeClaims                    []string                        `json:"unsafe_claims"`
	Conflicts                       []string                        `json:"conflicts"`
	RequiredItems                   []string                        `json:"required_items"`
	MCPExecutionAllowed             bool                            `json:"mcp_execution_allowed"`
	PromotionAllowed                bool                            `json:"promotion_allowed"`
	DeployAllowed                   bool                            `json:"deploy_allowed"`
	StatusPublishAllowed            bool                            `json:"status_publish_allowed"`
	MutationAllowed                 bool                            `json:"mutation_allowed"`
	MemoryWriteAllowed              bool                            `json:"memory_write_allowed"`
	ExecutorCallAllowedInsideMCP    bool                            `json:"executor_call_allowed_inside_mcp"`
	UsableForPassGold               bool                            `json:"usable_for_pass_gold"`
	UsableForPassSecure             bool                            `json:"usable_for_pass_secure"`
	Recommendations                 []string                        `json:"recommendations"`
}

type PreflightValidation struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	Valid                           bool     `json:"valid"`
	Blocked                         bool     `json:"blocked"`
	PreflightStatus                 string   `json:"preflight_status"`
	ExternalExecutionPreflightReady bool     `json:"external_execution_preflight_ready"`
	MissingItems                    []string `json:"missing_items"`
	MissingGates                    []string `json:"missing_gates"`
	UnsafeClaims                    []string `json:"unsafe_claims"`
	Conflicts                       []string `json:"conflicts"`
	RequiredItems                   []string `json:"required_items"`
	MCPExecutionAllowed             bool     `json:"mcp_execution_allowed"`
	PromotionAllowed                bool     `json:"promotion_allowed"`
	DeployAllowed                   bool     `json:"deploy_allowed"`
	StatusPublishAllowed            bool     `json:"status_publish_allowed"`
	MutationAllowed                 bool     `json:"mutation_allowed"`
	MemoryWriteAllowed              bool     `json:"memory_write_allowed"`
	ExecutorCallAllowedInsideMCP    bool     `json:"executor_call_allowed_inside_mcp"`
	UsableForPassGold               bool     `json:"usable_for_pass_gold"`
	UsableForPassSecure             bool     `json:"usable_for_pass_secure"`
	Recommendations                 []string `json:"recommendations"`
}

type PreflightAudit struct {
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
	MCPExecutorCallAttemptFound bool     `json:"mcp_executor_call_attempt_found"`
	DryRunGateClaimFound        bool     `json:"dry_run_gate_claim_found"`
	SynthesizedGateClaimFound   bool     `json:"synthesized_gate_claim_found"`
	Recommendations             []string `json:"recommendations"`
}

type PreflightBoundary struct {
	Version                         string   `json:"version"`
	DryRun                          bool     `json:"dry_run"`
	ReadOnly                        bool     `json:"read_only"`
	MCPScope                        []string `json:"mcp_scope"`
	ExternalExecutorScope           []string `json:"external_executor_scope"`
	ForbiddenInsideMCP              []string `json:"forbidden_inside_mcp"`
	RequiredBeforeExternalExecution []string `json:"required_before_external_execution"`
	AllowedOnlyOutsideMCP           []string `json:"allowed_only_outside_mcp"`
	RequiredPreflightItems          []string `json:"required_preflight_items"`
}

type PreflightExplain struct {
	Version                    string   `json:"version"`
	DryRun                     bool     `json:"dry_run"`
	ReadOnly                   bool     `json:"read_only"`
	Summary                    string   `json:"summary"`
	PreflightModel             []string `json:"preflight_model"`
	RequiredItems              []string `json:"required_items"`
	WhyMCPCannotExecute        []string `json:"why_mcp_cannot_execute"`
	WhyPreflightIsNotPassGold  []string `json:"why_preflight_is_not_pass_gold"`
	WhyPreflightIsNotExecution []string `json:"why_preflight_is_not_execution"`
	BlockedActions             []string `json:"blocked_actions"`
	SafestNextSteps            []string `json:"safest_next_steps"`
	RequiredGates              []string `json:"required_gates"`
}

func NormalizePreflight(input PreflightInput) PreflightInput {
	if input.Preflight != nil {
		nested := *input.Preflight
		if input.Root != "" {
			nested.Root = input.Root
		}
		return NormalizePreflight(nested)
	}
	return input
}

func BuildFinalPreflight(input PreflightInput) FinalPreflightResult {
	in := NormalizePreflight(input)
	validation := ValidatePreflight(in)
	ready := validation.Valid
	return FinalPreflightResult{
		Version: Version, DryRun: true, ReadOnly: true,
		PreflightID: in.PreflightID, PreflightStatus: validation.PreflightStatus,
		ExternalExecutionPreflightReady: ready,
		Executor:                        in.Executor, Project: in.Project, Branch: in.Branch, CommitSHA: in.CommitSHA, Target: in.Target, Environment: in.Environment,
		Authority: normalizedAuthority(in.Authority), PromotionContract: normalizedPromotionContract(in.PromotionContract), SafetyEnvelope: normalizedSafetyEnvelope(in.SafetyEnvelope), Rehearsal: normalizedRehearsal(in.Rehearsal), AuthorizationManifest: normalizedAuthorizationManifest(in.AuthorizationManifest),
		Gates: normalizeGates(in.Gates), Artifacts: normalizeArtifacts(in.Artifacts),
		MissingItems: validation.MissingItems, MissingGates: validation.MissingGates, UnsafeClaims: validation.UnsafeClaims, Conflicts: validation.Conflicts,
		RequiredItems:       clone(requiredItems),
		MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, ExecutorCallAllowedInsideMCP: false, UsableForPassGold: false, UsableForPassSecure: false,
		Recommendations: validation.Recommendations,
	}
}

func ValidatePreflight(input PreflightInput) PreflightValidation {
	in := NormalizePreflight(input)
	missing, missingGates, unsafe, conflicts := analyze(in)
	status := deriveStatus(missing, missingGates, unsafe)
	valid := len(missing) == 0 && len(missingGates) == 0 && len(unsafe) == 0 && len(conflicts) == 0 && !isMCPExecutor(in.Executor)
	return PreflightValidation{
		Version: Version, DryRun: true, ReadOnly: true,
		Valid: valid, Blocked: !valid, PreflightStatus: status, ExternalExecutionPreflightReady: valid,
		MissingItems: missing, MissingGates: missingGates, UnsafeClaims: unsafe, Conflicts: conflicts, RequiredItems: clone(requiredItems),
		MCPExecutionAllowed: false, PromotionAllowed: false, DeployAllowed: false, StatusPublishAllowed: false, MutationAllowed: false, MemoryWriteAllowed: false, ExecutorCallAllowedInsideMCP: false, UsableForPassGold: false, UsableForPassSecure: false,
		Recommendations: recommendations(status, missing, unsafe, conflicts),
	}
}

func EvaluatePreflightEligibility(input PreflightInput) (bool, []string) {
	v := ValidatePreflight(input)
	if v.Valid {
		return true, []string{"final preflight is complete for advisory use by a future external executor outside MCP"}
	}
	reasons := append([]string{}, v.MissingItems...)
	reasons = append(reasons, v.MissingGates...)
	reasons = append(reasons, v.UnsafeClaims...)
	reasons = append(reasons, v.Conflicts...)
	if len(reasons) == 0 {
		reasons = append(reasons, "preflight is not eligible")
	}
	return false, reasons
}

func BuildPreflightBoundary() PreflightBoundary {
	return PreflightBoundary{Version: Version, DryRun: true, ReadOnly: true,
		MCPScope:                        []string{"read", "validate", "audit", "explain", "simulate_final_preflight"},
		ExternalExecutorScope:           []string{"may consume advisory preflight outside MCP only", "must independently enforce PASS_GOLD_REAL and PASS_SECURE_REAL", "must use valid Authority/Contract/Safety/Rehearsal/Authz chain"},
		ForbiddenInsideMCP:              []string{"execute", "call_external_executor", "authorize_execution_inside_mcp", "promote", "deploy", "publish_status", "push", "PR", "mutate", "write_memory", "acquire_real_lock", "perform_rollback", "write_preflight_file"},
		RequiredBeforeExternalExecution: []string{"Gate Authority V9.0 valid", "Promotion Contract V9.1 valid", "Safety Envelope V9.2 valid", "Rehearsal Recorder V9.3 valid", "Authorization Manifest V9.4 valid", "PASS_GOLD_REAL", "PASS_SECURE_REAL", "trusted required artifacts", "no unsafe claims", "no MCP execution attempt"},
		AllowedOnlyOutsideMCP:           []string{"external executor invocation", "real promotion", "real deployment", "status publication", "real rollback", "real lock acquisition"},
		RequiredPreflightItems:          clone(requiredItems),
	}
}

func AuditPreflight(input PreflightInput) PreflightAudit {
	in := NormalizePreflight(input)
	missing, _, unsafe, conflicts := analyze(in)
	execAttempt := hasExecutionAttempt(in)
	mutationAttempt := hasMutationAttempt(in)
	mcpCall := in.ExecutorCallAllowedInsideMCP || in.AttemptExternalCall || isMCPExecutor(in.Executor)
	dryRunGate, synthGate := false, false
	for _, g := range in.Gates {
		if g.DryRun {
			dryRunGate = true
		}
		if g.Synthesized {
			synthGate = true
		}
	}
	return PreflightAudit{Version: Version, DryRun: true, ReadOnly: true,
		ConflictsFound: len(conflicts) > 0, Conflicts: conflicts,
		UnsafeClaimsFound: len(unsafe) > 0, UnsafeClaims: unsafe,
		MissingItemsFound: len(missing) > 0, MissingItems: missing,
		ExecutionAttemptFound: execAttempt, MutationAttemptFound: mutationAttempt, MCPExecutorCallAttemptFound: mcpCall,
		DryRunGateClaimFound: dryRunGate, SynthesizedGateClaimFound: synthGate,
		Recommendations: recommendations(deriveStatus(missing, nil, unsafe), missing, unsafe, conflicts),
	}
}

func ExplainPreflight(input PreflightInput) PreflightExplain {
	return PreflightExplain{Version: Version, DryRun: true, ReadOnly: true,
		Summary:                    "V9.5 External Executor Final Preflight consolidates V9.0-V9.4 as read-only dry-run evidence for a future external executor; it does not execute or authorize MCP mutation.",
		PreflightModel:             []string{"collect declared Authority/Contract/Safety/Rehearsal/Authz inputs", "validate real PASS_GOLD and PASS_SECURE recognition", "detect unsafe claims and MCP execution attempts", "return advisory external_execution_preflight_ready only"},
		RequiredItems:              clone(requiredItems),
		WhyMCPCannotExecute:        []string{"MCP is a read-only control plane", "V9.5 forbids executor calls, promotion, deploy, status publishing, file writes, memory writes, locks, rollback, and command/network execution inside MCP"},
		WhyPreflightIsNotPassGold:  []string{"preflight validates declared PASS_GOLD_REAL evidence but does not run PASS GOLD", "dry-run or synthesized evidence cannot become PASS GOLD real", "usable_for_pass_gold is always false"},
		WhyPreflightIsNotExecution: []string{"preflight is advisory simulation only", "external_execution_preflight_ready never calls an executor", "promotion_allowed and deploy_allowed remain false inside MCP"},
		BlockedActions:             BuildPreflightBoundary().ForbiddenInsideMCP,
		SafestNextSteps:            []string{"obtain real PASS_GOLD_REAL and PASS_SECURE_REAL", "provide valid V9.0-V9.4 chain", "keep execution outside MCP", "preserve read-only dry-run boundaries"},
		RequiredGates:              clone(requiredGates),
	}
}

func analyze(in PreflightInput) ([]string, []string, []string, []string) {
	missing, missingGates, unsafe, conflicts := []string{}, []string{}, []string{}, []string{}
	if strings.TrimSpace(in.PreflightID) == "" {
		missing = append(missing, "preflight_id")
	}
	if strings.TrimSpace(in.Executor) == "" {
		missing = append(missing, "executor")
	}
	if isMCPExecutor(in.Executor) {
		unsafe = append(unsafe, "executor cannot be mcp or mcp_readonly")
	}
	if strings.TrimSpace(in.Project) == "" {
		missing = append(missing, "project")
	}
	if strings.TrimSpace(in.Branch) == "" {
		missing = append(missing, "branch")
	}
	if strings.TrimSpace(in.CommitSHA) == "" {
		missing = append(missing, "commit_sha")
	}
	if strings.TrimSpace(in.Target) == "" {
		missing = append(missing, "target")
	}
	if strings.TrimSpace(in.Environment) == "" {
		missing = append(missing, "environment")
	}
	if in.Authority == nil || !in.Authority.Present {
		missing = append(missing, "authority_present")
	} else {
		if !authorityValid(in.Authority) {
			missing = append(missing, "authority_valid")
		}
		if !in.Authority.PassGoldReal || !in.Authority.AllRealGatesRecognized {
			missingGates = append(missingGates, "PASS_GOLD_REAL")
		}
		if !in.Authority.PassSecureReal || !in.Authority.AllRealGatesRecognized {
			missingGates = append(missingGates, "PASS_SECURE_REAL")
		}
	}
	if in.PromotionContract == nil || !promotionContractValid(in.PromotionContract) {
		missing = append(missing, "promotion_contract_valid")
	}
	if in.SafetyEnvelope == nil || !safetyEnvelopeValid(in.SafetyEnvelope) {
		missing = append(missing, "safety_envelope_valid")
	}
	if in.Rehearsal == nil || !rehearsalValid(in.Rehearsal) {
		missing = append(missing, "rehearsal_valid")
	}
	if in.AuthorizationManifest == nil || !authorizationManifestValid(in.AuthorizationManifest) {
		missing = append(missing, "authorization_manifest_valid")
	}
	if !requiredArtifactsValid(in.Artifacts) {
		missing = append(missing, "required_artifacts")
	}
	gateGold, gateSecure := false, false
	for _, g := range in.Gates {
		name := strings.ToUpper(strings.TrimSpace(g.Gate))
		if g.DryRun {
			unsafe = append(unsafe, "dry-run gate cannot be used as real evidence: "+name)
		}
		if g.Synthesized {
			unsafe = append(unsafe, "synthesized gate cannot be used as real evidence: "+name)
		}
		if g.Advisory || advisorySources[strings.ToLower(strings.TrimSpace(g.Source))] {
			unsafe = append(unsafe, "advisory gate cannot be used as real evidence: "+name)
		}
		if g.RealEvidence && !g.DryRun && !g.Synthesized && !g.Advisory && g.RecognizedByAuthority && strings.EqualFold(g.Status, "pass") {
			if name == "PASS_GOLD" {
				gateGold = true
			}
			if name == "PASS_SECURE" {
				gateSecure = true
			}
		}
	}
	if len(in.Gates) > 0 {
		if !gateGold {
			missingGates = appendUnique(missingGates, "PASS_GOLD_REAL")
		}
		if !gateSecure {
			missingGates = appendUnique(missingGates, "PASS_SECURE_REAL")
		}
	}
	if hasExecutionAttempt(in) {
		unsafe = append(unsafe, "payload attempts execution inside MCP")
	}
	if hasMutationAttempt(in) {
		unsafe = append(unsafe, "payload attempts mutation inside MCP")
	}
	if in.ExecutorCallAllowedInsideMCP {
		unsafe = append(unsafe, "executor_call_allowed_inside_mcp cannot be true")
	}
	if in.AttemptExternalCall {
		unsafe = append(unsafe, "attempt_external_call cannot be true")
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
		unsafe = append(unsafe, "preflight cannot declare pass_gold=true")
	}
	if in.PassSecure {
		unsafe = append(unsafe, "preflight cannot declare pass_secure=true")
	}
	if in.ExecutionAuthorizedInsideMCP {
		unsafe = append(unsafe, "preflight cannot authorize execution inside MCP")
	}
	if in.AuthorizationAsPassGold || in.AuthorizationAsPassSecure || in.RehearsalAsPassGold || in.RehearsalAsPassSecure || in.SafetyAsPassGold || in.SafetyAsPassSecure {
		unsafe = append(unsafe, "authorization/rehearsal/safety cannot be used as PASS GOLD or PASS SECURE real")
	}
	unsafe = append(unsafe, in.UnsafeClaims...)
	conflicts = append(conflicts, in.Conflicts...)
	wouldReady := len(missing) == 0 && len(missingGates) == 0 && len(unsafe) == 0 && len(conflicts) == 0 && !isMCPExecutor(in.Executor)
	if in.ExternalExecutionPreflightReady && !wouldReady {
		conflicts = append(conflicts, "external_execution_preflight_ready=true while required items or real gates are missing")
	}
	return dedupe(missing), dedupe(missingGates), dedupe(unsafe), dedupe(conflicts)
}

func deriveStatus(missing, missingGates, unsafe []string) string {
	for _, u := range unsafe {
		if strings.Contains(u, "execution") || strings.Contains(u, "promot") || strings.Contains(u, "deploy") || strings.Contains(u, "rollback") || strings.Contains(u, "lock") || strings.Contains(u, "command") || strings.Contains(u, "network") || strings.Contains(u, "file_write") {
			return StatusUnsafeExecutionAttempt
		}
	}
	if len(unsafe) > 0 {
		return StatusBlocked
	}
	if len(missing) > 0 {
		return StatusIncomplete
	}
	if len(missingGates) > 0 {
		return StatusMissingRealGates
	}
	return StatusReadyDryRun
}

func hasExecutionAttempt(in PreflightInput) bool {
	return in.MCPExecutionAllowed || in.PromotionAllowed || in.DeployAllowed || in.StatusPublishAllowed || in.ExecutorCallAllowedInsideMCP || in.AttemptExternalCall || in.CommandExecution || in.NetworkCall || in.ExecutionAuthorizedInsideMCP
}
func hasMutationAttempt(in PreflightInput) bool {
	return in.MutationAllowed || in.MemoryWriteAllowed || in.FileWrite || in.PromotionAllowed || in.DeployAllowed || in.StatusPublishAllowed || in.AttemptRealRollback || in.AttemptRealLock
}
func isMCPExecutor(executor string) bool {
	e := strings.ToLower(strings.TrimSpace(executor))
	return e == "mcp" || e == "mcp_readonly"
}
func authorityValid(a *AuthorityPreflight) bool {
	return a != nil && a.Present && a.PassGoldReal && a.PassSecureReal && a.AllRealGatesRecognized
}
func promotionContractValid(p *PromotionContractPreflight) bool {
	return p != nil && p.Present && p.ExternallyEligibleDryRun && p.WouldAllowExternalExecutor
}
func safetyEnvelopeValid(s *SafetyEnvelopePreflight) bool {
	return s != nil && s.Present && s.SafetyReadyDryRun && s.WouldAllowExternalExecutor && s.RequiredControlsPresent
}
func rehearsalValid(r *RehearsalPreflight) bool {
	return r != nil && r.Present && r.RehearsalReadyDryRun && r.NoMutationProof && r.WouldAllowExternalExecutor
}
func authorizationManifestValid(a *AuthorizationManifestPreflight) bool {
	return a != nil && a.Present && a.AuthorizationReadyDryRun && a.WouldAuthorizeExternalExecutor && a.ValidityWithinWindow && a.ExplicitAuthorization
}
func requiredArtifactsValid(a []PreflightArtifact) bool {
	if len(a) == 0 {
		return false
	}
	required := false
	for _, x := range a {
		if x.Required {
			required = true
			if !x.Present || !x.Trusted {
				return false
			}
		}
	}
	return required
}

func normalizedAuthority(a *AuthorityPreflight) *AuthorityPreflight {
	if a == nil {
		return nil
	}
	v := *a
	v.Valid = authorityValid(a)
	return &v
}
func normalizedPromotionContract(p *PromotionContractPreflight) *PromotionContractPreflight {
	if p == nil {
		return nil
	}
	v := *p
	v.Valid = promotionContractValid(p)
	return &v
}
func normalizedSafetyEnvelope(s *SafetyEnvelopePreflight) *SafetyEnvelopePreflight {
	if s == nil {
		return nil
	}
	v := *s
	v.Valid = safetyEnvelopeValid(s)
	return &v
}
func normalizedRehearsal(r *RehearsalPreflight) *RehearsalPreflight {
	if r == nil {
		return nil
	}
	v := *r
	v.Valid = rehearsalValid(r)
	return &v
}
func normalizedAuthorizationManifest(a *AuthorizationManifestPreflight) *AuthorizationManifestPreflight {
	if a == nil {
		return nil
	}
	v := *a
	v.Valid = authorizationManifestValid(a)
	return &v
}
func normalizeGates(in []PreflightGate) []PreflightGate {
	out := append([]PreflightGate{}, in...)
	for i := range out {
		out[i].Valid = out[i].RealEvidence && !out[i].DryRun && !out[i].Synthesized && !out[i].Advisory && out[i].RecognizedByAuthority && strings.EqualFold(out[i].Status, "pass")
	}
	return out
}
func normalizeArtifacts(in []PreflightArtifact) []PreflightArtifact {
	out := append([]PreflightArtifact{}, in...)
	for i := range out {
		out[i].Valid = !out[i].Required || (out[i].Present && out[i].Trusted)
	}
	return out
}
func clone(in []string) []string { return append([]string{}, in...) }
func appendUnique(in []string, s string) []string {
	for _, v := range in {
		if v == s {
			return in
		}
	}
	return append(in, s)
}
func dedupe(in []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, v := range in {
		if !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}
func recommendations(status string, missing, unsafe, conflicts []string) []string {
	rec := []string{"keep V9.5 read-only and dry-run", "do not call external executor from MCP"}
	if status != StatusReadyDryRun {
		rec = append(rec, "provide valid Authority/Contract/Safety/Rehearsal/Authz chain and real PASS gates")
	}
	if len(unsafe) > 0 {
		rec = append(rec, "remove unsafe execution or mutation claims")
	}
	if len(conflicts) > 0 {
		rec = append(rec, "resolve conflicting readiness claims")
	}
	if len(missing) > 0 {
		rec = append(rec, "supply missing required preflight items")
	}
	return rec
}
