#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Release Plan Generator V186.0
 */

import {
  buildRealRepoPatchReleasePlanGenerator,
  validateRealRepoPatchReleasePlanGenerator,
  renderRealRepoPatchReleasePlanGenerator,
  REAL_REPO_PATCH_RELEASE_PLAN_STATUSES,
} from '../real-repo-patch-release-plan-generator.mjs';

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
  plan_id: 'plan-001',
  rc_id: 'rc-001',
  rc_dry_run_ready: true,
};

console.log('\n=== real-repo-patch-release-plan-generator tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_RELEASE_PLAN_STATUSES));
assert('has RELEASE_PLAN_BLOCKED_INPUT', REAL_REPO_PATCH_RELEASE_PLAN_STATUSES.includes('RELEASE_PLAN_BLOCKED_INPUT'));
assert('has RELEASE_PLAN_BLOCKED_RC', REAL_REPO_PATCH_RELEASE_PLAN_STATUSES.includes('RELEASE_PLAN_BLOCKED_RC'));
assert('has RELEASE_PLAN_READY', REAL_REPO_PATCH_RELEASE_PLAN_STATUSES.includes('RELEASE_PLAN_READY'));
assert('build is function', typeof buildRealRepoPatchReleasePlanGenerator === 'function');
assert('validate is function', typeof validateRealRepoPatchReleasePlanGenerator === 'function');
assert('render is function', typeof renderRealRepoPatchReleasePlanGenerator === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchReleasePlanGenerator(null);
  assert('null → BLOCKED_INPUT', r.status === 'RELEASE_PLAN_BLOCKED_INPUT');
  assert('null: release_executed=false', r.release_executed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: planned_steps empty', r.planned_steps.length === 0);
}
{
  const r = buildRealRepoPatchReleasePlanGenerator({});
  assert('no plan_id → BLOCKED_INPUT', r.status === 'RELEASE_PLAN_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchReleasePlanGenerator({ plan_id: 'p' });
  assert('no rc_id → BLOCKED_INPUT', r.status === 'RELEASE_PLAN_BLOCKED_INPUT');
}

// --- blocked rc ---
console.log('--- blocked rc ---');
{
  const r = buildRealRepoPatchReleasePlanGenerator({ ...VALID_INPUT, rc_dry_run_ready: false });
  assert('rc_dry_run_ready=false → BLOCKED_RC', r.status === 'RELEASE_PLAN_BLOCKED_RC');
  assert('blocked_rc: release_executed=false', r.release_executed === false);
  assert('blocked_rc: planned_steps empty', r.planned_steps.length === 0);
  assert('blocked_rc: plan_hash=null', r.plan_hash === null);
}
{
  const r = buildRealRepoPatchReleasePlanGenerator({ ...VALID_INPUT, rc_dry_run_ready: undefined });
  assert('rc_dry_run_ready=undefined → BLOCKED_RC', r.status === 'RELEASE_PLAN_BLOCKED_RC');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchReleasePlanGenerator(VALID_INPUT);
  assert('valid → RELEASE_PLAN_READY', r.status === 'RELEASE_PLAN_READY');
  assert('ready: schema_version=v186.0', r.schema_version === 'v186.0');
  assert('ready: plan_id set', r.plan_id === 'plan-001');
  assert('ready: rc_id set', r.rc_id === 'rc-001');
  assert('ready: planned_steps has 15', r.planned_steps.length === 15);
  assert('ready: rollback_steps non-empty', r.rollback_steps.length > 0);
  assert('ready: validation_steps non-empty', r.validation_steps.length > 0);
  assert('ready: release_executed=false', r.release_executed === false);
  assert('ready: plan_hash 64 chars', typeof r.plan_hash === 'string' && r.plan_hash.length === 64);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- planned steps content ---
console.log('--- planned steps content ---');
{
  const r = buildRealRepoPatchReleasePlanGenerator(VALID_INPUT);
  assert('planned: starts with verify_scope_contract', r.planned_steps[0] === 'verify_scope_contract');
  assert('planned: ends with confirm_execution_baseline', r.planned_steps[14] === 'confirm_execution_baseline');
  assert('rollback: includes halt_on_failure', r.rollback_steps.includes('halt_on_failure'));
  assert('validation: includes validate_graph_integrity', r.validation_steps.includes('validate_graph_integrity'));
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchReleasePlanGenerator(VALID_INPUT);
  const r2 = buildRealRepoPatchReleasePlanGenerator(VALID_INPUT);
  assert('hash deterministic', r1.plan_hash === r2.plan_hash);
  const r3 = buildRealRepoPatchReleasePlanGenerator({ ...VALID_INPUT, plan_id: 'plan-002' });
  assert('different plan_id → different hash', r1.plan_hash !== r3.plan_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchReleasePlanGenerator(VALID_INPUT);
  const v = validateRealRepoPatchReleasePlanGenerator(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchReleasePlanGenerator(null);
  const v = validateRealRepoPatchReleasePlanGenerator(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchReleasePlanGenerator(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchReleasePlanGenerator(VALID_INPUT);
  const s = renderRealRepoPatchReleasePlanGenerator(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains RELEASE_PLAN_READY', s.includes('RELEASE_PLAN_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains 15', s.includes('15'));
}
{
  const s = renderRealRepoPatchReleasePlanGenerator(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchReleasePlanGenerator(null),
    buildRealRepoPatchReleasePlanGenerator({}),
    buildRealRepoPatchReleasePlanGenerator({ ...VALID_INPUT, rc_dry_run_ready: false }),
    buildRealRepoPatchReleasePlanGenerator(VALID_INPUT),
  ];
  assert('all: release_executed=false', cases.every(r => r.release_executed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
