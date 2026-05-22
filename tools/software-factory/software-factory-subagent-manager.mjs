import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SUBAGENT_MANAGER_STATUSES = [
  'SUBAGENT_MANAGER_BLOCKED_INPUT',
  'SUBAGENT_MANAGER_BLOCKED_CONTRACT',
  'SUBAGENT_MANAGER_READY',
];

const BASE = {
  schema_version: 'v210.0',
  manager_id: null,
  contract_id: null,
  subagents: [],
  subagent_count: 0,
  manager_ready: false,
  manager_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SUBAGENT_MANAGER_BLOCKED_INPUT'] };
  }
  if (!input.manager_id || typeof input.manager_id !== 'string') {
    return { ...BASE, errors: ['SUBAGENT_MANAGER_BLOCKED_INPUT: missing manager_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['SUBAGENT_MANAGER_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.policy_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SUBAGENT_MANAGER_BLOCKED_CONTRACT: policy not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SUBAGENT_MANAGER_BLOCKED_CONTRACT: scope not validated'] };
  }

  const subagents = Array.isArray(input.subagents) && input.subagents.length > 0
    ? input.subagents.map((s, i) => ({
        index: i,
        name: typeof s === 'string' ? s : s.name,
        type: typeof s === 'object' && s.type ? s.type : 'worker',
        status: 'idle',
      }))
    : [
        { index: 0, name: 'subagent-alpha', type: 'worker', status: 'idle' },
        { index: 1, name: 'subagent-beta', type: 'reviewer', status: 'idle' },
      ];

  const mid = input.manager_id;
  return {
    ...BASE,
    manager_id: mid,
    contract_id: input.contract_id,
    subagents,
    subagent_count: subagents.length,
    manager_ready: true,
    manager_hash: hash({ mid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(manager) {
  if (!manager || !manager.manager_id) {
    return { valid: false, errors: ['SUBAGENT_MANAGER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (manager.release_allowed !== false) errors.push('release_allowed must be false');
  if (manager.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (manager.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(manager) {
  if (!manager || !manager.manager_id) {
    return 'SUBAGENT_MANAGER_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Subagent Manager ===\n`;
  out += `schema_version: ${manager.schema_version}\n`;
  out += `manager_id: ${manager.manager_id}\n`;
  out += `contract_id: ${manager.contract_id}\n`;
  out += `subagent_count: ${manager.subagent_count}\n`;
  out += `manager_ready: ${manager.manager_ready}\n`;
  out += `release_allowed: ${manager.release_allowed}\n`;
  out += `deploy_allowed: ${manager.deploy_allowed}\n`;
  out += `real_execution_allowed: ${manager.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
