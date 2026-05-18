#!/usr/bin/env node
/**
 * Unlock Review Report — Unit Tests V64.0
 */

import {
  buildUnlockReviewReport,
  renderUnlockReviewReport,
  UNLOCK_REVIEW_REPORT_STATUSES,
  UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS,
} from '../unlock-review-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const FIXTURE_CONTRACT  = { contract_ready: true,      unlock_contract_id:  'contract-abc' };
const FIXTURE_AUTHORITY = { authority_ready: true,     unlock_authority_id: 'authority-abc' };
const FIXTURE_BINDING   = { binding_ready: true,       binding_id:          'binding-abc' };
const FIXTURE_DECISION  = { unlock_review_ready: true, decision_id:         'decision-abc', unlock_decision_status: 'UNLOCK_DECISION_READY_REVIEW' };
const FIXTURE_EVIDENCE  = { evidence_review_ready: true, package_id:        'pkg-abc', evidence_review_status: 'EVIDENCE_REVIEW_READY' };
const FIXTURE_CHAIN     = { valid: true, chain_valid: true, ledger_status: 'UNLOCK_LEDGER_OK' };
const FIXTURE_EVENT_IDS = ['evt-1', 'evt-2', 'evt-3', 'evt-4', 'evt-5'];

const VALID_PARAMS = {
  unlock_contract:         FIXTURE_CONTRACT,
  unlock_authority:        FIXTURE_AUTHORITY,
  unlock_binding:          FIXTURE_BINDING,
  unlock_decision:         FIXTURE_DECISION,
  unlock_evidence_package: FIXTURE_EVIDENCE,
  ledger_chain:            FIXTURE_CHAIN,
  ledger_event_ids:        FIXTURE_EVENT_IDS,
  _mock_timestamp:         TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_REVIEW_REPORT_STATUSES),                                     '[A-01] statuses array');
assert(UNLOCK_REVIEW_REPORT_STATUSES.length === 7,                                       '[A-02] 7 statuses');
assert(UNLOCK_REVIEW_REPORT_STATUSES.includes('UNLOCK_REPORT_BLOCKED_CONTRACT'),         '[A-03] BLOCKED_CONTRACT');
assert(UNLOCK_REVIEW_REPORT_STATUSES.includes('UNLOCK_REPORT_BLOCKED_AUTHORITY'),        '[A-04] BLOCKED_AUTHORITY');
assert(UNLOCK_REVIEW_REPORT_STATUSES.includes('UNLOCK_REPORT_BLOCKED_BINDING'),          '[A-05] BLOCKED_BINDING');
assert(UNLOCK_REVIEW_REPORT_STATUSES.includes('UNLOCK_REPORT_BLOCKED_DECISION'),         '[A-06] BLOCKED_DECISION');
assert(UNLOCK_REVIEW_REPORT_STATUSES.includes('UNLOCK_REPORT_BLOCKED_EVIDENCE'),         '[A-07] BLOCKED_EVIDENCE');
assert(UNLOCK_REVIEW_REPORT_STATUSES.includes('UNLOCK_REPORT_BLOCKED_LEDGER'),           '[A-08] BLOCKED_LEDGER');
assert(UNLOCK_REVIEW_REPORT_STATUSES.includes('UNLOCK_REPORT_READY'),                   '[A-09] READY');

assert(Array.isArray(UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS),                            '[A-10] safe_next_actions array');
assert(UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS.length === 6,                              '[A-11] 6 safe next actions');
assert(UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS.includes('do_not_execute_production_in_this_phase'), '[A-12] do_not_execute included');
assert(UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS.includes('submit_report_for_human_review'), '[A-13] submit_report included');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = buildUnlockReviewReport({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                  '[B-01] returns object');
assert(fixture.report_status                 === 'UNLOCK_REPORT_READY',                 '[B-02] status=READY');
assert(fixture.report_ready                  === true,                                   '[B-03] report_ready=true');
assert(fixture.schema_version                === 'v64.0',                                '[B-04] schema=v64.0');
assert(typeof fixture.report_id              === 'string' && fixture.report_id.length === 24, '[B-05] report_id 24 chars');
assert(typeof fixture.report_hash            === 'string' && fixture.report_hash.length === 48, '[B-06] report_hash 48 chars');
assert(fixture.immutable                     === true,                                   '[B-07] immutable=true');
assert(fixture.human_review_required         === true,                                   '[B-08] human_review_required=true');
assert(fixture.production_execution_locked   === true,                                   '[B-09] production_execution_locked=true');
assert(fixture.unlock_executed               === false,                                  '[B-10] unlock_executed=false');
assert(fixture.unlock_review_only            === true,                                   '[B-11] unlock_review_only=true');
assert(fixture.future_execution_phase_required === true,                                 '[B-12] future_exec=true');
assert(fixture.blocking_reason               === null,                                   '[B-13] blocking_reason=null');
assert(fixture.safe_next_actions?.length     === 6,                                      '[B-14] 6 safe actions');
assert(fixture.governance_summary?.evidence_complete === true,                           '[B-15] evidence_complete=true');
assert(fixture.governance_summary?.ledger_chain_valid === true,                          '[B-16] ledger_chain_valid=true');

// ─── Suite C: Blocked — missing contract ──────────────────────────
console.log('\n[Suite C] Blocked — missing contract');
const noContract = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_contract: null });
assert(noContract.report_status              === 'UNLOCK_REPORT_BLOCKED_CONTRACT',      '[C-01] no contract → BLOCKED_CONTRACT');
assert(noContract.report_ready               === false,                                  '[C-02] ready=false');

const badContract = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_contract: { contract_ready: false } });
assert(badContract.report_status             === 'UNLOCK_REPORT_BLOCKED_CONTRACT',      '[C-03] bad contract → BLOCKED_CONTRACT');

// ─── Suite D: Blocked — missing authority ─────────────────────────
console.log('\n[Suite D] Blocked — missing authority');
const noAuth = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_authority: null });
assert(noAuth.report_status                  === 'UNLOCK_REPORT_BLOCKED_AUTHORITY',     '[D-01] no authority → BLOCKED_AUTHORITY');
assert(noAuth.report_ready                   === false,                                  '[D-02] ready=false');

// ─── Suite E: Blocked — missing binding ───────────────────────────
console.log('\n[Suite E] Blocked — missing binding');
const noBinding = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_binding: null });
assert(noBinding.report_status               === 'UNLOCK_REPORT_BLOCKED_BINDING',       '[E-01] no binding → BLOCKED_BINDING');

// ─── Suite F: Blocked — missing decision ──────────────────────────
console.log('\n[Suite F] Blocked — missing decision');
const noDecision = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_decision: null });
assert(noDecision.report_status              === 'UNLOCK_REPORT_BLOCKED_DECISION',      '[F-01] no decision → BLOCKED_DECISION');

const badDecision = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_decision: { unlock_review_ready: false } });
assert(badDecision.report_status             === 'UNLOCK_REPORT_BLOCKED_DECISION',      '[F-02] bad decision → BLOCKED_DECISION');

// ─── Suite G: Blocked — missing evidence ──────────────────────────
console.log('\n[Suite G] Blocked — missing evidence');
const noEvidence = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_evidence_package: null });
assert(noEvidence.report_status              === 'UNLOCK_REPORT_BLOCKED_EVIDENCE',      '[G-01] no evidence → BLOCKED_EVIDENCE');

const badEvidence = buildUnlockReviewReport({ ...VALID_PARAMS, unlock_evidence_package: { evidence_review_ready: false } });
assert(badEvidence.report_status             === 'UNLOCK_REPORT_BLOCKED_EVIDENCE',      '[G-02] bad evidence → BLOCKED_EVIDENCE');

// ─── Suite H: Blocked — missing ledger ───────────────────────────
console.log('\n[Suite H] Blocked — missing ledger');
const noLedger = buildUnlockReviewReport({ ...VALID_PARAMS, ledger_chain: null });
assert(noLedger.report_status                === 'UNLOCK_REPORT_BLOCKED_LEDGER',        '[H-01] no ledger → BLOCKED_LEDGER');

const badLedger = buildUnlockReviewReport({ ...VALID_PARAMS, ledger_chain: { valid: false } });
assert(badLedger.report_status               === 'UNLOCK_REPORT_BLOCKED_LEDGER',        '[H-02] bad ledger → BLOCKED_LEDGER');

// ─── Suite I: Full ready report ───────────────────────────────────
console.log('\n[Suite I] Full ready report');
const full = buildUnlockReviewReport(VALID_PARAMS);
assert(full.report_status                    === 'UNLOCK_REPORT_READY',                 '[I-01] status=READY');
assert(full.report_ready                     === true,                                   '[I-02] report_ready=true');
assert(typeof full.report_id                 === 'string' && full.report_id.length === 24, '[I-03] report_id 24 chars');
assert(typeof full.report_hash               === 'string' && full.report_hash.length === 48, '[I-04] report_hash 48 chars');
assert(full.schema_version                   === 'v64.0',                                '[I-05] schema=v64.0');
assert(full.immutable                        === true,                                   '[I-06] immutable=true');
assert(full.human_review_required            === true,                                   '[I-07] human_review_required=true');
assert(full.governance_summary?.contract_valid   === true,                               '[I-08] contract_valid');
assert(full.governance_summary?.authority_valid  === true,                               '[I-09] authority_valid');
assert(full.governance_summary?.binding_ready    === true,                               '[I-10] binding_ready');
assert(full.governance_summary?.decision_ready_review === true,                          '[I-11] decision_ready_review');
assert(full.governance_summary?.evidence_complete === true,                              '[I-12] evidence_complete');
assert(full.governance_summary?.ledger_chain_valid === true,                             '[I-13] ledger_chain_valid');
assert(full.governance_summary?.ledger_event_count === 5,                                '[I-14] ledger_event_count=5');
assert(full.blocking_reason                  === null,                                   '[I-15] blocking_reason=null');
assert(full.safe_next_actions?.length        === 6,                                      '[I-16] 6 safe actions');

// ─── Suite J: renderUnlockReviewReport ───────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderUnlockReviewReport(full);
assert(typeof rendered                       === 'string',                               '[J-01] returns string');
assert(rendered.includes('UNLOCK_REPORT_READY'),                                        '[J-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                      '[J-03] lock in output');
assert(rendered.includes('unlock_executed                : false'),                      '[J-04] unlock_executed in output');
assert(rendered.includes('future_execution_phase_required: true'),                      '[J-05] future_exec in output');
assert(rendered.includes('human_review_required          : true'),                      '[J-06] human_review in output');
assert(renderUnlockReviewReport(null)        === 'unlock_review_report: null',          '[J-07] null → string');

// ─── Suite K: Invariants ─────────────────────────────────────────
console.log('\n[Suite K] Invariants');
const cases = [fixture, noContract, noAuth, noBinding, noDecision, noEvidence, noLedger, full];
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
console.log(`\nunlock-review-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
