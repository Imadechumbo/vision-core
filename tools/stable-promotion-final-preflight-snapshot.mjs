#!/usr/bin/env node
/**
 * Stable Promotion Final Preflight Snapshot — V122.0
 *
 * Captures a final preflight state snapshot before stable promotion.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false,
 * snapshot_executes_nothing=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v122.0';

export const PREFLIGHT_SNAPSHOT_STATUSES = [
  'PREFLIGHT_SNAPSHOT_BLOCKED_RUNBOOK',
  'PREFLIGHT_SNAPSHOT_BLOCKED_CI',
  'PREFLIGHT_SNAPSHOT_READY',
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
    snapshot_executes_nothing: true,
    pre_promotion_only:        true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    snapshot_status:   status,
    snapshot_ready:    false,
    blocking_reason:   reason,
    ..._locked(),
    ...extra,
  };
}

function _snapshotId(runbook_id, target_tag) {
  return _sha256([runbook_id || '', target_tag || '', 'preflight-snap-v122.0'].join('|'));
}

function _contentHash(params) {
  return _sha256(JSON.stringify({
    runbook_id:        params.runbook_id,
    target_stable_ref: params.target_stable_ref,
    target_tag:        params.target_tag,
    all_gates_passed:  params.all_gates_passed,
  }));
}

export function captureStablePromotionFinalPreflightSnapshot(params) {
  const {
    stable_promotion_human_runbook,
    ci_environment,
    github_actions,
    current_stable_head,
    current_worktree_status,
  } = params || {};

  if (!stable_promotion_human_runbook || !stable_promotion_human_runbook.runbook_ready) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_RUNBOOK', 'stable_promotion_human_runbook not ready');
  }

  if (ci_environment === true || github_actions === true) {
    return _blocked('PREFLIGHT_SNAPSHOT_BLOCKED_CI', 'CI/GitHub Actions environment detected — snapshot blocked');
  }

  const runbook = stable_promotion_human_runbook;
  const snapshot_id   = _snapshotId(runbook.runbook_id, runbook.target_tag);
  const content_hash  = _contentHash({
    runbook_id:        runbook.runbook_id,
    target_stable_ref: runbook.target_stable_ref,
    target_tag:        runbook.target_tag,
    all_gates_passed:  runbook.all_gates_passed,
  });

  return {
    schema_version:       SCHEMA_VERSION,
    snapshot_id,
    snapshot_status:      'PREFLIGHT_SNAPSHOT_READY',
    snapshot_ready:       true,
    runbook_id:           runbook.runbook_id,
    target_stable_ref:    runbook.target_stable_ref,
    target_tag:           runbook.target_tag,
    all_gates_passed:     runbook.all_gates_passed,
    current_stable_head:  current_stable_head  || null,
    current_worktree_status: current_worktree_status || 'unknown',
    content_hash,
    ..._locked(),
  };
}

export function validateStablePromotionFinalPreflightSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, errors: ['snapshot is null/undefined'] };
  }

  const errors = [];

  if (!PREFLIGHT_SNAPSHOT_STATUSES.includes(snapshot.snapshot_status)) {
    errors.push(`invalid snapshot_status: ${snapshot.snapshot_status}`);
  }
  if (snapshot.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (snapshot.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (snapshot.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (snapshot.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (snapshot.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (snapshot.release_performed !== false) errors.push('release_performed must be false');
  if (snapshot.snapshot_executes_nothing !== true) errors.push('snapshot_executes_nothing must be true');
  if (snapshot.pre_promotion_only !== true) errors.push('pre_promotion_only must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionFinalPreflightSnapshot(snapshot) {
  if (!snapshot || !snapshot.snapshot_ready) {
    return `[PREFLIGHT SNAPSHOT BLOCKED] ${snapshot?.snapshot_status || 'unknown'}: ${snapshot?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION FINAL PREFLIGHT SNAPSHOT ===`,
    `Schema:                  ${snapshot.schema_version}`,
    `Snapshot ID:             ${snapshot.snapshot_id}`,
    `Status:                  ${snapshot.snapshot_status}`,
    `Runbook ID:              ${snapshot.runbook_id}`,
    `Target Ref:              ${snapshot.target_stable_ref}`,
    `Target Tag:              ${snapshot.target_tag}`,
    `All Gates Passed:        ${snapshot.all_gates_passed}`,
    `Current Stable HEAD:     ${snapshot.current_stable_head || 'unknown'}`,
    `Worktree Status:         ${snapshot.current_worktree_status}`,
    `Content Hash:            ${snapshot.content_hash}`,
    ``,
    `stable_promotion_allowed:  ${snapshot.stable_promotion_allowed}`,
    `snapshot_executes_nothing: ${snapshot.snapshot_executes_nothing}`,
    `pre_promotion_only:        ${snapshot.pre_promotion_only}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-final-preflight-snapshot.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockRunbook = {
    runbook_ready:     true,
    runbook_id:        'mock-runbook-v1220',
    target_stable_ref: 'stable',
    target_tag:        'v122.0-mock',
    all_gates_passed:  true,
  };

  const snapshot = captureStablePromotionFinalPreflightSnapshot({
    stable_promotion_human_runbook: mockRunbook,
    current_stable_head:            'cafecafe1234567',
    current_worktree_status:        'clean',
  });

  if (isJson) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    console.log(renderStablePromotionFinalPreflightSnapshot(snapshot));
  }
}
