import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ORCHESTRATOR_STATUSES = [
  'ORCHESTRATOR_BLOCKED_INPUT',
  'ORCHESTRATOR_BLOCKED_CONTRACT',
  'ORCHESTRATOR_READY',
];

const BASE = {
  schema_version: 'v218.0',
  orchestrator_id: null,
  contract_id: null,
  pipeline_stages: [],
  stage_count: 0,
  orchestrator_ready: false,
  orchestrator_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_STAGES = [
  'contract', 'scope', 'recipe', 'build', 'verify', 'prompt', 'todos', 'agents', 'policy',
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['ORCHESTRATOR_BLOCKED_INPUT'] };
  }
  if (!input.orchestrator_id || typeof input.orchestrator_id !== 'string') {
    return { ...BASE, errors: ['ORCHESTRATOR_BLOCKED_INPUT: missing orchestrator_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['ORCHESTRATOR_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.report_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['ORCHESTRATOR_BLOCKED_CONTRACT: report not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['ORCHESTRATOR_BLOCKED_CONTRACT: scope not validated'] };
  }

  const pipeline_stages = Array.isArray(input.pipeline_stages) && input.pipeline_stages.length > 0
    ? input.pipeline_stages.map((s, i) => ({ index: i, name: typeof s === 'string' ? s : s.name, status: 'pending' }))
    : DEFAULT_STAGES.map((s, i) => ({ index: i, name: s, status: 'pending' }));

  const oid = input.orchestrator_id;
  return {
    ...BASE,
    orchestrator_id: oid,
    contract_id: input.contract_id,
    pipeline_stages,
    stage_count: pipeline_stages.length,
    orchestrator_ready: true,
    orchestrator_hash: hash({ oid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(orchestrator) {
  if (!orchestrator || !orchestrator.orchestrator_id) {
    return { valid: false, errors: ['ORCHESTRATOR_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (orchestrator.release_allowed !== false) errors.push('release_allowed must be false');
  if (orchestrator.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (orchestrator.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(orchestrator) {
  if (!orchestrator || !orchestrator.orchestrator_id) {
    return 'ORCHESTRATOR_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Orchestrator ===\n`;
  out += `schema_version: ${orchestrator.schema_version}\n`;
  out += `orchestrator_id: ${orchestrator.orchestrator_id}\n`;
  out += `contract_id: ${orchestrator.contract_id}\n`;
  out += `stage_count: ${orchestrator.stage_count}\n`;
  out += `orchestrator_ready: ${orchestrator.orchestrator_ready}\n`;
  out += `release_allowed: ${orchestrator.release_allowed}\n`;
  out += `deploy_allowed: ${orchestrator.deploy_allowed}\n`;
  out += `real_execution_allowed: ${orchestrator.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
