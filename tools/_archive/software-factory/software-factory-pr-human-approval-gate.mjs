import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_HUMAN_APPROVAL_GATE_STATUSES = [
  'PR_HUMAN_APPROVAL_BLOCKED_INPUT',
  'PR_HUMAN_APPROVAL_BLOCKED_VERIFIER',
  'PR_HUMAN_APPROVAL_DENIED',
  'PR_HUMAN_APPROVAL_READY',
];

const BASE = {
  schema_version: 'v249.0',
  approval_id: null,
  verifier_id: null,
  pr_human_approval_gate_ready: false,
  human_approved: false,
  approval_hash: null,
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
    return { ...BASE, errors: ['PR_HUMAN_APPROVAL_BLOCKED_INPUT'] };
  }
  if (!input.approval_id || typeof input.approval_id !== 'string') {
    return { ...BASE, errors: ['PR_HUMAN_APPROVAL_BLOCKED_INPUT: missing approval_id'] };
  }
  if (!input.verifier_id || typeof input.verifier_id !== 'string') {
    return { ...BASE, errors: ['PR_HUMAN_APPROVAL_BLOCKED_INPUT: missing verifier_id'] };
  }
  if (!input.approver_id || typeof input.approver_id !== 'string') {
    return { ...BASE, errors: ['PR_HUMAN_APPROVAL_BLOCKED_INPUT: missing approver_id'] };
  }
  if (!input.approval_reason || typeof input.approval_reason !== 'string') {
    return { ...BASE, errors: ['PR_HUMAN_APPROVAL_BLOCKED_INPUT: missing approval_reason'] };
  }
  if (input.pr_execution_dry_run_verified !== true) {
    return { ...BASE, approval_id: input.approval_id, verifier_id: input.verifier_id, errors: ['PR_HUMAN_APPROVAL_BLOCKED_VERIFIER: pr_execution_dry_run_verified must be true'] };
  }
  if (input.human_approval !== 'granted') {
    return { ...BASE, approval_id: input.approval_id, verifier_id: input.verifier_id, errors: ['PR_HUMAN_APPROVAL_DENIED: human_approval must be granted'] };
  }

  const aid = input.approval_id;
  return {
    ...BASE,
    approval_id: aid,
    verifier_id: input.verifier_id,
    approver_id: input.approver_id,
    approval_reason: input.approval_reason,
    pr_human_approval_gate_ready: true,
    human_approved: true,
    approval_hash: hash({ aid, verifier_id: input.verifier_id, approver_id: input.approver_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid pr human approval gate'] };
  }
  const errors = [];
  if (!result.approval_id) errors.push('missing approval_id');
  if (result.pr_human_approval_gate_ready && !result.approval_hash) errors.push('approval_hash required when ready');
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
    return 'PR_HUMAN_APPROVAL_BLOCKED_INPUT';
  }
  const status = result.pr_human_approval_gate_ready ? 'PR_HUMAN_APPROVAL_READY' :
    result.errors && result.errors.some(e => e.startsWith('PR_HUMAN_APPROVAL_DENIED'))
      ? 'PR_HUMAN_APPROVAL_DENIED' :
    result.errors && result.errors.some(e => e.startsWith('PR_HUMAN_APPROVAL_BLOCKED_VERIFIER'))
      ? 'PR_HUMAN_APPROVAL_BLOCKED_VERIFIER' : 'PR_HUMAN_APPROVAL_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `approval_id: ${result.approval_id || '(none)'}\n`;
  out += `verifier_id: ${result.verifier_id || '(none)'}\n`;
  out += `pr_human_approval_gate_ready: ${result.pr_human_approval_gate_ready}\n`;
  out += `human_approved: ${result.human_approved}\n`;
  if (result.approval_hash) out += `approval_hash: ${result.approval_hash}\n`;
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
