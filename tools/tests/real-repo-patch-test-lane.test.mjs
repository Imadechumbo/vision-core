#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Test Lane V173.1
 */

import {
  buildRealRepoPatchTestLane,
  REAL_REPO_PATCH_TEST_LANE_STATUSES,
} from '../real-repo-patch-test-lane.mjs';

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
  repo_test_lane_id: 'lane-001',
  diff_truth_id: 'diff-001',
  diff_truth_bound: true,
  tests_passed: true,
  tests_total: 10,
};

console.log('\n=== real-repo-patch-test-lane tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_TEST_LANE_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_TEST_LANE_STATUSES.includes('REPO_PATCH_TEST_LANE_BLOCKED_INPUT'));
assert('has BLOCKED_DIFF', REAL_REPO_PATCH_TEST_LANE_STATUSES.includes('REPO_PATCH_TEST_LANE_BLOCKED_DIFF'));
assert('has PASS', REAL_REPO_PATCH_TEST_LANE_STATUSES.includes('REPO_PATCH_TEST_LANE_PASS'));
assert('has FAIL', REAL_REPO_PATCH_TEST_LANE_STATUSES.includes('REPO_PATCH_TEST_LANE_FAIL'));
assert('build is function', typeof buildRealRepoPatchTestLane === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchTestLane({ diff_truth_id: 'diff', diff_truth_bound: true, tests_passed: true });
  assert('missing repo_test_lane_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_TEST_LANE_BLOCKED_INPUT');
  assert('blocked: production_touched=false', r.production_touched === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchTestLane({ repo_test_lane_id: 'lane', diff_truth_bound: true, tests_passed: true });
  assert('missing diff_truth_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_TEST_LANE_BLOCKED_INPUT');
}

// --- blocked diff ---
console.log('--- blocked diff ---');
{
  const r = buildRealRepoPatchTestLane({ ...VALID_INPUT, diff_truth_bound: false });
  assert('diff_truth_bound=false → BLOCKED_DIFF', r.status === 'REPO_PATCH_TEST_LANE_BLOCKED_DIFF');
  assert('blocked_diff: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchTestLane({ ...VALID_INPUT, diff_truth_bound: undefined });
  assert('diff_truth_bound=undefined → BLOCKED_DIFF', r.status === 'REPO_PATCH_TEST_LANE_BLOCKED_DIFF');
}

// --- pass ---
console.log('--- pass ---');
{
  const r = buildRealRepoPatchTestLane(VALID_INPUT);
  assert('tests_passed=true → PASS', r.status === 'REPO_PATCH_TEST_LANE_PASS');
  assert('pass: test_lane_passed=true', r.test_lane_passed === true);
  assert('pass: schema_version=v173.1', r.schema_version === 'v173.1');
  assert('pass: repo_test_lane_id set', r.repo_test_lane_id === 'lane-001');
  assert('pass: production_touched=false', r.production_touched === false);
  assert('pass: deploy_performed=false', r.deploy_performed === false);
  assert('pass: stable_promoted=false', r.stable_promoted === false);
  assert('pass: release_performed=false', r.release_performed === false);
}

// --- fail ---
console.log('--- fail ---');
{
  const r = buildRealRepoPatchTestLane({ ...VALID_INPUT, tests_passed: false });
  assert('tests_passed=false → FAIL', r.status === 'REPO_PATCH_TEST_LANE_FAIL');
  assert('fail: test_lane_passed=false', r.test_lane_passed === false);
  assert('fail: production_touched=false', r.production_touched === false);
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchTestLane({ diff_truth_id: 'diff', diff_truth_bound: true, tests_passed: true }),
    buildRealRepoPatchTestLane({ ...VALID_INPUT, diff_truth_bound: false }),
    buildRealRepoPatchTestLane(VALID_INPUT),
    buildRealRepoPatchTestLane({ ...VALID_INPUT, tests_passed: false }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
