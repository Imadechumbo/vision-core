import { createHash } from 'crypto';

export const STATUSES = {
  MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT: 'MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT',
  MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE: 'MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE',
  MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_REVIEW: 'MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_REVIEW',
  MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_READY: 'MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_READY',
};

const REQUIRED_IDS = [
  'manual_release_approval_capsule_contract_id',
  'final_operator_seal_binder_id',
  'manual_approval_evidence_capsule_id',
  'release_execution_approval_review_id',
];

const FINAL_MESSAGE = 'V416-V420 manual release execution approval capsule and final operator seal complete. Real release execution remains blocked until explicit V421 command.';

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
      schema_version: 'v420',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    manual_release_approval_capsule_contract_id,
    final_operator_seal_binder_id,
    manual_approval_evidence_capsule_id,
    release_execution_approval_review_id,
    release_execution_approval_review_ready,
    operator_id,
    dry_run,
  } = input;

  const errors = [];

  if (typeof dry_run !== 'boolean') {
    errors.push('dry_run required (boolean)');
  }
  if (!operator_id || typeof operator_id !== 'string') {
    errors.push('operator_id required (string)');
  }
  if (typeof release_execution_approval_review_ready !== 'boolean') {
    errors.push('release_execution_approval_review_ready required (boolean)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v420',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  // Check all required IDs present
  const missingIds = [];
  if (!manual_release_approval_capsule_contract_id || typeof manual_release_approval_capsule_contract_id !== 'string') {
    missingIds.push('manual_release_approval_capsule_contract_id');
  }
  if (!final_operator_seal_binder_id || typeof final_operator_seal_binder_id !== 'string') {
    missingIds.push('final_operator_seal_binder_id');
  }
  if (!manual_approval_evidence_capsule_id || typeof manual_approval_evidence_capsule_id !== 'string') {
    missingIds.push('manual_approval_evidence_capsule_id');
  }
  if (!release_execution_approval_review_id || typeof release_execution_approval_review_id !== 'string') {
    missingIds.push('release_execution_approval_review_id');
  }

  if (missingIds.length > 0) {
    return {
      schema_version: 'v420',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE,
      errors: [`missing required ids: ${missingIds.join(', ')}`],
      ...invariants(),
    };
  }

  if (!release_execution_approval_review_ready) {
    return {
      schema_version: 'v420',
      status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_REVIEW,
      errors: ['release_execution_approval_review_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v420',
      manual_release_approval_capsule_contract_id,
      final_operator_seal_binder_id,
      manual_approval_evidence_capsule_id,
      release_execution_approval_review_id,
      operator_id,
      dry_run,
    }))
    .digest('hex');

  return {
    schema_version: 'v420',
    status: STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_READY,
    hash,
    errors: [],
    manual_release_approval_capsule_contract_id,
    final_operator_seal_binder_id,
    manual_approval_evidence_capsule_id,
    release_execution_approval_review_id,
    operator_id,
    dry_run,
    phase_gate_id: `manual-release-approval-capsule-phase-gate-${operator_id}`,
    modules_verified: [
      'manual_release_approval_capsule_contract',
      'final_operator_seal_binder',
      'manual_approval_evidence_capsule',
      'release_execution_approval_review',
    ],
    final_message: FINAL_MESSAGE,
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_READY) return false;
  if (result.manual_release_approval_capsule_phase_passed !== false) return false;
  if (result.manual_release_execution_approved !== false) return false;
  if (result.release_execution_approval_granted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  if (result.final_message !== FINAL_MESSAGE) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V420] Manual Release Approval Capsule Phase Gate — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V420] Manual Release Approval Capsule Phase Gate',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.phase_gate_id) {
    lines.push(`Phase Gate ID: ${result.phase_gate_id}`);
  }
  if (result.modules_verified) {
    lines.push(`Modules Verified: ${result.modules_verified.join(', ')}`);
  }
  if (result.operator_id) {
    lines.push(`Operator ID: ${result.operator_id}`);
  }
  lines.push(`manual_release_approval_capsule_phase_passed: ${result.manual_release_approval_capsule_phase_passed}`);
  lines.push(`manual_release_execution_approved: ${result.manual_release_execution_approved}`);
  lines.push(`release_execution_approval_granted: ${result.release_execution_approval_granted}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`manual_release_execution_authorized: ${result.manual_release_execution_authorized}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
