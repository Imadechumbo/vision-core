import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_NOOP_EXECUTION_GATE_BLOCKED_INPUT: 'FINAL_NOOP_EXECUTION_GATE_BLOCKED_INPUT',
  FINAL_NOOP_EXECUTION_GATE_BLOCKED_REVIEW: 'FINAL_NOOP_EXECUTION_GATE_BLOCKED_REVIEW',
  FINAL_NOOP_EXECUTION_GATE_INCOMPLETE: 'FINAL_NOOP_EXECUTION_GATE_INCOMPLETE',
  FINAL_NOOP_EXECUTION_GATE_READY: 'FINAL_NOOP_EXECUTION_GATE_READY',
};

const FINAL_MESSAGE = 'V431-V435 real release execution command seal and final no-op execution gate complete. Real release execution remains blocked until explicit V436 command.';

const REQUIRED_IDS = [
  'real_release_command_seal_contract',
  'final_noop_execution_binder',
  'noop_execution_evidence_receipt',
  'final_noop_execution_review',
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
    real_release_command_arming_barrier_passed: false,
    real_release_command_armed: false,
    final_command_arming_granted: false,
    real_release_execution_allowed: false,
    real_release_hard_stop_lifted: false,
    explicit_human_go_granted: false,
    final_command_authority_granted: false,
    final_release_command_authority_phase_passed: false,
    final_release_command_authority_created: false,
    explicit_human_go_seal_bound: false,
    explicit_human_go_seal_verified: false,
    human_go_evidence_receipt_published: false,
    final_command_authority_reviewed: false,
    manual_release_approval_capsule_phase_passed: false,
    manual_release_execution_approved: false,
    release_authorization_ledger_phase_passed: false,
    manual_release_execution_authorized: false,
    final_manual_go_command_created: false,
    release_command_arming_bound: false,
    release_command_arming_verified: false,
    command_arming_evidence_receipt_published: false,
    final_command_arming_reviewed: false,
    real_release_command_seal_created: false,
    final_noop_execution_bound: false,
    final_noop_execution_verified: false,
    noop_execution_evidence_receipt_published: false,
    final_noop_execution_reviewed: false,
    final_noop_execution_granted: false,
    final_noop_execution_gate_passed: false,
    real_release_noop_executed: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v435',
      status: STATUSES.FINAL_NOOP_EXECUTION_GATE_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_noop_execution_gate_phase_gate_id,
    final_noop_execution_review_id,
    final_noop_execution_review_ready,
    ids,
    phase_summary,
  } = input;

  const errors = [];

  if (!final_noop_execution_gate_phase_gate_id || typeof final_noop_execution_gate_phase_gate_id !== 'string') {
    errors.push('final_noop_execution_gate_phase_gate_id required (string)');
  }
  if (!final_noop_execution_review_id || typeof final_noop_execution_review_id !== 'string') {
    errors.push('final_noop_execution_review_id required (string)');
  }
  if (typeof final_noop_execution_review_ready !== 'boolean') {
    errors.push('final_noop_execution_review_ready required (boolean)');
  }
  if (!ids || typeof ids !== 'object' || Array.isArray(ids)) {
    errors.push('ids required (object)');
  }
  if (!phase_summary || typeof phase_summary !== 'string') {
    errors.push('phase_summary required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v435',
      status: STATUSES.FINAL_NOOP_EXECUTION_GATE_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  const missingIds = REQUIRED_IDS.filter(id => !ids[id] || typeof ids[id] !== 'string');
  if (missingIds.length > 0) {
    return {
      schema_version: 'v435',
      status: STATUSES.FINAL_NOOP_EXECUTION_GATE_INCOMPLETE,
      errors: [`missing required ids: ${missingIds.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_noop_execution_review_ready) {
    return {
      schema_version: 'v435',
      status: STATUSES.FINAL_NOOP_EXECUTION_GATE_BLOCKED_REVIEW,
      errors: ['final_noop_execution_review_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v435',
      final_noop_execution_gate_phase_gate_id,
      final_noop_execution_review_id,
      ids,
      phase_summary,
    }))
    .digest('hex');

  return {
    schema_version: 'v435',
    status: STATUSES.FINAL_NOOP_EXECUTION_GATE_READY,
    hash,
    errors: [],
    final_noop_execution_gate_phase_gate_id,
    final_noop_execution_review_id,
    ids,
    phase_summary,
    modules_verified: [...REQUIRED_IDS],
    final_message: FINAL_MESSAGE,
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_NOOP_EXECUTION_GATE_READY) return false;
  if (result.final_noop_execution_gate_passed !== false) return false;
  if (result.final_noop_execution_granted !== false) return false;
  if (result.real_release_noop_executed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.final_noop_execution_bound !== false) return false;
  if (result.final_noop_execution_verified !== false) return false;
  if (result.noop_execution_evidence_receipt_published !== false) return false;
  if (result.final_noop_execution_reviewed !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  if (result.final_message !== FINAL_MESSAGE) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V435] Final No-Op Execution Gate Phase Gate — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V435] Final No-Op Execution Gate Phase Gate',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_noop_execution_gate_phase_gate_id) {
    lines.push(`Phase Gate ID: ${result.final_noop_execution_gate_phase_gate_id}`);
  }
  if (result.modules_verified) {
    lines.push(`Modules Verified: ${result.modules_verified.join(', ')}`);
  }
  if (result.phase_summary) {
    lines.push(`Phase Summary: ${result.phase_summary}`);
  }
  lines.push(`final_noop_execution_gate_passed: ${result.final_noop_execution_gate_passed}`);
  lines.push(`final_noop_execution_granted: ${result.final_noop_execution_granted}`);
  lines.push(`real_release_noop_executed: ${result.real_release_noop_executed}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`final_noop_execution_bound: ${result.final_noop_execution_bound}`);
  lines.push(`final_noop_execution_verified: ${result.final_noop_execution_verified}`);
  lines.push(`noop_execution_evidence_receipt_published: ${result.noop_execution_evidence_receipt_published}`);
  lines.push(`final_noop_execution_reviewed: ${result.final_noop_execution_reviewed}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}