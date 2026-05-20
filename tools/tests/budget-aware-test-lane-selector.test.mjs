#!/usr/bin/env node
/**
 * Tests — Budget-Aware Test Lane Selector V135.0
 */

import {
  selectBudgetAwareTestLane,
  validateBudgetAwareTestLane,
  renderBudgetAwareTestLane,
  TEST_LANE_STATUSES,
  TEST_LANES,
} from '../budget-aware-test-lane-selector.mjs';

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
  mission_id:           'mission-lane-1',
  cost_gate_status:     'COST_GATE_ALLOWED',
  cost_allowed:         true,
  total_usage_ratio:    0.2,
  minimum_lane_required: 'syntax-only',
  is_critical_mission:  false,
};

console.log('\n=== budget-aware-test-lane-selector tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = selectBudgetAwareTestLane({ ...BASE, mission_id: '' });
  assert('empty mission_id → LANE_BLOCKED_INPUT', r.lane_status === 'LANE_BLOCKED_INPUT');
  assert('lane_blocked=true', r.lane_blocked === true);
  assert('lane_allowed=false', r.lane_allowed === false);
}
{
  const r = selectBudgetAwareTestLane({ ...BASE, cost_gate_status: null });
  assert('null cost_gate_status → LANE_BLOCKED_INPUT', r.lane_status === 'LANE_BLOCKED_INPUT');
}
{
  const r = selectBudgetAwareTestLane({ ...BASE, minimum_lane_required: 'invalid-lane' });
  assert('invalid minimum_lane → LANE_BLOCKED_INPUT', r.lane_status === 'LANE_BLOCKED_INPUT');
}

// --- low cost → affected/quick ---
console.log('--- low cost ---');
{
  const r = selectBudgetAwareTestLane({ ...BASE, total_usage_ratio: 0.2 });
  assert('low cost → LANE_SELECTED', r.lane_status === 'LANE_SELECTED');
  assert('low cost → affected', r.selected_lane === 'affected');
  assert('lane_allowed=true', r.lane_allowed === true);
  assert('schema_version=v135.0', r.schema_version === 'v135.0');
}
{
  const r = selectBudgetAwareTestLane({ ...BASE, total_usage_ratio: 0.2, is_critical_mission: true });
  assert('low cost + critical → quick', r.selected_lane === 'quick');
}

// --- medium cost → postmerge ---
console.log('--- medium cost ---');
{
  const r = selectBudgetAwareTestLane({ ...BASE, total_usage_ratio: 0.6 });
  assert('medium cost → postmerge', r.selected_lane === 'postmerge');
}

// --- high cost ---
console.log('--- high cost ---');
{
  const r = selectBudgetAwareTestLane({ ...BASE, total_usage_ratio: 0.85, cost_gate_status: 'COST_GATE_ALLOWED' });
  assert('high cost + ALLOWED → full', r.selected_lane === 'full');
}
{
  const r = selectBudgetAwareTestLane({ ...BASE, total_usage_ratio: 0.85, cost_gate_status: 'COST_GATE_WARNING', cost_allowed: true });
  assert('high cost + WARNING → quick', r.selected_lane === 'quick');
}

// --- cost blocked → syntax-only ---
console.log('--- cost blocked ---');
{
  const r = selectBudgetAwareTestLane({ ...BASE, cost_allowed: false, cost_gate_status: 'COST_GATE_BLOCKED' });
  assert('cost blocked → syntax-only', r.selected_lane === 'syntax-only');
  assert('lane_allowed=true (syntax-only meets min)', r.lane_allowed === true);
}
{
  // Cost blocked + minimum=quick → can't meet minimum with syntax-only
  const r = selectBudgetAwareTestLane({
    ...BASE,
    cost_allowed:          false,
    cost_gate_status:      'COST_GATE_BLOCKED',
    minimum_lane_required: 'quick',
  });
  assert('cost blocked + min=quick → syntax-only lane_allowed=false', r.lane_allowed === false);
  assert('lane_blocked=true', r.lane_blocked === true);
}

// --- minimum lane enforced ---
console.log('--- minimum lane enforced ---');
{
  const r = selectBudgetAwareTestLane({
    ...BASE,
    total_usage_ratio:     0.2,
    minimum_lane_required: 'postmerge',
  });
  // Low cost would select affected, but minimum is postmerge
  assert('minimum enforced → postmerge', r.selected_lane === 'postmerge');
  assert('status=LANE_MINIMUM_ENFORCED', r.lane_status === 'LANE_MINIMUM_ENFORCED');
}

// --- requested_lane respected if allowed ---
console.log('--- requested lane ---');
{
  const r = selectBudgetAwareTestLane({
    ...BASE,
    total_usage_ratio: 0.2,
    requested_lane:    'go',
    cost_gate_status:  'COST_GATE_ALLOWED',
  });
  assert('requested go + ALLOWED → go', r.selected_lane === 'go');
}
{
  // Request certify but gate is WARNING (not ALLOWED) → falls back to recommended
  const r = selectBudgetAwareTestLane({
    ...BASE,
    total_usage_ratio: 0.2,
    requested_lane:    'certify',
    cost_gate_status:  'COST_GATE_WARNING',
    cost_allowed:      true,
  });
  assert('requested certify + WARNING → recommended (affected)', r.selected_lane !== 'certify');
}

// --- deterministic lane_id ---
console.log('--- deterministic lane_id ---');
{
  const r1 = selectBudgetAwareTestLane({ ...BASE });
  const r2 = selectBudgetAwareTestLane({ ...BASE });
  assert('lane_id deterministic', r1.lane_id === r2.lane_id);
  assert('lane_id sha256 hex 64', /^[a-f0-9]{64}$/.test(r1.lane_id));
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    selectBudgetAwareTestLane({ ...BASE }),
    selectBudgetAwareTestLane({ ...BASE, mission_id: '' }),
    selectBudgetAwareTestLane({ ...BASE, cost_allowed: false }),
    selectBudgetAwareTestLane({ ...BASE, total_usage_ratio: 0.9 }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.lane_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.lane_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.lane_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = selectBudgetAwareTestLane({ ...BASE });
  const v = validateBudgetAwareTestLane(r);
  assert('validate selected → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = selectBudgetAwareTestLane({ ...BASE, mission_id: '' });
  const v = validateBudgetAwareTestLane(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateBudgetAwareTestLane(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = selectBudgetAwareTestLane({ ...BASE });
  const s = renderBudgetAwareTestLane(r);
  assert('render string', typeof s === 'string');
  assert('render shows lane', s.includes('affected') || s.includes('LANE_SELECTED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = selectBudgetAwareTestLane({ ...BASE, mission_id: '' });
  const s = renderBudgetAwareTestLane(r);
  assert('render blocked shows BLOCKED', s.includes('LANE_BLOCKED_INPUT'));
}
{
  const s = renderBudgetAwareTestLane(null);
  assert('render null graceful', typeof s === 'string');
}

// --- TEST_LANE_STATUSES and TEST_LANES exports ---
console.log('--- exports ---');
{
  assert('TEST_LANE_STATUSES is array', Array.isArray(TEST_LANE_STATUSES));
  assert('TEST_LANE_STATUSES length=3', TEST_LANE_STATUSES.length === 3);
  assert('BLOCKED_INPUT present', TEST_LANE_STATUSES.includes('LANE_BLOCKED_INPUT'));
  assert('SELECTED present', TEST_LANE_STATUSES.includes('LANE_SELECTED'));
  assert('MINIMUM_ENFORCED present', TEST_LANE_STATUSES.includes('LANE_MINIMUM_ENFORCED'));

  assert('TEST_LANES is array', Array.isArray(TEST_LANES));
  assert('TEST_LANES length=7', TEST_LANES.length === 7);
  for (const l of ['syntax-only', 'affected', 'quick', 'postmerge', 'full', 'go', 'certify']) {
    assert(`lane ${l} present`, TEST_LANES.includes(l));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
