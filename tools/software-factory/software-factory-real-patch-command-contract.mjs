import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_COMMAND_CONTRACT_STATUSES = [
  'REAL_PATCH_COMMAND_BLOCKED_INPUT',
  'REAL_PATCH_COMMAND_BLOCKED_PHASE_GATE',
  'REAL_PATCH_COMMAND_DENIED',
  'REAL_PATCH_COMMAND_READY',
];

const FORBIDDEN_FILE_PATTERNS = [
  '.env',
  'secrets',
  '.github/workflows',
  'deploy',
  'production',
];

const BASE = {
  schema_version: 'v265.0',
  patch_command_id: null,
  real_patch_command_contract_ready: false,
  explicit_command_received: false,
  target_files_count: 0,
  command_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  real_patch_applied: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function containsForbiddenPattern(file) {
  return FORBIDDEN_FILE_PATTERNS.some(p => file.includes(p));
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_COMMAND_BLOCKED_INPUT'] };
  }
  if (!input.patch_command_id || typeof input.patch_command_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_COMMAND_BLOCKED_INPUT: missing patch_command_id'] };
  }
  if (input.controlled_real_pr_execution_phase_gate_ready !== true) {
    return { ...BASE, patch_command_id: input.patch_command_id, errors: ['REAL_PATCH_COMMAND_BLOCKED_PHASE_GATE: V264 phase gate must be ready'] };
  }
  if (input.explicit_v265_command !== true) {
    return { ...BASE, patch_command_id: input.patch_command_id, errors: ['REAL_PATCH_COMMAND_DENIED: explicit_v265_command must be true'] };
  }
  if (!input.requested_by || typeof input.requested_by !== 'string') {
    return { ...BASE, patch_command_id: input.patch_command_id, errors: ['REAL_PATCH_COMMAND_DENIED: missing requested_by'] };
  }
  if (!input.patch_reason || typeof input.patch_reason !== 'string') {
    return { ...BASE, patch_command_id: input.patch_command_id, errors: ['REAL_PATCH_COMMAND_DENIED: missing patch_reason'] };
  }
  if (!input.patch_scope || typeof input.patch_scope !== 'string') {
    return { ...BASE, patch_command_id: input.patch_command_id, errors: ['REAL_PATCH_COMMAND_DENIED: missing patch_scope'] };
  }
  if (!Array.isArray(input.target_files) || input.target_files.length === 0) {
    return { ...BASE, patch_command_id: input.patch_command_id, errors: ['REAL_PATCH_COMMAND_DENIED: target_files must be non-empty array'] };
  }

  const forbidden = input.target_files.filter(f => containsForbiddenPattern(f));
  if (forbidden.length > 0) {
    return { ...BASE, patch_command_id: input.patch_command_id, errors: [`REAL_PATCH_COMMAND_DENIED: forbidden files in target: ${forbidden.join(', ')}`] };
  }

  const cid = input.patch_command_id;
  const cmdHash = hash({ cid, target_files: input.target_files, requested_by: input.requested_by });

  return {
    ...BASE,
    patch_command_id: cid,
    real_patch_command_contract_ready: true,
    explicit_command_received: true,
    target_files_count: input.target_files.length,
    command_hash: cmdHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch command contract'] };
  }
  const errors = [];
  if (!result.patch_command_id) errors.push('missing patch_command_id');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'REAL_PATCH_COMMAND_BLOCKED_INPUT';
  }
  const status = result.real_patch_command_contract_ready ? 'REAL_PATCH_COMMAND_READY' :
    result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_COMMAND_BLOCKED_PHASE_GATE'))
      ? 'REAL_PATCH_COMMAND_BLOCKED_PHASE_GATE' :
      result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_COMMAND_DENIED'))
        ? 'REAL_PATCH_COMMAND_DENIED' : 'REAL_PATCH_COMMAND_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `patch_command_id: ${result.patch_command_id || '(none)'}\n`;
  out += `real_patch_command_contract_ready: ${result.real_patch_command_contract_ready}\n`;
  out += `explicit_command_received: ${result.explicit_command_received}\n`;
  out += `target_files_count: ${result.target_files_count}\n`;
  if (result.command_hash) out += `command_hash: ${result.command_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `real_patch_applied: ${result.real_patch_applied}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
