import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_FORK_MANAGER_STATUSES = [
  'FORK_MANAGER_BLOCKED_INPUT',
  'FORK_MANAGER_BLOCKED_CONTRACT',
  'FORK_MANAGER_READY',
];

const BASE = {
  schema_version: 'v211.0',
  fork_manager_id: null,
  contract_id: null,
  forks: [],
  fork_count: 0,
  fork_manager_ready: false,
  fork_manager_hash: null,
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
    return { ...BASE, errors: ['FORK_MANAGER_BLOCKED_INPUT'] };
  }
  if (!input.fork_manager_id || typeof input.fork_manager_id !== 'string') {
    return { ...BASE, errors: ['FORK_MANAGER_BLOCKED_INPUT: missing fork_manager_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['FORK_MANAGER_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.manager_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['FORK_MANAGER_BLOCKED_CONTRACT: manager not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['FORK_MANAGER_BLOCKED_CONTRACT: scope not validated'] };
  }

  const forks = Array.isArray(input.forks) && input.forks.length > 0
    ? input.forks.map((f, i) => ({
        index: i,
        name: typeof f === 'string' ? f : f.name,
        branch: typeof f === 'object' && f.branch ? f.branch : `fork-branch-${i}`,
        status: 'pending',
      }))
    : [
        { index: 0, name: 'fork-main', branch: 'fork-branch-0', status: 'pending' },
      ];

  const fid = input.fork_manager_id;
  return {
    ...BASE,
    fork_manager_id: fid,
    contract_id: input.contract_id,
    forks,
    fork_count: forks.length,
    fork_manager_ready: true,
    fork_manager_hash: hash({ fid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(manager) {
  if (!manager || !manager.fork_manager_id) {
    return { valid: false, errors: ['FORK_MANAGER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (manager.release_allowed !== false) errors.push('release_allowed must be false');
  if (manager.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (manager.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(manager) {
  if (!manager || !manager.fork_manager_id) {
    return 'FORK_MANAGER_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Fork Manager ===\n`;
  out += `schema_version: ${manager.schema_version}\n`;
  out += `fork_manager_id: ${manager.fork_manager_id}\n`;
  out += `contract_id: ${manager.contract_id}\n`;
  out += `fork_count: ${manager.fork_count}\n`;
  out += `fork_manager_ready: ${manager.fork_manager_ready}\n`;
  out += `release_allowed: ${manager.release_allowed}\n`;
  out += `deploy_allowed: ${manager.deploy_allowed}\n`;
  out += `real_execution_allowed: ${manager.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
