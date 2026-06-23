#!/usr/bin/env node
/**
 * Real Tag Operation Report — Unit Tests V99.0
 */

import {
  TAG_OPERATION_REPORT_STATUSES,
  buildRealTagOperationReport,
  validateRealTagOperationReport,
  renderRealTagOperationReport,
} from '../real-tag-operation-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS           = '2026-05-19T13:00:00.000Z';
const SHA          = 'abc1234def567890abc12345';
const LEDGER       = { ledger_ready: true, hash_chain_valid: true };
const DECISION_DRY = {
  decision_ready: true, real_tag_confirmed: false,
  target_tag: 'v1.0.0', git_head: SHA,
  receipt_verified: true, stable_review_phase_allowed: false,
  safe_next_actions: ['execute_real_tag_manually_when_ready'],
};
const DECISION_REAL = {
  decision_ready: true, real_tag_confirmed: true,
  target_tag: 'v1.0.0', git_head: SHA,
  receipt_verified: true, stable_review_phase_allowed: true,
  safe_next_actions: ['create_next_phase_for_stable_review', 'archive_execution_receipt'],
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_OPERATION_REPORT_STATUSES),                                             '[A-01] statuses array');
assert(TAG_OPERATION_REPORT_STATUSES.length === 4,                                               '[A-02] 4 statuses');
assert(TAG_OPERATION_REPORT_STATUSES.includes('TAG_OPERATION_REPORT_BLOCKED_DECISION'),          '[A-03] BLOCKED_DECISION');
assert(TAG_OPERATION_REPORT_STATUSES.includes('TAG_OPERATION_REPORT_COMMAND_READY'),             '[A-04] COMMAND_READY');
assert(TAG_OPERATION_REPORT_STATUSES.includes('TAG_OPERATION_REPORT_DRY_RUN_CONFIRMED'),         '[A-05] DRY_RUN_CONFIRMED');
assert(TAG_OPERATION_REPORT_STATUSES.includes('TAG_OPERATION_REPORT_REAL_TAG_CONFIRMED'),        '[A-06] REAL_TAG_CONFIRMED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagOperationReport({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                  '[B-01] returns object');
assert(fix.report_status    === 'TAG_OPERATION_REPORT_DRY_RUN_CONFIRMED',                        '[B-02] fixture=DRY_RUN_CONFIRMED');
assert(fix.report_ready     === true,                                                            '[B-03] report_ready=true');
assert(fix.schema_version   === 'v99.0',                                                         '[B-04] schema=v99.0');
assert(typeof fix.report_id === 'string' && fix.report_id.length === 24,                        '[B-05] id 24 chars');
assert(fix.blocking_reason  === null,                                                            '[B-06] blocking=null');
assert(fix.operation_mode   === 'dry_run_confirmed',                                             '[B-07] mode=dry_run_confirmed');
assert(fix.real_tag_confirmed === false,                                                         '[B-08] real_tag=false');
assert(fix.stable_review_phase_allowed === false,                                                '[B-09] stable_review=false in dry-run');
assert(fix.ledger_chain_valid === true,                                                          '[B-10] ledger_chain_valid=true');
assert(fix.receipt_verified  === true,                                                           '[B-11] receipt_verified=true');
assert(fix.rollback_available === true,                                                          '[B-12] rollback_available=true');
assert(Array.isArray(fix.blocked_actions) && fix.blocked_actions.length >= 4,                   '[B-13] blocked_actions array');
assert(Array.isArray(fix.safe_next_actions) && fix.safe_next_actions.length >= 1,               '[B-14] safe_next_actions array');
assert(fix.created_at        === TS,                                                             '[B-15] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[C-02] tag_created=false');
assert(fix.stable_promoted              === false, '[C-03] stable_promoted=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.release_performed            === false, '[C-05] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-06] real_execution_not_performed=true');

// ─── Suite D: BLOCKED_DECISION ────────────────────────────────────
console.log('\n[Suite D] BLOCKED_DECISION');
const bNoDecision = buildRealTagOperationReport({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoDecision.report_status   === 'TAG_OPERATION_REPORT_BLOCKED_DECISION',                  '[D-01] no decision → BLOCKED_DECISION');
assert(bNoDecision.report_ready    === false,                                                    '[D-02] ready=false');
const bBadDecision = buildRealTagOperationReport({
  fixture_mode:    false,
  decision_result: { decision_ready: false },
  _mock_timestamp: TS,
});
assert(bBadDecision.report_status  === 'TAG_OPERATION_REPORT_BLOCKED_DECISION',                  '[D-03] bad decision → BLOCKED_DECISION');

// ─── Suite E: DRY_RUN_CONFIRMED report ────────────────────────────
console.log('\n[Suite E] DRY_RUN_CONFIRMED report');
const dryReport = buildRealTagOperationReport({
  fixture_mode:    false,
  decision_result: DECISION_DRY,
  ledger_result:   LEDGER,
  _mock_timestamp: TS,
});
assert(dryReport.report_status          === 'TAG_OPERATION_REPORT_DRY_RUN_CONFIRMED',           '[E-01] dry-run → DRY_RUN_CONFIRMED');
assert(dryReport.report_ready           === true,                                                '[E-02] ready=true');
assert(dryReport.operation_mode         === 'dry_run_confirmed',                                 '[E-03] mode=dry_run_confirmed');
assert(dryReport.real_tag_confirmed     === false,                                               '[E-04] real_tag=false');
assert(dryReport.stable_review_phase_allowed === false,                                          '[E-05] stable_review=false');
assert(dryReport.stable_promoted        === false,                                               '[E-06] stable=false');
assert(dryReport.ledger_chain_valid     === true,                                                '[E-07] ledger chain valid');

// ─── Suite F: REAL_TAG_CONFIRMED report ───────────────────────────
console.log('\n[Suite F] REAL_TAG_CONFIRMED report');
const realReport = buildRealTagOperationReport({
  fixture_mode:    false,
  decision_result: DECISION_REAL,
  ledger_result:   LEDGER,
  _mock_timestamp: TS,
});
assert(realReport.report_status          === 'TAG_OPERATION_REPORT_REAL_TAG_CONFIRMED',         '[F-01] real tag → REAL_TAG_CONFIRMED');
assert(realReport.report_ready           === true,                                               '[F-02] ready=true');
assert(realReport.operation_mode         === 'real_tag_confirmed',                               '[F-03] mode=real_tag_confirmed');
assert(realReport.real_tag_confirmed     === true,                                               '[F-04] real_tag=true');
assert(realReport.stable_review_phase_allowed === true,                                          '[F-05] stable_review=true only for real tag');
assert(realReport.stable_promoted        === false,                                              '[F-06] stable_promoted=false still');
assert(realReport.deploy_performed       === false,                                              '[F-07] deploy=false');
assert(realReport.release_performed      === false,                                              '[F-08] release=false');
assert(realReport.actual_real_tag_created === false,                                             '[F-09] actual_tag=false even in real report');
assert(realReport.blocked_actions.includes('auto_stable_promotion'),                             '[F-10] auto_stable blocked');

// ─── Suite G: Deterministic ID ────────────────────────────────────
console.log('\n[Suite G] Deterministic ID');
const g1 = buildRealTagOperationReport({ fixture_mode: true, _mock_timestamp: TS });
const g2 = buildRealTagOperationReport({ fixture_mode: true, _mock_timestamp: TS });
assert(g1.report_id === g2.report_id,                                                            '[G-01] deterministic id');

// ─── Suite H: Validate ────────────────────────────────────────────
console.log('\n[Suite H] Validate');
assert(validateRealTagOperationReport(fix).length === 0,                                        '[H-01] fixture passes validation');
assert(validateRealTagOperationReport(null).length > 0,                                         '[H-02] null fails validation');
assert(validateRealTagOperationReport({ ...fix, stable_promoted: true }).length > 0,            '[H-03] stable=true fails');
assert(validateRealTagOperationReport({ ...fix, stable_review_phase_allowed: true, real_tag_confirmed: false }).length > 0, '[H-04] stable_review without real_tag fails');
assert(validateRealTagOperationReport(realReport).length === 0,                                 '[H-05] real report passes');

// ─── Suite I: Render ─────────────────────────────────────────────
console.log('\n[Suite I] Render');
const rendered = renderRealTagOperationReport(fix);
assert(typeof rendered === 'string',                                                             '[I-01] returns string');
assert(rendered.includes('TAG_OPERATION_REPORT_DRY_RUN_CONFIRMED'),                             '[I-02] status in output');
assert(rendered.includes('stable_promoted              : false'),                                '[I-03] stable=false in output');
assert(rendered.includes('actual_real_tag_created      : false'),                               '[I-04] actual_tag=false in output');
assert(rendered.includes('BLOCKED: auto_stable_promotion'),                                      '[I-05] auto_stable blocked in output');
assert(rendered.includes('SAFE NEXT ACTIONS'),                                                   '[I-06] safe actions section');
assert(renderRealTagOperationReport(null) === 'real_tag_operation_report: null',                '[I-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-operation-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
