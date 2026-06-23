#!/usr/bin/env node
/**
 * Stable Promotion Receipt Import Gate — V123.0
 *
 * Gates manual receipt import after stable promotion execution.
 * Blocks real execution by default. Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * auto_promotion_blocked=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v123.0';

export const RECEIPT_IMPORT_GATE_STATUSES = [
  'RECEIPT_IMPORT_GATE_BLOCKED_SEAL',
  'RECEIPT_IMPORT_GATE_BLOCKED_REAL_DEFAULT',
  'RECEIPT_IMPORT_GATE_BLOCKED_CI',
  'RECEIPT_IMPORT_GATE_OPEN',
];

export const ALLOWED_RECEIPT_SOURCES = [
  'human_manual_import',
  'operator_verified_import',
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
    auto_promotion_blocked:   true,
    real_execution_blocked_by_default: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    gate_status:     status,
    gate_open:       false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _gateId(seal_id, receipt_source) {
  return _sha256([seal_id || '', receipt_source || '', 'rig-v123.0'].join('|'));
}

export function evaluateStablePromotionReceiptImportGate(params) {
  const {
    stable_promotion_command_seal,
    receipt_source,
    ci_environment,
    github_actions,
    allow_real_receipt,
  } = params || {};

  if (!stable_promotion_command_seal || !stable_promotion_command_seal.seal_ready) {
    return _blocked('RECEIPT_IMPORT_GATE_BLOCKED_SEAL', 'stable_promotion_command_seal not ready');
  }

  if (ci_environment === true || github_actions === true) {
    return _blocked('RECEIPT_IMPORT_GATE_BLOCKED_CI', 'CI/GitHub Actions environment — receipt import blocked');
  }

  if (allow_real_receipt !== true) {
    return _blocked(
      'RECEIPT_IMPORT_GATE_BLOCKED_REAL_DEFAULT',
      'real receipt import blocked by default — set allow_real_receipt=true and provide valid receipt_source to open gate'
    );
  }

  if (!ALLOWED_RECEIPT_SOURCES.includes(receipt_source)) {
    return _blocked(
      'RECEIPT_IMPORT_GATE_BLOCKED_REAL_DEFAULT',
      `receipt_source "${receipt_source}" not in ALLOWED_RECEIPT_SOURCES`
    );
  }

  const seal = stable_promotion_command_seal;
  const gate_id = _gateId(seal.seal_id, receipt_source);

  return {
    schema_version:     SCHEMA_VERSION,
    gate_id,
    gate_status:        'RECEIPT_IMPORT_GATE_OPEN',
    gate_open:          true,
    seal_id:            seal.seal_id,
    target_stable_ref:  seal.target_stable_ref,
    target_tag:         seal.target_tag,
    receipt_source,
    allowed_sources:    ALLOWED_RECEIPT_SOURCES,
    ..._locked(),
  };
}

export function validateStablePromotionReceiptImportGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return { valid: false, errors: ['gate is null/undefined'] };
  }

  const errors = [];

  if (!RECEIPT_IMPORT_GATE_STATUSES.includes(gate.gate_status)) {
    errors.push(`invalid gate_status: ${gate.gate_status}`);
  }
  if (gate.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (gate.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');
  if (gate.auto_promotion_blocked !== true) errors.push('auto_promotion_blocked must be true');
  if (gate.real_execution_blocked_by_default !== true) errors.push('real_execution_blocked_by_default must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionReceiptImportGate(gate) {
  if (!gate || !gate.gate_open) {
    return `[RECEIPT IMPORT GATE BLOCKED] ${gate?.gate_status || 'unknown'}: ${gate?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION RECEIPT IMPORT GATE ===`,
    `Schema:                          ${gate.schema_version}`,
    `Gate ID:                         ${gate.gate_id}`,
    `Status:                          ${gate.gate_status}`,
    `Seal ID:                         ${gate.seal_id}`,
    `Target Ref:                      ${gate.target_stable_ref}`,
    `Target Tag:                      ${gate.target_tag}`,
    `Receipt Source:                  ${gate.receipt_source}`,
    `Allowed Sources:                 ${gate.allowed_sources.join(', ')}`,
    ``,
    `stable_promotion_allowed:        ${gate.stable_promotion_allowed}`,
    `auto_promotion_blocked:          ${gate.auto_promotion_blocked}`,
    `real_execution_blocked_by_default: ${gate.real_execution_blocked_by_default}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-receipt-import-gate.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockSeal = {
    seal_ready:        true,
    seal_id:           'mock-seal-v1230',
    target_stable_ref: 'stable',
    target_tag:        'v123.0-mock',
  };

  const gate = evaluateStablePromotionReceiptImportGate({
    stable_promotion_command_seal: mockSeal,
    receipt_source:                'human_manual_import',
    allow_real_receipt:            true,
  });

  if (isJson) {
    console.log(JSON.stringify(gate, null, 2));
  } else {
    console.log(renderStablePromotionReceiptImportGate(gate));
  }
}
