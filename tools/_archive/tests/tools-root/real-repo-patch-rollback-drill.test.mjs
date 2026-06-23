#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Rollback Drill V174.1
 */

import {
  buildRealRepoPatchRollbackDrill,
  REAL_REPO_PATCH_ROLLBACK_DRILL_STATUSES,
} from '../real-repo-patch-rollback-drill.mjs';

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

const HASH = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1';

const VALID_INPUT = {
  rollback_drill_id: 'drill-001',
  rollback_plan_id: 'plan-001',
  target_file: 'docs/real-repo-patch-drill-target.md',
  rollback_plan_ready: true,
  file_hash_before: HASH,
  restored_hash: HASH,
};

console.log('\n=== real-repo-patch-rollback-drill tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_ROLLBACK_DRILL_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_ROLLBACK_DRILL_STATUSES.includes('REPO_ROLLBACK_DRILL_BLOCKED_INPUT'));
assert('has BLOCKED_PLAN', REAL_REPO_PATCH_ROLLBACK_DRILL_STATUSES.includes('REPO_ROLLBACK_DRILL_BLOCKED_PLAN'));
assert('has PASS', REAL_REPO_PATCH_ROLLBACK_DRILL_STATUSES.includes('REPO_ROLLBACK_DRILL_PASS'));
assert('has FAIL', REAL_REPO_PATCH_ROLLBACK_DRILL_STATUSES.includes('REPO_ROLLBACK_DRILL_FAIL'));
assert('build is function', typeof buildRealRepoPatchRollbackDrill === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchRollbackDrill({ rollback_plan_ready: true, file_hash_before: HASH, restored_hash: HASH });
  assert('missing rollback_drill_id → BLOCKED_INPUT', r.status === 'REPO_ROLLBACK_DRILL_BLOCKED_INPUT');
  assert('blocked: production_touched=false', r.production_touched === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchRollbackDrill({});
  assert('empty input → BLOCKED_INPUT', r.status === 'REPO_ROLLBACK_DRILL_BLOCKED_INPUT');
}

// --- blocked plan ---
console.log('--- blocked plan ---');
{
  const r = buildRealRepoPatchRollbackDrill({ ...VALID_INPUT, rollback_plan_ready: false });
  assert('rollback_plan_ready=false → BLOCKED_PLAN', r.status === 'REPO_ROLLBACK_DRILL_BLOCKED_PLAN');
  assert('blocked_plan: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchRollbackDrill({ ...VALID_INPUT, rollback_plan_ready: undefined });
  assert('rollback_plan_ready=undefined → BLOCKED_PLAN', r.status === 'REPO_ROLLBACK_DRILL_BLOCKED_PLAN');
}

// --- pass ---
console.log('--- pass ---');
{
  const r = buildRealRepoPatchRollbackDrill(VALID_INPUT);
  assert('restored_hash === file_hash_before → PASS', r.status === 'REPO_ROLLBACK_DRILL_PASS');
  assert('pass: rollback_drill_passed=true', r.rollback_drill_passed === true);
  assert('pass: schema_version=v174.1', r.schema_version === 'v174.1');
  assert('pass: rollback_drill_id set', r.rollback_drill_id === 'drill-001');
  assert('pass: production_touched=false', r.production_touched === false);
  assert('pass: deploy_performed=false', r.deploy_performed === false);
  assert('pass: stable_promoted=false', r.stable_promoted === false);
  assert('pass: release_performed=false', r.release_performed === false);
}

// --- fail ---
console.log('--- fail ---');
{
  const r = buildRealRepoPatchRollbackDrill({ ...VALID_INPUT, restored_hash: 'different-hash' });
  assert('hash mismatch → FAIL', r.status === 'REPO_ROLLBACK_DRILL_FAIL');
  assert('fail: rollback_drill_passed=false', r.rollback_drill_passed === false);
  assert('fail: production_touched=false', r.production_touched === false);
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchRollbackDrill({}),
    buildRealRepoPatchRollbackDrill({ ...VALID_INPUT, rollback_plan_ready: false }),
    buildRealRepoPatchRollbackDrill(VALID_INPUT),
    buildRealRepoPatchRollbackDrill({ ...VALID_INPUT, restored_hash: 'wrong' }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
