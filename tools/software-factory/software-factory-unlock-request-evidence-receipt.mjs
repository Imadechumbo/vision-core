import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-unlock-request-evidence-receipt';
const MODULE_VERSION = 'V443';

// STATUSES
export const STATUSES = {
  UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INTERLOCK: 'UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INTERLOCK',
  UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL: 'UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL',
  UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY: 'UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'unlock_request_evidence_receipt_id',
  'final_release_interlock_binder_id',
  'final_release_interlock_binder_ready',
  'unlock_evidence_items',
  'required_unlock_evidence_controls',
  'unlock_evidence_level',
];

const ALLOWED_EVIDENCE_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_EVIDENCE_TYPES = [
  'release_unlock_request_evidence',
  'deploy_unlock_request_evidence',
  'tag_unlock_request_evidence',
  'stable_unlock_request_evidence',
  'artifact_unlock_request_evidence',
  'production_unlock_request_evidence',
  'billing_unlock_request_evidence',
  'secret_unlock_request_evidence',
  'network_unlock_request_evidence',
  'rollback_unlock_request_evidence',
  'operator_unlock_request_evidence',
  'emergency_stop_unlock_request_evidence',
];

const REQUIRED_CONTROLS = [
  'unlock-request-evidence-receipt-required',
  'final-release-interlock-required',
  'metadata-only-evidence',
  'unlock-evidence-not-published',
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
      status: STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT,
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
      status: STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    unlock_request_evidence_receipt_id,
    final_release_interlock_binder_id,
    final_release_interlock_binder_ready,
    unlock_evidence_items,
    required_unlock_evidence_controls,
    unlock_evidence_level,
  } = input;

  // Validate IDs
  if (typeof unlock_request_evidence_receipt_id !== 'string' || unlock_request_evidence_receipt_id.trim().length === 0) {
    errors.push('INVALID_RECEIPT_ID');
  }

  if (typeof final_release_interlock_binder_id !== 'string' || final_release_interlock_binder_id.trim().length === 0) {
    errors.push('INVALID_BINDER_ID');
  }

  // Check final_release_interlock_binder_ready
  if (typeof final_release_interlock_binder_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INVALID_BINDER_READY'],
      hash: null,
    };
  }

  // If final_release_interlock_binder_ready is false, return BLOCKED_INTERLOCK
  if (final_release_interlock_binder_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INTERLOCK,
      errors: ['INTERLOCK_NOT_READY'],
      hash: null,
    };
  }

  // Validate unlock_evidence_items
  if (!Array.isArray(unlock_evidence_items)) {
    errors.push('UNLOCK_EVIDENCE_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < unlock_evidence_items.length; i++) {
      const item = unlock_evidence_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`UNLOCK_EVIDENCE_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('unlock_evidence_id') || typeof item.unlock_evidence_id !== 'string' || item.unlock_evidence_id.trim().length === 0) {
        errors.push(`UNLOCK_EVIDENCE_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('unlock_evidence_type') || !ALLOWED_EVIDENCE_TYPES.includes(item.unlock_evidence_type)) {
        errors.push(`UNLOCK_EVIDENCE_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('unlock_evidence_mode') || !ALLOWED_EVIDENCE_MODES.includes(item.unlock_evidence_mode)) {
        errors.push(`UNLOCK_EVIDENCE_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('unlock_evidence_hash') || typeof item.unlock_evidence_hash !== 'string' || item.unlock_evidence_hash.length !== 64) {
        errors.push(`UNLOCK_EVIDENCE_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_unlock_evidence_controls
  if (!Array.isArray(required_unlock_evidence_controls)) {
    errors.push('REQUIRED_UNLOCK_EVIDENCE_CONTROLS_NOT_AN_ARRAY');
  } else if (required_unlock_evidence_controls.length === 0) {
    errors.push('REQUIRED_UNLOCK_EVIDENCE_CONTROLS_EMPTY');
  } else {
    const requiredSet = new Set(REQUIRED_CONTROLS);
    const foundControls = new Set();
    let hasMissing = false;

    for (const control of required_unlock_evidence_controls) {
      if (typeof control !== 'string') {
        errors.push(`INVALID_CONTROL_TYPE: ${control}`);
        continue;
      }
      if (!requiredSet.has(control)) {
        errors.push(`INVALID_CONTROL: ${control}`);
      } else if (foundControls.has(control)) {
        errors.push(`DUPLICATE_CONTROL: ${control}`);
      } else {
        foundControls.add(control);
      }
    }

    // Check for missing required controls
    for (const required of REQUIRED_CONTROLS) {
      if (!foundControls.has(required)) {
        errors.push(`MISSING_REQUIRED_CONTROL: ${required}`);
      }
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    unlock_request_evidence_receipt_id,
    final_release_interlock_binder_id,
    final_release_interlock_binder_ready,
    unlock_evidence_items,
    required_unlock_evidence_controls,
    unlock_evidence_level,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY,
    errors: [],
    hash,
    unlock_evidence_level: unlock_evidence_level,
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
    controlled_execution_lock_phase_passed: false,
    controlled_real_release_execution_unlocked: false,
    final_controlled_execution_granted: false,
    real_release_execution_allowed: false,
    real_release_hard_stop_lifted: false,
    real_release_command_armed: false,
    controlled_release_unlock_requested: false,
    final_release_interlock_bound: false,
    final_release_interlock_verified: false,
    unlock_request_evidence_receipt_published: false,
    final_unlock_authority_reviewed: false,
    final_unlock_authority_granted: false,
    controlled_release_unlock_request_phase_passed: false,
    controlled_release_execution_unlocked: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  return result.status === STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY && result.errors.length === 0;
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
  if (status === STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY) {
    output.unlock_evidence_level = data.unlock_evidence_level;
    output.unlock_request_evidence_receipt_published = data.unlock_request_evidence_receipt_published || false;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}