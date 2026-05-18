#!/usr/bin/env node
/**
 * Real Manual Execution Decision Matrix — V72.1
 *
 * Final decision matrix for real manual execution phase.
 * Separates: dry-run-only, blocked, requires explicit real command.
 * Does NOT execute anything. Review-only.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always.
 * explicit_real_command_required=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v72.1';

export const REAL_EXEC_DECISION_STATUSES = [
  'REAL_EXEC_DECISION_BLOCKED_CONTRACT',
  'REAL_EXEC_DECISION_BLOCKED_BINDING',
  'REAL_EXEC_DECISION_BLOCKED_DRY_RUN',
  'REAL_EXEC_DECISION_DRY_RUN_READY',
  'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND',
];

export const REAL_EXEC_DECISION_BLOCKED_ACTIONS = [
  'auto_unlock',
  'auto_release',
  'auto_tag',
  'auto_stable',
  'auto_deploy',
  'git_push',
  'production_write',
  'evidence_override',
  'go_core_override',
];

export const REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS = [
  'review_dry_run_result',
  'prepare_real_manual_command',
  'verify_evidence_chain',
  'review_rollback_plan',
  'do_not_execute_production_in_this_phase',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    real_execution_armed:            false,
    explicit_real_command_required:  true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                  SCHEMA_VERSION,
    real_execution_decision_status:  status,
    real_execution_phase_ready:      false,
    dry_run_verified:                false,
    blocking_reason,
    blocked_actions:                 REAL_EXEC_DECISION_BLOCKED_ACTIONS,
    safe_next_actions:               REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS,
    ...extra,
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    real_execution_armed:            false,
    explicit_real_command_required:  true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export function evaluateRealManualExecutionDecision(params = {}) {
  const {
    unlock_execution_contract,
    unlock_authority_binding,
    unlock_dry_run,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const decision_id = _sha256(`fixture-exec-decision:${now}`).slice(0, 24);
    return {
      schema_version:                  SCHEMA_VERSION,
      decision_id,
      real_execution_decision_status:  'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND',
      real_execution_phase_ready:      true,
      dry_run_verified:                true,
      blocking_reason:                 null,
      blocked_actions:                 REAL_EXEC_DECISION_BLOCKED_ACTIONS,
      safe_next_actions:               REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS,
      created_at:                      now,
      ..._locked(),
    };
  }

  // Contract required
  if (!unlock_execution_contract || unlock_execution_contract.contract_status !== 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW') {
    return _blocked('REAL_EXEC_DECISION_BLOCKED_CONTRACT', 'unlock_execution_contract_not_ready', {
      contract_status: unlock_execution_contract?.contract_status ?? null,
    });
  }

  // Binding required
  if (!unlock_authority_binding || unlock_authority_binding.binding_status !== 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW') {
    return _blocked('REAL_EXEC_DECISION_BLOCKED_BINDING', 'unlock_authority_binding_not_ready', {
      binding_status: unlock_authority_binding?.binding_status ?? null,
    });
  }

  // Dry-run required
  const dry_run_verified = unlock_dry_run?.unlock_dry_run_status === 'UNLOCK_DRY_RUN_READY';
  if (!dry_run_verified) {
    return _blocked('REAL_EXEC_DECISION_BLOCKED_DRY_RUN', 'unlock_dry_run_not_ready', {
      dry_run_status: unlock_dry_run?.unlock_dry_run_status ?? null,
    });
  }

  const decision_id = _sha256([
    'exec-decision',
    unlock_execution_contract.unlock_execution_contract_id ?? '',
    unlock_authority_binding.binding_id ?? '',
    unlock_dry_run.unlock_dry_run_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:                  SCHEMA_VERSION,
    decision_id,
    real_execution_decision_status:  'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND',
    real_execution_phase_ready:      true,
    dry_run_verified:                true,
    blocking_reason:                 null,
    blocked_actions:                 REAL_EXEC_DECISION_BLOCKED_ACTIONS,
    safe_next_actions:               REAL_EXEC_DECISION_SAFE_NEXT_ACTIONS,
    created_at:                      now,
    ..._locked(),
  };
}

export function renderRealManualExecutionDecisionMatrix(result) {
  if (!result) return 'real_manual_execution_decision_matrix: null';
  return [
    `real_execution_decision_status : ${result.real_execution_decision_status ?? 'UNKNOWN'}`,
    `decision_id                    : ${result.decision_id ?? 'none'}`,
    `real_execution_phase_ready     : ${result.real_execution_phase_ready ?? false}`,
    `dry_run_verified               : ${result.dry_run_verified ?? false}`,
    `explicit_real_command_required : true`,
    `production_execution_locked    : true`,
    `unlock_executed                : false`,
    `real_execution_armed           : false`,
    `blocked_actions                : ${result.blocked_actions?.length ?? 0}`,
    `safe_next_actions              : ${result.safe_next_actions?.length ?? 0}`,
    `blocking_reason                : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-manual-execution-decision-matrix.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateRealManualExecutionDecision({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealManualExecutionDecisionMatrix(result));
  }

  process.exit(result.real_execution_phase_ready ? 0 : 1);
}
