#!/usr/bin/env node
/**
 * Tests — Stable Review Report V113.1
 */

import {
  buildStableReviewReport,
  validateStableReviewReport,
  renderStableReviewReport,
  STABLE_REVIEW_REPORT_STATUSES,
} from '../stable-review-report.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function makeLedger(event_types) {
  return {
    ledger_ready: true,
    ledger_id:    'ledger-test-001',
    event_count:  event_types.length,
    events:       event_types.map(t => ({ event_type: t })),
  };
}

const FULL_LEDGER = makeLedger([
  'STABLE_REVIEW_CONTRACT_READY',
  'STABLE_REVIEW_EVIDENCE_BOUND',
  'STABLE_REVIEW_DECISION_READY',
  'STABLE_REVIEW_HUMAN_APPROVAL_READY',
]);

const DRY_LEDGER = makeLedger([]);

const PARTIAL_LEDGER = makeLedger([
  'STABLE_REVIEW_CONTRACT_READY',
  'STABLE_REVIEW_EVIDENCE_BOUND',
  'STABLE_REVIEW_DECISION_READY',
]);

const BLOCKED_LEDGER = makeLedger([
  'STABLE_REVIEW_CONTRACT_READY',
  'STABLE_REVIEW_BLOCKED',
]);

console.log('\n=== stable-review-report tests ===\n');

// missing ledger
console.log('--- missing ledger ---');
{
  const r = buildStableReviewReport({});
  assert(r.report_status === 'STABLE_REVIEW_REPORT_BLOCKED_LEDGER', 'null ledger → BLOCKED_LEDGER');
  assert(r.report_ready === false, 'report_ready false');
  assert(r.stable_preflight_allowed === false, 'stable_preflight_allowed false');
}

// ledger not ready
console.log('--- ledger not ready ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: { ledger_ready: false } });
  assert(r.report_status === 'STABLE_REVIEW_REPORT_BLOCKED_LEDGER', 'not-ready → BLOCKED_LEDGER');
}

// dry-run only (empty ledger)
console.log('--- dry-run only ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: DRY_LEDGER });
  assert(r.report_status === 'STABLE_REVIEW_REPORT_DRY_RUN_ONLY', 'dry-run status');
  assert(r.report_ready === false, 'report_ready false');
  assert(r.stable_preflight_allowed === false, 'stable_preflight_allowed false');
}

// blocked event
console.log('--- blocked event ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: BLOCKED_LEDGER });
  assert(r.report_status === 'STABLE_REVIEW_REPORT_DRY_RUN_ONLY', 'blocked → DRY_RUN_ONLY');
  assert(r.stable_preflight_allowed === false, 'stable_preflight_allowed false when blocked');
}

// mock real tag only (partial)
console.log('--- mock real tag only ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: PARTIAL_LEDGER });
  assert(r.report_status === 'STABLE_REVIEW_REPORT_MOCK_REAL_TAG_ONLY', 'partial → MOCK_REAL_TAG_ONLY');
  assert(r.stable_preflight_allowed === false, 'stable_preflight_allowed false');
}

// real tag approved (full ledger)
console.log('--- real tag approved ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  assert(r.report_status === 'STABLE_REVIEW_REPORT_REAL_TAG_APPROVED', 'full → REAL_TAG_APPROVED');
  assert(r.report_ready === true, 'report_ready true');
  assert(r.real_tag_confirmed === true, 'real_tag_confirmed true');
  assert(r.stable_preflight_allowed === true, 'stable_preflight_allowed true');
  assert(r.has_contract === true, 'has_contract true');
  assert(r.has_evidence === true, 'has_evidence true');
  assert(r.has_decision === true, 'has_decision true');
  assert(r.has_approval === true, 'has_approval true');
  assert(r.schema_version === 'v113.1', 'schema version');
}

// stable_promotion_allowed=false always
console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = buildStableReviewReport({ stable_review_ledger: DRY_LEDGER });
  assert(r1.stable_promotion_allowed === false, 'dry-run: stable_promotion_allowed=false');

  const r2 = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  assert(r2.stable_promotion_allowed === false, 'full: stable_promotion_allowed=false');
}

// stable_promoted=false always
console.log('--- stable_promoted=false ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// deploy_performed=false always
console.log('--- deploy_performed=false ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release_performed=false always
console.log('--- release_performed=false ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  assert(r.release_performed === false, 'release_performed=false');
}

// future_stable_promotion_command_required=true always
console.log('--- future_stable_promotion_command_required=true ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  assert(r.future_stable_promotion_command_required === true, 'future_stable_promotion_command_required=true');
}

// validate
console.log('--- validate ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  const v = validateStableReviewReport(r);
  assert(v.valid === true, 'validate full report');
  assert(v.errors.length === 0, 'no errors');
}

// render ready
console.log('--- render ready ---');
{
  const r = buildStableReviewReport({ stable_review_ledger: FULL_LEDGER });
  const txt = renderStableReviewReport(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE REVIEW REPORT'), 'render includes title');
}

// render blocked
console.log('--- render blocked ---');
{
  const r = buildStableReviewReport({});
  const txt = renderStableReviewReport(r);
  assert(txt.includes('STABLE REVIEW REPORT BLOCKED'), 'render blocked label');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(STABLE_REVIEW_REPORT_STATUSES.includes('STABLE_REVIEW_REPORT_REAL_TAG_APPROVED'), 'approved in exports');
  assert(STABLE_REVIEW_REPORT_STATUSES.includes('STABLE_REVIEW_REPORT_DRY_RUN_ONLY'), 'dry-run in exports');
  assert(STABLE_REVIEW_REPORT_STATUSES.includes('STABLE_REVIEW_REPORT_BLOCKED_LEDGER'), 'blocked in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
