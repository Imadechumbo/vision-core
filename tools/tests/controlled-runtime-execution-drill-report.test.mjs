#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Execution Drill Report V158.1
 */

import {
  buildControlledRuntimeExecutionDrillReport,
  validateControlledRuntimeExecutionDrillReport,
  renderControlledRuntimeExecutionDrillReport,
  DRILL_REPORT_STATUSES,
} from '../controlled-runtime-execution-drill-report.mjs';

import { createHash } from 'crypto';

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

function sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

const ALL_READY = {
  drill_report_id:     'v158.1-report',
  simulator_id:        'v158.0-simulator',
  simulation_status:   'SIMULATION_READY',
  simulation_complete: true,
  steps_passed:        7,
  steps_total:         7,
  failed_steps:        [],
  reported_at:         '2026-05-21T12:00:00.000Z',
};

console.log('\n=== controlled-runtime-execution-drill-report tests ===\n');

// --- exports ---
console.log('--- exports ---');
{
  assert('DRILL_REPORT_STATUSES is array', Array.isArray(DRILL_REPORT_STATUSES));
  assert('DRILL_REPORT_STATUSES length=3', DRILL_REPORT_STATUSES.length === 3);
  assert('has BLOCKED_INPUT', DRILL_REPORT_STATUSES.includes('DRILL_REPORT_BLOCKED_INPUT'));
  assert('has PRECONDITION', DRILL_REPORT_STATUSES.includes('DRILL_REPORT_PRECONDITION'));
  assert('has READY', DRILL_REPORT_STATUSES.includes('DRILL_REPORT_READY'));
  assert('build is function', typeof buildControlledRuntimeExecutionDrillReport === 'function');
  assert('validate is function', typeof validateControlledRuntimeExecutionDrillReport === 'function');
  assert('render is function', typeof renderControlledRuntimeExecutionDrillReport === 'function');
}

// --- DRILL_REPORT_BLOCKED_INPUT ---
console.log('--- DRILL_REPORT_BLOCKED_INPUT ---');
{
  const r = buildControlledRuntimeExecutionDrillReport(null);
  assert('null → BLOCKED_INPUT', r.drill_report_status === 'DRILL_REPORT_BLOCKED_INPUT');
  assert('blocked: schema_version=v158.1', r.schema_version === 'v158.1');
  assert('blocked: drill_report_id=null', r.drill_report_id === null);
  assert('blocked: drill_report_ready=false', r.drill_report_ready === false);
  assert('blocked: blocked_reason present', typeof r.blocked_reason === 'string' && r.blocked_reason.length > 0);
  assert('blocked: drill_report_id_hash is sha256', /^[a-f0-9]{64}$/.test(r.drill_report_id_hash));
  assert('blocked: no_real_execution_performed=true', r.no_real_execution_performed === true);
  assert('blocked: command_executed=false', r.command_executed === false);
  assert('blocked: execution_performed=false', r.execution_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledRuntimeExecutionDrillReport({});
  assert('empty obj → BLOCKED_INPUT', r.drill_report_status === 'DRILL_REPORT_BLOCKED_INPUT');
}
{
  const r = buildControlledRuntimeExecutionDrillReport({ drill_report_id: '   ' });
  assert('whitespace id → BLOCKED_INPUT', r.drill_report_status === 'DRILL_REPORT_BLOCKED_INPUT');
}

// --- DRILL_REPORT_READY ---
console.log('--- DRILL_REPORT_READY ---');
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY });
  assert('all ready → DRILL_REPORT_READY', r.drill_report_status === 'DRILL_REPORT_READY');
  assert('ready: schema_version=v158.1', r.schema_version === 'v158.1');
  assert('ready: drill_report_id propagated', r.drill_report_id === 'v158.1-report');
  assert('ready: drill_report_id_hash correct', r.drill_report_id_hash === sha256('v158.1-report'));
  assert('ready: simulator_id propagated', r.simulator_id === 'v158.0-simulator');
  assert('ready: simulation_status propagated', r.simulation_status === 'SIMULATION_READY');
  assert('ready: simulation_complete=true', r.simulation_complete === true);
  assert('ready: steps_passed=7', r.steps_passed === 7);
  assert('ready: steps_total=7', r.steps_total === 7);
  assert('ready: failed_steps=[]', Array.isArray(r.failed_steps) && r.failed_steps.length === 0);
  assert('ready: drill_report_ready=true', r.drill_report_ready === true);
  assert('ready: reported_at propagated', r.reported_at === '2026-05-21T12:00:00.000Z');
  assert('ready: no_real_execution_performed=true', r.no_real_execution_performed === true);
  assert('ready: command_executed=false', r.command_executed === false);
  assert('ready: execution_performed=false', r.execution_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- DRILL_REPORT_PRECONDITION ---
console.log('--- DRILL_REPORT_PRECONDITION ---');
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_status: 'SIMULATION_PRECONDITION' });
  assert('PRECONDITION sim → DRILL_PRECONDITION', r.drill_report_status === 'DRILL_REPORT_PRECONDITION');
  assert('precondition: drill_report_ready=false', r.drill_report_ready === false);
  assert('precondition: no_real_execution_performed=true', r.no_real_execution_performed === true);
}
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_status: 'SIMULATION_FAILED_DRY_RUN' });
  assert('FAILED_DRY_RUN sim → DRILL_PRECONDITION', r.drill_report_status === 'DRILL_REPORT_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_status: 'SIMULATION_BLOCKED_INPUT' });
  assert('BLOCKED sim → DRILL_PRECONDITION', r.drill_report_status === 'DRILL_REPORT_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_complete: false });
  assert('sim complete=false → DRILL_PRECONDITION', r.drill_report_status === 'DRILL_REPORT_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_status: 'SIMULATION_READY', simulation_complete: false });
  assert('READY but complete=false → PRECONDITION', r.drill_report_status === 'DRILL_REPORT_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionDrillReport({ drill_report_id: 'test', simulation_status: null, simulation_complete: null });
  assert('null sim fields → PRECONDITION', r.drill_report_status === 'DRILL_REPORT_PRECONDITION');
}

// --- failed_steps propagated ---
console.log('--- failed_steps propagated ---');
{
  const r = buildControlledRuntimeExecutionDrillReport({
    ...ALL_READY,
    simulation_status:   'SIMULATION_PRECONDITION',
    simulation_complete: false,
    failed_steps:        ['truth_check', 'snapshot_check'],
  });
  assert('failed_steps propagated', Array.isArray(r.failed_steps) && r.failed_steps.includes('truth_check'));
  assert('failed_steps count=2', r.failed_steps.length === 2);
}
{
  const { failed_steps, ...rest } = ALL_READY;
  const r = buildControlledRuntimeExecutionDrillReport(rest);
  assert('missing failed_steps → empty array', Array.isArray(r.failed_steps) && r.failed_steps.length === 0);
}

// --- optional fields absent ---
console.log('--- optional fields absent ---');
{
  const r = buildControlledRuntimeExecutionDrillReport({
    drill_report_id:     'min-report',
    simulation_status:   'SIMULATION_READY',
    simulation_complete: true,
  });
  assert('minimal fields → READY', r.drill_report_status === 'DRILL_REPORT_READY');
  assert('steps_passed=null', r.steps_passed === null);
  assert('steps_total=null', r.steps_total === null);
  assert('simulator_id=null', r.simulator_id === null);
}

// --- reported_at default ---
console.log('--- reported_at default ---');
{
  const { reported_at, ...rest } = ALL_READY;
  const r = buildControlledRuntimeExecutionDrillReport(rest);
  assert('reported_at default set', typeof r.reported_at === 'string' && r.reported_at.length > 0);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY });
  const r2 = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY });
  assert('same id → same hash', r1.drill_report_id_hash === r2.drill_report_id_hash);
  assert('hash matches sha256(id)', r1.drill_report_id_hash === sha256('v158.1-report'));
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
const REGRA_CASES = [
  buildControlledRuntimeExecutionDrillReport(null),
  buildControlledRuntimeExecutionDrillReport({}),
  buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }),
  buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_status: 'SIMULATION_PRECONDITION' }),
  buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_complete: false }),
];
for (const r of REGRA_CASES) {
  assert(`[${r.drill_report_status}] no_real_execution_performed=true`, r.no_real_execution_performed === true);
  assert(`[${r.drill_report_status}] command_executed=false`, r.command_executed === false);
  assert(`[${r.drill_report_status}] execution_performed=false`, r.execution_performed === false);
  assert(`[${r.drill_report_status}] stable_promoted=false`, r.stable_promoted === false);
  assert(`[${r.drill_report_status}] deploy_performed=false`, r.deploy_performed === false);
  assert(`[${r.drill_report_status}] release_performed=false`, r.release_performed === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY });
  const v = validateControlledRuntimeExecutionDrillReport(r);
  assert('READY validates ok', v.valid === true);
  assert('READY no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeExecutionDrillReport(null);
  const v = validateControlledRuntimeExecutionDrillReport(r);
  assert('BLOCKED validates ok', v.valid === true);
}
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY, simulation_status: 'SIMULATION_PRECONDITION', simulation_complete: false });
  const v = validateControlledRuntimeExecutionDrillReport(r);
  assert('PRECONDITION validates ok', v.valid === true);
}
{
  const v = validateControlledRuntimeExecutionDrillReport(null);
  assert('null → invalid', v.valid === false);
  assert('null → errors', v.errors.length > 0);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), no_real_execution_performed: false };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('tampered no_real_execution → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), command_executed: true };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('tampered command_executed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), execution_performed: true };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('tampered execution_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), stable_promoted: true };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('tampered stable_promoted → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), deploy_performed: true };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('tampered deploy_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), release_performed: true };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('tampered release_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), drill_report_status: 'INVALID_STATUS' };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('invalid drill_report_status → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionDrillReport({ ...ALL_READY }), drill_report_ready: false };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('READY+ready=false → invalid', v.valid === false);
}
{
  const base = buildControlledRuntimeExecutionDrillReport(null);
  const tampered = { ...base, drill_report_ready: true };
  const v = validateControlledRuntimeExecutionDrillReport(tampered);
  assert('BLOCKED+ready=true → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeExecutionDrillReport({ ...ALL_READY });
  const s = renderControlledRuntimeExecutionDrillReport(r);
  assert('render returns string', typeof s === 'string');
  assert('render contains v158.1', s.includes('v158.1'));
  assert('render contains DRILL_REPORT_READY', s.includes('DRILL_REPORT_READY'));
  assert('render contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render contains no_real_execution_performed=true', s.includes('no_real_execution_performed=true'));
  assert('render contains command_executed=false', s.includes('command_executed=false'));
  assert('render contains SIMULATION_READY', s.includes('SIMULATION_READY'));
}
{
  const r = buildControlledRuntimeExecutionDrillReport(null);
  const s = renderControlledRuntimeExecutionDrillReport(r);
  assert('render BLOCKED string', typeof s === 'string');
  assert('render BLOCKED contains blocked reason', s.includes('DRILL_REPORT_BLOCKED_INPUT'));
}
{
  const r = buildControlledRuntimeExecutionDrillReport({
    ...ALL_READY,
    simulation_status:   'SIMULATION_PRECONDITION',
    simulation_complete: false,
    failed_steps:        ['truth_check'],
  });
  const s = renderControlledRuntimeExecutionDrillReport(r);
  assert('render PRECONDITION contains failed steps', s.includes('truth_check'));
}
{
  const s = renderControlledRuntimeExecutionDrillReport(null);
  assert('render null returns string', typeof s === 'string');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
