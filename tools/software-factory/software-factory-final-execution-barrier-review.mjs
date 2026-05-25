import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-execution-barrier-review';
const MODULE_VERSION = 'V449';

// STATUSES
export const STATUSES = {
  FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT: 'FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT',
  FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_EVIDENCE: 'FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_EVIDENCE',
  FINAL_EXECUTION_BARRIER_REVIEW_FAIL: 'FINAL_EXECUTION_BARRIER_REVIEW_FAIL',
  FINAL_EXECUTION_BARRIER_REVIEW_READY: 'FINAL_EXECUTION_BARRIER_REVIEW_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'final_execution_barrier_review_id',
  'unlock_decision_evidence_receipt_id',
  'unlock_decision_evidence_receipt_ready',
  'barrier_review_actor',
  'barrier_review_reason',
  'barrier_review_mode',
  'barrier_review_items',
  'required_barrier_review_controls',
];

const ALLOWED_BARRIER_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_BARRIER_TYPES = [
  'final_release_execution_barrier_review',
  'final_deploy_execution_barrier_review',
  'final_tag_execution_barrier_review',
  'final_stable_execution_barrier_review',
  'final_artifact_execution_barrier_review',
  'final_production_execution_barrier_review',
  'final_billing_execution_barrier_review',
  'final_secret_execution_barrier_review',
  'final_network_execution_barrier_review',
  'final_rollback_execution_barrier_review',
  'operator_execution_barrier_review',
  'emergency_stop_execution_barrier_review',
];

const REQUIRED_CONTROLS = [
  'final-execution-barrier-review-required',
  'unlock-decision-evidence-required',
  'metadata-only-review',
  'barrier-lift-not-granted',
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
      status: STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_execution_barrier_review_id,
    unlock_decision_evidence_receipt_id,
    unlock_decision_evidence_receipt_ready,
    barrier_review_actor,
    barrier_review_reason,
    barrier_review_mode,
    barrier_review_items,
    required_barrier_review_controls,
  } = input;

  // Validate review ID
  if (typeof final_execution_barrier_review_id !== 'string' || final_execution_barrier_review_id.trim().length === 0) {
    errors.push('INVALID_REVIEW_ID');
  }

  // Validate receipt ID
  if (typeof unlock_decision_evidence_receipt_id !== 'string' || unlock_decision_evidence_receipt_id.trim().length === 0) {
    errors.push('INVALID_RECEIPT_ID');
  }

  // Check receipt_ready
  if (typeof unlock_decision_evidence_receipt_ready !== 'boolean') {
    errors.push('INVALID_RECEIPT_READY');
  }

  // If receipt_ready is false, return BLOCKED_EVIDENCE
  if (unlock_decision_evidence_receipt_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_EVIDENCE,
      errors: ['EVIDENCE_NOT_READY'],
      hash: null,
    };
  }

  // Validate barrier_review_actor
  if (typeof barrier_review_actor !== 'string' || barrier_review_actor.trim().length === 0) {
    errors.push('MISSING_BARRIER_REVIEW_ACTOR');
  }

  // Validate barrier_review_reason
  if (typeof barrier_review_reason !== 'string' || barrier_review_reason.trim().length === 0) {
    errors.push('MISSING_BARRIER_REVIEW_REASON');
  }

  // Validate barrier_review_mode
  if (!ALLOWED_BARRIER_MODES.includes(barrier_review_mode)) {
    errors.push('INVALID_BARRIER_MODE');
  }

  // Validate barrier_review_items
  if (!Array.isArray(barrier_review_items)) {
    errors.push('BARRIER_REVIEW_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < barrier_review_items.length; i++) {
      const item = barrier_review_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`BARRIER_REVIEW_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('barrier_review_item_id') || typeof item.barrier_review_item_id !== 'string' || item.barrier_review_item_id.trim().length === 0) {
        errors.push(`BARRIER_REVIEW_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('barrier_review_type') || !ALLOWED_BARRIER_TYPES.includes(item.barrier_review_type)) {
        errors.push(`BARRIER_REVIEW_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('barrier_review_mode') || !ALLOWED_BARRIER_MODES.includes(item.barrier_review_mode)) {
        errors.push(`BARRIER_REVIEW_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('barrier_review_hash') || typeof item.barrier_review_hash !== 'string' || item.barrier_review_hash.length !== 64) {
        errors.push(`BARRIER_REVIEW_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_barrier_review_controls
  if (!Array.isArray(required_barrier_review_controls)) {
    errors.push('REQUIRED_BARRIER_REVIEW_CONTROLS_NOT_AN_ARRAY');
  } else if (required_barrier_review_controls.length === 0) {
    errors.push('REQUIRED_BARRIER_REVIEW_CONTROLS_EMPTY');
  } else {
    const requiredSet = new Set(REQUIRED_CONTROLS);
    const foundControls = new Set();
    let hasMissing = false;

    for (const control of required_barrier_review_controls) {
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
      status: STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_execution_barrier_review_id,
    unlock_decision_evidence_receipt_id,
    unlock_decision_evidence_receipt_ready,
    barrier_review_actor,
    barrier_review_reason,
    barrier_review_mode,
    barrier_review_items,
    required_barrier_review_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_READY,
    errors: [],
    hash,
    final_execution_barrier_reviewed: false,
    final_execution_barrier_granted: false,
    final_real_execution_barrier_lifted: false,
    real_release_execution_allowed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_READY) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'final_execution_barrier_reviewed',
    'final_execution_barrier_granted',
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
  if (status === STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_READY) {
    output.final_execution_barrier_reviewed = data.final_execution_barrier_reviewed;
    output.final_execution_barrier_granted = data.final_execution_barrier_granted;
    output.final_real_execution_barrier_lifted = data.final_real_execution_barrier_lifted;
    output.real_release_execution_allowed = data.real_release_execution_allowed;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}