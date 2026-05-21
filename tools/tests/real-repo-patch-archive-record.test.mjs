#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Archive Record V179.0
 */

import {
  buildRealRepoPatchArchiveRecord,
  validateRealRepoPatchArchiveRecord,
  renderRealRepoPatchArchiveRecord,
  REAL_REPO_PATCH_ARCHIVE_RECORD_STATUSES,
} from '../real-repo-patch-archive-record.mjs';

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
  archive_record_id: 'archive-001',
  baseline_id: 'baseline-001',
  real_repo_patch_baseline_ready: true,
  production_touched: false,
  local_only: true,
};

console.log('\n=== real-repo-patch-archive-record tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_ARCHIVE_RECORD_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_ARCHIVE_RECORD_STATUSES.includes('REPO_PATCH_ARCHIVE_BLOCKED_INPUT'));
assert('has BLOCKED_BASELINE', REAL_REPO_PATCH_ARCHIVE_RECORD_STATUSES.includes('REPO_PATCH_ARCHIVE_BLOCKED_BASELINE'));
assert('has ARCHIVE_READY', REAL_REPO_PATCH_ARCHIVE_RECORD_STATUSES.includes('REPO_PATCH_ARCHIVE_READY'));
assert('build is function', typeof buildRealRepoPatchArchiveRecord === 'function');
assert('validate is function', typeof validateRealRepoPatchArchiveRecord === 'function');
assert('render is function', typeof renderRealRepoPatchArchiveRecord === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchArchiveRecord(null);
  assert('null → BLOCKED_INPUT', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: archive_ready=false', r.archive_record_ready === false);
}
{
  const r = buildRealRepoPatchArchiveRecord({});
  assert('empty → BLOCKED_INPUT', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, archive_record_id: '' });
  assert('empty archive_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, baseline_id: null });
  assert('null baseline_id → BLOCKED_INPUT', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_INPUT', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_INPUT', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_INPUT');
}

// --- blocked baseline ---
console.log('--- blocked baseline ---');
{
  const r = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, real_repo_patch_baseline_ready: false });
  assert('!baseline_ready → BLOCKED_BASELINE', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_BASELINE');
  assert('blocked_baseline: archive_ready=false', r.archive_record_ready === false);
  assert('blocked_baseline: archive_hash=null', r.archive_hash === null);
  assert('blocked_baseline: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, real_repo_patch_baseline_ready: null });
  assert('null baseline_ready → BLOCKED_BASELINE', r.status === 'REPO_PATCH_ARCHIVE_BLOCKED_BASELINE');
}

// --- archive ready ---
console.log('--- archive ready ---');
{
  const r = buildRealRepoPatchArchiveRecord(VALID_INPUT);
  assert('valid → ARCHIVE_READY', r.status === 'REPO_PATCH_ARCHIVE_READY');
  assert('ready: archive_record_ready=true', r.archive_record_ready === true);
  assert('ready: archive_hash set (64 chars)', typeof r.archive_hash === 'string' && r.archive_hash.length === 64);
  assert('ready: schema_version=v179.0', r.schema_version === 'v179.0');
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: archive_record_id set', r.archive_record_id === 'archive-001');
  assert('ready: baseline_id set', r.baseline_id === 'baseline-001');
  assert('ready: errors empty', r.errors.length === 0);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchArchiveRecord(VALID_INPUT);
  const r2 = buildRealRepoPatchArchiveRecord(VALID_INPUT);
  assert('hash deterministic', r1.archive_hash === r2.archive_hash);
  const r3 = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, baseline_id: 'baseline-999' });
  assert('different baseline → different hash', r1.archive_hash !== r3.archive_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchArchiveRecord(VALID_INPUT);
  const v = validateRealRepoPatchArchiveRecord(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchArchiveRecord(null);
  const v = validateRealRepoPatchArchiveRecord(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchArchiveRecord(null);
  assert('validate null: valid=false', v.valid === false);
}
{
  const r = buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, real_repo_patch_baseline_ready: false });
  const v = validateRealRepoPatchArchiveRecord(r);
  assert('validate blocked_baseline: valid=true', v.valid === true);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchArchiveRecord(VALID_INPUT);
  const s = renderRealRepoPatchArchiveRecord(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains ARCHIVE_READY', s.includes('REPO_PATCH_ARCHIVE_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderRealRepoPatchArchiveRecord(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchArchiveRecord(null),
    buildRealRepoPatchArchiveRecord({}),
    buildRealRepoPatchArchiveRecord(VALID_INPUT),
    buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, real_repo_patch_baseline_ready: false }),
    buildRealRepoPatchArchiveRecord({ ...VALID_INPUT, production_touched: true }),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
