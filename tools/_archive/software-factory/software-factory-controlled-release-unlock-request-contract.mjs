import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-controlled-release-unlock-request-contract';
const MODULE_VERSION = 'V441';

// STATUSES
export const STATUSES = {
  CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT',
  CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_LOCK_PHASE: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_LOCK_PHASE',
  CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL',
  CONTROLLED_RELEASE_UNLOCK_REQUEST_READY: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_READY',
};

// Input schema
const REQUIRED_FIELDS = [
  'controlled_release_unlock_request_contract_id',
  'controlled_execution_lock_phase_gate_id',
  'controlled_execution_lock_phase_gate_ready',
  'unlock_requested_by',
  'unlock_reason',
  'unlock_mode',
  'unlock_items',
  'required_unlock_controls',
];

const ALLOWED_UNLOCK_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_UNLOCK_TYPES = [
  'release_execution_unlock_request',
  'deploy_execution_unlock_request',
  'tag_execution_unlock_request',
  'stable_execution_unlock_request',
  'artifact_execution_unlock_request',
  'production_execution_unlock_request',
  'billing_execution_unlock_request',
  'secret_execution_unlock_request',
  'network_execution_unlock_request',
  'rollback_execution_unlock_request',
  'operator_unlock_request',
  'emergency_stop_unlock_request',
];

const REQUIRED_CONTROLS = [
  'controlled-release-unlock-request-required',
  'controlled-execution-lock-phase-required',
  'metadata-only-unlock-request',
  'unlock-request-not-created',
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
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT,
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
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    controlled_release_unlock_request_contract_id,
    controlled_execution_lock_phase_gate_id,
    controlled_execution_lock_phase_gate_ready,
    unlock_requested_by,
    unlock_reason,
    unlock_mode,
    unlock_items,
    required_unlock_controls,
  } = input;

  // Validate IDs
  if (typeof controlled_release_unlock_request_contract_id !== 'string' || controlled_release_unlock_request_contract_id.trim().length === 0) {
    errors.push('INVALID_CONTRACT_ID');
  }

  if (typeof controlled_execution_lock_phase_gate_id !== 'string' || controlled_execution_lock_phase_gate_id.trim().length === 0) {
    errors.push('INVALID_PHASE_GATE_ID');
  }

  // Check controlled_execution_lock_phase_gate_ready
  if (typeof controlled_execution_lock_phase_gate_ready !== 'boolean') {
    errors.push('INVALID_PHASE_GATE_READY');
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  // Check if controlled_execution_lock_phase_gate_ready is false
  if (controlled_execution_lock_phase_gate_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_LOCK_PHASE,
      errors: ['PHASE_GATE_NOT_READY'],
      hash: null,
    };
  }

  // Validate unlock_requested_by
  if (typeof unlock_requested_by !== 'string' || unlock_requested_by.trim().length === 0) {
    errors.push('MISSING_UNLOCK_REQUESTED_BY');
  }

  // Validate unlock_reason
  if (typeof unlock_reason !== 'string' || unlock_reason.trim().length === 0) {
    errors.push('MISSING_UNLOCK_REASON');
  }

  // Validate unlock_mode
  if (!ALLOWED_UNLOCK_MODES.includes(unlock_mode)) {
    errors.push('INVALID_UNLOCK_MODE');
  }

  // Validate unlock_items
  if (!Array.isArray(unlock_items)) {
    errors.push('UNLOCK_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < unlock_items.length; i++) {
      const item = unlock_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`UNLOCK_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('unlock_item_id') || typeof item.unlock_item_id !== 'string' || item.unlock_item_id.trim().length === 0) {
        errors.push(`UNLOCK_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('unlock_type') || !ALLOWED_UNLOCK_TYPES.includes(item.unlock_type)) {
        errors.push(`UNLOCK_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('unlock_mode') || !ALLOWED_UNLOCK_MODES.includes(item.unlock_mode)) {
        errors.push(`UNLOCK_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('unlock_hash') || typeof item.unlock_hash !== 'string' || item.unlock_hash.length !== 64) {
        errors.push(`UNLOCK_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_unlock_controls
  if (!Array.isArray(required_unlock_controls)) {
    errors.push('REQUIRED_UNLOCK_CONTROLS_NOT_AN_ARRAY');
  } else {
    for (const control of required_unlock_controls) {
      if (typeof control !== 'string' || !REQUIRED_CONTROLS.includes(control)) {
        errors.push(`INVALID_CONTROL: ${control}`);
      }
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    controlled_release_unlock_request_contract_id,
    controlled_execution_lock_phase_gate_id,
    unlock_requested_by,
    unlock_reason,
    unlock_mode,
    unlock_items,
    required_unlock_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_READY,
    errors: [],
    hash,
    controlled_release_unlock_requested: false,
    controlled_release_execution_unlocked: false,
    real_release_execution_allowed: false,
    real_release_executed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  return result.status === STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_READY && result.errors.length === 0;
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
  if (status === STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_READY) {
    output.controlled_release_unlock_requested = data.controlled_release_unlock_requested || false;
    output.controlled_release_execution_unlocked = data.controlled_release_execution_unlocked || false;
    output.real_release_execution_allowed = data.real_release_execution_allowed || false;
    output.real_release_executed = data.real_release_executed || false;
  }

  return JSON.stringify(output, null, 2);
}