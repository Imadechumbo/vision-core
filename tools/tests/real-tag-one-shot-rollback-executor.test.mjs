#!/usr/bin/env node
/**
 * Real Tag One-Shot Rollback Executor — Unit Tests V87.1
 */

import {
  ROLLBACK_EXECUTOR_STATUSES,
  ROLLBACK_DRY_RUN_STEPS,
  runRealTagRollbackExecutor,
  validateRollbackExecutorResult,
  renderRollbackExecutorSummary,
} from '../real-tag-one-shot-rollback-executor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-18T23:30:00.000Z';
const TAG     = 'v1.0.0-test';
const ROLLBACK_ID = 'rbk-anchor-test-001';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(ROLLBACK_EXECUTOR_STATUSES),                                      '[A-01] statuses array');
assert(ROLLBACK_EXECUTOR_STATUSES.length === 7,                                        '[A-02] 7 statuses');
assert(ROLLBACK_EXECUTOR_STATUSES.includes('ROLLBACK_EXEC_BLOCKED_NOT_NEEDED'),        '[A-03] BLOCKED_NOT_NEEDED');
assert(ROLLBACK_EXECUTOR_STATUSES.includes('ROLLBACK_EXEC_BLOCKED_NO_FLAG'),           '[A-04] BLOCKED_NO_FLAG');
assert(ROLLBACK_EXECUTOR_STATUSES.includes('ROLLBACK_EXEC_BLOCKED_CI'),                '[A-05] BLOCKED_CI');
assert(ROLLBACK_EXECUTOR_STATUSES.includes('ROLLBACK_EXEC_BLOCKED_ADAPTER'),           '[A-06] BLOCKED_ADAPTER');
assert(ROLLBACK_EXECUTOR_STATUSES.includes('ROLLBACK_EXEC_SKIPPED_DRY_RUN'),           '[A-07] SKIPPED_DRY_RUN');
assert(ROLLBACK_EXECUTOR_STATUSES.includes('ROLLBACK_EXEC_SIMULATED'),                 '[A-08] SIMULATED');
assert(ROLLBACK_EXECUTOR_STATUSES.includes('ROLLBACK_EXEC_EXECUTED'),                  '[A-09] EXECUTED');
assert(Array.isArray(ROLLBACK_DRY_RUN_STEPS),                                          '[A-10] dry_run_steps array');
assert(ROLLBACK_DRY_RUN_STEPS.length === 5,                                            '[A-11] 5 steps');

// ─── Suite B: Fixture mode — SKIPPED_DRY_RUN ─────────────────────
console.log('\n[Suite B] Fixture mode — SKIPPED_DRY_RUN');
const fix = runRealTagRollbackExecutor({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                         '[B-01] returns object');
assert(fix.rollback_status   === 'ROLLBACK_EXEC_SKIPPED_DRY_RUN',                     '[B-02] SKIPPED_DRY_RUN');
assert(fix.rollback_ready    === true,                                                  '[B-03] ready=true');
assert(fix.rollback_executed === false,                                                 '[B-04] rollback_executed=false');
assert(fix.blocking_reason   === null,                                                  '[B-05] blocking=null');
assert(fix.created_at        === TS,                                                    '[B-06] created_at=TS');
assert(typeof fix.rollback_id === 'string' && fix.rollback_id.length === 24,          '[B-07] id 24 chars');
assert(fix.schema_version    === 'v87.1',                                              '[B-08] schema=v87.1');

// ─── Suite C: Fixture mode — SIMULATED ───────────────────────────
console.log('\n[Suite C] Fixture mode — SIMULATED');
const fixSim = runRealTagRollbackExecutor({
  fixture_mode: true, simulate_rollback: true, target_tag: TAG, _mock_timestamp: TS,
});
assert(fixSim.rollback_status   === 'ROLLBACK_EXEC_SIMULATED',                        '[C-01] SIMULATED');
assert(fixSim.rollback_ready    === true,                                               '[C-02] ready=true');
assert(fixSim.rollback_executed === false,                                              '[C-03] rollback_executed=false');
assert(Array.isArray(fixSim.simulated_steps),                                           '[C-04] simulated_steps array');
assert(fixSim.simulated_steps.length === 5,                                             '[C-05] 5 steps');

// ─── Suite D: Fixture mode — EXECUTED ─────────────────────────────
console.log('\n[Suite D] Fixture mode — EXECUTED');
const fixExec = runRealTagRollbackExecutor({
  fixture_mode: true, execute_rollback: true, dry_run: false,
  target_tag: TAG, _mock_timestamp: TS,
});
assert(fixExec.rollback_status   === 'ROLLBACK_EXEC_EXECUTED',                        '[D-01] EXECUTED');
assert(fixExec.rollback_ready    === true,                                              '[D-02] ready=true');
assert(fixExec.rollback_executed === true,                                              '[D-03] rollback_executed=true');
assert(fixExec.tag_created       === false,                                             '[D-04] tag_created=false');
assert(fixExec.git_push_performed=== false,                                             '[D-05] push=false');
assert(fixExec.deploy_performed  === false,                                             '[D-06] deploy=false');

// ─── Suite E: Block — tag not created ─────────────────────────────
console.log('\n[Suite E] Block scenarios');
const e_notagcreated = runRealTagRollbackExecutor({
  tag_created: false, _mock_timestamp: TS,
});
assert(e_notagcreated.rollback_status === 'ROLLBACK_EXEC_BLOCKED_NOT_NEEDED',          '[E-01] BLOCKED_NOT_NEEDED');

const e_ci = runRealTagRollbackExecutor({
  tag_created: true, execute_rollback: true, ci: true, _mock_timestamp: TS,
});
assert(e_ci.rollback_status === 'ROLLBACK_EXEC_BLOCKED_CI',                            '[E-02] BLOCKED_CI');

const e_adapter = runRealTagRollbackExecutor({
  tag_created: true, execute_rollback: true, ci: false, target_tag: TAG, _mock_timestamp: TS,
});
assert(e_adapter.rollback_status === 'ROLLBACK_EXEC_BLOCKED_ADAPTER',                  '[E-03] BLOCKED_ADAPTER');

// ─── Suite F: Non-fixture SKIPPED ─────────────────────────────────
console.log('\n[Suite F] Non-fixture SKIPPED');
const f_skip = runRealTagRollbackExecutor({
  tag_created: true, execute_rollback: false, _mock_timestamp: TS,
});
assert(f_skip.rollback_status   === 'ROLLBACK_EXEC_SKIPPED_DRY_RUN',                  '[F-01] SKIPPED_DRY_RUN non-fixture');
assert(f_skip.rollback_executed === false,                                              '[F-02] rollback_executed=false');

const f_sim = runRealTagRollbackExecutor({
  tag_created: true, execute_rollback: false, simulate_rollback: true,
  target_tag: TAG, _mock_timestamp: TS,
});
assert(f_sim.rollback_status   === 'ROLLBACK_EXEC_SIMULATED',                         '[F-03] SIMULATED non-fixture');
assert(f_sim.simulated_steps.some(s => s.includes(TAG)),                               '[F-04] steps contain tag');

// ─── Suite G: Injectable spawn_adapter ───────────────────────────
console.log('\n[Suite G] Injectable spawn_adapter');
const mock_calls = [];
const mock_adapter = (cmd, args) => {
  mock_calls.push({ cmd, args });
  return { status: 0, stdout: '', stderr: '' };
};
const g_exec = runRealTagRollbackExecutor({
  tag_created: true, execute_rollback: true, dry_run: false, ci: false,
  target_tag: TAG, rollback_anchor_id: ROLLBACK_ID,
  spawn_adapter: mock_adapter, _mock_timestamp: TS,
});
assert(g_exec.rollback_status    === 'ROLLBACK_EXEC_EXECUTED',                        '[G-01] EXECUTED with adapter');
assert(g_exec.rollback_executed  === true,                                             '[G-02] rollback_executed=true');
assert(g_exec.local_tag_deleted  === true,                                             '[G-03] local_tag_deleted=true');
assert(g_exec.remote_tag_deleted === true,                                             '[G-04] remote_tag_deleted=true');
assert(g_exec.deploy_performed   === false,                                            '[G-05] deploy=false');
assert(mock_calls.length         === 2,                                                '[G-06] 2 adapter calls');
assert(mock_calls[0].args[0]     === 'tag',                                            '[G-07] first: tag');
assert(mock_calls[0].args[1]     === '-d',                                             '[G-08] first: -d (delete local)');
assert(mock_calls[1].args[0]     === 'push',                                           '[G-09] second: push');
assert(mock_calls[1].args[2]     === `:refs/tags/${TAG}`,                              '[G-10] second: delete remote');

// ─── Suite H: Adapter failure ─────────────────────────────────────
console.log('\n[Suite H] Adapter failure');
const fail_adapter = () => { throw new Error('permission denied'); };
const h_fail = runRealTagRollbackExecutor({
  tag_created: true, execute_rollback: true, dry_run: false, ci: false,
  target_tag: TAG, spawn_adapter: fail_adapter, _mock_timestamp: TS,
});
assert(h_fail.rollback_status   === 'ROLLBACK_EXEC_BLOCKED_ADAPTER',                  '[H-01] BLOCKED_ADAPTER on throw');
assert(h_fail.rollback_executed === false,                                             '[H-02] rollback_executed=false on failure');

// ─── Suite I: Invariants ──────────────────────────────────────────
console.log('\n[Suite I] Invariants');
assert(fix.tag_created                  === false, '[I-01] tag_created=false');
assert(fix.git_push_performed           === false, '[I-02] push=false');
assert(fix.deploy_performed             === false, '[I-03] deploy=false');
assert(fix.stable_promoted              === false, '[I-04] stable=false');
assert(fix.release_performed            === false, '[I-05] release=false');
assert(fixExec.tag_created              === false, '[I-06] tag_created=false even when rollback executed');
assert(g_exec.deploy_performed          === false, '[I-07] deploy=false (adapter)');

// ─── Suite J: Validate ────────────────────────────────────────────
console.log('\n[Suite J] Validate');
const j_ok = validateRollbackExecutorResult(fix);
assert(j_ok.valid === true,                                                            '[J-01] valid dry_run fix');
const j_null = validateRollbackExecutorResult(null);
assert(j_null.valid === false,                                                         '[J-02] null invalid');
const j_bad = validateRollbackExecutorResult({ rollback_status: 'ROLLBACK_EXEC_SKIPPED_DRY_RUN', tag_created: true });
assert(j_bad.errors.includes('tag_created_must_be_false'),                             '[J-03] tag_created=true → error');

// ─── Suite K: Deterministic ID ────────────────────────────────────
console.log('\n[Suite K] Deterministic ID');
const k1 = runRealTagRollbackExecutor({ fixture_mode: true, _mock_timestamp: TS });
const k2 = runRealTagRollbackExecutor({ fixture_mode: true, _mock_timestamp: TS });
assert(k1.rollback_id === k2.rollback_id,                                              '[K-01] deterministic id');

// ─── Suite L: Render ──────────────────────────────────────────────
console.log('\n[Suite L] Render');
const rendered = renderRollbackExecutorSummary(fix);
assert(typeof rendered === 'string',                                                   '[L-01] returns string');
assert(rendered.includes('ROLLBACK_EXEC_SKIPPED_DRY_RUN'),                            '[L-02] status in output');
assert(rendered.includes('tag_created                   : false'),                     '[L-03] tag=false');
assert(rendered.includes('deploy_performed              : false'),                     '[L-04] deploy=false');
assert(rendered.includes('rollback_executed'),                                         '[L-05] rollback_executed field');
assert(renderRollbackExecutorSummary(null) === 'real_tag_rollback_executor: null',    '[L-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-rollback-executor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
