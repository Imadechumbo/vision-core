/**
 * V407 — Hard Stop Enforcement Gate
 * Metadata-only. Hard stop must remain not lifted.
 * hard_stop_enforced=false always.
 * real_release_hard_stop_lifted=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  HARD_STOP_ENFORCEMENT_BLOCKED_INPUT: 'HARD_STOP_ENFORCEMENT_BLOCKED_INPUT',
  HARD_STOP_ENFORCEMENT_BLOCKED_PREFLIGHT: 'HARD_STOP_ENFORCEMENT_BLOCKED_PREFLIGHT',
  HARD_STOP_ENFORCEMENT_FAIL: 'HARD_STOP_ENFORCEMENT_FAIL',
  HARD_STOP_ENFORCEMENT_READY: 'HARD_STOP_ENFORCEMENT_READY',
};

const ALLOWED_HARD_STOP_TYPES = new Set([
  'release_hard_stop', 'deploy_hard_stop', 'tag_hard_stop', 'stable_hard_stop',
  'artifact_hard_stop', 'production_hard_stop', 'billing_hard_stop',
  'secret_hard_stop', 'network_hard_stop', 'rollback_hard_stop',
  'operator_hard_stop', 'emergency_stop_hard_stop',
]);

const ALLOWED_HARD_STOP_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const REQUIRED_CONTROLS = new Set([
  'hard-stop-enforcement-required',
  'final-preflight-required',
  'hard-stop-not-lifted',
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
      schema_version: 'v407',
      status: STATUSES.HARD_STOP_ENFORCEMENT_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    hard_stop_enforcement_gate_id,
    final_real_release_preflight_contract_id,
    final_real_release_preflight_contract_ready,
    hard_stop_items,
    required_hard_stop_controls,
    hard_stop_level,
  } = input;

  const errors = [];

  if (!hard_stop_enforcement_gate_id) errors.push('hard_stop_enforcement_gate_id required');
  if (!final_real_release_preflight_contract_id) errors.push('final_real_release_preflight_contract_id required');
  if (!hard_stop_level) errors.push('hard_stop_level required');
  if (!Array.isArray(hard_stop_items) || hard_stop_items.length === 0) errors.push('hard_stop_items required');
  if (!Array.isArray(required_hard_stop_controls) || required_hard_stop_controls.length === 0) errors.push('required_hard_stop_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v407',
      status: STATUSES.HARD_STOP_ENFORCEMENT_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  for (const item of hard_stop_items) {
    if (!item.hard_stop_item_id) errors.push('hard_stop_item_id required');
    if (!item.hard_stop_type) errors.push('hard_stop_type required');
    else if (!ALLOWED_HARD_STOP_TYPES.has(item.hard_stop_type)) errors.push(`hard_stop_type '${item.hard_stop_type}' not allowed`);
    if (!item.hard_stop_mode) errors.push('hard_stop_mode required');
    else if (!ALLOWED_HARD_STOP_MODES.has(item.hard_stop_mode)) errors.push(`hard_stop_mode '${item.hard_stop_mode}' not allowed`);
    if (!item.hard_stop_hash) errors.push('hard_stop_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_hard_stop_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v407',
      status: STATUSES.HARD_STOP_ENFORCEMENT_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!final_real_release_preflight_contract_ready) {
    return {
      schema_version: 'v407',
      status: STATUSES.HARD_STOP_ENFORCEMENT_BLOCKED_PREFLIGHT,
      errors: ['final_real_release_preflight_contract must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      hard_stop_enforcement_gate_id,
      final_real_release_preflight_contract_id,
      hard_stop_level,
      hard_stop_items: hard_stop_items.map(i => i.hard_stop_item_id),
      required_hard_stop_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v407',
    status: STATUSES.HARD_STOP_ENFORCEMENT_READY,
    hard_stop_enforcement_gate_id,
    final_real_release_preflight_contract_id,
    hard_stop_level,
    hard_stop_items_count: hard_stop_items.length,
    required_hard_stop_controls,
    hash,
    errors: [],
    final_message: 'Hard stop enforcement gate READY. Hard stop NOT lifted. Execution NOT allowed.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.HARD_STOP_ENFORCEMENT_READY) return false;
  if (result.hard_stop_enforced !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V407] Hard Stop Enforcement Gate — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V407 Hard Stop Enforcement Gate ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v407'}`,
  ];
  if (result.hard_stop_enforcement_gate_id) {
    lines.push(`Gate ID: ${result.hard_stop_enforcement_gate_id}`);
  }
  if (result.hard_stop_level) lines.push(`Level: ${result.hard_stop_level}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join(', ')}`);
  }
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  hard_stop_enforced: ${result.hard_stop_enforced}`);
  lines.push(`  real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
