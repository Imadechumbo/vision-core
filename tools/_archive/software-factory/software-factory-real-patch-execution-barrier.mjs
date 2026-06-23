import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_EXECUTION_BARRIER_STATUSES = [
  'REAL_PATCH_BARRIER_BLOCKED_INPUT',
  'REAL_PATCH_BARRIER_BLOCKED_CONTRACT',
  'REAL_PATCH_BARRIER_READY',
];

const BASE = {
  schema_version: 'v232.0',
  barrier_id: null,
  contract_id: null,
  plan_id: null,
  barrier_checks: [],
  check_count: 0,
  barrier_ready: false,
  barrier_passed: false,
  barrier_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_BARRIER_CHECKS = [
  { index: 0, check: 'controlled_plan_ready', status: 'pending' },
  { index: 1, check: 'approval_gate_confirmed', status: 'pending' },
  { index: 2, check: 'no_forbidden_paths_in_plan', status: 'pending' },
  { index: 3, check: 'governance_flags_all_false', status: 'pending' },
  { index: 4, check: 'sandbox_tests_passed', status: 'pending' },
  { index: 5, check: 'human_operator_present', status: 'pending' },
  { index: 6, check: 'dry_run_completed_successfully', status: 'pending' },
  { index: 7, check: 'real_patch_execution_still_blocked', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_BARRIER_BLOCKED_INPUT'] };
  }
  if (!input.barrier_id || typeof input.barrier_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_BARRIER_BLOCKED_INPUT: missing barrier_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_BARRIER_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.plan_id || typeof input.plan_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_BARRIER_BLOCKED_INPUT: missing plan_id'] };
  }
  if (!input.plan_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['REAL_PATCH_BARRIER_BLOCKED_CONTRACT: plan not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['REAL_PATCH_BARRIER_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawChecks = Array.isArray(input.barrier_checks) && input.barrier_checks.length > 0 ? input.barrier_checks : DEFAULT_BARRIER_CHECKS;
  const barrier_checks = rawChecks.map((c, i) => ({
    index: i,
    check: typeof c === 'string' ? c : (c.check || `check_${i}`),
    status: 'pending',
  }));

  const bid = input.barrier_id;
  return {
    ...BASE,
    barrier_id: bid,
    contract_id: input.contract_id,
    plan_id: input.plan_id,
    barrier_checks,
    check_count: barrier_checks.length,
    barrier_ready: true,
    barrier_passed: false,
    barrier_hash: hash({ bid, contract_id: input.contract_id, plan_id: input.plan_id }),
    errors: [],
  };
}

export function validate(barrier) {
  if (!barrier || !barrier.barrier_id) {
    return { valid: false, errors: ['REAL_PATCH_BARRIER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (barrier.barrier_passed !== false) errors.push('barrier_passed must be false by default');
  if (barrier.release_allowed !== false) errors.push('release_allowed must be false');
  if (barrier.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (barrier.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (barrier.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (barrier.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (barrier.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (barrier.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(barrier) {
  if (!barrier || !barrier.barrier_id) {
    return 'REAL_PATCH_BARRIER_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Real Patch Execution Barrier ===\n`;
  out += `schema_version: ${barrier.schema_version}\n`;
  out += `barrier_id: ${barrier.barrier_id}\n`;
  out += `contract_id: ${barrier.contract_id}\n`;
  out += `plan_id: ${barrier.plan_id}\n`;
  out += `check_count: ${barrier.check_count}\n`;
  out += `barrier_ready: ${barrier.barrier_ready}\n`;
  out += `barrier_passed: ${barrier.barrier_passed}\n`;
  out += `release_allowed: ${barrier.release_allowed}\n`;
  out += `deploy_allowed: ${barrier.deploy_allowed}\n`;
  out += `real_execution_allowed: ${barrier.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${barrier.real_patch_execution_allowed}\n`;
  out += `production_touched: ${barrier.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
