#!/usr/bin/env node
/**
 * Go Core Evidence Receipt Generator CLI — V26.3
 *
 * Generates a local Go Core evidence receipt from provided mission/runtime
 * metadata. Validates the generated receipt against the V21.1 contract.
 * source=go-core is enforced — no other source is accepted.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - source must be 'go-core' — any other source is rejected.
 */

import { createHash }                    from 'crypto';
import {
  validateGoCorEvidenceReceipt,
  buildGoCorEvidenceReceipt,
}                                        from './go-core-evidence-contract.mjs';

const SCHEMA_VERSION = 'v26.3';
const RECEIPT_SCHEMA = 'v21.1';

export const RECEIPT_GEN_STATUSES = [
  'RECEIPT_GEN_BLOCKED_MISSION',
  'RECEIPT_GEN_BLOCKED_GIT_HEAD',
  'RECEIPT_GEN_READY',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:           SCHEMA_VERSION,
    receipt_generation_status: status,
    receipt_valid:            false,
    evidence_receipt_id:      null,
    mission_id:               null,
    evidence_source:          'go-core',
    receipt_hash:             null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    ...extra,
  };
}

function _deriveReceiptId(missionId, gitHead) {
  return 'rcpt_' + createHash('sha256')
    .update(`${missionId}:${gitHead}:${RECEIPT_SCHEMA}`)
    .digest('hex')
    .slice(0, 32);
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generates a Go Core evidence receipt and validates it.
 *
 * @param {Object}  options
 * @param {string}  options.mission_id        - Required: real mission identifier
 * @param {string}  options.git_head          - Required: git commit SHA or ref
 * @param {string}  options.validator_status  - Default: 'PASS'
 * @param {string}  options.pass_gold_status  - Default: 'NOT_ELIGIBLE'
 * @param {string}  options.security_status   - Default: 'CLEAN'
 * @param {string}  options.runtime_status    - Default: 'LIVE'
 * @returns {Object} Generation result
 */
export function generateGoCorEvidenceReceipt(options = {}) {
  const {
    mission_id       = null,
    git_head         = null,
    validator_status = 'PASS',
    pass_gold_status = 'NOT_ELIGIBLE',
    security_status  = 'CLEAN',
    runtime_status   = 'LIVE',
  } = options;

  // Gate 1: mission_id required
  if (!mission_id || typeof mission_id !== 'string' || mission_id.trim() === '') {
    return _blocked('RECEIPT_GEN_BLOCKED_MISSION', {
      blocking_reason: 'mission_id_required',
    });
  }

  // Gate 2: git_head required
  if (!git_head || typeof git_head !== 'string' || git_head.trim() === '') {
    return _blocked('RECEIPT_GEN_BLOCKED_GIT_HEAD', {
      mission_id,
      blocking_reason: 'git_head_required',
    });
  }

  // Build receipt via V21.1 builder
  const receiptId = _deriveReceiptId(mission_id, git_head);
  const receipt   = buildGoCorEvidenceReceipt({
    receipt_id:       receiptId,
    mission_id,
    source:           'go-core',
    git_head,
    created_at:       new Date().toISOString(),
    validator_status,
    pass_gold_status,
    security_status,
    runtime_status,
    schema_version:   RECEIPT_SCHEMA,
  });

  // Validate the generated receipt
  const validation = validateGoCorEvidenceReceipt(receipt);

  if (!validation.receipt_valid) {
    return _blocked('RECEIPT_GEN_BLOCKED_MISSION', {
      mission_id,
      blocking_reason: validation.blocking_reason ?? 'validation_failed',
      validation_status: validation.receipt_status,
    });
  }

  return {
    schema_version:            SCHEMA_VERSION,
    receipt_generation_status: 'RECEIPT_GEN_READY',
    receipt_valid:             true,
    evidence_receipt_id:       receipt.receipt_id,
    mission_id:                receipt.mission_id,
    evidence_source:           'go-core',
    receipt_hash:              receipt.hash,
    receipt,
    validation,
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('go-core-evidence-receipt-generator.mjs')) {
  const args            = process.argv.slice(2);
  const json            = args.includes('--json');

  function argVal(flag) {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  }

  const missionId       = argVal('--mission-id');
  const gitHead         = argVal('--git-head');
  const validatorStatus = argVal('--validator-status');
  const passGoldStatus  = argVal('--pass-gold-status');
  const securityStatus  = argVal('--security-status');
  const runtimeStatus   = argVal('--runtime-status');

  const result = generateGoCorEvidenceReceipt({
    mission_id:       missionId,
    git_head:         gitHead,
    validator_status: validatorStatus,
    pass_gold_status: passGoldStatus,
    security_status:  securityStatus,
    runtime_status:   runtimeStatus,
  });

  if (json) {
    const { receipt, validation, ...safe } = result;
    console.log(JSON.stringify(safe, null, 2));
  } else {
    console.log(`receipt_generation_status : ${result.receipt_generation_status}`);
    console.log(`receipt_valid             : ${result.receipt_valid}`);
    console.log(`evidence_receipt_id       : ${result.evidence_receipt_id}`);
    console.log(`mission_id                : ${result.mission_id}`);
    console.log(`evidence_source           : ${result.evidence_source}`);
    console.log(`receipt_hash              : ${result.receipt_hash}`);
    console.log(`deploy_allowed            : ${result.deploy_allowed}`);
    console.log(`promotion_allowed         : ${result.promotion_allowed}`);
  }

  process.exit(result.receipt_generation_status === 'RECEIPT_GEN_READY' ? 0 : 1);
}
