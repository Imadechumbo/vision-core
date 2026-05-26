import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-integrity-review-gate';
const MODULE_VERSION = 'V454';

// STATUSES
export const STATUSES = {
  FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT: 'FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT',
  FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_EVIDENCE: 'FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_EVIDENCE',
  FINAL_INTEGRITY_REVIEW_GATE_FAIL: 'FINAL_INTEGRITY_REVIEW_GATE_FAIL',
  FINAL_INTEGRITY_REVIEW_GATE_READY: 'FINAL_INTEGRITY_REVIEW_GATE_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'final_integrity_review_gate_id',
  'revalidation_evidence_receipt_id',
  'revalidation_evidence_receipt_ready',
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
  'final_release_integrity_review',
  'final_deploy_integrity_review',
  'final_tag_integrity_review',
  'final_stable_integrity_review',
  'final_artifact_integrity_review',
  'final_production_integrity_review',
  'final_billing_integrity_review',
  'final_secret_integrity_review',
  'final_network_integrity_review',
  'final_rollback_integrity_review',
  'operator_integrity_review',
  'emergency_stop_integrity_review',
];

const REQUIRED_CONTROLS = [
  'final-integrity-review-required',
  'revalidation-evidence-required',
  'metadata-only-review',
  'final-integrity-not-reviewed',
  'final-integrity-not-granted',
  'post-barrier-execution-not-authorized',
  'final-real-execution-barrier-not-lifted',
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
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_integrity_review_gate_id,
    revalidation_evidence_receipt_id,
    revalidation_evidence_receipt_ready,
    integrity_review_actor,
    integrity_review_reason,
    integrity_review_mode,
    integrity_review_items,
    required_integrity_review_controls,
  } = input;

  // Validate revalidation_evidence_receipt_ready is boolean
  if (typeof revalidation_evidence_receipt_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT,
      errors: ['INVALID_REVALIDATION_EVIDENCE_RECEIPT_READY'],
      hash: null,
    };
  }

  // If V453 is not ready, block
  if (revalidation_evidence_receipt_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_EVIDENCE,
      errors: ['REVALIDATION_EVIDENCE_RECEIPT_NOT_READY'],
      hash: null,
    };
  }

  // Validate integrity_review_mode
  if (typeof integrity_review_mode !== 'string' || !ALLOWED_INTEGRITY_REVIEW_MODES.includes(integrity_review_mode)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT,
      errors: ['INVALID_INTEGRITY_REVIEW_MODE'],
      hash: null,
    };
  }

  // Validate integrity_review_items is an array
  if (!Array.isArray(integrity_review_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_integrity_review_gate_id,
    revalidation_evidence_receipt_id,
    revalidation_evidence_receipt_ready,
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
  const finalMessage = 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_INTEGRITY_REVIEW_GATE_READY,
    errors: [],
    hash,
    integrity_review_items_verified: integrityReviewItemsVerified,
    final_message: finalMessage,
    final_integrity_reviewed: false,
    final_integrity_granted: false,
    post_barrier_execution_authorized: false,
    final_real_execution_barrier_lifted: false,
    controlled_release_execution_unlocked: false,
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
  if (result.status !== STATUSES.FINAL_INTEGRITY_REVIEW_GATE_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.') {
    return false;
  }
  // Check integrity_review_items_verified has same length as input
  if (!Array.isArray(result.integrity_review_items_verified) || result.integrity_review_items_verified.length !== input.integrity_review_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'final_integrity_reviewed',
    'final_integrity_granted',
    'post_barrier_execution_authorized',
    'final_real_execution_barrier_lifted',
    'controlled_release_execution_unlocked',
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
  if (status === STATUSES.FINAL_INTEGRITY_REVIEW_GATE_READY) {
    output.integrity_review_items_verified = data.integrity_review_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}