#!/usr/bin/env node
/**
 * Tests — Local Execution Receipt Builder V162.1
 */

import {
  buildLocalExecutionReceipt,
  validateLocalExecutionReceipt,
  renderLocalExecutionReceipt,
  LOCAL_EXECUTION_RECEIPT_STATUSES,
} from '../local-execution-receipt-builder.mjs';

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
  local_execution_proof_captured: true,
  proof_id: 'proof-v162-001',
  drill_id: 'drill-v161-001',
  mission_id: 'mission-001',
  command_hash: 'abc123def456',
  before_hash: 'before-hash-001',
  after_hash: 'after-hash-001',
  stdout_hash: 'stdout-hash-001',
  stderr_hash: 'stderr-hash-001',
  exit_code: 0,
  production_touched: false,
};

const VALID_INPUT = {
  receipt_id: 'receipt-v1621-001',
  proof: VALID_PROOF,
  proof_hash: 'proof-hash-abc123',
};

console.log('\n=== local-execution-receipt-builder tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_RECEIPT_STATUSES));
assert('STATUSES has READY', LOCAL_EXECUTION_RECEIPT_STATUSES.includes('LOCAL_EXECUTION_RECEIPT_READY'));
assert('STATUSES has BLOCKED_INPUT', LOCAL_EXECUTION_RECEIPT_STATUSES.includes('LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT'));
assert('STATUSES has BLOCKED_PROOF', LOCAL_EXECUTION_RECEIPT_STATUSES.includes('LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF'));
assert('STATUSES has BLOCKED_HASH', LOCAL_EXECUTION_RECEIPT_STATUSES.includes('LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH'));
assert('buildLocalExecutionReceipt is function', typeof buildLocalExecutionReceipt === 'function');
assert('validateLocalExecutionReceipt is function', typeof validateLocalExecutionReceipt === 'function');
assert('renderLocalExecutionReceipt is function', typeof renderLocalExecutionReceipt === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalExecutionReceipt(null);
  assert('null → BLOCKED_INPUT', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
}
{
  const r = buildLocalExecutionReceipt({});
  assert('empty obj → BLOCKED_INPUT', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionReceipt({ receipt_id: '  ' });
  assert('blank receipt_id → BLOCKED_INPUT', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_INPUT');
}

// --- blocked proof ---
console.log('--- blocked proof ---');
{
  const r = buildLocalExecutionReceipt({ receipt_id: 'r1', proof: null });
  assert('null proof → BLOCKED_PROOF', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF');
}
{
  const r = buildLocalExecutionReceipt({
    receipt_id: 'r1',
    proof: { ...VALID_PROOF, proof_status: 'LOCAL_EXECUTION_PROOF_INVALID' },
    proof_hash: 'hash',
  });
  assert('invalid proof_status → BLOCKED_PROOF', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF');
}
{
  const r = buildLocalExecutionReceipt({
    receipt_id: 'r1',
    proof: { ...VALID_PROOF, local_execution_proof_captured: false },
    proof_hash: 'hash',
  });
  assert('proof_captured=false → BLOCKED_PROOF', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF');
}
{
  const r = buildLocalExecutionReceipt({
    receipt_id: 'r1',
    proof: { ...VALID_PROOF, production_touched: true },
    proof_hash: 'hash',
  });
  assert('production_touched=true in proof → BLOCKED_PROOF', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_PROOF');
}

// --- blocked hash ---
console.log('--- blocked hash ---');
{
  const r = buildLocalExecutionReceipt({ receipt_id: 'r1', proof: VALID_PROOF, proof_hash: '' });
  assert('empty proof_hash → BLOCKED_HASH', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH');
}
{
  const r = buildLocalExecutionReceipt({ receipt_id: 'r1', proof: VALID_PROOF });
  assert('missing proof_hash → BLOCKED_HASH', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH');
}
{
  const r = buildLocalExecutionReceipt({
    receipt_id: 'r1',
    proof: { ...VALID_PROOF, before_hash: null },
    proof_hash: 'hash',
  });
  assert('null before_hash in proof → BLOCKED_HASH', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_BLOCKED_HASH');
}

// --- receipt ready ---
console.log('--- receipt ready ---');
{
  const r = buildLocalExecutionReceipt(VALID_INPUT);
  assert('valid input → READY', r.receipt_status === 'LOCAL_EXECUTION_RECEIPT_READY');
  assert('ready: local_execution_receipt_ready=true', r.local_execution_receipt_ready === true);
  assert('ready: receipt_sealed=true', r.receipt_sealed === true);
  assert('ready: local_only=true', r.local_only === true);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
  assert('ready: schema_version=v162.1', r.schema_version === 'v162.1');
  assert('ready: receipt_id set', r.receipt_id === 'receipt-v1621-001');
  assert('ready: receipt_hash is string', typeof r.receipt_hash === 'string' && r.receipt_hash.length > 0);
  assert('ready: proof_id set', r.proof_id === 'proof-v162-001');
  assert('ready: proof_hash set', r.proof_hash === 'proof-hash-abc123');
  assert('ready: drill_id set', r.drill_id === 'drill-v161-001');
  assert('ready: before_hash set', r.before_hash === 'before-hash-001');
  assert('ready: after_hash set', r.after_hash === 'after-hash-001');
  assert('ready: exit_code=0', r.exit_code === 0);
}

// --- hash deterministic ---
console.log('--- hash deterministic ---');
{
  const r1 = buildLocalExecutionReceipt(VALID_INPUT);
  const r2 = buildLocalExecutionReceipt(VALID_INPUT);
  assert('receipt_hash deterministic', r1.receipt_hash === r2.receipt_hash);
}

// --- validate ready ---
console.log('--- validate ready ---');
{
  const r = buildLocalExecutionReceipt(VALID_INPUT);
  const v = validateLocalExecutionReceipt(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}

// --- validate blocked ---
console.log('--- validate blocked ---');
{
  const r = buildLocalExecutionReceipt(null);
  const v = validateLocalExecutionReceipt(r);
  assert('validate blocked: invariants hold', v.valid === true);
}
{
  const v = validateLocalExecutionReceipt(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ready ---
console.log('--- render ready ---');
{
  const r = buildLocalExecutionReceipt(VALID_INPUT);
  const s = renderLocalExecutionReceipt(r);
  assert('render ready: is string', typeof s === 'string');
  assert('render ready: contains READY', s.includes('READY'));
  assert('render ready: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}

// --- render blocked ---
console.log('--- render blocked ---');
{
  const r = buildLocalExecutionReceipt(null);
  const s = renderLocalExecutionReceipt(r);
  assert('render blocked: is string', typeof s === 'string');
  assert('render blocked: contains BLOCKED', s.includes('BLOCKED'));
}
{
  const s = renderLocalExecutionReceipt(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalExecutionReceipt(null),
    buildLocalExecutionReceipt({}),
    buildLocalExecutionReceipt(VALID_INPUT),
    buildLocalExecutionReceipt({ receipt_id: 'r1', proof: null }),
    buildLocalExecutionReceipt({ receipt_id: 'r1', proof: VALID_PROOF, proof_hash: '' }),
    buildLocalExecutionReceipt({ receipt_id: 'r1', proof: { ...VALID_PROOF, production_touched: true }, proof_hash: 'h' }),
  ];
  assert('all cases: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all cases: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all cases: release_performed=false', cases.every(r => r.release_performed === false));
  assert('all cases: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all cases: local_only=true', cases.every(r => r.local_only === true));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
