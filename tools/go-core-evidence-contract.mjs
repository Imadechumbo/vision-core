#!/usr/bin/env node
/**
 * Go Core Evidence Receipt Contract — V21.1
 *
 * Formalizes the evidence_receipt contract produced by Go Core runtime.
 * Validates receipt schema, source, hash, and required fields.
 *
 * REGRA ABSOLUTA:
 * - Backend claim does NOT substitute Go Core receipt.
 * - receipt without source=go-core is INVALID.
 * - receipt without mission_id is INVALID.
 * - receipt without hash is INVALID.
 * - Valid receipt does NOT promote or deploy on its own.
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v21.1';

export const RECEIPT_STATUSES = [
  'RECEIPT_BLOCKED_MISSING',
  'RECEIPT_BLOCKED_SCHEMA',
  'RECEIPT_BLOCKED_SOURCE',
  'RECEIPT_BLOCKED_HASH',
  'RECEIPT_VALID',
];

export const REQUIRED_RECEIPT_FIELDS = [
  'receipt_id',
  'mission_id',
  'source',
  'git_head',
  'created_at',
  'validator_status',
  'pass_gold_status',
  'security_status',
  'runtime_status',
  'schema_version',
  // 'hash' is validated separately in its own gate (not schema gate)
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates a Go Core evidence receipt against the contract.
 *
 * @param {Object|null} receipt - The receipt object to validate
 * @returns {Object} Validation result
 */
export function validateGoCorEvidenceReceipt(receipt) {
  // Gate 1: receipt must be present
  if (!receipt || typeof receipt !== 'object') {
    return _blocked('RECEIPT_BLOCKED_MISSING', {
      receipt_id:  null,
      mission_id:  null,
      source:      null,
      blocking_reason: 'receipt_absent',
    });
  }

  // Gate 2: schema validation — all required fields present
  const missingFields = REQUIRED_RECEIPT_FIELDS.filter(f => !(f in receipt) || receipt[f] === null || receipt[f] === undefined);
  if (missingFields.length > 0) {
    return _blocked('RECEIPT_BLOCKED_SCHEMA', {
      receipt_id:      receipt.receipt_id || null,
      mission_id:      receipt.mission_id || null,
      source:          receipt.source     || null,
      missing_fields:  missingFields,
      blocking_reason: `schema_missing:${missingFields.join(',')}`,
    });
  }

  // Gate 3: source must be exactly "go-core"
  if (receipt.source !== 'go-core') {
    return _blocked('RECEIPT_BLOCKED_SOURCE', {
      receipt_id:      receipt.receipt_id,
      mission_id:      receipt.mission_id,
      source:          receipt.source,
      blocking_reason: `source_invalid:${receipt.source}`,
    });
  }

  // Gate 4: hash must be non-empty string and match recomputed value
  if (!receipt.hash || typeof receipt.hash !== 'string' || receipt.hash.trim() === '') {
    return _blocked('RECEIPT_BLOCKED_HASH', {
      receipt_id:      receipt.receipt_id,
      mission_id:      receipt.mission_id,
      source:          receipt.source,
      blocking_reason: 'hash_absent',
    });
  }

  // Verify hash integrity (recompute without hash field)
  const expectedHash = _computeReceiptHash(receipt);
  if (receipt.hash !== expectedHash) {
    return _blocked('RECEIPT_BLOCKED_HASH', {
      receipt_id:      receipt.receipt_id,
      mission_id:      receipt.mission_id,
      source:          receipt.source,
      blocking_reason: 'hash_mismatch',
    });
  }

  // All gates passed — VALID
  return {
    schema_version:         SCHEMA_VERSION,
    receipt_status:         'RECEIPT_VALID',
    receipt_valid:          true,
    receipt_id:             receipt.receipt_id,
    mission_id:             receipt.mission_id,
    source:                 receipt.source,
    git_head:               receipt.git_head,
    created_at:             receipt.created_at,
    validator_status:       receipt.validator_status,
    pass_gold_status:       receipt.pass_gold_status,
    security_status:        receipt.security_status,
    runtime_status:         receipt.runtime_status,
    receipt_schema_version: receipt.schema_version,
    hash_verified:          true,
    blocking_reason:        null,
    deploy_allowed:         false,
    promotion_allowed:      false,
    stable_allowed:         false,
  };
}

/**
 * Builds a valid Go Core receipt object for testing.
 * The caller must provide all required domain fields.
 *
 * @param {Object} fields
 * @returns {Object} Receipt with computed hash
 */
export function buildGoCorEvidenceReceipt(fields = {}) {
  const base = {
    receipt_id:       fields.receipt_id       || `rcpt_${Date.now()}`,
    mission_id:       fields.mission_id       || null,
    source:           fields.source           || 'go-core',
    git_head:         fields.git_head         || 'unknown',
    created_at:       fields.created_at       || new Date().toISOString(),
    validator_status: fields.validator_status || 'PASS',
    pass_gold_status: fields.pass_gold_status || 'NOT_ELIGIBLE',
    security_status:  fields.security_status  || 'CLEAN',
    runtime_status:   fields.runtime_status   || 'LIVE',
    schema_version:   fields.schema_version   || SCHEMA_VERSION,
    hash:             null,
  };
  base.hash = _computeReceiptHash(base);
  return base;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _computeReceiptHash(receipt) {
  const clone = { ...receipt, hash: null };
  return createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

function _blocked(status, fields = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    receipt_status:    status,
    receipt_valid:     false,
    hash_verified:     false,
    missing_fields:    fields.missing_fields || [],
    blocking_reason:   fields.blocking_reason || null,
    deploy_allowed:    false,
    promotion_allowed: false,
    stable_allowed:    false,
    ...fields,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('go-core-evidence-contract.mjs')) {
  const args   = process.argv.slice(2);
  const json   = args.includes('--json');

  const result = validateGoCorEvidenceReceipt(null);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`receipt_status    : ${result.receipt_status}`);
    console.log(`receipt_valid     : ${result.receipt_valid}`);
    console.log(`deploy_allowed    : ${result.deploy_allowed}`);
    console.log(`promotion_allowed : ${result.promotion_allowed}`);
  }

  process.exit(result.receipt_valid ? 0 : 1);
}
