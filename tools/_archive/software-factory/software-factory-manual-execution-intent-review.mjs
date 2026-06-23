/**
 * V414 — Manual Execution Intent Review
 * Metadata-only. Intent NOT approved. Release NOT authorized.
 * manual_execution_intent_reviewed=false always.
 * manual_execution_intent_approved=false always.
 * manual_release_execution_authorized=false always.
 * real_release_execution_allowed=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT: 'MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT',
  MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_EVIDENCE: 'MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_EVIDENCE',
  MANUAL_EXECUTION_INTENT_REVIEW_FAIL: 'MANUAL_EXECUTION_INTENT_REVIEW_FAIL',
  MANUAL_EXECUTION_INTENT_REVIEW_READY: 'MANUAL_EXECUTION_INTENT_REVIEW_READY',
};

const ALLOWED_INTENT_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_INTENT_TYPES = new Set([
  'manual_release_intent', 'manual_deploy_intent', 'manual_tag_intent',
  'manual_stable_intent', 'manual_artifact_intent', 'manual_production_intent',
  'manual_billing_intent', 'manual_secret_intent', 'manual_network_intent',
  'manual_rollback_intent', 'manual_operator_intent', 'manual_emergency_stop_intent',
]);

const REQUIRED_CONTROLS = new Set([
  'manual-execution-intent-review-required',
  'authorization-evidence-ledger-required',
  'metadata-only-intent',
  'intent-not-approved',
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
      schema_version: 'v414',
      status: STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    manual_execution_intent_review_id,
    final_authorization_evidence_ledger_id,
    final_authorization_evidence_ledger_ready,
    intent_actor,
    intent_reason,
    intent_mode,
    intent_items,
    required_intent_controls,
  } = input;

  const errors = [];

  if (!manual_execution_intent_review_id) errors.push('manual_execution_intent_review_id required');
  if (!final_authorization_evidence_ledger_id) errors.push('final_authorization_evidence_ledger_id required');
  if (!intent_actor) errors.push('intent_actor required');
  if (!intent_reason) errors.push('intent_reason required');
  if (!intent_mode) errors.push('intent_mode required');
  if (!Array.isArray(intent_items) || intent_items.length === 0) errors.push('intent_items required');
  if (!Array.isArray(required_intent_controls) || required_intent_controls.length === 0) errors.push('required_intent_controls required');

  if (errors.length > 0) {
    return {
      schema_version: 'v414',
      status: STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_INTENT_MODES.has(intent_mode)) {
    errors.push(`intent_mode '${intent_mode}' not allowed`);
  }

  for (const item of intent_items) {
    if (!item.intent_item_id) errors.push('intent_item_id required');
    if (!item.intent_type) errors.push('intent_type required');
    else if (!ALLOWED_INTENT_TYPES.has(item.intent_type)) errors.push(`intent_type '${item.intent_type}' not allowed`);
    if (!item.intent_mode) errors.push('item intent_mode required');
    else if (!ALLOWED_INTENT_MODES.has(item.intent_mode)) errors.push(`item intent_mode '${item.intent_mode}' not allowed`);
    if (!item.intent_hash) errors.push('intent_hash required');
  }

  for (const ctrl of REQUIRED_CONTROLS) {
    if (!required_intent_controls.includes(ctrl)) errors.push(`required control missing: ${ctrl}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v414',
      status: STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_FAIL,
      errors,
      ...invariants(),
    };
  }

  if (!final_authorization_evidence_ledger_ready) {
    return {
      schema_version: 'v414',
      status: STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_EVIDENCE,
      errors: ['final_authorization_evidence_ledger must be READY'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      manual_execution_intent_review_id,
      final_authorization_evidence_ledger_id,
      intent_actor,
      intent_reason,
      intent_mode,
      intent_items: intent_items.map(i => i.intent_item_id),
      required_intent_controls,
    }))
    .digest('hex');

  return {
    schema_version: 'v414',
    status: STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_READY,
    manual_execution_intent_review_id,
    final_authorization_evidence_ledger_id,
    intent_actor,
    intent_reason,
    intent_mode,
    intent_items_count: intent_items.length,
    required_intent_controls,
    hash,
    errors: [],
    final_message: 'Manual execution intent review READY. Intent NOT approved. Execution NOT authorized.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_READY) return false;
  if (result.manual_execution_intent_reviewed !== false) return false;
  if (result.manual_execution_intent_approved !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V414] Manual Execution Intent Review — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '=== V414 Manual Execution Intent Review ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v414'}`,
  ];
  if (result.manual_execution_intent_review_id) lines.push(`Review ID: ${result.manual_execution_intent_review_id}`);
  if (result.intent_actor) lines.push(`Actor: ${result.intent_actor}`);
  if (result.intent_mode) lines.push(`Mode: ${result.intent_mode}`);
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) lines.push(`Errors: ${result.errors.join(', ')}`);
  if (result.final_message) lines.push(`Message: ${result.final_message}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  manual_execution_intent_reviewed: ${result.manual_execution_intent_reviewed}`);
  lines.push(`  manual_execution_intent_approved: ${result.manual_execution_intent_approved}`);
  lines.push(`  manual_release_execution_authorized: ${result.manual_release_execution_authorized}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
