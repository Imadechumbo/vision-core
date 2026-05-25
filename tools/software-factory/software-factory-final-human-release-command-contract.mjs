import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT: 'FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT',
  FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_NOOP_GATE: 'FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_NOOP_GATE',
  FINAL_HUMAN_RELEASE_COMMAND_FAIL: 'FINAL_HUMAN_RELEASE_COMMAND_FAIL',
  FINAL_HUMAN_RELEASE_COMMAND_READY: 'FINAL_HUMAN_RELEASE_COMMAND_READY',
};

const REQUIRED_CONTROLS = [
  'final-human-release-command-required',
  'final-noop-execution-gate-required',
  'metadata-only-human-command',
  'human-command-not-created',
  'controlled-execution-not-unlocked',
  'real-release-not-executed',
  'real-release-command-not-armed',
  'explicit-human-go-not-granted',
  'final-command-authority-not-granted',
  'hard-stop-not-lifted',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-artifact-publish',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
  'audit-required',
  'pass-gold-real-required',
];

const ALLOWED_HUMAN_COMMAND_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_HUMAN_COMMAND_TYPES = [
  'final_human_release_command',
  'final_human_deploy_command',
  'final_human_tag_command',
  'final_human_stable_command',
  'final_human_artifact_command',
  'final_human_production_command',
  'final_human_billing_command',
  'final_human_secret_command',
  'final_human_network_command',
  'final_human_rollback_command',
  'operator_human_command',
  'emergency_stop_human_command',
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
      schema_version: 'v436',
      status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_human_release_command_contract_id,
    final_noop_execution_gate_phase_gate_id,
    final_noop_execution_gate_phase_gate_ready,
    human_command_requested_by,
    human_command_reason,
    human_command_mode,
    human_command_items,
    required_human_command_controls,
  } = input;

  const errors = [];

  if (!final_human_release_command_contract_id || typeof final_human_release_command_contract_id !== 'string') {
    errors.push('final_human_release_command_contract_id required (string)');
  }
  if (!final_noop_execution_gate_phase_gate_id || typeof final_noop_execution_gate_phase_gate_id !== 'string') {
    errors.push('final_noop_execution_gate_phase_gate_id required (string)');
  }
  if (typeof final_noop_execution_gate_phase_gate_ready !== 'boolean') {
    errors.push('final_noop_execution_gate_phase_gate_ready required (boolean)');
  }
  if (!human_command_requested_by || typeof human_command_requested_by !== 'string') {
    errors.push('human_command_requested_by required (string)');
  }
  if (!human_command_reason || typeof human_command_reason !== 'string') {
    errors.push('human_command_reason required (string)');
  }
  if (!human_command_mode || typeof human_command_mode !== 'string') {
    errors.push('human_command_mode required (string)');
  }
  if (!Array.isArray(human_command_items)) {
    errors.push('human_command_items required (array)');
  }
  if (!Array.isArray(required_human_command_controls)) {
    errors.push('required_human_command_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v436',
      status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_HUMAN_COMMAND_MODES.includes(human_command_mode)) {
    return {
      schema_version: 'v436',
      status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL,
      errors: [`invalid human_command_mode: ${human_command_mode}`],
      ...invariants(),
    };
  }

  for (const item of human_command_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v436',
        status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL,
        errors: ['each human_command_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_HUMAN_COMMAND_TYPES.includes(item.human_command_type)) {
      return {
        schema_version: 'v436',
        status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL,
        errors: [`invalid human_command_type: ${item.human_command_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_human_command_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v436',
      status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL,
      errors: [`missing required_human_command_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_noop_execution_gate_phase_gate_ready) {
    return {
      schema_version: 'v436',
      status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_NOOP_GATE,
      errors: ['final_noop_execution_gate_phase_gate_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v436',
      final_human_release_command_contract_id,
      final_noop_execution_gate_phase_gate_id,
      human_command_requested_by,
      human_command_reason,
      human_command_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v436',
    status: STATUSES.FINAL_HUMAN_RELEASE_COMMAND_READY,
    hash,
    errors: [],
    final_human_release_command_contract_id,
    final_noop_execution_gate_phase_gate_id,
    human_command_requested_by,
    human_command_reason,
    human_command_mode,
    human_command_items_count: human_command_items.length,
    final_message: 'V436 final human release command contract recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_HUMAN_RELEASE_COMMAND_READY) return false;
  if (result.final_human_release_command_created !== false) return false;
  if (result.controlled_real_release_execution_unlocked !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_executed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V436] Final Human Release Command Contract — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V436] Final Human Release Command Contract',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_human_release_command_contract_id) {
    lines.push(`Contract ID: ${result.final_human_release_command_contract_id}`);
  }
  if (result.human_command_mode) {
    lines.push(`Human Command Mode: ${result.human_command_mode}`);
  }
  if (result.human_command_requested_by) {
    lines.push(`Requested By: ${result.human_command_requested_by}`);
  }
  lines.push(`final_human_release_command_created: ${result.final_human_release_command_created}`);
  lines.push(`controlled_real_release_execution_unlocked: ${result.controlled_real_release_execution_unlocked}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_executed: ${result.real_release_executed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}