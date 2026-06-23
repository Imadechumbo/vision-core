#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Execution Dry-Run V152.0
 */

import {
  buildControlledRuntimeExecutionDryRun,
  validateControlledRuntimeExecutionDryRun,
  renderControlledRuntimeExecutionDryRun,
  CONTROLLED_DRY_RUN_STATUSES,
  CONTROLLED_DRY_RUN_COMMAND_TYPES,
} from '../controlled-runtime-execution-dry-run.mjs';

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

const FULL_READY = {
  dry_run_id:                       'v152.0-dry-run',
  command_type:                     'CONTROLLED_RUNTIME_EXECUTION',
  contract_id:                      'v151.0-contract',
  phrase_verified:                  true,
  anti_hallucination_runtime_ready: true,
  truth_gate_status:                'TRUSTED',
  truth_score:                      90,
  pass_gold_receipt_id:             'pg-receipt-001',
  pass_gold_verified:               true,
  rollback_plan_id:                 'rbp-001',
  rollback_plan_ready:              true,
  initiated_at:                     '2026-05-21T18:00:00.000Z',
};

console.log('\n=== controlled-runtime-execution-dry-run tests ===\n');

// --- blocked command ---
console.log('--- blocked command ---');
{
  const r = buildControlledRuntimeExecutionDryRun({});
  assert('no dry_run_id → BLOCKED_COMMAND', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND');
  assert('dry_run_ready=false', r.dry_run_ready === false);
  assert('command_executed=false', r.command_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledRuntimeExecutionDryRun(null);
  assert('null → BLOCKED_COMMAND', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND');
}
{
  const r = buildControlledRuntimeExecutionDryRun({ dry_run_id: 'd1', command_type: 'CONTROLLED_RUNTIME_EXECUTION' });
  assert('no contract_id → BLOCKED_COMMAND', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND');
}
{
  const r = buildControlledRuntimeExecutionDryRun({ dry_run_id: 'd1', command_type: 'UNKNOWN', contract_id: 'c1' });
  assert('unknown command_type → BLOCKED_COMMAND', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND');
}
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd1', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: false,
  });
  assert('phrase_verified=false → BLOCKED_COMMAND', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_COMMAND');
}

// --- blocked truth ---
console.log('--- blocked truth ---');
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd2', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: true,
  });
  assert('no truth → BLOCKED_TRUTH', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_TRUTH');
  assert('dry_run_ready=false', r.dry_run_ready === false);
}
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd2', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: true,
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'SUPERVISED',
    truth_score: 90,
  });
  assert('SUPERVISED → BLOCKED_TRUTH', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_TRUTH');
}
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd2', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: true,
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 79,
  });
  assert('score=79 → BLOCKED_TRUTH', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_TRUTH');
}

// --- blocked pass gold ---
console.log('--- blocked pass gold ---');
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd3', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: true,
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
  });
  assert('no pass_gold → BLOCKED_PASS_GOLD', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_PASS_GOLD');
}
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd3', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: true,
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: false,
  });
  assert('pass_gold_verified=false → BLOCKED_PASS_GOLD', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_PASS_GOLD');
}

// --- blocked rollback ---
console.log('--- blocked rollback ---');
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd4', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: true,
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: true,
  });
  assert('no rollback → BLOCKED_ROLLBACK', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_ROLLBACK');
}
{
  const r = buildControlledRuntimeExecutionDryRun({
    dry_run_id: 'd4', command_type: 'CONTROLLED_RUNTIME_EXECUTION', contract_id: 'c1',
    phrase_verified: true,
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: true,
    rollback_plan_id: 'rbp-001',
    rollback_plan_ready: false,
  });
  assert('rollback_ready=false → BLOCKED_ROLLBACK', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_BLOCKED_ROLLBACK');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  assert('all gates → CONTROLLED_DRY_RUN_READY', r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_READY');
  assert('dry_run_ready=true', r.dry_run_ready === true);
  assert('schema_version=v152.0', r.schema_version === 'v152.0');
  assert('dry_run_id propagated', r.dry_run_id === 'v152.0-dry-run');
  assert('command_type propagated', r.command_type === 'CONTROLLED_RUNTIME_EXECUTION');
  assert('contract_id propagated', r.contract_id === 'v151.0-contract');
  assert('pass_gold_receipt_id propagated', r.pass_gold_receipt_id === 'pg-receipt-001');
  assert('rollback_plan_id propagated', r.rollback_plan_id === 'rbp-001');
  assert('initiated_at propagated', r.initiated_at === '2026-05-21T18:00:00.000Z');
  assert('command_executed=false', r.command_executed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// all command types
console.log('--- all command types ---');
for (const ct of CONTROLLED_DRY_RUN_COMMAND_TYPES) {
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY, dry_run_id: `dr-${ct}`, command_type: ct });
  assert(`${ct} → READY`, r.controlled_dry_run_status === 'CONTROLLED_DRY_RUN_READY');
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  const r2 = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  assert('dry_run_id_hash deterministic', r1.dry_run_id_hash === r2.dry_run_id_hash);
  assert('dry_run_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.dry_run_id_hash));
}
{
  const r1 = buildControlledRuntimeExecutionDryRun({ ...FULL_READY, dry_run_id: 'a' });
  const r2 = buildControlledRuntimeExecutionDryRun({ ...FULL_READY, dry_run_id: 'b' });
  assert('different dry_run_id → different hash', r1.dry_run_id_hash !== r2.dry_run_id_hash);
}

// --- initiated_at default ---
{
  const r = buildControlledRuntimeExecutionDryRun({});
  assert('no initiated_at → auto ISO', typeof r.initiated_at === 'string' && r.initiated_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildControlledRuntimeExecutionDryRun({}),
    buildControlledRuntimeExecutionDryRun({ ...FULL_READY }),
    buildControlledRuntimeExecutionDryRun({ dry_run_id: 'dx', command_type: 'CONTROLLED_DEPLOY', contract_id: 'cx', phrase_verified: true }),
  ];
  for (const r of cases) {
    assert(`command_executed=false [${r.controlled_dry_run_status}]`, r.command_executed === false);
    assert(`execution_performed=false [${r.controlled_dry_run_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.controlled_dry_run_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.controlled_dry_run_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.controlled_dry_run_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  const v = validateControlledRuntimeExecutionDryRun(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeExecutionDryRun({});
  const v = validateControlledRuntimeExecutionDryRun(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledRuntimeExecutionDryRun(null).valid === false);
}
{
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  assert('command_executed tampered → invalid', validateControlledRuntimeExecutionDryRun({ ...r, command_executed: true }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  assert('execution_performed tampered → invalid', validateControlledRuntimeExecutionDryRun({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  assert('READY with pass_gold_verified=false → invalid', validateControlledRuntimeExecutionDryRun({ ...r, pass_gold_verified: false }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  assert('READY with rollback_plan_ready=false → invalid', validateControlledRuntimeExecutionDryRun({ ...r, rollback_plan_ready: false }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeExecutionDryRun({ ...FULL_READY });
  const s = renderControlledRuntimeExecutionDryRun(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('CONTROLLED_DRY_RUN_READY'));
  assert('render shows REGRA', s.includes('command_executed=false'));
  assert('render shows dry_run_id', s.includes('v152.0-dry-run'));
  assert('render shows command_type', s.includes('CONTROLLED_RUNTIME_EXECUTION'));
}
{
  const r = buildControlledRuntimeExecutionDryRun({});
  const s = renderControlledRuntimeExecutionDryRun(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderControlledRuntimeExecutionDryRun(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('CONTROLLED_DRY_RUN_STATUSES is array', Array.isArray(CONTROLLED_DRY_RUN_STATUSES));
  assert('CONTROLLED_DRY_RUN_STATUSES length=5', CONTROLLED_DRY_RUN_STATUSES.length === 5);
  assert('CONTROLLED_DRY_RUN_COMMAND_TYPES is array', Array.isArray(CONTROLLED_DRY_RUN_COMMAND_TYPES));
  assert('CONTROLLED_DRY_RUN_COMMAND_TYPES length=5', CONTROLLED_DRY_RUN_COMMAND_TYPES.length === 5);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
