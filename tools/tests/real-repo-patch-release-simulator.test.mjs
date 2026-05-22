#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Release Simulator V187.0
 */

import {
  buildRealRepoPatchReleaseSimulator,
  validateRealRepoPatchReleaseSimulator,
  renderRealRepoPatchReleaseSimulator,
  REAL_REPO_PATCH_RELEASE_SIM_STATUSES,
} from '../real-repo-patch-release-simulator.mjs';

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

const PLANNED_STEPS = [
  'verify_scope_contract', 'confirm_pre_state_snapshot', 'validate_apply_controller',
  'confirm_physical_apply_proof', 'verify_diff_truth_binding', 'confirm_test_lane',
  'verify_rollback_plan', 'confirm_rollback_drill', 'verify_evidence_receipt',
  'confirm_ledger', 'verify_final_report', 'confirm_pass_gold_candidate_gate',
  'confirm_baseline', 'confirm_archive_record', 'confirm_execution_baseline',
];

const VALID_INPUT = {
  sim_id: 'sim-001',
  plan_id: 'plan-001',
  release_plan_ready: true,
  planned_steps: PLANNED_STEPS,
};

console.log('\n=== real-repo-patch-release-simulator tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_RELEASE_SIM_STATUSES));
assert('has RELEASE_SIM_BLOCKED_INPUT', REAL_REPO_PATCH_RELEASE_SIM_STATUSES.includes('RELEASE_SIM_BLOCKED_INPUT'));
assert('has RELEASE_SIM_BLOCKED_PLAN', REAL_REPO_PATCH_RELEASE_SIM_STATUSES.includes('RELEASE_SIM_BLOCKED_PLAN'));
assert('has RELEASE_SIM_FAIL', REAL_REPO_PATCH_RELEASE_SIM_STATUSES.includes('RELEASE_SIM_FAIL'));
assert('has RELEASE_SIM_PASS', REAL_REPO_PATCH_RELEASE_SIM_STATUSES.includes('RELEASE_SIM_PASS'));
assert('build is function', typeof buildRealRepoPatchReleaseSimulator === 'function');
assert('validate is function', typeof validateRealRepoPatchReleaseSimulator === 'function');
assert('render is function', typeof renderRealRepoPatchReleaseSimulator === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchReleaseSimulator(null);
  assert('null → BLOCKED_INPUT', r.status === 'RELEASE_SIM_BLOCKED_INPUT');
  assert('null: tag_created=false', r.tag_created === false);
  assert('null: release_executed=false', r.release_executed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchReleaseSimulator({});
  assert('no sim_id → BLOCKED_INPUT', r.status === 'RELEASE_SIM_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchReleaseSimulator({ sim_id: 's' });
  assert('no plan_id → BLOCKED_INPUT', r.status === 'RELEASE_SIM_BLOCKED_INPUT');
}

// --- blocked plan ---
console.log('--- blocked plan ---');
{
  const r = buildRealRepoPatchReleaseSimulator({ ...VALID_INPUT, release_plan_ready: false });
  assert('plan_ready=false → BLOCKED_PLAN', r.status === 'RELEASE_SIM_BLOCKED_PLAN');
  assert('blocked_plan: tag_created=false', r.tag_created === false);
  assert('blocked_plan: simulated_steps empty', r.simulated_steps.length === 0);
}
{
  const r = buildRealRepoPatchReleaseSimulator({ ...VALID_INPUT, planned_steps: [] });
  assert('empty planned_steps → BLOCKED_PLAN', r.status === 'RELEASE_SIM_BLOCKED_PLAN');
}
{
  const r = buildRealRepoPatchReleaseSimulator({ ...VALID_INPUT, planned_steps: undefined });
  assert('no planned_steps → BLOCKED_PLAN', r.status === 'RELEASE_SIM_BLOCKED_PLAN');
}

// --- sim fail ---
console.log('--- sim fail ---');
{
  const r = buildRealRepoPatchReleaseSimulator({
    ...VALID_INPUT,
    forced_failures: ['confirm_test_lane'],
  });
  assert('forced_failure → RELEASE_SIM_FAIL', r.status === 'RELEASE_SIM_FAIL');
  assert('fail: failed_steps has confirm_test_lane', r.failed_steps.includes('confirm_test_lane'));
  assert('fail: tag_created=false', r.tag_created === false);
  assert('fail: release_executed=false', r.release_executed === false);
  assert('fail: sim_hash=null', r.sim_hash === null);
}
{
  const r = buildRealRepoPatchReleaseSimulator({
    ...VALID_INPUT,
    forced_failures: ['verify_scope_contract', 'confirm_ledger'],
  });
  assert('multiple failures → RELEASE_SIM_FAIL', r.status === 'RELEASE_SIM_FAIL');
  assert('fail: 2 failed_steps', r.failed_steps.length === 2);
}

// --- sim pass ---
console.log('--- sim pass ---');
{
  const r = buildRealRepoPatchReleaseSimulator(VALID_INPUT);
  assert('valid → RELEASE_SIM_PASS', r.status === 'RELEASE_SIM_PASS');
  assert('pass: schema_version=v187.0', r.schema_version === 'v187.0');
  assert('pass: sim_id set', r.sim_id === 'sim-001');
  assert('pass: plan_id set', r.plan_id === 'plan-001');
  assert('pass: simulated_steps has 15', r.simulated_steps.length === 15);
  assert('pass: all steps simulated=true', r.simulated_steps.every(s => s.simulated === true));
  assert('pass: all steps passed=true', r.simulated_steps.every(s => s.passed === true));
  assert('pass: failed_steps empty', r.failed_steps.length === 0);
  assert('pass: tag_created=false', r.tag_created === false);
  assert('pass: release_executed=false', r.release_executed === false);
  assert('pass: sim_hash 64 chars', typeof r.sim_hash === 'string' && r.sim_hash.length === 64);
  assert('pass: errors empty', r.errors.length === 0);
  assert('pass: production_touched=false', r.production_touched === false);
  assert('pass: deploy_performed=false', r.deploy_performed === false);
  assert('pass: stable_promoted=false', r.stable_promoted === false);
  assert('pass: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchReleaseSimulator(VALID_INPUT);
  const r2 = buildRealRepoPatchReleaseSimulator(VALID_INPUT);
  assert('hash deterministic', r1.sim_hash === r2.sim_hash);
  const r3 = buildRealRepoPatchReleaseSimulator({ ...VALID_INPUT, sim_id: 'sim-002' });
  assert('different sim_id → different hash', r1.sim_hash !== r3.sim_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchReleaseSimulator(VALID_INPUT);
  const v = validateRealRepoPatchReleaseSimulator(r);
  assert('validate pass: valid=true', v.valid === true);
  assert('validate pass: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchReleaseSimulator(null);
  const v = validateRealRepoPatchReleaseSimulator(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchReleaseSimulator(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchReleaseSimulator(VALID_INPUT);
  const s = renderRealRepoPatchReleaseSimulator(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains RELEASE_SIM_PASS', s.includes('RELEASE_SIM_PASS'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains 15', s.includes('15'));
}
{
  const s = renderRealRepoPatchReleaseSimulator(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchReleaseSimulator(null),
    buildRealRepoPatchReleaseSimulator({}),
    buildRealRepoPatchReleaseSimulator({ ...VALID_INPUT, release_plan_ready: false }),
    buildRealRepoPatchReleaseSimulator({ ...VALID_INPUT, forced_failures: ['confirm_ledger'] }),
    buildRealRepoPatchReleaseSimulator(VALID_INPUT),
  ];
  assert('all: tag_created=false', cases.every(r => r.tag_created === false));
  assert('all: release_executed=false', cases.every(r => r.release_executed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
