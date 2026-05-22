import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_EXECUTION_SANDBOX_STATUSES = [
  'PR_EXEC_SANDBOX_BLOCKED_INPUT',
  'PR_EXEC_SANDBOX_BLOCKED_BINDER',
  'PR_EXEC_SANDBOX_READY',
];

const REQUIRED_ISOLATION_RULES = [
  'no_real_github_write',
  'no_real_pr_create',
  'no_deploy',
  'no_release',
  'no_tag',
  'no_stable',
];

const BASE = {
  schema_version: 'v247.0',
  sandbox_id: null,
  binder_id: null,
  pr_execution_sandbox_ready: false,
  isolation_active: false,
  sandbox_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_pr_created: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PR_EXEC_SANDBOX_BLOCKED_INPUT'] };
  }
  if (!input.sandbox_id || typeof input.sandbox_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_SANDBOX_BLOCKED_INPUT: missing sandbox_id'] };
  }
  if (!input.binder_id || typeof input.binder_id !== 'string') {
    return { ...BASE, errors: ['PR_EXEC_SANDBOX_BLOCKED_INPUT: missing binder_id'] };
  }
  if (!Array.isArray(input.isolation_rules)) {
    return { ...BASE, errors: ['PR_EXEC_SANDBOX_BLOCKED_INPUT: isolation_rules must be an array'] };
  }
  if (input.pr_command_binder_ready !== true) {
    return { ...BASE, sandbox_id: input.sandbox_id, binder_id: input.binder_id, errors: ['PR_EXEC_SANDBOX_BLOCKED_BINDER: pr_command_binder_ready must be true'] };
  }
  if (input.sandbox_mode !== 'dry-run') {
    return { ...BASE, sandbox_id: input.sandbox_id, binder_id: input.binder_id, errors: ['PR_EXEC_SANDBOX_BLOCKED_INPUT: sandbox_mode must be dry-run'] };
  }
  const missingRules = [];
  for (const rule of REQUIRED_ISOLATION_RULES) {
    if (!input.isolation_rules.includes(rule)) {
      missingRules.push(rule);
    }
  }
  if (missingRules.length > 0) {
    return { ...BASE, sandbox_id: input.sandbox_id, binder_id: input.binder_id, errors: [`PR_EXEC_SANDBOX_BLOCKED_INPUT: missing isolation rules: ${missingRules.join(', ')}`] };
  }

  const sid = input.sandbox_id;
  return {
    ...BASE,
    sandbox_id: sid,
    binder_id: input.binder_id,
    sandbox_mode: input.sandbox_mode,
    isolation_rules: input.isolation_rules,
    pr_execution_sandbox_ready: true,
    isolation_active: true,
    sandbox_hash: hash({ sid, binder_id: input.binder_id, isolation_rules: input.isolation_rules }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid pr execution sandbox'] };
  }
  const errors = [];
  if (!result.sandbox_id) errors.push('missing sandbox_id');
  if (result.pr_execution_sandbox_ready && !result.sandbox_hash) errors.push('sandbox_hash required when ready');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_pr_created !== false) errors.push('real_pr_created must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'PR_EXEC_SANDBOX_BLOCKED_INPUT';
  }
  const status = result.pr_execution_sandbox_ready ? 'PR_EXEC_SANDBOX_READY' :
    result.errors && result.errors.some(e => e.startsWith('PR_EXEC_SANDBOX_BLOCKED_BINDER'))
      ? 'PR_EXEC_SANDBOX_BLOCKED_BINDER' : 'PR_EXEC_SANDBOX_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `sandbox_id: ${result.sandbox_id || '(none)'}\n`;
  out += `binder_id: ${result.binder_id || '(none)'}\n`;
  out += `pr_execution_sandbox_ready: ${result.pr_execution_sandbox_ready}\n`;
  out += `isolation_active: ${result.isolation_active}\n`;
  if (result.sandbox_hash) out += `sandbox_hash: ${result.sandbox_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_pr_created: ${result.real_pr_created}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
