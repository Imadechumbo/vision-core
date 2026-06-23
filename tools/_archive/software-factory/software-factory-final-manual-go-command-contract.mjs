import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT: 'FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT',
  FINAL_MANUAL_GO_COMMAND_BLOCKED_AUTHORITY: 'FINAL_MANUAL_GO_COMMAND_BLOCKED_AUTHORITY',
  FINAL_MANUAL_GO_COMMAND_FAIL: 'FINAL_MANUAL_GO_COMMAND_FAIL',
  FINAL_MANUAL_GO_COMMAND_READY: 'FINAL_MANUAL_GO_COMMAND_READY',
};

const REQUIRED_CONTROLS = [
  'final-manual-go-command-required',
  'final-release-command-authority-phase-required',
  'metadata-only-manual-go',
  'manual-go-command-not-created',
  'command-arming-not-granted',
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

const ALLOWED_MANUAL_GO_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_MANUAL_GO_TYPES = [
  'final_manual_release_go_command',
  'final_manual_deploy_go_command',
  'final_manual_tag_go_command',
  'final_manual_stable_go_command',
  'final_manual_artifact_go_command',
  'final_manual_production_go_command',
  'final_manual_billing_go_command',
  'final_manual_secret_go_command',
  'final_manual_network_go_command',
  'final_manual_rollback_go_command',
  'operator_manual_go_command',
  'emergency_stop_manual_go_command',
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
      schema_version: 'v426',
      status: STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_manual_go_command_contract_id,
    final_release_command_authority_phase_gate_id,
    final_release_command_authority_phase_gate_ready,
    manual_go_requested_by,
    manual_go_reason,
    manual_go_mode,
    manual_go_items,
    required_manual_go_controls,
  } = input;

  const errors = [];

  if (!final_manual_go_command_contract_id || typeof final_manual_go_command_contract_id !== 'string') {
    errors.push('final_manual_go_command_contract_id required (string)');
  }
  if (!final_release_command_authority_phase_gate_id || typeof final_release_command_authority_phase_gate_id !== 'string') {
    errors.push('final_release_command_authority_phase_gate_id required (string)');
  }
  if (typeof final_release_command_authority_phase_gate_ready !== 'boolean') {
    errors.push('final_release_command_authority_phase_gate_ready required (boolean)');
  }
  if (!manual_go_requested_by || typeof manual_go_requested_by !== 'string') {
    errors.push('manual_go_requested_by required (string)');
  }
  if (!manual_go_reason || typeof manual_go_reason !== 'string') {
    errors.push('manual_go_reason required (string)');
  }
  if (!manual_go_mode || typeof manual_go_mode !== 'string') {
    errors.push('manual_go_mode required (string)');
  }
  if (!Array.isArray(manual_go_items)) {
    errors.push('manual_go_items required (array)');
  }
  if (!Array.isArray(required_manual_go_controls)) {
    errors.push('required_manual_go_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v426',
      status: STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_MANUAL_GO_MODES.includes(manual_go_mode)) {
    return {
      schema_version: 'v426',
      status: STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL,
      errors: [`invalid manual_go_mode: ${manual_go_mode}`],
      ...invariants(),
    };
  }

  for (const item of manual_go_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v426',
        status: STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL,
        errors: ['each manual_go_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_MANUAL_GO_TYPES.includes(item.manual_go_type)) {
      return {
        schema_version: 'v426',
        status: STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL,
        errors: [`invalid manual_go_type: ${item.manual_go_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_manual_go_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v426',
      status: STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL,
      errors: [`missing required_manual_go_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_release_command_authority_phase_gate_ready) {
    return {
      schema_version: 'v426',
      status: STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_AUTHORITY,
      errors: ['final_release_command_authority_phase_gate_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v426',
      final_manual_go_command_contract_id,
      final_release_command_authority_phase_gate_id,
      manual_go_requested_by,
      manual_go_reason,
      manual_go_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v426',
    status: STATUSES.FINAL_MANUAL_GO_COMMAND_READY,
    hash,
    errors: [],
    final_manual_go_command_contract_id,
    final_release_command_authority_phase_gate_id,
    manual_go_requested_by,
    manual_go_reason,
    manual_go_mode,
    manual_go_items_count: manual_go_items.length,
    final_message: 'V426 final manual GO command contract recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_MANUAL_GO_COMMAND_READY) return false;
  if (result.final_manual_go_command_created !== false) return false;
  if (result.final_command_arming_granted !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V426] Final Manual GO Command Contract — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V426] Final Manual GO Command Contract',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_manual_go_command_contract_id) {
    lines.push(`Contract ID: ${result.final_manual_go_command_contract_id}`);
  }
  if (result.manual_go_mode) {
    lines.push(`Manual GO Mode: ${result.manual_go_mode}`);
  }
  if (result.manual_go_requested_by) {
    lines.push(`Requested By: ${result.manual_go_requested_by}`);
  }
  lines.push(`final_manual_go_command_created: ${result.final_manual_go_command_created}`);
  lines.push(`final_command_arming_granted: ${result.final_command_arming_granted}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}