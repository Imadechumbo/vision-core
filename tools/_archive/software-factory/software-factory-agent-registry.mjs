import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_AGENT_REGISTRY_STATUSES = [
  'AGENT_REGISTRY_BLOCKED_INPUT',
  'AGENT_REGISTRY_BLOCKED_CONTRACT',
  'AGENT_REGISTRY_READY',
];

const BASE = {
  schema_version: 'v208.0',
  registry_id: null,
  contract_id: null,
  agents: [],
  agent_count: 0,
  registry_ready: false,
  registry_hash: null,
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
    return { ...BASE, errors: ['AGENT_REGISTRY_BLOCKED_INPUT'] };
  }
  if (!input.registry_id || typeof input.registry_id !== 'string') {
    return { ...BASE, errors: ['AGENT_REGISTRY_BLOCKED_INPUT: missing registry_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['AGENT_REGISTRY_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.plan_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['AGENT_REGISTRY_BLOCKED_CONTRACT: plan not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['AGENT_REGISTRY_BLOCKED_CONTRACT: scope not validated'] };
  }

  const agents = Array.isArray(input.agents) && input.agents.length > 0
    ? input.agents.map((a, i) => ({
        index: i,
        name: typeof a === 'string' ? a : a.name,
        role: typeof a === 'object' && a.role ? a.role : 'worker',
        status: 'registered',
      }))
    : [
        { index: 0, name: 'scope-agent', role: 'inspector', status: 'registered' },
        { index: 1, name: 'build-agent', role: 'builder', status: 'registered' },
        { index: 2, name: 'verify-agent', role: 'verifier', status: 'registered' },
      ];

  const rid = input.registry_id;
  return {
    ...BASE,
    registry_id: rid,
    contract_id: input.contract_id,
    agents,
    agent_count: agents.length,
    registry_ready: true,
    registry_hash: hash({ rid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(registry) {
  if (!registry || !registry.registry_id) {
    return { valid: false, errors: ['AGENT_REGISTRY_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (registry.release_allowed !== false) errors.push('release_allowed must be false');
  if (registry.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (registry.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(registry) {
  if (!registry || !registry.registry_id) {
    return 'AGENT_REGISTRY_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Agent Registry ===\n`;
  out += `schema_version: ${registry.schema_version}\n`;
  out += `registry_id: ${registry.registry_id}\n`;
  out += `contract_id: ${registry.contract_id}\n`;
  out += `agent_count: ${registry.agent_count}\n`;
  out += `registry_ready: ${registry.registry_ready}\n`;
  out += `release_allowed: ${registry.release_allowed}\n`;
  out += `deploy_allowed: ${registry.deploy_allowed}\n`;
  out += `real_execution_allowed: ${registry.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
