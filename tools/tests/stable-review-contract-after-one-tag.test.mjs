#!/usr/bin/env node
/**
 * Tests — Stable Review Contract After One-Tag Operation V111.0
 */

import {
  buildStableReviewContractAfterOneTag,
  validateStableReviewContractAfterOneTag,
  renderStableReviewContractAfterOneTag,
  STABLE_REVIEW_CONTRACT_STATUSES,
} from '../stable-review-contract-after-one-tag.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const GOOD_BASELINE = {
  one_tag_baseline_ready:  true,
  one_tag_baseline_status: 'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED',
  baseline_id:             'baseline-test-001',
  actual_real_tag_created: false,
  stable_promoted:         false,
};

const GOOD_PARAMS = {
  one_tag_baseline:          GOOD_BASELINE,
  target_tag:                'v7.0.0',
  git_head:                  'abcdef1234567',
  evidence_receipt_id:       'evidence-test-001',
  evidence_source:           'go-core',
  rollback_anchor_id:        'rollback-test-001',
  tag_operation_mode:        'dry_run',
  actual_real_tag_created:   false,
  actual_git_push_performed: false,
};

console.log('\n=== stable-review-contract-after-one-tag tests ===\n');

// missing baseline
console.log('--- missing baseline ---');
{
  const r = buildStableReviewContractAfterOneTag({ ...GOOD_PARAMS, one_tag_baseline: null });
  assert(r.contract_status === 'STABLE_REVIEW_CONTRACT_BLOCKED_BASELINE', 'null baseline → BLOCKED_BASELINE');
  assert(r.contract_ready === false, 'contract_ready false');
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed false');
}

// baseline not ready
console.log('--- baseline not ready ---');
{
  const r = buildStableReviewContractAfterOneTag({
    ...GOOD_PARAMS,
    one_tag_baseline: { one_tag_baseline_ready: false },
  });
  assert(r.contract_status === 'STABLE_REVIEW_CONTRACT_BLOCKED_BASELINE', 'not-ready baseline → BLOCKED');
}

// backend evidence blocked
console.log('--- backend evidence blocked ---');
{
  const r1 = buildStableReviewContractAfterOneTag({ ...GOOD_PARAMS, evidence_source: 'backend' });
  assert(r1.contract_status === 'STABLE_REVIEW_CONTRACT_BLOCKED_EVIDENCE', 'backend source → BLOCKED_EVIDENCE');

  const r2 = buildStableReviewContractAfterOneTag({ ...GOOD_PARAMS, evidence_receipt_id: null });
  assert(r2.contract_status === 'STABLE_REVIEW_CONTRACT_BLOCKED_EVIDENCE', 'null receipt_id → BLOCKED_EVIDENCE');
}

// bad tag
console.log('--- bad tag ---');
{
  const r1 = buildStableReviewContractAfterOneTag({ ...GOOD_PARAMS, target_tag: 'release-1.0' });
  assert(r1.contract_status === 'STABLE_REVIEW_CONTRACT_BLOCKED_TAG', 'no-v-prefix → BLOCKED_TAG');

  const r2 = buildStableReviewContractAfterOneTag({ ...GOOD_PARAMS, git_head: 'short' });
  assert(r2.contract_status === 'STABLE_REVIEW_CONTRACT_BLOCKED_TAG', 'short head → BLOCKED_TAG');
}

// dry-run review ready
console.log('--- dry-run review ready ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  assert(r.contract_status === 'STABLE_REVIEW_CONTRACT_DRY_RUN_REVIEW_READY', 'dry-run status');
  assert(r.contract_ready === true, 'contract_ready true');
  assert(r.stable_review_possible === true, 'stable_review_possible true');
  assert(r.stable_review_allowed_real === false, 'stable_review_allowed_real false for dry-run');
  assert(r.schema_version === 'v111.0', 'schema version');
}

// mock real tag review ready
console.log('--- mock real tag review ready ---');
{
  const r = buildStableReviewContractAfterOneTag({
    ...GOOD_PARAMS,
    tag_operation_mode:        'mock_real_tag',
    actual_real_tag_created:   false,
    actual_git_push_performed: false,
  });
  assert(r.contract_status === 'STABLE_REVIEW_CONTRACT_MOCK_REAL_TAG_REVIEW_READY', 'mock-real status');
  assert(r.stable_review_allowed_real === false, 'stable_review_allowed_real false for mock');
}

// real tag review ready with mock receipt
console.log('--- real tag review ready with mock receipt ---');
{
  const r = buildStableReviewContractAfterOneTag({
    ...GOOD_PARAMS,
    actual_real_tag_created:   true,
    actual_git_push_performed: true,
  });
  assert(r.contract_status === 'STABLE_REVIEW_CONTRACT_REAL_TAG_REVIEW_READY', 'real-tag status');
  assert(r.stable_review_allowed_real === true, 'stable_review_allowed_real true for real tag mock');
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed STILL false');
  assert(r.stable_promoted === false, 'stable_promoted false');
}

// stable_promotion_allowed=false
console.log('--- stable_promotion_allowed=false ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

// stable_promoted=false
console.log('--- stable_promoted=false ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// deploy=false
console.log('--- deploy=false ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release=false
console.log('--- release=false ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  assert(r.release_performed === false, 'release_performed=false');
}

// human_review_required=true
console.log('--- human_review_required=true ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  assert(r.human_review_required === true, 'human_review_required=true');
}

// validate
console.log('--- validate ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  const v = validateStableReviewContractAfterOneTag(r);
  assert(v.valid === true, 'validate dry-run contract');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = buildStableReviewContractAfterOneTag(GOOD_PARAMS);
  const txt = renderStableReviewContractAfterOneTag(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE_REVIEW_CONTRACT'), 'render includes title');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(STABLE_REVIEW_CONTRACT_STATUSES.includes('STABLE_REVIEW_CONTRACT_DRY_RUN_REVIEW_READY'), 'dry-run in exports');
  assert(STABLE_REVIEW_CONTRACT_STATUSES.includes('STABLE_REVIEW_CONTRACT_REAL_TAG_REVIEW_READY'), 'real-tag in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
