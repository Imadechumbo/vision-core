#!/usr/bin/env node
/**
 * Tests — Real Local Patch Test Lane V168.0
 */

import {
  buildRealLocalPatchTestLane,
  validateRealLocalPatchTestLane,
  renderRealLocalPatchTestLane,
  REAL_LOCAL_PATCH_TEST_LANE_STATUSES,
} from '../real-local-patch-test-lane.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const VALID_INPUT = {
  test_lane_id: 'test-lane-v168-001',
  patch_proof_id: 'patch-proof-v1671-001',
  patch_proof_status: 'PATCH_PROOF_CAPTURED',
  patch_proof_hash: 'proof-hash-001',
  sandbox_id: 'sandbox-v167-001',
  test_suite: 'tools/tests/sandbox-module.test.mjs',
  test_outcome: 'pass',
  tests_total: 10,
  tests_passed: 10,
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-local-patch-test-lane tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_LOCAL_PATCH_TEST_LANE_STATUSES));
assert('has TEST_LANE_PASS', REAL_LOCAL_PATCH_TEST_LANE_STATUSES.includes('TEST_LANE_PASS'));
assert('has TEST_LANE_FAIL', REAL_LOCAL_PATCH_TEST_LANE_STATUSES.includes('TEST_LANE_FAIL'));
assert('has TEST_LANE_BLOCKED_INPUT', REAL_LOCAL_PATCH_TEST_LANE_STATUSES.includes('TEST_LANE_BLOCKED_INPUT'));
assert('has TEST_LANE_BLOCKED_PROOF', REAL_LOCAL_PATCH_TEST_LANE_STATUSES.includes('TEST_LANE_BLOCKED_PROOF'));
assert('has TEST_LANE_BLOCKED_PRODUCTION', REAL_LOCAL_PATCH_TEST_LANE_STATUSES.includes('TEST_LANE_BLOCKED_PRODUCTION'));
assert('build is function', typeof buildRealLocalPatchTestLane === 'function');
assert('validate is function', typeof validateRealLocalPatchTestLane === 'function');
assert('render is function', typeof renderRealLocalPatchTestLane === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealLocalPatchTestLane(null);
  assert('null → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
  assert('null: is_real_execution=false', r.is_real_execution === false);
}
{
  const r = buildRealLocalPatchTestLane({});
  assert('empty → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ test_lane_id: '  ' });
  assert('blank test_lane_id → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, patch_proof_id: '' });
  assert('missing patch_proof_id → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, sandbox_id: null });
  assert('null sandbox_id → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, test_suite: '' });
  assert('missing test_suite → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, test_outcome: 'error' });
  assert('invalid test_outcome → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, tests_total: -1 });
  assert('negative tests_total → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, tests_passed: -1 });
  assert('negative tests_passed → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, tests_passed: 11, tests_total: 10 });
  assert('tests_passed > tests_total → BLOCKED_INPUT', r.test_lane_status === 'TEST_LANE_BLOCKED_INPUT');
}

// --- blocked proof ---
console.log('--- blocked proof ---');
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, patch_proof_status: 'PATCH_PROOF_FAIL' });
  assert('proof not CAPTURED → BLOCKED_PROOF', r.test_lane_status === 'TEST_LANE_BLOCKED_PROOF');
  assert('proof blocked: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, patch_proof_status: undefined });
  assert('proof undefined → BLOCKED_PROOF', r.test_lane_status === 'TEST_LANE_BLOCKED_PROOF');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, patch_proof_hash: '' });
  assert('missing patch_proof_hash → BLOCKED_PROOF', r.test_lane_status === 'TEST_LANE_BLOCKED_PROOF');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.test_lane_status === 'TEST_LANE_BLOCKED_PRODUCTION');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.test_lane_status === 'TEST_LANE_BLOCKED_PRODUCTION');
}

// --- lane pass ---
console.log('--- lane pass ---');
{
  const r = buildRealLocalPatchTestLane(VALID_INPUT);
  assert('valid all-pass → TEST_LANE_PASS', r.test_lane_status === 'TEST_LANE_PASS');
  assert('pass: test_lane_passed=true', r.test_lane_passed === true);
  assert('pass: local_only=true', r.local_only === true);
  assert('pass: production_touched=false', r.production_touched === false);
  assert('pass: deploy_performed=false', r.deploy_performed === false);
  assert('pass: stable_promoted=false', r.stable_promoted === false);
  assert('pass: release_performed=false', r.release_performed === false);
  assert('pass: is_real_execution=false', r.is_real_execution === false);
  assert('pass: schema_version=v168.0', r.schema_version === 'v168.0');
  assert('pass: test_lane_id set', r.test_lane_id === 'test-lane-v168-001');
  assert('pass: patch_proof_id set', r.patch_proof_id === 'patch-proof-v1671-001');
  assert('pass: sandbox_id set', r.sandbox_id === 'sandbox-v167-001');
  assert('pass: tests_failed=0', r.tests_failed === 0);
  assert('pass: test_lane_hash is string', typeof r.test_lane_hash === 'string' && r.test_lane_hash.length > 0);
  assert('pass: blocked_reason null', r.blocked_reason === null);
}

// --- lane fail ---
console.log('--- lane fail ---');
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, test_outcome: 'fail', tests_passed: 8 });
  assert('fail outcome → TEST_LANE_FAIL', r.test_lane_status === 'TEST_LANE_FAIL');
  assert('fail: test_lane_passed=false', r.test_lane_passed === false);
  assert('fail: tests_failed=2', r.tests_failed === 2);
  assert('fail: production_touched=false', r.production_touched === false);
  assert('fail: test_lane_hash set', typeof r.test_lane_hash === 'string' && r.test_lane_hash.length > 0);
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, test_outcome: 'pass', tests_passed: 8, tests_total: 10 });
  assert('pass outcome but failures → TEST_LANE_FAIL', r.test_lane_status === 'TEST_LANE_FAIL');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, test_outcome: 'skip', tests_passed: 0, tests_total: 0 });
  assert('skip outcome → TEST_LANE_FAIL', r.test_lane_status === 'TEST_LANE_FAIL');
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, tests_total: 0, tests_passed: 0 });
  assert('0 tests pass outcome → TEST_LANE_PASS', r.test_lane_status === 'TEST_LANE_PASS');
}

// --- hash ---
console.log('--- hash ---');
{
  const r1 = buildRealLocalPatchTestLane(VALID_INPUT);
  const r2 = buildRealLocalPatchTestLane(VALID_INPUT);
  assert('deterministic hash', r1.test_lane_hash === r2.test_lane_hash);
}
{
  const r1 = buildRealLocalPatchTestLane(VALID_INPUT);
  const r2 = buildRealLocalPatchTestLane({ ...VALID_INPUT, test_suite: 'tools/tests/other.test.mjs' });
  assert('different suite → different hash', r1.test_lane_hash !== r2.test_lane_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealLocalPatchTestLane(VALID_INPUT);
  const v = validateRealLocalPatchTestLane(r);
  assert('validate pass: valid=true', v.valid === true);
  assert('validate pass: no errors', v.errors.length === 0);
}
{
  const r = buildRealLocalPatchTestLane({ ...VALID_INPUT, test_outcome: 'fail', tests_passed: 5 });
  const v = validateRealLocalPatchTestLane(r);
  assert('validate fail: valid=true', v.valid === true);
}
{
  const r = buildRealLocalPatchTestLane(null);
  const v = validateRealLocalPatchTestLane(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateRealLocalPatchTestLane(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealLocalPatchTestLane(VALID_INPUT);
  const s = renderRealLocalPatchTestLane(r);
  assert('render pass: is string', typeof s === 'string');
  assert('render pass: contains TEST_LANE_PASS', s.includes('TEST_LANE_PASS'));
  assert('render pass: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render pass: contains REAL_LOCAL_PATCH_TEST_LANE_PASSED=true', s.includes('REAL_LOCAL_PATCH_TEST_LANE_PASSED=true'));
}
{
  const s = renderRealLocalPatchTestLane(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealLocalPatchTestLane(null),
    buildRealLocalPatchTestLane({}),
    buildRealLocalPatchTestLane(VALID_INPUT),
    buildRealLocalPatchTestLane({ ...VALID_INPUT, local_only: false }),
    buildRealLocalPatchTestLane({ ...VALID_INPUT, production_touched: true }),
    buildRealLocalPatchTestLane({ ...VALID_INPUT, patch_proof_status: 'PATCH_PROOF_FAIL' }),
    buildRealLocalPatchTestLane({ ...VALID_INPUT, test_outcome: 'fail', tests_passed: 3 }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
  assert('all: is_real_execution=false', cases.every(r => r.is_real_execution === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
