#!/usr/bin/env node
/**
 * Real Tag One-Shot Safety Validator — Unit Tests V77.0
 */

import {
  validateRealTagOneShotSafety,
  classifyRealTagOneShotSafety,
  renderRealTagOneShotSafetyValidator,
  TAG_SAFETY_STATUSES,
  TAG_SAFETY_BLOCKED_ACTIONS,
  TAG_SAFETY_SAFE_NEXT_ACTIONS,
} from '../real-tag-one-shot-safety-validator.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T10:00:00.000Z';

const GOOD_CONTRACT = {
  one_shot_contract_status: 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',
  one_shot_contract_id:     'contract-test-id',
  target_tag:               'v1.2.3',
  git_head:                 'abc1234def5678901234567890123456789012ab',
  evidence_receipt_id:      'receipt-test-id',
};

const GOOD_BINDING = {
  binding_status: 'TAG_CONFIRMATION_READY_REVIEW',
  binding_id:     'binding-test-id',
};

const GOOD_BASELINE = {
  real_manual_exec_baseline_status: 'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY',
};

const GOOD_PARAMS = {
  one_shot_contract:              GOOD_CONTRACT,
  human_confirmation_binding:     GOOD_BINDING,
  real_manual_exec_baseline:      GOOD_BASELINE,
  current_git_head:               'abc1234def5678901234567890123456789012ab',
  working_tree_clean:             true,
  ci_status_green:                true,
  rollback_anchor_present:        true,
  dry_run_verified:               true,
  explicit_real_command_present:  false,
  _mock_timestamp:                TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_SAFETY_STATUSES),                                              '[A-01] statuses array');
assert(TAG_SAFETY_STATUSES.length === 10,                                               '[A-02] 10 statuses');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_CONTRACT'),                     '[A-03] BLOCKED_CONTRACT');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_CONFIRMATION'),                 '[A-04] BLOCKED_CONFIRMATION');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_BASELINE'),                     '[A-05] BLOCKED_BASELINE');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_GIT_HEAD'),                     '[A-06] BLOCKED_GIT_HEAD');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_WORKTREE'),                     '[A-07] BLOCKED_WORKTREE');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_CI'),                           '[A-08] BLOCKED_CI');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_ROLLBACK'),                     '[A-09] BLOCKED_ROLLBACK');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_BLOCKED_DRY_RUN'),                      '[A-10] BLOCKED_DRY_RUN');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_READY_REVIEW'),                         '[A-11] READY_REVIEW');
assert(TAG_SAFETY_STATUSES.includes('TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND'),       '[A-12] REQUIRES_EXPLICIT');
assert(Array.isArray(TAG_SAFETY_BLOCKED_ACTIONS) && TAG_SAFETY_BLOCKED_ACTIONS.length === 9, '[A-13] 9 blocked actions');
assert(Array.isArray(TAG_SAFETY_SAFE_NEXT_ACTIONS) && TAG_SAFETY_SAFE_NEXT_ACTIONS.length === 5, '[A-14] 5 safe actions');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = validateRealTagOneShotSafety({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                         '[B-01] returns object');
assert(fix.tag_safety_status    === 'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',        '[B-02] status=REQUIRES_EXPLICIT');
assert(fix.tag_safety_ready     === true,                                               '[B-03] ready=true');
assert(fix.schema_version       === 'v77.0',                                            '[B-04] schema=v77.0');
assert(typeof fix.validator_id === 'string' && fix.validator_id.length === 24,         '[B-05] id 24 chars');
assert(fix.created_at           === TS,                                                 '[B-06] created_at=TS');
assert(fix.blocking_reason      === null,                                               '[B-07] blocking=null');
assert(Array.isArray(fix.blocked_actions),                                              '[B-08] blocked_actions array');
assert(Array.isArray(fix.safe_next_actions),                                            '[B-09] safe_next_actions array');

// ─── Suite C: Blocked contract ─────────────────────────────────────
console.log('\n[Suite C] Blocked contract');
const noContract = validateRealTagOneShotSafety({ ...GOOD_PARAMS, one_shot_contract: null });
assert(noContract.tag_safety_status === 'TAG_SAFETY_BLOCKED_CONTRACT',                 '[C-01] BLOCKED_CONTRACT null');

const badContract = validateRealTagOneShotSafety({ ...GOOD_PARAMS, one_shot_contract: { one_shot_contract_status: 'BLOCKED' } });
assert(badContract.tag_safety_status === 'TAG_SAFETY_BLOCKED_CONTRACT',                '[C-02] BLOCKED_CONTRACT bad');

// ─── Suite D: Blocked confirmation ────────────────────────────────
console.log('\n[Suite D] Blocked confirmation');
const noBinding = validateRealTagOneShotSafety({ ...GOOD_PARAMS, human_confirmation_binding: null });
assert(noBinding.tag_safety_status === 'TAG_SAFETY_BLOCKED_CONFIRMATION',              '[D-01] BLOCKED_CONFIRMATION null');

const badBinding = validateRealTagOneShotSafety({ ...GOOD_PARAMS, human_confirmation_binding: { binding_status: 'BLOCKED' } });
assert(badBinding.tag_safety_status === 'TAG_SAFETY_BLOCKED_CONFIRMATION',             '[D-02] BLOCKED_CONFIRMATION bad');

// ─── Suite E: Blocked baseline ────────────────────────────────────
console.log('\n[Suite E] Blocked baseline');
const noBaseline = validateRealTagOneShotSafety({ ...GOOD_PARAMS, real_manual_exec_baseline: null });
assert(noBaseline.tag_safety_status === 'TAG_SAFETY_BLOCKED_BASELINE',                 '[E-01] BLOCKED_BASELINE null');

// ─── Suite F: Blocked git head ────────────────────────────────────
console.log('\n[Suite F] Blocked git head');
const badHead = validateRealTagOneShotSafety({ ...GOOD_PARAMS, current_git_head: 'wronghead' });
assert(badHead.tag_safety_status === 'TAG_SAFETY_BLOCKED_GIT_HEAD',                    '[F-01] BLOCKED_GIT_HEAD mismatch');

const noHead = validateRealTagOneShotSafety({ ...GOOD_PARAMS, current_git_head: null });
assert(noHead.tag_safety_status === 'TAG_SAFETY_BLOCKED_GIT_HEAD',                     '[F-02] BLOCKED_GIT_HEAD null');

// ─── Suite G: Blocked worktree ────────────────────────────────────
console.log('\n[Suite G] Blocked worktree');
const dirtyTree = validateRealTagOneShotSafety({ ...GOOD_PARAMS, working_tree_clean: false });
assert(dirtyTree.tag_safety_status === 'TAG_SAFETY_BLOCKED_WORKTREE',                  '[G-01] BLOCKED_WORKTREE false');

const nullTree = validateRealTagOneShotSafety({ ...GOOD_PARAMS, working_tree_clean: null });
assert(nullTree.tag_safety_status === 'TAG_SAFETY_BLOCKED_WORKTREE',                   '[G-02] BLOCKED_WORKTREE null');

// ─── Suite H: Blocked CI ──────────────────────────────────────────
console.log('\n[Suite H] Blocked CI');
const badCI = validateRealTagOneShotSafety({ ...GOOD_PARAMS, ci_status_green: false });
assert(badCI.tag_safety_status === 'TAG_SAFETY_BLOCKED_CI',                            '[H-01] BLOCKED_CI false');

const nullCI = validateRealTagOneShotSafety({ ...GOOD_PARAMS, ci_status_green: null });
assert(nullCI.tag_safety_status === 'TAG_SAFETY_BLOCKED_CI',                           '[H-02] BLOCKED_CI null');

// ─── Suite I: Blocked rollback ────────────────────────────────────
console.log('\n[Suite I] Blocked rollback');
const noRollback = validateRealTagOneShotSafety({ ...GOOD_PARAMS, rollback_anchor_present: false });
assert(noRollback.tag_safety_status === 'TAG_SAFETY_BLOCKED_ROLLBACK',                 '[I-01] BLOCKED_ROLLBACK false');

// ─── Suite J: Blocked dry run ─────────────────────────────────────
console.log('\n[Suite J] Blocked dry run');
const noDryRun = validateRealTagOneShotSafety({ ...GOOD_PARAMS, dry_run_verified: false });
assert(noDryRun.tag_safety_status === 'TAG_SAFETY_BLOCKED_DRY_RUN',                    '[J-01] BLOCKED_DRY_RUN false');

// ─── Suite K: Ready ───────────────────────────────────────────────
console.log('\n[Suite K] Ready');
const ready = validateRealTagOneShotSafety(GOOD_PARAMS);
assert(ready.tag_safety_ready   === true,                                               '[K-01] ready=true');
assert(ready.tag_safety_status  === 'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',        '[K-02] REQUIRES_EXPLICIT');
assert(ready.tag_execution_allowed === false,                                           '[K-03] tag_execution=false');
assert(ready.explicit_real_command_present === false,                                   '[K-04] explicit=false');

// ─── Suite L: Invariants ──────────────────────────────────────────
console.log('\n[Suite L] Invariants');
assert(fix.explicit_real_command_required === true,   '[L-01] explicit_required=true');
assert(fix.explicit_real_command_present  === false,  '[L-02] explicit_present=false');
assert(fix.tag_execution_allowed          === false,  '[L-03] tag_exec=false');
assert(fix.tag_created                    === false,  '[L-04] tag_created=false');
assert(fix.git_push_performed             === false,  '[L-05] push=false');
assert(fix.deploy_performed               === false,  '[L-06] deploy=false');
assert(fix.stable_promoted                === false,  '[L-07] stable=false');
assert(fix.release_performed              === false,  '[L-08] release=false');

assert(ready.tag_created       === false,             '[L-09] ready: tag_created=false');
assert(ready.git_push_performed=== false,             '[L-10] ready: push=false');

assert(noContract.tag_created          === false,     '[L-11] blocked: tag_created=false');
assert(noContract.tag_execution_allowed=== false,     '[L-12] blocked: tag_exec=false');

// ─── Suite M: Classify ───────────────────────────────────────────
console.log('\n[Suite M] Classify');
assert(classifyRealTagOneShotSafety(fix)        === 'ready_review',  '[M-01] ready → ready_review');
assert(classifyRealTagOneShotSafety(noContract) === 'blocked',       '[M-02] blocked → blocked');
assert(classifyRealTagOneShotSafety(null)       === 'unknown',       '[M-03] null → unknown');

// ─── Suite N: Render ─────────────────────────────────────────────
console.log('\n[Suite N] Render');
const rendered = renderRealTagOneShotSafetyValidator(fix);
assert(typeof rendered === 'string',                                                    '[N-01] returns string');
assert(rendered.includes('TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND'),                 '[N-02] status in output');
assert(rendered.includes('tag_execution_allowed           : false'),                   '[N-03] exec=false');
assert(rendered.includes('tag_created                     : false'),                   '[N-04] tag=false');
assert(rendered.includes('explicit_real_command_required  : true'),                    '[N-05] required=true');
assert(renderRealTagOneShotSafetyValidator(null) === 'real_tag_one_shot_safety_validator: null', '[N-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-safety-validator: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
