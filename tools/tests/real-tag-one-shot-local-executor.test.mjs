#!/usr/bin/env node
/**
 * Real Tag One-Shot Local Executor — Unit Tests V86.1
 */

import {
  LOCAL_EXECUTOR_STATUSES,
  LOCAL_EXECUTOR_DRY_RUN_STEPS,
  runRealTagOneShotLocalExecutor,
  validateLocalExecutorResult,
  renderLocalExecutorSummary,
} from '../real-tag-one-shot-local-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS   = '2026-05-18T22:30:00.000Z';
const TAG  = 'v1.0.0-test';
const HEAD = 'abc1234def567890abc123';

const CTRL_DRY = {
  controller_status:          'REAL_TAG_EXEC_CTRL_READY_DRY_RUN',
  execution_controller_ready: true,
};
const CTRL_REAL = {
  controller_status:          'REAL_TAG_EXEC_CTRL_READY_FOR_LOCAL_REAL_EXECUTION',
  execution_controller_ready: true,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(LOCAL_EXECUTOR_STATUSES),                                        '[A-01] statuses array');
assert(LOCAL_EXECUTOR_STATUSES.length === 6,                                          '[A-02] 6 statuses');
assert(LOCAL_EXECUTOR_STATUSES.includes('LOCAL_EXEC_BLOCKED_CONTROLLER'),             '[A-03] BLOCKED_CONTROLLER');
assert(LOCAL_EXECUTOR_STATUSES.includes('LOCAL_EXEC_BLOCKED_NOT_AUTHORIZED'),         '[A-04] BLOCKED_NOT_AUTHORIZED');
assert(LOCAL_EXECUTOR_STATUSES.includes('LOCAL_EXEC_BLOCKED_CI'),                     '[A-05] BLOCKED_CI');
assert(LOCAL_EXECUTOR_STATUSES.includes('LOCAL_EXEC_BLOCKED_ADAPTER'),                '[A-06] BLOCKED_ADAPTER');
assert(LOCAL_EXECUTOR_STATUSES.includes('LOCAL_EXEC_DRY_RUN_COMPLETE'),               '[A-07] DRY_RUN_COMPLETE');
assert(LOCAL_EXECUTOR_STATUSES.includes('LOCAL_EXEC_REAL_TAG_EXECUTED'),              '[A-08] REAL_TAG_EXECUTED');
assert(Array.isArray(LOCAL_EXECUTOR_DRY_RUN_STEPS),                                   '[A-09] dry_run_steps array');
assert(LOCAL_EXECUTOR_DRY_RUN_STEPS.length === 6,                                     '[A-10] 6 dry run steps');

// ─── Suite B: Fixture mode — DRY_RUN ──────────────────────────────
console.log('\n[Suite B] Fixture mode — DRY_RUN');
const fix = runRealTagOneShotLocalExecutor({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.executor_status    === 'LOCAL_EXEC_DRY_RUN_COMPLETE',                      '[B-02] DRY_RUN_COMPLETE');
assert(fix.executor_ready     === true,                                                '[B-03] ready=true');
assert(fix.dry_run            === true,                                                '[B-04] dry_run=true');
assert(fix.execute_real_tag   === false,                                               '[B-05] execute_real_tag=false');
assert(Array.isArray(fix.simulated_steps),                                             '[B-06] simulated_steps array');
assert(fix.simulated_steps.length === 6,                                               '[B-07] 6 steps');
assert(fix.blocking_reason    === null,                                                '[B-08] blocking=null');
assert(fix.created_at         === TS,                                                  '[B-09] created_at=TS');
assert(typeof fix.executor_id === 'string' && fix.executor_id.length === 24,         '[B-10] id 24 chars');
assert(fix.schema_version     === 'v86.1',                                            '[B-11] schema=v86.1');

// ─── Suite C: Fixture mode — REAL_TAG_EXECUTED ────────────────────
console.log('\n[Suite C] Fixture mode — REAL_TAG_EXECUTED');
const fixReal = runRealTagOneShotLocalExecutor({
  fixture_mode: true, execute_real_tag: true, dry_run: false,
  target_tag: TAG, git_head: HEAD, _mock_timestamp: TS,
});
assert(fixReal.executor_status    === 'LOCAL_EXEC_REAL_TAG_EXECUTED',                 '[C-01] REAL_TAG_EXECUTED');
assert(fixReal.executor_ready     === true,                                            '[C-02] ready=true');
assert(fixReal.dry_run            === false,                                           '[C-03] dry_run=false');
assert(fixReal.execute_real_tag   === true,                                            '[C-04] execute_real_tag=true');
assert(fixReal.tag_created        === true,                                            '[C-05] tag_created=true (fixture executed)');
assert(fixReal.git_push_performed === true,                                            '[C-06] push=true (fixture executed)');
assert(fixReal.deploy_performed   === false,                                           '[C-07] deploy=false');
assert(fixReal.stable_promoted    === false,                                           '[C-08] stable=false');
assert(fixReal.release_performed  === false,                                           '[C-09] release=false');
assert(fixReal.target_tag         === TAG,                                             '[C-10] target_tag');

// ─── Suite D: Block scenarios ──────────────────────────────────────
console.log('\n[Suite D] Block scenarios');
const b_ctrl = runRealTagOneShotLocalExecutor({
  execution_controller_ready: false, controller_status: 'BLOCKED', _mock_timestamp: TS,
});
assert(b_ctrl.executor_status === 'LOCAL_EXEC_BLOCKED_CONTROLLER',                    '[D-01] BLOCKED_CONTROLLER');
assert(b_ctrl.tag_created     === false,                                               '[D-02] tag_created=false');

const b_noauth = runRealTagOneShotLocalExecutor({
  ...CTRL_DRY, execute_real_tag: true, dry_run: false, _mock_timestamp: TS,
});
assert(b_noauth.executor_status === 'LOCAL_EXEC_BLOCKED_NOT_AUTHORIZED',              '[D-03] BLOCKED_NOT_AUTHORIZED');

const b_ci = runRealTagOneShotLocalExecutor({
  ...CTRL_DRY, ci: true, _mock_timestamp: TS,
});
assert(b_ci.executor_status === 'LOCAL_EXEC_BLOCKED_CI',                              '[D-04] BLOCKED_CI');

const b_adapter = runRealTagOneShotLocalExecutor({
  ...CTRL_REAL, execute_real_tag: true, dry_run: false,
  target_tag: TAG, git_head: HEAD, _mock_timestamp: TS,
});
assert(b_adapter.executor_status === 'LOCAL_EXEC_BLOCKED_ADAPTER',                   '[D-05] BLOCKED_ADAPTER (no spawn_adapter)');

// ─── Suite E: Non-fixture dry run ─────────────────────────────────
console.log('\n[Suite E] Non-fixture dry run');
const e_dry = runRealTagOneShotLocalExecutor({
  ...CTRL_DRY, execute_real_tag: false, dry_run: true,
  target_tag: TAG, git_head: HEAD, _mock_timestamp: TS,
});
assert(e_dry.executor_status   === 'LOCAL_EXEC_DRY_RUN_COMPLETE',                     '[E-01] DRY_RUN_COMPLETE');
assert(e_dry.executor_ready    === true,                                               '[E-02] ready=true');
assert(Array.isArray(e_dry.simulated_steps),                                           '[E-03] simulated_steps');
assert(e_dry.simulated_steps.some(s => s.includes(TAG)),                               '[E-04] steps contain tag');
assert(e_dry.tag_created       === false,                                              '[E-05] tag_created=false');

// ─── Suite F: Injectable spawn_adapter (mock) ─────────────────────
console.log('\n[Suite F] Injectable spawn_adapter');
const mock_calls = [];
const mock_adapter = (cmd, args) => {
  mock_calls.push({ cmd, args });
  return { status: 0, stdout: '', stderr: '' };
};
const f_real = runRealTagOneShotLocalExecutor({
  ...CTRL_REAL, execute_real_tag: true, dry_run: false,
  target_tag: TAG, git_head: HEAD, spawn_adapter: mock_adapter, _mock_timestamp: TS,
});
assert(f_real.executor_status   === 'LOCAL_EXEC_REAL_TAG_EXECUTED',                   '[F-01] REAL_TAG_EXECUTED with adapter');
assert(f_real.tag_created       === true,                                              '[F-02] tag_created=true');
assert(f_real.git_push_performed=== true,                                              '[F-03] push=true');
assert(f_real.deploy_performed  === false,                                             '[F-04] deploy=false');
assert(f_real.stable_promoted   === false,                                             '[F-05] stable=false');
assert(f_real.release_performed === false,                                             '[F-06] release=false');
assert(mock_calls.length        === 2,                                                 '[F-07] 2 adapter calls');
assert(mock_calls[0].cmd        === 'git',                                             '[F-08] first call is git');
assert(mock_calls[0].args[0]    === 'tag',                                             '[F-09] first call is tag');
assert(mock_calls[1].args[0]    === 'push',                                            '[F-10] second call is push');

// ─── Suite G: Adapter failure ─────────────────────────────────────
console.log('\n[Suite G] Adapter failure');
const fail_adapter = () => { throw new Error('git not found'); };
const g_fail = runRealTagOneShotLocalExecutor({
  ...CTRL_REAL, execute_real_tag: true, dry_run: false,
  target_tag: TAG, git_head: HEAD, spawn_adapter: fail_adapter, _mock_timestamp: TS,
});
assert(g_fail.executor_status === 'LOCAL_EXEC_BLOCKED_ADAPTER',                       '[G-01] BLOCKED_ADAPTER on throw');
assert(g_fail.tag_created     === false,                                               '[G-02] tag_created=false on failure');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.tag_created                  === false, '[H-01] fixture dry_run: tag_created=false');
assert(fix.git_push_performed           === false, '[H-02] fixture dry_run: push=false');
assert(fix.deploy_performed             === false, '[H-03] deploy=false always');
assert(fix.stable_promoted              === false, '[H-04] stable=false always');
assert(fix.release_performed            === false, '[H-05] release=false always');
assert(fix.real_execution_not_performed === true,  '[H-06] not_performed=true (dry_run)');
assert(b_ctrl.tag_created               === false, '[H-07] blocked: tag_created=false');

// ─── Suite I: validateLocalExecutorResult ────────────────────────
console.log('\n[Suite I] Validate');
const v_ok = validateLocalExecutorResult(fix);
assert(v_ok.valid === true,                                                            '[I-01] valid dry_run');
const v_ok2 = validateLocalExecutorResult(fixReal);
assert(v_ok2.valid === true,                                                           '[I-02] valid real executed');
const v_null = validateLocalExecutorResult(null);
assert(v_null.valid === false,                                                         '[I-03] null invalid');
const v_bad = validateLocalExecutorResult({ executor_status: 'UNKNOWN', deploy_performed: true });
assert(v_bad.errors.includes('deploy_performed_must_be_false'),                       '[I-04] deploy=true → error');

// ─── Suite J: Deterministic ID ────────────────────────────────────
console.log('\n[Suite J] Deterministic ID');
const j1 = runRealTagOneShotLocalExecutor({ fixture_mode: true, _mock_timestamp: TS });
const j2 = runRealTagOneShotLocalExecutor({ fixture_mode: true, _mock_timestamp: TS });
assert(j1.executor_id === j2.executor_id,                                              '[J-01] deterministic id');

// ─── Suite K: Render ──────────────────────────────────────────────
console.log('\n[Suite K] Render');
const rendered = renderLocalExecutorSummary(fix);
assert(typeof rendered === 'string',                                                   '[K-01] returns string');
assert(rendered.includes('LOCAL_EXEC_DRY_RUN_COMPLETE'),                              '[K-02] status in output');
assert(rendered.includes('tag_created                   : false'),                     '[K-03] tag=false');
assert(rendered.includes('deploy_performed              : false'),                     '[K-04] deploy=false');
assert(rendered.includes('real_execution_not_performed  : true'),                      '[K-05] not_performed=true');
assert(renderLocalExecutorSummary(null) === 'real_tag_one_shot_local_executor: null', '[K-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-local-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
