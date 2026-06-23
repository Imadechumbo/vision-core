import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_LOOP_ENGINE_STATUSES = [
  'LOOP_ENGINE_BLOCKED_INPUT',
  'LOOP_ENGINE_BLOCKED_CONTRACT',
  'LOOP_ENGINE_READY',
];

const BASE = {
  schema_version: 'v212.0',
  engine_id: null,
  contract_id: null,
  loop_steps: [],
  loop_count: 0,
  engine_ready: false,
  engine_hash: null,
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
    return { ...BASE, errors: ['LOOP_ENGINE_BLOCKED_INPUT'] };
  }
  if (!input.engine_id || typeof input.engine_id !== 'string') {
    return { ...BASE, errors: ['LOOP_ENGINE_BLOCKED_INPUT: missing engine_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['LOOP_ENGINE_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.fork_manager_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['LOOP_ENGINE_BLOCKED_CONTRACT: fork_manager not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['LOOP_ENGINE_BLOCKED_CONTRACT: scope not validated'] };
  }

  const loop_steps = Array.isArray(input.loop_steps) && input.loop_steps.length > 0
    ? input.loop_steps.map((s, i) => ({ index: i, step: typeof s === 'string' ? s : s.step, status: 'pending' }))
    : [
        { index: 0, step: 'init', status: 'pending' },
        { index: 1, step: 'execute', status: 'pending' },
        { index: 2, step: 'verify', status: 'pending' },
      ];

  const eid = input.engine_id;
  return {
    ...BASE,
    engine_id: eid,
    contract_id: input.contract_id,
    loop_steps,
    loop_count: loop_steps.length,
    engine_ready: true,
    engine_hash: hash({ eid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(engine) {
  if (!engine || !engine.engine_id) {
    return { valid: false, errors: ['LOOP_ENGINE_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (engine.release_allowed !== false) errors.push('release_allowed must be false');
  if (engine.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (engine.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(engine) {
  if (!engine || !engine.engine_id) {
    return 'LOOP_ENGINE_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Loop Engine ===\n`;
  out += `schema_version: ${engine.schema_version}\n`;
  out += `engine_id: ${engine.engine_id}\n`;
  out += `contract_id: ${engine.contract_id}\n`;
  out += `loop_count: ${engine.loop_count}\n`;
  out += `engine_ready: ${engine.engine_ready}\n`;
  out += `release_allowed: ${engine.release_allowed}\n`;
  out += `deploy_allowed: ${engine.deploy_allowed}\n`;
  out += `real_execution_allowed: ${engine.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
