import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-release-interlock-binder';
const MODULE_VERSION = 'V442';

// STATUSES
export const STATUSES = {
  FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_INPUT: 'FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_INPUT',
  FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_UNLOCK_REQUEST: 'FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_UNLOCK_REQUEST',
  FINAL_RELEASE_INTERLOCK_BINDER_FAIL: 'FINAL_RELEASE_INTERLOCK_BINDER_FAIL',
  FINAL_RELEASE_INTERLOCK_BINDER_READY: 'FINAL_RELEASE_INTERLOCK_BINDER_READY',
};

// Input schema
const REQUIRED_FIELDS = [
  'final_release_interlock_binder_id',
  'controlled_release_unlock_request_contract_id',
  'controlled_release_unlock_request_contract_ready',
  'interlock_requested_by',
  'interlock_reason',
  'interlock_mode',
  'interlock_items',
  'required_interlock_controls',
];

const ALLOWED_INTERLOCK_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_INTERLOCK_TYPES = [
  'release_execution_interlock',
  'deploy_execution_interlock',
  'tag_execution_interlock',
  'stable_execution_interlock',
  'artifact_execution_interlock',
  'production_execution_interlock',
  'billing_execution_interlock',
  'secret_execution_interlock',
  'network_execution_interlock',
  'rollback_execution_interlock',
  'operator_execution_interlock',
  'emergency_stop_execution_interlock',
];

const REQUIRED_CONTROLS = [
  'final-release-interlock-required',
  'controlled-release-unlock-request-required',
  'metadata-only-interlock',
  'interlock-not-verified',
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
      status: STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_INPUT,
      errors: ['INPUT_IS_NOT_AN_OBJECT'],
      hash: null,
    };
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!input.hasOwnProperty(field)) {
      errors.push(`MISSING_REQUIRED_FIELD: ${field}`);
    }
  }

  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_release_interlock_binder_id,
    controlled_release_unlock_request_contract_id,
    controlled_release_unlock_request_contract_ready,
    interlock_requested_by,
    interlock_reason,
    interlock_mode,
    interlock_items,
    required_interlock_controls,
  } = input;

  // Validate IDs
  if (typeof final_release_interlock_binder_id !== 'string' || final_release_interlock_binder_id.trim().length === 0) {
    errors.push('INVALID_BINDER_ID');
  }

  if (typeof controlled_release_unlock_request_contract_id !== 'string' || controlled_release_unlock_request_contract_id.trim().length === 0) {
    errors.push('INVALID_CONTRACT_ID');
  }

  // Check controlled_release_unlock_request_contract_ready
  if (typeof controlled_release_unlock_request_contract_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_INPUT,
      errors: ['INVALID_CONTRACT_READY'],
      hash: null,
    };
  }

  // If controlled_release_unlock_request_contract_ready is false, return BLOCKED_UNLOCK_REQUEST
  if (controlled_release_unlock_request_contract_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_BLOCKED_UNLOCK_REQUEST,
      errors: ['CONTRACT_NOT_READY'],
      hash: null,
    };
  }

  // Validate interlock_requested_by
  if (typeof interlock_requested_by !== 'string' || interlock_requested_by.trim().length === 0) {
    errors.push('MISSING_INTERLOCK_REQUESTED_BY');
  }

  // Validate interlock_reason
  if (typeof interlock_reason !== 'string' || interlock_reason.trim().length === 0) {
    errors.push('MISSING_INTERLOCK_REASON');
  }

  // Validate interlock_mode
  if (!ALLOWED_INTERLOCK_MODES.includes(interlock_mode)) {
    errors.push('INVALID_INTERLOCK_MODE');
  }

  // Validate interlock_items
  if (!Array.isArray(interlock_items)) {
    errors.push('INTERLOCK_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < interlock_items.length; i++) {
      const item = interlock_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`INTERLOCK_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('interlock_item_id') || typeof item.interlock_item_id !== 'string' || item.interlock_item_id.trim().length === 0) {
        errors.push(`INTERLOCK_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('interlock_type') || !ALLOWED_INTERLOCK_TYPES.includes(item.interlock_type)) {
        errors.push(`INTERLOCK_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('interlock_mode') || !ALLOWED_INTERLOCK_MODES.includes(item.interlock_mode)) {
        errors.push(`INTERLOCK_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('interlock_hash') || typeof item.interlock_hash !== 'string' || item.interlock_hash.length !== 64) {
        errors.push(`INTERLOCK_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_interlock_controls
  if (!Array.isArray(required_interlock_controls)) {
    errors.push('REQUIRED_INTERLOCK_CONTROLS_NOT_AN_ARRAY');
  } else {
    for (const control of required_interlock_controls) {
      if (typeof control !== 'string' || !REQUIRED_CONTROLS.includes(control)) {
        errors.push(`INVALID_CONTROL: ${control}`);
      }
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_release_interlock_binder_id,
    controlled_release_unlock_request_contract_id,
    controlled_release_unlock_request_contract_ready,
    interlock_requested_by,
    interlock_reason,
    interlock_mode,
    interlock_items,
    required_interlock_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_READY,
    errors: [],
    hash,
    final_release_interlock_bound: false,
    final_release_interlock_verified: false,
    controlled_release_unlock_requested: false,
    controlled_release_execution_unlocked: false,
    real_release_execution_allowed: false,
    real_release_executed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  return result.status === STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_READY && result.errors.length === 0;
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
  if (status === STATUSES.FINAL_RELEASE_INTERLOCK_BINDER_READY) {
    output.final_release_interlock_bound = data.final_release_interlock_bound || false;
    output.final_release_interlock_verified = data.final_release_interlock_verified || false;
    output.controlled_release_unlock_requested = data.controlled_release_unlock_requested || false;
    output.controlled_release_execution_unlocked = data.controlled_release_execution_unlocked || false;
    output.real_release_execution_allowed = data.real_release_execution_allowed || false;
    output.real_release_executed = data.real_release_executed || false;
  }

  return JSON.stringify(output, null, 2);
}