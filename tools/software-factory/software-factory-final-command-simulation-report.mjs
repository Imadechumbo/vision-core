import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'FINAL_COMMAND_SIMULATION_REPORT_BLOCKED_INPUT',
  BLOCKED_ENVIRONMENT: 'FINAL_COMMAND_SIMULATION_REPORT_BLOCKED_ENVIRONMENT',
  FAIL: 'FINAL_COMMAND_SIMULATION_REPORT_FAIL',
  READY: 'FINAL_COMMAND_SIMULATION_REPORT_READY',
};

const REQUIRED_CONTROLS = [
  'final-command-simulation-report-required',
  'environment-snapshot-required',
  'report-not-published',
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
  'audit-required',
  'pass-gold-real-required',
];

const ALLOWED_SIMULATION_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_SIMULATION_TYPES = new Set([
  'release_command_simulation', 'deploy_command_simulation', 'tag_command_simulation',
  'stable_command_simulation', 'artifact_command_simulation', 'production_command_simulation',
  'rollback_command_simulation', 'operator_simulation', 'pass_gold_simulation',
  'environment_simulation', 'emergency_stop_simulation',
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
      schema_version: 'v404',
    };
  }

  const {
    final_command_simulation_report_id,
    release_environment_readiness_snapshot_id,
    release_environment_readiness_snapshot_ready,
    simulation_report_items = [],
    required_simulation_controls = [],
    simulation_level,
  } = input;

  if (
    !final_command_simulation_report_id ||
    !release_environment_readiness_snapshot_id ||
    !simulation_level
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'final_command_simulation_report_id, release_environment_readiness_snapshot_id, simulation_level required',
      ],
      schema_version: 'v404',
    };
  }

  if (!release_environment_readiness_snapshot_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_ENVIRONMENT,
      errors: ['release_environment_readiness_snapshot_ready must be true'],
      schema_version: 'v404',
    };
  }

  const errors = [];

  if (!Array.isArray(simulation_report_items) || simulation_report_items.length === 0) {
    errors.push('simulation_report_items must be non-empty array');
  } else {
    for (const item of simulation_report_items) {
      if (!item.simulation_item_id) errors.push('simulation_item missing simulation_item_id');
      if (!ALLOWED_SIMULATION_TYPES.has(item.simulation_type)) {
        errors.push(`invalid simulation_type: ${item.simulation_type}`);
      }
      if (!ALLOWED_SIMULATION_MODES.has(item.simulation_mode)) {
        errors.push(`invalid simulation_mode: ${item.simulation_mode}`);
      }
      if (!HEX64.test(item.simulation_hash)) {
        errors.push(`invalid simulation_hash for ${item.simulation_item_id}`);
      }
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_simulation_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v404',
    };
  }

  const hash = createHash('sha256')
    .update(final_command_simulation_report_id)
    .update(release_environment_readiness_snapshot_id)
    .update(simulation_level)
    .update(JSON.stringify(simulation_report_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v404',
    final_command_simulation_report_id,
    release_environment_readiness_snapshot_id,
    simulation_report_items,
    required_simulation_controls,
    simulation_level,
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
    return 'FinalCommandSimulationReport: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'FinalCommandSimulationReport',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  final_command_simulation_report_published: ${result.final_command_simulation_report_published}`,
    `  real_release_command_executed: ${result.real_release_command_executed}`,
    `  real_execution_allowed: ${result.real_execution_allowed}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
