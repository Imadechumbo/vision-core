#!/usr/bin/env node
/**
 * Tests — Cost Gate Policy V134.0
 */

import {
  evaluateCostGatePolicy,
  validateCostGatePolicy,
  renderCostGatePolicy,
  COST_GATE_STATUSES,
} from '../cost-gate-policy.mjs';

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

function makeEstimate(overrides = {}) {
  return {
    cost_estimate_ready:      true,
    total_estimated_cost_usd: 0.45,
    cost_estimate_status:     'MISSION_COST_ESTIMATED',
    ...overrides,
  };
}

const BASE = {
  mission_cost_estimate:       makeEstimate(),
  max_cost_per_mission_usd:    2.0,
  max_daily_cost_usd:          10.0,
  current_daily_cost_usd:      1.0,
  human_approval_threshold_usd: 5.0,
  fallback_threshold_usd:      8.0,
  premium_agent_requested:     false,
};

console.log('\n=== cost-gate-policy tests ===\n');

// --- allowed ---
console.log('--- allowed ---');
{
  const r = evaluateCostGatePolicy({ ...BASE });
  assert('basic → ALLOWED', r.cost_gate_status === 'COST_GATE_ALLOWED');
  assert('cost_allowed=true', r.cost_allowed === true);
  assert('cost_blocked=false', r.cost_blocked === false);
  assert('human_approval_required=false', r.human_approval_required === false);
  assert('fallback_required=false', r.fallback_required === false);
  assert('schema_version=v134.0', r.schema_version === 'v134.0');
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- warning ---
console.log('--- warning ---');
{
  const r = evaluateCostGatePolicy({
    ...BASE,
    mission_cost_estimate: makeEstimate({
      total_estimated_cost_usd: 0.45,
      cost_estimate_status:     'MISSION_COST_WARNING',
    }),
  });
  assert('WARNING estimate → COST_GATE_WARNING', r.cost_gate_status === 'COST_GATE_WARNING');
  assert('cost_allowed=true in WARNING', r.cost_allowed === true);
  assert('cost_blocked=false in WARNING', r.cost_blocked === false);
}
{
  const r = evaluateCostGatePolicy({
    ...BASE,
    mission_cost_estimate: makeEstimate({
      total_estimated_cost_usd: 0.45,
      cost_estimate_status:     'MISSION_COST_EXPENSIVE',
    }),
  });
  assert('EXPENSIVE estimate → COST_GATE_WARNING', r.cost_gate_status === 'COST_GATE_WARNING');
}

// --- blocked per-mission ---
console.log('--- blocked ---');
{
  const r = evaluateCostGatePolicy({
    ...BASE,
    mission_cost_estimate: makeEstimate({ total_estimated_cost_usd: 3.0 }),
    max_cost_per_mission_usd: 2.0,
  });
  assert('exceeds per-mission max → BLOCKED', r.cost_gate_status === 'COST_GATE_BLOCKED');
  assert('cost_allowed=false', r.cost_allowed === false);
  assert('cost_blocked=true', r.cost_blocked === true);
}

// --- blocked daily ---
{
  const r = evaluateCostGatePolicy({
    ...BASE,
    mission_cost_estimate:  makeEstimate({ total_estimated_cost_usd: 1.5 }),
    max_daily_cost_usd:     2.0,
    current_daily_cost_usd: 1.0,
  });
  assert('projected daily > max → BLOCKED', r.cost_gate_status === 'COST_GATE_BLOCKED');
}

// --- human approval required ---
console.log('--- human approval ---');
{
  const r = evaluateCostGatePolicy({
    ...BASE,
    mission_cost_estimate:       makeEstimate({ total_estimated_cost_usd: 5.5 }),
    max_cost_per_mission_usd:    10.0,
    max_daily_cost_usd:          100.0,
    human_approval_threshold_usd: 5.0,
  });
  assert('above human_approval_threshold → REQUIRES_HUMAN_APPROVAL', r.cost_gate_status === 'COST_GATE_REQUIRES_HUMAN_APPROVAL');
  assert('human_approval_required=true', r.human_approval_required === true);
  assert('cost_blocked=false', r.cost_blocked === false);
}
{
  // premium_agent_requested triggers human approval
  const r = evaluateCostGatePolicy({
    ...BASE,
    mission_cost_estimate:       makeEstimate({ total_estimated_cost_usd: 0.45 }),
    human_approval_threshold_usd: 1.0,
    premium_agent_requested:     true,
  });
  assert('premium_agent_requested → REQUIRES_HUMAN_APPROVAL', r.cost_gate_status === 'COST_GATE_REQUIRES_HUMAN_APPROVAL');
}

// --- fallback required ---
console.log('--- fallback required ---');
{
  const r = evaluateCostGatePolicy({
    ...BASE,
    mission_cost_estimate:  makeEstimate({ total_estimated_cost_usd: 9.0 }),
    max_cost_per_mission_usd: 20.0,
    max_daily_cost_usd:      100.0,
    fallback_threshold_usd: 8.0,
  });
  assert('above fallback_threshold → REQUIRES_FALLBACK', r.cost_gate_status === 'COST_GATE_REQUIRES_FALLBACK');
  assert('fallback_required=true', r.fallback_required === true);
  assert('cost_blocked=true', r.cost_blocked === true);
}

// --- invalid estimate blocked ---
console.log('--- invalid estimate blocked ---');
{
  const r = evaluateCostGatePolicy({ ...BASE, mission_cost_estimate: null });
  assert('null estimate → BLOCKED', r.cost_gate_status === 'COST_GATE_BLOCKED');
  assert('cost_blocked=true', r.cost_blocked === true);
}
{
  const r = evaluateCostGatePolicy({ ...BASE, mission_cost_estimate: makeEstimate({ cost_estimate_ready: false }) });
  assert('not ready estimate → BLOCKED', r.cost_gate_status === 'COST_GATE_BLOCKED');
}
{
  const r = evaluateCostGatePolicy({ ...BASE, max_cost_per_mission_usd: 0 });
  assert('max_cost_per_mission=0 → BLOCKED', r.cost_gate_status === 'COST_GATE_BLOCKED');
}

// --- stable/deploy/release false ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    evaluateCostGatePolicy({ ...BASE }),
    evaluateCostGatePolicy({ ...BASE, mission_cost_estimate: null }),
    evaluateCostGatePolicy({
      ...BASE,
      mission_cost_estimate:  makeEstimate({ total_estimated_cost_usd: 9.0 }),
      fallback_threshold_usd: 8.0,
      max_cost_per_mission_usd: 20.0,
      max_daily_cost_usd:      100.0,
    }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.cost_gate_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.cost_gate_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.cost_gate_status}]`, r.release_performed === false);
  }
}

// --- validate/render ---
console.log('--- validate ---');
{
  const r = evaluateCostGatePolicy({ ...BASE });
  const v = validateCostGatePolicy(r);
  assert('validate allowed → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateCostGatePolicy({ ...BASE, mission_cost_estimate: null });
  const v = validateCostGatePolicy(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateCostGatePolicy(null);
  assert('validate null → invalid', v.valid === false);
}

console.log('--- render ---');
{
  const r = evaluateCostGatePolicy({ ...BASE });
  const s = renderCostGatePolicy(r);
  assert('render string', typeof s === 'string');
  assert('render shows ALLOWED', s.includes('COST_GATE_ALLOWED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = evaluateCostGatePolicy({ ...BASE, mission_cost_estimate: null });
  const s = renderCostGatePolicy(r);
  assert('render blocked shows BLOCKED', s.includes('COST_GATE_BLOCKED'));
}
{
  const s = renderCostGatePolicy(null);
  assert('render null graceful', typeof s === 'string');
}

// --- COST_GATE_STATUSES export ---
console.log('--- COST_GATE_STATUSES export ---');
{
  assert('is array', Array.isArray(COST_GATE_STATUSES));
  assert('length=5', COST_GATE_STATUSES.length === 5);
  assert('ALLOWED present', COST_GATE_STATUSES.includes('COST_GATE_ALLOWED'));
  assert('WARNING present', COST_GATE_STATUSES.includes('COST_GATE_WARNING'));
  assert('BLOCKED present', COST_GATE_STATUSES.includes('COST_GATE_BLOCKED'));
  assert('REQUIRES_HUMAN_APPROVAL present', COST_GATE_STATUSES.includes('COST_GATE_REQUIRES_HUMAN_APPROVAL'));
  assert('REQUIRES_FALLBACK present', COST_GATE_STATUSES.includes('COST_GATE_REQUIRES_FALLBACK'));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
