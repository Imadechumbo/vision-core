#!/usr/bin/env node
/**
 * Real Tag One-Shot Report — V79.1
 *
 * Assembles final preparation report for real tag one-shot operation.
 * Reports READY_FOR_FUTURE_MANUAL_EXECUTOR when all components verified.
 *
 * REGRA ABSOLUTA: tag_created=false always. requires_manual_executor=true.
 * future_manual_executor_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v79.1';

export const TAG_REPORT_STATUSES = [
  'TAG_REPORT_BLOCKED_LEDGER',
  'TAG_REPORT_BLOCKED_SAFETY',
  'TAG_REPORT_BLOCKED_ROLLBACK',
  'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR',
];

export const TAG_REPORT_BLOCKED_ACTIONS = [
  'auto_tag',
  'auto_push',
  'auto_deploy',
  'auto_stable',
  'auto_release',
  'evidence_override',
  'go_core_override',
];

export const TAG_REPORT_SAFE_NEXT_ACTIONS = [
  'review_report',
  'review_rollback_anchor',
  'review_target_tag',
  'review_git_head',
  'if_approved_run_future_v81_manual_executor_only',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    real_execution_armed:             false,
    tag_created:                      false,
    git_push_performed:               false,
    deploy_performed:                 false,
    stable_promoted:                  false,
    release_performed:                false,
    requires_manual_executor:         true,
    future_manual_executor_required:  true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:      SCHEMA_VERSION,
    tag_report_status:   status,
    tag_one_shot_ready:  false,
    blocking_reason,
    blocked_actions:     TAG_REPORT_BLOCKED_ACTIONS,
    safe_next_actions:   TAG_REPORT_SAFE_NEXT_ACTIONS,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagOneShotReport(params = {}) {
  const {
    fixture_mode          = false,
    audit_ledger,
    safety_result,
    rollback_anchor,
    one_shot_contract,
    executor_result,
    armed_guard,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const report_id = _sha256(`real-tag-one-shot-report:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:         SCHEMA_VERSION,
      report_id,
      tag_report_status:      'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR',
      tag_one_shot_ready:     true,
      blocking_reason:        null,
      target_tag:             'v1.2.3',
      git_head:               'abc1234def5678901234567890123456789012ab',
      evidence_receipt_id:    'receipt-fixture-id',
      evidence_source:        'go-core',
      one_shot_contract_id:   'contract-fixture-id',
      safety_status:          'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',
      rollback_anchor_id:     'anchor-fixture-id',
      dry_run_executor_id:    'executor-fixture-id',
      armed_guard_status:     'TAG_ARMED_READY_BUT_NOT_EXECUTED',
      ledger_event_ids:       ['evt-01', 'evt-02', 'evt-03', 'evt-04', 'evt-05', 'evt-06'],
      chain_valid:            true,
      blocked_actions:        TAG_REPORT_BLOCKED_ACTIONS,
      safe_next_actions:      TAG_REPORT_SAFE_NEXT_ACTIONS,
      created_at:             now,
      ..._locked(),
    };
  }

  // Ledger check
  if (!audit_ledger || audit_ledger.event_count === 0) {
    return _blocked('TAG_REPORT_BLOCKED_LEDGER', 'audit_ledger_missing_or_empty', {
      report_id, created_at: now,
    });
  }

  // Safety check
  if (!safety_result?.tag_safety_ready) {
    return _blocked('TAG_REPORT_BLOCKED_SAFETY', 'safety_not_ready', {
      report_id, created_at: now,
    });
  }

  // Rollback check
  if (!rollback_anchor?.anchor_ready) {
    return _blocked('TAG_REPORT_BLOCKED_ROLLBACK', 'rollback_anchor_not_ready', {
      report_id, created_at: now,
    });
  }

  const ledger_event_ids = (audit_ledger.events ?? []).map(e => e.event_id);

  return {
    schema_version:         SCHEMA_VERSION,
    report_id,
    tag_report_status:      'TAG_REPORT_READY_FOR_FUTURE_MANUAL_EXECUTOR',
    tag_one_shot_ready:     true,
    blocking_reason:        null,
    target_tag:             one_shot_contract?.target_tag ?? rollback_anchor?.target_tag ?? null,
    git_head:               one_shot_contract?.git_head ?? rollback_anchor?.git_head_before_tag ?? null,
    evidence_receipt_id:    one_shot_contract?.evidence_receipt_id ?? null,
    evidence_source:        one_shot_contract?.evidence_source ?? 'go-core',
    one_shot_contract_id:   one_shot_contract?.one_shot_contract_id ?? null,
    safety_status:          safety_result.tag_safety_status,
    rollback_anchor_id:     rollback_anchor.rollback_anchor_id,
    dry_run_executor_id:    executor_result?.executor_id ?? null,
    armed_guard_status:     armed_guard?.armed_guard_status ?? null,
    ledger_event_ids,
    chain_valid:            audit_ledger.chain_valid ?? true,
    blocked_actions:        TAG_REPORT_BLOCKED_ACTIONS,
    safe_next_actions:      TAG_REPORT_SAFE_NEXT_ACTIONS,
    created_at:             now,
    ..._locked(),
  };
}

export function renderRealTagOneShotReport(report) {
  if (!report) return 'real_tag_one_shot_report: null';
  return [
    `tag_report_status               : ${report.tag_report_status ?? 'UNKNOWN'}`,
    `report_id                       : ${report.report_id ?? 'none'}`,
    `target_tag                      : ${report.target_tag ?? 'none'}`,
    `evidence_source                 : ${report.evidence_source ?? 'none'}`,
    `safety_status                   : ${report.safety_status ?? 'none'}`,
    `rollback_anchor_id              : ${report.rollback_anchor_id ?? 'none'}`,
    `armed_guard_status              : ${report.armed_guard_status ?? 'none'}`,
    `chain_valid                     : ${report.chain_valid ?? false}`,
    `tag_one_shot_ready              : ${report.tag_one_shot_ready ?? false}`,
    `real_execution_armed            : false`,
    `tag_created                     : false`,
    `git_push_performed              : false`,
    `requires_manual_executor        : true`,
    `future_manual_executor_required : true`,
    `blocking_reason                 : ${report.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-tag-one-shot-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagOneShotReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagOneShotReport(result));
  }

  process.exit(result.tag_one_shot_ready ? 0 : 1);
}
