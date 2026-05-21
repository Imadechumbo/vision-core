#!/usr/bin/env node
/**
 * Tests — Hermes Expensive Analysis Skip Gate V143.0
 */

import {
  evaluateExpensiveAnalysisSkipGate,
  validateExpensiveAnalysisSkipGate,
  renderExpensiveAnalysisSkipGate,
  SKIP_GATE_STATUSES,
} from '../hermes-expensive-analysis-skip-gate.mjs';

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

const VALID_HASH = 'f'.repeat(64);

const BASE = {
  mission_id:               'skip-mission-1',
  reference_pass_gold:      true,
  reference_evidence_hash:  VALID_HASH,
  similarity_status:        'CLASSIFIER_MATCH_HIGH',
  current_test_status:      'passed',
  fallback_available:       true,
  evaluated_at:             '2026-05-20T13:00:00.000Z',
};

console.log('\n=== hermes-expensive-analysis-skip-gate tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, mission_id: '' });
  assert('empty mission_id → SKIP_BLOCKED_INPUT', r.skip_status === 'SKIP_BLOCKED_INPUT');
  assert('skip_allowed=false', r.skip_allowed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = evaluateExpensiveAnalysisSkipGate({});
  assert('no params → SKIP_BLOCKED_INPUT', r.skip_status === 'SKIP_BLOCKED_INPUT');
}

// --- no evidence ---
console.log('--- no evidence ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, reference_evidence_hash: null });
  assert('null hash → SKIP_BLOCKED_NO_EVIDENCE', r.skip_status === 'SKIP_BLOCKED_NO_EVIDENCE');
  assert('fallback_required=true', r.fallback_required === true);
  assert('skip_allowed=false', r.skip_allowed === false);
}
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, reference_evidence_hash: 'bad' });
  assert('invalid hash → SKIP_BLOCKED_NO_EVIDENCE', r.skip_status === 'SKIP_BLOCKED_NO_EVIDENCE');
}

// --- not gold ---
console.log('--- not gold ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, reference_pass_gold: false });
  assert('pass_gold=false → SKIP_BLOCKED_NOT_GOLD', r.skip_status === 'SKIP_BLOCKED_NOT_GOLD');
  assert('fallback_required=true', r.fallback_required === true);
}
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, reference_pass_gold: null });
  assert('pass_gold=null → SKIP_BLOCKED_NOT_GOLD', r.skip_status === 'SKIP_BLOCKED_NOT_GOLD');
}

// --- test failed ---
console.log('--- test failed ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, current_test_status: 'failed' });
  assert('test failed → SKIP_BLOCKED_TEST_FAILED', r.skip_status === 'SKIP_BLOCKED_TEST_FAILED');
  assert('fallback_required=true', r.fallback_required === true);
}

// --- low similarity ---
console.log('--- low similarity ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, similarity_status: 'CLASSIFIER_MATCH_LOW' });
  assert('LOW similarity → SKIP_BLOCKED_LOW_SIMILARITY', r.skip_status === 'SKIP_BLOCKED_LOW_SIMILARITY');
  assert('fallback_required=true', r.fallback_required === true);
}
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, similarity_status: 'CLASSIFIER_NO_MATCH' });
  assert('NO_MATCH → SKIP_BLOCKED_LOW_SIMILARITY', r.skip_status === 'SKIP_BLOCKED_LOW_SIMILARITY');
}
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, similarity_status: null });
  assert('null similarity → SKIP_BLOCKED_LOW_SIMILARITY', r.skip_status === 'SKIP_BLOCKED_LOW_SIMILARITY');
}

// --- skip allowed ---
console.log('--- skip allowed ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE });
  assert('HIGH similarity → SKIP_ALLOWED', r.skip_status === 'SKIP_ALLOWED');
  assert('skip_allowed=true', r.skip_allowed === true);
  assert('fallback_required=false', r.fallback_required === false);
  assert('schema_version=v143.0', r.schema_version === 'v143.0');
  assert('mission_id propagated', r.mission_id === 'skip-mission-1');
  assert('evaluated_at propagated', r.evaluated_at === '2026-05-20T13:00:00.000Z');
}
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, similarity_status: 'CLASSIFIER_MATCH_MEDIUM' });
  assert('MEDIUM similarity → SKIP_ALLOWED', r.skip_status === 'SKIP_ALLOWED');
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    evaluateExpensiveAnalysisSkipGate({ ...BASE }),
    evaluateExpensiveAnalysisSkipGate({ ...BASE, mission_id: '' }),
    evaluateExpensiveAnalysisSkipGate({ ...BASE, reference_pass_gold: false }),
    evaluateExpensiveAnalysisSkipGate({ ...BASE, current_test_status: 'failed' }),
    evaluateExpensiveAnalysisSkipGate({ ...BASE, similarity_status: 'CLASSIFIER_NO_MATCH' }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.skip_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.skip_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.skip_status}]`, r.release_performed === false);
  }
}

// --- deterministic gate_id ---
console.log('--- deterministic gate_id ---');
{
  const r1 = evaluateExpensiveAnalysisSkipGate({ ...BASE });
  const r2 = evaluateExpensiveAnalysisSkipGate({ ...BASE });
  assert('gate_id deterministic', r1.gate_id === r2.gate_id);
  assert('gate_id sha256', /^[a-f0-9]{64}$/.test(r1.gate_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE });
  const v = validateExpensiveAnalysisSkipGate(r);
  assert('validate allowed → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, reference_pass_gold: false });
  const v = validateExpensiveAnalysisSkipGate(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateExpensiveAnalysisSkipGate(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE });
  const s = renderExpensiveAnalysisSkipGate(r);
  assert('render string', typeof s === 'string');
  assert('render shows SKIP_ALLOWED', s.includes('SKIP_ALLOWED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = evaluateExpensiveAnalysisSkipGate({ ...BASE, reference_pass_gold: false });
  const s = renderExpensiveAnalysisSkipGate(r);
  assert('render blocked shows NOT_GOLD', s.includes('SKIP_BLOCKED_NOT_GOLD'));
}
{
  const s = renderExpensiveAnalysisSkipGate(null);
  assert('render null graceful', typeof s === 'string');
}

// --- statuses export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(SKIP_GATE_STATUSES));
  assert('length=6', SKIP_GATE_STATUSES.length === 6);
  for (const s of [
    'SKIP_BLOCKED_INPUT', 'SKIP_BLOCKED_NO_EVIDENCE',
    'SKIP_BLOCKED_NOT_GOLD', 'SKIP_BLOCKED_TEST_FAILED',
    'SKIP_BLOCKED_LOW_SIMILARITY', 'SKIP_ALLOWED',
  ]) {
    assert(`${s} present`, SKIP_GATE_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
