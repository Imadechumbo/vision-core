#!/usr/bin/env node
/**
 * Real Release Locked Report — Unit Tests V59.0
 */

import {
  buildRealReleaseLockedReport,
  renderRealReleaseLockedReport,
  LOCKED_REPORT_STATUSES,
  LOCKED_REPORT_SAFE_NEXT_ACTIONS,
} from '../real-release-locked-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const FIXTURE_GATE = {
  gate_id:    'gate-abc',
  gate_status: 'REAL_GATE_READY_LOCKED',
  gate_ready:  true,
};
const FIXTURE_LOCK = {
  lock_id:     'lock-abc',
  lock_status: 'PRODUCTION_LOCK_ACTIVE',
  lock_active: true,
};
const FIXTURE_READINESS = {
  real_release_readiness_status: 'REAL_READINESS_READY_LOCKED',
  real_release_readiness_ready:  true,
};
const FIXTURE_FINALIZER = {
  finalizer_id:     'fin-abc123456789012',
  finalizer_status: 'FINALIZER_READY_LOCKED',
  finalizer_ready:  true,
};
const FIXTURE_LEDGER_CHAIN = { valid: true, entries: 4 };
const FIXTURE_EVENT_IDS    = ['evt-1', 'evt-2', 'evt-3', 'evt-4'];

const VALID_PARAMS = {
  gate:             FIXTURE_GATE,
  lock:             FIXTURE_LOCK,
  readiness:        FIXTURE_READINESS,
  finalizer:        FIXTURE_FINALIZER,
  ledger_chain:     FIXTURE_LEDGER_CHAIN,
  ledger_event_ids: FIXTURE_EVENT_IDS,
  _mock_timestamp:  TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(LOCKED_REPORT_STATUSES),                                       '[A-01] statuses array');
assert(LOCKED_REPORT_STATUSES.length === 6,                                         '[A-02] 6 statuses');
assert(LOCKED_REPORT_STATUSES.includes('LOCKED_REPORT_BLOCKED_GATE'),              '[A-03] BLOCKED_GATE');
assert(LOCKED_REPORT_STATUSES.includes('LOCKED_REPORT_BLOCKED_LOCK'),              '[A-04] BLOCKED_LOCK');
assert(LOCKED_REPORT_STATUSES.includes('LOCKED_REPORT_BLOCKED_READINESS'),         '[A-05] BLOCKED_READINESS');
assert(LOCKED_REPORT_STATUSES.includes('LOCKED_REPORT_BLOCKED_FINALIZER'),         '[A-06] BLOCKED_FINALIZER');
assert(LOCKED_REPORT_STATUSES.includes('LOCKED_REPORT_BLOCKED_LEDGER'),            '[A-07] BLOCKED_LEDGER');
assert(LOCKED_REPORT_STATUSES.includes('LOCKED_REPORT_READY'),                     '[A-08] READY');

assert(Array.isArray(LOCKED_REPORT_SAFE_NEXT_ACTIONS),                              '[A-09] safe_next_actions array');
assert(LOCKED_REPORT_SAFE_NEXT_ACTIONS.includes('do_not_execute_production_in_this_phase'), '[A-10] do_not_execute');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = buildRealReleaseLockedReport({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                             '[B-01] returns object');
assert(fixture.report_status            === 'LOCKED_REPORT_READY',                '[B-02] status=LOCKED_REPORT_READY');
assert(fixture.report_ready             === true,                                   '[B-03] report_ready=true');
assert(fixture.schema_version           === 'v59.0',                              '[B-04] schema=v59.0');
assert(typeof fixture.report_id         === 'string' && fixture.report_id.length === 24, '[B-05] report_id 24 chars');
assert(typeof fixture.report_hash       === 'string' && fixture.report_hash.length === 48, '[B-06] hash 48 chars');
assert(fixture.gate_status              === 'REAL_GATE_READY_LOCKED',             '[B-07] gate_status');
assert(fixture.lock_status              === 'PRODUCTION_LOCK_ACTIVE',             '[B-08] lock_status');
assert(fixture.readiness_status         === 'REAL_READINESS_READY_LOCKED',        '[B-09] readiness_status');
assert(fixture.finalizer_status         === 'FINALIZER_READY_LOCKED',             '[B-10] finalizer_status');
assert(fixture.ledger_entries           === 4,                                      '[B-11] 4 ledger_entries');
assert(fixture.ledger_chain_valid       === true,                                   '[B-12] ledger_chain_valid=true');
assert(Array.isArray(fixture.ledger_event_ids) && fixture.ledger_event_ids.length === 4, '[B-13] 4 event_ids');
assert(fixture.production_execution_locked === true,                                '[B-14] locked=true');
assert(fixture.immutable                === true,                                   '[B-15] immutable=true');
assert(fixture.human_review_required    === true,                                   '[B-16] human_review=true');
assert(fixture.blocking_reason          === null,                                   '[B-17] blocking_reason=null');
assert(Array.isArray(fixture.safe_next_actions),                                    '[B-18] safe_next_actions array');

// ─── Suite C: Blocked cases ────────────────────────────────────────
console.log('\n[Suite C] Blocked cases');
const noGate = buildRealReleaseLockedReport({ ...VALID_PARAMS, gate: null });
assert(noGate.report_status             === 'LOCKED_REPORT_BLOCKED_GATE',          '[C-01] no gate → BLOCKED_GATE');
assert(noGate.report_ready              === false,                                  '[C-02] report_ready=false');

const badGate = buildRealReleaseLockedReport({ ...VALID_PARAMS, gate: { gate_status: 'REAL_GATE_BLOCKED_HANDOFF', gate_ready: false } });
assert(badGate.report_status            === 'LOCKED_REPORT_BLOCKED_GATE',          '[C-03] gate not ready → BLOCKED_GATE');

const noLock = buildRealReleaseLockedReport({ ...VALID_PARAMS, lock: null });
assert(noLock.report_status             === 'LOCKED_REPORT_BLOCKED_LOCK',          '[C-04] no lock → BLOCKED_LOCK');

const badLock = buildRealReleaseLockedReport({ ...VALID_PARAMS, lock: { lock_status: 'PRODUCTION_LOCK_BLOCKED_GATE', lock_active: false } });
assert(badLock.report_status            === 'LOCKED_REPORT_BLOCKED_LOCK',          '[C-05] lock not active → BLOCKED_LOCK');

const noReadiness = buildRealReleaseLockedReport({ ...VALID_PARAMS, readiness: null });
assert(noReadiness.report_status        === 'LOCKED_REPORT_BLOCKED_READINESS',     '[C-06] no readiness → BLOCKED_READINESS');

const wrongReadiness = buildRealReleaseLockedReport({ ...VALID_PARAMS, readiness: { real_release_readiness_status: 'REAL_READINESS_BLOCKED_GATE' } });
assert(wrongReadiness.report_status     === 'LOCKED_REPORT_BLOCKED_READINESS',     '[C-07] wrong readiness → BLOCKED_READINESS');

const noFinalizer = buildRealReleaseLockedReport({ ...VALID_PARAMS, finalizer: null });
assert(noFinalizer.report_status        === 'LOCKED_REPORT_BLOCKED_FINALIZER',     '[C-08] no finalizer → BLOCKED_FINALIZER');

const badFinalizer = buildRealReleaseLockedReport({ ...VALID_PARAMS, finalizer: { finalizer_status: 'FINALIZER_BLOCKED_READINESS', finalizer_ready: false } });
assert(badFinalizer.report_status       === 'LOCKED_REPORT_BLOCKED_FINALIZER',     '[C-09] finalizer not ready → BLOCKED_FINALIZER');

const noLedger = buildRealReleaseLockedReport({ ...VALID_PARAMS, ledger_chain: { valid: false } });
assert(noLedger.report_status           === 'LOCKED_REPORT_BLOCKED_LEDGER',        '[C-10] invalid ledger → BLOCKED_LEDGER');

const noEvents = buildRealReleaseLockedReport({ ...VALID_PARAMS, ledger_event_ids: [] });
assert(noEvents.report_status           === 'LOCKED_REPORT_BLOCKED_LEDGER',        '[C-11] empty events → BLOCKED_LEDGER');

// ─── Suite D: Full report ready ────────────────────────────────────
console.log('\n[Suite D] Full report ready');
const full = buildRealReleaseLockedReport(VALID_PARAMS);
assert(full.report_status               === 'LOCKED_REPORT_READY',                '[D-01] status=LOCKED_REPORT_READY');
assert(full.report_ready                === true,                                   '[D-02] report_ready=true');
assert(full.gate_status                 === 'REAL_GATE_READY_LOCKED',             '[D-03] gate_status preserved');
assert(full.lock_status                 === 'PRODUCTION_LOCK_ACTIVE',             '[D-04] lock_status preserved');
assert(full.readiness_status            === 'REAL_READINESS_READY_LOCKED',        '[D-05] readiness_status preserved');
assert(full.finalizer_status            === 'FINALIZER_READY_LOCKED',             '[D-06] finalizer_status preserved');
assert(full.ledger_chain_valid          === true,                                   '[D-07] ledger_chain_valid=true');
assert(full.ledger_event_ids.length     === 4,                                      '[D-08] 4 event_ids');
assert(typeof full.report_hash          === 'string' && full.report_hash.length === 48, '[D-09] hash 48 chars');
assert(full.immutable                   === true,                                   '[D-10] immutable=true');
assert(full.production_execution_locked === true,                                   '[D-11] locked=true');
assert(full.blocking_reason             === null,                                   '[D-12] blocking_reason=null');

// ─── Suite E: Deterministic hash ──────────────────────────────────
console.log('\n[Suite E] Deterministic hash');
const a = buildRealReleaseLockedReport(VALID_PARAMS);
const b = buildRealReleaseLockedReport(VALID_PARAMS);
assert(a.report_hash === b.report_hash,                                             '[E-01] same inputs → same hash');
assert(a.report_id   === b.report_id,                                               '[E-02] same inputs → same report_id');

const c = buildRealReleaseLockedReport({ ...VALID_PARAMS, _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.report_hash !== c.report_hash,                                             '[E-03] diff timestamp → diff hash');

// ─── Suite F: renderRealReleaseLockedReport ────────────────────────
console.log('\n[Suite F] renderRealReleaseLockedReport');
const rendered = renderRealReleaseLockedReport(full);
assert(typeof rendered                  === 'string',                               '[F-01] returns string');
assert(rendered.includes('LOCKED_REPORT_READY'),                                   '[F-02] contains status');
assert(rendered.includes('production_execution_locked  : true'),                   '[F-03] lock in output');
assert(rendered.includes('immutable                    : true'),                    '[F-04] immutable in output');
assert(rendered.includes('REAL_GATE_READY_LOCKED'),                                '[F-05] gate_status in output');
assert(renderRealReleaseLockedReport(null) === 'locked_report: null',              '[F-06] null → "locked_report: null"');

// ─── Suite G: Invariants ─────────────────────────────────────────
console.log('\n[Suite G] Invariants');
const cases = [fixture, noGate, noLock, noReadiness, noFinalizer, noLedger, full];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[G] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[G] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[G] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[G] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[G] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[G] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[G] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[G] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[G] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[G] case ${i}: production_execution_locked=true`);
  assert(o.unlock_required             === true,  `[G] case ${i}: unlock_required=true`);
  assert(o.immutable                   === true,  `[G] case ${i}: immutable=true`);
  assert(o.human_review_required       === true,  `[G] case ${i}: human_review_required=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-release-locked-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
