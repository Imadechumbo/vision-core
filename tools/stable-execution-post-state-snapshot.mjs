#!/usr/bin/env node
/**
 * Stable Execution Post-State Snapshot — V127.0
 *
 * Captures a snapshot of system state after stable promotion execution.
 * Does NOT execute any commands. Records state from diff verifier.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v127.0';

export const POST_STATE_SNAPSHOT_STATUSES = [
  'POST_STATE_SNAPSHOT_BLOCKED_VERIFIER',
  'POST_STATE_SNAPSHOT_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    system_execution_performed:    false,
    automated_promotion_performed: false,
    stable_promotion_allowed:      false,
    stable_promoted:               false,
    git_push_performed:            false,
    deploy_performed:              false,
    release_performed:             false,
    snapshot_is_post_execution:    true,
    snapshot_executes_nothing:     true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    snapshot_status:  status,
    snapshot_ready:   false,
    blocking_reason:  reason,
    ..._locked(),
    ...extra,
  };
}

function _snapshotId(verifier_id, target_stable_ref, target_tag) {
  return _sha256([verifier_id || '', target_stable_ref || '', target_tag || '', 'pss-v127.0'].join('|'));
}

function _contentHash(verifier_id, target_stable_ref, target_tag, execution_receipt_id, executed_by) {
  return _sha256([verifier_id || '', target_stable_ref || '', target_tag || '', execution_receipt_id || '', executed_by || ''].join('|'));
}

export function captureStableExecutionPostStateSnapshot(params) {
  const {
    stable_execution_diff_verifier,
    captured_at,
  } = params || {};

  if (!stable_execution_diff_verifier || stable_execution_diff_verifier.diff_verified !== true) {
    return _blocked(
      'POST_STATE_SNAPSHOT_BLOCKED_VERIFIER',
      'stable_execution_diff_verifier not verified'
    );
  }

  const v = stable_execution_diff_verifier;
  const snapshot_id  = _snapshotId(v.verifier_id, v.target_stable_ref, v.target_tag);
  const content_hash = _contentHash(v.verifier_id, v.target_stable_ref, v.target_tag, v.execution_receipt_id, v.executed_by);

  return {
    schema_version:        SCHEMA_VERSION,
    snapshot_id,
    snapshot_status:       'POST_STATE_SNAPSHOT_READY',
    snapshot_ready:        true,
    content_hash,
    verifier_id:           v.verifier_id,
    governance_baseline_id: v.governance_baseline_id,
    import_id:             v.import_id,
    execution_receipt_id:  v.execution_receipt_id,
    executed_by:           v.executed_by,
    target_stable_ref:     v.target_stable_ref,
    target_tag:            v.target_tag,
    all_checks_passed:     Object.values(v.checks || {}).every(Boolean),
    captured_at:           captured_at || null,
    ..._locked(),
  };
}

export function validateStableExecutionPostStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, errors: ['snapshot is null/undefined'] };
  }

  const errors = [];

  if (!POST_STATE_SNAPSHOT_STATUSES.includes(snapshot.snapshot_status)) {
    errors.push(`invalid snapshot_status: ${snapshot.snapshot_status}`);
  }
  if (snapshot.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (snapshot.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (snapshot.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (snapshot.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (snapshot.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (snapshot.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (snapshot.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (snapshot.release_performed !== false) errors.push('release_performed must be false');
  if (snapshot.snapshot_is_post_execution !== true) errors.push('snapshot_is_post_execution must be true');
  if (snapshot.snapshot_executes_nothing !== true) errors.push('snapshot_executes_nothing must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStableExecutionPostStateSnapshot(snapshot) {
  if (!snapshot || !snapshot.snapshot_ready) {
    return `[POST-STATE SNAPSHOT BLOCKED] ${snapshot?.snapshot_status || 'unknown'}: ${snapshot?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE EXECUTION POST-STATE SNAPSHOT V127.0 ===`,
    `Schema:                          ${snapshot.schema_version}`,
    `Snapshot ID:                     ${snapshot.snapshot_id}`,
    `Status:                          ${snapshot.snapshot_status}`,
    `Content Hash:                    ${snapshot.content_hash}`,
    `Verifier ID:                     ${snapshot.verifier_id}`,
    `Governance Baseline ID:          ${snapshot.governance_baseline_id}`,
    `Execution Receipt ID:            ${snapshot.execution_receipt_id}`,
    `Executed By:                     ${snapshot.executed_by}`,
    `Target Ref:                      ${snapshot.target_stable_ref}`,
    `Target Tag:                      ${snapshot.target_tag}`,
    `All Checks Passed:               ${snapshot.all_checks_passed}`,
    `Captured At:                     ${snapshot.captured_at || 'not provided'}`,
    ``,
    `system_execution_performed:      ${snapshot.system_execution_performed}`,
    `automated_promotion_performed:   ${snapshot.automated_promotion_performed}`,
    `snapshot_is_post_execution:      ${snapshot.snapshot_is_post_execution}`,
    `snapshot_executes_nothing:       ${snapshot.snapshot_executes_nothing}`,
    `stable_promotion_allowed:        ${snapshot.stable_promotion_allowed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-execution-post-state-snapshot.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockVerifier = {
    diff_verified:          true,
    verifier_id:            'mock-verifier-v1270',
    governance_baseline_id: 'mock-baseline-v125',
    import_id:              'mock-import-v126',
    execution_receipt_id:   'mock-exec-receipt-v127',
    executed_by:            'human-operator',
    target_stable_ref:      'stable',
    target_tag:             'v127.0-cli-mock',
    checks: {
      target_ref_match:  true,
      target_tag_match:  true,
      baseline_id_match: true,
    },
  };

  const snapshot = captureStableExecutionPostStateSnapshot({
    stable_execution_diff_verifier: mockVerifier,
    captured_at: new Date().toISOString(),
  });

  if (isJson) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    console.log(renderStableExecutionPostStateSnapshot(snapshot));
  }
}
