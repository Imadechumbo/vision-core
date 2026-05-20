#!/usr/bin/env node
/**
 * Tests — Cost-Aware Mission Finalizer V139.0
 */

import {
  finalizeCostAwareMission,
  validateCostAwareMissionFinalizer,
  renderCostAwareMissionFinalizer,
  COST_AWARE_FINALIZER_STATUSES,
} from '../cost-aware-mission-finalizer.mjs';

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

const BASE = {
  mission_id:         'mission-finalizer-1',
  governance_report:  { report_status: 'GOVERNANCE_REPORT_READY', governance_blocked: false },
  budget_receipt:     { receipt_status: 'RECEIPT_ISSUED', receipt_ready: true },
  regression_guard:   { regression_status: 'REGRESSION_CLEAR', regression_blocked: false, regression_warning: false },
  finalized_at:       '2026-05-20T23:30:00.000Z',
};

console.log('\n=== cost-aware-mission-finalizer tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = finalizeCostAwareMission({ ...BASE, mission_id: '' });
  assert('empty mission_id → FINALIZER_BLOCKED_INPUT', r.finalizer_status === 'FINALIZER_BLOCKED_INPUT');
  assert('mission_finalized=false', r.mission_finalized === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- blocked cost ---
console.log('--- blocked cost ---');
{
  const r = finalizeCostAwareMission({
    ...BASE,
    governance_report: { report_status: 'GOVERNANCE_REPORT_BLOCKED', governance_blocked: true },
  });
  assert('governance blocked → FINALIZER_BLOCKED_COST', r.finalizer_status === 'FINALIZER_BLOCKED_COST');
  assert('mission_finalized=false', r.mission_finalized === false);
}
{
  const r = finalizeCostAwareMission({
    ...BASE,
    budget_receipt: { receipt_status: 'RECEIPT_OVER_BUDGET', receipt_ready: true },
  });
  assert('over budget receipt → FINALIZER_BLOCKED_COST', r.finalizer_status === 'FINALIZER_BLOCKED_COST');
}

// --- blocked regression ---
console.log('--- blocked regression ---');
{
  const r = finalizeCostAwareMission({
    ...BASE,
    regression_guard: { regression_status: 'REGRESSION_BLOCKED_COST_SPIKE', regression_blocked: true, regression_warning: false },
  });
  assert('regression blocked → FINALIZER_BLOCKED_REGRESSION', r.finalizer_status === 'FINALIZER_BLOCKED_REGRESSION');
  assert('mission_finalized=false', r.mission_finalized === false);
  assert('blocked_reason set', typeof r.blocked_reason === 'string');
}

// --- completed ---
console.log('--- completed ---');
{
  const r = finalizeCostAwareMission({ ...BASE });
  assert('all clear → FINALIZER_COMPLETED', r.finalizer_status === 'FINALIZER_COMPLETED');
  assert('mission_finalized=true', r.mission_finalized === true);
  assert('schema_version=v139.0', r.schema_version === 'v139.0');
  assert('mission_id propagated', r.mission_id === 'mission-finalizer-1');
  assert('governance_status propagated', r.governance_status === 'GOVERNANCE_REPORT_READY');
  assert('receipt_status propagated', r.receipt_status === 'RECEIPT_ISSUED');
  assert('regression_status propagated', r.regression_status === 'REGRESSION_CLEAR');
  assert('finalized_at set', r.finalized_at === '2026-05-20T23:30:00.000Z');
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- completed with warning ---
console.log('--- completed with warning ---');
{
  const r = finalizeCostAwareMission({
    ...BASE,
    governance_report: { report_status: 'GOVERNANCE_REPORT_WARNING', governance_blocked: false },
  });
  assert('governance WARNING → FINALIZER_COMPLETED_WITH_WARNING', r.finalizer_status === 'FINALIZER_COMPLETED_WITH_WARNING');
  assert('mission_finalized=true', r.mission_finalized === true);
}
{
  const r = finalizeCostAwareMission({
    ...BASE,
    budget_receipt: { receipt_status: 'RECEIPT_WARNING', receipt_ready: true },
  });
  assert('receipt WARNING → FINALIZER_COMPLETED_WITH_WARNING', r.finalizer_status === 'FINALIZER_COMPLETED_WITH_WARNING');
}
{
  const r = finalizeCostAwareMission({
    ...BASE,
    regression_guard: { regression_status: 'REGRESSION_WARNING', regression_blocked: false, regression_warning: true },
  });
  assert('regression WARNING → FINALIZER_COMPLETED_WITH_WARNING', r.finalizer_status === 'FINALIZER_COMPLETED_WITH_WARNING');
}

// --- minimal params ---
console.log('--- minimal params ---');
{
  const r = finalizeCostAwareMission({ mission_id: 'minimal-mission' });
  assert('just mission_id → COMPLETED', r.finalizer_status === 'FINALIZER_COMPLETED');
  assert('governance_status=null', r.governance_status === null);
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    finalizeCostAwareMission({ ...BASE }),
    finalizeCostAwareMission({ ...BASE, mission_id: '' }),
    finalizeCostAwareMission({ ...BASE, governance_report: { governance_blocked: true } }),
    finalizeCostAwareMission({ ...BASE, regression_guard: { regression_blocked: true, regression_warning: false } }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.finalizer_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.finalizer_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.finalizer_status}]`, r.release_performed === false);
  }
}

// --- deterministic finalizer_id ---
console.log('--- deterministic finalizer_id ---');
{
  const r1 = finalizeCostAwareMission({ ...BASE });
  const r2 = finalizeCostAwareMission({ ...BASE });
  assert('finalizer_id deterministic', r1.finalizer_id === r2.finalizer_id);
  assert('finalizer_id sha256', /^[a-f0-9]{64}$/.test(r1.finalizer_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = finalizeCostAwareMission({ ...BASE });
  const v = validateCostAwareMissionFinalizer(r);
  assert('validate completed → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = finalizeCostAwareMission({ ...BASE, mission_id: '' });
  const v = validateCostAwareMissionFinalizer(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateCostAwareMissionFinalizer(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = finalizeCostAwareMission({ ...BASE });
  const s = renderCostAwareMissionFinalizer(r);
  assert('render string', typeof s === 'string');
  assert('render shows COMPLETED', s.includes('FINALIZER_COMPLETED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = finalizeCostAwareMission({ ...BASE, mission_id: '' });
  const s = renderCostAwareMissionFinalizer(r);
  assert('render blocked shows BLOCKED_INPUT', s.includes('FINALIZER_BLOCKED_INPUT'));
}
{
  const s = renderCostAwareMissionFinalizer(null);
  assert('render null graceful', typeof s === 'string');
}

// --- COST_AWARE_FINALIZER_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(COST_AWARE_FINALIZER_STATUSES));
  assert('length=5', COST_AWARE_FINALIZER_STATUSES.length === 5);
  for (const s of [
    'FINALIZER_BLOCKED_INPUT', 'FINALIZER_BLOCKED_COST',
    'FINALIZER_BLOCKED_REGRESSION', 'FINALIZER_COMPLETED',
    'FINALIZER_COMPLETED_WITH_WARNING',
  ]) {
    assert(`${s} present`, COST_AWARE_FINALIZER_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
