import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_EXECUTION_DRY_RUN_VERIFIER_STATUSES = [
  'PR_DRY_RUN_VERIFIER_BLOCKED_INPUT',
  'PR_DRY_RUN_VERIFIER_BLOCKED_SANDBOX',
  'PR_DRY_RUN_VERIFIER_FAIL',
  'PR_DRY_RUN_VERIFIER_READY',
];

const BASE = {
  schema_version: 'v248.0',
  verifier_id: null,
  sandbox_id: null,
  pr_execution_dry_run_verified: false,
  dry_run_valid: false,
  verifier_hash: null,
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
    return { ...BASE, errors: ['PR_DRY_RUN_VERIFIER_BLOCKED_INPUT'] };
  }
  if (!input.verifier_id || typeof input.verifier_id !== 'string') {
    return { ...BASE, errors: ['PR_DRY_RUN_VERIFIER_BLOCKED_INPUT: missing verifier_id'] };
  }
  if (!input.sandbox_id || typeof input.sandbox_id !== 'string') {
    return { ...BASE, errors: ['PR_DRY_RUN_VERIFIER_BLOCKED_INPUT: missing sandbox_id'] };
  }
  if (!input.dry_run_result || typeof input.dry_run_result !== 'object') {
    return { ...BASE, verifier_id: input.verifier_id, sandbox_id: input.sandbox_id, errors: ['PR_DRY_RUN_VERIFIER_BLOCKED_INPUT: missing dry_run_result'] };
  }
  if (input.pr_execution_sandbox_ready !== true) {
    return { ...BASE, verifier_id: input.verifier_id, sandbox_id: input.sandbox_id, errors: ['PR_DRY_RUN_VERIFIER_BLOCKED_SANDBOX: pr_execution_sandbox_ready must be true'] };
  }

  const dr = input.dry_run_result;
  const failErrors = [];

  if (dr.command_preview === undefined || dr.command_preview === null) {
    failErrors.push('dry_run_result missing command_preview');
  }
  if (dr.would_create_pr !== true) {
    failErrors.push('dry_run_result would_create_pr must be true');
  }
  if (dr.validation_passed !== true) {
    failErrors.push('dry_run_result validation_passed must be true');
  }
  if (dr.target_branch !== 'main') {
    failErrors.push('dry_run_result target_branch must be main');
  }
  if (!dr.source_branch || dr.source_branch === 'main') {
    failErrors.push('dry_run_result source_branch cannot be main');
  }

  if (failErrors.length > 0) {
    return {
      ...BASE,
      verifier_id: input.verifier_id,
      sandbox_id: input.sandbox_id,
      pr_execution_dry_run_verified: false,
      dry_run_valid: false,
      errors: ['PR_DRY_RUN_VERIFIER_FAIL: dry run validation failed', ...failErrors],
    };
  }

  const vid = input.verifier_id;
  return {
    ...BASE,
    verifier_id: vid,
    sandbox_id: input.sandbox_id,
    dry_run_result: {
      command_preview: dr.command_preview,
      would_create_pr: dr.would_create_pr,
      target_branch: dr.target_branch,
      source_branch: dr.source_branch,
      validation_passed: dr.validation_passed,
    },
    pr_execution_dry_run_verified: true,
    dry_run_valid: true,
    verifier_hash: hash({ vid, sandbox_id: input.sandbox_id, would_create_pr: dr.would_create_pr }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid pr execution dry run verifier'] };
  }
  const errors = [];
  if (!result.verifier_id) errors.push('missing verifier_id');
  if (result.pr_execution_dry_run_verified && !result.verifier_hash) errors.push('verifier_hash required when ready');
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
    return 'PR_DRY_RUN_VERIFIER_BLOCKED_INPUT';
  }
  const status = result.pr_execution_dry_run_verified ? 'PR_DRY_RUN_VERIFIER_READY' :
    result.errors && result.errors.some(e => e.startsWith('PR_DRY_RUN_VERIFIER_FAIL'))
      ? 'PR_DRY_RUN_VERIFIER_FAIL' :
    result.errors && result.errors.some(e => e.startsWith('PR_DRY_RUN_VERIFIER_BLOCKED_SANDBOX'))
      ? 'PR_DRY_RUN_VERIFIER_BLOCKED_SANDBOX' : 'PR_DRY_RUN_VERIFIER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `verifier_id: ${result.verifier_id || '(none)'}\n`;
  out += `sandbox_id: ${result.sandbox_id || '(none)'}\n`;
  out += `pr_execution_dry_run_verified: ${result.pr_execution_dry_run_verified}\n`;
  out += `dry_run_valid: ${result.dry_run_valid}\n`;
  if (result.verifier_hash) out += `verifier_hash: ${result.verifier_hash}\n`;
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
