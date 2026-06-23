#!/usr/bin/env node
/**
 * Tests — Cost/Cache/Agent Budget Governance Baseline V140.0
 */

import {
  buildGovernanceBaseline,
  validateGovernanceBaseline,
  renderGovernanceBaseline,
  GOVERNANCE_BASELINE_STATUSES,
  VERIFIED_MODULES,
} from '../cost-cache-agent-budget-governance-baseline.mjs';

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
  mission_id:                    'mission-baseline-1',
  token_budget_status:           'TOKEN_BUDGET_ALLOWED',
  mission_cost_status:           'MISSION_COST_ESTIMATED',
  cost_gate_status:              'COST_GATE_ALLOWED',
  cost_enforcement_status:       'COST_ENFORCEMENT_ALLOWED',
  test_lane_status:              'TEST_LANE_SELECTED',
  agent_route_status:            'AGENT_ROUTE_SELECTED',
  fallback_status:               'FALLBACK_NOT_REQUIRED',
  execution_window_status:       'WINDOW_OFFPEAK_RECOMMENDED',
  agent_usage_ledger_sealed:     true,
  governance_report_status:      'GOVERNANCE_REPORT_READY',
  regression_status:             'REGRESSION_CLEAR',
  budget_receipt_status:         'RECEIPT_ISSUED',
  finalizer_status:              'FINALIZER_COMPLETED',
  audit_status:                  'AUDIT_BASELINE_READY',
  cache_contract_status:         'CACHE_CONTRACT_READY',
  cache_store_status:            'CACHE_STORE_READY',
  prompt_cache_ledger_status:    'CACHE_LEDGER_READY',
  cache_hit_miss_reporter_status:'CACHE_REPORTER_READY',
  baselined_at:                  '2026-05-20T23:59:00.000Z',
};

console.log('\n=== cost-cache-agent-budget-governance-baseline tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildGovernanceBaseline({ ...BASE, mission_id: '' });
  assert('empty mission_id → GOVERNANCE_BASELINE_BLOCKED_INPUT', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED_INPUT');
  assert('cost_cache_governance_baseline_ready=false', r.cost_cache_governance_baseline_ready === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildGovernanceBaseline({});
  assert('no params → GOVERNANCE_BASELINE_BLOCKED_INPUT', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED_INPUT');
}

// --- baseline ready ---
console.log('--- baseline ready ---');
{
  const r = buildGovernanceBaseline({ ...BASE });
  assert('all clear → GOVERNANCE_BASELINE_READY', r.governance_baseline_status === 'GOVERNANCE_BASELINE_READY');
  assert('cost_cache_governance_baseline_ready=true', r.cost_cache_governance_baseline_ready === true);
  assert('schema_version=v140.0', r.schema_version === 'v140.0');
  assert('mission_id propagated', r.mission_id === 'mission-baseline-1');
  assert('baselined_at propagated', r.baselined_at === '2026-05-20T23:59:00.000Z');
  assert('verified_modules array', Array.isArray(r.verified_modules));
  assert('verified_module_count=18', r.verified_module_count === 18);
  assert('token_budget_status propagated', r.token_budget_status === 'TOKEN_BUDGET_ALLOWED');
  assert('governance_report_status propagated', r.governance_report_status === 'GOVERNANCE_REPORT_READY');
  assert('audit_status propagated', r.audit_status === 'AUDIT_BASELINE_READY');
  assert('cache_contract_status propagated', r.cache_contract_status === 'CACHE_CONTRACT_READY');
  assert('prompt_cache_ledger_status propagated', r.prompt_cache_ledger_status === 'CACHE_LEDGER_READY');
}

// --- baseline warning ---
console.log('--- baseline warning ---');
{
  const r = buildGovernanceBaseline({ ...BASE, governance_report_status: 'GOVERNANCE_REPORT_WARNING' });
  assert('governance WARNING → GOVERNANCE_BASELINE_WARNING', r.governance_baseline_status === 'GOVERNANCE_BASELINE_WARNING');
  assert('cost_cache_governance_baseline_ready=true in WARNING', r.cost_cache_governance_baseline_ready === true);
}
{
  const r = buildGovernanceBaseline({ ...BASE, regression_status: 'REGRESSION_WARNING' });
  assert('regression WARNING → GOVERNANCE_BASELINE_WARNING', r.governance_baseline_status === 'GOVERNANCE_BASELINE_WARNING');
}
{
  const r = buildGovernanceBaseline({ ...BASE, token_budget_status: 'TOKEN_BUDGET_WARNING' });
  assert('token budget WARNING → GOVERNANCE_BASELINE_WARNING', r.governance_baseline_status === 'GOVERNANCE_BASELINE_WARNING');
}
{
  const r = buildGovernanceBaseline({ ...BASE, budget_receipt_status: 'RECEIPT_WARNING' });
  assert('receipt WARNING → GOVERNANCE_BASELINE_WARNING', r.governance_baseline_status === 'GOVERNANCE_BASELINE_WARNING');
}
{
  const r = buildGovernanceBaseline({ ...BASE, audit_status: 'AUDIT_BASELINE_WARNING' });
  assert('audit WARNING → GOVERNANCE_BASELINE_WARNING', r.governance_baseline_status === 'GOVERNANCE_BASELINE_WARNING');
}

// --- baseline blocked ---
console.log('--- baseline blocked ---');
{
  const r = buildGovernanceBaseline({ ...BASE, governance_report_status: 'GOVERNANCE_REPORT_BLOCKED' });
  assert('governance BLOCKED → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
  assert('cost_cache_governance_baseline_ready=false', r.cost_cache_governance_baseline_ready === false);
}
{
  const r = buildGovernanceBaseline({ ...BASE, regression_status: 'REGRESSION_BLOCKED_COST_SPIKE' });
  assert('regression COST_SPIKE → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
}
{
  const r = buildGovernanceBaseline({ ...BASE, token_budget_status: 'TOKEN_BUDGET_BLOCKED_LIMIT' });
  assert('token budget BLOCKED_LIMIT → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
}
{
  const r = buildGovernanceBaseline({ ...BASE, token_budget_status: 'TOKEN_BUDGET_BLOCKED_MISSION' });
  assert('token budget BLOCKED_MISSION → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
}
{
  const r = buildGovernanceBaseline({ ...BASE, finalizer_status: 'FINALIZER_BLOCKED_COST' });
  assert('finalizer BLOCKED_COST → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
}
{
  const r = buildGovernanceBaseline({ ...BASE, finalizer_status: 'FINALIZER_BLOCKED_REGRESSION' });
  assert('finalizer BLOCKED_REGRESSION → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
}
{
  const r = buildGovernanceBaseline({ ...BASE, audit_status: 'AUDIT_BASELINE_BLOCKED' });
  assert('audit BLOCKED → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
}
{
  const r = buildGovernanceBaseline({ ...BASE, fallback_status: 'FALLBACK_BLOCKED_UNAVAILABLE' });
  assert('fallback BLOCKED_UNAVAILABLE → GOVERNANCE_BASELINE_BLOCKED', r.governance_baseline_status === 'GOVERNANCE_BASELINE_BLOCKED');
}
{
  const r = buildGovernanceBaseline({ ...BASE, budget_receipt_status: 'RECEIPT_OVER_BUDGET' });
  // RECEIPT_OVER_BUDGET does not match BLOCKED_PATTERNS → stays READY
  assert('receipt OVER_BUDGET → still READY (no BLOCKED pattern)', r.governance_baseline_status === 'GOVERNANCE_BASELINE_READY');
  assert('receipt OVER_BUDGET → baseline_ready=true', r.cost_cache_governance_baseline_ready === true);
}

// --- minimal params ---
console.log('--- minimal params ---');
{
  const r = buildGovernanceBaseline({ mission_id: 'min-mission' });
  assert('just mission_id → READY', r.governance_baseline_status === 'GOVERNANCE_BASELINE_READY');
  assert('token_budget_status=null', r.token_budget_status === null);
  assert('verified_modules present', Array.isArray(r.verified_modules));
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    buildGovernanceBaseline({ ...BASE }),
    buildGovernanceBaseline({ ...BASE, mission_id: '' }),
    buildGovernanceBaseline({ ...BASE, governance_report_status: 'GOVERNANCE_REPORT_BLOCKED' }),
    buildGovernanceBaseline({ ...BASE, token_budget_status: 'TOKEN_BUDGET_WARNING' }),
    buildGovernanceBaseline({ ...BASE, regression_status: 'REGRESSION_BLOCKED_COST_SPIKE' }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.governance_baseline_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.governance_baseline_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.governance_baseline_status}]`, r.release_performed === false);
  }
}

// --- deterministic baseline_id ---
console.log('--- deterministic baseline_id ---');
{
  const r1 = buildGovernanceBaseline({ ...BASE });
  const r2 = buildGovernanceBaseline({ ...BASE });
  assert('baseline_id deterministic', r1.baseline_id === r2.baseline_id);
  assert('baseline_id sha256', /^[a-f0-9]{64}$/.test(r1.baseline_id));
}

// --- verified modules ---
console.log('--- verified modules ---');
{
  assert('VERIFIED_MODULES is array', Array.isArray(VERIFIED_MODULES));
  assert('VERIFIED_MODULES count=18', VERIFIED_MODULES.length === 18);
  const expected = [
    'token-budget-controller',
    'mission-cost-estimator',
    'cost-gate-policy',
    'cost-gate-enforcement-report',
    'budget-aware-test-lane-selector',
    'budget-aware-agent-router',
    'local-free-fallback-governor',
    'peak-offpeak-execution-scheduler',
    'agent-usage-ledger',
    'cost-cache-governance-report',
    'budget-regression-guard',
    'mission-budget-receipt',
    'cost-aware-mission-finalizer',
    'cache-budget-audit-baseline',
    'agent-context-cache-contract',
    'agent-context-cache-store',
    'prompt-cache-ledger',
    'cache-hit-miss-reporter',
  ];
  for (const m of expected) {
    assert(`module present: ${m}`, VERIFIED_MODULES.includes(m));
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildGovernanceBaseline({ ...BASE });
  const v = validateGovernanceBaseline(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildGovernanceBaseline({ ...BASE, mission_id: '' });
  const v = validateGovernanceBaseline(r);
  assert('validate blocked_input → valid=true struct', v.valid === true);
}
{
  const v = validateGovernanceBaseline(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildGovernanceBaseline({ ...BASE });
  const s = renderGovernanceBaseline(r);
  assert('render string', typeof s === 'string');
  assert('render shows GOVERNANCE_BASELINE_READY', s.includes('GOVERNANCE_BASELINE_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows verified modules count', s.includes('18'));
  assert('render shows cache reporter', s.includes('Cache hit/miss reporter:'));
}
{
  const r = buildGovernanceBaseline({ ...BASE, mission_id: '' });
  const s = renderGovernanceBaseline(r);
  assert('render blocked shows BLOCKED_INPUT', s.includes('GOVERNANCE_BASELINE_BLOCKED_INPUT'));
}
{
  const s = renderGovernanceBaseline(null);
  assert('render null graceful', typeof s === 'string');
}

// --- GOVERNANCE_BASELINE_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(GOVERNANCE_BASELINE_STATUSES));
  assert('length=4', GOVERNANCE_BASELINE_STATUSES.length === 4);
  for (const s of [
    'GOVERNANCE_BASELINE_BLOCKED_INPUT', 'GOVERNANCE_BASELINE_READY',
    'GOVERNANCE_BASELINE_WARNING', 'GOVERNANCE_BASELINE_BLOCKED',
  ]) {
    assert(`${s} present`, GOVERNANCE_BASELINE_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
