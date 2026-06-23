#!/usr/bin/env node
/**
 * One Real Tag Human Receipt Capture — V107.0
 *
 * Captures human receipt after manual git tag execution.
 * Accepts dry-run or real-tag receipt. Does NOT verify or execute.
 *
 * REGRA ABSOLUTA: deploy_performed=false, stable_promoted=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v107.0';

export const RECEIPT_CAPTURE_STATUSES = [
  'RECEIPT_CAPTURE_BLOCKED_EXPORT',
  'RECEIPT_CAPTURE_BLOCKED_SCHEMA',
  'RECEIPT_CAPTURE_DRY_RUN_CAPTURED',
  'RECEIPT_CAPTURE_REAL_TAG_CAPTURED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    capture_status:          status,
    capture_ready:           false,
    blocking_reason:         reason,
    deploy_performed:        false,
    stable_promoted:         false,
    release_performed:       false,
    ...extra,
  };
}

function _receiptId(command_export_id, target_tag, git_head, executed_by, executed_at) {
  return _sha256([command_export_id, target_tag, git_head, executed_by, executed_at].join('|'));
}

export function captureOneRealTagHumanReceipt(params) {
  const {
    command_export,
    receipt_data,
  } = params || {};

  // Validate command export
  if (!command_export || !command_export.export_ready) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_EXPORT', 'command_export not ready');
  }

  // Validate schema
  if (!receipt_data || typeof receipt_data !== 'object') {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'receipt_data missing or not an object');
  }

  const {
    target_tag,
    git_head,
    evidence_receipt_id,
    rollback_anchor_id,
    executed_by,
    executed_at,
    local_tag_verified,
    remote_tag_verified,
    local_tag_head,
    remote_tag_head,
    tag_created,
    git_push_performed,
    deploy_performed,
    stable_promoted,
    release_performed,
    notes,
  } = receipt_data;

  // Validate target_tag matches
  if (target_tag !== command_export.target_tag) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA',
      `target_tag mismatch: receipt has ${target_tag}, export has ${command_export.target_tag}`);
  }

  // Validate git_head matches
  if (git_head !== command_export.git_head) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA',
      `git_head mismatch: receipt has ${git_head}, export has ${command_export.git_head}`);
  }

  // Validate evidence_receipt_id present
  if (!evidence_receipt_id) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'evidence_receipt_id required');
  }

  // Validate rollback_anchor_id present
  if (!rollback_anchor_id) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'rollback_anchor_id required');
  }

  // Validate executed_by and executed_at
  if (!executed_by || !executed_at) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'executed_by and executed_at required');
  }

  // Block if deploy/stable/release
  if (deploy_performed === true) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'deploy_performed must be false');
  }
  if (stable_promoted === true) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'stable_promoted must be false');
  }
  if (release_performed === true) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'release_performed must be false');
  }

  // If real tag: push required
  if (tag_created === true && git_push_performed !== true) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'real tag: git_push_performed must be true when tag_created=true');
  }

  // If real tag: local and remote verification required
  if (tag_created === true && local_tag_verified !== true) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'real tag: local_tag_verified must be true');
  }
  if (tag_created === true && remote_tag_verified !== true) {
    return _blocked('RECEIPT_CAPTURE_BLOCKED_SCHEMA', 'real tag: remote_tag_verified must be true');
  }

  const is_real = tag_created === true;
  const capture_status = is_real ? 'RECEIPT_CAPTURE_REAL_TAG_CAPTURED' : 'RECEIPT_CAPTURE_DRY_RUN_CAPTURED';
  const human_receipt_id = _receiptId(command_export.command_export_id, target_tag, git_head, executed_by, executed_at);

  return {
    schema_version:        SCHEMA_VERSION,
    human_receipt_id,
    capture_status,
    capture_ready:         true,
    command_export_id:     command_export.command_export_id,
    target_tag,
    git_head,
    evidence_receipt_id,
    rollback_anchor_id,
    executed_by,
    executed_at,
    local_tag_verified:    local_tag_verified || false,
    remote_tag_verified:   remote_tag_verified || false,
    local_tag_head:        local_tag_head || null,
    remote_tag_head:       remote_tag_head || null,
    tag_created:           tag_created || false,
    git_push_performed:    git_push_performed || false,
    deploy_performed:      false,
    stable_promoted:       false,
    release_performed:     false,
    notes:                 notes || '',
  };
}

export function validateOneRealTagHumanReceiptCapture(capture) {
  if (!capture || typeof capture !== 'object') return { valid: false, errors: ['capture is null/undefined'] };

  const errors = [];

  if (!RECEIPT_CAPTURE_STATUSES.includes(capture.capture_status)) {
    errors.push(`invalid capture_status: ${capture.capture_status}`);
  }
  if (capture.schema_version !== SCHEMA_VERSION) errors.push(`invalid schema_version: ${capture.schema_version}`);
  if (capture.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (capture.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (capture.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagHumanReceiptCapture(capture) {
  if (!capture || !capture.capture_ready) {
    return `[RECEIPT CAPTURE BLOCKED] ${capture?.capture_status || 'unknown'}: ${capture?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== ONE REAL TAG HUMAN RECEIPT CAPTURE ===`,
    `Schema:          ${capture.schema_version}`,
    `Receipt ID:      ${capture.human_receipt_id}`,
    `Status:          ${capture.capture_status}`,
    `Target Tag:      ${capture.target_tag}`,
    `Git HEAD:        ${capture.git_head}`,
    `Executed By:     ${capture.executed_by}`,
    `Executed At:     ${capture.executed_at}`,
    `tag_created:     ${capture.tag_created}`,
    `push_performed:  ${capture.git_push_performed}`,
    `local_verified:  ${capture.local_tag_verified}`,
    `remote_verified: ${capture.remote_tag_verified}`,
    `deploy=false | stable=false | release=false`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-human-receipt-capture.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockExport = {
    export_ready:       true,
    command_export_id:  'export-id-mock-001',
    target_tag:         'v107.0-mock',
    git_head:           '34f9d1f',
  };

  const capture = captureOneRealTagHumanReceipt({
    command_export: mockExport,
    receipt_data: {
      target_tag:          'v107.0-mock',
      git_head:            '34f9d1f',
      evidence_receipt_id: 'evidence-mock-001',
      rollback_anchor_id:  'rollback-mock-001',
      executed_by:         'mock-operator',
      executed_at:         '2026-05-19T00:00:00Z',
      local_tag_verified:  false,
      remote_tag_verified: false,
      tag_created:         false,
      git_push_performed:  false,
      deploy_performed:    false,
      stable_promoted:     false,
      release_performed:   false,
      notes:               'dry-run capture for CLI test',
    },
  });

  if (isJson) {
    console.log(JSON.stringify(capture, null, 2));
  } else {
    console.log(renderOneRealTagHumanReceiptCapture(capture));
  }
}
