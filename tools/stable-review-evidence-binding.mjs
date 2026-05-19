#!/usr/bin/env node
/**
 * Stable Review Evidence Binding — V111.1
 *
 * Binds stable review contract to evidence receipt, tag operation baseline,
 * rollback anchor and ledger. Does NOT promote stable.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v111.1';

export const STABLE_REVIEW_BINDING_STATUSES = [
  'STABLE_REVIEW_BINDING_BLOCKED_CONTRACT',
  'STABLE_REVIEW_BINDING_BLOCKED_EVIDENCE',
  'STABLE_REVIEW_BINDING_BLOCKED_LEDGER',
  'STABLE_REVIEW_BINDING_DRY_RUN_READY',
  'STABLE_REVIEW_BINDING_REAL_TAG_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed: false,
    stable_promoted:          false,
    deploy_performed:         false,
    release_performed:        false,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    binding_status:  status,
    binding_ready:   false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _bindingId(contract_id, baseline_id, evidence_receipt_id) {
  return _sha256([contract_id, baseline_id, evidence_receipt_id, 'binding-v111.1'].join('|'));
}

export function bindStableReviewEvidence(params) {
  const {
    stable_review_contract,
    one_tag_baseline_id,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    ledger_chain_valid,
    receipt_verified,
  } = params || {};

  // Validate contract
  if (!stable_review_contract || !stable_review_contract.contract_ready) {
    return _blocked('STABLE_REVIEW_BINDING_BLOCKED_CONTRACT', 'stable_review_contract not ready');
  }

  // Validate evidence
  if (evidence_source !== 'go-core' || !evidence_receipt_id) {
    return _blocked('STABLE_REVIEW_BINDING_BLOCKED_EVIDENCE',
      'evidence_source must be go-core and evidence_receipt_id required');
  }

  // Validate ledger
  if (ledger_chain_valid !== true) {
    return _blocked('STABLE_REVIEW_BINDING_BLOCKED_LEDGER', 'ledger_chain_valid must be true');
  }

  const real_tag_confirmed = stable_review_contract.actual_real_tag_created === true &&
    stable_review_contract.actual_git_push_performed === true &&
    receipt_verified === true;

  const dry_run_confirmed = !real_tag_confirmed;

  const binding_status = real_tag_confirmed
    ? 'STABLE_REVIEW_BINDING_REAL_TAG_READY'
    : 'STABLE_REVIEW_BINDING_DRY_RUN_READY';

  const baseline_id = one_tag_baseline_id ||
    stable_review_contract.one_tag_baseline_id ||
    stable_review_contract.stable_review_contract_id;

  const binding_id = _bindingId(
    stable_review_contract.stable_review_contract_id,
    baseline_id,
    evidence_receipt_id
  );

  const stable_review_evidence_ready = true;

  return {
    schema_version:               SCHEMA_VERSION,
    binding_id,
    binding_status,
    binding_ready:                true,
    stable_review_contract_id:    stable_review_contract.stable_review_contract_id,
    one_tag_baseline_id:          baseline_id,
    target_tag:                   stable_review_contract.target_tag,
    git_head:                     stable_review_contract.git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id:           rollback_anchor_id || stable_review_contract.rollback_anchor_id || null,
    ledger_chain_valid:           true,
    receipt_verified:             receipt_verified || false,
    real_tag_confirmed,
    dry_run_confirmed,
    stable_review_evidence_ready,
    ..._locked(),
  };
}

export function validateStableReviewEvidenceBinding(binding) {
  if (!binding || typeof binding !== 'object') return { valid: false, errors: ['binding is null/undefined'] };

  const errors = [];

  if (!STABLE_REVIEW_BINDING_STATUSES.includes(binding.binding_status)) {
    errors.push(`invalid binding_status: ${binding.binding_status}`);
  }
  if (binding.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (binding.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (binding.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (binding.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (binding.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderStableReviewEvidenceBinding(binding) {
  if (!binding || !binding.binding_ready) {
    return `[STABLE REVIEW BINDING BLOCKED] ${binding?.binding_status || 'unknown'}: ${binding?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE REVIEW EVIDENCE BINDING ===`,
    `Schema:                      ${binding.schema_version}`,
    `Binding ID:                  ${binding.binding_id}`,
    `Status:                      ${binding.binding_status}`,
    `Target Tag:                  ${binding.target_tag}`,
    `Git HEAD:                    ${binding.git_head}`,
    `Evidence:                    ${binding.evidence_receipt_id} (${binding.evidence_source})`,
    `ledger_chain_valid:          ${binding.ledger_chain_valid}`,
    `receipt_verified:            ${binding.receipt_verified}`,
    `real_tag_confirmed:          ${binding.real_tag_confirmed}`,
    `dry_run_confirmed:           ${binding.dry_run_confirmed}`,
    `stable_review_evidence_ready: ${binding.stable_review_evidence_ready}`,
    `stable_promotion_allowed:    ${binding.stable_promotion_allowed}`,
    `stable_promoted:             ${binding.stable_promoted}`,
    `deploy_performed:            ${binding.deploy_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-review-evidence-binding.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockContract = {
    contract_ready:               true,
    contract_status:              'STABLE_REVIEW_CONTRACT_DRY_RUN_REVIEW_READY',
    stable_review_contract_id:    'mock-contract-v1111',
    one_tag_baseline_id:          'mock-baseline-v110',
    target_tag:                   'v111.1-mock',
    git_head:                     '42e5e19',
    evidence_receipt_id:          'mock-evidence-v111',
    evidence_source:              'go-core',
    rollback_anchor_id:           'mock-rollback-v111',
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    stable_promotion_allowed:     false,
    stable_promoted:              false,
  };

  const binding = bindStableReviewEvidence({
    stable_review_contract: mockContract,
    evidence_receipt_id:    'mock-evidence-v111',
    evidence_source:        'go-core',
    rollback_anchor_id:     'mock-rollback-v111',
    ledger_chain_valid:     true,
    receipt_verified:       false,
  });

  if (isJson) {
    console.log(JSON.stringify(binding, null, 2));
  } else {
    console.log(renderStableReviewEvidenceBinding(binding));
  }
}
