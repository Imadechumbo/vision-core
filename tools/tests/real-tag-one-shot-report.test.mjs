#!/usr/bin/env node
/**
 * Real Tag One-Shot Report — Unit Tests V79.1
 */

import {
  buildRealTagOneShotReport,
  renderRealTagOneShotReport,
  TAG_REPORT_STATUSES,
  TAG_REPORT_BLOCKED_ACTIONS,
  TAG_REPORT_SAFE_NEXT_ACTIONS,
} from '../real-tag-one-shot-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T15:00:00.000Z';

const GOOD_LEDGER = {
  event_count: 6,
  chain_valid: true,
  events: [
    { event_id: 'evt-01' }, { event_id: 'evt-02' }, { event_id: 'evt-03' },
    { event_id: 'evt-04' }, { event_id: 'evt-05' }, { event_id: 'evt-06' },
  ],
};

const GOOD_SAFETY = {
  tag_safety_ready:  true,
  tag_safety_status: 'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',
};

const GOOD_ANCHOR = {
  anchor_ready:       true,
  rollback_anchor_id: 'anchor-test-id',
  target_tag:         'v1.2.3',
};

const GOOD_CONTRACT = {
  one_shot_contract_id: 'contract-test-id',
  target_tag:           'v1.2.3',
  git_head:             'abc1234def5678901234567890123456789012ab',
  evidence_receipt_id:  'receipt-test-id',
  evidence_source:      'go-core',
};

const GOOD_EXECUTOR = {
  executor_id: 'executor-test-id',
};

const GOOD_ARMED = {
  armed_guard_status: 'TAG_ARMED_READY_BUT_NOT_EXECUTED',
};

const GOOD_PARAMS = {
  audit_ledger:    GOOD_LEDGER,
  safety_result:   GOOD_SAFETY,
  rollback_anchor: GOOD_ANCHOR,
  one_shot_contract: GOOD_CONTRACT,
  executor_result: GOOD_EXECUTOR,
  armed_guard:     GOOD_ARMED,
  _mock_timestamp: TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_REPORT_STATUSES),                                              '[A-01] statuses array');
assert(TAG_REPORT_STATUSES.length === 4,                                                '[A-02] 4 statuses');
assert(TAG_REPORT_STATUSES.includes('TAG_REPORT_BLOCKED_LEDGER'),                       '[A-03] BLOCKED_LEDGER');
assert(TAG_REPORT_STATUSES.includes('TAG_REPORT_BLOCKED_SAFETY'),                       '[A-04] BLOCKED_SAFETY');
assert(TAG_REPORT_STATUSES.includes('TAG_REPORT_BLOCKED_ROLLBACK'),                     '[A-05] BLOCKED_ROLLBACK');
assert(TAG_REPORT_STATUSES.includes('TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR'),     '[A-06] READY');
assert(Array.isArray(TAG_REPORT_BLOCKED_ACTIONS) && TAG_REPORT_BLOCKED_ACTIONS.length === 7, '[A-07] 7 blocked');
assert(Array.isArray(TAG_REPORT_SAFE_NEXT_ACTIONS) && TAG_REPORT_SAFE_NEXT_ACTIONS.length === 5, '[A-08] 5 safe');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagOneShotReport({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                         '[B-01] returns object');
assert(fix.tag_report_status   === 'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR',       '[B-02] READY status');
assert(fix.tag_one_shot_ready  === true,                                                '[B-03] ready=true');
assert(fix.schema_version      === 'v79.1',                                             '[B-04] schema=v79.1');
assert(typeof fix.report_id === 'string' && fix.report_id.length === 24,               '[B-05] id 24 chars');
assert(fix.created_at          === TS,                                                  '[B-06] created_at=TS');
assert(fix.blocking_reason     === null,                                                '[B-07] blocking=null');
assert(fix.future_manual_executor_required === true,                                    '[B-08] future=true');
assert(Array.isArray(fix.blocked_actions),                                              '[B-09] blocked_actions');
assert(Array.isArray(fix.safe_next_actions),                                            '[B-10] safe_actions');

// ─── Suite C: Blocked ledger ──────────────────────────────────────
console.log('\n[Suite C] Blocked ledger');
const noLedger = buildRealTagOneShotReport({ ...GOOD_PARAMS, audit_ledger: null });
assert(noLedger.tag_report_status === 'TAG_REPORT_BLOCKED_LEDGER',                     '[C-01] BLOCKED_LEDGER null');

const emptyLedger = buildRealTagOneShotReport({ ...GOOD_PARAMS, audit_ledger: { event_count: 0, events: [] } });
assert(emptyLedger.tag_report_status === 'TAG_REPORT_BLOCKED_LEDGER',                  '[C-02] BLOCKED_LEDGER empty');

// ─── Suite D: Blocked safety ──────────────────────────────────────
console.log('\n[Suite D] Blocked safety');
const noSafety = buildRealTagOneShotReport({ ...GOOD_PARAMS, safety_result: null });
assert(noSafety.tag_report_status === 'TAG_REPORT_BLOCKED_SAFETY',                     '[D-01] BLOCKED_SAFETY null');

const badSafety = buildRealTagOneShotReport({ ...GOOD_PARAMS, safety_result: { tag_safety_ready: false } });
assert(badSafety.tag_report_status === 'TAG_REPORT_BLOCKED_SAFETY',                    '[D-02] BLOCKED_SAFETY false');

// ─── Suite E: Blocked rollback ────────────────────────────────────
console.log('\n[Suite E] Blocked rollback');
const noAnchor = buildRealTagOneShotReport({ ...GOOD_PARAMS, rollback_anchor: null });
assert(noAnchor.tag_report_status === 'TAG_REPORT_BLOCKED_ROLLBACK',                   '[E-01] BLOCKED_ROLLBACK null');

const badAnchor = buildRealTagOneShotReport({ ...GOOD_PARAMS, rollback_anchor: { anchor_ready: false } });
assert(badAnchor.tag_report_status === 'TAG_REPORT_BLOCKED_ROLLBACK',                  '[E-02] BLOCKED_ROLLBACK false');

// ─── Suite F: Full report ready ───────────────────────────────────
console.log('\n[Suite F] Full report ready');
const ready = buildRealTagOneShotReport(GOOD_PARAMS);
assert(ready.tag_one_shot_ready  === true,                                              '[F-01] ready=true');
assert(ready.tag_report_status   === 'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR',     '[F-02] READY status');
assert(ready.target_tag          === 'v1.2.3',                                          '[F-03] tag preserved');
assert(ready.rollback_anchor_id  === 'anchor-test-id',                                  '[F-04] anchor id');
assert(ready.one_shot_contract_id === 'contract-test-id',                               '[F-05] contract id');
assert(ready.dry_run_executor_id === 'executor-test-id',                                '[F-06] executor id');
assert(ready.armed_guard_status  === 'TAG_ARMED_READY_BUT_NOT_EXECUTED',                '[F-07] guard status');
assert(ready.ledger_event_ids.length === 6,                                             '[F-08] 6 ledger events');
assert(ready.chain_valid         === true,                                              '[F-09] chain_valid');

// ─── Suite G: Safe next actions ────────────────────────────────────
console.log('\n[Suite G] Safe next actions');
assert(ready.safe_next_actions.includes('if_approved_run_future_v81_manual_executor_only'), '[G-01] future executor action');
assert(ready.blocked_actions.includes('auto_tag'),                                     '[G-02] auto_tag blocked');
assert(ready.blocked_actions.includes('auto_push'),                                    '[G-03] auto_push blocked');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.real_execution_armed            === false, '[H-01] fix: armed=false');
assert(fix.tag_created                     === false, '[H-02] fix: tag_created=false');
assert(fix.git_push_performed              === false, '[H-03] fix: push=false');
assert(fix.deploy_performed                === false, '[H-04] fix: deploy=false');
assert(fix.stable_promoted                 === false, '[H-05] fix: stable=false');
assert(fix.release_performed               === false, '[H-06] fix: release=false');
assert(fix.requires_manual_executor        === true,  '[H-07] fix: requires_manual=true');
assert(fix.future_manual_executor_required === true,  '[H-08] fix: future=true');

assert(ready.tag_created                   === false, '[H-09] ready: tag=false');
assert(ready.git_push_performed            === false, '[H-10] ready: push=false');
assert(ready.future_manual_executor_required === true,'[H-11] ready: future=true');

assert(noLedger.tag_created                === false, '[H-12] blocked: tag=false');
assert(noLedger.future_manual_executor_required === true, '[H-13] blocked: future=true');

// ─── Suite I: Render ─────────────────────────────────────────────
console.log('\n[Suite I] Render');
const rendered = renderRealTagOneShotReport(fix);
assert(typeof rendered === 'string',                                                    '[I-01] returns string');
assert(rendered.includes('TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR'),               '[I-02] status in output');
assert(rendered.includes('tag_created                     : false'),                   '[I-03] tag=false');
assert(rendered.includes('requires_manual_executor        : true'),                    '[I-04] requires=true');
assert(rendered.includes('future_manual_executor_required : true'),                    '[I-05] future=true');
assert(renderRealTagOneShotReport(null) === 'real_tag_one_shot_report: null',          '[I-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
