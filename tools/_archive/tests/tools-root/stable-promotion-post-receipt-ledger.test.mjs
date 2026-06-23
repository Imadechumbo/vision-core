#!/usr/bin/env node
/**
 * Tests — Stable Promotion Post-Receipt Ledger V124.0
 */

import {
  appendPostReceiptLedgerEvents,
  validatePostReceiptLedger,
  renderPostReceiptLedger,
  POST_RECEIPT_EVENT_TYPES,
  POST_RECEIPT_LEDGER_STATUSES,
} from '../stable-promotion-post-receipt-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const EV_IMPORTED  = { event_type: 'STABLE_PROMOTION_RECEIPT_IMPORTED',      payload: { source: 'human_manual_import' } };
const EV_VERIFIED  = { event_type: 'STABLE_PROMOTION_RECEIPT_VERIFIED',       payload: { receipt_id: 'r-001' } };
const EV_MISMATCH  = { event_type: 'STABLE_PROMOTION_RECEIPT_MISMATCH',       payload: {} };
const EV_REJECTED  = { event_type: 'STABLE_PROMOTION_RECEIPT_REJECTED',       payload: {} };
const EV_AUDIT     = { event_type: 'STABLE_PROMOTION_POST_RECEIPT_AUDIT',     payload: {} };
const EV_COMPLETE  = { event_type: 'STABLE_PROMOTION_GOVERNANCE_COMPLETE',    payload: {} };
const EV_INVALID   = { event_type: 'INVALID_EVENT_TYPE',                      payload: {} };

console.log('\n=== stable-promotion-post-receipt-ledger tests ===\n');

console.log('--- empty ledger ---');
{
  const l = appendPostReceiptLedgerEvents(null, []);
  assert(l.ledger_status === 'POST_RECEIPT_LEDGER_EMPTY', 'empty status');
  assert(l.event_count === 0, 'event_count 0');
  assert(typeof l.ledger_hash === 'string' && l.ledger_hash.length === 64, 'ledger_hash sha256');
  assert(l.has_verified_receipt === false, 'has_verified_receipt false');
  assert(l.has_mismatch === false, 'has_mismatch false');
  assert(l.governance_complete === false, 'governance_complete false');
}

console.log('--- invalid events filtered ---');
{
  const l = appendPostReceiptLedgerEvents(null, [EV_INVALID]);
  assert(l.ledger_status === 'POST_RECEIPT_LEDGER_EMPTY', 'invalid → EMPTY');
  assert(l.event_count === 0, 'event_count 0');
}

console.log('--- single event ---');
{
  const l = appendPostReceiptLedgerEvents(null, [EV_IMPORTED]);
  assert(l.ledger_status === 'POST_RECEIPT_LEDGER_ACTIVE', 'active status');
  assert(l.event_count === 1, 'event_count 1');
  assert(l.events[0].event_type === 'STABLE_PROMOTION_RECEIPT_IMPORTED', 'event type');
  assert(l.events[0].prev_hash === 'genesis', 'first prev_hash genesis');
  assert(l.events[0].sequence === 0, 'sequence 0');
}

console.log('--- hash chain ---');
{
  const l = appendPostReceiptLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED, EV_AUDIT]);
  assert(l.event_count === 3, 'event_count 3');
  assert(l.events[1].prev_hash === l.events[0].event_hash, 'chain: e1.prev = e0.hash');
  assert(l.events[2].prev_hash === l.events[1].event_hash, 'chain: e2.prev = e1.hash');
  assert(l.ledger_hash === l.events[2].event_hash, 'ledger_hash = last event_hash');
}

console.log('--- append to existing ---');
{
  const l1 = appendPostReceiptLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED]);
  const l2 = appendPostReceiptLedgerEvents(l1, [EV_AUDIT, EV_COMPLETE]);
  assert(l2.event_count === 4, 'event_count 4');
  assert(l2.events[2].prev_hash === l1.events[1].event_hash, 'append chain correct');
}

console.log('--- state flags ---');
{
  const l1 = appendPostReceiptLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED]);
  assert(l1.has_verified_receipt === true, 'has_verified_receipt true');
  assert(l1.governance_complete === false, 'governance_complete false (no COMPLETE event)');

  const l2 = appendPostReceiptLedgerEvents(null, [EV_MISMATCH]);
  assert(l2.has_mismatch === true, 'has_mismatch true');

  const l3 = appendPostReceiptLedgerEvents(null, [EV_REJECTED]);
  assert(l3.has_rejected === true, 'has_rejected true');

  const l4 = appendPostReceiptLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED, EV_AUDIT, EV_COMPLETE]);
  assert(l4.governance_complete === true, 'governance_complete true');
}

console.log('--- all 6 event types ---');
{
  assert(POST_RECEIPT_EVENT_TYPES.includes('STABLE_PROMOTION_RECEIPT_IMPORTED'), 'IMPORTED');
  assert(POST_RECEIPT_EVENT_TYPES.includes('STABLE_PROMOTION_RECEIPT_VERIFIED'), 'VERIFIED');
  assert(POST_RECEIPT_EVENT_TYPES.includes('STABLE_PROMOTION_RECEIPT_MISMATCH'), 'MISMATCH');
  assert(POST_RECEIPT_EVENT_TYPES.includes('STABLE_PROMOTION_RECEIPT_REJECTED'), 'REJECTED');
  assert(POST_RECEIPT_EVENT_TYPES.includes('STABLE_PROMOTION_POST_RECEIPT_AUDIT'), 'AUDIT');
  assert(POST_RECEIPT_EVENT_TYPES.includes('STABLE_PROMOTION_GOVERNANCE_COMPLETE'), 'COMPLETE');
  assert(POST_RECEIPT_EVENT_TYPES.length === 6, 'exactly 6 event types');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const l = appendPostReceiptLedgerEvents(null, [EV_IMPORTED]);
  assert(l.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- stable_promoted=false ---');
{
  assert(appendPostReceiptLedgerEvents(null, [EV_IMPORTED]).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(appendPostReceiptLedgerEvents(null, [EV_IMPORTED]).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(appendPostReceiptLedgerEvents(null, [EV_IMPORTED]).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(appendPostReceiptLedgerEvents(null, [EV_IMPORTED]).release_performed === false, 'release_performed=false');
}

console.log('--- validate empty ---');
{
  const l = appendPostReceiptLedgerEvents(null, []);
  const v = validatePostReceiptLedger(l);
  assert(v.valid === true, 'validate empty');
}

console.log('--- validate active ---');
{
  const l = appendPostReceiptLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED]);
  const v = validatePostReceiptLedger(l);
  assert(v.valid === true, 'validate active');
}

console.log('--- validate null ---');
{
  const v = validatePostReceiptLedger(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render empty ---');
{
  const l = appendPostReceiptLedgerEvents(null, []);
  const txt = renderPostReceiptLedger(l);
  assert(txt.includes('STABLE PROMOTION POST-RECEIPT LEDGER'), 'render title');
  assert(txt.includes('POST_RECEIPT_LEDGER_EMPTY'), 'empty status in output');
}

console.log('--- render active ---');
{
  const l = appendPostReceiptLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED, EV_COMPLETE]);
  const txt = renderPostReceiptLedger(l);
  assert(txt.includes('POST_RECEIPT_LEDGER_ACTIVE'), 'active status in output');
  assert(txt.includes('STABLE_PROMOTION_RECEIPT_IMPORTED'), 'event type in output');
  assert(txt.includes('stable_promotion_allowed:  false'), 'invariant in output');
}

console.log('--- statuses export ---');
{
  assert(POST_RECEIPT_LEDGER_STATUSES.includes('POST_RECEIPT_LEDGER_EMPTY'), 'empty in statuses');
  assert(POST_RECEIPT_LEDGER_STATUSES.includes('POST_RECEIPT_LEDGER_ACTIVE'), 'active in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
