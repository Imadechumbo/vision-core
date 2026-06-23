#!/usr/bin/env node
/**
 * Tests — Human Execution Command Contract V151.0
 */

import {
  buildHumanExecutionCommandContract,
  validateHumanExecutionCommandContract,
  renderHumanExecutionCommandContract,
  HUMAN_COMMAND_STATUSES,
  HUMAN_COMMAND_TYPES,
} from '../human-execution-command-contract.mjs';

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
  contract_id:                      'v151.0-contract',
  command_type:                     'CONTROLLED_RUNTIME_EXECUTION',
  anti_hallucination_runtime_ready: true,
  truth_gate_status:                'TRUSTED',
  truth_score:                      90,
  pass_gold_receipt_id:             'pg-receipt-001',
  pass_gold_verified:               true,
  rollback_plan_id:                 'rbp-001',
  rollback_plan_ready:              true,
  human_approval_token:             'tok-human-001',
  human_approval_verified:          true,
  issued_at:                        '2026-05-21T16:00:00.000Z',
};

console.log('\n=== human-execution-command-contract tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildHumanExecutionCommandContract({});
  assert('no contract_id → BLOCKED_INPUT', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_INPUT');
  assert('contract_ready=false', r.contract_ready === false);
  assert('command_authorized=false', r.command_authorized === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildHumanExecutionCommandContract(null);
  assert('null → BLOCKED_INPUT', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_INPUT');
}
{
  const r = buildHumanExecutionCommandContract({ contract_id: 'c1' });
  assert('no command_type → BLOCKED_INPUT', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_INPUT');
}
{
  const r = buildHumanExecutionCommandContract({ contract_id: 'c1', command_type: 'UNKNOWN_TYPE' });
  assert('unknown command_type → BLOCKED_INPUT', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_INPUT');
}

// --- blocked truth ---
console.log('--- blocked truth ---');
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c2',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
  });
  assert('no truth → BLOCKED_TRUTH', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_TRUTH');
  assert('contract_ready=false', r.contract_ready === false);
}
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c2',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'SUPERVISED',
    truth_score: 90,
  });
  assert('SUPERVISED status → BLOCKED_TRUTH', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_TRUTH');
}
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c2',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 79,
  });
  assert('score=79 → BLOCKED_TRUTH', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_TRUTH');
}
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c2',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: false,
    truth_gate_status: 'TRUSTED',
    truth_score: 95,
  });
  assert('anti_hallucination_ready=false → BLOCKED_TRUTH', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_TRUTH');
}

// --- blocked pass gold ---
console.log('--- blocked pass gold ---');
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c3',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
  });
  assert('no pass_gold → BLOCKED_PASS_GOLD', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_PASS_GOLD');
}
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c3',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: false,
  });
  assert('pass_gold_verified=false → BLOCKED_PASS_GOLD', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_PASS_GOLD');
}

// --- blocked rollback ---
console.log('--- blocked rollback ---');
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c4',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: true,
  });
  assert('no rollback → BLOCKED_ROLLBACK', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_ROLLBACK');
}
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c4',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: true,
    rollback_plan_id: 'rbp-001',
    rollback_plan_ready: false,
  });
  assert('rollback_ready=false → BLOCKED_ROLLBACK', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_ROLLBACK');
}

// --- blocked approval ---
console.log('--- blocked approval ---');
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c5',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: true,
    rollback_plan_id: 'rbp-001',
    rollback_plan_ready: true,
  });
  assert('no approval → BLOCKED_APPROVAL', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_APPROVAL');
}
{
  const r = buildHumanExecutionCommandContract({
    contract_id: 'c5',
    command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    anti_hallucination_runtime_ready: true,
    truth_gate_status: 'TRUSTED',
    truth_score: 90,
    pass_gold_receipt_id: 'pg-001',
    pass_gold_verified: true,
    rollback_plan_id: 'rbp-001',
    rollback_plan_ready: true,
    human_approval_token: 'tok',
    human_approval_verified: false,
  });
  assert('approval_verified=false → BLOCKED_APPROVAL', r.human_command_status === 'HUMAN_COMMAND_BLOCKED_APPROVAL');
}

// --- ready for dry run ---
console.log('--- ready for dry run ---');
{
  const r = buildHumanExecutionCommandContract({ ...FULL_READY });
  assert('all ready → HUMAN_COMMAND_READY_FOR_DRY_RUN', r.human_command_status === 'HUMAN_COMMAND_READY_FOR_DRY_RUN');
  assert('contract_ready=true', r.contract_ready === true);
  assert('schema_version=v151.0', r.schema_version === 'v151.0');
  assert('contract_id propagated', r.contract_id === 'v151.0-contract');
  assert('command_type propagated', r.command_type === 'CONTROLLED_RUNTIME_EXECUTION');
  assert('issued_at propagated', r.issued_at === '2026-05-21T16:00:00.000Z');
  assert('pass_gold_receipt_id propagated', r.pass_gold_receipt_id === 'pg-receipt-001');
  assert('rollback_plan_id propagated', r.rollback_plan_id === 'rbp-001');
  assert('approval_token_hash is sha256', /^[a-f0-9]{64}$/.test(r.approval_token_hash));
  assert('raw token NOT in output', !('human_approval_token' in r));
  assert('command_authorized=false', r.command_authorized === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// all command types pass
console.log('--- all command types ---');
for (const ct of [
  'CONTROLLED_RUNTIME_EXECUTION',
  'CONTROLLED_STABLE_PROMOTION',
  'CONTROLLED_DEPLOY',
  'CONTROLLED_RELEASE',
  'CONTROLLED_ROLLBACK_DRILL',
]) {
  const r = buildHumanExecutionCommandContract({ ...FULL_READY, contract_id: `c-${ct}`, command_type: ct });
  assert(`${ct} → READY_FOR_DRY_RUN`, r.human_command_status === 'HUMAN_COMMAND_READY_FOR_DRY_RUN');
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildHumanExecutionCommandContract({ ...FULL_READY });
  const r2 = buildHumanExecutionCommandContract({ ...FULL_READY });
  assert('contract_id_hash deterministic', r1.contract_id_hash === r2.contract_id_hash);
  assert('contract_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.contract_id_hash));
}
{
  const r1 = buildHumanExecutionCommandContract({ ...FULL_READY, contract_id: 'a' });
  const r2 = buildHumanExecutionCommandContract({ ...FULL_READY, contract_id: 'b' });
  assert('different contract_id → different hash', r1.contract_id_hash !== r2.contract_id_hash);
}

// --- issued_at default ---
{
  const r = buildHumanExecutionCommandContract({ contract_id: 'bx', command_type: 'CONTROLLED_RUNTIME_EXECUTION' });
  assert('no issued_at → auto ISO', typeof r.issued_at === 'string' && r.issued_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildHumanExecutionCommandContract({}),
    buildHumanExecutionCommandContract({ ...FULL_READY }),
    buildHumanExecutionCommandContract({ contract_id: 'cx', command_type: 'CONTROLLED_DEPLOY' }),
  ];
  for (const r of cases) {
    assert(`command_authorized=false [${r.human_command_status}]`, r.command_authorized === false);
    assert(`execution_performed=false [${r.human_command_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.human_command_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.human_command_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.human_command_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildHumanExecutionCommandContract({ ...FULL_READY });
  const v = validateHumanExecutionCommandContract(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildHumanExecutionCommandContract({});
  const v = validateHumanExecutionCommandContract(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateHumanExecutionCommandContract(null).valid === false);
}
{
  const r = buildHumanExecutionCommandContract({ ...FULL_READY });
  const tampered = { ...r, command_authorized: true };
  assert('command_authorized tampered → invalid', validateHumanExecutionCommandContract(tampered).valid === false);
}
{
  const r = buildHumanExecutionCommandContract({ ...FULL_READY });
  const tampered = { ...r, execution_performed: true };
  assert('execution_performed tampered → invalid', validateHumanExecutionCommandContract(tampered).valid === false);
}
{
  const r = buildHumanExecutionCommandContract({ ...FULL_READY });
  const tampered = { ...r, stable_promoted: true };
  assert('stable_promoted tampered → invalid', validateHumanExecutionCommandContract(tampered).valid === false);
}
{
  const r = buildHumanExecutionCommandContract({ ...FULL_READY });
  const tampered = { ...r, human_command_status: 'HUMAN_COMMAND_READY_FOR_DRY_RUN', pass_gold_verified: false };
  assert('READY with pass_gold_verified=false → invalid', validateHumanExecutionCommandContract(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildHumanExecutionCommandContract({ ...FULL_READY });
  const s = renderHumanExecutionCommandContract(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY_FOR_DRY_RUN', s.includes('HUMAN_COMMAND_READY_FOR_DRY_RUN'));
  assert('render shows REGRA', s.includes('command_authorized=false'));
  assert('render shows contract_id', s.includes('v151.0-contract'));
  assert('render shows command_type', s.includes('CONTROLLED_RUNTIME_EXECUTION'));
}
{
  const r = buildHumanExecutionCommandContract({});
  const s = renderHumanExecutionCommandContract(r);
  assert('blocked render shows blocked_reason', s.includes('blocked_reason') || s.includes('Blocked reason'));
}
{
  assert('render null graceful', typeof renderHumanExecutionCommandContract(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('HUMAN_COMMAND_STATUSES is array', Array.isArray(HUMAN_COMMAND_STATUSES));
  assert('HUMAN_COMMAND_STATUSES length=6', HUMAN_COMMAND_STATUSES.length === 6);
  assert('HUMAN_COMMAND_TYPES is array', Array.isArray(HUMAN_COMMAND_TYPES));
  assert('HUMAN_COMMAND_TYPES length=5', HUMAN_COMMAND_TYPES.length === 5);
  for (const t of [
    'CONTROLLED_RUNTIME_EXECUTION',
    'CONTROLLED_STABLE_PROMOTION',
    'CONTROLLED_DEPLOY',
    'CONTROLLED_RELEASE',
    'CONTROLLED_ROLLBACK_DRILL',
  ]) {
    assert(`type present: ${t}`, HUMAN_COMMAND_TYPES.includes(t));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
