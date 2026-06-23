#!/usr/bin/env node
/**
 * Tests — Stable Execution Post-Promotion Ledger V128.0
 */

import {
  appendPostPromotionLedgerEvents,
  validatePostPromotionLedger,
  renderPostPromotionLedger,
  POST_PROMOTION_EVENT_TYPES,
  POST_PROMOTION_LEDGER_STATUSES,
} from '../stable-execution-post-promotion-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const EV_IMPORTED    = { event_type: 'STABLE_EXECUTION_RECEIPT_IMPORTED',     payload: { source: 'human' } };
const EV_VERIFIED    = { event_type: 'STABLE_EXECUTION_STATE_VERIFIED',        payload: { verifier_id: 'v1' } };
const EV_SNAPSHOT    = { event_type: 'STABLE_EXECUTION_SNAPSHOT_CAPTURED',    payload: { snapshot_id: 's1' } };
const EV_CONFIRMED   = { event_type: 'STABLE_EXECUTION_CONFIRMATION_ISSUED',   payload: { confirmation_id: 'c1' } };
const EV_AUDIT       = { event_type: 'STABLE_EXECUTION_POST_PROMOTION_AUDIT',  payload: {} };
const EV_FINALIZED   = { event_type: 'STABLE_EXECUTION_PROMOTION_FINALIZED',   payload: {} };
const EV_INVALID     = { event_type: 'INVALID_EVENT_TYPE',                     payload: {} };

console.log('\n=== stable-execution-post-promotion-ledger tests ===\n');

console.log('--- empty ledger ---');
{
  const l = appendPostPromotionLedgerEvents(null, []);
  assert(l.ledger_status === 'POST_PROMOTION_LEDGER_EMPTY', 'empty status');
  assert(l.event_count === 0, 'event_count 0');
  assert(typeof l.ledger_hash === 'string' && l.ledger_hash.length === 64, 'ledger_hash sha256');
  assert(l.has_confirmation === false, 'has_confirmation false');
  assert(l.has_state_verified === false, 'has_state_verified false');
  assert(l.promotion_finalized === false, 'promotion_finalized false');
}

console.log('--- invalid events filtered ---');
{
  const l = appendPostPromotionLedgerEvents(null, [EV_INVALID]);
  assert(l.ledger_status === 'POST_PROMOTION_LEDGER_EMPTY', 'invalid → EMPTY');
  assert(l.event_count === 0, 'event_count 0');
}

console.log('--- single event ---');
{
  const l = appendPostPromotionLedgerEvents(null, [EV_IMPORTED]);
  assert(l.ledger_status === 'POST_PROMOTION_LEDGER_ACTIVE', 'active status');
  assert(l.event_count === 1, 'event_count 1');
  assert(l.events[0].event_type === 'STABLE_EXECUTION_RECEIPT_IMPORTED', 'event type');
  assert(l.events[0].prev_hash === 'genesis', 'first prev_hash genesis');
  assert(l.events[0].sequence === 0, 'sequence 0');
}

console.log('--- hash chain ---');
{
  const l = appendPostPromotionLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED, EV_SNAPSHOT]);
  assert(l.event_count === 3, 'event_count 3');
  assert(l.events[1].prev_hash === l.events[0].event_hash, 'chain: e1.prev = e0.hash');
  assert(l.events[2].prev_hash === l.events[1].event_hash, 'chain: e2.prev = e1.hash');
  assert(l.ledger_hash === l.events[2].event_hash, 'ledger_hash = last event_hash');
}

console.log('--- append to existing ---');
{
  const l1 = appendPostPromotionLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED]);
  const l2 = appendPostPromotionLedgerEvents(l1, [EV_SNAPSHOT, EV_CONFIRMED]);
  assert(l2.event_count === 4, 'event_count 4');
  assert(l2.events[2].prev_hash === l1.events[1].event_hash, 'append chain correct');
}

console.log('--- state flags ---');
{
  const l1 = appendPostPromotionLedgerEvents(null, [EV_IMPORTED, EV_CONFIRMED]);
  assert(l1.has_confirmation === true, 'has_confirmation true');
  assert(l1.has_state_verified === false, 'has_state_verified false (no VERIFIED event)');

  const l2 = appendPostPromotionLedgerEvents(null, [EV_VERIFIED]);
  assert(l2.has_state_verified === true, 'has_state_verified true');

  const l3 = appendPostPromotionLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED, EV_SNAPSHOT, EV_CONFIRMED, EV_FINALIZED]);
  assert(l3.promotion_finalized === true, 'promotion_finalized true');
  assert(l3.has_confirmation === true, 'has_confirmation true with FINALIZED');
}

console.log('--- all 6 event types ---');
{
  assert(POST_PROMOTION_EVENT_TYPES.includes('STABLE_EXECUTION_RECEIPT_IMPORTED'), 'IMPORTED');
  assert(POST_PROMOTION_EVENT_TYPES.includes('STABLE_EXECUTION_STATE_VERIFIED'), 'VERIFIED');
  assert(POST_PROMOTION_EVENT_TYPES.includes('STABLE_EXECUTION_SNAPSHOT_CAPTURED'), 'SNAPSHOT');
  assert(POST_PROMOTION_EVENT_TYPES.includes('STABLE_EXECUTION_CONFIRMATION_ISSUED'), 'CONFIRMED');
  assert(POST_PROMOTION_EVENT_TYPES.includes('STABLE_EXECUTION_POST_PROMOTION_AUDIT'), 'AUDIT');
  assert(POST_PROMOTION_EVENT_TYPES.includes('STABLE_EXECUTION_PROMOTION_FINALIZED'), 'FINALIZED');
  assert(POST_PROMOTION_EVENT_TYPES.length === 6, 'exactly 6 event types');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const l = appendPostPromotionLedgerEvents(null, [EV_IMPORTED]);
  assert(l.system_execution_performed === false, 'system_execution_performed=false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  assert(appendPostPromotionLedgerEvents(null, [EV_IMPORTED]).automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  assert(appendPostPromotionLedgerEvents(null, [EV_IMPORTED]).stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  assert(appendPostPromotionLedgerEvents(null, [EV_IMPORTED]).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  assert(appendPostPromotionLedgerEvents(null, [EV_IMPORTED]).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  assert(appendPostPromotionLedgerEvents(null, [EV_IMPORTED]).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  assert(appendPostPromotionLedgerEvents(null, [EV_IMPORTED]).release_performed === false, 'release_performed=false');
}

console.log('--- validate empty ---');
{
  const l = appendPostPromotionLedgerEvents(null, []);
  const v = validatePostPromotionLedger(l);
  assert(v.valid === true, 'validate empty');
}

console.log('--- validate active ---');
{
  const l = appendPostPromotionLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED]);
  const v = validatePostPromotionLedger(l);
  assert(v.valid === true, 'validate active');
}

console.log('--- validate null ---');
{
  const v = validatePostPromotionLedger(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render empty ---');
{
  const l = appendPostPromotionLedgerEvents(null, []);
  const txt = renderPostPromotionLedger(l);
  assert(txt.includes('STABLE EXECUTION POST-PROMOTION LEDGER V128.0'), 'render title');
  assert(txt.includes('POST_PROMOTION_LEDGER_EMPTY'), 'empty status in output');
}

console.log('--- render active ---');
{
  const l = appendPostPromotionLedgerEvents(null, [EV_IMPORTED, EV_VERIFIED, EV_FINALIZED]);
  const txt = renderPostPromotionLedger(l);
  assert(txt.includes('POST_PROMOTION_LEDGER_ACTIVE'), 'active status in output');
  assert(txt.includes('STABLE_EXECUTION_RECEIPT_IMPORTED'), 'event type in output');
  assert(txt.includes('stable_promotion_allowed:'), 'invariant in output');
}

console.log('--- statuses export ---');
{
  assert(POST_PROMOTION_LEDGER_STATUSES.includes('POST_PROMOTION_LEDGER_EMPTY'), 'empty in statuses');
  assert(POST_PROMOTION_LEDGER_STATUSES.includes('POST_PROMOTION_LEDGER_ACTIVE'), 'active in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
