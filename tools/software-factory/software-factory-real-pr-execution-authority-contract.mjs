import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_EXECUTION_AUTHORITY_CONTRACT_STATUSES = [
  'REAL_PR_AUTHORITY_BLOCKED_INPUT',
  'REAL_PR_AUTHORITY_BLOCKED_PHASE_GATE',
  'REAL_PR_AUTHORITY_DENIED',
  'REAL_PR_AUTHORITY_READY',
];

const BASE = {
  schema_version: 'v245.0',
  authority_id: null,
  phase_gate_id: null,
  real_pr_authority_contract_ready: false,
  explicit_command_received: false,
  authority_hash: null,
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
    return { ...BASE, errors: ['REAL_PR_AUTHORITY_BLOCKED_INPUT'] };
  }
  if (!input.authority_id || typeof input.authority_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_AUTHORITY_BLOCKED_INPUT: missing authority_id'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_AUTHORITY_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (!input.requested_by || typeof input.requested_by !== 'string') {
    return { ...BASE, errors: ['REAL_PR_AUTHORITY_BLOCKED_INPUT: missing requested_by'] };
  }
  if (!input.authority_reason || typeof input.authority_reason !== 'string') {
    return { ...BASE, errors: ['REAL_PR_AUTHORITY_BLOCKED_INPUT: missing authority_reason'] };
  }
  if (!input.real_pr_scope || typeof input.real_pr_scope !== 'string') {
    return { ...BASE, errors: ['REAL_PR_AUTHORITY_BLOCKED_INPUT: missing real_pr_scope'] };
  }
  if (input.pr_creation_phase_gate_ready !== true) {
    return { ...BASE, authority_id: input.authority_id, phase_gate_id: input.phase_gate_id, errors: ['REAL_PR_AUTHORITY_BLOCKED_PHASE_GATE: pr_creation_phase_gate_ready must be true'] };
  }
  if (input.explicit_v245_command !== true) {
    return { ...BASE, authority_id: input.authority_id, phase_gate_id: input.phase_gate_id, errors: ['REAL_PR_AUTHORITY_DENIED: explicit_v245_command is not true'] };
  }

  const aid = input.authority_id;
  return {
    ...BASE,
    authority_id: aid,
    phase_gate_id: input.phase_gate_id,
    requested_by: input.requested_by,
    authority_reason: input.authority_reason,
    real_pr_scope: input.real_pr_scope,
    real_pr_authority_contract_ready: true,
    explicit_command_received: true,
    authority_hash: hash({ aid, phase_gate_id: input.phase_gate_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr execution authority contract'] };
  }
  const errors = [];
  if (!result.authority_id) errors.push('missing authority_id');
  if (result.real_pr_authority_contract_ready && !result.authority_hash) errors.push('authority_hash required when ready');
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
    return 'REAL_PR_AUTHORITY_BLOCKED_INPUT';
  }
  const status = result.real_pr_authority_contract_ready ? 'REAL_PR_AUTHORITY_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_AUTHORITY_DENIED'))
      ? 'REAL_PR_AUTHORITY_DENIED' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_AUTHORITY_BLOCKED_PHASE_GATE'))
      ? 'REAL_PR_AUTHORITY_BLOCKED_PHASE_GATE' : 'REAL_PR_AUTHORITY_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `authority_id: ${result.authority_id || '(none)'}\n`;
  out += `phase_gate_id: ${result.phase_gate_id || '(none)'}\n`;
  out += `real_pr_authority_contract_ready: ${result.real_pr_authority_contract_ready}\n`;
  out += `explicit_command_received: ${result.explicit_command_received}\n`;
  if (result.authority_hash) out += `authority_hash: ${result.authority_hash}\n`;
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
