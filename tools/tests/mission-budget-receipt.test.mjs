#!/usr/bin/env node
/**
 * Tests — Mission Budget Receipt V138.1
 */

import {
  buildMissionBudgetReceipt,
  validateMissionBudgetReceipt,
  renderMissionBudgetReceipt,
  MISSION_BUDGET_RECEIPT_STATUSES,
} from '../mission-budget-receipt.mjs';

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
  mission_id:              'mission-receipt-1',
  agent_id:                'agent-1',
  phase:                   'execution',
  actual_input_tokens:     80000,
  actual_output_tokens:    10000,
  actual_cost_usd:         0.39,
  cache_tokens_saved:      5000,
  cache_discount_usd:      0.02,
  budget_limit_usd:        1.0,
  warning_threshold_ratio: 0.8,
  issued_at:               '2026-05-20T23:00:00.000Z',
};

console.log('\n=== mission-budget-receipt tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildMissionBudgetReceipt({ ...BASE, mission_id: '' });
  assert('empty mission_id → RECEIPT_BLOCKED_INPUT', r.receipt_status === 'RECEIPT_BLOCKED_INPUT');
  assert('receipt_ready=false', r.receipt_ready === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildMissionBudgetReceipt({ ...BASE, actual_input_tokens: -1 });
  assert('negative input tokens → BLOCKED', r.receipt_status === 'RECEIPT_BLOCKED_INPUT');
}
{
  const r = buildMissionBudgetReceipt({ ...BASE, actual_cost_usd: -0.1 });
  assert('negative cost → BLOCKED', r.receipt_status === 'RECEIPT_BLOCKED_INPUT');
}

// --- receipt issued ---
console.log('--- receipt issued ---');
{
  const r = buildMissionBudgetReceipt({ ...BASE });
  // net_cost = 0.39 - 0.02 = 0.37, limit=1.0, ratio=0.37 < 0.8 → ISSUED
  assert('under budget → RECEIPT_ISSUED', r.receipt_status === 'RECEIPT_ISSUED');
  assert('receipt_ready=true', r.receipt_ready === true);
  assert('schema_version=v138.1', r.schema_version === 'v138.1');
  assert('actual_total_tokens=90000', r.actual_total_tokens === 90000);
  assert('net_cost_usd ≈ 0.37', Math.abs(r.net_cost_usd - 0.37) < 0.000001);
  assert('cache_tokens_saved=5000', r.cache_tokens_saved === 5000);
  assert('over_budget=false', r.over_budget === false);
  assert('issued_at set', r.issued_at === '2026-05-20T23:00:00.000Z');
}

// --- receipt warning ---
console.log('--- receipt warning ---');
{
  // net_cost = 0.90 - 0.02 = 0.88, limit=1.0, ratio=0.88 >= 0.8 → WARNING
  const r = buildMissionBudgetReceipt({ ...BASE, actual_cost_usd: 0.90, cache_discount_usd: 0.02 });
  assert('at 88% → RECEIPT_WARNING', r.receipt_status === 'RECEIPT_WARNING');
  assert('receipt_ready=true in WARNING', r.receipt_ready === true);
  assert('over_budget=false', r.over_budget === false);
}

// --- receipt over budget ---
console.log('--- receipt over budget ---');
{
  // net_cost = 1.1 - 0.02 = 1.08 > 1.0 → OVER_BUDGET
  const r = buildMissionBudgetReceipt({ ...BASE, actual_cost_usd: 1.1 });
  assert('over limit → RECEIPT_OVER_BUDGET', r.receipt_status === 'RECEIPT_OVER_BUDGET');
  assert('over_budget=true', r.over_budget === true);
}

// --- no budget limit → always ISSUED ---
console.log('--- no budget limit ---');
{
  const r = buildMissionBudgetReceipt({ ...BASE, budget_limit_usd: undefined });
  assert('no limit → RECEIPT_ISSUED', r.receipt_status === 'RECEIPT_ISSUED');
  assert('budget_limit_usd=null', r.budget_limit_usd === null);
}

// --- cache discount reduces net_cost, never below 0 ---
console.log('--- cache discount ---');
{
  const r = buildMissionBudgetReceipt({ ...BASE, actual_cost_usd: 0.01, cache_discount_usd: 0.50 });
  assert('net_cost >= 0', r.net_cost_usd >= 0);
  assert('net_cost = 0 when discount > cost', r.net_cost_usd === 0);
}

// --- deterministic receipt_id ---
console.log('--- deterministic receipt_id ---');
{
  const r1 = buildMissionBudgetReceipt({ ...BASE });
  const r2 = buildMissionBudgetReceipt({ ...BASE });
  assert('receipt_id deterministic', r1.receipt_id === r2.receipt_id);
  assert('receipt_id sha256', /^[a-f0-9]{64}$/.test(r1.receipt_id));
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    buildMissionBudgetReceipt({ ...BASE }),
    buildMissionBudgetReceipt({ ...BASE, mission_id: '' }),
    buildMissionBudgetReceipt({ ...BASE, actual_cost_usd: 1.1 }),
    buildMissionBudgetReceipt({ ...BASE, actual_cost_usd: 0.82 }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.receipt_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.receipt_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.receipt_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildMissionBudgetReceipt({ ...BASE });
  const v = validateMissionBudgetReceipt(r);
  assert('validate issued → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildMissionBudgetReceipt({ ...BASE, mission_id: '' });
  const v = validateMissionBudgetReceipt(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateMissionBudgetReceipt(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildMissionBudgetReceipt({ ...BASE });
  const s = renderMissionBudgetReceipt(r);
  assert('render string', typeof s === 'string');
  assert('render shows RECEIPT_ISSUED', s.includes('RECEIPT_ISSUED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows net cost', s.includes('Net cost USD:'));
}
{
  const r = buildMissionBudgetReceipt({ ...BASE, mission_id: '' });
  const s = renderMissionBudgetReceipt(r);
  assert('render blocked', s.includes('RECEIPT_BLOCKED_INPUT'));
}
{
  const s = renderMissionBudgetReceipt(null);
  assert('render null graceful', typeof s === 'string');
}

// --- MISSION_BUDGET_RECEIPT_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(MISSION_BUDGET_RECEIPT_STATUSES));
  assert('length=4', MISSION_BUDGET_RECEIPT_STATUSES.length === 4);
  for (const s of [
    'RECEIPT_BLOCKED_INPUT', 'RECEIPT_ISSUED',
    'RECEIPT_WARNING', 'RECEIPT_OVER_BUDGET',
  ]) {
    assert(`${s} present`, MISSION_BUDGET_RECEIPT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
