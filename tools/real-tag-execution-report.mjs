#!/usr/bin/env node
/**
 * Real Tag Execution Report — V89.0
 *
 * Generates a human-readable execution report from the audit ledger
 * and receipt. Includes blocked_actions and safe_next_actions lists.
 *
 * REGRA ABSOLUTA: tag_created=false, deploy_performed=false,
 * stable_promoted=false, release_performed=false always.
 * Report only summarizes — never executes.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v89.0';

export const EXEC_REPORT_STATUSES = [
  'EXEC_REPORT_BLOCKED_LEDGER',
  'EXEC_REPORT_BLOCKED_RECEIPT',
  'EXEC_REPORT_DRY_RUN_COMPLETE',
  'EXEC_REPORT_REAL_TAG_COMPLETE',
  'EXEC_REPORT_ROLLBACK_COMPLETE',
];

export const BLOCKED_ACTIONS = [
  'deploy_to_production',
  'promote_to_stable',
  'release_to_users',
  'modify_git_history',
  'push_unsigned_tags',
];

export const SAFE_NEXT_ACTIONS = [
  'review_audit_ledger',
  'verify_tag_points_to_correct_head',
  'run_post_tag_smoke_tests',
  'notify_team_of_tag_creation',
  'archive_execution_receipt',
];

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
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:   SCHEMA_VERSION,
    report_status:    status,
    report_ready:     false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagExecutionReport(params = {}) {
  const {
    ledger_status,
    ledger_ready           = false,
    ledger_id,
    ledger_hash,
    entries_count          = 0,
    receipt_status,
    receipt_ready          = false,
    receipt_id,
    receipt_type,
    receipt_hash,
    target_tag,
    evidence_receipt_id,
    rollback_anchor_id,
    fixture_mode           = false,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const id_tag    = fixture_mode ? 'fixture' : (target_tag ?? 'unknown');
  const report_id = _sha256(`exec-report:${SCHEMA_VERSION}:${id_tag}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const type = receipt_type ?? 'dry_run_verified';
    const status_map = {
      'dry_run_verified':  'EXEC_REPORT_DRY_RUN_COMPLETE',
      'real_tag_created':  'EXEC_REPORT_REAL_TAG_COMPLETE',
      'rollback_executed': 'EXEC_REPORT_ROLLBACK_COMPLETE',
    };
    const report_status = status_map[type] ?? 'EXEC_REPORT_DRY_RUN_COMPLETE';
    return {
      schema_version:      SCHEMA_VERSION,
      report_id,
      report_status,
      report_ready:        true,
      receipt_type:        type,
      blocked_actions:     BLOCKED_ACTIONS.slice(),
      safe_next_actions:   SAFE_NEXT_ACTIONS.slice(),
      blocking_reason:     null,
      summary:             `Execution report for ${target_tag ?? 'fixture'}: ${type}`,
      target_tag:          target_tag ?? null,
      evidence_receipt_id: evidence_receipt_id ?? null,
      rollback_anchor_id:  rollback_anchor_id ?? null,
      created_at:          now,
      ..._locked(),
    };
  }

  // Gate 1: ledger must be ready
  if (ledger_ready !== true || ledger_status !== 'AUDIT_LEDGER_READY') {
    return _blocked('EXEC_REPORT_BLOCKED_LEDGER', 'audit_ledger_not_ready', {
      report_id,
      ledger_status_provided: ledger_status ?? null,
      created_at:             now,
    });
  }

  // Gate 2: receipt must be ready
  if (receipt_ready !== true || !receipt_status || !receipt_id) {
    return _blocked('EXEC_REPORT_BLOCKED_RECEIPT', 'receipt_not_ready', {
      report_id,
      receipt_status_provided: receipt_status ?? null,
      created_at:              now,
    });
  }

  // Determine report status from receipt type
  const type = receipt_type ?? 'dry_run_verified';
  const status_map = {
    'dry_run_verified':  'EXEC_REPORT_DRY_RUN_COMPLETE',
    'real_tag_created':  'EXEC_REPORT_REAL_TAG_COMPLETE',
    'rollback_executed': 'EXEC_REPORT_ROLLBACK_COMPLETE',
  };
  const report_status = status_map[type] ?? 'EXEC_REPORT_DRY_RUN_COMPLETE';

  const summary = `Execution report for ${target_tag ?? 'unknown'}: ${type} ` +
    `| ledger_entries=${entries_count} | receipt_hash=${receipt_hash ?? 'none'}`;

  return {
    schema_version:      SCHEMA_VERSION,
    report_id,
    report_status,
    report_ready:        true,
    receipt_type:        type,
    blocked_actions:     BLOCKED_ACTIONS.slice(),
    safe_next_actions:   SAFE_NEXT_ACTIONS.slice(),
    blocking_reason:     null,
    summary,
    ledger_id:           ledger_id ?? null,
    ledger_hash:         ledger_hash ?? null,
    ledger_entries:      entries_count,
    receipt_id:          receipt_id ?? null,
    receipt_hash:        receipt_hash ?? null,
    target_tag:          target_tag ?? null,
    evidence_receipt_id: evidence_receipt_id ?? null,
    rollback_anchor_id:  rollback_anchor_id ?? null,
    created_at:          now,
    ..._locked(),
  };
}

export function validateRealTagExecutionReport(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
  const errors = [];
  if (!EXEC_REPORT_STATUSES.includes(result.report_status)) errors.push('report_status_invalid');
  if (result.report_ready === true) {
    if (!Array.isArray(result.blocked_actions))   errors.push('blocked_actions_must_be_array');
    if (!Array.isArray(result.safe_next_actions)) errors.push('safe_next_actions_must_be_array');
  }
  if (result.tag_created         === true) errors.push('tag_created_must_be_false');
  if (result.deploy_performed    === true) errors.push('deploy_performed_must_be_false');
  if (result.stable_promoted     === true) errors.push('stable_promoted_must_be_false');
  if (result.release_performed   === true) errors.push('release_performed_must_be_false');
  return { valid: errors.length === 0, errors };
}

export function renderRealTagExecutionReport(result) {
  if (!result) return 'real_tag_execution_report: null';
  const lines = [
    `report_status                 : ${result.report_status ?? 'UNKNOWN'}`,
    `report_ready                  : ${result.report_ready ?? false}`,
    `receipt_type                  : ${result.receipt_type ?? 'none'}`,
    `summary                       : ${result.summary ?? 'none'}`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
    `blocked_actions               : ${(result.blocked_actions ?? []).join(', ')}`,
    `safe_next_actions             : ${(result.safe_next_actions ?? []).join(', ')}`,
  ];
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-execution-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagExecutionReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagExecutionReport(result));
  }

  process.exit(result.report_ready ? 0 : 1);
}
