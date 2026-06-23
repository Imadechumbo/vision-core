#!/usr/bin/env node
/**
 * Tests — Real Execution Proof Receipt V154.0
 */

import {
  buildRealExecutionProofReceipt,
  validateRealExecutionProofReceipt,
  renderRealExecutionProofReceipt,
  EXECUTION_RECEIPT_STATUSES,
} from '../real-execution-proof-receipt.mjs';

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
  receipt_id:             'v154.0-receipt',
  command_type:           'CONTROLLED_RUNTIME_EXECUTION',
  dry_run_proof_id:       'dry-run-proof-001',
  dry_run_proof_verified: true,
  snapshot_id:            'v153.1-snapshot',
  rollback_plan_id:       'rbp-001',
  issued_at:              '2026-05-21T22:00:00.000Z',
};

console.log('\n=== real-execution-proof-receipt tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealExecutionProofReceipt({});
  assert('no receipt_id → BLOCKED_INPUT', r.execution_receipt_status === 'EXECUTION_RECEIPT_BLOCKED_INPUT');
  assert('receipt_ready=false', r.receipt_ready === false);
  assert('no_real_execution_performed=true', r.no_real_execution_performed === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildRealExecutionProofReceipt(null);
  assert('null → BLOCKED_INPUT', r.execution_receipt_status === 'EXECUTION_RECEIPT_BLOCKED_INPUT');
}
{
  const r = buildRealExecutionProofReceipt({ receipt_id: 'r1' });
  assert('no command_type → BLOCKED_INPUT', r.execution_receipt_status === 'EXECUTION_RECEIPT_BLOCKED_INPUT');
}

// --- blocked proof ---
console.log('--- blocked proof ---');
{
  const r = buildRealExecutionProofReceipt({ receipt_id: 'r2', command_type: 'CONTROLLED_RUNTIME_EXECUTION' });
  assert('no proof → BLOCKED_PROOF', r.execution_receipt_status === 'EXECUTION_RECEIPT_BLOCKED_PROOF');
  assert('receipt_ready=false', r.receipt_ready === false);
}
{
  const r = buildRealExecutionProofReceipt({
    receipt_id: 'r2', command_type: 'CONTROLLED_RUNTIME_EXECUTION',
    dry_run_proof_id: 'proof-001', dry_run_proof_verified: false,
  });
  assert('proof_verified=false → BLOCKED_PROOF', r.execution_receipt_status === 'EXECUTION_RECEIPT_BLOCKED_PROOF');
}

// --- ready dry run ---
console.log('--- ready dry run ---');
{
  const r = buildRealExecutionProofReceipt({ ...FULL_READY });
  assert('all ready → EXECUTION_RECEIPT_READY_DRY_RUN', r.execution_receipt_status === 'EXECUTION_RECEIPT_READY_DRY_RUN');
  assert('receipt_ready=true', r.receipt_ready === true);
  assert('schema_version=v154.0', r.schema_version === 'v154.0');
  assert('receipt_id propagated', r.receipt_id === 'v154.0-receipt');
  assert('command_type propagated', r.command_type === 'CONTROLLED_RUNTIME_EXECUTION');
  assert('dry_run_proof_id propagated', r.dry_run_proof_id === 'dry-run-proof-001');
  assert('snapshot_id propagated', r.snapshot_id === 'v153.1-snapshot');
  assert('rollback_plan_id propagated', r.rollback_plan_id === 'rbp-001');
  assert('issued_at propagated', r.issued_at === '2026-05-21T22:00:00.000Z');
  assert('no_real_execution_performed=true', r.no_real_execution_performed === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildRealExecutionProofReceipt({ ...FULL_READY });
  const r2 = buildRealExecutionProofReceipt({ ...FULL_READY });
  assert('receipt_id_hash deterministic', r1.receipt_id_hash === r2.receipt_id_hash);
  assert('receipt_id_hash sha256', /^[a-f0-9]{64}$/.test(r1.receipt_id_hash));
}
{
  const r1 = buildRealExecutionProofReceipt({ ...FULL_READY, receipt_id: 'a' });
  const r2 = buildRealExecutionProofReceipt({ ...FULL_READY, receipt_id: 'b' });
  assert('different receipt_id → different hash', r1.receipt_id_hash !== r2.receipt_id_hash);
}

// --- issued_at default ---
{
  const r = buildRealExecutionProofReceipt({});
  assert('no issued_at → auto ISO', typeof r.issued_at === 'string' && r.issued_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildRealExecutionProofReceipt({}),
    buildRealExecutionProofReceipt({ ...FULL_READY }),
    buildRealExecutionProofReceipt({ receipt_id: 'rx', command_type: 'CONTROLLED_DEPLOY' }),
  ];
  for (const r of cases) {
    assert(`no_real_execution_performed=true [${r.execution_receipt_status}]`, r.no_real_execution_performed === true);
    assert(`execution_performed=false [${r.execution_receipt_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.execution_receipt_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.execution_receipt_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.execution_receipt_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealExecutionProofReceipt({ ...FULL_READY });
  const v = validateRealExecutionProofReceipt(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildRealExecutionProofReceipt({});
  const v = validateRealExecutionProofReceipt(r);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateRealExecutionProofReceipt(null).valid === false);
}
{
  const r = buildRealExecutionProofReceipt({ ...FULL_READY });
  assert('no_real_execution tampered → invalid', validateRealExecutionProofReceipt({ ...r, no_real_execution_performed: false }).valid === false);
}
{
  const r = buildRealExecutionProofReceipt({ ...FULL_READY });
  assert('execution_performed tampered → invalid', validateRealExecutionProofReceipt({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildRealExecutionProofReceipt({ ...FULL_READY });
  assert('READY with proof_verified=false → invalid', validateRealExecutionProofReceipt({ ...r, dry_run_proof_verified: false }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealExecutionProofReceipt({ ...FULL_READY });
  const s = renderRealExecutionProofReceipt(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY_DRY_RUN', s.includes('EXECUTION_RECEIPT_READY_DRY_RUN'));
  assert('render shows REGRA', s.includes('no_real_execution_performed=true'));
  assert('render shows receipt_id', s.includes('v154.0-receipt'));
  assert('render shows command_type', s.includes('CONTROLLED_RUNTIME_EXECUTION'));
}
{
  const r = buildRealExecutionProofReceipt({});
  const s = renderRealExecutionProofReceipt(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderRealExecutionProofReceipt(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('EXECUTION_RECEIPT_STATUSES is array', Array.isArray(EXECUTION_RECEIPT_STATUSES));
  assert('EXECUTION_RECEIPT_STATUSES length=3', EXECUTION_RECEIPT_STATUSES.length === 3);
  for (const s of ['EXECUTION_RECEIPT_BLOCKED_INPUT','EXECUTION_RECEIPT_BLOCKED_PROOF','EXECUTION_RECEIPT_READY_DRY_RUN']) {
    assert(`status present: ${s}`, EXECUTION_RECEIPT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
