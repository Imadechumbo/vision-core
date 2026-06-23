#!/usr/bin/env node
/**
 * Tests — Stable Review Decision Matrix V112.0
 */

import {
  evaluateStableReviewDecisionMatrix,
  validateStableReviewDecisionMatrix,
  renderStableReviewDecisionMatrix,
  STABLE_REVIEW_DECISION_STATUSES,
} from '../stable-review-decision-matrix.mjs';

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

const DRY_RUN_BINDING = {
  binding_ready:            true,
  binding_status:           'STABLE_REVIEW_BINDING_DRY_RUN_READY',
  binding_id:               'binding-dry-001',
  real_tag_confirmed:       false,
  dry_run_confirmed:        true,
  stable_promotion_allowed: false,
  stable_promoted:          false,
};

const REAL_TAG_BINDING = {
  ...DRY_RUN_BINDING,
  binding_status:     'STABLE_REVIEW_BINDING_REAL_TAG_READY',
  binding_id:         'binding-real-001',
  real_tag_confirmed: true,
  dry_run_confirmed:  false,
};

const MOCK_BINDING = {
  ...DRY_RUN_BINDING,
  binding_id: 'binding-mock-001',
};

console.log('\n=== stable-review-decision-matrix tests ===\n');

// missing binding
console.log('--- missing binding ---');
{
  const r = evaluateStableReviewDecisionMatrix({});
  assert(r.decision_status === 'STABLE_REVIEW_DECISION_BLOCKED_BINDING', 'null binding → BLOCKED_BINDING');
  assert(r.decision_ready === false, 'decision_ready false');
}

// binding not ready
console.log('--- binding not ready ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: { binding_ready: false } });
  assert(r.decision_status === 'STABLE_REVIEW_DECISION_BLOCKED_BINDING', 'not-ready binding → BLOCKED_BINDING');
}

// dry-run only
console.log('--- dry-run only ---');
{
  const r = evaluateStableReviewDecisionMatrix({
    stable_review_binding: DRY_RUN_BINDING,
    tag_operation_mode:    'dry_run',
  });
  assert(r.decision_status === 'STABLE_REVIEW_DECISION_DRY_RUN_ONLY', 'dry-run status');
  assert(r.decision_ready === true, 'decision_ready true');
  assert(r.stable_review_ready === false, 'stable_review_ready false');
  assert(r.real_tag_confirmed === false, 'real_tag_confirmed false');
  assert(r.dry_run_confirmed === true, 'dry_run_confirmed true');
}

// mock real tag only
console.log('--- mock real tag only ---');
{
  const r = evaluateStableReviewDecisionMatrix({
    stable_review_binding: MOCK_BINDING,
    tag_operation_mode:    'mock_real_tag',
  });
  assert(r.decision_status === 'STABLE_REVIEW_DECISION_MOCK_REAL_TAG_ONLY', 'mock_real_tag status');
  assert(r.stable_review_ready === false, 'stable_review_ready false');
}

// real tag eligible (no mode, no real_tag_confirmed, no dry_run_confirmed)
console.log('--- real tag eligible ---');
{
  const noConfirmBinding = {
    binding_ready:            true,
    binding_id:               'binding-noconf-001',
    real_tag_confirmed:       false,
    dry_run_confirmed:        false,
    stable_promotion_allowed: false,
    stable_promoted:          false,
  };
  const r = evaluateStableReviewDecisionMatrix({
    stable_review_binding: noConfirmBinding,
    tag_operation_mode:    'none',
  });
  assert(r.decision_status === 'STABLE_REVIEW_DECISION_REAL_TAG_ELIGIBLE', 'real tag eligible status');
  assert(r.stable_review_ready === false, 'stable_review_ready false');
}

// ready for human stable review (real tag confirmed)
console.log('--- ready for human stable review ---');
{
  const r = evaluateStableReviewDecisionMatrix({
    stable_review_binding: REAL_TAG_BINDING,
    tag_operation_mode:    'real_tag',
  });
  assert(r.decision_status === 'STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW', 'ready status');
  assert(r.stable_review_ready === true, 'stable_review_ready true');
  assert(r.real_tag_confirmed === true, 'real_tag_confirmed true');
  assert(r.schema_version === 'v112.0', 'schema version');
}

// stable_promotion_allowed=false always
console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = evaluateStableReviewDecisionMatrix({ stable_review_binding: DRY_RUN_BINDING, tag_operation_mode: 'dry_run' });
  assert(r1.stable_promotion_allowed === false, 'dry-run: stable_promotion_allowed=false');

  const r2 = evaluateStableReviewDecisionMatrix({ stable_review_binding: REAL_TAG_BINDING, tag_operation_mode: 'real_tag' });
  assert(r2.stable_promotion_allowed === false, 'real-tag: stable_promotion_allowed=false');
}

// stable_promoted=false always
console.log('--- stable_promoted=false ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: REAL_TAG_BINDING, tag_operation_mode: 'real_tag' });
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// deploy_performed=false always
console.log('--- deploy_performed=false ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: DRY_RUN_BINDING, tag_operation_mode: 'dry_run' });
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release_performed=false always
console.log('--- release_performed=false ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: DRY_RUN_BINDING, tag_operation_mode: 'dry_run' });
  assert(r.release_performed === false, 'release_performed=false');
}

// human_stable_review_required=true always
console.log('--- human_stable_review_required=true ---');
{
  const r1 = evaluateStableReviewDecisionMatrix({ stable_review_binding: DRY_RUN_BINDING, tag_operation_mode: 'dry_run' });
  assert(r1.human_stable_review_required === true, 'dry-run: human_stable_review_required=true');

  const r2 = evaluateStableReviewDecisionMatrix({ stable_review_binding: REAL_TAG_BINDING, tag_operation_mode: 'real_tag' });
  assert(r2.human_stable_review_required === true, 'real-tag: human_stable_review_required=true');
}

// blocked_actions present
console.log('--- blocked_actions present ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: DRY_RUN_BINDING, tag_operation_mode: 'dry_run' });
  assert(Array.isArray(r.blocked_actions), 'blocked_actions is array');
  assert(r.blocked_actions.includes('auto_stable_promotion'), 'auto_stable_promotion blocked');
  assert(r.blocked_actions.includes('auto_deploy'), 'auto_deploy blocked');
  assert(r.blocked_actions.includes('ci_stable_execution'), 'ci_stable_execution blocked');
}

// safe_next_actions present
console.log('--- safe_next_actions present ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: REAL_TAG_BINDING, tag_operation_mode: 'real_tag' });
  assert(Array.isArray(r.safe_next_actions), 'safe_next_actions is array');
  assert(r.safe_next_actions.length > 0, 'safe_next_actions not empty');
}

// validate
console.log('--- validate ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: DRY_RUN_BINDING, tag_operation_mode: 'dry_run' });
  const v = validateStableReviewDecisionMatrix(r);
  assert(v.valid === true, 'validate dry-run matrix');
  assert(v.errors.length === 0, 'no errors');
}

// validate real tag
console.log('--- validate real tag ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: REAL_TAG_BINDING, tag_operation_mode: 'real_tag' });
  const v = validateStableReviewDecisionMatrix(r);
  assert(v.valid === true, 'validate real-tag matrix');
}

// render
console.log('--- render ---');
{
  const r = evaluateStableReviewDecisionMatrix({ stable_review_binding: DRY_RUN_BINDING, tag_operation_mode: 'dry_run' });
  const txt = renderStableReviewDecisionMatrix(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE REVIEW DECISION MATRIX'), 'render includes title');
}

// render blocked
console.log('--- render blocked ---');
{
  const r = evaluateStableReviewDecisionMatrix({});
  const txt = renderStableReviewDecisionMatrix(r);
  assert(txt.includes('STABLE REVIEW DECISION BLOCKED'), 'render blocked includes blocked label');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(STABLE_REVIEW_DECISION_STATUSES.includes('STABLE_REVIEW_DECISION_DRY_RUN_ONLY'), 'dry-run in exports');
  assert(STABLE_REVIEW_DECISION_STATUSES.includes('STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW'), 'ready in exports');
  assert(STABLE_REVIEW_DECISION_STATUSES.includes('STABLE_REVIEW_DECISION_MOCK_REAL_TAG_ONLY'), 'mock in exports');
  assert(STABLE_REVIEW_DECISION_STATUSES.includes('STABLE_REVIEW_DECISION_REAL_TAG_ELIGIBLE'), 'eligible in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
