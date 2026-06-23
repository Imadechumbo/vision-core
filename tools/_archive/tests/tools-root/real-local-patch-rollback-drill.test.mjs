#!/usr/bin/env node
/**
 * Tests — Real Local Patch Rollback Drill V168.1
 */

import {
  buildRealLocalPatchRollbackDrill,
  validateRealLocalPatchRollbackDrill,
  renderRealLocalPatchRollbackDrill,
  REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES,
} from '../real-local-patch-rollback-drill.mjs';

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
  rollback_drill_id: 'rollback-drill-001',
  test_lane_id: 'test-lane-001',
  test_lane_status: 'TEST_LANE_PASS',
  test_lane_hash: 'test-lane-hash-001',
  sandbox_id: 'sandbox-001',
  patch_target: 'tools/sandbox-module.mjs',
  patch_type: 'code',
  pre_patch_hash: 'pre-hash-001',
  post_patch_hash: 'post-hash-002',
  rollback_outcome: 'success',
  restored_hash: 'pre-hash-001',
  local_only: true,
  production_touched: false,
};

console.log('\n=== real-local-patch-rollback-drill tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES));
assert('has ROLLBACK_DRILL_BLOCKED_INPUT', REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_DRILL_BLOCKED_INPUT'));
assert('has ROLLBACK_DRILL_BLOCKED_TEST_LANE', REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_DRILL_BLOCKED_TEST_LANE'));
assert('has ROLLBACK_DRILL_BLOCKED_PRODUCTION', REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_DRILL_BLOCKED_PRODUCTION'));
assert('has ROLLBACK_DRILL_PASS', REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_DRILL_PASS'));
assert('has ROLLBACK_DRILL_FAIL', REAL_LOCAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('ROLLBACK_DRILL_FAIL'));
assert('build is function', typeof buildRealLocalPatchRollbackDrill === 'function');
assert('validate is function', typeof validateRealLocalPatchRollbackDrill === 'function');
assert('render is function', typeof renderRealLocalPatchRollbackDrill === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealLocalPatchRollbackDrill(null);
  assert('null → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
}
{
  const r = buildRealLocalPatchRollbackDrill({});
  assert('empty → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ rollback_drill_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, test_lane_id: '' });
  assert('missing test_lane_id → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, sandbox_id: null });
  assert('null sandbox_id → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, patch_target: '' });
  assert('empty patch_target → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, patch_type: null });
  assert('null patch_type → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, pre_patch_hash: '' });
  assert('empty pre_patch_hash → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, post_patch_hash: null });
  assert('null post_patch_hash → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, rollback_outcome: '' });
  assert('empty rollback_outcome → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, restored_hash: null });
  assert('null restored_hash → BLOCKED_INPUT', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_PRODUCTION');
}

// --- blocked test lane ---
console.log('--- blocked test lane ---');
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, test_lane_status: 'TEST_LANE_FAIL' });
  assert('TEST_LANE_FAIL → BLOCKED_TEST_LANE', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_TEST_LANE');
  assert('blocked_test_lane: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, test_lane_status: 'TEST_LANE_BLOCKED_PROOF' });
  assert('non-PASS test_lane → BLOCKED_TEST_LANE', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_TEST_LANE');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, test_lane_hash: '' });
  assert('missing test_lane_hash → BLOCKED_TEST_LANE', r.rollback_drill_status === 'ROLLBACK_DRILL_BLOCKED_TEST_LANE');
}

// --- rollback fail ---
console.log('--- rollback fail ---');
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, rollback_outcome: 'fail' });
  assert('outcome=fail → ROLLBACK_DRILL_FAIL', r.rollback_drill_status === 'ROLLBACK_DRILL_FAIL');
  assert('fail: rollback_drill_pass=false', r.rollback_drill_pass === false);
  assert('fail: production_touched=false', r.production_touched === false);
  assert('fail: rollback_hash set', typeof r.rollback_hash === 'string' && r.rollback_hash.length > 0);
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, rollback_outcome: 'partial' });
  assert('outcome=partial → ROLLBACK_DRILL_FAIL', r.rollback_drill_status === 'ROLLBACK_DRILL_FAIL');
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, restored_hash: 'different-hash-999' });
  assert('restored≠pre → ROLLBACK_DRILL_FAIL', r.rollback_drill_status === 'ROLLBACK_DRILL_FAIL');
  assert('hash mismatch: restored_matches_pre=false', r.restored_matches_pre === false);
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, rollback_outcome: 'unknown-outcome' });
  assert('invalid outcome → ROLLBACK_DRILL_FAIL', r.rollback_drill_status === 'ROLLBACK_DRILL_FAIL');
}

// --- rollback pass ---
console.log('--- rollback pass ---');
{
  const r = buildRealLocalPatchRollbackDrill(VALID_INPUT);
  assert('matching: ROLLBACK_DRILL_PASS', r.rollback_drill_status === 'ROLLBACK_DRILL_PASS');
  assert('pass: rollback_drill_pass=true', r.rollback_drill_pass === true);
  assert('pass: restored_matches_pre=true', r.restored_matches_pre === true);
  assert('pass: rollback_hash set', typeof r.rollback_hash === 'string' && r.rollback_hash.length === 64);
  assert('pass: schema_version=v168.1', r.schema_version === 'v168.1');
  assert('pass: production_touched=false', r.production_touched === false);
  assert('pass: deploy_performed=false', r.deploy_performed === false);
  assert('pass: stable_promoted=false', r.stable_promoted === false);
  assert('pass: release_performed=false', r.release_performed === false);
  assert('pass: local_only=true', r.local_only === true);
  assert('pass: is_real_execution=false', r.is_real_execution === false);
  assert('pass: blocked_reason=null', r.blocked_reason === null);
  assert('pass: rollback_drill_id set', r.rollback_drill_id === 'rollback-drill-001');
  assert('pass: sandbox_id set', r.sandbox_id === 'sandbox-001');
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealLocalPatchRollbackDrill(VALID_INPUT);
  const r2 = buildRealLocalPatchRollbackDrill(VALID_INPUT);
  assert('hash deterministic', r1.rollback_hash === r2.rollback_hash);
  const r3 = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, patch_target: 'tools/other.mjs' });
  assert('different input → different hash', r1.rollback_hash !== r3.rollback_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealLocalPatchRollbackDrill(VALID_INPUT);
  const v = validateRealLocalPatchRollbackDrill(r);
  assert('validate pass: valid=true', v.valid === true);
  assert('validate pass: no errors', v.errors.length === 0);
}
{
  const r = buildRealLocalPatchRollbackDrill(null);
  const v = validateRealLocalPatchRollbackDrill(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealLocalPatchRollbackDrill(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, rollback_outcome: 'fail' });
  const v = validateRealLocalPatchRollbackDrill(r);
  assert('validate fail: valid=true (invariants hold)', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealLocalPatchRollbackDrill(VALID_INPUT);
  const s = renderRealLocalPatchRollbackDrill(r);
  assert('render pass: is string', typeof s === 'string');
  assert('render pass: contains ROLLBACK_DRILL_PASS', s.includes('ROLLBACK_DRILL_PASS'));
  assert('render pass: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderRealLocalPatchRollbackDrill(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealLocalPatchRollbackDrill(null),
    buildRealLocalPatchRollbackDrill({}),
    buildRealLocalPatchRollbackDrill(VALID_INPUT),
    buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, rollback_outcome: 'fail' }),
    buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, local_only: false }),
    buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, production_touched: true }),
    buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, test_lane_status: 'TEST_LANE_FAIL' }),
    buildRealLocalPatchRollbackDrill({ ...VALID_INPUT, restored_hash: 'different-hash' }),
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
