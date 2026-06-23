#!/usr/bin/env node
/**
 * Tests — Real Repo Patch RC Dry Run V185.0
 */

import {
  buildRealRepoPatchRcDryRun,
  validateRealRepoPatchRcDryRun,
  renderRealRepoPatchRcDryRun,
  REAL_REPO_PATCH_RC_DRY_RUN_STATUSES,
} from '../real-repo-patch-rc-dry-run.mjs';

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
  rc_id: 'rc-001',
  binding_id: 'binding-001',
  replay_id: 'replay-001',
  approval_bound: true,
  approval_decision: 'approved',
};

console.log('\n=== real-repo-patch-rc-dry-run tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_RC_DRY_RUN_STATUSES));
assert('has RC_DRY_RUN_BLOCKED_INPUT', REAL_REPO_PATCH_RC_DRY_RUN_STATUSES.includes('RC_DRY_RUN_BLOCKED_INPUT'));
assert('has RC_DRY_RUN_BLOCKED_APPROVAL', REAL_REPO_PATCH_RC_DRY_RUN_STATUSES.includes('RC_DRY_RUN_BLOCKED_APPROVAL'));
assert('has RC_DRY_RUN_READY', REAL_REPO_PATCH_RC_DRY_RUN_STATUSES.includes('RC_DRY_RUN_READY'));
assert('build is function', typeof buildRealRepoPatchRcDryRun === 'function');
assert('validate is function', typeof validateRealRepoPatchRcDryRun === 'function');
assert('render is function', typeof renderRealRepoPatchRcDryRun === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchRcDryRun(null);
  assert('null → BLOCKED_INPUT', r.status === 'RC_DRY_RUN_BLOCKED_INPUT');
  assert('null: dry_run_performed=false', r.dry_run_performed === false);
  assert('null: release_executed=false', r.release_executed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchRcDryRun({});
  assert('no rc_id → BLOCKED_INPUT', r.status === 'RC_DRY_RUN_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchRcDryRun({ rc_id: 'r' });
  assert('no binding_id → BLOCKED_INPUT', r.status === 'RC_DRY_RUN_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchRcDryRun({ rc_id: 'r', binding_id: 'b' });
  assert('no replay_id → BLOCKED_INPUT', r.status === 'RC_DRY_RUN_BLOCKED_INPUT');
}

// --- blocked approval ---
console.log('--- blocked approval ---');
{
  const r = buildRealRepoPatchRcDryRun({ ...VALID_INPUT, approval_bound: false });
  assert('approval_bound=false → BLOCKED_APPROVAL', r.status === 'RC_DRY_RUN_BLOCKED_APPROVAL');
  assert('blocked_approval: dry_run_performed=false', r.dry_run_performed === false);
  assert('blocked_approval: release_executed=false', r.release_executed === false);
  assert('blocked_approval: rc_hash=null', r.rc_hash === null);
}
{
  const r = buildRealRepoPatchRcDryRun({ ...VALID_INPUT, approval_decision: 'rejected' });
  assert('decision=rejected → BLOCKED_APPROVAL', r.status === 'RC_DRY_RUN_BLOCKED_APPROVAL');
}
{
  const r = buildRealRepoPatchRcDryRun({ ...VALID_INPUT, approval_bound: undefined });
  assert('approval_bound=undefined → BLOCKED_APPROVAL', r.status === 'RC_DRY_RUN_BLOCKED_APPROVAL');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchRcDryRun(VALID_INPUT);
  assert('valid → RC_DRY_RUN_READY', r.status === 'RC_DRY_RUN_READY');
  assert('ready: schema_version=v185.0', r.schema_version === 'v185.0');
  assert('ready: rc_id set', r.rc_id === 'rc-001');
  assert('ready: binding_id set', r.binding_id === 'binding-001');
  assert('ready: replay_id set', r.replay_id === 'replay-001');
  assert('ready: dry_run_performed=false', r.dry_run_performed === false);
  assert('ready: release_executed=false', r.release_executed === false);
  assert('ready: rc_hash 64 chars', typeof r.rc_hash === 'string' && r.rc_hash.length === 64);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchRcDryRun(VALID_INPUT);
  const r2 = buildRealRepoPatchRcDryRun(VALID_INPUT);
  assert('hash deterministic', r1.rc_hash === r2.rc_hash);
  const r3 = buildRealRepoPatchRcDryRun({ ...VALID_INPUT, rc_id: 'rc-002' });
  assert('different rc_id → different hash', r1.rc_hash !== r3.rc_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchRcDryRun(VALID_INPUT);
  const v = validateRealRepoPatchRcDryRun(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchRcDryRun(null);
  const v = validateRealRepoPatchRcDryRun(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchRcDryRun(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchRcDryRun(VALID_INPUT);
  const s = renderRealRepoPatchRcDryRun(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains RC_DRY_RUN_READY', s.includes('RC_DRY_RUN_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains rc-001', s.includes('rc-001'));
}
{
  const s = renderRealRepoPatchRcDryRun(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchRcDryRun(null),
    buildRealRepoPatchRcDryRun({}),
    buildRealRepoPatchRcDryRun({ ...VALID_INPUT, approval_bound: false }),
    buildRealRepoPatchRcDryRun({ ...VALID_INPUT, approval_decision: 'rejected' }),
    buildRealRepoPatchRcDryRun(VALID_INPUT),
  ];
  assert('all: dry_run_performed=false', cases.every(r => r.dry_run_performed === false));
  assert('all: release_executed=false', cases.every(r => r.release_executed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
