import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_BLOCKED_INPUT: 'FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_BLOCKED_INPUT',
  FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW: 'FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW',
  FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_INCOMPLETE: 'FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_INCOMPLETE',
  FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_READY: 'FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_READY',
};

const FINAL_MESSAGE = 'V421-V425 final release command authority and explicit human GO seal complete. Real release execution remains blocked until explicit V426 command.';

const REQUIRED_IDS = [
  'final_release_command_authority_contract',
  'explicit_human_go_seal_binder',
  'human_go_evidence_receipt',
  'final_command_authority_review',
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
    manual_release_approval_capsule_phase_passed: false,
    manual_release_execution_approved: false,
    release_authorization_ledger_phase_passed: false,
    manual_release_execution_authorized: false,
    real_release_hard_stop_lifted: false,
    real_release_execution_allowed: false,
    final_release_command_authority_created: false,
    explicit_human_go_seal_bound: false,
    explicit_human_go_seal_verified: false,
    human_go_evidence_receipt_published: false,
    final_command_authority_reviewed: false,
    final_command_authority_granted: false,
    final_release_command_authority_phase_passed: false,
    explicit_human_go_granted: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v425',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_release_command_authority_phase_gate_id,
    final_command_authority_review_id,
    final_command_authority_review_ready,
    ids,
    phase_summary,
  } = input;

  const errors = [];

  if (!final_release_command_authority_phase_gate_id || typeof final_release_command_authority_phase_gate_id !== 'string') {
    errors.push('final_release_command_authority_phase_gate_id required (string)');
  }
  if (!final_command_authority_review_id || typeof final_command_authority_review_id !== 'string') {
    errors.push('final_command_authority_review_id required (string)');
  }
  if (typeof final_command_authority_review_ready !== 'boolean') {
    errors.push('final_command_authority_review_ready required (boolean)');
  }
  if (!ids || typeof ids !== 'object' || Array.isArray(ids)) {
    errors.push('ids required (object)');
  }
  if (!phase_summary || typeof phase_summary !== 'string') {
    errors.push('phase_summary required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v425',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  // Check all required IDs present and non-empty strings
  const missingIds = REQUIRED_IDS.filter(id => !ids[id] || typeof ids[id] !== 'string');
  if (missingIds.length > 0) {
    return {
      schema_version: 'v425',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_INCOMPLETE,
      errors: [`missing required ids: ${missingIds.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_command_authority_review_ready) {
    return {
      schema_version: 'v425',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW,
      errors: ['final_command_authority_review_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v425',
      final_release_command_authority_phase_gate_id,
      final_command_authority_review_id,
      ids,
      phase_summary,
    }))
    .digest('hex');

  return {
    schema_version: 'v425',
    status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_READY,
    hash,
    errors: [],
    final_release_command_authority_phase_gate_id,
    final_command_authority_review_id,
    ids,
    phase_summary,
    modules_verified: [...REQUIRED_IDS],
    final_message: FINAL_MESSAGE,
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_PHASE_GATE_READY) return false;
  if (result.final_release_command_authority_phase_passed !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  if (result.final_message !== FINAL_MESSAGE) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V425] Final Release Command Authority Phase Gate — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V425] Final Release Command Authority Phase Gate',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_release_command_authority_phase_gate_id) {
    lines.push(`Phase Gate ID: ${result.final_release_command_authority_phase_gate_id}`);
  }
  if (result.modules_verified) {
    lines.push(`Modules Verified: ${result.modules_verified.join(', ')}`);
  }
  if (result.phase_summary) {
    lines.push(`Phase Summary: ${result.phase_summary}`);
  }
  lines.push(`final_release_command_authority_phase_passed: ${result.final_release_command_authority_phase_passed}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`manual_release_execution_authorized: ${result.manual_release_execution_authorized}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
