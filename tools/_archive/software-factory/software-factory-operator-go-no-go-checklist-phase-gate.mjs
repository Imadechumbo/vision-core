import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_BLOCKED_INPUT',
  BLOCKED_REPORT: 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_BLOCKED_REPORT',
  INCOMPLETE: 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_INCOMPLETE',
  READY: 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_READY',
};

const REQUIRED_MODULE_IDS = [
  'real_release_command_dry_run_contract',
  'operator_checklist_binder',
  'release_environment_readiness_snapshot',
  'final_command_simulation_report',
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
      schema_version: 'v405',
    };
  }

  const {
    operator_go_no_go_checklist_phase_gate_id,
    final_command_simulation_report_id,
    final_command_simulation_report_ready,
    ids = {},
    phase_summary,
  } = input;

  if (
    !operator_go_no_go_checklist_phase_gate_id ||
    !final_command_simulation_report_id ||
    !phase_summary
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'operator_go_no_go_checklist_phase_gate_id, final_command_simulation_report_id, phase_summary required',
      ],
      schema_version: 'v405',
    };
  }

  if (!final_command_simulation_report_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_REPORT,
      errors: ['final_command_simulation_report_ready must be true'],
      schema_version: 'v405',
    };
  }

  const errors = [];

  if (!ids || typeof ids !== 'object') {
    errors.push('ids object required');
  } else {
    const missingIds = REQUIRED_MODULE_IDS.filter(
      (k) => !ids[k] || typeof ids[k] !== 'string' || ids[k].trim() === ''
    );
    if (missingIds.length > 0) {
      errors.push(`missing required module ids: ${missingIds.join(', ')}`);
    }
  }

  if (typeof phase_summary !== 'string' || phase_summary.trim() === '') {
    errors.push('phase_summary must be non-empty string');
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.INCOMPLETE,
      errors,
      schema_version: 'v405',
    };
  }

  const hash = createHash('sha256')
    .update(operator_go_no_go_checklist_phase_gate_id)
    .update(final_command_simulation_report_id)
    .update(JSON.stringify(ids))
    .update(phase_summary)
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v405',
    operator_go_no_go_checklist_phase_gate_id,
    final_command_simulation_report_id,
    ids,
    phase_summary,
    hash,
    final_message:
      'V401-V405 real release command dry-run and operator checklist complete. Real release execution remains blocked until explicit V406 command.',
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) return false;
  if (!HEX64.test(result.hash)) return false;
  return true;
}

export function render(result) {
  if (!result) {
    return 'OperatorGoNoGoChecklistPhaseGate: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    'OperatorGoNoGoChecklistPhaseGate',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  operator_go_no_go_phase_passed: ${result.operator_go_no_go_phase_passed}`,
    `  operator_go_decision_granted: ${result.operator_go_decision_granted}`,
    `  real_release_command_executed: ${result.real_release_command_executed}`,
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
