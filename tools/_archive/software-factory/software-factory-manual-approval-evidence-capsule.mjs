import { createHash } from 'crypto';

export const STATUSES = {
  MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT: 'MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT',
  MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_SEAL: 'MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_SEAL',
  MANUAL_APPROVAL_EVIDENCE_CAPSULE_FAIL: 'MANUAL_APPROVAL_EVIDENCE_CAPSULE_FAIL',
  MANUAL_APPROVAL_EVIDENCE_CAPSULE_READY: 'MANUAL_APPROVAL_EVIDENCE_CAPSULE_READY',
};

const REQUIRED_EVIDENCE_CONTROLS = [
  'manual-approval-evidence-capsule-required',
  'seal-binder-required',
  'evidence-not-published',
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
  'operator-seal-not-verified',
  'approval-phase-not-passed',
];

const VALID_EVIDENCE_TYPES = [
  'approval_audit_trail',
  'seal_binding_evidence',
  'capsule_contract_evidence',
  'operator_authority_evidence',
  'authorization_ledger_evidence',
  'dry_run_evidence',
  'governance_evidence',
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
      schema_version: 'v418',
      status: STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_operator_seal_binder_id,
    final_operator_seal_binder_ready,
    evidence_id,
    evidence_type,
    operator_id,
    evidence_controls,
    dry_run,
  } = input;

  const errors = [];

  if (!final_operator_seal_binder_id || typeof final_operator_seal_binder_id !== 'string') {
    errors.push('final_operator_seal_binder_id required (string)');
  }
  if (typeof final_operator_seal_binder_ready !== 'boolean') {
    errors.push('final_operator_seal_binder_ready required (boolean)');
  }
  if (!evidence_id || typeof evidence_id !== 'string') {
    errors.push('evidence_id required (string)');
  }
  if (!evidence_type || typeof evidence_type !== 'string') {
    errors.push('evidence_type required (string)');
  }
  if (!operator_id || typeof operator_id !== 'string') {
    errors.push('operator_id required (string)');
  }
  if (!Array.isArray(evidence_controls)) {
    errors.push('evidence_controls required (array)');
  }
  if (typeof dry_run !== 'boolean') {
    errors.push('dry_run required (boolean)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v418',
      status: STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!VALID_EVIDENCE_TYPES.includes(evidence_type)) {
    return {
      schema_version: 'v418',
      status: STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_FAIL,
      errors: [`invalid evidence_type: ${evidence_type}`],
      ...invariants(),
    };
  }

  const missing = REQUIRED_EVIDENCE_CONTROLS.filter(c => !evidence_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v418',
      status: STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_FAIL,
      errors: [`missing evidence_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_operator_seal_binder_ready) {
    return {
      schema_version: 'v418',
      status: STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_SEAL,
      errors: ['final_operator_seal_binder_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v418',
      final_operator_seal_binder_id,
      evidence_id,
      evidence_type,
      operator_id,
      dry_run,
    }))
    .digest('hex');

  return {
    schema_version: 'v418',
    status: STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_READY,
    hash,
    errors: [],
    final_operator_seal_binder_id,
    evidence_id,
    evidence_type,
    operator_id,
    evidence_controls,
    dry_run,
    manual_approval_evidence_capsule_id: `manual-approval-evidence-capsule-${evidence_id}`,
    final_message: 'V418 manual approval evidence capsule recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_READY) return false;
  if (result.manual_approval_evidence_capsule_published !== false) return false;
  if (result.manual_release_execution_approved !== false) return false;
  if (result.final_operator_seal_verified !== false) return false;
  if (result.release_allowed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V418] Manual Approval Evidence Capsule — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V418] Manual Approval Evidence Capsule',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.manual_approval_evidence_capsule_id) {
    lines.push(`Evidence Capsule ID: ${result.manual_approval_evidence_capsule_id}`);
  }
  if (result.evidence_type) {
    lines.push(`Evidence Type: ${result.evidence_type}`);
  }
  if (result.operator_id) {
    lines.push(`Operator ID: ${result.operator_id}`);
  }
  lines.push(`manual_approval_evidence_capsule_published: ${result.manual_approval_evidence_capsule_published}`);
  lines.push(`final_operator_seal_verified: ${result.final_operator_seal_verified}`);
  lines.push(`manual_release_execution_approved: ${result.manual_release_execution_approved}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
