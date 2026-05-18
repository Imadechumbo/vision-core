#!/usr/bin/env node
/**
 * Unlock Review Ledger — Unit Tests V63.0
 */

import {
  appendUnlockReviewLedgerEvent,
  readUnlockReviewLedger,
  verifyUnlockReviewLedgerChain,
  renderUnlockReviewLedger,
  _resetUnlockReviewLedgerForTest,
  UNLOCK_REVIEW_EVENT_TYPES,
  UNLOCK_REVIEW_LEDGER_STATUSES,
} from '../unlock-review-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_REVIEW_EVENT_TYPES),                                         '[A-01] event types array');
assert(UNLOCK_REVIEW_EVENT_TYPES.length === 5,                                           '[A-02] 5 event types');
assert(UNLOCK_REVIEW_EVENT_TYPES.includes('UNLOCK_CONTRACT_CREATED'),                   '[A-03] CONTRACT_CREATED');
assert(UNLOCK_REVIEW_EVENT_TYPES.includes('UNLOCK_AUTHORITY_GRANTED'),                  '[A-04] AUTHORITY_GRANTED');
assert(UNLOCK_REVIEW_EVENT_TYPES.includes('UNLOCK_BINDING_CREATED'),                    '[A-05] BINDING_CREATED');
assert(UNLOCK_REVIEW_EVENT_TYPES.includes('UNLOCK_DECISION_EVALUATED'),                 '[A-06] DECISION_EVALUATED');
assert(UNLOCK_REVIEW_EVENT_TYPES.includes('UNLOCK_EVIDENCE_PACKAGE_BUILT'),             '[A-07] EVIDENCE_PACKAGE_BUILT');

assert(Array.isArray(UNLOCK_REVIEW_LEDGER_STATUSES),                                     '[A-08] statuses array');
assert(UNLOCK_REVIEW_LEDGER_STATUSES.length === 5,                                       '[A-09] 5 statuses');
assert(UNLOCK_REVIEW_LEDGER_STATUSES.includes('UNLOCK_LEDGER_OK'),                      '[A-10] OK');
assert(UNLOCK_REVIEW_LEDGER_STATUSES.includes('UNLOCK_LEDGER_EMPTY'),                   '[A-11] EMPTY');
assert(UNLOCK_REVIEW_LEDGER_STATUSES.includes('UNLOCK_LEDGER_CHAIN_BROKEN'),            '[A-12] CHAIN_BROKEN');
assert(UNLOCK_REVIEW_LEDGER_STATUSES.includes('UNLOCK_LEDGER_INVALID_EVENT'),           '[A-13] INVALID_EVENT');
assert(UNLOCK_REVIEW_LEDGER_STATUSES.includes('UNLOCK_LEDGER_LOCKED'),                  '[A-14] LOCKED');

// ─── Suite B: Empty ledger ────────────────────────────────────────
console.log('\n[Suite B] Empty ledger');
_resetUnlockReviewLedgerForTest();
const emptyState = readUnlockReviewLedger();
assert(emptyState.ledger_status              === 'UNLOCK_LEDGER_EMPTY',                 '[B-01] empty → EMPTY');
assert(emptyState.total_events               === 0,                                      '[B-02] total=0');
assert(Array.isArray(emptyState.events) && emptyState.events.length === 0,              '[B-03] events=[]');

const emptyChain = verifyUnlockReviewLedgerChain();
assert(emptyChain.valid                      === true,                                   '[B-04] empty chain valid');
assert(emptyChain.chain_valid                === true,                                   '[B-05] chain_valid=true');
assert(emptyChain.ledger_status              === 'UNLOCK_LEDGER_EMPTY',                 '[B-06] chain status=EMPTY');

// ─── Suite C: Append events ───────────────────────────────────────
console.log('\n[Suite C] Append events');
_resetUnlockReviewLedgerForTest();
const r1 = appendUnlockReviewLedgerEvent({
  event_type:       'UNLOCK_CONTRACT_CREATED',
  artifact_id:      'contract-abc',
  artifact_status:  'UNLOCK_CONTRACT_READY_REVIEW',
  _mock_timestamp:  TS,
});
assert(r1.appended                           === true,                                   '[C-01] first event appended');
assert(r1.ledger_status                      === 'UNLOCK_LEDGER_OK',                    '[C-02] status=OK');
assert(r1.sequence                           === 1,                                      '[C-03] sequence=1');
assert(typeof r1.event_id                    === 'string' && r1.event_id.length === 24, '[C-04] event_id 24 chars');
assert(typeof r1.chain_hash                  === 'string' && r1.chain_hash.length === 64, '[C-05] chain_hash 64 chars');
assert(r1.total_events                       === 1,                                      '[C-06] total=1');
assert(r1.blocking_reason                    === null,                                   '[C-07] blocking_reason=null');

const r2 = appendUnlockReviewLedgerEvent({
  event_type:       'UNLOCK_AUTHORITY_GRANTED',
  artifact_id:      'authority-abc',
  artifact_status:  'UNLOCK_AUTHORITY_READY_REVIEW',
  _mock_timestamp:  TS,
});
assert(r2.appended                           === true,                                   '[C-08] second event appended');
assert(r2.sequence                           === 2,                                      '[C-09] sequence=2');
assert(r2.total_events                       === 2,                                      '[C-10] total=2');

// ─── Suite D: All 5 event types ───────────────────────────────────
console.log('\n[Suite D] All 5 event types');
_resetUnlockReviewLedgerForTest();
for (const event_type of UNLOCK_REVIEW_EVENT_TYPES) {
  const r = appendUnlockReviewLedgerEvent({ event_type, artifact_id: `art-${event_type}`, _mock_timestamp: TS });
  assert(r.appended === true, `[D] ${event_type} appended`);
}
const state5 = readUnlockReviewLedger();
assert(state5.total_events                   === 5,                                      '[D-06] 5 events total');

// ─── Suite E: Chain verification ──────────────────────────────────
console.log('\n[Suite E] Chain verification');
_resetUnlockReviewLedgerForTest();
appendUnlockReviewLedgerEvent({ event_type: 'UNLOCK_CONTRACT_CREATED',      artifact_id: 'c1', _mock_timestamp: TS });
appendUnlockReviewLedgerEvent({ event_type: 'UNLOCK_AUTHORITY_GRANTED',     artifact_id: 'a1', _mock_timestamp: TS });
appendUnlockReviewLedgerEvent({ event_type: 'UNLOCK_BINDING_CREATED',       artifact_id: 'b1', _mock_timestamp: TS });
appendUnlockReviewLedgerEvent({ event_type: 'UNLOCK_DECISION_EVALUATED',    artifact_id: 'd1', _mock_timestamp: TS });
appendUnlockReviewLedgerEvent({ event_type: 'UNLOCK_EVIDENCE_PACKAGE_BUILT',artifact_id: 'e1', _mock_timestamp: TS });

const chain5 = verifyUnlockReviewLedgerChain();
assert(chain5.valid                          === true,                                   '[E-01] chain valid');
assert(chain5.chain_valid                    === true,                                   '[E-02] chain_valid=true');
assert(chain5.ledger_status                  === 'UNLOCK_LEDGER_OK',                    '[E-03] status=OK');
assert(chain5.total_events                   === 5,                                      '[E-04] 5 events');

// ─── Suite F: Invalid event type ──────────────────────────────────
console.log('\n[Suite F] Invalid event type');
const invalid = appendUnlockReviewLedgerEvent({ event_type: 'UNLOCK_EXECUTE_NOW', _mock_timestamp: TS });
assert(invalid.appended                      === false,                                  '[F-01] invalid type not appended');
assert(invalid.ledger_status                 === 'UNLOCK_LEDGER_INVALID_EVENT',         '[F-02] status=INVALID_EVENT');

// ─── Suite G: Read ledger ─────────────────────────────────────────
console.log('\n[Suite G] Read ledger');
const ledgerState = readUnlockReviewLedger();
assert(ledgerState.ledger_status             === 'UNLOCK_LEDGER_OK',                    '[G-01] status=OK');
assert(ledgerState.total_events              === 5,                                      '[G-02] total=5');
assert(Array.isArray(ledgerState.events),                                                '[G-03] events array');
assert(ledgerState.events[0].event_type      === 'UNLOCK_CONTRACT_CREATED',             '[G-04] first event type');
assert(ledgerState.events[4].event_type      === 'UNLOCK_EVIDENCE_PACKAGE_BUILT',       '[G-05] last event type');

// ─── Suite H: renderUnlockReviewLedger ───────────────────────────
console.log('\n[Suite H] Render');
const rendered = renderUnlockReviewLedger(ledgerState);
assert(typeof rendered                       === 'string',                               '[H-01] returns string');
assert(rendered.includes('UNLOCK_LEDGER_OK'),                                           '[H-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                      '[H-03] lock in output');
assert(rendered.includes('unlock_executed                : false'),                      '[H-04] unlock_executed in output');
assert(rendered.includes('future_execution_phase_required: true'),                      '[H-05] future_exec in output');
assert(renderUnlockReviewLedger(null)        === 'unlock_review_ledger: null',          '[H-06] null → string');

// ─── Suite I: Invariants ─────────────────────────────────────────
console.log('\n[Suite I] Invariants');
_resetUnlockReviewLedgerForTest();
const r = appendUnlockReviewLedgerEvent({ event_type: 'UNLOCK_CONTRACT_CREATED', artifact_id: 'x', _mock_timestamp: TS });
const read = readUnlockReviewLedger();
const verify = verifyUnlockReviewLedgerChain();
const inv_invalid = appendUnlockReviewLedgerEvent({ event_type: 'BAD_TYPE', _mock_timestamp: TS });

const invCases = [r, read, verify, inv_invalid];
for (const [i, o] of invCases.entries()) {
  assert(o.deploy_allowed              === false, `[I] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[I] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[I] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[I] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[I] case ${i}: exec_allowed=false`);
  assert(o.production_execution_locked === true,  `[I] case ${i}: production_execution_locked=true`);
  assert(o.unlock_executed             === false, `[I] case ${i}: unlock_executed=false`);
  assert(o.unlock_review_only          === true,  `[I] case ${i}: unlock_review_only=true`);
  assert(o.future_execution_phase_required === true, `[I] case ${i}: future_execution_phase_required=true`);
}

// ─── Suite J: Reset ───────────────────────────────────────────────
console.log('\n[Suite J] Reset');
_resetUnlockReviewLedgerForTest();
const afterReset = readUnlockReviewLedger();
assert(afterReset.total_events               === 0,                                      '[J-01] reset → 0 events');
assert(afterReset.ledger_status              === 'UNLOCK_LEDGER_EMPTY',                 '[J-02] reset → EMPTY');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nunlock-review-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
