#!/usr/bin/env node
/**
 * Real Tag One-Shot Armed Guard — Unit Tests V78.1
 */

import {
  evaluateRealTagOneShotArmedGuard,
  validateRealTagOneShotArmedGuard,
  renderRealTagOneShotArmedGuard,
  TAG_ARMED_STATUSES,
} from '../real-tag-one-shot-armed-guard.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T13:00:00.000Z';

const GOOD_CONTRACT = {
  one_shot_contract_status: 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',
  one_shot_contract_id:     'contract-test-id',
  target_tag:               'v1.2.3',
  git_head:                 'abc1234def5678901234567890123456789012ab',
  evidence_receipt_id:      'receipt-test-id-xyz',
};

const GOOD_PARAMS = {
  real_tag_one_shot:                       true,
  i_understand_this_creates_a_real_git_tag: true,
  confirm_target_tag:                      'v1.2.3',
  confirm_git_head:                        'abc1234def5678901234567890123456789012ab',
  confirm_evidence_receipt:                'receipt-test-id-xyz',
  confirm_no_deploy:                       true,
  confirm_no_stable_promotion:             true,
  confirm_no_release:                      true,
  confirm_rollback_anchor:                 true,
  local_interactive_session:               true,
  ci_environment:                          false,
  one_shot_contract:                       GOOD_CONTRACT,
  _mock_timestamp:                         TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_ARMED_STATUSES),                                                  '[A-01] statuses array');
assert(TAG_ARMED_STATUSES.length === 7,                                                    '[A-02] 7 statuses');
assert(TAG_ARMED_STATUSES.includes('TAG_ARMED_BLOCKED_NOT_REQUESTED'),                     '[A-03] BLOCKED_NOT_REQUESTED');
assert(TAG_ARMED_STATUSES.includes('TAG_ARMED_BLOCKED_CI'),                                '[A-04] BLOCKED_CI');
assert(TAG_ARMED_STATUSES.includes('TAG_ARMED_BLOCKED_CONFIRMATION'),                      '[A-05] BLOCKED_CONFIRMATION');
assert(TAG_ARMED_STATUSES.includes('TAG_ARMED_BLOCKED_TARGET'),                            '[A-06] BLOCKED_TARGET');
assert(TAG_ARMED_STATUSES.includes('TAG_ARMED_BLOCKED_EVIDENCE'),                          '[A-07] BLOCKED_EVIDENCE');
assert(TAG_ARMED_STATUSES.includes('TAG_ARMED_BLOCKED_ROLLBACK'),                          '[A-08] BLOCKED_ROLLBACK');
assert(TAG_ARMED_STATUSES.includes('TAG_ARMED_READY_BUT_NOT_EXECUTED'),                    '[A-09] READY_BUT_NOT_EXECUTED');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateRealTagOneShotArmedGuard({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                            '[B-01] returns object');
assert(fix.armed_guard_status  === 'TAG_ARMED_READY_BUT_NOT_EXECUTED',                     '[B-02] status=READY_BUT_NOT_EXECUTED');
assert(fix.armed_guard_ready   === true,                                                   '[B-03] ready=true');
assert(fix.schema_version      === 'v78.1',                                                '[B-04] schema=v78.1');
assert(typeof fix.armed_guard_id === 'string' && fix.armed_guard_id.length === 24,        '[B-05] id 24 chars');
assert(fix.created_at          === TS,                                                     '[B-06] created_at=TS');
assert(fix.blocking_reason     === null,                                                   '[B-07] blocking=null');

// ─── Suite C: Not requested ───────────────────────────────────────
console.log('\n[Suite C] Not requested');
const notRequested = evaluateRealTagOneShotArmedGuard({ _mock_timestamp: TS });
assert(notRequested.armed_guard_status === 'TAG_ARMED_BLOCKED_NOT_REQUESTED',              '[C-01] BLOCKED_NOT_REQUESTED');

const falseRequested = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, real_tag_one_shot: false });
assert(falseRequested.armed_guard_status === 'TAG_ARMED_BLOCKED_NOT_REQUESTED',            '[C-02] BLOCKED_NOT_REQUESTED false');

// ─── Suite D: CI blocked ──────────────────────────────────────────
console.log('\n[Suite D] CI blocked');
const ciEnv = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, ci_environment: true });
assert(ciEnv.armed_guard_status === 'TAG_ARMED_BLOCKED_CI',                                '[D-01] BLOCKED_CI true');

const nonInteractive = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, local_interactive_session: false });
assert(nonInteractive.armed_guard_status === 'TAG_ARMED_BLOCKED_CI',                       '[D-02] BLOCKED_CI non-interactive');

// ─── Suite E: Missing confirmations ───────────────────────────────
console.log('\n[Suite E] Missing confirmations');
const noUnderstand = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, i_understand_this_creates_a_real_git_tag: false });
assert(noUnderstand.armed_guard_status === 'TAG_ARMED_BLOCKED_CONFIRMATION',               '[E-01] BLOCKED_CONFIRMATION no_understand');

const noDeploy = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_no_deploy: false });
assert(noDeploy.armed_guard_status === 'TAG_ARMED_BLOCKED_CONFIRMATION',                   '[E-02] BLOCKED_CONFIRMATION no_deploy');

const noStable = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_no_stable_promotion: false });
assert(noStable.armed_guard_status === 'TAG_ARMED_BLOCKED_CONFIRMATION',                   '[E-03] BLOCKED_CONFIRMATION no_stable');

const noRelease = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_no_release: false });
assert(noRelease.armed_guard_status === 'TAG_ARMED_BLOCKED_CONFIRMATION',                  '[E-04] BLOCKED_CONFIRMATION no_release');

// ─── Suite F: Target mismatch ─────────────────────────────────────
console.log('\n[Suite F] Target mismatch');
const badTag = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_target_tag: 'v9.9.9' });
assert(badTag.armed_guard_status === 'TAG_ARMED_BLOCKED_TARGET',                           '[F-01] BLOCKED_TARGET wrong tag');

const badHead = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_git_head: 'wronghead' });
assert(badHead.armed_guard_status === 'TAG_ARMED_BLOCKED_TARGET',                          '[F-02] BLOCKED_TARGET wrong head');

// ─── Suite G: Evidence mismatch ───────────────────────────────────
console.log('\n[Suite G] Evidence mismatch');
const badReceipt = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_evidence_receipt: 'wrong-receipt' });
assert(badReceipt.armed_guard_status === 'TAG_ARMED_BLOCKED_EVIDENCE',                     '[G-01] BLOCKED_EVIDENCE wrong receipt');

const nullReceipt = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_evidence_receipt: null });
assert(nullReceipt.armed_guard_status === 'TAG_ARMED_BLOCKED_EVIDENCE',                    '[G-02] BLOCKED_EVIDENCE null');

// ─── Suite H: Rollback missing ────────────────────────────────────
console.log('\n[Suite H] Rollback missing');
const noRollback = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_rollback_anchor: false });
assert(noRollback.armed_guard_status === 'TAG_ARMED_BLOCKED_ROLLBACK',                     '[H-01] BLOCKED_ROLLBACK false');

const nullRollback = evaluateRealTagOneShotArmedGuard({ ...GOOD_PARAMS, confirm_rollback_anchor: null });
assert(nullRollback.armed_guard_status === 'TAG_ARMED_BLOCKED_ROLLBACK',                   '[H-02] BLOCKED_ROLLBACK null');

// ─── Suite I: Full armed ready ────────────────────────────────────
console.log('\n[Suite I] Full armed ready');
const ready = evaluateRealTagOneShotArmedGuard(GOOD_PARAMS);
assert(ready.armed_guard_ready        === true,                                            '[I-01] ready=true');
assert(ready.armed_guard_status       === 'TAG_ARMED_READY_BUT_NOT_EXECUTED',              '[I-02] READY_BUT_NOT_EXECUTED');
assert(ready.requires_manual_executor === true,                                            '[I-03] requires_manual_executor=true');

// ─── Suite J: Invariants ──────────────────────────────────────────
console.log('\n[Suite J] Invariants');
assert(fix.real_execution_armed    === false, '[J-01] fix: armed=false');
assert(fix.tag_execution_allowed   === false, '[J-02] fix: tag_exec=false');
assert(fix.tag_created             === false, '[J-03] fix: tag_created=false');
assert(fix.git_push_performed      === false, '[J-04] fix: push=false');
assert(fix.deploy_performed        === false, '[J-05] fix: deploy=false');
assert(fix.stable_promoted         === false, '[J-06] fix: stable=false');
assert(fix.release_performed       === false, '[J-07] fix: release=false');
assert(fix.requires_manual_executor=== true,  '[J-08] fix: requires_manual=true');

assert(ready.tag_created           === false, '[J-09] ready: tag_created=false');
assert(ready.real_execution_armed  === false, '[J-10] ready: armed=false');
assert(ready.requires_manual_executor=== true,'[J-11] ready: requires_manual=true');

assert(notRequested.tag_created         === false, '[J-12] blocked: tag_created=false');
assert(notRequested.requires_manual_executor === true, '[J-13] blocked: requires_manual=true');

// ─── Suite K: Validate ───────────────────────────────────────────
console.log('\n[Suite K] Validate');
assert(validateRealTagOneShotArmedGuard(fix).valid === true,                               '[K-01] valid=true');
assert(validateRealTagOneShotArmedGuard(null).valid === false,                             '[K-02] null invalid');
assert(validateRealTagOneShotArmedGuard({ armed_guard_status: 'BAD', tag_created: false, git_push_performed: false, requires_manual_executor: true }).valid === false, '[K-03] bad status');

// ─── Suite L: Render ─────────────────────────────────────────────
console.log('\n[Suite L] Render');
const rendered = renderRealTagOneShotArmedGuard(fix);
assert(typeof rendered === 'string',                                                       '[L-01] returns string');
assert(rendered.includes('TAG_ARMED_READY_BUT_NOT_EXECUTED'),                             '[L-02] status in output');
assert(rendered.includes('real_execution_armed        : false'),                          '[L-03] armed=false');
assert(rendered.includes('tag_created                 : false'),                          '[L-04] tag=false');
assert(rendered.includes('requires_manual_executor    : true'),                           '[L-05] requires_manual=true');
assert(renderRealTagOneShotArmedGuard(null) === 'real_tag_one_shot_armed_guard: null',    '[L-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-armed-guard: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
