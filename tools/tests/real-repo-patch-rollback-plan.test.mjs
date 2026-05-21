#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Rollback Plan V174.0
 */

import {
  buildRealRepoPatchRollbackPlan,
  REAL_REPO_PATCH_ROLLBACK_PLAN_STATUSES,
} from '../real-repo-patch-rollback-plan.mjs';

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
  rollback_plan_id: 'plan-001',
  target_file: 'docs/real-repo-patch-drill-target.md',
  file_hash_before: 'abc123def456',
  file_hash_after: 'xyz789',
  file_exists_before: true,
};

console.log('\n=== real-repo-patch-rollback-plan tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_ROLLBACK_PLAN_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_ROLLBACK_PLAN_STATUSES.includes('REPO_ROLLBACK_PLAN_BLOCKED_INPUT'));
assert('has BLOCKED_PRE_STATE', REAL_REPO_PATCH_ROLLBACK_PLAN_STATUSES.includes('REPO_ROLLBACK_PLAN_BLOCKED_PRE_STATE'));
assert('has READY', REAL_REPO_PATCH_ROLLBACK_PLAN_STATUSES.includes('REPO_ROLLBACK_PLAN_READY'));
assert('build is function', typeof buildRealRepoPatchRollbackPlan === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchRollbackPlan({ file_hash_before: 'abc', target_file: 'docs/real-repo-patch-drill-target.md' });
  assert('missing rollback_plan_id → BLOCKED_INPUT', r.status === 'REPO_ROLLBACK_PLAN_BLOCKED_INPUT');
  assert('blocked: production_touched=false', r.production_touched === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchRollbackPlan({});
  assert('empty input → BLOCKED_INPUT', r.status === 'REPO_ROLLBACK_PLAN_BLOCKED_INPUT');
}

// --- blocked pre state ---
console.log('--- blocked pre state ---');
{
  const r = buildRealRepoPatchRollbackPlan({ rollback_plan_id: 'plan', target_file: 'docs/real-repo-patch-drill-target.md' });
  assert('no file_hash_before → BLOCKED_PRE_STATE', r.status === 'REPO_ROLLBACK_PLAN_BLOCKED_PRE_STATE');
  assert('blocked_pre_state: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchRollbackPlan({ rollback_plan_id: 'plan', file_hash_before: null });
  assert('null file_hash_before → BLOCKED_PRE_STATE', r.status === 'REPO_ROLLBACK_PLAN_BLOCKED_PRE_STATE');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchRollbackPlan(VALID_INPUT);
  assert('valid → READY', r.status === 'REPO_ROLLBACK_PLAN_READY');
  assert('ready: rollback_plan_ready=true', r.rollback_plan_ready === true);
  assert('ready: schema_version=v174.0', r.schema_version === 'v174.0');
  assert('ready: rollback_plan_id set', r.rollback_plan_id === 'plan-001');
  assert('ready: rollback_strategy=RESTORE_PREVIOUS_CONTENT', r.rollback_strategy === 'RESTORE_PREVIOUS_CONTENT');
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchRollbackPlan({ ...VALID_INPUT, file_exists_before: false });
  assert('file_exists_before=false → DELETE strategy', r.rollback_strategy === 'DELETE_CREATED_FILE');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchRollbackPlan({}),
    buildRealRepoPatchRollbackPlan({ rollback_plan_id: 'plan' }),
    buildRealRepoPatchRollbackPlan(VALID_INPUT),
    buildRealRepoPatchRollbackPlan({ ...VALID_INPUT, file_exists_before: false }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
