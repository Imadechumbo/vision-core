#!/usr/bin/env node
/**
 * Stable Review Decision Matrix — V112.0
 *
 * Evaluates stable review decision from evidence binding.
 * Distinguishes dry-run/mock/real-tag eligible states. Does NOT promote stable.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v112.0';

export const STABLE_REVIEW_DECISION_STATUSES = [
  'STABLE_REVIEW_DECISION_BLOCKED_BINDING',
  'STABLE_REVIEW_DECISION_DRY_RUN_ONLY',
  'STABLE_REVIEW_DECISION_MOCK_REAL_TAG_ONLY',
  'STABLE_REVIEW_DECISION_REAL_TAG_ELIGIBLE',
  'STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW',
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
    schema_version:              SCHEMA_VERSION,
    decision_status:             status,
    decision_ready:              false,
    blocking_reason:             reason,
    ..._locked(),
    ...extra,
  };
}

function _safeNextActions(decision_status) {
  if (decision_status === 'STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW') {
    return [
      'prepare_stable_human_approval_contract',
      'verify_actual_receipt_import',
      'verify_tag_on_remote',
      'inspect_ledger',
    ];
  }
  if (decision_status === 'STABLE_REVIEW_DECISION_REAL_TAG_ELIGIBLE') {
    return [
      'import_human_receipt_to_confirm_real_tag',
      'prepare_stable_review_binding',
    ];
  }
  if (decision_status === 'STABLE_REVIEW_DECISION_MOCK_REAL_TAG_ONLY') {
    return [
      'verify_actual_receipt_before_stable',
      'execute_real_tag_manually_first',
    ];
  }
  return [
    'require_real_tag_receipt_before_stable_review_real',
    'execute_dry_run_first',
  ];
}

function _blockedActions() {
  return [
    'auto_stable_promotion',
    'auto_deploy',
    'auto_release',
    'force_push',
    'evidence_override',
    'go_core_override',
    'ci_stable_execution',
  ];
}

function _decisionId(binding_id) {
  return _sha256([binding_id, 'decision-v112.0'].join('|'));
}

export function evaluateStableReviewDecisionMatrix(params) {
  const { stable_review_binding, tag_operation_mode } = params || {};

  // Validate binding
  if (!stable_review_binding || !stable_review_binding.binding_ready) {
    return _blocked('STABLE_REVIEW_DECISION_BLOCKED_BINDING', 'stable_review_binding not ready');
  }

  const { real_tag_confirmed, dry_run_confirmed, binding_id } = stable_review_binding;

  let decision_status;
  let stable_review_ready = false;

  if (real_tag_confirmed) {
    decision_status = 'STABLE_REVIEW_DECISION_READY_FOR_HUMAN_STABLE_REVIEW';
    stable_review_ready = true;
  } else if (tag_operation_mode === 'mock_real_tag') {
    decision_status = 'STABLE_REVIEW_DECISION_MOCK_REAL_TAG_ONLY';
  } else if (dry_run_confirmed) {
    decision_status = 'STABLE_REVIEW_DECISION_DRY_RUN_ONLY';
  } else {
    decision_status = 'STABLE_REVIEW_DECISION_REAL_TAG_ELIGIBLE';
  }

  const decision_id = _decisionId(binding_id);

  return {
    schema_version:          SCHEMA_VERSION,
    decision_id,
    decision_status,
    decision_ready:          true,
    real_tag_confirmed:      real_tag_confirmed || false,
    dry_run_confirmed:       dry_run_confirmed || false,
    stable_review_ready,
    safe_next_actions:       _safeNextActions(decision_status),
    blocked_actions:         _blockedActions(),
    ..._locked(),
  };
}

export function validateStableReviewDecisionMatrix(matrix) {
  if (!matrix || typeof matrix !== 'object') return { valid: false, errors: ['matrix is null/undefined'] };

  const errors = [];

  if (!STABLE_REVIEW_DECISION_STATUSES.includes(matrix.decision_status)) {
    errors.push(`invalid decision_status: ${matrix.decision_status}`);
  }
  if (matrix.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (matrix.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (matrix.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (matrix.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (matrix.release_performed !== false) errors.push('release_performed must be false');
  if (matrix.human_stable_review_required !== true) errors.push('human_stable_review_required must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStableReviewDecisionMatrix(matrix) {
  if (!matrix || !matrix.decision_ready) {
    return `[STABLE REVIEW DECISION BLOCKED] ${matrix?.decision_status || 'unknown'}: ${matrix?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE REVIEW DECISION MATRIX ===`,
    `Schema:                  ${matrix.schema_version}`,
    `Decision ID:             ${matrix.decision_id}`,
    `Status:                  ${matrix.decision_status}`,
    `real_tag_confirmed:      ${matrix.real_tag_confirmed}`,
    `dry_run_confirmed:       ${matrix.dry_run_confirmed}`,
    `stable_review_ready:     ${matrix.stable_review_ready}`,
    `stable_promotion_allowed: ${matrix.stable_promotion_allowed}`,
    `stable_promoted:         ${matrix.stable_promoted}`,
    `deploy_performed:        ${matrix.deploy_performed}`,
    ``,
    `Safe next actions: ${matrix.safe_next_actions.join(', ')}`,
    `Blocked actions:   ${matrix.blocked_actions.join(', ')}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-review-decision-matrix.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockBinding = {
    binding_ready:                true,
    binding_status:               'STABLE_REVIEW_BINDING_DRY_RUN_READY',
    binding_id:                   'mock-binding-v1120',
    real_tag_confirmed:           false,
    dry_run_confirmed:            true,
    stable_promotion_allowed:     false,
    stable_promoted:              false,
  };

  const matrix = evaluateStableReviewDecisionMatrix({
    stable_review_binding: mockBinding,
    tag_operation_mode:    'dry_run',
  });

  if (isJson) {
    console.log(JSON.stringify(matrix, null, 2));
  } else {
    console.log(renderStableReviewDecisionMatrix(matrix));
  }
}
