#!/usr/bin/env node
/**
 * One Real Tag Human Receipt Import + Verify — V107.1
 *
 * Imports captured receipt and verifies it against command export and
 * observed git state. Does NOT execute anything.
 *
 * REGRA ABSOLUTA: deploy_performed=false, stable_promoted=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v107.1';

export const RECEIPT_VERIFY_STATUSES = [
  'RECEIPT_VERIFY_BLOCKED_CAPTURE',
  'RECEIPT_VERIFY_BLOCKED_EXPORT',
  'RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD',
  'RECEIPT_VERIFY_BLOCKED_REMOTE_HEAD',
  'RECEIPT_VERIFY_BLOCKED_WORKTREE',
  'RECEIPT_VERIFY_BLOCKED_DEPLOY',
  'RECEIPT_VERIFY_BLOCKED_STABLE',
  'RECEIPT_VERIFY_BLOCKED_RELEASE',
  'RECEIPT_VERIFY_DRY_RUN_CONFIRMED',
  'RECEIPT_VERIFY_REAL_TAG_CONFIRMED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    verify_status:     status,
    verify_ready:      false,
    blocking_reason:   reason,
    deploy_performed:  false,
    stable_promoted:   false,
    release_performed: false,
    ...extra,
  };
}

function _verifyId(receipt_id, export_id) {
  return _sha256([receipt_id, export_id, 'verify-v107.1'].join('|'));
}

export function importAndVerifyOneRealTagHumanReceipt(params) {
  const {
    captured_receipt,
    command_export,
    observed_local_tag_head,
    observed_remote_tag_head,
    observed_worktree_clean,
    observed_deploy_performed,
    observed_stable_promoted,
    observed_release_performed,
  } = params || {};

  // Validate capture
  if (!captured_receipt || !captured_receipt.capture_ready) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_CAPTURE', 'captured_receipt not ready');
  }

  // Validate command export
  if (!command_export || !command_export.export_ready) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_EXPORT', 'command_export not ready');
  }

  // Block deploy/stable/release
  if (observed_deploy_performed === true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_DEPLOY', 'observed_deploy_performed must be false');
  }
  if (observed_stable_promoted === true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_STABLE', 'observed_stable_promoted must be false');
  }
  if (observed_release_performed === true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_RELEASE', 'observed_release_performed must be false');
  }

  const is_real = captured_receipt.tag_created === true;
  const { git_head } = captured_receipt;

  // Worktree must be clean
  if (observed_worktree_clean !== true) {
    return _blocked('RECEIPT_VERIFY_BLOCKED_WORKTREE', 'observed_worktree_clean must be true');
  }

  // For real tags: local head must match
  if (is_real) {
    if (!observed_local_tag_head || observed_local_tag_head !== git_head) {
      return _blocked('RECEIPT_VERIFY_BLOCKED_LOCAL_HEAD',
        `local tag head mismatch: observed ${observed_local_tag_head}, expected ${git_head}`);
    }

    // remote head must match
    if (!observed_remote_tag_head || observed_remote_tag_head !== git_head) {
      return _blocked('RECEIPT_VERIFY_BLOCKED_REMOTE_HEAD',
        `remote tag head mismatch: observed ${observed_remote_tag_head}, expected ${git_head}`);
    }
  }

  const verify_status = is_real ? 'RECEIPT_VERIFY_REAL_TAG_CONFIRMED' : 'RECEIPT_VERIFY_DRY_RUN_CONFIRMED';
  const verify_id = _verifyId(captured_receipt.human_receipt_id, command_export.command_export_id);

  return {
    schema_version:               SCHEMA_VERSION,
    verify_id,
    verify_status,
    verify_ready:                 true,
    human_receipt_id:             captured_receipt.human_receipt_id,
    command_export_id:            command_export.command_export_id,
    target_tag:                   captured_receipt.target_tag,
    git_head,
    tag_created:                  captured_receipt.tag_created,
    git_push_performed:           captured_receipt.git_push_performed,
    observed_local_tag_head:      observed_local_tag_head || null,
    observed_remote_tag_head:     observed_remote_tag_head || null,
    observed_worktree_clean:      true,
    actual_real_tag_created:      is_real,
    actual_git_push_performed:    is_real,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
  };
}

export function validateOneRealTagHumanReceiptVerification(verify) {
  if (!verify || typeof verify !== 'object') return { valid: false, errors: ['verify is null/undefined'] };

  const errors = [];

  if (!RECEIPT_VERIFY_STATUSES.includes(verify.verify_status)) {
    errors.push(`invalid verify_status: ${verify.verify_status}`);
  }
  if (verify.schema_version !== SCHEMA_VERSION) errors.push(`invalid schema_version: ${verify.schema_version}`);
  if (verify.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (verify.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (verify.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagHumanReceiptVerification(verify) {
  if (!verify || !verify.verify_ready) {
    return `[RECEIPT VERIFY BLOCKED] ${verify?.verify_status || 'unknown'}: ${verify?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== ONE REAL TAG HUMAN RECEIPT IMPORT + VERIFY ===`,
    `Schema:          ${verify.schema_version}`,
    `Verify ID:       ${verify.verify_id}`,
    `Status:          ${verify.verify_status}`,
    `Target Tag:      ${verify.target_tag}`,
    `Git HEAD:        ${verify.git_head}`,
    `tag_created:     ${verify.tag_created}`,
    `push_performed:  ${verify.git_push_performed}`,
    `local_head:      ${verify.observed_local_tag_head || 'N/A (dry-run)'}`,
    `remote_head:     ${verify.observed_remote_tag_head || 'N/A (dry-run)'}`,
    `worktree_clean:  ${verify.observed_worktree_clean}`,
    `actual_real_tag: ${verify.actual_real_tag_created}`,
    `deploy=false | stable=false | release=false`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-human-receipt-import-verify.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockExport = {
    export_ready:       true,
    command_export_id:  'export-mock-v1071',
    target_tag:         'v107.1-mock',
    git_head:           '6c852f1',
  };

  const mockCapture = {
    capture_ready:       true,
    human_receipt_id:    'receipt-mock-v1071',
    capture_status:      'RECEIPT_CAPTURE_DRY_RUN_CAPTURED',
    command_export_id:   'export-mock-v1071',
    target_tag:          'v107.1-mock',
    git_head:            '6c852f1',
    tag_created:         false,
    git_push_performed:  false,
    deploy_performed:    false,
    stable_promoted:     false,
    release_performed:   false,
  };

  const result = importAndVerifyOneRealTagHumanReceipt({
    captured_receipt:           mockCapture,
    command_export:             mockExport,
    observed_local_tag_head:    null,
    observed_remote_tag_head:   null,
    observed_worktree_clean:    true,
    observed_deploy_performed:  false,
    observed_stable_promoted:   false,
    observed_release_performed: false,
  });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderOneRealTagHumanReceiptVerification(result));
  }
}
