import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-final-execution-barrier-binder';
const MODULE_VERSION = 'V447';

// STATUSES
export const STATUSES = {
  FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_INPUT: 'FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_INPUT',
  FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_DECISION: 'FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_DECISION',
  FINAL_EXECUTION_BARRIER_BINDER_FAIL: 'FINAL_EXECUTION_BARRIER_BINDER_FAIL',
  FINAL_EXECUTION_BARRIER_BINDER_READY: 'FINAL_EXECUTION_BARRIER_BINDER_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'final_execution_barrier_binder_id',
  'controlled_unlock_decision_contract_id',
  'controlled_unlock_decision_contract_ready',
  'barrier_requested_by',
  'barrier_reason',
  'barrier_mode',
  'barrier_items',
  'required_barrier_controls',
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
  'release_execution_barrier',
  'deploy_execution_barrier',
  'tag_execution_barrier',
  'stable_execution_barrier',
  'artifact_execution_barrier',
  'production_execution_barrier',
  'billing_execution_barrier',
  'secret_execution_barrier',
  'network_execution_barrier',
  'rollback_execution_barrier',
  'operator_execution_barrier',
  'emergency_stop_execution_barrier',
];

const REQUIRED_CONTROLS = [
  'final-execution-barrier-required',
  'controlled-unlock-decision-required',
  'metadata-only-barrier',
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
      status: STATUSES.FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_INPUT,
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
      status: STATUSES.FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    final_execution_barrier_binder_id,
    controlled_unlock_decision_contract_id,
    controlled_unlock_decision_contract_ready,
    barrier_requested_by,
    barrier_reason,
    barrier_mode,
    barrier_items,
    required_barrier_controls,
  } = input;

  // Validate binder ID
  if (typeof final_execution_barrier_binder_id !== 'string' || final_execution_barrier_binder_id.trim().length === 0) {
    errors.push('INVALID_BINDER_ID');
  }

  // Validate contract ID
  if (typeof controlled_unlock_decision_contract_id !== 'string' || controlled_unlock_decision_contract_id.trim().length === 0) {
    errors.push('INVALID_CONTRACT_ID');
  }

  // Check contract_ready
  if (typeof controlled_unlock_decision_contract_ready !== 'boolean') {
    errors.push('INVALID_CONTRACT_READY');
  }

  // If contract_ready is false, return BLOCKED_DECISION
  if (controlled_unlock_decision_contract_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.FINAL_EXECUTION_BARRIER_BINDER_BLOCKED_DECISION,
      errors: ['DECISION_NOT_READY'],
      hash: null,
    };
  }

  // Validate barrier_requested_by
  if (typeof barrier_requested_by !== 'string' || barrier_requested_by.trim().length === 0) {
    errors.push('MISSING_BARRIER_REQUESTED_BY');
  }

  // Validate barrier_reason
  if (typeof barrier_reason !== 'string' || barrier_reason.trim().length === 0) {
    errors.push('MISSING_BARRIER_REASON');
  }

  // Validate barrier_mode
  if (!ALLOWED_BARRIER_MODES.includes(barrier_mode)) {
    errors.push('INVALID_BARRIER_MODE');
  }

  // Validate barrier_items
  if (!Array.isArray(barrier_items)) {
    errors.push('BARRIER_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < barrier_items.length; i++) {
      const item = barrier_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`BARRIER_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('barrier_item_id') || typeof item.barrier_item_id !== 'string' || item.barrier_item_id.trim().length === 0) {
        errors.push(`BARRIER_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('barrier_type') || !ALLOWED_BARRIER_TYPES.includes(item.barrier_type)) {
        errors.push(`BARRIER_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('barrier_mode') || !ALLOWED_BARRIER_MODES.includes(item.barrier_mode)) {
        errors.push(`BARRIER_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('barrier_hash') || typeof item.barrier_hash !== 'string' || item.barrier_hash.length !== 64) {
        errors.push(`BARRIER_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_barrier_controls
  if (!Array.isArray(required_barrier_controls)) {
    errors.push('REQUIRED_BARRIER_CONTROLS_NOT_AN_ARRAY');
  } else if (required_barrier_controls.length === 0) {
    errors.push('REQUIRED_BARRIER_CONTROLS_EMPTY');
  } else {
    const requiredSet = new Set(REQUIRED_CONTROLS);
    const foundControls = new Set();
    let hasMissing = false;

    for (const control of required_barrier_controls) {
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
      status: STATUSES.FINAL_EXECUTION_BARRIER_BINDER_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    final_execution_barrier_binder_id,
    controlled_unlock_decision_contract_id,
    controlled_unlock_decision_contract_ready,
    barrier_requested_by,
    barrier_reason,
    barrier_mode,
    barrier_items,
    required_barrier_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.FINAL_EXECUTION_BARRIER_BINDER_READY,
    errors: [],
    hash,
    final_execution_barrier_bound: false,
    final_execution_barrier_verified: false,
    final_real_execution_barrier_lifted: false,
    real_release_execution_allowed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.FINAL_EXECUTION_BARRIER_BINDER_READY) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'final_execution_barrier_bound',
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
  if (status === STATUSES.FINAL_EXECUTION_BARRIER_BINDER_READY) {
    output.final_execution_barrier_bound = data.final_execution_barrier_bound;
    output.final_execution_barrier_verified = data.final_execution_barrier_verified;
    output.final_real_execution_barrier_lifted = data.final_real_execution_barrier_lifted;
    output.real_release_execution_allowed = data.real_release_execution_allowed;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}