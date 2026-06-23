import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CONTROLLED_PATCH_PLAN_STATUSES = [
  'CONTROLLED_PATCH_PLAN_BLOCKED_INPUT',
  'CONTROLLED_PATCH_PLAN_BLOCKED_CONTRACT',
  'CONTROLLED_PATCH_PLAN_READY',
];

const BASE = {
  schema_version: 'v231.0',
  plan_id: null,
  contract_id: null,
  gate_id: null,
  plan_steps: [],
  step_count: 0,
  plan_ready: false,
  plan_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_PLAN_STEPS = [
  { index: 0, step: 'validate_approval_gate', mode: 'controlled', status: 'pending' },
  { index: 1, step: 'prepare_patch_environment', mode: 'controlled', status: 'pending' },
  { index: 2, step: 'verify_scope_confinement', mode: 'controlled', status: 'pending' },
  { index: 3, step: 'apply_patch_dry_run', mode: 'controlled', status: 'pending' },
  { index: 4, step: 'run_post_patch_tests', mode: 'controlled', status: 'pending' },
  { index: 5, step: 'collect_evidence', mode: 'controlled', status: 'pending' },
  { index: 6, step: 'await_human_confirmation', mode: 'controlled', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['CONTROLLED_PATCH_PLAN_BLOCKED_INPUT'] };
  }
  if (!input.plan_id || typeof input.plan_id !== 'string') {
    return { ...BASE, errors: ['CONTROLLED_PATCH_PLAN_BLOCKED_INPUT: missing plan_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['CONTROLLED_PATCH_PLAN_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.gate_id || typeof input.gate_id !== 'string') {
    return { ...BASE, errors: ['CONTROLLED_PATCH_PLAN_BLOCKED_INPUT: missing gate_id'] };
  }
  if (!input.gate_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['CONTROLLED_PATCH_PLAN_BLOCKED_CONTRACT: gate not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['CONTROLLED_PATCH_PLAN_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawSteps = Array.isArray(input.plan_steps) && input.plan_steps.length > 0 ? input.plan_steps : DEFAULT_PLAN_STEPS;
  const plan_steps = rawSteps.map((s, i) => ({
    index: i,
    step: typeof s === 'string' ? s : (s.step || `step_${i}`),
    mode: s.mode || 'controlled',
    status: 'pending',
  }));

  const pid = input.plan_id;
  return {
    ...BASE,
    plan_id: pid,
    contract_id: input.contract_id,
    gate_id: input.gate_id,
    plan_steps,
    step_count: plan_steps.length,
    plan_ready: true,
    plan_hash: hash({ pid, contract_id: input.contract_id, gate_id: input.gate_id }),
    errors: [],
  };
}

export function validate(plan) {
  if (!plan || !plan.plan_id) {
    return { valid: false, errors: ['CONTROLLED_PATCH_PLAN_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (plan.release_allowed !== false) errors.push('release_allowed must be false');
  if (plan.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (plan.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (plan.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (plan.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (plan.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (plan.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(plan) {
  if (!plan || !plan.plan_id) {
    return 'CONTROLLED_PATCH_PLAN_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Controlled Patch Plan ===\n`;
  out += `schema_version: ${plan.schema_version}\n`;
  out += `plan_id: ${plan.plan_id}\n`;
  out += `contract_id: ${plan.contract_id}\n`;
  out += `gate_id: ${plan.gate_id}\n`;
  out += `step_count: ${plan.step_count}\n`;
  out += `plan_ready: ${plan.plan_ready}\n`;
  out += `release_allowed: ${plan.release_allowed}\n`;
  out += `deploy_allowed: ${plan.deploy_allowed}\n`;
  out += `real_execution_allowed: ${plan.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${plan.real_patch_execution_allowed}\n`;
  out += `production_touched: ${plan.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
