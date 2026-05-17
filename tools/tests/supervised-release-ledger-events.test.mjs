#!/usr/bin/env node
/**
 * Supervised Release Ledger Events — Unit Tests V44.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  appendSupervisedLedgerEvent,
  verifySupervisedLedgerChain,
  readSupervisedLedger,
  _resetSupervisedLedgerForTest,
  SUPERVISED_LEDGER_EVENT_TYPES,
  SUPERVISED_LEDGER_STATUSES,
} from '../supervised-release-ledger-events.mjs';

const CLI = resolve(process.cwd(), 'tools', 'supervised-release-ledger-events.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(SUPERVISED_LEDGER_EVENT_TYPES),                                          '[A-01] event types array');
assert(SUPERVISED_LEDGER_EVENT_TYPES.length === 7,                                            '[A-02] 7 event types');
assert(SUPERVISED_LEDGER_EVENT_TYPES.includes('SUPERVISED_RC_CANDIDATE_DECLARED'),            '[A-03] RC_CANDIDATE_DECLARED');
assert(SUPERVISED_LEDGER_EVENT_TYPES.includes('SUPERVISED_RELEASE_INTENT_CREATED'),           '[A-04] RELEASE_INTENT_CREATED');
assert(SUPERVISED_LEDGER_EVENT_TYPES.includes('SUPERVISED_INTENT_AUTHORITY_BOUND'),           '[A-05] INTENT_AUTHORITY_BOUND');
assert(SUPERVISED_LEDGER_EVENT_TYPES.includes('SUPERVISED_PROMOTION_PACKAGE_BUILT'),          '[A-06] PROMOTION_PACKAGE_BUILT');
assert(SUPERVISED_LEDGER_EVENT_TYPES.includes('SUPERVISED_PROMOTION_REVIEW_REQUESTED'),       '[A-07] PROMOTION_REVIEW_REQUESTED');
assert(SUPERVISED_LEDGER_EVENT_TYPES.includes('SUPERVISED_PROMOTION_REVIEW_COMPLETED'),       '[A-08] PROMOTION_REVIEW_COMPLETED');
assert(SUPERVISED_LEDGER_EVENT_TYPES.includes('SUPERVISED_RELEASE_CONTROL_PLANE_CHECKED'),   '[A-09] CONTROL_PLANE_CHECKED');
assert(Array.isArray(SUPERVISED_LEDGER_STATUSES),                                             '[A-10] statuses array');
assert(SUPERVISED_LEDGER_STATUSES.length === 4,                                               '[A-11] 4 statuses');
assert(SUPERVISED_LEDGER_STATUSES.includes('SUPERVISED_LEDGER_READY'),                        '[A-12] READY');
assert(SUPERVISED_LEDGER_STATUSES.includes('SUPERVISED_LEDGER_BLOCKED_EVENT_TYPE'),           '[A-13] BLOCKED_EVENT_TYPE');
assert(SUPERVISED_LEDGER_STATUSES.includes('SUPERVISED_LEDGER_BLOCKED_INVARIANTS'),           '[A-14] BLOCKED_INVARIANTS');
assert(SUPERVISED_LEDGER_STATUSES.includes('SUPERVISED_LEDGER_BLOCKED_PAYLOAD'),              '[A-15] BLOCKED_PAYLOAD');

// ─── Suite B: Blocked — invalid event type ────────────────────────
console.log('\n[Suite B] Blocked — invalid event type');
_resetSupervisedLedgerForTest();
const badType = appendSupervisedLedgerEvent({ event_type: 'FAKE_EVENT', _mock_timestamp: TS });
assert(badType.supervised_ledger_status === 'SUPERVISED_LEDGER_BLOCKED_EVENT_TYPE', '[B-01] bad type → BLOCKED_EVENT_TYPE');
assert(badType.supervised_ledger_ready  === false,                                  '[B-02] ready=false');
assert(badType.event_id                 === null,                                   '[B-03] event_id=null');
assert(badType.blocking_reason.includes('invalid_event_type'),                      '[B-04] blocking reason');
assert(badType.deploy_allowed           === false,                                  '[B-05] deploy=false');
assert(badType.promotion_allowed        === false,                                  '[B-06] promotion=false');
// Blocked event does not append to ledger
assert(readSupervisedLedger().length    === 0,                                      '[B-07] no entry appended');

const noType = appendSupervisedLedgerEvent({ _mock_timestamp: TS });
assert(noType.supervised_ledger_status === 'SUPERVISED_LEDGER_BLOCKED_EVENT_TYPE',  '[B-08] undefined type → BLOCKED');

// ─── Suite C: Blocked — evidence source invalid ───────────────────
console.log('\n[Suite C] Blocked — bad evidence source');
_resetSupervisedLedgerForTest();
const badEvidence = appendSupervisedLedgerEvent({
  event_type:      'SUPERVISED_RC_CANDIDATE_DECLARED',
  evidence_source: 'backend',
  _mock_timestamp: TS,
});
assert(badEvidence.supervised_ledger_status === 'SUPERVISED_LEDGER_BLOCKED_INVARIANTS', '[C-01] bad source → BLOCKED_INVARIANTS');
assert(badEvidence.supervised_ledger_ready  === false,                                  '[C-02] ready=false');
assert(badEvidence.blocking_reason.includes('evidence_source_invalid'),                '[C-03] blocking reason');
assert(readSupervisedLedger().length        === 0,                                     '[C-04] no entry appended');

// ─── Suite D: Blocked — payload invariants ────────────────────────
console.log('\n[Suite D] Blocked — payload invariants');
_resetSupervisedLedgerForTest();
const badPayloadDeploy = appendSupervisedLedgerEvent({
  event_type: 'SUPERVISED_RC_CANDIDATE_DECLARED',
  payload:    { deploy_allowed: true },
  _mock_timestamp: TS,
});
assert(badPayloadDeploy.supervised_ledger_status === 'SUPERVISED_LEDGER_BLOCKED_INVARIANTS', '[D-01] deploy=true in payload → BLOCKED');
assert(badPayloadDeploy.blocking_reason          === 'payload_invariants_violated',          '[D-02] blocking reason');
assert(readSupervisedLedger().length             === 0,                                      '[D-03] no entry appended');

const badPayloadPromotion = appendSupervisedLedgerEvent({
  event_type: 'SUPERVISED_RC_CANDIDATE_DECLARED',
  payload:    { promotion_allowed: true },
  _mock_timestamp: TS,
});
assert(badPayloadPromotion.supervised_ledger_status === 'SUPERVISED_LEDGER_BLOCKED_INVARIANTS', '[D-04] promotion=true in payload → BLOCKED');

// ─── Suite E: Single event append ────────────────────────────────
console.log('\n[Suite E] Single event append');
_resetSupervisedLedgerForTest();
const r1 = appendSupervisedLedgerEvent({
  event_type:      'SUPERVISED_RC_CANDIDATE_DECLARED',
  actor_id:        'test-operator-440',
  rc_id:           'supervised_rc_abc123',
  intent_id:       'intent-v440-test',
  evidence_source: 'go-core',
  payload:         { target_version: 'v44.0' },
  _mock_timestamp: TS,
});
assert(r1.supervised_ledger_status === 'SUPERVISED_LEDGER_READY',   '[E-01] status=READY');
assert(r1.supervised_ledger_ready  === true,                        '[E-02] ready=true');
assert(typeof r1.event_id          === 'string',                    '[E-03] event_id is string');
assert(r1.event_id.length          === 24,                          '[E-04] event_id length=24');
assert(r1.seq                      === 0,                           '[E-05] first entry seq=0');
assert(typeof r1.chain_hash        === 'string',                    '[E-06] chain_hash present');
assert(r1.chain_hash.length        === 64,                          '[E-07] chain_hash=64 chars');
assert(r1.event_type               === 'SUPERVISED_RC_CANDIDATE_DECLARED', '[E-08] event_type echoed');
assert(r1.actor_id                 === 'test-operator-440',         '[E-09] actor_id echoed');
assert(r1.rc_id                    === 'supervised_rc_abc123',      '[E-10] rc_id echoed');
assert(r1.intent_id                === 'intent-v440-test',          '[E-11] intent_id echoed');
assert(r1.evidence_source          === 'go-core',                   '[E-12] evidence_source echoed');
assert(r1.timestamp                === TS,                          '[E-13] timestamp=mock');
assert(r1.ledger_size              === 1,                           '[E-14] ledger_size=1');
assert(r1.blocking_reason          === null,                        '[E-15] blocking_reason=null');
assert(r1.deploy_allowed           === false,                       '[E-16] deploy=false');
assert(r1.promotion_allowed        === false,                       '[E-17] promotion=false');
assert(r1.stable_allowed           === false,                       '[E-18] stable=false');
assert(r1.tag_allowed              === false,                       '[E-19] tag=false');
assert(r1.release_performed        === false,                       '[E-20] release_performed=false');
assert(r1.promote_performed        === false,                       '[E-21] promote_performed=false');
assert(r1.schema_version           === 'v44.0',                     '[E-22] schema=v44.0');

// Ledger now has 1 entry
assert(readSupervisedLedger().length === 1,                         '[E-23] ledger has 1 entry');

// ─── Suite F: Hash chain — multiple events ─────────────────────────
console.log('\n[Suite F] Hash chain — multiple events');
_resetSupervisedLedgerForTest();

const events = [];
for (const eventType of SUPERVISED_LEDGER_EVENT_TYPES) {
  const r = appendSupervisedLedgerEvent({
    event_type:      eventType,
    actor_id:        'test-operator',
    evidence_source: 'go-core',
    _mock_timestamp: TS,
  });
  events.push(r);
}

assert(events.length === 7,                                         '[F-01] 7 events appended');
for (let i = 0; i < events.length; i++) {
  assert(events[i].seq === i,                                       `[F-02] seq=${i} correct`);
  assert(events[i].supervised_ledger_ready === true,               `[F-03] ready=true (seq=${i})`);
}
assert(readSupervisedLedger().length === 7,                         '[F-04] ledger has 7 entries');

const chain = verifySupervisedLedgerChain();
assert(chain.valid === true,                                        '[F-05] chain valid=true');
assert(chain.entries === 7,                                         '[F-06] chain entries=7');
assert(chain.broken_at === null,                                    '[F-07] broken_at=null');

// Chain links: prev entry chain_hash = next entry prev_hash
const ledger = readSupervisedLedger();
for (let i = 1; i < ledger.length; i++) {
  assert(ledger[i].prev_hash === ledger[i - 1].chain_hash,         `[F-08] chain link correct (seq=${i})`);
}

// ─── Suite G: Deterministic event_id ─────────────────────────────
console.log('\n[Suite G] Deterministic event_id');
_resetSupervisedLedgerForTest();
const evA = appendSupervisedLedgerEvent({
  event_type: 'SUPERVISED_RC_CANDIDATE_DECLARED',
  actor_id:   'op-1',
  _mock_timestamp: TS,
});
_resetSupervisedLedgerForTest();
const evB = appendSupervisedLedgerEvent({
  event_type: 'SUPERVISED_RC_CANDIDATE_DECLARED',
  actor_id:   'op-1',
  _mock_timestamp: TS,
});
assert(evA.event_id === evB.event_id,                               '[G-01] event_id deterministic');

// Different actors → different event_id
_resetSupervisedLedgerForTest();
const evC = appendSupervisedLedgerEvent({
  event_type: 'SUPERVISED_RC_CANDIDATE_DECLARED',
  actor_id:   'op-2',
  _mock_timestamp: TS,
});
assert(evA.event_id !== evC.event_id,                               '[G-02] different actor → different id');

// ─── Suite H: Null evidence source allowed ────────────────────────
console.log('\n[Suite H] Null/omitted evidence source allowed');
_resetSupervisedLedgerForTest();
const nullEvidence = appendSupervisedLedgerEvent({
  event_type: 'SUPERVISED_PROMOTION_REVIEW_REQUESTED',
  _mock_timestamp: TS,
});
assert(nullEvidence.supervised_ledger_ready === true,               '[H-01] null evidence source allowed');
assert(nullEvidence.evidence_source         === null,               '[H-02] evidence_source=null in result');

// ─── Suite I: Append-only — reset clears entries ─────────────────
console.log('\n[Suite I] Append-only / reset');
_resetSupervisedLedgerForTest();
appendSupervisedLedgerEvent({ event_type: 'SUPERVISED_RC_CANDIDATE_DECLARED', _mock_timestamp: TS });
assert(readSupervisedLedger().length === 1,                         '[I-01] 1 entry after append');
_resetSupervisedLedgerForTest();
assert(readSupervisedLedger().length === 0,                         '[I-02] 0 entries after reset');
const chain2 = verifySupervisedLedgerChain();
assert(chain2.valid === true,                                       '[I-03] empty chain valid=true');
assert(chain2.entries === 0,                                        '[I-04] empty chain entries=0');

// ─── Suite J: All event types individually ────────────────────────
console.log('\n[Suite J] Each event type appends successfully');
for (const eventType of SUPERVISED_LEDGER_EVENT_TYPES) {
  _resetSupervisedLedgerForTest();
  const r = appendSupervisedLedgerEvent({ event_type: eventType, _mock_timestamp: TS });
  assert(r.supervised_ledger_ready === true,          `[J] ${eventType} → READY`);
  assert(r.deploy_allowed          === false,         `[J] ${eventType} deploy=false`);
  assert(r.promotion_allowed       === false,         `[J] ${eventType} promotion=false`);
}

// ─── Suite K: Invariants across all results ───────────────────────
console.log('\n[Suite K] Invariants');
_resetSupervisedLedgerForTest();
const goodEvent = appendSupervisedLedgerEvent({
  event_type: 'SUPERVISED_RC_CANDIDATE_DECLARED',
  _mock_timestamp: TS,
});
for (const [label, result] of [
  ['bad_type', badType],
  ['bad_evidence', badEvidence],
  ['bad_payload_deploy', badPayloadDeploy],
  ['bad_payload_promotion', badPayloadPromotion],
  ['good_event', goodEvent],
]) {
  assert(result.deploy_allowed    === false, `[K] deploy=false (${label})`);
  assert(result.promotion_allowed === false, `[K] promotion=false (${label})`);
  assert(result.stable_allowed    === false, `[K] stable=false (${label})`);
  assert(result.tag_allowed       === false, `[K] tag=false (${label})`);
  assert(result.release_performed === false, `[K] release_performed=false (${label})`);
  assert(result.promote_performed === false, `[K] promote_performed=false (${label})`);
}

// ─── Suite L: CLI ─────────────────────────────────────────────────
console.log('\n[Suite L] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 0,                                               '[L-01] default → exit 0');
assert(cliDefault.stdout.includes('SUPERVISED_RC_CANDIDATE_DECLARED'),          '[L-02] event types listed');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 0,                                                  '[L-03] --json exit 0');
let parsed = null;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                          '[L-04] JSON parseable');
assert(parsed && Array.isArray(parsed.event_types),                              '[L-05] event_types array');
assert(parsed && parsed.event_types.length === 7,                                '[L-06] 7 event types');
assert(parsed && parsed.schema_version === 'v44.0',                              '[L-07] schema=v44.0');

const cliDemo = runCLI(['--demo']);
assert(cliDemo.exitCode === 0,                                                   '[L-08] --demo exit 0');
assert(cliDemo.stdout.includes('SUPERVISED_LEDGER_READY'),                       '[L-09] demo shows READY');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nsupervised-release-ledger-events: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
