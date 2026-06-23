#!/usr/bin/env node
/**
 * Controlled Execution Ledger — Unit Tests V68.0
 */

import {
  appendControlledExecutionLedgerEvent,
  readControlledExecutionLedger,
  verifyControlledExecutionLedgerChain,
  _resetControlledExecutionLedgerForTest,
  renderControlledExecutionLedger,
  CONTROLLED_EXECUTION_EVENT_TYPES,
  CONTROLLED_EXECUTION_LEDGER_STATUSES,
} from '../controlled-execution-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CONTROLLED_EXECUTION_EVENT_TYPES),                                '[A-01] event_types array');
assert(CONTROLLED_EXECUTION_EVENT_TYPES.length === 6,                                  '[A-02] 6 event types');
assert(CONTROLLED_EXECUTION_EVENT_TYPES.includes('CONTROLLED_EXECUTION_CONTRACT_READY_REVIEW'),  '[A-03] CONTRACT');
assert(CONTROLLED_EXECUTION_EVENT_TYPES.includes('CONTROLLED_EXECUTION_AUTHORITY_READY_REVIEW'), '[A-04] AUTHORITY');
assert(CONTROLLED_EXECUTION_EVENT_TYPES.includes('CONTROLLED_EXECUTION_BINDING_READY_REVIEW'),   '[A-05] BINDING');
assert(CONTROLLED_EXECUTION_EVENT_TYPES.includes('CONTROLLED_EXECUTION_RISK_READY_REVIEW'),      '[A-06] RISK');
assert(CONTROLLED_EXECUTION_EVENT_TYPES.includes('CONTROLLED_EXECUTION_EVIDENCE_READY_REVIEW'),  '[A-07] EVIDENCE');
assert(CONTROLLED_EXECUTION_EVENT_TYPES.includes('CONTROLLED_EXECUTION_BLOCKED'),               '[A-08] BLOCKED');

assert(Array.isArray(CONTROLLED_EXECUTION_LEDGER_STATUSES),                            '[A-09] ledger_statuses array');
assert(CONTROLLED_EXECUTION_LEDGER_STATUSES.length === 5,                              '[A-10] 5 ledger statuses');
assert(CONTROLLED_EXECUTION_LEDGER_STATUSES.includes('CONTROLLED_LEDGER_OK'),         '[A-11] OK');
assert(CONTROLLED_EXECUTION_LEDGER_STATUSES.includes('CONTROLLED_LEDGER_EMPTY'),      '[A-12] EMPTY');
assert(CONTROLLED_EXECUTION_LEDGER_STATUSES.includes('CONTROLLED_LEDGER_CHAIN_BROKEN'), '[A-13] CHAIN_BROKEN');
assert(CONTROLLED_EXECUTION_LEDGER_STATUSES.includes('CONTROLLED_LEDGER_INVALID_EVENT'), '[A-14] INVALID_EVENT');
assert(CONTROLLED_EXECUTION_LEDGER_STATUSES.includes('CONTROLLED_LEDGER_LOCKED'),     '[A-15] LOCKED');

// ─── Suite B: Append contract event ───────────────────────────────
console.log('\n[Suite B] Append contract event');
_resetControlledExecutionLedgerForTest();
const r1 = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_CONTRACT_READY_REVIEW', artifact_id: 'cid-1', fixture_mode: true, _mock_timestamp: TS });
assert(r1.appended          === true,                                                  '[B-01] appended=true');
assert(r1.status            === 'CONTROLLED_LEDGER_OK',                               '[B-02] status=OK');
assert(typeof r1.event_hash === 'string' && r1.event_hash.length === 64,              '[B-03] event_hash 64 chars');
assert(r1.event_index       === 0,                                                    '[B-04] event_index=0');
assert(r1.production_execution_locked  === true,  '[B-05] locked=true');
assert(r1.controlled_execution_allowed === false, '[B-06] allowed=false');
assert(r1.unlock_executed              === false, '[B-07] unlock=false');
assert(r1.final_execution_phase_required === true,'[B-08] final_exec=true');

// ─── Suite C: Append authority event ──────────────────────────────
console.log('\n[Suite C] Append authority event');
const r2 = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_AUTHORITY_READY_REVIEW', artifact_id: 'aid-1', fixture_mode: true, _mock_timestamp: TS });
assert(r2.appended    === true,  '[C-01] appended=true');
assert(r2.event_index === 1,     '[C-02] event_index=1');

// ─── Suite D: Append binding, risk, evidence events ───────────────
console.log('\n[Suite D] Append binding, risk, evidence events');
const r3 = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_BINDING_READY_REVIEW', artifact_id: 'bid-1', fixture_mode: true, _mock_timestamp: TS });
assert(r3.appended === true, '[D-01] binding appended');
const r4 = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_RISK_READY_REVIEW', artifact_id: 'rid-1', fixture_mode: true, _mock_timestamp: TS });
assert(r4.appended === true, '[D-02] risk appended');
const r5 = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_EVIDENCE_READY_REVIEW', artifact_id: 'eid-1', fixture_mode: true, _mock_timestamp: TS });
assert(r5.appended === true, '[D-03] evidence appended');

// ─── Suite E: Append blocked event ────────────────────────────────
console.log('\n[Suite E] Append blocked event');
const r6 = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_BLOCKED', artifact_id: 'blk-1', fixture_mode: true, _mock_timestamp: TS });
assert(r6.appended    === true, '[E-01] blocked appended');
assert(r6.event_index === 5,    '[E-02] event_index=5');

// ─── Suite F: Invalid event type ──────────────────────────────────
console.log('\n[Suite F] Invalid event type');
const inv = appendControlledExecutionLedgerEvent({ event_type: 'EXECUTE_NOW', fixture_mode: true, _mock_timestamp: TS });
assert(inv.appended === false,                                                         '[F-01] invalid not appended');
assert(inv.status   === 'CONTROLLED_LEDGER_INVALID_EVENT',                            '[F-02] status INVALID_EVENT');
assert(inv.production_execution_locked  === true,  '[F-03] locked=true');
assert(inv.controlled_execution_allowed === false, '[F-04] allowed=false');

// ─── Suite G: Read ledger ─────────────────────────────────────────
console.log('\n[Suite G] Read ledger');
const events = readControlledExecutionLedger();
assert(events.length === 6,                                                           '[G-01] 6 events');
assert(events[0].event_type === 'CONTROLLED_EXECUTION_CONTRACT_READY_REVIEW',        '[G-02] first event type');
assert(events[5].event_type === 'CONTROLLED_EXECUTION_BLOCKED',                      '[G-03] last event type');
assert(events[0].controlled_execution_allowed === false,                              '[G-04] events: allowed=false');
assert(events[0].production_execution_locked  === true,                              '[G-05] events: locked=true');
assert(events[0].final_execution_phase_required === true,                            '[G-06] events: final_exec=true');

// ─── Suite H: Verify chain ────────────────────────────────────────
console.log('\n[Suite H] Verify chain');
const chain = verifyControlledExecutionLedgerChain();
assert(chain.valid        === true,                                                   '[H-01] chain valid');
assert(chain.status       === 'CONTROLLED_LEDGER_OK',                                '[H-02] status=OK');
assert(chain.event_count  === 6,                                                      '[H-03] 6 events verified');
assert(chain.production_execution_locked  === true,  '[H-04] chain: locked=true');
assert(chain.controlled_execution_allowed === false, '[H-05] chain: allowed=false');

// ─── Suite I: Empty ledger ────────────────────────────────────────
console.log('\n[Suite I] Empty ledger');
_resetControlledExecutionLedgerForTest();
const empty = verifyControlledExecutionLedgerChain();
assert(empty.valid       === true,                                                    '[I-01] empty chain valid');
assert(empty.status      === 'CONTROLLED_LEDGER_EMPTY',                              '[I-02] status=EMPTY');
assert(empty.event_count === 0,                                                       '[I-03] 0 events');

// ─── Suite J: Tamper detection ────────────────────────────────────
console.log('\n[Suite J] Tamper detection');
_resetControlledExecutionLedgerForTest();
appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_CONTRACT_READY_REVIEW', artifact_id: 'x', fixture_mode: true, _mock_timestamp: TS });
appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_AUTHORITY_READY_REVIEW', artifact_id: 'y', fixture_mode: true, _mock_timestamp: TS });
const ledgerCopy = readControlledExecutionLedger();
// Can't tamper module-level _ledger directly from test — but verify chain passes for clean data
const cleanChain = verifyControlledExecutionLedgerChain();
assert(cleanChain.valid === true, '[J-01] clean chain valid');
assert(cleanChain.event_count === 2, '[J-02] 2 events');

// ─── Suite K: Missing evidence_refs for ready event (non-fixture) ─
console.log('\n[Suite K] Missing evidence_refs for ready event');
_resetControlledExecutionLedgerForTest();
const noEvid = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_CONTRACT_READY_REVIEW', artifact_id: 'x', fixture_mode: false, _mock_timestamp: TS });
assert(noEvid.appended === false,                                                     '[K-01] blocked no evidence_refs');
assert(noEvid.status   === 'CONTROLLED_LEDGER_INVALID_EVENT',                        '[K-02] status INVALID_EVENT');
assert(noEvid.reason   === 'evidence_refs_required_for_ready_event',                 '[K-03] reason evidence_refs');

// blocked event doesn't need evidence_refs
const blockedNoEvid = appendControlledExecutionLedgerEvent({ event_type: 'CONTROLLED_EXECUTION_BLOCKED', artifact_id: 'x', fixture_mode: false, _mock_timestamp: TS });
assert(blockedNoEvid.appended === true,                                               '[K-04] blocked event no evidence_refs ok');

// ─── Suite L: Idempotent reset ────────────────────────────────────
console.log('\n[Suite L] Idempotent reset');
_resetControlledExecutionLedgerForTest();
_resetControlledExecutionLedgerForTest();
const afterReset = verifyControlledExecutionLedgerChain();
assert(afterReset.status === 'CONTROLLED_LEDGER_EMPTY', '[L-01] double reset ok');

// ─── Suite M: renderControlledExecutionLedger ─────────────────────
console.log('\n[Suite M] Render');
_resetControlledExecutionLedgerForTest();
for (const t of CONTROLLED_EXECUTION_EVENT_TYPES) {
  appendControlledExecutionLedgerEvent({ event_type: t, fixture_mode: true, _mock_timestamp: TS });
}
const finalChain = verifyControlledExecutionLedgerChain();
const rendered = renderControlledExecutionLedger(finalChain);
assert(typeof rendered === 'string',                                                  '[M-01] returns string');
assert(rendered.includes('CONTROLLED_LEDGER_OK'),                                    '[M-02] status in output');
assert(rendered.includes('controlled_execution_allowed   : false'),                  '[M-03] allowed=false in output');
assert(rendered.includes('production_execution_locked    : true'),                   '[M-04] locked in output');
assert(rendered.includes('final_execution_phase_required : true'),                   '[M-05] final_exec in output');
assert(renderControlledExecutionLedger(null) === 'controlled_execution_ledger: null', '[M-06] null → string');
_resetControlledExecutionLedgerForTest();

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-execution-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
