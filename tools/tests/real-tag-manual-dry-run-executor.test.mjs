#!/usr/bin/env node
/**
 * Real Tag Manual Dry Run Executor — Unit Tests V83.0
 */

import {
  runRealTagManualDryRunExecutor,
  validateRealTagManualDryRunResult,
  renderRealTagManualDryRunSummary,
  MANUAL_DRY_RUN_STATUSES,
} from '../real-tag-manual-dry-run-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T19:00:00.000Z';

const READY_LOCK = {
  safety_lock_ready: true,
  target_tag: 'v3.0.0',
  target_git_head: 'cafebabe1234567890123456789012345678beef',
  worktree_clean: true,
  local_tag_exists: false,
  remote_tag_exists: false,
};
const READY_COMMANDS = {
  command_preview_ready: true,
  target_tag: 'v3.0.0',
  target_git_head: 'cafebabe1234567890123456789012345678beef',
  tag_command: 'git tag -a v3.0.0 cafebabe1234... -m "Vision Core v3.0.0 PASS GOLD verified"',
  push_command: 'git push origin refs/tags/v3.0.0',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_DRY_RUN_STATUSES),                                      '[A-01] statuses array');
assert(MANUAL_DRY_RUN_STATUSES.length === 5,                                         '[A-02] 5 statuses');
assert(MANUAL_DRY_RUN_STATUSES.includes('MANUAL_DRY_RUN_BLOCKED_LOCK'),             '[A-03] BLOCKED_LOCK');
assert(MANUAL_DRY_RUN_STATUSES.includes('MANUAL_DRY_RUN_BLOCKED_COMMANDS'),         '[A-04] BLOCKED_COMMANDS');
assert(MANUAL_DRY_RUN_STATUSES.includes('MANUAL_DRY_RUN_BLOCKED_NOT_DRY_RUN'),      '[A-05] BLOCKED_NOT_DRY_RUN');
assert(MANUAL_DRY_RUN_STATUSES.includes('MANUAL_DRY_RUN_BLOCKED_EXECUTE_NOW'),      '[A-06] BLOCKED_EXECUTE_NOW');
assert(MANUAL_DRY_RUN_STATUSES.includes('MANUAL_DRY_RUN_READY'),                    '[A-07] READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = runRealTagManualDryRunExecutor({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.schema_version   === 'v83.0',                                             '[B-02] schema=v83.0');
assert(fix.dry_run_status   === 'MANUAL_DRY_RUN_READY',                             '[B-03] READY');
assert(fix.dry_run_ready    === true,                                                '[B-04] ready=true');
assert(typeof fix.executor_id === 'string' && fix.executor_id.length === 24,        '[B-05] id 24 chars');
assert(fix.blocking_reason  === null,                                                '[B-06] blocking=null');
assert(fix.dry_run          === true,                                                '[B-07] dry_run=true');
assert(fix.execute_now      === false,                                               '[B-08] execute_now=false');
assert(fix.tag_created      === false,                                               '[B-09] tag_created=false');
assert(fix.git_push_performed === false,                                             '[B-10] push=false');
assert(Array.isArray(fix.simulated_steps) && fix.simulated_steps.length > 0,        '[B-11] simulated_steps array');
assert(fix.created_at       === TS,                                                  '[B-12] created_at=TS');

// ─── Suite C: Blocked Lock ────────────────────────────────────────
console.log('\n[Suite C] Blocked Lock');
const blockedC1 = runRealTagManualDryRunExecutor({ _mock_timestamp: TS });
assert(blockedC1.dry_run_status === 'MANUAL_DRY_RUN_BLOCKED_LOCK',                  '[C-01] null lock blocked');
assert(blockedC1.dry_run_ready  === false,                                           '[C-02] not ready');
assert(blockedC1.blocking_reason === 'safety_lock_not_ready',                        '[C-03] reason');

const blockedC2 = runRealTagManualDryRunExecutor({
  safety_lock: { safety_lock_ready: false }, _mock_timestamp: TS,
});
assert(blockedC2.dry_run_status === 'MANUAL_DRY_RUN_BLOCKED_LOCK',                  '[C-04] false lock blocked');

// ─── Suite D: Blocked Commands ────────────────────────────────────
console.log('\n[Suite D] Blocked Commands');
const blockedD = runRealTagManualDryRunExecutor({
  safety_lock: READY_LOCK, _mock_timestamp: TS,
});
assert(blockedD.dry_run_status === 'MANUAL_DRY_RUN_BLOCKED_COMMANDS',               '[D-01] no commands blocked');
assert(blockedD.blocking_reason === 'command_builder_not_ready',                     '[D-02] reason');

// ─── Suite E: Blocked Not Dry Run ────────────────────────────────
console.log('\n[Suite E] Blocked Not Dry Run');
const blockedE = runRealTagManualDryRunExecutor({
  safety_lock: READY_LOCK, command_builder: READY_COMMANDS,
  dry_run: false, _mock_timestamp: TS,
});
assert(blockedE.dry_run_status === 'MANUAL_DRY_RUN_BLOCKED_NOT_DRY_RUN',           '[E-01] false dry_run blocked');
assert(blockedE.blocking_reason === 'dry_run_must_be_true',                          '[E-02] reason');

const blockedENull = runRealTagManualDryRunExecutor({
  safety_lock: READY_LOCK, command_builder: READY_COMMANDS, _mock_timestamp: TS,
});
assert(blockedENull.dry_run_status === 'MANUAL_DRY_RUN_BLOCKED_NOT_DRY_RUN',       '[E-03] null dry_run blocked');

// ─── Suite F: Blocked Execute Now ────────────────────────────────
console.log('\n[Suite F] Blocked Execute Now');
const blockedF = runRealTagManualDryRunExecutor({
  safety_lock: READY_LOCK, command_builder: READY_COMMANDS,
  dry_run: true, execute_now: true, _mock_timestamp: TS,
});
assert(blockedF.dry_run_status === 'MANUAL_DRY_RUN_BLOCKED_EXECUTE_NOW',           '[F-01] execute_now=true blocked');
assert(blockedF.blocking_reason === 'execute_now_must_be_false',                    '[F-02] reason');

// ─── Suite G: Valid ───────────────────────────────────────────────
console.log('\n[Suite G] Valid');
const valid = runRealTagManualDryRunExecutor({
  safety_lock: READY_LOCK,
  command_builder: READY_COMMANDS,
  dry_run: true,
  execute_now: false,
  requested_by: 'release-manager',
  _mock_timestamp: TS,
});
assert(valid.dry_run_status     === 'MANUAL_DRY_RUN_READY',                         '[G-01] status READY');
assert(valid.dry_run_ready      === true,                                            '[G-02] ready=true');
assert(valid.blocking_reason    === null,                                            '[G-03] blocking=null');
assert(valid.target_tag         === READY_COMMANDS.target_tag,                      '[G-04] target_tag');
assert(valid.target_git_head    === READY_COMMANDS.target_git_head,                 '[G-05] git_head');
assert(Array.isArray(valid.simulated_steps) && valid.simulated_steps.length >= 6,   '[G-06] simulated_steps');
assert(valid.simulated_steps.some(s => s.includes('SIM:')),                         '[G-07] SIM steps present');
assert(valid.simulated_steps.some(s => s.includes('RESULT:')),                      '[G-08] RESULT step present');
assert(valid.requested_by       === 'release-manager',                              '[G-09] requested_by');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(valid.dry_run          === true,  '[H-01] dry_run=true');
assert(valid.execute_now      === false, '[H-02] execute_now=false');
assert(valid.tag_created      === false, '[H-03] tag_created=false');
assert(valid.git_push_performed === false, '[H-04] push=false');
assert(valid.deploy_performed   === false, '[H-05] deploy=false');
assert(valid.stable_promoted    === false, '[H-06] stable=false');
assert(valid.release_performed  === false, '[H-07] release=false');
assert(fix.dry_run            === true,  '[H-08] fixture: dry_run=true');
assert(fix.execute_now        === false, '[H-09] fixture: execute_now=false');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
assert(validateRealTagManualDryRunResult(null).valid === false,                      '[I-01] null → invalid');
assert(validateRealTagManualDryRunResult({ ...valid, dry_run_status: 'BAD' }).valid === false, '[I-02] unknown status');
assert(validateRealTagManualDryRunResult({ ...valid, dry_run: false }).valid === false, '[I-03] dry_run=false → invalid');
assert(validateRealTagManualDryRunResult({ ...valid, execute_now: true }).valid === false, '[I-04] execute_now=true → invalid');
assert(validateRealTagManualDryRunResult({ ...valid, tag_created: true }).valid === false, '[I-05] tag=true → invalid');
assert(validateRealTagManualDryRunResult({ ...valid, git_push_performed: true }).valid === false, '[I-06] push=true → invalid');
assert(validateRealTagManualDryRunResult(valid).valid === true,                      '[I-07] valid → valid');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderRealTagManualDryRunSummary(fix);
assert(typeof rendered === 'string',                                                 '[J-01] returns string');
assert(rendered.includes('MANUAL_DRY_RUN_READY'),                                   '[J-02] status in output');
assert(rendered.includes('dry_run                   : true'),                       '[J-03] dry_run=true');
assert(rendered.includes('execute_now               : false'),                      '[J-04] execute_now=false');
assert(rendered.includes('tag_created               : false'),                      '[J-05] tag=false');
assert(rendered.includes('git_push_performed        : false'),                      '[J-06] push=false');
assert(rendered.includes('simulated_steps:'),                                        '[J-07] steps section');
assert(renderRealTagManualDryRunSummary(null) === 'real_tag_manual_dry_run_executor: null', '[J-08] null → string');

// ─── Suite K: Deterministic ID ────────────────────────────────────
console.log('\n[Suite K] Deterministic ID');
const d1 = runRealTagManualDryRunExecutor({ fixture_mode: true, _mock_timestamp: TS });
const d2 = runRealTagManualDryRunExecutor({ fixture_mode: true, _mock_timestamp: TS });
assert(d1.executor_id === d2.executor_id,                                            '[K-01] deterministic id');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-dry-run-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
