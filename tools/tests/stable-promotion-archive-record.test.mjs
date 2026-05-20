#!/usr/bin/env node
/**
 * Tests — Stable Promotion Archive Record V129.1
 */

import {
  buildStablePromotionArchiveRecord,
  validateStablePromotionArchiveRecord,
  renderStablePromotionArchiveRecord,
  ARCHIVE_RECORD_STATUSES,
} from '../stable-promotion-archive-record.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_GATE = {
  gate_open:       true,
  gate_id:         'gate-001',
  report_id:       'report-001',
  confirmation_id: 'confirmation-001',
  passed_gates:    6,
  total_gates:     6,
  gates: {
    report_ready:        true,
    confirmation_issued: true,
    all_checks_passed:   true,
    has_confirmation:    true,
    has_state_verified:  true,
    promotion_finalized: true,
  },
};

const GOOD_REPORT = {
  governance_baseline_id: 'baseline-001',
  execution_receipt_id:   'exec-receipt-001',
  executed_by:            'human-operator',
  target_stable_ref:      'stable',
  target_tag:             'v129.1-test',
};

const GOOD_DOC = {
  governance_baseline_id: 'baseline-001',
  execution_receipt_id:   'exec-receipt-001',
  executed_by:            'human-operator',
  target_stable_ref:      'stable',
  target_tag:             'v129.1-test',
};

console.log('\n=== stable-promotion-archive-record tests ===\n');

console.log('--- null gate ---');
{
  const r = buildStablePromotionArchiveRecord({});
  assert(r.archive_status === 'ARCHIVE_RECORD_BLOCKED_GATE', 'null gate → BLOCKED_GATE');
  assert(r.archive_ready === false, 'archive_ready false');
}

console.log('--- gate not open ---');
{
  const r = buildStablePromotionArchiveRecord({
    stable_promotion_finalization_gate: { gate_open: false },
  });
  assert(r.archive_status === 'ARCHIVE_RECORD_BLOCKED_GATE', 'gate not open → BLOCKED_GATE');
}

console.log('--- archive ready ---');
{
  const r = buildStablePromotionArchiveRecord({
    stable_promotion_finalization_gate:     GOOD_GATE,
    stable_execution_post_promotion_report: GOOD_REPORT,
  });
  assert(r.archive_status === 'ARCHIVE_RECORD_READY', 'ready status');
  assert(r.archive_ready === true, 'archive_ready true');
  assert(typeof r.archive_id === 'string' && r.archive_id.length === 64, 'archive_id sha256');
  assert(typeof r.archive_hash === 'string' && r.archive_hash.length === 64, 'archive_hash sha256');
  assert(r.schema_version === 'v129.1', 'schema version');
  assert(r.gate_id === 'gate-001', 'gate_id propagated');
  assert(r.report_id === 'report-001', 'report_id propagated');
  assert(r.confirmation_id === 'confirmation-001', 'confirmation_id propagated');
  assert(r.governance_baseline_id === 'baseline-001', 'governance_baseline_id from report');
  assert(r.execution_receipt_id === 'exec-receipt-001', 'execution_receipt_id from report');
  assert(r.executed_by === 'human-operator', 'executed_by from report');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref from report');
  assert(r.target_tag === 'v129.1-test', 'target_tag from report');
  assert(r.all_checks_passed === true, 'all_checks_passed from gates');
  assert(r.promotion_finalized === true, 'promotion_finalized from gates');
  assert(r.passed_gates === 6, 'passed_gates');
  assert(r.total_gates === 6, 'total_gates');
}

console.log('--- archive ready with doc fallback ---');
{
  const r = buildStablePromotionArchiveRecord({
    stable_promotion_finalization_gate:    GOOD_GATE,
    stable_promotion_confirmation_document: GOOD_DOC,
  });
  assert(r.archive_ready === true, 'ready with doc fallback');
  assert(r.governance_baseline_id === 'baseline-001', 'governance_baseline_id from doc');
}

console.log('--- archive_id deterministic ---');
{
  const r1 = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  const r2 = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r1.archive_id === r2.archive_id, 'archive_id deterministic');
  assert(r1.archive_hash === r2.archive_hash, 'archive_hash deterministic');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const r1 = buildStablePromotionArchiveRecord({});
  assert(r1.system_execution_performed === false, 'blocked: false');
  const r2 = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r2.system_execution_performed === false, 'ready: false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- archive_is_immutable=true ---');
{
  const r1 = buildStablePromotionArchiveRecord({});
  assert(r1.archive_is_immutable === true, 'blocked: true');
  const r2 = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r2.archive_is_immutable === true, 'ready: true');
}

console.log('--- archive_is_post_execution=true ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.archive_is_post_execution === true, 'archive_is_post_execution=true');
}

console.log('--- future_promotion_requires_new_governance_cycle=true ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  assert(r.future_promotion_requires_new_governance_cycle === true, 'future_promotion_requires_new_governance_cycle=true');
}

console.log('--- validate ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  const v = validateStablePromotionArchiveRecord(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionArchiveRecord(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = buildStablePromotionArchiveRecord({ stable_promotion_finalization_gate: GOOD_GATE, stable_execution_post_promotion_report: GOOD_REPORT });
  const txt = renderStablePromotionArchiveRecord(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION ARCHIVE RECORD V129.1'), 'render title');
  assert(txt.includes('ARCHIVE_RECORD_READY'), 'status in output');
  assert(txt.includes('archive_is_immutable:'), 'immutable field in output');
  assert(txt.includes('future_promotion_requires_new_governance_cycle:'), 'future cycle field in output');
}

console.log('--- render blocked ---');
{
  const r = buildStablePromotionArchiveRecord({});
  const txt = renderStablePromotionArchiveRecord(r);
  assert(txt.includes('ARCHIVE RECORD BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(ARCHIVE_RECORD_STATUSES.includes('ARCHIVE_RECORD_READY'), 'ready in statuses');
  assert(ARCHIVE_RECORD_STATUSES.includes('ARCHIVE_RECORD_BLOCKED_GATE'), 'blocked in statuses');
  assert(ARCHIVE_RECORD_STATUSES.length === 2, 'exactly 2 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
