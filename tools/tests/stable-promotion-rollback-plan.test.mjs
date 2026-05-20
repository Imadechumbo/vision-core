#!/usr/bin/env node
/**
 * Tests — Stable Promotion Rollback Plan V119.1
 */

import {
  buildStablePromotionRollbackPlan,
  validateStablePromotionRollbackPlan,
  renderStablePromotionRollbackPlan,
  ROLLBACK_PLAN_STATUSES,
} from '../stable-promotion-rollback-plan.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const GOOD_LOCK = {
  lock_issued:        true,
  lock_id:            'lock-001',
  target_stable_ref:  'stable',
  target_tag:         'v1.0.0',
};
const GOOD_PARAMS = {
  stable_promotion_safety_lock: GOOD_LOCK,
  rollback_anchor_ref:          'v0.9.0',
  rollback_anchor_tag:          'v0.9.0',
};

console.log('\n=== stable-promotion-rollback-plan tests ===\n');

console.log('--- null lock ---');
{
  const r = buildStablePromotionRollbackPlan({});
  assert(r.plan_status === 'ROLLBACK_PLAN_BLOCKED_LOCK', 'null lock → BLOCKED_LOCK');
  assert(r.plan_ready === false, 'plan_ready false');
}

console.log('--- lock not issued ---');
{
  const r = buildStablePromotionRollbackPlan({ stable_promotion_safety_lock: { lock_issued: false } });
  assert(r.plan_status === 'ROLLBACK_PLAN_BLOCKED_LOCK', 'not-issued → BLOCKED_LOCK');
}

console.log('--- plan ready ---');
{
  const r = buildStablePromotionRollbackPlan(GOOD_PARAMS);
  assert(r.plan_status === 'ROLLBACK_PLAN_READY', 'ready status');
  assert(r.plan_ready === true, 'plan_ready true');
  assert(r.lock_id === 'lock-001', 'lock_id propagated');
  assert(r.target_stable_ref === 'stable', 'target_stable_ref propagated');
  assert(r.target_tag === 'v1.0.0', 'target_tag propagated');
  assert(r.rollback_anchor_ref === 'v0.9.0', 'rollback_anchor_ref propagated');
  assert(r.rollback_anchor_tag === 'v0.9.0', 'rollback_anchor_tag propagated');
  assert(Array.isArray(r.rollback_steps), 'rollback_steps array');
  assert(r.rollback_steps.length > 0, 'rollback_steps not empty');
  assert(r.rollback_steps.some(s => s.includes('git branch')), 'rollback has git branch');
  assert(r.rollback_steps.some(s => s.includes('git push')), 'rollback has git push');
  assert(Array.isArray(r.verification_steps), 'verification_steps array');
  assert(r.verification_steps.length > 0, 'verification_steps not empty');
  assert(Array.isArray(r.trigger_conditions), 'trigger_conditions array');
  assert(r.trigger_conditions.length > 0, 'trigger_conditions not empty');
  assert(typeof r.plan_id === 'string' && r.plan_id.length === 64, 'plan_id sha256');
  assert(r.schema_version === 'v119.1', 'schema version');
}

console.log('--- rollback steps use anchor ---');
{
  const r = buildStablePromotionRollbackPlan(GOOD_PARAMS);
  assert(r.rollback_steps.some(s => s.includes('v0.9.0')), 'anchor in rollback step');
}

console.log('--- stable_promotion_allowed=false ---');
{
  const r1 = buildStablePromotionRollbackPlan({});
  assert(r1.stable_promotion_allowed === false, 'blocked: false');
  const r2 = buildStablePromotionRollbackPlan(GOOD_PARAMS);
  assert(r2.stable_promotion_allowed === false, 'ready: false');
}

console.log('--- stable_promoted=false ---');
{
  assert(buildStablePromotionRollbackPlan(GOOD_PARAMS).stable_promoted === false, 'stable_promoted=false');
}

console.log('--- git_push_performed=false ---');
{
  assert(buildStablePromotionRollbackPlan(GOOD_PARAMS).git_push_performed === false, 'git_push_performed=false');
}

console.log('--- deploy_performed=false ---');
{
  assert(buildStablePromotionRollbackPlan(GOOD_PARAMS).deploy_performed === false, 'deploy_performed=false');
}

console.log('--- release_performed=false ---');
{
  assert(buildStablePromotionRollbackPlan(GOOD_PARAMS).release_performed === false, 'release_performed=false');
}

console.log('--- rollback_executed=false ---');
{
  assert(buildStablePromotionRollbackPlan(GOOD_PARAMS).rollback_executed === false, 'rollback_executed=false');
}

console.log('--- rollback_is_future_human_action=true ---');
{
  const r1 = buildStablePromotionRollbackPlan({});
  assert(r1.rollback_is_future_human_action === true, 'blocked: true');
  const r2 = buildStablePromotionRollbackPlan(GOOD_PARAMS);
  assert(r2.rollback_is_future_human_action === true, 'ready: true');
}

console.log('--- validate ---');
{
  const r = buildStablePromotionRollbackPlan(GOOD_PARAMS);
  const v = validateStablePromotionRollbackPlan(r);
  assert(v.valid === true, 'validate ready');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate null ---');
{
  const v = validateStablePromotionRollbackPlan(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- render ready ---');
{
  const r = buildStablePromotionRollbackPlan(GOOD_PARAMS);
  const txt = renderStablePromotionRollbackPlan(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('STABLE PROMOTION ROLLBACK PLAN'), 'render title');
  assert(txt.includes('ROLLBACK STEPS'), 'steps section');
  assert(txt.includes('rollback_executed:'), 'invariant in output');
  assert(txt.includes('rollback_is_future_human_action:'), 'human action field in output');
}

console.log('--- render blocked ---');
{
  const r = buildStablePromotionRollbackPlan({});
  const txt = renderStablePromotionRollbackPlan(r);
  assert(txt.includes('ROLLBACK PLAN BLOCKED'), 'blocked message');
}

console.log('--- statuses export ---');
{
  assert(ROLLBACK_PLAN_STATUSES.includes('ROLLBACK_PLAN_READY'), 'ready in statuses');
  assert(ROLLBACK_PLAN_STATUSES.includes('ROLLBACK_PLAN_BLOCKED_LOCK'), 'blocked in statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
