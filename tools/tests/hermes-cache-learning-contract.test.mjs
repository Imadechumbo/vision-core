#!/usr/bin/env node
/**
 * Tests — Hermes Cache Learning Contract V141.0
 */

import {
  evaluateLearningContract,
  validateLearningContract,
  renderLearningContract,
  LEARNING_CONTRACT_STATUSES,
} from '../hermes-cache-learning-contract.mjs';

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

const VALID_HASH = 'a'.repeat(64);

const BASE = {
  mission_id:       'hermes-mission-1',
  mission_status:   'GOLD',
  pass_gold:        true,
  evidence_receipt: { receipt_id: 'r1', status: 'RECEIPT_ISSUED' },
  cache_hit:        true,
  evidence_hash:    VALID_HASH,
  cost_saved_usd:   0.05,
  result_status:    'passed',
  evaluated_at:     '2026-05-20T10:00:00.000Z',
};

console.log('\n=== hermes-cache-learning-contract tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = evaluateLearningContract({ ...BASE, mission_id: '' });
  assert('empty mission_id → LEARNING_BLOCKED_INPUT', r.learning_status === 'LEARNING_BLOCKED_INPUT');
  assert('learning_allowed=false', r.learning_allowed === false);
  assert('positive_learning=false', r.positive_learning === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = evaluateLearningContract({});
  assert('no params → LEARNING_BLOCKED_INPUT', r.learning_status === 'LEARNING_BLOCKED_INPUT');
}

// --- blocked no receipt ---
console.log('--- blocked no receipt ---');
{
  const r = evaluateLearningContract({ ...BASE, evidence_receipt: null });
  assert('null receipt → LEARNING_BLOCKED_NO_RECEIPT', r.learning_status === 'LEARNING_BLOCKED_NO_RECEIPT');
  assert('learning_allowed=false', r.learning_allowed === false);
  assert('incident_record_allowed=true', r.incident_record_allowed === true);
  assert('learning_mode=diagnostic_only', r.learning_mode === 'diagnostic_only');
}
{
  const r = evaluateLearningContract({ ...BASE, evidence_receipt: undefined });
  assert('undefined receipt → LEARNING_BLOCKED_NO_RECEIPT', r.learning_status === 'LEARNING_BLOCKED_NO_RECEIPT');
}

// --- blocked invalid hash ---
console.log('--- blocked invalid hash ---');
{
  const r = evaluateLearningContract({ ...BASE, evidence_hash: 'invalid' });
  assert('cache_hit+invalid hash → LEARNING_BLOCKED_INVALID_HASH', r.learning_status === 'LEARNING_BLOCKED_INVALID_HASH');
  assert('learning_allowed=false', r.learning_allowed === false);
  assert('incident_record_allowed=true', r.incident_record_allowed === true);
}
{
  const r = evaluateLearningContract({ ...BASE, evidence_hash: null });
  assert('cache_hit+null hash → LEARNING_BLOCKED_INVALID_HASH', r.learning_status === 'LEARNING_BLOCKED_INVALID_HASH');
}
{
  const r = evaluateLearningContract({ ...BASE, cache_hit: false, evidence_hash: null });
  // cache_hit=false → hash check doesn't apply → goes to GOLD+pass_gold check
  assert('cache_hit=false → hash check skipped', r.learning_status === 'LEARNING_ALLOWED_POSITIVE');
}

// --- diagnostic only ---
console.log('--- diagnostic only ---');
{
  const r = evaluateLearningContract({ ...BASE, mission_status: 'FAIL', pass_gold: false });
  assert('FAIL+false → LEARNING_DIAGNOSTIC_ONLY', r.learning_status === 'LEARNING_DIAGNOSTIC_ONLY');
  assert('learning_allowed=false', r.learning_allowed === false);
  assert('incident_record_allowed=true', r.incident_record_allowed === true);
  assert('learning_mode=diagnostic_only', r.learning_mode === 'diagnostic_only');
}
{
  const r = evaluateLearningContract({ ...BASE, pass_gold: false });
  assert('pass_gold=false → DIAGNOSTIC_ONLY', r.learning_status === 'LEARNING_DIAGNOSTIC_ONLY');
}
{
  const r = evaluateLearningContract({ ...BASE, mission_status: 'FAIL' });
  assert('mission_status=FAIL → DIAGNOSTIC_ONLY', r.learning_status === 'LEARNING_DIAGNOSTIC_ONLY');
}
{
  // No explicit mission_status or pass_gold → default diagnostic
  const r = evaluateLearningContract({ mission_id: 'x', evidence_receipt: { id: 'r' } });
  assert('no status default → DIAGNOSTIC_ONLY', r.learning_status === 'LEARNING_DIAGNOSTIC_ONLY');
}

// --- positive learning ---
console.log('--- positive learning ---');
{
  const r = evaluateLearningContract({ ...BASE });
  assert('GOLD+pass_gold=true → LEARNING_ALLOWED_POSITIVE', r.learning_status === 'LEARNING_ALLOWED_POSITIVE');
  assert('learning_allowed=true', r.learning_allowed === true);
  assert('positive_learning=true', r.positive_learning === true);
  assert('learning_mode=positive_pattern', r.learning_mode === 'positive_pattern');
  assert('schema_version=v141.0', r.schema_version === 'v141.0');
  assert('mission_id propagated', r.mission_id === 'hermes-mission-1');
  assert('evaluated_at propagated', r.evaluated_at === '2026-05-20T10:00:00.000Z');
}

// --- savings recorded ---
console.log('--- savings recorded ---');
{
  const r = evaluateLearningContract({ ...BASE, cost_saved_usd: 0.10 });
  assert('cost_saved > 0 → savings_recorded=true', r.savings_recorded === true);
}
{
  const r = evaluateLearningContract({ ...BASE, cost_saved_usd: 0 });
  assert('cost_saved=0 → savings_recorded=false', r.savings_recorded === false);
}
{
  // saved cost but result failed
  const r = evaluateLearningContract({ ...BASE, cost_saved_usd: 0.10, result_status: 'failed' });
  assert('cost saved + result failed → savings_recorded=true', r.savings_recorded === true);
  assert('cost saved + result failed → positive_learning=false', r.positive_learning === false);
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    evaluateLearningContract({ ...BASE }),
    evaluateLearningContract({ ...BASE, mission_id: '' }),
    evaluateLearningContract({ ...BASE, pass_gold: false }),
    evaluateLearningContract({ ...BASE, evidence_receipt: null }),
    evaluateLearningContract({ ...BASE, evidence_hash: 'bad' }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.learning_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.learning_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.learning_status}]`, r.release_performed === false);
  }
}

// --- deterministic contract_id ---
console.log('--- deterministic contract_id ---');
{
  const r1 = evaluateLearningContract({ ...BASE });
  const r2 = evaluateLearningContract({ ...BASE });
  assert('contract_id deterministic', r1.contract_id === r2.contract_id);
  assert('contract_id sha256', /^[a-f0-9]{64}$/.test(r1.contract_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = evaluateLearningContract({ ...BASE });
  const v = validateLearningContract(r);
  assert('validate positive → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateLearningContract({ ...BASE, mission_id: '' });
  const v = validateLearningContract(r);
  assert('validate blocked_input → valid=true struct', v.valid === true);
}
{
  const v = validateLearningContract(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateLearningContract({ ...BASE });
  const s = renderLearningContract(r);
  assert('render string', typeof s === 'string');
  assert('render shows LEARNING_ALLOWED_POSITIVE', s.includes('LEARNING_ALLOWED_POSITIVE'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = evaluateLearningContract({ ...BASE, pass_gold: false });
  const s = renderLearningContract(r);
  assert('render diagnostic shows DIAGNOSTIC_ONLY', s.includes('LEARNING_DIAGNOSTIC_ONLY'));
}
{
  const s = renderLearningContract(null);
  assert('render null graceful', typeof s === 'string');
}

// --- LEARNING_CONTRACT_STATUSES export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(LEARNING_CONTRACT_STATUSES));
  assert('length=5', LEARNING_CONTRACT_STATUSES.length === 5);
  for (const s of [
    'LEARNING_BLOCKED_INPUT', 'LEARNING_BLOCKED_NO_RECEIPT',
    'LEARNING_BLOCKED_INVALID_HASH', 'LEARNING_DIAGNOSTIC_ONLY',
    'LEARNING_ALLOWED_POSITIVE',
  ]) {
    assert(`${s} present`, LEARNING_CONTRACT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
