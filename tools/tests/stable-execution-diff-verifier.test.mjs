#!/usr/bin/env node
/**
 * Tests — Stable Execution Diff Verifier V126.1
 */

import {
  verifyStableExecutionDiff,
  validateStableExecutionDiffVerifier,
  renderStableExecutionDiffVerifier,
  DIFF_VERIFIER_STATUSES,
} from '../stable-execution-diff-verifier.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_IMPORT = {
  import_ready:           true,
  import_id:              'import-001',
  governance_baseline_id: 'baseline-001',
  execution_receipt_id:   'exec-receipt-001',
  executed_by:            'human-operator',
  target_stable_ref:      'stable',
  target_tag:             'v126.1-test',
};

const GOOD_BASELINE = {
  stable_governance_baseline_ready: true,
  baseline_id:                      'baseline-001',
  target_stable_ref:                'stable',
  target_tag:                       'v126.1-test',
};

console.log('\n=== stable-execution-diff-verifier tests ===\n');

console.log('--- null import ---');
{
  const v = verifyStableExecutionDiff({ stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.verifier_status === 'DIFF_VERIFIER_BLOCKED_IMPORT', 'null import → BLOCKED_IMPORT');
  assert(v.diff_verified === false, 'diff_verified false');
}

console.log('--- import not ready ---');
{
  const v = verifyStableExecutionDiff({
    stable_execution_receipt_import:      { import_ready: false },
    stable_promotion_governance_baseline: GOOD_BASELINE,
  });
  assert(v.verifier_status === 'DIFF_VERIFIER_BLOCKED_IMPORT', 'not-ready import → BLOCKED_IMPORT');
}

console.log('--- null baseline ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT });
  assert(v.verifier_status === 'DIFF_VERIFIER_BLOCKED_BASELINE', 'null baseline → BLOCKED_BASELINE');
  assert(v.diff_verified === false, 'diff_verified false');
}

console.log('--- baseline not ready ---');
{
  const v = verifyStableExecutionDiff({
    stable_execution_receipt_import:      GOOD_IMPORT,
    stable_promotion_governance_baseline: { stable_governance_baseline_ready: false },
  });
  assert(v.verifier_status === 'DIFF_VERIFIER_BLOCKED_BASELINE', 'not-ready baseline → BLOCKED_BASELINE');
}

console.log('--- ref mismatch ---');
{
  const badImport = { ...GOOD_IMPORT, target_stable_ref: 'wrong-ref' };
  const v = verifyStableExecutionDiff({
    stable_execution_receipt_import:      badImport,
    stable_promotion_governance_baseline: GOOD_BASELINE,
  });
  assert(v.verifier_status === 'DIFF_VERIFIER_MISMATCH', 'ref mismatch → MISMATCH');
  assert(v.diff_verified === false, 'diff_verified false');
  assert(typeof v.mismatch_details === 'object', 'mismatch_details object');
  assert(v.mismatch_details.target_ref !== undefined, 'target_ref in mismatch_details');
  assert(v.checks.target_ref_match === false, 'target_ref_match false');
  assert(typeof v.verifier_id === 'string' && v.verifier_id.length === 64, 'verifier_id sha256 on mismatch');
}

console.log('--- tag mismatch ---');
{
  const badImport = { ...GOOD_IMPORT, target_tag: 'wrong-tag' };
  const v = verifyStableExecutionDiff({
    stable_execution_receipt_import:      badImport,
    stable_promotion_governance_baseline: GOOD_BASELINE,
  });
  assert(v.verifier_status === 'DIFF_VERIFIER_MISMATCH', 'tag mismatch → MISMATCH');
  assert(v.mismatch_details.target_tag !== undefined, 'target_tag in mismatch_details');
  assert(v.checks.target_tag_match === false, 'target_tag_match false');
}

console.log('--- baseline_id mismatch ---');
{
  const badImport = { ...GOOD_IMPORT, governance_baseline_id: 'wrong-baseline' };
  const v = verifyStableExecutionDiff({
    stable_execution_receipt_import:      badImport,
    stable_promotion_governance_baseline: GOOD_BASELINE,
  });
  assert(v.verifier_status === 'DIFF_VERIFIER_MISMATCH', 'baseline_id mismatch → MISMATCH');
  assert(v.mismatch_details.baseline_id !== undefined, 'baseline_id in mismatch_details');
  assert(v.checks.baseline_id_match === false, 'baseline_id_match false');
}

console.log('--- diff verified ---');
{
  const v = verifyStableExecutionDiff({
    stable_execution_receipt_import:      GOOD_IMPORT,
    stable_promotion_governance_baseline: GOOD_BASELINE,
  });
  assert(v.verifier_status === 'DIFF_VERIFIER_VERIFIED', 'verified status');
  assert(v.diff_verified === true, 'diff_verified true');
  assert(typeof v.verifier_id === 'string' && v.verifier_id.length === 64, 'verifier_id sha256');
  assert(v.schema_version === 'v126.1', 'schema version');
  assert(v.import_id === 'import-001', 'import_id propagated');
  assert(v.governance_baseline_id === 'baseline-001', 'governance_baseline_id propagated');
  assert(v.execution_receipt_id === 'exec-receipt-001', 'execution_receipt_id propagated');
  assert(v.executed_by === 'human-operator', 'executed_by propagated');
  assert(v.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(v.target_tag === 'v126.1-test', 'target_tag propagated');
  assert(v.checks.target_ref_match === true, 'target_ref_match true');
  assert(v.checks.target_tag_match === true, 'target_tag_match true');
  assert(v.checks.baseline_id_match === true, 'baseline_id_match true');
  assert(Object.keys(v.mismatch_details).length === 0, 'mismatch_details empty');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const v1 = verifyStableExecutionDiff({});
  assert(v1.system_execution_performed === false, 'blocked: false');
  const v2 = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v2.system_execution_performed === false, 'verified: false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.release_performed === false, 'release_performed=false');
}

console.log('--- diff_is_post_execution_only=true ---');
{
  const v1 = verifyStableExecutionDiff({});
  assert(v1.diff_is_post_execution_only === true, 'blocked: true');
  const v2 = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v2.diff_is_post_execution_only === true, 'verified: true');
}

console.log('--- no_automated_verification=true ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  assert(v.no_automated_verification === true, 'no_automated_verification=true');
}

console.log('--- validate ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  const val = validateStableExecutionDiffVerifier(v);
  assert(val.valid === true, 'validate verified');
  assert(val.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const val = validateStableExecutionDiffVerifier(null);
  assert(val.valid === false, 'null → invalid');
}

console.log('--- render verified ---');
{
  const v = verifyStableExecutionDiff({ stable_execution_receipt_import: GOOD_IMPORT, stable_promotion_governance_baseline: GOOD_BASELINE });
  const txt = renderStableExecutionDiffVerifier(v);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE EXECUTION DIFF VERIFIER V126.1'), 'render title');
  assert(txt.includes('DIFF_VERIFIER_VERIFIED'), 'status in output');
  assert(txt.includes('CHECKS'), 'checks section');
  assert(txt.includes('PASS target_ref_match'), 'ref check PASS');
  assert(txt.includes('system_execution_performed:'), 'invariant in output');
}

console.log('--- render blocked ---');
{
  const v = verifyStableExecutionDiff({});
  const txt = renderStableExecutionDiffVerifier(v);
  assert(txt.includes('DIFF_VERIFIER_BLOCKED_IMPORT'), 'blocked status in output');
}

console.log('--- statuses export ---');
{
  assert(DIFF_VERIFIER_STATUSES.includes('DIFF_VERIFIER_VERIFIED'), 'verified in statuses');
  assert(DIFF_VERIFIER_STATUSES.includes('DIFF_VERIFIER_MISMATCH'), 'mismatch in statuses');
  assert(DIFF_VERIFIER_STATUSES.includes('DIFF_VERIFIER_BLOCKED_IMPORT'), 'import blocked in statuses');
  assert(DIFF_VERIFIER_STATUSES.includes('DIFF_VERIFIER_BLOCKED_BASELINE'), 'baseline blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
