#!/usr/bin/env node
/**
 * Tests — Real Execution Final Readiness Report V159.1
 */

import {
  buildRealExecutionFinalReadinessReport,
  validateRealExecutionFinalReadinessReport,
  renderRealExecutionFinalReadinessReport,
  FINAL_READINESS_REPORT_STATUSES,
} from '../real-execution-final-readiness-report.mjs';

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
  report_id:              'v159.1-report',
  gate_id:                'v159.0-gate',
  final_readiness_status: 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND',
  real_execution_ready:   true,
  preconditions_passed:   15,
  preconditions_total:    15,
  failed_preconditions:   [],
  reported_at:            '2026-05-21T12:00:00.000Z',
};

console.log('\n=== real-execution-final-readiness-report tests ===\n');

// --- exports ---
console.log('--- exports ---');
{
  assert('FINAL_READINESS_REPORT_STATUSES is array', Array.isArray(FINAL_READINESS_REPORT_STATUSES));
  assert('statuses length=3', FINAL_READINESS_REPORT_STATUSES.length === 3);
  assert('has BLOCKED_INPUT', FINAL_READINESS_REPORT_STATUSES.includes('FINAL_READINESS_REPORT_BLOCKED_INPUT'));
  assert('has PARTIAL', FINAL_READINESS_REPORT_STATUSES.includes('FINAL_READINESS_REPORT_PARTIAL'));
  assert('has READY', FINAL_READINESS_REPORT_STATUSES.includes('FINAL_READINESS_REPORT_READY'));
  assert('build is function', typeof buildRealExecutionFinalReadinessReport === 'function');
  assert('validate is function', typeof validateRealExecutionFinalReadinessReport === 'function');
  assert('render is function', typeof renderRealExecutionFinalReadinessReport === 'function');
}

// --- FINAL_READINESS_REPORT_BLOCKED_INPUT ---
console.log('--- FINAL_READINESS_REPORT_BLOCKED_INPUT ---');
{
  const r = buildRealExecutionFinalReadinessReport(null);
  assert('null → BLOCKED_INPUT', r.report_status === 'FINAL_READINESS_REPORT_BLOCKED_INPUT');
  assert('blocked: schema_version=v159.1', r.schema_version === 'v159.1');
  assert('blocked: report_id=null', r.report_id === null);
  assert('blocked: readiness_report_ready=false', r.readiness_report_ready === false);
  assert('blocked: blocked_reason present', typeof r.blocked_reason === 'string' && r.blocked_reason.length > 0);
  assert('blocked: report_id_hash is sha256', /^[a-f0-9]{64}$/.test(r.report_id_hash));
  assert('blocked: future_human_execution_command_required=true', r.future_human_execution_command_required === true);
  assert('blocked: next_phase_required=true', r.next_phase_required === true);
  assert('blocked: execution_allowed=false', r.execution_allowed === false);
  assert('blocked: command_executed=false', r.command_executed === false);
  assert('blocked: execution_performed=false', r.execution_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealExecutionFinalReadinessReport({});
  assert('empty obj → BLOCKED_INPUT', r.report_status === 'FINAL_READINESS_REPORT_BLOCKED_INPUT');
}
{
  const r = buildRealExecutionFinalReadinessReport({ report_id: '  ' });
  assert('whitespace report_id → BLOCKED_INPUT', r.report_status === 'FINAL_READINESS_REPORT_BLOCKED_INPUT');
}

// --- FINAL_READINESS_REPORT_READY ---
console.log('--- FINAL_READINESS_REPORT_READY ---');
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY });
  assert('all ready → REPORT_READY', r.report_status === 'FINAL_READINESS_REPORT_READY');
  assert('ready: schema_version=v159.1', r.schema_version === 'v159.1');
  assert('ready: report_id propagated', r.report_id === 'v159.1-report');
  assert('ready: report_id_hash correct', r.report_id_hash === sha256('v159.1-report'));
  assert('ready: gate_id propagated', r.gate_id === 'v159.0-gate');
  assert('ready: final_readiness_status propagated', r.final_readiness_status === 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND');
  assert('ready: real_execution_ready=true', r.real_execution_ready === true);
  assert('ready: preconditions_passed=15', r.preconditions_passed === 15);
  assert('ready: preconditions_total=15', r.preconditions_total === 15);
  assert('ready: failed_preconditions=[]', Array.isArray(r.failed_preconditions) && r.failed_preconditions.length === 0);
  assert('ready: readiness_report_ready=true', r.readiness_report_ready === true);
  assert('ready: reported_at propagated', r.reported_at === '2026-05-21T12:00:00.000Z');
  assert('ready: future_human_execution_command_required=true', r.future_human_execution_command_required === true);
  assert('ready: next_phase_required=true', r.next_phase_required === true);
  assert('ready: execution_allowed=false', r.execution_allowed === false);
  assert('ready: command_executed=false', r.command_executed === false);
  assert('ready: execution_performed=false', r.execution_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- FINAL_READINESS_REPORT_PARTIAL ---
console.log('--- FINAL_READINESS_REPORT_PARTIAL ---');
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY, final_readiness_status: 'FINAL_READINESS_PARTIAL' });
  assert('PARTIAL gate → REPORT_PARTIAL', r.report_status === 'FINAL_READINESS_REPORT_PARTIAL');
  assert('partial: readiness_report_ready=false', r.readiness_report_ready === false);
  assert('partial: future_human_execution_command_required=true', r.future_human_execution_command_required === true);
  assert('partial: next_phase_required=true', r.next_phase_required === true);
}
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY, real_execution_ready: false });
  assert('real_execution_ready=false → PARTIAL', r.report_status === 'FINAL_READINESS_REPORT_PARTIAL');
}
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY, final_readiness_status: 'FINAL_READINESS_BLOCKED' });
  assert('BLOCKED gate → REPORT_PARTIAL', r.report_status === 'FINAL_READINESS_REPORT_PARTIAL');
}
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY, final_readiness_status: 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND', real_execution_ready: false });
  assert('READY gate but real_execution_ready=false → PARTIAL', r.report_status === 'FINAL_READINESS_REPORT_PARTIAL');
}
{
  const r = buildRealExecutionFinalReadinessReport({ report_id: 'x', final_readiness_status: null });
  assert('null gate status → PARTIAL', r.report_status === 'FINAL_READINESS_REPORT_PARTIAL');
}

// --- failed_preconditions propagated ---
console.log('--- failed_preconditions propagated ---');
{
  const r = buildRealExecutionFinalReadinessReport({
    ...ALL_READY,
    final_readiness_status: 'FINAL_READINESS_PARTIAL',
    real_execution_ready:   false,
    failed_preconditions:   ['anti_hallucination_runtime_ready', 'simulation_complete'],
  });
  assert('failed_preconditions propagated', Array.isArray(r.failed_preconditions) && r.failed_preconditions.length === 2);
  assert('includes anti_hallucination', r.failed_preconditions.includes('anti_hallucination_runtime_ready'));
}
{
  const { failed_preconditions, ...rest } = ALL_READY;
  const r = buildRealExecutionFinalReadinessReport(rest);
  assert('missing failed_preconditions → empty array', Array.isArray(r.failed_preconditions) && r.failed_preconditions.length === 0);
}

// --- optional fields absent ---
console.log('--- optional fields absent ---');
{
  const r = buildRealExecutionFinalReadinessReport({
    report_id:              'min-report',
    final_readiness_status: 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND',
    real_execution_ready:   true,
  });
  assert('minimal → READY', r.report_status === 'FINAL_READINESS_REPORT_READY');
  assert('gate_id=null', r.gate_id === null);
  assert('preconditions_passed=null', r.preconditions_passed === null);
  assert('preconditions_total=null', r.preconditions_total === null);
}

// --- reported_at default ---
console.log('--- reported_at default ---');
{
  const { reported_at, ...rest } = ALL_READY;
  const r = buildRealExecutionFinalReadinessReport(rest);
  assert('reported_at default set', typeof r.reported_at === 'string' && r.reported_at.length > 0);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildRealExecutionFinalReadinessReport({ ...ALL_READY });
  const r2 = buildRealExecutionFinalReadinessReport({ ...ALL_READY });
  assert('same id → same hash', r1.report_id_hash === r2.report_id_hash);
  assert('hash matches sha256(id)', r1.report_id_hash === sha256('v159.1-report'));
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
const REGRA_CASES = [
  buildRealExecutionFinalReadinessReport(null),
  buildRealExecutionFinalReadinessReport({}),
  buildRealExecutionFinalReadinessReport({ ...ALL_READY }),
  buildRealExecutionFinalReadinessReport({ ...ALL_READY, final_readiness_status: 'FINAL_READINESS_PARTIAL' }),
  buildRealExecutionFinalReadinessReport({ ...ALL_READY, real_execution_ready: false }),
];
for (const r of REGRA_CASES) {
  assert(`[${r.report_status}] future_human_execution_command_required=true`, r.future_human_execution_command_required === true);
  assert(`[${r.report_status}] next_phase_required=true`, r.next_phase_required === true);
  assert(`[${r.report_status}] execution_allowed=false`, r.execution_allowed === false);
  assert(`[${r.report_status}] command_executed=false`, r.command_executed === false);
  assert(`[${r.report_status}] execution_performed=false`, r.execution_performed === false);
  assert(`[${r.report_status}] stable_promoted=false`, r.stable_promoted === false);
  assert(`[${r.report_status}] deploy_performed=false`, r.deploy_performed === false);
  assert(`[${r.report_status}] release_performed=false`, r.release_performed === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY });
  const v = validateRealExecutionFinalReadinessReport(r);
  assert('READY validates ok', v.valid === true);
  assert('READY no errors', v.errors.length === 0);
}
{
  const r = buildRealExecutionFinalReadinessReport(null);
  const v = validateRealExecutionFinalReadinessReport(r);
  assert('BLOCKED validates ok', v.valid === true);
}
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY, real_execution_ready: false });
  const v = validateRealExecutionFinalReadinessReport(r);
  assert('PARTIAL validates ok', v.valid === true);
}
{
  const v = validateRealExecutionFinalReadinessReport(null);
  assert('null → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), future_human_execution_command_required: false };
  assert('tampered future_human → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), next_phase_required: false };
  assert('tampered next_phase → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), execution_allowed: true };
  assert('tampered execution_allowed → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), command_executed: true };
  assert('tampered command_executed → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), execution_performed: true };
  assert('tampered execution_performed → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), stable_promoted: true };
  assert('tampered stable_promoted → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), deploy_performed: true };
  assert('tampered deploy_performed → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), release_performed: true };
  assert('tampered release_performed → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), report_status: 'INVALID' };
  assert('invalid report_status → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessReport({ ...ALL_READY }), readiness_report_ready: false };
  assert('READY+readiness_report_ready=false → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}
{
  const base = buildRealExecutionFinalReadinessReport(null);
  const tampered = { ...base, readiness_report_ready: true };
  assert('BLOCKED+readiness_report_ready=true → invalid', validateRealExecutionFinalReadinessReport(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealExecutionFinalReadinessReport({ ...ALL_READY });
  const s = renderRealExecutionFinalReadinessReport(r);
  assert('render returns string', typeof s === 'string');
  assert('render contains v159.1', s.includes('v159.1'));
  assert('render contains REPORT_READY', s.includes('FINAL_READINESS_REPORT_READY'));
  assert('render contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render contains future_human_execution_command_required=true', s.includes('future_human_execution_command_required=true'));
  assert('render contains next_phase_required=true', s.includes('next_phase_required=true'));
  assert('render contains execution_allowed=false', s.includes('execution_allowed=false'));
  assert('render contains READY_FOR_HUMAN_COMMAND', s.includes('READY_FOR_HUMAN_COMMAND'));
}
{
  const r = buildRealExecutionFinalReadinessReport(null);
  const s = renderRealExecutionFinalReadinessReport(r);
  assert('render BLOCKED string', typeof s === 'string');
  assert('render BLOCKED contains status', s.includes('FINAL_READINESS_REPORT_BLOCKED_INPUT'));
}
{
  const r = buildRealExecutionFinalReadinessReport({
    ...ALL_READY,
    final_readiness_status: 'FINAL_READINESS_PARTIAL',
    real_execution_ready:   false,
    failed_preconditions:   ['simulation_complete'],
  });
  const s = renderRealExecutionFinalReadinessReport(r);
  assert('render PARTIAL contains failed', s.includes('simulation_complete'));
}
{
  const s = renderRealExecutionFinalReadinessReport(null);
  assert('render null returns string', typeof s === 'string');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
