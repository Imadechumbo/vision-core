#!/usr/bin/env node
/**
 * Tests — Peak/Off-Peak Execution Scheduler V136.1
 */

import {
  evaluateExecutionWindow,
  validateExecutionWindow,
  renderExecutionWindow,
  EXECUTION_WINDOW_STATUSES,
} from '../peak-offpeak-execution-scheduler.mjs';

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
  mission_id:       'mission-sched-1',
  timezone:         'UTC',
  current_hour:     14, // peak (9-17)
  cost_gate_status: 'COST_GATE_ALLOWED',
  cost_allowed:     true,
  is_urgent:        false,
};

console.log('\n=== peak-offpeak-execution-scheduler tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = evaluateExecutionWindow({ ...BASE, mission_id: '' });
  assert('empty mission_id → WINDOW_BLOCKED_INPUT', r.window_status === 'WINDOW_BLOCKED_INPUT');
  assert('continue_allowed=false', r.continue_allowed === false);
  assert('no_execution_performed=true', r.no_execution_performed === true);
}
{
  const r = evaluateExecutionWindow({ ...BASE, current_hour: 25 });
  assert('invalid hour → WINDOW_BLOCKED_INPUT', r.window_status === 'WINDOW_BLOCKED_INPUT');
}
{
  const r = evaluateExecutionWindow({ ...BASE, current_hour: -1 });
  assert('hour=-1 → WINDOW_BLOCKED_INPUT', r.window_status === 'WINDOW_BLOCKED_INPUT');
}
{
  const r = evaluateExecutionWindow({ ...BASE, cost_gate_status: null });
  assert('null cost_gate_status → WINDOW_BLOCKED_INPUT', r.window_status === 'WINDOW_BLOCKED_INPUT');
}

// --- off-peak ---
console.log('--- off-peak ---');
{
  const r = evaluateExecutionWindow({ ...BASE, current_hour: 3 }); // 3 UTC = off-peak
  assert('hour=3 → WINDOW_OFFPEAK_RECOMMENDED', r.window_status === 'WINDOW_OFFPEAK_RECOMMENDED');
  assert('is_peak=false', r.is_peak === false);
  assert('is_offpeak=true', r.is_offpeak === true);
  assert('continue_allowed=true', r.continue_allowed === true);
  assert('delay_recommended=false', r.delay_recommended === false);
  assert('recommended_lane=full', r.recommended_lane === 'full');
  assert('schema_version=v136.1', r.schema_version === 'v136.1');
}
{
  const r = evaluateExecutionWindow({ ...BASE, current_hour: 20 }); // 20 UTC = off-peak
  assert('hour=20 → off-peak', r.window_status === 'WINDOW_OFFPEAK_RECOMMENDED');
}

// --- peak allowed ---
console.log('--- peak allowed ---');
{
  const r = evaluateExecutionWindow({ ...BASE, current_hour: 14 });
  assert('peak + ALLOWED → WINDOW_PEAK_ALLOWED', r.window_status === 'WINDOW_PEAK_ALLOWED');
  assert('is_peak=true', r.is_peak === true);
  assert('continue_allowed=true', r.continue_allowed === true);
}

// --- peak delay recommended ---
console.log('--- peak delay recommended ---');
{
  const r = evaluateExecutionWindow({ ...BASE, current_hour: 14, cost_gate_status: 'COST_GATE_WARNING' });
  assert('peak + WARNING → WINDOW_PEAK_DELAY_RECOMMENDED', r.window_status === 'WINDOW_PEAK_DELAY_RECOMMENDED');
  assert('delay_recommended=true', r.delay_recommended === true);
  assert('continue_allowed=true', r.continue_allowed === true);
}

// --- peak blocked (cost not allowed) ---
console.log('--- peak blocked ---');
{
  const r = evaluateExecutionWindow({ ...BASE, cost_allowed: false, current_hour: 14 });
  assert('cost blocked → WINDOW_PEAK_BLOCKED', r.window_status === 'WINDOW_PEAK_BLOCKED');
  assert('continue_allowed=false', r.continue_allowed === false);
  assert('recommended_agent=blocked', r.recommended_agent === 'blocked');
}

// --- peak + urgent → allow ---
console.log('--- peak + urgent ---');
{
  const r = evaluateExecutionWindow({ ...BASE, is_urgent: true, current_hour: 14 });
  assert('peak + urgent → WINDOW_PEAK_ALLOWED', r.window_status === 'WINDOW_PEAK_ALLOWED');
  assert('continue_allowed=true', r.continue_allowed === true);
  assert('recommended_lane=quick', r.recommended_lane === 'quick');
}

// --- no_execution_performed=true always ---
console.log('--- no_execution_performed ---');
{
  const cases = [
    evaluateExecutionWindow({ ...BASE }),
    evaluateExecutionWindow({ ...BASE, mission_id: '' }),
    evaluateExecutionWindow({ ...BASE, current_hour: 3 }),
    evaluateExecutionWindow({ ...BASE, cost_allowed: false }),
  ];
  for (const r of cases) {
    assert(`no_execution_performed=true [${r.window_status}]`, r.no_execution_performed === true);
  }
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    evaluateExecutionWindow({ ...BASE }),
    evaluateExecutionWindow({ ...BASE, mission_id: '' }),
    evaluateExecutionWindow({ ...BASE, current_hour: 3 }),
    evaluateExecutionWindow({ ...BASE, cost_allowed: false }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.window_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.window_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.window_status}]`, r.release_performed === false);
  }
}

// --- deterministic scheduler_id ---
console.log('--- deterministic scheduler_id ---');
{
  const r1 = evaluateExecutionWindow({ ...BASE });
  const r2 = evaluateExecutionWindow({ ...BASE });
  assert('scheduler_id deterministic', r1.scheduler_id === r2.scheduler_id);
  assert('scheduler_id sha256', /^[a-f0-9]{64}$/.test(r1.scheduler_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = evaluateExecutionWindow({ ...BASE });
  const v = validateExecutionWindow(r);
  assert('validate peak allowed → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateExecutionWindow({ ...BASE, current_hour: 3 });
  const v = validateExecutionWindow(r);
  assert('validate offpeak → valid=true', v.valid === true);
}
{
  const r = evaluateExecutionWindow({ ...BASE, mission_id: '' });
  const v = validateExecutionWindow(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateExecutionWindow(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateExecutionWindow({ ...BASE });
  const s = renderExecutionWindow(r);
  assert('render string', typeof s === 'string');
  assert('render shows window_status', s.includes('WINDOW_PEAK_ALLOWED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = evaluateExecutionWindow({ ...BASE, mission_id: '' });
  const s = renderExecutionWindow(r);
  assert('render blocked shows BLOCKED', s.includes('WINDOW_BLOCKED_INPUT'));
}
{
  const s = renderExecutionWindow(null);
  assert('render null graceful', typeof s === 'string');
}

// --- EXECUTION_WINDOW_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(EXECUTION_WINDOW_STATUSES));
  assert('length=5', EXECUTION_WINDOW_STATUSES.length === 5);
  for (const s of [
    'WINDOW_BLOCKED_INPUT', 'WINDOW_OFFPEAK_RECOMMENDED',
    'WINDOW_PEAK_ALLOWED', 'WINDOW_PEAK_DELAY_RECOMMENDED', 'WINDOW_PEAK_BLOCKED',
  ]) {
    assert(`${s} present`, EXECUTION_WINDOW_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
