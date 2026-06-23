import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_CREATION_APPROVAL_GATE_STATUSES = [
  'REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT',
  'REAL_PR_CREATION_APPROVAL_BLOCKED_BODY',
  'REAL_PR_CREATION_APPROVAL_DENIED',
  'REAL_PR_CREATION_APPROVAL_READY',
];

const BASE = {
  schema_version: 'v259.0',
  approval_gate_id: null,
  body_binder_id: null,
  real_pr_creation_approval_gate_ready: false,
  human_approved: false,
  explicit_creation_authority_received: false,
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
    return { ...BASE, errors: ['REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT'] };
  }
  if (!input.approval_gate_id || typeof input.approval_gate_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT: missing approval_gate_id'] };
  }
  if (!input.body_binder_id || typeof input.body_binder_id !== 'string') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT: missing body_binder_id'] };
  }
  if (!input.approver_id || typeof input.approver_id !== 'string') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT: missing approver_id'] };
  }
  if (!input.approval_reason || typeof input.approval_reason !== 'string') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT: missing approval_reason'] };
  }
  if (input.real_pr_body_evidence_binder_ready !== true) {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['REAL_PR_CREATION_APPROVAL_BLOCKED_BODY: real_pr_body_evidence_binder_ready must be true'] };
  }
  if (input.human_approval !== 'granted') {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['REAL_PR_CREATION_APPROVAL_DENIED: human_approval must be granted'] };
  }
  if (input.explicit_creation_authority !== true) {
    return { ...BASE, approval_gate_id: input.approval_gate_id, errors: ['REAL_PR_CREATION_APPROVAL_DENIED: explicit_creation_authority must be true'] };
  }

  const aid = input.approval_gate_id;
  return {
    ...BASE,
    approval_gate_id: aid,
    body_binder_id: input.body_binder_id,
    real_pr_creation_approval_gate_ready: true,
    human_approved: true,
    explicit_creation_authority_received: true,
    approval_hash: hash({ aid, body_binder_id: input.body_binder_id, approved_by: input.approver_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr creation approval gate'] };
  }
  const errors = [];
  if (!result.approval_gate_id) errors.push('missing approval_gate_id');
  if (result.real_pr_creation_approval_gate_ready && !result.approval_hash) errors.push('approval_hash required when ready');
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
    return 'REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT';
  }
  const status = result.real_pr_creation_approval_gate_ready ? 'REAL_PR_CREATION_APPROVAL_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_CREATION_APPROVAL_BLOCKED_BODY'))
      ? 'REAL_PR_CREATION_APPROVAL_BLOCKED_BODY' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PR_CREATION_APPROVAL_DENIED'))
        ? 'REAL_PR_CREATION_APPROVAL_DENIED' : 'REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `approval_gate_id: ${result.approval_gate_id || '(none)'}\n`;
  out += `body_binder_id: ${result.body_binder_id || '(none)'}\n`;
  out += `real_pr_creation_approval_gate_ready: ${result.real_pr_creation_approval_gate_ready}\n`;
  out += `human_approved: ${result.human_approved}\n`;
  out += `explicit_creation_authority_received: ${result.explicit_creation_authority_received}\n`;
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
