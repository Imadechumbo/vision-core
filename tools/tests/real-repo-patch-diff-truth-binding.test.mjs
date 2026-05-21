#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Diff Truth Binding V173.0
 */

import {
  buildRealRepoPatchDiffTruthBinding,
  REAL_REPO_PATCH_DIFF_TRUTH_STATUSES,
} from '../real-repo-patch-diff-truth-binding.mjs';

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
  diff_truth_id: 'diff-001',
  physical_apply_proof_id: 'proof-001',
  actual_diff: ['docs/real-repo-patch-drill-target.md'],
  claimed_changed_files: ['docs/real-repo-patch-drill-target.md'],
  forbidden_files_detected: false,
};

console.log('\n=== real-repo-patch-diff-truth-binding tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_DIFF_TRUTH_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_DIFF_TRUTH_STATUSES.includes('REPO_DIFF_TRUTH_BLOCKED_INPUT'));
assert('has BLOCKED_NO_DIFF', REAL_REPO_PATCH_DIFF_TRUTH_STATUSES.includes('REPO_DIFF_TRUTH_BLOCKED_NO_DIFF'));
assert('has BLOCKED_FORBIDDEN_FILE', REAL_REPO_PATCH_DIFF_TRUTH_STATUSES.includes('REPO_DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE'));
assert('has BOUND', REAL_REPO_PATCH_DIFF_TRUTH_STATUSES.includes('REPO_DIFF_TRUTH_BOUND'));
assert('build is function', typeof buildRealRepoPatchDiffTruthBinding === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchDiffTruthBinding({ physical_apply_proof_id: 'proof', actual_diff: ['f'] });
  assert('missing diff_truth_id → BLOCKED_INPUT', r.status === 'REPO_DIFF_TRUTH_BLOCKED_INPUT');
  assert('blocked: production_touched=false', r.production_touched === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchDiffTruthBinding({ diff_truth_id: 'dt', actual_diff: ['f'] });
  assert('missing physical_apply_proof_id → BLOCKED_INPUT', r.status === 'REPO_DIFF_TRUTH_BLOCKED_INPUT');
}

// --- blocked no diff ---
console.log('--- blocked no diff ---');
{
  const r = buildRealRepoPatchDiffTruthBinding({ ...VALID_INPUT, actual_diff: [] });
  assert('empty actual_diff → BLOCKED_NO_DIFF', r.status === 'REPO_DIFF_TRUTH_BLOCKED_NO_DIFF');
  assert('no_diff: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchDiffTruthBinding({ ...VALID_INPUT, actual_diff: undefined });
  assert('undefined actual_diff → BLOCKED_NO_DIFF', r.status === 'REPO_DIFF_TRUTH_BLOCKED_NO_DIFF');
}

// --- blocked forbidden file ---
console.log('--- blocked forbidden file ---');
{
  const r = buildRealRepoPatchDiffTruthBinding({ ...VALID_INPUT, forbidden_files_detected: true });
  assert('forbidden_files_detected=true → BLOCKED_FORBIDDEN_FILE', r.status === 'REPO_DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE');
  assert('forbidden: production_touched=false', r.production_touched === false);
}

// --- bound ---
console.log('--- bound ---');
{
  const r = buildRealRepoPatchDiffTruthBinding(VALID_INPUT);
  assert('valid → BOUND', r.status === 'REPO_DIFF_TRUTH_BOUND');
  assert('bound: diff_truth_bound=true', r.diff_truth_bound === true);
  assert('bound: schema_version=v173.0', r.schema_version === 'v173.0');
  assert('bound: claim_matches_diff=true', r.claim_matches_diff === true);
  assert('bound: diff_truth_id set', r.diff_truth_id === 'diff-001');
  assert('bound: production_touched=false', r.production_touched === false);
  assert('bound: deploy_performed=false', r.deploy_performed === false);
  assert('bound: stable_promoted=false', r.stable_promoted === false);
  assert('bound: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchDiffTruthBinding({ ...VALID_INPUT, claimed_changed_files: ['other.md'] });
  assert('claim mismatch: still BOUND', r.status === 'REPO_DIFF_TRUTH_BOUND');
  assert('claim mismatch: claim_matches_diff=false', r.claim_matches_diff === false);
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchDiffTruthBinding({ physical_apply_proof_id: 'proof', actual_diff: ['f'] }),
    buildRealRepoPatchDiffTruthBinding({ ...VALID_INPUT, actual_diff: [] }),
    buildRealRepoPatchDiffTruthBinding({ ...VALID_INPUT, forbidden_files_detected: true }),
    buildRealRepoPatchDiffTruthBinding(VALID_INPUT),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
