import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-execution-hold-evidence-receipt';
const MODULE_VERSION = 'V458';

// STATUSES
export const STATUSES = {
  EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_LOCK: 'EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_LOCK',
  EXECUTION_HOLD_EVIDENCE_RECEIPT_FAIL: 'EXECUTION_HOLD_EVIDENCE_RECEIPT_FAIL',
  EXECUTION_HOLD_EVIDENCE_RECEIPT_READY: 'EXECUTION_HOLD_EVIDENCE_RECEIPT_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'execution_hold_evidence_receipt_id',
  'final_release_lock_binder_id',
  'final_release_lock_binder_ready',
  'execution_hold_evidence_items',
  'required_execution_hold_evidence_controls',
  'execution_hold_evidence_level',
];

const ALLOWED_EXECUTION_HOLD_EVIDENCE_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_EXECUTION_HOLD_EVIDENCE_TYPES = [
  'release_execution_hold_evidence',
  'deploy_execution_hold_evidence',
  'tag_execution_hold_evidence',
  'stable_execution_hold_evidence',
  'artifact_execution_hold_evidence',
  'production_execution_hold_evidence',
  'billing_execution_hold_evidence',
  'secret_execution_hold_evidence',
  'network_execution_hold_evidence',
  'rollback_execution_hold_evidence',
  'operator_execution_hold_evidence',
  'emergency_stop_execution_hold_evidence',
];

const REQUIRED_CONTROLS = [
  'execution-hold-evidence-receipt-required',
  'final-release-lock-required',
  'metadata-only-evidence',
  'execution-hold-evidence-not-published',
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
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT,
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
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    execution_hold_evidence_receipt_id,
    final_release_lock_binder_id,
    final_release_lock_binder_ready,
    execution_hold_evidence_items,
    required_execution_hold_evidence_controls,
    execution_hold_evidence_level,
  } = input;

  // Validate final_release_lock_binder_ready is boolean
  if (typeof final_release_lock_binder_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INVALID_FINAL_RELEASE_LOCK_BINDER_READY'],
      hash: null,
    };
  }

  // If V457 is not ready, block
  if (final_release_lock_binder_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_LOCK,
      errors: ['FINAL_RELEASE_LOCK_BINDER_NOT_READY'],
      hash: null,
    };
  }

  // Validate execution_hold_evidence_items is an array
  if (!Array.isArray(execution_hold_evidence_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['EXECUTION_HOLD_EVIDENCE_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each evidence item
  for (const item of execution_hold_evidence_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_EXECUTION_HOLD_EVIDENCE_ITEM_TYPE');
      continue;
    }

    const { execution_hold_evidence_item_id, execution_hold_evidence_type, execution_hold_evidence_mode, execution_hold_evidence_hash } = item;

    if (typeof execution_hold_evidence_item_id !== 'string' || execution_hold_evidence_item_id.trim().length === 0) {
      errors.push('INVALID_EXECUTION_HOLD_EVIDENCE_ITEM_ID');
    }

    if (typeof execution_hold_evidence_type !== 'string' || !ALLOWED_EXECUTION_HOLD_EVIDENCE_TYPES.includes(execution_hold_evidence_type)) {
      errors.push('INVALID_EXECUTION_HOLD_EVIDENCE_TYPE');
    }

    if (typeof execution_hold_evidence_mode !== 'string' || !ALLOWED_EXECUTION_HOLD_EVIDENCE_MODES.includes(execution_hold_evidence_mode)) {
      errors.push('INVALID_ITEM_EXECUTION_HOLD_EVIDENCE_MODE');
    }

    if (typeof execution_hold_evidence_hash !== 'string' || execution_hold_evidence_hash.trim().length === 0) {
      errors.push('INVALID_EXECUTION_HOLD_EVIDENCE_HASH');
    }
  }

  // Validate required_execution_hold_evidence_controls is an array
  if (!Array.isArray(required_execution_hold_evidence_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['REQUIRED_EXECUTION_HOLD_EVIDENCE_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_execution_hold_evidence_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    execution_hold_evidence_receipt_id,
    final_release_lock_binder_id,
    final_release_lock_binder_ready,
    execution_hold_evidence_items,
    required_execution_hold_evidence_controls,
    execution_hold_evidence_level,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare execution_hold_evidence_items_verified array
  const executionHoldEvidenceItemsVerified = execution_hold_evidence_items.map(item => ({
    id: item.execution_hold_evidence_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V456-V460 post-revalidation execution hold and final release lock complete. Real release execution remains blocked until explicit V461 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_READY,
    errors: [],
    hash,
    execution_hold_evidence_items_verified: executionHoldEvidenceItemsVerified,
    final_message: finalMessage,
    execution_hold_evidence_receipt_published: false,
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
    final_integrity_reviewed: false,
    hard_stop_lifted: false,
    release_command_armed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V456-V460 post-revalidation execution hold and final release lock complete. Real release execution remains blocked until explicit V461 command.') {
    return false;
  }
  // Check execution_hold_evidence_items_verified has same length as input
  if (!Array.isArray(result.execution_hold_evidence_items_verified) || result.execution_hold_evidence_items_verified.length !== input.execution_hold_evidence_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'execution_hold_evidence_receipt_published',
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
  if (status === STATUSES.EXECUTION_HOLD_EVIDENCE_RECEIPT_READY) {
    output.execution_hold_evidence_items_verified = data.execution_hold_evidence_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}