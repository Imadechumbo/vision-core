import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'REAL_RELEASE_EXECUTION_DECISION_BLOCKED_INPUT',
  BLOCKED_DRILL: 'REAL_RELEASE_EXECUTION_DECISION_BLOCKED_DRILL',
  FAIL: 'REAL_RELEASE_EXECUTION_DECISION_FAIL',
  READY: 'REAL_RELEASE_EXECUTION_DECISION_READY',
};

const REQUIRED_CONTROLS = [
  'real-release-decision-contract-required',
  'supervised-drill-required',
  'metadata-only-decision',
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
  'human-authority-required',
  'pass-gold-real-required',
  'audit-required',
];

const ALLOWED_DECISION_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_DECISION_TYPES = new Set([
  'release_decision', 'deployment_decision', 'tag_decision', 'stable_decision',
  'artifact_decision', 'production_decision', 'rollback_decision', 'authority_decision',
  'pass_gold_decision', 'emergency_stop_decision',
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
      schema_version: 'v396',
    };
  }

  const {
    real_release_execution_decision_contract_id,
    supervised_release_drill_phase_gate_id,
    supervised_release_drill_phase_gate_ready,
    decision_requested_by,
    decision_reason,
    decision_mode,
    decision_items = [],
    required_decision_controls = [],
  } = input;

  if (
    !real_release_execution_decision_contract_id ||
    !supervised_release_drill_phase_gate_id ||
    !decision_requested_by ||
    !decision_reason ||
    !decision_mode
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'real_release_execution_decision_contract_id, supervised_release_drill_phase_gate_id, decision_requested_by, decision_reason, decision_mode required',
      ],
      schema_version: 'v396',
    };
  }

  if (!supervised_release_drill_phase_gate_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_DRILL,
      errors: ['supervised_release_drill_phase_gate_ready must be true'],
      schema_version: 'v396',
    };
  }

  const errors = [];

  if (!ALLOWED_DECISION_MODES.has(decision_mode)) {
    errors.push(`invalid decision_mode: ${decision_mode}`);
  }

  if (!Array.isArray(decision_items) || decision_items.length === 0) {
    errors.push('decision_items must be non-empty array');
  } else {
    for (const item of decision_items) {
      if (!item.decision_id) errors.push('decision_item missing decision_id');
      if (!ALLOWED_DECISION_TYPES.has(item.decision_type)) {
        errors.push(`invalid decision_type: ${item.decision_type}`);
      }
      if (!ALLOWED_DECISION_MODES.has(item.decision_mode)) {
        errors.push(`invalid item decision_mode: ${item.decision_mode}`);
      }
      if (!HEX64.test(item.decision_hash)) {
        errors.push(`invalid decision_hash for ${item.decision_id}`);
      }
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_decision_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v396',
    };
  }

  const hash = createHash('sha256')
    .update(real_release_execution_decision_contract_id)
    .update(supervised_release_drill_phase_gate_id)
    .update(decision_mode)
    .update(JSON.stringify(decision_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v396',
    real_release_execution_decision_contract_id,
    supervised_release_drill_phase_gate_id,
    decision_requested_by,
    decision_reason,
    decision_mode,
    decision_items,
    required_decision_controls,
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
    return 'RealReleaseExecutionDecisionContract: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'RealReleaseExecutionDecisionContract',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  real_release_execution_decision_received: ${result.real_release_execution_decision_received}`,
    `  real_release_execution_authorized: ${result.real_release_execution_authorized}`,
    `  real_release_execution_allowed: ${result.real_release_execution_allowed}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
