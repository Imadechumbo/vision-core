import { createHash } from 'crypto';

export const STATUSES = {
  CONTROLLED_EXECUTION_LOCK_PHASE_GATE_BLOCKED_INPUT: 'CONTROLLED_EXECUTION_LOCK_PHASE_GATE_BLOCKED_INPUT',
  CONTROLLED_EXECUTION_LOCK_PHASE_GATE_BLOCKED_REVIEW: 'CONTROLLED_EXECUTION_LOCK_PHASE_GATE_BLOCKED_REVIEW',
  CONTROLLED_EXECUTION_LOCK_PHASE_GATE_INCOMPLETE: 'CONTROLLED_EXECUTION_LOCK_PHASE_GATE_INCOMPLETE',
  CONTROLLED_EXECUTION_LOCK_PHASE_GATE_READY: 'CONTROLLED_EXECUTION_LOCK_PHASE_GATE_READY',
};

const FINAL_MESSAGE = 'V436-V440 real release execution final human command and controlled execution lock complete. Real release execution remains blocked until explicit V441 command.';

const REQUIRED_IDS = [
  'final_human_release_command_contract',
  'controlled_execution_lock_binder',
  'execution_lock_evidence_receipt',
  'final_controlled_execution_review',
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
    final_human_release_command_created: false,
    controlled_execution_lock_bound: false,
    controlled_execution_lock_verified: false,
    execution_lock_evidence_receipt_published: false,
    final_controlled_execution_reviewed: false,
    final_controlled_execution_granted: false,
    controlled_execution_lock_phase_passed: false,
    controlled_real_release_execution_unlocked: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v440',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_PHASE_GATE_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    controlled_execution_lock_phase_gate_id,
    final_controlled_execution_review_id,
    final_controlled_execution_review_ready,
    ids,
    phase_summary,
  } = input;

  const errors = [];

  if (!controlled_execution_lock_phase_gate_id || typeof controlled_execution_lock_phase_gate_id !== 'string') {
    errors.push('controlled_execution_lock_phase_gate_id required (string)');
  }
  if (!final_controlled_execution_review_id || typeof final_controlled_execution_review_id !== 'string') {
    errors.push('final_controlled_execution_review_id required (string)');
  }
  if (typeof final_controlled_execution_review_ready !== 'boolean') {
    errors.push('final_controlled_execution_review_ready required (boolean)');
  }
  if (!ids || typeof ids !== 'object' || Array.isArray(ids)) {
    errors.push('ids required (object)');
  }
  if (!phase_summary || typeof phase_summary !== 'string') {
    errors.push('phase_summary required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v440',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_PHASE_GATE_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  const missingIds = REQUIRED_IDS.filter(id => !ids[id] || typeof ids[id] !== 'string');
  if (missingIds.length > 0) {
    return {
      schema_version: 'v440',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_PHASE_GATE_INCOMPLETE,
      errors: [`missing required ids: ${missingIds.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_controlled_execution_review_ready) {
    return {
      schema_version: 'v440',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_PHASE_GATE_BLOCKED_REVIEW,
      errors: ['final_controlled_execution_review_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v440',
      controlled_execution_lock_phase_gate_id,
      final_controlled_execution_review_id,
      ids,
      phase_summary,
    }))
    .digest('hex');

  return {
    schema_version: 'v440',
    status: STATUSES.CONTROLLED_EXECUTION_LOCK_PHASE_GATE_READY,
    hash,
    errors: [],
    controlled_execution_lock_phase_gate_id,
    final_controlled_execution_review_id,
    ids,
    phase_summary,
    modules_verified: [...REQUIRED_IDS],
    final_message: FINAL_MESSAGE,
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.CONTROLLED_EXECUTION_LOCK_PHASE_GATE_READY) return false;
  if (result.controlled_execution_lock_phase_passed !== false) return false;
  if (result.controlled_real_release_execution_unlocked !== false) return false;
  if (result.final_controlled_execution_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.final_human_release_command_created !== false) return false;
  if (result.controlled_execution_lock_bound !== false) return false;
  if (result.controlled_execution_lock_verified !== false) return false;
  if (result.execution_lock_evidence_receipt_published !== false) return false;
  if (result.final_controlled_execution_reviewed !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  if (result.final_message !== FINAL_MESSAGE) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V440] Controlled Execution Lock Phase Gate — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V440] Controlled Execution Lock Phase Gate',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.controlled_execution_lock_phase_gate_id) {
    lines.push(`Phase Gate ID: ${result.controlled_execution_lock_phase_gate_id}`);
  }
  if (result.modules_verified) {
    lines.push(`Modules Verified: ${result.modules_verified.join(', ')}`);
  }
  if (result.phase_summary) {
    lines.push(`Phase Summary: ${result.phase_summary}`);
  }
  lines.push(`controlled_execution_lock_phase_passed: ${result.controlled_execution_lock_phase_passed}`);
  lines.push(`controlled_real_release_execution_unlocked: ${result.controlled_real_release_execution_unlocked}`);
  lines.push(`final_controlled_execution_granted: ${result.final_controlled_execution_granted}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`final_human_release_command_created: ${result.final_human_release_command_created}`);
  lines.push(`controlled_execution_lock_bound: ${result.controlled_execution_lock_bound}`);
  lines.push(`controlled_execution_lock_verified: ${result.controlled_execution_lock_verified}`);
  lines.push(`execution_lock_evidence_receipt_published: ${result.execution_lock_evidence_receipt_published}`);
  lines.push(`final_controlled_execution_reviewed: ${result.final_controlled_execution_reviewed}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}