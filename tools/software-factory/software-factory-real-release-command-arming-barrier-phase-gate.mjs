import { createHash } from 'crypto';

export const STATUSES = {
  REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT: 'REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT',
  REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_REVIEW: 'REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_REVIEW',
  REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE: 'REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE',
  REAL_RELEASE_COMMAND_ARMING_BARRIER_READY: 'REAL_RELEASE_COMMAND_ARMING_BARRIER_READY',
};

const FINAL_MESSAGE = 'V426-V430 real release execution final manual GO and command arming barrier complete. Real release execution remains blocked until explicit V431 command.';

const REQUIRED_IDS = [
  'final_manual_go_command_contract',
  'release_command_arming_binder',
  'command_arming_evidence_receipt',
  'final_command_arming_review',
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
    final_release_command_authority_phase_passed: false,
    explicit_human_go_granted: false,
    final_command_authority_granted: false,
    real_release_hard_stop_lifted: false,
    real_release_execution_allowed: false,
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
    final_command_arming_granted: false,
    real_release_command_arming_barrier_passed: false,
    real_release_command_armed: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v430',
      status: STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    real_release_command_arming_barrier_phase_gate_id,
    final_command_arming_review_id,
    final_command_arming_review_ready,
    ids,
    phase_summary,
  } = input;

  const errors = [];

  if (!real_release_command_arming_barrier_phase_gate_id || typeof real_release_command_arming_barrier_phase_gate_id !== 'string') {
    errors.push('real_release_command_arming_barrier_phase_gate_id required (string)');
  }
  if (!final_command_arming_review_id || typeof final_command_arming_review_id !== 'string') {
    errors.push('final_command_arming_review_id required (string)');
  }
  if (typeof final_command_arming_review_ready !== 'boolean') {
    errors.push('final_command_arming_review_ready required (boolean)');
  }
  if (!ids || typeof ids !== 'object' || Array.isArray(ids)) {
    errors.push('ids required (object)');
  }
  if (!phase_summary || typeof phase_summary !== 'string') {
    errors.push('phase_summary required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v430',
      status: STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  // Check all required IDs present and non-empty strings
  const missingIds = REQUIRED_IDS.filter(id => !ids[id] || typeof ids[id] !== 'string');
  if (missingIds.length > 0) {
    return {
      schema_version: 'v430',
      status: STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE,
      errors: [`missing required ids: ${missingIds.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_command_arming_review_ready) {
    return {
      schema_version: 'v430',
      status: STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_REVIEW,
      errors: ['final_command_arming_review_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v430',
      real_release_command_arming_barrier_phase_gate_id,
      final_command_arming_review_id,
      ids,
      phase_summary,
    }))
    .digest('hex');

  return {
    schema_version: 'v430',
    status: STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_READY,
    hash,
    errors: [],
    real_release_command_arming_barrier_phase_gate_id,
    final_command_arming_review_id,
    ids,
    phase_summary,
    modules_verified: [...REQUIRED_IDS],
    final_message: FINAL_MESSAGE,
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_READY) return false;
  if (result.real_release_command_arming_barrier_passed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.final_command_arming_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  if (result.final_message !== FINAL_MESSAGE) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V430] Real Release Command Arming Barrier Phase Gate — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V430] Real Release Command Arming Barrier Phase Gate',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.real_release_command_arming_barrier_phase_gate_id) {
    lines.push(`Phase Gate ID: ${result.real_release_command_arming_barrier_phase_gate_id}`);
  }
  if (result.modules_verified) {
    lines.push(`Modules Verified: ${result.modules_verified.join(', ')}`);
  }
  if (result.phase_summary) {
    lines.push(`Phase Summary: ${result.phase_summary}`);
  }
  lines.push(`real_release_command_arming_barrier_passed: ${result.real_release_command_arming_barrier_passed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`final_command_arming_granted: ${result.final_command_arming_granted}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}