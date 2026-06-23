#!/usr/bin/env node
/**
 * Tests — Stable Execution Post-Promotion Report V128.1
 */

import {
  buildPostPromotionReport,
  validatePostPromotionReport,
  renderPostPromotionReport,
  POST_PROMOTION_REPORT_STATUSES,
} from '../stable-execution-post-promotion-report.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_LEDGER = {
  ledger_status:       'POST_PROMOTION_LEDGER_ACTIVE',
  ledger_hash:         'ledger-hash-001',
  event_count:         3,
  has_confirmation:    true,
  has_state_verified:  true,
  promotion_finalized: true,
  events: [
    { sequence: 0, event_type: 'STABLE_EXECUTION_RECEIPT_IMPORTED',     event_hash: 'h0' },
    { sequence: 1, event_type: 'STABLE_EXECUTION_STATE_VERIFIED',        event_hash: 'h1' },
    { sequence: 2, event_type: 'STABLE_EXECUTION_PROMOTION_FINALIZED',   event_hash: 'h2' },
  ],
};

const GOOD_DOC = {
  document_issued:        true,
  confirmation_id:        'confirmation-001',
  governance_baseline_id: 'baseline-001',
  execution_receipt_id:   'exec-receipt-001',
  executed_by:            'human-operator',
  target_stable_ref:      'stable',
  target_tag:             'v128.1-test',
  all_checks_passed:      true,
};

console.log('\n=== stable-execution-post-promotion-report tests ===\n');

console.log('--- null ledger ---');
{
  const r = buildPostPromotionReport({ stable_promotion_confirmation_document: GOOD_DOC });
  assert(r.report_status === 'POST_PROMOTION_REPORT_BLOCKED_LEDGER', 'null ledger → BLOCKED_LEDGER');
  assert(r.report_ready === false, 'report_ready false');
}

console.log('--- empty ledger ---');
{
  const r = buildPostPromotionReport({
    stable_execution_post_promotion_ledger: { ledger_status: 'POST_PROMOTION_LEDGER_EMPTY', events: [] },
    stable_promotion_confirmation_document: GOOD_DOC,
  });
  assert(r.report_status === 'POST_PROMOTION_REPORT_BLOCKED_LEDGER', 'empty ledger → BLOCKED_LEDGER');
}

console.log('--- null confirmation ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER });
  assert(r.report_status === 'POST_PROMOTION_REPORT_BLOCKED_CONFIRMATION', 'null doc → BLOCKED_CONFIRMATION');
  assert(r.report_ready === false, 'report_ready false');
}

console.log('--- doc not issued ---');
{
  const r = buildPostPromotionReport({
    stable_execution_post_promotion_ledger: GOOD_LEDGER,
    stable_promotion_confirmation_document: { document_issued: false },
  });
  assert(r.report_status === 'POST_PROMOTION_REPORT_BLOCKED_CONFIRMATION', 'not-issued doc → BLOCKED_CONFIRMATION');
}

console.log('--- report ready ---');
{
  const r = buildPostPromotionReport({
    stable_execution_post_promotion_ledger: GOOD_LEDGER,
    stable_promotion_confirmation_document: GOOD_DOC,
  });
  assert(r.report_status === 'POST_PROMOTION_REPORT_READY', 'ready status');
  assert(r.report_ready === true, 'report_ready true');
  assert(typeof r.report_id === 'string' && r.report_id.length === 64, 'report_id sha256');
  assert(r.schema_version === 'v128.1', 'schema version');
  assert(r.ledger_hash === 'ledger-hash-001', 'ledger_hash propagated');
  assert(r.confirmation_id === 'confirmation-001', 'confirmation_id propagated');
  assert(r.governance_baseline_id === 'baseline-001', 'governance_baseline_id propagated');
  assert(r.execution_receipt_id === 'exec-receipt-001', 'execution_receipt_id propagated');
  assert(r.executed_by === 'human-operator', 'executed_by propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v128.1-test', 'target_tag propagated');
  assert(r.all_checks_passed === true, 'all_checks_passed propagated');
  assert(r.has_confirmation === true, 'has_confirmation propagated');
  assert(r.has_state_verified === true, 'has_state_verified propagated');
  assert(r.promotion_finalized === true, 'promotion_finalized propagated');
  assert(r.total_events === 3, 'total_events 3');
  assert(Array.isArray(r.event_summary), 'event_summary array');
  assert(r.event_summary.length === 3, 'event_summary length 3');
}

console.log('--- REGRA ABSOLUTA: system_execution_performed=false ---');
{
  const r1 = buildPostPromotionReport({});
  assert(r1.system_execution_performed === false, 'blocked: false');
  const r2 = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r2.system_execution_performed === false, 'ready: false');
}

console.log('--- REGRA ABSOLUTA: automated_promotion_performed=false ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r.automated_promotion_performed === false, 'automated_promotion_performed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promotion_allowed=false ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

console.log('--- REGRA ABSOLUTA: stable_promoted=false ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

console.log('--- REGRA ABSOLUTA: git_push_performed=false ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r.git_push_performed === false, 'git_push_performed=false');
}

console.log('--- REGRA ABSOLUTA: deploy_performed=false ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

console.log('--- REGRA ABSOLUTA: release_performed=false ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- future_promotion_requires_new_governance_cycle=true ---');
{
  const r1 = buildPostPromotionReport({});
  assert(r1.future_promotion_requires_new_governance_cycle === true, 'blocked: true');
  const r2 = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  assert(r2.future_promotion_requires_new_governance_cycle === true, 'ready: true');
}

console.log('--- validate ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  const v = validatePostPromotionReport(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validatePostPromotionReport(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = buildPostPromotionReport({ stable_execution_post_promotion_ledger: GOOD_LEDGER, stable_promotion_confirmation_document: GOOD_DOC });
  const txt = renderPostPromotionReport(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE EXECUTION POST-PROMOTION REPORT V128.1'), 'render title');
  assert(txt.includes('POST_PROMOTION_REPORT_READY'), 'status in output');
  assert(txt.includes('EVENT SUMMARY'), 'event summary section');
  assert(txt.includes('system_execution_performed:'), 'invariant in output');
  assert(txt.includes('future_promotion_requires_new_governance_cycle:'), 'future cycle field in output');
}

console.log('--- render blocked ---');
{
  const r = buildPostPromotionReport({});
  const txt = renderPostPromotionReport(r);
  assert(txt.includes('POST-PROMOTION REPORT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(POST_PROMOTION_REPORT_STATUSES.includes('POST_PROMOTION_REPORT_READY'), 'ready in statuses');
  assert(POST_PROMOTION_REPORT_STATUSES.includes('POST_PROMOTION_REPORT_BLOCKED_LEDGER'), 'ledger blocked in statuses');
  assert(POST_PROMOTION_REPORT_STATUSES.includes('POST_PROMOTION_REPORT_BLOCKED_CONFIRMATION'), 'confirmation blocked in statuses');
  assert(POST_PROMOTION_REPORT_STATUSES.length === 3, 'exactly 3 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
