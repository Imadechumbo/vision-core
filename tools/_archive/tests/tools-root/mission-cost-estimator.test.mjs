#!/usr/bin/env node
/**
 * Tests — Mission Cost Estimator V133.1
 */

import {
  estimateMissionCost,
  validateMissionCostEstimate,
  renderMissionCostEstimate,
  MISSION_COST_STATUSES,
} from '../mission-cost-estimator.mjs';

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
  mission_id:              'mission-cost-1',
  model_provider:          'anthropic',
  model_name:              'claude-sonnet-4-6',
  estimated_input_tokens:  100000,
  estimated_output_tokens: 10000,
  input_cost_per_1m:       3.0,
  output_cost_per_1m:      15.0,
  cache_discount_tokens:   0,
  cache_discount_usd:      0,
  tests_cost_weight:       1.0,
  warning_cost_usd:        1.0,
  expensive_cost_usd:      5.0,
};

console.log('\n=== mission-cost-estimator tests ===\n');

// --- invalid input blocks ---
console.log('--- invalid input blocks ---');
{
  const r = estimateMissionCost({ ...BASE, mission_id: '' });
  assert('empty mission_id → BLOCKED', r.cost_estimate_status === 'MISSION_COST_BLOCKED_INPUT');
  assert('cost_estimate_ready=false', r.cost_estimate_ready === false);
  assert('cost_gate_required=true on blocked', r.cost_gate_required === true);
}
{
  const r = estimateMissionCost({ ...BASE, model_provider: '' });
  assert('empty model_provider → BLOCKED', r.cost_estimate_status === 'MISSION_COST_BLOCKED_INPUT');
}
{
  const r = estimateMissionCost({ ...BASE, model_name: null });
  assert('null model_name → BLOCKED', r.cost_estimate_status === 'MISSION_COST_BLOCKED_INPUT');
}
{
  const r = estimateMissionCost({ ...BASE, estimated_input_tokens: -1 });
  assert('negative estimated_input → BLOCKED', r.cost_estimate_status === 'MISSION_COST_BLOCKED_INPUT');
}
{
  const r = estimateMissionCost({ ...BASE, estimated_output_tokens: -5 });
  assert('negative estimated_output → BLOCKED', r.cost_estimate_status === 'MISSION_COST_BLOCKED_INPUT');
}
{
  const r = estimateMissionCost({ ...BASE, input_cost_per_1m: 0 });
  assert('input_cost_per_1m=0 → BLOCKED', r.cost_estimate_status === 'MISSION_COST_BLOCKED_INPUT');
}
{
  const r = estimateMissionCost({ ...BASE, output_cost_per_1m: -1 });
  assert('negative output_cost_per_1m → BLOCKED', r.cost_estimate_status === 'MISSION_COST_BLOCKED_INPUT');
}

// --- basic estimate ---
console.log('--- basic estimate ---');
{
  // input: 100000 * 3/1M = 0.3, output: 10000 * 15/1M = 0.15, total=0.45
  const r = estimateMissionCost({ ...BASE });
  assert('status ESTIMATED', r.cost_estimate_status === 'MISSION_COST_ESTIMATED');
  assert('cost_estimate_ready=true', r.cost_estimate_ready === true);
  assert('cost_gate_required=true', r.cost_gate_required === true);
  assert('schema_version=v133.1', r.schema_version === 'v133.1');
  assert('estimated_tokens=110000', r.estimated_tokens === 110000);
  assert('estimated_cost_usd ≈ 0.45', Math.abs(r.estimated_cost_usd - 0.45) < 0.000001);
  assert('total_estimated_cost_usd ≈ 0.45', Math.abs(r.total_estimated_cost_usd - 0.45) < 0.000001);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- cache discount ---
console.log('--- cache discount ---');
{
  // base cost=0.45, discount=0.10 → effective=0.35
  const r = estimateMissionCost({ ...BASE, cache_discount_usd: 0.10 });
  assert('cache discount reduces cost', Math.abs(r.estimated_cost_usd - 0.35) < 0.000001);
  assert('cache_discount_usd recorded', r.cache_discount_usd === 0.10);
  assert('cache_discount_tokens recorded', r.cache_discount_tokens === 0);
}

// --- no cache ---
console.log('--- no cache ---');
{
  const r = estimateMissionCost({ ...BASE, cache_discount_tokens: 0, cache_discount_usd: 0 });
  assert('no cache → full cost', Math.abs(r.estimated_cost_usd - 0.45) < 0.000001);
}

// --- expensive mission warning (WARNING tier) ---
console.log('--- warning tier ---');
{
  // make cost > warning_cost_usd=1.0: input=500000*3/1M=1.5, output=0 → 1.5 → WARNING
  const r = estimateMissionCost({
    ...BASE,
    estimated_input_tokens:  500000,
    estimated_output_tokens: 0,
    warning_cost_usd:        1.0,
    expensive_cost_usd:      5.0,
  });
  assert('cost > warning → WARNING', r.cost_estimate_status === 'MISSION_COST_WARNING');
}

// --- expensive tier ---
console.log('--- expensive tier ---');
{
  // input=2000000*3/1M=6.0 → EXPENSIVE
  const r = estimateMissionCost({
    ...BASE,
    estimated_input_tokens:  2000000,
    estimated_output_tokens: 0,
    warning_cost_usd:        1.0,
    expensive_cost_usd:      5.0,
  });
  assert('cost > expensive → EXPENSIVE', r.cost_estimate_status === 'MISSION_COST_EXPENSIVE');
}

// --- deterministic estimate_id ---
console.log('--- deterministic estimate_id ---');
{
  const r1 = estimateMissionCost({ ...BASE });
  const r2 = estimateMissionCost({ ...BASE });
  assert('estimate_id deterministic', r1.estimate_id === r2.estimate_id);
  assert('estimate_id sha256 hex 64', /^[a-f0-9]{64}$/.test(r1.estimate_id));
}
{
  const r1 = estimateMissionCost({ ...BASE });
  const r2 = estimateMissionCost({ ...BASE, estimated_input_tokens: 200000 });
  assert('different input → different estimate_id', r1.estimate_id !== r2.estimate_id);
}

// --- cost_gate_required=true on all paths ---
console.log('--- cost_gate_required ---');
{
  const cases = [
    estimateMissionCost({ ...BASE }),
    estimateMissionCost({ ...BASE, mission_id: '' }),
    estimateMissionCost({ ...BASE, estimated_input_tokens: 2000000, estimated_output_tokens: 0 }),
  ];
  for (const r of cases) {
    assert(`cost_gate_required=true [${r.cost_estimate_status}]`, r.cost_gate_required === true);
  }
}

// --- stable/deploy/release false ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    estimateMissionCost({ ...BASE }),
    estimateMissionCost({ ...BASE, mission_id: '' }),
    estimateMissionCost({ ...BASE, estimated_input_tokens: 2000000, estimated_output_tokens: 0 }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.cost_estimate_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.cost_estimate_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.cost_estimate_status}]`, r.release_performed === false);
  }
}

// --- render ready/blocked ---
console.log('--- render ---');
{
  const r = estimateMissionCost({ ...BASE });
  const s = renderMissionCostEstimate(r);
  assert('render string', typeof s === 'string');
  assert('render shows status', s.includes('MISSION_COST_ESTIMATED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows total cost', s.includes('Total cost USD:'));
}
{
  const r = estimateMissionCost({ ...BASE, mission_id: '' });
  const s = renderMissionCostEstimate(r);
  assert('blocked render shows BLOCKED_INPUT', s.includes('MISSION_COST_BLOCKED_INPUT'));
  assert('blocked render shows reason', s.includes('Blocked reason:'));
}
{
  const s = renderMissionCostEstimate(null);
  assert('null render graceful', typeof s === 'string');
}

// --- validate ready/blocked ---
console.log('--- validate ---');
{
  const r = estimateMissionCost({ ...BASE });
  const v = validateMissionCostEstimate(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('validate ready → no errors', v.errors.length === 0);
}
{
  const r = estimateMissionCost({ ...BASE, mission_id: '' });
  const v = validateMissionCostEstimate(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateMissionCostEstimate(null);
  assert('validate null → invalid', v.valid === false);
}

// --- MISSION_COST_STATUSES export ---
console.log('--- MISSION_COST_STATUSES export ---');
{
  assert('is array', Array.isArray(MISSION_COST_STATUSES));
  assert('length=4', MISSION_COST_STATUSES.length === 4);
  assert('BLOCKED_INPUT present', MISSION_COST_STATUSES.includes('MISSION_COST_BLOCKED_INPUT'));
  assert('ESTIMATED present', MISSION_COST_STATUSES.includes('MISSION_COST_ESTIMATED'));
  assert('WARNING present', MISSION_COST_STATUSES.includes('MISSION_COST_WARNING'));
  assert('EXPENSIVE present', MISSION_COST_STATUSES.includes('MISSION_COST_EXPENSIVE'));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
