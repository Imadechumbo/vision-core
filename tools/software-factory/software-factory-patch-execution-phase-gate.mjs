import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PATCH_EXECUTION_PHASE_GATE_STATUSES = [
  'PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT',
  'PATCH_EXEC_PHASE_GATE_BLOCKED_CONTRACT',
  'PATCH_EXEC_PHASE_GATE_READY',
];

const BASE = {
  schema_version: 'v234.0',
  phase_gate_id: null,
  contract_id: null,
  drill_id: null,
  phase_checks: [],
  check_count: 0,
  phase_passed: false,
  gate_ready: false,
  patch_execution_baseline_ready: false,
  gate_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_PHASE_CHECKS = [
  { name: 'patch_audit_contract_v225_present', status: 'pending' },
  { name: 'patch_diff_binder_v226_present', status: 'pending' },
  { name: 'sandbox_patch_env_v227_present', status: 'pending' },
  { name: 'sandbox_test_lane_v228_present', status: 'pending' },
  { name: 'sandbox_security_review_v229_present', status: 'pending' },
  { name: 'real_patch_approval_gate_v230_present', status: 'pending' },
  { name: 'controlled_patch_plan_v231_present', status: 'pending' },
  { name: 'real_patch_execution_barrier_v232_present', status: 'pending' },
  { name: 'supervised_patch_execution_drill_v233_present', status: 'pending' },
  { name: 'all_patch_tests_pass', status: 'pending' },
  { name: 'syntax_check_pass', status: 'pending' },
  { name: 'governance_invariants_hold', status: 'pending' },
  { name: 'real_patch_execution_still_blocked', status: 'pending' },
  { name: 'production_untouched_confirmed', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, errors: ['PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.drill_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PATCH_EXEC_PHASE_GATE_BLOCKED_CONTRACT: drill not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PATCH_EXEC_PHASE_GATE_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawChecks = Array.isArray(input.phase_checks) && input.phase_checks.length > 0
    ? input.phase_checks.map((c, i) => ({ index: i, name: typeof c === 'string' ? c : c.name, status: 'pending' }))
    : DEFAULT_PHASE_CHECKS.map((c, i) => ({ index: i, ...c }));

  const pgid = input.phase_gate_id;
  return {
    ...BASE,
    phase_gate_id: pgid,
    contract_id: input.contract_id,
    drill_id: input.drill_id,
    phase_checks: rawChecks,
    check_count: rawChecks.length,
    phase_passed: false,
    gate_ready: true,
    patch_execution_baseline_ready: false,
    gate_hash: hash({ pgid, contract_id: input.contract_id, drill_id: input.drill_id }),
    errors: [],
  };
}

export function validate(gate) {
  if (!gate || !gate.phase_gate_id) {
    return { valid: false, errors: ['PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (gate.phase_passed !== false) errors.push('phase_passed must be false by default');
  if (gate.patch_execution_baseline_ready !== false) errors.push('patch_execution_baseline_ready must be false by default');
  if (gate.release_allowed !== false) errors.push('release_allowed must be false');
  if (gate.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (gate.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (gate.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (gate.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (gate.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (gate.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(gate) {
  if (!gate || !gate.phase_gate_id) {
    return 'PATCH_EXEC_PHASE_GATE_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false patch_execution_baseline_ready=false';
  }
  let out = `=== Software Factory Patch Execution Phase Gate ===\n`;
  out += `schema_version: ${gate.schema_version}\n`;
  out += `phase_gate_id: ${gate.phase_gate_id}\n`;
  out += `contract_id: ${gate.contract_id}\n`;
  out += `drill_id: ${gate.drill_id}\n`;
  out += `check_count: ${gate.check_count}\n`;
  out += `phase_passed: ${gate.phase_passed}\n`;
  out += `gate_ready: ${gate.gate_ready}\n`;
  out += `patch_execution_baseline_ready: ${gate.patch_execution_baseline_ready}\n`;
  out += `release_allowed: ${gate.release_allowed}\n`;
  out += `deploy_allowed: ${gate.deploy_allowed}\n`;
  out += `real_execution_allowed: ${gate.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${gate.real_patch_execution_allowed}\n`;
  out += `production_touched: ${gate.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
