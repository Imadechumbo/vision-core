import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_DRILL_STATUSES = [
  'REAL_PATCH_ROLLBACK_DRILL_BLOCKED_INPUT',
  'REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN',
  'REAL_PATCH_ROLLBACK_DRILL_FAIL',
  'REAL_PATCH_ROLLBACK_DRILL_READY',
];

const BASE = {
  schema_version: 'v272.0',
  rollback_drill_id: null,
  real_patch_rollback_drill_ready: false,
  drill_mode: null,
  rollback_drill_hash: null,
  rollback_executed: false,
  files_restored: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  real_patch_applied: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_ROLLBACK_DRILL_BLOCKED_INPUT'] };
  }
  if (!input.rollback_drill_id || typeof input.rollback_drill_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_ROLLBACK_DRILL_BLOCKED_INPUT: missing rollback_drill_id'] };
  }
  if (input.real_patch_rollback_plan_ready !== true) {
    return { ...BASE, rollback_drill_id: input.rollback_drill_id, errors: ['REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN: rollback plan must be ready'] };
  }
  if (input.drill_mode !== 'dry-run') {
    return { ...BASE, rollback_drill_id: input.rollback_drill_id, errors: ['REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN: drill_mode must be dry-run'] };
  }
  if (!input.drill_result || typeof input.drill_result !== 'object') {
    return { ...BASE, rollback_drill_id: input.rollback_drill_id, errors: ['REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN: drill_result required'] };
  }

  const dr = input.drill_result;

  if (dr.simulated !== true) {
    return { ...BASE, rollback_drill_id: input.rollback_drill_id, errors: ['REAL_PATCH_ROLLBACK_DRILL_FAIL: drill_result.simulated must be true'] };
  }
  if (dr.rollback_executed !== false) {
    return { ...BASE, rollback_drill_id: input.rollback_drill_id, errors: ['REAL_PATCH_ROLLBACK_DRILL_FAIL: drill_result.rollback_executed must be false'] };
  }
  if (dr.files_restored !== false) {
    return { ...BASE, rollback_drill_id: input.rollback_drill_id, errors: ['REAL_PATCH_ROLLBACK_DRILL_FAIL: drill_result.files_restored must be false'] };
  }
  if (dr.validation_passed !== true) {
    return { ...BASE, rollback_drill_id: input.rollback_drill_id, errors: ['REAL_PATCH_ROLLBACK_DRILL_FAIL: drill_result.validation_passed must be true'] };
  }

  const drillHash = hash({ rollback_drill_id: input.rollback_drill_id, rollback_plan_id: input.rollback_plan_id, drill_mode: input.drill_mode, drill_result: dr });

  return {
    ...BASE,
    rollback_drill_id: input.rollback_drill_id,
    real_patch_rollback_drill_ready: true,
    drill_mode: 'dry-run',
    rollback_drill_hash: drillHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch rollback drill'] };
  }
  const errors = [];
  if (!result.rollback_drill_id) errors.push('missing rollback_drill_id');
  if (result.rollback_executed !== false) errors.push('rollback_executed must be false');
  if (result.files_restored !== false) errors.push('files_restored must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'REAL_PATCH_ROLLBACK_DRILL_BLOCKED_INPUT';
  }
  let status;
  if (result.real_patch_rollback_drill_ready) {
    status = 'REAL_PATCH_ROLLBACK_DRILL_READY';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN'))) {
    status = 'REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_ROLLBACK_DRILL_FAIL'))) {
    status = 'REAL_PATCH_ROLLBACK_DRILL_FAIL';
  } else {
    status = 'REAL_PATCH_ROLLBACK_DRILL_BLOCKED_INPUT';
  }

  let out = `=== ${status} ===\n`;
  out += `rollback_drill_id: ${result.rollback_drill_id || '(none)'}\n`;
  out += `real_patch_rollback_drill_ready: ${result.real_patch_rollback_drill_ready}\n`;
  out += `drill_mode: ${result.drill_mode || '(none)'}\n`;
  if (result.rollback_drill_hash) out += `rollback_drill_hash: ${result.rollback_drill_hash}\n`;
  out += `rollback_executed: ${result.rollback_executed}\n`;
  out += `files_restored: ${result.files_restored}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `real_patch_applied: ${result.real_patch_applied}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
