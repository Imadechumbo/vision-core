import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'PRODUCTION_RELEASE_COMMAND_LOCK_BLOCKED_INPUT',
  BLOCKED_PASS_GOLD: 'PRODUCTION_RELEASE_COMMAND_LOCK_BLOCKED_PASS_GOLD',
  FAIL: 'PRODUCTION_RELEASE_COMMAND_LOCK_FAIL',
  READY: 'PRODUCTION_RELEASE_COMMAND_LOCK_READY',
};

const REQUIRED_CONTROLS = [
  'production-release-command-lock-required',
  'pass-gold-revalidation-required',
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
];

const ALLOWED_LOCK_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_LOCK_TYPES = new Set([
  'release_command_lock', 'deploy_command_lock', 'tag_command_lock',
  'stable_command_lock', 'artifact_command_lock', 'production_command_lock',
  'rollback_command_lock', 'emergency_stop_lock',
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
      schema_version: 'v399',
    };
  }

  const {
    production_release_command_lock_id,
    pass_gold_real_evidence_revalidation_gate_id,
    pass_gold_real_evidence_revalidation_gate_ready,
    command_lock_items = [],
    required_command_lock_controls = [],
    command_lock_level,
  } = input;

  if (
    !production_release_command_lock_id ||
    !pass_gold_real_evidence_revalidation_gate_id ||
    !command_lock_level
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'production_release_command_lock_id, pass_gold_real_evidence_revalidation_gate_id, command_lock_level required',
      ],
      schema_version: 'v399',
    };
  }

  if (!pass_gold_real_evidence_revalidation_gate_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_PASS_GOLD,
      errors: ['pass_gold_real_evidence_revalidation_gate_ready must be true'],
      schema_version: 'v399',
    };
  }

  const errors = [];

  if (!Array.isArray(command_lock_items) || command_lock_items.length === 0) {
    errors.push('command_lock_items must be non-empty array');
  } else {
    for (const item of command_lock_items) {
      if (!item.lock_id) errors.push('command_lock_item missing lock_id');
      if (!ALLOWED_LOCK_TYPES.has(item.lock_type)) {
        errors.push(`invalid lock_type: ${item.lock_type}`);
      }
      if (!ALLOWED_LOCK_MODES.has(item.lock_mode)) {
        errors.push(`invalid lock_mode: ${item.lock_mode}`);
      }
      if (!HEX64.test(item.lock_hash)) {
        errors.push(`invalid lock_hash for ${item.lock_id}`);
      }
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_command_lock_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v399',
    };
  }

  const hash = createHash('sha256')
    .update(production_release_command_lock_id)
    .update(pass_gold_real_evidence_revalidation_gate_id)
    .update(command_lock_level)
    .update(JSON.stringify(command_lock_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v399',
    production_release_command_lock_id,
    pass_gold_real_evidence_revalidation_gate_id,
    command_lock_items,
    required_command_lock_controls,
    command_lock_level,
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
    return 'ProductionReleaseCommandLock: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'ProductionReleaseCommandLock',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  production_release_command_locked: ${result.production_release_command_locked}`,
    `  production_release_command_executed: ${result.production_release_command_executed}`,
    `  real_release_execution_allowed: ${result.real_release_execution_allowed}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
