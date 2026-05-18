#!/usr/bin/env node
/**
 * Real Tag Manual Executor Baseline — Unit Tests V85.0
 */

import {
  evaluateRealTagManualExecutorBaseline,
  renderRealTagManualExecutorBaseline,
  MANUAL_EXECUTOR_BASELINE_STATUSES,
} from '../real-tag-manual-executor-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T21:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_EXECUTOR_BASELINE_STATUSES),                             '[A-01] statuses array');
assert(MANUAL_EXECUTOR_BASELINE_STATUSES.length === 5,                               '[A-02] 5 statuses');
assert(MANUAL_EXECUTOR_BASELINE_STATUSES.includes('MANUAL_EXEC_BASELINE_BLOCKED_MODULES'),     '[A-03] BLOCKED_MODULES');
assert(MANUAL_EXECUTOR_BASELINE_STATUSES.includes('MANUAL_EXEC_BASELINE_BLOCKED_TESTS'),       '[A-04] BLOCKED_TESTS');
assert(MANUAL_EXECUTOR_BASELINE_STATUSES.includes('MANUAL_EXEC_BASELINE_BLOCKED_INVARIANTS'),  '[A-05] BLOCKED_INVARIANTS');
assert(MANUAL_EXECUTOR_BASELINE_STATUSES.includes('MANUAL_EXEC_BASELINE_BLOCKED_PIPELINE'),    '[A-06] BLOCKED_PIPELINE');
assert(MANUAL_EXECUTOR_BASELINE_STATUSES.includes('MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION'), '[A-07] READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateRealTagManualExecutorBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.baseline_status   === 'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION', '[B-02] READY');
assert(fix.baseline_ready    === true,                                               '[B-03] ready=true');
assert(fix.schema_version    === 'v85.0',                                            '[B-04] schema=v85.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,       '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                               '[B-06] blocking=null');
assert(fix.modules_verified  === true,                                               '[B-07] modules=true');
assert(fix.test_scripts_verified    === true,                                        '[B-08] tests=true');
assert(fix.invariants_verified      === true,                                        '[B-09] invariants=true');
assert(fix.pipeline_verified        === true,                                        '[B-10] pipeline=true');
assert(fix.contract_verified        === true,                                        '[B-11] contract=true');
assert(fix.confirmation_verified    === true,                                        '[B-12] confirmation=true');
assert(fix.safety_lock_verified     === true,                                        '[B-13] safety_lock=true');
assert(fix.command_builder_verified === true,                                        '[B-14] command_builder=true');
assert(fix.dry_run_verified         === true,                                        '[B-15] dry_run=true');
assert(fix.receipt_preview_verified === true,                                        '[B-16] receipt_preview=true');
assert(fix.armed_guard_verified     === true,                                        '[B-17] armed_guard=true');
assert(fix.audit_plan_verified      === true,                                        '[B-18] audit_plan=true');
assert(fix.created_at               === TS,                                          '[B-19] created_at=TS');
assert(fix.required_modules_count   === 8,                                           '[B-20] 8 modules');
assert(fix.required_test_scripts_count === 9,                                        '[B-21] 9 test scripts');

// ─── Suite C: Non-fixture mode (real files) ───────────────────────
console.log('\n[Suite C] Non-fixture mode (real files)');
const real = await evaluateRealTagManualExecutorBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(real.baseline_ready     === true,                                             '[C-01] real: ready=true');
assert(real.baseline_status    === 'MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION', '[C-02] real: READY');
assert(real.modules_verified   === true,                                             '[C-03] real: modules=true');
assert(real.test_scripts_verified === true,                                          '[C-04] real: tests=true');
assert(real.invariants_verified   === true,                                          '[C-05] real: invariants=true');
assert(real.pipeline_verified     === true,                                          '[C-06] real: pipeline=true');
assert(real.contract_verified     === true,                                          '[C-07] real: contract=true');
assert(real.armed_guard_verified  === true,                                          '[C-08] real: armed_guard=true');
assert(real.dry_run_verified      === true,                                          '[C-09] real: dry_run=true');

// ─── Suite D: Invariants ──────────────────────────────────────────
console.log('\n[Suite D] Invariants');
assert(fix.tag_created                  === false, '[D-01] tag_created=false');
assert(fix.git_push_performed           === false, '[D-02] push=false');
assert(fix.deploy_performed             === false, '[D-03] deploy=false');
assert(fix.stable_promoted              === false, '[D-04] stable=false');
assert(fix.release_performed            === false, '[D-05] release=false');
assert(fix.real_execution_not_performed === true,  '[D-06] not_performed=true');
assert(fix.ready_for_one_shot_execution === true,  '[D-07] ready_for_one_shot=true');

// ─── Suite E: READY grants one-shot preparation ───────────────────
console.log('\n[Suite E] READY status');
assert(fix.baseline_status.includes('ONE_SHOT_EXECUTION'),                           '[E-01] one_shot in status');
assert(fix.tag_created                  !== true,  '[E-02] tag_created still false');
assert(fix.real_execution_not_performed === true,  '[E-03] execution still not performed');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const f1 = await evaluateRealTagManualExecutorBaseline({ fixture_mode: true, _mock_timestamp: TS });
const f2 = await evaluateRealTagManualExecutorBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(f1.baseline_id === f2.baseline_id,                                            '[F-01] deterministic id');

// ─── Suite G: Render ──────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderRealTagManualExecutorBaseline(fix);
assert(typeof rendered === 'string',                                                 '[G-01] returns string');
assert(rendered.includes('MANUAL_EXEC_BASELINE_READY_FOR_ONE_SHOT_EXECUTION'),      '[G-02] status in output');
assert(rendered.includes('tag_created                   : false'),                  '[G-03] tag=false');
assert(rendered.includes('git_push_performed            : false'),                  '[G-04] push=false');
assert(rendered.includes('real_execution_not_performed  : true'),                   '[G-05] not_performed=true');
assert(rendered.includes('ready_for_one_shot_execution  : true'),                   '[G-06] ready_for_one_shot=true');
assert(rendered.includes('dry_run_verified'),                                        '[G-07] dry_run field');
assert(rendered.includes('armed_guard_verified'),                                    '[G-08] armed_guard field');
assert(rendered.includes('audit_plan_verified'),                                     '[G-09] audit_plan field');
assert(renderRealTagManualExecutorBaseline(null) === 'real_tag_manual_executor_baseline: null', '[G-10] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-executor-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
