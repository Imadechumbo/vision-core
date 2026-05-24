import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'OPERATOR_CHECKLIST_BINDER_BLOCKED_INPUT',
  BLOCKED_DRY_RUN: 'OPERATOR_CHECKLIST_BINDER_BLOCKED_DRY_RUN',
  FAIL: 'OPERATOR_CHECKLIST_BINDER_FAIL',
  READY: 'OPERATOR_CHECKLIST_BINDER_READY',
};

const REQUIRED_CONTROLS = [
  'operator-checklist-required',
  'dry-run-command-required',
  'checklist-not-approved',
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

const ALLOWED_CHECKLIST_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_CHECKLIST_TYPES = new Set([
  'operator_identity_check', 'release_scope_check', 'pass_gold_check',
  'rollback_check', 'environment_check', 'artifact_check', 'production_check',
  'billing_check', 'secret_check', 'network_check', 'emergency_stop_check',
  'final_confirmation_check',
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
  real_release_execution_final_barrier_passed: false,
  real_release_execution_authorized: false,
  real_release_execution_allowed: false,
  real_release_command_dry_run_received: false,
  operator_checklist_bound: false,
  operator_checklist_approved: false,
  release_environment_readiness_confirmed: false,
  final_command_simulation_report_published: false,
  operator_go_no_go_phase_passed: false,
  operator_go_decision_granted: false,
  real_release_command_executed: false,
};

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: ['input required'],
      schema_version: 'v402',
    };
  }

  const {
    operator_checklist_binder_id,
    real_release_command_dry_run_contract_id,
    real_release_command_dry_run_contract_ready,
    operator_id,
    operator_role,
    checklist_reason,
    checklist_mode,
    checklist_items = [],
    required_checklist_controls = [],
  } = input;

  if (
    !operator_checklist_binder_id ||
    !real_release_command_dry_run_contract_id ||
    !operator_id ||
    !operator_role ||
    !checklist_reason ||
    !checklist_mode
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'operator_checklist_binder_id, real_release_command_dry_run_contract_id, operator_id, operator_role, checklist_reason, checklist_mode required',
      ],
      schema_version: 'v402',
    };
  }

  if (!real_release_command_dry_run_contract_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_DRY_RUN,
      errors: ['real_release_command_dry_run_contract_ready must be true'],
      schema_version: 'v402',
    };
  }

  const errors = [];

  if (!ALLOWED_CHECKLIST_MODES.has(checklist_mode)) {
    errors.push(`invalid checklist_mode: ${checklist_mode}`);
  }

  if (!Array.isArray(checklist_items) || checklist_items.length === 0) {
    errors.push('checklist_items must be non-empty array');
  } else {
    for (const item of checklist_items) {
      if (!item.checklist_item_id) errors.push('checklist_item missing checklist_item_id');
      if (!ALLOWED_CHECKLIST_TYPES.has(item.checklist_type)) {
        errors.push(`invalid checklist_type: ${item.checklist_type}`);
      }
      if (!ALLOWED_CHECKLIST_MODES.has(item.checklist_mode)) {
        errors.push(`invalid item checklist_mode: ${item.checklist_mode}`);
      }
      if (!HEX64.test(item.checklist_hash)) {
        errors.push(`invalid checklist_hash for ${item.checklist_item_id}`);
      }
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_checklist_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v402',
    };
  }

  const hash = createHash('sha256')
    .update(operator_checklist_binder_id)
    .update(real_release_command_dry_run_contract_id)
    .update(checklist_mode)
    .update(JSON.stringify(checklist_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v402',
    operator_checklist_binder_id,
    real_release_command_dry_run_contract_id,
    operator_id,
    operator_role,
    checklist_reason,
    checklist_mode,
    checklist_items,
    required_checklist_controls,
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
    return 'OperatorChecklistBinder: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'OperatorChecklistBinder',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  operator_checklist_bound: ${result.operator_checklist_bound}`,
    `  operator_checklist_approved: ${result.operator_checklist_approved}`,
    `  operator_go_decision_granted: ${result.operator_go_decision_granted}`,
    `  real_release_execution_allowed: ${result.real_release_execution_allowed}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
