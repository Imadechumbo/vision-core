#!/usr/bin/env node
/**
 * Real Manual Execution Baseline — Unit Tests V75.0
 */

import {
  evaluateRealManualExecutionBaseline,
  renderRealManualExecutionBaseline,
  REAL_MANUAL_EXEC_BASELINE_STATUSES,
} from '../real-manual-execution-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_MANUAL_EXEC_BASELINE_STATUSES),                                   '[A-01] statuses array');
assert(REAL_MANUAL_EXEC_BASELINE_STATUSES.length === 5,                                     '[A-02] 5 statuses');
assert(REAL_MANUAL_EXEC_BASELINE_STATUSES.includes('REAL_MANUAL_EXEC_BASELINE_BLOCKED_MODULES'), '[A-03] BLOCKED_MODULES');
assert(REAL_MANUAL_EXEC_BASELINE_STATUSES.includes('REAL_MANUAL_EXEC_BASELINE_BLOCKED_TESTS'),   '[A-04] BLOCKED_TESTS');
assert(REAL_MANUAL_EXEC_BASELINE_STATUSES.includes('REAL_MANUAL_EXEC_BASELINE_BLOCKED_INVARIANTS'), '[A-05] BLOCKED_INVARIANTS');
assert(REAL_MANUAL_EXEC_BASELINE_STATUSES.includes('REAL_MANUAL_EXEC_BASELINE_BLOCKED_DRY_RUN_PIPELINE'), '[A-06] BLOCKED_DRY_RUN_PIPELINE');
assert(REAL_MANUAL_EXEC_BASELINE_STATUSES.includes('REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY'), '[A-07] READY_DRY_RUN_ONLY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateRealManualExecutionBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                             '[B-01] returns object');
assert(fix.real_manual_exec_baseline_status === 'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY', '[B-02] status=READY_DRY_RUN_ONLY');
assert(fix.real_manual_exec_baseline_ready  === true,                                      '[B-03] ready=true');
assert(fix.schema_version                   === 'v75.0',                                   '[B-04] schema=v75.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,               '[B-05] id 24 chars');
assert(fix.modules_verified          === true,                                              '[B-06] modules_verified=true');
assert(fix.test_scripts_verified     === true,                                              '[B-07] test_scripts_verified=true');
assert(fix.invariants_verified       === true,                                              '[B-08] invariants_verified=true');
assert(fix.dry_run_pipeline_verified === true,                                              '[B-09] dry_run_pipeline_verified=true');
assert(fix.tag_dry_run_verified      === true,                                              '[B-10] tag_dry_run_verified=true');
assert(fix.stable_dry_run_verified   === true,                                              '[B-11] stable_dry_run_verified=true');
assert(fix.blocking_reason           === null,                                              '[B-12] blocking_reason=null');
assert(fix.created_at                === TS,                                                '[B-13] created_at=TS');
assert(fix.required_modules_count    === 8,                                                 '[B-14] 8 required modules');
assert(fix.required_test_scripts_count === 8,                                               '[B-15] 8 required test scripts');

// ─── Suite C: Non-fixture mode (real files in place) ─────────────
console.log('\n[Suite C] Non-fixture mode (real files)');
const real = await evaluateRealManualExecutionBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(real.real_manual_exec_baseline_ready === true,                                       '[C-01] ready=true');
assert(real.real_manual_exec_baseline_status === 'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY', '[C-02] READY_DRY_RUN_ONLY');
assert(real.modules_verified         === true,                                              '[C-03] modules_verified=true');
assert(real.test_scripts_verified    === true,                                              '[C-04] test_scripts_verified=true');
assert(real.dry_run_pipeline_verified === true,                                             '[C-05] pipeline_verified=true');
assert(real.tag_dry_run_verified     === true,                                              '[C-06] tag_dry_run_verified=true');
assert(real.stable_dry_run_verified  === true,                                              '[C-07] stable_dry_run_verified=true');

// ─── Suite D: Invariants ──────────────────────────────────────────
console.log('\n[Suite D] Invariants');
assert(fix.production_execution_locked     === true,  '[D-01] locked=true');
assert(fix.unlock_executed                 === false, '[D-02] unlock_executed=false');
assert(fix.git_push_performed              === false, '[D-03] push=false');
assert(fix.real_execution_armed            === false, '[D-04] armed=false');
assert(fix.explicit_real_command_required  === true,  '[D-05] explicit_required=true');
assert(fix.deploy_allowed                  === false, '[D-06] deploy_allowed=false');
assert(fix.promotion_allowed               === false, '[D-07] promotion_allowed=false');
assert(fix.stable_allowed                  === false, '[D-08] stable_allowed=false');
assert(fix.tag_allowed                     === false, '[D-09] tag_allowed=false');
assert(fix.release_execution_allowed       === false, '[D-10] release_exec=false');
assert(fix.release_performed               === false, '[D-11] release_performed=false');
assert(fix.tag_created                     === false, '[D-12] tag_created=false');
assert(fix.stable_promoted                 === false, '[D-13] stable_promoted=false');
assert(fix.deploy_performed                === false, '[D-14] deploy_performed=false');

// ─── Suite E: READY does not grant execution ─────────────────────
console.log('\n[Suite E] READY does not grant execution');
assert(fix.real_manual_exec_baseline_status === 'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY', '[E-01] DRY_RUN_ONLY suffix');
assert(fix.tag_created                     !== true,  '[E-02] tag_created still false at READY');
assert(fix.stable_promoted                 !== true,  '[E-03] stable_promoted still false at READY');
assert(fix.production_execution_locked     === true,  '[E-04] locked=true at READY');
assert(fix.explicit_real_command_required  === true,  '[E-05] explicit_required=true at READY');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const r1 = await evaluateRealManualExecutionBaseline({ fixture_mode: true, _mock_timestamp: TS });
const r2 = await evaluateRealManualExecutionBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(r1.baseline_id === r2.baseline_id,                                                  '[F-01] deterministic id');

// ─── Suite G: Render ─────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderRealManualExecutionBaseline(fix);
assert(typeof rendered === 'string',                                                        '[G-01] returns string');
assert(rendered.includes('REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY'),                  '[G-02] status in output');
assert(rendered.includes('production_execution_locked        : true'),                     '[G-03] lock in output');
assert(rendered.includes('tag_created                        : false'),                    '[G-04] tag=false');
assert(rendered.includes('stable_promoted                    : false'),                    '[G-05] stable=false');
assert(rendered.includes('git_push_performed                 : false'),                    '[G-06] push=false');
assert(rendered.includes('explicit_real_command_required     : true'),                     '[G-07] explicit in output');
assert(rendered.includes('dry_run_pipeline_verified'),                                      '[G-08] pipeline field');
assert(rendered.includes('tag_dry_run_verified'),                                           '[G-09] tag_dry_run field');
assert(rendered.includes('stable_dry_run_verified'),                                        '[G-10] stable_dry_run field');
assert(renderRealManualExecutionBaseline(null) === 'real_manual_execution_baseline: null', '[G-11] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-manual-execution-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
