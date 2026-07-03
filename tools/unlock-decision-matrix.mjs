#!/usr/bin/env node
/**
 * Unlock Decision Matrix — V62.0
 *
 * Classifies unlock readiness as READY_REVIEW, BLOCKED, or
 * NEEDS_FUTURE_EXECUTION_PHASE. Never releases execution.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. unlock_executed=false always.
 * future_execution_phase_required=true always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v62.0';

export const UNLOCK_DECISION_STATUSES = [
  'UNLOCK_DECISION_BLOCKED_CONTRACT',
  'UNLOCK_DECISION_BLOCKED_AUTHORITY',
  'UNLOCK_DECISION_BLOCKED_BINDING',
  'UNLOCK_DECISION_BLOCKED_BASELINE',
  'UNLOCK_DECISION_READY_REVIEW',
  'UNLOCK_DECISION_NEEDS_FUTURE_EXECUTION_PHASE',
];

export const UNLOCK_DECISION_BLOCKED_ACTIONS = [
  'auto_release',
  'auto_tag',
  'auto_stable_promotion',
  'auto_deploy',
  'git_push',
  'production_write',
  'unlock_execute_now',
  'evidence_override',
  'go_core_override',
];

export const UNLOCK_DECISION_SAFE_NEXT_ACTIONS = [
  'review_unlock_contract',
  'review_unlock_authority',
  'verify_binding_ready',
  'verify_baseline_ready',
  'prepare_future_controlled_execution_contract',
  'do_not_execute_production_in_this_phase',
];

function _sha256(input) {
  return sha256(input);
}

function _locked() {
  return {
    ...makeLockedFlags([
      'deploy_allowed',
      'promotion_allowed',
      'stable_allowed',
      'tag_allowed',
      'release_execution_allowed',
      'release_performed',
      'tag_created',
      'stable_promoted',
      'deploy_performed',
      'unlock_executed',
    ]),
    production_execution_locked:     true,
    unlock_review_only:              true,
    future_execution_phase_required: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                      SCHEMA_VERSION,
    unlock_decision_status:              status,
    unlock_review_ready:                 false,
    missing_requirements:                extra.missing_requirements ?? [],
    blocked_actions:                     UNLOCK_DECISION_BLOCKED_ACTIONS,
    safe_next_actions:                   UNLOCK_DECISION_SAFE_NEXT_ACTIONS,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:                      false,
    promotion_allowed:                   false,
    stable_allowed:                      false,
    tag_allowed:                         false,
    release_execution_allowed:           false,
    release_performed:                   false,
    tag_created:                         false,
    stable_promoted:                     false,
    deploy_performed:                    false,
    production_execution_locked:         true,
    unlock_executed:                     false,
    unlock_review_only:                  true,
    future_execution_phase_required:     true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluate unlock decision from contract, authority, binding, baseline.
 */
export function evaluateUnlockDecision(params = {}) {
  const {
    unlock_contract,
    unlock_authority,
    unlock_binding,
    real_gate_baseline,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const decision_id = _sha256(`fixture-unlock-decision:${now}`).slice(0, 24);
    return {
      schema_version:                      SCHEMA_VERSION,
      decision_id,
      unlock_decision_status:              'UNLOCK_DECISION_READY_REVIEW',
      unlock_review_ready:                 true,
      decision_matrix: {
        contract_valid:                    true,
        authority_valid:                   true,
        binding_ready:                     true,
        baseline_ready:                    true,
      },
      missing_requirements:                [],
      blocked_actions:                     UNLOCK_DECISION_BLOCKED_ACTIONS,
      safe_next_actions:                   UNLOCK_DECISION_SAFE_NEXT_ACTIONS,
      blocking_reason:                     null,
      created_at:                          now,
      ..._locked(),
    };
  }

  // Contract required
  if (!unlock_contract || unlock_contract.contract_ready !== true) {
    return _blocked('UNLOCK_DECISION_BLOCKED_CONTRACT', 'unlock_contract_not_ready', {
      contract_status:        unlock_contract?.contract_status ?? null,
      missing_requirements:   ['unlock_contract'],
    });
  }

  // Authority required
  if (!unlock_authority || unlock_authority.authority_ready !== true) {
    return _blocked('UNLOCK_DECISION_BLOCKED_AUTHORITY', 'unlock_authority_not_ready', {
      authority_status:       unlock_authority?.authority_status ?? null,
      missing_requirements:   ['unlock_authority'],
    });
  }

  // Binding required
  if (!unlock_binding || unlock_binding.binding_ready !== true) {
    return _blocked('UNLOCK_DECISION_BLOCKED_BINDING', 'unlock_binding_not_ready', {
      binding_status:         unlock_binding?.binding_status ?? null,
      missing_requirements:   ['unlock_binding'],
    });
  }

  // Baseline required
  if (!real_gate_baseline || real_gate_baseline.baseline_ready !== true) {
    return _blocked('UNLOCK_DECISION_BLOCKED_BASELINE', 'real_gate_baseline_not_ready', {
      baseline_status:        real_gate_baseline?.baseline_status ?? null,
      missing_requirements:   ['real_gate_baseline'],
    });
  }

  const decision_id = _sha256([
    'unlock-decision',
    unlock_contract.unlock_contract_id ?? '',
    unlock_authority.unlock_authority_id ?? '',
    unlock_binding.binding_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  return {
    schema_version:                      SCHEMA_VERSION,
    decision_id,
    unlock_decision_status:              'UNLOCK_DECISION_READY_REVIEW',
    unlock_review_ready:                 true,
    decision_matrix: {
      contract_valid:                    true,
      authority_valid:                   true,
      binding_ready:                     true,
      baseline_ready:                    true,
    },
    missing_requirements:                [],
    blocked_actions:                     UNLOCK_DECISION_BLOCKED_ACTIONS,
    safe_next_actions:                   UNLOCK_DECISION_SAFE_NEXT_ACTIONS,
    blocking_reason:                     null,
    created_at:                          now,
    ..._locked(),
  };
}

/** Alias */
export const classifyUnlockDecision = evaluateUnlockDecision;

/**
 * Render a human-readable unlock decision summary.
 */
export function renderUnlockDecisionMatrix(result) {
  if (!result) return 'unlock_decision: null';
  const lines = [
    `unlock_decision_status       : ${result.unlock_decision_status ?? 'UNKNOWN'}`,
    `decision_id                  : ${result.decision_id ?? 'none'}`,
    `unlock_review_ready          : ${result.unlock_review_ready ?? false}`,
    `future_execution_required    : true`,
    `production_execution_locked  : true`,
    `unlock_executed              : false`,
    `release_execution_allowed    : false`,
    `blocking_reason              : ${result.blocking_reason ?? 'none'}`,
    `safe_next_actions            : ${result.safe_next_actions?.length ?? 0}`,
    `blocked_actions              : ${result.blocked_actions?.length ?? 0}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('unlock-decision-matrix.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateUnlockDecision({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderUnlockDecisionMatrix(result));
  }

  process.exit(result.unlock_review_ready ? 0 : 1);
}
