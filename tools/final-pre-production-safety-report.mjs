#!/usr/bin/env node
/**
 * Final Pre-Production Safety Report — V69.0
 *
 * Final report before production execution phase. Review-only.
 * Does NOT execute release, tag, stable, deploy, or unlock.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * controlled_execution_allowed=false always.
 * unlock_executed=false always.
 * final_execution_phase_required=true always.
 * explicit_final_execution_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v69.0';

export const PREPROD_REPORT_STATUSES = [
  'PREPROD_REPORT_BLOCKED_CONTRACT',
  'PREPROD_REPORT_BLOCKED_AUTHORITY',
  'PREPROD_REPORT_BLOCKED_BINDING',
  'PREPROD_REPORT_BLOCKED_EVIDENCE',
  'PREPROD_REPORT_BLOCKED_LEDGER',
  'PREPROD_REPORT_READY',
];

export const PREPROD_BLOCKED_ACTIONS = [
  'auto_release',
  'auto_tag',
  'auto_stable_promotion',
  'auto_deploy',
  'auto_unlock',
  'auto_controlled_execution',
  'git_push',
  'production_write',
  'evidence_override',
  'go_core_override',
];

export const PREPROD_SAFE_NEXT_ACTIONS = [
  'review_controlled_execution_package',
  'review_ledger_chain',
  'review_evidence_receipt',
  'review_rollback_anchor',
  'prepare_future_real_manual_execution_contract',
  'do_not_execute_production_in_this_phase',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                     false,
    promotion_allowed:                  false,
    stable_allowed:                     false,
    tag_allowed:                        false,
    release_execution_allowed:          false,
    release_performed:                  false,
    tag_created:                        false,
    stable_promoted:                    false,
    deploy_performed:                   false,
    production_execution_locked:        true,
    unlock_executed:                    false,
    controlled_review_only:             true,
    controlled_execution_allowed:       false,
    human_review_required:              true,
    explicit_final_execution_required:  true,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                     SCHEMA_VERSION,
    pre_production_status:              status,
    report_ready:                       false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:                     false,
    promotion_allowed:                  false,
    stable_allowed:                     false,
    tag_allowed:                        false,
    release_execution_allowed:          false,
    release_performed:                  false,
    tag_created:                        false,
    stable_promoted:                    false,
    deploy_performed:                   false,
    production_execution_locked:        true,
    unlock_executed:                    false,
    controlled_review_only:             true,
    controlled_execution_allowed:       false,
    human_review_required:              true,
    explicit_final_execution_required:  true,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
    blocked_actions:                    PREPROD_BLOCKED_ACTIONS,
    safe_next_actions:                  PREPROD_SAFE_NEXT_ACTIONS,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build the final pre-production safety report (review-only).
 */
export function buildFinalPreProductionSafetyReport(params = {}) {
  const {
    controlled_contract,
    controlled_authority,
    controlled_binding,
    controlled_evidence_package,
    ledger_chain,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const report_id = _sha256(`fixture-preprod-report:${now}`).slice(0, 24);
    return {
      schema_version:                     SCHEMA_VERSION,
      report_id,
      pre_production_status:              'PREPROD_REPORT_READY',
      report_ready:                       true,
      controlled_contract_id:             'fixture-controlled-contract-id',
      controlled_authority_id:            'fixture-controlled-authority-id',
      controlled_binding_id:              'fixture-controlled-binding-id',
      controlled_evidence_package_id:     'fixture-controlled-evidence-id',
      evidence_receipt_id:                'fixture-evidence-receipt-id',
      evidence_source:                    'go-core',
      ledger_event_ids:                   ['fixture-event-1', 'fixture-event-2'],
      chain_valid:                        true,
      blocked_actions:                    PREPROD_BLOCKED_ACTIONS,
      safe_next_actions:                  PREPROD_SAFE_NEXT_ACTIONS,
      created_at:                         now,
      blocking_reason:                    null,
      ..._locked(),
    };
  }

  // Contract required
  if (!controlled_contract || controlled_contract.contract_ready !== true) {
    return _blocked('PREPROD_REPORT_BLOCKED_CONTRACT', 'controlled_contract_not_ready', {
      contract_status: controlled_contract?.contract_status ?? null,
    });
  }

  // Authority required
  if (!controlled_authority || controlled_authority.authority_ready !== true) {
    return _blocked('PREPROD_REPORT_BLOCKED_AUTHORITY', 'controlled_authority_not_ready', {
      authority_status: controlled_authority?.authority_status ?? null,
    });
  }

  // Binding required
  if (!controlled_binding || controlled_binding.binding_ready !== true) {
    return _blocked('PREPROD_REPORT_BLOCKED_BINDING', 'controlled_binding_not_ready', {
      binding_status: controlled_binding?.binding_status ?? null,
    });
  }

  // Evidence package required
  if (!controlled_evidence_package || controlled_evidence_package.evidence_review_ready !== true) {
    return _blocked('PREPROD_REPORT_BLOCKED_EVIDENCE', 'controlled_evidence_package_not_ready', {
      evidence_status: controlled_evidence_package?.evidence_package_status ?? null,
    });
  }

  const report_id = _sha256([
    'preprod-report',
    controlled_contract.controlled_contract_id ?? '',
    controlled_authority.controlled_authority_id ?? '',
    controlled_binding.binding_id ?? '',
    controlled_evidence_package.controlled_evidence_package_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:                     SCHEMA_VERSION,
    report_id,
    pre_production_status:              'PREPROD_REPORT_READY',
    report_ready:                       true,
    controlled_contract_id:             controlled_contract.controlled_contract_id,
    controlled_authority_id:            controlled_authority.controlled_authority_id,
    controlled_binding_id:              controlled_binding.binding_id,
    controlled_evidence_package_id:     controlled_evidence_package.controlled_evidence_package_id,
    evidence_receipt_id:                controlled_evidence_package.evidence_receipt_id ?? null,
    evidence_source:                    controlled_evidence_package.evidence_source ?? 'go-core',
    ledger_event_ids:                   Array.isArray(ledger_chain?.event_count) ? [] : (ledger_chain?.event_count ? [] : []),
    chain_valid:                        ledger_chain?.valid === true,
    blocked_actions:                    PREPROD_BLOCKED_ACTIONS,
    safe_next_actions:                  PREPROD_SAFE_NEXT_ACTIONS,
    created_at:                         now,
    blocking_reason:                    null,
    ..._locked(),
  };
}

/**
 * Render a human-readable pre-production safety report summary.
 */
export function renderFinalPreProductionSafetyReport(report) {
  if (!report) return 'final_pre_production_safety_report: null';
  const lines = [
    `pre_production_status             : ${report.pre_production_status ?? 'UNKNOWN'}`,
    `report_id                         : ${report.report_id ?? 'none'}`,
    `evidence_source                   : ${report.evidence_source ?? 'none'}`,
    `chain_valid                       : ${report.chain_valid ?? false}`,
    `blocked_actions                   : ${report.blocked_actions?.length ?? 0}`,
    `safe_next_actions                 : ${report.safe_next_actions?.length ?? 0}`,
    `human_review_required             : true`,
    `explicit_final_execution_required : true`,
    `production_execution_locked       : true`,
    `controlled_execution_allowed      : false`,
    `unlock_executed                   : false`,
    `final_execution_phase_required    : true`,
    `blocking_reason                   : ${report.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('final-pre-production-safety-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildFinalPreProductionSafetyReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderFinalPreProductionSafetyReport(result));
  }

  process.exit(result.report_ready ? 0 : 1);
}
