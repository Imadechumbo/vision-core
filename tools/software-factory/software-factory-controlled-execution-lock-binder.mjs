import { createHash } from 'crypto';

export const STATUSES = {
  CONTROLLED_EXECUTION_LOCK_BINDER_BLOCKED_INPUT: 'CONTROLLED_EXECUTION_LOCK_BINDER_BLOCKED_INPUT',
  CONTROLLED_EXECUTION_LOCK_BINDER_BLOCKED_HUMAN_COMMAND: 'CONTROLLED_EXECUTION_LOCK_BINDER_BLOCKED_HUMAN_COMMAND',
  CONTROLLED_EXECUTION_LOCK_BINDER_FAIL: 'CONTROLLED_EXECUTION_LOCK_BINDER_FAIL',
  CONTROLLED_EXECUTION_LOCK_BINDER_READY: 'CONTROLLED_EXECUTION_LOCK_BINDER_READY',
};

const REQUIRED_CONTROLS = [
  'controlled-execution-lock-required',
  'final-human-release-command-required',
  'metadata-only-lock',
  'lock-not-verified',
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

const ALLOWED_LOCK_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_LOCK_TYPES = [
  'release_execution_lock',
  'deploy_execution_lock',
  'tag_execution_lock',
  'stable_execution_lock',
  'artifact_execution_lock',
  'production_execution_lock',
  'billing_execution_lock',
  'secret_execution_lock',
  'network_execution_lock',
  'rollback_execution_lock',
  'operator_execution_lock',
  'emergency_stop_execution_lock',
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
      schema_version: 'v437',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    controlled_execution_lock_binder_id,
    final_human_release_command_contract_id,
    final_human_release_command_contract_ready,
    lock_requested_by,
    lock_reason,
    lock_mode,
    lock_items,
    required_lock_controls,
  } = input;

  const errors = [];

  if (!controlled_execution_lock_binder_id || typeof controlled_execution_lock_binder_id !== 'string') {
    errors.push('controlled_execution_lock_binder_id required (string)');
  }
  if (!final_human_release_command_contract_id || typeof final_human_release_command_contract_id !== 'string') {
    errors.push('final_human_release_command_contract_id required (string)');
  }
  if (typeof final_human_release_command_contract_ready !== 'boolean') {
    errors.push('final_human_release_command_contract_ready required (boolean)');
  }
  if (!lock_requested_by || typeof lock_requested_by !== 'string') {
    errors.push('lock_requested_by required (string)');
  }
  if (!lock_reason || typeof lock_reason !== 'string') {
    errors.push('lock_reason required (string)');
  }
  if (!lock_mode || typeof lock_mode !== 'string') {
    errors.push('lock_mode required (string)');
  }
  if (!Array.isArray(lock_items)) {
    errors.push('lock_items required (array)');
  }
  if (!Array.isArray(required_lock_controls)) {
    errors.push('required_lock_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v437',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_LOCK_MODES.includes(lock_mode)) {
    return {
      schema_version: 'v437',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_FAIL,
      errors: [`invalid lock_mode: ${lock_mode}`],
      ...invariants(),
    };
  }

  for (const item of lock_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v437',
        status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_FAIL,
        errors: ['each lock_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_LOCK_TYPES.includes(item.lock_type)) {
      return {
        schema_version: 'v437',
        status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_FAIL,
        errors: [`invalid lock_type: ${item.lock_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_lock_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v437',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_FAIL,
      errors: [`missing required_lock_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_human_release_command_contract_ready) {
    return {
      schema_version: 'v437',
      status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_BLOCKED_HUMAN_COMMAND,
      errors: ['final_human_release_command_contract_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v437',
      controlled_execution_lock_binder_id,
      final_human_release_command_contract_id,
      lock_requested_by,
      lock_reason,
      lock_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v437',
    status: STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_READY,
    hash,
    errors: [],
    controlled_execution_lock_binder_id,
    final_human_release_command_contract_id,
    lock_requested_by,
    lock_reason,
    lock_mode,
    lock_items_count: lock_items.length,
    final_message: 'V437 controlled execution lock binder recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.CONTROLLED_EXECUTION_LOCK_BINDER_READY) return false;
  if (result.controlled_execution_lock_bound !== false) return false;
  if (result.controlled_execution_lock_verified !== false) return false;
  if (result.controlled_real_release_execution_unlocked !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.final_human_release_command_created !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V437] Controlled Execution Lock Binder — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V437] Controlled Execution Lock Binder',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.controlled_execution_lock_binder_id) {
    lines.push(`Binder ID: ${result.controlled_execution_lock_binder_id}`);
  }
  if (result.lock_mode) {
    lines.push(`Lock Mode: ${result.lock_mode}`);
  }
  if (result.lock_requested_by) {
    lines.push(`Requested By: ${result.lock_requested_by}`);
  }
  lines.push(`controlled_execution_lock_bound: ${result.controlled_execution_lock_bound}`);
  lines.push(`controlled_execution_lock_verified: ${result.controlled_execution_lock_verified}`);
  lines.push(`controlled_real_release_execution_unlocked: ${result.controlled_real_release_execution_unlocked}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`final_human_release_command_created: ${result.final_human_release_command_created}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}