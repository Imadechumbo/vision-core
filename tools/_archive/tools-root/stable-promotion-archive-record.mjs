#!/usr/bin/env node
/**
 * Stable Promotion Archive Record — V129.1
 *
 * Creates an immutable archive record of a completed stable promotion.
 * Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v129.1';

export const ARCHIVE_RECORD_STATUSES = [
  'ARCHIVE_RECORD_BLOCKED_GATE',
  'ARCHIVE_RECORD_READY',
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
    archive_is_immutable:          true,
    archive_is_post_execution:     true,
    future_promotion_requires_new_governance_cycle: true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    archive_status:   status,
    archive_ready:    false,
    blocking_reason:  reason,
    ..._locked(),
    ...extra,
  };
}

function _archiveHash(gate_id, report_id, confirmation_id) {
  return _sha256([gate_id || '', report_id || '', confirmation_id || '', 'par-v129.1'].join('|'));
}

function _archiveId(archive_hash) {
  return _sha256([archive_hash, 'archive-id-v129.1'].join('|'));
}

export function buildStablePromotionArchiveRecord(params) {
  const {
    stable_promotion_finalization_gate,
    stable_execution_post_promotion_report,
    stable_promotion_confirmation_document,
  } = params || {};

  if (!stable_promotion_finalization_gate || stable_promotion_finalization_gate.gate_open !== true) {
    return _blocked('ARCHIVE_RECORD_BLOCKED_GATE', 'stable_promotion_finalization_gate not open');
  }

  const gate   = stable_promotion_finalization_gate;
  const report = stable_execution_post_promotion_report || {};
  const doc    = stable_promotion_confirmation_document || {};

  const archive_hash = _archiveHash(gate.gate_id, gate.report_id, gate.confirmation_id);
  const archive_id   = _archiveId(archive_hash);

  return {
    schema_version:          SCHEMA_VERSION,
    archive_id,
    archive_status:          'ARCHIVE_RECORD_READY',
    archive_ready:           true,
    archive_hash,
    gate_id:                 gate.gate_id,
    report_id:               gate.report_id || null,
    confirmation_id:         gate.confirmation_id || null,
    governance_baseline_id:  report.governance_baseline_id || doc.governance_baseline_id || null,
    execution_receipt_id:    report.execution_receipt_id   || doc.execution_receipt_id   || null,
    executed_by:             report.executed_by            || doc.executed_by            || null,
    target_stable_ref:       report.target_stable_ref      || doc.target_stable_ref      || null,
    target_tag:              report.target_tag             || doc.target_tag             || null,
    all_checks_passed:       gate.gates?.all_checks_passed === true,
    promotion_finalized:     gate.gates?.promotion_finalized === true,
    passed_gates:            gate.passed_gates,
    total_gates:             gate.total_gates,
    ..._locked(),
  };
}

export function validateStablePromotionArchiveRecord(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['record is null/undefined'] };
  }

  const errors = [];

  if (!ARCHIVE_RECORD_STATUSES.includes(record.archive_status)) {
    errors.push(`invalid archive_status: ${record.archive_status}`);
  }
  if (record.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (record.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (record.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (record.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (record.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (record.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (record.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (record.release_performed !== false) errors.push('release_performed must be false');
  if (record.archive_is_immutable !== true) errors.push('archive_is_immutable must be true');
  if (record.archive_is_post_execution !== true) errors.push('archive_is_post_execution must be true');
  if (record.future_promotion_requires_new_governance_cycle !== true) {
    errors.push('future_promotion_requires_new_governance_cycle must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionArchiveRecord(record) {
  if (!record || !record.archive_ready) {
    return `[ARCHIVE RECORD BLOCKED] ${record?.archive_status || 'unknown'}: ${record?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION ARCHIVE RECORD V129.1 ===`,
    `Schema:                                         ${record.schema_version}`,
    `Archive ID:                                     ${record.archive_id}`,
    `Status:                                         ${record.archive_status}`,
    `Archive Hash:                                   ${record.archive_hash}`,
    `Gate ID:                                        ${record.gate_id}`,
    `Report ID:                                      ${record.report_id || 'not set'}`,
    `Confirmation ID:                                ${record.confirmation_id || 'not set'}`,
    `Governance Baseline ID:                         ${record.governance_baseline_id || 'not set'}`,
    `Execution Receipt ID:                           ${record.execution_receipt_id || 'not set'}`,
    `Executed By:                                    ${record.executed_by || 'not set'}`,
    `Target Ref:                                     ${record.target_stable_ref || 'not set'}`,
    `Target Tag:                                     ${record.target_tag || 'not set'}`,
    `All Checks Passed:                              ${record.all_checks_passed}`,
    `Promotion Finalized:                            ${record.promotion_finalized}`,
    `Passed Gates:                                   ${record.passed_gates} / ${record.total_gates}`,
    ``,
    `system_execution_performed:                     ${record.system_execution_performed}`,
    `automated_promotion_performed:                  ${record.automated_promotion_performed}`,
    `archive_is_immutable:                           ${record.archive_is_immutable}`,
    `archive_is_post_execution:                      ${record.archive_is_post_execution}`,
    `future_promotion_requires_new_governance_cycle: ${record.future_promotion_requires_new_governance_cycle}`,
    `stable_promotion_allowed:                       ${record.stable_promotion_allowed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-archive-record.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockGate = {
    gate_open:      true,
    gate_id:        'mock-gate-v129',
    report_id:      'mock-report-v128',
    confirmation_id: 'mock-confirmation-v127',
    passed_gates:   6,
    total_gates:    6,
    gates: {
      report_ready:        true,
      confirmation_issued: true,
      all_checks_passed:   true,
      has_confirmation:    true,
      has_state_verified:  true,
      promotion_finalized: true,
    },
  };

  const mockReport = {
    governance_baseline_id: 'mock-baseline-v125',
    execution_receipt_id:   'mock-exec-receipt',
    executed_by:            'human-operator',
    target_stable_ref:      'stable',
    target_tag:             'v129.1-cli-mock',
  };

  const record = buildStablePromotionArchiveRecord({
    stable_promotion_finalization_gate:      mockGate,
    stable_execution_post_promotion_report:  mockReport,
  });

  if (isJson) {
    console.log(JSON.stringify(record, null, 2));
  } else {
    console.log(renderStablePromotionArchiveRecord(record));
  }
}
