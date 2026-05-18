#!/usr/bin/env node
/**
 * Real Tag Execution Baseline — Unit Tests V90.0
 */

import {
  EXEC_BASELINE_STATUSES,
  evaluateRealTagExecutionBaseline,
  renderRealTagExecutionBaseline,
} from '../real-tag-execution-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T01:30:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(EXEC_BASELINE_STATUSES),                                                 '[A-01] statuses array');
assert(EXEC_BASELINE_STATUSES.length === 5,                                                   '[A-02] 5 statuses');
assert(EXEC_BASELINE_STATUSES.includes('EXEC_BASELINE_BLOCKED_MODULES'),                     '[A-03] BLOCKED_MODULES');
assert(EXEC_BASELINE_STATUSES.includes('EXEC_BASELINE_BLOCKED_TESTS'),                       '[A-04] BLOCKED_TESTS');
assert(EXEC_BASELINE_STATUSES.includes('EXEC_BASELINE_BLOCKED_INVARIANTS'),                  '[A-05] BLOCKED_INVARIANTS');
assert(EXEC_BASELINE_STATUSES.includes('EXEC_BASELINE_BLOCKED_PIPELINE'),                    '[A-06] BLOCKED_PIPELINE');
assert(EXEC_BASELINE_STATUSES.includes('EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL'),        '[A-07] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateRealTagExecutionBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                '[B-01] returns object');
assert(fix.baseline_status        === 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',           '[B-02] READY');
assert(fix.baseline_ready         === true,                                                    '[B-03] ready=true');
assert(fix.schema_version         === 'v90.0',                                               '[B-04] schema=v90.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,                '[B-05] id 24 chars');
assert(fix.blocking_reason        === null,                                                    '[B-06] blocking=null');
assert(fix.modules_verified       === true,                                                    '[B-07] modules=true');
assert(fix.test_scripts_verified  === true,                                                    '[B-08] tests=true');
assert(fix.invariants_verified    === true,                                                    '[B-09] invariants=true');
assert(fix.pipeline_verified      === true,                                                    '[B-10] pipeline=true');
assert(fix.controller_verified    === true,                                                    '[B-11] controller=true');
assert(fix.local_executor_verified=== true,                                                    '[B-12] local_executor=true');
assert(fix.post_verifier_verified === true,                                                    '[B-13] post_verifier=true');
assert(fix.rollback_executor_verified === true,                                                '[B-14] rollback=true');
assert(fix.receipt_verified       === true,                                                    '[B-15] receipt=true');
assert(fix.ledger_verified        === true,                                                    '[B-16] ledger=true');
assert(fix.report_verified        === true,                                                    '[B-17] report=true');
assert(fix.manual_baseline_verified === true,                                                  '[B-18] manual_baseline=true');
assert(fix.created_at             === TS,                                                      '[B-19] created_at=TS');
assert(fix.required_modules_count === 8,                                                       '[B-20] 8 modules');
assert(fix.required_test_scripts_count === 8,                                                  '[B-21] 8 test scripts');

// ─── Suite C: Non-fixture mode (real files) ───────────────────────
console.log('\n[Suite C] Non-fixture mode (real files)');
const real = await evaluateRealTagExecutionBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(real.baseline_ready         === true,                                                   '[C-01] real: ready=true');
assert(real.baseline_status        === 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',          '[C-02] real: READY');
assert(real.modules_verified       === true,                                                   '[C-03] real: modules=true');
assert(real.test_scripts_verified  === true,                                                   '[C-04] real: tests=true');
assert(real.invariants_verified    === true,                                                   '[C-05] real: invariants=true');
assert(real.pipeline_verified      === true,                                                   '[C-06] real: pipeline=true');
assert(real.controller_verified    === true,                                                   '[C-07] real: controller=true');

// ─── Suite D: Invariants ──────────────────────────────────────────
console.log('\n[Suite D] Invariants');
assert(fix.actual_real_tag_created      === false, '[D-01] actual_real_tag_created=false');
assert(fix.tag_created                  === false, '[D-02] tag_created=false');
assert(fix.git_push_performed           === false, '[D-03] push=false');
assert(fix.deploy_performed             === false, '[D-04] deploy=false');
assert(fix.stable_promoted              === false, '[D-05] stable=false');
assert(fix.release_performed            === false, '[D-06] release=false');
assert(fix.real_execution_not_performed === true,  '[D-07] not_performed=true');

// ─── Suite E: READY grants capability ────────────────────────────
console.log('\n[Suite E] READY status');
assert(fix.baseline_status.includes('READY'),                                                  '[E-01] READY in status');
assert(fix.real_tag_capability_available === true,                                             '[E-02] capability_available=true');
assert(fix.actual_real_tag_created       !== true,                                             '[E-03] actual_tag still false');
assert(fix.real_execution_not_performed  === true,                                             '[E-04] execution still not performed');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const f1 = await evaluateRealTagExecutionBaseline({ fixture_mode: true, _mock_timestamp: TS });
const f2 = await evaluateRealTagExecutionBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(f1.baseline_id === f2.baseline_id,                                                      '[F-01] deterministic id');

// ─── Suite G: Render ──────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderRealTagExecutionBaseline(fix);
assert(typeof rendered === 'string',                                                           '[G-01] returns string');
assert(rendered.includes('EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL'),                       '[G-02] status in output');
assert(rendered.includes('actual_real_tag_created       : false'),                            '[G-03] actual_tag=false');
assert(rendered.includes('tag_created                   : false'),                             '[G-04] tag=false');
assert(rendered.includes('git_push_performed            : false'),                             '[G-05] push=false');
assert(rendered.includes('real_execution_not_performed  : true'),                              '[G-06] not_performed=true');
assert(rendered.includes('real_tag_capability_available'),                                     '[G-07] capability field');
assert(rendered.includes('controller_verified'),                                               '[G-08] controller field');
assert(rendered.includes('manual_baseline_verified'),                                          '[G-09] manual_baseline field');
assert(renderRealTagExecutionBaseline(null) === 'real_tag_execution_baseline: null',          '[G-10] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-execution-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
