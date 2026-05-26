import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-revalidation-evidence-receipt';
const MODULE_VERSION = 'V453';

// STATUSES
export const STATUSES = {
  REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INTEGRITY: 'REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INTEGRITY',
  REVALIDATION_EVIDENCE_RECEIPT_FAIL: 'REVALIDATION_EVIDENCE_RECEIPT_FAIL',
  REVALIDATION_EVIDENCE_RECEIPT_READY: 'REVALIDATION_EVIDENCE_RECEIPT_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'revalidation_evidence_receipt_id',
  'post_barrier_integrity_binder_id',
  'post_barrier_integrity_binder_ready',
  'revalidation_evidence_items',
  'required_revalidation_evidence_controls',
  'revalidation_evidence_level',
];

const ALLOWED_REVALIDATION_EVIDENCE_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_REVALIDATION_EVIDENCE_TYPES = [
  'release_revalidation_evidence',
  'deploy_revalidation_evidence',
  'tag_revalidation_evidence',
  'stable_revalidation_evidence',
  'artifact_revalidation_evidence',
  'production_revalidation_evidence',
  'billing_revalidation_evidence',
  'secret_revalidation_evidence',
  'network_revalidation_evidence',
  'rollback_revalidation_evidence',
  'operator_revalidation_evidence',
  'emergency_stop_revalidation_evidence',
];

const REQUIRED_CONTROLS = [
  'revalidation-evidence-receipt-required',
  'post-barrier-integrity-required',
  'metadata-only-evidence',
  'revalidation-evidence-not-published',
  'post-barrier-integrity-not-verified',
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
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
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
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    revalidation_evidence_receipt_id,
    post_barrier_integrity_binder_id,
    post_barrier_integrity_binder_ready,
    revalidation_evidence_items,
    required_revalidation_evidence_controls,
    revalidation_evidence_level,
  } = input;

  // Validate post_barrier_integrity_binder_ready is boolean
  if (typeof post_barrier_integrity_binder_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INVALID_POST_BARRIER_INTEGRITY_BINDER_READY'],
      hash: null,
    };
  }

  // If V452 is not ready, block
  if (post_barrier_integrity_binder_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INTEGRITY,
      errors: ['POST_BARRIER_INTEGRITY_BINDER_NOT_READY'],
      hash: null,
    };
  }

  // Validate revalidation_evidence_items is an array
  if (!Array.isArray(revalidation_evidence_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['REVALIDATION_EVIDENCE_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each evidence item
  for (const item of revalidation_evidence_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_REVALIDATION_EVIDENCE_ITEM_TYPE');
      continue;
    }

    const { revalidation_evidence_item_id, revalidation_evidence_type, revalidation_evidence_mode, revalidation_evidence_hash } = item;

    if (typeof revalidation_evidence_item_id !== 'string' || revalidation_evidence_item_id.trim().length === 0) {
      errors.push('INVALID_REVALIDATION_EVIDENCE_ITEM_ID');
    }

    if (typeof revalidation_evidence_type !== 'string' || !ALLOWED_REVALIDATION_EVIDENCE_TYPES.includes(revalidation_evidence_type)) {
      errors.push('INVALID_REVALIDATION_EVIDENCE_TYPE');
    }

    if (typeof revalidation_evidence_mode !== 'string' || !ALLOWED_REVALIDATION_EVIDENCE_MODES.includes(revalidation_evidence_mode)) {
      errors.push('INVALID_ITEM_REVALIDATION_EVIDENCE_MODE');
    }

    if (typeof revalidation_evidence_hash !== 'string' || revalidation_evidence_hash.trim().length === 0) {
      errors.push('INVALID_REVALIDATION_EVIDENCE_HASH');
    }
  }

  // Validate required_revalidation_evidence_controls is an array
  if (!Array.isArray(required_revalidation_evidence_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['REQUIRED_REVALIDATION_EVIDENCE_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_revalidation_evidence_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    revalidation_evidence_receipt_id,
    post_barrier_integrity_binder_id,
    post_barrier_integrity_binder_ready,
    revalidation_evidence_items,
    required_revalidation_evidence_controls,
    revalidation_evidence_level,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare revalidation_evidence_items_verified array
  const revalidationEvidenceItemsVerified = revalidation_evidence_items.map(item => ({
    id: item.revalidation_evidence_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.REVALIDATION_EVIDENCE_RECEIPT_READY,
    errors: [],
    hash,
    revalidation_evidence_items_verified: revalidationEvidenceItemsVerified,
    final_message: finalMessage,
    revalidation_evidence_receipt_published: false,
    post_barrier_integrity_verified: false,
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
    final_integrity_granted: false,
    final_integrity_reviewed: false,
    release_readiness_revalidation_phase_passed: false,
    release_readiness_revalidated: false,
    post_barrier_integrity_bound: false,
    final_integrity_reviewed: false,
    hard_stop_lifted: false,
    release_command_armed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.REVALIDATION_EVIDENCE_RECEIPT_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.') {
    return false;
  }
  // Check revalidation_evidence_items_verified has same length as input
  if (!Array.isArray(result.revalidation_evidence_items_verified) || result.revalidation_evidence_items_verified.length !== input.revalidation_evidence_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'revalidation_evidence_receipt_published',
    'post_barrier_integrity_verified',
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
    'final_integrity_granted',
    'final_integrity_reviewed',
    'release_readiness_revalidation_phase_passed',
    'release_readiness_revalidated',
    'post_barrier_integrity_bound',
    'final_integrity_reviewed',
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
  if (status === STATUSES.REVALIDATION_EVIDENCE_RECEIPT_READY) {
    output.revalidation_evidence_items_verified = data.revalidation_evidence_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}