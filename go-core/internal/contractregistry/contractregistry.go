// Package contractregistry provides the V8.7 read-only/dry-run runtime contract registry.
package contractregistry

import (
	"fmt"
	"sort"
	"strings"
)

const Version = "V8.7"

var requiredGates = []string{"PASS_GOLD", "PASS_SECURE"}

// ContractInput is a read-only contract validation/explanation request.
type ContractInput struct {
	Root      string                 `json:"root,omitempty"`
	Tool      string                 `json:"tool,omitempty"`
	Operation string                 `json:"operation,omitempty"`
	Payload   map[string]interface{} `json:"payload,omitempty"`
	Category  string                 `json:"category,omitempty"`
	Version   string                 `json:"version,omitempty"`
	Strict    bool                   `json:"strict,omitempty"`
}

// RuntimeContract describes the conservative MCP/runtime contract for one tool.
type RuntimeContract struct {
	Name             string          `json:"name"`
	Version          string          `json:"version"`
	Category         string          `json:"category"`
	Description      string          `json:"description"`
	ReadOnly         bool            `json:"read_only"`
	DryRun           bool            `json:"dry_run"`
	Mutating         bool            `json:"mutating"`
	Blocked          bool            `json:"blocked"`
	RequiredGates    []string        `json:"required_gates"`
	InputFields      []FieldContract `json:"input_fields"`
	OutputFields     []FieldContract `json:"output_fields"`
	AllowedAgents    []string        `json:"allowed_agents"`
	ForbiddenActions []string        `json:"forbidden_actions"`
	Examples         []string        `json:"examples"`
	Notes            []string        `json:"notes"`
}

// FieldContract describes a simplified payload field contract.
type FieldContract struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description"`
}

// ContractRegistrySnapshot is the complete V8.7 registry inventory.
type ContractRegistrySnapshot struct {
	Version              string            `json:"version"`
	DryRun               bool              `json:"dry_run"`
	ReadOnly             bool              `json:"read_only"`
	RegistryStatus       string            `json:"registry_status"`
	Contracts            []RuntimeContract `json:"contracts"`
	Modules              []RuntimeModule   `json:"modules"`
	Versions             []string          `json:"versions"`
	BlockedMutatingTools []string          `json:"blocked_mutating_tools"`
	RequiredGates        []string          `json:"required_gates"`
	Recommendations      []string          `json:"recommendations"`
}

// ContractValidationResult reports payload compatibility without executing anything.
type ContractValidationResult struct {
	Version         string          `json:"version"`
	DryRun          bool            `json:"dry_run"`
	ReadOnly        bool            `json:"read_only"`
	Tool            string          `json:"tool"`
	Valid           bool            `json:"valid"`
	Blocked         bool            `json:"blocked"`
	BlockedReasons  []string        `json:"blocked_reasons"`
	MissingFields   []string        `json:"missing_fields"`
	UnknownFields   []string        `json:"unknown_fields"`
	RequiredGates   []string        `json:"required_gates"`
	Contract        RuntimeContract `json:"contract"`
	Recommendations []string        `json:"recommendations"`
}

// ContractDiffResult reports internal consistency of the registry.
type ContractDiffResult struct {
	Version            string   `json:"version"`
	DryRun             bool     `json:"dry_run"`
	ReadOnly           bool     `json:"read_only"`
	ConflictsFound     bool     `json:"conflicts_found"`
	Conflicts          []string `json:"conflicts"`
	MissingContracts   []string `json:"missing_contracts"`
	DuplicateContracts []string `json:"duplicate_contracts"`
	Recommendations    []string `json:"recommendations"`
}

// RuntimeModule describes an MCP-visible runtime capability.
type RuntimeModule struct {
	Name            string   `json:"name"`
	Version         string   `json:"version"`
	Status          string   `json:"status"`
	ReadOnly        bool     `json:"read_only"`
	DryRun          bool     `json:"dry_run"`
	MutationAllowed bool     `json:"mutation_allowed"`
	Description     string   `json:"description"`
	Tools           []string `json:"tools"`
}

// ContractExplainResult explains a contract and safest next steps.
type ContractExplainResult struct {
	Version         string   `json:"version"`
	DryRun          bool     `json:"dry_run"`
	ReadOnly        bool     `json:"read_only"`
	Summary         string   `json:"summary"`
	ContractScope   []string `json:"contract_scope"`
	RequiredGates   []string `json:"required_gates"`
	BlockedActions  []string `json:"blocked_actions"`
	SafestNextSteps []string `json:"safest_next_steps"`
}

// BuildRegistry returns the complete static read-only V8.7 registry snapshot.
func BuildRegistry() ContractRegistrySnapshot {
	contracts := allContracts()
	return ContractRegistrySnapshot{
		Version:              Version,
		DryRun:               true,
		ReadOnly:             true,
		RegistryStatus:       "safe_read_only",
		Contracts:            contracts,
		Modules:              BuildRuntimeModules(),
		Versions:             []string{"V8.0", "V8.1", "V8.2", "V8.3", "V8.4", "V8.5", "V8.6", "V8.7"},
		BlockedMutatingTools: blockedMutatingTools(),
		RequiredGates:        gates(),
		Recommendations: []string{
			"Consume registry data as read-only contract metadata only.",
			"Require PASS_GOLD and PASS_SECURE before any promotion outside MCP.",
			"Register new runtime tools here before integration.",
		},
	}
}

// GetContract returns a known contract or a conservative blocked unknown contract.
func GetContract(tool string) RuntimeContract {
	tool = strings.TrimSpace(tool)
	for _, c := range allContracts() {
		if c.Name == tool {
			return c
		}
	}
	return RuntimeContract{
		Name:          tool,
		Version:       Version,
		Category:      "unknown",
		Description:   "Unknown MCP tool; conservative contract blocks use until registration.",
		ReadOnly:      true,
		DryRun:        true,
		Mutating:      false,
		Blocked:       true,
		RequiredGates: gates(),
		ForbiddenActions: []string{
			"execute", "write_file", "apply_patch", "commit", "push", "open_pr", "publish_status", "deploy", "rollback", "network_call",
		},
		Notes: []string{"Register this tool in Runtime Contract Registry before any use."},
	}
}

// ValidateContract validates payload shape only. It never dispatches tools or mutates state.
func ValidateContract(input ContractInput) ContractValidationResult {
	contract := GetContract(input.Tool)
	res := ContractValidationResult{
		Version:         Version,
		DryRun:          true,
		ReadOnly:        true,
		Tool:            strings.TrimSpace(input.Tool),
		Valid:           true,
		Blocked:         false,
		BlockedReasons:  []string{},
		MissingFields:   []string{},
		UnknownFields:   []string{},
		RequiredGates:   gates(),
		Contract:        contract,
		Recommendations: []string{},
	}
	if contract.Blocked || contract.Category == "unknown" || contract.Mutating {
		res.Valid = false
		res.Blocked = true
		if contract.Mutating {
			res.BlockedReasons = append(res.BlockedReasons, "mutating tool is blocked in read-only MCP control plane")
		} else if contract.Category == "unknown" {
			res.BlockedReasons = append(res.BlockedReasons, "tool contract is not registered")
		} else {
			res.BlockedReasons = append(res.BlockedReasons, "tool contract is blocked")
		}
	}

	allowed := map[string]FieldContract{}
	for _, f := range contract.InputFields {
		allowed[f.Name] = f
		if f.Required {
			if input.Payload == nil {
				res.MissingFields = append(res.MissingFields, f.Name)
				continue
			}
			if _, ok := input.Payload[f.Name]; !ok {
				res.MissingFields = append(res.MissingFields, f.Name)
			}
		}
	}
	for k := range input.Payload {
		if _, ok := allowed[k]; !ok {
			res.UnknownFields = append(res.UnknownFields, k)
		}
	}
	sort.Strings(res.MissingFields)
	sort.Strings(res.UnknownFields)
	if len(res.MissingFields) > 0 {
		res.Valid = false
	}
	if len(res.UnknownFields) > 0 {
		if input.Strict {
			res.Valid = false
		} else {
			res.Recommendations = append(res.Recommendations, "Unknown payload fields were ignored by non-strict validation; register them before relying on them.")
		}
	}
	if !hasGate(contract.RequiredGates, "PASS_GOLD") || !hasGate(contract.RequiredGates, "PASS_SECURE") {
		res.Valid = false
		res.Blocked = true
		res.BlockedReasons = append(res.BlockedReasons, "contract is missing required PASS_GOLD/PASS_SECURE gates")
	}
	if len(res.Recommendations) == 0 && res.Valid && !res.Blocked {
		res.Recommendations = []string{"Payload is compatible with the registered read-only/dry-run contract."}
	}
	return res
}

// AuditRegistry detects missing, duplicate, and unsafe contracts.
func AuditRegistry() ContractDiffResult {
	contracts := allContracts()
	res := ContractDiffResult{Version: Version, DryRun: true, ReadOnly: true, Conflicts: []string{}, MissingContracts: []string{}, DuplicateContracts: []string{}, Recommendations: []string{}}
	seen := map[string]int{}
	for _, c := range contracts {
		seen[c.Name]++
		if seen[c.Name] > 1 {
			res.DuplicateContracts = append(res.DuplicateContracts, c.Name)
		}
		if c.Mutating && !c.Blocked {
			res.Conflicts = append(res.Conflicts, fmt.Sprintf("mutating contract %s is not blocked", c.Name))
		}
		if c.ReadOnly && c.Mutating {
			res.Conflicts = append(res.Conflicts, fmt.Sprintf("read-only contract %s is marked mutating", c.Name))
		}
		if !hasGate(c.RequiredGates, "PASS_GOLD") || !hasGate(c.RequiredGates, "PASS_SECURE") {
			res.Conflicts = append(res.Conflicts, fmt.Sprintf("contract %s is missing PASS_GOLD/PASS_SECURE", c.Name))
		}
		if isDangerousMCPMutation(c.Name) && !c.Blocked {
			res.Conflicts = append(res.Conflicts, fmt.Sprintf("dangerous MCP action %s is not blocked", c.Name))
		}
	}
	for _, expected := range expectedTools() {
		if seen[expected] == 0 {
			res.MissingContracts = append(res.MissingContracts, expected)
		}
	}
	sort.Strings(res.Conflicts)
	sort.Strings(res.MissingContracts)
	sort.Strings(res.DuplicateContracts)
	res.ConflictsFound = len(res.Conflicts) > 0 || len(res.MissingContracts) > 0 || len(res.DuplicateContracts) > 0
	if res.ConflictsFound {
		res.Recommendations = []string{"Resolve registry conflicts before consuming contracts."}
	} else {
		res.Recommendations = []string{"Registry is internally consistent for read-only/dry-run MCP consumption."}
	}
	return res
}

// BuildRuntimeModules returns the registered MCP runtime capabilities.
func BuildRuntimeModules() []RuntimeModule {
	return []RuntimeModule{
		module("GraphMemory", "V8.0", "registered", "Graph memory index and query contracts.", []string{"vision.project_summary", "vision.graph_query", "vision.graph_summary"}),
		module("MCPReadOnly", "V8.0", "registered", "Read-only MCP control plane and report/status inventory.", []string{"vision.list_reports", "vision.get_report", "vision.github_flow_reports_list", "vision.pass_gold_status"}),
		module("DryRun", "V8.2", "registered", "Dry-run planning tools that do not mutate runtime state.", []string{"vision.dry_run_apply_patch", "vision.dry_run_write_file", "vision.dry_run_github_flow", "vision.dry_run_mission", "vision.dry_run_risk_assessment"}),
		module("CodeBurn", "V8.3", "registered", "Cost guard estimation and policy checks.", []string{"vision.codeburn_estimate", "vision.codeburn_policy_check", "vision.codeburn_budget_plan", "vision.codeburn_guard_status", "vision.codeburn_explain"}),
		module("Impeccable", "V8.4", "registered", "UI risk and visual gate planning.", []string{"vision.impeccable_ui_risk", "vision.impeccable_file_classify", "vision.impeccable_visual_gate_plan", "vision.impeccable_guard_status", "vision.impeccable_explain"}),
		module("Dashboard", "V8.5", "registered", "Unified intelligence dashboard inventory.", []string{"vision.dashboard_snapshot", "vision.dashboard_readiness", "vision.dashboard_intelligence_summary", "vision.dashboard_tool_inventory", "vision.dashboard_mission_control"}),
		module("PolicyMatrix", "V8.6", "registered", "Agent/action policy matrix dry-run decisions.", []string{"vision.policy_matrix", "vision.policy_decide", "vision.policy_validate_plan", "vision.policy_conflicts", "vision.policy_explain"}),
		module("ContractRegistry", "V8.7", "registered", "Runtime contract registry validation and explanation.", []string{"vision.contract_registry", "vision.contract_get", "vision.contract_validate_payload", "vision.contract_audit", "vision.contract_explain"}),
		module("PASS_GOLD", "required", "unknown", "Required promotion gate; never synthesized by MCP.", nil),
		module("PASS_SECURE", "required", "unknown", "Required security gate; never synthesized by MCP.", nil),
		module("GitHubFlow", "V7.9", "registered", "GitHub flow report index and read-only report access.", []string{"vision.github_flow_reports_list"}),
		module("ReportIndex", "V8.0", "registered", "Index-only report listing and retrieval.", []string{"vision.list_reports", "vision.get_report"}),
	}
}

// ExplainContract returns a conservative explanation without executing anything.
func ExplainContract(input ContractInput) ContractExplainResult {
	contract := GetContract(input.Tool)
	blocked := append([]string{}, contract.ForbiddenActions...)
	if contract.Blocked || contract.Mutating {
		blocked = append(blocked, contract.Name)
	}
	return ContractExplainResult{
		Version:  Version,
		DryRun:   true,
		ReadOnly: true,
		Summary:  fmt.Sprintf("Tool %q is registered as category %q with read_only=%v, dry_run=%v, mutating=%v, blocked=%v.", contract.Name, contract.Category, contract.ReadOnly, contract.DryRun, contract.Mutating, contract.Blocked),
		ContractScope: []string{
			"Static runtime contract inventory",
			"Payload field validation",
			"Gate and blocked-action explanation",
			"No command execution, file writes, network calls, deploys, PRs, status publication, or memory mutation",
		},
		RequiredGates:  gates(),
		BlockedActions: uniqueSorted(blocked),
		SafestNextSteps: []string{
			"Use this result only as read-only/dry-run contract metadata.",
			"Keep mutating actions blocked in the MCP control plane.",
			"Require real PASS_GOLD and PASS_SECURE before promotion outside MCP.",
		},
	}
}

func allContracts() []RuntimeContract {
	var out []RuntimeContract
	add := func(version, category, name, desc string, fields []FieldContract) {
		out = append(out, readOnlyContract(version, category, name, desc, fields))
	}
	add("V8.0", "graph", "vision.project_summary", "Read-only project graph summary.", nil)
	add("V8.0", "graph", "vision.graph_query", "Read-only graph query.", fields(field("query", "string", true, "Search query."), field("limit", "integer", true, "Maximum result count.")))
	add("V8.0", "graph", "vision.graph_summary", "Read-only graph index summary.", nil)
	add("V8.0", "report", "vision.list_reports", "Index-only report listing.", nil)
	add("V8.0", "report", "vision.get_report", "Index-only report retrieval by flow id.", fields(field("flow_id", "string", true, "Report flow identifier."), field("report_dir", "string", false, "Optional report directory.")))
	add("V8.0", "report", "vision.github_flow_reports_list", "Read-only GitHub flow report listing alias.", nil)
	add("V8.0", "gate", "vision.pass_gold_status", "Read-only PASS_GOLD status inventory; unknown unless real status exists.", nil)
	add("V8.1", "graph_provider", "vision.graph_providers", "List graph providers.", nil)
	add("V8.1", "graph_provider", "vision.graph_provider_status", "Report graph provider status.", fields(field("provider", "string", false, "Provider name.")))
	add("V8.1", "graph_provider", "vision.graph_impact_query", "Dry-run graph impact query.", fields(field("query", "string", true, "Impact query."), field("limit", "integer", false, "Maximum result count."), field("provider", "string", false, "Provider name.")))
	add("V8.1", "graph_provider", "vision.graph_dry_run_context", "Build read-only planning context from graph.", fields(field("query", "string", true, "Planning query."), field("issue_type", "string", false, "Issue type."), field("limit", "integer", false, "Maximum result count.")))
	add("V8.2", "dry_run", "vision.dry_run_apply_patch", "Preview patch application without writing files.", fields(field("file", "string", true, "Target file."), field("find", "string", false, "Text to find."), field("replace", "string", false, "Replacement text."), field("mode", "string", false, "Patch mode.")))
	add("V8.2", "dry_run", "vision.dry_run_write_file", "Preview file write without writing files.", fields(field("file", "string", true, "Target file."), field("content", "string", false, "Content preview."), field("operation", "string", false, "Write operation.")))
	add("V8.2", "dry_run", "vision.dry_run_github_flow", "Preview GitHub flow without GitHub mutation.", fields(field("mission_id", "string", false, "Mission id."), field("work_branch", "string", false, "Work branch."), field("changed_files", "array", false, "Changed files.")))
	add("V8.2", "dry_run", "vision.dry_run_mission", "Preview mission without execution.", fields(field("input", "string", true, "Mission input.")))
	add("V8.2", "dry_run", "vision.dry_run_risk_assessment", "Assess dry-run operation risk.", fields(field("operation", "string", true, "Operation type."), field("files", "array", false, "Files under consideration.")))
	for _, name := range []string{"vision.codeburn_estimate", "vision.codeburn_policy_check", "vision.codeburn_budget_plan", "vision.codeburn_guard_status", "vision.codeburn_explain"} {
		add("V8.3", "codeburn", name, "CodeBurn cost guard read-only/dry-run contract.", commonPlanningFields())
	}
	for _, name := range []string{"vision.impeccable_ui_risk", "vision.impeccable_file_classify", "vision.impeccable_visual_gate_plan", "vision.impeccable_guard_status", "vision.impeccable_explain"} {
		add("V8.4", "impeccable", name, "Impeccable UI guard read-only/dry-run contract.", commonPlanningFields())
	}
	for _, name := range []string{"vision.dashboard_snapshot", "vision.dashboard_readiness", "vision.dashboard_intelligence_summary", "vision.dashboard_tool_inventory", "vision.dashboard_mission_control"} {
		add("V8.5", "dashboard", name, "Unified intelligence dashboard read-only/dry-run contract.", commonPlanningFields())
	}
	add("V8.6", "policy", "vision.policy_matrix", "Return the agent policy matrix.", nil)
	add("V8.6", "policy", "vision.policy_decide", "Validate one agent/action/tool request against policy.", fields(field("agent", "string", true, "Agent name."), field("action", "string", true, "Requested action."), field("tool", "string", true, "Requested tool."), field("operation", "string", true, "Operation category."), field("requested_mode", "string", true, "Requested mode.")))
	add("V8.6", "policy", "vision.policy_validate_plan", "Validate a plan against policy.", fields(field("steps", "array", true, "Plan steps.")))
	add("V8.6", "policy", "vision.policy_conflicts", "Audit policy conflicts.", nil)
	add("V8.6", "policy", "vision.policy_explain", "Explain a policy decision.", fields(field("agent", "string", false, "Agent name."), field("action", "string", false, "Requested action."), field("tool", "string", false, "Requested tool."), field("operation", "string", false, "Operation category."), field("requested_mode", "string", false, "Requested mode.")))
	add("V8.7", "contract", "vision.contract_registry", "Return the runtime contract registry snapshot.", nil)
	add("V8.7", "contract", "vision.contract_get", "Return one runtime contract.", fields(field("tool", "string", true, "Tool name.")))
	add("V8.7", "contract", "vision.contract_validate_payload", "Validate payload compatibility with one contract.", fields(field("tool", "string", true, "Tool name."), field("payload", "object", false, "Payload to validate."), field("strict", "boolean", false, "Reject unknown fields.")))
	add("V8.7", "contract", "vision.contract_audit", "Audit registry consistency.", nil)
	add("V8.7", "contract", "vision.contract_explain", "Explain a runtime contract.", fields(field("tool", "string", true, "Tool name."), field("operation", "string", false, "Operation name.")))
	for _, name := range blockedMutatingTools() {
		out = append(out, blockedContract(name))
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

func readOnlyContract(version, category, name, desc string, fields []FieldContract) RuntimeContract {
	return RuntimeContract{
		Name:          name,
		Version:       version,
		Category:      category,
		Description:   desc,
		ReadOnly:      true,
		DryRun:        true,
		Mutating:      false,
		Blocked:       false,
		RequiredGates: gates(),
		InputFields:   fields,
		OutputFields: []FieldContract{
			field("dry_run", "boolean", false, "Dry-run marker when applicable."),
			field("read_only", "boolean", false, "Read-only marker when applicable."),
		},
		AllowedAgents:    []string{"Scanner", "Planner", "Dashboard", "PolicyMatrix", "ContractRegistry"},
		ForbiddenActions: []string{"write_file", "apply_patch", "commit", "push", "open_pr", "publish_status", "deploy", "rollback", "network_call", "memory_mutation"},
		Examples:         []string{name},
		Notes:            []string{"MCP contract is read-only/dry-run and does not replace PASS_GOLD/PASS_SECURE."},
	}
}

func blockedContract(name string) RuntimeContract {
	return RuntimeContract{
		Name:             name,
		Version:          Version,
		Category:         "blocked_mutation",
		Description:      "Mutating MCP tool is registered only to document its permanent read-only control-plane block.",
		ReadOnly:         false,
		DryRun:           false,
		Mutating:         true,
		Blocked:          true,
		RequiredGates:    gates(),
		ForbiddenActions: []string{"write_file", "apply_patch", "commit", "push", "open_pr", "publish_status", "run_mission_real", "rollback", "deploy"},
		Notes:            []string{"Must return: tool is not allowed in read-only MCP control plane"},
	}
}

func field(name, typ string, required bool, desc string) FieldContract {
	return FieldContract{Name: name, Type: typ, Required: required, Description: desc}
}

func fields(in ...FieldContract) []FieldContract { return in }

func commonPlanningFields() []FieldContract {
	return []FieldContract{
		field("mission_input", "string", false, "Mission input."),
		field("operation", "string", false, "Operation category."),
		field("files", "array", false, "Candidate files."),
		field("route", "string", false, "UI route."),
		field("viewport", "string", false, "Viewport."),
		field("provider", "string", false, "Provider."),
		field("model", "string", false, "Model."),
	}
}

func blockedMutatingTools() []string {
	return []string{"vision.apply_patch", "vision.write_file", "vision.commit", "vision.push", "vision.open_pr", "vision.publish_status", "vision.run_mission_real", "vision.rollback", "vision.deploy"}
}

func expectedTools() []string {
	var out []string
	for _, c := range allContracts() {
		out = append(out, c.Name)
	}
	return out
}

func gates() []string { return append([]string{}, requiredGates...) }

func hasGate(gates []string, gate string) bool {
	for _, g := range gates {
		if g == gate {
			return true
		}
	}
	return false
}

func isDangerousMCPMutation(name string) bool {
	for _, blocked := range blockedMutatingTools() {
		if name == blocked {
			return true
		}
	}
	return false
}

func module(name, version, status, desc string, tools []string) RuntimeModule {
	return RuntimeModule{Name: name, Version: version, Status: status, ReadOnly: true, DryRun: true, MutationAllowed: false, Description: desc, Tools: tools}
}

func uniqueSorted(in []string) []string {
	m := map[string]bool{}
	for _, s := range in {
		if strings.TrimSpace(s) != "" {
			m[s] = true
		}
	}
	out := make([]string, 0, len(m))
	for s := range m {
		out = append(out, s)
	}
	sort.Strings(out)
	return out
}
