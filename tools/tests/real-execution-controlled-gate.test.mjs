#!/usr/bin/env node
/**
 * Tests — Real Execution Controlled Gate V149.0
 */

import {
  evaluateControlledGate,
  validateControlledGate,
  renderControlledGate,
  CONTROLLED_GATE_STATUSES,
} from '../real-execution-controlled-gate.mjs';

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

const READY_BASE = {
  gate_id:                  'gate-1',
  agent_name:               'Claude',
  truth_gate_status:        'AGENT_TRUTH_TRUSTED',
  truth_score:              90,
  truth_score_threshold:    80,
  rollback_plan_ready:      true,
  rollback_tested:          true,
  human_approval_token:     'tok-human-abc',
  controlled_execution_mode: true,
  dry_run_completed:        true,
  proof_ledger_sealed:      true,
  evaluated_at:             '2026-05-21T13:00:00.000Z',
};

console.log('\n=== real-execution-controlled-gate tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = evaluateControlledGate({});
  assert('no gate_id → CONTROLLED_GATE_BLOCKED_INPUT', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_INPUT');
  assert('controlled_gate_evaluated=false', r.controlled_gate_evaluated === false);
  assert('execution_allowed=false', r.execution_allowed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('future_execution_command_required=true', r.future_execution_command_required === true);
  assert('human_approval_required=true', r.human_approval_required === true);
  assert('truth_gate_required=true', r.truth_gate_required === true);
  assert('rollback_required=true', r.rollback_required === true);
  assert('unsafe_learning_blocked=true', r.unsafe_learning_blocked === true);
  assert('positive_learning_requires_pass_gold=true', r.positive_learning_requires_pass_gold === true);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = evaluateControlledGate(null);
  assert('null → BLOCKED_INPUT', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_INPUT');
}

// --- blocked by truth gate ---
console.log('--- blocked by truth ---');
{
  const r = evaluateControlledGate({ ...READY_BASE, truth_gate_status: 'AGENT_TRUTH_BLOCKED' });
  assert('AGENT_TRUTH_BLOCKED → CONTROLLED_GATE_BLOCKED_TRUTH', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_TRUTH');
  assert('controlled_gate_evaluated=true', r.controlled_gate_evaluated === true);
  assert('execution_allowed=false', r.execution_allowed === false);
}
{
  const r = evaluateControlledGate({ ...READY_BASE, truth_gate_status: 'AGENT_TRUTH_RESTRICTED' });
  assert('RESTRICTED → BLOCKED_TRUTH', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_TRUTH');
}
{
  const r = evaluateControlledGate({ ...READY_BASE, truth_score: 50 });
  assert('score below threshold → BLOCKED_TRUTH', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_TRUTH');
}
{
  const r = evaluateControlledGate({ ...READY_BASE, truth_gate_status: null });
  assert('null truth_gate_status → BLOCKED_TRUTH', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_TRUTH');
}

// --- SUPERVISED also passes truth check ---
{
  const r = evaluateControlledGate({ ...READY_BASE, truth_gate_status: 'AGENT_TRUTH_SUPERVISED', truth_score: 85 });
  assert('SUPERVISED + score ok → passes truth', r.controlled_gate_status !== 'CONTROLLED_GATE_BLOCKED_TRUTH');
}

// --- blocked by rollback ---
console.log('--- blocked by rollback ---');
{
  const r = evaluateControlledGate({ ...READY_BASE, rollback_plan_ready: false });
  assert('no rollback → CONTROLLED_GATE_BLOCKED_ROLLBACK', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_ROLLBACK');
}

// --- blocked no approval ---
console.log('--- blocked no approval ---');
{
  const r = evaluateControlledGate({ ...READY_BASE, human_approval_token: null });
  assert('no token → CONTROLLED_GATE_BLOCKED_NO_APPROVAL', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_NO_APPROVAL');
}
{
  const r = evaluateControlledGate({ ...READY_BASE, human_approval_token: '   ' });
  assert('blank token → BLOCKED_NO_APPROVAL', r.controlled_gate_status === 'CONTROLLED_GATE_BLOCKED_NO_APPROVAL');
}

// --- ready for human ---
console.log('--- ready for human ---');
{
  const r = evaluateControlledGate({ ...READY_BASE });
  assert('all conditions met → CONTROLLED_GATE_READY_FOR_HUMAN', r.controlled_gate_status === 'CONTROLLED_GATE_READY_FOR_HUMAN');
  assert('schema_version=v149.0', r.schema_version === 'v149.0');
  assert('gate_id propagated', r.gate_id === 'gate-1');
  assert('agent_name propagated', r.agent_name === 'Claude');
  assert('evaluated_at propagated', r.evaluated_at === '2026-05-21T13:00:00.000Z');
  assert('truth_gate_status propagated', r.truth_gate_status === 'AGENT_TRUTH_TRUSTED');
  assert('truth_score propagated', r.truth_score === 90);
  assert('rollback_plan_ready=true', r.rollback_plan_ready === true);
  assert('dry_run_completed=true', r.dry_run_completed === true);
  assert('proof_ledger_sealed=true', r.proof_ledger_sealed === true);
  assert('human_approval_token_hash sha256', /^[a-f0-9]{64}$/.test(r.human_approval_token_hash));
  assert('execution_allowed=false', r.execution_allowed === false);
  assert('execution_performed=false', r.execution_performed === false);
  assert('future_execution_command_required=true', r.future_execution_command_required === true);
  assert('human_approval_required=true', r.human_approval_required === true);
}

// --- token is hashed not stored ---
{
  const r = evaluateControlledGate({ ...READY_BASE });
  assert('human_approval_token not in result', !('human_approval_token' in r));
  assert('human_approval_token_hash present', 'human_approval_token_hash' in r);
}

// --- truth_score null passes if status ok ---
{
  const r = evaluateControlledGate({ ...READY_BASE, truth_score: null });
  assert('null score + TRUSTED status → passes truth', r.controlled_gate_status !== 'CONTROLLED_GATE_BLOCKED_TRUTH');
}

// --- deterministic gate_id_hash ---
console.log('--- deterministic hash ---');
{
  const r1 = evaluateControlledGate({ ...READY_BASE });
  const r2 = evaluateControlledGate({ ...READY_BASE });
  assert('gate_id_hash deterministic', r1.gate_id_hash === r2.gate_id_hash);
  assert('gate_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.gate_id_hash));
}

// --- evaluated_at default ---
{
  const r = evaluateControlledGate({ gate_id: 'gx', truth_gate_status: 'AGENT_TRUTH_BLOCKED' });
  assert('no evaluated_at → auto ISO', typeof r.evaluated_at === 'string' && r.evaluated_at.length > 0);
}

// --- REGRA ABSOLUTA invariants ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    evaluateControlledGate({}),
    evaluateControlledGate({ ...READY_BASE }),
    evaluateControlledGate({ ...READY_BASE, truth_gate_status: 'AGENT_TRUTH_BLOCKED' }),
    evaluateControlledGate({ ...READY_BASE, rollback_plan_ready: false }),
    evaluateControlledGate({ ...READY_BASE, human_approval_token: null }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.controlled_gate_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.controlled_gate_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.controlled_gate_status}]`, r.release_performed === false);
    assert(`execution_performed=false [${r.controlled_gate_status}]`, r.execution_performed === false);
    assert(`execution_allowed=false [${r.controlled_gate_status}]`, r.execution_allowed === false);
    assert(`future_execution_command_required=true [${r.controlled_gate_status}]`, r.future_execution_command_required === true);
    assert(`human_approval_required=true [${r.controlled_gate_status}]`, r.human_approval_required === true);
    assert(`unsafe_learning_blocked=true [${r.controlled_gate_status}]`, r.unsafe_learning_blocked === true);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = evaluateControlledGate({ ...READY_BASE });
  const v = validateControlledGate(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateControlledGate({});
  const v = validateControlledGate(r);
  assert('validate blocked_input → valid=true struct', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledGate(null).valid === false);
}
{
  const r = evaluateControlledGate({ ...READY_BASE });
  const tampered = { ...r, execution_allowed: true };
  assert('execution_allowed tampered → invalid', validateControlledGate(tampered).valid === false);
}
{
  const r = evaluateControlledGate({ ...READY_BASE });
  const tampered = { ...r, execution_performed: true };
  assert('execution_performed tampered → invalid', validateControlledGate(tampered).valid === false);
}
{
  const r = evaluateControlledGate({ ...READY_BASE });
  const tampered = { ...r, stable_promoted: true };
  assert('stable_promoted tampered → invalid', validateControlledGate(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateControlledGate({ ...READY_BASE });
  const s = renderControlledGate(r);
  assert('render string', typeof s === 'string');
  assert('render shows CONTROLLED_GATE_READY_FOR_HUMAN', s.includes('CONTROLLED_GATE_READY_FOR_HUMAN'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows execution_allowed', s.includes('execution_allowed:'));
  assert('render shows gate-1', s.includes('gate-1'));
}
{
  assert('render null graceful', typeof renderControlledGate(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('CONTROLLED_GATE_STATUSES is array', Array.isArray(CONTROLLED_GATE_STATUSES));
  assert('CONTROLLED_GATE_STATUSES length=5', CONTROLLED_GATE_STATUSES.length === 5);
  for (const s of [
    'CONTROLLED_GATE_BLOCKED_INPUT', 'CONTROLLED_GATE_BLOCKED_TRUTH',
    'CONTROLLED_GATE_BLOCKED_ROLLBACK', 'CONTROLLED_GATE_BLOCKED_NO_APPROVAL',
    'CONTROLLED_GATE_READY_FOR_HUMAN',
  ]) {
    assert(`status present: ${s}`, CONTROLLED_GATE_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
