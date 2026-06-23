import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PR_COMMAND_CONTRACT_STATUSES = [
  'REAL_PR_COMMAND_BLOCKED_INPUT',
  'REAL_PR_COMMAND_BLOCKED_PHASE_GATE',
  'REAL_PR_COMMAND_DENIED',
  'REAL_PR_COMMAND_READY',
];

const BASE = {
  schema_version: 'v255.0',
  command_contract_id: null,
  status: null,
  real_pr_command_contract_ready: false,
  explicit_command_received: false,
  source_branch: null,
  target_branch: 'main',
  command_hash: null,
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
    return { ...BASE, errors: ['REAL_PR_COMMAND_BLOCKED_INPUT'] };
  }
  if (!input.command_contract_id || typeof input.command_contract_id !== 'string') {
    return { ...BASE, errors: ['REAL_PR_COMMAND_BLOCKED_INPUT: missing command_contract_id'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (!input.requested_by || typeof input.requested_by !== 'string') {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_BLOCKED_INPUT: missing requested_by'] };
  }
  if (!input.command_reason || typeof input.command_reason !== 'string') {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_BLOCKED_INPUT: missing command_reason'] };
  }
  if (!input.source_branch || typeof input.source_branch !== 'string') {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_BLOCKED_INPUT: missing source_branch'] };
  }
  if (!input.pr_title || typeof input.pr_title !== 'string') {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_BLOCKED_INPUT: missing pr_title'] };
  }
  if (input.pr_execution_phase_gate_ready !== true) {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_BLOCKED_PHASE_GATE: pr_execution_phase_gate_ready must be true'] };
  }
  if (input.explicit_v255_command !== true) {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_DENIED: explicit_v255_command must be true'] };
  }
  if (input.source_branch === 'main') {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_DENIED: source_branch cannot be main'] };
  }
  if (input.target_branch !== 'main') {
    return { ...BASE, command_contract_id: input.command_contract_id, errors: ['REAL_PR_COMMAND_DENIED: target_branch must be main'] };
  }

  const cid = input.command_contract_id;
  return {
    ...BASE,
    command_contract_id: cid,
    explicit_command_received: true,
    real_pr_command_contract_ready: true,
    source_branch: input.source_branch,
    target_branch: input.target_branch,
    command_hash: hash({ cid, source: input.source_branch, target: input.target_branch, title: input.pr_title, requested_by: input.requested_by }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real pr command contract'] };
  }
  const errors = [];
  if (!result.command_contract_id) errors.push('missing command_contract_id');
  if (result.real_pr_command_contract_ready && !result.command_hash) errors.push('command_hash required when ready');
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
    return 'REAL_PR_COMMAND_BLOCKED_INPUT';
  }
  const status = result.real_pr_command_contract_ready ? 'REAL_PR_COMMAND_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PR_COMMAND_DENIED'))
      ? 'REAL_PR_COMMAND_DENIED' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PR_COMMAND_BLOCKED_PHASE_GATE'))
        ? 'REAL_PR_COMMAND_BLOCKED_PHASE_GATE' : 'REAL_PR_COMMAND_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `command_contract_id: ${result.command_contract_id || '(none)'}\n`;
  out += `real_pr_command_contract_ready: ${result.real_pr_command_contract_ready}\n`;
  out += `explicit_command_received: ${result.explicit_command_received}\n`;
  out += `source_branch: ${result.source_branch || '(none)'}\n`;
  out += `target_branch: ${result.target_branch || '(none)'}\n`;
  if (result.command_hash) out += `command_hash: ${result.command_hash}\n`;
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
