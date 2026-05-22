import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_BRANCH_BINDER_STATUSES = [
  'REAL_PR_BRANCH_BINDER_BLOCKED_INPUT',
  'REAL_PR_BRANCH_BINDER_BLOCKED_PREFLIGHT',
  'REAL_PR_BRANCH_BINDER_FAIL',
  'REAL_PR_BRANCH_BINDER_READY',
];

const BASE = {
  schema_version: 'v257.0',
  branch_binder_id: null,
  preflight_id: null,
  real_pr_branch_binder_ready: false,
  branch_binding_valid: false,
  source_branch: null,
  target_branch: 'main',
  branch_hash: null,
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
    return { ...BASE, errors: ['REAL_PR_BRANCH_BINDER_BLOCKED_INPUT'] };
  }
  if (!input.branch_binder_id || typeof input.branch_binder_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_BRANCH_BINDER_BLOCKED_INPUT: missing branch_binder_id'] };
  }
  if (!input.preflight_id || typeof input.preflight_id !== 'string') {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_BLOCKED_INPUT: missing preflight_id'] };
  }
  if (!input.source_branch || typeof input.source_branch !== 'string') {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_BLOCKED_INPUT: missing source_branch'] };
  }
  if (!input.base_commit || typeof input.base_commit !== 'string') {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_BLOCKED_INPUT: missing base_commit'] };
  }
  if (!input.head_commit || typeof input.head_commit !== 'string') {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_BLOCKED_INPUT: missing head_commit'] };
  }
  if (input.github_pr_safety_preflight_ready !== true) {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_BLOCKED_PREFLIGHT: github_pr_safety_preflight_ready must be true'] };
  }
  if (input.source_branch === 'main') {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_FAIL: source_branch cannot be main'] };
  }
  if (input.target_branch !== 'main') {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_FAIL: target_branch must be main'] };
  }
  if (input.base_commit === input.head_commit) {
    return { ...BASE, branch_binder_id: input.branch_binder_id, errors: ['REAL_PR_BRANCH_BINDER_FAIL: base_commit cannot equal head_commit'] };
  }

  const bid = input.branch_binder_id;
  return {
    ...BASE,
    branch_binder_id: bid,
    preflight_id: input.preflight_id,
    real_pr_branch_binder_ready: true,
    branch_binding_valid: true,
    source_branch: input.source_branch,
    target_branch: input.target_branch,
    branch_hash: hash({ bid, source: input.source_branch, target: input.target_branch, base: input.base_commit, head: input.head_commit }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr branch binder'] };
  }
  const errors = [];
  if (!result.branch_binder_id) errors.push('missing branch_binder_id');
  if (result.real_pr_branch_binder_ready && !result.branch_hash) errors.push('branch_hash required when ready');
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
    return 'REAL_PR_BRANCH_BINDER_BLOCKED_INPUT';
  }
  const status = result.real_pr_branch_binder_ready ? 'REAL_PR_BRANCH_BINDER_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_BRANCH_BINDER_BLOCKED_PREFLIGHT'))
      ? 'REAL_PR_BRANCH_BINDER_BLOCKED_PREFLIGHT' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PR_BRANCH_BINDER_FAIL'))
        ? 'REAL_PR_BRANCH_BINDER_FAIL' : 'REAL_PR_BRANCH_BINDER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `branch_binder_id: ${result.branch_binder_id || '(none)'}\n`;
  out += `preflight_id: ${result.preflight_id || '(none)'}\n`;
  out += `real_pr_branch_binder_ready: ${result.real_pr_branch_binder_ready}\n`;
  out += `branch_binding_valid: ${result.branch_binding_valid}\n`;
  out += `source_branch: ${result.source_branch || '(none)'}\n`;
  out += `target_branch: ${result.target_branch || '(none)'}\n`;
  if (result.branch_hash) out += `branch_hash: ${result.branch_hash}\n`;
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
