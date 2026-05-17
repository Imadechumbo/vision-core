#!/usr/bin/env node
/**
 * Release Rehearsal Report — Unit Tests V54.0
 */

import {
  buildReleaseRehearsalReport,
  renderReleaseRehearsalReport,
  REHEARSAL_REPORT_STATUSES,
  REPORT_BLOCKED_ACTIONS,
  REPORT_SAFE_NEXT_ACTIONS,
} from '../release-rehearsal-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const MOCK_REHEARSAL_RESULT = {
  rehearsal_status:    'REHEARSAL_READY',
  rehearsal_ready:     true,
  sandbox_id:          'sandbox-abc',
  rehearsal_plan_id:   'plan-abc',
  rehearsal_report_id: 'rpt-abc',
  replayed_commands:   ['cmd1', 'cmd2', 'cmd3'],
};

const MOCK_LEDGER_CHAIN = {
  valid:   true,
  entries: 5,
  status:  'REHEARSAL_LEDGER_READY',
};

const MOCK_LEDGER_INVALID = {
  valid:  false,
  status: 'REHEARSAL_LEDGER_BLOCKED_TAMPER',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REHEARSAL_REPORT_STATUSES),                                        '[A-01] REHEARSAL_REPORT_STATUSES array');
assert(REHEARSAL_REPORT_STATUSES.length === 3,                                          '[A-02] 3 statuses');
assert(REHEARSAL_REPORT_STATUSES.includes('REPORT_BLOCKED_REHEARSAL'),                 '[A-03] BLOCKED_REHEARSAL present');
assert(REHEARSAL_REPORT_STATUSES.includes('REPORT_BLOCKED_LEDGER'),                    '[A-04] BLOCKED_LEDGER present');
assert(REHEARSAL_REPORT_STATUSES.includes('REPORT_READY'),                             '[A-05] REPORT_READY present');

assert(Array.isArray(REPORT_BLOCKED_ACTIONS),                                           '[A-06] REPORT_BLOCKED_ACTIONS array');
assert(REPORT_BLOCKED_ACTIONS.length === 6,                                             '[A-07] 6 blocked actions');
assert(REPORT_BLOCKED_ACTIONS.includes('auto_release'),                                 '[A-08] auto_release blocked');
assert(REPORT_BLOCKED_ACTIONS.includes('auto_tag'),                                     '[A-09] auto_tag blocked');
assert(REPORT_BLOCKED_ACTIONS.includes('auto_stable_promotion'),                        '[A-10] auto_stable_promotion blocked');
assert(REPORT_BLOCKED_ACTIONS.includes('auto_deploy'),                                  '[A-11] auto_deploy blocked');
assert(REPORT_BLOCKED_ACTIONS.includes('evidence_override'),                            '[A-12] evidence_override blocked');
assert(REPORT_BLOCKED_ACTIONS.includes('go_core_override'),                             '[A-13] go_core_override blocked');

assert(Array.isArray(REPORT_SAFE_NEXT_ACTIONS),                                         '[A-14] REPORT_SAFE_NEXT_ACTIONS array');
assert(REPORT_SAFE_NEXT_ACTIONS.length === 5,                                           '[A-15] 5 safe next actions');
assert(REPORT_SAFE_NEXT_ACTIONS.includes('human_review_rehearsal_report'),              '[A-16] human_review_rehearsal_report present');
assert(REPORT_SAFE_NEXT_ACTIONS.includes('verify_blocked_operations'),                  '[A-17] verify_blocked_operations present');
assert(REPORT_SAFE_NEXT_ACTIONS.includes('review_simulated_commands'),                  '[A-18] review_simulated_commands present');
assert(REPORT_SAFE_NEXT_ACTIONS.includes('validate_rollback_anchor'),                   '[A-19] validate_rollback_anchor present');
assert(REPORT_SAFE_NEXT_ACTIONS.includes('approve_or_reject_release'),                  '[A-20] approve_or_reject_release present');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = buildReleaseRehearsalReport({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture !== null && typeof fixture === 'object',                                 '[B-01] returns object');
assert(fixture.report_status           === 'REPORT_READY',                             '[B-02] report_status=REPORT_READY');
assert(fixture.report_ready            === true,                                        '[B-03] report_ready=true');
assert(fixture.rehearsal_status        === 'REHEARSAL_READY',                          '[B-04] rehearsal_status=REHEARSAL_READY');
assert(fixture.rehearsal_ready         === true,                                        '[B-05] rehearsal_ready=true');
assert(typeof fixture.report_id        === 'string' && fixture.report_id.length > 0,   '[B-06] report_id string');
assert(fixture.evidence_source         === 'go-core',                                  '[B-07] evidence_source=go-core');
assert(typeof fixture.simulated_commands === 'number',                                  '[B-08] simulated_commands number');
assert(Array.isArray(fixture.blocked_operations),                                       '[B-09] blocked_operations array');
assert(fixture.blocked_operations.length === 6,                                         '[B-10] 6 blocked_operations');
assert(Array.isArray(fixture.ledger_event_ids),                                         '[B-11] ledger_event_ids array');
assert(fixture.ledger_event_ids.length === 5,                                           '[B-12] 5 ledger events');
assert(fixture.chain_valid             === true,                                        '[B-13] chain_valid=true');
assert(Array.isArray(fixture.safe_next_actions),                                        '[B-14] safe_next_actions array');
assert(fixture.safe_next_actions.length === 5,                                          '[B-15] 5 safe_next_actions');
assert(Array.isArray(fixture.blocked_actions),                                          '[B-16] blocked_actions array');
assert(fixture.blocking_reason         === null,                                        '[B-17] blocking_reason=null');
assert(fixture.schema_version          === 'v54.0',                                    '[B-18] schema_version=v54.0');

// Execution flags false
assert(fixture.deploy_allowed            === false,                                     '[B-19] deploy_allowed=false');
assert(fixture.promotion_allowed         === false,                                     '[B-20] promotion_allowed=false');
assert(fixture.stable_allowed            === false,                                     '[B-21] stable_allowed=false');
assert(fixture.tag_allowed               === false,                                     '[B-22] tag_allowed=false');
assert(fixture.release_execution_allowed === false,                                     '[B-23] exec_allowed=false');
assert(fixture.release_performed         === false,                                     '[B-24] release_performed=false');
assert(fixture.tag_created               === false,                                     '[B-25] tag_created=false');
assert(fixture.stable_promoted           === false,                                     '[B-26] stable_promoted=false');
assert(fixture.deploy_performed          === false,                                     '[B-27] deploy_performed=false');
assert(fixture.human_review_required     === true,                                      '[B-28] human_review_required=true');
assert(fixture.local_only                === true,                                      '[B-29] local_only=true');
assert(fixture.rehearsal_only            === true,                                      '[B-30] rehearsal_only=true');

// ─── Suite C: Blocked — missing rehearsal ─────────────────────────
console.log('\n[Suite C] Blocked — missing rehearsal result');
const noRehearsal = buildReleaseRehearsalReport({ _mock_timestamp: TS });
assert(noRehearsal.report_status       === 'REPORT_BLOCKED_REHEARSAL',                 '[C-01] status=BLOCKED_REHEARSAL');
assert(noRehearsal.report_ready        === false,                                       '[C-02] report_ready=false');
assert(noRehearsal.blocking_reason     === 'rehearsal_not_ready',                      '[C-03] blocking_reason=rehearsal_not_ready');
assert(noRehearsal.deploy_allowed      === false,                                       '[C-04] deploy_allowed=false');
assert(noRehearsal.human_review_required === true,                                      '[C-05] human_review_required=true');

const notReadyRehearsal = buildReleaseRehearsalReport({
  rehearsal_result: { rehearsal_ready: false, rehearsal_status: 'REHEARSAL_BLOCKED' },
  _mock_timestamp: TS,
});
assert(notReadyRehearsal.report_status  === 'REPORT_BLOCKED_REHEARSAL',                '[C-06] not-ready rehearsal → BLOCKED_REHEARSAL');
assert(notReadyRehearsal.report_ready   === false,                                      '[C-07] report_ready=false');
assert(notReadyRehearsal.rehearsal_status === 'REHEARSAL_BLOCKED',                     '[C-08] rehearsal_status propagated');

// ─── Suite D: Blocked — invalid ledger ────────────────────────────
console.log('\n[Suite D] Blocked — invalid ledger chain');
const badLedger = buildReleaseRehearsalReport({
  rehearsal_result: MOCK_REHEARSAL_RESULT,
  ledger_chain:     MOCK_LEDGER_INVALID,
  _mock_timestamp:  TS,
});
assert(badLedger.report_status         === 'REPORT_BLOCKED_LEDGER',                    '[D-01] status=BLOCKED_LEDGER');
assert(badLedger.report_ready          === false,                                       '[D-02] report_ready=false');
assert(badLedger.blocking_reason       === 'ledger_chain_invalid',                     '[D-03] blocking_reason=ledger_chain_invalid');
assert(badLedger.deploy_allowed        === false,                                       '[D-04] deploy_allowed=false');
assert(badLedger.human_review_required === true,                                        '[D-05] human_review_required=true');

// ─── Suite E: Full report ready ────────────────────────────────────
console.log('\n[Suite E] Full report ready');
const full = buildReleaseRehearsalReport({
  rehearsal_result: MOCK_REHEARSAL_RESULT,
  ledger_chain:     MOCK_LEDGER_CHAIN,
  _mock_timestamp:  TS,
});
assert(full.report_status              === 'REPORT_READY',                             '[E-01] report_status=REPORT_READY');
assert(full.report_ready               === true,                                        '[E-02] report_ready=true');
assert(typeof full.report_id           === 'string' && full.report_id.length > 0,      '[E-03] report_id string');
assert(full.rehearsal_status           === 'REHEARSAL_READY',                          '[E-04] rehearsal_status=REHEARSAL_READY');
assert(full.sandbox_id                 === 'sandbox-abc',                              '[E-05] sandbox_id propagated');
assert(full.rehearsal_plan_id          === 'plan-abc',                                 '[E-06] rehearsal_plan_id propagated');
assert(full.rehearsal_report_id        === 'rpt-abc',                                  '[E-07] rehearsal_report_id propagated');
assert(full.evidence_source            === 'go-core',                                  '[E-08] evidence_source=go-core');
assert(full.simulated_commands         === 3,                                           '[E-09] 3 simulated_commands');
assert(full.chain_valid                === true,                                        '[E-10] chain_valid=true');
assert(full.blocking_reason            === null,                                        '[E-11] blocking_reason=null');
assert(full.deploy_allowed             === false,                                       '[E-12] deploy_allowed=false');
assert(full.human_review_required      === true,                                        '[E-13] human_review_required=true');

// Without ledger
const noLedger = buildReleaseRehearsalReport({
  rehearsal_result: MOCK_REHEARSAL_RESULT,
  _mock_timestamp:  TS,
});
assert(noLedger.report_status          === 'REPORT_READY',                             '[E-14] no ledger → REPORT_READY');
assert(noLedger.chain_valid            === null,                                        '[E-15] chain_valid=null when no ledger');
assert(noLedger.ledger_event_ids.length === 0,                                         '[E-16] empty ledger_event_ids');

// ─── Suite F: blocked_actions present and correct ──────────────────
console.log('\n[Suite F] blocked_actions');
assert(Array.isArray(full.blocked_actions),                                             '[F-01] blocked_actions array');
assert(full.blocked_actions.includes('auto_release'),                                   '[F-02] auto_release in blocked_actions');
assert(full.blocked_actions.includes('auto_tag'),                                       '[F-03] auto_tag in blocked_actions');
assert(full.blocked_actions.includes('auto_stable_promotion'),                          '[F-04] auto_stable_promotion in blocked_actions');
assert(full.blocked_actions.includes('auto_deploy'),                                    '[F-05] auto_deploy in blocked_actions');
assert(full.blocked_actions.includes('evidence_override'),                              '[F-06] evidence_override in blocked_actions');
assert(full.blocked_actions.includes('go_core_override'),                               '[F-07] go_core_override in blocked_actions');

// ─── Suite G: safe_next_actions present ───────────────────────────
console.log('\n[Suite G] safe_next_actions');
assert(Array.isArray(full.safe_next_actions),                                           '[G-01] safe_next_actions array');
assert(full.safe_next_actions.includes('human_review_rehearsal_report'),               '[G-02] human_review_rehearsal_report');
assert(full.safe_next_actions.includes('verify_blocked_operations'),                    '[G-03] verify_blocked_operations');
assert(full.safe_next_actions.includes('review_simulated_commands'),                    '[G-04] review_simulated_commands');
assert(full.safe_next_actions.includes('validate_rollback_anchor'),                     '[G-05] validate_rollback_anchor');
assert(full.safe_next_actions.includes('approve_or_reject_release'),                    '[G-06] approve_or_reject_release');

// ─── Suite H: human_review_required=true always ───────────────────
console.log('\n[Suite H] human_review_required always true');
const cases = [
  { label: 'fixture',      o: fixture       },
  { label: 'no-rehearsal', o: noRehearsal   },
  { label: 'bad-ledger',   o: badLedger     },
  { label: 'full',         o: full          },
  { label: 'no-ledger',    o: noLedger      },
];
for (const { label, o } of cases) {
  assert(o.human_review_required === true, `[H] ${label}: human_review_required=true`);
}

// ─── Suite I: Invariants — all exec flags false everywhere ─────────
console.log('\n[Suite I] Invariants — execution flags false');
for (const { label, o } of cases) {
  assert(o.deploy_allowed            === false, `[I] ${label}: deploy_allowed=false`);
  assert(o.promotion_allowed         === false, `[I] ${label}: promotion_allowed=false`);
  assert(o.stable_allowed            === false, `[I] ${label}: stable_allowed=false`);
  assert(o.tag_allowed               === false, `[I] ${label}: tag_allowed=false`);
  assert(o.release_execution_allowed === false, `[I] ${label}: exec_allowed=false`);
  assert(o.release_performed         === false, `[I] ${label}: release_performed=false`);
  assert(o.tag_created               === false, `[I] ${label}: tag_created=false`);
  assert(o.stable_promoted           === false, `[I] ${label}: stable_promoted=false`);
  assert(o.deploy_performed          === false, `[I] ${label}: deploy_performed=false`);
}

// ─── Suite J: renderReleaseRehearsalReport ────────────────────────
console.log('\n[Suite J] renderReleaseRehearsalReport');
const rendered = renderReleaseRehearsalReport(full);
assert(typeof rendered === 'string',                                                     '[J-01] returns string');
assert(rendered.includes('REPORT_READY'),                                               '[J-02] contains status');
assert(rendered.includes('human_review_required : true'),                               '[J-03] human_review_required=true in output');
assert(rendered.includes('deploy_allowed        : false'),                              '[J-04] deploy_allowed=false in output');
assert(rendered.includes('go-core'),                                                    '[J-05] evidence_source in output');

const renderedNull = renderReleaseRehearsalReport(null);
assert(renderedNull === 'report: null',                                                  '[J-06] null → "report: null"');

const renderedBlocked = renderReleaseRehearsalReport(noRehearsal);
assert(renderedBlocked.includes('REPORT_BLOCKED_REHEARSAL'),                            '[J-07] blocked status in rendered output');
assert(renderedBlocked.includes('rehearsal_not_ready'),                                 '[J-08] blocking_reason in rendered output');

// ─── Suite K: Deterministic report_id ────────────────────────────
console.log('\n[Suite K] Deterministic report_id');
const a = buildReleaseRehearsalReport({ rehearsal_result: MOCK_REHEARSAL_RESULT, _mock_timestamp: TS });
const b = buildReleaseRehearsalReport({ rehearsal_result: MOCK_REHEARSAL_RESULT, _mock_timestamp: TS });
assert(a.report_id === b.report_id,                                                      '[K-01] same inputs → same report_id');

const c = buildReleaseRehearsalReport({ rehearsal_result: MOCK_REHEARSAL_RESULT, _mock_timestamp: '2026-05-18T00:00:00.000Z' });
assert(a.report_id !== c.report_id,                                                      '[K-02] different timestamps → different report_id');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrelease-rehearsal-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
