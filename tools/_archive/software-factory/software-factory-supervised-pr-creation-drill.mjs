import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SUPERVISED_PR_CREATION_DRILL_STATUSES = [
  'SUPERVISED_PR_DRILL_BLOCKED_INPUT',
  'SUPERVISED_PR_DRILL_BLOCKED_BARRIER',
  'SUPERVISED_PR_DRILL_READY',
];

const BASE = {
  schema_version: 'v240.0',
  drill_id: null,
  barrier_id: null,
  supervised_pr_drill_ready: false,
  simulation_performed: false,
  real_pr_created: false,
  drill_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SUPERVISED_PR_DRILL_BLOCKED_INPUT'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_PR_DRILL_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.barrier_id || typeof input.barrier_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_PR_DRILL_BLOCKED_INPUT: missing barrier_id'] };
  }
  if (!input.pr_creation_barrier_ready) {
    return { ...BASE, barrier_id: input.barrier_id, errors: ['SUPERVISED_PR_DRILL_BLOCKED_BARRIER: pr_creation_barrier not ready'] };
  }
  if (!input.simulated_output || typeof input.simulated_output !== 'string') {
    return { ...BASE, barrier_id: input.barrier_id, errors: ['SUPERVISED_PR_DRILL_BLOCKED_BARRIER: simulated_output required'] };
  }

  const did = input.drill_id;
  return {
    ...BASE,
    drill_id: did,
    barrier_id: input.barrier_id,
    supervised_pr_drill_ready: true,
    simulation_performed: true,
    real_pr_created: false,
    drill_hash: hash({ did, barrier_id: input.barrier_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.drill_id) {
    return { valid: false, errors: ['SUPERVISED_PR_DRILL_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.real_pr_created !== false) errors.push('real_pr_created must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || !result.drill_id) {
    return 'SUPERVISED_PR_DRILL_BLOCKED_INPUT\nREGRA ABSOLUTA: real_pr_creation_allowed=false real_pr_created=false production_touched=false';
  }
  let out = `=== Software Factory Supervised PR Creation Drill ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `drill_id: ${result.drill_id}\n`;
  out += `barrier_id: ${result.barrier_id}\n`;
  out += `supervised_pr_drill_ready: ${result.supervised_pr_drill_ready}\n`;
  out += `simulation_performed: ${result.simulation_performed}\n`;
  out += `real_pr_created: ${result.real_pr_created}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
