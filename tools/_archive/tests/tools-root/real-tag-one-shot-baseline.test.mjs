#!/usr/bin/env node
/**
 * Real Tag One-Shot Baseline — Unit Tests V80.0
 */

import {
  evaluateRealTagOneShotBaseline,
  renderRealTagOneShotBaseline,
  REAL_TAG_BASELINE_STATUSES,
} from '../real-tag-one-shot-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T16:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REAL_TAG_BASELINE_STATUSES),                                     '[A-01] statuses array');
assert(REAL_TAG_BASELINE_STATUSES.length === 5,                                       '[A-02] 5 statuses');
assert(REAL_TAG_BASELINE_STATUSES.includes('REAL_TAG_BASELINE_BLOCKED_MODULES'),      '[A-03] BLOCKED_MODULES');
assert(REAL_TAG_BASELINE_STATUSES.includes('REAL_TAG_BASELINE_BLOCKED_TESTS'),        '[A-04] BLOCKED_TESTS');
assert(REAL_TAG_BASELINE_STATUSES.includes('REAL_TAG_BASELINE_BLOCKED_INVARIANTS'),   '[A-05] BLOCKED_INVARIANTS');
assert(REAL_TAG_BASELINE_STATUSES.includes('REAL_TAG_BASELINE_BLOCKED_PIPELINE'),     '[A-06] BLOCKED_PIPELINE');
assert(REAL_TAG_BASELINE_STATUSES.includes('REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR'), '[A-07] READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateRealTagOneShotBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.real_tag_baseline_status === 'REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR', '[B-02] READY status');
assert(fix.real_tag_baseline_ready  === true,                                         '[B-03] ready=true');
assert(fix.schema_version           === 'v80.0',                                      '[B-04] schema=v80.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,         '[B-05] id 24 chars');
assert(fix.modules_verified             === true,                                     '[B-06] modules=true');
assert(fix.test_scripts_verified        === true,                                     '[B-07] tests=true');
assert(fix.invariants_verified          === true,                                     '[B-08] invariants=true');
assert(fix.pipeline_verified            === true,                                     '[B-09] pipeline=true');
assert(fix.dry_run_verified             === true,                                     '[B-10] dry_run=true');
assert(fix.rollback_anchor_verified     === true,                                     '[B-11] rollback=true');
assert(fix.armed_guard_verified         === true,                                     '[B-12] armed=true');
assert(fix.ledger_verified              === true,                                     '[B-13] ledger=true');
assert(fix.report_verified              === true,                                     '[B-14] report=true');
assert(fix.one_shot_preparation_verified === true,                                    '[B-15] preparation=true');
assert(fix.blocking_reason             === null,                                      '[B-16] blocking=null');
assert(fix.created_at                  === TS,                                        '[B-17] created_at=TS');
assert(fix.required_modules_count      === 8,                                         '[B-18] 8 modules');
assert(fix.required_test_scripts_count === 9,                                         '[B-19] 9 test scripts');

// ─── Suite C: Non-fixture mode (real files) ───────────────────────
console.log('\n[Suite C] Non-fixture mode (real files)');
const real = await evaluateRealTagOneShotBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(real.real_tag_baseline_ready === true,                                         '[C-01] real: ready=true');
assert(real.real_tag_baseline_status === 'REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR', '[C-02] real: READY');
assert(real.modules_verified         === true,                                        '[C-03] real: modules=true');
assert(real.test_scripts_verified    === true,                                        '[C-04] real: tests=true');
assert(real.pipeline_verified        === true,                                        '[C-05] real: pipeline=true');
assert(real.dry_run_verified         === true,                                        '[C-06] real: dry_run=true');
assert(real.rollback_anchor_verified === true,                                        '[C-07] real: rollback=true');

// ─── Suite D: Invariants ──────────────────────────────────────────
console.log('\n[Suite D] Invariants');
assert(fix.tag_created                    === false, '[D-01] tag_created=false');
assert(fix.git_push_performed             === false, '[D-02] push=false');
assert(fix.deploy_performed               === false, '[D-03] deploy=false');
assert(fix.stable_promoted                === false, '[D-04] stable=false');
assert(fix.release_performed              === false, '[D-05] release=false');
assert(fix.real_execution_armed           === false, '[D-06] armed=false');
assert(fix.future_manual_executor_required === true, '[D-07] future=true');

// ─── Suite E: READY does not grant execution ──────────────────────
console.log('\n[Suite E] READY does not grant execution');
assert(fix.real_tag_baseline_status.includes('FUTURE_MANUAL_EXECUTOR'),              '[E-01] FUTURE suffix');
assert(fix.tag_created                    !== true,  '[E-02] tag_created still false');
assert(fix.future_manual_executor_required === true, '[E-03] future required');
assert(fix.real_execution_armed           !== true,  '[E-04] armed still false');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const f1 = await evaluateRealTagOneShotBaseline({ fixture_mode: true, _mock_timestamp: TS });
const f2 = await evaluateRealTagOneShotBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(f1.baseline_id === f2.baseline_id,                                             '[F-01] deterministic id');

// ─── Suite G: Render ─────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderRealTagOneShotBaseline(fix);
assert(typeof rendered === 'string',                                                  '[G-01] returns string');
assert(rendered.includes('REAL_TAG_BASELINE_READY_FOR_FUTURE_MANUAL_EXECUTOR'),       '[G-02] status in output');
assert(rendered.includes('tag_created                         : false'),              '[G-03] tag=false');
assert(rendered.includes('git_push_performed                  : false'),              '[G-04] push=false');
assert(rendered.includes('future_manual_executor_required     : true'),               '[G-05] future=true');
assert(rendered.includes('real_execution_armed                : false'),              '[G-06] armed=false');
assert(rendered.includes('dry_run_verified'),                                         '[G-07] dry_run field');
assert(rendered.includes('rollback_anchor_verified'),                                 '[G-08] rollback field');
assert(rendered.includes('armed_guard_verified'),                                     '[G-09] armed_guard field');
assert(rendered.includes('ledger_verified'),                                          '[G-10] ledger field');
assert(rendered.includes('report_verified'),                                          '[G-11] report field');
assert(renderRealTagOneShotBaseline(null) === 'real_tag_one_shot_baseline: null',     '[G-12] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-one-shot-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
