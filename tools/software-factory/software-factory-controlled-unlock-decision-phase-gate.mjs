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

  const {
    controlled_unlock_decision_phase_gate_id,
    final_execution_barrier_review_id,
    final_execution_barrier_review_ready,
    ids,
    phase_summary,
  } = input;

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
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_INPUT,
      errors: ['INVALID_REVIEW_READY'],
      hash: null,
    };
  } else if (final_execution_barrier_review_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_REVIEW,
      errors: ['REVIEW_NOT_READY'],
      hash: null,
    };
  }

  // Validate ids
  if (typeof ids !== 'object' || ids === null || Array.isArray(ids)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_UNLOCK_DECISION_PHASE_GATE_BLOCKED_INPUT,
      errors: ['IDS_NOT_AN_OBJECT'],
      hash: null,
    };
  }

  // Check for missing required module IDs
  for (const requiredId of REQUIRED_MODULE_IDS) {
    if (!ids.hasOwnProperty(requiredId)) {
      errors.push(`MISSING_REQUIRED_ID: ${requiredId}`);
    } else if (typeof ids[requiredId] !== 'string' || ids[requiredId].trim().length === 0) {
      errors.push(`INVALID_${requiredId.toUpperCase().replace(/-/g, '_')}_ID`);
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