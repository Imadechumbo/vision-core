#!/usr/bin/env node
/**
 * Real Tag Post-Human Stabilization Report — Unit Tests V94.1
 */

import {
  STAB_REPORT_STATUSES,
  buildRealTagPostHumanStabilizationReport,
  renderStabilizationReport,
} from '../real-tag-post-human-stabilization-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T05:30:00.000Z';
const readyLedger   = { ledger_ready: true, hash_chain_valid: true, entry_count: 8 };
const readyVerifier = { verifier_passed: true, verifier_status: 'VERIFIER_PASSED' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(STAB_REPORT_STATUSES),                                   '[A-01] statuses array');
assert(STAB_REPORT_STATUSES.length === 4,                                     '[A-02] 4 statuses');
assert(STAB_REPORT_STATUSES.includes('STAB_REPORT_BLOCKED_LEDGER'),           '[A-03] BLOCKED_LEDGER');
assert(STAB_REPORT_STATUSES.includes('STAB_REPORT_BLOCKED_VERIFIER'),         '[A-04] BLOCKED_VERIFIER');
assert(STAB_REPORT_STATUSES.includes('STAB_REPORT_BLOCKED_HASH_CHAIN'),       '[A-05] BLOCKED_HASH_CHAIN');
assert(STAB_REPORT_STATUSES.includes('STAB_REPORT_READY'),                    '[A-06] STAB_REPORT_READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagPostHumanStabilizationReport({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                '[B-01] returns object');
assert(fix.report_status     === 'STAB_REPORT_READY',                         '[B-02] STAB_REPORT_READY');
assert(fix.report_ready      === true,                                         '[B-03] ready=true');
assert(fix.schema_version    === 'v94.1',                                      '[B-04] schema=v94.1');
assert(typeof fix.report_id === 'string' && fix.report_id.length === 24,      '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                         '[B-06] blocking=null');
assert(fix.ledger_verified   === true,                                         '[B-07] ledger_verified=true');
assert(fix.verifier_verified === true,                                         '[B-08] verifier_verified=true');
assert(fix.hash_chain_verified === true,                                       '[B-09] hash_chain_verified=true');
assert(Array.isArray(fix.blocked_actions),                                     '[B-10] blocked_actions array');
assert(fix.blocked_actions.length >= 4,                                        '[B-11] at least 4 blocked actions');
assert(Array.isArray(fix.safe_next_actions),                                   '[B-12] safe_next_actions array');
assert(fix.safe_next_actions.length >= 4,                                      '[B-13] at least 4 safe actions');
assert(fix.operation_summary !== null,                                         '[B-14] operation_summary present');
assert(fix.created_at        === TS,                                           '[B-15] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Operation summary ──────────────────────────────────
console.log('\n[Suite D] Operation summary');
const s = fix.operation_summary;
assert(s.operation_type          === 'real_tag_creation',                     '[D-01] operation_type=real_tag_creation');
assert(s.deploy_to_production    === 'BLOCKED',                               '[D-02] deploy=BLOCKED');
assert(s.promote_to_stable       === 'BLOCKED',                               '[D-03] stable=BLOCKED');
assert(s.release_to_users        === 'BLOCKED',                               '[D-04] release=BLOCKED');
assert(s.tag_created_by_report   === false,                                   '[D-05] tag_created_by_report=false');

// ─── Suite E: Blocked actions ─────────────────────────────────────
console.log('\n[Suite E] Blocked actions');
assert(fix.blocked_actions.includes('deploy_to_production'),                  '[E-01] deploy_to_production blocked');
assert(fix.blocked_actions.includes('promote_to_stable'),                     '[E-02] promote_to_stable blocked');
assert(fix.blocked_actions.includes('release_to_users'),                      '[E-03] release_to_users blocked');
assert(fix.blocked_actions.includes('modify_git_history'),                    '[E-04] modify_git_history blocked');

// ─── Suite F: Safe next actions ───────────────────────────────────
console.log('\n[Suite F] Safe next actions');
assert(fix.safe_next_actions.includes('archive_execution_receipt'),           '[F-01] archive_execution_receipt safe');
assert(fix.safe_next_actions.includes('review_audit_ledger_hash_chain'),      '[F-02] review_audit_ledger safe');
assert(fix.safe_next_actions.includes('notify_team_of_tag_creation'),         '[F-03] notify_team safe');

// ─── Suite G: Blocked states ──────────────────────────────────────
console.log('\n[Suite G] Blocked states');
const bNoLedger = buildRealTagPostHumanStabilizationReport({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoLedger.report_status   === 'STAB_REPORT_BLOCKED_LEDGER',            '[G-01] no ledger → BLOCKED_LEDGER');
assert(bNoLedger.report_ready    === false,                                    '[G-02] ready=false');
assert(bNoLedger.tag_created     === false,                                    '[G-03] tag_created=false in blocked');

const bBadLedger = buildRealTagPostHumanStabilizationReport({
  fixture_mode: false,
  ledger_result: { ledger_ready: false },
  _mock_timestamp: TS,
});
assert(bBadLedger.report_status === 'STAB_REPORT_BLOCKED_LEDGER',             '[G-04] bad ledger → BLOCKED_LEDGER');

const bNoVerifier = buildRealTagPostHumanStabilizationReport({
  fixture_mode: false,
  ledger_result: readyLedger,
  _mock_timestamp: TS,
});
assert(bNoVerifier.report_status === 'STAB_REPORT_BLOCKED_VERIFIER',          '[G-05] no verifier → BLOCKED_VERIFIER');
assert(bNoVerifier.ledger_verified === true,                                   '[G-06] ledger passed before verifier');

const bBadVerifier = buildRealTagPostHumanStabilizationReport({
  fixture_mode: false,
  ledger_result:   readyLedger,
  verifier_result: { verifier_passed: false },
  _mock_timestamp: TS,
});
assert(bBadVerifier.report_status === 'STAB_REPORT_BLOCKED_VERIFIER',         '[G-07] failed verifier → BLOCKED_VERIFIER');

const bBadChain = buildRealTagPostHumanStabilizationReport({
  fixture_mode: false,
  ledger_result:   { ledger_ready: true, hash_chain_valid: false, entry_count: 8 },
  verifier_result: readyVerifier,
  _mock_timestamp: TS,
});
assert(bBadChain.report_status === 'STAB_REPORT_BLOCKED_HASH_CHAIN',          '[G-08] bad chain → BLOCKED_HASH_CHAIN');
assert(bBadChain.verifier_verified === true,                                   '[G-09] verifier passed before chain check');

// ─── Suite H: Non-fixture READY ───────────────────────────────────
console.log('\n[Suite H] Non-fixture READY');
const ready = buildRealTagPostHumanStabilizationReport({
  fixture_mode: false,
  ledger_result:   readyLedger,
  verifier_result: readyVerifier,
  _mock_timestamp: TS,
});
assert(ready.report_status  === 'STAB_REPORT_READY',                          '[H-01] non-fixture READY');
assert(ready.report_ready   === true,                                          '[H-02] ready=true');
assert(ready.operation_summary.ledger_entries === 8,                          '[H-03] ledger_entries=8');

// ─── Suite I: Deterministic ID ────────────────────────────────────
console.log('\n[Suite I] Deterministic ID');
const i1 = buildRealTagPostHumanStabilizationReport({ fixture_mode: true, _mock_timestamp: TS });
const i2 = buildRealTagPostHumanStabilizationReport({ fixture_mode: true, _mock_timestamp: TS });
assert(i1.report_id === i2.report_id,                                         '[I-01] deterministic id');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderStabilizationReport(fix);
assert(typeof rendered === 'string',                                           '[J-01] returns string');
assert(rendered.includes('STAB_REPORT_READY'),                                '[J-02] status in output');
assert(rendered.includes('tag_created                 : false'),              '[J-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created     : false'),              '[J-04] actual_tag=false');
assert(rendered.includes('real_execution_not_performed: true'),               '[J-05] not_performed=true');
assert(rendered.includes('OPERATION SUMMARY'),                                '[J-06] operation summary section');
assert(rendered.includes('deploy_to_production : BLOCKED'),                  '[J-07] deploy blocked in summary');
assert(rendered.includes('BLOCKED ACTIONS'),                                  '[J-08] blocked actions section');
assert(rendered.includes('SAFE NEXT ACTIONS'),                                '[J-09] safe actions section');
assert(rendered.includes('BLOCKED: deploy_to_production'),                   '[J-10] deploy in blocked actions');
assert(rendered.includes('OK: archive_execution_receipt'),                   '[J-11] archive in safe actions');

const renderedBlocked = renderStabilizationReport(bNoLedger);
assert(!renderedBlocked.includes('OPERATION SUMMARY'),                        '[J-12] blocked: no summary');

assert(renderStabilizationReport(null) === 'stab_report: null',               '[J-13] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-post-human-stabilization-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
