#!/usr/bin/env node
/**
 * Tests — Stable Promotion Safety Lock V119.0
 */

import {
  evaluateStablePromotionSafetyLock,
  validateStablePromotionSafetyLock,
  renderStablePromotionSafetyLock,
  SAFETY_LOCK_STATUSES,
} from '../stable-promotion-safety-lock.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_RECEIPT = {
  receipt_issued:           true,
  receipt_id:               'receipt-001',
  receipt_type:             'stable_promotion_dry_run',
  command_block_id:         'block-001',
  target_stable_ref:        'stable',
  target_tag:               'v1.0.0',
  total_commands_simulated: 7,
};

console.log('\n=== stable-promotion-safety-lock tests ===\n');

console.log('--- null receipt ---');
{
  const r = evaluateStablePromotionSafetyLock({});
  assert(r.lock_status === 'SAFETY_LOCK_BLOCKED_RECEIPT', 'null receipt → BLOCKED_RECEIPT');
  assert(r.lock_issued === false, 'lock_issued false');
}

console.log('--- receipt not issued ---');
{
  const r = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: { receipt_issued: false } });
  assert(r.lock_status === 'SAFETY_LOCK_BLOCKED_RECEIPT', 'not-issued → BLOCKED_RECEIPT');
}

console.log('--- ci_environment blocked ---');
{
  const r = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT, ci_environment: true });
  assert(r.lock_status === 'SAFETY_LOCK_BLOCKED_CI', 'ci_environment → BLOCKED_CI');
  assert(r.lock_issued === false, 'lock_issued false');
}

console.log('--- github_actions blocked ---');
{
  const r = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT, github_actions: true });
  assert(r.lock_status === 'SAFETY_LOCK_BLOCKED_CI', 'github_actions → BLOCKED_CI');
}

console.log('--- dirty_worktree blocked ---');
{
  const r = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT, dirty_worktree: true });
  assert(r.lock_status === 'SAFETY_LOCK_BLOCKED_DIRTY_WORKTREE', 'dirty_worktree → BLOCKED_DIRTY_WORKTREE');
  assert(r.lock_issued === false, 'lock_issued false');
}

console.log('--- lock active ---');
{
  const r = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT });
  assert(r.lock_status === 'SAFETY_LOCK_ACTIVE', 'active status');
  assert(r.lock_issued === true, 'lock_issued true');
  assert(r.receipt_id === 'receipt-001', 'receipt_id propagated');
  assert(r.receipt_type === 'stable_promotion_dry_run', 'receipt_type propagated');
  assert(r.command_block_id === 'block-001', 'command_block_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.total_commands_simulated === 7, 'total propagated');
  assert(typeof r.lock_id === 'string' && r.lock_id.length === 64, 'lock_id sha256');
  assert(r.schema_version === 'v119.0', 'schema version');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = evaluateStablePromotionSafetyLock({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT });
  assert(r2.stable_promotion_allowed === false, 'active: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT }).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT }).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT }).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT }).release_performed === false, 'release_performed=false');
}

console.log('--- safety_lock_active=true ---');
{
  const r1 = evaluateStablePromotionSafetyLock({});
  assert(r1.safety_lock_active === true, 'blocked: true');
  const r2 = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT });
  assert(r2.safety_lock_active === true, 'active: true');
}

console.log('--- future_human_execution_required=true ---');
{
  assert(evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT }).future_human_execution_required === true, 'future_human_execution_required=true');
}

console.log('--- automated_execution_forbidden=true ---');
{
  assert(evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT }).automated_execution_forbidden === true, 'automated_execution_forbidden=true');
}

console.log('--- validate ---');
{
  const r = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT });
  const v = validateStablePromotionSafetyLock(r);
  assert(v.valid === true, 'validate active');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate blocked ---');
{
  const r = evaluateStablePromotionSafetyLock({});
  const v = validateStablePromotionSafetyLock(r);
  assert(v.valid === true, 'blocked validates ok');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionSafetyLock(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render active ---');
{
  const r = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: GOOD_RECEIPT });
  const txt = renderStablePromotionSafetyLock(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION SAFETY LOCK'), 'render title');
  assert(txt.includes('SAFETY_LOCK_ACTIVE'), 'status in output');
  assert(txt.includes('safety_lock_active:'), 'lock field in output');
  assert(txt.includes('future_human_execution_required:'), 'human exec field in output');
}

console.log('--- render blocked ---');
{
  const r = evaluateStablePromotionSafetyLock({});
  const txt = renderStablePromotionSafetyLock(r);
  assert(txt.includes('SAFETY LOCK BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(SAFETY_LOCK_STATUSES.includes('SAFETY_LOCK_ACTIVE'), 'active in statuses');
  assert(SAFETY_LOCK_STATUSES.includes('SAFETY_LOCK_BLOCKED_RECEIPT'), 'receipt blocked in statuses');
  assert(SAFETY_LOCK_STATUSES.includes('SAFETY_LOCK_BLOCKED_CI'), 'ci blocked in statuses');
  assert(SAFETY_LOCK_STATUSES.includes('SAFETY_LOCK_BLOCKED_DIRTY_WORKTREE'), 'dirty worktree in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
