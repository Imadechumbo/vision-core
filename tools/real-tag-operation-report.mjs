#!/usr/bin/env node
/**
 * Real Tag Operation Report — V99.0
 *
 * Final operation report: command_ready / dry_run_confirmed / real_tag_confirmed.
 * Does not promote stable. Does not deploy. Does not create release.
 *
 * REGRA ABSOLUTA: stable_promoted=false always. deploy_performed=false always.
 * actual_real_tag_created=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v99.0';

export const TAG_OPERATION_REPORT_STATUSES = [
  'TAG_OPERATION_REPORT_BLOCKED_DECISION',
  'TAG_OPERATION_REPORT_COMMAND_READY',
  'TAG_OPERATION_REPORT_DRY_RUN_CONFIRMED',
  'TAG_OPERATION_REPORT_REAL_TAG_CONFIRMED',
];

const BLOCKED_ACTIONS = [
  'auto_stable_promotion',
  'auto_deploy',
  'auto_release',
  'force_push',
  'bypass_evidence_chain',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    tag_created:                  false,
    git_push_performed:           false,
    real_execution_not_performed: true,
    stable_promoted:              false,
    deploy_performed:             false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:              SCHEMA_VERSION,
    report_status:               status,
    report_ready:                false,
    blocking_reason,
    stable_review_phase_allowed: false,
    blocked_actions:             BLOCKED_ACTIONS,
    safe_next_actions:           [],
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagOperationReport(params = {}) {
  const {
    fixture_mode      = false,
    decision_result,
    ledger_result,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const report_id = _sha256(`tag-operation-report:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:              SCHEMA_VERSION,
      report_id,
      report_status:               'TAG_OPERATION_REPORT_DRY_RUN_CONFIRMED',
      report_ready:                true,
      blocking_reason:             null,
      target_tag:                  'v1.0.0',
      git_head:                    'abc1234def567890abc12345',
      operation_mode:              'dry_run_confirmed',
      real_tag_confirmed:          false,
      stable_review_phase_allowed: false,
      ledger_chain_valid:          true,
      receipt_verified:            true,
      rollback_available:          true,
      blocked_actions:             BLOCKED_ACTIONS,
      safe_next_actions:           ['execute_real_tag_manually_when_ready'],
      decision_verified:           true,
      ledger_verified:             true,
      created_at:                  now,
      ..._locked(),
    };
  }

  const eff_decision = decision_result !== undefined ? decision_result : null;
  const eff_ledger   = ledger_result   !== undefined ? ledger_result   : null;

  // ── Gate 1: decision ready ─────────────────────────────────
  if (!eff_decision || eff_decision.decision_ready !== true) {
    return _blocked('TAG_OPERATION_REPORT_BLOCKED_DECISION', 'decision_matrix_not_ready', {
      report_id,
      decision_verified: false,
      ledger_verified:   false,
      created_at:        now,
    });
  }

  const is_real_tag   = eff_decision.real_tag_confirmed === true;
  const target_tag    = eff_decision.target_tag ?? null;
  const git_head      = eff_decision.git_head   ?? null;
  const ledger_valid  = eff_ledger?.hash_chain_valid === true;
  const rollback_avail = eff_decision.safe_next_actions
    ? eff_decision.safe_next_actions.some(a => a.includes('rollback') || a.includes('archive'))
    : false;

  let report_status;
  let operation_mode;
  let stable_review_phase_allowed;
  let safe_next_actions;

  if (is_real_tag) {
    report_status                = 'TAG_OPERATION_REPORT_REAL_TAG_CONFIRMED';
    operation_mode               = 'real_tag_confirmed';
    stable_review_phase_allowed  = true;
    safe_next_actions            = [
      'create_stable_review_phase_manually',
      'verify_tag_integrity',
      'notify_stakeholders',
      'archive_audit_ledger',
    ];
  } else {
    report_status                = 'TAG_OPERATION_REPORT_DRY_RUN_CONFIRMED';
    operation_mode               = 'dry_run_confirmed';
    stable_review_phase_allowed  = false;
    safe_next_actions            = [
      'execute_real_tag_manually_when_ready',
      'verify_preflight_conditions',
      'review_command_package',
    ];
  }

  return {
    schema_version:              SCHEMA_VERSION,
    report_id,
    report_status,
    report_ready:                true,
    blocking_reason:             null,
    target_tag,
    git_head,
    operation_mode,
    real_tag_confirmed:          is_real_tag,
    stable_review_phase_allowed,
    ledger_chain_valid:          ledger_valid,
    receipt_verified:            eff_decision.receipt_verified ?? false,
    rollback_available:          rollback_avail,
    blocked_actions:             BLOCKED_ACTIONS,
    safe_next_actions,
    decision_verified:           true,
    ledger_verified:             ledger_valid,
    created_at:                  now,
    ..._locked(),
  };
}

export function validateRealTagOperationReport(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  if (result.stable_review_phase_allowed === true && result.real_tag_confirmed !== true) {
    failures.push('stable_review_phase_allowed=true requires real_tag_confirmed=true');
  }
  return failures;
}

export function renderRealTagOperationReport(result) {
  if (!result) return 'real_tag_operation_report: null';
  const lines = [
    `report_status                : ${result.report_status ?? 'UNKNOWN'}`,
    `report_id                    : ${result.report_id ?? 'none'}`,
    `report_ready                 : ${result.report_ready ?? false}`,
    `operation_mode               : ${result.operation_mode ?? 'none'}`,
    `target_tag                   : ${result.target_tag ?? 'none'}`,
    `real_tag_confirmed           : ${result.real_tag_confirmed ?? false}`,
    `stable_review_phase_allowed  : ${result.stable_review_phase_allowed ?? false}`,
    `ledger_chain_valid           : ${result.ledger_chain_valid ?? false}`,
    `receipt_verified             : ${result.receipt_verified ?? false}`,
    `rollback_available           : ${result.rollback_available ?? false}`,
    `actual_real_tag_created      : false`,
    `stable_promoted              : false`,
    `deploy_performed             : false`,
    `release_performed            : false`,
    `real_execution_not_performed : true`,
    `blocking_reason              : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.report_ready) {
    lines.push('');
    lines.push('── SAFE NEXT ACTIONS ──────────────────────────────────────────');
    (result.safe_next_actions ?? []).forEach(a => lines.push(`  OK: ${a}`));
    lines.push('');
    lines.push('── BLOCKED ACTIONS ────────────────────────────────────────────');
    (result.blocked_actions ?? []).forEach(a => lines.push(`  BLOCKED: ${a}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-operation-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagOperationReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagOperationReport(result));
  }

  process.exit(result.report_ready ? 0 : 1);
}
