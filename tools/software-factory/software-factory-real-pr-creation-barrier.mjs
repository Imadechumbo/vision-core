import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_CREATION_BARRIER_STATUSES = [
  'PR_CREATION_BARRIER_BLOCKED_INPUT',
  'PR_CREATION_BARRIER_BLOCKED_DRY_RUN',
  'PR_CREATION_BARRIER_DENIED',
  'PR_CREATION_BARRIER_READY',
];

const FINAL_MESSAGE = 'Real PR creation remains blocked until explicit V240 supervised PR creation drill command.';

const BASE = {
  schema_version: 'v239.0',
  barrier_id: null,
  dry_run_id: null,
  pr_creation_barrier_ready: false,
  next_phase_allowed: false,
  next_phase: 'V240_SUPERVISED_PR_CREATION_DRILL',
  final_message: FINAL_MESSAGE,
  barrier_hash: null,
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
    return { ...BASE, errors: ['PR_CREATION_BARRIER_BLOCKED_INPUT'] };
  }
  if (!input.barrier_id || typeof input.barrier_id !== 'string') {
    return { ...BASE, errors: ['PR_CREATION_BARRIER_BLOCKED_INPUT: missing barrier_id'] };
  }
  if (!input.dry_run_id || typeof input.dry_run_id !== 'string') {
    return { ...BASE, errors: ['PR_CREATION_BARRIER_BLOCKED_INPUT: missing dry_run_id'] };
  }
  if (!input.controlled_pr_dry_run_ready) {
    return { ...BASE, dry_run_id: input.dry_run_id, errors: ['PR_CREATION_BARRIER_BLOCKED_DRY_RUN: controlled_pr_dry_run not ready'] };
  }
  if (!input.pr_creation_requested) {
    return { ...BASE, barrier_id: input.barrier_id, dry_run_id: input.dry_run_id, final_message: FINAL_MESSAGE, errors: ['PR_CREATION_BARRIER_DENIED: pr_creation_requested is not true'] };
  }
  if (!input.pr_creation_authorized) {
    return { ...BASE, barrier_id: input.barrier_id, dry_run_id: input.dry_run_id, final_message: FINAL_MESSAGE, errors: ['PR_CREATION_BARRIER_DENIED: pr_creation_authorized is not true'] };
  }

  const bid = input.barrier_id;
  return {
    ...BASE,
    barrier_id: bid,
    dry_run_id: input.dry_run_id,
    pr_creation_barrier_ready: true,
    next_phase_allowed: true,
    next_phase: 'V240_SUPERVISED_PR_CREATION_DRILL',
    final_message: FINAL_MESSAGE,
    barrier_hash: hash({ bid, dry_run_id: input.dry_run_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.barrier_id) {
    return { valid: false, errors: ['PR_CREATION_BARRIER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || !result.barrier_id) {
    return `PR_CREATION_BARRIER_BLOCKED_INPUT\nREGRA ABSOLUTA: real_pr_creation_allowed=false production_touched=false\n${FINAL_MESSAGE}`;
  }
  let out = `=== Software Factory Real PR Creation Barrier ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `barrier_id: ${result.barrier_id}\n`;
  out += `pr_creation_barrier_ready: ${result.pr_creation_barrier_ready}\n`;
  out += `next_phase: ${result.next_phase}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `final_message: ${result.final_message}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
