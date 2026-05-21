#!/usr/bin/env node
/**
 * Tests — Rollback Plan Binding Gate V153.0
 */

import {
  buildRollbackPlanBindingGate,
  validateRollbackPlanBindingGate,
  renderRollbackPlanBindingGate,
  ROLLBACK_BINDING_STATUSES,
} from '../rollback-plan-binding-gate.mjs';

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

const FULL_READY = {
  binding_id:                 'v153.0-binding',
  rollback_plan_id:           'rbp-001',
  rollback_anchor_ref:        'refs/tags/v1.0.0-pre',
  rollback_anchor_verified:   true,
  rollback_steps_count:       3,
  rollback_dry_run_completed: true,
  bound_at:                   '2026-05-21T20:00:00.000Z',
};

console.log('\n=== rollback-plan-binding-gate tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRollbackPlanBindingGate({});
  assert('no binding_id → BLOCKED_INPUT', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_INPUT');
  assert('binding_ready=false', r.binding_ready === false);
  assert('rollback_required=true', r.rollback_required === true);
  assert('rollback_executed=false', r.rollback_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildRollbackPlanBindingGate(null);
  assert('null → BLOCKED_INPUT', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_INPUT');
}
{
  const r = buildRollbackPlanBindingGate({ binding_id: 'b1' });
  assert('no rollback_plan_id → BLOCKED_INPUT', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_INPUT');
}

// --- blocked anchor ---
console.log('--- blocked anchor ---');
{
  const r = buildRollbackPlanBindingGate({ binding_id: 'b2', rollback_plan_id: 'rbp-001' });
  assert('no anchor → BLOCKED_ANCHOR', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_ANCHOR');
  assert('binding_ready=false', r.binding_ready === false);
}
{
  const r = buildRollbackPlanBindingGate({
    binding_id: 'b2', rollback_plan_id: 'rbp-001',
    rollback_anchor_ref: 'refs/tags/v1.0.0',
    rollback_anchor_verified: false,
  });
  assert('anchor_verified=false → BLOCKED_ANCHOR', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_ANCHOR');
}

// --- blocked dry run ---
console.log('--- blocked dry run ---');
{
  const r = buildRollbackPlanBindingGate({
    binding_id: 'b3', rollback_plan_id: 'rbp-001',
    rollback_anchor_ref: 'refs/tags/v1.0.0', rollback_anchor_verified: true,
  });
  assert('no dry run → BLOCKED_DRY_RUN', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_DRY_RUN');
  assert('binding_ready=false', r.binding_ready === false);
}
{
  const r = buildRollbackPlanBindingGate({
    binding_id: 'b3', rollback_plan_id: 'rbp-001',
    rollback_anchor_ref: 'refs/tags/v1.0.0', rollback_anchor_verified: true,
    rollback_dry_run_completed: true, rollback_steps_count: 0,
  });
  assert('steps_count=0 → BLOCKED_DRY_RUN', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_DRY_RUN');
}
{
  const r = buildRollbackPlanBindingGate({
    binding_id: 'b3', rollback_plan_id: 'rbp-001',
    rollback_anchor_ref: 'refs/tags/v1.0.0', rollback_anchor_verified: true,
    rollback_dry_run_completed: false, rollback_steps_count: 3,
  });
  assert('dry_run_completed=false → BLOCKED_DRY_RUN', r.rollback_binding_status === 'ROLLBACK_BINDING_BLOCKED_DRY_RUN');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRollbackPlanBindingGate({ ...FULL_READY });
  assert('all ready → ROLLBACK_BINDING_READY', r.rollback_binding_status === 'ROLLBACK_BINDING_READY');
  assert('binding_ready=true', r.binding_ready === true);
  assert('schema_version=v153.0', r.schema_version === 'v153.0');
  assert('binding_id propagated', r.binding_id === 'v153.0-binding');
  assert('rollback_plan_id propagated', r.rollback_plan_id === 'rbp-001');
  assert('rollback_anchor_ref propagated', r.rollback_anchor_ref === 'refs/tags/v1.0.0-pre');
  assert('rollback_steps_count=3', r.rollback_steps_count === 3);
  assert('bound_at propagated', r.bound_at === '2026-05-21T20:00:00.000Z');
  assert('rollback_required=true', r.rollback_required === true);
  assert('rollback_executed=false', r.rollback_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildRollbackPlanBindingGate({ ...FULL_READY });
  const r2 = buildRollbackPlanBindingGate({ ...FULL_READY });
  assert('binding_id_hash deterministic', r1.binding_id_hash === r2.binding_id_hash);
  assert('binding_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.binding_id_hash));
}
{
  const r1 = buildRollbackPlanBindingGate({ ...FULL_READY, binding_id: 'a' });
  const r2 = buildRollbackPlanBindingGate({ ...FULL_READY, binding_id: 'b' });
  assert('different binding_id → different hash', r1.binding_id_hash !== r2.binding_id_hash);
}

// --- bound_at default ---
{
  const r = buildRollbackPlanBindingGate({});
  assert('no bound_at → auto ISO', typeof r.bound_at === 'string' && r.bound_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildRollbackPlanBindingGate({}),
    buildRollbackPlanBindingGate({ ...FULL_READY }),
    buildRollbackPlanBindingGate({ binding_id: 'bx', rollback_plan_id: 'rbp-x', rollback_anchor_ref: 'ref', rollback_anchor_verified: true }),
  ];
  for (const r of cases) {
    assert(`rollback_required=true [${r.rollback_binding_status}]`, r.rollback_required === true);
    assert(`rollback_executed=false [${r.rollback_binding_status}]`, r.rollback_executed === false);
    assert(`execution_performed=false [${r.rollback_binding_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.rollback_binding_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.rollback_binding_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.rollback_binding_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRollbackPlanBindingGate({ ...FULL_READY });
  const v = validateRollbackPlanBindingGate(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildRollbackPlanBindingGate({});
  const v = validateRollbackPlanBindingGate(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateRollbackPlanBindingGate(null).valid === false);
}
{
  const r = buildRollbackPlanBindingGate({ ...FULL_READY });
  assert('rollback_required tampered → invalid', validateRollbackPlanBindingGate({ ...r, rollback_required: false }).valid === false);
}
{
  const r = buildRollbackPlanBindingGate({ ...FULL_READY });
  assert('rollback_executed tampered → invalid', validateRollbackPlanBindingGate({ ...r, rollback_executed: true }).valid === false);
}
{
  const r = buildRollbackPlanBindingGate({ ...FULL_READY });
  assert('READY with dry_run_completed=false → invalid', validateRollbackPlanBindingGate({ ...r, rollback_dry_run_completed: false }).valid === false);
}
{
  const r = buildRollbackPlanBindingGate({ ...FULL_READY });
  assert('READY with steps_count=0 → invalid', validateRollbackPlanBindingGate({ ...r, rollback_steps_count: 0 }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRollbackPlanBindingGate({ ...FULL_READY });
  const s = renderRollbackPlanBindingGate(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('ROLLBACK_BINDING_READY'));
  assert('render shows REGRA', s.includes('rollback_required=true'));
  assert('render shows binding_id', s.includes('v153.0-binding'));
  assert('render shows rollback_plan_id', s.includes('rbp-001'));
}
{
  const r = buildRollbackPlanBindingGate({});
  const s = renderRollbackPlanBindingGate(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderRollbackPlanBindingGate(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('ROLLBACK_BINDING_STATUSES is array', Array.isArray(ROLLBACK_BINDING_STATUSES));
  assert('ROLLBACK_BINDING_STATUSES length=4', ROLLBACK_BINDING_STATUSES.length === 4);
  for (const s of ['ROLLBACK_BINDING_BLOCKED_INPUT','ROLLBACK_BINDING_BLOCKED_ANCHOR','ROLLBACK_BINDING_BLOCKED_DRY_RUN','ROLLBACK_BINDING_READY']) {
    assert(`status present: ${s}`, ROLLBACK_BINDING_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
