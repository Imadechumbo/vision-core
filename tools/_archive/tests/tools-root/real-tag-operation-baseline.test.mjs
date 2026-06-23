#!/usr/bin/env node
/**
 * Real Tag Operation Baseline — Unit Tests V100.0
 */

import {
  TAG_OP_BASELINE_STATUSES,
  evaluateRealTagOperationBaseline,
  renderRealTagOperationBaseline,
} from '../real-tag-operation-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T14:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_OP_BASELINE_STATUSES),                                                       '[A-01] statuses array');
assert(TAG_OP_BASELINE_STATUSES.length === 7,                                                         '[A-02] 7 statuses');
assert(TAG_OP_BASELINE_STATUSES.includes('TAG_OP_BASELINE_BLOCKED_MODULES'),                          '[A-03] BLOCKED_MODULES');
assert(TAG_OP_BASELINE_STATUSES.includes('TAG_OP_BASELINE_BLOCKED_TESTS'),                            '[A-04] BLOCKED_TESTS');
assert(TAG_OP_BASELINE_STATUSES.includes('TAG_OP_BASELINE_BLOCKED_INVARIANTS'),                       '[A-05] BLOCKED_INVARIANTS');
assert(TAG_OP_BASELINE_STATUSES.includes('TAG_OP_BASELINE_BLOCKED_PIPELINE'),                         '[A-06] BLOCKED_PIPELINE');
assert(TAG_OP_BASELINE_STATUSES.includes('TAG_OP_BASELINE_COMMAND_READY'),                            '[A-07] COMMAND_READY');
assert(TAG_OP_BASELINE_STATUSES.includes('TAG_OP_BASELINE_DRY_RUN_CONFIRMED'),                        '[A-08] DRY_RUN_CONFIRMED');
assert(TAG_OP_BASELINE_STATUSES.includes('TAG_OP_BASELINE_REAL_TAG_CONFIRMED'),                       '[A-09] REAL_TAG_CONFIRMED');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateRealTagOperationBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                                       '[B-01] returns object');
assert(fix.tag_operation_baseline_status === 'TAG_OP_BASELINE_DRY_RUN_CONFIRMED',                     '[B-02] fixture=DRY_RUN_CONFIRMED');
assert(fix.tag_operation_baseline_ready  === true,                                                    '[B-03] baseline_ready=true');
assert(fix.schema_version                === 'v100.0',                                               '[B-04] schema=v100.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,                         '[B-05] id 24 chars');
assert(fix.blocking_reason               === null,                                                    '[B-06] blocking=null');
assert(fix.modules_verified              === true,                                                    '[B-07] modules_verified=true');
assert(fix.test_scripts_verified         === true,                                                    '[B-08] test_scripts_verified=true');
assert(fix.invariants_verified           === true,                                                    '[B-09] invariants_verified=true');
assert(fix.pipeline_verified             === true,                                                    '[B-10] pipeline_verified=true');
assert(fix.command_ready_pipeline_verified              === true,                                     '[B-11] command_ready_pipeline=true');
assert(fix.dry_run_receipt_pipeline_verified            === true,                                     '[B-12] dry_run_pipeline=true');
assert(fix.mock_real_tag_receipt_pipeline_verified      === true,                                     '[B-13] mock_real_tag_pipeline=true');
assert(fix.ledger_verified               === true,                                                    '[B-14] ledger_verified=true');
assert(fix.decision_matrix_verified      === true,                                                    '[B-15] decision_matrix_verified=true');
assert(fix.report_verified               === true,                                                    '[B-16] report_verified=true');
assert(fix.stable_review_phase_allowed   === false,                                                   '[B-17] stable_review=false');
assert(fix.created_at                    === TS,                                                      '[B-18] created_at=TS');
assert(typeof fix.required_modules_count === 'number' && fix.required_modules_count === 7,           '[B-19] required_modules_count=7');
assert(typeof fix.required_test_scripts_count === 'number' && fix.required_test_scripts_count === 8, '[B-20] required_test_scripts_count=8');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created        === false, '[C-01] actual_real_tag_created=false');
assert(fix.actual_git_push_performed      === false, '[C-02] actual_git_push_performed=false');
assert(fix.tag_created                    === false, '[C-03] tag_created=false');
assert(fix.git_push_performed             === false, '[C-04] git_push_performed=false');
assert(fix.stable_promoted                === false, '[C-05] stable_promoted=false');
assert(fix.deploy_performed               === false, '[C-06] deploy_performed=false');
assert(fix.release_performed              === false, '[C-07] release_performed=false');
assert(fix.real_execution_not_performed   === true,  '[C-08] real_execution_not_performed=true');

// ─── Suite D: Non-fixture mode (all files present) ────────────────
console.log('\n[Suite D] Non-fixture mode (all modules and scripts present)');
const live = await evaluateRealTagOperationBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(live !== null && typeof live === 'object',                                                     '[D-01] returns object');
assert(live.tag_operation_baseline_status === 'TAG_OP_BASELINE_DRY_RUN_CONFIRMED',                   '[D-02] live=DRY_RUN_CONFIRMED');
assert(live.tag_operation_baseline_ready  === true,                                                   '[D-03] live ready=true');
assert(live.modules_verified              === true,                                                   '[D-04] modules_verified=true');
assert(live.test_scripts_verified         === true,                                                   '[D-05] test_scripts_verified=true');
assert(live.invariants_verified           === true,                                                   '[D-06] invariants_verified=true');
assert(live.pipeline_verified             === true,                                                   '[D-07] pipeline_verified=true');
assert(live.stable_review_phase_allowed   === false,                                                  '[D-08] stable_review=false');
assert(live.actual_real_tag_created       === false,                                                  '[D-09] actual_tag=false');
assert(live.stable_promoted               === false,                                                  '[D-10] stable=false');
assert(live.deploy_performed              === false,                                                  '[D-11] deploy=false');
assert(live.release_performed             === false,                                                  '[D-12] release=false');

// ─── Suite E: Deterministic ID ────────────────────────────────────
console.log('\n[Suite E] Deterministic ID');
const e1 = await evaluateRealTagOperationBaseline({ fixture_mode: true, _mock_timestamp: TS });
const e2 = await evaluateRealTagOperationBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(e1.baseline_id === e2.baseline_id,                                                            '[E-01] deterministic id');
assert(e1.baseline_id !== undefined && e1.baseline_id.length === 24,                                 '[E-02] id length 24');

// ─── Suite F: Blocked cases (fixture bypasses, non-fixture with forced missing) ──
console.log('\n[Suite F] Blocked result shape');
const fixBlocked = {
  schema_version:                'v100.0',
  tag_operation_baseline_status: 'TAG_OP_BASELINE_BLOCKED_MODULES',
  tag_operation_baseline_ready:  false,
  blocking_reason:               'required_modules_missing',
  stable_review_phase_allowed:   false,
  actual_real_tag_created:       false,
  actual_git_push_performed:     false,
  tag_created:                   false,
  stable_promoted:               false,
  deploy_performed:               false,
  release_performed:              false,
  real_execution_not_performed:  true,
};
assert(fixBlocked.tag_operation_baseline_ready  === false,                                           '[F-01] blocked shape: ready=false');
assert(fixBlocked.stable_review_phase_allowed   === false,                                           '[F-02] blocked shape: stable_review=false');
assert(fixBlocked.actual_real_tag_created       === false,                                           '[F-03] blocked shape: tag=false');
assert(fixBlocked.stable_promoted               === false,                                           '[F-04] blocked shape: stable=false');
assert(fixBlocked.deploy_performed              === false,                                           '[F-05] blocked shape: deploy=false');
assert(fixBlocked.release_performed             === false,                                           '[F-06] blocked shape: release=false');

// ─── Suite G: Render ─────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderRealTagOperationBaseline(fix);
assert(typeof rendered === 'string',                                                                  '[G-01] returns string');
assert(rendered.includes('TAG_OP_BASELINE_DRY_RUN_CONFIRMED'),                                       '[G-02] status in output');
assert(rendered.includes('tag_operation_baseline_ready'),                                             '[G-03] ready field in output');
assert(rendered.includes('actual_real_tag_created                 : false'),                         '[G-04] actual_tag=false in output');
assert(rendered.includes('actual_git_push_performed               : false'),                         '[G-05] git_push=false in output');
assert(rendered.includes('stable_promoted                         : false'),                         '[G-06] stable=false in output');
assert(rendered.includes('deploy_performed                        : false'),                         '[G-07] deploy=false in output');
assert(rendered.includes('release_performed                       : false'),                         '[G-08] release=false in output');
assert(rendered.includes('real_execution_not_performed            : true'),                          '[G-09] real_exec=true in output');
assert(renderRealTagOperationBaseline(null) === 'real_tag_operation_baseline: null',                 '[G-10] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-operation-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
