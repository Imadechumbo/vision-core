#!/usr/bin/env node
/**
 * Real Tag Human Operational Baseline — Unit Tests V95.0
 */

import {
  HUMAN_OP_BASELINE_STATUSES,
  evaluateRealTagHumanOperationalBaseline,
  renderRealTagHumanOperationalBaseline,
} from '../real-tag-human-operational-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T06:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(HUMAN_OP_BASELINE_STATUSES),                                            '[A-01] statuses array');
assert(HUMAN_OP_BASELINE_STATUSES.length === 5,                                              '[A-02] 5 statuses');
assert(HUMAN_OP_BASELINE_STATUSES.includes('HUMAN_OP_BASELINE_BLOCKED_MODULES'),             '[A-03] BLOCKED_MODULES');
assert(HUMAN_OP_BASELINE_STATUSES.includes('HUMAN_OP_BASELINE_BLOCKED_TESTS'),               '[A-04] BLOCKED_TESTS');
assert(HUMAN_OP_BASELINE_STATUSES.includes('HUMAN_OP_BASELINE_BLOCKED_INVARIANTS'),          '[A-05] BLOCKED_INVARIANTS');
assert(HUMAN_OP_BASELINE_STATUSES.includes('HUMAN_OP_BASELINE_BLOCKED_PIPELINE'),            '[A-06] BLOCKED_PIPELINE');
assert(HUMAN_OP_BASELINE_STATUSES.includes('HUMAN_OP_BASELINE_READY_FOR_HUMAN_TAG_OPERATION'), '[A-07] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = await evaluateRealTagHumanOperationalBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                              '[B-01] returns object');
assert(fix.baseline_status   === 'HUMAN_OP_BASELINE_READY_FOR_HUMAN_TAG_OPERATION',         '[B-02] READY status');
assert(fix.baseline_ready    === true,                                                       '[B-03] baseline_ready=true');
assert(fix.schema_version    === 'v95.0',                                                    '[B-04] schema=v95.0');
assert(typeof fix.baseline_id === 'string' && fix.baseline_id.length === 24,                '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                                       '[B-06] blocking=null');
assert(fix.modules_verified         === true,                                                '[B-07] modules_verified=true');
assert(fix.test_scripts_verified    === true,                                                '[B-08] test_scripts_verified=true');
assert(fix.invariants_verified      === true,                                                '[B-09] invariants_verified=true');
assert(fix.pipeline_verified        === true,                                                '[B-10] pipeline_verified=true');
assert(fix.runbook_verified         === true,                                                '[B-11] runbook_verified=true');
assert(fix.validator_verified       === true,                                                '[B-12] validator_verified=true');
assert(fix.gate_verified            === true,                                                '[B-13] gate_verified=true');
assert(fix.renderer_verified        === true,                                                '[B-14] renderer_verified=true');
assert(fix.importer_verified        === true,                                                '[B-15] importer_verified=true');
assert(fix.verifier_verified        === true,                                                '[B-16] verifier_verified=true');
assert(fix.ledger_verified          === true,                                                '[B-17] ledger_verified=true');
assert(fix.stab_report_verified     === true,                                                '[B-18] stab_report_verified=true');
assert(fix.created_at               === TS,                                                  '[B-19] created_at=TS');
assert(fix.required_modules_count   === 8,                                                   '[B-20] modules_count=8');
assert(fix.required_test_scripts_count === 9,                                                '[B-21] scripts_count=9');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ─────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: READY-specific fields ───────────────────────────────
console.log('\n[Suite D] READY fields');
assert(fix.human_operation_available === true,                                               '[D-01] human_operation_available=true');
assert(fix.actual_real_tag_created   === false,                                              '[D-02] actual_real_tag_created=false in READY');

// ─── Suite E: Non-fixture READY (real modules present) ────────────
console.log('\n[Suite E] Non-fixture READY');
const real = await evaluateRealTagHumanOperationalBaseline({ fixture_mode: false, _mock_timestamp: TS });
assert(real.baseline_status          === 'HUMAN_OP_BASELINE_READY_FOR_HUMAN_TAG_OPERATION', '[E-01] non-fixture READY');
assert(real.baseline_ready           === true,                                               '[E-02] non-fixture ready=true');
assert(real.modules_verified         === true,                                               '[E-03] modules verified');
assert(real.test_scripts_verified    === true,                                               '[E-04] test scripts verified');
assert(real.invariants_verified      === true,                                               '[E-05] invariants verified');
assert(real.pipeline_verified        === true,                                               '[E-06] pipeline verified');
assert(real.human_operation_available === true,                                              '[E-07] human_op available');
assert(real.actual_real_tag_created   === false,                                             '[E-08] actual_tag=false');
assert(real.required_modules_count    === 8,                                                 '[E-09] modules_count=8');
assert(real.required_test_scripts_count === 9,                                               '[E-10] scripts_count=9');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const f1 = await evaluateRealTagHumanOperationalBaseline({ fixture_mode: true, _mock_timestamp: TS });
const f2 = await evaluateRealTagHumanOperationalBaseline({ fixture_mode: true, _mock_timestamp: TS });
assert(f1.baseline_id === f2.baseline_id,                                                    '[F-01] deterministic id');
const f3 = await evaluateRealTagHumanOperationalBaseline({ fixture_mode: true, _mock_timestamp: '2026-01-01T00:00:00.000Z' });
assert(f1.baseline_id !== f3.baseline_id,                                                    '[F-02] different ts → different id');

// ─── Suite G: Render ─────────────────────────────────────────────
console.log('\n[Suite G] Render');
const rendered = renderRealTagHumanOperationalBaseline(fix);
assert(typeof rendered === 'string',                                                         '[G-01] returns string');
assert(rendered.includes('HUMAN_OP_BASELINE_READY_FOR_HUMAN_TAG_OPERATION'),                '[G-02] status in output');
assert(rendered.includes('modules_verified'),                                                '[G-03] modules_verified in output');
assert(rendered.includes('test_scripts_verified'),                                           '[G-04] test_scripts_verified in output');
assert(rendered.includes('pipeline_verified'),                                               '[G-05] pipeline_verified in output');
assert(rendered.includes('human_operation_available     : true'),                           '[G-06] human_op=true in output');
assert(rendered.includes('actual_real_tag_created       : false'),                          '[G-07] actual_tag=false in output');
assert(rendered.includes('tag_created                   : false'),                           '[G-08] tag_created=false in output');
assert(rendered.includes('git_push_performed            : false'),                           '[G-09] git_push=false in output');
assert(rendered.includes('real_execution_not_performed  : true'),                           '[G-10] not_performed=true in output');
assert(rendered.includes('blocking_reason               : none'),                           '[G-11] blocking=none in output');
assert(rendered.includes('runbook_verified'),                                                '[G-12] runbook_verified in output');
assert(rendered.includes('stab_report_verified'),                                            '[G-13] stab_report_verified in output');
assert(renderRealTagHumanOperationalBaseline(null) === 'real_tag_human_operational_baseline: null', '[G-14] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-operational-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
