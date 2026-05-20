#!/usr/bin/env node
/**
 * Tests — Stable Promotion Finalization Gate V129.0
 */

import {
  evaluateStablePromotionFinalizationGate,
  validateStablePromotionFinalizationGate,
  renderStablePromotionFinalizationGate,
  FINALIZATION_GATE_STATUSES,
} from '../stable-promotion-finalization-gate.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_REPORT = {
  report_ready:        true,
  report_id:           'report-001',
  all_checks_passed:   true,
  has_confirmation:    true,
  has_state_verified:  true,
  promotion_finalized: true,
};

const GOOD_DOC = {
  document_issued: true,
  confirmation_id: 'confirmation-001',
};

console.log('\n=== stable-promotion-finalization-gate tests ===\n');

console.log('--- null inputs → BLOCKED ---');
{
  const g = evaluateStablePromotionFinalizationGate({});
  assert(g.gate_status === 'FINALIZATION_GATE_BLOCKED', 'null inputs → BLOCKED');
  assert(g.gate_open === false, 'gate_open false');
  assert(g.passed_gates === 0, 'passed_gates 0');
}

console.log('--- partial inputs → PARTIAL ---');
{
  const g = evaluateStablePromotionFinalizationGate({
    stable_execution_post_promotion_report: { report_ready: true, report_id: 'r1', all_checks_passed: true, has_confirmation: false, has_state_verified: false, promotion_finalized: false },
    stable_promotion_confirmation_document: GOOD_DOC,
  });
  assert(g.gate_status === 'FINALIZATION_GATE_PARTIAL', 'partial → PARTIAL');
  assert(g.gate_open === false, 'gate_open false');
  assert(g.passed_gates > 0, 'some gates passed');
  assert(g.passed_gates < g.total_gates, 'not all gates passed');
}

console.log('--- gate open ---');
{
  const g = evaluateStablePromotionFinalizationGate({
    stable_execution_post_promotion_report: GOOD_REPORT,
    stable_promotion_confirmation_document: GOOD_DOC,
  });
  assert(g.gate_status === 'FINALIZATION_GATE_OPEN', 'open status');
  assert(g.gate_open === true, 'gate_open true');
  assert(typeof g.gate_id === 'string' && g.gate_id.length === 64, 'gate_id sha256');
  assert(g.schema_version === 'v129.0', 'schema version');
  assert(g.passed_gates === 6, 'passed_gates 6');
  assert(g.total_gates === 6, 'total_gates 6');
  assert(g.report_id === 'report-001', 'report_id propagated');
  assert(g.confirmation_id === 'confirmation-001', 'confirmation_id propagated');
}

console.log('--- gates object ---');
{
  const g = evaluateStablePromotionFinalizationGate({
    stable_execution_post_promotion_report: GOOD_REPORT,
    stable_promotion_confirmation_document: GOOD_DOC,
  });
  assert(g.gates.report_ready === true, 'report_ready gate');
  assert(g.gates.confirmation_issued === true, 'confirmation_issued gate');
  assert(g.gates.all_checks_passed === true, 'all_checks_passed gate');
  assert(g.gates.has_confirmation === true, 'has_confirmation gate');
  assert(g.gates.has_state_verified === true, 'has_state_verified gate');
  assert(g.gates.promotion_finalized === true, 'promotion_finalized gate');
}

console.log('--- gates false when report not ready ---');
{
  const g = evaluateStablePromotionFinalizationGate({
    stable_execution_post_promotion_report: { ...GOOD_REPORT, report_ready: false },
    stable_promotion_confirmation_document: GOOD_DOC,
  });
  assert(g.gates.report_ready === false, 'report_ready gate false');
  assert(g.gate_open === false, 'gate_open false');
}

console.log('--- gates false when doc not issued ---');
{
  const g = evaluateStablePromotionFinalizationGate({
    stable_execution_post_promotion_report: GOOD_REPORT,
    stable_promotion_confirmation_document: { document_issued: false, confirmation_id: 'x' },
  });
  assert(g.gates.confirmation_issued === false, 'confirmation_issued gate false');
  assert(g.gate_open === false, 'gate_open false');
}

console.log('--- gate_id deterministic ---');
{
  const g1 = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  const g2 = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g1.gate_id === g2.gate_id, 'gate_id deterministic');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const g1 = evaluateStablePromotionFinalizationGate({});
  assert(g1.system_execution_performed === false, 'blocked: false');
  const g2 = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g2.system_execution_performed === false, 'open: false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g.automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g.release_performed === false, 'release_performed=false');
}

console.log('--- gate_executes_nothing=true ---');
{
  const g = evaluateStablePromotionFinalizationGate({});
  assert(g.gate_executes_nothing === true, 'blocked: true');
}

console.log('--- future_promotion_requires_new_governance_cycle=true ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  assert(g.future_promotion_requires_new_governance_cycle === true, 'future_promotion_requires_new_governance_cycle=true');
}

console.log('--- validate ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  const v = validateStablePromotionFinalizationGate(g);
  assert(v.valid === true, 'validate open');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionFinalizationGate(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render open ---');
{
  const g = evaluateStablePromotionFinalizationGate({ stable_execution_post_promotion_report: GOOD_REPORT, stable_promotion_confirmation_document: GOOD_DOC });
  const txt = renderStablePromotionFinalizationGate(g);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION FINALIZATION GATE V129.0'), 'render title');
  assert(txt.includes('FINALIZATION_GATE_OPEN'), 'open status in output');
  assert(txt.includes('GATES'), 'gates section');
  assert(txt.includes('PASS report_ready'), 'report_ready PASS');
  assert(txt.includes('gate_executes_nothing:'), 'gate_executes_nothing in output');
}

console.log('--- render blocked ---');
{
  const g = evaluateStablePromotionFinalizationGate({});
  const txt = renderStablePromotionFinalizationGate(g);
  assert(txt.includes('FINALIZATION_GATE_BLOCKED'), 'blocked status in output');
}

console.log('--- statuses export ---');
{
  assert(FINALIZATION_GATE_STATUSES.includes('FINALIZATION_GATE_OPEN'), 'open in statuses');
  assert(FINALIZATION_GATE_STATUSES.includes('FINALIZATION_GATE_PARTIAL'), 'partial in statuses');
  assert(FINALIZATION_GATE_STATUSES.includes('FINALIZATION_GATE_BLOCKED'), 'blocked in statuses');
  assert(FINALIZATION_GATE_STATUSES.length === 3, 'exactly 3 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
