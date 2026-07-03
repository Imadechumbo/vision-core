#!/usr/bin/env node
/**
 * Controlled Execution Risk Matrix — V67.0
 *
 * Evaluates risk and readiness for controlled execution review.
 * Does NOT execute release, tag, stable, deploy, or unlock.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * controlled_execution_allowed=false always.
 * unlock_executed=false always.
 * final_execution_phase_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v67.0';

export const CONTROLLED_RISK_STATUSES = [
  'CONTROLLED_RISK_BLOCKED_CONTRACT',
  'CONTROLLED_RISK_BLOCKED_AUTHORITY',
  'CONTROLLED_RISK_BLOCKED_BINDING',
  'CONTROLLED_RISK_BLOCKED_BASELINE',
  'CONTROLLED_RISK_BLOCKED_EVIDENCE',
  'CONTROLLED_RISK_READY_REVIEW',
  'CONTROLLED_RISK_NEEDS_FINAL_EXECUTION_PHASE',
];

export const CONTROLLED_RISK_BLOCKED_ACTIONS = [
  'auto_release',
  'auto_tag',
  'auto_stable_promotion',
  'auto_deploy',
  'auto_unlock',
  'auto_controlled_execution',
  'git_push',
  'production_write',
  'unlock_execute_now',
  'controlled_execute_now',
];

export const CONTROLLED_RISK_SAFE_NEXT_ACTIONS = [
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
    controlled_execution_review_ready:  false,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                     SCHEMA_VERSION,
    controlled_risk_status:             status,
    controlled_execution_review_ready:  false,
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
    controlled_execution_review_ready:  false,
    future_execution_phase_required:    true,
    final_execution_phase_required:     true,
    blocked_actions:                    CONTROLLED_RISK_BLOCKED_ACTIONS,
    safe_next_actions:                  CONTROLLED_RISK_SAFE_NEXT_ACTIONS,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluate controlled execution risk (review-only).
 */
export function evaluateControlledExecutionRisk(params = {}) {
  const {
    controlled_contract,
    controlled_authority,
    controlled_binding,
    unlock_governance_baseline,
    unlock_decision,
    real_release_readiness,
    evidence_finalizer,
    release_sandbox_baseline,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const risk_matrix_id = _sha256(`fixture-controlled-risk:${now}`).slice(0, 24);
    return {
      schema_version:                     SCHEMA_VERSION,
      risk_matrix_id,
      controlled_risk_status:             'CONTROLLED_RISK_READY_REVIEW',
      controlled_execution_review_ready:  true,
      risk_score:                         0,
      risk_matrix: {
        contract_valid:                   true,
        authority_valid:                  true,
        binding_ready:                    true,
        baseline_ready:                   true,
        evidence_complete:                true,
        unlock_decision_ready:            true,
      },
      missing_requirements:               [],
      blocked_actions:                    CONTROLLED_RISK_BLOCKED_ACTIONS,
      safe_next_actions:                  CONTROLLED_RISK_SAFE_NEXT_ACTIONS,
      created_at:                         now,
      blocking_reason:                    null,
      ..._locked(),
      controlled_execution_review_ready:  true,
    };
  }

  // Contract required
  if (!controlled_contract || controlled_contract.contract_ready !== true) {
    return _blocked('CONTROLLED_RISK_BLOCKED_CONTRACT', 'controlled_contract_not_ready', {
      contract_status: controlled_contract?.contract_status ?? null,
    });
  }

  // Authority required
  if (!controlled_authority || controlled_authority.authority_ready !== true) {
    return _blocked('CONTROLLED_RISK_BLOCKED_AUTHORITY', 'controlled_authority_not_ready', {
      authority_status: controlled_authority?.authority_status ?? null,
    });
  }

  // Binding required
  if (!controlled_binding || controlled_binding.binding_ready !== true) {
    return _blocked('CONTROLLED_RISK_BLOCKED_BINDING', 'controlled_binding_not_ready', {
      binding_status: controlled_binding?.binding_status ?? null,
    });
  }

  // Unlock governance baseline required
  if (!unlock_governance_baseline || unlock_governance_baseline.baseline_ready !== true) {
    return _blocked('CONTROLLED_RISK_BLOCKED_BASELINE', 'unlock_governance_baseline_not_ready', {
      baseline_status: unlock_governance_baseline?.baseline_status ?? null,
    });
  }

  const risk_matrix_id = _sha256([
    'controlled-risk',
    controlled_contract.controlled_contract_id ?? '',
    controlled_authority.controlled_authority_id ?? '',
    controlled_binding.binding_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  const risk_matrix = {
    contract_valid:    true,
    authority_valid:   true,
    binding_ready:     true,
    baseline_ready:    true,
    evidence_complete: evidence_finalizer?.evidence_final_ready === true,
    unlock_decision_ready: unlock_decision?.unlock_review_ready === true,
    release_readiness: real_release_readiness?.readiness_status ?? null,
    sandbox_baseline:  release_sandbox_baseline?.baseline_status ?? null,
  };

  const missing_requirements = [];
  if (!risk_matrix.evidence_complete) missing_requirements.push('evidence_finalizer_not_ready');
  if (!risk_matrix.unlock_decision_ready) missing_requirements.push('unlock_decision_not_ready');

  const risk_score = missing_requirements.length;

  return {
    schema_version:                     SCHEMA_VERSION,
    risk_matrix_id,
    controlled_risk_status:             'CONTROLLED_RISK_READY_REVIEW',
    controlled_execution_review_ready:  true,
    risk_score,
    risk_matrix,
    missing_requirements,
    blocked_actions:                    CONTROLLED_RISK_BLOCKED_ACTIONS,
    safe_next_actions:                  CONTROLLED_RISK_SAFE_NEXT_ACTIONS,
    created_at:                         now,
    blocking_reason:                    null,
    ..._locked(),
    controlled_execution_review_ready:  true,
  };
}

/**
 * Alias for evaluateControlledExecutionRisk.
 */
export const classifyControlledExecutionRisk = evaluateControlledExecutionRisk;

/**
 * Render a human-readable risk matrix summary.
 */
export function renderControlledExecutionRiskMatrix(result) {
  if (!result) return 'controlled_execution_risk_matrix: null';
  const lines = [
    `controlled_risk_status            : ${result.controlled_risk_status ?? 'UNKNOWN'}`,
    `risk_matrix_id                    : ${result.risk_matrix_id ?? 'none'}`,
    `risk_score                        : ${result.risk_score ?? 'n/a'}`,
    `controlled_execution_review_ready : ${result.controlled_execution_review_ready ?? false}`,
    `missing_requirements              : ${result.missing_requirements?.length ?? 0}`,
    `blocked_actions                   : ${result.blocked_actions?.length ?? 0}`,
    `safe_next_actions                 : ${result.safe_next_actions?.length ?? 0}`,
    `production_execution_locked       : true`,
    `controlled_execution_allowed      : false`,
    `unlock_executed                   : false`,
    `final_execution_phase_required    : true`,
    `blocking_reason                   : ${result.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('controlled-execution-risk-matrix.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateControlledExecutionRisk({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledExecutionRiskMatrix(result));
  }

  process.exit(result.controlled_execution_review_ready ? 0 : 1);
}
