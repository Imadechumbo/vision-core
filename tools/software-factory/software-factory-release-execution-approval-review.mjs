import { createHash } from 'crypto';

export const STATUSES = {
  RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT: 'RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT',
  RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_EVIDENCE: 'RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_EVIDENCE',
  RELEASE_EXECUTION_APPROVAL_REVIEW_FAIL: 'RELEASE_EXECUTION_APPROVAL_REVIEW_FAIL',
  RELEASE_EXECUTION_APPROVAL_REVIEW_READY: 'RELEASE_EXECUTION_APPROVAL_REVIEW_READY',
};

const REQUIRED_REVIEW_CONTROLS = [
  'release-execution-approval-review-required',
  'evidence-capsule-required',
  'review-not-approved',
  'approval-not-granted',
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
  'phase-gate-not-passed',
];

const VALID_REVIEW_OUTCOMES = [
  'review_pending',
  'review_dry_run_complete',
  'review_simulation_complete',
  'review_governance_complete',
  'review_pre_production_complete',
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
      schema_version: 'v419',
      status: STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    manual_approval_evidence_capsule_id,
    manual_approval_evidence_capsule_ready,
    review_id,
    review_outcome,
    operator_id,
    review_controls,
    dry_run,
  } = input;

  const errors = [];

  if (!manual_approval_evidence_capsule_id || typeof manual_approval_evidence_capsule_id !== 'string') {
    errors.push('manual_approval_evidence_capsule_id required (string)');
  }
  if (typeof manual_approval_evidence_capsule_ready !== 'boolean') {
    errors.push('manual_approval_evidence_capsule_ready required (boolean)');
  }
  if (!review_id || typeof review_id !== 'string') {
    errors.push('review_id required (string)');
  }
  if (!review_outcome || typeof review_outcome !== 'string') {
    errors.push('review_outcome required (string)');
  }
  if (!operator_id || typeof operator_id !== 'string') {
    errors.push('operator_id required (string)');
  }
  if (!Array.isArray(review_controls)) {
    errors.push('review_controls required (array)');
  }
  if (typeof dry_run !== 'boolean') {
    errors.push('dry_run required (boolean)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v419',
      status: STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!VALID_REVIEW_OUTCOMES.includes(review_outcome)) {
    return {
      schema_version: 'v419',
      status: STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_FAIL,
      errors: [`invalid review_outcome: ${review_outcome}`],
      ...invariants(),
    };
  }

  const missing = REQUIRED_REVIEW_CONTROLS.filter(c => !review_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v419',
      status: STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_FAIL,
      errors: [`missing review_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!manual_approval_evidence_capsule_ready) {
    return {
      schema_version: 'v419',
      status: STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_EVIDENCE,
      errors: ['manual_approval_evidence_capsule_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v419',
      manual_approval_evidence_capsule_id,
      review_id,
      review_outcome,
      operator_id,
      dry_run,
    }))
    .digest('hex');

  return {
    schema_version: 'v419',
    status: STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_READY,
    hash,
    errors: [],
    manual_approval_evidence_capsule_id,
    review_id,
    review_outcome,
    operator_id,
    review_controls,
    dry_run,
    release_execution_approval_review_id: `release-execution-approval-review-${review_id}`,
    final_message: 'V419 release execution approval review recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_READY) return false;
  if (result.release_execution_approval_reviewed !== false) return false;
  if (result.release_execution_approval_granted !== false) return false;
  if (result.manual_release_execution_approved !== false) return false;
  if (result.release_allowed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V419] Release Execution Approval Review — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V419] Release Execution Approval Review',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.release_execution_approval_review_id) {
    lines.push(`Review ID: ${result.release_execution_approval_review_id}`);
  }
  if (result.review_outcome) {
    lines.push(`Review Outcome: ${result.review_outcome}`);
  }
  if (result.operator_id) {
    lines.push(`Operator ID: ${result.operator_id}`);
  }
  lines.push(`release_execution_approval_reviewed: ${result.release_execution_approval_reviewed}`);
  lines.push(`release_execution_approval_granted: ${result.release_execution_approval_granted}`);
  lines.push(`manual_release_execution_approved: ${result.manual_release_execution_approved}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
