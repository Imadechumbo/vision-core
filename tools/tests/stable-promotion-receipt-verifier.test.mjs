#!/usr/bin/env node
/**
 * Tests — Stable Promotion Receipt Verifier V123.1
 */

import {
  verifyStablePromotionReceipt,
  validateStablePromotionReceiptVerifier,
  renderStablePromotionReceiptVerifier,
  RECEIPT_VERIFIER_STATUSES,
} from '../stable-promotion-receipt-verifier.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_GATE = {
  gate_open:         true,
  gate_id:           'gate-001',
  target_stable_ref: 'stable',
  target_tag:        'v1.0.0',
  seal_id:           'seal-001',
  receipt_source:    'human_manual_import',
};

const GOOD_RECEIPT = {
  receipt_id:        'receipt-001',
  target_stable_ref: 'stable',
  target_tag:        'v1.0.0',
  seal_id:           'seal-001',
};

const MISMATCHED_RECEIPT = {
  receipt_id:        'receipt-002',
  target_stable_ref: 'stable',
  target_tag:        'v9.9.9',
  seal_id:           'different-seal',
};

console.log('\n=== stable-promotion-receipt-verifier tests ===\n');

console.log('--- null gate ---');
{
  const r = verifyStablePromotionReceipt({ imported_receipt: GOOD_RECEIPT });
  assert(r.verifier_status === 'RECEIPT_VERIFIER_BLOCKED_GATE', 'null gate → BLOCKED_GATE');
  assert(r.receipt_verified === false, 'receipt_verified false');
}

console.log('--- gate not open ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: { gate_open: false }, imported_receipt: GOOD_RECEIPT });
  assert(r.verifier_status === 'RECEIPT_VERIFIER_BLOCKED_GATE', 'gate not open → BLOCKED_GATE');
}

console.log('--- null receipt ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE });
  assert(r.verifier_status === 'RECEIPT_VERIFIER_BLOCKED_RECEIPT', 'null receipt → BLOCKED_RECEIPT');
  assert(r.receipt_verified === false, 'receipt_verified false');
}

console.log('--- receipt no receipt_id ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: {} });
  assert(r.verifier_status === 'RECEIPT_VERIFIER_BLOCKED_RECEIPT', 'no receipt_id → BLOCKED_RECEIPT');
}

console.log('--- mismatch ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: MISMATCHED_RECEIPT });
  assert(r.verifier_status === 'RECEIPT_VERIFIER_MISMATCH', 'mismatch → MISMATCH status');
  assert(r.receipt_verified === false, 'receipt_verified false');
  assert(r.target_ref_match === true, 'ref matches (both stable)');
  assert(r.target_tag_match === false, 'tag mismatch');
  assert(r.seal_match === false, 'seal mismatch');
  assert(typeof r.mismatch_details === 'object', 'mismatch_details object');
}

console.log('--- verified ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r.verifier_status === 'RECEIPT_VERIFIER_VERIFIED', 'verified status');
  assert(r.receipt_verified === true, 'receipt_verified true');
  assert(r.gate_id === 'gate-001', 'gate_id propagated');
  assert(r.receipt_id === 'receipt-001', 'receipt_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.seal_id === 'seal-001', 'seal_id propagated');
  assert(r.receipt_source === 'human_manual_import', 'receipt_source propagated');
  assert(r.target_ref_match === true, 'ref_match true');
  assert(r.target_tag_match === true, 'tag_match true');
  assert(r.seal_match === true, 'seal_match true');
  assert(typeof r.verifier_id === 'string' && r.verifier_id.length === 64, 'verifier_id sha256');
  assert(r.schema_version === 'v123.1', 'schema version');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = verifyStablePromotionReceipt({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r2.stable_promotion_allowed === false, 'verified: false');
}

console.log('--- stable_promoted=false ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- auto_promotion_blocked=true ---');
{
  const r1 = verifyStablePromotionReceipt({});
  assert(r1.auto_promotion_blocked === true, 'blocked: true');
  const r2 = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r2.auto_promotion_blocked === true, 'verified: true');
}

console.log('--- no_auto_promotion_from_receipt=true ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  assert(r.no_auto_promotion_from_receipt === true, 'no_auto_promotion_from_receipt=true');
}

console.log('--- validate ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  const v = validateStablePromotionReceiptVerifier(r);
  assert(v.valid === true, 'validate verified');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionReceiptVerifier(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render verified ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: GOOD_RECEIPT });
  const txt = renderStablePromotionReceiptVerifier(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION RECEIPT VERIFIER'), 'render title');
  assert(txt.includes('RECEIPT_VERIFIER_VERIFIED'), 'status in output');
  assert(txt.includes('auto_promotion_blocked:'), 'invariant in output');
  assert(txt.includes('no_auto_promotion_from_receipt:'), 'no-auto field in output');
}

console.log('--- render mismatch ---');
{
  const r = verifyStablePromotionReceipt({ stable_promotion_receipt_import_gate: GOOD_GATE, imported_receipt: MISMATCHED_RECEIPT });
  const txt = renderStablePromotionReceiptVerifier(r);
  assert(txt.includes('RECEIPT_VERIFIER_MISMATCH'), 'mismatch status in output');
  assert(txt.includes('MISMATCH DETAILS'), 'mismatch details section');
}

console.log('--- render blocked ---');
{
  const r = verifyStablePromotionReceipt({});
  const txt = renderStablePromotionReceiptVerifier(r);
  assert(txt.includes('RECEIPT VERIFIER BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(RECEIPT_VERIFIER_STATUSES.includes('RECEIPT_VERIFIER_VERIFIED'), 'verified in statuses');
  assert(RECEIPT_VERIFIER_STATUSES.includes('RECEIPT_VERIFIER_MISMATCH'), 'mismatch in statuses');
  assert(RECEIPT_VERIFIER_STATUSES.includes('RECEIPT_VERIFIER_BLOCKED_GATE'), 'gate blocked in statuses');
  assert(RECEIPT_VERIFIER_STATUSES.includes('RECEIPT_VERIFIER_BLOCKED_RECEIPT'), 'receipt blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
