import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT: 'FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT',
  FINAL_OPERATOR_SEAL_BINDER_BLOCKED_CAPSULE: 'FINAL_OPERATOR_SEAL_BINDER_BLOCKED_CAPSULE',
  FINAL_OPERATOR_SEAL_BINDER_FAIL: 'FINAL_OPERATOR_SEAL_BINDER_FAIL',
  FINAL_OPERATOR_SEAL_BINDER_READY: 'FINAL_OPERATOR_SEAL_BINDER_READY',
};

const REQUIRED_SEAL_CONTROLS = [
  'final-operator-seal-required',
  'capsule-contract-required',
  'seal-not-bound',
  'seal-not-verified',
  'manual-release-not-approved',
  'manual-release-not-authorized',
  'real-execution-not-allowed',
  'hard-stop-not-lifted',
  'deploy-not-allowed',
  'stable-not-allowed',
  'tag-not-allowed',
  'artifact-not-published',
  'production-not-touched',
  'billing-not-executed',
  'secrets-not-accessed',
  'network-not-accessed',
  'rollback-not-executed',
  'real-tag-not-created',
  'real-stable-not-promoted',
  'operator-authority-not-granted',
];

const VALID_SEAL_MODES = [
  'dry_run_seal',
  'review_seal',
  'simulation_seal',
  'pre_production_seal',
  'governance_seal',
];

function invariants() {
  return {
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
    release_authorization_ledger_phase_passed: false,
    manual_release_execution_authorized: false,
    real_release_hard_stop_lifted: false,
    real_release_execution_allowed: false,
    manual_release_approval_capsule_created: false,
    final_operator_seal_bound: false,
    final_operator_seal_verified: false,
    manual_approval_evidence_capsule_published: false,
    release_execution_approval_reviewed: false,
    release_execution_approval_granted: false,
    manual_release_approval_capsule_phase_passed: false,
    manual_release_execution_approved: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v417',
      status: STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    manual_release_approval_capsule_contract_id,
    manual_release_approval_capsule_ready,
    seal_id,
    seal_mode,
    operator_id,
    seal_controls,
    dry_run,
  } = input;

  const errors = [];

  if (!manual_release_approval_capsule_contract_id || typeof manual_release_approval_capsule_contract_id !== 'string') {
    errors.push('manual_release_approval_capsule_contract_id required (string)');
  }
  if (typeof manual_release_approval_capsule_ready !== 'boolean') {
    errors.push('manual_release_approval_capsule_ready required (boolean)');
  }
  if (!seal_id || typeof seal_id !== 'string') {
    errors.push('seal_id required (string)');
  }
  if (!seal_mode || typeof seal_mode !== 'string') {
    errors.push('seal_mode required (string)');
  }
  if (!operator_id || typeof operator_id !== 'string') {
    errors.push('operator_id required (string)');
  }
  if (!Array.isArray(seal_controls)) {
    errors.push('seal_controls required (array)');
  }
  if (typeof dry_run !== 'boolean') {
    errors.push('dry_run required (boolean)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v417',
      status: STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!VALID_SEAL_MODES.includes(seal_mode)) {
    return {
      schema_version: 'v417',
      status: STATUSES.FINAL_OPERATOR_SEAL_BINDER_FAIL,
      errors: [`invalid seal_mode: ${seal_mode}`],
      ...invariants(),
    };
  }

  const missing = REQUIRED_SEAL_CONTROLS.filter(c => !seal_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v417',
      status: STATUSES.FINAL_OPERATOR_SEAL_BINDER_FAIL,
      errors: [`missing seal_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!manual_release_approval_capsule_ready) {
    return {
      schema_version: 'v417',
      status: STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_CAPSULE,
      errors: ['manual_release_approval_capsule_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v417',
      manual_release_approval_capsule_contract_id,
      seal_id,
      seal_mode,
      operator_id,
      dry_run,
    }))
    .digest('hex');

  return {
    schema_version: 'v417',
    status: STATUSES.FINAL_OPERATOR_SEAL_BINDER_READY,
    hash,
    errors: [],
    manual_release_approval_capsule_contract_id,
    seal_id,
    seal_mode,
    operator_id,
    seal_controls,
    dry_run,
    final_operator_seal_binder_id: `final-operator-seal-binder-${seal_id}`,
    final_message: 'V417 final operator seal binder recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_OPERATOR_SEAL_BINDER_READY) return false;
  if (result.final_operator_seal_bound !== false) return false;
  if (result.final_operator_seal_verified !== false) return false;
  if (result.manual_release_execution_approved !== false) return false;
  if (result.release_allowed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V417] Final Operator Seal Binder — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V417] Final Operator Seal Binder',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_operator_seal_binder_id) {
    lines.push(`Seal Binder ID: ${result.final_operator_seal_binder_id}`);
  }
  if (result.seal_mode) {
    lines.push(`Seal Mode: ${result.seal_mode}`);
  }
  if (result.operator_id) {
    lines.push(`Operator ID: ${result.operator_id}`);
  }
  lines.push(`final_operator_seal_bound: ${result.final_operator_seal_bound}`);
  lines.push(`final_operator_seal_verified: ${result.final_operator_seal_verified}`);
  lines.push(`manual_release_execution_approved: ${result.manual_release_execution_approved}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
