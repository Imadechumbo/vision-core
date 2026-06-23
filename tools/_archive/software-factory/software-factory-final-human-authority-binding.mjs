import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'FINAL_HUMAN_AUTHORITY_BINDING_BLOCKED_INPUT',
  BLOCKED_DECISION: 'FINAL_HUMAN_AUTHORITY_BINDING_BLOCKED_DECISION',
  FAIL: 'FINAL_HUMAN_AUTHORITY_BINDING_FAIL',
  READY: 'FINAL_HUMAN_AUTHORITY_BINDING_READY',
};

const REQUIRED_CONTROLS = [
  'final-human-authority-required',
  'decision-contract-required',
  'no-authority-grant',
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
  'pass-gold-real-required',
  'audit-required',
];

const ALLOWED_AUTHORITY_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_AUTHORITY_TYPES = new Set([
  'human_operator', 'release_manager', 'security_reviewer', 'governance_reviewer',
  'pass_gold_reviewer', 'rollback_reviewer', 'production_reviewer', 'emergency_stop_reviewer',
]);

const HEX64 = /^[0-9a-f]{64}$/;

const BASE = {
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
  supervised_release_drill_phase_passed: false,
  real_release_execution_decision_received: false,
  final_human_authority_bound: false,
  final_human_authority_granted: false,
  pass_gold_real_evidence_revalidated: false,
  production_release_command_locked: false,
  production_release_command_executed: false,
  real_release_execution_final_barrier_passed: false,
  real_release_execution_authorized: false,
  real_release_execution_allowed: false,
};

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: ['input required'],
      schema_version: 'v397',
    };
  }

  const {
    final_human_authority_binding_id,
    real_release_execution_decision_contract_id,
    real_release_execution_decision_contract_ready,
    authority_id,
    authority_actor,
    authority_reason,
    authority_mode,
    authority_items = [],
    required_authority_controls = [],
  } = input;

  if (
    !final_human_authority_binding_id ||
    !real_release_execution_decision_contract_id ||
    !authority_id ||
    !authority_actor ||
    !authority_reason ||
    !authority_mode
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'final_human_authority_binding_id, real_release_execution_decision_contract_id, authority_id, authority_actor, authority_reason, authority_mode required',
      ],
      schema_version: 'v397',
    };
  }

  if (!real_release_execution_decision_contract_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_DECISION,
      errors: ['real_release_execution_decision_contract_ready must be true'],
      schema_version: 'v397',
    };
  }

  const errors = [];

  if (!ALLOWED_AUTHORITY_MODES.has(authority_mode)) {
    errors.push(`invalid authority_mode: ${authority_mode}`);
  }

  if (!Array.isArray(authority_items) || authority_items.length === 0) {
    errors.push('authority_items must be non-empty array');
  } else {
    for (const item of authority_items) {
      if (!item.authority_item_id) errors.push('authority_item missing authority_item_id');
      if (!ALLOWED_AUTHORITY_TYPES.has(item.authority_type)) {
        errors.push(`invalid authority_type: ${item.authority_type}`);
      }
      if (!ALLOWED_AUTHORITY_MODES.has(item.authority_mode)) {
        errors.push(`invalid item authority_mode: ${item.authority_mode}`);
      }
      if (!HEX64.test(item.authority_hash)) {
        errors.push(`invalid authority_hash for ${item.authority_item_id}`);
      }
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_authority_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v397',
    };
  }

  const hash = createHash('sha256')
    .update(final_human_authority_binding_id)
    .update(real_release_execution_decision_contract_id)
    .update(authority_mode)
    .update(JSON.stringify(authority_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v397',
    final_human_authority_binding_id,
    real_release_execution_decision_contract_id,
    authority_id,
    authority_actor,
    authority_reason,
    authority_mode,
    authority_items,
    required_authority_controls,
    hash,
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) return false;
  if (!HEX64.test(result.hash)) return false;
  return true;
}

export function render(result) {
  if (!result) {
    return 'FinalHumanAuthorityBinding: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'FinalHumanAuthorityBinding',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  final_human_authority_bound: ${result.final_human_authority_bound}`,
    `  final_human_authority_granted: ${result.final_human_authority_granted}`,
    `  real_release_execution_authorized: ${result.real_release_execution_authorized}`,
    `  real_release_execution_allowed: ${result.real_release_execution_allowed}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
