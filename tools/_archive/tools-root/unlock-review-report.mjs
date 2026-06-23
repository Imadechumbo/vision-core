#!/usr/bin/env node
/**
 * Unlock Review Report — V64.0
 *
 * Builds a final review report for the unlock governance layer.
 * Review-only. Does NOT execute unlock, release, tag, stable, or deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. unlock_executed=false always.
 * future_execution_phase_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v64.0';

export const UNLOCK_REVIEW_REPORT_STATUSES = [
  'UNLOCK_REPORT_BLOCKED_CONTRACT',
  'UNLOCK_REPORT_BLOCKED_AUTHORITY',
  'UNLOCK_REPORT_BLOCKED_BINDING',
  'UNLOCK_REPORT_BLOCKED_DECISION',
  'UNLOCK_REPORT_BLOCKED_EVIDENCE',
  'UNLOCK_REPORT_BLOCKED_LEDGER',
  'UNLOCK_REPORT_READY',
];

export const UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS = [
  'submit_report_for_human_review',
  'archive_evidence_package',
  'schedule_future_controlled_execution',
  'do_not_execute_production_in_this_phase',
  'retain_audit_trail',
  'prepare_next_governance_cycle',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                    false,
    promotion_allowed:                 false,
    stable_allowed:                    false,
    tag_allowed:                       false,
    release_execution_allowed:         false,
    release_performed:                 false,
    tag_created:                       false,
    stable_promoted:                   false,
    deploy_performed:                  false,
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                    SCHEMA_VERSION,
    report_status:                     status,
    report_ready:                      false,
    blocking_reason,
    safe_next_actions:                 UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS,
    ...extra,
    ..._locked(),
    deploy_allowed:                    false,
    promotion_allowed:                 false,
    stable_allowed:                    false,
    tag_allowed:                       false,
    release_execution_allowed:         false,
    release_performed:                 false,
    tag_created:                       false,
    stable_promoted:                   false,
    deploy_performed:                  false,
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build the unlock review report from governance artifacts.
 */
export function buildUnlockReviewReport(params = {}) {
  const {
    unlock_contract,
    unlock_authority,
    unlock_binding,
    unlock_decision,
    unlock_evidence_package,
    ledger_chain,
    ledger_event_ids = [],
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const report_id = _sha256(`fixture-unlock-review-report:${now}`).slice(0, 24);
    const report_hash = _sha256(`fixture-report-hash:${report_id}:${now}`).slice(0, 48);
    return {
      schema_version:                    SCHEMA_VERSION,
      report_id,
      report_hash,
      report_status:                     'UNLOCK_REPORT_READY',
      report_ready:                      true,
      safe_next_actions:                 UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS,
      governance_summary: {
        contract_valid:                  true,
        authority_valid:                 true,
        binding_ready:                   true,
        decision_ready_review:           true,
        evidence_complete:               true,
        ledger_chain_valid:              true,
        ledger_event_count:              5,
      },
      immutable:                         true,
      human_review_required:             true,
      created_at:                        now,
      blocking_reason:                   null,
      ..._locked(),
    };
  }

  // Contract required
  if (!unlock_contract || unlock_contract.contract_ready !== true) {
    return _blocked('UNLOCK_REPORT_BLOCKED_CONTRACT', 'unlock_contract_not_ready', {
      contract_status: unlock_contract?.contract_status ?? null,
    });
  }

  // Authority required
  if (!unlock_authority || unlock_authority.authority_ready !== true) {
    return _blocked('UNLOCK_REPORT_BLOCKED_AUTHORITY', 'unlock_authority_not_ready', {
      authority_status: unlock_authority?.authority_status ?? null,
    });
  }

  // Binding required
  if (!unlock_binding || unlock_binding.binding_ready !== true) {
    return _blocked('UNLOCK_REPORT_BLOCKED_BINDING', 'unlock_binding_not_ready', {
      binding_status: unlock_binding?.binding_status ?? null,
    });
  }

  // Decision required
  if (!unlock_decision || unlock_decision.unlock_review_ready !== true) {
    return _blocked('UNLOCK_REPORT_BLOCKED_DECISION', 'unlock_decision_not_ready', {
      decision_status: unlock_decision?.unlock_decision_status ?? null,
    });
  }

  // Evidence package required
  if (!unlock_evidence_package || unlock_evidence_package.evidence_review_ready !== true) {
    return _blocked('UNLOCK_REPORT_BLOCKED_EVIDENCE', 'unlock_evidence_package_not_ready', {
      evidence_status: unlock_evidence_package?.evidence_review_status ?? null,
    });
  }

  // Ledger chain required
  if (!ledger_chain || ledger_chain.valid !== true) {
    return _blocked('UNLOCK_REPORT_BLOCKED_LEDGER', 'ledger_chain_not_valid', {
      ledger_status: ledger_chain?.ledger_status ?? null,
    });
  }

  const report_id = _sha256([
    'unlock-review-report',
    unlock_contract.unlock_contract_id ?? '',
    unlock_authority.unlock_authority_id ?? '',
    unlock_decision.decision_id ?? '',
    unlock_evidence_package.package_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  const report_hash = _sha256([
    report_id,
    unlock_contract.unlock_contract_id ?? '',
    unlock_authority.unlock_authority_id ?? '',
    unlock_binding.binding_id ?? '',
    unlock_decision.decision_id ?? '',
    unlock_evidence_package.package_id ?? '',
    ledger_event_ids.join(','),
  ].join(':')).slice(0, 48);

  return {
    schema_version:                    SCHEMA_VERSION,
    report_id,
    report_hash,
    report_status:                     'UNLOCK_REPORT_READY',
    report_ready:                      true,
    safe_next_actions:                 UNLOCK_REVIEW_REPORT_SAFE_NEXT_ACTIONS,
    governance_summary: {
      contract_valid:                  true,
      authority_valid:                 true,
      binding_ready:                   true,
      decision_ready_review:           true,
      evidence_complete:               true,
      ledger_chain_valid:              ledger_chain.chain_valid === true,
      ledger_event_count:              ledger_event_ids.length,
    },
    immutable:                         true,
    human_review_required:             true,
    created_at:                        now,
    blocking_reason:                   null,
    ..._locked(),
  };
}

/**
 * Render a human-readable unlock review report summary.
 */
export function renderUnlockReviewReport(report) {
  if (!report) return 'unlock_review_report: null';
  const lines = [
    `report_status                  : ${report.report_status ?? 'UNKNOWN'}`,
    `report_id                      : ${report.report_id ?? 'none'}`,
    `report_hash                    : ${report.report_hash ?? 'none'}`,
    `report_ready                   : ${report.report_ready ?? false}`,
    `immutable                      : ${report.immutable ?? false}`,
    `human_review_required          : true`,
    `production_execution_locked    : true`,
    `unlock_executed                : false`,
    `future_execution_phase_required: true`,
    `safe_next_actions              : ${report.safe_next_actions?.length ?? 0}`,
    `blocking_reason                : ${report.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('unlock-review-report.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildUnlockReviewReport({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderUnlockReviewReport(result));
  }

  process.exit(result.report_ready ? 0 : 1);
}
