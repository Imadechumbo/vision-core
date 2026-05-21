#!/usr/bin/env node
/**
 * Tests — Local Rollback Proof Gate V163.1
 */

import {
  buildLocalRollbackProofGate,
  validateLocalRollbackProofGate,
  renderLocalRollbackProofGate,
  LOCAL_ROLLBACK_PROOF_GATE_STATUSES,
} from '../local-rollback-proof-gate.mjs';

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

const VALID_INPUT = {
  rollback_proof_id: 'rbk-proof-001',
  snapshot_id: 'snap-001',
  receipt_id: 'receipt-v1621-001',
  before_hash: 'before-hash-001',
  after_hash: 'after-hash-001',
  rollback_target_hash: 'before-hash-001',
  rollback_command_hash: 'rbk-cmd-hash-001',
  rollback_dry_run_status: 'DRY_RUN_PASS',
  rollback_verified: true,
  local_only: true,
  production_touched: false,
};

console.log('\n=== local-rollback-proof-gate tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_ROLLBACK_PROOF_GATE_STATUSES));
assert('STATUSES has READY', LOCAL_ROLLBACK_PROOF_GATE_STATUSES.includes('LOCAL_ROLLBACK_PROOF_READY'));
assert('STATUSES has COMPLETED', LOCAL_ROLLBACK_PROOF_GATE_STATUSES.includes('LOCAL_ROLLBACK_PROOF_COMPLETED'));
assert('STATUSES has BLOCKED_INPUT', LOCAL_ROLLBACK_PROOF_GATE_STATUSES.includes('LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT'));
assert('STATUSES has BLOCKED_SNAPSHOT', LOCAL_ROLLBACK_PROOF_GATE_STATUSES.includes('LOCAL_ROLLBACK_PROOF_BLOCKED_SNAPSHOT'));
assert('STATUSES has BLOCKED_RECEIPT', LOCAL_ROLLBACK_PROOF_GATE_STATUSES.includes('LOCAL_ROLLBACK_PROOF_BLOCKED_RECEIPT'));
assert('buildLocalRollbackProofGate is function', typeof buildLocalRollbackProofGate === 'function');
assert('validateLocalRollbackProofGate is function', typeof validateLocalRollbackProofGate === 'function');
assert('renderLocalRollbackProofGate is function', typeof renderLocalRollbackProofGate === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalRollbackProofGate(null);
  assert('null → BLOCKED_INPUT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
}
{
  const r = buildLocalRollbackProofGate({});
  assert('empty obj → BLOCKED_INPUT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
}
{
  const r = buildLocalRollbackProofGate({ rollback_proof_id: '  ' });
  assert('blank id → BLOCKED_INPUT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
}

// --- blocked snapshot ---
console.log('--- blocked snapshot ---');
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, snapshot_id: '' });
  assert('missing snapshot_id → BLOCKED_SNAPSHOT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_SNAPSHOT');
}
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, snapshot_id: null });
  assert('null snapshot_id → BLOCKED_SNAPSHOT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_SNAPSHOT');
}

// --- blocked receipt ---
console.log('--- blocked receipt ---');
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, receipt_id: '' });
  assert('missing receipt_id → BLOCKED_RECEIPT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_RECEIPT');
}

// --- blocked hash ---
console.log('--- blocked hash ---');
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, before_hash: null });
  assert('null before_hash → BLOCKED_HASH', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_HASH');
}
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, rollback_target_hash: null });
  assert('null rollback_target_hash → BLOCKED_HASH', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_HASH');
}
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, rollback_command_hash: null });
  assert('null rollback_command_hash → BLOCKED_HASH', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_HASH');
}

// --- blocked scope ---
console.log('--- blocked scope ---');
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_INPUT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
  assert('local_only=false: production_touched=false', r.production_touched === false);
}
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_INPUT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
}
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, rollback_dry_run_status: null });
  assert('null dry_run_status → BLOCKED_INPUT', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_BLOCKED_INPUT');
}

// --- rollback ready ---
console.log('--- rollback ready ---');
{
  const r = buildLocalRollbackProofGate(VALID_INPUT);
  assert('valid input → READY', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_READY');
  assert('ready: local_only=true', r.local_only === true);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: schema_version=v163.1', r.schema_version === 'v163.1');
  assert('ready: rollback_verified=true', r.rollback_verified === true);
  assert('ready: rollback_completed=false', r.rollback_completed === false);
  assert('ready: snapshot_id set', r.snapshot_id === 'snap-001');
  assert('ready: receipt_id set', r.receipt_id === 'receipt-v1621-001');
}

// --- rollback completed ---
console.log('--- rollback completed ---');
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, rollback_verified: true, rollback_completed: true });
  assert('rollback_verified+completed → COMPLETED', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_COMPLETED');
  assert('completed: rollback_verified=true', r.rollback_verified === true);
  assert('completed: rollback_completed=true', r.rollback_completed === true);
  assert('completed: production_touched=false', r.production_touched === false);
}
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, rollback_verified: false, rollback_completed: true });
  assert('completed without verified → READY', r.rollback_proof_status === 'LOCAL_ROLLBACK_PROOF_READY');
  assert('unverified completed: rollback_completed=false', r.rollback_completed === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildLocalRollbackProofGate(VALID_INPUT);
  const v = validateLocalRollbackProofGate(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildLocalRollbackProofGate({ ...VALID_INPUT, rollback_verified: true, rollback_completed: true });
  const v = validateLocalRollbackProofGate(r);
  assert('validate completed: valid=true', v.valid === true);
}
{
  const r = buildLocalRollbackProofGate(null);
  const v = validateLocalRollbackProofGate(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateLocalRollbackProofGate(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildLocalRollbackProofGate(VALID_INPUT);
  const s = renderLocalRollbackProofGate(r);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains READY', s.includes('READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderLocalRollbackProofGate(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalRollbackProofGate(null),
    buildLocalRollbackProofGate({}),
    buildLocalRollbackProofGate(VALID_INPUT),
    buildLocalRollbackProofGate({ ...VALID_INPUT, rollback_verified: true, rollback_completed: true }),
    buildLocalRollbackProofGate({ ...VALID_INPUT, local_only: false }),
    buildLocalRollbackProofGate({ ...VALID_INPUT, production_touched: true }),
  ];
  assert('all cases: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all cases: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all cases: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all cases: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all cases: local_only=true', cases.every(r => r.local_only === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
