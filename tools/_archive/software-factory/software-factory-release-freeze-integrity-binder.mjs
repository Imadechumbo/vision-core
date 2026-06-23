import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-release-freeze-integrity-binder';
const MODULE_VERSION = 'V462';

// STATUSES
export const STATUSES = {
  RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT: 'RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT',
  RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_LOCK: 'RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_LOCK',
  RELEASE_FREEZE_INTEGRITY_BINDER_FAIL: 'RELEASE_FREEZE_INTEGRITY_BINDER_FAIL',
  RELEASE_FREEZE_INTEGRITY_BINDER_READY: 'RELEASE_FREEZE_INTEGRITY_BINDER_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'release_freeze_integrity_binder_id',
  'final_execution_lock_verification_id',
  'final_execution_lock_verification_ready',
  'freeze_integrity_requested_by',
  'freeze_integrity_reason',
  'freeze_integrity_mode',
  'freeze_integrity_items',
  'required_freeze_integrity_controls',
];

const ALLOWED_FREEZE_INTEGRITY_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_FREEZE_INTEGRITY_TYPES = [
  'release_freeze_integrity',
  'deploy_freeze_integrity',
  'tag_freeze_integrity',
  'stable_freeze_integrity',
  'artifact_freeze_integrity',
  'production_freeze_integrity',
  'billing_freeze_integrity',
  'secret_freeze_integrity',
  'network_freeze_integrity',
  'rollback_freeze_integrity',
  'operator_freeze_integrity',
  'emergency_stop_freeze_integrity',
];

const REQUIRED_CONTROLS = [
  'release-freeze-integrity-required',
  'final-execution-lock-verification-required',
  'metadata-only-freeze-integrity',
  'release-freeze-integrity-not-bound',
  'release-freeze-integrity-not-verified',
  'release-freeze-not-lifted',
  'release-execution-not-unfrozen',
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
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT,
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
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    release_freeze_integrity_binder_id,
    final_execution_lock_verification_id,
    final_execution_lock_verification_ready,
    freeze_integrity_requested_by,
    freeze_integrity_reason,
    freeze_integrity_mode,
    freeze_integrity_items,
    required_freeze_integrity_controls,
  } = input;

  // Validate final_execution_lock_verification_ready is boolean
  if (typeof final_execution_lock_verification_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['INVALID_FINAL_EXECUTION_LOCK_VERIFICATION_READY'],
      hash: null,
    };
  }

  // If V461 is not ready, block
  if (final_execution_lock_verification_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_LOCK,
      errors: ['FINAL_EXECUTION_LOCK_VERIFICATION_NOT_READY'],
      hash: null,
    };
  }

  // Validate freeze_integrity_mode
  if (typeof freeze_integrity_mode !== 'string' || !ALLOWED_FREEZE_INTEGRITY_MODES.includes(freeze_integrity_mode)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['INVALID_FREEZE_INTEGRITY_MODE'],
      hash: null,
    };
  }

  // Validate freeze_integrity_items is an array
  if (!Array.isArray(freeze_integrity_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['FREEZE_INTEGRITY_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each freeze integrity item
  for (const item of freeze_integrity_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_FREEZE_INTEGRITY_ITEM_TYPE');
      continue;
    }

    const { freeze_integrity_item_id, freeze_integrity_type, freeze_integrity_mode, freeze_integrity_hash } = item;

    if (typeof freeze_integrity_item_id !== 'string' || freeze_integrity_item_id.trim().length === 0) {
      errors.push('INVALID_FREEZE_INTEGRITY_ITEM_ID');
    }

    if (typeof freeze_integrity_type !== 'string' || !ALLOWED_FREEZE_INTEGRITY_TYPES.includes(freeze_integrity_type)) {
      errors.push('INVALID_FREEZE_INTEGRITY_TYPE');
    }

    if (typeof freeze_integrity_mode !== 'string' || !ALLOWED_FREEZE_INTEGRITY_MODES.includes(freeze_integrity_mode)) {
      errors.push('INVALID_ITEM_FREEZE_INTEGRITY_MODE');
    }

    if (typeof freeze_integrity_hash !== 'string' || freeze_integrity_hash.trim().length === 0) {
      errors.push('INVALID_FREEZE_INTEGRITY_HASH');
    }
  }

  // Validate required_freeze_integrity_controls is an array
  if (!Array.isArray(required_freeze_integrity_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['REQUIRED_FREEZE_INTEGRITY_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_freeze_integrity_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    release_freeze_integrity_binder_id,
    final_execution_lock_verification_id,
    final_execution_lock_verification_ready,
    freeze_integrity_requested_by,
    freeze_integrity_reason,
    freeze_integrity_mode,
    freeze_integrity_items,
    required_freeze_integrity_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare freeze_integrity_items_verified array
  const freezeIntegrityItemsVerified = freeze_integrity_items.map(item => ({
    id: item.freeze_integrity_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_READY,
    errors: [],
    hash,
    freeze_integrity_items_verified: freezeIntegrityItemsVerified,
    final_message: finalMessage,
    release_freeze_integrity_bound: false,
    release_freeze_integrity_verified: false,
    release_freeze_lifted: false,
    release_execution_unfrozen: false,
    final_release_lock_verified: false,
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
    final_integrity_reviewed: false,
    hard_stop_lifted: false,
    release_command_armed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.') {
    return false;
  }
  // Check freeze_integrity_items_verified has same length as input
  if (!Array.isArray(result.freeze_integrity_items_verified) || result.freeze_integrity_items_verified.length !== input.freeze_integrity_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'release_freeze_integrity_bound',
    'release_freeze_integrity_verified',
    'release_freeze_lifted',
    'release_execution_unfrozen',
    'final_release_lock_verified',
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
  if (status === STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_READY) {
    output.freeze_integrity_items_verified = data.freeze_integrity_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}