#!/usr/bin/env node
/**
 * Tests — One Real Tag Human Receipt Capture V107.0
 */

import {
  captureOneRealTagHumanReceipt,
  validateOneRealTagHumanReceiptCapture,
  renderOneRealTagHumanReceiptCapture,
  RECEIPT_CAPTURE_STATUSES,
} from '../one-real-tag-human-receipt-capture.mjs';

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
  command_export_id:  'export-test-001',
  target_tag:         'v2.0.0',
  git_head:           'cafebabe1234567',
};

const DRY_RUN_RECEIPT = {
  target_tag:          'v2.0.0',
  git_head:            'cafebabe1234567',
  evidence_receipt_id: 'evidence-001',
  rollback_anchor_id:  'rollback-001',
  executed_by:         'alice',
  executed_at:         '2026-05-19T10:00:00Z',
  local_tag_verified:  false,
  remote_tag_verified: false,
  tag_created:         false,
  git_push_performed:  false,
  deploy_performed:    false,
  stable_promoted:     false,
  release_performed:   false,
  notes:               'dry run test',
};

const REAL_TAG_RECEIPT = {
  target_tag:          'v2.0.0',
  git_head:            'cafebabe1234567',
  evidence_receipt_id: 'evidence-001',
  rollback_anchor_id:  'rollback-001',
  executed_by:         'alice',
  executed_at:         '2026-05-19T10:00:00Z',
  local_tag_verified:  true,
  remote_tag_verified: true,
  local_tag_head:      'cafebabe1234567',
  remote_tag_head:     'cafebabe1234567',
  tag_created:         true,
  git_push_performed:  true,
  deploy_performed:    false,
  stable_promoted:     false,
  release_performed:   false,
  notes:               'real tag mock receipt',
};

console.log('\n=== one-real-tag-human-receipt-capture tests ===\n');

// missing export
console.log('--- missing export ---');
{
  const r = captureOneRealTagHumanReceipt({ command_export: null, receipt_data: DRY_RUN_RECEIPT });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_EXPORT', 'null export → BLOCKED_EXPORT');
  assert(r.capture_ready === false, 'capture_ready false');
}

// export not ready
console.log('--- export not ready ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: { export_ready: false, target_tag: 'v2.0.0', git_head: 'cafebabe1234567' },
    receipt_data: DRY_RUN_RECEIPT,
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_EXPORT', 'not-ready export → BLOCKED_EXPORT');
}

// bad schema
console.log('--- bad schema ---');
{
  const r = captureOneRealTagHumanReceipt({ command_export: GOOD_EXPORT, receipt_data: null });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'null receipt_data → BLOCKED_SCHEMA');
}

// tag mismatch
console.log('--- tag mismatch ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...DRY_RUN_RECEIPT, target_tag: 'v9.9.9' },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'tag mismatch → BLOCKED_SCHEMA');
}

// head mismatch
console.log('--- head mismatch ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...DRY_RUN_RECEIPT, git_head: 'deadbeef' },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'head mismatch → BLOCKED_SCHEMA');
}

// dry-run captured
console.log('--- dry-run captured ---');
{
  const r = captureOneRealTagHumanReceipt({ command_export: GOOD_EXPORT, receipt_data: DRY_RUN_RECEIPT });
  assert(r.capture_status === 'RECEIPT_CAPTURE_DRY_RUN_CAPTURED', 'dry-run status');
  assert(r.capture_ready === true, 'capture_ready true');
  assert(r.tag_created === false, 'tag_created false');
  assert(r.git_push_performed === false, 'push false');
  assert(r.deploy_performed === false, 'deploy false');
  assert(r.stable_promoted === false, 'stable false');
  assert(r.release_performed === false, 'release false');
  assert(r.schema_version === 'v107.0', 'schema version');
  assert(typeof r.human_receipt_id === 'string', 'receipt_id present');
}

// real tag captured with mock receipt
console.log('--- real tag captured with mock receipt ---');
{
  const r = captureOneRealTagHumanReceipt({ command_export: GOOD_EXPORT, receipt_data: REAL_TAG_RECEIPT });
  assert(r.capture_status === 'RECEIPT_CAPTURE_REAL_TAG_CAPTURED', 'real tag status');
  assert(r.capture_ready === true, 'capture_ready true');
  assert(r.tag_created === true, 'tag_created true for mock receipt');
  assert(r.git_push_performed === true, 'push true for mock receipt');
  assert(r.local_tag_verified === true, 'local verified true');
  assert(r.remote_tag_verified === true, 'remote verified true');
  assert(r.deploy_performed === false, 'deploy forced false');
  assert(r.stable_promoted === false, 'stable forced false');
  assert(r.release_performed === false, 'release forced false');
}

// real tag requires push
console.log('--- real tag requires push ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...REAL_TAG_RECEIPT, git_push_performed: false },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'real tag without push → BLOCKED');
}

// real tag requires local verified
console.log('--- real tag requires local verified ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...REAL_TAG_RECEIPT, local_tag_verified: false },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'real tag without local verify → BLOCKED');
}

// real tag requires remote verified
console.log('--- real tag requires remote verified ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...REAL_TAG_RECEIPT, remote_tag_verified: false },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'real tag without remote verify → BLOCKED');
}

// deploy detected blocked
console.log('--- deploy detected blocked ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...DRY_RUN_RECEIPT, deploy_performed: true },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'deploy=true → BLOCKED');
}

// stable detected blocked
console.log('--- stable detected blocked ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...DRY_RUN_RECEIPT, stable_promoted: true },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'stable=true → BLOCKED');
}

// release detected blocked
console.log('--- release detected blocked ---');
{
  const r = captureOneRealTagHumanReceipt({
    command_export: GOOD_EXPORT,
    receipt_data: { ...DRY_RUN_RECEIPT, release_performed: true },
  });
  assert(r.capture_status === 'RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'release=true → BLOCKED');
}

// validate
console.log('--- validate ---');
{
  const r = captureOneRealTagHumanReceipt({ command_export: GOOD_EXPORT, receipt_data: DRY_RUN_RECEIPT });
  const v = validateOneRealTagHumanReceiptCapture(r);
  assert(v.valid === true, 'validate dry-run capture');
  assert(v.errors.length === 0, 'no errors');
}

// render
console.log('--- render ---');
{
  const r = captureOneRealTagHumanReceipt({ command_export: GOOD_EXPORT, receipt_data: DRY_RUN_RECEIPT });
  const txt = renderOneRealTagHumanReceiptCapture(r);
  assert(typeof txt === 'string', 'render returns string');
  assert(txt.includes('DRY_RUN_CAPTURED'), 'render includes status');
}

// statuses export
console.log('--- statuses export ---');
{
  assert(RECEIPT_CAPTURE_STATUSES.includes('RECEIPT_CAPTURE_DRY_RUN_CAPTURED'), 'dry-run in exports');
  assert(RECEIPT_CAPTURE_STATUSES.includes('RECEIPT_CAPTURE_REAL_TAG_CAPTURED'), 'real-tag in exports');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
