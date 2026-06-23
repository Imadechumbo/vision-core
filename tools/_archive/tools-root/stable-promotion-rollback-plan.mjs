#!/usr/bin/env node
/**
 * Stable Promotion Rollback Plan — V119.1
 *
 * Generates a rollback plan for stable promotion. Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * rollback_executed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v119.1';

export const ROLLBACK_PLAN_STATUSES = [
  'ROLLBACK_PLAN_BLOCKED_LOCK',
  'ROLLBACK_PLAN_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed: false,
    stable_promoted:          false,
    git_push_performed:       false,
    deploy_performed:         false,
    release_performed:        false,
    rollback_executed:        false,
    rollback_is_future_human_action: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    plan_status:     status,
    plan_ready:      false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _planId(lock_id, target_tag) {
  return _sha256([lock_id || '', target_tag || '', 'rp-v119.1'].join('|'));
}

export function buildStablePromotionRollbackPlan(params) {
  const {
    stable_promotion_safety_lock,
    rollback_anchor_ref,
    rollback_anchor_tag,
  } = params || {};

  if (!stable_promotion_safety_lock || !stable_promotion_safety_lock.lock_issued) {
    return _blocked('ROLLBACK_PLAN_BLOCKED_LOCK', 'stable_promotion_safety_lock not issued');
  }

  const lock = stable_promotion_safety_lock;
  const ref   = lock.target_stable_ref || 'stable';
  const tag   = lock.target_tag || '<TAG>';
  const anchor_ref = rollback_anchor_ref || '<ROLLBACK_ANCHOR_REF>';
  const anchor_tag = rollback_anchor_tag || '<ROLLBACK_ANCHOR_TAG>';

  const plan_id = _planId(lock.lock_id, tag);

  const rollback_steps = [
    `git fetch origin`,
    `git branch -f ${ref} ${anchor_ref}`,
    `git push origin ${ref}`,
    `git tag --points-at origin/${ref}`,
  ];

  const verification_steps = [
    `git log origin/${ref} --oneline -3`,
    `git tag --points-at origin/${ref}`,
  ];

  const trigger_conditions = [
    `post-promotion verification failure`,
    `unexpected behavior after ${tag} reaches ${ref}`,
    `human operator decision`,
  ];

  return {
    schema_version:     SCHEMA_VERSION,
    plan_id,
    plan_status:        'ROLLBACK_PLAN_READY',
    plan_ready:         true,
    lock_id:            lock.lock_id,
    target_stable_ref:  ref,
    target_tag:         tag,
    rollback_anchor_ref,
    rollback_anchor_tag,
    rollback_steps,
    verification_steps,
    trigger_conditions,
    ..._locked(),
  };
}

export function validateStablePromotionRollbackPlan(plan) {
  if (!plan || typeof plan !== 'object') {
    return { valid: false, errors: ['plan is null/undefined'] };
  }

  const errors = [];

  if (!ROLLBACK_PLAN_STATUSES.includes(plan.plan_status)) {
    errors.push(`invalid plan_status: ${plan.plan_status}`);
  }
  if (plan.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (plan.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (plan.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (plan.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (plan.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (plan.release_performed !== false) errors.push('release_performed must be false');
  if (plan.rollback_executed !== false) errors.push('rollback_executed must be false');
  if (plan.rollback_is_future_human_action !== true) errors.push('rollback_is_future_human_action must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionRollbackPlan(plan) {
  if (!plan || !plan.plan_ready) {
    return `[ROLLBACK PLAN BLOCKED] ${plan?.plan_status || 'unknown'}: ${plan?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION ROLLBACK PLAN ===`,
    `Schema:                    ${plan.schema_version}`,
    `Plan ID:                   ${plan.plan_id}`,
    `Status:                    ${plan.plan_status}`,
    `Lock ID:                   ${plan.lock_id}`,
    `Target Ref:                ${plan.target_stable_ref}`,
    `Target Tag:                ${plan.target_tag}`,
    `Rollback Anchor Ref:       ${plan.rollback_anchor_ref || '<ROLLBACK_ANCHOR_REF>'}`,
    `Rollback Anchor Tag:       ${plan.rollback_anchor_tag || '<ROLLBACK_ANCHOR_TAG>'}`,
    ``,
    `--- ROLLBACK STEPS (future human only) ---`,
    ...plan.rollback_steps.map(s => `  $ ${s}`),
    ``,
    `--- VERIFICATION AFTER ROLLBACK ---`,
    ...plan.verification_steps.map(s => `  $ ${s}`),
    ``,
    `--- TRIGGER CONDITIONS ---`,
    ...plan.trigger_conditions.map(c => `  - ${c}`),
    ``,
    `stable_promotion_allowed:        ${plan.stable_promotion_allowed}`,
    `rollback_executed:               ${plan.rollback_executed}`,
    `rollback_is_future_human_action: ${plan.rollback_is_future_human_action}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-rollback-plan.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockLock = {
    lock_issued:        true,
    lock_id:            'mock-lock-v1191',
    target_stable_ref:  'stable',
    target_tag:         'v119.1-mock',
  };

  const plan = buildStablePromotionRollbackPlan({
    stable_promotion_safety_lock: mockLock,
    rollback_anchor_ref:          'v119.0-mock',
    rollback_anchor_tag:          'v119.0-mock',
  });

  if (isJson) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(renderStablePromotionRollbackPlan(plan));
  }
}
