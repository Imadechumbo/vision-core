/**
 * V412 — Manual Command Seal Binder
 * Metadata-only. Seal NOT verified. Execution NOT authorized.
 * manual_command_seal_bound=false always.
 * manual_command_seal_verified=false always.
 * manual_release_execution_authorized=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT: 'MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT',
  MANUAL_COMMAND_SEAL_BINDER_BLOCKED_LEDGER: 'MANUAL_COMMAND_SEAL_BINDER_BLOCKED_LEDGER',
  MANUAL_COMMAND_SEAL_BINDER_FAIL: 'MANUAL_COMMAND_SEAL_BINDER_FAIL',
  MANUAL_COMMAND_SEAL_BINDER_READY: 'MANUAL_COMMAND_SEAL_BINDER_READY',
};

const ALLOWED_SEAL_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_SEAL_TYPES = new Set([
  'manual_release_seal', 'manual_deploy_seal', 'manual_tag_seal',
  'manual_stable_seal', 'manual_artifact_seal', 'manual_production_seal',
  'manual_billing_seal', 'manual_secret_seal', 'manual_network_seal',
  'manual_rollback_seal', 'manual_operator_seal', 'manual_emergency_stop_seal',
]);

const REQUIRED_CONTROLS = new Set([
  'manual-command-seal-required',
  'authorization-ledger-required',
  'metadata-only-seal',
  'seal-not-verified',
  'manual-release-not-authorized',
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
    real_release_hard_stop_phase_passed: false,
    real_release_hard_stop_lifted: false,
    operator_go_decision_granted: false,
    real_release_command_executed: false,
    real_release_execution_allowed: false,
    release_authorization_ledger_created: false,
    manual_command_seal_bound: false,
    manual_command_seal_verified: false,
    final_authorization_evidence_ledger_published: false,
    manual_execution_intent_reviewed: false,
    manual_execution_intent_approved: false,
    release_authorization_ledger_phase_passed: false,
    manual_release_execution_authorized: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v412',
      status: STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    manual_command_seal_binder_id,
    release_authorization_ledger_contract_id,
    release_authorization_ledger_contract_ready,
    seal_actor,
    seal_reason,
    seal_mode,
    seal_items,
    required_seal_controls,
  } = input;

  const errors = [];

  if (!manual_command_seal_binder_id) errors.push('manual_command_seal_binder_id required');
  if (!release_authorization_ledger_contract_id) errors.push('release_authorization_ledger_contract_id required');
  if (!seal_actor) errors.push('seal_actor required');
  if (!seal_reason) errors.push('seal_reason required');
  if (!seal_mode) errors.push('seal_mode required');
  if (!Array.isArray(seal_items) || seal_items.length === 0) errors.push('seal_items required');
  if (!Array.isArray(required_seal_controls) || required_seal_controls.length === 0) errors.push('required_seal_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v412',
      status: STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_SEAL_MODES.has(seal_mode)) {
    errors.push(`seal_mode '${seal_mode}' not allowed`);
  }

  for (const item of seal_items) {
    if (!item.seal_item_id) errors.push('seal_item_id required');
    if (!item.seal_type) errors.push('seal_type required');
    else if (!ALLOWED_SEAL_TYPES.has(item.seal_type)) errors.push(`seal_type '${item.seal_type}' not allowed`);
    if (!item.seal_mode) errors.push('item seal_mode required');
    else if (!ALLOWED_SEAL_MODES.has(item.seal_mode)) errors.push(`item seal_mode '${item.seal_mode}' not allowed`);
    if (!item.seal_hash) errors.push('seal_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_seal_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v412',
      status: STATUSES.MANUAL_COMMAND_SEAL_BINDER_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!release_authorization_ledger_contract_ready) {
    return {
      schema_version: 'v412',
      status: STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_LEDGER,
      errors: ['release_authorization_ledger_contract must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      manual_command_seal_binder_id,
      release_authorization_ledger_contract_id,
      seal_actor,
      seal_reason,
      seal_mode,
      seal_items: seal_items.map(i => i.seal_item_id),
      required_seal_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v412',
    status: STATUSES.MANUAL_COMMAND_SEAL_BINDER_READY,
    manual_command_seal_binder_id,
    release_authorization_ledger_contract_id,
    seal_actor,
    seal_reason,
    seal_mode,
    seal_items_count: seal_items.length,
    required_seal_controls,
    hash,
    errors: [],
    final_message: 'Manual command seal binder READY. Seal NOT verified. Execution NOT authorized.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.MANUAL_COMMAND_SEAL_BINDER_READY) return false;
  if (result.manual_command_seal_bound !== false) return false;
  if (result.manual_command_seal_verified !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V412] Manual Command Seal Binder — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V412 Manual Command Seal Binder ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v412'}`,
  ];
  if (result.manual_command_seal_binder_id) lines.push(`Binder ID: ${result.manual_command_seal_binder_id}`);
  if (result.seal_mode) lines.push(`Mode: ${result.seal_mode}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) lines.push(`Errors: ${result.errors.join(', ')}`);
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  manual_command_seal_bound: ${result.manual_command_seal_bound}`);
  lines.push(`  manual_command_seal_verified: ${result.manual_command_seal_verified}`);
  lines.push(`  manual_release_execution_authorized: ${result.manual_release_execution_authorized}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
