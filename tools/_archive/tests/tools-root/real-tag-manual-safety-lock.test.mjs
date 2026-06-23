#!/usr/bin/env node
/**
 * Real Tag Manual Safety Lock — Unit Tests V82.0
 */

import {
  evaluateRealTagManualSafetyLock,
  validateRealTagManualSafetyLock,
  renderRealTagManualSafetyLock,
  MANUAL_SAFETY_LOCK_STATUSES,
} from '../real-tag-manual-safety-lock.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T18:00:00.000Z';

const READY_CONTRACT = {
  manual_executor_contract_ready: true,
  target_tag: 'v2.0.0',
};
const READY_CONFIRM = {
  manual_confirmation_ready: true,
};
const VALID_PARAMS = {
  executor_contract: READY_CONTRACT,
  confirmation_contract: READY_CONFIRM,
  target_git_head: 'deadbeef1234567890123456789012345678abcd',
  worktree_clean: true,
  local_tag_exists: false,
  remote_tag_exists: false,
  rollback_anchor_id: 'anchor-test-001',
  evidence_source: 'go-core',
  ci_environment: false,
  local_interactive_session: true,
  dry_run: true,
  requested_by: 'release-manager',
  _mock_timestamp: TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_SAFETY_LOCK_STATUSES),                                   '[A-01] statuses array');
assert(MANUAL_SAFETY_LOCK_STATUSES.length === 12,                                    '[A-02] 12 statuses');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_CONTRACT'),  '[A-03] BLOCKED_CONTRACT');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_CONFIRMATION'), '[A-04] BLOCKED_CONFIRMATION');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_HEAD'),      '[A-05] BLOCKED_HEAD');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_WORKTREE'),  '[A-06] BLOCKED_WORKTREE');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_LOCAL_TAG_EXISTS'), '[A-07] BLOCKED_LOCAL_TAG');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_REMOTE_TAG_EXISTS'), '[A-08] BLOCKED_REMOTE_TAG');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_ROLLBACK'),  '[A-09] BLOCKED_ROLLBACK');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_EVIDENCE'),  '[A-10] BLOCKED_EVIDENCE');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_CI'),        '[A-11] BLOCKED_CI');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_INTERACTIVE'), '[A-12] BLOCKED_INTERACTIVE');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_BLOCKED_DRY_RUN'),   '[A-13] BLOCKED_DRY_RUN');
assert(MANUAL_SAFETY_LOCK_STATUSES.includes('MANUAL_SAFETY_LOCK_READY_REVIEW'),      '[A-14] READY_REVIEW');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateRealTagManualSafetyLock({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version      === 'v82.0',                                          '[B-02] schema=v82.0');
assert(fix.safety_lock_status  === 'MANUAL_SAFETY_LOCK_READY_REVIEW',               '[B-03] READY_REVIEW');
assert(fix.safety_lock_ready   === true,                                             '[B-04] ready=true');
assert(typeof fix.safety_lock_id === 'string' && fix.safety_lock_id.length === 24,  '[B-05] id 24 chars');
assert(fix.blocking_reason     === null,                                             '[B-06] blocking=null');
assert(fix.evidence_source     === 'go-core',                                       '[B-07] evidence=go-core');
assert(fix.worktree_clean      === true,                                             '[B-08] worktree_clean=true');
assert(fix.local_tag_exists    === false,                                            '[B-09] local_tag=false');
assert(fix.remote_tag_exists   === false,                                            '[B-10] remote_tag=false');
assert(fix.local_interactive_session === true,                                       '[B-11] interactive=true');
assert(fix.ci_environment      === false,                                            '[B-12] ci=false');
assert(fix.dry_run             === true,                                             '[B-13] dry_run=true');
assert(fix.created_at          === TS,                                               '[B-14] created_at=TS');

// ─── Suite C: Blocked Contract ────────────────────────────────────
console.log('\n[Suite C] Blocked Contract');
const blockedC1 = evaluateRealTagManualSafetyLock({ _mock_timestamp: TS });
assert(blockedC1.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_CONTRACT',      '[C-01] null contract blocked');
assert(blockedC1.safety_lock_ready  === false,                                       '[C-02] not ready');
assert(blockedC1.blocking_reason    === 'executor_contract_not_ready',               '[C-03] reason');

const blockedC2 = evaluateRealTagManualSafetyLock({
  executor_contract: { manual_executor_contract_ready: false }, _mock_timestamp: TS,
});
assert(blockedC2.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_CONTRACT',      '[C-04] false contract blocked');

// ─── Suite D: Blocked Confirmation ───────────────────────────────
console.log('\n[Suite D] Blocked Confirmation');
const blockedD = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, _mock_timestamp: TS,
});
assert(blockedD.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_CONFIRMATION',   '[D-01] null confirm blocked');
assert(blockedD.blocking_reason    === 'confirmation_contract_not_ready',            '[D-02] reason');

// ─── Suite E: Blocked Head ────────────────────────────────────────
console.log('\n[Suite E] Blocked Head');
const blockedE = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  _mock_timestamp: TS,
});
assert(blockedE.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_HEAD',           '[E-01] missing head blocked');
assert(blockedE.blocking_reason    === 'target_git_head_missing',                    '[E-02] reason');

// ─── Suite F: Blocked Worktree ────────────────────────────────────
console.log('\n[Suite F] Blocked Worktree');
const blockedF = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: false, _mock_timestamp: TS,
});
assert(blockedF.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_WORKTREE',       '[F-01] dirty worktree blocked');
assert(blockedF.blocking_reason    === 'worktree_not_clean',                         '[F-02] reason');

// ─── Suite G: Blocked Local Tag ───────────────────────────────────
console.log('\n[Suite G] Blocked Local Tag');
const blockedG = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: true, local_tag_exists: true, _mock_timestamp: TS,
});
assert(blockedG.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_LOCAL_TAG_EXISTS', '[G-01] local tag blocked');
assert(blockedG.blocking_reason    === 'local_tag_already_exists',                   '[G-02] reason');

// ─── Suite H: Blocked Remote Tag ─────────────────────────────────
console.log('\n[Suite H] Blocked Remote Tag');
const blockedH = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: true, local_tag_exists: false,
  remote_tag_exists: true, _mock_timestamp: TS,
});
assert(blockedH.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_REMOTE_TAG_EXISTS', '[H-01] remote tag blocked');
assert(blockedH.blocking_reason    === 'remote_tag_already_exists',                  '[H-02] reason');

// ─── Suite I: Blocked Rollback ────────────────────────────────────
console.log('\n[Suite I] Blocked Rollback');
const blockedI = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: true, local_tag_exists: false,
  remote_tag_exists: false, _mock_timestamp: TS,
});
assert(blockedI.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_ROLLBACK',       '[I-01] missing rollback blocked');
assert(blockedI.blocking_reason    === 'rollback_anchor_id_missing',                 '[I-02] reason');

// ─── Suite J: Blocked Evidence ───────────────────────────────────
console.log('\n[Suite J] Blocked Evidence');
const blockedJ = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: true, local_tag_exists: false,
  remote_tag_exists: false, rollback_anchor_id: 'a1', evidence_source: 'wrong',
  _mock_timestamp: TS,
});
assert(blockedJ.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_EVIDENCE',       '[J-01] wrong evidence blocked');
assert(blockedJ.blocking_reason    === 'evidence_source_not_go_core',                '[J-02] reason');

// ─── Suite K: Blocked CI ─────────────────────────────────────────
console.log('\n[Suite K] Blocked CI');
const blockedK = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: true, local_tag_exists: false,
  remote_tag_exists: false, rollback_anchor_id: 'a1', evidence_source: 'go-core',
  ci_environment: true, _mock_timestamp: TS,
});
assert(blockedK.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_CI',             '[K-01] ci blocked');
assert(blockedK.blocking_reason    === 'ci_environment_detected',                    '[K-02] reason');

// ─── Suite L: Blocked Interactive ────────────────────────────────
console.log('\n[Suite L] Blocked Interactive');
const blockedL = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: true, local_tag_exists: false,
  remote_tag_exists: false, rollback_anchor_id: 'a1', evidence_source: 'go-core',
  ci_environment: false, local_interactive_session: false, _mock_timestamp: TS,
});
assert(blockedL.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_INTERACTIVE',    '[L-01] non-interactive blocked');
assert(blockedL.blocking_reason    === 'non_interactive_session',                    '[L-02] reason');

// ─── Suite M: Blocked Dry Run ─────────────────────────────────────
console.log('\n[Suite M] Blocked Dry Run');
const blockedM = evaluateRealTagManualSafetyLock({
  executor_contract: READY_CONTRACT, confirmation_contract: READY_CONFIRM,
  target_git_head: 'abc', worktree_clean: true, local_tag_exists: false,
  remote_tag_exists: false, rollback_anchor_id: 'a1', evidence_source: 'go-core',
  ci_environment: false, local_interactive_session: true, dry_run: false, _mock_timestamp: TS,
});
assert(blockedM.safety_lock_status === 'MANUAL_SAFETY_LOCK_BLOCKED_DRY_RUN',        '[M-01] no dry_run blocked');
assert(blockedM.blocking_reason    === 'dry_run_required',                           '[M-02] reason');

// ─── Suite N: Valid ───────────────────────────────────────────────
console.log('\n[Suite N] Valid');
const valid = evaluateRealTagManualSafetyLock(VALID_PARAMS);
assert(valid.safety_lock_status  === 'MANUAL_SAFETY_LOCK_READY_REVIEW',             '[N-01] valid: status');
assert(valid.safety_lock_ready   === true,                                           '[N-02] valid: ready=true');
assert(valid.blocking_reason     === null,                                           '[N-03] valid: blocking=null');
assert(valid.target_tag          === READY_CONTRACT.target_tag,                     '[N-04] valid: target_tag from contract');
assert(valid.target_git_head     === VALID_PARAMS.target_git_head,                  '[N-05] valid: git_head stored');
assert(valid.evidence_source     === 'go-core',                                     '[N-06] valid: evidence=go-core');
assert(valid.worktree_clean      === true,                                           '[N-07] valid: worktree_clean=true');
assert(valid.local_tag_exists    === false,                                          '[N-08] valid: local_tag=false');
assert(valid.remote_tag_exists   === false,                                          '[N-09] valid: remote_tag=false');
assert(valid.local_interactive_session === true,                                     '[N-10] valid: interactive=true');
assert(valid.ci_environment      === false,                                          '[N-11] valid: ci=false');
assert(valid.dry_run             === true,                                           '[N-12] valid: dry_run=true');

// ─── Suite O: Invariants ──────────────────────────────────────────
console.log('\n[Suite O] Invariants');
assert(valid.real_tag_execution_allowed    === false, '[O-01] exec_allowed=false');
assert(valid.explicit_real_command_required === true, '[O-02] explicit_required=true');
assert(valid.ci_blocked                    === true,  '[O-03] ci_blocked=true');
assert(valid.tag_created                   === false, '[O-04] tag_created=false');
assert(valid.git_push_performed            === false, '[O-05] push=false');
assert(valid.deploy_performed              === false, '[O-06] deploy=false');
assert(valid.stable_promoted               === false, '[O-07] stable=false');
assert(valid.release_performed             === false, '[O-08] release=false');
assert(fix.real_tag_execution_allowed      === false, '[O-09] fixture: exec_allowed=false');
assert(fix.ci_blocked                      === true,  '[O-10] fixture: ci_blocked=true');

// ─── Suite P: Validate ────────────────────────────────────────────
console.log('\n[Suite P] Validate');
assert(validateRealTagManualSafetyLock(null).valid === false,                        '[P-01] null → invalid');
assert(validateRealTagManualSafetyLock({ ...valid, safety_lock_status: 'BAD' }).valid === false, '[P-02] unknown status');
assert(validateRealTagManualSafetyLock({ ...valid, real_tag_execution_allowed: true }).valid === false, '[P-03] exec=true → invalid');
assert(validateRealTagManualSafetyLock({ ...valid, tag_created: true }).valid === false, '[P-04] tag=true → invalid');
assert(validateRealTagManualSafetyLock({ ...valid, ci_blocked: false }).valid === false, '[P-05] ci_blocked=false → invalid');
assert(validateRealTagManualSafetyLock(valid).valid === true,                        '[P-06] valid → valid');

// ─── Suite Q: Render ──────────────────────────────────────────────
console.log('\n[Suite Q] Render');
const rendered = renderRealTagManualSafetyLock(fix);
assert(typeof rendered === 'string',                                                 '[Q-01] returns string');
assert(rendered.includes('MANUAL_SAFETY_LOCK_READY_REVIEW'),                        '[Q-02] status in output');
assert(rendered.includes('real_tag_execution_allowed      : false'),                '[Q-03] exec=false');
assert(rendered.includes('ci_blocked                      : true'),                 '[Q-04] ci_blocked=true');
assert(rendered.includes('tag_created                     : false'),                '[Q-05] tag=false');
assert(rendered.includes('explicit_real_command_required  : true'),                 '[Q-06] explicit=true');
assert(renderRealTagManualSafetyLock(null) === 'real_tag_manual_safety_lock: null', '[Q-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-safety-lock: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
