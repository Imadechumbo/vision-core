import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_COMMAND_BINDER_STATUSES = [
  'PR_COMMAND_BINDER_BLOCKED_INPUT',
  'PR_COMMAND_BINDER_BLOCKED_AUTHORITY',
  'PR_COMMAND_BINDER_READY',
];

const FORBIDDEN_WORDS = ['deploy', 'release', 'tag', 'stable', 'secret', '.env'];

const BASE = {
  schema_version: 'v246.0',
  binder_id: null,
  authority_id: null,
  pr_command_binder_ready: false,
  command_bound: false,
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
    return { ...BASE, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT'] };
  }
  if (!input.binder_id || typeof input.binder_id !== 'string') {
    return { ...BASE, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: missing binder_id'] };
  }
  if (!input.authority_id || typeof input.authority_id !== 'string') {
    return { ...BASE, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: missing authority_id'] };
  }
  if (!input.command_preview || typeof input.command_preview !== 'string') {
    return { ...BASE, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: missing command_preview'] };
  }
  if (!input.pr_title || typeof input.pr_title !== 'string') {
    return { ...BASE, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: missing pr_title'] };
  }
  if (!input.source_branch || typeof input.source_branch !== 'string') {
    return { ...BASE, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: missing source_branch'] };
  }
  if (input.real_pr_authority_contract_ready !== true) {
    return { ...BASE, binder_id: input.binder_id, authority_id: input.authority_id, errors: ['PR_COMMAND_BINDER_BLOCKED_AUTHORITY: real_pr_authority_contract_ready must be true'] };
  }
  if (input.command_type !== 'CREATE_PR') {
    return { ...BASE, binder_id: input.binder_id, authority_id: input.authority_id, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: command_type must be CREATE_PR'] };
  }
  if (input.target_branch !== 'main') {
    return { ...BASE, binder_id: input.binder_id, authority_id: input.authority_id, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: target_branch must be main'] };
  }
  if (input.source_branch === 'main') {
    return { ...BASE, binder_id: input.binder_id, authority_id: input.authority_id, errors: ['PR_COMMAND_BINDER_BLOCKED_INPUT: source_branch cannot be main'] };
  }
  for (const word of FORBIDDEN_WORDS) {
    if (input.command_preview.toLowerCase().includes(word)) {
      return { ...BASE, binder_id: input.binder_id, authority_id: input.authority_id, errors: [`PR_COMMAND_BINDER_BLOCKED_INPUT: command_preview contains forbidden word: ${word}`] };
    }
  }

  const bid = input.binder_id;
  return {
    ...BASE,
    binder_id: bid,
    authority_id: input.authority_id,
    command_type: input.command_type,
    command_preview: input.command_preview,
    target_branch: input.target_branch,
    source_branch: input.source_branch,
    pr_title: input.pr_title,
    pr_command_binder_ready: true,
    command_bound: true,
    command_hash: hash({ bid, authority_id: input.authority_id, command_preview: input.command_preview }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid pr command binder'] };
  }
  const errors = [];
  if (!result.binder_id) errors.push('missing binder_id');
  if (result.pr_command_binder_ready && !result.command_hash) errors.push('command_hash required when ready');
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
    return 'PR_COMMAND_BINDER_BLOCKED_INPUT';
  }
  const status = result.pr_command_binder_ready ? 'PR_COMMAND_BINDER_READY' :
    result.errors && result.errors.some(e => e.startsWith('PR_COMMAND_BINDER_BLOCKED_AUTHORITY'))
      ? 'PR_COMMAND_BINDER_BLOCKED_AUTHORITY' : 'PR_COMMAND_BINDER_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `binder_id: ${result.binder_id || '(none)'}\n`;
  out += `authority_id: ${result.authority_id || '(none)'}\n`;
  out += `pr_command_binder_ready: ${result.pr_command_binder_ready}\n`;
  out += `command_bound: ${result.command_bound}\n`;
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
