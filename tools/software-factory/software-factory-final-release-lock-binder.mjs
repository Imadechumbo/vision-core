import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-release-lock-binder';
const MODULE_VERSION = 'V457';

// STATUSES
export const STATUSES = {
  FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT: 'FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT',
  FINAL_RELEASE_LOCK_BINDER_BLOCKED_HOLD: 'FINAL_RELEASE_LOCK_BINDER_BLOCKED_HOLD',
  FINAL_RELEASE_LOCK_BINDER_FAIL: 'FINAL_RELEASE_LOCK_BINDER_FAIL',
  FINAL_RELEASE_LOCK_BINDER_READY: 'FINAL_RELEASE_LOCK_BINDER_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'final_release_lock_binder_id',
  'post_revalidation_execution_hold_contract_id',
  'post_revalidation_execution_hold_contract_ready',
  'final_lock_requested_by',
  'final_lock_reason',
  'final_lock_mode',
  'final_lock_items',
  'required_final_lock_controls',
];

const ALLOWED_FINAL_LOCK_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_FINAL_LOCK_TYPES = [
  'release_final_lock',
  'deploy_final_lock',
  'tag_final_lock',
  'stable_final_lock',
  'artifact_final_lock',
  'production_final_lock',
  'billing_final_lock',
  'secret_final_lock',
  'network_final_lock',
  'rollback_final_lock',
  'operator_final_lock',
  'emergency_stop_final_lock',
];

const REQUIRED_CONTROLS = [
  'final-release-lock-required',
  'post-revalidation-execution-hold-required',
  'metadata-only-final-lock',
  'final-release-lock-not-bound',
  'final-release-lock-not-verified',
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
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_release_lock_binder_id,
    post_revalidation_execution_hold_contract_id,
    post_revalidation_execution_hold_contract_ready,
    final_lock_requested_by,
    final_lock_reason,
    final_lock_mode,
    final_lock_items,
    required_final_lock_controls,
  } = input;

  // Validate post_revalidation_execution_hold_contract_ready is boolean
  if (typeof post_revalidation_execution_hold_contract_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT,
      errors: ['INVALID_POST_REVALIDATION_EXECUTION_HOLD_CONTRACT_READY'],
      hash: null,
    };
  }

  // If V456 is not ready, block
  if (post_revalidation_execution_hold_contract_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_HOLD,
      errors: ['POST_REVALIDATION_EXECUTION_HOLD_CONTRACT_NOT_READY'],
      hash: null,
    };
  }

  // Validate final_lock_mode
  if (typeof final_lock_mode !== 'string' || !ALLOWED_FINAL_LOCK_MODES.includes(final_lock_mode)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT,
      errors: ['INVALID_FINAL_LOCK_MODE'],
      hash: null,
    };
  }

  // Validate final_lock_items is an array
  if (!Array.isArray(final_lock_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT,
      errors: ['FINAL_LOCK_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each final lock item
  for (const item of final_lock_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_FINAL_LOCK_ITEM_TYPE');
      continue;
    }

    const { final_lock_item_id, final_lock_type, final_lock_mode, final_lock_hash } = item;

    if (typeof final_lock_item_id !== 'string' || final_lock_item_id.trim().length === 0) {
      errors.push('INVALID_FINAL_LOCK_ITEM_ID');
    }

    if (typeof final_lock_type !== 'string' || !ALLOWED_FINAL_LOCK_TYPES.includes(final_lock_type)) {
      errors.push('INVALID_FINAL_LOCK_TYPE');
    }

    if (typeof final_lock_mode !== 'string' || !ALLOWED_FINAL_LOCK_MODES.includes(final_lock_mode)) {
      errors.push('INVALID_ITEM_FINAL_LOCK_MODE');
    }

    if (typeof final_lock_hash !== 'string' || final_lock_hash.trim().length === 0) {
      errors.push('INVALID_FINAL_LOCK_HASH');
    }
  }

  // Validate required_final_lock_controls is an array
  if (!Array.isArray(required_final_lock_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_BLOCKED_INPUT,
      errors: ['REQUIRED_FINAL_LOCK_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_final_lock_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_LOCK_BINDER_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_release_lock_binder_id,
    post_revalidation_execution_hold_contract_id,
    post_revalidation_execution_hold_contract_ready,
    final_lock_requested_by,
    final_lock_reason,
    final_lock_mode,
    final_lock_items,
    required_final_lock_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare final_lock_items_verified array
  const finalLockItemsVerified = final_lock_items.map(item => ({
    id: item.final_lock_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V456-V460 post-revalidation execution hold and final release lock complete. Real release execution remains blocked until explicit V461 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_RELEASE_LOCK_BINDER_READY,
    errors: [],
    hash,
    final_lock_items_verified: finalLockItemsVerified,
    final_message: finalMessage,
    final_release_lock_bound: false,
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
  if (result.status !== STATUSES.FINAL_RELEASE_LOCK_BINDER_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V456-V460 post-revalidation execution hold and final release lock complete. Real release execution remains blocked until explicit V461 command.') {
    return false;
  }
  // Check final_lock_items_verified has same length as input
  if (!Array.isArray(result.final_lock_items_verified) || result.final_lock_items_verified.length !== input.final_lock_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'final_release_lock_bound',
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
  if (status === STATUSES.FINAL_RELEASE_LOCK_BINDER_READY) {
    output.final_lock_items_verified = data.final_lock_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}