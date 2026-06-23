import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_COMMAND_ARMING_REVIEW_BLOCKED_INPUT: 'FINAL_COMMAND_ARMING_REVIEW_BLOCKED_INPUT',
  FINAL_COMMAND_ARMING_REVIEW_BLOCKED_EVIDENCE: 'FINAL_COMMAND_ARMING_REVIEW_BLOCKED_EVIDENCE',
  FINAL_COMMAND_ARMING_REVIEW_FAIL: 'FINAL_COMMAND_ARMING_REVIEW_FAIL',
  FINAL_COMMAND_ARMING_REVIEW_READY: 'FINAL_COMMAND_ARMING_REVIEW_READY',
};

const REQUIRED_CONTROLS = [
  'final-command-arming-review-required',
  'command-arming-evidence-required',
  'metadata-only-review',
  'command-arming-not-granted',
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

const ALLOWED_REVIEW_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_REVIEW_TYPES = [
  'final_release_command_arming_review',
  'final_deploy_command_arming_review',
  'final_tag_command_arming_review',
  'final_stable_command_arming_review',
  'final_artifact_command_arming_review',
  'final_production_command_arming_review',
  'final_billing_command_arming_review',
  'final_secret_command_arming_review',
  'final_network_command_arming_review',
  'final_rollback_command_arming_review',
  'operator_command_arming_review',
  'emergency_stop_command_arming_review',
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
    final_release_command_authority_phase_passed: false,
    explicit_human_go_granted: false,
    final_command_authority_granted: false,
    real_release_hard_stop_lifted: false,
    real_release_execution_allowed: false,
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
    final_command_arming_granted: false,
    real_release_command_arming_barrier_passed: false,
    real_release_command_armed: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v429',
      status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_command_arming_review_id,
    command_arming_evidence_receipt_id,
    command_arming_evidence_receipt_ready,
    arming_review_actor,
    arming_review_reason,
    arming_review_mode,
    arming_review_items,
    required_arming_review_controls,
  } = input;

  const errors = [];

  if (!final_command_arming_review_id || typeof final_command_arming_review_id !== 'string') {
    errors.push('final_command_arming_review_id required (string)');
  }
  if (!command_arming_evidence_receipt_id || typeof command_arming_evidence_receipt_id !== 'string') {
    errors.push('command_arming_evidence_receipt_id required (string)');
  }
  if (typeof command_arming_evidence_receipt_ready !== 'boolean') {
    errors.push('command_arming_evidence_receipt_ready required (boolean)');
  }
  if (!arming_review_actor || typeof arming_review_actor !== 'string') {
    errors.push('arming_review_actor required (string)');
  }
  if (!arming_review_reason || typeof arming_review_reason !== 'string') {
    errors.push('arming_review_reason required (string)');
  }
  if (!arming_review_mode || typeof arming_review_mode !== 'string') {
    errors.push('arming_review_mode required (string)');
  }
  if (!Array.isArray(arming_review_items)) {
    errors.push('arming_review_items required (array)');
  }
  if (!Array.isArray(required_arming_review_controls)) {
    errors.push('required_arming_review_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v429',
      status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_REVIEW_MODES.includes(arming_review_mode)) {
    return {
      schema_version: 'v429',
      status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_FAIL,
      errors: [`invalid arming_review_mode: ${arming_review_mode}`],
      ...invariants(),
    };
  }

  for (const item of arming_review_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v429',
        status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_FAIL,
        errors: ['each arming_review_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_REVIEW_TYPES.includes(item.arming_review_type)) {
      return {
        schema_version: 'v429',
        status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_FAIL,
        errors: [`invalid arming_review_type: ${item.arming_review_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_arming_review_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v429',
      status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_FAIL,
      errors: [`missing required_arming_review_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!command_arming_evidence_receipt_ready) {
    return {
      schema_version: 'v429',
      status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_BLOCKED_EVIDENCE,
      errors: ['command_arming_evidence_receipt_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v429',
      final_command_arming_review_id,
      command_arming_evidence_receipt_id,
      arming_review_actor,
      arming_review_reason,
      arming_review_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v429',
    status: STATUSES.FINAL_COMMAND_ARMING_REVIEW_READY,
    hash,
    errors: [],
    final_command_arming_review_id,
    command_arming_evidence_receipt_id,
    arming_review_actor,
    arming_review_reason,
    arming_review_mode,
    arming_review_items_count: arming_review_items.length,
    final_message: 'V429 final command arming review recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_COMMAND_ARMING_REVIEW_READY) return false;
  if (result.final_command_arming_reviewed !== false) return false;
  if (result.final_command_arming_granted !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V429] Final Command Arming Review — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V429] Final Command Arming Review',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_command_arming_review_id) {
    lines.push(`Review ID: ${result.final_command_arming_review_id}`);
  }
  if (result.arming_review_mode) {
    lines.push(`Review Mode: ${result.arming_review_mode}`);
  }
  if (result.arming_review_actor) {
    lines.push(`Review Actor: ${result.arming_review_actor}`);
  }
  lines.push(`final_command_arming_reviewed: ${result.final_command_arming_reviewed}`);
  lines.push(`final_command_arming_granted: ${result.final_command_arming_granted}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}