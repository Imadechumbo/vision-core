import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_TOOL_POLICY_STATUSES = [
  'TOOL_POLICY_BLOCKED_INPUT',
  'TOOL_POLICY_BLOCKED_CONTRACT',
  'TOOL_POLICY_READY',
];

const BASE = {
  schema_version: 'v209.0',
  policy_id: null,
  contract_id: null,
  allowed_tools: [],
  forbidden_tools: [],
  tool_count: 0,
  policy_ready: false,
  policy_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_ALLOWED = ['Read', 'Write', 'Edit', 'Grep', 'Glob'];
const DEFAULT_FORBIDDEN = ['Bash', 'PowerShell', 'WebFetch', 'WebSearch'];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['TOOL_POLICY_BLOCKED_INPUT'] };
  }
  if (!input.policy_id || typeof input.policy_id !== 'string') {
    return { ...BASE, errors: ['TOOL_POLICY_BLOCKED_INPUT: missing policy_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['TOOL_POLICY_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.registry_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['TOOL_POLICY_BLOCKED_CONTRACT: registry not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['TOOL_POLICY_BLOCKED_CONTRACT: scope not validated'] };
  }

  const allowed = Array.isArray(input.allowed_tools) && input.allowed_tools.length > 0
    ? input.allowed_tools
    : DEFAULT_ALLOWED;
  const forbidden = Array.isArray(input.forbidden_tools) && input.forbidden_tools.length > 0
    ? input.forbidden_tools
    : DEFAULT_FORBIDDEN;

  const pid = input.policy_id;
  return {
    ...BASE,
    policy_id: pid,
    contract_id: input.contract_id,
    allowed_tools: allowed,
    forbidden_tools: forbidden,
    tool_count: allowed.length,
    policy_ready: true,
    policy_hash: hash({ pid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(policy) {
  if (!policy || !policy.policy_id) {
    return { valid: false, errors: ['TOOL_POLICY_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (policy.release_allowed !== false) errors.push('release_allowed must be false');
  if (policy.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (policy.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(policy) {
  if (!policy || !policy.policy_id) {
    return 'TOOL_POLICY_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Tool Policy ===\n`;
  out += `schema_version: ${policy.schema_version}\n`;
  out += `policy_id: ${policy.policy_id}\n`;
  out += `contract_id: ${policy.contract_id}\n`;
  out += `tool_count: ${policy.tool_count}\n`;
  out += `policy_ready: ${policy.policy_ready}\n`;
  out += `release_allowed: ${policy.release_allowed}\n`;
  out += `deploy_allowed: ${policy.deploy_allowed}\n`;
  out += `real_execution_allowed: ${policy.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
