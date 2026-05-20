#!/usr/bin/env node
/**
 * Tests — Cost/Cache Governance Report V137.1
 */

import {
  buildCostCacheGovernanceReport,
  validateCostCacheGovernanceReport,
  renderCostCacheGovernanceReport,
  COST_CACHE_REPORT_STATUSES,
} from '../cost-cache-governance-report.mjs';

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

const BASE_PARAMS = {
  mission_id: 'mission-gov-1',
  token_budget_result:     { budget_status: 'TOKEN_BUDGET_ALLOWED', budget_blocked: false },
  mission_cost_estimate:   { cost_estimate_status: 'MISSION_COST_ESTIMATED', cost_estimate_ready: true },
  cost_gate_policy:        { cost_gate_status: 'COST_GATE_ALLOWED', cost_allowed: true, cost_blocked: false },
  cost_enforcement_report: { enforcement_status: 'COST_ENFORCEMENT_ALLOWED', cost_blocked: false },
  test_lane_selection:     { selected_lane: 'postmerge' },
  agent_route:             { selected_route: 'codex' },
  fallback_governor:       { fallback_status: 'FALLBACK_NOT_REQUIRED' },
  execution_window:        { window_status: 'WINDOW_PEAK_ALLOWED' },
  agent_usage_ledger:      { entry_count: 3, ledger_status: 'LEDGER_ACTIVE' },
};

console.log('\n=== cost-cache-governance-report tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildCostCacheGovernanceReport({ ...BASE_PARAMS, mission_id: '' });
  assert('empty mission_id → BLOCKED_INPUT', r.report_status === 'GOVERNANCE_REPORT_BLOCKED_INPUT');
  assert('report_ready=false', r.report_ready === false);
  assert('governance_blocked=true', r.governance_blocked === true);
  assert('schema_version=v137.1', r.schema_version === 'v137.1');
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildCostCacheGovernanceReport({});
  assert('no params → BLOCKED_INPUT', r.report_status === 'GOVERNANCE_REPORT_BLOCKED_INPUT');
}

// --- ready report ---
console.log('--- ready report ---');
{
  const r = buildCostCacheGovernanceReport({ ...BASE_PARAMS });
  assert('all clear → GOVERNANCE_REPORT_READY', r.report_status === 'GOVERNANCE_REPORT_READY');
  assert('report_ready=true', r.report_ready === true);
  assert('governance_blocked=false', r.governance_blocked === false);
  assert('mission_id propagated', r.mission_id === 'mission-gov-1');
  assert('token_budget_status propagated', r.token_budget_status === 'TOKEN_BUDGET_ALLOWED');
  assert('cost_estimate_status propagated', r.cost_estimate_status === 'MISSION_COST_ESTIMATED');
  assert('cost_gate_status propagated', r.cost_gate_status === 'COST_GATE_ALLOWED');
  assert('enforcement_status propagated', r.enforcement_status === 'COST_ENFORCEMENT_ALLOWED');
  assert('selected_test_lane propagated', r.selected_test_lane === 'postmerge');
  assert('selected_agent_route propagated', r.selected_agent_route === 'codex');
  assert('fallback_status propagated', r.fallback_status === 'FALLBACK_NOT_REQUIRED');
  assert('execution_window_status propagated', r.execution_window_status === 'WINDOW_PEAK_ALLOWED');
  assert('ledger_entry_count propagated', r.ledger_entry_count === 3);
}

// --- warning report ---
console.log('--- warning report ---');
{
  const r = buildCostCacheGovernanceReport({
    ...BASE_PARAMS,
    cost_gate_policy: { cost_gate_status: 'COST_GATE_WARNING', cost_allowed: true, cost_blocked: false },
  });
  assert('warning gate → GOVERNANCE_REPORT_WARNING', r.report_status === 'GOVERNANCE_REPORT_WARNING');
  assert('report_ready=true in WARNING', r.report_ready === true);
}
{
  const r = buildCostCacheGovernanceReport({
    ...BASE_PARAMS,
    mission_cost_estimate: { cost_estimate_status: 'MISSION_COST_EXPENSIVE', cost_estimate_ready: true },
  });
  assert('EXPENSIVE estimate → WARNING', r.report_status === 'GOVERNANCE_REPORT_WARNING');
}
{
  const r = buildCostCacheGovernanceReport({
    ...BASE_PARAMS,
    token_budget_result: { budget_status: 'TOKEN_BUDGET_WARNING', budget_blocked: false },
  });
  assert('budget WARNING → GOVERNANCE_REPORT_WARNING', r.report_status === 'GOVERNANCE_REPORT_WARNING');
}

// --- blocked report ---
console.log('--- blocked report ---');
{
  const r = buildCostCacheGovernanceReport({
    ...BASE_PARAMS,
    cost_gate_policy: { cost_gate_status: 'COST_GATE_BLOCKED', cost_allowed: false, cost_blocked: true },
  });
  assert('cost blocked → GOVERNANCE_REPORT_BLOCKED', r.report_status === 'GOVERNANCE_REPORT_BLOCKED');
  assert('report_ready=false', r.report_ready === false);
  assert('governance_blocked=true', r.governance_blocked === true);
}
{
  const r = buildCostCacheGovernanceReport({
    ...BASE_PARAMS,
    token_budget_result: { budget_status: 'TOKEN_BUDGET_BLOCKED_LIMIT', budget_blocked: true },
  });
  assert('budget blocked → GOVERNANCE_REPORT_BLOCKED', r.report_status === 'GOVERNANCE_REPORT_BLOCKED');
}

// --- minimal params (just mission_id) ---
console.log('--- minimal params ---');
{
  const r = buildCostCacheGovernanceReport({ mission_id: 'minimal-mission' });
  assert('minimal → READY (no negatives)', r.report_status === 'GOVERNANCE_REPORT_READY');
  assert('all status fields null when not provided', r.token_budget_status === null);
  assert('ledger_entry_count null', r.ledger_entry_count === null);
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    buildCostCacheGovernanceReport({ ...BASE_PARAMS }),
    buildCostCacheGovernanceReport({ mission_id: '' }),
    buildCostCacheGovernanceReport({
      ...BASE_PARAMS,
      cost_gate_policy: { cost_gate_status: 'COST_GATE_BLOCKED', cost_blocked: true },
    }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.report_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.report_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.report_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildCostCacheGovernanceReport({ ...BASE_PARAMS });
  const v = validateCostCacheGovernanceReport(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildCostCacheGovernanceReport({ mission_id: '' });
  const v = validateCostCacheGovernanceReport(r);
  assert('validate blocked_input → valid=true struct', v.valid === true);
}
{
  const v = validateCostCacheGovernanceReport(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildCostCacheGovernanceReport({ ...BASE_PARAMS });
  const s = renderCostCacheGovernanceReport(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('GOVERNANCE_REPORT_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows mission', s.includes('mission-gov-1'));
}
{
  const r = buildCostCacheGovernanceReport({ mission_id: '' });
  const s = renderCostCacheGovernanceReport(r);
  assert('render blocked shows BLOCKED_INPUT', s.includes('GOVERNANCE_REPORT_BLOCKED_INPUT'));
}
{
  const s = renderCostCacheGovernanceReport(null);
  assert('render null graceful', typeof s === 'string');
}

// --- COST_CACHE_REPORT_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(COST_CACHE_REPORT_STATUSES));
  assert('length=4', COST_CACHE_REPORT_STATUSES.length === 4);
  for (const s of [
    'GOVERNANCE_REPORT_BLOCKED_INPUT', 'GOVERNANCE_REPORT_READY',
    'GOVERNANCE_REPORT_WARNING', 'GOVERNANCE_REPORT_BLOCKED',
  ]) {
    assert(`${s} present`, COST_CACHE_REPORT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
