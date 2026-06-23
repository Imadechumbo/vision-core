#!/usr/bin/env node
/**
 * Real Tag Execution Receipt — V88.0
 *
 * Generates an immutable execution receipt after tag creation,
 * dry-run, or rollback. receipt_type field classifies the result.
 *
 * REGRA ABSOLUTA: tag_created=false (receipt does not create tags),
 * deploy_performed=false, stable_promoted=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v88.0';

export const RECEIPT_STATUSES = [
  'RECEIPT_BLOCKED_EXECUTOR',
  'RECEIPT_BLOCKED_VERIFIER',
  'RECEIPT_BLOCKED_HASH',
  'RECEIPT_DRY_RUN_VERIFIED',
  'RECEIPT_REAL_TAG_CREATED',
  'RECEIPT_ROLLBACK_EXECUTED',
];

export const RECEIPT_TYPES = [
  'dry_run_verified',
  'real_tag_created',
  'rollback_executed',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    receipt_status:   status,
    receipt_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

function _buildReceiptHash(receipt_type, target_tag, executor_id, verifier_id, now) {
  return _sha256(`receipt:${receipt_type}:${target_tag ?? ''}:${executor_id ?? ''}:${verifier_id ?? ''}:${now}`).slice(0, 32);
}

export function buildRealTagExecutionReceipt(params = {}) {
  const {
    executor_status,
    executor_ready         = false,
    executor_id,
    verifier_status,
    verification_passed    = false,
    verifier_id,
    rollback_status,
    rollback_executed      = false,
    rollback_id,
    target_tag,
    evidence_receipt_id,
    rollback_anchor_id,
    fixture_mode           = false,
    _mock_timestamp,
  } = params ?? {};

  const now        = _mock_timestamp ?? new Date().toISOString();
  const id_tag     = fixture_mode ? 'fixture' : (target_tag ?? 'unknown');
  const receipt_id = _sha256(`exec-receipt:${SCHEMA_VERSION}:${id_tag}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const type = rollback_executed === true
      ? 'rollback_executed'
      : (executor_status === 'LOCAL_EXEC_REAL_TAG_EXECUTED' ? 'real_tag_created' : 'dry_run_verified');
    const status = type === 'rollback_executed'
      ? 'RECEIPT_ROLLBACK_EXECUTED'
      : (type === 'real_tag_created' ? 'RECEIPT_REAL_TAG_CREATED' : 'RECEIPT_DRY_RUN_VERIFIED');

    const receipt_hash = _buildReceiptHash(type, target_tag ?? 'fixture', executor_id ?? 'fix-exec', verifier_id ?? 'fix-ver', now);
    return {
      schema_version:      SCHEMA_VERSION,
      receipt_id,
      receipt_status:      status,
      receipt_type:        type,
      receipt_ready:       true,
      receipt_hash,
      blocking_reason:     null,
      target_tag:          target_tag ?? null,
      evidence_receipt_id: evidence_receipt_id ?? null,
      rollback_anchor_id:  rollback_anchor_id ?? null,
      created_at:          now,
      ..._locked(),
    };
  }

  // Gate 1: executor must be ready
  if (executor_ready !== true) {
    return _blocked('RECEIPT_BLOCKED_EXECUTOR', 'executor_not_ready', {
      receipt_id,
      created_at: now,
    });
  }

  // Determine receipt type
  let receipt_type;
  let receipt_status;

  if (rollback_executed === true && rollback_status === 'ROLLBACK_EXEC_EXECUTED') {
    receipt_type   = 'rollback_executed';
    receipt_status = 'RECEIPT_ROLLBACK_EXECUTED';
  } else if (executor_status === 'LOCAL_EXEC_REAL_TAG_EXECUTED') {
    if (verification_passed !== true) {
      return _blocked('RECEIPT_BLOCKED_VERIFIER', 'verifier_not_passed_for_real_tag', {
        receipt_id,
        verifier_status_provided: verifier_status ?? null,
        created_at:               now,
      });
    }
    receipt_type   = 'real_tag_created';
    receipt_status = 'RECEIPT_REAL_TAG_CREATED';
  } else {
    receipt_type   = 'dry_run_verified';
    receipt_status = 'RECEIPT_DRY_RUN_VERIFIED';
  }

  // Build deterministic hash
  const e_id = executor_id ?? 'none';
  const v_id = verifier_id ?? 'none';
  const receipt_hash = _buildReceiptHash(receipt_type, target_tag, e_id, v_id, now);
  if (!receipt_hash || receipt_hash.length < 16) {
    return _blocked('RECEIPT_BLOCKED_HASH', 'receipt_hash_failed', { receipt_id, created_at: now });
  }

  return {
    schema_version:      SCHEMA_VERSION,
    receipt_id,
    receipt_status,
    receipt_type,
    receipt_ready:       true,
    receipt_hash,
    blocking_reason:     null,
    target_tag:          target_tag ?? null,
    evidence_receipt_id: evidence_receipt_id ?? null,
    rollback_anchor_id:  rollback_anchor_id ?? null,
    executor_id:         e_id,
    verifier_id:         v_id,
    created_at:          now,
    ..._locked(),
  };
}

export function validateRealTagExecutionReceipt(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
  const errors = [];
  if (!RECEIPT_STATUSES.includes(result.receipt_status))  errors.push('receipt_status_invalid');
  if (result.receipt_ready === true && !RECEIPT_TYPES.includes(result.receipt_type)) errors.push('receipt_type_invalid');
  if (result.tag_created         === true) errors.push('tag_created_must_be_false');
  if (result.deploy_performed    === true) errors.push('deploy_performed_must_be_false');
  if (result.stable_promoted     === true) errors.push('stable_promoted_must_be_false');
  if (result.release_performed   === true) errors.push('release_performed_must_be_false');
  return { valid: errors.length === 0, errors };
}

export function renderRealTagExecutionReceipt(result) {
  if (!result) return 'real_tag_execution_receipt: null';
  return [
    `receipt_status                : ${result.receipt_status ?? 'UNKNOWN'}`,
    `receipt_type                  : ${result.receipt_type ?? 'none'}`,
    `receipt_ready                 : ${result.receipt_ready ?? false}`,
    `receipt_hash                  : ${result.receipt_hash ?? 'none'}`,
    `receipt_id                    : ${result.receipt_id ?? 'none'}`,
    `target_tag                    : ${result.target_tag ?? 'none'}`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-execution-receipt.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagExecutionReceipt({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagExecutionReceipt(result));
  }

  process.exit(result.receipt_ready ? 0 : 1);
}
