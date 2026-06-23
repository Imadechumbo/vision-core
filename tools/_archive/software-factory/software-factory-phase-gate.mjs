import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PHASE_GATE_STATUSES = [
  'PHASE_GATE_BLOCKED_INPUT',
  'PHASE_GATE_BLOCKED_CONTRACT',
  'PHASE_GATE_READY',
];

const BASE = {
  schema_version: 'v224.0',
  phase_gate_id: null,
  contract_id: null,
  phase_checks: [],
  check_count: 0,
  phase_passed: false,
  gate_ready: false,
  gate_hash: null,
  software_factory_baseline_ready: false,
  real_pr_creation_allowed: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_PHASE_CHECKS = [
  { name: 'contract_v201_present', status: 'pending' },
  { name: 'scope_inspector_v202_present', status: 'pending' },
  { name: 'recipe_engine_v203_present', status: 'pending' },
  { name: 'build_pipeline_v204_present', status: 'pending' },
  { name: 'final_verifier_v205_present', status: 'pending' },
  { name: 'prompt_builder_v206_present', status: 'pending' },
  { name: 'todo_planner_v207_present', status: 'pending' },
  { name: 'agent_registry_v208_present', status: 'pending' },
  { name: 'tool_policy_v209_present', status: 'pending' },
  { name: 'subagent_manager_v210_present', status: 'pending' },
  { name: 'fork_manager_v211_present', status: 'pending' },
  { name: 'loop_engine_v212_present', status: 'pending' },
  { name: 'patch_controller_v213_present', status: 'pending' },
  { name: 'validation_gate_v214_present', status: 'pending' },
  { name: 'evidence_receipt_v215_present', status: 'pending' },
  { name: 'pr_readiness_gate_v216_present', status: 'pending' },
  { name: 'mission_report_v217_present', status: 'pending' },
  { name: 'orchestrator_v218_present', status: 'pending' },
  { name: 'cli_v219_present', status: 'pending' },
  { name: 'memory_ledger_v220_present', status: 'pending' },
  { name: 'security_review_v221_present', status: 'pending' },
  { name: 'pass_gold_binding_v222_present', status: 'pending' },
  { name: 'pr_controller_dry_run_v223_present', status: 'pending' },
  { name: 'all_tests_pass', status: 'pending' },
  { name: 'syntax_check_pass', status: 'pending' },
  { name: 'governance_invariants_hold', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PHASE_GATE_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.dry_run_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PHASE_GATE_BLOCKED_CONTRACT: dry_run not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PHASE_GATE_BLOCKED_CONTRACT: scope not validated'] };
  }

  const phase_checks = Array.isArray(input.phase_checks) && input.phase_checks.length > 0
    ? input.phase_checks.map((c, i) => ({ index: i, name: typeof c === 'string' ? c : c.name, status: 'pending' }))
    : DEFAULT_PHASE_CHECKS.map((c, i) => ({ index: i, ...c }));

  const pgid = input.phase_gate_id;
  return {
    ...BASE,
    phase_gate_id: pgid,
    contract_id: input.contract_id,
    phase_checks,
    check_count: phase_checks.length,
    phase_passed: false,
    gate_ready: true,
    gate_hash: hash({ pgid, contract_id: input.contract_id }),
    software_factory_baseline_ready: false,
    errors: [],
  };
}

export function validate(gate) {
  if (!gate || !gate.phase_gate_id) {
    return { valid: false, errors: ['PHASE_GATE_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (gate.phase_passed !== false) errors.push('phase_passed must be false by default');
  if (gate.software_factory_baseline_ready !== false) errors.push('software_factory_baseline_ready must be false by default');
  if (gate.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (gate.release_allowed !== false) errors.push('release_allowed must be false');
  if (gate.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (gate.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(gate) {
  if (!gate || !gate.phase_gate_id) {
    return 'PHASE_GATE_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false software_factory_baseline_ready=false';
  }
  let out = `=== Software Factory Phase Gate ===\n`;
  out += `schema_version: ${gate.schema_version}\n`;
  out += `phase_gate_id: ${gate.phase_gate_id}\n`;
  out += `contract_id: ${gate.contract_id}\n`;
  out += `check_count: ${gate.check_count}\n`;
  out += `phase_passed: ${gate.phase_passed}\n`;
  out += `gate_ready: ${gate.gate_ready}\n`;
  out += `software_factory_baseline_ready: ${gate.software_factory_baseline_ready}\n`;
  out += `real_pr_creation_allowed: ${gate.real_pr_creation_allowed}\n`;
  out += `release_allowed: ${gate.release_allowed}\n`;
  out += `deploy_allowed: ${gate.deploy_allowed}\n`;
  out += `real_execution_allowed: ${gate.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
