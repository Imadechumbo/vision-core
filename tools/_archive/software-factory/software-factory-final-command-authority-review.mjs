import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT: 'FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT',
  FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_EVIDENCE: 'FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_EVIDENCE',
  FINAL_COMMAND_AUTHORITY_REVIEW_FAIL: 'FINAL_COMMAND_AUTHORITY_REVIEW_FAIL',
  FINAL_COMMAND_AUTHORITY_REVIEW_READY: 'FINAL_COMMAND_AUTHORITY_REVIEW_READY',
};

const REQUIRED_CONTROLS = [
  'final-command-authority-review-required',
  'human-go-evidence-required',
  'metadata-only-review',
  'authority-review-not-granted',
  'explicit-human-go-not-granted',
  'final-command-authority-not-granted',
  'manual-release-not-approved',
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
  'final_release_command_authority_review',
  'final_deploy_command_authority_review',
  'final_tag_command_authority_review',
  'final_stable_command_authority_review',
  'final_artifact_command_authority_review',
  'final_production_command_authority_review',
  'final_billing_command_authority_review',
  'final_secret_command_authority_review',
  'final_network_command_authority_review',
  'final_rollback_command_authority_review',
  'operator_command_authority_review',
  'emergency_stop_command_authority_review',
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
    manual_release_approval_capsule_phase_passed: false,
    manual_release_execution_approved: false,
    release_authorization_ledger_phase_passed: false,
    manual_release_execution_authorized: false,
    real_release_hard_stop_lifted: false,
    real_release_execution_allowed: false,
    final_release_command_authority_created: false,
    explicit_human_go_seal_bound: false,
    explicit_human_go_seal_verified: false,
    human_go_evidence_receipt_published: false,
    final_command_authority_reviewed: false,
    final_command_authority_granted: false,
    final_release_command_authority_phase_passed: false,
    explicit_human_go_granted: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v424',
      status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_command_authority_review_id,
    human_go_evidence_receipt_id,
    human_go_evidence_receipt_ready,
    authority_review_actor,
    authority_review_reason,
    authority_review_mode,
    authority_review_items,
    required_authority_review_controls,
  } = input;

  const errors = [];

  if (!final_command_authority_review_id || typeof final_command_authority_review_id !== 'string') {
    errors.push('final_command_authority_review_id required (string)');
  }
  if (!human_go_evidence_receipt_id || typeof human_go_evidence_receipt_id !== 'string') {
    errors.push('human_go_evidence_receipt_id required (string)');
  }
  if (typeof human_go_evidence_receipt_ready !== 'boolean') {
    errors.push('human_go_evidence_receipt_ready required (boolean)');
  }
  if (!authority_review_actor || typeof authority_review_actor !== 'string') {
    errors.push('authority_review_actor required (string)');
  }
  if (!authority_review_reason || typeof authority_review_reason !== 'string') {
    errors.push('authority_review_reason required (string)');
  }
  if (!authority_review_mode || typeof authority_review_mode !== 'string') {
    errors.push('authority_review_mode required (string)');
  }
  if (!Array.isArray(authority_review_items)) {
    errors.push('authority_review_items required (array)');
  }
  if (!Array.isArray(required_authority_review_controls)) {
    errors.push('required_authority_review_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v424',
      status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_REVIEW_MODES.includes(authority_review_mode)) {
    return {
      schema_version: 'v424',
      status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL,
      errors: [`invalid authority_review_mode: ${authority_review_mode}`],
      ...invariants(),
    };
  }

  for (const item of authority_review_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v424',
        status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL,
        errors: ['each authority_review_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_REVIEW_TYPES.includes(item.authority_review_type)) {
      return {
        schema_version: 'v424',
        status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL,
        errors: [`invalid authority_review_type: ${item.authority_review_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_authority_review_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v424',
      status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL,
      errors: [`missing required_authority_review_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!human_go_evidence_receipt_ready) {
    return {
      schema_version: 'v424',
      status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_EVIDENCE,
      errors: ['human_go_evidence_receipt_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v424',
      final_command_authority_review_id,
      human_go_evidence_receipt_id,
      authority_review_actor,
      authority_review_reason,
      authority_review_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v424',
    status: STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_READY,
    hash,
    errors: [],
    final_command_authority_review_id,
    human_go_evidence_receipt_id,
    authority_review_actor,
    authority_review_reason,
    authority_review_mode,
    authority_review_items_count: authority_review_items.length,
    final_message: 'V424 final command authority review recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_READY) return false;
  if (result.final_command_authority_reviewed !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V424] Final Command Authority Review — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V424] Final Command Authority Review',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_command_authority_review_id) {
    lines.push(`Review ID: ${result.final_command_authority_review_id}`);
  }
  if (result.authority_review_mode) {
    lines.push(`Review Mode: ${result.authority_review_mode}`);
  }
  if (result.authority_review_actor) {
    lines.push(`Review Actor: ${result.authority_review_actor}`);
  }
  lines.push(`final_command_authority_reviewed: ${result.final_command_authority_reviewed}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
