#!/usr/bin/env node
/**
 * Real Tag One-Shot Audit Ledger — Unit Tests V79.0
 */

import {
  createRealTagAuditLedger,
  appendRealTagAuditEvent,
  verifyRealTagAuditLedger,
  renderRealTagAuditLedger,
  TAG_LEDGER_EVENTS,
} from '../real-tag-one-shot-audit-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T14:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_LEDGER_EVENTS),                                                  '[A-01] events array');
assert(TAG_LEDGER_EVENTS.length === 7,                                                    '[A-02] 7 event types');
assert(TAG_LEDGER_EVENTS.includes('REAL_TAG_CONTRACT_READY_REVIEW'),                      '[A-03] CONTRACT');
assert(TAG_LEDGER_EVENTS.includes('REAL_TAG_CONFIRMATION_READY_REVIEW'),                  '[A-04] CONFIRMATION');
assert(TAG_LEDGER_EVENTS.includes('REAL_TAG_SAFETY_READY_REVIEW'),                        '[A-05] SAFETY');
assert(TAG_LEDGER_EVENTS.includes('REAL_TAG_ROLLBACK_ANCHOR_READY'),                      '[A-06] ROLLBACK');
assert(TAG_LEDGER_EVENTS.includes('REAL_TAG_DRY_RUN_READY'),                              '[A-07] DRY_RUN');
assert(TAG_LEDGER_EVENTS.includes('REAL_TAG_ARMED_READY_NOT_EXECUTED'),                   '[A-08] ARMED');
assert(TAG_LEDGER_EVENTS.includes('REAL_TAG_BLOCKED'),                                    '[A-09] BLOCKED');

// ─── Suite B: Create ledger ────────────────────────────────────────
console.log('\n[Suite B] Create ledger');
const ledger = createRealTagAuditLedger();
assert(ledger !== null && typeof ledger === 'object',                                     '[B-01] returns object');
assert(typeof ledger.ledger_id === 'string',                                              '[B-02] ledger_id');
assert(ledger.schema_version   === 'v79.0',                                               '[B-03] schema=v79.0');
assert(ledger.events.length    === 0,                                                     '[B-04] empty events');
assert(ledger.event_count      === 0,                                                     '[B-05] count=0');
assert(ledger.last_hash        === 'GENESIS',                                             '[B-06] genesis hash');
assert(ledger.chain_valid      === true,                                                  '[B-07] chain_valid=true');
assert(ledger.tag_created      === false,                                                 '[B-08] tag_created=false');
assert(ledger.git_push_performed === false,                                               '[B-09] push=false');

// ─── Suite C: Append contract event ───────────────────────────────
console.log('\n[Suite C] Append contract event');
const l1 = createRealTagAuditLedger();
const r1 = appendRealTagAuditEvent(l1, 'REAL_TAG_CONTRACT_READY_REVIEW', {
  target_tag: 'v1.2.3',
  evidence_refs: ['contract-test-id'],
  _mock_timestamp: TS,
});
assert(r1.appended         === true,                                                      '[C-01] appended=true');
assert(typeof r1.event_id === 'string',                                                   '[C-02] event_id string');
assert(l1.event_count      === 1,                                                         '[C-03] count=1');
assert(l1.events[0].event_type === 'REAL_TAG_CONTRACT_READY_REVIEW',                      '[C-04] event type');
assert(l1.events[0].tag_created === false,                                                '[C-05] tag_created=false');
assert(l1.events[0].git_push_performed === false,                                         '[C-06] push=false');

// ─── Suite D: Append confirmation event ───────────────────────────
console.log('\n[Suite D] Append confirmation');
const r2 = appendRealTagAuditEvent(l1, 'REAL_TAG_CONFIRMATION_READY_REVIEW', {
  target_tag: 'v1.2.3',
  evidence_refs: ['binding-test-id'],
  _mock_timestamp: TS,
});
assert(r2.appended   === true,                                                            '[D-01] appended=true');
assert(l1.event_count === 2,                                                              '[D-02] count=2');

// ─── Suite E: Append safety event ─────────────────────────────────
console.log('\n[Suite E] Append safety');
const r3 = appendRealTagAuditEvent(l1, 'REAL_TAG_SAFETY_READY_REVIEW', {
  target_tag: 'v1.2.3',
  evidence_refs: ['safety-test-id'],
  _mock_timestamp: TS,
});
assert(r3.appended   === true,                                                            '[E-01] appended=true');
assert(l1.event_count === 3,                                                              '[E-02] count=3');

// ─── Suite F: Append rollback anchor ──────────────────────────────
console.log('\n[Suite F] Append rollback anchor');
const r4 = appendRealTagAuditEvent(l1, 'REAL_TAG_ROLLBACK_ANCHOR_READY', {
  target_tag: 'v1.2.3',
  evidence_refs: ['anchor-test-id'],
  rollback_anchor_id: 'anchor-test-id',
  _mock_timestamp: TS,
});
assert(r4.appended   === true,                                                            '[F-01] appended=true');
assert(l1.event_count === 4,                                                              '[F-02] count=4');

// ─── Suite G: Append dry-run event ────────────────────────────────
console.log('\n[Suite G] Append dry-run');
const r5 = appendRealTagAuditEvent(l1, 'REAL_TAG_DRY_RUN_READY', {
  target_tag: 'v1.2.3',
  evidence_refs: ['executor-test-id'],
  _mock_timestamp: TS,
});
assert(r5.appended   === true,                                                            '[G-01] appended=true');
assert(l1.event_count === 5,                                                              '[G-02] count=5');

// ─── Suite H: Append armed guard event ────────────────────────────
console.log('\n[Suite H] Append armed guard');
const r6 = appendRealTagAuditEvent(l1, 'REAL_TAG_ARMED_READY_NOT_EXECUTED', {
  target_tag: 'v1.2.3',
  evidence_refs: ['guard-test-id'],
  rollback_anchor_id: 'anchor-test-id',
  _mock_timestamp: TS,
});
assert(r6.appended   === true,                                                            '[H-01] appended=true');
assert(l1.event_count === 6,                                                              '[H-02] count=6');

// ─── Suite I: Append blocked event ────────────────────────────────
console.log('\n[Suite I] Append blocked');
const l2 = createRealTagAuditLedger();
const rb = appendRealTagAuditEvent(l2, 'REAL_TAG_BLOCKED', {
  target_tag: 'v1.2.3',
  blocking_reason: 'test_block',
  _mock_timestamp: TS,
});
assert(rb.appended   === true,                                                            '[I-01] blocked appended=true');
assert(l2.event_count === 1,                                                              '[I-02] count=1');

// ─── Suite J: Missing evidence blocks ready event ─────────────────
console.log('\n[Suite J] Missing evidence blocks ready');
const l3 = createRealTagAuditLedger();
const rj = appendRealTagAuditEvent(l3, 'REAL_TAG_CONTRACT_READY_REVIEW', {
  target_tag: 'v1.2.3',
  _mock_timestamp: TS,
});
assert(rj.appended   === false,                                                           '[J-01] no evidence = blocked');
assert(rj.reason     === 'evidence_refs_required_for_ready_event',                       '[J-02] correct reason');
assert(l3.event_count === 0,                                                              '[J-03] count=0 still');

// ─── Suite K: Missing rollback blocks armed event ─────────────────
console.log('\n[Suite K] Missing rollback blocks armed');
const l4 = createRealTagAuditLedger();
const rk = appendRealTagAuditEvent(l4, 'REAL_TAG_ARMED_READY_NOT_EXECUTED', {
  target_tag: 'v1.2.3',
  evidence_refs: ['guard-id'],
  _mock_timestamp: TS,
});
assert(rk.appended   === false,                                                           '[K-01] no rollback = blocked');
assert(rk.reason     === 'rollback_anchor_id_required_for_armed_event',                  '[K-02] correct reason');

// ─── Suite L: Tamper detection ────────────────────────────────────
console.log('\n[Suite L] Tamper detection');
const l5 = createRealTagAuditLedger();
appendRealTagAuditEvent(l5, 'REAL_TAG_CONTRACT_READY_REVIEW', {
  target_tag: 'v1.2.3', evidence_refs: ['id1'], _mock_timestamp: TS,
});
appendRealTagAuditEvent(l5, 'REAL_TAG_CONFIRMATION_READY_REVIEW', {
  target_tag: 'v1.2.3', evidence_refs: ['id2'], _mock_timestamp: TS,
});
const clean = verifyRealTagAuditLedger(l5);
assert(clean.valid === true,                                                              '[L-01] clean chain valid');
l5.events[0].event_hash = 'tampered';
const tampered = verifyRealTagAuditLedger(l5);
assert(tampered.valid === false,                                                          '[L-02] tamper detected');

// ─── Suite M: Invariants ──────────────────────────────────────────
console.log('\n[Suite M] Invariants');
assert(l1.tag_created        === false, '[M-01] ledger: tag_created=false');
assert(l1.git_push_performed === false, '[M-02] ledger: push=false');
for (const ev of l1.events) {
  assert(ev.tag_created        === false, `[M-03] event[${ev.event_type}]: tag=false`);
  assert(ev.git_push_performed === false, `[M-04] event[${ev.event_type}]: push=false`);
}

// ─── Suite N: Render ─────────────────────────────────────────────
console.log('\n[Suite N] Render');
const rendered = renderRealTagAuditLedger(l1);
assert(typeof rendered === 'string',                                                      '[N-01] returns string');
assert(rendered.includes('tag_created         : false'),                                  '[N-02] tag=false');
assert(rendered.includes('git_push_performed  : false'),                                  '[N-03] push=false');
assert(rendered.includes('REAL_TAG_CONTRACT_READY_REVIEW'),                               '[N-04] event in output');
assert(renderRealTagAuditLedger(null) === 'real_tag_one_shot_audit_ledger: null',         '[N-05] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-audit-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
