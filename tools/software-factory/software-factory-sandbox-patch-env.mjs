import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SANDBOX_PATCH_ENV_STATUSES = [
  'SANDBOX_PATCH_ENV_BLOCKED_INPUT',
  'SANDBOX_PATCH_ENV_BLOCKED_CONTRACT',
  'SANDBOX_PATCH_ENV_READY',
];

const BASE = {
  schema_version: 'v227.0',
  env_id: null,
  contract_id: null,
  binder_id: null,
  sandbox_vars: [],
  var_count: 0,
  env_ready: false,
  env_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_SANDBOX_VARS = [
  { index: 0, key: 'SANDBOX_MODE', value: 'true', locked: true },
  { index: 1, key: 'REAL_EXECUTION_ALLOWED', value: 'false', locked: true },
  { index: 2, key: 'PRODUCTION_TOUCHED', value: 'false', locked: true },
  { index: 3, key: 'PATCH_ENV', value: 'sandbox', locked: true },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SANDBOX_PATCH_ENV_BLOCKED_INPUT'] };
  }
  if (!input.env_id || typeof input.env_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_PATCH_ENV_BLOCKED_INPUT: missing env_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_PATCH_ENV_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.binder_id || typeof input.binder_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_PATCH_ENV_BLOCKED_INPUT: missing binder_id'] };
  }
  if (!input.binder_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SANDBOX_PATCH_ENV_BLOCKED_CONTRACT: binder not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SANDBOX_PATCH_ENV_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawVars = Array.isArray(input.sandbox_vars) && input.sandbox_vars.length > 0 ? input.sandbox_vars : DEFAULT_SANDBOX_VARS;
  const sandbox_vars = rawVars.map((v, i) => ({
    index: i,
    key: typeof v === 'string' ? v : (v.key || `VAR_${i}`),
    value: v.value !== undefined ? String(v.value) : 'unset',
    locked: v.locked !== undefined ? Boolean(v.locked) : false,
  }));

  const eid = input.env_id;
  return {
    ...BASE,
    env_id: eid,
    contract_id: input.contract_id,
    binder_id: input.binder_id,
    sandbox_vars,
    var_count: sandbox_vars.length,
    env_ready: true,
    env_hash: hash({ eid, contract_id: input.contract_id, binder_id: input.binder_id }),
    errors: [],
  };
}

export function validate(env) {
  if (!env || !env.env_id) {
    return { valid: false, errors: ['SANDBOX_PATCH_ENV_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (env.release_allowed !== false) errors.push('release_allowed must be false');
  if (env.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (env.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (env.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (env.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (env.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (env.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(env) {
  if (!env || !env.env_id) {
    return 'SANDBOX_PATCH_ENV_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Sandbox Patch Env ===\n`;
  out += `schema_version: ${env.schema_version}\n`;
  out += `env_id: ${env.env_id}\n`;
  out += `contract_id: ${env.contract_id}\n`;
  out += `binder_id: ${env.binder_id}\n`;
  out += `var_count: ${env.var_count}\n`;
  out += `env_ready: ${env.env_ready}\n`;
  out += `release_allowed: ${env.release_allowed}\n`;
  out += `deploy_allowed: ${env.deploy_allowed}\n`;
  out += `real_execution_allowed: ${env.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${env.real_patch_execution_allowed}\n`;
  out += `production_touched: ${env.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
