#!/usr/bin/env node
/**
 * Real Tag Execution Report — Unit Tests V89.0
 */

import {
  EXEC_REPORT_STATUSES,
  BLOCKED_ACTIONS,
  SAFE_NEXT_ACTIONS,
  buildRealTagExecutionReport,
  validateRealTagExecutionReport,
  renderRealTagExecutionReport,
} from '../real-tag-execution-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-19T01:00:00.000Z';
const TAG     = 'v1.0.0-test';
const LEDGER  = { ledger_status: 'AUDIT_LEDGER_READY', ledger_ready: true, ledger_id: 'ldg-001', ledger_hash: 'a'.repeat(32), entries_count: 3 };
const RECEIPT = { receipt_status: 'RECEIPT_DRY_RUN_VERIFIED', receipt_ready: true, receipt_id: 'rcpt-001', receipt_type: 'dry_run_verified', receipt_hash: 'b'.repeat(32) };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(EXEC_REPORT_STATUSES),                                             '[A-01] statuses array');
assert(EXEC_REPORT_STATUSES.length === 5,                                               '[A-02] 5 statuses');
assert(EXEC_REPORT_STATUSES.includes('EXEC_REPORT_BLOCKED_LEDGER'),                    '[A-03] BLOCKED_LEDGER');
assert(EXEC_REPORT_STATUSES.includes('EXEC_REPORT_BLOCKED_RECEIPT'),                   '[A-04] BLOCKED_RECEIPT');
assert(EXEC_REPORT_STATUSES.includes('EXEC_REPORT_DRY_RUN_COMPLETE'),                  '[A-05] DRY_RUN_COMPLETE');
assert(EXEC_REPORT_STATUSES.includes('EXEC_REPORT_REAL_TAG_COMPLETE'),                 '[A-06] REAL_TAG_COMPLETE');
assert(EXEC_REPORT_STATUSES.includes('EXEC_REPORT_ROLLBACK_COMPLETE'),                 '[A-07] ROLLBACK_COMPLETE');
assert(Array.isArray(BLOCKED_ACTIONS),                                                  '[A-08] blocked_actions array');
assert(BLOCKED_ACTIONS.includes('deploy_to_production'),                               '[A-09] deploy_to_production blocked');
assert(BLOCKED_ACTIONS.includes('promote_to_stable'),                                  '[A-10] promote_to_stable blocked');
assert(BLOCKED_ACTIONS.includes('release_to_users'),                                   '[A-11] release_to_users blocked');
assert(Array.isArray(SAFE_NEXT_ACTIONS),                                                '[A-12] safe_next_actions array');
assert(SAFE_NEXT_ACTIONS.includes('review_audit_ledger'),                              '[A-13] review_audit_ledger safe');
assert(SAFE_NEXT_ACTIONS.includes('verify_tag_points_to_correct_head'),               '[A-14] verify_tag safe');

// ─── Suite B: Fixture mode — DRY_RUN_COMPLETE ─────────────────────
console.log('\n[Suite B] Fixture mode — DRY_RUN_COMPLETE');
const fix = buildRealTagExecutionReport({ fixture_mode: true, target_tag: TAG, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                         '[B-01] returns object');
assert(fix.report_status     === 'EXEC_REPORT_DRY_RUN_COMPLETE',                      '[B-02] DRY_RUN_COMPLETE');
assert(fix.report_ready      === true,                                                  '[B-03] ready=true');
assert(fix.receipt_type      === 'dry_run_verified',                                   '[B-04] type=dry_run_verified');
assert(Array.isArray(fix.blocked_actions),                                              '[B-05] blocked_actions array');
assert(fix.blocked_actions.length === 5,                                               '[B-06] 5 blocked');
assert(Array.isArray(fix.safe_next_actions),                                            '[B-07] safe_next_actions array');
assert(fix.safe_next_actions.length === 5,                                             '[B-08] 5 safe');
assert(fix.blocking_reason   === null,                                                  '[B-09] blocking=null');
assert(fix.created_at        === TS,                                                    '[B-10] created_at=TS');
assert(typeof fix.report_id === 'string' && fix.report_id.length === 24,             '[B-11] id 24 chars');
assert(fix.schema_version    === 'v89.0',                                             '[B-12] schema=v89.0');

// ─── Suite C: Fixture mode — REAL_TAG_COMPLETE ────────────────────
console.log('\n[Suite C] Fixture mode — REAL_TAG_COMPLETE');
const fixReal = buildRealTagExecutionReport({
  fixture_mode: true, receipt_type: 'real_tag_created', target_tag: TAG, _mock_timestamp: TS,
});
assert(fixReal.report_status   === 'EXEC_REPORT_REAL_TAG_COMPLETE',                   '[C-01] REAL_TAG_COMPLETE');
assert(fixReal.receipt_type    === 'real_tag_created',                                 '[C-02] type=real_tag_created');
assert(fixReal.tag_created     === false,                                              '[C-03] tag_created=false');
assert(fixReal.deploy_performed=== false,                                              '[C-04] deploy=false');

// ─── Suite D: Fixture mode — ROLLBACK_COMPLETE ───────────────────
console.log('\n[Suite D] Fixture mode — ROLLBACK_COMPLETE');
const fixRbk = buildRealTagExecutionReport({
  fixture_mode: true, receipt_type: 'rollback_executed', target_tag: TAG, _mock_timestamp: TS,
});
assert(fixRbk.report_status    === 'EXEC_REPORT_ROLLBACK_COMPLETE',                   '[D-01] ROLLBACK_COMPLETE');
assert(fixRbk.receipt_type     === 'rollback_executed',                                '[D-02] type=rollback_executed');

// ─── Suite E: Block scenarios ──────────────────────────────────────
console.log('\n[Suite E] Block scenarios');
const e_noledger = buildRealTagExecutionReport({
  ledger_ready: false, _mock_timestamp: TS,
});
assert(e_noledger.report_status === 'EXEC_REPORT_BLOCKED_LEDGER',                     '[E-01] BLOCKED_LEDGER');
assert(e_noledger.tag_created   === false,                                             '[E-02] tag_created=false');

const e_wrongledger = buildRealTagExecutionReport({
  ledger_ready: true, ledger_status: 'AUDIT_LEDGER_BLOCKED_RECEIPT', _mock_timestamp: TS,
});
assert(e_wrongledger.report_status === 'EXEC_REPORT_BLOCKED_LEDGER',                  '[E-03] BLOCKED_LEDGER (wrong status)');

const e_noreceipt = buildRealTagExecutionReport({
  ...LEDGER, receipt_ready: false, _mock_timestamp: TS,
});
assert(e_noreceipt.report_status === 'EXEC_REPORT_BLOCKED_RECEIPT',                   '[E-04] BLOCKED_RECEIPT');

// ─── Suite F: Non-fixture dry_run ─────────────────────────────────
console.log('\n[Suite F] Non-fixture dry run');
const f_dry = buildRealTagExecutionReport({
  ...LEDGER, ...RECEIPT, target_tag: TAG, _mock_timestamp: TS,
});
assert(f_dry.report_status     === 'EXEC_REPORT_DRY_RUN_COMPLETE',                    '[F-01] DRY_RUN_COMPLETE');
assert(f_dry.report_ready      === true,                                               '[F-02] ready=true');
assert(typeof f_dry.summary === 'string' && f_dry.summary.length > 0,                '[F-03] summary present');
assert(f_dry.tag_created       === false,                                              '[F-04] tag_created=false');
assert(f_dry.ledger_entries    === 3,                                                  '[F-05] ledger_entries=3');

// ─── Suite G: Non-fixture real_tag_created ────────────────────────
console.log('\n[Suite G] Non-fixture real tag');
const g_real = buildRealTagExecutionReport({
  ...LEDGER,
  receipt_ready: true, receipt_status: 'RECEIPT_REAL_TAG_CREATED',
  receipt_id: 'rcpt-002', receipt_type: 'real_tag_created',
  target_tag: TAG, _mock_timestamp: TS,
});
assert(g_real.report_status    === 'EXEC_REPORT_REAL_TAG_COMPLETE',                   '[G-01] REAL_TAG_COMPLETE');
assert(g_real.tag_created      === false,                                              '[G-02] tag_created=false');
assert(g_real.blocked_actions.includes('deploy_to_production'),                       '[G-03] deploy blocked');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.tag_created                  === false, '[H-01] tag_created=false');
assert(fix.git_push_performed           === false, '[H-02] push=false');
assert(fix.deploy_performed             === false, '[H-03] deploy=false');
assert(fix.stable_promoted              === false, '[H-04] stable=false');
assert(fix.release_performed            === false, '[H-05] release=false');
assert(fix.real_execution_not_performed === true,  '[H-06] not_performed=true');

// ─── Suite I: Deterministic ID ────────────────────────────────────
console.log('\n[Suite I] Deterministic ID');
const i1 = buildRealTagExecutionReport({ fixture_mode: true, target_tag: TAG, _mock_timestamp: TS });
const i2 = buildRealTagExecutionReport({ fixture_mode: true, target_tag: TAG, _mock_timestamp: TS });
assert(i1.report_id === i2.report_id,                                                  '[I-01] deterministic id');

// ─── Suite J: Validate ────────────────────────────────────────────
console.log('\n[Suite J] Validate');
const j_ok = validateRealTagExecutionReport(fix);
assert(j_ok.valid === true,                                                            '[J-01] valid fixture');
const j_null = validateRealTagExecutionReport(null);
assert(j_null.valid === false,                                                         '[J-02] null invalid');
const j_bad = validateRealTagExecutionReport({ report_status: 'EXEC_REPORT_DRY_RUN_COMPLETE', report_ready: true, tag_created: true });
assert(j_bad.errors.includes('tag_created_must_be_false'),                             '[J-03] tag_created=true → error');

// ─── Suite K: Render ──────────────────────────────────────────────
console.log('\n[Suite K] Render');
const rendered = renderRealTagExecutionReport(fix);
assert(typeof rendered === 'string',                                                   '[K-01] returns string');
assert(rendered.includes('EXEC_REPORT_DRY_RUN_COMPLETE'),                              '[K-02] status in output');
assert(rendered.includes('tag_created                   : false'),                     '[K-03] tag=false');
assert(rendered.includes('deploy_performed              : false'),                     '[K-04] deploy=false');
assert(rendered.includes('blocked_actions'),                                           '[K-05] blocked_actions field');
assert(rendered.includes('safe_next_actions'),                                         '[K-06] safe_next_actions field');
assert(renderRealTagExecutionReport(null) === 'real_tag_execution_report: null',      '[K-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-execution-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
