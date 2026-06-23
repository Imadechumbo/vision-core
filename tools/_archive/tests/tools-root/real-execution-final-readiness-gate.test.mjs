#!/usr/bin/env node
/**
 * Tests — Real Execution Final Readiness Gate V159.0
 */

import {
  buildRealExecutionFinalReadinessGate,
  validateRealExecutionFinalReadinessGate,
  renderRealExecutionFinalReadinessGate,
  FINAL_READINESS_STATUSES,
  FINAL_READINESS_PRECONDITIONS,
} from '../real-execution-final-readiness-gate.mjs';

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
  gate_id:                          'v159.0-gate',
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
  simulation_complete:              true,
  evaluated_at:                     '2026-05-21T12:00:00.000Z',
};

console.log('\n=== real-execution-final-readiness-gate tests ===\n');

// --- exports ---
console.log('--- exports ---');
{
  assert('FINAL_READINESS_STATUSES is array', Array.isArray(FINAL_READINESS_STATUSES));
  assert('FINAL_READINESS_STATUSES length=3', FINAL_READINESS_STATUSES.length === 3);
  assert('has FINAL_READINESS_BLOCKED', FINAL_READINESS_STATUSES.includes('FINAL_READINESS_BLOCKED'));
  assert('has FINAL_READINESS_PARTIAL', FINAL_READINESS_STATUSES.includes('FINAL_READINESS_PARTIAL'));
  assert('has FINAL_READINESS_READY_FOR_HUMAN_COMMAND', FINAL_READINESS_STATUSES.includes('FINAL_READINESS_READY_FOR_HUMAN_COMMAND'));

  assert('FINAL_READINESS_PRECONDITIONS is array', Array.isArray(FINAL_READINESS_PRECONDITIONS));
  assert('FINAL_READINESS_PRECONDITIONS length=15', FINAL_READINESS_PRECONDITIONS.length === 15);
  for (const name of [
    'anti_hallucination_runtime_ready', 'truth_score_sufficient', 'pass_gold_confirmed',
    'pass_gold_score_sufficient', 'rollback_plan_bound', 'rollback_steps_present',
    'snapshot_captured', 'git_head_sha_present', 'dry_run_completed', 'dry_run_passed',
    'command_sealed', 'command_hash_valid', 'diff_guard_passed', 'no_forbidden_files',
    'simulation_complete',
  ]) {
    assert(`preconditions has ${name}`, FINAL_READINESS_PRECONDITIONS.includes(name));
  }

  assert('build is function', typeof buildRealExecutionFinalReadinessGate === 'function');
  assert('validate is function', typeof validateRealExecutionFinalReadinessGate === 'function');
  assert('render is function', typeof renderRealExecutionFinalReadinessGate === 'function');
}

// --- FINAL_READINESS_BLOCKED ---
console.log('--- FINAL_READINESS_BLOCKED ---');
{
  const r = buildRealExecutionFinalReadinessGate(null);
  assert('null → BLOCKED', r.final_readiness_status === 'FINAL_READINESS_BLOCKED');
  assert('blocked: schema_version=v159.0', r.schema_version === 'v159.0');
  assert('blocked: gate_id=null', r.gate_id === null);
  assert('blocked: preconditions_passed=0', r.preconditions_passed === 0);
  assert('blocked: preconditions_total=15', r.preconditions_total === 15);
  assert('blocked: real_execution_ready=false', r.real_execution_ready === false);
  assert('blocked: execution_allowed=false', r.execution_allowed === false);
  assert('blocked: human_command_required=true', r.human_command_required === true);
  assert('blocked: command_executed=false', r.command_executed === false);
  assert('blocked: execution_performed=false', r.execution_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: release_performed=false', r.release_performed === false);
  assert('blocked: blocked_reason present', typeof r.blocked_reason === 'string' && r.blocked_reason.length > 0);
  assert('blocked: gate_id_hash is sha256', /^[a-f0-9]{64}$/.test(r.gate_id_hash));
}
{
  const r = buildRealExecutionFinalReadinessGate({});
  assert('empty obj → BLOCKED', r.final_readiness_status === 'FINAL_READINESS_BLOCKED');
}
{
  const r = buildRealExecutionFinalReadinessGate({ gate_id: '  ' });
  assert('whitespace gate_id → BLOCKED', r.final_readiness_status === 'FINAL_READINESS_BLOCKED');
}

// --- FINAL_READINESS_READY_FOR_HUMAN_COMMAND ---
console.log('--- FINAL_READINESS_READY_FOR_HUMAN_COMMAND ---');
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS });
  assert('all pass → READY_FOR_HUMAN_COMMAND', r.final_readiness_status === 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND');
  assert('ready: schema_version=v159.0', r.schema_version === 'v159.0');
  assert('ready: gate_id propagated', r.gate_id === 'v159.0-gate');
  assert('ready: gate_id_hash correct', r.gate_id_hash === sha256('v159.0-gate'));
  assert('ready: preconditions_passed=15', r.preconditions_passed === 15);
  assert('ready: preconditions_total=15', r.preconditions_total === 15);
  assert('ready: failed_preconditions=[]', Array.isArray(r.failed_preconditions) && r.failed_preconditions.length === 0);
  assert('ready: precondition_results length=15', Array.isArray(r.precondition_results) && r.precondition_results.length === 15);
  assert('ready: real_execution_ready=true', r.real_execution_ready === true);
  assert('ready: execution_allowed=false', r.execution_allowed === false);
  assert('ready: human_command_required=true', r.human_command_required === true);
  assert('ready: evaluated_at propagated', r.evaluated_at === '2026-05-21T12:00:00.000Z');
  assert('ready: command_executed=false', r.command_executed === false);
  assert('ready: execution_performed=false', r.execution_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- all 15 precondition results PASS ---
console.log('--- all 15 preconditions PASS ---');
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS });
  for (const name of FINAL_READINESS_PRECONDITIONS) {
    const p = r.precondition_results.find(x => x.name === name);
    assert(`${name} PASS`, p?.passed === true);
  }
}

// --- FINAL_READINESS_PARTIAL: each precondition failing individually ---
console.log('--- FINAL_READINESS_PARTIAL per precondition ---');
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, anti_hallucination_runtime_ready: false });
  assert('anti_hallucination fail → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('anti_hallucination in failed', r.failed_preconditions.includes('anti_hallucination_runtime_ready'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, truth_score: 79 });
  assert('truth_score<80 → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('truth_score_sufficient in failed', r.failed_preconditions.includes('truth_score_sufficient'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, truth_score: 80 });
  assert('truth_score=80 → READY', r.final_readiness_status === 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND');
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, pass_gold_confirmed: false });
  assert('pass_gold_confirmed=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('pass_gold_confirmed in failed', r.failed_preconditions.includes('pass_gold_confirmed'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, pass_gold_score: 79 });
  assert('pass_gold_score<80 → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('pass_gold_score_sufficient in failed', r.failed_preconditions.includes('pass_gold_score_sufficient'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, rollback_plan_bound: false });
  assert('rollback_plan_bound=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('rollback_plan_bound in failed', r.failed_preconditions.includes('rollback_plan_bound'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, rollback_steps_count: 0 });
  assert('rollback_steps=0 → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('rollback_steps_present in failed', r.failed_preconditions.includes('rollback_steps_present'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, snapshot_captured: false });
  assert('snapshot_captured=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('snapshot_captured in failed', r.failed_preconditions.includes('snapshot_captured'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, git_head_sha: '' });
  assert('empty git_head_sha → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('git_head_sha_present in failed', r.failed_preconditions.includes('git_head_sha_present'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, git_head_sha: null });
  assert('null git_head_sha → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, dry_run_completed: false });
  assert('dry_run_completed=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('dry_run_completed in failed', r.failed_preconditions.includes('dry_run_completed'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, dry_run_passed: false });
  assert('dry_run_passed=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('dry_run_passed in failed', r.failed_preconditions.includes('dry_run_passed'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, command_sealed: false });
  assert('command_sealed=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('command_sealed in failed', r.failed_preconditions.includes('command_sealed'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, command_hash: 'short' });
  assert('bad command_hash → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('command_hash_valid in failed', r.failed_preconditions.includes('command_hash_valid'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, command_hash: 'Z'.repeat(64) });
  assert('uppercase command_hash → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, diff_guard_passed: false });
  assert('diff_guard_passed=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('diff_guard_passed in failed', r.failed_preconditions.includes('diff_guard_passed'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, forbidden_files_count: 1 });
  assert('forbidden_files_count=1 → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('no_forbidden_files in failed', r.failed_preconditions.includes('no_forbidden_files'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, simulation_complete: false });
  assert('simulation_complete=false → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('simulation_complete in failed', r.failed_preconditions.includes('simulation_complete'));
}

// --- multiple failures ---
console.log('--- multiple failures ---');
{
  const r = buildRealExecutionFinalReadinessGate({
    gate_id:                          'multi-fail',
    anti_hallucination_runtime_ready: false,
    pass_gold_confirmed:              false,
    simulation_complete:              false,
  });
  assert('multi-fail → PARTIAL', r.final_readiness_status === 'FINAL_READINESS_PARTIAL');
  assert('failed includes anti_hallucination', r.failed_preconditions.includes('anti_hallucination_runtime_ready'));
  assert('failed includes pass_gold_confirmed', r.failed_preconditions.includes('pass_gold_confirmed'));
  assert('failed includes simulation_complete', r.failed_preconditions.includes('simulation_complete'));
}

// --- optional numeric fields absent → pass ---
console.log('--- optional numeric fields absent ---');
{
  const { truth_score, pass_gold_score, rollback_steps_count, forbidden_files_count, ...rest } = ALL_PASS;
  const r = buildRealExecutionFinalReadinessGate(rest);
  assert('no numeric optionals → READY', r.final_readiness_status === 'FINAL_READINESS_READY_FOR_HUMAN_COMMAND');
}

// --- evaluated_at default ---
console.log('--- evaluated_at default ---');
{
  const { evaluated_at, ...rest } = ALL_PASS;
  const r = buildRealExecutionFinalReadinessGate(rest);
  assert('evaluated_at default set', typeof r.evaluated_at === 'string' && r.evaluated_at.length > 0);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildRealExecutionFinalReadinessGate({ ...ALL_PASS });
  const r2 = buildRealExecutionFinalReadinessGate({ ...ALL_PASS });
  assert('same id → same hash', r1.gate_id_hash === r2.gate_id_hash);
  assert('hash matches sha256(id)', r1.gate_id_hash === sha256('v159.0-gate'));
}

// --- execution_allowed=false even when READY ---
console.log('--- execution_allowed=false even when READY ---');
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS });
  assert('READY: execution_allowed=false', r.execution_allowed === false);
  assert('READY: human_command_required=true', r.human_command_required === true);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
const REGRA_CASES = [
  buildRealExecutionFinalReadinessGate(null),
  buildRealExecutionFinalReadinessGate({}),
  buildRealExecutionFinalReadinessGate({ ...ALL_PASS }),
  buildRealExecutionFinalReadinessGate({ ...ALL_PASS, anti_hallucination_runtime_ready: false }),
  buildRealExecutionFinalReadinessGate({ ...ALL_PASS, simulation_complete: false }),
  buildRealExecutionFinalReadinessGate({ gate_id: 'x', pass_gold_confirmed: false }),
];
for (const r of REGRA_CASES) {
  assert(`[${r.final_readiness_status}] execution_allowed=false`, r.execution_allowed === false);
  assert(`[${r.final_readiness_status}] human_command_required=true`, r.human_command_required === true);
  assert(`[${r.final_readiness_status}] command_executed=false`, r.command_executed === false);
  assert(`[${r.final_readiness_status}] execution_performed=false`, r.execution_performed === false);
  assert(`[${r.final_readiness_status}] stable_promoted=false`, r.stable_promoted === false);
  assert(`[${r.final_readiness_status}] deploy_performed=false`, r.deploy_performed === false);
  assert(`[${r.final_readiness_status}] release_performed=false`, r.release_performed === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS });
  const v = validateRealExecutionFinalReadinessGate(r);
  assert('READY validates ok', v.valid === true);
  assert('READY no errors', v.errors.length === 0);
}
{
  const r = buildRealExecutionFinalReadinessGate(null);
  const v = validateRealExecutionFinalReadinessGate(r);
  assert('BLOCKED validates ok', v.valid === true);
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, simulation_complete: false });
  const v = validateRealExecutionFinalReadinessGate(r);
  assert('PARTIAL validates ok', v.valid === true);
}
{
  const v = validateRealExecutionFinalReadinessGate(null);
  assert('null → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), execution_allowed: true };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('tampered execution_allowed → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), human_command_required: false };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('tampered human_command_required → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), command_executed: true };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('tampered command_executed → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), execution_performed: true };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('tampered execution_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), stable_promoted: true };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('tampered stable_promoted → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), deploy_performed: true };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('tampered deploy_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), release_performed: true };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('tampered release_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), final_readiness_status: 'INVALID' };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('invalid status → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), real_execution_ready: false };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('READY+real_execution_ready=false → invalid', v.valid === false);
}
{
  const base = buildRealExecutionFinalReadinessGate(null);
  const tampered = { ...base, real_execution_ready: true };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('BLOCKED+real_execution_ready=true → invalid', v.valid === false);
}
{
  const tampered = { ...buildRealExecutionFinalReadinessGate({ ...ALL_PASS }), preconditions_total: 10 };
  const v = validateRealExecutionFinalReadinessGate(tampered);
  assert('preconditions_total≠15 → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS });
  const s = renderRealExecutionFinalReadinessGate(r);
  assert('render returns string', typeof s === 'string');
  assert('render contains v159.0', s.includes('v159.0'));
  assert('render contains READY_FOR_HUMAN_COMMAND', s.includes('FINAL_READINESS_READY_FOR_HUMAN_COMMAND'));
  assert('render contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render contains execution_allowed=false', s.includes('execution_allowed=false'));
  assert('render contains human_command_required=true', s.includes('human_command_required=true'));
  assert('render contains 15 / 15', s.includes('15 / 15'));
  assert('render shows PASS steps', s.includes('[PASS]'));
}
{
  const r = buildRealExecutionFinalReadinessGate(null);
  const s = renderRealExecutionFinalReadinessGate(r);
  assert('render BLOCKED string', typeof s === 'string');
  assert('render BLOCKED contains status', s.includes('FINAL_READINESS_BLOCKED'));
}
{
  const r = buildRealExecutionFinalReadinessGate({ ...ALL_PASS, simulation_complete: false });
  const s = renderRealExecutionFinalReadinessGate(r);
  assert('render PARTIAL contains failed', s.includes('simulation_complete'));
}
{
  const s = renderRealExecutionFinalReadinessGate(null);
  assert('render null returns string', typeof s === 'string');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
