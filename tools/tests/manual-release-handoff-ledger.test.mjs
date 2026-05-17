#!/usr/bin/env node
/**
 * Manual Release Handoff Ledger — Unit Tests V48.1
 */

import {
  appendHandoffLedgerEvent,
  verifyHandoffLedgerChain,
  readHandoffLedger,
  _resetHandoffLedgerForTest,
  HANDOFF_LEDGER_EVENT_TYPES,
  HANDOFF_LEDGER_STATUSES,
} from '../manual-release-handoff-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';
const HANDOFF_ID   = 'handoff-abc';
const EVIDENCE_REF = ['receipt-abc'];
const EVIDENCE_SRC = 'go-core';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(HANDOFF_LEDGER_EVENT_TYPES),                            '[A-01] event types array');
assert(HANDOFF_LEDGER_EVENT_TYPES.length === 6,                              '[A-02] 6 event types');
assert(HANDOFF_LEDGER_EVENT_TYPES.includes('MANUAL_RELEASE_REQUEST_CREATED'), '[A-03] REQUEST_CREATED');
assert(HANDOFF_LEDGER_EVENT_TYPES.includes('HUMAN_CONFIRMATION_BOUND'),      '[A-04] CONFIRMATION_BOUND');
assert(HANDOFF_LEDGER_EVENT_TYPES.includes('MANUAL_RELEASE_PREFLIGHT_READY'), '[A-05] PREFLIGHT_READY');
assert(HANDOFF_LEDGER_EVENT_TYPES.includes('MANUAL_RELEASE_DRY_RUN_READY'),  '[A-06] DRY_RUN_READY');
assert(HANDOFF_LEDGER_EVENT_TYPES.includes('MANUAL_RELEASE_HANDOFF_READY'),  '[A-07] HANDOFF_READY');
assert(HANDOFF_LEDGER_EVENT_TYPES.includes('MANUAL_RELEASE_BLOCKED'),        '[A-08] BLOCKED');
assert(Array.isArray(HANDOFF_LEDGER_STATUSES),                               '[A-09] statuses array');
assert(HANDOFF_LEDGER_STATUSES.length === 5,                                 '[A-10] 5 statuses');

// ─── Suite B: Empty ledger ────────────────────────────────────────
console.log('\n[Suite B] Empty ledger');
_resetHandoffLedgerForTest();
const emptyChain = verifyHandoffLedgerChain();
assert(emptyChain.valid      === true,                                       '[B-01] empty chain valid=true');
assert(emptyChain.entries    === 0,                                          '[B-02] empty chain entries=0');
assert(emptyChain.status     === 'HANDOFF_LEDGER_READY',                     '[B-03] status=READY');
assert(emptyChain.deploy_allowed    === false,                               '[B-04] deploy=false');
assert(emptyChain.release_performed === false,                               '[B-05] release_performed=false');

// ─── Suite C: Append events ───────────────────────────────────────
console.log('\n[Suite C] Append events');
_resetHandoffLedgerForTest();

const r1 = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_REQUEST_CREATED', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r1.appended                === true,                                  '[C-01] append REQUEST_CREATED');
assert(typeof r1.event_id         === 'string',                              '[C-02] event_id string');
assert(r1.index                   === 0,                                     '[C-03] index=0');

const r2 = appendHandoffLedgerEvent({ event_type: 'HUMAN_CONFIRMATION_BOUND', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r2.appended                === true,                                  '[C-04] append CONFIRMATION_BOUND');
assert(r2.index                   === 1,                                     '[C-05] index=1');

const r3 = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_PREFLIGHT_READY', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r3.appended                === true,                                  '[C-06] append PREFLIGHT_READY');

const r4 = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_DRY_RUN_READY', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r4.appended                === true,                                  '[C-07] append DRY_RUN_READY');

const r5 = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_HANDOFF_READY', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r5.appended                === true,                                  '[C-08] append HANDOFF_READY');

const r6 = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_BLOCKED', actor_id: 'actor', _mock_timestamp: TS });
assert(r6.appended                === true,                                  '[C-09] append BLOCKED (no evidence needed)');

// All appended have execution flags false
for (const r of [r1, r2, r3, r4, r5, r6]) {
  assert(r.deploy_allowed    === false, `[C] event ${r.index ?? '?'}: deploy=false`);
  assert(r.release_performed === false, `[C] event ${r.index ?? '?'}: release_performed=false`);
  assert(r.tag_created       === false, `[C] event ${r.index ?? '?'}: tag_created=false`);
}

// ─── Suite D: Chain valid after 6 events ─────────────────────────
console.log('\n[Suite D] Chain valid');
const chain6 = verifyHandoffLedgerChain();
assert(chain6.valid              === true,                                   '[D-01] chain valid=true');
assert(chain6.entries            === 6,                                      '[D-02] 6 entries');
assert(chain6.status             === 'HANDOFF_LEDGER_READY',                 '[D-03] status=READY');
assert(chain6.tampered_at_index  === null,                                   '[D-04] no tamper');
assert(chain6.deploy_allowed     === false,                                  '[D-05] deploy=false');

// ─── Suite E: Read ledger ─────────────────────────────────────────
console.log('\n[Suite E] Read ledger');
const ledger = readHandoffLedger();
assert(ledger.entries            === 6,                                      '[E-01] 6 entries');
assert(Array.isArray(ledger.events),                                         '[E-02] events array');
assert(ledger.events.length      === 6,                                      '[E-03] 6 events');
assert(ledger.deploy_allowed     === false,                                  '[E-04] deploy=false');

// ─── Suite F: Blocked — invalid event type ───────────────────────
console.log('\n[Suite F] Blocked — invalid event type');
_resetHandoffLedgerForTest();
const badType = appendHandoffLedgerEvent({ event_type: 'UNKNOWN_EVENT', actor_id: 'actor' });
assert(badType.appended          === false,                                  '[F-01] unknown type → not appended');
assert(badType.status            === 'HANDOFF_LEDGER_BLOCKED_EVENT_TYPE',    '[F-02] status=BLOCKED_EVENT_TYPE');
assert(badType.deploy_allowed    === false,                                  '[F-03] deploy=false');

// ─── Suite G: Blocked — missing evidence for ready event ─────────
console.log('\n[Suite G] Blocked — missing evidence');
_resetHandoffLedgerForTest();
const noEvidence = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_REQUEST_CREATED', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: [], _mock_timestamp: TS });
assert(noEvidence.appended       === false,                                  '[G-01] empty evidence → not appended');
assert(noEvidence.status         === 'HANDOFF_LEDGER_BLOCKED_EVIDENCE',      '[G-02] status=BLOCKED_EVIDENCE');

const noHandoffId = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_REQUEST_CREATED', actor_id: 'actor', evidence_refs: EVIDENCE_REF, _mock_timestamp: TS });
assert(noHandoffId.appended      === false,                                  '[G-03] no handoff_id → not appended');
assert(noHandoffId.status        === 'HANDOFF_LEDGER_BLOCKED_HANDOFF_ID',    '[G-04] status=BLOCKED_HANDOFF_ID');

const badSrc = appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_REQUEST_CREATED', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: 'backend', _mock_timestamp: TS });
assert(badSrc.appended           === false,                                  '[G-05] backend → not appended');
assert(badSrc.status             === 'HANDOFF_LEDGER_BLOCKED_EVIDENCE',      '[G-06] status=BLOCKED_EVIDENCE');

// ─── Suite H: Tamper detection ───────────────────────────────────
console.log('\n[Suite H] Tamper detection');
_resetHandoffLedgerForTest();
appendHandoffLedgerEvent({ event_type: 'MANUAL_RELEASE_REQUEST_CREATED', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
appendHandoffLedgerEvent({ event_type: 'HUMAN_CONFIRMATION_BOUND', actor_id: 'actor', handoff_id: HANDOFF_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
const chainOk = verifyHandoffLedgerChain();
assert(chainOk.valid             === true,                                   '[H-01] clean chain valid');
assert(chainOk.deploy_allowed    === false,                                  '[H-02] deploy=false');

// ─── Suite I: Invariants — execution flags false always ──────────
console.log('\n[Suite I] Invariants');
_resetHandoffLedgerForTest();
for (const et of HANDOFF_LEDGER_EVENT_TYPES) {
  const isReady = ['MANUAL_RELEASE_REQUEST_CREATED','HUMAN_CONFIRMATION_BOUND','MANUAL_RELEASE_PREFLIGHT_READY','MANUAL_RELEASE_DRY_RUN_READY','MANUAL_RELEASE_HANDOFF_READY'].includes(et);
  const r = appendHandoffLedgerEvent({
    event_type:     et,
    actor_id:       'actor',
    handoff_id:     isReady ? HANDOFF_ID : undefined,
    evidence_refs:  isReady ? EVIDENCE_REF : undefined,
    evidence_source: isReady ? EVIDENCE_SRC : undefined,
    _mock_timestamp: TS,
  });
  if (r.appended) {
    assert(r.deploy_allowed    === false, `[I] ${et}: deploy=false`);
    assert(r.release_performed === false, `[I] ${et}: release_performed=false`);
    assert(r.tag_created       === false, `[I] ${et}: tag_created=false`);
    assert(r.stable_promoted   === false, `[I] ${et}: stable_promoted=false`);
    assert(r.deploy_performed  === false, `[I] ${et}: deploy_performed=false`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\nmanual-release-handoff-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
