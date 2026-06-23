#!/usr/bin/env node
/**
 * Tests — Stable Review Human Approval Contract V112.1
 */

import {
  buildStableReviewHumanApprovalContract,
  validateStableReviewHumanApprovalContract,
  renderStableReviewHumanApprovalContract,
  STABLE_REVIEW_APPROVAL_STATUSES,
  REQUIRED_APPROVAL_PHRASE,
} from '../stable-review-human-approval-contract.mjs';

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

const DRY_RUN_DECISION = {
  decision_ready:     true,
  decision_id:        'decision-dry-001',
  decision_status:    'STABLE_REVIEW_DECISION_DRY_RUN_ONLY',
  real_tag_confirmed: false,
  dry_run_confirmed:  true,
};

const REAL_TAG_DECISION = {
  decision_ready:     true,
  decision_id:        'decision-real-001',
  decision_status:    'STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW',
  real_tag_confirmed: true,
  dry_run_confirmed:  false,
};

const MOCK_DECISION = {
  decision_ready:     true,
  decision_id:        'decision-mock-001',
  decision_status:    'STABLE_REVIEW_DECISION_MOCK_REAL_TAG_ONLY',
  real_tag_confirmed: false,
  dry_run_confirmed:  true,
};

const GOOD_PARAMS = {
  stable_review_decision_matrix: REAL_TAG_DECISION,
  human_approval_phrase:         REQUIRED_APPROVAL_PHRASE,
  approver_id:                   'human-001',
};

console.log('\n=== stable-review-human-approval-contract tests ===\n');

// missing decision matrix
console.log('--- missing decision matrix ---');
{
  const r = buildStableReviewHumanApprovalContract({ human_approval_phrase: REQUIRED_APPROVAL_PHRASE });
  assert(r.approval_status === 'STABLE_REVIEW_APPROVAL_BLOCKED_DECISION', 'null decision → BLOCKED_DECISION');
  assert(r.approval_ready === false, 'approval_ready false');
}

// decision not ready
console.log('--- decision not ready ---');
{
  const r = buildStableReviewHumanApprovalContract({
    stable_review_decision_matrix: { decision_ready: false },
    human_approval_phrase: REQUIRED_APPROVAL_PHRASE,
  });
  assert(r.approval_status === 'STABLE_REVIEW_APPROVAL_BLOCKED_DECISION', 'not-ready → BLOCKED_DECISION');
}

// wrong phrase
console.log('--- wrong phrase ---');
{
  const r = buildStableReviewHumanApprovalContract({
    stable_review_decision_matrix: REAL_TAG_DECISION,
    human_approval_phrase:         'wrong phrase',
  });
  assert(r.approval_status === 'STABLE_REVIEW_APPROVAL_BLOCKED_PHRASE', 'wrong phrase → BLOCKED_PHRASE');
  assert(r.approval_ready === false, 'approval_ready false');
}

// empty phrase
console.log('--- empty phrase ---');
{
  const r = buildStableReviewHumanApprovalContract({
    stable_review_decision_matrix: REAL_TAG_DECISION,
    human_approval_phrase:         '',
  });
  assert(r.approval_status === 'STABLE_REVIEW_APPROVAL_BLOCKED_PHRASE', 'empty phrase → BLOCKED_PHRASE');
}

// dry-run only
console.log('--- dry-run only ---');
{
  const r = buildStableReviewHumanApprovalContract({
    stable_review_decision_matrix: DRY_RUN_DECISION,
    human_approval_phrase:         REQUIRED_APPROVAL_PHRASE,
  });
  assert(r.approval_status === 'STABLE_REVIEW_APPROVAL_DRY_RUN_ONLY', 'dry-run status');
  assert(r.approval_ready === false, 'approval_ready false');
  assert(r.approval_phrase_verified === true, 'phrase verified');
}

// mock real tag only
console.log('--- mock real tag only ---');
{
  const r = buildStableReviewHumanApprovalContract({
    stable_review_decision_matrix: MOCK_DECISION,
    human_approval_phrase:         REQUIRED_APPROVAL_PHRASE,
  });
  assert(r.approval_status === 'STABLE_REVIEW_APPROVAL_MOCK_REAL_TAG_ONLY', 'mock status');
  assert(r.approval_ready === false, 'approval_ready false');
}

// real tag ready
console.log('--- real tag ready ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  assert(r.approval_status === 'STABLE_REVIEW_APPROVAL_REAL_TAG_READY', 'real tag status');
  assert(r.approval_ready === true, 'approval_ready true');
  assert(r.real_tag_confirmed === true, 'real_tag_confirmed true');
  assert(r.dry_run_confirmed === false, 'dry_run_confirmed false');
  assert(r.approval_phrase_verified === true, 'phrase verified');
  assert(r.schema_version === 'v112.1', 'schema version');
  assert(r.approver_id === 'human-001', 'approver_id set');
  assert(r.decision_id === 'decision-real-001', 'decision_id propagated');
}

// stable_promotion_allowed=false always
console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = buildStableReviewHumanApprovalContract({ stable_review_decision_matrix: DRY_RUN_DECISION, human_approval_phrase: REQUIRED_APPROVAL_PHRASE });
  assert(r1.stable_promotion_allowed === false, 'dry-run: stable_promotion_allowed=false');

  const r2 = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'real-tag: stable_promotion_allowed=false');
}

// stable_promoted=false always
console.log('--- stable_promoted=false ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// deploy_performed=false always
console.log('--- deploy_performed=false ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release_performed=false always
console.log('--- release_performed=false ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  assert(r.release_performed === false, 'release_performed=false');
}

// human_stable_review_required=true always
console.log('--- human_stable_review_required=true ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  assert(r.human_stable_review_required === true, 'human_stable_review_required=true');
}

// future_stable_promotion_command_required=true always
console.log('--- future_stable_promotion_command_required=true ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  assert(r.future_stable_promotion_command_required === true, 'future_stable_promotion_command_required=true');
}

// required phrase export
console.log('--- required phrase export ---');
{
  assert(
    REQUIRED_APPROVAL_PHRASE === 'I APPROVE STABLE REVIEW ONLY AND ACKNOWLEDGE THIS DOES NOT PROMOTE STABLE DEPLOY OR RELEASE',
    'required phrase correct'
  );
}

// validate
console.log('--- validate ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  const v = validateStableReviewHumanApprovalContract(r);
  assert(v.valid === true, 'validate real-tag contract');
  assert(v.errors.length === 0, 'no errors');
}

// render ready
console.log('--- render ready ---');
{
  const r = buildStableReviewHumanApprovalContract(GOOD_PARAMS);
  const txt = renderStableReviewHumanApprovalContract(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE REVIEW HUMAN APPROVAL CONTRACT'), 'render includes title');
}

// render blocked
console.log('--- render blocked ---');
{
  const r = buildStableReviewHumanApprovalContract({ human_approval_phrase: REQUIRED_APPROVAL_PHRASE });
  const txt = renderStableReviewHumanApprovalContract(r);
  assert(txt.includes('STABLE REVIEW APPROVAL BLOCKED'), 'render blocked label');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(STABLE_REVIEW_APPROVAL_STATUSES.includes('STABLE_REVIEW_APPROVAL_REAL_TAG_READY'), 'real-tag in exports');
  assert(STABLE_REVIEW_APPROVAL_STATUSES.includes('STABLE_REVIEW_APPROVAL_DRY_RUN_ONLY'), 'dry-run in exports');
  assert(STABLE_REVIEW_APPROVAL_STATUSES.includes('STABLE_REVIEW_APPROVAL_BLOCKED_PHRASE'), 'blocked-phrase in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
