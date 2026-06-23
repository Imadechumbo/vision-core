#!/usr/bin/env node
/**
 * Tests — First Real Repo Patch Execution Baseline V180.0
 */

import {
  buildFirstRealRepoPatchExecutionBaseline,
  validateFirstRealRepoPatchExecutionBaseline,
  renderFirstRealRepoPatchExecutionBaseline,
  FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_STATUSES,
} from '../first-real-repo-patch-execution-baseline.mjs';

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
  execution_baseline_id: 'exec-baseline-001',
  archive_record_id: 'archive-001',
  archive_record_ready: true,
  production_touched: false,
  local_only: true,
};

console.log('\n=== first-real-repo-patch-execution-baseline tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_STATUSES));
assert('has BLOCKED_INPUT', FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_STATUSES.includes('FIRST_REAL_REPO_PATCH_BLOCKED_INPUT'));
assert('has BLOCKED_ARCHIVE', FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_STATUSES.includes('FIRST_REAL_REPO_PATCH_BLOCKED_ARCHIVE'));
assert('has BASELINE_READY', FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_STATUSES.includes('FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_READY'));
assert('build is function', typeof buildFirstRealRepoPatchExecutionBaseline === 'function');
assert('validate is function', typeof validateFirstRealRepoPatchExecutionBaseline === 'function');
assert('render is function', typeof renderFirstRealRepoPatchExecutionBaseline === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildFirstRealRepoPatchExecutionBaseline(null);
  assert('null → BLOCKED_INPUT', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: baseline_ready=false', r.first_real_repo_patch_execution_baseline_ready === false);
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline({});
  assert('empty → BLOCKED_INPUT', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT');
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, execution_baseline_id: '' });
  assert('empty exec_id → BLOCKED_INPUT', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT');
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, archive_record_id: null });
  assert('null archive_id → BLOCKED_INPUT', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT');
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_INPUT', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT');
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_INPUT', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_INPUT');
}

// --- blocked archive ---
console.log('--- blocked archive ---');
{
  const r = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, archive_record_ready: false });
  assert('!archive_ready → BLOCKED_ARCHIVE', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_ARCHIVE');
  assert('blocked_archive: baseline_ready=false', r.first_real_repo_patch_execution_baseline_ready === false);
  assert('blocked_archive: baseline_hash=null', r.baseline_hash === null);
  assert('blocked_archive: production_touched=false', r.production_touched === false);
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, archive_record_ready: null });
  assert('null archive_ready → BLOCKED_ARCHIVE', r.status === 'FIRST_REAL_REPO_PATCH_BLOCKED_ARCHIVE');
}

// --- baseline ready ---
console.log('--- baseline ready ---');
{
  const r = buildFirstRealRepoPatchExecutionBaseline(VALID_INPUT);
  assert('valid → EXECUTION_BASELINE_READY', r.status === 'FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_READY');
  assert('ready: first_real_repo_patch_execution_baseline_ready=true', r.first_real_repo_patch_execution_baseline_ready === true);
  assert('ready: baseline_hash set (64 chars)', typeof r.baseline_hash === 'string' && r.baseline_hash.length === 64);
  assert('ready: schema_version=v180.0', r.schema_version === 'v180.0');
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: execution_baseline_id set', r.execution_baseline_id === 'exec-baseline-001');
  assert('ready: archive_record_id set', r.archive_record_id === 'archive-001');
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: pipeline_modules has 14 entries', r.pipeline_modules.length === 14);
}

// --- pipeline modules ---
console.log('--- pipeline modules ---');
{
  const r = buildFirstRealRepoPatchExecutionBaseline(VALID_INPUT);
  assert('has scope-contract', r.pipeline_modules.includes('real-repo-patch-scope-contract'));
  assert('has pre-state-snapshot', r.pipeline_modules.includes('real-repo-patch-pre-state-snapshot'));
  assert('has apply-controller', r.pipeline_modules.includes('real-repo-patch-apply-controller'));
  assert('has physical-apply-proof', r.pipeline_modules.includes('real-repo-patch-physical-apply-proof'));
  assert('has diff-truth-binding', r.pipeline_modules.includes('real-repo-patch-diff-truth-binding'));
  assert('has test-lane', r.pipeline_modules.includes('real-repo-patch-test-lane'));
  assert('has rollback-plan', r.pipeline_modules.includes('real-repo-patch-rollback-plan'));
  assert('has rollback-drill', r.pipeline_modules.includes('real-repo-patch-rollback-drill'));
  assert('has evidence-receipt', r.pipeline_modules.includes('real-repo-patch-evidence-receipt'));
  assert('has ledger', r.pipeline_modules.includes('real-repo-patch-ledger'));
  assert('has final-report', r.pipeline_modules.includes('real-repo-patch-final-report'));
  assert('has pass-gold-candidate-gate', r.pipeline_modules.includes('real-repo-patch-pass-gold-candidate-gate'));
  assert('has baseline', r.pipeline_modules.includes('real-repo-patch-baseline'));
  assert('has archive-record', r.pipeline_modules.includes('real-repo-patch-archive-record'));
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildFirstRealRepoPatchExecutionBaseline(VALID_INPUT);
  const r2 = buildFirstRealRepoPatchExecutionBaseline(VALID_INPUT);
  assert('hash deterministic', r1.baseline_hash === r2.baseline_hash);
  const r3 = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, archive_record_id: 'archive-999' });
  assert('different archive → different hash', r1.baseline_hash !== r3.baseline_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildFirstRealRepoPatchExecutionBaseline(VALID_INPUT);
  const v = validateFirstRealRepoPatchExecutionBaseline(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline(null);
  const v = validateFirstRealRepoPatchExecutionBaseline(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateFirstRealRepoPatchExecutionBaseline(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, archive_record_ready: false });
  const v = validateFirstRealRepoPatchExecutionBaseline(r);
  assert('validate blocked_archive: valid=true', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildFirstRealRepoPatchExecutionBaseline(VALID_INPUT);
  const s = renderFirstRealRepoPatchExecutionBaseline(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains EXECUTION_BASELINE_READY', s.includes('FIRST_REAL_REPO_PATCH_EXECUTION_BASELINE_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains 14', s.includes('14'));
}
{
  const s = renderFirstRealRepoPatchExecutionBaseline(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildFirstRealRepoPatchExecutionBaseline(null),
    buildFirstRealRepoPatchExecutionBaseline({}),
    buildFirstRealRepoPatchExecutionBaseline(VALID_INPUT),
    buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, archive_record_ready: false }),
    buildFirstRealRepoPatchExecutionBaseline({ ...VALID_INPUT, production_touched: true }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
