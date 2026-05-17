#!/usr/bin/env node
/**
 * Real Release Evidence Finalizer — Unit Tests V57.0
 */

import {
  buildRealReleaseEvidenceFinalizer,
  validateRealReleaseEvidenceFinalizer,
  renderRealReleaseEvidenceFinalizerSummary,
  FINALIZER_STATUSES,
} from '../real-release-evidence-finalizer.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const VALID_PARAMS = {
  gate_id:                               'gate-abc',
  lock_id:                               'lock-abc',
  readiness_status:                      'REAL_READINESS_READY_LOCKED',
  handoff_id:                            'handoff-abc',
  rehearsal_report_id:                   'rpt-abc',
  sandbox_baseline_id:                   'sb-abc',
  manual_execution_baseline_id:          'me-abc',
  supervised_control_plane_baseline_id:  'sup-abc',
  runtime_execution_baseline_id:         'rt-abc',
  evidence_receipt_id:                   'receipt-abc',
  evidence_source:                       'go-core',
  ledger_chain_refs:                     ['evt-1', 'evt-2'],
  _mock_timestamp:                       TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(FINALIZER_STATUSES),                                               '[A-01] FINALIZER_STATUSES array');
assert(FINALIZER_STATUSES.length === 5,                                                 '[A-02] 5 statuses');
assert(FINALIZER_STATUSES.includes('FINALIZER_BLOCKED_READINESS'),                    '[A-03] BLOCKED_READINESS');
assert(FINALIZER_STATUSES.includes('FINALIZER_BLOCKED_EVIDENCE'),                     '[A-04] BLOCKED_EVIDENCE');
assert(FINALIZER_STATUSES.includes('FINALIZER_BLOCKED_LEDGER'),                       '[A-05] BLOCKED_LEDGER');
assert(FINALIZER_STATUSES.includes('FINALIZER_BLOCKED_HASH'),                         '[A-06] BLOCKED_HASH');
assert(FINALIZER_STATUSES.includes('FINALIZER_READY_LOCKED'),                         '[A-07] READY_LOCKED');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = buildRealReleaseEvidenceFinalizer({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                '[B-01] returns object');
assert(fixture.finalizer_status          === 'FINALIZER_READY_LOCKED',               '[B-02] status=READY_LOCKED');
assert(fixture.finalizer_ready           === true,                                     '[B-03] finalizer_ready=true');
assert(fixture.schema_version            === 'v57.0',                                 '[B-04] schema_version=v57.0');
assert(typeof fixture.finalizer_id       === 'string' && fixture.finalizer_id.length === 24, '[B-05] finalizer_id 24 chars');
assert(typeof fixture.finalizer_hash     === 'string' && fixture.finalizer_hash.length === 48, '[B-06] finalizer_hash 48 chars');
assert(fixture.evidence_source           === 'go-core',                               '[B-07] evidence_source=go-core');
assert(fixture.immutable                 === true,                                     '[B-08] immutable=true');
assert(fixture.production_execution_locked === true,                                   '[B-09] locked=true');
assert(fixture.human_review_required     === true,                                     '[B-10] human_review_required=true');
assert(Array.isArray(fixture.ledger_chain_refs) && fixture.ledger_chain_refs.length === 3, '[B-11] 3 ledger_chain_refs');
assert(fixture.deploy_allowed            === false,                                    '[B-12] deploy_allowed=false');
assert(fixture.release_execution_allowed === false,                                    '[B-13] exec_allowed=false');
assert(fixture.blocking_reason           === null,                                     '[B-14] blocking_reason=null');
assert(fixture.readiness_status          === 'REAL_READINESS_READY_LOCKED',           '[B-15] readiness_status propagated');

// ─── Suite C: Blocked — readiness missing ─────────────────────────
console.log('\n[Suite C] Blocked cases');
const noReadiness = buildRealReleaseEvidenceFinalizer({ evidence_receipt_id: 'r', evidence_source: 'go-core', ledger_chain_refs: ['e'], _mock_timestamp: TS });
assert(noReadiness.finalizer_status      === 'FINALIZER_BLOCKED_READINESS',           '[C-01] no readiness → BLOCKED_READINESS');
assert(noReadiness.finalizer_ready       === false,                                    '[C-02] finalizer_ready=false');

const wrongReadiness = buildRealReleaseEvidenceFinalizer({ readiness_status: 'REAL_READINESS_BLOCKED_GATE', evidence_receipt_id: 'r', evidence_source: 'go-core', ledger_chain_refs: ['e'], _mock_timestamp: TS });
assert(wrongReadiness.finalizer_status   === 'FINALIZER_BLOCKED_READINESS',           '[C-03] wrong readiness → BLOCKED_READINESS');

const noEvidence = buildRealReleaseEvidenceFinalizer({ readiness_status: 'REAL_READINESS_READY_LOCKED', evidence_source: 'go-core', ledger_chain_refs: ['e'], _mock_timestamp: TS });
assert(noEvidence.finalizer_status       === 'FINALIZER_BLOCKED_EVIDENCE',            '[C-04] no receipt → BLOCKED_EVIDENCE');

const badSource = buildRealReleaseEvidenceFinalizer({ readiness_status: 'REAL_READINESS_READY_LOCKED', evidence_receipt_id: 'r', evidence_source: 'backend', ledger_chain_refs: ['e'], _mock_timestamp: TS });
assert(badSource.finalizer_status        === 'FINALIZER_BLOCKED_EVIDENCE',            '[C-05] backend source → BLOCKED_EVIDENCE');

const noLedger = buildRealReleaseEvidenceFinalizer({ readiness_status: 'REAL_READINESS_READY_LOCKED', evidence_receipt_id: 'r', evidence_source: 'go-core', ledger_chain_refs: [], _mock_timestamp: TS });
assert(noLedger.finalizer_status         === 'FINALIZER_BLOCKED_LEDGER',              '[C-06] empty ledger → BLOCKED_LEDGER');

// ─── Suite D: Full finalizer ready locked ─────────────────────────
console.log('\n[Suite D] Full finalizer ready locked');
const full = buildRealReleaseEvidenceFinalizer(VALID_PARAMS);
assert(full.finalizer_status             === 'FINALIZER_READY_LOCKED',               '[D-01] status=READY_LOCKED');
assert(full.finalizer_ready              === true,                                     '[D-02] finalizer_ready=true');
assert(full.gate_id                      === 'gate-abc',                              '[D-03] gate_id preserved');
assert(full.lock_id                      === 'lock-abc',                              '[D-04] lock_id preserved');
assert(full.evidence_receipt_id          === 'receipt-abc',                           '[D-05] receipt preserved');
assert(full.evidence_source              === 'go-core',                               '[D-06] source=go-core');
assert(full.ledger_chain_refs.length     === 2,                                        '[D-07] 2 ledger refs');
assert(typeof full.finalizer_hash        === 'string' && full.finalizer_hash.length === 48, '[D-08] hash 48 chars');
assert(full.immutable                    === true,                                     '[D-09] immutable=true');
assert(full.production_execution_locked  === true,                                     '[D-10] locked=true');
assert(full.blocking_reason              === null,                                     '[D-11] blocking_reason=null');

// ─── Suite E: Deterministic hash ──────────────────────────────────
console.log('\n[Suite E] Deterministic hash');
const a = buildRealReleaseEvidenceFinalizer(VALID_PARAMS);
const b = buildRealReleaseEvidenceFinalizer(VALID_PARAMS);
assert(a.finalizer_hash === b.finalizer_hash,                                           '[E-01] same inputs → same hash');
assert(a.finalizer_id   === b.finalizer_id,                                             '[E-02] same inputs → same finalizer_id');

const c = buildRealReleaseEvidenceFinalizer({ ...VALID_PARAMS, _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.finalizer_hash !== c.finalizer_hash,                                           '[E-03] diff timestamp → diff hash');

// ─── Suite F: validateRealReleaseEvidenceFinalizer ─────────────────
console.log('\n[Suite F] validateRealReleaseEvidenceFinalizer');
const vNull = validateRealReleaseEvidenceFinalizer(null);
assert(vNull.finalizer_status            === 'FINALIZER_BLOCKED_READINESS',           '[F-01] null → BLOCKED_READINESS');

const vBadSchema = validateRealReleaseEvidenceFinalizer({ schema_version: 'v1.0', finalizer_hash: 'x'.repeat(48), immutable: true, production_execution_locked: true });
assert(vBadSchema.finalizer_status       === 'FINALIZER_BLOCKED_READINESS',           '[F-02] bad schema → BLOCKED_READINESS');

const vNoHash = validateRealReleaseEvidenceFinalizer({ schema_version: 'v57.0', finalizer_hash: 'short', immutable: true, production_execution_locked: true });
assert(vNoHash.finalizer_status          === 'FINALIZER_BLOCKED_HASH',                '[F-03] short hash → BLOCKED_HASH');

const vNoImmutable = validateRealReleaseEvidenceFinalizer({ schema_version: 'v57.0', finalizer_hash: 'x'.repeat(48), immutable: false, production_execution_locked: true });
assert(vNoImmutable.finalizer_status     === 'FINALIZER_BLOCKED_READINESS',           '[F-04] immutable=false → BLOCKED_READINESS');

const vValid = validateRealReleaseEvidenceFinalizer(full);
assert(vValid.valid                      === true,                                     '[F-05] valid finalizer passes');
assert(vValid.production_execution_locked === true,                                    '[F-06] lock preserved');

// ─── Suite G: renderRealReleaseEvidenceFinalizerSummary ───────────
console.log('\n[Suite G] renderRealReleaseEvidenceFinalizerSummary');
const rendered = renderRealReleaseEvidenceFinalizerSummary(full);
assert(typeof rendered                   === 'string',                                 '[G-01] returns string');
assert(rendered.includes('FINALIZER_READY_LOCKED'),                                   '[G-02] contains status');
assert(rendered.includes('production_execution_locked  : true'),                      '[G-03] lock in output');
assert(rendered.includes('immutable                    : true'),                       '[G-04] immutable in output');
assert(rendered.includes('go-core'),                                                   '[G-05] evidence_source in output');
assert(renderRealReleaseEvidenceFinalizerSummary(null) === 'finalizer: null',         '[G-06] null → "finalizer: null"');

// ─── Suite H: Invariants ─────────────────────────────────────────
console.log('\n[Suite H] Invariants');
const cases = [fixture, noReadiness, noEvidence, badSource, noLedger, full];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[H] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[H] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[H] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[H] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[H] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[H] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[H] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[H] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[H] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[H] case ${i}: production_execution_locked=true`);
  assert(o.immutable                   === true,  `[H] case ${i}: immutable=true`);
  assert(o.human_review_required       === true,  `[H] case ${i}: human_review_required=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-release-evidence-finalizer: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
