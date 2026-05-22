import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_SCOPE_BINDER_STATUSES = [
  'REAL_PATCH_SCOPE_BINDER_BLOCKED_INPUT',
  'REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND',
  'REAL_PATCH_SCOPE_BINDER_FAIL',
  'REAL_PATCH_SCOPE_BINDER_READY',
];

const DEFAULT_DENIED_PATHS = [
  '.env',
  '.github/workflows',
  'secrets',
  'deploy',
  'production',
];

const BASE = {
  schema_version: 'v266.0',
  scope_binder_id: null,
  real_patch_scope_binder_ready: false,
  scope_valid: false,
  requested_files_count: 0,
  scope_hash: null,
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

function isUnderAllowed(path, allowedPaths) {
  return allowedPaths.some(a => path.startsWith(a) || path === a);
}

function matchesDenied(path, deniedPaths) {
  return deniedPaths.some(d => path.includes(d));
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_SCOPE_BINDER_BLOCKED_INPUT'] };
  }
  if (!input.scope_binder_id || typeof input.scope_binder_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_SCOPE_BINDER_BLOCKED_INPUT: missing scope_binder_id'] };
  }
  if (input.real_patch_command_contract_ready !== true) {
    return { ...BASE, scope_binder_id: input.scope_binder_id, errors: ['REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND: real_patch_command_contract_ready must be true'] };
  }
  if (!Array.isArray(input.allowed_paths) || input.allowed_paths.length === 0) {
    return { ...BASE, scope_binder_id: input.scope_binder_id, errors: ['REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND: allowed_paths must be non-empty array'] };
  }
  if (!Array.isArray(input.requested_files) || input.requested_files.length === 0) {
    return { ...BASE, scope_binder_id: input.scope_binder_id, errors: ['REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND: requested_files must be non-empty array'] };
  }

  const deniedPaths = input.denied_paths && Array.isArray(input.denied_paths)
    ? input.denied_paths : DEFAULT_DENIED_PATHS;

  const deniedHits = input.requested_files.filter(
    f => matchesDenied(f, deniedPaths)
  );

  if (deniedHits.length > 0) {
    return {
      ...BASE,
      scope_binder_id: input.scope_binder_id,
      real_patch_scope_binder_ready: false,
      scope_valid: false,
      requested_files_count: input.requested_files.length,
      errors: [`REAL_PATCH_SCOPE_BINDER_FAIL: denied paths matched: ${deniedHits.join(', ')}`],
    };
  }

  const outOfScope = input.requested_files.filter(
    f => !isUnderAllowed(f, input.allowed_paths)
  );

  if (outOfScope.length > 0) {
    return {
      ...BASE,
      scope_binder_id: input.scope_binder_id,
      real_patch_scope_binder_ready: false,
      scope_valid: false,
      requested_files_count: input.requested_files.length,
      errors: [`REAL_PATCH_SCOPE_BINDER_FAIL: out-of-scope files: ${outOfScope.join(', ')}`],
    };
  }

  const sid = input.scope_binder_id;
  const scopeHash = hash({ sid, allowed: input.allowed_paths, requested: input.requested_files });

  return {
    ...BASE,
    scope_binder_id: sid,
    real_patch_scope_binder_ready: true,
    scope_valid: true,
    requested_files_count: input.requested_files.length,
    scope_hash: scopeHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch scope binder'] };
  }
  const errors = [];
  if (!result.scope_binder_id) errors.push('missing scope_binder_id');
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
    return 'REAL_PATCH_SCOPE_BINDER_BLOCKED_INPUT';
  }
  const status = result.real_patch_scope_binder_ready ? 'REAL_PATCH_SCOPE_BINDER_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND'))
      ? 'REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_SCOPE_BINDER_FAIL'))
        ? 'REAL_PATCH_SCOPE_BINDER_FAIL' : 'REAL_PATCH_SCOPE_BINDER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `scope_binder_id: ${result.scope_binder_id || '(none)'}\n`;
  out += `real_patch_scope_binder_ready: ${result.real_patch_scope_binder_ready}\n`;
  out += `scope_valid: ${result.scope_valid}\n`;
  out += `requested_files_count: ${result.requested_files_count}\n`;
  if (result.scope_hash) out += `scope_hash: ${result.scope_hash}\n`;
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
