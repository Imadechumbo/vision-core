import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SUPERVISED_PATCH_EXECUTION_DRILL_STATUSES = [
  'SUPERVISED_DRILL_BLOCKED_INPUT',
  'SUPERVISED_DRILL_BLOCKED_CONTRACT',
  'SUPERVISED_DRILL_READY',
];

const BASE = {
  schema_version: 'v233.0',
  drill_id: null,
  contract_id: null,
  barrier_id: null,
  drill_steps: [],
  step_count: 0,
  drill_ready: false,
  drill_completed: false,
  drill_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_DRILL_STEPS = [
  { index: 0, step: 'confirm_barrier_ready', mode: 'drill', status: 'pending' },
  { index: 1, step: 'simulate_patch_application', mode: 'drill', status: 'pending' },
  { index: 2, step: 'verify_no_production_touch', mode: 'drill', status: 'pending' },
  { index: 3, step: 'run_governance_check', mode: 'drill', status: 'pending' },
  { index: 4, step: 'collect_drill_evidence', mode: 'drill', status: 'pending' },
  { index: 5, step: 'report_to_human_operator', mode: 'drill', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SUPERVISED_DRILL_BLOCKED_INPUT'] };
  }
  if (!input.drill_id || typeof input.drill_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_DRILL_BLOCKED_INPUT: missing drill_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_DRILL_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.barrier_id || typeof input.barrier_id !== 'string') {
    return { ...BASE, errors: ['SUPERVISED_DRILL_BLOCKED_INPUT: missing barrier_id'] };
  }
  if (!input.barrier_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SUPERVISED_DRILL_BLOCKED_CONTRACT: barrier not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SUPERVISED_DRILL_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawSteps = Array.isArray(input.drill_steps) && input.drill_steps.length > 0 ? input.drill_steps : DEFAULT_DRILL_STEPS;
  const drill_steps = rawSteps.map((s, i) => ({
    index: i,
    step: typeof s === 'string' ? s : (s.step || `step_${i}`),
    mode: s.mode || 'drill',
    status: 'pending',
  }));

  const did = input.drill_id;
  return {
    ...BASE,
    drill_id: did,
    contract_id: input.contract_id,
    barrier_id: input.barrier_id,
    drill_steps,
    step_count: drill_steps.length,
    drill_ready: true,
    drill_completed: false,
    drill_hash: hash({ did, contract_id: input.contract_id, barrier_id: input.barrier_id }),
    errors: [],
  };
}

export function validate(drill) {
  if (!drill || !drill.drill_id) {
    return { valid: false, errors: ['SUPERVISED_DRILL_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (drill.drill_completed !== false) errors.push('drill_completed must be false by default');
  if (drill.release_allowed !== false) errors.push('release_allowed must be false');
  if (drill.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (drill.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (drill.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (drill.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (drill.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (drill.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(drill) {
  if (!drill || !drill.drill_id) {
    return 'SUPERVISED_DRILL_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Supervised Patch Execution Drill ===\n`;
  out += `schema_version: ${drill.schema_version}\n`;
  out += `drill_id: ${drill.drill_id}\n`;
  out += `contract_id: ${drill.contract_id}\n`;
  out += `barrier_id: ${drill.barrier_id}\n`;
  out += `step_count: ${drill.step_count}\n`;
  out += `drill_ready: ${drill.drill_ready}\n`;
  out += `drill_completed: ${drill.drill_completed}\n`;
  out += `release_allowed: ${drill.release_allowed}\n`;
  out += `deploy_allowed: ${drill.deploy_allowed}\n`;
  out += `real_execution_allowed: ${drill.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${drill.real_patch_execution_allowed}\n`;
  out += `production_touched: ${drill.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
