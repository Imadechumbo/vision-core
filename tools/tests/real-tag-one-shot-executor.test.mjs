#!/usr/bin/env node
/**
 * Real Tag One-Shot Executor — Unit Tests V78.0
 */

import {
  runRealTagOneShotExecutor,
  validateRealTagOneShotExecutorResult,
  renderRealTagOneShotExecutorSummary,
  TAG_EXECUTOR_STATUSES,
} from '../real-tag-one-shot-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T12:00:00.000Z';

const GOOD_CONTRACT = {
  one_shot_contract_status: 'TAG_ONE_SHOT_CONTRACT_READY_REVIEW',
  one_shot_contract_id:     'contract-test-id',
  target_tag:               'v1.2.3',
  git_head:                 'abc1234def5678901234567890123456789012ab',
  evidence_receipt_id:      'receipt-test-id',
};

const GOOD_SAFETY = {
  tag_safety_ready:   true,
  tag_safety_status:  'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',
};

const GOOD_ANCHOR = {
  anchor_ready:        true,
  rollback_anchor_id:  'anchor-test-id-abcdef123456789012345678',
};

const GOOD_PARAMS = {
  one_shot_contract:  GOOD_CONTRACT,
  safety_result:      GOOD_SAFETY,
  rollback_anchor:    GOOD_ANCHOR,
  dry_run:            true,
  real_execute:       false,
  _mock_timestamp:    TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_EXECUTOR_STATUSES),                                           '[A-01] statuses array');
assert(TAG_EXECUTOR_STATUSES.length === 6,                                             '[A-02] 6 statuses');
assert(TAG_EXECUTOR_STATUSES.includes('TAG_EXECUTOR_BLOCKED_CONTRACT'),                '[A-03] BLOCKED_CONTRACT');
assert(TAG_EXECUTOR_STATUSES.includes('TAG_EXECUTOR_BLOCKED_SAFETY'),                  '[A-04] BLOCKED_SAFETY');
assert(TAG_EXECUTOR_STATUSES.includes('TAG_EXECUTOR_BLOCKED_ROLLBACK'),                '[A-05] BLOCKED_ROLLBACK');
assert(TAG_EXECUTOR_STATUSES.includes('TAG_EXECUTOR_BLOCKED_NOT_DRY_RUN'),             '[A-06] BLOCKED_NOT_DRY_RUN');
assert(TAG_EXECUTOR_STATUSES.includes('TAG_EXECUTOR_BLOCKED_REAL_EXECUTE'),            '[A-07] BLOCKED_REAL_EXECUTE');
assert(TAG_EXECUTOR_STATUSES.includes('TAG_EXECUTOR_DRY_RUN_READY'),                   '[A-08] DRY_RUN_READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runRealTagOneShotExecutor({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.executor_status     === 'TAG_EXECUTOR_DRY_RUN_READY',                      '[B-02] status=DRY_RUN_READY');
assert(fix.dry_run_ready       === true,                                               '[B-03] ready=true');
assert(fix.schema_version      === 'v78.0',                                            '[B-04] schema=v78.0');
assert(typeof fix.executor_id === 'string' && fix.executor_id.length === 24,          '[B-05] id 24 chars');
assert(typeof fix.simulated_tag_command === 'string' && fix.simulated_tag_command.length > 0, '[B-06] tag cmd present');
assert(typeof fix.simulated_push_command === 'string',                                '[B-07] push cmd present');
assert(typeof fix.tag_receipt_preview_id === 'string',                                '[B-08] receipt preview');
assert(fix.created_at          === TS,                                                 '[B-09] created_at=TS');
assert(fix.blocking_reason     === null,                                               '[B-10] blocking=null');

// ─── Suite C: Not dry run ─────────────────────────────────────────
console.log('\n[Suite C] Not dry run');
const notDry = runRealTagOneShotExecutor({ ...GOOD_PARAMS, dry_run: false });
assert(notDry.executor_status === 'TAG_EXECUTOR_BLOCKED_NOT_DRY_RUN',                 '[C-01] BLOCKED_NOT_DRY_RUN');
assert(notDry.dry_run_ready   === false,                                               '[C-02] ready=false');

// ─── Suite D: Real execute blocked ────────────────────────────────
console.log('\n[Suite D] Real execute blocked');
const realExec = runRealTagOneShotExecutor({ ...GOOD_PARAMS, real_execute: true });
assert(realExec.executor_status === 'TAG_EXECUTOR_BLOCKED_REAL_EXECUTE',               '[D-01] BLOCKED_REAL_EXECUTE');

// ─── Suite E: Missing contract ────────────────────────────────────
console.log('\n[Suite E] Missing contract');
const noContract = runRealTagOneShotExecutor({ ...GOOD_PARAMS, one_shot_contract: null });
assert(noContract.executor_status === 'TAG_EXECUTOR_BLOCKED_CONTRACT',                '[E-01] BLOCKED_CONTRACT null');

const badContract = runRealTagOneShotExecutor({ ...GOOD_PARAMS, one_shot_contract: { one_shot_contract_status: 'BLOCKED' } });
assert(badContract.executor_status === 'TAG_EXECUTOR_BLOCKED_CONTRACT',               '[E-02] BLOCKED_CONTRACT bad');

// ─── Suite F: Missing safety ──────────────────────────────────────
console.log('\n[Suite F] Missing safety');
const noSafety = runRealTagOneShotExecutor({ ...GOOD_PARAMS, safety_result: null });
assert(noSafety.executor_status === 'TAG_EXECUTOR_BLOCKED_SAFETY',                    '[F-01] BLOCKED_SAFETY null');

const badSafety = runRealTagOneShotExecutor({ ...GOOD_PARAMS, safety_result: { tag_safety_ready: false } });
assert(badSafety.executor_status === 'TAG_EXECUTOR_BLOCKED_SAFETY',                   '[F-02] BLOCKED_SAFETY false');

// ─── Suite G: Missing rollback ────────────────────────────────────
console.log('\n[Suite G] Missing rollback');
const noAnchor = runRealTagOneShotExecutor({ ...GOOD_PARAMS, rollback_anchor: null });
assert(noAnchor.executor_status === 'TAG_EXECUTOR_BLOCKED_ROLLBACK',                  '[G-01] BLOCKED_ROLLBACK null');

const badAnchor = runRealTagOneShotExecutor({ ...GOOD_PARAMS, rollback_anchor: { anchor_ready: false } });
assert(badAnchor.executor_status === 'TAG_EXECUTOR_BLOCKED_ROLLBACK',                 '[G-02] BLOCKED_ROLLBACK false');

// ─── Suite H: Full dry-run ready ──────────────────────────────────
console.log('\n[Suite H] Full dry-run ready');
const ready = runRealTagOneShotExecutor(GOOD_PARAMS);
assert(ready.dry_run_ready          === true,                                          '[H-01] ready=true');
assert(ready.executor_status        === 'TAG_EXECUTOR_DRY_RUN_READY',                 '[H-02] DRY_RUN_READY');
assert(ready.simulated_tag_command.includes('v1.2.3'),                                '[H-03] tag in cmd');
assert(ready.simulated_tag_command.includes('DRY RUN'),                               '[H-04] DRY RUN label');
assert(ready.simulated_push_command.includes('v1.2.3'),                               '[H-05] tag in push cmd');
assert(ready.simulated_push_command.includes('DRY RUN'),                              '[H-06] DRY RUN in push');
assert(ready.rollback_anchor_id === GOOD_ANCHOR.rollback_anchor_id,                   '[H-07] anchor id preserved');
assert(typeof ready.tag_receipt_preview_id === 'string',                              '[H-08] receipt preview');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
assert(fix.real_execute        === false, '[I-01] fix: real_execute=false');
assert(fix.tag_created         === false, '[I-02] fix: tag_created=false');
assert(fix.git_push_performed  === false, '[I-03] fix: push=false');
assert(fix.deploy_performed    === false, '[I-04] fix: deploy=false');
assert(fix.stable_promoted     === false, '[I-05] fix: stable=false');
assert(fix.release_performed   === false, '[I-06] fix: release=false');

assert(ready.tag_created       === false, '[I-07] ready: tag_created=false');
assert(ready.git_push_performed=== false, '[I-08] ready: push=false');
assert(ready.real_execute      === false, '[I-09] ready: real_execute=false');

assert(notDry.tag_created      === false, '[I-10] blocked: tag_created=false');
assert(realExec.tag_created    === false, '[I-11] blocked real_exec: tag=false');

// ─── Suite J: Validate ───────────────────────────────────────────
console.log('\n[Suite J] Validate');
assert(validateRealTagOneShotExecutorResult(fix).valid === true,                      '[J-01] valid=true');
assert(validateRealTagOneShotExecutorResult(null).valid === false,                    '[J-02] null invalid');
assert(validateRealTagOneShotExecutorResult({ executor_status: 'BAD', tag_created: false, git_push_performed: false, real_execute: false }).valid === false, '[J-03] bad status');

// ─── Suite K: Render ─────────────────────────────────────────────
console.log('\n[Suite K] Render');
const rendered = renderRealTagOneShotExecutorSummary(fix);
assert(typeof rendered === 'string',                                                   '[K-01] returns string');
assert(rendered.includes('TAG_EXECUTOR_DRY_RUN_READY'),                               '[K-02] status in output');
assert(rendered.includes('real_execute                : false'),                      '[K-03] real_execute=false');
assert(rendered.includes('tag_created                 : false'),                      '[K-04] tag=false');
assert(rendered.includes('git_push_performed          : false'),                      '[K-05] push=false');
assert(rendered.includes('simulated_tag_command'),                                    '[K-06] tag cmd in output');
assert(renderRealTagOneShotExecutorSummary(null) === 'real_tag_one_shot_executor: null', '[K-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
