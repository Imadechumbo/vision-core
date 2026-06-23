#!/usr/bin/env node
/**
 * Final Pre-Production Safety Baseline — Unit Tests V70.0
 */

import {
  evaluateFinalPreProductionSafetyBaseline,
  renderFinalPreProductionSafetyBaseline,
  FINAL_PREPROD_BASELINE_STATUSES,
} from '../final-pre-production-safety-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(FINAL_PREPROD_BASELINE_STATUSES),                                   '[A-01] statuses array');
assert(FINAL_PREPROD_BASELINE_STATUSES.length === 5,                                     '[A-02] 5 statuses');
assert(FINAL_PREPROD_BASELINE_STATUSES.includes('FINAL_PREPROD_BASELINE_BLOCKED_MODULES'), '[A-03] BLOCKED_MODULES');
assert(FINAL_PREPROD_BASELINE_STATUSES.includes('FINAL_PREPROD_BASELINE_BLOCKED_TESTS'),  '[A-04] BLOCKED_TESTS');
assert(FINAL_PREPROD_BASELINE_STATUSES.includes('FINAL_PREPROD_BASELINE_BLOCKED_INVARIANTS'), '[A-05] BLOCKED_INVARIANTS');
assert(FINAL_PREPROD_BASELINE_STATUSES.includes('FINAL_PREPROD_BASELINE_BLOCKED_REVIEW_PIPELINE'), '[A-06] BLOCKED_REVIEW_PIPELINE');
assert(FINAL_PREPROD_BASELINE_STATUSES.includes('FINAL_PREPROD_BASELINE_READY_REVIEW'),  '[A-07] READY_REVIEW');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateFinalPreProductionSafetyBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                           '[B-01] returns object');
assert(fix.baseline_status    === 'FINAL_PREPROD_BASELINE_READY_REVIEW',                 '[B-02] status=READY_REVIEW');
assert(fix.baseline_ready     === true,                                                   '[B-03] baseline_ready=true');
assert(fix.schema_version     === 'v70.0',                                               '[B-04] schema=v70.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,             '[B-05] id 24 chars');
assert(fix.modules_verified          === true,                                            '[B-06] modules_verified=true');
assert(fix.test_scripts_verified     === true,                                            '[B-07] test_scripts_verified=true');
assert(fix.invariants_verified       === true,                                            '[B-08] invariants_verified=true');
assert(fix.review_pipeline_verified  === true,                                            '[B-09] review_pipeline_verified=true');
assert(fix.preprod_report_ready      === true,                                            '[B-10] preprod_report_ready=true');
assert(fix.blocking_reason           === null,                                            '[B-11] blocking_reason=null');
assert(fix.created_at                === TS,                                              '[B-12] created_at=TS');
assert(fix.required_modules_count    === 8,                                               '[B-13] 8 required modules');
assert(fix.required_test_scripts_count === 8,                                             '[B-14] 8 required test scripts');

// ─── Suite C: Pipeline status fields ─────────────────────────────
console.log('\n[Suite C] Pipeline status fields');
assert(fix.pipeline_contract_status  === 'CONTROLLED_CONTRACT_READY_REVIEW',             '[C-01] contract=READY_REVIEW');
assert(fix.pipeline_authority_status === 'CONTROLLED_AUTHORITY_READY_REVIEW',            '[C-02] authority=READY_REVIEW');
assert(fix.pipeline_binding_status   === 'CONTROLLED_BINDING_READY_REVIEW',              '[C-03] binding=READY_REVIEW');
assert(fix.pipeline_risk_status      === 'CONTROLLED_RISK_READY_REVIEW',                 '[C-04] risk=READY_REVIEW');
assert(fix.pipeline_evidence_status  === 'CONTROLLED_EVIDENCE_READY_REVIEW',             '[C-05] evidence=READY_REVIEW');
assert(fix.pipeline_report_status    === 'PREPROD_REPORT_READY',                         '[C-06] report=PREPROD_REPORT_READY');

// ─── Suite D: Invariants ──────────────────────────────────────────
console.log('\n[Suite D] Invariants');
assert(fix.production_execution_locked        === true,  '[D-01] locked=true');
assert(fix.controlled_execution_allowed       === false, '[D-02] controlled_exec=false');
assert(fix.unlock_executed                    === false, '[D-03] unlock_executed=false');
assert(fix.final_execution_phase_required     === true,  '[D-04] final_exec=true');
assert(fix.explicit_final_execution_required  === true,  '[D-05] explicit_final=true');
assert(fix.human_review_required              === true,  '[D-06] human_review=true');
assert(fix.deploy_allowed                     === false, '[D-07] deploy_allowed=false');
assert(fix.promotion_allowed                  === false, '[D-08] promotion_allowed=false');
assert(fix.stable_allowed                     === false, '[D-09] stable_allowed=false');
assert(fix.tag_allowed                        === false, '[D-10] tag_allowed=false');
assert(fix.release_execution_allowed          === false, '[D-11] release_exec=false');
assert(fix.release_performed                  === false, '[D-12] release_performed=false');
assert(fix.tag_created                        === false, '[D-13] tag_created=false');
assert(fix.stable_promoted                    === false, '[D-14] stable_promoted=false');
assert(fix.deploy_performed                   === false, '[D-15] deploy_performed=false');
assert(fix.controlled_review_only             === true,  '[D-16] controlled_review_only=true');
assert(fix.future_execution_phase_required    === true,  '[D-17] future_exec=true');

// ─── Suite E: Non-fixture mode (real files in place) ─────────────
console.log('\n[Suite E] Non-fixture mode (real files)');
const real = await evaluateFinalPreProductionSafetyBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(real.baseline_ready   === true,                                                    '[E-01] baseline_ready=true');
assert(real.baseline_status  === 'FINAL_PREPROD_BASELINE_READY_REVIEW',                  '[E-02] status=READY_REVIEW');
assert(real.modules_verified === true,                                                    '[E-03] modules_verified=true');
assert(real.test_scripts_verified === true,                                               '[E-04] test_scripts_verified=true');
assert(real.invariants_verified   === true,                                               '[E-05] invariants_verified=true');
assert(real.review_pipeline_verified === true,                                            '[E-06] review_pipeline_verified=true');
assert(real.production_execution_locked       === true,  '[E-07] real: locked=true');
assert(real.controlled_execution_allowed      === false, '[E-08] real: controlled_exec=false');
assert(real.unlock_executed                   === false, '[E-09] real: unlock=false');
assert(real.final_execution_phase_required    === true,  '[E-10] real: final_exec=true');
assert(real.explicit_final_execution_required === true,  '[E-11] real: explicit_final=true');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const r1 = await evaluateFinalPreProductionSafetyBaseline({ fixture_mode: true, _mock_timestamp: TS });
const r2 = await evaluateFinalPreProductionSafetyBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(r1.baseline_id === r2.baseline_id,                                                '[F-01] deterministic id');
assert(r1.baseline_id !== '',                                                             '[F-02] id not empty');

// ─── Suite G: renderFinalPreProductionSafetyBaseline ──────────────
console.log('\n[Suite G] Render');
const rendered = renderFinalPreProductionSafetyBaseline(fix);
assert(typeof rendered === 'string',                                                      '[G-01] returns string');
assert(rendered.includes('FINAL_PREPROD_BASELINE_READY_REVIEW'),                         '[G-02] status in output');
assert(rendered.includes('production_execution_locked       : true'),                    '[G-03] lock in output');
assert(rendered.includes('controlled_execution_allowed      : false'),                   '[G-04] allowed=false in output');
assert(rendered.includes('human_review_required             : true'),                    '[G-05] human_review in output');
assert(rendered.includes('explicit_final_execution_required : true'),                    '[G-06] explicit_final in output');
assert(rendered.includes('final_execution_phase_required    : true'),                    '[G-07] final_exec in output');
assert(rendered.includes('modules_verified'),                                             '[G-08] modules_verified in output');
assert(rendered.includes('invariants_verified'),                                          '[G-09] invariants_verified in output');
assert(rendered.includes('review_pipeline_verified'),                                     '[G-10] pipeline_verified in output');
assert(renderFinalPreProductionSafetyBaseline(null) === 'final_pre_production_safety_baseline: null', '[G-11] null → string');

// ─── Suite H: READY does not grant execution ─────────────────────
console.log('\n[Suite H] READY does not grant execution');
assert(fix.baseline_status === 'FINAL_PREPROD_BASELINE_READY_REVIEW',                    '[H-01] status=READY_REVIEW');
assert(fix.controlled_execution_allowed !== true,                                         '[H-02] READY_REVIEW != execution');
assert(fix.production_execution_locked  === true,                                         '[H-03] locked regardless of READY');
assert(fix.deploy_allowed               !== true,                                         '[H-04] deploy blocked at READY');
assert(fix.release_execution_allowed    !== true,                                         '[H-05] release blocked at READY');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nfinal-pre-production-safety-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
