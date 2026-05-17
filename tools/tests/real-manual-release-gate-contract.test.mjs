#!/usr/bin/env node
/**
 * Real Manual Release Gate Contract — Unit Tests V56.0
 */

import {
  createRealManualReleaseGate,
  validateRealManualReleaseGate,
  normalizeRealManualReleaseGate,
  renderRealManualReleaseGateSummary,
  REAL_GATE_STATUSES,
} from '../real-manual-release-gate-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const VALID_PARAMS = {
  handoff_id:                   'handoff-abc',
  rehearsal_report_id:          'rpt-abc',
  sandbox_baseline_id:          'sb-baseline-abc',
  manual_execution_baseline_id: 'me-baseline-abc',
  evidence_receipt_id:          'receipt-abc',
  evidence_source:              'go-core',
  target_version:               '1.0.0',
  target_branch:                'main',
  git_head:                     'head-abc',
  _mock_timestamp:              TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_GATE_STATUSES),                                               '[A-01] REAL_GATE_STATUSES array');
assert(REAL_GATE_STATUSES.length === 8,                                                 '[A-02] 8 statuses');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_MISSING'),                               '[A-03] REAL_GATE_MISSING');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_INVALID'),                               '[A-04] REAL_GATE_INVALID');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_EXPIRED'),                               '[A-05] REAL_GATE_EXPIRED');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_BLOCKED_HANDOFF'),                       '[A-06] BLOCKED_HANDOFF');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_BLOCKED_REHEARSAL'),                     '[A-07] BLOCKED_REHEARSAL');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_BLOCKED_BASELINE'),                      '[A-08] BLOCKED_BASELINE');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_BLOCKED_EVIDENCE'),                      '[A-09] BLOCKED_EVIDENCE');
assert(REAL_GATE_STATUSES.includes('REAL_GATE_READY_LOCKED'),                          '[A-10] READY_LOCKED');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = createRealManualReleaseGate({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                 '[B-01] returns object');
assert(fixture.gate_status             === 'REAL_GATE_READY_LOCKED',                  '[B-02] gate_status=READY_LOCKED');
assert(fixture.gate_ready              === true,                                        '[B-03] gate_ready=true');
assert(fixture.schema_version          === 'v56.0',                                    '[B-04] schema_version=v56.0');
assert(typeof fixture.gate_id          === 'string' && fixture.gate_id.length > 0,     '[B-05] gate_id string');
assert(fixture.evidence_source         === 'go-core',                                  '[B-06] evidence_source=go-core');
assert(fixture.production_execution_locked === true,                                    '[B-07] production_execution_locked=true');
assert(fixture.real_execution_requested    === false,                                   '[B-08] real_execution_requested=false');
assert(fixture.human_review_required       === true,                                    '[B-09] human_review_required=true');
assert(fixture.gate_only                   === true,                                    '[B-10] gate_only=true');
assert(fixture.deploy_allowed              === false,                                   '[B-11] deploy_allowed=false');
assert(fixture.promotion_allowed           === false,                                   '[B-12] promotion_allowed=false');
assert(fixture.stable_allowed              === false,                                   '[B-13] stable_allowed=false');
assert(fixture.tag_allowed                 === false,                                   '[B-14] tag_allowed=false');
assert(fixture.release_execution_allowed   === false,                                   '[B-15] exec_allowed=false');
assert(fixture.release_performed           === false,                                   '[B-16] release_performed=false');
assert(fixture.tag_created                 === false,                                   '[B-17] tag_created=false');
assert(fixture.stable_promoted             === false,                                   '[B-18] stable_promoted=false');
assert(fixture.deploy_performed            === false,                                   '[B-19] deploy_performed=false');
assert(fixture.blocking_reason             === null,                                    '[B-20] blocking_reason=null');
assert(typeof fixture.expires_at           === 'string',                                '[B-21] expires_at string');

// ─── Suite C: Blocked — missing handoff ───────────────────────────
console.log('\n[Suite C] Blocked cases');
const noHandoff = createRealManualReleaseGate({ rehearsal_report_id: 'rpt', sandbox_baseline_id: 'sb', manual_execution_baseline_id: 'me', evidence_receipt_id: 'rx', evidence_source: 'go-core', _mock_timestamp: TS });
assert(noHandoff.gate_status           === 'REAL_GATE_BLOCKED_HANDOFF',               '[C-01] no handoff → BLOCKED_HANDOFF');
assert(noHandoff.gate_ready            === false,                                       '[C-02] gate_ready=false');
assert(noHandoff.production_execution_locked === true,                                  '[C-03] lock preserved');

const noRehearsal = createRealManualReleaseGate({ handoff_id: 'h', sandbox_baseline_id: 'sb', manual_execution_baseline_id: 'me', evidence_receipt_id: 'rx', evidence_source: 'go-core', _mock_timestamp: TS });
assert(noRehearsal.gate_status         === 'REAL_GATE_BLOCKED_REHEARSAL',              '[C-04] no rehearsal → BLOCKED_REHEARSAL');

const noBaseline = createRealManualReleaseGate({ handoff_id: 'h', rehearsal_report_id: 'rpt', evidence_receipt_id: 'rx', evidence_source: 'go-core', _mock_timestamp: TS });
assert(noBaseline.gate_status          === 'REAL_GATE_BLOCKED_BASELINE',               '[C-05] no baseline → BLOCKED_BASELINE');

const noEvidence = createRealManualReleaseGate({ handoff_id: 'h', rehearsal_report_id: 'rpt', sandbox_baseline_id: 'sb', manual_execution_baseline_id: 'me', evidence_source: 'go-core', _mock_timestamp: TS });
assert(noEvidence.gate_status          === 'REAL_GATE_BLOCKED_EVIDENCE',               '[C-06] no receipt → BLOCKED_EVIDENCE');

const badSource = createRealManualReleaseGate({ handoff_id: 'h', rehearsal_report_id: 'rpt', sandbox_baseline_id: 'sb', manual_execution_baseline_id: 'me', evidence_receipt_id: 'rx', evidence_source: 'backend', _mock_timestamp: TS });
assert(badSource.gate_status           === 'REAL_GATE_BLOCKED_EVIDENCE',               '[C-07] backend source → BLOCKED_EVIDENCE');
assert(badSource.blocking_reason       === 'evidence_source_must_be_go_core',          '[C-08] correct blocking_reason');
assert(badSource.production_execution_locked === true,                                  '[C-09] lock preserved on block');

// ─── Suite D: Valid locked gate ────────────────────────────────────
console.log('\n[Suite D] Valid locked gate');
const gate = createRealManualReleaseGate(VALID_PARAMS);
assert(gate.gate_status                === 'REAL_GATE_READY_LOCKED',                  '[D-01] gate_status=READY_LOCKED');
assert(gate.gate_ready                 === true,                                        '[D-02] gate_ready=true');
assert(gate.handoff_id                 === 'handoff-abc',                              '[D-03] handoff_id preserved');
assert(gate.rehearsal_report_id        === 'rpt-abc',                                  '[D-04] rehearsal_report_id preserved');
assert(gate.sandbox_baseline_id        === 'sb-baseline-abc',                          '[D-05] sandbox_baseline_id preserved');
assert(gate.manual_execution_baseline_id === 'me-baseline-abc',                        '[D-06] manual_execution_baseline_id preserved');
assert(gate.evidence_receipt_id        === 'receipt-abc',                              '[D-07] evidence_receipt_id preserved');
assert(gate.evidence_source            === 'go-core',                                  '[D-08] evidence_source=go-core');
assert(gate.target_version             === '1.0.0',                                    '[D-09] target_version preserved');
assert(gate.production_execution_locked === true,                                       '[D-10] production_execution_locked=true');
assert(gate.release_execution_allowed  === false,                                       '[D-11] exec_allowed=false');
assert(gate.blocking_reason            === null,                                        '[D-12] blocking_reason=null');

// ─── Suite E: Deterministic gate_id ───────────────────────────────
console.log('\n[Suite E] Deterministic gate_id');
const a = createRealManualReleaseGate(VALID_PARAMS);
const b = createRealManualReleaseGate(VALID_PARAMS);
assert(a.gate_id === b.gate_id,                                                         '[E-01] same inputs → same gate_id');

const c = createRealManualReleaseGate({ ...VALID_PARAMS, _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.gate_id !== c.gate_id,                                                         '[E-02] diff timestamp → diff gate_id');

// ─── Suite F: validateRealManualReleaseGate ────────────────────────
console.log('\n[Suite F] validateRealManualReleaseGate');
const vNull = validateRealManualReleaseGate(null);
assert(vNull.gate_status               === 'REAL_GATE_MISSING',                        '[F-01] null → MISSING');

const vBadSchema = validateRealManualReleaseGate({ schema_version: 'v1.0', gate_id: 'x', evidence_source: 'go-core', production_execution_locked: true, human_review_required: true });
assert(vBadSchema.gate_status          === 'REAL_GATE_INVALID',                        '[F-02] bad schema → INVALID');

const vBadSource = validateRealManualReleaseGate({ schema_version: 'v56.0', gate_id: 'x', evidence_source: 'backend', production_execution_locked: true, human_review_required: true });
assert(vBadSource.gate_status          === 'REAL_GATE_BLOCKED_EVIDENCE',               '[F-03] backend source → BLOCKED_EVIDENCE');

const vNoLock = validateRealManualReleaseGate({ schema_version: 'v56.0', gate_id: 'x', evidence_source: 'go-core', production_execution_locked: false, human_review_required: true });
assert(vNoLock.gate_status             === 'REAL_GATE_INVALID',                        '[F-04] lock=false → INVALID');

const vValid = validateRealManualReleaseGate(gate);
assert(vValid.valid                    === true,                                        '[F-05] valid gate passes');
assert(vValid.production_execution_locked === true,                                     '[F-06] lock preserved in validation');

// ─── Suite G: normalizeRealManualReleaseGate ──────────────────────
console.log('\n[Suite G] normalizeRealManualReleaseGate');
assert(normalizeRealManualReleaseGate(null) === null,                                   '[G-01] null → null');
const normalized = normalizeRealManualReleaseGate({ ...gate, deploy_allowed: true });
assert(normalized.deploy_allowed       === false,                                       '[G-02] normalize resets deploy_allowed');
assert(normalized.production_execution_locked === true,                                 '[G-03] lock preserved');
assert(normalized.release_execution_allowed   === false,                                '[G-04] exec_allowed false');

// ─── Suite H: renderRealManualReleaseGateSummary ──────────────────
console.log('\n[Suite H] renderRealManualReleaseGateSummary');
const rendered = renderRealManualReleaseGateSummary(gate);
assert(typeof rendered                 === 'string',                                    '[H-01] returns string');
assert(rendered.includes('REAL_GATE_READY_LOCKED'),                                    '[H-02] contains status');
assert(rendered.includes('production_execution_locked  : true'),                       '[H-03] lock in output');
assert(rendered.includes('release_execution_allowed    : false'),                      '[H-04] exec_allowed in output');

assert(renderRealManualReleaseGateSummary(null) === 'gate: null',                      '[H-05] null → "gate: null"');

// ─── Suite I: Invariants across all cases ─────────────────────────
console.log('\n[Suite I] Invariants');
const cases = [fixture, noHandoff, noRehearsal, noBaseline, noEvidence, badSource, gate];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[I] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[I] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[I] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[I] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[I] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[I] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[I] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[I] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[I] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[I] case ${i}: production_execution_locked=true`);
  assert(o.human_review_required       === true,  `[I] case ${i}: human_review_required=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-manual-release-gate-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
