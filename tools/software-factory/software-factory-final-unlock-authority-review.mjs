import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-unlock-authority-review';
const MODULE_VERSION = 'V444';

// STATUSES
export const STATUSES = {
  FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_INPUT: 'FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_INPUT',
  FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_EVIDENCE: 'FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_EVIDENCE',
  FINAL_UNLOCK_AUTHORITY_REVIEW_FAIL: 'FINAL_UNLOCK_AUTHORITY_REVIEW_FAIL',
  FINAL_UNLOCK_AUTHORITY_REVIEW_READY: 'FINAL_UNLOCK_AUTHORITY_REVIEW_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'final_unlock_authority_review_id',
  'unlock_request_evidence_receipt_id',
  'unlock_request_evidence_receipt_ready',
  'unlock_review_actor',
  'unlock_review_reason',
  'unlock_review_mode',
  'unlock_review_items',
  'required_unlock_review_controls',
];

const ALLOWED_REVIEW_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_REVIEW_TYPES = [
  'final_release_unlock_authority_review',
  'final_deploy_unlock_authority_review',
  'final_tag_unlock_authority_review',
  'final_stable_unlock_authority_review',
  'final_artifact_unlock_authority_review',
  'final_production_unlock_authority_review',
  'final_billing_unlock_authority_review',
  'final_secret_unlock_authority_review',
  'final_network_unlock_authority_review',
  'final_rollback_unlock_authority_review',
  'operator_unlock_authority_review',
  'emergency_stop_unlock_authority_review',
];

const REQUIRED_CONTROLS = [
  'final-unlock-authority-review-required',
  'unlock-request-evidence-required',
  'metadata-only-review',
  'unlock-authority-not-granted',
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
      status: STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_unlock_authority_review_id,
    unlock_request_evidence_receipt_id,
    unlock_request_evidence_receipt_ready,
    unlock_review_actor,
    unlock_review_reason,
    unlock_review_mode,
    unlock_review_items,
    required_unlock_review_controls,
  } = input;

  // Validate IDs
  if (typeof final_unlock_authority_review_id !== 'string' || final_unlock_authority_review_id.trim().length === 0) {
    errors.push('INVALID_REVIEW_ID');
  }

  if (typeof unlock_request_evidence_receipt_id !== 'string' || unlock_request_evidence_receipt_id.trim().length === 0) {
    errors.push('INVALID_RECEIPT_ID');
  }

  // Check unlock_request_evidence_receipt_ready
  if (typeof unlock_request_evidence_receipt_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_INPUT,
      errors: ['INVALID_RECEIPT_READY'],
      hash: null,
    };
  }

  // If unlock_request_evidence_receipt_ready is false, return BLOCKED_EVIDENCE
  if (unlock_request_evidence_receipt_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_BLOCKED_EVIDENCE,
      errors: ['EVIDENCE_NOT_READY'],
      hash: null,
    };
  }

  // Validate unlock_review_actor
  if (typeof unlock_review_actor !== 'string' || unlock_review_actor.trim().length === 0) {
    errors.push('MISSING_REVIEW_ACTOR');
  }

  // Validate unlock_review_reason
  if (typeof unlock_review_reason !== 'string' || unlock_review_reason.trim().length === 0) {
    errors.push('MISSING_REVIEW_REASON');
  }

  // Validate unlock_review_mode
  if (!ALLOWED_REVIEW_MODES.includes(unlock_review_mode)) {
    errors.push('INVALID_REVIEW_MODE');
  }

  // Validate unlock_review_items
  if (!Array.isArray(unlock_review_items)) {
    errors.push('UNLOCK_REVIEW_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < unlock_review_items.length; i++) {
      const item = unlock_review_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`UNLOCK_REVIEW_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('unlock_review_item_id') || typeof item.unlock_review_item_id !== 'string' || item.unlock_review_item_id.trim().length === 0) {
        errors.push(`UNLOCK_REVIEW_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('unlock_review_type') || !ALLOWED_REVIEW_TYPES.includes(item.unlock_review_type)) {
        errors.push(`UNLOCK_REVIEW_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('unlock_review_mode') || !ALLOWED_REVIEW_MODES.includes(item.unlock_review_mode)) {
        errors.push(`UNLOCK_REVIEW_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('unlock_review_hash') || typeof item.unlock_review_hash !== 'string' || item.unlock_review_hash.length !== 64) {
        errors.push(`UNLOCK_REVIEW_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_unlock_review_controls
  if (!Array.isArray(required_unlock_review_controls)) {
    errors.push('REQUIRED_UNLOCK_REVIEW_CONTROLS_NOT_AN_ARRAY');
  } else if (required_unlock_review_controls.length === 0) {
    errors.push('REQUIRED_UNLOCK_REVIEW_CONTROLS_EMPTY');
  } else {
    const requiredSet = new Set(REQUIRED_CONTROLS);
    const foundControls = new Set();
    let hasMissing = false;

    for (const control of required_unlock_review_controls) {
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
      status: STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_unlock_authority_review_id,
    unlock_request_evidence_receipt_id,
    unlock_request_evidence_receipt_ready,
    unlock_review_actor,
    unlock_review_reason,
    unlock_review_mode,
    unlock_review_items,
    required_unlock_review_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_READY,
    errors: [],
    hash,
    unlock_review_mode: unlock_review_mode,
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
  return result.status === STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_READY && result.errors.length === 0;
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
  if (status === STATUSES.FINAL_UNLOCK_AUTHORITY_REVIEW_READY) {
    output.unlock_review_mode = data.unlock_review_mode;
    output.final_unlock_authority_reviewed = data.final_unlock_authority_reviewed || false;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}