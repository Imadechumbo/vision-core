#!/usr/bin/env node
/**
 * Stable Promotion Post-Receipt Report — V124.1
 *
 * Generates a report from the post-receipt ledger and receipt verifier.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v124.1';

export const POST_RECEIPT_REPORT_STATUSES = [
  'POST_RECEIPT_REPORT_BLOCKED_LEDGER',
  'POST_RECEIPT_REPORT_BLOCKED_VERIFIER',
  'POST_RECEIPT_REPORT_MISMATCH',
  'POST_RECEIPT_REPORT_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:        false,
    stable_promoted:                 false,
    git_push_performed:              false,
    deploy_performed:                false,
    release_performed:               false,
    future_human_stable_exec_required: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    report_status:   status,
    report_ready:    false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _reportId(ledger_hash, verifier_id) {
  return _sha256([ledger_hash || '', verifier_id || '', 'prr-v124.1'].join('|'));
}

export function buildPostReceiptReport(params) {
  const {
    stable_promotion_post_receipt_ledger,
    stable_promotion_receipt_verifier,
  } = params || {};

  if (!stable_promotion_post_receipt_ledger || stable_promotion_post_receipt_ledger.ledger_status === 'POST_RECEIPT_LEDGER_EMPTY') {
    return _blocked('POST_RECEIPT_REPORT_BLOCKED_LEDGER', 'post-receipt ledger is empty or missing');
  }

  if (!stable_promotion_receipt_verifier || !stable_promotion_receipt_verifier.verifier_id) {
    return _blocked('POST_RECEIPT_REPORT_BLOCKED_VERIFIER', 'stable_promotion_receipt_verifier missing or invalid');
  }

  if (stable_promotion_receipt_verifier.verifier_status === 'RECEIPT_VERIFIER_MISMATCH') {
    return _blocked('POST_RECEIPT_REPORT_MISMATCH', 'receipt verifier detected mismatch');
  }

  const ledger   = stable_promotion_post_receipt_ledger;
  const verifier = stable_promotion_receipt_verifier;

  const report_id = _reportId(ledger.ledger_hash, verifier.verifier_id);

  const event_summary = (ledger.events || []).map(e => ({
    sequence:   e.sequence,
    event_type: e.event_type,
    event_hash: e.event_hash,
  }));

  return {
    schema_version:        SCHEMA_VERSION,
    report_id,
    report_status:         'POST_RECEIPT_REPORT_READY',
    report_ready:          true,
    ledger_hash:           ledger.ledger_hash,
    verifier_id:           verifier.verifier_id,
    verifier_status:       verifier.verifier_status,
    receipt_verified:      verifier.receipt_verified,
    has_verified_receipt:  ledger.has_verified_receipt,
    has_mismatch:          ledger.has_mismatch,
    governance_complete:   ledger.governance_complete,
    total_events:          ledger.event_count,
    event_summary,
    ..._locked(),
  };
}

export function validatePostReceiptReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['report is null/undefined'] };
  }

  const errors = [];

  if (!POST_RECEIPT_REPORT_STATUSES.includes(report.report_status)) {
    errors.push(`invalid report_status: ${report.report_status}`);
  }
  if (report.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (report.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');
  if (report.future_human_stable_exec_required !== true) errors.push('future_human_stable_exec_required must be true');

  return { valid: errors.length === 0, errors };
}

export function renderPostReceiptReport(report) {
  if (!report || !report.report_ready) {
    return `[POST-RECEIPT REPORT BLOCKED] ${report?.report_status || 'unknown'}: ${report?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION POST-RECEIPT REPORT ===`,
    `Schema:                      ${report.schema_version}`,
    `Report ID:                   ${report.report_id}`,
    `Status:                      ${report.report_status}`,
    `Ledger Hash:                 ${report.ledger_hash}`,
    `Verifier ID:                 ${report.verifier_id}`,
    `Verifier Status:             ${report.verifier_status}`,
    `Receipt Verified:            ${report.receipt_verified}`,
    `Has Verified Receipt:        ${report.has_verified_receipt}`,
    `Has Mismatch:                ${report.has_mismatch}`,
    `Governance Complete:         ${report.governance_complete}`,
    `Total Events:                ${report.total_events}`,
    ``,
    `--- EVENT SUMMARY ---`,
    ...report.event_summary.map(e => `  [${e.sequence}] ${e.event_type}`),
    ``,
    `stable_promotion_allowed:           ${report.stable_promotion_allowed}`,
    `future_human_stable_exec_required:  ${report.future_human_stable_exec_required}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-post-receipt-report.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockLedger = {
    ledger_status:        'POST_RECEIPT_LEDGER_ACTIVE',
    ledger_hash:          'a'.repeat(64),
    event_count:          2,
    has_verified_receipt: true,
    has_mismatch:         false,
    has_rejected:         false,
    governance_complete:  true,
    events: [
      { sequence: 0, event_type: 'STABLE_PROMOTION_RECEIPT_IMPORTED', event_hash: 'h0' },
      { sequence: 1, event_type: 'STABLE_PROMOTION_RECEIPT_VERIFIED',  event_hash: 'h1' },
    ],
  };

  const mockVerifier = {
    verifier_id:     'mock-verifier-v1241',
    verifier_status: 'RECEIPT_VERIFIER_VERIFIED',
    receipt_verified: true,
  };

  const report = buildPostReceiptReport({
    stable_promotion_post_receipt_ledger: mockLedger,
    stable_promotion_receipt_verifier:    mockVerifier,
  });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderPostReceiptReport(report));
  }
}
