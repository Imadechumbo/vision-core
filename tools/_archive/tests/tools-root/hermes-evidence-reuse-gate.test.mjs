#!/usr/bin/env node
/**
 * Tests — Hermes Evidence Reuse Gate V142.0
 */

import {
  evaluateEvidenceReuseGate,
  validateEvidenceReuseGate,
  renderEvidenceReuseGate,
  EVIDENCE_REUSE_STATUSES,
} from '../hermes-evidence-reuse-gate.mjs';

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

const VALID_HASH = 'b'.repeat(64);
const BASELINE  = 'c'.repeat(64);

const BASE = {
  mission_id:           'hermes-reuse-1',
  evidence_hash:        VALID_HASH,
  current_branch:       'main',
  evidence_branch:      'main',
  current_baseline_id:  BASELINE,
  evidence_baseline_id: BASELINE,
  pass_gold:            true,
  current_mission_id:   'hermes-reuse-1',
  evidence_mission_id:  'hermes-reuse-1',
  cache_stale:          false,
  evaluated_at:         '2026-05-20T11:00:00.000Z',
};

console.log('\n=== hermes-evidence-reuse-gate tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE, mission_id: '' });
  assert('empty mission_id → REUSE_BLOCKED_INPUT', r.reuse_status === 'REUSE_BLOCKED_INPUT');
  assert('reuse_allowed=false', r.reuse_allowed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = evaluateEvidenceReuseGate({});
  assert('no params → REUSE_BLOCKED_INPUT', r.reuse_status === 'REUSE_BLOCKED_INPUT');
}

// --- invalid hash ---
console.log('--- invalid hash ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE, evidence_hash: 'bad' });
  assert('invalid hash → REUSE_BLOCKED_INVALID_HASH', r.reuse_status === 'REUSE_BLOCKED_INVALID_HASH');
  assert('reuse_allowed=false', r.reuse_allowed === false);
}
{
  const r = evaluateEvidenceReuseGate({ ...BASE, evidence_hash: null });
  assert('null hash → REUSE_BLOCKED_INVALID_HASH', r.reuse_status === 'REUSE_BLOCKED_INVALID_HASH');
}
{
  const r = evaluateEvidenceReuseGate({ ...BASE, evidence_hash: 'a'.repeat(63) });
  assert('63-char hash → REUSE_BLOCKED_INVALID_HASH', r.reuse_status === 'REUSE_BLOCKED_INVALID_HASH');
}

// --- branch mismatch ---
console.log('--- branch mismatch ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE, current_branch: 'feat/x', evidence_branch: 'main' });
  assert('branch mismatch → REUSE_BLOCKED_BRANCH_MISMATCH', r.reuse_status === 'REUSE_BLOCKED_BRANCH_MISMATCH');
  assert('reuse_allowed=false', r.reuse_allowed === false);
}
{
  // null branch → skip check
  const r = evaluateEvidenceReuseGate({ ...BASE, current_branch: null, evidence_branch: null });
  assert('null branches → skip mismatch check', r.reuse_status === 'REUSE_ALLOWED');
}

// --- baseline incompatible ---
console.log('--- baseline incompatible ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE, current_baseline_id: 'a'.repeat(64), evidence_baseline_id: 'b'.repeat(64) });
  assert('baseline mismatch → REUSE_BLOCKED_BASELINE_INCOMPATIBLE', r.reuse_status === 'REUSE_BLOCKED_BASELINE_INCOMPATIBLE');
}
{
  const r = evaluateEvidenceReuseGate({ ...BASE, current_baseline_id: null, evidence_baseline_id: null });
  assert('null baselines → skip check', r.reuse_status === 'REUSE_ALLOWED');
}

// --- no pass_gold ---
console.log('--- no pass_gold ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE, pass_gold: false });
  assert('pass_gold=false → REUSE_BLOCKED_NO_PASS_GOLD', r.reuse_status === 'REUSE_BLOCKED_NO_PASS_GOLD');
}
{
  const r = evaluateEvidenceReuseGate({ ...BASE, pass_gold: null });
  assert('pass_gold=null → REUSE_BLOCKED_NO_PASS_GOLD', r.reuse_status === 'REUSE_BLOCKED_NO_PASS_GOLD');
}

// --- mission mismatch ---
console.log('--- mission mismatch ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE, current_mission_id: 'mission-a', evidence_mission_id: 'mission-b' });
  assert('mission mismatch → REUSE_BLOCKED_MISSION_MISMATCH', r.reuse_status === 'REUSE_BLOCKED_MISSION_MISMATCH');
}
{
  const r = evaluateEvidenceReuseGate({ ...BASE, current_mission_id: null, evidence_mission_id: null });
  assert('null mission ids → skip check', r.reuse_status === 'REUSE_ALLOWED');
}

// --- stale cache ---
console.log('--- stale cache ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE, cache_stale: true });
  assert('cache_stale=true → REUSE_BLOCKED_STALE_CACHE', r.reuse_status === 'REUSE_BLOCKED_STALE_CACHE');
}

// --- reuse allowed ---
console.log('--- reuse allowed ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE });
  assert('all clear → REUSE_ALLOWED', r.reuse_status === 'REUSE_ALLOWED');
  assert('reuse_allowed=true', r.reuse_allowed === true);
  assert('schema_version=v142.0', r.schema_version === 'v142.0');
  assert('mission_id propagated', r.mission_id === 'hermes-reuse-1');
  assert('evidence_hash propagated', r.evidence_hash === VALID_HASH);
  assert('pass_gold propagated', r.pass_gold === true);
  assert('evaluated_at propagated', r.evaluated_at === '2026-05-20T11:00:00.000Z');
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    evaluateEvidenceReuseGate({ ...BASE }),
    evaluateEvidenceReuseGate({ ...BASE, mission_id: '' }),
    evaluateEvidenceReuseGate({ ...BASE, evidence_hash: 'bad' }),
    evaluateEvidenceReuseGate({ ...BASE, pass_gold: false }),
    evaluateEvidenceReuseGate({ ...BASE, cache_stale: true }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.reuse_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.reuse_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.reuse_status}]`, r.release_performed === false);
  }
}

// --- deterministic gate_id ---
console.log('--- deterministic gate_id ---');
{
  const r1 = evaluateEvidenceReuseGate({ ...BASE });
  const r2 = evaluateEvidenceReuseGate({ ...BASE });
  assert('gate_id deterministic', r1.gate_id === r2.gate_id);
  assert('gate_id sha256', /^[a-f0-9]{64}$/.test(r1.gate_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE });
  const v = validateEvidenceReuseGate(r);
  assert('validate allowed → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = evaluateEvidenceReuseGate({ ...BASE, pass_gold: false });
  const v = validateEvidenceReuseGate(r);
  assert('validate blocked → valid=true struct', v.valid === true);
}
{
  const v = validateEvidenceReuseGate(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = evaluateEvidenceReuseGate({ ...BASE });
  const s = renderEvidenceReuseGate(r);
  assert('render string', typeof s === 'string');
  assert('render shows REUSE_ALLOWED', s.includes('REUSE_ALLOWED'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
}
{
  const r = evaluateEvidenceReuseGate({ ...BASE, pass_gold: false });
  const s = renderEvidenceReuseGate(r);
  assert('render blocked shows NO_PASS_GOLD', s.includes('REUSE_BLOCKED_NO_PASS_GOLD'));
}
{
  const s = renderEvidenceReuseGate(null);
  assert('render null graceful', typeof s === 'string');
}

// --- statuses export ---
console.log('--- statuses export ---');
{
  assert('is array', Array.isArray(EVIDENCE_REUSE_STATUSES));
  assert('length=8', EVIDENCE_REUSE_STATUSES.length === 8);
  for (const s of [
    'REUSE_BLOCKED_INPUT', 'REUSE_BLOCKED_INVALID_HASH',
    'REUSE_BLOCKED_BRANCH_MISMATCH', 'REUSE_BLOCKED_BASELINE_INCOMPATIBLE',
    'REUSE_BLOCKED_NO_PASS_GOLD', 'REUSE_BLOCKED_MISSION_MISMATCH',
    'REUSE_BLOCKED_STALE_CACHE', 'REUSE_ALLOWED',
  ]) {
    assert(`${s} present`, EVIDENCE_REUSE_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
