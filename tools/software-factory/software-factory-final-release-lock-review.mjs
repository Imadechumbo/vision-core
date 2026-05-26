import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-release-lock-review';
const MODULE_VERSION = 'V459';

// STATUSES
export const STATUSES = {
  FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT: 'FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT',
  FINAL_RELEASE_LOCK_REVIEW_BLOCKED_EVIDENCE: 'FINAL_RELEASE_LOCK_REVIEW_BLOCKED_EVIDENCE',
  FINAL_RELEASE_LOCK_REVIEW_FAIL: 'FINAL_RELEASE_LOCK_REVIEW_FAIL',
  FINAL_RELEASE_LOCK_REVIEW_READY: 'FINAL_RELEASE_LOCK_REVIEW_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'final_release_lock_review_id',
  'execution_hold_evidence_receipt_id',
  'execution_hold_evidence_receipt_ready',
  'integrity_review_actor',
  'integrity_review_reason',
  'integrity_review_mode',
  'integrity_review_items',
  'required_integrity_review_controls',
];

const ALLOWED_INTEGRITY_REVIEW_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_INTEGRITY_REVIEW_TYPES = [
  'release_final_lock_review',
  'deploy_final_lock_review',
  'tag_final_lock_review',
  'stable_final_lock_review',
  'artifact_final_lock_review',
  'production_final_lock_review',
  'billing_final_lock_review',
  'secret_final_lock_review',
  'network_final_lock_review',
  'rollback_final_lock_review',
  'operator_final_lock_review',
  'emergency_stop_final_lock_review',
];

const REQUIRED_CONTROLS = [
  'final-release-lock-review-required',
  'execution-hold-evidence-required',
  'metadata-only-review',
  'final-release-lock-not-reviewed',
  'final-release-lock-not-granted',
  'final-release-execution-not-unlocked',
  'final-real-execution-barrier-not-lifted',
  'post-barrier-execution-not-authorized',
  'controlled-release-not-unlocked',
  'real-release-not-executed',
  'real-release-command-not-armed',
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

// Build function
export function build(input) {
  const errors = [];

  // Check for null or undefined input
  if (input === null || input === undefined) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT,
      errors: ['INPUT_IS_NOT_AN_OBJECT'],
      hash: null,
    };
  }

  // Check all required fields are present
  for (const field of REQUIRED_FIELDS) {
    if (!input.hasOwnProperty(field)) {
      errors.push(`MISSING_REQUIRED_FIELD: ${field}`);
    }
  }

  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_release_lock_review_id,
    execution_hold_evidence_receipt_id,
    execution_hold_evidence_receipt_ready,
    integrity_review_actor,
    integrity_review_reason,
    integrity_review_mode,
    integrity_review_items,
    required_integrity_review_controls,
  } = input;

  // Validate execution_hold_evidence_receipt_ready is boolean
  if (typeof execution_hold_evidence_receipt_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT,
      errors: ['INVALID_EXECUTION_HOLD_EVIDENCE_RECEIPT_READY'],
      hash: null,
    };
  }

  // If V458 is not ready, block
  if (execution_hold_evidence_receipt_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_EVIDENCE,
      errors: ['EXECUTION_HOLD_EVIDENCE_RECEIPT_NOT_READY'],
      hash: null,
    };
  }

  // Validate integrity_review_mode
  if (typeof integrity_review_mode !== 'string' || !ALLOWED_INTEGRITY_REVIEW_MODES.includes(integrity_review_mode)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT,
      errors: ['INVALID_INTEGRITY_REVIEW_MODE'],
      hash: null,
    };
  }

  // Validate integrity_review_items is an array
  if (!Array.isArray(integrity_review_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT,
      errors: ['INTEGRITY_REVIEW_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each review item
  for (const item of integrity_review_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_INTEGRITY_REVIEW_ITEM_TYPE');
      continue;
    }

    const { integrity_review_item_id, integrity_review_type, integrity_review_mode, integrity_review_hash } = item;

    if (typeof integrity_review_item_id !== 'string' || integrity_review_item_id.trim().length === 0) {
      errors.push('INVALID_INTEGRITY_REVIEW_ITEM_ID');
    }

    if (typeof integrity_review_type !== 'string' || !ALLOWED_INTEGRITY_REVIEW_TYPES.includes(integrity_review_type)) {
      errors.push('INVALID_INTEGRITY_REVIEW_TYPE');
    }

    if (typeof integrity_review_mode !== 'string' || !ALLOWED_INTEGRITY_REVIEW_MODES.includes(integrity_review_mode)) {
      errors.push('INVALID_ITEM_INTEGRITY_REVIEW_MODE');
    }

    if (typeof integrity_review_hash !== 'string' || integrity_review_hash.trim().length === 0) {
      errors.push('INVALID_INTEGRITY_REVIEW_HASH');
    }
  }

  // Validate required_integrity_review_controls is an array
  if (!Array.isArray(required_integrity_review_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_BLOCKED_INPUT,
      errors: ['REQUIRED_INTEGRITY_REVIEW_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_integrity_review_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_release_lock_review_id,
    execution_hold_evidence_receipt_id,
    execution_hold_evidence_receipt_ready,
    integrity_review_actor,
    integrity_review_reason,
    integrity_review_mode,
    integrity_review_items,
    required_integrity_review_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare integrity_review_items_verified array
  const integrityReviewItemsVerified = integrity_review_items.map(item => ({
    id: item.integrity_review_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V456-V460 post-revalidation execution hold and final release lock complete. Real release execution remains blocked until explicit V461 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_RELEASE_LOCK_REVIEW_READY,
    errors: [],
    hash,
    integrity_review_items_verified: integrityReviewItemsVerified,
    final_message: finalMessage,
    final_release_lock_reviewed: false,
    final_release_lock_granted: false,
    final_release_execution_unlocked: false,
    final_real_execution_barrier_lifted: false,
    real_release_execution_allowed: false,
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
    controlled_unlock_decision_phase_passed: false,
    final_execution_barrier_granted: false,
    release_readiness_revalidation_phase_passed: false,
    release_readiness_revalidated: false,
    post_barrier_integrity_bound: false,
    post_barrier_integrity_verified: false,
    revalidation_evidence_receipt_published: false,
    hard_stop_lifted: false,
    release_command_armed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.FINAL_RELEASE_LOCK_REVIEW_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V456-V460 post-revalidation execution hold and final release lock complete. Real release execution remains blocked until explicit V461 command.') {
    return false;
  }
  // Check integrity_review_items_verified has same length as input
  if (!Array.isArray(result.integrity_review_items_verified) || result.integrity_review_items_verified.length !== input.integrity_review_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'final_release_lock_reviewed',
    'final_release_lock_granted',
    'final_release_execution_unlocked',
    'final_real_execution_barrier_lifted',
    'real_release_execution_allowed',
    'real_release_executed',
    'real_deploy_executed',
    'real_tag_created',
    'real_stable_promoted',
    'artifact_published',
    'production_touched',
    'billing_executed',
    'secrets_accessed',
    'network_accessed',
    'rollback_executed',
    'controlled_unlock_decision_phase_passed',
    'final_execution_barrier_granted',
    'release_readiness_revalidation_phase_passed',
    'release_readiness_revalidated',
    'post_barrier_integrity_bound',
    'post_barrier_integrity_verified',
    'revalidation_evidence_receipt_published',
    'hard_stop_lifted',
    'release_command_armed',
  ];
  for (const flag of criticalFlags) {
    if (result[flag] !== false) {
      return false;
    }
  }
  return result.errors.length === 0;
}

// Render function
export function render(data) {
  const REGRA = 'SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  
  if (data === null || data === undefined) {
    return JSON.stringify({
      error: 'NO_DATA',
      message: 'Input is null or undefined',
      regra: REGRA,
    });
  }

  const status = data.status || 'UNKNOWN';
  
  // Prepare output object
  const output = {
    schema_version: data.schema_version || MODULE_VERSION,
    status: status,
    regra: REGRA,
  };

  // Include hash if available
  if (data.hash) {
    output.hash = data.hash;
  }

  // Include errors if any
  if (data.errors && data.errors.length > 0) {
    output.errors = data.errors;
  }

  // Include additional fields from READY state
  if (status === STATUSES.FINAL_RELEASE_LOCK_REVIEW_READY) {
    output.integrity_review_items_verified = data.integrity_review_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}
