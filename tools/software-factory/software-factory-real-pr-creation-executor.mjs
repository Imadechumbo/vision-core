import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_CREATION_EXECUTOR_STATUSES = [
  'REAL_PR_EXECUTOR_BLOCKED_INPUT',
  'REAL_PR_EXECUTOR_BLOCKED_APPROVAL',
  'REAL_PR_EXECUTOR_DRY_RUN_ONLY',
  'REAL_PR_EXECUTOR_READY',
];

const BASE = {
  schema_version: 'v260.0',
  executor_id: null,
  approval_gate_id: null,
  real_pr_creation_executor_ready: false,
  execution_mode: null,
  command_preview_valid: false,
  real_pr_created: false,
  executor_hash: null,
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
    return { ...BASE, errors: ['REAL_PR_EXECUTOR_BLOCKED_INPUT'] };
  }
  if (!input.executor_id || typeof input.executor_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_EXECUTOR_BLOCKED_INPUT: missing executor_id'] };
  }
  if (!input.approval_gate_id || typeof input.approval_gate_id !== 'string') {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_BLOCKED_INPUT: missing approval_gate_id'] };
  }
  if (!input.command_preview || typeof input.command_preview !== 'string') {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_BLOCKED_INPUT: missing command_preview'] };
  }
  if (!input.source_branch || typeof input.source_branch !== 'string') {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_BLOCKED_INPUT: missing source_branch'] };
  }
  if (!input.pr_title || typeof input.pr_title !== 'string') {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_BLOCKED_INPUT: missing pr_title'] };
  }
  if (input.real_pr_creation_approval_gate_ready !== true) {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_BLOCKED_APPROVAL: real_pr_creation_approval_gate_ready must be true'] };
  }
  if (input.execution_mode !== 'dry-run') {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_DRY_RUN_ONLY: execution_mode must be dry-run'] };
  }
  if (input.source_branch === 'main') {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_DRY_RUN_ONLY: source_branch cannot be main'] };
  }
  if (input.target_branch !== 'main') {
    return { ...BASE, executor_id: input.executor_id, errors: ['REAL_PR_EXECUTOR_DRY_RUN_ONLY: target_branch must be main'] };
  }

  const eid = input.executor_id;
  return {
    ...BASE,
    executor_id: eid,
    approval_gate_id: input.approval_gate_id,
    real_pr_creation_executor_ready: true,
    execution_mode: 'dry-run',
    command_preview_valid: true,
    executor_hash: hash({ eid, mode: 'dry-run', source: input.source_branch, target: input.target_branch }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr creation executor'] };
  }
  const errors = [];
  if (!result.executor_id) errors.push('missing executor_id');
  if (result.real_pr_creation_executor_ready && !result.executor_hash) errors.push('executor_hash required when ready');
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
    return 'REAL_PR_EXECUTOR_BLOCKED_INPUT';
  }
  const status = result.real_pr_creation_executor_ready ? 'REAL_PR_EXECUTOR_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_EXECUTOR_BLOCKED_APPROVAL'))
      ? 'REAL_PR_EXECUTOR_BLOCKED_APPROVAL' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PR_EXECUTOR_DRY_RUN_ONLY'))
        ? 'REAL_PR_EXECUTOR_DRY_RUN_ONLY' : 'REAL_PR_EXECUTOR_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `executor_id: ${result.executor_id || '(none)'}\n`;
  out += `approval_gate_id: ${result.approval_gate_id || '(none)'}\n`;
  out += `real_pr_creation_executor_ready: ${result.real_pr_creation_executor_ready}\n`;
  out += `execution_mode: ${result.execution_mode || '(none)'}\n`;
  out += `command_preview_valid: ${result.command_preview_valid}\n`;
  out += `real_pr_created: ${result.real_pr_created}\n`;
  if (result.executor_hash) out += `executor_hash: ${result.executor_hash}\n`;
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
