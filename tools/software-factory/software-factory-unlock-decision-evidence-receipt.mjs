import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-unlock-decision-evidence-receipt';
const MODULE_VERSION = 'V448';

// STATUSES
export const STATUSES = {
  UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_BARRIER: 'UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_BARRIER',
  UNLOCK_DECISION_EVIDENCE_RECEIPT_FAIL: 'UNLOCK_DECISION_EVIDENCE_RECEIPT_FAIL',
  UNLOCK_DECISION_EVIDENCE_RECEIPT_READY: 'UNLOCK_DECISION_EVIDENCE_RECEIPT_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'unlock_decision_evidence_receipt_id',
  'final_execution_barrier_binder_id',
  'final_execution_barrier_binder_ready',
  'unlock_decision_evidence_items',
  'required_unlock_decision_evidence_controls',
  'unlock_decision_evidence_level',
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
  'release_unlock_decision_evidence',
  'deploy_unlock_decision_evidence',
  'tag_unlock_decision_evidence',
  'stable_unlock_decision_evidence',
  'artifact_unlock_decision_evidence',
  'production_unlock_decision_evidence',
  'billing_unlock_decision_evidence',
  'secret_unlock_decision_evidence',
  'network_unlock_decision_evidence',
  'rollback_unlock_decision_evidence',
  'operator_unlock_decision_evidence',
  'emergency_stop_unlock_decision_evidence',
];

const REQUIRED_CONTROLS = [
  'unlock-decision-evidence-receipt-required',
  'final-execution-barrier-required',
  'metadata-only-evidence',
  'unlock-decision-evidence-not-published',
  'barrier-not-verified',
  'barrier-not-lifted',
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
      status: STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
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
      status: STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    unlock_decision_evidence_receipt_id,
    final_execution_barrier_binder_id,
    final_execution_barrier_binder_ready,
    unlock_decision_evidence_items,
    required_unlock_decision_evidence_controls,
    unlock_decision_evidence_level,
  } = input;

  // Validate receipt ID
  if (typeof unlock_decision_evidence_receipt_id !== 'string' || unlock_decision_evidence_receipt_id.trim().length === 0) {
    errors.push('INVALID_RECEIPT_ID');
  }

  // Validate binder ID
  if (typeof final_execution_barrier_binder_id !== 'string' || final_execution_barrier_binder_id.trim().length === 0) {
    errors.push('INVALID_BINDER_ID');
  }

  // Check binder_ready
  if (typeof final_execution_barrier_binder_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['INVALID_BINDER_READY'],
      hash: null,
    };
  }

  // If binder_ready is false, return BLOCKED_BARRIER
  if (final_execution_barrier_binder_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_BLOCKED_BARRIER,
      errors: ['BARRIER_NOT_READY'],
      hash: null,
    };
  }

  // Validate unlock_decision_evidence_items
  if (!Array.isArray(unlock_decision_evidence_items)) {
    errors.push('UNLOCK_DECISION_EVIDENCE_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < unlock_decision_evidence_items.length; i++) {
      const item = unlock_decision_evidence_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`UNLOCK_DECISION_EVIDENCE_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('unlock_decision_evidence_item_id') || typeof item.unlock_decision_evidence_item_id !== 'string' || item.unlock_decision_evidence_item_id.trim().length === 0) {
        errors.push(`UNLOCK_DECISION_EVIDENCE_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('unlock_decision_evidence_type') || !ALLOWED_EVIDENCE_TYPES.includes(item.unlock_decision_evidence_type)) {
        errors.push(`UNLOCK_DECISION_EVIDENCE_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('unlock_decision_evidence_mode') || !ALLOWED_EVIDENCE_MODES.includes(item.unlock_decision_evidence_mode)) {
        errors.push(`UNLOCK_DECISION_EVIDENCE_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('unlock_decision_evidence_hash') || typeof item.unlock_decision_evidence_hash !== 'string' || item.unlock_decision_evidence_hash.length !== 64) {
        errors.push(`UNLOCK_DECISION_EVIDENCE_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_unlock_decision_evidence_controls
  if (!Array.isArray(required_unlock_decision_evidence_controls)) {
    errors.push('REQUIRED_UNLOCK_DECISION_EVIDENCE_CONTROLS_NOT_AN_ARRAY');
  } else if (required_unlock_decision_evidence_controls.length === 0) {
    errors.push('REQUIRED_UNLOCK_DECISION_EVIDENCE_CONTROLS_EMPTY');
  } else {
    const requiredSet = new Set(REQUIRED_CONTROLS);
    const foundControls = new Set();
    let hasMissing = false;

    for (const control of required_unlock_decision_evidence_controls) {
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
      status: STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    unlock_decision_evidence_receipt_id,
    final_execution_barrier_binder_id,
    final_execution_barrier_binder_ready,
    unlock_decision_evidence_items,
    required_unlock_decision_evidence_controls,
    unlock_decision_evidence_level,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_READY,
    errors: [],
    hash,
    unlock_decision_evidence_receipt_published: false,
    final_execution_barrier_verified: false,
    final_real_execution_barrier_lifted: false,
    real_release_execution_allowed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_READY) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'unlock_decision_evidence_receipt_published',
    'final_execution_barrier_verified',
    'final_real_execution_barrier_lifted',
    'real_release_execution_allowed',
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
  if (status === STATUSES.UNLOCK_DECISION_EVIDENCE_RECEIPT_READY) {
    output.unlock_decision_evidence_receipt_published = data.unlock_decision_evidence_receipt_published;
    output.final_execution_barrier_verified = data.final_execution_barrier_verified;
    output.final_real_execution_barrier_lifted = data.final_real_execution_barrier_lifted;
    output.real_release_execution_allowed = data.real_release_execution_allowed;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}