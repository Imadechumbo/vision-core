import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_BLOCKED_INPUT',
  BLOCKED_CHECKLIST: 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_BLOCKED_CHECKLIST',
  FAIL: 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_FAIL',
  READY: 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_READY',
};

const REQUIRED_CONTROLS = [
  'environment-readiness-snapshot-required',
  'operator-checklist-required',
  'metadata-only-snapshot',
  'no-real-env-inspection',
  'no-production-touch',
  'no-secret-access',
  'no-network',
  'no-billing-execution',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-real-rollback',
  'audit-required',
  'pass-gold-real-required',
];

const ALLOWED_SNAPSHOT_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_SNAPSHOT_TYPES = new Set([
  'release_environment', 'deployment_environment', 'artifact_environment',
  'production_environment', 'rollback_environment', 'billing_environment',
  'secret_environment', 'network_environment', 'operator_environment',
  'audit_environment', 'emergency_stop_environment',
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
      schema_version: 'v403',
    };
  }

  const {
    release_environment_readiness_snapshot_id,
    operator_checklist_binder_id,
    operator_checklist_binder_ready,
    environment_snapshot_items = [],
    required_environment_controls = [],
    snapshot_level,
  } = input;

  if (
    !release_environment_readiness_snapshot_id ||
    !operator_checklist_binder_id ||
    !snapshot_level
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'release_environment_readiness_snapshot_id, operator_checklist_binder_id, snapshot_level required',
      ],
      schema_version: 'v403',
    };
  }

  if (!operator_checklist_binder_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_CHECKLIST,
      errors: ['operator_checklist_binder_ready must be true'],
      schema_version: 'v403',
    };
  }

  const errors = [];

  if (!Array.isArray(environment_snapshot_items) || environment_snapshot_items.length === 0) {
    errors.push('environment_snapshot_items must be non-empty array');
  } else {
    for (const item of environment_snapshot_items) {
      if (!item.snapshot_item_id) errors.push('snapshot_item missing snapshot_item_id');
      if (!ALLOWED_SNAPSHOT_TYPES.has(item.snapshot_type)) {
        errors.push(`invalid snapshot_type: ${item.snapshot_type}`);
      }
      if (!ALLOWED_SNAPSHOT_MODES.has(item.snapshot_mode)) {
        errors.push(`invalid snapshot_mode: ${item.snapshot_mode}`);
      }
      if (!HEX64.test(item.snapshot_hash)) {
        errors.push(`invalid snapshot_hash for ${item.snapshot_item_id}`);
      }
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_environment_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v403',
    };
  }

  const hash = createHash('sha256')
    .update(release_environment_readiness_snapshot_id)
    .update(operator_checklist_binder_id)
    .update(snapshot_level)
    .update(JSON.stringify(environment_snapshot_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v403',
    release_environment_readiness_snapshot_id,
    operator_checklist_binder_id,
    environment_snapshot_items,
    required_environment_controls,
    snapshot_level,
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
    return 'ReleaseEnvironmentReadinessSnapshot: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'ReleaseEnvironmentReadinessSnapshot',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  release_environment_readiness_confirmed: ${result.release_environment_readiness_confirmed}`,
    `  production_touched: ${result.production_touched}`,
    `  secrets_accessed: ${result.secrets_accessed}`,
    `  network_accessed: ${result.network_accessed}`,
    `  real_release_execution_allowed: ${result.real_release_execution_allowed}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
