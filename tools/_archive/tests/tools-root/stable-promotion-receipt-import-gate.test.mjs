#!/usr/bin/env node
/**
 * Tests — Stable Promotion Receipt Import Gate V123.0
 */

import {
  evaluateStablePromotionReceiptImportGate,
  validateStablePromotionReceiptImportGate,
  renderStablePromotionReceiptImportGate,
  RECEIPT_IMPORT_GATE_STATUSES,
  ALLOWED_RECEIPT_SOURCES,
} from '../stable-promotion-receipt-import-gate.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_SEAL = {
  seal_ready:        true,
  seal_id:           'seal-001',
  target_stable_ref: 'stable',
  target_tag:        'v1.0.0',
};

const GOOD_PARAMS = {
  stable_promotion_command_seal: GOOD_SEAL,
  receipt_source:                'human_manual_import',
  allow_real_receipt:            true,
};

console.log('\n=== stable-promotion-receipt-import-gate tests ===\n');

console.log('--- null seal ---');
{
  const r = evaluateStablePromotionReceiptImportGate({});
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_BLOCKED_SEAL', 'null seal → BLOCKED_SEAL');
  assert(r.gate_open === false, 'gate_open false');
}

console.log('--- seal not ready ---');
{
  const r = evaluateStablePromotionReceiptImportGate({ stable_promotion_command_seal: { seal_ready: false } });
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_BLOCKED_SEAL', 'not-ready → BLOCKED_SEAL');
}

console.log('--- ci_environment blocked ---');
{
  const r = evaluateStablePromotionReceiptImportGate({ ...GOOD_PARAMS, ci_environment: true });
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_BLOCKED_CI', 'ci_environment → BLOCKED_CI');
  assert(r.gate_open === false, 'gate_open false');
}

console.log('--- github_actions blocked ---');
{
  const r = evaluateStablePromotionReceiptImportGate({ ...GOOD_PARAMS, github_actions: true });
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_BLOCKED_CI', 'github_actions → BLOCKED_CI');
}

console.log('--- blocked by default (no allow_real_receipt) ---');
{
  const r = evaluateStablePromotionReceiptImportGate({
    stable_promotion_command_seal: GOOD_SEAL,
    receipt_source: 'human_manual_import',
  });
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_BLOCKED_REAL_DEFAULT', 'default → BLOCKED_REAL_DEFAULT');
  assert(r.gate_open === false, 'gate_open false');
}

console.log('--- blocked by invalid source ---');
{
  const r = evaluateStablePromotionReceiptImportGate({
    ...GOOD_PARAMS,
    receipt_source: 'automated_source',
  });
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_BLOCKED_REAL_DEFAULT', 'invalid source → BLOCKED_REAL_DEFAULT');
}

console.log('--- gate open ---');
{
  const r = evaluateStablePromotionReceiptImportGate(GOOD_PARAMS);
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_OPEN', 'open status');
  assert(r.gate_open === true, 'gate_open true');
  assert(r.seal_id === 'seal-001', 'seal_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.receipt_source === 'human_manual_import', 'receipt_source set');
  assert(Array.isArray(r.allowed_sources), 'allowed_sources array');
  assert(typeof r.gate_id === 'string' && r.gate_id.length === 64, 'gate_id sha256');
  assert(r.schema_version === 'v123.0', 'schema version');
}

console.log('--- gate open with operator_verified_import ---');
{
  const r = evaluateStablePromotionReceiptImportGate({
    ...GOOD_PARAMS,
    receipt_source: 'operator_verified_import',
  });
  assert(r.gate_status === 'RECEIPT_IMPORT_GATE_OPEN', 'operator source → open');
  assert(r.receipt_source === 'operator_verified_import', 'source set');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = evaluateStablePromotionReceiptImportGate({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = evaluateStablePromotionReceiptImportGate(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'open: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(evaluateStablePromotionReceiptImportGate(GOOD_PARAMS).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(evaluateStablePromotionReceiptImportGate(GOOD_PARAMS).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(evaluateStablePromotionReceiptImportGate(GOOD_PARAMS).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(evaluateStablePromotionReceiptImportGate(GOOD_PARAMS).release_performed === false, 'release_performed=false');
}

console.log('--- auto_promotion_blocked=true ---');
{
  const r1 = evaluateStablePromotionReceiptImportGate({});
  assert(r1.auto_promotion_blocked === true, 'blocked: true');
  const r2 = evaluateStablePromotionReceiptImportGate(GOOD_PARAMS);
  assert(r2.auto_promotion_blocked === true, 'open: true');
}

console.log('--- real_execution_blocked_by_default=true ---');
{
  assert(evaluateStablePromotionReceiptImportGate(GOOD_PARAMS).real_execution_blocked_by_default === true, 'real_execution_blocked_by_default=true');
}

console.log('--- validate ---');
{
  const r = evaluateStablePromotionReceiptImportGate(GOOD_PARAMS);
  const v = validateStablePromotionReceiptImportGate(r);
  assert(v.valid === true, 'validate open');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionReceiptImportGate(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render open ---');
{
  const r = evaluateStablePromotionReceiptImportGate(GOOD_PARAMS);
  const txt = renderStablePromotionReceiptImportGate(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION RECEIPT IMPORT GATE'), 'render title');
  assert(txt.includes('RECEIPT_IMPORT_GATE_OPEN'), 'status in output');
  assert(txt.includes('auto_promotion_blocked:'), 'invariant in output');
}

console.log('--- render blocked ---');
{
  const r = evaluateStablePromotionReceiptImportGate({});
  const txt = renderStablePromotionReceiptImportGate(r);
  assert(txt.includes('RECEIPT IMPORT GATE BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(RECEIPT_IMPORT_GATE_STATUSES.includes('RECEIPT_IMPORT_GATE_OPEN'), 'open in statuses');
  assert(RECEIPT_IMPORT_GATE_STATUSES.includes('RECEIPT_IMPORT_GATE_BLOCKED_SEAL'), 'seal blocked in statuses');
  assert(RECEIPT_IMPORT_GATE_STATUSES.includes('RECEIPT_IMPORT_GATE_BLOCKED_REAL_DEFAULT'), 'default blocked in statuses');
  assert(RECEIPT_IMPORT_GATE_STATUSES.includes('RECEIPT_IMPORT_GATE_BLOCKED_CI'), 'ci blocked in statuses');
}

console.log('--- allowed_sources export ---');
{
  assert(ALLOWED_RECEIPT_SOURCES.includes('human_manual_import'), 'human_manual_import in allowed');
  assert(ALLOWED_RECEIPT_SOURCES.includes('operator_verified_import'), 'operator_verified_import in allowed');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
