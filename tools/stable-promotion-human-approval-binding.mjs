#!/usr/bin/env node
/**
 * Stable Promotion Human Approval Binding — V116.1
 *
 * Binds human approval to command contract. Does NOT execute stable promotion.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v116.1';

export const REQUIRED_APPROVAL_PHRASE =
  'I APPROVE STABLE PROMOTION REVIEW ONLY AND ACKNOWLEDGE THIS DOES NOT EXECUTE STABLE PROMOTION DEPLOY OR RELEASE';

export const HUMAN_APPROVAL_BINDING_STATUSES = [
  'HUMAN_APPROVAL_BINDING_BLOCKED_CONTRACT',
  'HUMAN_APPROVAL_BINDING_REJECTED',
  'HUMAN_APPROVAL_BINDING_PHRASE_MISMATCH',
  'HUMAN_APPROVAL_BINDING_EXPIRED',
  'HUMAN_APPROVAL_BINDING_READY',
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
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:       SCHEMA_VERSION,
    binding_status:       status,
    binding_ready:        false,
    human_approval_bound: false,
    blocking_reason:      reason,
    ..._locked(),
    ...extra,
  };
}

function _bindingId(contract_id, approved_by, phrase) {
  return _sha256([contract_id || '', approved_by || '', phrase || '', 'hab-v116.1'].join('|'));
}

export function bindStablePromotionHumanApproval(params) {
  const {
    stable_promotion_contract,
    human_approval_phrase,
    approved_by,
    approval_decision,
    expired,
  } = params || {};

  // Validate contract
  if (!stable_promotion_contract || !stable_promotion_contract.contract_ready) {
    return _blocked('HUMAN_APPROVAL_BINDING_BLOCKED_CONTRACT', 'stable_promotion_contract not ready');
  }

  // Check rejection
  if (approval_decision === 'rejected') {
    return _blocked('HUMAN_APPROVAL_BINDING_REJECTED', 'approval explicitly rejected');
  }

  // Check expiry
  if (expired === true) {
    return _blocked('HUMAN_APPROVAL_BINDING_EXPIRED', 'approval expired');
  }

  // Validate phrase
  const phrase = (human_approval_phrase || '').trim();
  if (phrase !== REQUIRED_APPROVAL_PHRASE) {
    return _blocked('HUMAN_APPROVAL_BINDING_PHRASE_MISMATCH',
      `phrase mismatch — required: "${REQUIRED_APPROVAL_PHRASE}"`);
  }

  const binding_id = _bindingId(
    stable_promotion_contract.contract_id,
    approved_by,
    phrase
  );

  return {
    schema_version:          SCHEMA_VERSION,
    binding_id,
    binding_status:          'HUMAN_APPROVAL_BINDING_READY',
    binding_ready:           true,
    contract_id:             stable_promotion_contract.contract_id,
    approved_by:             approved_by || null,
    approval_phrase_verified: true,
    approval_decision:       'approved',
    human_approval_bound:    true,
    ..._locked(),
  };
}

export function validateStablePromotionHumanApprovalBinding(binding) {
  if (!binding || typeof binding !== 'object') {
    return { valid: false, errors: ['binding is null/undefined'] };
  }

  const errors = [];

  if (!HUMAN_APPROVAL_BINDING_STATUSES.includes(binding.binding_status)) {
    errors.push(`invalid binding_status: ${binding.binding_status}`);
  }
  if (binding.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (binding.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (binding.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (binding.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (binding.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (binding.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionHumanApprovalBinding(binding) {
  if (!binding || !binding.binding_ready) {
    return `[HUMAN APPROVAL BINDING BLOCKED] ${binding?.binding_status || 'unknown'}: ${binding?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION HUMAN APPROVAL BINDING ===`,
    `Schema:                    ${binding.schema_version}`,
    `Binding ID:                ${binding.binding_id}`,
    `Status:                    ${binding.binding_status}`,
    `Contract ID:               ${binding.contract_id}`,
    `Approved By:               ${binding.approved_by || 'anonymous'}`,
    `approval_phrase_verified:  ${binding.approval_phrase_verified}`,
    `approval_decision:         ${binding.approval_decision}`,
    `human_approval_bound:      ${binding.human_approval_bound}`,
    `stable_promotion_allowed:  ${binding.stable_promotion_allowed}`,
    `stable_promoted:           ${binding.stable_promoted}`,
    `git_push_performed:        ${binding.git_push_performed}`,
    `deploy_performed:          ${binding.deploy_performed}`,
    `release_performed:         ${binding.release_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-human-approval-binding.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockContract = { contract_ready: true, contract_id: 'mock-contract-v1161' };

  const binding = bindStablePromotionHumanApproval({
    stable_promotion_contract: mockContract,
    human_approval_phrase:     REQUIRED_APPROVAL_PHRASE,
    approved_by:               'human-operator-mock',
    approval_decision:         'approved',
  });

  if (isJson) {
    console.log(JSON.stringify(binding, null, 2));
  } else {
    console.log(renderStablePromotionHumanApprovalBinding(binding));
  }
}
