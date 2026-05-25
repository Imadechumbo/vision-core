import { createHash } from 'crypto';

export const STATUSES = {
  REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT: 'REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT',
  REAL_RELEASE_COMMAND_SEAL_BLOCKED_ARMING_BARRIER: 'REAL_RELEASE_COMMAND_SEAL_BLOCKED_ARMING_BARRIER',
  REAL_RELEASE_COMMAND_SEAL_FAIL: 'REAL_RELEASE_COMMAND_SEAL_FAIL',
  REAL_RELEASE_COMMAND_SEAL_READY: 'REAL_RELEASE_COMMAND_SEAL_READY',
};

const REQUIRED_CONTROLS = [
  'real-release-command-seal-required',
  'command-arming-barrier-required',
  'metadata-only-command-seal',
  'command-seal-not-created',
  'real-release-command-not-armed',
  'command-arming-not-granted',
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

const ALLOWED_COMMAND_SEAL_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_COMMAND_SEAL_TYPES = [
  'real_release_command_seal',
  'real_deploy_command_seal',
  'real_tag_command_seal',
  'real_stable_command_seal',
  'real_artifact_command_seal',
  'real_production_command_seal',
  'real_billing_command_seal',
  'real_secret_command_seal',
  'real_network_command_seal',
  'real_rollback_command_seal',
  'operator_command_seal',
  'emergency_stop_command_seal',
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
      schema_version: 'v431',
      status: STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    real_release_command_seal_contract_id,
    real_release_command_arming_barrier_phase_gate_id,
    real_release_command_arming_barrier_phase_gate_ready,
    command_seal_requested_by,
    command_seal_reason,
    command_seal_mode,
    command_seal_items,
    required_command_seal_controls,
  } = input;

  const errors = [];

  if (!real_release_command_seal_contract_id || typeof real_release_command_seal_contract_id !== 'string') {
    errors.push('real_release_command_seal_contract_id required (string)');
  }
  if (!real_release_command_arming_barrier_phase_gate_id || typeof real_release_command_arming_barrier_phase_gate_id !== 'string') {
    errors.push('real_release_command_arming_barrier_phase_gate_id required (string)');
  }
  if (typeof real_release_command_arming_barrier_phase_gate_ready !== 'boolean') {
    errors.push('real_release_command_arming_barrier_phase_gate_ready required (boolean)');
  }
  if (!command_seal_requested_by || typeof command_seal_requested_by !== 'string') {
    errors.push('command_seal_requested_by required (string)');
  }
  if (!command_seal_reason || typeof command_seal_reason !== 'string') {
    errors.push('command_seal_reason required (string)');
  }
  if (!command_seal_mode || typeof command_seal_mode !== 'string') {
    errors.push('command_seal_mode required (string)');
  }
  if (!Array.isArray(command_seal_items)) {
    errors.push('command_seal_items required (array)');
  }
  if (!Array.isArray(required_command_seal_controls)) {
    errors.push('required_command_seal_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v431',
      status: STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_COMMAND_SEAL_MODES.includes(command_seal_mode)) {
    return {
      schema_version: 'v431',
      status: STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL,
      errors: [`invalid command_seal_mode: ${command_seal_mode}`],
      ...invariants(),
    };
  }

  for (const item of command_seal_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v431',
        status: STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL,
        errors: ['each command_seal_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_COMMAND_SEAL_TYPES.includes(item.command_seal_type)) {
      return {
        schema_version: 'v431',
        status: STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL,
        errors: [`invalid command_seal_type: ${item.command_seal_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_command_seal_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v431',
      status: STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL,
      errors: [`missing required_command_seal_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!real_release_command_arming_barrier_phase_gate_ready) {
    return {
      schema_version: 'v431',
      status: STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_ARMING_BARRIER,
      errors: ['real_release_command_arming_barrier_phase_gate_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v431',
      real_release_command_seal_contract_id,
      real_release_command_arming_barrier_phase_gate_id,
      command_seal_requested_by,
      command_seal_reason,
      command_seal_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v431',
    status: STATUSES.REAL_RELEASE_COMMAND_SEAL_READY,
    hash,
    errors: [],
    real_release_command_seal_contract_id,
    real_release_command_arming_barrier_phase_gate_id,
    command_seal_requested_by,
    command_seal_reason,
    command_seal_mode,
    command_seal_items_count: command_seal_items.length,
    final_message: 'V431 real release command seal contract recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.REAL_RELEASE_COMMAND_SEAL_READY) return false;
  if (result.real_release_command_seal_created !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.final_command_arming_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V431] Real Release Command Seal Contract — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V431] Real Release Command Seal Contract',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.real_release_command_seal_contract_id) {
    lines.push(`Contract ID: ${result.real_release_command_seal_contract_id}`);
  }
  if (result.command_seal_mode) {
    lines.push(`Command Seal Mode: ${result.command_seal_mode}`);
  }
  if (result.command_seal_requested_by) {
    lines.push(`Requested By: ${result.command_seal_requested_by}`);
  }
  lines.push(`real_release_command_seal_created: ${result.real_release_command_seal_created}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`final_command_arming_granted: ${result.final_command_arming_granted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}