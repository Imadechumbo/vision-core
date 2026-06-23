#!/usr/bin/env node
/**
 * Real Tag Human Execution Readiness Baseline — Unit Tests V105.0
 */

import {
  HUMAN_EXEC_READINESS_STATUSES,
  evaluateRealTagHumanExecutionReadinessBaseline,
  renderRealTagHumanExecutionReadinessBaseline,
} from '../real-tag-human-execution-readiness-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T19:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(HUMAN_EXEC_READINESS_STATUSES),                                    '[A-01] statuses array');
assert(HUMAN_EXEC_READINESS_STATUSES.length === 6,                                      '[A-02] 6 statuses');
assert(HUMAN_EXEC_READINESS_STATUSES.includes('HUMAN_EXEC_READINESS_BLOCKED_MODULES'),  '[A-03] BLOCKED_MODULES');
assert(HUMAN_EXEC_READINESS_STATUSES.includes('HUMAN_EXEC_READINESS_BLOCKED_TESTS'),    '[A-04] BLOCKED_TESTS');
assert(HUMAN_EXEC_READINESS_STATUSES.includes('HUMAN_EXEC_READINESS_BLOCKED_INVARIANTS'), '[A-05] BLOCKED_INVARIANTS');
assert(HUMAN_EXEC_READINESS_STATUSES.includes('HUMAN_EXEC_READINESS_BLOCKED_PIPELINE'), '[A-06] BLOCKED_PIPELINE');
assert(HUMAN_EXEC_READINESS_STATUSES.includes('HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION'), '[A-07] READY');
assert(HUMAN_EXEC_READINESS_STATUSES.includes('HUMAN_EXEC_READINESS_READY_FOR_STABLE_REVIEW_AFTER_VERIFIED_TAG'), '[A-08] STABLE_REVIEW');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateRealTagHumanExecutionReadinessBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                         '[B-01] returns object');
assert(fix.human_exec_readiness_status === 'HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION', '[B-02] fixture=READY');
assert(fix.human_exec_readiness_ready  === true,                                        '[B-03] ready=true');
assert(fix.schema_version              === 'v105.0',                                    '[B-04] schema=v105.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,           '[B-05] id 24 chars');
assert(fix.blocking_reason             === null,                                        '[B-06] blocking=null');
assert(fix.modules_verified            === true,                                        '[B-07] modules_verified=true');
assert(fix.test_scripts_verified       === true,                                        '[B-08] test_scripts_verified=true');
assert(fix.invariants_verified         === true,                                        '[B-09] invariants_verified=true');
assert(fix.pipeline_verified           === true,                                        '[B-10] pipeline_verified=true');
assert(fix.command_sealed_pipeline_verified   === true,                                 '[B-11] command_sealed=true');
assert(fix.dry_run_import_pipeline_verified   === true,                                 '[B-12] dry_run_import=true');
assert(fix.mock_real_tag_pipeline_verified    === true,                                 '[B-13] mock_real_tag=true');
assert(fix.ledger_verified             === true,                                        '[B-14] ledger_verified=true');
assert(fix.eligibility_verified        === true,                                        '[B-15] eligibility_verified=true');
assert(fix.ready_for_manual_tag_execution             === true,                         '[B-16] ready_for_manual_tag_execution=true');
assert(fix.ready_for_stable_review_after_verified_tag === false,                        '[B-17] stable_review=false');
assert(fix.created_at                  === TS,                                          '[B-18] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.actual_git_push_performed    === false, '[C-02] actual_git_push_performed=false');
assert(fix.tag_created                  === false, '[C-03] tag_created=false');
assert(fix.git_push_performed           === false, '[C-04] git_push_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.deploy_performed             === false, '[C-06] deploy_performed=false');
assert(fix.release_performed            === false, '[C-07] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-08] real_execution_not_performed=true');

// ─── Suite D: Module counts ───────────────────────────────────────
console.log('\n[Suite D] Module counts');
assert(fix.required_modules_count      === 7,  '[D-01] 7 required modules');
assert(fix.required_test_scripts_count === 8,  '[D-02] 8 required test scripts');

// ─── Suite E: Live mode (modules present) ─────────────────────────
console.log('\n[Suite E] Live mode');
const live = await evaluateRealTagHumanExecutionReadinessBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(live !== null && typeof live === 'object',                                       '[E-01] returns object');
const liveStatuses = ['HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION', 'HUMAN_EXEC_READINESS_BLOCKED_MODULES', 'HUMAN_EXEC_READINESS_BLOCKED_TESTS', 'HUMAN_EXEC_READINESS_BLOCKED_INVARIANTS', 'HUMAN_EXEC_READINESS_BLOCKED_PIPELINE'];
assert(liveStatuses.includes(live.human_exec_readiness_status),                        '[E-02] valid status');
assert(live.actual_real_tag_created   === false,                                        '[E-03] actual_tag=false in live');
assert(live.stable_promoted           === false,                                        '[E-04] stable=false in live');
assert(live.deploy_performed          === false,                                        '[E-05] deploy=false in live');
assert(live.real_execution_not_performed === true,                                      '[E-06] real_exec_not_performed in live');

// ─── Suite F: Ready state (live with modules present) ─────────────
console.log('\n[Suite F] Ready state');
if (live.human_exec_readiness_status === 'HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION') {
  assert(live.human_exec_readiness_ready === true,                                      '[F-01] ready=true in live');
  assert(live.modules_verified           === true,                                      '[F-02] modules_verified=true in live');
  assert(live.test_scripts_verified      === true,                                      '[F-03] test_scripts_verified=true in live');
  assert(live.invariants_verified        === true,                                      '[F-04] invariants_verified=true in live');
  assert(live.pipeline_verified          === true,                                      '[F-05] pipeline_verified=true in live');
  assert(live.ready_for_manual_tag_execution             === true,                      '[F-06] ready_for_manual_tag_execution=true in live');
  assert(live.ready_for_stable_review_after_verified_tag === false,                     '[F-07] stable_review=false in live');
} else {
  assert(live.human_exec_readiness_ready === false,                                     '[F-01] blocked: ready=false');
  assert(typeof live.blocking_reason === 'string',                                      '[F-02] blocked: blocking_reason string');
  assert(live.ready_for_manual_tag_execution === false,                                 '[F-03] blocked: ready_for_manual=false');
  assert(live.ready_for_stable_review_after_verified_tag === false,                     '[F-04] blocked: stable_review=false');
  assert(live.actual_real_tag_created === false,                                        '[F-05] blocked: actual_tag=false');
  assert(live.stable_promoted         === false,                                        '[F-06] blocked: stable=false');
  assert(live.deploy_performed        === false,                                        '[F-07] blocked: deploy=false');
}

// ─── Suite G: REGRA ABSOLUTA — ready_for_stable_review always false ─
console.log('\n[Suite G] REGRA ABSOLUTA');
assert(fix.ready_for_stable_review_after_verified_tag === false,                       '[G-01] fixture: stable_review_after_tag=false');
assert(live.ready_for_stable_review_after_verified_tag === false,                      '[G-02] live: stable_review_after_tag=false');
assert(fix.stable_promoted  === false,                                                 '[G-03] fixture: stable_promoted=false');
assert(live.stable_promoted === false,                                                 '[G-04] live: stable_promoted=false');
assert(fix.deploy_performed  === false,                                                '[G-05] fixture: deploy=false');
assert(live.deploy_performed === false,                                                '[G-06] live: deploy=false');
assert(fix.release_performed  === false,                                               '[G-07] fixture: release=false');
assert(live.release_performed === false,                                               '[G-08] live: release=false');

// ─── Suite H: Render ─────────────────────────────────────────────
console.log('\n[Suite H] Render');
const rendered = renderRealTagHumanExecutionReadinessBaseline(fix);
assert(typeof rendered === 'string',                                                   '[H-01] returns string');
assert(rendered.includes('HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION'),      '[H-02] status in output');
assert(rendered.includes('actual_real_tag_created'),                                   '[H-03] actual_tag in output');
assert(rendered.includes('stable_promoted'),                                           '[H-04] stable_promoted in output');
assert(rendered.includes('ready_for_manual_tag_execution'),                            '[H-05] ready_for_manual in output');
assert(rendered.includes('ready_for_stable_review_after_verified_tag'),                '[H-06] stable_review in output');
assert(rendered.includes('real_execution_not_performed'),                              '[H-07] real_exec in output');
assert(renderRealTagHumanExecutionReadinessBaseline(null) === 'real_tag_human_execution_readiness_baseline: null', '[H-08] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-execution-readiness-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
