#!/usr/bin/env node
/**
 * Stable Promotion Safety Lock — V119.0
 *
 * Evaluates safety conditions and issues a safety lock for stable promotion.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * safety_lock_active=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v119.0';

export const SAFETY_LOCK_STATUSES = [
  'SAFETY_LOCK_BLOCKED_RECEIPT',
  'SAFETY_LOCK_BLOCKED_CI',
  'SAFETY_LOCK_BLOCKED_DIRTY_WORKTREE',
  'SAFETY_LOCK_ACTIVE',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:      false,
    stable_promoted:               false,
    git_push_performed:            false,
    deploy_performed:              false,
    release_performed:             false,
    safety_lock_active:            true,
    future_human_execution_required: true,
    automated_execution_forbidden: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    lock_status:     status,
    lock_issued:     false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _lockId(receipt_id) {
  return _sha256([receipt_id || '', 'safety-lock-v119.0'].join('|'));
}

export function evaluateStablePromotionSafetyLock(params) {
  const {
    stable_promotion_dry_run_receipt,
    ci_environment,
    github_actions,
    dirty_worktree,
  } = params || {};

  if (!stable_promotion_dry_run_receipt || !stable_promotion_dry_run_receipt.receipt_issued) {
    return _blocked('SAFETY_LOCK_BLOCKED_RECEIPT', 'stable_promotion_dry_run_receipt not issued');
  }

  if (ci_environment === true || github_actions === true) {
    return _blocked('SAFETY_LOCK_BLOCKED_CI', 'CI/GitHub Actions environment detected — safety lock cannot be issued');
  }

  if (dirty_worktree === true) {
    return _blocked('SAFETY_LOCK_BLOCKED_DIRTY_WORKTREE', 'dirty worktree detected — clean working directory required');
  }

  const receipt = stable_promotion_dry_run_receipt;
  const lock_id = _lockId(receipt.receipt_id);

  return {
    schema_version:          SCHEMA_VERSION,
    lock_id,
    lock_status:             'SAFETY_LOCK_ACTIVE',
    lock_issued:             true,
    receipt_id:              receipt.receipt_id,
    receipt_type:            receipt.receipt_type,
    command_block_id:        receipt.command_block_id,
    target_stable_ref:       receipt.target_stable_ref,
    target_tag:              receipt.target_tag,
    total_commands_simulated: receipt.total_commands_simulated,
    ..._locked(),
  };
}

export function validateStablePromotionSafetyLock(lock) {
  if (!lock || typeof lock !== 'object') {
    return { valid: false, errors: ['lock is null/undefined'] };
  }

  const errors = [];

  if (!SAFETY_LOCK_STATUSES.includes(lock.lock_status)) {
    errors.push(`invalid lock_status: ${lock.lock_status}`);
  }
  if (lock.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (lock.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (lock.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (lock.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (lock.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (lock.release_performed !== false) errors.push('release_performed must be false');
  if (lock.safety_lock_active !== true) errors.push('safety_lock_active must be true');
  if (lock.future_human_execution_required !== true) errors.push('future_human_execution_required must be true');
  if (lock.automated_execution_forbidden !== true) errors.push('automated_execution_forbidden must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionSafetyLock(lock) {
  if (!lock || !lock.lock_issued) {
    return `[SAFETY LOCK BLOCKED] ${lock?.lock_status || 'unknown'}: ${lock?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION SAFETY LOCK ===`,
    `Schema:                          ${lock.schema_version}`,
    `Lock ID:                         ${lock.lock_id}`,
    `Status:                          ${lock.lock_status}`,
    `Receipt ID:                      ${lock.receipt_id}`,
    `Receipt Type:                    ${lock.receipt_type}`,
    `Command Block ID:                ${lock.command_block_id}`,
    `Target Ref:                      ${lock.target_stable_ref}`,
    `Target Tag:                      ${lock.target_tag}`,
    `Commands Simulated:              ${lock.total_commands_simulated}`,
    ``,
    `stable_promotion_allowed:        ${lock.stable_promotion_allowed}`,
    `stable_promoted:                 ${lock.stable_promoted}`,
    `safety_lock_active:              ${lock.safety_lock_active}`,
    `future_human_execution_required: ${lock.future_human_execution_required}`,
    `automated_execution_forbidden:   ${lock.automated_execution_forbidden}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-safety-lock.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockReceipt = {
    receipt_issued:           true,
    receipt_id:               'mock-receipt-v1190',
    receipt_type:             'stable_promotion_dry_run',
    command_block_id:         'mock-block-v1190',
    target_stable_ref:        'stable',
    target_tag:               'v119.0-mock',
    total_commands_simulated: 7,
  };

  const lock = evaluateStablePromotionSafetyLock({ stable_promotion_dry_run_receipt: mockReceipt });

  if (isJson) {
    console.log(JSON.stringify(lock, null, 2));
  } else {
    console.log(renderStablePromotionSafetyLock(lock));
  }
}
