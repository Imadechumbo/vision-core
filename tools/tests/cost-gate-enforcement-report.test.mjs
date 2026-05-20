#!/usr/bin/env node
/**
 * Tests — Cost Gate Enforcement Report V134.1
 */

import {
  buildCostGateEnforcementReport,
  validateCostGateEnforcementReport,
  renderCostGateEnforcementReport,
  COST_ENFORCEMENT_REPORT_STATUSES,
} from '../cost-gate-enforcement-report.mjs';

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

function makePolicy(status, overrides = {}) {
  const base = {
    cost_gate_status:        status,
    cost_allowed:            status === 'COST_GATE_ALLOWED' || status === 'COST_GATE_WARNING',
    cost_blocked:            status === 'COST_GATE_BLOCKED',
    human_approval_required: status === 'COST_GATE_REQUIRES_HUMAN_APPROVAL',
    fallback_required:       status === 'COST_GATE_REQUIRES_FALLBACK',
    recommended_next_action: `Action for ${status}`,
  };
  return { ...base, ...overrides };
}

console.log('\n=== cost-gate-enforcement-report tests ===\n');

// --- blocked null policy ---
console.log('--- blocked null policy ---');
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: null });
  assert('null policy → BLOCKED_POLICY', r.enforcement_status === 'COST_ENFORCEMENT_BLOCKED_POLICY');
  assert('cost_blocked=true', r.cost_blocked === true);
  assert('cost_allowed=false', r.cost_allowed === false);
  assert('no_execution_performed=true', r.no_execution_performed === true);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildCostGateEnforcementReport({});
  assert('missing policy → BLOCKED_POLICY', r.enforcement_status === 'COST_ENFORCEMENT_BLOCKED_POLICY');
}
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: { cost_gate_status: 'INVALID_STATUS' } });
  assert('invalid status → BLOCKED_POLICY', r.enforcement_status === 'COST_ENFORCEMENT_BLOCKED_POLICY');
}

// --- allowed report ---
console.log('--- allowed report ---');
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_ALLOWED') });
  assert('ALLOWED → COST_ENFORCEMENT_ALLOWED', r.enforcement_status === 'COST_ENFORCEMENT_ALLOWED');
  assert('cost_allowed=true', r.cost_allowed === true);
  assert('cost_blocked=false', r.cost_blocked === false);
  assert('schema_version=v134.1', r.schema_version === 'v134.1');
  assert('cost_gate_status propagated', r.cost_gate_status === 'COST_GATE_ALLOWED');
}

// --- warning report ---
console.log('--- warning report ---');
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_WARNING') });
  assert('WARNING → COST_ENFORCEMENT_WARNING', r.enforcement_status === 'COST_ENFORCEMENT_WARNING');
  assert('cost_allowed=true in WARNING', r.cost_allowed === true);
}

// --- blocked report ---
console.log('--- blocked report ---');
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_BLOCKED') });
  assert('BLOCKED → COST_ENFORCEMENT_BLOCKED', r.enforcement_status === 'COST_ENFORCEMENT_BLOCKED');
  assert('cost_blocked=true', r.cost_blocked === true);
}
{
  // REQUIRES_HUMAN_APPROVAL also maps to BLOCKED enforcement
  const r = buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_REQUIRES_HUMAN_APPROVAL') });
  assert('REQUIRES_HUMAN_APPROVAL → COST_ENFORCEMENT_BLOCKED', r.enforcement_status === 'COST_ENFORCEMENT_BLOCKED');
  assert('human_approval_required propagated', r.human_approval_required === true);
}

// --- fallback required report ---
console.log('--- fallback required report ---');
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_REQUIRES_FALLBACK') });
  assert('REQUIRES_FALLBACK → COST_ENFORCEMENT_FALLBACK_REQUIRED', r.enforcement_status === 'COST_ENFORCEMENT_FALLBACK_REQUIRED');
  assert('fallback_required=true', r.fallback_required === true);
}

// --- no_execution_performed=true on all paths ---
console.log('--- no_execution_performed ---');
{
  const cases = [
    buildCostGateEnforcementReport({ cost_gate_policy: null }),
    buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_ALLOWED') }),
    buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_BLOCKED') }),
    buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_REQUIRES_FALLBACK') }),
  ];
  for (const r of cases) {
    assert(`no_execution_performed=true [${r.enforcement_status}]`, r.no_execution_performed === true);
  }
}

// --- stable/deploy/release false ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    buildCostGateEnforcementReport({ cost_gate_policy: null }),
    buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_ALLOWED') }),
    buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_BLOCKED') }),
    buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_REQUIRES_FALLBACK') }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.enforcement_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.enforcement_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.enforcement_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_ALLOWED') });
  const v = validateCostGateEnforcementReport(r);
  assert('validate allowed → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: null });
  const v = validateCostGateEnforcementReport(r);
  assert('validate blocked_policy → valid=true struct', v.valid === true);
}
{
  const v = validateCostGateEnforcementReport(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: makePolicy('COST_GATE_ALLOWED') });
  const s = renderCostGateEnforcementReport(r);
  assert('render string', typeof s === 'string');
  assert('render shows ALLOWED', s.includes('COST_ENFORCEMENT_ALLOWED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows no_execution', s.includes('No execution performed:'));
}
{
  const r = buildCostGateEnforcementReport({ cost_gate_policy: null });
  const s = renderCostGateEnforcementReport(r);
  assert('render blocked shows BLOCKED_POLICY', s.includes('COST_ENFORCEMENT_BLOCKED_POLICY'));
}
{
  const s = renderCostGateEnforcementReport(null);
  assert('render null graceful', typeof s === 'string');
}

// --- COST_ENFORCEMENT_REPORT_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(COST_ENFORCEMENT_REPORT_STATUSES));
  assert('length=5', COST_ENFORCEMENT_REPORT_STATUSES.length === 5);
  assert('BLOCKED_POLICY present', COST_ENFORCEMENT_REPORT_STATUSES.includes('COST_ENFORCEMENT_BLOCKED_POLICY'));
  assert('ALLOWED present', COST_ENFORCEMENT_REPORT_STATUSES.includes('COST_ENFORCEMENT_ALLOWED'));
  assert('WARNING present', COST_ENFORCEMENT_REPORT_STATUSES.includes('COST_ENFORCEMENT_WARNING'));
  assert('BLOCKED present', COST_ENFORCEMENT_REPORT_STATUSES.includes('COST_ENFORCEMENT_BLOCKED'));
  assert('FALLBACK_REQUIRED present', COST_ENFORCEMENT_REPORT_STATUSES.includes('COST_ENFORCEMENT_FALLBACK_REQUIRED'));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
