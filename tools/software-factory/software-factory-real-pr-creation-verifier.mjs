import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_CREATION_VERIFIER_STATUSES = [
  'REAL_PR_VERIFIER_BLOCKED_INPUT',
  'REAL_PR_VERIFIER_BLOCKED_EXECUTOR',
  'REAL_PR_VERIFIER_FAIL',
  'REAL_PR_VERIFIER_READY',
];

const BASE = {
  schema_version: 'v261.0',
  verifier_id: null,
  executor_id: null,
  real_pr_creation_verifier_ready: false,
  dry_run_verified: false,
  real_pr_created: false,
  github_write_performed: false,
  verifier_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PR_VERIFIER_BLOCKED_INPUT'] };
  }
  if (!input.verifier_id || typeof input.verifier_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_VERIFIER_BLOCKED_INPUT: missing verifier_id'] };
  }
  if (!input.executor_id || typeof input.executor_id !== 'string') {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_BLOCKED_INPUT: missing executor_id'] };
  }
  if (!input.observed_result || typeof input.observed_result !== 'object') {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_BLOCKED_INPUT: missing observed_result'] };
  }
  if (input.real_pr_creation_executor_ready !== true) {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_BLOCKED_EXECUTOR: real_pr_creation_executor_ready must be true'] };
  }
  if (input.executor_mode !== 'dry-run') {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_BLOCKED_EXECUTOR: executor_mode must be dry-run'] };
  }

  const obs = input.observed_result;
  if (obs.real_pr_created !== false) {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_FAIL: real_pr_created must be false'] };
  }
  if (obs.pr_number !== null) {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_FAIL: pr_number must be null'] };
  }
  if (obs.pr_url !== null) {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_FAIL: pr_url must be null'] };
  }
  if (obs.dry_run_confirmed !== true) {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_FAIL: dry_run_confirmed must be true'] };
  }
  if (obs.github_write_performed !== false) {
    return { ...BASE, verifier_id: input.verifier_id, errors: ['REAL_PR_VERIFIER_FAIL: github_write_performed must be false'] };
  }

  const vid = input.verifier_id;
  return {
    ...BASE,
    verifier_id: vid,
    executor_id: input.executor_id,
    real_pr_creation_verifier_ready: true,
    dry_run_verified: true,
    verifier_hash: hash({ vid, executor_id: input.executor_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr creation verifier'] };
  }
  const errors = [];
  if (!result.verifier_id) errors.push('missing verifier_id');
  if (result.real_pr_creation_verifier_ready && !result.verifier_hash) errors.push('verifier_hash required when ready');
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
    return 'REAL_PR_VERIFIER_BLOCKED_INPUT';
  }
  const status = result.real_pr_creation_verifier_ready ? 'REAL_PR_VERIFIER_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_VERIFIER_BLOCKED_EXECUTOR'))
      ? 'REAL_PR_VERIFIER_BLOCKED_EXECUTOR' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PR_VERIFIER_FAIL'))
        ? 'REAL_PR_VERIFIER_FAIL' : 'REAL_PR_VERIFIER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `verifier_id: ${result.verifier_id || '(none)'}\n`;
  out += `executor_id: ${result.executor_id || '(none)'}\n`;
  out += `real_pr_creation_verifier_ready: ${result.real_pr_creation_verifier_ready}\n`;
  out += `dry_run_verified: ${result.dry_run_verified}\n`;
  out += `real_pr_created: ${result.real_pr_created}\n`;
  out += `github_write_performed: ${result.github_write_performed}\n`;
  if (result.verifier_hash) out += `verifier_hash: ${result.verifier_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
