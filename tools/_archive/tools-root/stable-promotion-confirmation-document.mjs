#!/usr/bin/env node
/**
 * Stable Promotion Confirmation Document — V127.1
 *
 * Issues a formal confirmation document for a completed human-executed
 * stable promotion. Records all governance artifacts.
 * Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v127.1';

export const CONFIRMATION_DOCUMENT_STATUSES = [
  'CONFIRMATION_DOCUMENT_BLOCKED_SNAPSHOT',
  'CONFIRMATION_DOCUMENT_ISSUED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    system_execution_performed:      false,
    automated_promotion_performed:   false,
    stable_promotion_allowed:        false,
    stable_promoted:                 false,
    git_push_performed:              false,
    deploy_performed:                false,
    release_performed:               false,
    confirmation_is_human_only:      true,
    future_promotion_requires_new_governance_cycle: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:       SCHEMA_VERSION,
    document_status:      status,
    document_issued:      false,
    blocking_reason:      reason,
    ..._locked(),
    ...extra,
  };
}

function _confirmationId(snapshot_id, governance_baseline_id, execution_receipt_id) {
  return _sha256([snapshot_id || '', governance_baseline_id || '', execution_receipt_id || '', 'pcd-v127.1'].join('|'));
}

export function issueStablePromotionConfirmationDocument(params) {
  const {
    stable_execution_post_state_snapshot,
    issued_by,
    notes,
  } = params || {};

  if (!stable_execution_post_state_snapshot || stable_execution_post_state_snapshot.snapshot_ready !== true) {
    return _blocked(
      'CONFIRMATION_DOCUMENT_BLOCKED_SNAPSHOT',
      'stable_execution_post_state_snapshot not ready'
    );
  }

  const snap = stable_execution_post_state_snapshot;
  const confirmation_id = _confirmationId(snap.snapshot_id, snap.governance_baseline_id, snap.execution_receipt_id);

  return {
    schema_version:         SCHEMA_VERSION,
    confirmation_id,
    document_status:        'CONFIRMATION_DOCUMENT_ISSUED',
    document_issued:        true,
    snapshot_id:            snap.snapshot_id,
    governance_baseline_id: snap.governance_baseline_id,
    import_id:              snap.import_id,
    execution_receipt_id:   snap.execution_receipt_id,
    verifier_id:            snap.verifier_id,
    executed_by:            snap.executed_by,
    target_stable_ref:      snap.target_stable_ref,
    target_tag:             snap.target_tag,
    all_checks_passed:      snap.all_checks_passed,
    content_hash:           snap.content_hash,
    issued_by:              issued_by || null,
    notes:                  notes || null,
    ..._locked(),
  };
}

export function validateStablePromotionConfirmationDocument(doc) {
  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['document is null/undefined'] };
  }

  const errors = [];

  if (!CONFIRMATION_DOCUMENT_STATUSES.includes(doc.document_status)) {
    errors.push(`invalid document_status: ${doc.document_status}`);
  }
  if (doc.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (doc.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (doc.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (doc.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (doc.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (doc.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (doc.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (doc.release_performed !== false) errors.push('release_performed must be false');
  if (doc.confirmation_is_human_only !== true) errors.push('confirmation_is_human_only must be true');
  if (doc.future_promotion_requires_new_governance_cycle !== true) {
    errors.push('future_promotion_requires_new_governance_cycle must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionConfirmationDocument(doc) {
  if (!doc || !doc.document_issued) {
    return `[CONFIRMATION DOCUMENT BLOCKED] ${doc?.document_status || 'unknown'}: ${doc?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION CONFIRMATION DOCUMENT V127.1 ===`,
    `Schema:                                         ${doc.schema_version}`,
    `Confirmation ID:                                ${doc.confirmation_id}`,
    `Status:                                         ${doc.document_status}`,
    `Snapshot ID:                                    ${doc.snapshot_id}`,
    `Governance Baseline ID:                         ${doc.governance_baseline_id}`,
    `Import ID:                                      ${doc.import_id}`,
    `Execution Receipt ID:                           ${doc.execution_receipt_id}`,
    `Verifier ID:                                    ${doc.verifier_id}`,
    `Executed By:                                    ${doc.executed_by}`,
    `Target Ref:                                     ${doc.target_stable_ref}`,
    `Target Tag:                                     ${doc.target_tag}`,
    `All Checks Passed:                              ${doc.all_checks_passed}`,
    `Content Hash:                                   ${doc.content_hash}`,
    `Issued By:                                      ${doc.issued_by || 'not specified'}`,
    `Notes:                                          ${doc.notes || 'none'}`,
    ``,
    `system_execution_performed:                     ${doc.system_execution_performed}`,
    `automated_promotion_performed:                  ${doc.automated_promotion_performed}`,
    `confirmation_is_human_only:                     ${doc.confirmation_is_human_only}`,
    `future_promotion_requires_new_governance_cycle: ${doc.future_promotion_requires_new_governance_cycle}`,
    `stable_promotion_allowed:                       ${doc.stable_promotion_allowed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-confirmation-document.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockSnapshot = {
    snapshot_ready:         true,
    snapshot_id:            'mock-snapshot-v127',
    governance_baseline_id: 'mock-baseline-v125',
    import_id:              'mock-import-v126',
    execution_receipt_id:   'mock-exec-receipt-v127',
    verifier_id:            'mock-verifier-v1261',
    executed_by:            'human-operator',
    target_stable_ref:      'stable',
    target_tag:             'v127.1-cli-mock',
    all_checks_passed:      true,
    content_hash:           'a'.repeat(64),
  };

  const doc = issueStablePromotionConfirmationDocument({
    stable_execution_post_state_snapshot: mockSnapshot,
    issued_by: 'governance-operator',
    notes: 'CLI mock confirmation',
  });

  if (isJson) {
    console.log(JSON.stringify(doc, null, 2));
  } else {
    console.log(renderStablePromotionConfirmationDocument(doc));
  }
}
