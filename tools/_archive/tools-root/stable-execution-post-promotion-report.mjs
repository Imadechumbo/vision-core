#!/usr/bin/env node
/**
 * Stable Execution Post-Promotion Report — V128.1
 *
 * Generates a report from the post-promotion ledger and confirmation document.
 * Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v128.1';

export const POST_PROMOTION_REPORT_STATUSES = [
  'POST_PROMOTION_REPORT_BLOCKED_LEDGER',
  'POST_PROMOTION_REPORT_BLOCKED_CONFIRMATION',
  'POST_PROMOTION_REPORT_READY',
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
    future_promotion_requires_new_governance_cycle: true,
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

function _reportId(ledger_hash, confirmation_id) {
  return _sha256([ledger_hash || '', confirmation_id || '', 'ppr-v128.1'].join('|'));
}

export function buildPostPromotionReport(params) {
  const {
    stable_execution_post_promotion_ledger,
    stable_promotion_confirmation_document,
  } = params || {};

  if (
    !stable_execution_post_promotion_ledger ||
    stable_execution_post_promotion_ledger.ledger_status === 'POST_PROMOTION_LEDGER_EMPTY'
  ) {
    return _blocked('POST_PROMOTION_REPORT_BLOCKED_LEDGER', 'post-promotion ledger is empty or missing');
  }

  if (
    !stable_promotion_confirmation_document ||
    stable_promotion_confirmation_document.document_issued !== true
  ) {
    return _blocked('POST_PROMOTION_REPORT_BLOCKED_CONFIRMATION', 'stable_promotion_confirmation_document not issued');
  }

  const ledger = stable_execution_post_promotion_ledger;
  const doc    = stable_promotion_confirmation_document;

  const report_id = _reportId(ledger.ledger_hash, doc.confirmation_id);

  const event_summary = (ledger.events || []).map(e => ({
    sequence:   e.sequence,
    event_type: e.event_type,
    event_hash: e.event_hash,
  }));

  return {
    schema_version:          SCHEMA_VERSION,
    report_id,
    report_status:           'POST_PROMOTION_REPORT_READY',
    report_ready:            true,
    ledger_hash:             ledger.ledger_hash,
    confirmation_id:         doc.confirmation_id,
    governance_baseline_id:  doc.governance_baseline_id,
    execution_receipt_id:    doc.execution_receipt_id,
    executed_by:             doc.executed_by,
    target_stable_ref:       doc.target_stable_ref,
    target_tag:              doc.target_tag,
    all_checks_passed:       doc.all_checks_passed,
    has_confirmation:        ledger.has_confirmation,
    has_state_verified:      ledger.has_state_verified,
    promotion_finalized:     ledger.promotion_finalized,
    total_events:            ledger.event_count,
    event_summary,
    ..._locked(),
  };
}

export function validatePostPromotionReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['report is null/undefined'] };
  }

  const errors = [];

  if (!POST_PROMOTION_REPORT_STATUSES.includes(report.report_status)) {
    errors.push(`invalid report_status: ${report.report_status}`);
  }
  if (report.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (report.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (report.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (report.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');
  if (report.future_promotion_requires_new_governance_cycle !== true) {
    errors.push('future_promotion_requires_new_governance_cycle must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderPostPromotionReport(report) {
  if (!report || !report.report_ready) {
    return `[POST-PROMOTION REPORT BLOCKED] ${report?.report_status || 'unknown'}: ${report?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE EXECUTION POST-PROMOTION REPORT V128.1 ===`,
    `Schema:                                         ${report.schema_version}`,
    `Report ID:                                      ${report.report_id}`,
    `Status:                                         ${report.report_status}`,
    `Ledger Hash:                                    ${report.ledger_hash}`,
    `Confirmation ID:                                ${report.confirmation_id}`,
    `Governance Baseline ID:                         ${report.governance_baseline_id}`,
    `Execution Receipt ID:                           ${report.execution_receipt_id}`,
    `Executed By:                                    ${report.executed_by}`,
    `Target Ref:                                     ${report.target_stable_ref}`,
    `Target Tag:                                     ${report.target_tag}`,
    `All Checks Passed:                              ${report.all_checks_passed}`,
    `Has Confirmation:                               ${report.has_confirmation}`,
    `Has State Verified:                             ${report.has_state_verified}`,
    `Promotion Finalized:                            ${report.promotion_finalized}`,
    `Total Events:                                   ${report.total_events}`,
    ``,
    `--- EVENT SUMMARY ---`,
    ...report.event_summary.map(e => `  [${e.sequence}] ${e.event_type}`),
    ``,
    `system_execution_performed:                     ${report.system_execution_performed}`,
    `automated_promotion_performed:                  ${report.automated_promotion_performed}`,
    `future_promotion_requires_new_governance_cycle: ${report.future_promotion_requires_new_governance_cycle}`,
    `stable_promotion_allowed:                       ${report.stable_promotion_allowed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-execution-post-promotion-report.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockLedger = {
    ledger_status:       'POST_PROMOTION_LEDGER_ACTIVE',
    ledger_hash:         'a'.repeat(64),
    event_count:         3,
    has_confirmation:    true,
    has_state_verified:  true,
    promotion_finalized: true,
    events: [
      { sequence: 0, event_type: 'STABLE_EXECUTION_RECEIPT_IMPORTED',   event_hash: 'h0' },
      { sequence: 1, event_type: 'STABLE_EXECUTION_STATE_VERIFIED',      event_hash: 'h1' },
      { sequence: 2, event_type: 'STABLE_EXECUTION_PROMOTION_FINALIZED', event_hash: 'h2' },
    ],
  };

  const mockDoc = {
    document_issued:        true,
    confirmation_id:        'mock-confirmation-v1281',
    governance_baseline_id: 'mock-baseline-v125',
    execution_receipt_id:   'mock-exec-receipt',
    executed_by:            'human-operator',
    target_stable_ref:      'stable',
    target_tag:             'v128.1-cli-mock',
    all_checks_passed:      true,
  };

  const report = buildPostPromotionReport({
    stable_execution_post_promotion_ledger: mockLedger,
    stable_promotion_confirmation_document: mockDoc,
  });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderPostPromotionReport(report));
  }
}
