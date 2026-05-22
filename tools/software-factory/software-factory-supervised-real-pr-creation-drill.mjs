import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SUPERVISED_REAL_PR_CREATION_DRILL_STATUSES = [
  'SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT',
  'SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_PHASE_GATE',
  'SUPERVISED_REAL_PR_CREATION_DRILL_SIMULATED',
  'SUPERVISED_REAL_PR_CREATION_DRILL_READY',
];

const BASE = {
  schema_version: 'v253.0',
  drill_id: null,
  phase_gate_id: null,
  phase_gate_ready: false,
  pr_simulation_performed: false,
  supervised_pr_creation_drill_ready: false,
  drill_hash: null,
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
    return { ...BASE, errors: ['SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') {
    return { ...BASE, drill_id: input.drill_id, errors: ['SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT: missing phase_gate_id'] };
  }
  if (!input.pr_data || typeof input.pr_data !== 'object') {
    return { ...BASE, drill_id: input.drill_id, phase_gate_id: input.phase_gate_id, errors: ['SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT: missing pr_data'] };
  }
  if (!input.simulated_result || typeof input.simulated_result !== 'string') {
    return { ...BASE, drill_id: input.drill_id, phase_gate_id: input.phase_gate_id, errors: ['SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT: missing simulated_result'] };
  }
  if (input.real_pr_exec_phase_gate_ready !== true) {
    return { ...BASE, drill_id: input.drill_id, phase_gate_id: input.phase_gate_id, errors: ['SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_PHASE_GATE: real_pr_exec_phase_gate_ready must be true'] };
  }

  const did = input.drill_id;
  return {
    ...BASE,
    drill_id: did,
    phase_gate_id: input.phase_gate_id,
    phase_gate_ready: true,
    pr_simulation_performed: true,
    supervised_pr_creation_drill_ready: true,
    drill_hash: hash({ did, phase_gate_id: input.phase_gate_id, pr_data: input.pr_data }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid supervised real pr creation drill'] };
  }
  const errors = [];
  if (!result.drill_id) errors.push('missing drill_id');
  if (result.supervised_pr_creation_drill_ready && !result.drill_hash) errors.push('drill_hash required when ready');
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
    return 'SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT';
  }
  const status = result.supervised_pr_creation_drill_ready ? 'SUPERVISED_REAL_PR_CREATION_DRILL_READY' :
    result.errors && result.errors.some(e => e.startsWith('SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_PHASE_GATE'))
      ? 'SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_PHASE_GATE' : 'SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `drill_id: ${result.drill_id || '(none)'}\n`;
  out += `phase_gate_id: ${result.phase_gate_id || '(none)'}\n`;
  out += `phase_gate_ready: ${result.phase_gate_ready}\n`;
  out += `pr_simulation_performed: ${result.pr_simulation_performed}\n`;
  out += `supervised_pr_creation_drill_ready: ${result.supervised_pr_creation_drill_ready}\n`;
  if (result.drill_hash) out += `drill_hash: ${result.drill_hash}\n`;
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
