#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Final Authority Review V188.0
 */

import {
  buildRealRepoPatchFinalAuthorityReview,
  validateRealRepoPatchFinalAuthorityReview,
  renderRealRepoPatchFinalAuthorityReview,
  REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES,
} from '../real-repo-patch-final-authority-review.mjs';

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
  review_id: 'review-001',
  sim_id: 'sim-001',
  simulation_passed: true,
  reviewer_decision: 'approved',
};

console.log('\n=== real-repo-patch-final-authority-review tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES));
assert('has AUTHORITY_REVIEW_BLOCKED_INPUT', REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES.includes('AUTHORITY_REVIEW_BLOCKED_INPUT'));
assert('has AUTHORITY_REVIEW_BLOCKED_SIMULATION', REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES.includes('AUTHORITY_REVIEW_BLOCKED_SIMULATION'));
assert('has AUTHORITY_REVIEW_REJECTED', REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES.includes('AUTHORITY_REVIEW_REJECTED'));
assert('has AUTHORITY_REVIEW_APPROVED', REAL_REPO_PATCH_AUTHORITY_REVIEW_STATUSES.includes('AUTHORITY_REVIEW_APPROVED'));
assert('build is function', typeof buildRealRepoPatchFinalAuthorityReview === 'function');
assert('validate is function', typeof validateRealRepoPatchFinalAuthorityReview === 'function');
assert('render is function', typeof renderRealRepoPatchFinalAuthorityReview === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchFinalAuthorityReview(null);
  assert('null → BLOCKED_INPUT', r.status === 'AUTHORITY_REVIEW_BLOCKED_INPUT');
  assert('null: real_release_allowed=false', r.real_release_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchFinalAuthorityReview({});
  assert('no review_id → BLOCKED_INPUT', r.status === 'AUTHORITY_REVIEW_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchFinalAuthorityReview({ review_id: 'r' });
  assert('no sim_id → BLOCKED_INPUT', r.status === 'AUTHORITY_REVIEW_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, reviewer_decision: 'bad' });
  assert('invalid decision → BLOCKED_INPUT', r.status === 'AUTHORITY_REVIEW_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, reviewer_decision: undefined });
  assert('no decision → BLOCKED_INPUT', r.status === 'AUTHORITY_REVIEW_BLOCKED_INPUT');
}

// --- blocked simulation ---
console.log('--- blocked simulation ---');
{
  const r = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, simulation_passed: false });
  assert('simulation_passed=false → BLOCKED_SIMULATION', r.status === 'AUTHORITY_REVIEW_BLOCKED_SIMULATION');
  assert('blocked_sim: real_release_allowed=false', r.real_release_allowed === false);
  assert('blocked_sim: review_hash=null', r.review_hash === null);
}
{
  const r = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, simulation_passed: undefined });
  assert('simulation_passed=undefined → BLOCKED_SIMULATION', r.status === 'AUTHORITY_REVIEW_BLOCKED_SIMULATION');
}

// --- rejected ---
console.log('--- rejected ---');
{
  const r = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, reviewer_decision: 'rejected' });
  assert('rejected → AUTHORITY_REVIEW_REJECTED', r.status === 'AUTHORITY_REVIEW_REJECTED');
  assert('rejected: reviewer_decision=rejected', r.reviewer_decision === 'rejected');
  assert('rejected: real_release_allowed=false', r.real_release_allowed === false);
  assert('rejected: review_hash 64 chars', typeof r.review_hash === 'string' && r.review_hash.length === 64);
  assert('rejected: errors empty', r.errors.length === 0);
}

// --- approved ---
console.log('--- approved ---');
{
  const r = buildRealRepoPatchFinalAuthorityReview(VALID_INPUT);
  assert('approved → AUTHORITY_REVIEW_APPROVED', r.status === 'AUTHORITY_REVIEW_APPROVED');
  assert('approved: schema_version=v188.0', r.schema_version === 'v188.0');
  assert('approved: review_id set', r.review_id === 'review-001');
  assert('approved: sim_id set', r.sim_id === 'sim-001');
  assert('approved: reviewer_decision=approved', r.reviewer_decision === 'approved');
  assert('approved: real_release_allowed=false', r.real_release_allowed === false);
  assert('approved: review_hash 64 chars', typeof r.review_hash === 'string' && r.review_hash.length === 64);
  assert('approved: errors empty', r.errors.length === 0);
  assert('approved: production_touched=false', r.production_touched === false);
  assert('approved: deploy_performed=false', r.deploy_performed === false);
  assert('approved: stable_promoted=false', r.stable_promoted === false);
  assert('approved: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchFinalAuthorityReview(VALID_INPUT);
  const r2 = buildRealRepoPatchFinalAuthorityReview(VALID_INPUT);
  assert('hash deterministic', r1.review_hash === r2.review_hash);
  const r3 = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, review_id: 'review-002' });
  assert('different review_id → different hash', r1.review_hash !== r3.review_hash);
  const r4 = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, reviewer_decision: 'rejected' });
  assert('different decision → different hash', r1.review_hash !== r4.review_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchFinalAuthorityReview(VALID_INPUT);
  const v = validateRealRepoPatchFinalAuthorityReview(r);
  assert('validate approved: valid=true', v.valid === true);
  assert('validate approved: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, reviewer_decision: 'rejected' });
  const v = validateRealRepoPatchFinalAuthorityReview(r);
  assert('validate rejected: valid=true', v.valid === true);
}
{
  const r = buildRealRepoPatchFinalAuthorityReview(null);
  const v = validateRealRepoPatchFinalAuthorityReview(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchFinalAuthorityReview(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchFinalAuthorityReview(VALID_INPUT);
  const s = renderRealRepoPatchFinalAuthorityReview(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains AUTHORITY_REVIEW_APPROVED', s.includes('AUTHORITY_REVIEW_APPROVED'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: real_release_allowed false in output', s.includes('false'));
}
{
  const s = renderRealRepoPatchFinalAuthorityReview(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchFinalAuthorityReview(null),
    buildRealRepoPatchFinalAuthorityReview({}),
    buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, simulation_passed: false }),
    buildRealRepoPatchFinalAuthorityReview({ ...VALID_INPUT, reviewer_decision: 'rejected' }),
    buildRealRepoPatchFinalAuthorityReview(VALID_INPUT),
  ];
  assert('all: real_release_allowed=false', cases.every(r => r.real_release_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
