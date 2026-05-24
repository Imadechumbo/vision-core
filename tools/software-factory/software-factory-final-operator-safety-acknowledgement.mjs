/**
 * V409 — Final Operator Safety Acknowledgement
 * Metadata-only. Go decision NOT granted. Release NOT approved.
 * final_operator_safety_acknowledged=false always.
 * operator_go_decision_granted=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT: 'FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT',
  FINAL_OPERATOR_SAFETY_ACK_BLOCKED_KILL_SWITCH: 'FINAL_OPERATOR_SAFETY_ACK_BLOCKED_KILL_SWITCH',
  FINAL_OPERATOR_SAFETY_ACK_FAIL: 'FINAL_OPERATOR_SAFETY_ACK_FAIL',
  FINAL_OPERATOR_SAFETY_ACK_READY: 'FINAL_OPERATOR_SAFETY_ACK_READY',
};

const ALLOWED_ACK_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_ACK_TYPES = new Set([
  'operator_safety_ack', 'release_safety_ack', 'deploy_safety_ack',
  'tag_safety_ack', 'stable_safety_ack', 'artifact_safety_ack',
  'production_safety_ack', 'billing_safety_ack', 'secret_safety_ack',
  'network_safety_ack', 'rollback_safety_ack', 'emergency_stop_safety_ack',
]);

const REQUIRED_CONTROLS = new Set([
  'final-operator-safety-acknowledgement-required',
  'kill-switch-binding-required',
  'acknowledgement-not-granted',
  'operator-go-not-granted',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-artifact-publish',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
  'audit-required',
  'pass-gold-real-required',
]);

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
      schema_version: 'v409',
      status: STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_operator_safety_acknowledgement_id,
    release_kill_switch_binding_id,
    release_kill_switch_binding_ready,
    operator_id,
    operator_role,
    acknowledgement_reason,
    acknowledgement_mode,
    acknowledgement_items,
    required_acknowledgement_controls,
  } = input;

  const errors = [];

  if (!final_operator_safety_acknowledgement_id) errors.push('final_operator_safety_acknowledgement_id required');
  if (!release_kill_switch_binding_id) errors.push('release_kill_switch_binding_id required');
  if (!operator_id) errors.push('operator_id required');
  if (!operator_role) errors.push('operator_role required');
  if (!acknowledgement_reason) errors.push('acknowledgement_reason required');
  if (!acknowledgement_mode) errors.push('acknowledgement_mode required');
  if (!Array.isArray(acknowledgement_items) || acknowledgement_items.length === 0) errors.push('acknowledgement_items required');
  if (!Array.isArray(required_acknowledgement_controls) || required_acknowledgement_controls.length === 0) errors.push('required_acknowledgement_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v409',
      status: STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_ACK_MODES.has(acknowledgement_mode)) {
    errors.push(`acknowledgement_mode '${acknowledgement_mode}' not allowed`);
  }

  for (const item of acknowledgement_items) {
    if (!item.acknowledgement_item_id) errors.push('acknowledgement_item_id required');
    if (!item.acknowledgement_type) errors.push('acknowledgement_type required');
    else if (!ALLOWED_ACK_TYPES.has(item.acknowledgement_type)) errors.push(`acknowledgement_type '${item.acknowledgement_type}' not allowed`);
    if (!item.acknowledgement_mode) errors.push('item acknowledgement_mode required');
    else if (!ALLOWED_ACK_MODES.has(item.acknowledgement_mode)) errors.push(`item acknowledgement_mode '${item.acknowledgement_mode}' not allowed`);
    if (!item.acknowledgement_hash) errors.push('acknowledgement_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_acknowledgement_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v409',
      status: STATUSES.FINAL_OPERATOR_SAFETY_ACK_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!release_kill_switch_binding_ready) {
    return {
      schema_version: 'v409',
      status: STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_KILL_SWITCH,
      errors: ['release_kill_switch_binding must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      final_operator_safety_acknowledgement_id,
      release_kill_switch_binding_id,
      operator_id,
      operator_role,
      acknowledgement_reason,
      acknowledgement_mode,
      acknowledgement_items: acknowledgement_items.map(i => i.acknowledgement_item_id),
      required_acknowledgement_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v409',
    status: STATUSES.FINAL_OPERATOR_SAFETY_ACK_READY,
    final_operator_safety_acknowledgement_id,
    release_kill_switch_binding_id,
    operator_id,
    operator_role,
    acknowledgement_reason,
    acknowledgement_mode,
    acknowledgement_items_count: acknowledgement_items.length,
    required_acknowledgement_controls,
    hash,
    errors: [],
    final_message: 'Final operator safety acknowledgement READY. Go decision NOT granted. Release NOT approved. Execution NOT allowed.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_OPERATOR_SAFETY_ACK_READY) return false;
  if (result.final_operator_safety_acknowledged !== false) return false;
  if (result.operator_go_decision_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V409] Final Operator Safety Acknowledgement — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V409 Final Operator Safety Acknowledgement ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v409'}`,
  ];
  if (result.final_operator_safety_acknowledgement_id) {
    lines.push(`Ack ID: ${result.final_operator_safety_acknowledgement_id}`);
  }
  if (result.operator_id) lines.push(`Operator: ${result.operator_id} (${result.operator_role})`);
  if (result.acknowledgement_mode) lines.push(`Mode: ${result.acknowledgement_mode}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join(', ')}`);
  }
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  final_operator_safety_acknowledged: ${result.final_operator_safety_acknowledged}`);
  lines.push(`  operator_go_decision_granted: ${result.operator_go_decision_granted}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  release_kill_switch_armed: ${result.release_kill_switch_armed}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
