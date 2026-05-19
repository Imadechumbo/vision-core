#!/usr/bin/env node
/**
 * Tests — One Real Tag Executed Baseline V110.0
 */

import {
  buildOneRealTagExecutedBaseline,
  validateOneRealTagExecutedBaseline,
  renderOneRealTagExecutedBaseline,
  ONE_TAG_BASELINE_STATUSES,
} from '../one-real-tag-executed-baseline.mjs';

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

const ALL_SCRIPTS = [
  'test:exec-packet-unit',
  'test:local-cmd-export-unit',
  'test:receipt-capture-unit',
  'test:receipt-import-verify-unit',
  'test:post-verify-ledger-unit',
  'test:rollback-readiness-unit',
  'test:tag-op-final-report-unit',
  'test:one-tag-executed-baseline-unit',
];

console.log('\n=== one-real-tag-executed-baseline tests ===\n');

// module missing (simulate by not passing scripts only — module check uses filesystem)
console.log('--- module check (filesystem) ---');
{
  // Modules should exist on this branch
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  assert(r.one_tag_baseline_status !== 'ONE_TAG_BASELINE_BLOCKED_MODULES', 'modules exist on filesystem');
}

// test script missing
console.log('--- test missing ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: [] });
  assert(r.one_tag_baseline_status === 'ONE_TAG_BASELINE_BLOCKED_TESTS', 'no scripts → BLOCKED_TESTS');
  assert(r.one_tag_baseline_ready === false, 'ready false');
}

// partial scripts
console.log('--- partial scripts ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ['test:exec-packet-unit'] });
  assert(r.one_tag_baseline_status === 'ONE_TAG_BASELINE_BLOCKED_TESTS', 'partial scripts → BLOCKED_TESTS');
}

// command ready baseline
console.log('--- command ready baseline ---');
{
  // Full scripts triggers pipeline execution
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  // Any non-blocked status is valid (pipeline runs)
  assert(r.one_tag_baseline_status !== 'ONE_TAG_BASELINE_BLOCKED_TESTS', 'not blocked on tests');
  assert(r.one_tag_baseline_status !== 'ONE_TAG_BASELINE_BLOCKED_MODULES', 'not blocked on modules');
}

// full baseline ready
console.log('--- full baseline ready ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  assert(r.one_tag_baseline_ready === true, 'baseline_ready true');
  assert(r.schema_version === 'v110.0', 'schema version');
  assert(r.baseline_version === 'v110.0', 'baseline_version');
  assert(typeof r.baseline_id === 'string', 'baseline_id present');
}

// dry-run confirmed baseline
console.log('--- dry-run confirmed baseline ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  assert(
    r.one_tag_baseline_status === 'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED' ||
    r.one_tag_baseline_status === 'ONE_TAG_BASELINE_COMMAND_READY' ||
    r.one_tag_baseline_status === 'ONE_TAG_BASELINE_REAL_TAG_CONFIRMED',
    'status is a valid ready state'
  );
}

// pipelines verified
console.log('--- pipelines verified ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  assert(r.command_ready_pipeline_verified === true, 'command_ready_pipeline_verified');
  assert(r.dry_run_pipeline_verified === true, 'dry_run_pipeline_verified');
  assert(r.mock_real_tag_pipeline_verified === true, 'mock_real_tag_pipeline_verified');
  assert(r.rollback_readiness_verified === true, 'rollback_readiness_verified');
  assert(r.report_verified === true, 'report_verified');
}

// rollback readiness verified
console.log('--- rollback readiness verified ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  assert(r.rollback_readiness_verified === true, 'rollback_readiness_verified true');
}

// invariants
console.log('--- invariants ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  assert(r.actual_real_tag_created === false, 'actual_real_tag_created=false by default');
  assert(r.actual_git_push_performed === false, 'actual_git_push_performed=false by default');
  assert(r.stable_promoted === false, 'stable_promoted=false');
  assert(r.deploy_performed === false, 'deploy_performed=false');
  assert(r.release_performed === false, 'release_performed=false');
  assert(r.stable_review_allowed === false, 'stable_review_allowed=false by default');
}

// validate
console.log('--- validate ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  const v = validateOneRealTagExecutedBaseline(r);
  assert(v.valid === true, 'validate ready baseline');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = buildOneRealTagExecutedBaseline({ pkg_scripts: ALL_SCRIPTS });
  const txt = renderOneRealTagExecutedBaseline(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('ONE REAL TAG EXECUTED BASELINE'), 'render includes title');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(ONE_TAG_BASELINE_STATUSES.includes('ONE_TAG_BASELINE_DRY_RUN_CONFIRMED'), 'dry-run in exports');
  assert(ONE_TAG_BASELINE_STATUSES.includes('ONE_TAG_BASELINE_REAL_TAG_CONFIRMED'), 'real-tag in exports');
  assert(ONE_TAG_BASELINE_STATUSES.includes('ONE_TAG_BASELINE_COMMAND_READY'), 'command-ready in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
