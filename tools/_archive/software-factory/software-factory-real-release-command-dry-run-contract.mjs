import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'REAL_RELEASE_COMMAND_DRY_RUN_BLOCKED_INPUT',
  BLOCKED_BARRIER: 'REAL_RELEASE_COMMAND_DRY_RUN_BLOCKED_BARRIER',
  FAIL: 'REAL_RELEASE_COMMAND_DRY_RUN_FAIL',
  READY: 'REAL_RELEASE_COMMAND_DRY_RUN_READY',
};

const REQUIRED_CONTROLS = [
  'real-release-command-dry-run-required',
  'final-barrier-required',
  'metadata-only-command',
  'command-not-executed',
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
  'operator-checklist-required',
  'audit-required',
  'pass-gold-real-required',
];

const ALLOWED_DRY_RUN_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_DRY_RUN_TYPES = new Set([
  'release_command_dry_run', 'deploy_command_dry_run', 'tag_command_dry_run',
  'stable_command_dry_run', 'artifact_command_dry_run', 'production_command_dry_run',
  'rollback_command_dry_run', 'operator_command_dry_run', 'emergency_stop_dry_run',
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
      schema_version: 'v401',
    };
  }

  const {
    real_release_command_dry_run_contract_id,
    real_release_execution_final_barrier_id,
    real_release_execution_final_barrier_ready,
    dry_run_requested_by,
    dry_run_reason,
    dry_run_mode,
    dry_run_items = [],
    required_dry_run_controls = [],
  } = input;

  if (
    !real_release_command_dry_run_contract_id ||
    !real_release_execution_final_barrier_id ||
    !dry_run_requested_by ||
    !dry_run_reason ||
    !dry_run_mode
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'real_release_command_dry_run_contract_id, real_release_execution_final_barrier_id, dry_run_requested_by, dry_run_reason, dry_run_mode required',
      ],
      schema_version: 'v401',
    };
  }

  if (!real_release_execution_final_barrier_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_BARRIER,
      errors: ['real_release_execution_final_barrier_ready must be true'],
      schema_version: 'v401',
    };
  }

  const errors = [];

  if (!ALLOWED_DRY_RUN_MODES.has(dry_run_mode)) {
    errors.push(`invalid dry_run_mode: ${dry_run_mode}`);
  }

  if (!Array.isArray(dry_run_items) || dry_run_items.length === 0) {
    errors.push('dry_run_items must be non-empty array');
  } else {
    for (const item of dry_run_items) {
      if (!item.dry_run_id) errors.push('dry_run_item missing dry_run_id');
      if (!ALLOWED_DRY_RUN_TYPES.has(item.dry_run_type)) {
        errors.push(`invalid dry_run_type: ${item.dry_run_type}`);
      }
      if (!ALLOWED_DRY_RUN_MODES.has(item.dry_run_mode)) {
        errors.push(`invalid item dry_run_mode: ${item.dry_run_mode}`);
      }
      if (!HEX64.test(item.dry_run_hash)) {
        errors.push(`invalid dry_run_hash for ${item.dry_run_id}`);
      }
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_dry_run_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v401',
    };
  }

  const hash = createHash('sha256')
    .update(real_release_command_dry_run_contract_id)
    .update(real_release_execution_final_barrier_id)
    .update(dry_run_mode)
    .update(JSON.stringify(dry_run_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v401',
    real_release_command_dry_run_contract_id,
    real_release_execution_final_barrier_id,
    dry_run_requested_by,
    dry_run_reason,
    dry_run_mode,
    dry_run_items,
    required_dry_run_controls,
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
    return 'RealReleaseCommandDryRunContract: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'RealReleaseCommandDryRunContract',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  real_release_command_dry_run_received: ${result.real_release_command_dry_run_received}`,
    `  real_release_command_executed: ${result.real_release_command_executed}`,
    `  real_release_execution_allowed: ${result.real_release_execution_allowed}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
