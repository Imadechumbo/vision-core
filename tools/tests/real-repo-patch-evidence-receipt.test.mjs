#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Evidence Receipt V175.0
 */

import {
  buildRealRepoPatchEvidenceReceipt,
  REAL_REPO_PATCH_EVIDENCE_RECEIPT_STATUSES,
} from '../real-repo-patch-evidence-receipt.mjs';

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
  receipt_id: 'receipt-001',
  physical_apply_proof_id: 'proof-001',
  diff_truth_id: 'diff-001',
  test_lane_id: 'lane-001',
  rollback_drill_id: 'drill-001',
  physical_apply_proof_ready: true,
  diff_truth_bound: true,
  test_lane_passed: true,
  rollback_drill_passed: true,
};

console.log('\n=== real-repo-patch-evidence-receipt tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_EVIDENCE_RECEIPT_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_EVIDENCE_RECEIPT_STATUSES.includes('REPO_PATCH_RECEIPT_BLOCKED_INPUT'));
assert('has BLOCKED_EVIDENCE', REAL_REPO_PATCH_EVIDENCE_RECEIPT_STATUSES.includes('REPO_PATCH_RECEIPT_BLOCKED_EVIDENCE'));
assert('has READY', REAL_REPO_PATCH_EVIDENCE_RECEIPT_STATUSES.includes('REPO_PATCH_RECEIPT_READY'));
assert('build is function', typeof buildRealRepoPatchEvidenceReceipt === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchEvidenceReceipt({
    physical_apply_proof_ready: true, diff_truth_bound: true, test_lane_passed: true, rollback_drill_passed: true,
  });
  assert('missing receipt_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_RECEIPT_BLOCKED_INPUT');
  assert('blocked: production_touched=false', r.production_touched === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchEvidenceReceipt({});
  assert('empty input → BLOCKED_INPUT', r.status === 'REPO_PATCH_RECEIPT_BLOCKED_INPUT');
}

// --- blocked evidence ---
console.log('--- blocked evidence ---');
{
  const r = buildRealRepoPatchEvidenceReceipt({ ...VALID_INPUT, physical_apply_proof_ready: false });
  assert('physical_apply_proof_ready=false → BLOCKED_EVIDENCE', r.status === 'REPO_PATCH_RECEIPT_BLOCKED_EVIDENCE');
  assert('blocked_evidence: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchEvidenceReceipt({ ...VALID_INPUT, diff_truth_bound: false });
  assert('diff_truth_bound=false → BLOCKED_EVIDENCE', r.status === 'REPO_PATCH_RECEIPT_BLOCKED_EVIDENCE');
}
{
  const r = buildRealRepoPatchEvidenceReceipt({ ...VALID_INPUT, test_lane_passed: false });
  assert('test_lane_passed=false → BLOCKED_EVIDENCE', r.status === 'REPO_PATCH_RECEIPT_BLOCKED_EVIDENCE');
}
{
  const r = buildRealRepoPatchEvidenceReceipt({ ...VALID_INPUT, rollback_drill_passed: false });
  assert('rollback_drill_passed=false → BLOCKED_EVIDENCE', r.status === 'REPO_PATCH_RECEIPT_BLOCKED_EVIDENCE');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchEvidenceReceipt(VALID_INPUT);
  assert('all evidence → READY', r.status === 'REPO_PATCH_RECEIPT_READY');
  assert('ready: real_repo_patch_receipt_ready=true', r.real_repo_patch_receipt_ready === true);
  assert('ready: evidence_complete=true', r.evidence_complete === true);
  assert('ready: schema_version=v175.0', r.schema_version === 'v175.0');
  assert('ready: receipt_id set', r.receipt_id === 'receipt-001');
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchEvidenceReceipt({}),
    buildRealRepoPatchEvidenceReceipt({ ...VALID_INPUT, physical_apply_proof_ready: false }),
    buildRealRepoPatchEvidenceReceipt({ ...VALID_INPUT, diff_truth_bound: false }),
    buildRealRepoPatchEvidenceReceipt(VALID_INPUT),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
