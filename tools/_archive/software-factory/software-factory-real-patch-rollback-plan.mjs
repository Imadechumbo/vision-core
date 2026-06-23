import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_PLAN_STATUSES = [
  'REAL_PATCH_ROLLBACK_PLAN_BLOCKED_INPUT',
  'REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE',
  'REAL_PATCH_ROLLBACK_PLAN_FAIL',
  'REAL_PATCH_ROLLBACK_PLAN_READY',
];

const DENIED_TARGET_PATTERNS = ['.env', 'secrets', '.github/workflows', 'deploy', 'production'];

const BASE = {
  schema_version: 'v271.0',
  rollback_plan_id: null,
  real_patch_rollback_plan_ready: false,
  rollback_steps_count: 0,
  rollback_plan_hash: null,
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

function isDeniedPath(p) {
  return DENIED_TARGET_PATTERNS.some(pattern => p.includes(pattern));
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_ROLLBACK_PLAN_BLOCKED_INPUT'] };
  }
  if (!input.rollback_plan_id || typeof input.rollback_plan_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_ROLLBACK_PLAN_BLOCKED_INPUT: missing rollback_plan_id'] };
  }
  if (input.real_patch_test_lane_ready !== true) {
    return { ...BASE, rollback_plan_id: input.rollback_plan_id, errors: ['REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE: test lane must be ready'] };
  }
  if (!Array.isArray(input.rollback_steps) || input.rollback_steps.length === 0) {
    return { ...BASE, rollback_plan_id: input.rollback_plan_id, errors: ['REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE: rollback_steps required and non-empty'] };
  }
  if (!input.snapshot_reference || typeof input.snapshot_reference !== 'string') {
    return { ...BASE, rollback_plan_id: input.rollback_plan_id, errors: ['REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE: snapshot_reference required'] };
  }

  const failErrors = [];
  for (const step of input.rollback_steps) {
    if (!step.step_id || typeof step.step_id !== 'string') {
      failErrors.push('REAL_PATCH_ROLLBACK_PLAN_FAIL: step missing step_id');
      continue;
    }
    if (!step.action_preview || typeof step.action_preview !== 'string') {
      failErrors.push(`REAL_PATCH_ROLLBACK_PLAN_FAIL: step ${step.step_id} missing action_preview`);
      continue;
    }
    if (!step.target_path || typeof step.target_path !== 'string') {
      failErrors.push(`REAL_PATCH_ROLLBACK_PLAN_FAIL: step ${step.step_id} missing target_path`);
      continue;
    }
    if (isDeniedPath(step.target_path)) {
      failErrors.push(`REAL_PATCH_ROLLBACK_PLAN_FAIL: step ${step.step_id} target_path denied: ${step.target_path}`);
    }
  }

  if (failErrors.length > 0) {
    return { ...BASE, rollback_plan_id: input.rollback_plan_id, errors: failErrors };
  }

  const planHash = hash({ rollback_plan_id: input.rollback_plan_id, rollback_steps: input.rollback_steps, snapshot_reference: input.snapshot_reference });

  return {
    ...BASE,
    rollback_plan_id: input.rollback_plan_id,
    real_patch_rollback_plan_ready: true,
    rollback_steps_count: input.rollback_steps.length,
    rollback_plan_hash: planHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch rollback plan'] };
  }
  const errors = [];
  if (!result.rollback_plan_id) errors.push('missing rollback_plan_id');
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
    return 'REAL_PATCH_ROLLBACK_PLAN_BLOCKED_INPUT';
  }
  let status;
  if (result.real_patch_rollback_plan_ready) {
    status = 'REAL_PATCH_ROLLBACK_PLAN_READY';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE'))) {
    status = 'REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_ROLLBACK_PLAN_FAIL'))) {
    status = 'REAL_PATCH_ROLLBACK_PLAN_FAIL';
  } else {
    status = 'REAL_PATCH_ROLLBACK_PLAN_BLOCKED_INPUT';
  }

  let out = `=== ${status} ===\n`;
  out += `rollback_plan_id: ${result.rollback_plan_id || '(none)'}\n`;
  out += `real_patch_rollback_plan_ready: ${result.real_patch_rollback_plan_ready}\n`;
  out += `rollback_steps_count: ${result.rollback_steps_count}\n`;
  if (result.rollback_plan_hash) out += `rollback_plan_hash: ${result.rollback_plan_hash}\n`;
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
