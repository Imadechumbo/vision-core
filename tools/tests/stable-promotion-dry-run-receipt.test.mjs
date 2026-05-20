#!/usr/bin/env node
/**
 * Tests — Stable Promotion Dry-Run Receipt V118.1
 */

import {
  issueStablePromotionDryRunReceipt,
  validateStablePromotionDryRunReceipt,
  renderStablePromotionDryRunReceipt,
  DRY_RUN_RECEIPT_STATUSES,
  RECEIPT_TYPE,
} from '../stable-promotion-dry-run-receipt.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_RESULT = {
  dry_run_ready:            true,
  executor_id:              'executor-001',
  command_block_id:         'block-001',
  target_stable_ref:        'stable',
  target_tag:               'v1.0.0',
  total_commands_simulated: 7,
};

console.log('\n=== stable-promotion-dry-run-receipt tests ===\n');

console.log('--- null result ---');
{
  const r = issueStablePromotionDryRunReceipt({});
  assert(r.receipt_status === 'DRY_RUN_RECEIPT_BLOCKED_EXECUTOR', 'null result → BLOCKED_EXECUTOR');
  assert(r.receipt_issued === false, 'receipt_issued false');
}

console.log('--- result not ready ---');
{
  const r = issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: { dry_run_ready: false } });
  assert(r.receipt_status === 'DRY_RUN_RECEIPT_BLOCKED_EXECUTOR', 'not-ready → BLOCKED_EXECUTOR');
}

console.log('--- issued receipt ---');
{
  const r = issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT });
  assert(r.receipt_status === 'DRY_RUN_RECEIPT_ISSUED', 'issued status');
  assert(r.receipt_issued === true, 'receipt_issued true');
  assert(r.receipt_type === RECEIPT_TYPE, 'receipt_type correct');
  assert(r.executor_id === 'executor-001', 'executor_id propagated');
  assert(r.command_block_id === 'block-001', 'command_block_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.total_commands_simulated === 7, 'total propagated');
  assert(typeof r.receipt_id === 'string' && r.receipt_id.length === 64, 'receipt_id sha256');
  assert(typeof r.content_hash === 'string' && r.content_hash.length === 64, 'content_hash sha256');
  assert(r.schema_version === 'v118.1', 'schema version');
}

console.log('--- receipt_type export ---');
{
  assert(RECEIPT_TYPE === 'stable_promotion_dry_run', 'receipt_type value');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = issueStablePromotionDryRunReceipt({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT });
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT }).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT }).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT }).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT }).release_performed === false, 'release_performed=false');
}

console.log('--- commands_executed=false ---');
{
  assert(issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT }).commands_executed === false, 'commands_executed=false');
}

console.log('--- real_execution_performed=false ---');
{
  assert(issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT }).real_execution_performed === false, 'real_execution_performed=false');
}

console.log('--- validate ---');
{
  const r = issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT });
  const v = validateStablePromotionDryRunReceipt(r);
  assert(v.valid === true, 'validate issued');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionDryRunReceipt(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: GOOD_RESULT });
  const txt = renderStablePromotionDryRunReceipt(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION DRY-RUN RECEIPT'), 'render title');
  assert(txt.includes('stable_promotion_dry_run'), 'receipt type in output');
  assert(txt.includes('commands_executed:        false'), 'invariant in output');
}

console.log('--- render blocked ---');
{
  const r = issueStablePromotionDryRunReceipt({});
  const txt = renderStablePromotionDryRunReceipt(r);
  assert(txt.includes('DRY-RUN RECEIPT BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(DRY_RUN_RECEIPT_STATUSES.includes('DRY_RUN_RECEIPT_ISSUED'), 'issued in statuses');
  assert(DRY_RUN_RECEIPT_STATUSES.includes('DRY_RUN_RECEIPT_BLOCKED_EXECUTOR'), 'blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
