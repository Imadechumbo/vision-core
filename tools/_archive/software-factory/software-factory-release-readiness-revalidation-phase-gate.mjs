import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-release-readiness-revalidation-phase-gate';
const MODULE_VERSION = 'V455';

// STATUSES
export const STATUSES = {
  RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_INPUT: 'RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_INPUT',
  RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_REVIEW: 'RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_REVIEW',
  RELEASE_READINESS_REVALIDATION_PHASE_GATE_INCOMPLETE: 'RELEASE_READINESS_REVALIDATION_PHASE_GATE_INCOMPLETE',
  RELEASE_READINESS_REVALIDATION_PHASE_GATE_READY: 'RELEASE_READINESS_REVALIDATION_PHASE_GATE_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'release_readiness_revalidation_phase_gate_id',
  'final_integrity_review_gate_id',
  'final_integrity_review_gate_ready',
  'ids',
  'phase_summary',
];

const REQUIRED_MODULE_IDS = [
  'release_readiness_revalidation_contract',
  'post_barrier_integrity_binder',
  'revalidation_evidence_receipt',
  'final_integrity_review_gate',
];

// Build function
export function build(input) {
  const errors = [];

  // Check for null or undefined input
  if (input === null || input === undefined) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_INPUT,
      errors: ['INPUT_IS_NOT_AN_OBJECT'],
      hash: null,
    };
  }

  // Check all required fields are present
  for (const field of REQUIRED_FIELDS) {
    if (!input.hasOwnProperty(field)) {
      errors.push(`MISSING_REQUIRED_FIELD: ${field}`);
    }
  }

  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    release_readiness_revalidation_phase_gate_id,
    final_integrity_review_gate_id,
    final_integrity_review_gate_ready,
    ids,
    phase_summary,
  } = input;

  // Validate final_integrity_review_gate_ready is boolean
  if (typeof final_integrity_review_gate_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_INPUT,
      errors: ['INVALID_FINAL_INTEGRITY_REVIEW_GATE_READY'],
      hash: null,
    };
  }

  // If V454 is not ready, block
  if (final_integrity_review_gate_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_REVIEW,
      errors: ['FINAL_INTEGRITY_REVIEW_GATE_NOT_READY'],
      hash: null,
    };
  }

  // Validate ids is an object
  if (typeof ids !== 'object' || ids === null || Array.isArray(ids)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_BLOCKED_INPUT,
      errors: ['IDS_NOT_AN_OBJECT'],
      hash: null,
    };
  }

  // Check required module IDs
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
      status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_INCOMPLETE,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    release_readiness_revalidation_phase_gate_id,
    final_integrity_review_gate_id,
    final_integrity_review_gate_ready,
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
  const finalMessage = 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_READY,
    errors: [],
    hash,
    modules_verified: modulesVerified,
    final_message: finalMessage,
    release_readiness_revalidation_phase_passed: false,
    post_barrier_execution_authorized: false,
    final_integrity_granted: false,
    final_real_execution_barrier_lifted: false,
    real_release_execution_allowed: false,
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
    controlled_unlock_decision_phase_passed: false,
    final_execution_barrier_granted: false,
    release_readiness_revalidated: false,
    post_barrier_integrity_bound: false,
    post_barrier_integrity_verified: false,
    revalidation_evidence_receipt_published: false,
    final_integrity_reviewed: false,
    hard_stop_lifted: false,
    release_command_armed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.') {
    return false;
  }
  // Check modules_verified has exactly 4 entries
  if (!Array.isArray(result.modules_verified) || result.modules_verified.length !== 4) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'release_readiness_revalidation_phase_passed',
    'post_barrier_execution_authorized',
    'final_integrity_granted',
    'final_real_execution_barrier_lifted',
    'real_release_execution_allowed',
    'real_release_executed',
    'real_deploy_executed',
    'real_tag_created',
    'real_stable_promoted',
    'artifact_published',
    'production_touched',
    'billing_executed',
    'secrets_accessed',
    'network_accessed',
    'rollback_executed',
    'controlled_unlock_decision_phase_passed',
    'final_execution_barrier_granted',
    'release_readiness_revalidated',
    'post_barrier_integrity_bound',
    'post_barrier_integrity_verified',
    'revalidation_evidence_receipt_published',
    'final_integrity_reviewed',
    'hard_stop_lifted',
    'release_command_armed',
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
  if (status === STATUSES.RELEASE_READINESS_REVALIDATION_PHASE_GATE_READY) {
    output.modules_verified = data.modules_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}