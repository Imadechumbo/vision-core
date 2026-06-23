import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_PRE_STATE_SNAPSHOT_STATUSES = [
  'REAL_PATCH_PRESTATE_BLOCKED_INPUT',
  'REAL_PATCH_PRESTATE_BLOCKED_SCOPE',
  'REAL_PATCH_PRESTATE_FAIL',
  'REAL_PATCH_PRESTATE_READY',
];

const HASH_HEX_PATTERN = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v267.0',
  snapshot_id: null,
  real_patch_pre_state_snapshot_ready: false,
  files_count: 0,
  snapshot_hash: null,
  snapshot_level: 'metadata-only',
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
    return { ...BASE, errors: ['REAL_PATCH_PRESTATE_BLOCKED_INPUT'] };
  }
  if (!input.snapshot_id || typeof input.snapshot_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_PRESTATE_BLOCKED_INPUT: missing snapshot_id'] };
  }
  if (input.real_patch_scope_binder_ready !== true) {
    return { ...BASE, snapshot_id: input.snapshot_id, errors: ['REAL_PATCH_PRESTATE_BLOCKED_SCOPE: real_patch_scope_binder_ready must be true'] };
  }
  if (!Array.isArray(input.files) || input.files.length === 0) {
    return { ...BASE, snapshot_id: input.snapshot_id, errors: ['REAL_PATCH_PRESTATE_BLOCKED_SCOPE: files must be non-empty array'] };
  }

  for (let i = 0; i < input.files.length; i++) {
    const f = input.files[i];
    if (!f.path || typeof f.path !== 'string') {
      return { ...BASE, snapshot_id: input.snapshot_id, errors: [`REAL_PATCH_PRESTATE_FAIL: file ${i} missing path`] };
    }
    if (typeof f.exists !== 'boolean') {
      return { ...BASE, snapshot_id: input.snapshot_id, errors: [`REAL_PATCH_PRESTATE_FAIL: file ${i} exists must be boolean`] };
    }
    if (f.exists && !f.before_hash) {
      return { ...BASE, snapshot_id: input.snapshot_id, errors: [`REAL_PATCH_PRESTATE_FAIL: file ${i} exists=true but missing before_hash`] };
    }
    if (f.before_hash && !HASH_HEX_PATTERN.test(f.before_hash)) {
      return { ...BASE, snapshot_id: input.snapshot_id, errors: [`REAL_PATCH_PRESTATE_FAIL: file ${i} before_hash must be 64 hex chars`] };
    }
  }

  const sid = input.snapshot_id;
  const snapHash = hash({ snapshot_id: sid, files: input.files });

  return {
    ...BASE,
    snapshot_id: sid,
    real_patch_pre_state_snapshot_ready: true,
    files_count: input.files.length,
    snapshot_hash: snapHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch pre state snapshot'] };
  }
  const errors = [];
  if (!result.snapshot_id) errors.push('missing snapshot_id');
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
    return 'REAL_PATCH_PRESTATE_BLOCKED_INPUT';
  }
  const status = result.real_patch_pre_state_snapshot_ready ? 'REAL_PATCH_PRESTATE_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_PRESTATE_BLOCKED_SCOPE'))
      ? 'REAL_PATCH_PRESTATE_BLOCKED_SCOPE' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_PRESTATE_FAIL'))
        ? 'REAL_PATCH_PRESTATE_FAIL' : 'REAL_PATCH_PRESTATE_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `snapshot_id: ${result.snapshot_id || '(none)'}\n`;
  out += `real_patch_pre_state_snapshot_ready: ${result.real_patch_pre_state_snapshot_ready}\n`;
  out += `files_count: ${result.files_count}\n`;
  out += `snapshot_level: ${result.snapshot_level}\n`;
  if (result.snapshot_hash) out += `snapshot_hash: ${result.snapshot_hash}\n`;
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
