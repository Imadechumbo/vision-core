import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_APPLY_CONTROLLER_STATUSES = [
  'REAL_PATCH_APPLY_CONTROLLER_BLOCKED_INPUT',
  'REAL_PATCH_APPLY_CONTROLLER_BLOCKED_SNAPSHOT',
  'REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY',
  'REAL_PATCH_APPLY_CONTROLLER_READY',
];

const BASE = {
  schema_version: 'v268.0',
  apply_controller_id: null,
  real_patch_apply_controller_ready: false,
  apply_mode: null,
  patch_preview_valid: false,
  controller_hash: null,
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
    return { ...BASE, errors: ['REAL_PATCH_APPLY_CONTROLLER_BLOCKED_INPUT'] };
  }
  if (!input.apply_controller_id || typeof input.apply_controller_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_APPLY_CONTROLLER_BLOCKED_INPUT: missing apply_controller_id'] };
  }
  if (input.real_patch_pre_state_snapshot_ready !== true) {
    return { ...BASE, apply_controller_id: input.apply_controller_id, errors: ['REAL_PATCH_APPLY_CONTROLLER_BLOCKED_SNAPSHOT: pre-state snapshot must be ready'] };
  }
  if (input.apply_mode !== 'dry-run') {
    return { ...BASE, apply_controller_id: input.apply_controller_id, errors: ['REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY: apply_mode must be dry-run'] };
  }
  if (!input.patch_plan || typeof input.patch_plan !== 'string') {
    return { ...BASE, apply_controller_id: input.apply_controller_id, errors: ['REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY: missing patch_plan'] };
  }
  if (!input.patch_preview || typeof input.patch_preview !== 'string') {
    return { ...BASE, apply_controller_id: input.apply_controller_id, errors: ['REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY: missing patch_preview'] };
  }

  const aid = input.apply_controller_id;
  const ctrlHash = hash({ aid, patch_plan: input.patch_plan, patch_preview: input.patch_preview });

  return {
    ...BASE,
    apply_controller_id: aid,
    real_patch_apply_controller_ready: true,
    apply_mode: 'dry-run',
    patch_preview_valid: true,
    controller_hash: ctrlHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch apply controller'] };
  }
  const errors = [];
  if (!result.apply_controller_id) errors.push('missing apply_controller_id');
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
    return 'REAL_PATCH_APPLY_CONTROLLER_BLOCKED_INPUT';
  }
  const status = result.real_patch_apply_controller_ready ? 'REAL_PATCH_APPLY_CONTROLLER_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_APPLY_CONTROLLER_BLOCKED_SNAPSHOT'))
      ? 'REAL_PATCH_APPLY_CONTROLLER_BLOCKED_SNAPSHOT' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY'))
        ? 'REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY' : 'REAL_PATCH_APPLY_CONTROLLER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `apply_controller_id: ${result.apply_controller_id || '(none)'}\n`;
  out += `real_patch_apply_controller_ready: ${result.real_patch_apply_controller_ready}\n`;
  out += `apply_mode: ${result.apply_mode || '(none)'}\n`;
  out += `patch_preview_valid: ${result.patch_preview_valid}\n`;
  if (result.controller_hash) out += `controller_hash: ${result.controller_hash}\n`;
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
