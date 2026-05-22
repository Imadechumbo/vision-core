import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_EXECUTION_BARRIER_STATUSES = [
  'REAL_PR_EXEC_BARRIER_BLOCKED_INPUT',
  'REAL_PR_EXEC_BARRIER_BLOCKED_APPROVAL',
  'REAL_PR_EXEC_BARRIER_DENIED',
  'REAL_PR_EXEC_BARRIER_READY',
];

const FINAL_MESSAGE = 'Real PR execution remains blocked until explicit supervised execution drill.';
const NEXT_PHASE = 'V251_SUPERVISED_REAL_PR_EXECUTION_DRILL';

const BASE = {
  schema_version: 'v250.0',
  barrier_id: null,
  approval_id: null,
  real_pr_execution_barrier_ready: false,
  next_phase: NEXT_PHASE,
  final_message: FINAL_MESSAGE,
  barrier_hash: null,
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
    return { ...BASE, errors: ['REAL_PR_EXEC_BARRIER_BLOCKED_INPUT'] };
  }
  if (!input.barrier_id || typeof input.barrier_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_EXEC_BARRIER_BLOCKED_INPUT: missing barrier_id'] };
  }
  if (!input.approval_id || typeof input.approval_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_EXEC_BARRIER_BLOCKED_INPUT: missing approval_id'] };
  }
  if (!input.authority_reference || typeof input.authority_reference !== 'string') {
    return { ...BASE, barrier_id: input.barrier_id, approval_id: input.approval_id, errors: ['REAL_PR_EXEC_BARRIER_BLOCKED_INPUT: missing authority_reference'] };
  }
  if (input.pr_human_approval_gate_ready !== true) {
    return { ...BASE, barrier_id: input.barrier_id, approval_id: input.approval_id, errors: ['REAL_PR_EXEC_BARRIER_BLOCKED_APPROVAL: pr_human_approval_gate_ready must be true'] };
  }
  if (input.execution_requested !== true) {
    return { ...BASE, barrier_id: input.barrier_id, approval_id: input.approval_id, final_message: FINAL_MESSAGE, errors: ['REAL_PR_EXEC_BARRIER_DENIED: execution_requested is not true'] };
  }
  if (input.execution_authorized !== true) {
    return { ...BASE, barrier_id: input.barrier_id, approval_id: input.approval_id, final_message: FINAL_MESSAGE, errors: ['REAL_PR_EXEC_BARRIER_DENIED: execution_authorized is not true'] };
  }

  const bid = input.barrier_id;
  return {
    ...BASE,
    barrier_id: bid,
    approval_id: input.approval_id,
    authority_reference: input.authority_reference,
    real_pr_execution_barrier_ready: true,
    next_phase: NEXT_PHASE,
    final_message: FINAL_MESSAGE,
    barrier_hash: hash({ bid, approval_id: input.approval_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr execution barrier'] };
  }
  const errors = [];
  if (!result.barrier_id) errors.push('missing barrier_id');
  if (result.real_pr_execution_barrier_ready && !result.barrier_hash) errors.push('barrier_hash required when ready');
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
    return 'REAL_PR_EXEC_BARRIER_BLOCKED_INPUT';
  }
  const status = result.real_pr_execution_barrier_ready ? 'REAL_PR_EXEC_BARRIER_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_EXEC_BARRIER_DENIED'))
      ? 'REAL_PR_EXEC_BARRIER_DENIED' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_EXEC_BARRIER_BLOCKED_APPROVAL'))
      ? 'REAL_PR_EXEC_BARRIER_BLOCKED_APPROVAL' : 'REAL_PR_EXEC_BARRIER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `barrier_id: ${result.barrier_id || '(none)'}\n`;
  out += `approval_id: ${result.approval_id || '(none)'}\n`;
  out += `real_pr_execution_barrier_ready: ${result.real_pr_execution_barrier_ready}\n`;
  out += `next_phase: ${result.next_phase}\n`;
  out += `final_message: ${result.final_message}\n`;
  if (result.barrier_hash) out += `barrier_hash: ${result.barrier_hash}\n`;
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
