#!/usr/bin/env node
/**
 * Real Release Locked Ledger — Unit Tests V57.1
 */

import {
  appendRealReleaseLedgerEvent,
  verifyRealReleaseLedgerChain,
  readRealReleaseLedger,
  _resetRealReleaseLedgerForTest,
  REAL_RELEASE_LOCKED_EVENT_TYPES,
  REAL_RELEASE_LOCKED_LEDGER_STATUSES,
} from '../real-release-locked-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS         = '2026-05-17T12:00:00.000Z';
const LEDGER_ID  = 'ledger-abc';
const EVIDENCE   = ['receipt-abc'];
const SRC        = 'go-core';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_RELEASE_LOCKED_EVENT_TYPES),                                  '[A-01] event types array');
assert(REAL_RELEASE_LOCKED_EVENT_TYPES.length === 5,                                    '[A-02] 5 event types');
assert(REAL_RELEASE_LOCKED_EVENT_TYPES.includes('REAL_MANUAL_RELEASE_GATE_READY_LOCKED'), '[A-03] GATE_READY_LOCKED');
assert(REAL_RELEASE_LOCKED_EVENT_TYPES.includes('PRODUCTION_EXECUTION_LOCK_ACTIVE'),    '[A-04] LOCK_ACTIVE');
assert(REAL_RELEASE_LOCKED_EVENT_TYPES.includes('REAL_RELEASE_READINESS_READY_LOCKED'), '[A-05] READINESS_READY_LOCKED');
assert(REAL_RELEASE_LOCKED_EVENT_TYPES.includes('REAL_RELEASE_EVIDENCE_FINALIZER_READY_LOCKED'), '[A-06] FINALIZER_READY_LOCKED');
assert(REAL_RELEASE_LOCKED_EVENT_TYPES.includes('REAL_RELEASE_BLOCKED'),               '[A-07] REAL_RELEASE_BLOCKED');

assert(Array.isArray(REAL_RELEASE_LOCKED_LEDGER_STATUSES),                              '[A-08] statuses array');
assert(REAL_RELEASE_LOCKED_LEDGER_STATUSES.length === 5,                                '[A-09] 5 statuses');

// ─── Suite B: Empty ledger ────────────────────────────────────────
console.log('\n[Suite B] Empty ledger');
_resetRealReleaseLedgerForTest();
const empty = verifyRealReleaseLedgerChain();
assert(empty.valid              === true,                                                '[B-01] empty valid=true');
assert(empty.entries            === 0,                                                   '[B-02] entries=0');
assert(empty.status             === 'REAL_RELEASE_LOCKED_LEDGER_READY',                '[B-03] status=READY');
assert(empty.deploy_allowed     === false,                                               '[B-04] deploy=false');
assert(empty.production_execution_locked === true,                                       '[B-05] locked=true');

// ─── Suite C: Append events ───────────────────────────────────────
console.log('\n[Suite C] Append events');
_resetRealReleaseLedgerForTest();

const r1 = appendRealReleaseLedgerEvent({ event_type: 'REAL_MANUAL_RELEASE_GATE_READY_LOCKED', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: EVIDENCE, evidence_source: SRC, _mock_timestamp: TS });
assert(r1.appended === true,                                                             '[C-01] GATE_READY_LOCKED appended');
assert(typeof r1.event_id === 'string',                                                  '[C-02] event_id string');
assert(r1.index === 0,                                                                   '[C-03] index=0');

const r2 = appendRealReleaseLedgerEvent({ event_type: 'PRODUCTION_EXECUTION_LOCK_ACTIVE', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: EVIDENCE, evidence_source: SRC, _mock_timestamp: TS });
assert(r2.appended === true,                                                             '[C-04] LOCK_ACTIVE appended');
assert(r2.index === 1,                                                                   '[C-05] index=1');

const r3 = appendRealReleaseLedgerEvent({ event_type: 'REAL_RELEASE_READINESS_READY_LOCKED', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: EVIDENCE, evidence_source: SRC, _mock_timestamp: TS });
assert(r3.appended === true,                                                             '[C-06] READINESS_READY_LOCKED appended');

const r4 = appendRealReleaseLedgerEvent({ event_type: 'REAL_RELEASE_EVIDENCE_FINALIZER_READY_LOCKED', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: EVIDENCE, evidence_source: SRC, finalizer_id: 'fin-abc', _mock_timestamp: TS });
assert(r4.appended === true,                                                             '[C-07] FINALIZER_READY_LOCKED appended');

const r5 = appendRealReleaseLedgerEvent({ event_type: 'REAL_RELEASE_BLOCKED', actor_id: 'actor', _mock_timestamp: TS });
assert(r5.appended === true,                                                             '[C-08] BLOCKED appended (no evidence needed)');

for (const r of [r1, r2, r3, r4, r5]) {
  assert(r.deploy_allowed            === false, `[C] event deploy=false`);
  assert(r.production_execution_locked === true, `[C] event locked=true`);
  assert(r.release_performed         === false, `[C] event release_performed=false`);
}

// ─── Suite D: Chain valid after 5 events ─────────────────────────
console.log('\n[Suite D] Chain valid');
const chain5 = verifyRealReleaseLedgerChain();
assert(chain5.valid              === true,                                               '[D-01] chain valid=true');
assert(chain5.entries            === 5,                                                  '[D-02] 5 entries');
assert(chain5.status             === 'REAL_RELEASE_LOCKED_LEDGER_READY',               '[D-03] status=READY');
assert(chain5.tampered_at_index  === null,                                               '[D-04] no tamper');

// ─── Suite E: Read ledger ─────────────────────────────────────────
console.log('\n[Suite E] Read ledger');
const ledger = readRealReleaseLedger();
assert(ledger.entries  === 5,                                                            '[E-01] 5 entries');
assert(Array.isArray(ledger.events),                                                     '[E-02] events array');
assert(ledger.events.length === 5,                                                       '[E-03] 5 events');
assert(ledger.deploy_allowed === false,                                                  '[E-04] deploy=false');

// ─── Suite F: Blocked — unknown event type ────────────────────────
console.log('\n[Suite F] Blocked — invalid event type');
_resetRealReleaseLedgerForTest();
const badType = appendRealReleaseLedgerEvent({ event_type: 'UNKNOWN_EVENT', actor_id: 'actor' });
assert(badType.appended === false,                                                       '[F-01] unknown → not appended');
assert(badType.status   === 'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVENT_TYPE',           '[F-02] status=BLOCKED_EVENT_TYPE');

// ─── Suite G: Blocked — missing evidence ─────────────────────────
console.log('\n[Suite G] Blocked — missing evidence');
_resetRealReleaseLedgerForTest();
const noEvidence = appendRealReleaseLedgerEvent({ event_type: 'REAL_MANUAL_RELEASE_GATE_READY_LOCKED', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: [], _mock_timestamp: TS });
assert(noEvidence.appended === false,                                                    '[G-01] empty evidence → not appended');
assert(noEvidence.status   === 'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVIDENCE',          '[G-02] status=BLOCKED_EVIDENCE');

const noId = appendRealReleaseLedgerEvent({ event_type: 'REAL_MANUAL_RELEASE_GATE_READY_LOCKED', actor_id: 'actor', evidence_refs: EVIDENCE, _mock_timestamp: TS });
assert(noId.appended === false,                                                          '[G-03] no ledger_id → not appended');
assert(noId.status   === 'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_LEDGER_ID',               '[G-04] status=BLOCKED_LEDGER_ID');

const badSrc = appendRealReleaseLedgerEvent({ event_type: 'REAL_MANUAL_RELEASE_GATE_READY_LOCKED', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: EVIDENCE, evidence_source: 'backend', _mock_timestamp: TS });
assert(badSrc.appended === false,                                                        '[G-05] backend source → not appended');
assert(badSrc.status   === 'REAL_RELEASE_LOCKED_LEDGER_BLOCKED_EVIDENCE',              '[G-06] status=BLOCKED_EVIDENCE');

// ─── Suite H: Tamper detection ────────────────────────────────────
console.log('\n[Suite H] Tamper detection');
_resetRealReleaseLedgerForTest();
appendRealReleaseLedgerEvent({ event_type: 'REAL_MANUAL_RELEASE_GATE_READY_LOCKED', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: EVIDENCE, evidence_source: SRC, _mock_timestamp: TS });
appendRealReleaseLedgerEvent({ event_type: 'PRODUCTION_EXECUTION_LOCK_ACTIVE', actor_id: 'actor', ledger_id: LEDGER_ID, evidence_refs: EVIDENCE, evidence_source: SRC, _mock_timestamp: TS });
const chainOk = verifyRealReleaseLedgerChain();
assert(chainOk.valid   === true,                                                         '[H-01] clean chain valid');
assert(chainOk.production_execution_locked === true,                                     '[H-02] locked=true in chain verify');

// ─── Suite I: Invariants ─────────────────────────────────────────
console.log('\n[Suite I] Invariants');
_resetRealReleaseLedgerForTest();
for (const et of REAL_RELEASE_LOCKED_EVENT_TYPES) {
  const isReady = ['REAL_MANUAL_RELEASE_GATE_READY_LOCKED','PRODUCTION_EXECUTION_LOCK_ACTIVE','REAL_RELEASE_READINESS_READY_LOCKED','REAL_RELEASE_EVIDENCE_FINALIZER_READY_LOCKED'].includes(et);
  const r = appendRealReleaseLedgerEvent({
    event_type:      et,
    actor_id:        'actor',
    ledger_id:       isReady ? LEDGER_ID : undefined,
    evidence_refs:   isReady ? EVIDENCE : undefined,
    evidence_source: isReady ? SRC : undefined,
    _mock_timestamp: TS,
  });
  if (r.appended) {
    assert(r.deploy_allowed            === false, `[I] ${et}: deploy=false`);
    assert(r.production_execution_locked === true, `[I] ${et}: locked=true`);
    assert(r.release_performed         === false, `[I] ${et}: release_performed=false`);
    assert(r.tag_created               === false, `[I] ${et}: tag_created=false`);
    assert(r.stable_promoted           === false, `[I] ${et}: stable_promoted=false`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-release-locked-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
