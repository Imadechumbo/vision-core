#!/usr/bin/env node
/**
 * Tests — Local Execution Evidence Package V164.1
 */

import {
  buildLocalExecutionEvidencePackage,
  validateLocalExecutionEvidencePackage,
  renderLocalExecutionEvidencePackage,
  LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES,
} from '../local-execution-evidence-package.mjs';

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

const VALID_PROOF = {
  proof_status: 'LOCAL_EXECUTION_PROOF_CAPTURED',
  proof_id: 'proof-001',
};

const VALID_RECEIPT = {
  receipt_status: 'LOCAL_EXECUTION_RECEIPT_READY',
  receipt_id: 'receipt-001',
};

const VALID_LEDGER = {
  ledger_status: 'LOCAL_EXECUTION_LEDGER_READY',
  ledger_id: 'ledger-001',
};

const VALID_ROLLBACK = {
  rollback_proof_gate_status: 'LOCAL_ROLLBACK_PROOF_GATE_READY',
  rollback_proof_id: 'rollback-001',
};

const VALID_POST_STATE = {
  post_state_status: 'LOCAL_POST_STATE_VERIFIED',
  post_state_verified: true,
  post_state_id: 'post-state-001',
};

const VALID_INPUT = {
  evidence_package_id: 'evidence-pkg-001',
  proof: VALID_PROOF,
  receipt: VALID_RECEIPT,
  ledger: VALID_LEDGER,
  rollback_gate: VALID_ROLLBACK,
  post_state: VALID_POST_STATE,
  local_only: true,
  production_touched: false,
};

console.log('\n=== local-execution-evidence-package tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES));
assert('has SEALED', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_SEALED'));
assert('has INCOMPLETE', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_INCOMPLETE'));
assert('has BLOCKED_INPUT', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_BLOCKED_INPUT'));
assert('has BLOCKED_PROOF', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_BLOCKED_PROOF'));
assert('has BLOCKED_RECEIPT', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_BLOCKED_RECEIPT'));
assert('has BLOCKED_LEDGER', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_BLOCKED_LEDGER'));
assert('has BLOCKED_ROLLBACK', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_BLOCKED_ROLLBACK'));
assert('has BLOCKED_POST_STATE', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_BLOCKED_POST_STATE'));
assert('has BLOCKED_PRODUCTION', LOCAL_EXECUTION_EVIDENCE_PACKAGE_STATUSES.includes('LOCAL_EVIDENCE_BLOCKED_PRODUCTION'));
assert('build is function', typeof buildLocalExecutionEvidencePackage === 'function');
assert('validate is function', typeof validateLocalExecutionEvidencePackage === 'function');
assert('render is function', typeof renderLocalExecutionEvidencePackage === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalExecutionEvidencePackage(null);
  assert('null → BLOCKED_INPUT', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_INPUT');
  assert('null: local_only=true', r.local_only === true);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildLocalExecutionEvidencePackage({});
  assert('empty → BLOCKED_INPUT', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionEvidencePackage({ evidence_package_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_INPUT');
}

// --- blocked production ---
console.log('--- blocked production ---');
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_PRODUCTION', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_PRODUCTION');
  assert('production: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_PRODUCTION', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_PRODUCTION');
}

// --- blocked proof ---
console.log('--- blocked proof ---');
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, proof: null });
  assert('null proof → BLOCKED_PROOF', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_PROOF');
}
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, proof: { proof_status: 'LOCAL_EXECUTION_PROOF_INVALID' } });
  assert('wrong proof_status → BLOCKED_PROOF', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_PROOF');
}

// --- blocked receipt ---
console.log('--- blocked receipt ---');
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, receipt: null });
  assert('null receipt → BLOCKED_RECEIPT', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_RECEIPT');
}
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, receipt: { receipt_status: 'LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT' } });
  assert('wrong receipt_status → BLOCKED_RECEIPT', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_RECEIPT');
}

// --- blocked ledger ---
console.log('--- blocked ledger ---');
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, ledger: null });
  assert('null ledger → BLOCKED_LEDGER', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_LEDGER');
}
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, ledger: { ledger_status: 'LOCAL_EXECUTION_LEDGER_EMPTY' } });
  assert('wrong ledger_status → BLOCKED_LEDGER', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_LEDGER');
}

// --- blocked rollback ---
console.log('--- blocked rollback ---');
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, rollback_gate: null });
  assert('null rollback_gate → BLOCKED_ROLLBACK', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_ROLLBACK');
}
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, rollback_gate: { rollback_proof_gate_status: 'LOCAL_ROLLBACK_PROOF_GATE_BLOCKED_INPUT' } });
  assert('wrong rollback_gate_status → BLOCKED_ROLLBACK', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_ROLLBACK');
}
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, rollback_gate: { rollback_proof_gate_status: 'LOCAL_ROLLBACK_PROOF_GATE_COMPLETED', rollback_proof_id: 'rb-002' } });
  assert('COMPLETED rollback_gate_status → SEALED', r.evidence_package_status === 'LOCAL_EVIDENCE_SEALED');
}

// --- blocked post state ---
console.log('--- blocked post state ---');
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, post_state: null });
  assert('null post_state → BLOCKED_POST_STATE', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_POST_STATE');
}
{
  const r = buildLocalExecutionEvidencePackage({ ...VALID_INPUT, post_state: { post_state_status: 'LOCAL_POST_STATE_MISMATCH', post_state_verified: false, post_state_id: 'ps-001' } });
  assert('MISMATCH post_state → BLOCKED_POST_STATE', r.evidence_package_status === 'LOCAL_EVIDENCE_BLOCKED_POST_STATE');
}

// --- sealed ---
console.log('--- sealed ---');
{
  const r = buildLocalExecutionEvidencePackage(VALID_INPUT);
  assert('valid input → SEALED', r.evidence_package_status === 'LOCAL_EVIDENCE_SEALED');
  assert('sealed: evidence_sealed=true', r.evidence_sealed === true);
  assert('sealed: local_only=true', r.local_only === true);
  assert('sealed: production_touched=false', r.production_touched === false);
  assert('sealed: deploy_performed=false', r.deploy_performed === false);
  assert('sealed: stable_promoted=false', r.stable_promoted === false);
  assert('sealed: release_performed=false', r.release_performed === false);
  assert('sealed: schema_version=v164.1', r.schema_version === 'v164.1');
  assert('sealed: evidence_package_id set', r.evidence_package_id === 'evidence-pkg-001');
  assert('sealed: proof_id set', r.proof_id === 'proof-001');
  assert('sealed: receipt_id set', r.receipt_id === 'receipt-001');
  assert('sealed: ledger_id set', r.ledger_id === 'ledger-001');
  assert('sealed: rollback_proof_id set', r.rollback_proof_id === 'rollback-001');
  assert('sealed: post_state_id set', r.post_state_id === 'post-state-001');
  assert('sealed: evidence_hash is string', typeof r.evidence_hash === 'string' && r.evidence_hash.length > 0);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildLocalExecutionEvidencePackage(VALID_INPUT);
  const v = validateLocalExecutionEvidencePackage(r);
  assert('validate sealed: valid=true', v.valid === true);
  assert('validate sealed: no errors', v.errors.length === 0);
}
{
  const r = buildLocalExecutionEvidencePackage(null);
  const v = validateLocalExecutionEvidencePackage(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateLocalExecutionEvidencePackage(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildLocalExecutionEvidencePackage(VALID_INPUT);
  const s = renderLocalExecutionEvidencePackage(r);
  assert('render sealed: is string', typeof s === 'string');
  assert('render sealed: contains SEALED', s.includes('SEALED'));
  assert('render sealed: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderLocalExecutionEvidencePackage(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalExecutionEvidencePackage(null),
    buildLocalExecutionEvidencePackage({}),
    buildLocalExecutionEvidencePackage(VALID_INPUT),
    buildLocalExecutionEvidencePackage({ ...VALID_INPUT, local_only: false }),
    buildLocalExecutionEvidencePackage({ ...VALID_INPUT, production_touched: true }),
    buildLocalExecutionEvidencePackage({ ...VALID_INPUT, proof: null }),
    buildLocalExecutionEvidencePackage({ ...VALID_INPUT, post_state: { post_state_status: 'LOCAL_POST_STATE_MISMATCH', post_state_verified: false, post_state_id: 'ps-x' } }),
  ];
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: local_only=true', cases.every(r => r.local_only === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
