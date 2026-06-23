#!/usr/bin/env node
/**
 * Real Tag Manual Armed Executor Guard — Unit Tests V84.0
 */

import {
  evaluateRealTagManualArmedExecutorGuard,
  validateRealTagManualArmedExecutorGuard,
  renderRealTagManualArmedExecutorGuard,
  ARMED_EXECUTOR_GUARD_STATUSES,
} from '../real-tag-manual-armed-executor-guard.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T20:00:00.000Z';

const READY_CONFIRM = { manual_confirmation_ready: true, confirm_evidence_receipt: 'receipt-test-001' };
const READY_LOCK    = {
  target_tag: 'v3.0.0',
  target_git_head: 'cafebabe1234567890123456789012345678beef',
  rollback_anchor_id: 'anchor-test-001',
};
const FULL_PARAMS = {
  execute_real_tag: true,
  ci_environment: false,
  local_interactive_session: true,
  confirmation_contract: READY_CONFIRM,
  safety_lock: READY_LOCK,
  target_tag: 'v3.0.0',
  target_git_head: 'cafebabe1234567890123456789012345678beef',
  evidence_receipt_id: 'receipt-test-001',
  evidence_source: 'go-core',
  rollback_anchor_id: 'anchor-test-001',
  requested_by: 'release-manager',
  _mock_timestamp: TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(ARMED_EXECUTOR_GUARD_STATUSES),                                 '[A-01] statuses array');
assert(ARMED_EXECUTOR_GUARD_STATUSES.length === 9,                                   '[A-02] 9 statuses');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_NOT_REQUESTED'),  '[A-03] BLOCKED_NOT_REQUESTED');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_EXECUTE_FLAG'),   '[A-04] BLOCKED_EXECUTE_FLAG');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_CI'),             '[A-05] BLOCKED_CI');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_CONFIRMATION'),   '[A-06] BLOCKED_CONFIRMATION');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_TARGET'),         '[A-07] BLOCKED_TARGET');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_HEAD'),           '[A-08] BLOCKED_HEAD');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_EVIDENCE'),       '[A-09] BLOCKED_EVIDENCE');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_BLOCKED_ROLLBACK'),       '[A-10] BLOCKED_ROLLBACK');
assert(ARMED_EXECUTOR_GUARD_STATUSES.includes('ARMED_EXECUTOR_GUARD_READY_FOR_MANUAL_EXECUTOR'), '[A-11] READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateRealTagManualArmedExecutorGuard({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version      === 'v84.0',                                          '[B-02] schema=v84.0');
assert(fix.armed_guard_status  === 'ARMED_EXECUTOR_GUARD_READY_FOR_MANUAL_EXECUTOR', '[B-03] READY');
assert(fix.armed_guard_ready   === true,                                             '[B-04] ready=true');
assert(typeof fix.guard_id === 'string' && fix.guard_id.length === 24,             '[B-05] id 24 chars');
assert(fix.blocking_reason     === null,                                             '[B-06] blocking=null');
assert(fix.real_tag_execution_allowed === true,                                      '[B-07] execution_allowed=true in fixture');
assert(fix.tag_created         === false,                                            '[B-08] tag_created=false even when armed');
assert(fix.git_push_performed  === false,                                            '[B-09] push=false even when armed');
assert(fix.ci_blocked          === true,                                             '[B-10] ci_blocked=true always');
assert(fix.created_at          === TS,                                               '[B-11] created_at=TS');

// ─── Suite C: Blocked Not Requested ──────────────────────────────
console.log('\n[Suite C] Blocked Not Requested');
const blockedC = evaluateRealTagManualArmedExecutorGuard({ _mock_timestamp: TS });
assert(blockedC.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_NOT_REQUESTED', '[C-01] no requested_by blocked');
assert(blockedC.armed_guard_ready  === false,                                        '[C-02] not ready');
assert(blockedC.blocking_reason    === 'requested_by_missing',                       '[C-03] reason');

// ─── Suite D: Blocked Execute Flag ───────────────────────────────
console.log('\n[Suite D] Blocked Execute Flag');
const blockedD1 = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', _mock_timestamp: TS,
});
assert(blockedD1.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_EXECUTE_FLAG', '[D-01] no execute_real_tag blocked');
assert(blockedD1.blocking_reason    === 'execute_real_tag_must_be_true',             '[D-02] reason');

const blockedD2 = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: false, _mock_timestamp: TS,
});
assert(blockedD2.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_EXECUTE_FLAG', '[D-03] false execute blocked');

// ─── Suite E: Blocked CI ─────────────────────────────────────────
console.log('\n[Suite E] Blocked CI');
const blockedE1 = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: true,
  ci_environment: true, _mock_timestamp: TS,
});
assert(blockedE1.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_CI',           '[E-01] ci=true blocked');

const blockedE2 = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: true,
  ci_environment: false, local_interactive_session: false, _mock_timestamp: TS,
});
assert(blockedE2.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_CI',           '[E-02] non-interactive blocked');

// ─── Suite F: Blocked Confirmation ───────────────────────────────
console.log('\n[Suite F] Blocked Confirmation');
const blockedF = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: true,
  ci_environment: false, local_interactive_session: true,
  _mock_timestamp: TS,
});
assert(blockedF.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_CONFIRMATION',  '[F-01] no confirm blocked');
assert(blockedF.blocking_reason    === 'confirmation_not_ready',                     '[F-02] reason');

// ─── Suite G: Blocked Target ─────────────────────────────────────
console.log('\n[Suite G] Blocked Target');
const blockedG = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: true,
  ci_environment: false, local_interactive_session: true,
  confirmation_contract: READY_CONFIRM,
  target_tag: '1.0.0',
  _mock_timestamp: TS,
});
assert(blockedG.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_TARGET',        '[G-01] no-v tag blocked');
assert(blockedG.blocking_reason    === 'target_tag_invalid',                         '[G-02] reason');

// ─── Suite H: Blocked Head ────────────────────────────────────────
console.log('\n[Suite H] Blocked Head');
const blockedH = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: true,
  ci_environment: false, local_interactive_session: true,
  confirmation_contract: READY_CONFIRM,
  target_tag: 'v3.0.0',
  _mock_timestamp: TS,
});
assert(blockedH.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_HEAD',          '[H-01] no head blocked');
assert(blockedH.blocking_reason    === 'target_git_head_missing',                    '[H-02] reason');

// ─── Suite I: Blocked Evidence ───────────────────────────────────
console.log('\n[Suite I] Blocked Evidence');
const blockedI = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: true,
  ci_environment: false, local_interactive_session: true,
  confirmation_contract: READY_CONFIRM,
  target_tag: 'v3.0.0', target_git_head: 'abc',
  evidence_source: 'wrong',
  _mock_timestamp: TS,
});
assert(blockedI.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_EVIDENCE',      '[I-01] wrong evidence blocked');
assert(blockedI.blocking_reason    === 'evidence_not_ready_or_not_go_core',          '[I-02] reason');

// ─── Suite J: Blocked Rollback ───────────────────────────────────
console.log('\n[Suite J] Blocked Rollback');
const blockedJ = evaluateRealTagManualArmedExecutorGuard({
  requested_by: 'user', execute_real_tag: true,
  ci_environment: false, local_interactive_session: true,
  confirmation_contract: READY_CONFIRM,
  target_tag: 'v3.0.0', target_git_head: 'abc',
  evidence_receipt_id: 'r1', evidence_source: 'go-core',
  _mock_timestamp: TS,
});
assert(blockedJ.armed_guard_status === 'ARMED_EXECUTOR_GUARD_BLOCKED_ROLLBACK',      '[J-01] no rollback blocked');
assert(blockedJ.blocking_reason    === 'rollback_anchor_id_missing',                 '[J-02] reason');

// ─── Suite K: Valid (fully armed) ─────────────────────────────────
console.log('\n[Suite K] Valid (fully armed)');
const valid = evaluateRealTagManualArmedExecutorGuard(FULL_PARAMS);
assert(valid.armed_guard_status          === 'ARMED_EXECUTOR_GUARD_READY_FOR_MANUAL_EXECUTOR', '[K-01] status READY');
assert(valid.armed_guard_ready           === true,                                   '[K-02] ready=true');
assert(valid.blocking_reason             === null,                                   '[K-03] blocking=null');
assert(valid.real_tag_execution_allowed  === true,                                   '[K-04] execution_allowed=true when armed');
assert(valid.tag_created                 === false,                                  '[K-05] tag_created=false even when armed');
assert(valid.git_push_performed          === false,                                  '[K-06] push=false even when armed');
assert(valid.ci_blocked                  === true,                                   '[K-07] ci_blocked=true always');
assert(valid.target_tag                  === 'v3.0.0',                               '[K-08] target_tag');
assert(valid.target_git_head             === FULL_PARAMS.target_git_head,            '[K-09] git_head');
assert(valid.evidence_receipt_id         === 'receipt-test-001',                    '[K-10] evidence stored');
assert(valid.rollback_anchor_id          === 'anchor-test-001',                     '[K-11] rollback stored');

// ─── Suite L: Invariants (blocked state still safe) ───────────────
console.log('\n[Suite L] Invariants (blocked)');
assert(blockedC.real_tag_execution_allowed === false, '[L-01] blocked: exec_allowed=false');
assert(blockedC.tag_created               === false,  '[L-02] blocked: tag_created=false');
assert(blockedC.ci_blocked                === true,   '[L-03] blocked: ci_blocked=true');
assert(blockedD1.real_tag_execution_allowed === false, '[L-04] blocked_exec: exec_allowed=false');

// ─── Suite M: Validate ────────────────────────────────────────────
console.log('\n[Suite M] Validate');
assert(validateRealTagManualArmedExecutorGuard(null).valid === false,                '[M-01] null → invalid');
assert(validateRealTagManualArmedExecutorGuard({ ...valid, armed_guard_status: 'BAD' }).valid === false, '[M-02] unknown status');
assert(validateRealTagManualArmedExecutorGuard({ ...valid, tag_created: true }).valid === false, '[M-03] tag=true → invalid');
assert(validateRealTagManualArmedExecutorGuard({ ...valid, git_push_performed: true }).valid === false, '[M-04] push=true → invalid');
assert(validateRealTagManualArmedExecutorGuard({ ...valid, ci_blocked: false }).valid === false, '[M-05] ci_blocked=false → invalid');
assert(validateRealTagManualArmedExecutorGuard(valid).valid === true,                '[M-06] valid → valid');
assert(validateRealTagManualArmedExecutorGuard(fix).valid === true,                  '[M-07] fixture → valid');

// ─── Suite N: Render ──────────────────────────────────────────────
console.log('\n[Suite N] Render');
const rendered = renderRealTagManualArmedExecutorGuard(fix);
assert(typeof rendered === 'string',                                                 '[N-01] returns string');
assert(rendered.includes('ARMED_EXECUTOR_GUARD_READY_FOR_MANUAL_EXECUTOR'),         '[N-02] status in output');
assert(rendered.includes('real_tag_execution_allowed      : true'),                 '[N-03] exec=true in fixture output');
assert(rendered.includes('tag_created                     : false'),                '[N-04] tag=false');
assert(rendered.includes('ci_blocked                      : true'),                 '[N-05] ci_blocked=true');
assert(renderRealTagManualArmedExecutorGuard(null) === 'real_tag_manual_armed_executor_guard: null', '[N-06] null → string');

// ─── Suite O: Deterministic ID ────────────────────────────────────
console.log('\n[Suite O] Deterministic ID');
const d1 = evaluateRealTagManualArmedExecutorGuard({ fixture_mode: true, _mock_timestamp: TS });
const d2 = evaluateRealTagManualArmedExecutorGuard({ fixture_mode: true, _mock_timestamp: TS });
assert(d1.guard_id === d2.guard_id,                                                  '[O-01] deterministic id');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-armed-executor-guard: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
