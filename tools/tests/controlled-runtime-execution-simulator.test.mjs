#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Execution Simulator V158.0
 */

import {
  buildControlledRuntimeExecutionSimulator,
  validateControlledRuntimeExecutionSimulator,
  renderControlledRuntimeExecutionSimulator,
  SIMULATION_STATUSES,
  SIMULATION_STEPS,
} from '../controlled-runtime-execution-simulator.mjs';

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

const FAKE_HASH = 'a'.repeat(64);

const ALL_PASS = {
  simulator_id:                     'v158.0-sim',
  anti_hallucination_runtime_ready: true,
  truth_score:                      95,
  pass_gold_confirmed:              true,
  pass_gold_score:                  98,
  rollback_plan_bound:              true,
  rollback_steps_count:             3,
  snapshot_captured:                true,
  git_head_sha:                     'abc123def456',
  dry_run_completed:                true,
  dry_run_passed:                   true,
  command_sealed:                   true,
  command_hash:                     FAKE_HASH,
  diff_guard_passed:                true,
  forbidden_files_count:            0,
  simulated_at:                     '2026-05-21T12:00:00.000Z',
};

console.log('\n=== controlled-runtime-execution-simulator tests ===\n');

// --- exports ---
console.log('--- exports ---');
{
  assert('SIMULATION_STATUSES is array', Array.isArray(SIMULATION_STATUSES));
  assert('SIMULATION_STATUSES length=4', SIMULATION_STATUSES.length === 4);
  assert('SIMULATION_STATUSES has BLOCKED_INPUT', SIMULATION_STATUSES.includes('SIMULATION_BLOCKED_INPUT'));
  assert('SIMULATION_STATUSES has PRECONDITION', SIMULATION_STATUSES.includes('SIMULATION_PRECONDITION'));
  assert('SIMULATION_STATUSES has READY', SIMULATION_STATUSES.includes('SIMULATION_READY'));
  assert('SIMULATION_STATUSES has FAILED_DRY_RUN', SIMULATION_STATUSES.includes('SIMULATION_FAILED_DRY_RUN'));

  assert('SIMULATION_STEPS is array', Array.isArray(SIMULATION_STEPS));
  assert('SIMULATION_STEPS length=7', SIMULATION_STEPS.length === 7);
  assert('SIMULATION_STEPS has truth_check', SIMULATION_STEPS.includes('truth_check'));
  assert('SIMULATION_STEPS has pass_gold_check', SIMULATION_STEPS.includes('pass_gold_check'));
  assert('SIMULATION_STEPS has rollback_check', SIMULATION_STEPS.includes('rollback_check'));
  assert('SIMULATION_STEPS has snapshot_check', SIMULATION_STEPS.includes('snapshot_check'));
  assert('SIMULATION_STEPS has dry_run_check', SIMULATION_STEPS.includes('dry_run_check'));
  assert('SIMULATION_STEPS has command_seal_check', SIMULATION_STEPS.includes('command_seal_check'));
  assert('SIMULATION_STEPS has diff_guard_check', SIMULATION_STEPS.includes('diff_guard_check'));

  assert('build is function', typeof buildControlledRuntimeExecutionSimulator === 'function');
  assert('validate is function', typeof validateControlledRuntimeExecutionSimulator === 'function');
  assert('render is function', typeof renderControlledRuntimeExecutionSimulator === 'function');
}

// --- SIMULATION_BLOCKED_INPUT ---
console.log('--- SIMULATION_BLOCKED_INPUT ---');
{
  const r = buildControlledRuntimeExecutionSimulator(null);
  assert('null → BLOCKED_INPUT', r.simulation_status === 'SIMULATION_BLOCKED_INPUT');
  assert('blocked: schema_version=v158.0', r.schema_version === 'v158.0');
  assert('blocked: simulator_id=null', r.simulator_id === null);
  assert('blocked: steps_passed=0', r.steps_passed === 0);
  assert('blocked: steps_total=7', r.steps_total === 7);
  assert('blocked: simulation_complete=false', r.simulation_complete === false);
  assert('blocked: command_executed=false', r.command_executed === false);
  assert('blocked: no_real_execution=true', r.no_real_execution === true);
  assert('blocked: execution_performed=false', r.execution_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: release_performed=false', r.release_performed === false);
  assert('blocked: blocked_reason present', typeof r.blocked_reason === 'string' && r.blocked_reason.length > 0);
  assert('blocked: simulator_id_hash is sha256', /^[a-f0-9]{64}$/.test(r.simulator_id_hash));
}
{
  const r = buildControlledRuntimeExecutionSimulator({});
  assert('empty obj → BLOCKED_INPUT', r.simulation_status === 'SIMULATION_BLOCKED_INPUT');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ simulator_id: '   ' });
  assert('whitespace id → BLOCKED_INPUT', r.simulation_status === 'SIMULATION_BLOCKED_INPUT');
}

// --- SIMULATION_READY ---
console.log('--- SIMULATION_READY ---');
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS });
  assert('all pass → SIMULATION_READY', r.simulation_status === 'SIMULATION_READY');
  assert('ready: schema_version=v158.0', r.schema_version === 'v158.0');
  assert('ready: simulator_id propagated', r.simulator_id === 'v158.0-sim');
  assert('ready: simulator_id_hash is sha256', r.simulator_id_hash === sha256('v158.0-sim'));
  assert('ready: steps_passed=7', r.steps_passed === 7);
  assert('ready: steps_total=7', r.steps_total === 7);
  assert('ready: failed_steps=[]', Array.isArray(r.failed_steps) && r.failed_steps.length === 0);
  assert('ready: step_results length=7', Array.isArray(r.step_results) && r.step_results.length === 7);
  assert('ready: simulation_complete=true', r.simulation_complete === true);
  assert('ready: simulated_at propagated', r.simulated_at === '2026-05-21T12:00:00.000Z');
  assert('ready: command_executed=false', r.command_executed === false);
  assert('ready: no_real_execution=true', r.no_real_execution === true);
  assert('ready: execution_performed=false', r.execution_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- step_results detail ---
console.log('--- step_results detail ---');
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS });
  const steps = r.step_results;
  assert('truth_check PASS', steps.find(s => s.step === 'truth_check')?.passed === true);
  assert('pass_gold_check PASS', steps.find(s => s.step === 'pass_gold_check')?.passed === true);
  assert('rollback_check PASS', steps.find(s => s.step === 'rollback_check')?.passed === true);
  assert('snapshot_check PASS', steps.find(s => s.step === 'snapshot_check')?.passed === true);
  assert('dry_run_check PASS', steps.find(s => s.step === 'dry_run_check')?.passed === true);
  assert('command_seal_check PASS', steps.find(s => s.step === 'command_seal_check')?.passed === true);
  assert('diff_guard_check PASS', steps.find(s => s.step === 'diff_guard_check')?.passed === true);
}

// --- SIMULATION_PRECONDITION: truth_check fail ---
console.log('--- SIMULATION_PRECONDITION ---');
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, anti_hallucination_runtime_ready: false });
  assert('truth fail → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('truth fail: steps_passed=6', r.steps_passed === 6);
  assert('truth fail: failed_steps includes truth_check', r.failed_steps.includes('truth_check'));
  assert('truth fail: simulation_complete=false', r.simulation_complete === false);
  assert('truth fail: command_executed=false', r.command_executed === false);
  assert('truth fail: no_real_execution=true', r.no_real_execution === true);
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, truth_score: 79 });
  assert('truth_score<80 → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('truth_score<80: failed truth_check', r.failed_steps.includes('truth_check'));
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, truth_score: 80 });
  assert('truth_score=80 → READY', r.simulation_status === 'SIMULATION_READY');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, pass_gold_confirmed: false });
  assert('pass_gold fail → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('pass_gold fail: failed pass_gold_check', r.failed_steps.includes('pass_gold_check'));
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, pass_gold_score: 79 });
  assert('pass_gold_score<80 → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, rollback_plan_bound: false });
  assert('rollback fail → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('rollback fail: failed rollback_check', r.failed_steps.includes('rollback_check'));
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, rollback_steps_count: 0 });
  assert('rollback_steps=0 → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, snapshot_captured: false });
  assert('snapshot fail → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('snapshot fail: failed snapshot_check', r.failed_steps.includes('snapshot_check'));
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, git_head_sha: '' });
  assert('empty git_head_sha → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, git_head_sha: null });
  assert('null git_head_sha → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, command_sealed: false });
  assert('seal fail → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('seal fail: failed command_seal_check', r.failed_steps.includes('command_seal_check'));
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, command_hash: 'short' });
  assert('bad command_hash → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, command_hash: 'Z'.repeat(64) });
  assert('uppercase command_hash → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, diff_guard_passed: false });
  assert('diff_guard fail → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('diff_guard fail: failed diff_guard_check', r.failed_steps.includes('diff_guard_check'));
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, forbidden_files_count: 1 });
  assert('forbidden_files_count=1 → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
}

// --- SIMULATION_FAILED_DRY_RUN ---
console.log('--- SIMULATION_FAILED_DRY_RUN ---');
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, dry_run_completed: false });
  assert('dry_run_completed=false → FAILED_DRY_RUN', r.simulation_status === 'SIMULATION_FAILED_DRY_RUN');
  assert('dry_run fail: failed dry_run_check', r.failed_steps.includes('dry_run_check'));
  assert('dry_run fail: simulation_complete=false', r.simulation_complete === false);
  assert('dry_run fail: command_executed=false', r.command_executed === false);
  assert('dry_run fail: no_real_execution=true', r.no_real_execution === true);
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, dry_run_passed: false });
  assert('dry_run_passed=false → FAILED_DRY_RUN', r.simulation_status === 'SIMULATION_FAILED_DRY_RUN');
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, dry_run_completed: false, dry_run_passed: false });
  assert('both dry_run fields false → FAILED_DRY_RUN', r.simulation_status === 'SIMULATION_FAILED_DRY_RUN');
}

// --- dry_run fail + other fail → PRECONDITION (not FAILED_DRY_RUN) ---
console.log('--- dry_run + other fail = PRECONDITION ---');
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, dry_run_passed: false, truth_score: 50 });
  assert('dry_run+truth fail → PRECONDITION', r.simulation_status === 'SIMULATION_PRECONDITION');
  assert('failed_steps includes dry_run_check', r.failed_steps.includes('dry_run_check'));
  assert('failed_steps includes truth_check', r.failed_steps.includes('truth_check'));
}

// --- optional numeric fields absent → pass ---
console.log('--- optional numeric fields absent ---');
{
  const { truth_score, pass_gold_score, rollback_steps_count, forbidden_files_count, ...rest } = ALL_PASS;
  const r = buildControlledRuntimeExecutionSimulator(rest);
  assert('no numeric optionals → SIMULATION_READY', r.simulation_status === 'SIMULATION_READY');
}

// --- simulated_at default ---
console.log('--- simulated_at default ---');
{
  const { simulated_at, ...rest } = ALL_PASS;
  const r = buildControlledRuntimeExecutionSimulator(rest);
  assert('simulated_at default set', typeof r.simulated_at === 'string' && r.simulated_at.length > 0);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS });
  const r2 = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS });
  assert('same id → same hash', r1.simulator_id_hash === r2.simulator_id_hash);
  assert('hash matches sha256(id)', r1.simulator_id_hash === sha256('v158.0-sim'));
}

// --- REGRA ABSOLUTA: invariants always false/true ---
console.log('--- REGRA ABSOLUTA ---');
const REGRA_CASES = [
  buildControlledRuntimeExecutionSimulator(null),
  buildControlledRuntimeExecutionSimulator({}),
  buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }),
  buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, dry_run_passed: false }),
  buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, truth_score: 10 }),
  buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, command_sealed: false }),
  buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, diff_guard_passed: false }),
];
for (const r of REGRA_CASES) {
  assert(`[${r.simulation_status}] command_executed=false`, r.command_executed === false);
  assert(`[${r.simulation_status}] no_real_execution=true`, r.no_real_execution === true);
  assert(`[${r.simulation_status}] execution_performed=false`, r.execution_performed === false);
  assert(`[${r.simulation_status}] stable_promoted=false`, r.stable_promoted === false);
  assert(`[${r.simulation_status}] deploy_performed=false`, r.deploy_performed === false);
  assert(`[${r.simulation_status}] release_performed=false`, r.release_performed === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS });
  const v = validateControlledRuntimeExecutionSimulator(r);
  assert('READY validates ok', v.valid === true);
  assert('READY no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeExecutionSimulator(null);
  const v = validateControlledRuntimeExecutionSimulator(r);
  assert('BLOCKED validates ok', v.valid === true);
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, dry_run_passed: false });
  const v = validateControlledRuntimeExecutionSimulator(r);
  assert('FAILED_DRY_RUN validates ok', v.valid === true);
}
{
  const v = validateControlledRuntimeExecutionSimulator(null);
  assert('null → invalid', v.valid === false);
  assert('null → errors', v.errors.length > 0);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), command_executed: true };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('tampered command_executed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), no_real_execution: false };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('tampered no_real_execution → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), execution_performed: true };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('tampered execution_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), stable_promoted: true };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('tampered stable_promoted → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), deploy_performed: true };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('tampered deploy_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), release_performed: true };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('tampered release_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), simulation_status: 'INVALID_STATUS' };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('invalid simulation_status → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), simulation_complete: false };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('READY+complete=false → invalid', v.valid === false);
}
{
  const base = buildControlledRuntimeExecutionSimulator(null);
  const tampered = { ...base, simulation_complete: true };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('BLOCKED+complete=true → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionSimulator({ ...ALL_PASS }), steps_total: 5 };
  const v = validateControlledRuntimeExecutionSimulator(tampered);
  assert('steps_total≠7 → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS });
  const s = renderControlledRuntimeExecutionSimulator(r);
  assert('render returns string', typeof s === 'string');
  assert('render contains v158.0', s.includes('v158.0'));
  assert('render contains SIMULATION_READY', s.includes('SIMULATION_READY'));
  assert('render contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render contains command_executed=false', s.includes('command_executed=false'));
  assert('render contains no_real_execution=true', s.includes('no_real_execution=true'));
  assert('render contains steps passed', s.includes('7 / 7'));
  assert('render shows step results', s.includes('PASS'));
}
{
  const r = buildControlledRuntimeExecutionSimulator(null);
  const s = renderControlledRuntimeExecutionSimulator(r);
  assert('render BLOCKED_INPUT string', typeof s === 'string');
  assert('render BLOCKED_INPUT contains blocked reason', s.includes('SIMULATION_BLOCKED_INPUT'));
}
{
  const r = buildControlledRuntimeExecutionSimulator({ ...ALL_PASS, diff_guard_passed: false });
  const s = renderControlledRuntimeExecutionSimulator(r);
  assert('render PRECONDITION contains Failed steps', s.includes('diff_guard_check'));
}
{
  const s = renderControlledRuntimeExecutionSimulator(null);
  assert('render null returns string', typeof s === 'string');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
