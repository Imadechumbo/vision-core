#!/usr/bin/env node
/**
 * Real Tag Manual Execution Receipt Preview — V83.1
 *
 * Builds a preview of what the execution receipt will look like
 * if the real tag command is eventually run. Does NOT create a real receipt.
 *
 * REGRA ABSOLUTA: preview_only=true always. real_receipt_created=false always.
 * tag_created=false always. git_push_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v83.1';

export const RECEIPT_PREVIEW_STATUSES = [
  'RECEIPT_PREVIEW_BLOCKED_DRY_RUN',
  'RECEIPT_PREVIEW_BLOCKED_EVIDENCE',
  'RECEIPT_PREVIEW_BLOCKED_HASH',
  'RECEIPT_PREVIEW_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    preview_only:          true,
    real_receipt_created:  false,
    tag_created:           false,
    git_push_performed:    false,
    deploy_performed:      false,
    stable_promoted:       false,
    release_performed:     false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    receipt_preview_status:  status,
    receipt_preview_ready:   false,
    blocking_reason,
    preview_receipt_hash:    null,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagManualReceiptPreview(params = {}) {
  const {
    fixture_mode     = false,
    dry_run_result,
    evidence_receipt_id,
    evidence_source,
    requested_by,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const preview_id = _sha256(`real-tag-manual-receipt-preview:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const target_tag   = 'v1.2.3';
    const git_head     = 'abc1234def5678901234567890123456789012ab';
    const receipt_hash = _sha256(`receipt-preview:${target_tag}:${git_head}:receipt-fixture-id:${now}`).slice(0, 32);
    return {
      schema_version:          SCHEMA_VERSION,
      preview_id,
      receipt_preview_status:  'RECEIPT_PREVIEW_READY',
      receipt_preview_ready:   true,
      blocking_reason:         null,
      target_tag,
      target_git_head:         git_head,
      evidence_receipt_id:     'receipt-fixture-id',
      evidence_source:         'go-core',
      dry_run_executor_id:     'executor-fixture-id',
      preview_receipt_hash:    receipt_hash,
      requested_by:            'fixture-user',
      created_at:              now,
      ..._locked(),
    };
  }

  // Dry run check
  if (!dry_run_result || dry_run_result.dry_run_ready !== true) {
    return _blocked('RECEIPT_PREVIEW_BLOCKED_DRY_RUN', 'dry_run_not_ready', {
      preview_id, created_at: now,
    });
  }

  // Evidence check
  if (!evidence_receipt_id || evidence_source !== 'go-core') {
    return _blocked('RECEIPT_PREVIEW_BLOCKED_EVIDENCE', 'evidence_not_ready_or_not_go_core', {
      preview_id, created_at: now,
    });
  }

  // Hash computation
  const target_tag   = dry_run_result.target_tag;
  const target_head  = dry_run_result.target_git_head;

  if (!target_tag || !target_head) {
    return _blocked('RECEIPT_PREVIEW_BLOCKED_HASH', 'tag_or_head_missing_for_hash', {
      preview_id, created_at: now,
    });
  }

  const preview_receipt_hash = _sha256(
    `receipt-preview:${target_tag}:${target_head}:${evidence_receipt_id}:${now}`
  ).slice(0, 32);

  return {
    schema_version:          SCHEMA_VERSION,
    preview_id,
    receipt_preview_status:  'RECEIPT_PREVIEW_READY',
    receipt_preview_ready:   true,
    blocking_reason:         null,
    target_tag,
    target_git_head:         target_head,
    evidence_receipt_id,
    evidence_source,
    dry_run_executor_id:     dry_run_result.executor_id ?? null,
    preview_receipt_hash,
    requested_by:            requested_by ?? null,
    created_at:              now,
    ..._locked(),
  };
}

export function validateRealTagManualReceiptPreview(preview) {
  if (!preview || typeof preview !== 'object') return { valid: false, reason: 'null_or_invalid' };
  if (!RECEIPT_PREVIEW_STATUSES.includes(preview.receipt_preview_status))
    return { valid: false, reason: 'unknown_status' };
  if (preview.preview_only         !== true)  return { valid: false, reason: 'preview_only_must_be_true' };
  if (preview.real_receipt_created === true)  return { valid: false, reason: 'real_receipt_must_be_false' };
  if (preview.tag_created          === true)  return { valid: false, reason: 'tag_created_must_be_false' };
  if (preview.git_push_performed   === true)  return { valid: false, reason: 'git_push_must_be_false' };
  return { valid: true };
}

export function renderRealTagManualReceiptPreview(preview) {
  if (!preview) return 'real_tag_manual_execution_receipt_preview: null';
  return [
    `receipt_preview_status    : ${preview.receipt_preview_status ?? 'UNKNOWN'}`,
    `preview_id                : ${preview.preview_id ?? 'none'}`,
    `target_tag                : ${preview.target_tag ?? 'none'}`,
    `target_git_head           : ${preview.target_git_head ?? 'none'}`,
    `evidence_receipt_id       : ${preview.evidence_receipt_id ?? 'none'}`,
    `evidence_source           : ${preview.evidence_source ?? 'none'}`,
    `preview_receipt_hash      : ${preview.preview_receipt_hash ?? 'none'}`,
    `preview_only              : true`,
    `real_receipt_created      : false`,
    `tag_created               : false`,
    `git_push_performed        : false`,
    `blocking_reason           : ${preview.blocking_reason ?? 'none'}`,
  ].join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-execution-receipt-preview.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const result  = buildRealTagManualReceiptPreview({ fixture_mode: fixture });
  if (json) console.log(JSON.stringify(result, null, 2));
  else      console.log(renderRealTagManualReceiptPreview(result));
  process.exit(result.receipt_preview_ready ? 0 : 1);
}
