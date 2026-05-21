#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Execution Baseline V160.0
 */

import {
  buildControlledRuntimeExecutionBaseline,
  validateControlledRuntimeExecutionBaseline,
  renderControlledRuntimeExecutionBaseline,
  CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES,
  CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES,
} from '../controlled-runtime-execution-baseline.mjs';

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
  baseline_id:                                  'v160.0-baseline',
  human_execution_command_contract_ready:        true,
  human_command_phrase_verifier_ready:           true,
  controlled_runtime_execution_dry_run_ready:    true,
  controlled_runtime_execution_plan_ready:       true,
  rollback_plan_binding_gate_ready:              true,
  pre_execution_snapshot_contract_ready:         true,
  real_execution_proof_receipt_ready:            true,
  controlled_runtime_evidence_package_ready:     true,
  controlled_runtime_execution_ledger_ready:     true,
  controlled_runtime_execution_report_ready:     true,
  human_execution_approval_ledger_ready:         true,
  human_approval_expiration_gate_ready:          true,
  controlled_execution_command_sealer_ready:     true,
  controlled_execution_command_diff_guard_ready: true,
  controlled_runtime_execution_simulator_ready:  true,
  controlled_runtime_execution_drill_report_ready: true,
  real_execution_final_readiness_gate_ready:     true,
  real_execution_final_readiness_report_ready:   true,
  baselined_at:                                  '2026-05-21T12:00:00.000Z',
};

console.log('\n=== controlled-runtime-execution-baseline tests ===\n');

// --- exports ---
console.log('--- exports ---');
{
  assert('STATUSES is array', Array.isArray(CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES));
  assert('STATUSES length=3', CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES.length === 3);
  assert('has BLOCKED', CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES.includes('CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED'));
  assert('has PARTIAL', CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES.includes('CONTROLLED_RUNTIME_EXECUTION_BASELINE_PARTIAL'));
  assert('has READY', CONTROLLED_RUNTIME_EXECUTION_BASELINE_STATUSES.includes('CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY'));

  assert('MODULES is array', Array.isArray(CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES));
  assert('MODULES length=19', CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.length === 19);
  assert('MODULES includes human-execution-command-contract', CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.includes('human-execution-command-contract'));
  assert('MODULES includes controlled-runtime-execution-baseline', CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES.includes('controlled-runtime-execution-baseline'));
  assert('MODULES last is baseline itself', CONTROLLED_RUNTIME_EXECUTION_BASELINE_MODULES[18] === 'controlled-runtime-execution-baseline');

  assert('build is function', typeof buildControlledRuntimeExecutionBaseline === 'function');
  assert('validate is function', typeof validateControlledRuntimeExecutionBaseline === 'function');
  assert('render is function', typeof renderControlledRuntimeExecutionBaseline === 'function');
}

// --- BLOCKED ---
console.log('--- CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED ---');
{
  const r = buildControlledRuntimeExecutionBaseline(null);
  assert('null → BLOCKED', r.controlled_runtime_execution_baseline_status === 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED');
  assert('blocked: schema_version=v160.0', r.schema_version === 'v160.0');
  assert('blocked: baseline_id=null', r.baseline_id === null);
  assert('blocked: controlled_runtime_execution_baseline_ready=false', r.controlled_runtime_execution_baseline_ready === false);
  assert('blocked: verified_module_count=0', r.verified_module_count === 0);
  assert('blocked: blocked_reason present', typeof r.blocked_reason === 'string' && r.blocked_reason.length > 0);
  assert('blocked: baseline_id_hash is sha256', /^[a-f0-9]{64}$/.test(r.baseline_id_hash));
  assert('blocked: human_command_required=true', r.human_command_required === true);
  assert('blocked: no_real_execution_performed=true', r.no_real_execution_performed === true);
  assert('blocked: command_executed=false', r.command_executed === false);
  assert('blocked: execution_performed=false', r.execution_performed === false);
  assert('blocked: stable_promoted=false', r.stable_promoted === false);
  assert('blocked: deploy_performed=false', r.deploy_performed === false);
  assert('blocked: release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledRuntimeExecutionBaseline({});
  assert('empty obj → BLOCKED', r.controlled_runtime_execution_baseline_status === 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED');
}
{
  const r = buildControlledRuntimeExecutionBaseline({ baseline_id: '  ' });
  assert('whitespace baseline_id → BLOCKED', r.controlled_runtime_execution_baseline_status === 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED');
}

// --- READY ---
console.log('--- CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY ---');
{
  const r = buildControlledRuntimeExecutionBaseline({ ...ALL_READY });
  assert('all ready → BASELINE_READY', r.controlled_runtime_execution_baseline_status === 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY');
  assert('ready: schema_version=v160.0', r.schema_version === 'v160.0');
  assert('ready: baseline_id propagated', r.baseline_id === 'v160.0-baseline');
  assert('ready: baseline_id_hash correct', r.baseline_id_hash === sha256('v160.0-baseline'));
  assert('ready: verified_module_count=18', r.verified_module_count === 18);
  assert('ready: verified_modules length=18', Array.isArray(r.verified_modules) && r.verified_modules.length === 18);
  assert('ready: controlled_runtime_execution_baseline_ready=true', r.controlled_runtime_execution_baseline_ready === true);
  assert('ready: baselined_at propagated', r.baselined_at === '2026-05-21T12:00:00.000Z');
  assert('ready: human_command_required=true', r.human_command_required === true);
  assert('ready: no_real_execution_performed=true', r.no_real_execution_performed === true);
  assert('ready: command_executed=false', r.command_executed === false);
  assert('ready: execution_performed=false', r.execution_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- all 18 module flags pass ---
console.log('--- all 18 module flags ---');
{
  const r = buildControlledRuntimeExecutionBaseline({ ...ALL_READY });
  assert('human_execution_command_contract_ready=true', r.human_execution_command_contract_ready === true);
  assert('human_command_phrase_verifier_ready=true', r.human_command_phrase_verifier_ready === true);
  assert('controlled_runtime_execution_dry_run_ready=true', r.controlled_runtime_execution_dry_run_ready === true);
  assert('controlled_runtime_execution_plan_ready=true', r.controlled_runtime_execution_plan_ready === true);
  assert('rollback_plan_binding_gate_ready=true', r.rollback_plan_binding_gate_ready === true);
  assert('pre_execution_snapshot_contract_ready=true', r.pre_execution_snapshot_contract_ready === true);
  assert('real_execution_proof_receipt_ready=true', r.real_execution_proof_receipt_ready === true);
  assert('controlled_runtime_evidence_package_ready=true', r.controlled_runtime_evidence_package_ready === true);
  assert('controlled_runtime_execution_ledger_ready=true', r.controlled_runtime_execution_ledger_ready === true);
  assert('controlled_runtime_execution_report_ready=true', r.controlled_runtime_execution_report_ready === true);
  assert('human_execution_approval_ledger_ready=true', r.human_execution_approval_ledger_ready === true);
  assert('human_approval_expiration_gate_ready=true', r.human_approval_expiration_gate_ready === true);
  assert('controlled_execution_command_sealer_ready=true', r.controlled_execution_command_sealer_ready === true);
  assert('controlled_execution_command_diff_guard_ready=true', r.controlled_execution_command_diff_guard_ready === true);
  assert('controlled_runtime_execution_simulator_ready=true', r.controlled_runtime_execution_simulator_ready === true);
  assert('controlled_runtime_execution_drill_report_ready=true', r.controlled_runtime_execution_drill_report_ready === true);
  assert('real_execution_final_readiness_gate_ready=true', r.real_execution_final_readiness_gate_ready === true);
  assert('real_execution_final_readiness_report_ready=true', r.real_execution_final_readiness_report_ready === true);
}

// --- PARTIAL: each module fails individually ---
console.log('--- PARTIAL per module ---');
const MODULE_FLAGS = [
  'human_execution_command_contract_ready',
  'human_command_phrase_verifier_ready',
  'controlled_runtime_execution_dry_run_ready',
  'controlled_runtime_execution_plan_ready',
  'rollback_plan_binding_gate_ready',
  'pre_execution_snapshot_contract_ready',
  'real_execution_proof_receipt_ready',
  'controlled_runtime_evidence_package_ready',
  'controlled_runtime_execution_ledger_ready',
  'controlled_runtime_execution_report_ready',
  'human_execution_approval_ledger_ready',
  'human_approval_expiration_gate_ready',
  'controlled_execution_command_sealer_ready',
  'controlled_execution_command_diff_guard_ready',
  'controlled_runtime_execution_simulator_ready',
  'controlled_runtime_execution_drill_report_ready',
  'real_execution_final_readiness_gate_ready',
  'real_execution_final_readiness_report_ready',
];
for (const flag of MODULE_FLAGS) {
  const r = buildControlledRuntimeExecutionBaseline({ ...ALL_READY, [flag]: false });
  assert(`${flag}=false → PARTIAL`, r.controlled_runtime_execution_baseline_status === 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_PARTIAL');
  assert(`${flag}=false → baseline_ready=false`, r.controlled_runtime_execution_baseline_ready === false);
  assert(`${flag}=false: verified_module_count=17`, r.verified_module_count === 17);
}

// --- PARTIAL: no modules ready ---
console.log('--- PARTIAL: all modules false ---');
{
  const r = buildControlledRuntimeExecutionBaseline({ baseline_id: 'partial-test' });
  assert('no modules → PARTIAL', r.controlled_runtime_execution_baseline_status === 'CONTROLLED_RUNTIME_EXECUTION_BASELINE_PARTIAL');
  assert('no modules → verified_module_count=0', r.verified_module_count === 0);
  assert('no modules → baseline_ready=false', r.controlled_runtime_execution_baseline_ready === false);
}

// --- baselined_at default ---
console.log('--- baselined_at default ---');
{
  const { baselined_at, ...rest } = ALL_READY;
  const r = buildControlledRuntimeExecutionBaseline(rest);
  assert('baselined_at default set', typeof r.baselined_at === 'string' && r.baselined_at.length > 0);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledRuntimeExecutionBaseline({ ...ALL_READY });
  const r2 = buildControlledRuntimeExecutionBaseline({ ...ALL_READY });
  assert('same id → same hash', r1.baseline_id_hash === r2.baseline_id_hash);
  assert('hash matches sha256(id)', r1.baseline_id_hash === sha256('v160.0-baseline'));
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
const REGRA_CASES = [
  buildControlledRuntimeExecutionBaseline(null),
  buildControlledRuntimeExecutionBaseline({}),
  buildControlledRuntimeExecutionBaseline({ ...ALL_READY }),
  buildControlledRuntimeExecutionBaseline({ baseline_id: 'x', human_execution_command_contract_ready: false }),
  buildControlledRuntimeExecutionBaseline({ baseline_id: 'y' }),
];
for (const r of REGRA_CASES) {
  assert(`[${r.controlled_runtime_execution_baseline_status}] human_command_required=true`, r.human_command_required === true);
  assert(`[${r.controlled_runtime_execution_baseline_status}] no_real_execution_performed=true`, r.no_real_execution_performed === true);
  assert(`[${r.controlled_runtime_execution_baseline_status}] command_executed=false`, r.command_executed === false);
  assert(`[${r.controlled_runtime_execution_baseline_status}] execution_performed=false`, r.execution_performed === false);
  assert(`[${r.controlled_runtime_execution_baseline_status}] stable_promoted=false`, r.stable_promoted === false);
  assert(`[${r.controlled_runtime_execution_baseline_status}] deploy_performed=false`, r.deploy_performed === false);
  assert(`[${r.controlled_runtime_execution_baseline_status}] release_performed=false`, r.release_performed === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeExecutionBaseline({ ...ALL_READY });
  const v = validateControlledRuntimeExecutionBaseline(r);
  assert('READY validates ok', v.valid === true);
  assert('READY no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeExecutionBaseline(null);
  const v = validateControlledRuntimeExecutionBaseline(r);
  assert('BLOCKED validates ok', v.valid === true);
}
{
  const r = buildControlledRuntimeExecutionBaseline({ baseline_id: 'x' });
  const v = validateControlledRuntimeExecutionBaseline(r);
  assert('PARTIAL validates ok', v.valid === true);
}
{
  const v = validateControlledRuntimeExecutionBaseline(null);
  assert('null → invalid', v.valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), human_command_required: false };
  assert('tampered human_command_required → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), no_real_execution_performed: false };
  assert('tampered no_real_execution → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), command_executed: true };
  assert('tampered command_executed → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), execution_performed: true };
  assert('tampered execution_performed → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), stable_promoted: true };
  assert('tampered stable_promoted → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), deploy_performed: true };
  assert('tampered deploy_performed → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), release_performed: true };
  assert('tampered release_performed → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), controlled_runtime_execution_baseline_status: 'INVALID' };
  assert('invalid status → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const tampered = { ...buildControlledRuntimeExecutionBaseline({ ...ALL_READY }), controlled_runtime_execution_baseline_ready: false };
  assert('READY+baseline_ready=false → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}
{
  const base = buildControlledRuntimeExecutionBaseline(null);
  const tampered = { ...base, controlled_runtime_execution_baseline_ready: true };
  assert('BLOCKED+baseline_ready=true → invalid', validateControlledRuntimeExecutionBaseline(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeExecutionBaseline({ ...ALL_READY });
  const s = renderControlledRuntimeExecutionBaseline(r);
  assert('render returns string', typeof s === 'string');
  assert('render contains v160.0', s.includes('v160.0'));
  assert('render contains BASELINE_READY', s.includes('CONTROLLED_RUNTIME_EXECUTION_BASELINE_READY'));
  assert('render contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render contains PASS GOLD', s.includes('PASS GOLD'));
  assert('render contains human_command_required=true', s.includes('human_command_required=true'));
  assert('render contains no_real_execution_performed=true', s.includes('no_real_execution_performed=true'));
}
{
  const r = buildControlledRuntimeExecutionBaseline(null);
  const s = renderControlledRuntimeExecutionBaseline(r);
  assert('render BLOCKED string', typeof s === 'string');
  assert('render BLOCKED contains status', s.includes('CONTROLLED_RUNTIME_EXECUTION_BASELINE_BLOCKED'));
}
{
  const s = renderControlledRuntimeExecutionBaseline(null);
  assert('render null returns string', typeof s === 'string');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
