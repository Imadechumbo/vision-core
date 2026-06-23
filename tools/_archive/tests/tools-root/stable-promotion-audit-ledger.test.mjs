#!/usr/bin/env node
/**
 * Tests — Stable Promotion Audit Ledger V120.0
 */

import {
  appendStablePromotionAuditEvents,
  validateStablePromotionAuditLedger,
  renderStablePromotionAuditLedger,
  AUDIT_EVENT_TYPES,
  AUDIT_LEDGER_STATUSES,
} from '../stable-promotion-audit-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const EV_CONTRACT  = { event_type: 'STABLE_PROMOTION_CONTRACT_READY',       payload: { id: 'c-001' } };
const EV_APPROVAL  = { event_type: 'STABLE_PROMOTION_APPROVAL_BOUND',       payload: { id: 'b-001' } };
const EV_DRY_RUN   = { event_type: 'STABLE_PROMOTION_DRY_RUN_SIMULATED',    payload: { total: 7 } };
const EV_LOCK      = { event_type: 'STABLE_PROMOTION_SAFETY_LOCK_ISSUED',    payload: { id: 'lk-001' } };
const EV_ROLLBACK  = { event_type: 'STABLE_PROMOTION_ROLLBACK_PLAN_READY',   payload: {} };
const EV_INVALID   = { event_type: 'INVALID_EVENT_TYPE',                     payload: {} };

console.log('\n=== stable-promotion-audit-ledger tests ===\n');

console.log('--- empty ledger ---');
{
  const l = appendStablePromotionAuditEvents(null, []);
  assert(l.ledger_status === 'AUDIT_LEDGER_EMPTY', 'empty status');
  assert(l.event_count === 0, 'event_count 0');
  assert(typeof l.ledger_hash === 'string' && l.ledger_hash.length === 64, 'ledger_hash sha256');
}

console.log('--- invalid events filtered ---');
{
  const l = appendStablePromotionAuditEvents(null, [EV_INVALID]);
  assert(l.ledger_status === 'AUDIT_LEDGER_EMPTY', 'invalid event → still EMPTY');
  assert(l.event_count === 0, 'event_count 0');
}

console.log('--- single event ---');
{
  const l = appendStablePromotionAuditEvents(null, [EV_CONTRACT]);
  assert(l.ledger_status === 'AUDIT_LEDGER_ACTIVE', 'active status');
  assert(l.event_count === 1, 'event_count 1');
  assert(l.events[0].event_type === 'STABLE_PROMOTION_CONTRACT_READY', 'event type');
  assert(l.events[0].prev_hash === 'genesis', 'first prev_hash is genesis');
  assert(typeof l.events[0].event_hash === 'string' && l.events[0].event_hash.length === 64, 'event_hash sha256');
  assert(l.events[0].sequence === 0, 'sequence 0');
}

console.log('--- multiple events hash chain ---');
{
  const l = appendStablePromotionAuditEvents(null, [EV_CONTRACT, EV_APPROVAL, EV_DRY_RUN]);
  assert(l.event_count === 3, 'event_count 3');
  assert(l.events[1].prev_hash === l.events[0].event_hash, 'chain: e1.prev = e0.hash');
  assert(l.events[2].prev_hash === l.events[1].event_hash, 'chain: e2.prev = e1.hash');
  assert(l.ledger_hash === l.events[2].event_hash, 'ledger_hash = last event_hash');
}

console.log('--- append to existing ---');
{
  const l1 = appendStablePromotionAuditEvents(null, [EV_CONTRACT, EV_APPROVAL]);
  const l2 = appendStablePromotionAuditEvents(l1, [EV_DRY_RUN, EV_LOCK]);
  assert(l2.event_count === 4, 'event_count 4');
  assert(l2.events[2].prev_hash === l1.events[1].event_hash, 'append chain correct');
  assert(l2.events[3].sequence === 3, 'sequence 3');
}

console.log('--- all 9 event types ---');
{
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_CONTRACT_READY'), 'CONTRACT_READY');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_APPROVAL_BOUND'), 'APPROVAL_BOUND');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_COMMAND_PACKAGE_READY'), 'COMMAND_PACKAGE_READY');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_COMMAND_RENDERED'), 'COMMAND_RENDERED');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_DRY_RUN_SIMULATED'), 'DRY_RUN_SIMULATED');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_DRY_RUN_RECEIPT_ISSUED'), 'RECEIPT_ISSUED');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_SAFETY_LOCK_ISSUED'), 'SAFETY_LOCK_ISSUED');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_ROLLBACK_PLAN_READY'), 'ROLLBACK_PLAN_READY');
  assert(AUDIT_EVENT_TYPES.includes('STABLE_PROMOTION_AUDIT_BLOCKED'), 'AUDIT_BLOCKED');
  assert(AUDIT_EVENT_TYPES.length === 9, 'exactly 9 event types');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const l1 = appendStablePromotionAuditEvents(null, []);
  assert(l1.stable_promotion_allowed === false, 'empty: false');
  const l2 = appendStablePromotionAuditEvents(null, [EV_CONTRACT]);
  assert(l2.stable_promotion_allowed === false, 'active: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(appendStablePromotionAuditEvents(null, [EV_CONTRACT]).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(appendStablePromotionAuditEvents(null, [EV_CONTRACT]).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(appendStablePromotionAuditEvents(null, [EV_CONTRACT]).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(appendStablePromotionAuditEvents(null, [EV_CONTRACT]).release_performed === false, 'release_performed=false');
}

console.log('--- validate empty ---');
{
  const l = appendStablePromotionAuditEvents(null, []);
  const v = validateStablePromotionAuditLedger(l);
  assert(v.valid === true, 'validate empty');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate active ---');
{
  const l = appendStablePromotionAuditEvents(null, [EV_CONTRACT, EV_APPROVAL]);
  const v = validateStablePromotionAuditLedger(l);
  assert(v.valid === true, 'validate active');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionAuditLedger(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render empty ---');
{
  const l = appendStablePromotionAuditEvents(null, []);
  const txt = renderStablePromotionAuditLedger(l);
  assert(txt.includes('STABLE PROMOTION AUDIT LEDGER'), 'render title');
  assert(txt.includes('AUDIT_LEDGER_EMPTY'), 'empty status in output');
}

console.log('--- render active ---');
{
  const l = appendStablePromotionAuditEvents(null, [EV_CONTRACT, EV_DRY_RUN, EV_LOCK]);
  const txt = renderStablePromotionAuditLedger(l);
  assert(txt.includes('AUDIT_LEDGER_ACTIVE'), 'active status in output');
  assert(txt.includes('STABLE_PROMOTION_CONTRACT_READY'), 'event type in output');
  assert(txt.includes('stable_promotion_allowed:  false'), 'invariant in output');
}

console.log('--- statuses export ---');
{
  assert(AUDIT_LEDGER_STATUSES.includes('AUDIT_LEDGER_EMPTY'), 'empty in statuses');
  assert(AUDIT_LEDGER_STATUSES.includes('AUDIT_LEDGER_ACTIVE'), 'active in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
