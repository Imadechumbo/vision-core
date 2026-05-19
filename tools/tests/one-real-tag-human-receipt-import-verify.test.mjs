#!/usr/bin/env node
/**
 * Tests — One Real Tag Human Receipt Import + Verify V107.1
 */

import {
  importAndVerifyOneRealTagHumanReceipt,
  validateOneRealTagHumanReceiptVerification,
  renderOneRealTagHumanReceiptVerification,
  RECEIPT_VERIFY_STATUSES,
} from '../one-real-tag-human-receipt-import-verify.mjs';

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

const GOOD_EXPORT = {
  export_ready:       true,
  command_export_id:  'export-verify-test-001',
  target_tag:         'v3.0.0',
  git_head:           'feedface1234567',
};

const DRY_RUN_CAPTURE = {
  capture_ready:       true,
  human_receipt_id:    'receipt-dry-001',
  capture_status:      'RECEIPT_CAPTURE_DRY_RUN_CAPTURED',
  command_export_id:   'export-verify-test-001',
  target_tag:          'v3.0.0',
  git_head:            'feedface1234567',
  tag_created:         false,
  git_push_performed:  false,
  deploy_performed:    false,
  stable_promoted:     false,
  release_performed:   false,
};

const REAL_TAG_CAPTURE = {
  capture_ready:       true,
  human_receipt_id:    'receipt-real-001',
  capture_status:      'RECEIPT_CAPTURE_REAL_TAG_CAPTURED',
  command_export_id:   'export-verify-test-001',
  target_tag:          'v3.0.0',
  git_head:            'feedface1234567',
  tag_created:         true,
  git_push_performed:  true,
  local_tag_verified:  true,
  remote_tag_verified: true,
  local_tag_head:      'feedface1234567',
  remote_tag_head:     'feedface1234567',
  deploy_performed:    false,
  stable_promoted:     false,
  release_performed:   false,
};

const GOOD_DRY_RUN_PARAMS = {
  captured_receipt:           DRY_RUN_CAPTURE,
  command_export:             GOOD_EXPORT,
  observed_local_tag_head:    null,
  observed_remote_tag_head:   null,
  observed_worktree_clean:    true,
  observed_deploy_performed:  false,
  observed_stable_promoted:   false,
  observed_release_performed: false,
};

const GOOD_REAL_TAG_PARAMS = {
  captured_receipt:           REAL_TAG_CAPTURE,
  command_export:             GOOD_EXPORT,
  observed_local_tag_head:    'feedface1234567',
  observed_remote_tag_head:   'feedface1234567',
  observed_worktree_clean:    true,
  observed_deploy_performed:  false,
  observed_stable_promoted:   false,
  observed_release_performed: false,
};

console.log('\n=== one-real-tag-human-receipt-import-verify tests ===\n');

// missing capture
console.log('--- missing capture ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({ ...GOOD_DRY_RUN_PARAMS, captured_receipt: null });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_CAPTURE', 'null capture → BLOCKED_CAPTURE');
  assert(r.verify_ready === false, 'verify_ready false');
}

// capture not ready
console.log('--- capture not ready ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_DRY_RUN_PARAMS,
    captured_receipt: { capture_ready: false },
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_CAPTURE', 'not-ready capture → BLOCKED_CAPTURE');
}

// missing export
console.log('--- missing export ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({ ...GOOD_DRY_RUN_PARAMS, command_export: null });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_EXPORT', 'null export → BLOCKED_EXPORT');
}

// export not ready
console.log('--- export not ready ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_DRY_RUN_PARAMS,
    command_export: { export_ready: false },
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_EXPORT', 'not-ready export → BLOCKED_EXPORT');
}

// dirty worktree
console.log('--- dirty worktree ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_DRY_RUN_PARAMS,
    observed_worktree_clean: false,
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_WORKTREE', 'dirty worktree → BLOCKED_WORKTREE');
}

// deploy detected
console.log('--- deploy detected ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_DRY_RUN_PARAMS,
    observed_deploy_performed: true,
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_DEPLOY', 'deploy=true → BLOCKED_DEPLOY');
}

// stable detected
console.log('--- stable detected ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_DRY_RUN_PARAMS,
    observed_stable_promoted: true,
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_STABLE', 'stable=true → BLOCKED_STABLE');
}

// release detected
console.log('--- release detected ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_DRY_RUN_PARAMS,
    observed_release_performed: true,
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_RELEASE', 'release=true → BLOCKED_RELEASE');
}

// real tag: local head mismatch
console.log('--- local head mismatch ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_REAL_TAG_PARAMS,
    observed_local_tag_head: 'wronghead',
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD', 'local mismatch → BLOCKED_LOCAL_HEAD');
}

// real tag: remote head mismatch
console.log('--- remote head mismatch ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt({
    ...GOOD_REAL_TAG_PARAMS,
    observed_remote_tag_head: 'wrongremote',
  });
  assert(r.verify_status === 'RECEIPT_VERIFY_BLOCKED_REMOTE_HEAD', 'remote mismatch → BLOCKED_REMOTE_HEAD');
}

// dry-run confirmed
console.log('--- dry-run confirmed ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt(GOOD_DRY_RUN_PARAMS);
  assert(r.verify_status === 'RECEIPT_VERIFY_DRY_RUN_CONFIRMED', 'dry-run confirmed');
  assert(r.verify_ready === true, 'verify_ready true');
  assert(r.tag_created === false, 'tag_created false');
  assert(r.actual_real_tag_created === false, 'actual_real_tag_created false');
  assert(r.actual_git_push_performed === false, 'actual_push false');
  assert(r.deploy_performed === false, 'deploy false');
  assert(r.stable_promoted === false, 'stable false');
  assert(r.release_performed === false, 'release false');
  assert(r.schema_version === 'v107.1', 'schema version');
}

// real tag confirmed with mock data
console.log('--- real tag confirmed with mock data ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt(GOOD_REAL_TAG_PARAMS);
  assert(r.verify_status === 'RECEIPT_VERIFY_REAL_TAG_CONFIRMED', 'real tag confirmed');
  assert(r.verify_ready === true, 'verify_ready true');
  assert(r.tag_created === true, 'tag_created true for mock');
  assert(r.actual_real_tag_created === true, 'actual_real_tag_created true for mock');
  assert(r.actual_git_push_performed === true, 'actual_push true for mock');
  assert(r.deploy_performed === false, 'deploy forced false');
  assert(r.stable_promoted === false, 'stable forced false');
  assert(r.release_performed === false, 'release forced false');
  assert(r.observed_local_tag_head === 'feedface1234567', 'local head matches');
  assert(r.observed_remote_tag_head === 'feedface1234567', 'remote head matches');
}

// validate
console.log('--- validate ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt(GOOD_DRY_RUN_PARAMS);
  const v = validateOneRealTagHumanReceiptVerification(r);
  assert(v.valid === true, 'validate dry-run verify');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = importAndVerifyOneRealTagHumanReceipt(GOOD_DRY_RUN_PARAMS);
  const txt = renderOneRealTagHumanReceiptVerification(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('DRY_RUN_CONFIRMED'), 'render includes status');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_DRY_RUN_CONFIRMED'), 'dry-run in exports');
  assert(RECEIPT_VERIFY_STATUSES.includes('RECEIPT_VERIFY_REAL_TAG_CONFIRMED'), 'real-tag in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
