import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_PATCH_TEST_LANE_STATUSES = [
  'REAL_PATCH_TEST_LANE_BLOCKED_INPUT',
  'REAL_PATCH_TEST_LANE_BLOCKED_PROOF',
  'REAL_PATCH_TEST_LANE_FAIL',
  'REAL_PATCH_TEST_LANE_READY',
];

const ALLOWED_TEST_STATUSES = ['pass', 'fail', 'pending'];

const BASE = {
  schema_version: 'v270.0',
  test_lane_id: null,
  real_patch_test_lane_ready: false,
  tests_total: 0,
  tests_passed: 0,
  test_lane_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  real_patch_applied: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['REAL_PATCH_TEST_LANE_BLOCKED_INPUT'] };
  }
  if (!input.test_lane_id || typeof input.test_lane_id !== 'string') {
    return { ...BASE, errors: ['REAL_PATCH_TEST_LANE_BLOCKED_INPUT: missing test_lane_id'] };
  }
  if (input.real_patch_physical_apply_proof_ready !== true) {
    return { ...BASE, test_lane_id: input.test_lane_id, errors: ['REAL_PATCH_TEST_LANE_BLOCKED_PROOF: physical apply proof must be ready'] };
  }
  if (!Array.isArray(input.test_plan) || input.test_plan.length === 0) {
    return { ...BASE, test_lane_id: input.test_lane_id, errors: ['REAL_PATCH_TEST_LANE_BLOCKED_PROOF: test_plan required and non-empty'] };
  }
  if (!Array.isArray(input.test_results) || input.test_results.length === 0) {
    return { ...BASE, test_lane_id: input.test_lane_id, errors: ['REAL_PATCH_TEST_LANE_BLOCKED_PROOF: test_results required and non-empty'] };
  }

  const resultMap = new Map();
  for (const r of input.test_results) {
    if (!r.name || !ALLOWED_TEST_STATUSES.includes(r.status)) {
      return { ...BASE, test_lane_id: input.test_lane_id, errors: [`REAL_PATCH_TEST_LANE_FAIL: invalid test result entry: ${JSON.stringify(r)}`] };
    }
    resultMap.set(r.name, r.status);
  }

  const failErrors = [];
  for (const t of input.test_plan) {
    if (!t.name) {
      failErrors.push('REAL_PATCH_TEST_LANE_FAIL: test_plan entry missing name');
      continue;
    }
    if (t.required) {
      const status = resultMap.get(t.name);
      if (!status) {
        failErrors.push(`REAL_PATCH_TEST_LANE_FAIL: required test missing from results: ${t.name}`);
      } else if (status !== 'pass') {
        failErrors.push(`REAL_PATCH_TEST_LANE_FAIL: required test not passing: ${t.name} (${status})`);
      }
    }
  }

  if (failErrors.length > 0) {
    return { ...BASE, test_lane_id: input.test_lane_id, errors: failErrors };
  }

  const testsTotal = input.test_results.length;
  const testsPassed = input.test_results.filter(r => r.status === 'pass').length;
  const laneHash = hash({ test_lane_id: input.test_lane_id, test_plan: input.test_plan, test_results: input.test_results });

  return {
    ...BASE,
    test_lane_id: input.test_lane_id,
    real_patch_test_lane_ready: true,
    tests_total: testsTotal,
    tests_passed: testsPassed,
    test_lane_hash: laneHash,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['invalid real patch test lane'] };
  }
  const errors = [];
  if (!result.test_lane_id) errors.push('missing test_lane_id');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (result.real_patch_applied !== false) errors.push('real_patch_applied must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.errors && result.errors.length > 0) errors.push('build has errors');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return 'REAL_PATCH_TEST_LANE_BLOCKED_INPUT';
  }
  let status;
  if (result.real_patch_test_lane_ready) {
    status = 'REAL_PATCH_TEST_LANE_READY';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_TEST_LANE_BLOCKED_PROOF'))) {
    status = 'REAL_PATCH_TEST_LANE_BLOCKED_PROOF';
  } else if (result.errors && result.errors.some(e => e.startsWith('REAL_PATCH_TEST_LANE_FAIL'))) {
    status = 'REAL_PATCH_TEST_LANE_FAIL';
  } else {
    status = 'REAL_PATCH_TEST_LANE_BLOCKED_INPUT';
  }

  let out = `=== ${status} ===\n`;
  out += `test_lane_id: ${result.test_lane_id || '(none)'}\n`;
  out += `real_patch_test_lane_ready: ${result.real_patch_test_lane_ready}\n`;
  out += `tests_total: ${result.tests_total}\n`;
  out += `tests_passed: ${result.tests_passed}\n`;
  if (result.test_lane_hash) out += `test_lane_hash: ${result.test_lane_hash}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `deploy_allowed: ${result.deploy_allowed}\n`;
  out += `stable_allowed: ${result.stable_allowed}\n`;
  out += `tag_allowed: ${result.tag_allowed}\n`;
  out += `real_execution_allowed: ${result.real_execution_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `real_patch_execution_allowed: ${result.real_patch_execution_allowed}\n`;
  out += `real_patch_applied: ${result.real_patch_applied}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors && result.errors.length > 0) {
    out += `errors: ${result.errors.join('; ')}\n`;
  }
  return out;
}
