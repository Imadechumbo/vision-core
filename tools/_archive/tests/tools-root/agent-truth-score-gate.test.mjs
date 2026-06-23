#!/usr/bin/env node
/**
 * Tests — Agent Truth Score Gate V148.1
 */

import {
  evaluateAgentTruthScore,
  validateAgentTruthScore,
  renderAgentTruthScore,
  AGENT_TRUTH_STATUSES,
} from '../agent-truth-score-gate.mjs';

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

const TRUSTED_BASE = {
  gate_id:                      'gate-1',
  agent_name:                   'Claude',
  verified_claim_count:         10,
  blocked_claim_count:          0,
  hallucination_incident_count: 0,
  repeated_incident_count:      0,
  proof_ledger_valid:           true,
  recent_pass_gold_count:       2,
  recent_fail_count:            0,
  evaluated_at:                 '2026-05-21T12:00:00.000Z',
};

console.log('\n=== agent-truth-score-gate tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = evaluateAgentTruthScore({});
  assert('no gate_id → AGENT_TRUTH_BLOCKED', r.agent_truth_status === 'AGENT_TRUTH_BLOCKED');
  assert('agent_truth_gate_evaluated=false', r.agent_truth_gate_evaluated === false);
  assert('truth_score=0', r.truth_score === 0);
  assert('agent_allowed=false', r.agent_allowed === false);
  assert('agent_blocked=true', r.agent_blocked === true);
  assert('agent_requires_supervision=true', r.agent_requires_supervision === true);
  assert('unsafe_learning_blocked=true', r.unsafe_learning_blocked === true);
  assert('positive_learning_requires_pass_gold=true', r.positive_learning_requires_pass_gold === true);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = evaluateAgentTruthScore(null);
  assert('null → BLOCKED', r.agent_truth_status === 'AGENT_TRUTH_BLOCKED');
  assert('null → gate_evaluated=false', r.agent_truth_gate_evaluated === false);
}

// --- trusted ---
console.log('--- trusted ---');
{
  const r = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  assert('clean agent → AGENT_TRUTH_TRUSTED', r.agent_truth_status === 'AGENT_TRUTH_TRUSTED');
  assert('agent_truth_gate_evaluated=true', r.agent_truth_gate_evaluated === true);
  assert('truth_score 80–100', r.truth_score >= 80 && r.truth_score <= 100);
  assert('agent_allowed=true', r.agent_allowed === true);
  assert('agent_requires_supervision=false', r.agent_requires_supervision === false);
  assert('agent_blocked=false', r.agent_blocked === false);
  assert('recommended_mode=AUTONOMOUS_WITH_VERIFICATION', r.recommended_mode === 'AUTONOMOUS_WITH_VERIFICATION');
  assert('schema_version=v148.1', r.schema_version === 'v148.1');
  assert('gate_id propagated', r.gate_id === 'gate-1');
  assert('agent_name propagated', r.agent_name === 'Claude');
  assert('evaluated_at propagated', r.evaluated_at === '2026-05-21T12:00:00.000Z');
  assert('unsafe_learning_blocked=true', r.unsafe_learning_blocked === true);
  assert('positive_learning_requires_pass_gold=true', r.positive_learning_requires_pass_gold === true);
}

// --- supervised (has incidents but no repeats) ---
console.log('--- supervised ---');
{
  const r = evaluateAgentTruthScore({
    ...TRUSTED_BASE,
    hallucination_incident_count: 1,
    proof_ledger_valid: false,
  });
  assert('1 incident + no ledger → SUPERVISED or lower', ['AGENT_TRUTH_SUPERVISED','AGENT_TRUTH_RESTRICTED','AGENT_TRUTH_BLOCKED'].includes(r.agent_truth_status));
}
{
  const r = evaluateAgentTruthScore({
    gate_id: 'g2',
    verified_claim_count: 8,
    blocked_claim_count: 2,
    hallucination_incident_count: 1,
    repeated_incident_count: 0,
    proof_ledger_valid: true,
    recent_pass_gold_count: 1,
    recent_fail_count: 0,
  });
  assert('moderate agent → SUPERVISED', r.agent_truth_status === 'AGENT_TRUTH_SUPERVISED');
  assert('agent_allowed=true', r.agent_allowed === true);
  assert('agent_requires_supervision=true', r.agent_requires_supervision === true);
  assert('recommended_mode=SUPERVISED_EXECUTION', r.recommended_mode === 'SUPERVISED_EXECUTION');
}

// --- restricted ---
console.log('--- restricted ---');
{
  const r = evaluateAgentTruthScore({
    gate_id: 'g3',
    verified_claim_count: 3,
    blocked_claim_count: 7,
    hallucination_incident_count: 3,
    repeated_incident_count: 0,
    proof_ledger_valid: false,
    recent_pass_gold_count: 0,
    recent_fail_count: 3,
  });
  assert('many blocks+incidents → RESTRICTED or BLOCKED', ['AGENT_TRUTH_RESTRICTED','AGENT_TRUTH_BLOCKED'].includes(r.agent_truth_status));
  assert('agent_requires_supervision=true', r.agent_requires_supervision === true);
}

// --- blocked by repeated incidents ---
console.log('--- blocked ---');
{
  const r = evaluateAgentTruthScore({
    gate_id: 'g4',
    verified_claim_count: 0,
    blocked_claim_count: 10,
    hallucination_incident_count: 5,
    repeated_incident_count: 3,
    proof_ledger_valid: false,
    recent_pass_gold_count: 0,
    recent_fail_count: 5,
  });
  assert('5 incidents + 3 repeats → BLOCKED', r.agent_truth_status === 'AGENT_TRUTH_BLOCKED');
  assert('agent_allowed=false', r.agent_allowed === false);
  assert('agent_blocked=true', r.agent_blocked === true);
  assert('recommended_mode=BLOCK_ALL', r.recommended_mode === 'BLOCK_ALL');
}

// --- truth_score bounds ---
console.log('--- score bounds ---');
{
  const r = evaluateAgentTruthScore({ gate_id: 'g5', ...TRUSTED_BASE, recent_pass_gold_count: 999 });
  assert('score capped at 100', r.truth_score <= 100);
}
{
  const r = evaluateAgentTruthScore({
    gate_id: 'g6',
    hallucination_incident_count: 100,
    repeated_incident_count: 100,
    recent_fail_count: 100,
    proof_ledger_valid: false,
  });
  assert('score floored at 0', r.truth_score >= 0);
}

// --- proof_ledger_valid impact ---
console.log('--- ledger impact ---');
{
  const base = { gate_id: 'g-ledger', verified_claim_count: 5, blocked_claim_count: 2 };
  const with_ledger    = evaluateAgentTruthScore({ ...base, proof_ledger_valid: true });
  const without_ledger = evaluateAgentTruthScore({ ...base, proof_ledger_valid: false });
  assert('valid ledger scores higher', with_ledger.truth_score > without_ledger.truth_score);
}

// --- deterministic gate_id_hash ---
console.log('--- deterministic hash ---');
{
  const r1 = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  const r2 = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  assert('gate_id_hash deterministic', r1.gate_id_hash === r2.gate_id_hash);
  assert('gate_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.gate_id_hash));
}
{
  const r1 = evaluateAgentTruthScore({ ...TRUSTED_BASE, gate_id: 'a' });
  const r2 = evaluateAgentTruthScore({ ...TRUSTED_BASE, gate_id: 'b' });
  assert('different gate_id → different hash', r1.gate_id_hash !== r2.gate_id_hash);
}

// --- evaluated_at default ---
{
  const r = evaluateAgentTruthScore({ gate_id: 'g7' });
  assert('no evaluated_at → auto ISO', typeof r.evaluated_at === 'string' && r.evaluated_at.length > 0);
}

// --- REGRA ABSOLUTA invariants ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    evaluateAgentTruthScore({}),
    evaluateAgentTruthScore({ ...TRUSTED_BASE }),
    evaluateAgentTruthScore({ gate_id: 'gx', hallucination_incident_count: 5, repeated_incident_count: 3 }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.agent_truth_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.agent_truth_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.agent_truth_status}]`, r.release_performed === false);
    assert(`unsafe_learning_blocked=true [${r.agent_truth_status}]`, r.unsafe_learning_blocked === true);
    assert(`positive_learning_requires_pass_gold=true [${r.agent_truth_status}]`, r.positive_learning_requires_pass_gold === true);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  const v = validateAgentTruthScore(r);
  assert('validate trusted → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateAgentTruthScore({});
  const v = validateAgentTruthScore(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateAgentTruthScore(null).valid === false);
}
{
  const r = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  const tampered = { ...r, stable_promoted: true };
  assert('stable_promoted tampered → invalid', validateAgentTruthScore(tampered).valid === false);
}
{
  const r = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  const tampered = { ...r, unsafe_learning_blocked: false };
  assert('unsafe_learning_blocked tampered → invalid', validateAgentTruthScore(tampered).valid === false);
}
{
  const r = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  const tampered = { ...r, truth_score: 150 };
  assert('truth_score out of range → invalid', validateAgentTruthScore(tampered).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateAgentTruthScore({ ...TRUSTED_BASE });
  const s = renderAgentTruthScore(r);
  assert('render string', typeof s === 'string');
  assert('render shows AGENT_TRUTH_TRUSTED', s.includes('AGENT_TRUTH_TRUSTED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows unsafe_learning_blocked', s.includes('unsafe_learning_blocked:'));
  assert('render shows gate_id', s.includes('gate-1'));
}
{
  assert('render null graceful', typeof renderAgentTruthScore(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('AGENT_TRUTH_STATUSES is array', Array.isArray(AGENT_TRUTH_STATUSES));
  assert('AGENT_TRUTH_STATUSES length=4', AGENT_TRUTH_STATUSES.length === 4);
  for (const s of [
    'AGENT_TRUTH_TRUSTED', 'AGENT_TRUTH_SUPERVISED',
    'AGENT_TRUTH_RESTRICTED', 'AGENT_TRUTH_BLOCKED',
  ]) {
    assert(`status present: ${s}`, AGENT_TRUTH_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
