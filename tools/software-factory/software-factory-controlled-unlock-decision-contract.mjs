import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-controlled-unlock-decision-contract';
const MODULE_VERSION = 'V446';

// STATUSES
export const STATUSES = {
  CONTROLLED_UNLOCK_DECISION_BLOCKED_INPUT: 'CONTROLLED_UNLOCK_DECISION_BLOCKED_INPUT',
  CONTROLLED_UNLOCK_DECISION_BLOCKED_UNLOCK_REQUEST_PHASE: 'CONTROLLED_UNLOCK_DECISION_BLOCKED_UNLOCK_REQUEST_PHASE',
  CONTROLLED_UNLOCK_DECISION_FAIL: 'CONTROLLED_UNLOCK_DECISION_FAIL',
  CONTROLLED_UNLOCK_DECISION_READY: 'CONTROLLED_UNLOCK_DECISION_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'controlled_unlock_decision_contract_id',
  'controlled_release_unlock_request_phase_gate_id',
  'controlled_release_unlock_request_phase_gate_ready',
  'unlock_decision_requested_by',
  'unlock_decision_reason',
  'unlock_decision_mode',
  'unlock_decision_items',
  'required_unlock_decision_controls',
];

const ALLOWED_DECISION_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_DECISION_TYPES = [
  'release_unlock_decision',
  'deploy_unlock_decision',
  'tag_unlock_decision',
  'stable_unlock_decision',
  'artifact_unlock_decision',
  'production_unlock_decision',
  'billing_unlock_decision',
  'secret_unlock_decision',
  'network_unlock_decision',
  'rollback_unlock_decision',
  'operator_unlock_decision',
  'emergency_stop_unlock_decision',
];

const REQUIRED_CONTROLS = [
  'controlled-unlock-decision-required',
  'controlled-release-unlock-request-phase-required',
  'metadata-only-unlock-decision',
  'unlock-decision-not-recorded',
  'controlled-release-not-unlocked',
  'final-execution-barrier-not-lifted',
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
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_BLOCKED_INPUT,
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
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    controlled_unlock_decision_contract_id,
    controlled_release_unlock_request_phase_gate_id,
    controlled_release_unlock_request_phase_gate_ready,
    unlock_decision_requested_by,
    unlock_decision_reason,
    unlock_decision_mode,
    unlock_decision_items,
    required_unlock_decision_controls,
  } = input;

  // Validate contract ID
  if (typeof controlled_unlock_decision_contract_id !== 'string' || controlled_unlock_decision_contract_id.trim().length === 0) {
    errors.push('INVALID_CONTRACT_ID');
  }

  // Validate phase_gate_id
  if (typeof controlled_release_unlock_request_phase_gate_id !== 'string' || controlled_release_unlock_request_phase_gate_id.trim().length === 0) {
    errors.push('INVALID_PHASE_GATE_ID');
  }

  // Check phase_gate_ready
  if (typeof controlled_release_unlock_request_phase_gate_ready !== 'boolean') {
    errors.push('INVALID_PHASE_GATE_READY');
  }

  // If phase_gate_ready is false, return BLOCKED_UNLOCK_REQUEST_PHASE
  if (controlled_release_unlock_request_phase_gate_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_BLOCKED_UNLOCK_REQUEST_PHASE,
      errors: ['PHASE_GATE_NOT_READY'],
      hash: null,
    };
  }

  // Validate unlock_decision_requested_by
  if (typeof unlock_decision_requested_by !== 'string' || unlock_decision_requested_by.trim().length === 0) {
    errors.push('MISSING_DECISION_REQUESTED_BY');
  }

  // Validate unlock_decision_reason
  if (typeof unlock_decision_reason !== 'string' || unlock_decision_reason.trim().length === 0) {
    errors.push('MISSING_DECISION_REASON');
  }

  // Validate unlock_decision_mode
  if (!ALLOWED_DECISION_MODES.includes(unlock_decision_mode)) {
    errors.push('INVALID_DECISION_MODE');
  }

  // Validate unlock_decision_items
  if (!Array.isArray(unlock_decision_items)) {
    errors.push('UNLOCK_DECISION_ITEMS_NOT_AN_ARRAY');
  } else {
    for (let i = 0; i < unlock_decision_items.length; i++) {
      const item = unlock_decision_items[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push(`UNLOCK_DECISION_ITEM_${i}_IS_NOT_AN_OBJECT`);
        continue;
      }

      if (!item.hasOwnProperty('unlock_decision_item_id') || typeof item.unlock_decision_item_id !== 'string' || item.unlock_decision_item_id.trim().length === 0) {
        errors.push(`UNLOCK_DECISION_ITEM_${i}_MISSING_ID`);
      }

      if (!item.hasOwnProperty('unlock_decision_type') || !ALLOWED_DECISION_TYPES.includes(item.unlock_decision_type)) {
        errors.push(`UNLOCK_DECISION_ITEM_${i}_INVALID_TYPE`);
      }

      if (!item.hasOwnProperty('unlock_decision_mode') || !ALLOWED_DECISION_MODES.includes(item.unlock_decision_mode)) {
        errors.push(`UNLOCK_DECISION_ITEM_${i}_INVALID_MODE`);
      }

      if (!item.hasOwnProperty('unlock_decision_hash') || typeof item.unlock_decision_hash !== 'string' || item.unlock_decision_hash.length !== 64) {
        errors.push(`UNLOCK_DECISION_ITEM_${i}_INVALID_HASH`);
      }
    }
  }

  // Validate required_unlock_decision_controls
  if (!Array.isArray(required_unlock_decision_controls)) {
    errors.push('REQUIRED_UNLOCK_DECISION_CONTROLS_NOT_AN_ARRAY');
  } else if (required_unlock_decision_controls.length === 0) {
    errors.push('REQUIRED_UNLOCK_DECISION_CONTROLS_EMPTY');
  } else {
    const requiredSet = new Set(REQUIRED_CONTROLS);
    const foundControls = new Set();
    let hasMissing = false;

    for (const control of required_unlock_decision_controls) {
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
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    controlled_unlock_decision_contract_id,
    controlled_release_unlock_request_phase_gate_id,
    controlled_release_unlock_request_phase_gate_ready,
    unlock_decision_requested_by,
    unlock_decision_reason,
    unlock_decision_mode,
    unlock_decision_items,
    required_unlock_decision_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.CONTROLLED_UNLOCK_DECISION_READY,
    errors: [],
    hash,
    controlled_unlock_decision_recorded: false,
    controlled_release_execution_unlocked: false,
    final_real_execution_barrier_lifted: false,
    real_release_execution_allowed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.CONTROLLED_UNLOCK_DECISION_READY) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'controlled_unlock_decision_recorded',
    'controlled_release_execution_unlocked',
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
  if (status === STATUSES.CONTROLLED_UNLOCK_DECISION_READY) {
    output.controlled_unlock_decision_recorded = data.controlled_unlock_decision_recorded;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}