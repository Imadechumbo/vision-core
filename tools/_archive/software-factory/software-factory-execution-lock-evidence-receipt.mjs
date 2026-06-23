import { createHash } from 'crypto';

export const STATUSES = {
  EXECUTION_LOCK_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'EXECUTION_LOCK_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  EXECUTION_LOCK_EVIDENCE_RECEIPT_BLOCKED_LOCK: 'EXECUTION_LOCK_EVIDENCE_RECEIPT_BLOCKED_LOCK',
  EXECUTION_LOCK_EVIDENCE_RECEIPT_FAIL: 'EXECUTION_LOCK_EVIDENCE_RECEIPT_FAIL',
  EXECUTION_LOCK_EVIDENCE_RECEIPT_READY: 'EXECUTION_LOCK_EVIDENCE_RECEIPT_READY',
};

const REQUIRED_CONTROLS = [
  'execution-lock-evidence-receipt-required',
  'controlled-execution-lock-required',
  'metadata-only-evidence',
  'lock-evidence-not-published',
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

const ALLOWED_LOCK_EVIDENCE_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_LOCK_EVIDENCE_TYPES = [
  'release_execution_lock_evidence',
  'deploy_execution_lock_evidence',
  'tag_execution_lock_evidence',
  'stable_execution_lock_evidence',
  'artifact_execution_lock_evidence',
  'production_execution_lock_evidence',
  'billing_execution_lock_evidence',
  'secret_execution_lock_evidence',
  'network_execution_lock_evidence',
  'rollback_execution_lock_evidence',
  'operator_execution_lock_evidence',
  'emergency_stop_execution_lock_evidence',
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
      schema_version: 'v438',
      status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    execution_lock_evidence_receipt_id,
    controlled_execution_lock_binder_id,
    controlled_execution_lock_binder_ready,
    lock_evidence_items,
    required_lock_evidence_controls,
    lock_evidence_level,
  } = input;

  const errors = [];

  if (!execution_lock_evidence_receipt_id || typeof execution_lock_evidence_receipt_id !== 'string') {
    errors.push('execution_lock_evidence_receipt_id required (string)');
  }
  if (!controlled_execution_lock_binder_id || typeof controlled_execution_lock_binder_id !== 'string') {
    errors.push('controlled_execution_lock_binder_id required (string)');
  }
  if (typeof controlled_execution_lock_binder_ready !== 'boolean') {
    errors.push('controlled_execution_lock_binder_ready required (boolean)');
  }
  if (!Array.isArray(lock_evidence_items)) {
    errors.push('lock_evidence_items required (array)');
  }
  if (!Array.isArray(required_lock_evidence_controls)) {
    errors.push('required_lock_evidence_controls required (array)');
  }
  if (!lock_evidence_level || typeof lock_evidence_level !== 'string') {
    errors.push('lock_evidence_level required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v438',
      status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  for (const item of lock_evidence_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v438',
        status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_FAIL,
        errors: ['each lock_evidence_item must be an object'],
        ...invariants(),
      };
    }
    if (!item.lock_evidence_type || !ALLOWED_LOCK_EVIDENCE_TYPES.includes(item.lock_evidence_type)) {
      return {
        schema_version: 'v438',
        status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid lock_evidence_type: ${item.lock_evidence_type}`],
        ...invariants(),
      };
    }
    if (!item.lock_evidence_mode || !ALLOWED_LOCK_EVIDENCE_MODES.includes(item.lock_evidence_mode)) {
      return {
        schema_version: 'v438',
        status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid lock_evidence_mode: ${item.lock_evidence_mode}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_lock_evidence_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v438',
      status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_FAIL,
      errors: [`missing required_lock_evidence_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!controlled_execution_lock_binder_ready) {
    return {
      schema_version: 'v438',
      status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_BLOCKED_LOCK,
      errors: ['controlled_execution_lock_binder_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v438',
      execution_lock_evidence_receipt_id,
      controlled_execution_lock_binder_id,
      lock_evidence_level,
    }))
    .digest('hex');

  return {
    schema_version: 'v438',
    status: STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_READY,
    hash,
    errors: [],
    execution_lock_evidence_receipt_id,
    controlled_execution_lock_binder_id,
    lock_evidence_items_count: lock_evidence_items.length,
    lock_evidence_level,
    final_message: 'V438 execution lock evidence receipt recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.EXECUTION_LOCK_EVIDENCE_RECEIPT_READY) return false;
  if (result.execution_lock_evidence_receipt_published !== false) return false;
  if (result.controlled_execution_lock_verified !== false) return false;
  if (result.controlled_real_release_execution_unlocked !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_human_release_command_created !== false) return false;
  if (result.controlled_execution_lock_bound !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V438] Execution Lock Evidence Receipt — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V438] Execution Lock Evidence Receipt',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.execution_lock_evidence_receipt_id) {
    lines.push(`Receipt ID: ${result.execution_lock_evidence_receipt_id}`);
  }
  if (result.lock_evidence_level) {
    lines.push(`Evidence Level: ${result.lock_evidence_level}`);
  }
  lines.push(`execution_lock_evidence_receipt_published: ${result.execution_lock_evidence_receipt_published}`);
  lines.push(`controlled_execution_lock_verified: ${result.controlled_execution_lock_verified}`);
  lines.push(`controlled_real_release_execution_unlocked: ${result.controlled_real_release_execution_unlocked}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`final_human_release_command_created: ${result.final_human_release_command_created}`);
  lines.push(`controlled_execution_lock_bound: ${result.controlled_execution_lock_bound}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}