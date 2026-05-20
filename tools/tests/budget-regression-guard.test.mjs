#!/usr/bin/env node
/**
 * Tests — Budget Regression Guard V138.0
 */

import {
  evaluateBudgetRegressionGuard,
  validateBudgetRegressionGuard,
  renderBudgetRegressionGuard,
  BUDGET_REGRESSION_STATUSES,
} from '../budget-regression-guard.mjs';

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
  mission_id:                  'mission-regression-1',
  current_cost_usd:            0.50,
  baseline_cost_usd:           0.45,
  current_total_tokens:        11000,
  baseline_total_tokens:       10000,
  premium_agent_used:          false,
  premium_agent_approved:      false,
  cost_spike_threshold_ratio:  2.0,
  token_surge_threshold_ratio: 2.0,
  warning_ratio:               1.5,
};

console.log('\n=== budget-regression-guard tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = evaluateBudgetRegressionGuard({ ...BASE, mission_id: '' });
  assert('empty mission_id → REGRESSION_BLOCKED_INPUT', r.regression_status === 'REGRESSION_BLOCKED_INPUT');
  assert('regression_blocked=true', r.regression_blocked === true);
  assert('regression_clear=false', r.regression_clear === false);
}
{
  const r = evaluateBudgetRegressionGuard({ ...BASE, baseline_cost_usd: 0 });
  assert('baseline_cost=0 → BLOCKED_INPUT', r.regression_status === 'REGRESSION_BLOCKED_INPUT');
}
{
  const r = evaluateBudgetRegressionGuard({ ...BASE, current_cost_usd: -1 });
  assert('negative current_cost → BLOCKED_INPUT', r.regression_status === 'REGRESSION_BLOCKED_INPUT');
}
{
  const r = evaluateBudgetRegressionGuard({ ...BASE, baseline_total_tokens: 0 });
  assert('baseline_total_tokens=0 → BLOCKED_INPUT', r.regression_status === 'REGRESSION_BLOCKED_INPUT');
}

// --- clear ---
console.log('--- clear ---');
{
  const r = evaluateBudgetRegressionGuard({ ...BASE });
  assert('small increase → REGRESSION_CLEAR', r.regression_status === 'REGRESSION_CLEAR');
  assert('regression_clear=true', r.regression_clear === true);
  assert('regression_blocked=false', r.regression_blocked === false);
  assert('regression_warning=false', r.regression_warning === false);
  assert('schema_version=v138.0', r.schema_version === 'v138.0');
  assert('cost_ratio computed', Math.abs(r.cost_ratio - (0.5/0.45)) < 0.001);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- warning ---
console.log('--- warning ---');
{
  // cost_ratio = 1.55 → warning (>=1.5 but < 2.0)
  const r = evaluateBudgetRegressionGuard({ ...BASE, current_cost_usd: 0.70, baseline_cost_usd: 0.45, warning_ratio: 1.5 });
  assert('cost_ratio 1.55 → REGRESSION_WARNING', r.regression_status === 'REGRESSION_WARNING');
  assert('regression_warning=true', r.regression_warning === true);
  assert('regression_blocked=false', r.regression_blocked === false);
  assert('regression_clear=false', r.regression_clear === false);
}
{
  // token_ratio = 1.6 → warning
  const r = evaluateBudgetRegressionGuard({ ...BASE, current_total_tokens: 16000, baseline_total_tokens: 10000, warning_ratio: 1.5 });
  assert('token_ratio 1.6 → REGRESSION_WARNING', r.regression_status === 'REGRESSION_WARNING');
}

// --- cost spike blocked ---
console.log('--- cost spike ---');
{
  // cost_ratio = 2.5 → blocked
  const r = evaluateBudgetRegressionGuard({ ...BASE, current_cost_usd: 1.125, baseline_cost_usd: 0.45, cost_spike_threshold_ratio: 2.0 });
  assert('cost_ratio 2.5 → REGRESSION_BLOCKED_COST_SPIKE', r.regression_status === 'REGRESSION_BLOCKED_COST_SPIKE');
  assert('regression_blocked=true', r.regression_blocked === true);
  assert('blocked_reason set', typeof r.blocked_reason === 'string');
}

// --- token surge blocked ---
console.log('--- token surge ---');
{
  // token_ratio = 2.5 → blocked
  const r = evaluateBudgetRegressionGuard({ ...BASE, current_total_tokens: 25000, baseline_total_tokens: 10000, token_surge_threshold_ratio: 2.0 });
  assert('token_ratio 2.5 → REGRESSION_BLOCKED_TOKEN_SURGE', r.regression_status === 'REGRESSION_BLOCKED_TOKEN_SURGE');
  assert('regression_blocked=true', r.regression_blocked === true);
}

// --- premium unauthorized ---
console.log('--- premium unauthorized ---');
{
  const r = evaluateBudgetRegressionGuard({ ...BASE, premium_agent_used: true, premium_agent_approved: false });
  assert('premium used + not approved → REGRESSION_BLOCKED_PREMIUM_UNAUTHORIZED', r.regression_status === 'REGRESSION_BLOCKED_PREMIUM_UNAUTHORIZED');
  assert('regression_blocked=true', r.regression_blocked === true);
}
{
  // approved → no premium block
  const r = evaluateBudgetRegressionGuard({ ...BASE, premium_agent_used: true, premium_agent_approved: true });
  assert('premium used + approved → REGRESSION_CLEAR', r.regression_status === 'REGRESSION_CLEAR');
}

// --- deterministic guard_id ---
console.log('--- deterministic guard_id ---');
{
  const r1 = evaluateBudgetRegressionGuard({ ...BASE });
  const r2 = evaluateBudgetRegressionGuard({ ...BASE });
  assert('guard_id deterministic', r1.guard_id === r2.guard_id);
  assert('guard_id sha256', /^[a-f0-9]{64}$/.test(r1.guard_id));
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    evaluateBudgetRegressionGuard({ ...BASE }),
    evaluateBudgetRegressionGuard({ ...BASE, mission_id: '' }),
    evaluateBudgetRegressionGuard({ ...BASE, current_cost_usd: 1.125, baseline_cost_usd: 0.45 }),
    evaluateBudgetRegressionGuard({ ...BASE, premium_agent_used: true, premium_agent_approved: false }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.regression_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.regression_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.regression_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = evaluateBudgetRegressionGuard({ ...BASE });
  const v = validateBudgetRegressionGuard(r);
  assert('validate clear → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateBudgetRegressionGuard({ ...BASE, mission_id: '' });
  const v = validateBudgetRegressionGuard(r);
  assert('validate blocked_input → valid=true struct', v.valid === true);
}
{
  const v = validateBudgetRegressionGuard(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateBudgetRegressionGuard({ ...BASE });
  const s = renderBudgetRegressionGuard(r);
  assert('render string', typeof s === 'string');
  assert('render shows REGRESSION_CLEAR', s.includes('REGRESSION_CLEAR'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = evaluateBudgetRegressionGuard({ ...BASE, current_cost_usd: 1.125, baseline_cost_usd: 0.45 });
  const s = renderBudgetRegressionGuard(r);
  assert('render spike shows COST_SPIKE', s.includes('REGRESSION_BLOCKED_COST_SPIKE'));
}
{
  const s = renderBudgetRegressionGuard(null);
  assert('render null graceful', typeof s === 'string');
}

// --- BUDGET_REGRESSION_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(BUDGET_REGRESSION_STATUSES));
  assert('length=6', BUDGET_REGRESSION_STATUSES.length === 6);
  for (const s of [
    'REGRESSION_BLOCKED_INPUT', 'REGRESSION_CLEAR', 'REGRESSION_WARNING',
    'REGRESSION_BLOCKED_COST_SPIKE', 'REGRESSION_BLOCKED_TOKEN_SURGE',
    'REGRESSION_BLOCKED_PREMIUM_UNAUTHORIZED',
  ]) {
    assert(`${s} present`, BUDGET_REGRESSION_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
