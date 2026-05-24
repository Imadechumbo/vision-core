import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_BLOCKED_INPUT',
  BLOCKED_LOCK: 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_BLOCKED_LOCK',
  INCOMPLETE: 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_INCOMPLETE',
  READY: 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_READY',
};

const REQUIRED_MODULE_IDS = [
  'real_release_execution_decision_contract',
  'final_human_authority_binding',
  'pass_gold_real_evidence_revalidation_gate',
  'production_release_command_lock',
];

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
      schema_version: 'v400',
    };
  }

  const {
    real_release_execution_final_barrier_id,
    production_release_command_lock_id,
    production_release_command_lock_ready,
    ids = {},
    barrier_summary,
  } = input;

  if (!real_release_execution_final_barrier_id || !production_release_command_lock_id || !barrier_summary) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'real_release_execution_final_barrier_id, production_release_command_lock_id, barrier_summary required',
      ],
      schema_version: 'v400',
    };
  }

  if (!production_release_command_lock_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_LOCK,
      errors: ['production_release_command_lock_ready must be true'],
      schema_version: 'v400',
    };
  }

  const errors = [];

  if (!ids || typeof ids !== 'object') {
    errors.push('ids object required');
  } else {
    const missingIds = REQUIRED_MODULE_IDS.filter((k) => !ids[k] || typeof ids[k] !== 'string' || ids[k].trim() === '');
    if (missingIds.length > 0) {
      errors.push(`missing required module ids: ${missingIds.join(', ')}`);
    }
  }

  if (typeof barrier_summary !== 'string' || barrier_summary.trim() === '') {
    errors.push('barrier_summary must be non-empty string');
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.INCOMPLETE,
      errors,
      schema_version: 'v400',
    };
  }

  const hash = createHash('sha256')
    .update(real_release_execution_final_barrier_id)
    .update(production_release_command_lock_id)
    .update(JSON.stringify(ids))
    .update(barrier_summary)
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v400',
    real_release_execution_final_barrier_id,
    production_release_command_lock_id,
    ids,
    barrier_summary,
    hash,
    final_message:
      'V396-V400 real release execution decision barrier complete. Real release execution remains blocked until explicit V401 command.',
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) return false;
  if (!HEX64.test(result.hash)) return false;
  return true;
}

export function render(result) {
  if (!result) {
    return 'RealReleaseExecutionFinalBarrier: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    'RealReleaseExecutionFinalBarrier',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  real_release_execution_final_barrier_passed: ${result.real_release_execution_final_barrier_passed}`,
    `  real_release_execution_authorized: ${result.real_release_execution_authorized}`,
    `  real_release_execution_allowed: ${result.real_release_execution_allowed}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
  ];
  if (result.final_message) {
    lines.push(`  final_message: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
