/**
 * V410 — Real Release Hard Stop Phase Gate
 * Consolidates V406–V410. Hard stop NOT lifted. Execution NOT allowed.
 * real_release_hard_stop_phase_passed=false always.
 * real_release_hard_stop_lifted=false always.
 * real_release_execution_allowed=false always.
 * operator_go_decision_granted=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT: 'REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT',
  REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_ACK: 'REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_ACK',
  REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE: 'REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE',
  REAL_RELEASE_HARD_STOP_PHASE_GATE_READY: 'REAL_RELEASE_HARD_STOP_PHASE_GATE_READY',
};

const REQUIRED_IDS = [
  'final_real_release_preflight_contract',
  'hard_stop_enforcement_gate',
  'release_kill_switch_binding',
  'final_operator_safety_acknowledgement',
];

const FINAL_MESSAGE = 'V406-V410 final real release execution preflight and hard stop layer complete. Real release execution remains blocked until explicit V411 command.';

function invariants() {
  return {
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    real_release_executed: false,
    real_deploy_executed: false,
    real_tag_created: false,
    real_stable_promoted: false,
    artifact_published: false,
    production_touched: false,
    billing_executed: false,
    secrets_accessed: false,
    network_accessed: false,
    rollback_executed: false,
    operator_go_no_go_phase_passed: false,
    operator_go_decision_granted: false,
    real_release_command_executed: false,
    real_release_execution_allowed: false,
    final_real_release_preflight_passed: false,
    hard_stop_enforced: false,
    release_kill_switch_bound: false,
    release_kill_switch_armed: false,
    final_operator_safety_acknowledged: false,
    real_release_hard_stop_phase_passed: false,
    real_release_hard_stop_lifted: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v410',
      status: STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT,
      errors: ['input required'],
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  const {
    real_release_hard_stop_phase_gate_id,
    final_operator_safety_acknowledgement_id,
    final_operator_safety_acknowledgement_ready,
    ids,
    phase_summary,
  } = input;

  const errors = [];

  if (!real_release_hard_stop_phase_gate_id) errors.push('real_release_hard_stop_phase_gate_id required');
  if (!final_operator_safety_acknowledgement_id) errors.push('final_operator_safety_acknowledgement_id required');
  if (!phase_summary) errors.push('phase_summary required');
  if (!ids || typeof ids !== 'object') errors.push('ids required');

  if (errors.length > 0) {
    return {
      schema_version: 'v410',
      status: STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT,
      errors,
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  // Check all required IDs present
  const missingIds = [];
  for (const key of REQUIRED_IDS) {
    if (!ids[key]) missingIds.push(key);
  }

  if (missingIds.length > 0) {
    return {
      schema_version: 'v410',
      status: STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE,
      errors: missingIds.map(k => `ids.${k} required`),
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  if (!final_operator_safety_acknowledgement_ready) {
    return {
      schema_version: 'v410',
      status: STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_ACK,
      errors: ['final_operator_safety_acknowledgement must be READY'],
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      real_release_hard_stop_phase_gate_id,
      final_operator_safety_acknowledgement_id,
      ids,
      phase_summary,
    }))
    .digest('hex');

  return {
    schema_version: 'v410',
    status: STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_READY,
    real_release_hard_stop_phase_gate_id,
    final_operator_safety_acknowledgement_id,
    ids,
    phase_summary,
    modules_consolidated: REQUIRED_IDS.length,
    hash,
    errors: [],
    final_message: FINAL_MESSAGE,
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_READY) return false;
  if (result.real_release_hard_stop_phase_passed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.operator_go_decision_granted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  if (result.final_message !== FINAL_MESSAGE) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return `[V410] Real Release Hard Stop Phase Gate — no result\n${FINAL_MESSAGE}\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.`;
  }
  const lines = [
    '=== V410 Real Release Hard Stop Phase Gate ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v410'}`,
  ];
  if (result.real_release_hard_stop_phase_gate_id) {
    lines.push(`Gate ID: ${result.real_release_hard_stop_phase_gate_id}`);
  }
  if (result.modules_consolidated !== undefined) {
    lines.push(`Modules Consolidated: ${result.modules_consolidated}`);
  }
  if (result.ids) {
    lines.push('Module IDs:');
    for (const [k, v] of Object.entries(result.ids)) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join(', ')}`);
  }
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  real_release_hard_stop_phase_passed: ${result.real_release_hard_stop_phase_passed}`);
  lines.push(`  real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  operator_go_decision_granted: ${result.operator_go_decision_granted}`);
  lines.push(`  final_operator_safety_acknowledged: ${result.final_operator_safety_acknowledged}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push(`FINAL: ${result.final_message || FINAL_MESSAGE}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
