// Package policymatrix implements the V8.6 Agent Policy Matrix.
//
// The matrix is intentionally read-only and dry-run only. It maps agent/module
// permissions, validates proposed plans, and explains authorization decisions;
// it never executes commands, writes files, publishes status, opens PRs, deploys,
// calls external APIs, or changes memory.
package policymatrix

import (
	"fmt"
	"sort"
	"strings"
)

const Version = "V8.6"

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

var officialAgents = []string{
	"OpenClaw",
	"Scanner",
	"Hermes",
	"PatchEngine",
	"Aegis",
	"PASS_GOLD",
	"PASS_SECURE",
	"GraphMemory",
	"MCPReadOnly",
	"DryRun",
	"CodeBurn",
	"Impeccable",
	"Dashboard",
	"GitHubFlow",
	"Memory",
	"Rollback",
	"Deploy",
}

var mutatingTools = []string{
	"vision.apply_patch",
	"vision.write_file",
	"vision.commit",
	"vision.push",
	"vision.open_pr",
	"vision.publish_status",
	"vision.run_mission_real",
	"vision.rollback",
	"vision.deploy",
}

var sensitiveActions = []string{
	"patch",
	"apply_patch",
	"write",
	"write_file",
	"commit",
	"push",
	"open_pr",
	"publish_status",
	"run_mission_real",
	"rollback",
	"deploy",
	"execute",
	"command",
	"browser",
	"screenshot",
	"memory_write",
	"learn",
	"promote",
}

// PolicyInput is the input for an authorization decision.
type PolicyInput struct {
	Root             string   `json:"root,omitempty"`
	Agent            string   `json:"agent"`
	Action           string   `json:"action"`
	Tool             string   `json:"tool"`
	Operation        string   `json:"operation"`
	Files            []string `json:"files,omitempty"`
	Environment      string   `json:"environment,omitempty"`
	RequestedMode    string   `json:"requested_mode,omitempty"`
	PassGoldStatus   string   `json:"pass_gold_status,omitempty"`
	PassSecureStatus string   `json:"pass_secure_status,omitempty"`
}

// AgentPolicy describes the explicit permissions for an agent/module inside the
// read-only MCP governance layer.
type AgentPolicy struct {
	Agent                     string   `json:"agent"`
	Description               string   `json:"description"`
	ReadAllowed               bool     `json:"read_allowed"`
	SimulateAllowed           bool     `json:"simulate_allowed"`
	RecommendAllowed          bool     `json:"recommend_allowed"`
	ValidateAllowed           bool     `json:"validate_allowed"`
	ExecuteAllowed            bool     `json:"execute_allowed"`
	MutateAllowed             bool     `json:"mutate_allowed"`
	NetworkAllowed            bool     `json:"network_allowed"`
	DeployAllowed             bool     `json:"deploy_allowed"`
	MemoryWriteAllowed        bool     `json:"memory_write_allowed"`
	StatusPublishAllowed      bool     `json:"status_publish_allowed"`
	PRAllowed                 bool     `json:"pr_allowed"`
	AllowedTools              []string `json:"allowed_tools"`
	BlockedTools              []string `json:"blocked_tools"`
	AllowedActions            []string `json:"allowed_actions"`
	BlockedActions            []string `json:"blocked_actions"`
	RequiredGates             []string `json:"required_gates"`
	Responsibilities          []string `json:"responsibilities"`
	ForbiddenResponsibilities []string `json:"forbidden_responsibilities"`
	Recommendations           []string `json:"recommendations,omitempty"`
}

// PolicyDecision is the dry-run/read-only authorization result.
type PolicyDecision struct {
	Version         string      `json:"version"`
	DryRun          bool        `json:"dry_run"`
	ReadOnly        bool        `json:"read_only"`
	Agent           string      `json:"agent"`
	Action          string      `json:"action"`
	Tool            string      `json:"tool"`
	Operation       string      `json:"operation"`
	Allowed         bool        `json:"allowed"`
	Blocked         bool        `json:"blocked"`
	BlockedReasons  []string    `json:"blocked_reasons"`
	RequiredGates   []string    `json:"required_gates"`
	Policy          AgentPolicy `json:"policy"`
	Recommendations []string    `json:"recommendations"`
}

// PolicyMatrixSnapshot is a full read-only snapshot of the matrix.
type PolicyMatrixSnapshot struct {
	Version              string        `json:"version"`
	DryRun               bool          `json:"dry_run"`
	ReadOnly             bool          `json:"read_only"`
	Agents               []string      `json:"agents"`
	Policies             []AgentPolicy `json:"policies"`
	BlockedMutatingTools []string      `json:"blocked_mutating_tools"`
	RequiredGates        []string      `json:"required_gates"`
	MatrixStatus         string        `json:"matrix_status"`
	Recommendations      []string      `json:"recommendations"`
}

// PlanStep is one proposed execution-plan step.
type PlanStep struct {
	Agent     string   `json:"agent"`
	Action    string   `json:"action"`
	Tool      string   `json:"tool"`
	Operation string   `json:"operation"`
	Files     []string `json:"files,omitempty"`
}

// PlanValidationInput is the input for validating separation of responsibilities.
type PlanValidationInput struct {
	Steps []PlanStep `json:"steps"`
}

// PlanFinding records the decision for a plan step.
type PlanFinding struct {
	Step           int      `json:"step"`
	Agent          string   `json:"agent"`
	Action         string   `json:"action"`
	Tool           string   `json:"tool"`
	Operation      string   `json:"operation"`
	Allowed        bool     `json:"allowed"`
	Blocked        bool     `json:"blocked"`
	BlockedReasons []string `json:"blocked_reasons"`
}

// PlanValidationResult is the dry-run/read-only plan validation result.
type PlanValidationResult struct {
	Version         string        `json:"version"`
	DryRun          bool          `json:"dry_run"`
	ReadOnly        bool          `json:"read_only"`
	Valid           bool          `json:"valid"`
	Blocked         bool          `json:"blocked"`
	BlockedReasons  []string      `json:"blocked_reasons"`
	Findings        []PlanFinding `json:"findings"`
	RequiredGates   []string      `json:"required_gates"`
	Recommendations []string      `json:"recommendations"`
}

// ConflictReport describes static matrix conflicts.
type ConflictReport struct {
	Version         string   `json:"version"`
	DryRun          bool     `json:"dry_run"`
	ReadOnly        bool     `json:"read_only"`
	ConflictsFound  bool     `json:"conflicts_found"`
	Conflicts       []string `json:"conflicts"`
	Recommendations []string `json:"recommendations"`
}

// DecisionExplanation explains a dry-run policy decision.
type DecisionExplanation struct {
	Version         string   `json:"version"`
	DryRun          bool     `json:"dry_run"`
	ReadOnly        bool     `json:"read_only"`
	Summary         string   `json:"summary"`
	WhyBlocked      []string `json:"why_blocked"`
	AllowedScope    []string `json:"allowed_scope"`
	SafestNextSteps []string `json:"safest_next_steps"`
	RequiredGates   []string `json:"required_gates"`
}

// BuildMatrix returns the complete V8.6 matrix snapshot.
func BuildMatrix() PolicyMatrixSnapshot {
	policiesByAgent := buildPolicies()
	policies := make([]AgentPolicy, 0, len(officialAgents))
	for _, agent := range officialAgents {
		policies = append(policies, policiesByAgent[agent])
	}
	return PolicyMatrixSnapshot{
		Version:              Version,
		DryRun:               true,
		ReadOnly:             true,
		Agents:               append([]string(nil), officialAgents...),
		Policies:             policies,
		BlockedMutatingTools: append([]string(nil), mutatingTools...),
		RequiredGates:        gates(),
		MatrixStatus:         "safe_read_only",
		Recommendations: []string{
			"Use Policy Matrix only for read-only authorization decisions and dry-run plan validation.",
			"Require real PASS_GOLD and PASS_SECURE before any action outside MCP can promote, deploy, publish status, write memory, or mutate.",
		},
	}
}

// GetAgentPolicy returns the policy for an agent or a conservative unknown-agent policy.
func GetAgentPolicy(agent string) AgentPolicy {
	name := strings.TrimSpace(agent)
	if p, ok := buildPolicies()[name]; ok {
		return p
	}
	return AgentPolicy{
		Agent:                     name,
		Description:               "Unknown agent: read-only inspection only until explicitly registered in the policy matrix.",
		ReadAllowed:               true,
		SimulateAllowed:           false,
		RecommendAllowed:          false,
		ValidateAllowed:           false,
		ExecuteAllowed:            false,
		MutateAllowed:             false,
		NetworkAllowed:            false,
		DeployAllowed:             false,
		MemoryWriteAllowed:        false,
		StatusPublishAllowed:      false,
		PRAllowed:                 false,
		AllowedTools:              []string{"vision.project_summary", "vision.graph_query", "vision.graph_summary"},
		BlockedTools:              append([]string(nil), mutatingTools...),
		AllowedActions:            []string{"read", "scan"},
		BlockedActions:            append([]string(nil), sensitiveActions...),
		RequiredGates:             gates(),
		Responsibilities:          []string{"read-only inspection"},
		ForbiddenResponsibilities: []string{"mutation", "execution", "network", "deployment", "status publication", "PR creation", "memory write"},
		Recommendations:           []string{"Register agent before use and define explicit responsibilities in Agent Policy Matrix."},
	}
}

// Decide evaluates one proposed action in read-only/dry-run mode.
func Decide(input PolicyInput) PolicyDecision {
	agent := strings.TrimSpace(input.Agent)
	policy := GetAgentPolicy(agent)
	known := isOfficialAgent(agent)
	reasons := []string{}
	recommendations := []string{"Keep execution in dry-run/read-only mode.", "Require PASS_GOLD and PASS_SECURE for any real action outside MCP."}

	mode := normalize(input.RequestedMode)
	if mode != "" && mode != "dry_run" && mode != "read_only" {
		reasons = append(reasons, fmt.Sprintf("requested_mode %q is not allowed; Policy Matrix only permits dry_run/read_only", input.RequestedMode))
	}

	if isMutatingTool(input.Tool) {
		reasons = append(reasons, fmt.Sprintf("tool %q is a mutating tool and is blocked in the read-only MCP control plane", input.Tool))
	}
	if isSensitiveAction(input.Action) || isSensitiveAction(input.Operation) {
		reasons = append(reasons, fmt.Sprintf("action/operation %q/%q is sensitive and blocked inside MCP", input.Action, input.Operation))
	}
	if !known && !isReadOnlyIntent(input.Action, input.Operation) {
		reasons = append(reasons, "unknown agent may only perform read-only actions")
		recommendations = append(recommendations, "Register agent before use.")
	}
	if !actionAllowed(policy, input.Action, input.Operation) {
		reasons = append(reasons, fmt.Sprintf("agent %q is not authorized for action/operation %q/%q", policy.Agent, input.Action, input.Operation))
	}
	if violatesCapability(policy, input) {
		reasons = append(reasons, fmt.Sprintf("agent %q attempted a responsibility forbidden by policy", policy.Agent))
	}
	if requiresRealGates(input) && !hasRealPasses(input) {
		reasons = append(reasons, "PASS_GOLD and PASS_SECURE are required and cannot be unknown or synthesized for promotion/deploy/memory/status actions")
	}

	reasons = unique(reasons)
	allowed := len(reasons) == 0
	return PolicyDecision{
		Version:         Version,
		DryRun:          true,
		ReadOnly:        true,
		Agent:           agent,
		Action:          input.Action,
		Tool:            input.Tool,
		Operation:       input.Operation,
		Allowed:         allowed,
		Blocked:         !allowed,
		BlockedReasons:  reasons,
		RequiredGates:   gates(),
		Policy:          policy,
		Recommendations: unique(recommendations),
	}
}

// ValidatePlan checks every plan step against the matrix.
func ValidatePlan(input PlanValidationInput) PlanValidationResult {
	findings := []PlanFinding{}
	reasons := []string{}
	for i, step := range input.Steps {
		decision := Decide(PolicyInput{Agent: step.Agent, Action: step.Action, Tool: step.Tool, Operation: step.Operation, Files: step.Files, RequestedMode: "dry_run"})
		finding := PlanFinding{Step: i + 1, Agent: step.Agent, Action: step.Action, Tool: step.Tool, Operation: step.Operation, Allowed: decision.Allowed, Blocked: decision.Blocked, BlockedReasons: decision.BlockedReasons}
		findings = append(findings, finding)
		if decision.Blocked {
			reasons = append(reasons, fmt.Sprintf("step %d (%s %s via %s) blocked: %s", i+1, step.Agent, step.Action, step.Tool, strings.Join(decision.BlockedReasons, "; ")))
		}
	}
	reasons = unique(reasons)
	blocked := len(reasons) > 0
	return PlanValidationResult{
		Version:        Version,
		DryRun:         true,
		ReadOnly:       true,
		Valid:          !blocked,
		Blocked:        blocked,
		BlockedReasons: reasons,
		Findings:       findings,
		RequiredGates:  gates(),
		Recommendations: []string{
			"Keep the plan as dry-run/read-only inside MCP.",
			"Run real PASS_GOLD and PASS_SECURE gates before any external mutation outside MCP.",
			"Separate scan, recommendation, validation, patch proposal, and deployment responsibilities across authorized agents.",
		},
	}
}

// DetectConflicts checks static safety invariants in the built-in matrix.
func DetectConflicts() ConflictReport {
	matrix := BuildMatrix()
	conflicts := []string{}
	mutators := []string{}
	readOnlyGuards := map[string]bool{"MCPReadOnly": true, "GraphMemory": true, "DryRun": true, "CodeBurn": true, "Impeccable": true, "Dashboard": true}
	for _, p := range matrix.Policies {
		if p.MutateAllowed {
			mutators = append(mutators, p.Agent)
		}
		if p.DeployAllowed {
			conflicts = append(conflicts, fmt.Sprintf("%s has deploy_allowed=true inside MCP", p.Agent))
		}
		if readOnlyGuards[p.Agent] && p.ExecuteAllowed {
			conflicts = append(conflicts, fmt.Sprintf("read-only guard %s has execute_allowed=true", p.Agent))
		}
		if p.Agent == "Memory" && p.MemoryWriteAllowed {
			conflicts = append(conflicts, "Memory has memory_write_allowed=true without a real PASS_GOLD gate")
		}
		if p.Agent == "GitHubFlow" && (p.NetworkAllowed || p.PRAllowed) {
			conflicts = append(conflicts, "GitHubFlow has network/pr permissions inside MCP")
		}
		if (p.Agent == "PASS_GOLD" || p.Agent == "PASS_SECURE") && contains(p.AllowedActions, "synthesize") {
			conflicts = append(conflicts, fmt.Sprintf("%s can synthesize gate status", p.Agent))
		}
	}
	if len(mutators) > 1 {
		conflicts = append(conflicts, fmt.Sprintf("multiple agents have mutate_allowed=true inside MCP: %s", strings.Join(mutators, ", ")))
	}
	conflicts = unique(conflicts)
	return ConflictReport{Version: Version, DryRun: true, ReadOnly: true, ConflictsFound: len(conflicts) > 0, Conflicts: conflicts, Recommendations: []string{"Maintain a zero-mutation MCP control plane and require PASS_GOLD/PASS_SECURE for real external actions."}}
}

// ExplainDecision returns a human-readable explanation for a policy input.
func ExplainDecision(input PolicyInput) DecisionExplanation {
	decision := Decide(input)
	why := append([]string(nil), decision.BlockedReasons...)
	if len(why) == 0 {
		why = []string{"not blocked; action is within the agent read-only/dry-run scope"}
	}
	summary := fmt.Sprintf("Policy Matrix %s evaluated %s action %q via tool %q.", Version, decision.Agent, decision.Action, decision.Tool)
	if decision.Blocked {
		summary = fmt.Sprintf("Policy Matrix %s blocked %s action %q via tool %q in read-only/dry-run MCP mode.", Version, decision.Agent, decision.Action, decision.Tool)
	}
	return DecisionExplanation{
		Version:      Version,
		DryRun:       true,
		ReadOnly:     true,
		Summary:      summary,
		WhyBlocked:   why,
		AllowedScope: allowedScope(decision.Policy),
		SafestNextSteps: []string{
			"Use dry-run/read-only tools to inspect, simulate, recommend, or validate only.",
			"If a real mutation is needed outside MCP, obtain real PASS_GOLD and PASS_SECURE first.",
			"Route patch application, PR, status publication, memory write, rollback, and deploy through non-MCP gated flows only.",
		},
		RequiredGates: gates(),
	}
}

func buildPolicies() map[string]AgentPolicy {
	base := func(agent, desc string, allowedActions, responsibilities, forbidden []string) AgentPolicy {
		return AgentPolicy{Agent: agent, Description: desc, ReadAllowed: true, BlockedTools: append([]string(nil), mutatingTools...), BlockedActions: append([]string(nil), sensitiveActions...), AllowedActions: allowedActions, RequiredGates: gates(), Responsibilities: responsibilities, ForbiddenResponsibilities: forbidden}
	}
	readOnlyForbidden := []string{"mutation", "command execution", "network", "deployment", "status publication", "PR creation", "memory write"}
	p := map[string]AgentPolicy{}
	put := func(policy AgentPolicy) { p[policy.Agent] = policy }
	withRecommend := func(policy AgentPolicy) AgentPolicy { policy.RecommendAllowed = true; return policy }
	withValidate := func(policy AgentPolicy) AgentPolicy { policy.ValidateAllowed = true; return policy }
	withSimulate := func(policy AgentPolicy) AgentPolicy { policy.SimulateAllowed = true; return policy }
	patchEngine := base("PatchEngine", "Patch proposal engine; may propose patches in dry-run, never apply patches through MCP.", []string{"read", "simulate", "propose_patch", "dry_run_patch"}, []string{"patch proposal", "dry-run diff planning"}, append(readOnlyForbidden, "apply_patch"))
	patchEngine.SimulateAllowed = true
	patchEngine.ExecuteAllowed = true // conceptual outside MCP only; mutation remains blocked in MCP.
	aegis := withValidate(base("Aegis", "Validation and security guard.", []string{"read", "validate", "security_check", "recommend_block"}, []string{"validate", "security_check", "recommend_block"}, append(readOnlyForbidden, "deploy")))
	aegis.RecommendAllowed = true
	put(withRecommend(base("OpenClaw", "Top-level orchestrator for read-only planning, delegation, and governance summaries.", []string{"read", "plan", "delegate", "summarize", "recommend"}, []string{"orchestration", "planning", "governance summary"}, readOnlyForbidden)))
	put(base("Scanner", "Read-only repository scanner and classifier.", []string{"read", "scan", "classify"}, []string{"scan", "read", "classify"}, append(readOnlyForbidden, "patch")))
	put(withRecommend(base("Hermes", "Diagnostic and recommendation agent; cannot mutate.", []string{"read", "diagnose", "recommend", "summarize"}, []string{"diagnose", "recommend"}, append(readOnlyForbidden, "patch", "mutation"))))
	put(patchEngine)
	put(aegis)
	put(withValidate(base("PASS_GOLD", "Reports gate status only when authoritative; MCP cannot synthesize PASS_GOLD.", []string{"read", "validate", "status"}, []string{"quality gate validation"}, append(readOnlyForbidden, "synthesize"))))
	put(withValidate(base("PASS_SECURE", "Reports security gate status only when authoritative; MCP cannot synthesize PASS_SECURE.", []string{"read", "validate", "security_check", "status"}, []string{"security gate validation"}, append(readOnlyForbidden, "synthesize"))))
	put(base("GraphMemory", "Read-only graph context provider; no memory mutation.", []string{"read", "query", "summarize", "impact_query", "context"}, []string{"graph query", "impact context"}, readOnlyForbidden))
	put(base("MCPReadOnly", "Read-only MCP control plane guard.", []string{"read", "list_tools", "block_mutation", "explain"}, []string{"tool registration", "mutation blocking"}, readOnlyForbidden))
	put(withSimulate(base("DryRun", "Simulation-only planner for patch, write, GitHub flow, mission, and risk assessment.", []string{"read", "simulate", "dry_run", "risk_assessment"}, []string{"simulation", "risk planning"}, readOnlyForbidden)))
	put(withRecommend(base("CodeBurn", "Cost estimation and budget policy guard; cannot execute commands.", []string{"read", "estimate_cost", "policy_check", "budget_plan", "explain"}, []string{"cost estimation", "budget policy"}, append(readOnlyForbidden, "command"))))
	put(base("Impeccable", "UI risk and visual gate planner; cannot use browser or screenshot tools.", []string{"read", "ui_risk", "file_classify", "visual_gate_plan", "explain"}, []string{"UI risk", "visual gate planning"}, append(readOnlyForbidden, "browser", "screenshot")))
	put(base("Dashboard", "Unified intelligence aggregation and readiness summaries; cannot execute or deploy.", []string{"read", "aggregate", "summarize", "readiness", "mission_control", "inventory"}, []string{"aggregate", "summarize", "readiness"}, append(readOnlyForbidden, "execute", "deploy")))
	put(base("GitHubFlow", "GitHub flow reporting and dry-run planning only in MCP; no network, PR, push, or status publish.", []string{"read", "dry_run_plan", "report_list", "summarize"}, []string{"dry-run GitHub planning", "report listing"}, append(readOnlyForbidden, "push", "open_pr")))
	put(base("Memory", "Memory read-only context; writing/learning requires real PASS_GOLD outside MCP.", []string{"read", "recall", "summarize"}, []string{"read memory context"}, append(readOnlyForbidden, "learn", "memory_write")))
	put(withRecommend(base("Rollback", "Rollback analysis only; real rollback is blocked by MCP.", []string{"read", "analyze_rollback", "recommend"}, []string{"rollback analysis"}, append(readOnlyForbidden, "rollback"))))
	put(withRecommend(base("Deploy", "Deployment planning only; deploy is never allowed through MCP.", []string{"read", "deployment_plan", "recommend"}, []string{"deployment planning"}, append(readOnlyForbidden, "deploy"))))
	for agent, policy := range p {
		policy.AllowedTools = toolsFor(agent)
		policy.MutateAllowed = false
		policy.NetworkAllowed = false
		policy.DeployAllowed = false
		policy.MemoryWriteAllowed = false
		policy.StatusPublishAllowed = false
		policy.PRAllowed = false
		p[agent] = policy
	}
	return p
}

func toolsFor(agent string) []string {
	switch agent {
	case "Scanner":
		return []string{"vision.project_summary", "vision.graph_query", "vision.graph_summary", "vision.graph_impact_query"}
	case "Hermes":
		return []string{"vision.project_summary", "vision.graph_dry_run_context", "vision.dry_run_risk_assessment"}
	case "PatchEngine":
		return []string{"vision.dry_run_apply_patch", "vision.dry_run_write_file", "vision.dry_run_mission"}
	case "Aegis", "PASS_GOLD", "PASS_SECURE":
		return []string{"vision.pass_gold_status", "vision.codeburn_policy_check", "vision.impeccable_guard_status", "vision.dashboard_readiness"}
	case "GraphMemory":
		return []string{"vision.graph_query", "vision.graph_summary", "vision.graph_providers", "vision.graph_provider_status", "vision.graph_impact_query", "vision.graph_dry_run_context"}
	case "DryRun":
		return []string{"vision.dry_run_apply_patch", "vision.dry_run_write_file", "vision.dry_run_github_flow", "vision.dry_run_mission", "vision.dry_run_risk_assessment"}
	case "CodeBurn":
		return []string{"vision.codeburn_estimate", "vision.codeburn_policy_check", "vision.codeburn_budget_plan", "vision.codeburn_guard_status", "vision.codeburn_explain"}
	case "Impeccable":
		return []string{"vision.impeccable_ui_risk", "vision.impeccable_file_classify", "vision.impeccable_visual_gate_plan", "vision.impeccable_guard_status", "vision.impeccable_explain"}
	case "Dashboard":
		return []string{"vision.dashboard_snapshot", "vision.dashboard_readiness", "vision.dashboard_intelligence_summary", "vision.dashboard_tool_inventory", "vision.dashboard_mission_control"}
	case "GitHubFlow":
		return []string{"vision.github_flow_reports_list", "vision.list_reports", "vision.dry_run_github_flow"}
	default:
		return []string{"vision.project_summary", "vision.graph_query", "vision.graph_summary", "vision.policy_matrix", "vision.policy_decide", "vision.policy_validate_plan", "vision.policy_conflicts", "vision.policy_explain"}
	}
}

func gates() []string { return append([]string(nil), requiredGates...) }
func normalize(s string) string {
	return strings.ToLower(strings.TrimSpace(strings.ReplaceAll(s, "-", "_")))
}
func isOfficialAgent(agent string) bool { return contains(officialAgents, strings.TrimSpace(agent)) }
func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}
func isMutatingTool(tool string) bool { return contains(mutatingTools, strings.TrimSpace(tool)) }

func isSensitiveAction(action string) bool {
	a := normalize(action)
	if a == "" {
		return false
	}
	for _, s := range sensitiveActions {
		if a == s {
			return true
		}
	}
	return false
}

func isReadOnlyIntent(action, operation string) bool {
	a, o := normalize(action), normalize(operation)
	for _, v := range []string{a, o} {
		if v == "read" || v == "scan" || v == "query" || v == "summarize" || v == "classify" || v == "list" {
			return true
		}
	}
	return a == "" && o == ""
}

func actionAllowed(p AgentPolicy, action, operation string) bool {
	for _, v := range []string{normalize(action), normalize(operation)} {
		if v == "" {
			continue
		}
		if containsNormalized(p.AllowedActions, v) {
			continue
		}
		if isReadOnlyIntent(v, "") && p.ReadAllowed {
			continue
		}
		if (v == "simulate" || v == "dry_run") && p.SimulateAllowed {
			continue
		}
		if (v == "recommend" || v == "diagnose") && p.RecommendAllowed {
			continue
		}
		if (v == "validate" || v == "security_check") && p.ValidateAllowed {
			continue
		}
		return false
	}
	return true
}

func containsNormalized(list []string, value string) bool {
	for _, item := range list {
		if normalize(item) == value {
			return true
		}
	}
	return false
}

func violatesCapability(p AgentPolicy, input PolicyInput) bool {
	action := normalize(input.Action)
	operation := normalize(input.Operation)
	tool := normalize(input.Tool)
	values := []string{action, operation, tool}
	if any(values, "deploy") && !p.DeployAllowed {
		return true
	}
	if any(values, "rollback") && !p.MutateAllowed {
		return true
	}
	if any([]string{action, operation, tool}, "apply_patch") && !p.MutateAllowed {
		return true
	}
	if any([]string{action, operation}, "patch") && !(p.Agent == "PatchEngine" && (action == "propose_patch" || action == "dry_run_patch")) {
		return true
	}
	if any([]string{action, operation}, "write", "write_file", "commit") && !p.MutateAllowed {
		return true
	}
	if any(values, "push") && !p.NetworkAllowed {
		return true
	}
	if any(values, "open_pr") && !p.PRAllowed {
		return true
	}
	if any(values, "publish_status") && !p.StatusPublishAllowed {
		return true
	}
	if any(values, "memory_write", "learn") && !p.MemoryWriteAllowed {
		return true
	}
	if any([]string{action, operation}, "execute", "command") && !p.ExecuteAllowed {
		return true
	}
	if any(values, "browser", "screenshot") {
		return true
	}
	return false
}

func any(values []string, needles ...string) bool {
	for _, value := range values {
		for _, needle := range needles {
			if value == needle {
				return true
			}
		}
	}
	return false
}

func requiresRealGates(input PolicyInput) bool {
	joined := normalize(strings.Join([]string{input.Action, input.Operation, input.Tool}, " "))
	for _, k := range []string{"promote", "deploy", "memory_write", "learn", "publish_status", "open_pr", "push"} {
		if strings.Contains(joined, k) {
			return true
		}
	}
	return false
}

func hasRealPasses(input PolicyInput) bool {
	gold := normalize(input.PassGoldStatus)
	secure := normalize(input.PassSecureStatus)
	return (gold == "pass" || gold == "gold" || gold == "passed") && (secure == "pass" || secure == "secure" || secure == "passed")
}

func allowedScope(p AgentPolicy) []string {
	scope := []string{}
	if p.ReadAllowed {
		scope = append(scope, "read")
	}
	if p.SimulateAllowed {
		scope = append(scope, "simulate")
	}
	if p.RecommendAllowed {
		scope = append(scope, "recommend")
	}
	if p.ValidateAllowed {
		scope = append(scope, "validate")
	}
	scope = append(scope, p.AllowedActions...)
	return unique(scope)
}

func unique(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, item := range in {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}
	return out
}

// SortedMutatingTools returns the canonical mutating tools in stable order.
func SortedMutatingTools() []string {
	out := append([]string(nil), mutatingTools...)
	sort.Strings(out)
	return out
}
