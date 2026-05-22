import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SANDBOX_TEST_LANE_STATUSES = [
  'SANDBOX_TEST_LANE_BLOCKED_INPUT',
  'SANDBOX_TEST_LANE_BLOCKED_CONTRACT',
  'SANDBOX_TEST_LANE_READY',
];

const BASE = {
  schema_version: 'v228.0',
  lane_id: null,
  contract_id: null,
  env_id: null,
  test_steps: [],
  step_count: 0,
  lane_ready: false,
  lane_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_patch_execution_allowed: false,
  production_touched: false,
  errors: [],
};

const DEFAULT_TEST_STEPS = [
  { index: 0, step: 'syntax_check', mode: 'sandbox', status: 'pending' },
  { index: 1, step: 'unit_tests', mode: 'sandbox', status: 'pending' },
  { index: 2, step: 'governance_check', mode: 'sandbox', status: 'pending' },
  { index: 3, step: 'flag_invariant_check', mode: 'sandbox', status: 'pending' },
];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SANDBOX_TEST_LANE_BLOCKED_INPUT'] };
  }
  if (!input.lane_id || typeof input.lane_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_TEST_LANE_BLOCKED_INPUT: missing lane_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_TEST_LANE_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.env_id || typeof input.env_id !== 'string') {
    return { ...BASE, errors: ['SANDBOX_TEST_LANE_BLOCKED_INPUT: missing env_id'] };
  }
  if (!input.env_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SANDBOX_TEST_LANE_BLOCKED_CONTRACT: env not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['SANDBOX_TEST_LANE_BLOCKED_CONTRACT: scope not validated'] };
  }

  const rawSteps = Array.isArray(input.test_steps) && input.test_steps.length > 0 ? input.test_steps : DEFAULT_TEST_STEPS;
  const test_steps = rawSteps.map((s, i) => ({
    index: i,
    step: typeof s === 'string' ? s : (s.step || `step_${i}`),
    mode: s.mode || 'sandbox',
    status: 'pending',
  }));

  const lid = input.lane_id;
  return {
    ...BASE,
    lane_id: lid,
    contract_id: input.contract_id,
    env_id: input.env_id,
    test_steps,
    step_count: test_steps.length,
    lane_ready: true,
    lane_hash: hash({ lid, contract_id: input.contract_id, env_id: input.env_id }),
    errors: [],
  };
}

export function validate(lane) {
  if (!lane || !lane.lane_id) {
    return { valid: false, errors: ['SANDBOX_TEST_LANE_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (lane.release_allowed !== false) errors.push('release_allowed must be false');
  if (lane.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (lane.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (lane.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (lane.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (lane.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (lane.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(lane) {
  if (!lane || !lane.lane_id) {
    return 'SANDBOX_TEST_LANE_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false production_touched=false';
  }
  let out = `=== Software Factory Sandbox Test Lane ===\n`;
  out += `schema_version: ${lane.schema_version}\n`;
  out += `lane_id: ${lane.lane_id}\n`;
  out += `contract_id: ${lane.contract_id}\n`;
  out += `env_id: ${lane.env_id}\n`;
  out += `step_count: ${lane.step_count}\n`;
  out += `lane_ready: ${lane.lane_ready}\n`;
  out += `release_allowed: ${lane.release_allowed}\n`;
  out += `deploy_allowed: ${lane.deploy_allowed}\n`;
  out += `real_execution_allowed: ${lane.real_execution_allowed}\n`;
  out += `real_patch_execution_allowed: ${lane.real_patch_execution_allowed}\n`;
  out += `production_touched: ${lane.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
