import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-release-readiness-revalidation-contract';
const MODULE_VERSION = 'V451';

// STATUSES
export const STATUSES = {
  RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT: 'RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT',
  RELEASE_READINESS_REVALIDATION_BLOCKED_UNLOCK_DECISION: 'RELEASE_READINESS_REVALIDATION_BLOCKED_UNLOCK_DECISION',
  RELEASE_READINESS_REVALIDATION_FAIL: 'RELEASE_READINESS_REVALIDATION_FAIL',
  RELEASE_READINESS_REVALIDATION_READY: 'RELEASE_READINESS_REVALIDATION_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'release_readiness_revalidation_contract_id',
  'controlled_unlock_decision_phase_gate_id',
  'controlled_unlock_decision_phase_gate_ready',
  'revalidation_requested_by',
  'revalidation_reason',
  'revalidation_mode',
  'revalidation_items',
  'required_revalidation_controls',
];

const ALLOWED_REVALIDATION_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_REVALIDATION_TYPES = [
  'release_readiness_revalidation',
  'deploy_readiness_revalidation',
  'tag_readiness_revalidation',
  'stable_readiness_revalidation',
  'artifact_readiness_revalidation',
  'production_readiness_revalidation',
  'billing_readiness_revalidation',
  'secret_readiness_revalidation',
  'network_readiness_revalidation',
  'rollback_readiness_revalidation',
  'operator_readiness_revalidation',
  'emergency_stop_readiness_revalidation',
];

const REQUIRED_CONTROLS = [
  'release-readiness-revalidation-required',
  'controlled-unlock-decision-phase-required',
  'metadata-only-revalidation',
  'readiness-not-revalidated',
  'post-barrier-execution-not-authorized',
  'final-real-execution-barrier-not-lifted',
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
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT,
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
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    release_readiness_revalidation_contract_id,
    controlled_unlock_decision_phase_gate_id,
    controlled_unlock_decision_phase_gate_ready,
    revalidation_requested_by,
    revalidation_reason,
    revalidation_mode,
    revalidation_items,
    required_revalidation_controls,
  } = input;

  // Validate controlled_unlock_decision_phase_gate_ready is boolean
  if (typeof controlled_unlock_decision_phase_gate_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT,
      errors: ['INVALID_CONTROLLED_UNLOCK_DECISION_PHASE_GATE_READY'],
      hash: null,
    };
  }

  // If V450 is not ready, block
  if (controlled_unlock_decision_phase_gate_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_UNLOCK_DECISION,
      errors: ['CONTROLLED_UNLOCK_DECISION_PHASE_GATE_NOT_READY'],
      hash: null,
    };
  }

  // Validate revalidation_mode
  if (typeof revalidation_mode !== 'string' || !ALLOWED_REVALIDATION_MODES.includes(revalidation_mode)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT,
      errors: ['INVALID_REVALIDATION_MODE'],
      hash: null,
    };
  }

  // Validate revalidation_items is an array
  if (!Array.isArray(revalidation_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT,
      errors: ['REVALIDATION_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each revalidation item
  for (const item of revalidation_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_REVALIDATION_ITEM_TYPE');
      continue;
    }

    const { revalidation_item_id, revalidation_type, revalidation_mode, revalidation_hash } = item;

    if (typeof revalidation_item_id !== 'string' || revalidation_item_id.trim().length === 0) {
      errors.push('INVALID_REVALIDATION_ITEM_ID');
    }

    if (typeof revalidation_type !== 'string' || !ALLOWED_REVALIDATION_TYPES.includes(revalidation_type)) {
      errors.push('INVALID_REVALIDATION_TYPE');
    }

    if (typeof revalidation_mode !== 'string' || !ALLOWED_REVALIDATION_MODES.includes(revalidation_mode)) {
      errors.push('INVALID_ITEM_REVALIDATION_MODE');
    }

    if (typeof revalidation_hash !== 'string' || revalidation_hash.trim().length === 0) {
      errors.push('INVALID_REVALIDATION_HASH');
    }
  }

  // Validate required_revalidation_controls is an array
  if (!Array.isArray(required_revalidation_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT,
      errors: ['REQUIRED_REVALIDATION_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_revalidation_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.RELEASE_READINESS_REVALIDATION_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    release_readiness_revalidation_contract_id,
    controlled_unlock_decision_phase_gate_id,
    controlled_unlock_decision_phase_gate_ready,
    revalidation_requested_by,
    revalidation_reason,
    revalidation_mode,
    revalidation_items,
    required_revalidation_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare revalidation_items_verified array
  const revalidationItemsVerified = revalidation_items.map(item => ({
    id: item.revalidation_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.RELEASE_READINESS_REVALIDATION_READY,
    errors: [],
    hash,
    revalidation_items_verified: revalidationItemsVerified,
    final_message: finalMessage,
    release_readiness_revalidated: false,
    post_barrier_execution_authorized: false,
    final_real_execution_barrier_lifted: false,
    controlled_release_execution_unlocked: false,
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
    final_integrity_granted: false,
    final_integrity_reviewed: false,
    release_readiness_revalidation_phase_passed: false,
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
  if (result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.') {
    return false;
  }
  // Check revalidation_items_verified has same length as input revalidation_items
  if (!Array.isArray(result.revalidation_items_verified) || result.revalidation_items_verified.length !== input.revalidation_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'release_readiness_revalidated',
    'post_barrier_execution_authorized',
    'final_real_execution_barrier_lifted',
    'controlled_release_execution_unlocked',
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
    'final_integrity_granted',
    'final_integrity_reviewed',
    'release_readiness_revalidation_phase_passed',
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
  if (status === STATUSES.RELEASE_READINESS_REVALIDATION_READY) {
    output.revalidation_items_verified = data.revalidation_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}