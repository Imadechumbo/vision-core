import { createHash } from 'crypto';

export const STATUSES = {
  MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT: 'MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT',
  MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_LEDGER: 'MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_LEDGER',
  MANUAL_RELEASE_APPROVAL_CAPSULE_FAIL: 'MANUAL_RELEASE_APPROVAL_CAPSULE_FAIL',
  MANUAL_RELEASE_APPROVAL_CAPSULE_READY: 'MANUAL_RELEASE_APPROVAL_CAPSULE_READY',
};

const REQUIRED_CONTROLS = [
  'manual-release-approval-capsule-required',
  'authorization-ledger-phase-required',
  'capsule-not-created',
  'manual-release-not-approved',
  'manual-release-not-authorized',
  'deploy-not-allowed',
  'stable-not-allowed',
  'tag-not-allowed',
  'artifact-not-published',
  'production-not-touched',
  'billing-not-executed',
  'secrets-not-accessed',
  'network-not-accessed',
  'rollback-not-executed',
  'hard-stop-not-lifted',
  'real-execution-not-allowed',
  'real-tag-not-created',
  'real-stable-not-promoted',
  'operator-seal-not-bound',
];

const VALID_CAPSULE_TYPES = [
  'manual_release_approval_entry',
  'manual_deploy_approval_entry',
  'manual_tag_approval_entry',
  'manual_stable_approval_entry',
  'manual_artifact_approval_entry',
  'manual_production_approval_entry',
  'manual_billing_approval_entry',
  'manual_secret_approval_entry',
  'manual_network_approval_entry',
  'manual_rollback_approval_entry',
  'operator_approval_entry',
  'emergency_stop_approval_entry',
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
      schema_version: 'v416',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    release_authorization_ledger_phase_gate_id,
    release_authorization_ledger_phase_gate_ready,
    capsule_type,
    capsule_id,
    operator_id,
    approval_controls,
    dry_run,
  } = input;

  const errors = [];

  if (!release_authorization_ledger_phase_gate_id || typeof release_authorization_ledger_phase_gate_id !== 'string') {
    errors.push('release_authorization_ledger_phase_gate_id required (string)');
  }
  if (typeof release_authorization_ledger_phase_gate_ready !== 'boolean') {
    errors.push('release_authorization_ledger_phase_gate_ready required (boolean)');
  }
  if (!capsule_type || typeof capsule_type !== 'string') {
    errors.push('capsule_type required (string)');
  }
  if (!capsule_id || typeof capsule_id !== 'string') {
    errors.push('capsule_id required (string)');
  }
  if (!operator_id || typeof operator_id !== 'string') {
    errors.push('operator_id required (string)');
  }
  if (!Array.isArray(approval_controls)) {
    errors.push('approval_controls required (array)');
  }
  if (typeof dry_run !== 'boolean') {
    errors.push('dry_run required (boolean)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v416',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!VALID_CAPSULE_TYPES.includes(capsule_type)) {
    return {
      schema_version: 'v416',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_FAIL,
      errors: [`invalid capsule_type: ${capsule_type}`],
      ...invariants(),
    };
  }

  const missing = REQUIRED_CONTROLS.filter(c => !approval_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v416',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_FAIL,
      errors: [`missing approval_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!release_authorization_ledger_phase_gate_ready) {
    return {
      schema_version: 'v416',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_LEDGER,
      errors: ['release_authorization_ledger_phase_gate_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v416',
      release_authorization_ledger_phase_gate_id,
      capsule_type,
      capsule_id,
      operator_id,
      dry_run,
    }))
    .digest('hex');

  return {
    schema_version: 'v416',
    status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_READY,
    hash,
    errors: [],
    release_authorization_ledger_phase_gate_id,
    capsule_type,
    capsule_id,
    operator_id,
    approval_controls,
    dry_run,
    manual_release_approval_capsule_contract_id: `manual-release-approval-capsule-contract-${capsule_id}`,
    final_message: 'V416 manual release approval capsule contract recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_READY) return false;
  if (result.manual_release_approval_capsule_created !== false) return false;
  if (result.manual_release_execution_approved !== false) return false;
  if (result.release_allowed !== false) return false;
  if (result.deploy_allowed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V416] Manual Release Approval Capsule Contract — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V416] Manual Release Approval Capsule Contract',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.manual_release_approval_capsule_contract_id) {
    lines.push(`Capsule Contract ID: ${result.manual_release_approval_capsule_contract_id}`);
  }
  if (result.capsule_type) {
    lines.push(`Capsule Type: ${result.capsule_type}`);
  }
  if (result.operator_id) {
    lines.push(`Operator ID: ${result.operator_id}`);
  }
  lines.push(`manual_release_approval_capsule_created: ${result.manual_release_approval_capsule_created}`);
  lines.push(`manual_release_execution_approved: ${result.manual_release_execution_approved}`);
  lines.push(`release_allowed: ${result.release_allowed}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
