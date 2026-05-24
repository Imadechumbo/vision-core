/**
 * V413 — Final Authorization Evidence Ledger
 * Metadata-only. Evidence ledger NOT published.
 * final_authorization_evidence_ledger_published=false always.
 * manual_release_execution_authorized=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT: 'FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT',
  FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_SEAL: 'FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_SEAL',
  FINAL_AUTHORIZATION_EVIDENCE_LEDGER_FAIL: 'FINAL_AUTHORIZATION_EVIDENCE_LEDGER_FAIL',
  FINAL_AUTHORIZATION_EVIDENCE_LEDGER_READY: 'FINAL_AUTHORIZATION_EVIDENCE_LEDGER_READY',
};

const ALLOWED_EVIDENCE_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_EVIDENCE_TYPES = new Set([
  'release_authorization_evidence', 'deploy_authorization_evidence',
  'tag_authorization_evidence', 'stable_authorization_evidence',
  'artifact_authorization_evidence', 'production_authorization_evidence',
  'billing_authorization_evidence', 'secret_authorization_evidence',
  'network_authorization_evidence', 'rollback_authorization_evidence',
  'operator_authorization_evidence', 'manual_seal_evidence', 'emergency_stop_evidence',
]);

const REQUIRED_CONTROLS = new Set([
  'final-authorization-evidence-ledger-required',
  'manual-command-seal-required',
  'metadata-only-evidence',
  'evidence-ledger-not-published',
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
      schema_version: 'v413',
      status: STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_authorization_evidence_ledger_id,
    manual_command_seal_binder_id,
    manual_command_seal_binder_ready,
    evidence_ledger_items,
    required_evidence_ledger_controls,
    evidence_ledger_level,
  } = input;

  const errors = [];

  if (!final_authorization_evidence_ledger_id) errors.push('final_authorization_evidence_ledger_id required');
  if (!manual_command_seal_binder_id) errors.push('manual_command_seal_binder_id required');
  if (!evidence_ledger_level) errors.push('evidence_ledger_level required');
  if (!Array.isArray(evidence_ledger_items) || evidence_ledger_items.length === 0) errors.push('evidence_ledger_items required');
  if (!Array.isArray(required_evidence_ledger_controls) || required_evidence_ledger_controls.length === 0) errors.push('required_evidence_ledger_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v413',
      status: STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  for (const item of evidence_ledger_items) {
    if (!item.evidence_item_id) errors.push('evidence_item_id required');
    if (!item.evidence_type) errors.push('evidence_type required');
    else if (!ALLOWED_EVIDENCE_TYPES.has(item.evidence_type)) errors.push(`evidence_type '${item.evidence_type}' not allowed`);
    if (!item.evidence_mode) errors.push('evidence_mode required');
    else if (!ALLOWED_EVIDENCE_MODES.has(item.evidence_mode)) errors.push(`evidence_mode '${item.evidence_mode}' not allowed`);
    if (!item.evidence_hash) errors.push('evidence_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_evidence_ledger_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v413',
      status: STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!manual_command_seal_binder_ready) {
    return {
      schema_version: 'v413',
      status: STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_SEAL,
      errors: ['manual_command_seal_binder must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      final_authorization_evidence_ledger_id,
      manual_command_seal_binder_id,
      evidence_ledger_level,
      evidence_ledger_items: evidence_ledger_items.map(i => i.evidence_item_id),
      required_evidence_ledger_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v413',
    status: STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_READY,
    final_authorization_evidence_ledger_id,
    manual_command_seal_binder_id,
    evidence_ledger_level,
    evidence_ledger_items_count: evidence_ledger_items.length,
    required_evidence_ledger_controls,
    hash,
    errors: [],
    final_message: 'Final authorization evidence ledger READY. Ledger NOT published. Execution NOT authorized.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_READY) return false;
  if (result.final_authorization_evidence_ledger_published !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V413] Final Authorization Evidence Ledger — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V413 Final Authorization Evidence Ledger ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v413'}`,
  ];
  if (result.final_authorization_evidence_ledger_id) lines.push(`Ledger ID: ${result.final_authorization_evidence_ledger_id}`);
  if (result.evidence_ledger_level) lines.push(`Level: ${result.evidence_ledger_level}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) lines.push(`Errors: ${result.errors.join(', ')}`);
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  final_authorization_evidence_ledger_published: ${result.final_authorization_evidence_ledger_published}`);
  lines.push(`  manual_release_execution_authorized: ${result.manual_release_execution_authorized}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  manual_command_seal_verified: ${result.manual_command_seal_verified}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
