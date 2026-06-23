#!/usr/bin/env node
/**
 * Real Tag Human Execution Receipt Importer — V93.0
 *
 * Imports and validates the execution receipt provided by a human
 * after manually running the real tag command.
 * 9 statuses: IMPORTER_BLOCKED_GATE → IMPORTER_READY.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 * Importer validates receipt data — does not create tags.
 */

import { createHash } from 'crypto';
import { evaluateRealTagCommandGate } from './real-tag-actual-command-gate.mjs';
import { buildRealTagActualCommandRenderer } from './real-tag-actual-command-renderer.mjs';

const SCHEMA_VERSION = 'v93.0';

export const RECEIPT_IMPORTER_STATUSES = [
  'IMPORTER_BLOCKED_GATE',
  'IMPORTER_BLOCKED_RENDERER',
  'IMPORTER_BLOCKED_NO_DATA',
  'IMPORTER_BLOCKED_FORMAT',
  'IMPORTER_BLOCKED_TAG_MISMATCH',
  'IMPORTER_BLOCKED_HEAD_MISMATCH',
  'IMPORTER_BLOCKED_TIMESTAMP',
  'IMPORTER_BLOCKED_HASH',
  'IMPORTER_READY',
];

const REQUIRED_RECEIPT_FIELDS = ['receipt_type', 'target_tag', 'head_sha', 'timestamp', 'receipt_hash'];
const VALID_RECEIPT_TYPES     = ['dry_run_verified', 'real_tag_created', 'rollback_executed'];
const ISO_PATTERN             = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    actual_real_tag_created:      false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    importer_status:  status,
    importer_ready:   false,
    blocking_reason,
    imported_receipt: null,
    ...extra,
    ..._locked(),
  };
}

function _parseReceiptData(data) {
  if (!data) return null;
  if (typeof data === 'object') return data;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (_) { return null; }
  }
  return null;
}

function _validateReceiptFormat(receipt) {
  const failures = [];
  for (const field of REQUIRED_RECEIPT_FIELDS) {
    if (!receipt[field]) failures.push(`missing_field:${field}`);
  }
  if (receipt.receipt_type && !VALID_RECEIPT_TYPES.includes(receipt.receipt_type)) {
    failures.push(`invalid_receipt_type:${receipt.receipt_type}`);
  }
  return failures;
}

export function buildRealTagHumanExecutionReceiptImporter(params = {}) {
  const {
    fixture_mode    = false,
    gate_result,
    renderer_result,
    receipt_data,
    expected_tag,
    expected_head,
    _mock_timestamp,
  } = params ?? {};

  const now          = _mock_timestamp ?? new Date().toISOString();
  const importer_id  = _sha256(`receipt-importer:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const fixture_receipt = {
      receipt_type:   'real_tag_created',
      target_tag:     '<target_tag>',
      head_sha:       '<git_head_sha>',
      timestamp:      now,
      receipt_hash:   _sha256(`fixture:${now}`).slice(0, 32),
    };
    return {
      schema_version:        SCHEMA_VERSION,
      importer_id,
      importer_status:       'IMPORTER_READY',
      importer_ready:        true,
      blocking_reason:       null,
      gate_verified:         true,
      renderer_verified:     true,
      receipt_data_present:  true,
      format_valid:          true,
      tag_matched:           true,
      head_matched:          true,
      timestamp_valid:       true,
      hash_valid:            true,
      imported_receipt:      fixture_receipt,
      created_at:            now,
      ..._locked(),
    };
  }

  // ── Gate 1: Command gate ──────────────────────────────────────
  const eff_gate = gate_result !== undefined ? gate_result : null;
  if (!eff_gate || eff_gate.gate_ready !== true) {
    return _blocked('IMPORTER_BLOCKED_GATE', 'command_gate_not_ready', {
      importer_id,
      gate_verified:        false,
      renderer_verified:    false,
      receipt_data_present: false,
      format_valid:         false,
      tag_matched:          false,
      head_matched:         false,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  // ── Gate 2: Renderer ─────────────────────────────────────────
  const eff_renderer = renderer_result !== undefined ? renderer_result : null;
  if (!eff_renderer || eff_renderer.renderer_ready !== true) {
    return _blocked('IMPORTER_BLOCKED_RENDERER', 'command_renderer_not_ready', {
      importer_id,
      gate_verified:        true,
      renderer_verified:    false,
      receipt_data_present: false,
      format_valid:         false,
      tag_matched:          false,
      head_matched:         false,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  // ── Gate 3: Receipt data present ─────────────────────────────
  if (!receipt_data) {
    return _blocked('IMPORTER_BLOCKED_NO_DATA', 'receipt_data_not_provided', {
      importer_id,
      gate_verified:        true,
      renderer_verified:    true,
      receipt_data_present: false,
      format_valid:         false,
      tag_matched:          false,
      head_matched:         false,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  const parsed = _parseReceiptData(receipt_data);

  // ── Gate 4: Format ────────────────────────────────────────────
  if (!parsed) {
    return _blocked('IMPORTER_BLOCKED_FORMAT', 'receipt_data_parse_failed', {
      importer_id,
      gate_verified:        true,
      renderer_verified:    true,
      receipt_data_present: true,
      format_valid:         false,
      tag_matched:          false,
      head_matched:         false,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  const formatFailures = _validateReceiptFormat(parsed);
  if (formatFailures.length > 0) {
    return _blocked('IMPORTER_BLOCKED_FORMAT', 'receipt_format_invalid', {
      importer_id,
      format_failures:      formatFailures,
      gate_verified:        true,
      renderer_verified:    true,
      receipt_data_present: true,
      format_valid:         false,
      tag_matched:          false,
      head_matched:         false,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  // ── Gate 5: Tag match ─────────────────────────────────────────
  if (expected_tag && parsed.target_tag !== expected_tag) {
    return _blocked('IMPORTER_BLOCKED_TAG_MISMATCH', 'receipt_tag_does_not_match_expected', {
      importer_id,
      expected_tag,
      receipt_tag:          parsed.target_tag,
      gate_verified:        true,
      renderer_verified:    true,
      receipt_data_present: true,
      format_valid:         true,
      tag_matched:          false,
      head_matched:         false,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  // ── Gate 6: HEAD match ────────────────────────────────────────
  if (expected_head && parsed.head_sha !== expected_head) {
    return _blocked('IMPORTER_BLOCKED_HEAD_MISMATCH', 'receipt_head_does_not_match_expected', {
      importer_id,
      expected_head,
      receipt_head:         parsed.head_sha,
      gate_verified:        true,
      renderer_verified:    true,
      receipt_data_present: true,
      format_valid:         true,
      tag_matched:          true,
      head_matched:         false,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  // ── Gate 7: Timestamp valid ───────────────────────────────────
  if (!parsed.timestamp || !ISO_PATTERN.test(parsed.timestamp)) {
    return _blocked('IMPORTER_BLOCKED_TIMESTAMP', 'receipt_timestamp_invalid', {
      importer_id,
      gate_verified:        true,
      renderer_verified:    true,
      receipt_data_present: true,
      format_valid:         true,
      tag_matched:          true,
      head_matched:         true,
      timestamp_valid:      false,
      hash_valid:           false,
      created_at:           now,
    });
  }

  // ── Gate 8: Hash present ──────────────────────────────────────
  if (!parsed.receipt_hash || parsed.receipt_hash.length < 8) {
    return _blocked('IMPORTER_BLOCKED_HASH', 'receipt_hash_missing_or_too_short', {
      importer_id,
      gate_verified:        true,
      renderer_verified:    true,
      receipt_data_present: true,
      format_valid:         true,
      tag_matched:          true,
      head_matched:         true,
      timestamp_valid:      true,
      hash_valid:           false,
      created_at:           now,
    });
  }

  return {
    schema_version:        SCHEMA_VERSION,
    importer_id,
    importer_status:       'IMPORTER_READY',
    importer_ready:        true,
    blocking_reason:       null,
    gate_verified:         true,
    renderer_verified:     true,
    receipt_data_present:  true,
    format_valid:          true,
    tag_matched:           true,
    head_matched:          true,
    timestamp_valid:       true,
    hash_valid:            true,
    imported_receipt:      parsed,
    created_at:            now,
    ..._locked(),
  };
}

export function renderReceiptImporterSummary(result) {
  if (!result) return 'receipt_importer: null';
  const lines = [
    `importer_status             : ${result.importer_status ?? 'UNKNOWN'}`,
    `importer_id                 : ${result.importer_id ?? 'none'}`,
    `importer_ready              : ${result.importer_ready ?? false}`,
    `gate_verified               : ${result.gate_verified ?? false}`,
    `renderer_verified           : ${result.renderer_verified ?? false}`,
    `receipt_data_present        : ${result.receipt_data_present ?? false}`,
    `format_valid                : ${result.format_valid ?? false}`,
    `tag_matched                 : ${result.tag_matched ?? false}`,
    `head_matched                : ${result.head_matched ?? false}`,
    `timestamp_valid             : ${result.timestamp_valid ?? false}`,
    `hash_valid                  : ${result.hash_valid ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.importer_ready && result.imported_receipt) {
    lines.push('');
    lines.push('── IMPORTED RECEIPT ─────────────────────────────────────');
    lines.push(`  receipt_type : ${result.imported_receipt.receipt_type ?? 'unknown'}`);
    lines.push(`  target_tag   : ${result.imported_receipt.target_tag ?? 'unknown'}`);
    lines.push(`  head_sha     : ${result.imported_receipt.head_sha ?? 'unknown'}`);
    lines.push(`  timestamp    : ${result.imported_receipt.timestamp ?? 'unknown'}`);
    lines.push(`  receipt_hash : ${result.imported_receipt.receipt_hash ?? 'unknown'}`);
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-execution-receipt-importer.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagHumanExecutionReceiptImporter({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReceiptImporterSummary(result));
  }

  process.exit(result.importer_ready ? 0 : 1);
}
