#!/usr/bin/env node
/**
 * Stable Review Human Approval Contract — V112.1
 *
 * Captures human approval phrase for stable review gate.
 * Does NOT promote stable. Does NOT perform deploy or release.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v112.1';

export const REQUIRED_APPROVAL_PHRASE =
  'I APPROVE STABLE REVIEW ONLY AND ACKNOWLEDGE THIS DOES NOT PROMOTE STABLE DEPLOY OR RELEASE';

export const STABLE_REVIEW_APPROVAL_STATUSES = [
  'STABLE_REVIEW_APPROVAL_BLOCKED_DECISION',
  'STABLE_REVIEW_APPROVAL_BLOCKED_PHRASE',
  'STABLE_REVIEW_APPROVAL_DRY_RUN_ONLY',
  'STABLE_REVIEW_APPROVAL_MOCK_REAL_TAG_ONLY',
  'STABLE_REVIEW_APPROVAL_REAL_TAG_READY',
  'STABLE_REVIEW_APPROVAL_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:  false,
    stable_promoted:           false,
    deploy_performed:          false,
    release_performed:         false,
    human_stable_review_required: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    approval_status: status,
    approval_ready:  false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _approvalId(decision_id, phrase) {
  return _sha256([decision_id, phrase, 'approval-v112.1'].join('|'));
}

export function buildStableReviewHumanApprovalContract(params) {
  const {
    stable_review_decision_matrix,
    human_approval_phrase,
    approver_id,
  } = params || {};

  // Validate decision matrix
  if (!stable_review_decision_matrix || !stable_review_decision_matrix.decision_ready) {
    return _blocked(
      'STABLE_REVIEW_APPROVAL_BLOCKED_DECISION',
      'stable_review_decision_matrix not ready'
    );
  }

  // Validate approval phrase
  const phrase = (human_approval_phrase || '').trim();
  if (phrase !== REQUIRED_APPROVAL_PHRASE) {
    return _blocked(
      'STABLE_REVIEW_APPROVAL_BLOCKED_PHRASE',
      `approval phrase mismatch — required: "${REQUIRED_APPROVAL_PHRASE}"`
    );
  }

  const { decision_status, decision_id, real_tag_confirmed, dry_run_confirmed } =
    stable_review_decision_matrix;

  let approval_status;
  let approval_ready = false;

  if (decision_status === 'STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW' && real_tag_confirmed) {
    approval_status = 'STABLE_REVIEW_APPROVAL_REAL_TAG_READY';
    approval_ready = true;
  } else if (decision_status === 'STABLE_REVIEW_DECISION_MOCK_REAL_TAG_ONLY') {
    approval_status = 'STABLE_REVIEW_APPROVAL_MOCK_REAL_TAG_ONLY';
  } else if (decision_status === 'STABLE_REVIEW_DECISION_DRY_RUN_ONLY' || dry_run_confirmed) {
    approval_status = 'STABLE_REVIEW_APPROVAL_DRY_RUN_ONLY';
  } else {
    approval_status = 'STABLE_REVIEW_APPROVAL_READY';
    approval_ready = true;
  }

  const approval_id = _approvalId(decision_id, phrase);

  return {
    schema_version:               SCHEMA_VERSION,
    approval_id,
    approval_status,
    approval_ready,
    decision_id,
    decision_status,
    approver_id:                  approver_id || null,
    human_approval_phrase:        phrase,
    approval_phrase_verified:     true,
    real_tag_confirmed:           real_tag_confirmed || false,
    dry_run_confirmed:            dry_run_confirmed || false,
    future_stable_promotion_command_required: true,
    ..._locked(),
  };
}

export function validateStableReviewHumanApprovalContract(contract) {
  if (!contract || typeof contract !== 'object') {
    return { valid: false, errors: ['contract is null/undefined'] };
  }

  const errors = [];

  if (!STABLE_REVIEW_APPROVAL_STATUSES.includes(contract.approval_status)) {
    errors.push(`invalid approval_status: ${contract.approval_status}`);
  }
  if (contract.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (contract.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (contract.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (contract.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (contract.release_performed !== false) errors.push('release_performed must be false');
  if (contract.human_stable_review_required !== true) errors.push('human_stable_review_required must be true');
  if (contract.future_stable_promotion_command_required !== true) {
    errors.push('future_stable_promotion_command_required must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStableReviewHumanApprovalContract(contract) {
  if (!contract || !contract.approval_ready) {
    return `[STABLE REVIEW APPROVAL BLOCKED] ${contract?.approval_status || 'unknown'}: ${contract?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE REVIEW HUMAN APPROVAL CONTRACT ===`,
    `Schema:                               ${contract.schema_version}`,
    `Approval ID:                          ${contract.approval_id}`,
    `Status:                               ${contract.approval_status}`,
    `Decision ID:                          ${contract.decision_id}`,
    `Approver:                             ${contract.approver_id || 'anonymous'}`,
    `approval_phrase_verified:             ${contract.approval_phrase_verified}`,
    `real_tag_confirmed:                   ${contract.real_tag_confirmed}`,
    `dry_run_confirmed:                    ${contract.dry_run_confirmed}`,
    `stable_promotion_allowed:             ${contract.stable_promotion_allowed}`,
    `stable_promoted:                      ${contract.stable_promoted}`,
    `deploy_performed:                     ${contract.deploy_performed}`,
    `future_stable_promotion_command_required: ${contract.future_stable_promotion_command_required}`,
    `human_stable_review_required:         ${contract.human_stable_review_required}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-review-human-approval-contract.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockDecision = {
    decision_ready:     true,
    decision_id:        'mock-decision-v1121',
    decision_status:    'STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW',
    real_tag_confirmed: true,
    dry_run_confirmed:  false,
  };

  const contract = buildStableReviewHumanApprovalContract({
    stable_review_decision_matrix: mockDecision,
    human_approval_phrase:         REQUIRED_APPROVAL_PHRASE,
    approver_id:                   'human-operator-mock',
  });

  if (isJson) {
    console.log(JSON.stringify(contract, null, 2));
  } else {
    console.log(renderStableReviewHumanApprovalContract(contract));
  }
}
