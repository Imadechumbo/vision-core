#!/usr/bin/env node
/**
 * Tests — Stable Promotion Post-Receipt Report V124.1
 */

import {
  buildPostReceiptReport,
  validatePostReceiptReport,
  renderPostReceiptReport,
  POST_RECEIPT_REPORT_STATUSES,
} from '../stable-promotion-post-receipt-report.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_LEDGER = {
  ledger_status:        'POST_RECEIPT_LEDGER_ACTIVE',
  ledger_hash:          'ledger-hash-001',
  event_count:          3,
  has_verified_receipt: true,
  has_mismatch:         false,
  has_rejected:         false,
  governance_complete:  true,
  events: [
    { sequence: 0, event_type: 'STABLE_PROMOTION_RECEIPT_IMPORTED', event_hash: 'h0' },
    { sequence: 1, event_type: 'STABLE_PROMOTION_RECEIPT_VERIFIED',  event_hash: 'h1' },
    { sequence: 2, event_type: 'STABLE_PROMOTION_GOVERNANCE_COMPLETE', event_hash: 'h2' },
  ],
};

const GOOD_VERIFIER = {
  verifier_id:      'verifier-001',
  verifier_status:  'RECEIPT_VERIFIER_VERIFIED',
  receipt_verified: true,
};

const MISMATCH_VERIFIER = {
  verifier_id:      'verifier-002',
  verifier_status:  'RECEIPT_VERIFIER_MISMATCH',
  receipt_verified: false,
};

console.log('\n=== stable-promotion-post-receipt-report tests ===\n');

console.log('--- null ledger ---');
{
  const r = buildPostReceiptReport({ stable_promotion_receipt_verifier: GOOD_VERIFIER });
  assert(r.report_status === 'POST_RECEIPT_REPORT_BLOCKED_LEDGER', 'null ledger → BLOCKED_LEDGER');
  assert(r.report_ready === false, 'report_ready false');
}

console.log('--- empty ledger ---');
{
  const r = buildPostReceiptReport({
    stable_promotion_post_receipt_ledger: { ledger_status: 'POST_RECEIPT_LEDGER_EMPTY', events: [] },
    stable_promotion_receipt_verifier: GOOD_VERIFIER,
  });
  assert(r.report_status === 'POST_RECEIPT_REPORT_BLOCKED_LEDGER', 'empty ledger → BLOCKED_LEDGER');
}

console.log('--- null verifier ---');
{
  const r = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER });
  assert(r.report_status === 'POST_RECEIPT_REPORT_BLOCKED_VERIFIER', 'null verifier → BLOCKED_VERIFIER');
  assert(r.report_ready === false, 'report_ready false');
}

console.log('--- mismatch verifier ---');
{
  const r = buildPostReceiptReport({
    stable_promotion_post_receipt_ledger: GOOD_LEDGER,
    stable_promotion_receipt_verifier:    MISMATCH_VERIFIER,
  });
  assert(r.report_status === 'POST_RECEIPT_REPORT_MISMATCH', 'mismatch verifier → MISMATCH');
  assert(r.report_ready === false, 'report_ready false');
}

console.log('--- report ready ---');
{
  const r = buildPostReceiptReport({
    stable_promotion_post_receipt_ledger: GOOD_LEDGER,
    stable_promotion_receipt_verifier:    GOOD_VERIFIER,
  });
  assert(r.report_status === 'POST_RECEIPT_REPORT_READY', 'ready status');
  assert(r.report_ready === true, 'report_ready true');
  assert(r.ledger_hash === 'ledger-hash-001', 'ledger_hash propagated');
  assert(r.verifier_id === 'verifier-001', 'verifier_id propagated');
  assert(r.verifier_status === 'RECEIPT_VERIFIER_VERIFIED', 'verifier_status propagated');
  assert(r.receipt_verified === true, 'receipt_verified propagated');
  assert(r.has_verified_receipt === true, 'has_verified_receipt propagated');
  assert(r.governance_complete === true, 'governance_complete propagated');
  assert(r.total_events === 3, 'total_events 3');
  assert(Array.isArray(r.event_summary), 'event_summary array');
  assert(r.event_summary.length === 3, 'event_summary length 3');
  assert(typeof r.report_id === 'string' && r.report_id.length === 64, 'report_id sha256');
  assert(r.schema_version === 'v124.1', 'schema version');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = buildPostReceiptReport({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  const r = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  const r = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  const r = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  const r = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- future_human_stable_exec_required=true ---');
{
  const r1 = buildPostReceiptReport({});
  assert(r1.future_human_stable_exec_required === true, 'blocked: true');
  const r2 = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  assert(r2.future_human_stable_exec_required === true, 'ready: true');
}

console.log('--- validate ---');
{
  const r = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  const v = validatePostReceiptReport(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validatePostReceiptReport(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = buildPostReceiptReport({ stable_promotion_post_receipt_ledger: GOOD_LEDGER, stable_promotion_receipt_verifier: GOOD_VERIFIER });
  const txt = renderPostReceiptReport(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION POST-RECEIPT REPORT'), 'render title');
  assert(txt.includes('POST_RECEIPT_REPORT_READY'), 'status in output');
  assert(txt.includes('EVENT SUMMARY'), 'events section');
  assert(txt.includes('future_human_stable_exec_required:'), 'invariant in output');
}

console.log('--- render blocked ---');
{
  const r = buildPostReceiptReport({});
  const txt = renderPostReceiptReport(r);
  assert(txt.includes('POST-RECEIPT REPORT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(POST_RECEIPT_REPORT_STATUSES.includes('POST_RECEIPT_REPORT_READY'), 'ready in statuses');
  assert(POST_RECEIPT_REPORT_STATUSES.includes('POST_RECEIPT_REPORT_BLOCKED_LEDGER'), 'ledger blocked in statuses');
  assert(POST_RECEIPT_REPORT_STATUSES.includes('POST_RECEIPT_REPORT_BLOCKED_VERIFIER'), 'verifier blocked in statuses');
  assert(POST_RECEIPT_REPORT_STATUSES.includes('POST_RECEIPT_REPORT_MISMATCH'), 'mismatch in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
