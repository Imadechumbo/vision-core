#!/usr/bin/env node
/**
 * Stable Promotion Preflight Gate — V114.0
 *
 * Validates all preconditions before future stable promotion command.
 * Does NOT promote stable. Does NOT perform git push. Does NOT deploy or release.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v114.0';

export const STABLE_PREFLIGHT_ALLOWED_TARGETS = [
  'stable',
  'production/stable',
  'refs/heads/stable',
];

export const STABLE_PREFLIGHT_GATE_STATUSES = [
  'STABLE_PREFLIGHT_BLOCKED_REPORT',
  'STABLE_PREFLIGHT_BLOCKED_WORKTREE',
  'STABLE_PREFLIGHT_BLOCKED_CI',
  'STABLE_PREFLIGHT_BLOCKED_ROLLBACK',
  'STABLE_PREFLIGHT_BLOCKED_TARGET',
  'STABLE_PREFLIGHT_READY_FOR_FUTURE_PROMOTION_COMMAND',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:  false,
    stable_promoted:           false,
    git_push_performed:        false,
    deploy_performed:          false,
    release_performed:         false,
    future_promotion_command_required: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:        SCHEMA_VERSION,
    preflight_status:      status,
    preflight_ready:       false,
    stable_preflight_ready: false,
    blocking_reason:       reason,
    ..._locked(),
    ...extra,
  };
}

function _preflightId(report_id, target_stable_ref, git_head) {
  return _sha256([report_id || '', target_stable_ref || '', git_head || '', 'preflight-v114.0'].join('|'));
}

export function evaluateStablePromotionPreflightGate(params) {
  const {
    stable_review_report,
    target_stable_ref,
    target_tag,
    git_head,
    working_tree_clean,
    stable_ref_exists,
    stable_ref_points_to_target,
    rollback_anchor_id,
    ci_environment,
    github_actions,
  } = params || {};

  // Validate review report
  if (
    !stable_review_report ||
    !stable_review_report.report_ready ||
    !stable_review_report.stable_preflight_allowed
  ) {
    return _blocked(
      'STABLE_PREFLIGHT_BLOCKED_REPORT',
      'stable_review_report not ready or stable_preflight_allowed=false'
    );
  }

  // Validate worktree
  if (working_tree_clean !== true) {
    return _blocked('STABLE_PREFLIGHT_BLOCKED_WORKTREE', 'working_tree_clean must be true');
  }

  // Block CI/automation
  if (ci_environment === true || github_actions === true) {
    return _blocked('STABLE_PREFLIGHT_BLOCKED_CI', 'blocked in CI/automation environment');
  }

  // Validate rollback anchor
  if (!rollback_anchor_id) {
    return _blocked('STABLE_PREFLIGHT_BLOCKED_ROLLBACK', 'rollback_anchor_id required');
  }

  // Validate target stable ref
  if (!STABLE_PREFLIGHT_ALLOWED_TARGETS.includes(target_stable_ref)) {
    return _blocked(
      'STABLE_PREFLIGHT_BLOCKED_TARGET',
      `target_stable_ref "${target_stable_ref}" not in allowed list: ${STABLE_PREFLIGHT_ALLOWED_TARGETS.join(', ')}`
    );
  }

  const preflight_id = _preflightId(
    stable_review_report.report_id,
    target_stable_ref,
    git_head
  );

  return {
    schema_version:              SCHEMA_VERSION,
    preflight_id,
    preflight_status:            'STABLE_PREFLIGHT_READY_FOR_FUTURE_PROMOTION_COMMAND',
    preflight_ready:             true,
    stable_preflight_ready:      true,
    target_stable_ref,
    target_tag:                  target_tag || null,
    git_head:                    git_head || null,
    rollback_anchor_id,
    stable_ref_exists:           stable_ref_exists || false,
    stable_ref_points_to_target: stable_ref_points_to_target || false,
    report_id:                   stable_review_report.report_id || null,
    ..._locked(),
  };
}

export function validateStablePromotionPreflightGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return { valid: false, errors: ['gate is null/undefined'] };
  }

  const errors = [];

  if (!STABLE_PREFLIGHT_GATE_STATUSES.includes(gate.preflight_status)) {
    errors.push(`invalid preflight_status: ${gate.preflight_status}`);
  }
  if (gate.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (gate.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');
  if (gate.future_promotion_command_required !== true) {
    errors.push('future_promotion_command_required must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionPreflightGate(gate) {
  if (!gate || !gate.stable_preflight_ready) {
    return `[STABLE PREFLIGHT BLOCKED] ${gate?.preflight_status || 'unknown'}: ${gate?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION PREFLIGHT GATE ===`,
    `Schema:                               ${gate.schema_version}`,
    `Preflight ID:                         ${gate.preflight_id}`,
    `Status:                               ${gate.preflight_status}`,
    `Target Ref:                           ${gate.target_stable_ref}`,
    `Target Tag:                           ${gate.target_tag || 'null'}`,
    `Git HEAD:                             ${gate.git_head || 'null'}`,
    `Rollback Anchor:                      ${gate.rollback_anchor_id}`,
    `stable_ref_exists:                    ${gate.stable_ref_exists}`,
    `stable_ref_points_to_target:          ${gate.stable_ref_points_to_target}`,
    `stable_preflight_ready:               ${gate.stable_preflight_ready}`,
    `stable_promotion_allowed:             ${gate.stable_promotion_allowed}`,
    `stable_promoted:                      ${gate.stable_promoted}`,
    `git_push_performed:                   ${gate.git_push_performed}`,
    `deploy_performed:                     ${gate.deploy_performed}`,
    `release_performed:                    ${gate.release_performed}`,
    `future_promotion_command_required:    ${gate.future_promotion_command_required}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-preflight-gate.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockReport = {
    report_ready:             true,
    report_id:                'mock-report-v1140',
    stable_preflight_allowed: true,
  };

  const gate = evaluateStablePromotionPreflightGate({
    stable_review_report:        mockReport,
    target_stable_ref:           'stable',
    target_tag:                  'v111.0',
    git_head:                    'cafecafe1234567',
    working_tree_clean:          true,
    stable_ref_exists:           false,
    stable_ref_points_to_target: false,
    rollback_anchor_id:          'rollback-mock-v114',
    ci_environment:              false,
    github_actions:              false,
  });

  if (isJson) {
    console.log(JSON.stringify(gate, null, 2));
  } else {
    console.log(renderStablePromotionPreflightGate(gate));
  }
}
