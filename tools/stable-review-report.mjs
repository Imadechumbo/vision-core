#!/usr/bin/env node
/**
 * Stable Review Report — V113.1
 *
 * Derives stable review report from ledger event history.
 * stable_preflight_allowed=true only if real tag confirmed + human approval.
 * Does NOT promote stable. Does NOT perform deploy or release.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v113.1';

export const STABLE_REVIEW_REPORT_STATUSES = [
  'STABLE_REVIEW_REPORT_BLOCKED_LEDGER',
  'STABLE_REVIEW_REPORT_DRY_RUN_ONLY',
  'STABLE_REVIEW_REPORT_MOCK_REAL_TAG_ONLY',
  'STABLE_REVIEW_REPORT_REAL_TAG_APPROVED',
  'STABLE_REVIEW_REPORT_READY',
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
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    report_status:   status,
    report_ready:    false,
    blocking_reason: reason,
    stable_preflight_allowed: false,
    future_stable_promotion_command_required: true,
    ..._locked(),
    ...extra,
  };
}

function _reportId(ledger_id) {
  return _sha256([ledger_id, 'report-v113.1'].join('|'));
}

export function buildStableReviewReport(params) {
  const { stable_review_ledger } = params || {};

  if (!stable_review_ledger || !stable_review_ledger.ledger_ready) {
    return _blocked('STABLE_REVIEW_REPORT_BLOCKED_LEDGER', 'stable_review_ledger not ready');
  }

  const event_types = (stable_review_ledger.events || []).map(e => e.event_type);

  const has_contract   = event_types.includes('STABLE_REVIEW_CONTRACT_READY');
  const has_evidence   = event_types.includes('STABLE_REVIEW_EVIDENCE_BOUND');
  const has_decision   = event_types.includes('STABLE_REVIEW_DECISION_READY');
  const has_approval   = event_types.includes('STABLE_REVIEW_HUMAN_APPROVAL_READY');
  const has_blocked    = event_types.includes('STABLE_REVIEW_BLOCKED');

  const real_tag_confirmed =
    has_contract && has_evidence && has_decision && has_approval && !has_blocked;

  const stable_preflight_allowed = real_tag_confirmed;

  let report_status;
  let report_ready = false;

  if (has_blocked) {
    report_status = 'STABLE_REVIEW_REPORT_DRY_RUN_ONLY';
  } else if (!has_contract) {
    report_status = 'STABLE_REVIEW_REPORT_DRY_RUN_ONLY';
  } else if (has_contract && has_evidence && has_decision && !has_approval) {
    report_status = 'STABLE_REVIEW_REPORT_MOCK_REAL_TAG_ONLY';
  } else if (real_tag_confirmed) {
    report_status = 'STABLE_REVIEW_REPORT_REAL_TAG_APPROVED';
    report_ready = true;
  } else {
    report_status = 'STABLE_REVIEW_REPORT_READY';
    report_ready = true;
  }

  const report_id = _reportId(stable_review_ledger.ledger_id);

  return {
    schema_version:            SCHEMA_VERSION,
    report_id,
    report_status,
    report_ready,
    ledger_id:                 stable_review_ledger.ledger_id,
    event_count:               stable_review_ledger.event_count,
    has_contract,
    has_evidence,
    has_decision,
    has_approval,
    real_tag_confirmed,
    stable_preflight_allowed,
    future_stable_promotion_command_required: true,
    ..._locked(),
  };
}

export function validateStableReviewReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['report is null/undefined'] };
  }

  const errors = [];

  if (!STABLE_REVIEW_REPORT_STATUSES.includes(report.report_status)) {
    errors.push(`invalid report_status: ${report.report_status}`);
  }
  if (report.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (report.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');
  if (report.future_stable_promotion_command_required !== true) {
    errors.push('future_stable_promotion_command_required must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStableReviewReport(report) {
  if (!report || !report.report_ready) {
    return `[STABLE REVIEW REPORT BLOCKED] ${report?.report_status || 'unknown'}: ${report?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE REVIEW REPORT ===`,
    `Schema:                               ${report.schema_version}`,
    `Report ID:                            ${report.report_id}`,
    `Status:                               ${report.report_status}`,
    `Ledger ID:                            ${report.ledger_id}`,
    `Events:                               ${report.event_count}`,
    `has_contract:                         ${report.has_contract}`,
    `has_evidence:                         ${report.has_evidence}`,
    `has_decision:                         ${report.has_decision}`,
    `has_approval:                         ${report.has_approval}`,
    `real_tag_confirmed:                   ${report.real_tag_confirmed}`,
    `stable_preflight_allowed:             ${report.stable_preflight_allowed}`,
    `stable_promotion_allowed:             ${report.stable_promotion_allowed}`,
    `stable_promoted:                      ${report.stable_promoted}`,
    `future_stable_promotion_command_required: ${report.future_stable_promotion_command_required}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-review-report.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockLedger = {
    ledger_ready: true,
    ledger_id:    'mock-ledger-v1131',
    event_count:  4,
    events: [
      { event_type: 'STABLE_REVIEW_CONTRACT_READY' },
      { event_type: 'STABLE_REVIEW_EVIDENCE_BOUND' },
      { event_type: 'STABLE_REVIEW_DECISION_READY' },
      { event_type: 'STABLE_REVIEW_HUMAN_APPROVAL_READY' },
    ],
  };

  const report = buildStableReviewReport({ stable_review_ledger: mockLedger });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderStableReviewReport(report));
  }
}
