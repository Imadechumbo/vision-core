#!/usr/bin/env node
/**
 * Stable Promotion Receipt Verifier — V123.1
 *
 * Verifies a manually imported stable promotion receipt.
 * Does NOT execute any real commands. Does NOT auto-promote.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * auto_promotion_blocked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v123.1';

export const RECEIPT_VERIFIER_STATUSES = [
  'RECEIPT_VERIFIER_BLOCKED_GATE',
  'RECEIPT_VERIFIER_BLOCKED_RECEIPT',
  'RECEIPT_VERIFIER_MISMATCH',
  'RECEIPT_VERIFIER_VERIFIED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:   false,
    stable_promoted:            false,
    git_push_performed:         false,
    deploy_performed:           false,
    release_performed:          false,
    auto_promotion_blocked:     true,
    no_auto_promotion_from_receipt: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    verifier_status:   status,
    receipt_verified:  false,
    blocking_reason:   reason,
    ..._locked(),
    ...extra,
  };
}

function _verifierId(gate_id, receipt_id) {
  return _sha256([gate_id || '', receipt_id || '', 'rv-v123.1'].join('|'));
}

export function verifyStablePromotionReceipt(params) {
  const {
    stable_promotion_receipt_import_gate,
    imported_receipt,
  } = params || {};

  if (!stable_promotion_receipt_import_gate || !stable_promotion_receipt_import_gate.gate_open) {
    return _blocked('RECEIPT_VERIFIER_BLOCKED_GATE', 'stable_promotion_receipt_import_gate not open');
  }

  if (!imported_receipt || !imported_receipt.receipt_id) {
    return _blocked('RECEIPT_VERIFIER_BLOCKED_RECEIPT', 'imported_receipt missing or has no receipt_id');
  }

  const gate    = stable_promotion_receipt_import_gate;
  const receipt = imported_receipt;

  const verifier_id = _verifierId(gate.gate_id, receipt.receipt_id);

  const target_ref_match = (receipt.target_stable_ref || null) === (gate.target_stable_ref || null);
  const target_tag_match = (receipt.target_tag || null) === (gate.target_tag || null);
  const seal_match       = (receipt.seal_id || null) === (gate.seal_id || null);

  const all_match = target_ref_match && target_tag_match && seal_match;

  if (!all_match) {
    return {
      schema_version:      SCHEMA_VERSION,
      verifier_id,
      verifier_status:     'RECEIPT_VERIFIER_MISMATCH',
      receipt_verified:    false,
      gate_id:             gate.gate_id,
      receipt_id:          receipt.receipt_id,
      target_ref_match,
      target_tag_match,
      seal_match,
      mismatch_details: {
        gate_target_ref:    gate.target_stable_ref,
        receipt_target_ref: receipt.target_stable_ref,
        gate_target_tag:    gate.target_tag,
        receipt_target_tag: receipt.target_tag,
        gate_seal_id:       gate.seal_id,
        receipt_seal_id:    receipt.seal_id,
      },
      ..._locked(),
    };
  }

  return {
    schema_version:    SCHEMA_VERSION,
    verifier_id,
    verifier_status:   'RECEIPT_VERIFIER_VERIFIED',
    receipt_verified:  true,
    gate_id:           gate.gate_id,
    receipt_id:        receipt.receipt_id,
    target_stable_ref: gate.target_stable_ref,
    target_tag:        gate.target_tag,
    seal_id:           gate.seal_id,
    receipt_source:    gate.receipt_source,
    target_ref_match,
    target_tag_match,
    seal_match,
    ..._locked(),
  };
}

export function validateStablePromotionReceiptVerifier(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null/undefined'] };
  }

  const errors = [];

  if (!RECEIPT_VERIFIER_STATUSES.includes(result.verifier_status)) {
    errors.push(`invalid verifier_status: ${result.verifier_status}`);
  }
  if (result.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (result.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (result.auto_promotion_blocked !== true) errors.push('auto_promotion_blocked must be true');
  if (result.no_auto_promotion_from_receipt !== true) errors.push('no_auto_promotion_from_receipt must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionReceiptVerifier(result) {
  if (!result || result.verifier_status === 'RECEIPT_VERIFIER_BLOCKED_GATE' || result.verifier_status === 'RECEIPT_VERIFIER_BLOCKED_RECEIPT') {
    return `[RECEIPT VERIFIER BLOCKED] ${result?.verifier_status || 'unknown'}: ${result?.blocking_reason || 'unknown reason'}`;
  }

  const lines = [
    `=== STABLE PROMOTION RECEIPT VERIFIER ===`,
    `Schema:                  ${result.schema_version}`,
    `Verifier ID:             ${result.verifier_id}`,
    `Status:                  ${result.verifier_status}`,
    `Receipt Verified:        ${result.receipt_verified}`,
    `Gate ID:                 ${result.gate_id}`,
    `Receipt ID:              ${result.receipt_id}`,
    `Target Ref Match:        ${result.target_ref_match}`,
    `Target Tag Match:        ${result.target_tag_match}`,
    `Seal Match:              ${result.seal_match}`,
  ];

  if (result.verifier_status === 'RECEIPT_VERIFIER_VERIFIED') {
    lines.push(`Target Ref:              ${result.target_stable_ref}`);
    lines.push(`Target Tag:              ${result.target_tag}`);
    lines.push(`Receipt Source:          ${result.receipt_source}`);
  }

  if (result.mismatch_details) {
    lines.push(``, `--- MISMATCH DETAILS ---`);
    for (const [k, v] of Object.entries(result.mismatch_details)) {
      lines.push(`  ${k}: ${v}`);
    }
  }

  lines.push(
    ``,
    `stable_promotion_allowed:        ${result.stable_promotion_allowed}`,
    `auto_promotion_blocked:          ${result.auto_promotion_blocked}`,
    `no_auto_promotion_from_receipt:  ${result.no_auto_promotion_from_receipt}`
  );

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-receipt-verifier.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockGate = {
    gate_open:         true,
    gate_id:           'mock-gate-v1231',
    target_stable_ref: 'stable',
    target_tag:        'v123.1-mock',
    seal_id:           'mock-seal-v1231',
    receipt_source:    'human_manual_import',
  };

  const mockReceipt = {
    receipt_id:        'mock-receipt-v1231',
    target_stable_ref: 'stable',
    target_tag:        'v123.1-mock',
    seal_id:           'mock-seal-v1231',
  };

  const result = verifyStablePromotionReceipt({
    stable_promotion_receipt_import_gate: mockGate,
    imported_receipt: mockReceipt,
  });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderStablePromotionReceiptVerifier(result));
  }
}
