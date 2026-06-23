#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Final Report V176.0
 */

import {
  buildRealRepoPatchFinalReport,
  REAL_REPO_PATCH_FINAL_REPORT_STATUSES,
} from '../real-repo-patch-final-report.mjs';

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
  report_id: 'report-001',
  receipt_id: 'receipt-001',
  target_file: 'docs/real-repo-patch-drill-target.md',
  tests_passed: true,
  rollback_drill_passed: true,
  diff_truth_bound: true,
  only_allowed_files_touched: true,
  evidence_receipt_ready: true,
};

console.log('\n=== real-repo-patch-final-report tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_FINAL_REPORT_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_FINAL_REPORT_STATUSES.includes('REPO_PATCH_REPORT_BLOCKED_INPUT'));
assert('has BLOCKED_RECEIPT', REAL_REPO_PATCH_FINAL_REPORT_STATUSES.includes('REPO_PATCH_REPORT_BLOCKED_RECEIPT'));
assert('has READY', REAL_REPO_PATCH_FINAL_REPORT_STATUSES.includes('REPO_PATCH_REPORT_READY'));
assert('build is function', typeof buildRealRepoPatchFinalReport === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchFinalReport({ evidence_receipt_ready: true });
  assert('missing report_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_REPORT_BLOCKED_INPUT');
  assert('blocked: production_touched=false', r.production_touched === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchFinalReport({});
  assert('empty input → BLOCKED_INPUT', r.status === 'REPO_PATCH_REPORT_BLOCKED_INPUT');
}

// --- blocked receipt ---
console.log('--- blocked receipt ---');
{
  const r = buildRealRepoPatchFinalReport({ ...VALID_INPUT, evidence_receipt_ready: false });
  assert('evidence_receipt_ready=false → BLOCKED_RECEIPT', r.status === 'REPO_PATCH_REPORT_BLOCKED_RECEIPT');
  assert('blocked_receipt: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchFinalReport({ ...VALID_INPUT, evidence_receipt_ready: undefined });
  assert('evidence_receipt_ready=undefined → BLOCKED_RECEIPT', r.status === 'REPO_PATCH_REPORT_BLOCKED_RECEIPT');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchFinalReport(VALID_INPUT);
  assert('all conditions → READY', r.status === 'REPO_PATCH_REPORT_READY');
  assert('ready: real_repo_patch_final_report_ready=true', r.real_repo_patch_final_report_ready === true);
  assert('ready: schema_version=v176.0', r.schema_version === 'v176.0');
  assert('ready: report_id set', r.report_id === 'report-001');
  assert('ready: receipt_id set', r.receipt_id === 'receipt-001');
  assert('ready: target_file set', r.target_file === 'docs/real-repo-patch-drill-target.md');
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchFinalReport({}),
    buildRealRepoPatchFinalReport({ report_id: 'r', evidence_receipt_ready: false }),
    buildRealRepoPatchFinalReport(VALID_INPUT),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
