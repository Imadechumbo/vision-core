import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-execution-lock-verification-contract';
const MODULE_VERSION = 'V461';

// STATUSES
export const STATUSES = {
  FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT: 'FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT',
  FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_HOLD: 'FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_HOLD',
  FINAL_EXECUTION_LOCK_VERIFICATION_FAIL: 'FINAL_EXECUTION_LOCK_VERIFICATION_FAIL',
  FINAL_EXECUTION_LOCK_VERIFICATION_READY: 'FINAL_EXECUTION_LOCK_VERIFICATION_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'final_execution_lock_verification_contract_id',
  'post_revalidation_execution_hold_phase_gate_id',
  'post_revalidation_execution_hold_phase_gate_ready',
  'lock_verification_requested_by',
  'lock_verification_reason',
  'lock_verification_mode',
  'lock_verification_items',
  'required_lock_verification_controls',
];

const ALLOWED_LOCK_VERIFICATION_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_LOCK_VERIFICATION_TYPES = [
  'release_execution_lock_verification',
  'deploy_execution_lock_verification',
  'tag_execution_lock_verification',
  'stable_execution_lock_verification',
  'artifact_execution_lock_verification',
  'production_execution_lock_verification',
  'billing_execution_lock_verification',
  'secret_execution_lock_verification',
  'network_execution_lock_verification',
  'rollback_execution_lock_verification',
  'operator_execution_lock_verification',
  'emergency_stop_execution_lock_verification',
];

const REQUIRED_CONTROLS = [
  'final-execution-lock-verification-required',
  'post-revalidation-execution-hold-phase-required',
  'metadata-only-lock-verification',
  'final-execution-lock-not-verified',
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
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_execution_lock_verification_contract_id,
    post_revalidation_execution_hold_phase_gate_id,
    post_revalidation_execution_hold_phase_gate_ready,
    lock_verification_requested_by,
    lock_verification_reason,
    lock_verification_mode,
    lock_verification_items,
    required_lock_verification_controls,
  } = input;

  // Validate post_revalidation_execution_hold_phase_gate_ready is boolean
  if (typeof post_revalidation_execution_hold_phase_gate_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT,
      errors: ['INVALID_POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_READY'],
      hash: null,
    };
  }

  // If V460 is not ready, block
  if (post_revalidation_execution_hold_phase_gate_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_HOLD,
      errors: ['POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_NOT_READY'],
      hash: null,
    };
  }

  // Validate lock_verification_mode
  if (typeof lock_verification_mode !== 'string' || !ALLOWED_LOCK_VERIFICATION_MODES.includes(lock_verification_mode)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT,
      errors: ['INVALID_LOCK_VERIFICATION_MODE'],
      hash: null,
    };
  }

  // Validate lock_verification_items is an array
  if (!Array.isArray(lock_verification_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT,
      errors: ['LOCK_VERIFICATION_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each lock verification item
  for (const item of lock_verification_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_LOCK_VERIFICATION_ITEM_TYPE');
      continue;
    }

    const { lock_verification_item_id, lock_verification_type, lock_verification_mode, lock_verification_hash } = item;

    if (typeof lock_verification_item_id !== 'string' || lock_verification_item_id.trim().length === 0) {
      errors.push('INVALID_LOCK_VERIFICATION_ITEM_ID');
    }

    if (typeof lock_verification_type !== 'string' || !ALLOWED_LOCK_VERIFICATION_TYPES.includes(lock_verification_type)) {
      errors.push('INVALID_LOCK_VERIFICATION_TYPE');
    }

    if (typeof lock_verification_mode !== 'string' || !ALLOWED_LOCK_VERIFICATION_MODES.includes(lock_verification_mode)) {
      errors.push('INVALID_ITEM_LOCK_VERIFICATION_MODE');
    }

    if (typeof lock_verification_hash !== 'string' || lock_verification_hash.trim().length === 0) {
      errors.push('INVALID_LOCK_VERIFICATION_HASH');
    }
  }

  // Validate required_lock_verification_controls is an array
  if (!Array.isArray(required_lock_verification_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_BLOCKED_INPUT,
      errors: ['REQUIRED_LOCK_VERIFICATION_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_lock_verification_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_execution_lock_verification_contract_id,
    post_revalidation_execution_hold_phase_gate_id,
    post_revalidation_execution_hold_phase_gate_ready,
    lock_verification_requested_by,
    lock_verification_reason,
    lock_verification_mode,
    lock_verification_items,
    required_lock_verification_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare lock_verification_items_verified array
  const lockVerificationItemsVerified = lock_verification_items.map(item => ({
    id: item.lock_verification_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_READY,
    errors: [],
    hash,
    lock_verification_items_verified: lockVerificationItemsVerified,
    final_message: finalMessage,
    final_execution_lock_verified: false,
    release_freeze_lifted: false,
    release_execution_unfrozen: false,
    final_release_execution_locked: false,
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
  if (result.status !== STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.') {
    return false;
  }
  // Check lock_verification_items_verified has same length as input
  if (!Array.isArray(result.lock_verification_items_verified) || result.lock_verification_items_verified.length !== input.lock_verification_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'final_execution_lock_verified',
    'release_freeze_lifted',
    'release_execution_unfrozen',
    'final_release_execution_locked',
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
  if (status === STATUSES.FINAL_EXECUTION_LOCK_VERIFICATION_READY) {
    output.lock_verification_items_verified = data.lock_verification_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}