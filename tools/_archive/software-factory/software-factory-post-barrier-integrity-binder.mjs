import { createHash } from 'crypto';

const MODULE_NAME = 'software-factory-post-barrier-integrity-binder';
const MODULE_VERSION = 'V452';

// STATUSES
export const STATUSES = {
  POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT: 'POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT',
  POST_BARRIER_INTEGRITY_BINDER_BLOCKED_REVALIDATION: 'POST_BARRIER_INTEGRITY_BINDER_BLOCKED_REVALIDATION',
  POST_BARRIER_INTEGRITY_BINDER_FAIL: 'POST_BARRIER_INTEGRITY_BINDER_FAIL',
  POST_BARRIER_INTEGRITY_BINDER_READY: 'POST_BARRIER_INTEGRITY_BINDER_READY',
};

// Required fields
const REQUIRED_FIELDS = [
  'post_barrier_integrity_binder_id',
  'release_readiness_revalidation_contract_id',
  'release_readiness_revalidation_contract_ready',
  'integrity_requested_by',
  'integrity_reason',
  'integrity_mode',
  'integrity_items',
  'required_integrity_controls',
];

const ALLOWED_INTEGRITY_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_INTEGRITY_TYPES = [
  'release_post_barrier_integrity',
  'deploy_post_barrier_integrity',
  'tag_post_barrier_integrity',
  'stable_post_barrier_integrity',
  'artifact_post_barrier_integrity',
  'production_post_barrier_integrity',
  'billing_post_barrier_integrity',
  'secret_post_barrier_integrity',
  'network_post_barrier_integrity',
  'rollback_post_barrier_integrity',
  'operator_post_barrier_integrity',
  'emergency_stop_post_barrier_integrity',
];

const REQUIRED_CONTROLS = [
  'post-barrier-integrity-required',
  'release-readiness-revalidation-required',
  'metadata-only-integrity',
  'post-barrier-integrity-not-bound',
  'post-barrier-integrity-not-verified',
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
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['INPUT_IS_NULL'],
      hash: null,
    };
  }

  // Check if input is an object (not array)
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT,
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
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors,
      hash: null,
    };
  }

  const {
    post_barrier_integrity_binder_id,
    release_readiness_revalidation_contract_id,
    release_readiness_revalidation_contract_ready,
    integrity_requested_by,
    integrity_reason,
    integrity_mode,
    integrity_items,
    required_integrity_controls,
  } = input;

  // Validate release_readiness_revalidation_contract_ready is boolean
  if (typeof release_readiness_revalidation_contract_ready !== 'boolean') {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['INVALID_RELEASE_READINESS_REVALIDATION_CONTRACT_READY'],
      hash: null,
    };
  }

  // If V451 is not ready, block
  if (release_readiness_revalidation_contract_ready === false) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_REVALIDATION,
      errors: ['RELEASE_READINESS_REVALIDATION_CONTRACT_NOT_READY'],
      hash: null,
    };
  }

  // Validate integrity_mode
  if (typeof integrity_mode !== 'string' || !ALLOWED_INTEGRITY_MODES.includes(integrity_mode)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['INVALID_INTEGRITY_MODE'],
      hash: null,
    };
  }

  // Validate integrity_items is an array
  if (!Array.isArray(integrity_items)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['INTEGRITY_ITEMS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Validate each integrity item
  for (const item of integrity_items) {
    if (typeof item !== 'object' || item === null) {
      errors.push('INVALID_INTEGRITY_ITEM_TYPE');
      continue;
    }

    const { integrity_item_id, integrity_type, integrity_mode, integrity_hash } = item;

    if (typeof integrity_item_id !== 'string' || integrity_item_id.trim().length === 0) {
      errors.push('INVALID_INTEGRITY_ITEM_ID');
    }

    if (typeof integrity_type !== 'string' || !ALLOWED_INTEGRITY_TYPES.includes(integrity_type)) {
      errors.push('INVALID_INTEGRITY_TYPE');
    }

    if (typeof integrity_mode !== 'string' || !ALLOWED_INTEGRITY_MODES.includes(integrity_mode)) {
      errors.push('INVALID_ITEM_INTEGRITY_MODE');
    }

    if (typeof integrity_hash !== 'string' || integrity_hash.trim().length === 0) {
      errors.push('INVALID_INTEGRITY_HASH');
    }
  }

  // Validate required_integrity_controls is an array
  if (!Array.isArray(required_integrity_controls)) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT,
      errors: ['REQUIRED_INTEGRITY_CONTROLS_NOT_AN_ARRAY'],
      hash: null,
    };
  }

  // Check all required controls are present
  for (const control of REQUIRED_CONTROLS) {
    if (!required_integrity_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  // If there are validation errors, return FAIL
  if (errors.length > 0) {
    return {
      schema_version: MODULE_VERSION,
      status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_FAIL,
      errors,
      hash: null,
    };
  }

  // Generate deterministic hash when READY
  const hashInput = {
    post_barrier_integrity_binder_id,
    release_readiness_revalidation_contract_id,
    release_readiness_revalidation_contract_ready,
    integrity_requested_by,
    integrity_reason,
    integrity_mode,
    integrity_items,
    required_integrity_controls,
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 64);

  // Prepare integrity_items_verified array
  const integrityItemsVerified = integrity_items.map(item => ({
    id: item.integrity_item_id,
    verified: true,
    timestamp: new Date().toISOString(),
  }));

  // Final message
  const finalMessage = 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.';

  // Return READY state - all critical flags remain false
  return {
    schema_version: MODULE_VERSION,
    status: STATUSES.POST_BARRIER_INTEGRITY_BINDER_READY,
    errors: [],
    hash,
    integrity_items_verified: integrityItemsVerified,
    final_message: finalMessage,
    post_barrier_integrity_bound: false,
    post_barrier_integrity_verified: false,
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
    release_readiness_revalidated: false,
    revalidation_evidence_receipt_published: false,
    final_integrity_reviewed: false,
    hard_stop_lifted: false,
    release_command_armed: false,
  };
}

// Validate function
export function validate(input) {
  const result = build(input);
  if (result.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_READY) {
    return false;
  }
  // Check final_message is correct
  if (result.final_message !== 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.') {
    return false;
  }
  // Check integrity_items_verified has same length as input integrity_items
  if (!Array.isArray(result.integrity_items_verified) || result.integrity_items_verified.length !== input.integrity_items.length) {
    return false;
  }
  // Check all critical flags are false
  const criticalFlags = [
    'post_barrier_integrity_bound',
    'post_barrier_integrity_verified',
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
    'release_readiness_revalidated',
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
  if (status === STATUSES.POST_BARRIER_INTEGRITY_BINDER_READY) {
    output.integrity_items_verified = data.integrity_items_verified;
    output.final_message = data.final_message;
    // All other critical flags are already false by default
  }

  return JSON.stringify(output, null, 2);
}