#!/usr/bin/env node
/**
 * Stable Promotion Dry-Run Receipt — V118.1
 *
 * Issues a tamper-evident receipt for dry-run simulation results.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * commands_executed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v118.1';

export const DRY_RUN_RECEIPT_STATUSES = [
  'DRY_RUN_RECEIPT_BLOCKED_EXECUTOR',
  'DRY_RUN_RECEIPT_ISSUED',
];

export const RECEIPT_TYPE = 'stable_promotion_dry_run';

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
    commands_executed:        false,
    real_execution_performed: false,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    receipt_status:  status,
    receipt_issued:  false,
    blocking_reason: reason,
    receipt_type:    RECEIPT_TYPE,
    ..._locked(),
    ...extra,
  };
}

function _receiptId(executor_id, total_simulated) {
  return _sha256([executor_id || '', String(total_simulated || 0), 'drr-v118.1'].join('|'));
}

function _contentHash(result) {
  const payload = JSON.stringify({
    executor_id:              result.executor_id,
    command_block_id:         result.command_block_id,
    target_stable_ref:        result.target_stable_ref,
    target_tag:               result.target_tag,
    total_commands_simulated: result.total_commands_simulated,
  });
  return _sha256(payload);
}

export function issueStablePromotionDryRunReceipt(params) {
  const { stable_promotion_dry_run_result } = params || {};

  if (!stable_promotion_dry_run_result || !stable_promotion_dry_run_result.dry_run_ready) {
    return _blocked('DRY_RUN_RECEIPT_BLOCKED_EXECUTOR', 'stable_promotion_dry_run_result not ready');
  }

  const result = stable_promotion_dry_run_result;
  const receipt_id   = _receiptId(result.executor_id, result.total_commands_simulated);
  const content_hash = _contentHash(result);

  return {
    schema_version:           SCHEMA_VERSION,
    receipt_id,
    receipt_status:           'DRY_RUN_RECEIPT_ISSUED',
    receipt_issued:           true,
    receipt_type:             RECEIPT_TYPE,
    executor_id:              result.executor_id,
    command_block_id:         result.command_block_id,
    target_stable_ref:        result.target_stable_ref,
    target_tag:               result.target_tag,
    total_commands_simulated: result.total_commands_simulated,
    content_hash,
    ..._locked(),
  };
}

export function validateStablePromotionDryRunReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { valid: false, errors: ['receipt is null/undefined'] };
  }

  const errors = [];

  if (!DRY_RUN_RECEIPT_STATUSES.includes(receipt.receipt_status)) {
    errors.push(`invalid receipt_status: ${receipt.receipt_status}`);
  }
  if (receipt.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (receipt.receipt_type !== RECEIPT_TYPE) errors.push(`receipt_type must be "${RECEIPT_TYPE}"`);
  if (receipt.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (receipt.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (receipt.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (receipt.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (receipt.release_performed !== false) errors.push('release_performed must be false');
  if (receipt.commands_executed !== false) errors.push('commands_executed must be false');
  if (receipt.real_execution_performed !== false) errors.push('real_execution_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionDryRunReceipt(receipt) {
  if (!receipt || !receipt.receipt_issued) {
    return `[DRY-RUN RECEIPT BLOCKED] ${receipt?.receipt_status || 'unknown'}: ${receipt?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION DRY-RUN RECEIPT ===`,
    `Schema:                   ${receipt.schema_version}`,
    `Receipt ID:               ${receipt.receipt_id}`,
    `Receipt Type:             ${receipt.receipt_type}`,
    `Status:                   ${receipt.receipt_status}`,
    `Executor ID:              ${receipt.executor_id}`,
    `Command Block ID:         ${receipt.command_block_id}`,
    `Target Ref:               ${receipt.target_stable_ref}`,
    `Target Tag:               ${receipt.target_tag}`,
    `Commands Simulated:       ${receipt.total_commands_simulated}`,
    `Content Hash:             ${receipt.content_hash}`,
    ``,
    `stable_promotion_allowed: ${receipt.stable_promotion_allowed}`,
    `stable_promoted:          ${receipt.stable_promoted}`,
    `commands_executed:        ${receipt.commands_executed}`,
    `real_execution_performed: ${receipt.real_execution_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-dry-run-receipt.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockResult = {
    dry_run_ready:          true,
    executor_id:            'mock-executor-v1181',
    command_block_id:       'mock-block-v1181',
    target_stable_ref:      'stable',
    target_tag:             'v118.1-mock',
    total_commands_simulated: 7,
  };

  const receipt = issueStablePromotionDryRunReceipt({ stable_promotion_dry_run_result: mockResult });

  if (isJson) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    console.log(renderStablePromotionDryRunReceipt(receipt));
  }
}
