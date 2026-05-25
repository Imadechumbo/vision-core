import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-controlled-release-unlock-request-phase-gate';
const MODULE_VERSION = 'V445';

// STATUSES
export const STATUSES = {
  CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT',
  CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_REVIEW: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_REVIEW',
  CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE',
  CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_READY: 'CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'controlled_release_unlock_request_phase_gate_id',
  'final_unlock_authority_review_id',
  'final_unlock_authority_review_ready',
  'ids',
  'phase_summary',
];

const REQUIRED_MODULE_IDS = [
  'controlled_release_unlock_request_contract',
  'final_release_interlock_binder',
  'unlock_request_evidence_receipt',
  'final_unlock_authority_review',
];

// Build function
export function build(input) {
  const errors = [];

  // Check for null or undefined input
  if (input === null || input === undefined) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check for empty object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT,
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
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    controlled_release_unlock_request_phase_gate_id,
    final_unlock_authority_review_id,
    final_unlock_authority_review_ready,
    ids,
    phase_summary,
  } = input;

  // Validate phase_gate_id
  if (typeof controlled_release_unlock_request_phase_gate_id !== 'string' || controlled_release_unlock_request_phase_gate_id.trim().length === 0) {
    errors.push('INVALID_PHASE_GATE_ID');
  }

  // Validate final_unlock_authority_review_id
  if (typeof final_unlock_authority_review_id !== 'string' || final_unlock_authority_review_id.trim().length === 0) {
    errors.push('INVALID_REVIEW_ID');
  }

// Check final_unlock_authority_review_ready
if (typeof final_unlock_authority_review_ready !== 'boolean') {
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT,
    errors: ['INVALID_REVIEW_READY'],
    hash: null,
  };
} else if (final_unlock_authority_review_ready === false) {
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_REVIEW,
    errors: ['REVIEW_NOT_READY'],
    hash: null,
  };
}

// Validate ids
if (typeof ids !== 'object' || ids === null || Array.isArray(ids)) {
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT,
    errors: ['IDS_NOT_AN_OBJECT'],
    hash: null,
  };
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
      status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    controlled_release_unlock_request_phase_gate_id,
    final_unlock_authority_review_id,
    final_unlock_authority_review_ready,
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
  const finalMessage = 'V441-V445 controlled release execution unlock request and final release interlock complete. Real release execution remains blocked until explicit V446 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_READY,
    errors: [],
    hash,
    modules_verified: modulesVerified,
    final_message: finalMessage,
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
  if (result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V441-V445 controlled release execution unlock request and final release interlock complete. Real release execution remains blocked until explicit V446 command.') {
    return false;
  }
  // Check modules_verified has exactly 4 entries
  if (!Array.isArray(result.modules_verified) || result.modules_verified.length !== 4) {
    return false;
  }
  // All critical flags must be false
  const criticalFlags = [
    'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
    'real_execution_allowed', 'real_release_executed', 'real_deploy_executed',
    'real_tag_created', 'real_stable_promoted', 'artifact_published',
    'production_touched', 'billing_executed', 'secrets_accessed',
    'network_accessed', 'rollback_executed', 'controlled_execution_lock_phase_passed',
    'controlled_real_release_execution_unlocked', 'final_controlled_execution_granted',
    'real_release_execution_allowed', 'real_release_hard_stop_lifted',
    'real_release_command_armed', 'controlled_release_unlock_requested',
    'final_release_interlock_bound', 'final_release_interlock_verified',
    'unlock_request_evidence_receipt_published', 'final_unlock_authority_reviewed',
    'final_unlock_authority_granted', 'controlled_release_unlock_request_phase_passed',
    'controlled_release_execution_unlocked',
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
  if (status === STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_READY) {
    output.modules_verified = data.modules_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}