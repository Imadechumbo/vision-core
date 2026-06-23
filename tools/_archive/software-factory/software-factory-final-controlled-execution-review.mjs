import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_CONTROLLED_EXECUTION_REVIEW_BLOCKED_INPUT: 'FINAL_CONTROLLED_EXECUTION_REVIEW_BLOCKED_INPUT',
  FINAL_CONTROLLED_EXECUTION_REVIEW_BLOCKED_EVIDENCE: 'FINAL_CONTROLLED_EXECUTION_REVIEW_BLOCKED_EVIDENCE',
  FINAL_CONTROLLED_EXECUTION_REVIEW_FAIL: 'FINAL_CONTROLLED_EXECUTION_REVIEW_FAIL',
  FINAL_CONTROLLED_EXECUTION_REVIEW_READY: 'FINAL_CONTROLLED_EXECUTION_REVIEW_READY',
};

const REQUIRED_CONTROLS = [
  'final-controlled-execution-review-required',
  'execution-lock-evidence-required',
  'metadata-only-review',
  'controlled-execution-not-granted',
  'controlled-execution-not-unlocked',
  'real-release-not-executed',
  'real-release-command-not-armed',
  'explicit-human-go-not-granted',
  'final-command-authority-not-granted',
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
];

const ALLOWED_CONTROLLED_REVIEW_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_CONTROLLED_REVIEW_TYPES = [
  'final_release_controlled_execution_review',
  'final_deploy_controlled_execution_review',
  'final_tag_controlled_execution_review',
  'final_stable_controlled_execution_review',
  'final_artifact_controlled_execution_review',
  'final_production_controlled_execution_review',
  'final_billing_controlled_execution_review',
  'final_secret_controlled_execution_review',
  'final_network_controlled_execution_review',
  'final_rollback_controlled_execution_review',
  'operator_controlled_execution_review',
  'emergency_stop_controlled_execution_review',
];

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
    real_release_command_arming_barrier_passed: false,
    real_release_command_armed: false,
    final_command_arming_granted: false,
    real_release_execution_allowed: false,
    real_release_hard_stop_lifted: false,
    explicit_human_go_granted: false,
    final_command_authority_granted: false,
    final_release_command_authority_phase_passed: false,
    final_release_command_authority_created: false,
    explicit_human_go_seal_bound: false,
    explicit_human_go_seal_verified: false,
    human_go_evidence_receipt_published: false,
    final_command_authority_reviewed: false,
    manual_release_approval_capsule_phase_passed: false,
    manual_release_execution_approved: false,
    release_authorization_ledger_phase_passed: false,
    manual_release_execution_authorized: false,
    final_manual_go_command_created: false,
    release_command_arming_bound: false,
    release_command_arming_verified: false,
    command_arming_evidence_receipt_published: false,
    final_command_arming_reviewed: false,
    real_release_command_seal_created: false,
    final_noop_execution_bound: false,
    final_noop_execution_verified: false,
    noop_execution_evidence_receipt_published: false,
    final_noop_execution_reviewed: false,
    final_noop_execution_granted: false,
    final_noop_execution_gate_passed: false,
    real_release_noop_executed: false,
    final_human_release_command_created: false,
    controlled_execution_lock_bound: false,
    controlled_execution_lock_verified: false,
    execution_lock_evidence_receipt_published: false,
    final_controlled_execution_reviewed: false,
    final_controlled_execution_granted: false,
    controlled_execution_lock_phase_passed: false,
    controlled_real_release_execution_unlocked: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v439',
      status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_controlled_execution_review_id,
    execution_lock_evidence_receipt_id,
    execution_lock_evidence_receipt_ready,
    controlled_review_actor,
    controlled_review_reason,
    controlled_review_mode,
    controlled_review_items,
    required_controlled_review_controls,
  } = input;

  const errors = [];

  if (!final_controlled_execution_review_id || typeof final_controlled_execution_review_id !== 'string') {
    errors.push('final_controlled_execution_review_id required (string)');
  }
  if (!execution_lock_evidence_receipt_id || typeof execution_lock_evidence_receipt_id !== 'string') {
    errors.push('execution_lock_evidence_receipt_id required (string)');
  }
  if (typeof execution_lock_evidence_receipt_ready !== 'boolean') {
    errors.push('execution_lock_evidence_receipt_ready required (boolean)');
  }
  if (!controlled_review_actor || typeof controlled_review_actor !== 'string') {
    errors.push('controlled_review_actor required (string)');
  }
  if (!controlled_review_reason || typeof controlled_review_reason !== 'string') {
    errors.push('controlled_review_reason required (string)');
  }
  if (!controlled_review_mode || typeof controlled_review_mode !== 'string') {
    errors.push('controlled_review_mode required (string)');
  }
  if (!Array.isArray(controlled_review_items)) {
    errors.push('controlled_review_items required (array)');
  }
  if (!Array.isArray(required_controlled_review_controls)) {
    errors.push('required_controlled_review_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v439',
      status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_CONTROLLED_REVIEW_MODES.includes(controlled_review_mode)) {
    return {
      schema_version: 'v439',
      status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_FAIL,
      errors: [`invalid controlled_review_mode: ${controlled_review_mode}`],
      ...invariants(),
    };
  }

  for (const item of controlled_review_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v439',
        status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_FAIL,
        errors: ['each controlled_review_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_CONTROLLED_REVIEW_TYPES.includes(item.controlled_review_type)) {
      return {
        schema_version: 'v439',
        status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_FAIL,
        errors: [`invalid controlled_review_type: ${item.controlled_review_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_controlled_review_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v439',
      status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_FAIL,
      errors: [`missing required_controlled_review_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!execution_lock_evidence_receipt_ready) {
    return {
      schema_version: 'v439',
      status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_BLOCKED_EVIDENCE,
      errors: ['execution_lock_evidence_receipt_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v439',
      final_controlled_execution_review_id,
      execution_lock_evidence_receipt_id,
      controlled_review_actor,
      controlled_review_reason,
      controlled_review_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v439',
    status: STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_READY,
    hash,
    errors: [],
    final_controlled_execution_review_id,
    execution_lock_evidence_receipt_id,
    controlled_review_actor,
    controlled_review_reason,
    controlled_review_mode,
    controlled_review_items_count: controlled_review_items.length,
    final_message: 'V439 final controlled execution review recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_CONTROLLED_EXECUTION_REVIEW_READY) return false;
  if (result.final_controlled_execution_reviewed !== false) return false;
  if (result.final_controlled_execution_granted !== false) return false;
  if (result.controlled_real_release_execution_unlocked !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.final_human_release_command_created !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V439] Final Controlled Execution Review — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V439] Final Controlled Execution Review',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_controlled_execution_review_id) {
    lines.push(`Review ID: ${result.final_controlled_execution_review_id}`);
  }
  if (result.controlled_review_mode) {
    lines.push(`Review Mode: ${result.controlled_review_mode}`);
  }
  if (result.controlled_review_actor) {
    lines.push(`Review Actor: ${result.controlled_review_actor}`);
  }
  lines.push(`final_controlled_execution_reviewed: ${result.final_controlled_execution_reviewed}`);
  lines.push(`final_controlled_execution_granted: ${result.final_controlled_execution_granted}`);
  lines.push(`controlled_real_release_execution_unlocked: ${result.controlled_real_release_execution_unlocked}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`final_human_release_command_created: ${result.final_human_release_command_created}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}