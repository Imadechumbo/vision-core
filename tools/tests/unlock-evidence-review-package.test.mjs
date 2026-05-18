#!/usr/bin/env node
/**
 * Unlock Evidence Review Package — Unit Tests V62.1
 */

import {
  buildUnlockEvidenceReviewPackage,
  validateUnlockEvidenceReviewPackage,
  renderUnlockEvidenceReviewPackage,
  EVIDENCE_REVIEW_STATUSES,
  EVIDENCE_REVIEW_SOURCES,
} from '../unlock-evidence-review-package.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const FIXTURE_CONTRACT = {
  contract_ready:      true,
  unlock_contract_id:  'contract-abc',
  contract_status:     'UNLOCK_CONTRACT_READY_REVIEW',
};
const FIXTURE_AUTHORITY = {
  authority_ready:     true,
  unlock_authority_id: 'authority-abc',
  authority_status:    'UNLOCK_AUTHORITY_READY_REVIEW',
};
const FIXTURE_BINDING = {
  binding_ready:       true,
  binding_id:          'binding-abc',
  binding_status:      'UNLOCK_BINDING_READY_REVIEW',
};
const FIXTURE_DECISION = {
  unlock_review_ready:     true,
  unlock_decision_status:  'UNLOCK_DECISION_READY_REVIEW',
  decision_id:             'decision-abc',
};
const FIXTURE_BASELINE = {
  baseline_ready:   true,
  baseline_status:  'REAL_GATE_BASELINE_READY',
  baseline_version: 'v60.0',
};

const VALID_PARAMS = {
  unlock_contract:    FIXTURE_CONTRACT,
  unlock_authority:   FIXTURE_AUTHORITY,
  unlock_binding:     FIXTURE_BINDING,
  unlock_decision:    FIXTURE_DECISION,
  real_gate_baseline: FIXTURE_BASELINE,
  _mock_timestamp:    TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(EVIDENCE_REVIEW_STATUSES),                                          '[A-01] statuses array');
assert(EVIDENCE_REVIEW_STATUSES.length === 6,                                            '[A-02] 6 statuses');
assert(EVIDENCE_REVIEW_STATUSES.includes('EVIDENCE_REVIEW_BLOCKED_CONTRACT'),           '[A-03] BLOCKED_CONTRACT');
assert(EVIDENCE_REVIEW_STATUSES.includes('EVIDENCE_REVIEW_BLOCKED_AUTHORITY'),          '[A-04] BLOCKED_AUTHORITY');
assert(EVIDENCE_REVIEW_STATUSES.includes('EVIDENCE_REVIEW_BLOCKED_BINDING'),            '[A-05] BLOCKED_BINDING');
assert(EVIDENCE_REVIEW_STATUSES.includes('EVIDENCE_REVIEW_BLOCKED_DECISION'),           '[A-06] BLOCKED_DECISION');
assert(EVIDENCE_REVIEW_STATUSES.includes('EVIDENCE_REVIEW_BLOCKED_BASELINE'),           '[A-07] BLOCKED_BASELINE');
assert(EVIDENCE_REVIEW_STATUSES.includes('EVIDENCE_REVIEW_READY'),                      '[A-08] READY');

assert(Array.isArray(EVIDENCE_REVIEW_SOURCES),                                           '[A-09] sources array');
assert(EVIDENCE_REVIEW_SOURCES.length === 6,                                             '[A-10] 6 sources');
assert(EVIDENCE_REVIEW_SOURCES.includes('go-core'),                                      '[A-11] go-core source');
assert(EVIDENCE_REVIEW_SOURCES.includes('unlock_decision'),                              '[A-12] unlock_decision source');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = buildUnlockEvidenceReviewPackage({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                  '[B-01] returns object');
assert(fixture.evidence_review_status        === 'EVIDENCE_REVIEW_READY',               '[B-02] status=READY');
assert(fixture.evidence_review_ready         === true,                                   '[B-03] evidence_review_ready=true');
assert(fixture.schema_version                === 'v62.1',                                '[B-04] schema=v62.1');
assert(typeof fixture.package_id             === 'string' && fixture.package_id.length === 24, '[B-05] package_id 24 chars');
assert(typeof fixture.package_hash           === 'string' && fixture.package_hash.length === 48, '[B-06] package_hash 48 chars');
assert(fixture.production_execution_locked   === true,                                   '[B-07] production_execution_locked=true');
assert(fixture.unlock_executed               === false,                                  '[B-08] unlock_executed=false');
assert(fixture.unlock_review_only            === true,                                   '[B-09] unlock_review_only=true');
assert(fixture.future_execution_phase_required === true,                                 '[B-10] future_exec=true');
assert(fixture.blocking_reason               === null,                                   '[B-11] blocking_reason=null');
assert(Array.isArray(fixture.evidence_sources) && fixture.evidence_sources.length === 6,'[B-12] 6 evidence sources');
assert(fixture.unlock_review_summary?.evidence_complete === true,                        '[B-13] evidence_complete=true');

// ─── Suite C: Blocked — missing contract ──────────────────────────
console.log('\n[Suite C] Blocked — missing contract');
const noContract = buildUnlockEvidenceReviewPackage({ ...VALID_PARAMS, unlock_contract: null });
assert(noContract.evidence_review_status     === 'EVIDENCE_REVIEW_BLOCKED_CONTRACT',    '[C-01] no contract → BLOCKED_CONTRACT');
assert(noContract.evidence_review_ready      === false,                                  '[C-02] ready=false');

const badContract = buildUnlockEvidenceReviewPackage({ ...VALID_PARAMS, unlock_contract: { contract_ready: false } });
assert(badContract.evidence_review_status    === 'EVIDENCE_REVIEW_BLOCKED_CONTRACT',    '[C-03] bad contract → BLOCKED_CONTRACT');

// ─── Suite D: Blocked — missing authority ─────────────────────────
console.log('\n[Suite D] Blocked — missing authority');
const noAuthority = buildUnlockEvidenceReviewPackage({ ...VALID_PARAMS, unlock_authority: null });
assert(noAuthority.evidence_review_status    === 'EVIDENCE_REVIEW_BLOCKED_AUTHORITY',   '[D-01] no authority → BLOCKED_AUTHORITY');
assert(noAuthority.evidence_review_ready     === false,                                  '[D-02] ready=false');

// ─── Suite E: Blocked — missing binding ───────────────────────────
console.log('\n[Suite E] Blocked — missing binding');
const noBinding = buildUnlockEvidenceReviewPackage({ ...VALID_PARAMS, unlock_binding: null });
assert(noBinding.evidence_review_status      === 'EVIDENCE_REVIEW_BLOCKED_BINDING',     '[E-01] no binding → BLOCKED_BINDING');
assert(noBinding.evidence_review_ready       === false,                                  '[E-02] ready=false');

// ─── Suite F: Blocked — missing decision ──────────────────────────
console.log('\n[Suite F] Blocked — missing decision');
const noDecision = buildUnlockEvidenceReviewPackage({ ...VALID_PARAMS, unlock_decision: null });
assert(noDecision.evidence_review_status     === 'EVIDENCE_REVIEW_BLOCKED_DECISION',    '[F-01] no decision → BLOCKED_DECISION');
assert(noDecision.evidence_review_ready      === false,                                  '[F-02] ready=false');

const badDecision = buildUnlockEvidenceReviewPackage({ ...VALID_PARAMS, unlock_decision: { unlock_review_ready: false } });
assert(badDecision.evidence_review_status    === 'EVIDENCE_REVIEW_BLOCKED_DECISION',    '[F-03] bad decision → BLOCKED_DECISION');

// ─── Suite G: Blocked — missing baseline ──────────────────────────
console.log('\n[Suite G] Blocked — missing baseline');
const noBaseline = buildUnlockEvidenceReviewPackage({ ...VALID_PARAMS, real_gate_baseline: null });
assert(noBaseline.evidence_review_status     === 'EVIDENCE_REVIEW_BLOCKED_BASELINE',    '[G-01] no baseline → BLOCKED_BASELINE');
assert(noBaseline.evidence_review_ready      === false,                                  '[G-02] ready=false');

// ─── Suite H: Full ready ──────────────────────────────────────────
console.log('\n[Suite H] Full ready');
const full = buildUnlockEvidenceReviewPackage(VALID_PARAMS);
assert(full.evidence_review_status           === 'EVIDENCE_REVIEW_READY',               '[H-01] status=READY');
assert(full.evidence_review_ready            === true,                                   '[H-02] evidence_review_ready=true');
assert(typeof full.package_id                === 'string' && full.package_id.length === 24, '[H-03] package_id 24 chars');
assert(typeof full.package_hash              === 'string' && full.package_hash.length === 48, '[H-04] package_hash 48 chars');
assert(full.schema_version                   === 'v62.1',                                '[H-05] schema=v62.1');
assert(full.artifacts?.unlock_contract_id    === 'contract-abc',                        '[H-06] contract_id preserved');
assert(full.artifacts?.unlock_authority_id   === 'authority-abc',                       '[H-07] authority_id preserved');
assert(full.artifacts?.binding_id            === 'binding-abc',                         '[H-08] binding_id preserved');
assert(full.artifacts?.decision_id           === 'decision-abc',                        '[H-09] decision_id preserved');
assert(full.artifacts?.baseline_version      === 'v60.0',                               '[H-10] baseline_version preserved');
assert(full.unlock_review_summary?.contract_valid   === true,                           '[H-11] contract_valid');
assert(full.unlock_review_summary?.authority_valid  === true,                           '[H-12] authority_valid');
assert(full.unlock_review_summary?.binding_ready    === true,                           '[H-13] binding_ready');
assert(full.unlock_review_summary?.decision_ready_review === true,                      '[H-14] decision_ready_review');
assert(full.unlock_review_summary?.baseline_ready   === true,                           '[H-15] baseline_ready');
assert(full.unlock_review_summary?.evidence_complete === true,                          '[H-16] evidence_complete');
assert(full.blocking_reason                  === null,                                   '[H-17] blocking_reason=null');

// ─── Suite I: validateUnlockEvidenceReviewPackage ─────────────────
console.log('\n[Suite I] Validate');
const vNull = validateUnlockEvidenceReviewPackage(null);
assert(vNull.evidence_review_status          === 'EVIDENCE_REVIEW_BLOCKED_CONTRACT',    '[I-01] null → BLOCKED_CONTRACT');

const vBadSchema = validateUnlockEvidenceReviewPackage({ schema_version: 'v1.0' });
assert(vBadSchema.evidence_review_status     === 'EVIDENCE_REVIEW_BLOCKED_CONTRACT',    '[I-02] bad schema → BLOCKED_CONTRACT');

const vUnlocked = validateUnlockEvidenceReviewPackage({ ...full, unlock_executed: true });
assert(vUnlocked.evidence_review_status      === 'EVIDENCE_REVIEW_BLOCKED_CONTRACT',    '[I-03] unlock_executed=true → blocked');

const vNoFuture = validateUnlockEvidenceReviewPackage({ ...full, future_execution_phase_required: false });
assert(vNoFuture.evidence_review_status      === 'EVIDENCE_REVIEW_BLOCKED_CONTRACT',    '[I-04] future_exec=false → blocked');

const vValid = validateUnlockEvidenceReviewPackage(full);
assert(vValid.valid                          === true,                                   '[I-05] valid passes');

// ─── Suite J: renderUnlockEvidenceReviewPackage ───────────────────
console.log('\n[Suite J] Render');
const rendered = renderUnlockEvidenceReviewPackage(full);
assert(typeof rendered                       === 'string',                               '[J-01] returns string');
assert(rendered.includes('EVIDENCE_REVIEW_READY'),                                      '[J-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                      '[J-03] lock in output');
assert(rendered.includes('unlock_executed                : false'),                      '[J-04] unlock_executed in output');
assert(rendered.includes('future_execution_phase_required: true'),                      '[J-05] future_exec in output');
assert(renderUnlockEvidenceReviewPackage(null) === 'evidence_review_package: null',     '[J-06] null → string');

// ─── Suite K: Invariants ─────────────────────────────────────────
console.log('\n[Suite K] Invariants');
const cases = [fixture, noContract, noAuthority, noBinding, noDecision, noBaseline, full];
for (const [i, o] of cases.entries()) {
  assert(o.deploy_allowed              === false, `[K] case ${i}: deploy_allowed=false`);
  assert(o.promotion_allowed           === false, `[K] case ${i}: promotion_allowed=false`);
  assert(o.stable_allowed              === false, `[K] case ${i}: stable_allowed=false`);
  assert(o.tag_allowed                 === false, `[K] case ${i}: tag_allowed=false`);
  assert(o.release_execution_allowed   === false, `[K] case ${i}: exec_allowed=false`);
  assert(o.release_performed           === false, `[K] case ${i}: release_performed=false`);
  assert(o.tag_created                 === false, `[K] case ${i}: tag_created=false`);
  assert(o.stable_promoted             === false, `[K] case ${i}: stable_promoted=false`);
  assert(o.deploy_performed            === false, `[K] case ${i}: deploy_performed=false`);
  assert(o.production_execution_locked === true,  `[K] case ${i}: production_execution_locked=true`);
  assert(o.unlock_executed             === false, `[K] case ${i}: unlock_executed=false`);
  assert(o.unlock_review_only          === true,  `[K] case ${i}: unlock_review_only=true`);
  assert(o.future_execution_phase_required === true, `[K] case ${i}: future_execution_phase_required=true`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nunlock-evidence-review-package: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
