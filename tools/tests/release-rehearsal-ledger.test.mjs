#!/usr/bin/env node
/**
 * Release Rehearsal Ledger — Unit Tests V53.0
 */

import {
  appendRehearsalLedgerEvent,
  verifyRehearsalLedgerChain,
  readRehearsalLedger,
  _resetRehearsalLedgerForTest,
  REHEARSAL_LEDGER_EVENT_TYPES,
  REHEARSAL_LEDGER_STATUSES,
} from '../release-rehearsal-ledger.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';
const REHEARSAL_ID   = 'rehearsal-abc';
const EVIDENCE_REF   = ['receipt-abc'];
const EVIDENCE_SRC   = 'go-core';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REHEARSAL_LEDGER_EVENT_TYPES),                                   '[A-01] event types array');
assert(REHEARSAL_LEDGER_EVENT_TYPES.length === 6,                                     '[A-02] 6 event types');
assert(REHEARSAL_LEDGER_EVENT_TYPES.includes('RELEASE_SANDBOX_CREATED'),              '[A-03] SANDBOX_CREATED');
assert(REHEARSAL_LEDGER_EVENT_TYPES.includes('SANDBOX_POLICY_VERIFIED'),              '[A-04] POLICY_VERIFIED');
assert(REHEARSAL_LEDGER_EVENT_TYPES.includes('RELEASE_COMMANDS_SIMULATED'),           '[A-05] COMMANDS_SIMULATED');
assert(REHEARSAL_LEDGER_EVENT_TYPES.includes('IMMUTABLE_REHEARSAL_PLAN_READY'),       '[A-06] PLAN_READY');
assert(REHEARSAL_LEDGER_EVENT_TYPES.includes('RELEASE_REHEARSAL_READY'),              '[A-07] REHEARSAL_READY');
assert(REHEARSAL_LEDGER_EVENT_TYPES.includes('RELEASE_REHEARSAL_BLOCKED'),            '[A-08] REHEARSAL_BLOCKED');
assert(Array.isArray(REHEARSAL_LEDGER_STATUSES),                                      '[A-09] statuses array');
assert(REHEARSAL_LEDGER_STATUSES.length === 5,                                        '[A-10] 5 statuses');

// ─── Suite B: Empty ledger ────────────────────────────────────────
console.log('\n[Suite B] Empty ledger');
_resetRehearsalLedgerForTest();
const emptyChain = verifyRehearsalLedgerChain();
assert(emptyChain.valid              === true,                                         '[B-01] empty valid=true');
assert(emptyChain.entries            === 0,                                            '[B-02] entries=0');
assert(emptyChain.status             === 'REHEARSAL_LEDGER_READY',                    '[B-03] status=READY');
assert(emptyChain.deploy_allowed     === false,                                        '[B-04] deploy=false');

// ─── Suite C: Append events ───────────────────────────────────────
console.log('\n[Suite C] Append events');
_resetRehearsalLedgerForTest();

const r1 = appendRehearsalLedgerEvent({ event_type: 'RELEASE_SANDBOX_CREATED', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r1.appended === true,                                                           '[C-01] SANDBOX_CREATED appended');
assert(typeof r1.event_id === 'string',                                                '[C-02] event_id string');
assert(r1.index === 0,                                                                 '[C-03] index=0');

const r2 = appendRehearsalLedgerEvent({ event_type: 'SANDBOX_POLICY_VERIFIED', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r2.appended === true,                                                           '[C-04] POLICY_VERIFIED appended');
assert(r2.index === 1,                                                                 '[C-05] index=1');

const r3 = appendRehearsalLedgerEvent({ event_type: 'RELEASE_COMMANDS_SIMULATED', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r3.appended === true,                                                           '[C-06] COMMANDS_SIMULATED appended');

const r4 = appendRehearsalLedgerEvent({ event_type: 'IMMUTABLE_REHEARSAL_PLAN_READY', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
assert(r4.appended === true,                                                           '[C-07] PLAN_READY appended');

const r5 = appendRehearsalLedgerEvent({ event_type: 'RELEASE_REHEARSAL_READY', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, rehearsal_report_id: 'rpt-abc', _mock_timestamp: TS });
assert(r5.appended === true,                                                           '[C-08] REHEARSAL_READY appended');

const r6 = appendRehearsalLedgerEvent({ event_type: 'RELEASE_REHEARSAL_BLOCKED', actor_id: 'actor', _mock_timestamp: TS });
assert(r6.appended === true,                                                           '[C-09] REHEARSAL_BLOCKED appended (no evidence needed)');

for (const r of [r1, r2, r3, r4, r5, r6]) {
  assert(r.deploy_allowed    === false, `[C] event ${r.index ?? '?'}: deploy=false`);
  assert(r.release_performed === false, `[C] event ${r.index ?? '?'}: release_performed=false`);
  assert(r.tag_created       === false, `[C] event ${r.index ?? '?'}: tag_created=false`);
}

// ─── Suite D: Chain valid after 6 events ─────────────────────────
console.log('\n[Suite D] Chain valid');
const chain6 = verifyRehearsalLedgerChain();
assert(chain6.valid              === true,                                             '[D-01] chain valid=true');
assert(chain6.entries            === 6,                                                '[D-02] 6 entries');
assert(chain6.status             === 'REHEARSAL_LEDGER_READY',                        '[D-03] status=READY');
assert(chain6.tampered_at_index  === null,                                             '[D-04] no tamper');
assert(chain6.deploy_allowed     === false,                                            '[D-05] deploy=false');

// ─── Suite E: Read ledger ─────────────────────────────────────────
console.log('\n[Suite E] Read ledger');
const ledger = readRehearsalLedger();
assert(ledger.entries  === 6,                                                          '[E-01] 6 entries');
assert(Array.isArray(ledger.events),                                                   '[E-02] events array');
assert(ledger.events.length === 6,                                                     '[E-03] 6 events');
assert(ledger.deploy_allowed === false,                                                '[E-04] deploy=false');

// ─── Suite F: Blocked — unknown event type ────────────────────────
console.log('\n[Suite F] Blocked — invalid event type');
_resetRehearsalLedgerForTest();
const badType = appendRehearsalLedgerEvent({ event_type: 'UNKNOWN_EVENT', actor_id: 'actor' });
assert(badType.appended === false,                                                     '[F-01] unknown type → not appended');
assert(badType.status   === 'REHEARSAL_LEDGER_BLOCKED_EVENT_TYPE',                    '[F-02] status=BLOCKED_EVENT_TYPE');
assert(badType.deploy_allowed === false,                                               '[F-03] deploy=false');

// ─── Suite G: Blocked — missing evidence ─────────────────────────
console.log('\n[Suite G] Blocked — missing evidence');
_resetRehearsalLedgerForTest();
const noEvidence = appendRehearsalLedgerEvent({ event_type: 'RELEASE_SANDBOX_CREATED', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: [], _mock_timestamp: TS });
assert(noEvidence.appended === false,                                                  '[G-01] empty evidence → not appended');
assert(noEvidence.status   === 'REHEARSAL_LEDGER_BLOCKED_EVIDENCE',                   '[G-02] status=BLOCKED_EVIDENCE');

const noId = appendRehearsalLedgerEvent({ event_type: 'RELEASE_SANDBOX_CREATED', actor_id: 'actor', evidence_refs: EVIDENCE_REF, _mock_timestamp: TS });
assert(noId.appended === false,                                                        '[G-03] no rehearsal_id → not appended');
assert(noId.status   === 'REHEARSAL_LEDGER_BLOCKED_REHEARSAL_ID',                     '[G-04] status=BLOCKED_REHEARSAL_ID');

const badSrc = appendRehearsalLedgerEvent({ event_type: 'RELEASE_SANDBOX_CREATED', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: 'backend', _mock_timestamp: TS });
assert(badSrc.appended === false,                                                      '[G-05] backend source → not appended');
assert(badSrc.status   === 'REHEARSAL_LEDGER_BLOCKED_EVIDENCE',                       '[G-06] status=BLOCKED_EVIDENCE');

// ─── Suite H: Tamper detection ───────────────────────────────────
console.log('\n[Suite H] Tamper detection');
_resetRehearsalLedgerForTest();
appendRehearsalLedgerEvent({ event_type: 'RELEASE_SANDBOX_CREATED', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
appendRehearsalLedgerEvent({ event_type: 'SANDBOX_POLICY_VERIFIED', actor_id: 'actor', rehearsal_id: REHEARSAL_ID, evidence_refs: EVIDENCE_REF, evidence_source: EVIDENCE_SRC, _mock_timestamp: TS });
const chainOk = verifyRehearsalLedgerChain();
assert(chainOk.valid          === true,                                                '[H-01] clean chain valid');
assert(chainOk.deploy_allowed === false,                                               '[H-02] deploy=false');

// ─── Suite I: Invariants ─────────────────────────────────────────
console.log('\n[Suite I] Invariants');
_resetRehearsalLedgerForTest();
for (const et of REHEARSAL_LEDGER_EVENT_TYPES) {
  const isReady = ['RELEASE_SANDBOX_CREATED','SANDBOX_POLICY_VERIFIED','RELEASE_COMMANDS_SIMULATED','IMMUTABLE_REHEARSAL_PLAN_READY','RELEASE_REHEARSAL_READY'].includes(et);
  const r = appendRehearsalLedgerEvent({
    event_type:      et,
    actor_id:        'actor',
    rehearsal_id:    isReady ? REHEARSAL_ID : undefined,
    evidence_refs:   isReady ? EVIDENCE_REF : undefined,
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

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrelease-rehearsal-ledger: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
