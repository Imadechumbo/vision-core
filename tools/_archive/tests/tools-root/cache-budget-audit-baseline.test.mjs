#!/usr/bin/env node
/**
 * Tests — Cache/Budget Audit Baseline V139.1
 */

import {
  buildCacheBudgetAuditBaseline,
  validateCacheBudgetAuditBaseline,
  renderCacheBudgetAuditBaseline,
  CACHE_BUDGET_AUDIT_STATUSES,
} from '../cache-budget-audit-baseline.mjs';

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
  mission_id:               'mission-audit-1',
  cache_hit_rate:           0.65,
  cache_tokens_saved:       5000,
  budget_status:            'TOKEN_BUDGET_ALLOWED',
  total_cost_usd:           0.40,
  budget_limit_usd:         1.0,
  regression_status:        'REGRESSION_CLEAR',
  governance_report_status: 'GOVERNANCE_REPORT_READY',
  audited_at:               '2026-05-20T23:45:00.000Z',
};

console.log('\n=== cache-budget-audit-baseline tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, mission_id: '' });
  assert('empty mission_id → AUDIT_BLOCKED_INPUT', r.audit_status === 'AUDIT_BLOCKED_INPUT');
  assert('audit_baseline_ready=false', r.audit_baseline_ready === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildCacheBudgetAuditBaseline({});
  assert('no params → AUDIT_BLOCKED_INPUT', r.audit_status === 'AUDIT_BLOCKED_INPUT');
}

// --- baseline ready ---
console.log('--- baseline ready ---');
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE });
  assert('all clear → AUDIT_BASELINE_READY', r.audit_status === 'AUDIT_BASELINE_READY');
  assert('audit_baseline_ready=true', r.audit_baseline_ready === true);
  assert('schema_version=v139.1', r.schema_version === 'v139.1');
  assert('mission_id propagated', r.mission_id === 'mission-audit-1');
  assert('cache_hit_rate propagated', r.cache_hit_rate === 0.65);
  assert('cache_tokens_saved propagated', r.cache_tokens_saved === 5000);
  assert('cost_budget_ratio = 0.40', Math.abs(r.cost_budget_ratio - 0.40) < 0.0001);
  assert('audited_at propagated', r.audited_at === '2026-05-20T23:45:00.000Z');
}

// --- baseline warning ---
console.log('--- baseline warning ---');
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, governance_report_status: 'GOVERNANCE_REPORT_WARNING' });
  assert('governance WARNING → AUDIT_BASELINE_WARNING', r.audit_status === 'AUDIT_BASELINE_WARNING');
  assert('audit_baseline_ready=true in WARNING', r.audit_baseline_ready === true);
}
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, budget_status: 'TOKEN_BUDGET_WARNING' });
  assert('budget WARNING → AUDIT_BASELINE_WARNING', r.audit_status === 'AUDIT_BASELINE_WARNING');
}
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, regression_status: 'REGRESSION_WARNING' });
  assert('regression WARNING → AUDIT_BASELINE_WARNING', r.audit_status === 'AUDIT_BASELINE_WARNING');
}

// --- baseline blocked ---
console.log('--- baseline blocked ---');
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, governance_report_status: 'GOVERNANCE_REPORT_BLOCKED' });
  assert('governance BLOCKED → AUDIT_BASELINE_BLOCKED', r.audit_status === 'AUDIT_BASELINE_BLOCKED');
  assert('audit_baseline_ready=false', r.audit_baseline_ready === false);
}
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, regression_status: 'REGRESSION_BLOCKED_COST_SPIKE' });
  assert('regression COST_SPIKE → AUDIT_BASELINE_BLOCKED', r.audit_status === 'AUDIT_BASELINE_BLOCKED');
}
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, budget_status: 'TOKEN_BUDGET_BLOCKED_LIMIT' });
  assert('budget BLOCKED_LIMIT → AUDIT_BASELINE_BLOCKED', r.audit_status === 'AUDIT_BASELINE_BLOCKED');
}

// --- minimal params ---
console.log('--- minimal params ---');
{
  const r = buildCacheBudgetAuditBaseline({ mission_id: 'min-mission' });
  assert('just mission_id → READY', r.audit_status === 'AUDIT_BASELINE_READY');
  assert('cost_budget_ratio=null without data', r.cost_budget_ratio === null);
}

// --- cost_budget_ratio computed ---
console.log('--- cost_budget_ratio ---');
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, total_cost_usd: 0.80, budget_limit_usd: 1.0 });
  assert('cost_budget_ratio = 0.80', Math.abs(r.cost_budget_ratio - 0.80) < 0.0001);
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    buildCacheBudgetAuditBaseline({ ...BASE }),
    buildCacheBudgetAuditBaseline({ ...BASE, mission_id: '' }),
    buildCacheBudgetAuditBaseline({ ...BASE, governance_report_status: 'GOVERNANCE_REPORT_BLOCKED' }),
    buildCacheBudgetAuditBaseline({ ...BASE, budget_status: 'TOKEN_BUDGET_WARNING' }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.audit_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.audit_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.audit_status}]`, r.release_performed === false);
  }
}

// --- deterministic audit_id ---
console.log('--- deterministic audit_id ---');
{
  const r1 = buildCacheBudgetAuditBaseline({ ...BASE });
  const r2 = buildCacheBudgetAuditBaseline({ ...BASE });
  assert('audit_id deterministic', r1.audit_id === r2.audit_id);
  assert('audit_id sha256', /^[a-f0-9]{64}$/.test(r1.audit_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE });
  const v = validateCacheBudgetAuditBaseline(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, mission_id: '' });
  const v = validateCacheBudgetAuditBaseline(r);
  assert('validate blocked_input → valid=true struct', v.valid === true);
}
{
  const v = validateCacheBudgetAuditBaseline(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE });
  const s = renderCacheBudgetAuditBaseline(r);
  assert('render string', typeof s === 'string');
  assert('render shows AUDIT_BASELINE_READY', s.includes('AUDIT_BASELINE_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = buildCacheBudgetAuditBaseline({ ...BASE, mission_id: '' });
  const s = renderCacheBudgetAuditBaseline(r);
  assert('render blocked shows BLOCKED_INPUT', s.includes('AUDIT_BLOCKED_INPUT'));
}
{
  const s = renderCacheBudgetAuditBaseline(null);
  assert('render null graceful', typeof s === 'string');
}

// --- CACHE_BUDGET_AUDIT_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(CACHE_BUDGET_AUDIT_STATUSES));
  assert('length=4', CACHE_BUDGET_AUDIT_STATUSES.length === 4);
  for (const s of [
    'AUDIT_BLOCKED_INPUT', 'AUDIT_BASELINE_READY',
    'AUDIT_BASELINE_WARNING', 'AUDIT_BASELINE_BLOCKED',
  ]) {
    assert(`${s} present`, CACHE_BUDGET_AUDIT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
