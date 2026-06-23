#!/usr/bin/env node
/**
 * Real Execution Controlled Gate — V149.0
 *
 * Gates any real execution (deploy, tag, release, stable promotion) behind:
 * - truth gate verification
 * - human approval requirement
 * - rollback readiness
 * - controlled execution mode only
 *
 * execution_allowed=false, execution_performed=false always.
 * future_execution_command_required=true always.
 * human_approval_required=true always.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v149.0';

export const CONTROLLED_GATE_STATUSES = [
  'CONTROLLED_GATE_BLOCKED_INPUT',
  'CONTROLLED_GATE_BLOCKED_TRUTH',
  'CONTROLLED_GATE_BLOCKED_ROLLBACK',
  'CONTROLLED_GATE_BLOCKED_NO_APPROVAL',
  'CONTROLLED_GATE_READY_FOR_HUMAN',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:    false,
    deploy_performed:   false,
    release_performed:  false,
    execution_performed: false,
  };
}

export function evaluateControlledGate(params) {
  const {
    gate_id,
    agent_name                = null,
    truth_gate_status         = null,
    truth_score               = null,
    truth_score_threshold     = 80,
    rollback_plan_ready       = false,
    rollback_tested           = false,
    human_approval_token      = null,
    controlled_execution_mode = false,
    dry_run_completed         = false,
    proof_ledger_sealed       = false,
    evaluated_at,
  } = params || {};

  const gate_id_hash = _sha256([
    gate_id, agent_name, truth_gate_status, truth_score,
    human_approval_token ?? 'null',
  ].join('|'));

  const INVARIANTS = {
    execution_allowed:                false,
    future_execution_command_required: true,
    human_approval_required:          true,
    truth_gate_required:              true,
    rollback_required:                true,
    unsafe_learning_blocked:          true,
    positive_learning_requires_pass_gold: true,
  };

  if (!gate_id || String(gate_id).trim() === '') {
    return {
      gate_id_hash,
      schema_version:               SCHEMA_VERSION,
      controlled_gate_status:       'CONTROLLED_GATE_BLOCKED_INPUT',
      controlled_gate_evaluated:    false,
      blocked_reason:               'gate_id is required.',
      evaluated_at:                 evaluated_at ?? new Date().toISOString(),
      ...INVARIANTS,
      ..._locked(),
    };
  }

  const tscore = truth_score !== null && truth_score !== undefined ? Number(truth_score) : null;

  const truth_ok = (
    truth_gate_status === 'AGENT_TRUTH_TRUSTED' ||
    truth_gate_status === 'AGENT_TRUTH_SUPERVISED'
  ) && (tscore === null || tscore >= Number(truth_score_threshold));

  if (!truth_ok) {
    return {
      gate_id_hash,
      schema_version:               SCHEMA_VERSION,
      controlled_gate_status:       'CONTROLLED_GATE_BLOCKED_TRUTH',
      controlled_gate_evaluated:    true,
      gate_id,
      agent_name,
      blocked_reason:               `Truth gate not satisfied: status=${truth_gate_status}, score=${tscore}`,
      truth_gate_status,
      truth_score:                  tscore,
      evaluated_at:                 evaluated_at ?? new Date().toISOString(),
      ...INVARIANTS,
      ..._locked(),
    };
  }

  if (!rollback_plan_ready) {
    return {
      gate_id_hash,
      schema_version:               SCHEMA_VERSION,
      controlled_gate_status:       'CONTROLLED_GATE_BLOCKED_ROLLBACK',
      controlled_gate_evaluated:    true,
      gate_id,
      agent_name,
      blocked_reason:               'Rollback plan not ready.',
      truth_gate_status,
      truth_score:                  tscore,
      evaluated_at:                 evaluated_at ?? new Date().toISOString(),
      ...INVARIANTS,
      ..._locked(),
    };
  }

  if (!human_approval_token || String(human_approval_token).trim() === '') {
    return {
      gate_id_hash,
      schema_version:               SCHEMA_VERSION,
      controlled_gate_status:       'CONTROLLED_GATE_BLOCKED_NO_APPROVAL',
      controlled_gate_evaluated:    true,
      gate_id,
      agent_name,
      blocked_reason:               'Human approval token required.',
      truth_gate_status,
      truth_score:                  tscore,
      rollback_plan_ready,
      evaluated_at:                 evaluated_at ?? new Date().toISOString(),
      ...INVARIANTS,
      ..._locked(),
    };
  }

  return {
    gate_id_hash,
    schema_version:               SCHEMA_VERSION,
    controlled_gate_status:       'CONTROLLED_GATE_READY_FOR_HUMAN',
    controlled_gate_evaluated:    true,
    gate_id,
    agent_name,
    truth_gate_status,
    truth_score:                  tscore,
    truth_score_threshold:        Number(truth_score_threshold),
    rollback_plan_ready,
    rollback_tested,
    human_approval_token_hash:    _sha256(String(human_approval_token)),
    controlled_execution_mode,
    dry_run_completed,
    proof_ledger_sealed,
    evaluated_at:                 evaluated_at ?? new Date().toISOString(),
    ...INVARIANTS,
    ..._locked(),
  };
}

export function validateControlledGate(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'gate_id_hash', 'schema_version', 'controlled_gate_status',
    'controlled_gate_evaluated',
    'execution_allowed', 'execution_performed',
    'future_execution_command_required', 'human_approval_required',
    'truth_gate_required', 'rollback_required',
    'unsafe_learning_blocked', 'positive_learning_requires_pass_gold',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted    !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed   !== false) errors.push('deploy_performed must be false');
  if (result.release_performed  !== false) errors.push('release_performed must be false');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.execution_allowed  !== false) errors.push('execution_allowed must be false');
  if (result.future_execution_command_required !== true) {
    errors.push('future_execution_command_required must be true');
  }
  if (result.human_approval_required !== true) {
    errors.push('human_approval_required must be true');
  }
  if (result.unsafe_learning_blocked !== true) {
    errors.push('unsafe_learning_blocked must be true');
  }
  if (!CONTROLLED_GATE_STATUSES.includes(result.controlled_gate_status)) {
    errors.push(`invalid controlled_gate_status: ${result.controlled_gate_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledGate(result) {
  if (!result || typeof result !== 'object') {
    return '[REAL_EXECUTION_CONTROLLED_GATE] No result to render.';
  }
  const lines = [
    `=== Real Execution Controlled Gate [${SCHEMA_VERSION}] ===`,
    `Status:                                ${result.controlled_gate_status ?? 'N/A'}`,
    `Gate ID:                               ${result.gate_id ?? 'N/A'}`,
    `Agent:                                 ${result.agent_name ?? 'N/A'}`,
    `Evaluated:                             ${result.controlled_gate_evaluated}`,
    `Truth gate status:                     ${result.truth_gate_status ?? 'N/A'}`,
    `Truth score:                           ${result.truth_score ?? 'N/A'}`,
    `Rollback plan ready:                   ${result.rollback_plan_ready}`,
    `Dry run completed:                     ${result.dry_run_completed}`,
    `Proof ledger sealed:                   ${result.proof_ledger_sealed}`,
    `--- Execution locks ---`,
    `execution_allowed:                     ${result.execution_allowed}`,
    `execution_performed:                   ${result.execution_performed}`,
    `future_execution_command_required:     ${result.future_execution_command_required}`,
    `human_approval_required:               ${result.human_approval_required}`,
    `truth_gate_required:                   ${result.truth_gate_required}`,
    `rollback_required:                     ${result.rollback_required}`,
    `--- Learning rules ---`,
    `unsafe_learning_blocked:               ${result.unsafe_learning_blocked}`,
    `positive_learning_requires_pass_gold:  ${result.positive_learning_requires_pass_gold}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
