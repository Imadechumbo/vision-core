#!/usr/bin/env node
/**
 * One Real Tag Operation Final Report — V109.0
 *
 * Final report for one real tag operation: packet ready, command exported,
 * dry-run confirmed, or real tag confirmed. Does NOT promote stable.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false, rollback_executed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v109.0';

export const FINAL_REPORT_STATUSES = [
  'ONE_TAG_REPORT_BLOCKED_LEDGER',
  'ONE_TAG_REPORT_BLOCKED_ROLLBACK',
  'ONE_TAG_REPORT_COMMAND_READY',
  'ONE_TAG_REPORT_DRY_RUN_CONFIRMED',
  'ONE_TAG_REPORT_REAL_TAG_CONFIRMED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    report_status:       status,
    report_ready:        false,
    blocking_reason:     reason,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
    rollback_executed:   false,
    ...extra,
  };
}

function _safeNextActions(report_status, is_real) {
  const base = ['inspect_ledger', 'review_rollback_commands'];
  if (report_status === 'ONE_TAG_REPORT_REAL_TAG_CONFIRMED') {
    return [...base, 'initiate_stable_review_process', 'verify_tag_on_remote'];
  }
  if (report_status === 'ONE_TAG_REPORT_DRY_RUN_CONFIRMED') {
    return [...base, 'execute_real_tag_manually_when_ready'];
  }
  return [...base, 'export_command_for_human'];
}

function _blockedActions() {
  return [
    'deploy',
    'stable_promotion',
    'release',
    'force_push',
    'automated_tag_creation',
    'ci_execution',
    'go_core_override',
  ];
}

function _reportId(ledger_id, rollback_id) {
  return _sha256([ledger_id, rollback_id, 'final-report-v109.0'].join('|'));
}

export function buildOneRealTagOperationFinalReport(params) {
  const {
    ledger,
    rollback_gate,
    target_tag,
    git_head,
  } = params || {};

  // Validate ledger
  if (!ledger || !ledger.ledger_valid) {
    return _blocked('ONE_TAG_REPORT_BLOCKED_LEDGER', 'ledger not valid');
  }

  // Validate rollback gate
  if (!rollback_gate || !rollback_gate.rollback_ready) {
    return _blocked('ONE_TAG_REPORT_BLOCKED_ROLLBACK', 'rollback_gate not ready');
  }

  // Derive report status from ledger events
  const event_types = (ledger.events || []).map(e => e.event_type);
  const has_real     = event_types.includes('ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED');
  const has_dry      = event_types.includes('ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED');
  const has_export   = event_types.includes('ONE_TAG_COMMAND_EXPORT_READY');
  const has_packet   = event_types.includes('ONE_TAG_EXEC_PACKET_READY');

  let report_status;
  if (has_real)        report_status = 'ONE_TAG_REPORT_REAL_TAG_CONFIRMED';
  else if (has_dry)    report_status = 'ONE_TAG_REPORT_DRY_RUN_CONFIRMED';
  else if (has_export) report_status = 'ONE_TAG_REPORT_COMMAND_READY';
  else                 report_status = 'ONE_TAG_REPORT_COMMAND_READY';

  const report_id = _reportId(ledger.ledger_id, rollback_gate.rollback_readiness_id || 'no-gate-id');

  const tag_created           = has_real;
  const git_push_performed    = has_real;
  const actual_real_tag       = has_real;
  const actual_git_push       = has_real;
  const stable_review_allowed = has_real;

  return {
    schema_version:            SCHEMA_VERSION,
    report_id,
    report_status,
    report_ready:              true,
    target_tag:                target_tag || rollback_gate.target_tag || null,
    git_head:                  git_head   || rollback_gate.git_head   || null,
    tag_created,
    git_push_performed,
    actual_real_tag_created:   actual_real_tag,
    actual_git_push_performed: actual_git_push,
    rollback_ready:            rollback_gate.rollback_ready,
    rollback_executed:         false,
    stable_review_allowed,
    stable_promoted:           false,
    deploy_performed:          false,
    release_performed:         false,
    safe_next_actions:         _safeNextActions(report_status, has_real),
    blocked_actions:           _blockedActions(),
  };
}

export function validateOneRealTagOperationFinalReport(report) {
  if (!report || typeof report !== 'object') return { valid: false, errors: ['report is null/undefined'] };

  const errors = [];

  if (!FINAL_REPORT_STATUSES.includes(report.report_status)) {
    errors.push(`invalid report_status: ${report.report_status}`);
  }
  if (report.schema_version !== SCHEMA_VERSION) errors.push(`invalid schema_version: ${report.schema_version}`);
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');
  if (report.rollback_executed !== false) errors.push('rollback_executed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagOperationFinalReport(report) {
  if (!report || !report.report_ready) {
    return `[FINAL REPORT BLOCKED] ${report?.report_status || 'unknown'}: ${report?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== ONE REAL TAG OPERATION FINAL REPORT ===`,
    `Schema:              ${report.schema_version}`,
    `Report ID:           ${report.report_id}`,
    `Status:              ${report.report_status}`,
    `Target Tag:          ${report.target_tag || 'N/A'}`,
    `Git HEAD:            ${report.git_head   || 'N/A'}`,
    `tag_created:         ${report.tag_created}`,
    `push_performed:      ${report.git_push_performed}`,
    `actual_real_tag:     ${report.actual_real_tag_created}`,
    `rollback_ready:      ${report.rollback_ready}`,
    `rollback_executed:   ${report.rollback_executed}`,
    `stable_review_allowed: ${report.stable_review_allowed}`,
    `stable_promoted:     ${report.stable_promoted}`,
    `deploy_performed:    ${report.deploy_performed}`,
    `release_performed:   ${report.release_performed}`,
    ``,
    `Safe next actions: ${report.safe_next_actions.join(', ')}`,
    `Blocked actions:   ${report.blocked_actions.join(', ')}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-operation-final-report.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockLedger = {
    ledger_valid: true,
    ledger_id:    'mock-ledger-v1090',
    events: [
      { event_type: 'ONE_TAG_EXEC_PACKET_READY',         index: 0, event_hash: 'h0', prev_hash: 'genesis', ref_id: 'p0', event_id: 'e0' },
      { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED', index: 1, event_hash: 'h1', prev_hash: 'h0',      ref_id: 'v0', event_id: 'e1' },
    ],
    deploy_performed:  false,
    stable_promoted:   false,
    release_performed: false,
  };

  const mockGate = {
    rollback_ready:       true,
    rollback_readiness_id: 'mock-gate-v1090',
    rollback_status:      'ROLLBACK_READINESS_DRY_RUN_READY',
    target_tag:           'v109.0-mock',
    git_head:             'f4fa819',
    rollback_executed:    false,
    deploy_performed:     false,
    stable_promoted:      false,
    release_performed:    false,
  };

  const report = buildOneRealTagOperationFinalReport({
    ledger:       mockLedger,
    rollback_gate: mockGate,
  });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderOneRealTagOperationFinalReport(report));
  }
}
