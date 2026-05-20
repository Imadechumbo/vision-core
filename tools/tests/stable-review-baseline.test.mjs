#!/usr/bin/env node
/**
 * Tests — Stable Review Baseline V115.0
 */

import {
  buildStableReviewBaseline,
  validateStableReviewBaseline,
  renderStableReviewBaseline,
  STABLE_REVIEW_BASELINE_STATUSES,
} from '../stable-review-baseline.mjs';

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

console.log('\n=== stable-review-baseline tests ===\n');

// dry-run baseline (default run)
console.log('--- dry-run baseline ---');
{
  const r = buildStableReviewBaseline();
  assert(
    r.stable_review_baseline_status === 'STABLE_REVIEW_BASELINE_READY_FOR_FUTURE_STABLE_PREFLIGHT',
    'baseline ready status'
  );
  assert(r.stable_review_baseline_ready === true, 'stable_review_baseline_ready true');
  assert(r.schema_version === 'v115.0', 'schema version');
  assert(r.baseline_version === 'v115.0', 'baseline version');
}

// modules verified
console.log('--- modules verified ---');
{
  const r = buildStableReviewBaseline();
  assert(r.modules_verified === true, 'modules_verified true');
}

// dry_run_pipeline_verified
console.log('--- dry_run_pipeline_verified ---');
{
  const r = buildStableReviewBaseline();
  assert(r.dry_run_pipeline_verified === true, 'dry_run_pipeline_verified true');
}

// mock_real_tag_pipeline_verified
console.log('--- mock_real_tag_pipeline_verified ---');
{
  const r = buildStableReviewBaseline();
  assert(r.mock_real_tag_pipeline_verified === true, 'mock_real_tag_pipeline_verified true');
}

// stable_preflight_pipeline_verified
console.log('--- stable_preflight_pipeline_verified ---');
{
  const r = buildStableReviewBaseline();
  assert(r.stable_preflight_pipeline_verified === true, 'stable_preflight_pipeline_verified true');
}

// ledger_verified
console.log('--- ledger_verified ---');
{
  const r = buildStableReviewBaseline();
  assert(r.ledger_verified === true, 'ledger_verified true');
}

// report_verified
console.log('--- report_verified ---');
{
  const r = buildStableReviewBaseline();
  assert(r.report_verified === true, 'report_verified true');
}

// preflight_verified
console.log('--- preflight_verified ---');
{
  const r = buildStableReviewBaseline();
  assert(r.preflight_verified === true, 'preflight_verified true');
}

// stable_promotion_allowed=false always
console.log('--- stable_promotion_allowed=false ---');
{
  const r = buildStableReviewBaseline();
  assert(r.stable_promotion_allowed === false, 'stable_promotion_allowed=false');
}

// stable_promoted=false always
console.log('--- stable_promoted=false ---');
{
  const r = buildStableReviewBaseline();
  assert(r.stable_promoted === false, 'stable_promoted=false');
}

// deploy_performed=false always
console.log('--- deploy_performed=false ---');
{
  const r = buildStableReviewBaseline();
  assert(r.deploy_performed === false, 'deploy_performed=false');
}

// release_performed=false always
console.log('--- release_performed=false ---');
{
  const r = buildStableReviewBaseline();
  assert(r.release_performed === false, 'release_performed=false');
}

// future_stable_promotion_command_required=true always
console.log('--- future_stable_promotion_command_required=true ---');
{
  const r = buildStableReviewBaseline();
  assert(r.future_stable_promotion_command_required === true, 'future_stable_promotion_command_required=true');
}

// validate
console.log('--- validate ---');
{
  const r = buildStableReviewBaseline();
  const v = validateStableReviewBaseline(r);
  assert(v.valid === true, 'validate baseline');
  assert(v.errors.length === 0, 'no errors');
}

// render ready
console.log('--- render ready ---');
{
  const r = buildStableReviewBaseline();
  const txt = renderStableReviewBaseline(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('STABLE REVIEW BASELINE'), 'render includes title');
}

// render blocked (simulate null)
console.log('--- render blocked ---');
{
  const txt = renderStableReviewBaseline(null);
  assert(txt.includes('STABLE REVIEW BASELINE BLOCKED'), 'render null → blocked label');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(
    STABLE_REVIEW_BASELINE_STATUSES.includes('STABLE_REVIEW_BASELINE_READY_FOR_FUTURE_STABLE_PREFLIGHT'),
    'ready in exports'
  );
  assert(
    STABLE_REVIEW_BASELINE_STATUSES.includes('STABLE_REVIEW_BASELINE_BLOCKED_MODULES'),
    'blocked-modules in exports'
  );
  assert(
    STABLE_REVIEW_BASELINE_STATUSES.includes('STABLE_REVIEW_BASELINE_BLOCKED_PIPELINE'),
    'blocked-pipeline in exports'
  );
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
