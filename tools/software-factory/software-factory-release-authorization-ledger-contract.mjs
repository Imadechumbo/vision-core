/**
 * V411 — Release Authorization Ledger Contract
 * Metadata-only. Does NOT create real authorization ledger.
 * Does NOT authorize release execution.
 * release_authorization_ledger_created=false always.
 * manual_release_execution_authorized=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT: 'RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT',
  RELEASE_AUTHORIZATION_LEDGER_BLOCKED_HARD_STOP: 'RELEASE_AUTHORIZATION_LEDGER_BLOCKED_HARD_STOP',
  RELEASE_AUTHORIZATION_LEDGER_FAIL: 'RELEASE_AUTHORIZATION_LEDGER_FAIL',
  RELEASE_AUTHORIZATION_LEDGER_READY: 'RELEASE_AUTHORIZATION_LEDGER_READY',
};

const ALLOWED_LEDGER_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_LEDGER_TYPES = new Set([
  'release_authorization_entry', 'deploy_authorization_entry', 'tag_authorization_entry',
  'stable_authorization_entry', 'artifact_authorization_entry', 'production_authorization_entry',
  'billing_authorization_entry', 'secret_authorization_entry', 'network_authorization_entry',
  'rollback_authorization_entry', 'operator_authorization_entry', 'emergency_stop_authorization_entry',
]);

const REQUIRED_CONTROLS = new Set([
  'release-authorization-ledger-required',
  'hard-stop-phase-required',
  'metadata-only-ledger',
  'ledger-not-created',
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
      schema_version: 'v411',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    release_authorization_ledger_contract_id,
    real_release_hard_stop_phase_gate_id,
    real_release_hard_stop_phase_gate_ready,
    ledger_requested_by,
    ledger_reason,
    ledger_mode,
    ledger_items,
    required_ledger_controls,
  } = input;

  const errors = [];

  if (!release_authorization_ledger_contract_id) errors.push('release_authorization_ledger_contract_id required');
  if (!real_release_hard_stop_phase_gate_id) errors.push('real_release_hard_stop_phase_gate_id required');
  if (!ledger_requested_by) errors.push('ledger_requested_by required');
  if (!ledger_reason) errors.push('ledger_reason required');
  if (!ledger_mode) errors.push('ledger_mode required');
  if (!Array.isArray(ledger_items) || ledger_items.length === 0) errors.push('ledger_items required');
  if (!Array.isArray(required_ledger_controls) || required_ledger_controls.length === 0) errors.push('required_ledger_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v411',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_LEDGER_MODES.has(ledger_mode)) {
    errors.push(`ledger_mode '${ledger_mode}' not allowed`);
  }

  for (const item of ledger_items) {
    if (!item.ledger_item_id) errors.push('ledger_item_id required');
    if (!item.ledger_type) errors.push('ledger_type required');
    else if (!ALLOWED_LEDGER_TYPES.has(item.ledger_type)) errors.push(`ledger_type '${item.ledger_type}' not allowed`);
    if (!item.ledger_mode) errors.push('item ledger_mode required');
    else if (!ALLOWED_LEDGER_MODES.has(item.ledger_mode)) errors.push(`item ledger_mode '${item.ledger_mode}' not allowed`);
    if (!item.ledger_hash) errors.push('ledger_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_ledger_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v411',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!real_release_hard_stop_phase_gate_ready) {
    return {
      schema_version: 'v411',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_HARD_STOP,
      errors: ['real_release_hard_stop_phase_gate must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      release_authorization_ledger_contract_id,
      real_release_hard_stop_phase_gate_id,
      ledger_requested_by,
      ledger_reason,
      ledger_mode,
      ledger_items: ledger_items.map(i => i.ledger_item_id),
      required_ledger_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v411',
    status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_READY,
    release_authorization_ledger_contract_id,
    real_release_hard_stop_phase_gate_id,
    ledger_requested_by,
    ledger_reason,
    ledger_mode,
    ledger_items_count: ledger_items.length,
    required_ledger_controls,
    hash,
    errors: [],
    final_message: 'Release authorization ledger contract READY. Ledger NOT created. Execution NOT authorized.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.RELEASE_AUTHORIZATION_LEDGER_READY) return false;
  if (result.release_authorization_ledger_created !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V411] Release Authorization Ledger Contract — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V411 Release Authorization Ledger Contract ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v411'}`,
  ];
  if (result.release_authorization_ledger_contract_id) {
    lines.push(`Contract ID: ${result.release_authorization_ledger_contract_id}`);
  }
  if (result.ledger_mode) lines.push(`Mode: ${result.ledger_mode}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) lines.push(`Errors: ${result.errors.join(', ')}`);
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  release_authorization_ledger_created: ${result.release_authorization_ledger_created}`);
  lines.push(`  manual_release_execution_authorized: ${result.manual_release_execution_authorized}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
