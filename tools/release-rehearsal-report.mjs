#!/usr/bin/env node
/**
 * Release Rehearsal Report — V54.0
 *
 * Creates an auditable, human-readable report of the release rehearsal.
 * Aggregates rehearsal result and ledger. Never executes any action.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * human_review_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v54.0';

export const REHEARSAL_REPORT_STATUSES = [
  'REPORT_BLOCKED_REHEARSAL',
  'REPORT_BLOCKED_LEDGER',
  'REPORT_READY',
];

export const REPORT_BLOCKED_ACTIONS = [
  'auto_release',
  'auto_tag',
  'auto_stable_promotion',
  'auto_deploy',
  'evidence_override',
  'go_core_override',
];

export const REPORT_SAFE_NEXT_ACTIONS = [
  'human_review_rehearsal_report',
  'verify_blocked_operations',
  'review_simulated_commands',
  'validate_rollback_anchor',
  'approve_or_reject_release',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    human_review_required:     true,
    local_only:                true,
    rehearsal_only:            true,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:        SCHEMA_VERSION,
    report_status:         status,
    report_ready:          false,
    blocking_reason,
    ..._locked(),
    ...extra,
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    human_review_required:     true,
    local_only:                true,
    rehearsal_only:            true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a release rehearsal report.
 */
export function buildReleaseRehearsalReport(params = {}) {
  const {
    rehearsal_result,
    ledger_chain,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const report_id = _sha256(`fixture-report:${now}`).slice(0, 24);
    return {
      schema_version:          SCHEMA_VERSION,
      report_id,
      report_status:           'REPORT_READY',
      report_ready:            true,
      rehearsal_status:        'REHEARSAL_READY',
      rehearsal_ready:         true,
      sandbox_id:              'fixture-sandbox-id',
      rehearsal_plan_id:       'fixture-plan-id',
      rehearsal_report_id:     'fixture-rehearsal-report-id',
      evidence_receipt_id:     'fixture-receipt-id',
      evidence_source:         'go-core',
      simulated_commands:      7,
      blocked_operations:      REPORT_BLOCKED_ACTIONS,
      ledger_event_ids:        ['evt-1','evt-2','evt-3','evt-4','evt-5'],
      chain_valid:             true,
      safe_next_actions:       REPORT_SAFE_NEXT_ACTIONS,
      blocked_actions:         REPORT_BLOCKED_ACTIONS,
      created_at:              now,
      blocking_reason:         null,
      ..._locked(),
    };
  }

  // Require rehearsal result
  if (!rehearsal_result || rehearsal_result.rehearsal_ready !== true) {
    return _blocked('REPORT_BLOCKED_REHEARSAL', 'rehearsal_not_ready', {
      rehearsal_status: rehearsal_result?.rehearsal_status ?? null,
    });
  }

  // Require ledger chain (optional but flag if missing)
  if (ledger_chain && ledger_chain.valid === false) {
    return _blocked('REPORT_BLOCKED_LEDGER', 'ledger_chain_invalid', {
      ledger_status: ledger_chain.status ?? null,
    });
  }

  const report_id = _sha256(`report:${rehearsal_result.rehearsal_report_id ?? 'x'}:${now}`).slice(0, 24);

  return {
    schema_version:          SCHEMA_VERSION,
    report_id,
    report_status:           'REPORT_READY',
    report_ready:            true,
    rehearsal_status:        rehearsal_result.rehearsal_status ?? 'REHEARSAL_READY',
    rehearsal_ready:         true,
    sandbox_id:              rehearsal_result.sandbox_id ?? null,
    rehearsal_plan_id:       rehearsal_result.rehearsal_plan_id ?? null,
    rehearsal_report_id:     rehearsal_result.rehearsal_report_id ?? null,
    evidence_source:         'go-core',
    simulated_commands:      rehearsal_result.replayed_commands?.length ?? 0,
    blocked_operations:      REPORT_BLOCKED_ACTIONS,
    ledger_event_ids:        ledger_chain ? (ledger_chain.entries > 0 ? [`${ledger_chain.entries} events`] : []) : [],
    chain_valid:             ledger_chain?.valid ?? null,
    safe_next_actions:       REPORT_SAFE_NEXT_ACTIONS,
    blocked_actions:         REPORT_BLOCKED_ACTIONS,
    created_at:              now,
    blocking_reason:         null,
    ..._locked(),
  };
}

/**
 * Render a human-readable report summary.
 */
export function renderReleaseRehearsalReport(report) {
  if (!report) return 'report: null';
  const lines = [
    `report_status         : ${report.report_status ?? 'UNKNOWN'}`,
    `report_id             : ${report.report_id ?? 'none'}`,
    `rehearsal_report_id   : ${report.rehearsal_report_id ?? 'none'}`,
    `evidence_source       : ${report.evidence_source ?? 'none'}`,
    `simulated_commands    : ${report.simulated_commands ?? 0}`,
    `chain_valid           : ${report.chain_valid ?? 'N/A'}`,
    `human_review_required : true`,
    `deploy_allowed        : false`,
    `blocking_reason       : ${report.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-rehearsal-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildReleaseRehearsalReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReleaseRehearsalReport(result));
  }

  process.exit(result.report_ready ? 0 : 1);
}
