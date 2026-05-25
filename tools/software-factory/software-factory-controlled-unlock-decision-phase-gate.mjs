import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-controlled-unlock-decision-phase-gate';
const MODULE_VERSION = 'V450';

// STATUSES
export const STATUSES = {
  CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_INPUT: 'CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_INPUT',
  CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_REVIEW: 'CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_REVIEW',
  CONTROLLED_UNLOCK_DECISION_PHASE_GATE_INCOMPLETE: 'CONTROLLED_UNLOCK_DECISION_PHASE_GATE_INCOMPLETE',
  CONTROLLED_UNLOCK_DECISION_PHASE_GATE_READY: 'CONTROLLED_UNLOCK_DECISION_PHASE_GATE_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'controlled_unlock_decision_phase_gate_id',
  'final_execution_barrier_review_id',
  'final_execution_barrier_review_ready',
  'ids',
  'phase_summary',
];

const REQUIRED_MODULE_IDS = [
  'controlled_unlock_decision_contract',
  'final_execution_barrier_binder',
  'unlock_decision_evidence_receipt',
  'final_execution_barrier_review',
];

// Build function
export function build(input) {
  const errors = [];

  // Check for null or undefined input
  if (input === null || input === undefined) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_INPUT,
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
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    controlled_unlock_decision_phase_gate_id,
    final_execution_barrier_review_id,
    final_execution_barrier_review_ready,
    ids,
    phase_summary,
  } = input;

  // Validate phase_gate_id
  if (typeof controlled_unlock_decision_phase_gate_id !== 'string' || controlled_unlock_decision_phase_gate_id.trim().length === 0) {
    errors.push('INVALID_PHASE_GATE_ID');
  }

  // Validate review_id
  if (typeof final_execution_barrier_review_id !== 'string' || final_execution_barrier_review_id.trim().length === 0) {
    errors.push('INVALID_REVIEW_ID');
  }

  // Check review_ready
  if (typeof final_execution_barrier_review_ready !== 'boolean') {
    errors.push('INVALID_REVIEW_READY');
  }

  // If review_ready is false, return BLOCKED_REVIEW
  if (final_execution_barrier_review_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_REVIEW,
      errors: ['REVIEW_NOT_READY'],
      hash: null,
    };
  }

  // Validate ids
  if (typeof ids !== 'object' || ids === null || Array.isArray(ids)) {
    errors.push('IDS_NOT_AN_OBJECT');
  } else {
    for (const requiredId of REQUIRED_MODULE_IDS) {
      if (!ids.hasOwnProperty(requiredId)) {
        errors.push(`MISSING_REQUIRED_ID: ${requiredId}`);
      } else if (typeof ids[requiredId] !== 'string' || ids[requiredId].trim().length === 0) {
        errors.push(`INVALID_${requiredId.toUpperCase().replace(/-/g, '_')}_ID`);
      }
    }
  }

  // Validate phase_summary
  if (typeof phase_summary !== 'string' || phase_summary.trim().length === 0) {
    errors.push('INVALID_PHASE_SUMMARY');
  }

  // If there are validation errors, return INCOMPLETE
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_INCOMPLETE,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    controlled_unlock_decision_phase_gate_id,
    final_execution_barrier_review_id,
    final_execution_barrier_review_ready,
    ids,
    phase_summary,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare modules_verified array
  const modulesVerified = REQUIRED_MODULE_IDS.map(id => ({
    id: id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V446-V450 controlled release execution unlock decision and final execution barrier complete. Real release execution remains blocked until explicit V451 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_READY,
    errors: [],
    hash,
    modules_verified: modulesVerified,
    final_message: finalMessage,
    controlled_unlock_decision_phase_passed: false,
    final_real_execution_barrier_lifted: false,
    final_execution_barrier_granted: false,
    controlled_release_execution_unlocked: false,
    real_release_execution_allowed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V446-V450 controlled release execution unlock decision and final execution barrier complete. Real release execution remains blocked until explicit V451 command.') {
    return false;
  }
  // Check modules_verified has exactly 4 entries
  if (!Array.isArray(result.modules_verified) || result.modules_verified.length !== 4) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'controlled_unlock_decision_phase_passed',
    'final_real_execution_barrier_lifted',
    'final_execution_barrier_granted',
    'controlled_release_execution_unlocked',
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
  if (status === STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_READY) {
    output.modules_verified = data.modules_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}