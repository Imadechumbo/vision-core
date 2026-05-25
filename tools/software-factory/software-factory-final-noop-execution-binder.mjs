import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_NOOP_EXECUTION_BINDER_BLOCKED_INPUT: 'FINAL_NOOP_EXECUTION_BINDER_BLOCKED_INPUT',
  FINAL_NOOP_EXECUTION_BINDER_BLOCKED_COMMAND_SEAL: 'FINAL_NOOP_EXECUTION_BINDER_BLOCKED_COMMAND_SEAL',
  FINAL_NOOP_EXECUTION_BINDER_FAIL: 'FINAL_NOOP_EXECUTION_BINDER_FAIL',
  FINAL_NOOP_EXECUTION_BINDER_READY: 'FINAL_NOOP_EXECUTION_BINDER_READY',
};

const REQUIRED_CONTROLS = [
  'final-noop-execution-required',
  'real-release-command-seal-required',
  'metadata-only-noop',
  'noop-not-executed',
  'noop-not-verified',
  'real-release-command-not-armed',
  'real-release-not-executed',
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

const ALLOWED_NOOP_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_NOOP_TYPES = [
  'release_noop_execution',
  'deploy_noop_execution',
  'tag_noop_execution',
  'stable_noop_execution',
  'artifact_noop_execution',
  'production_noop_execution',
  'billing_noop_execution',
  'secret_noop_execution',
  'network_noop_execution',
  'rollback_noop_execution',
  'operator_noop_execution',
  'emergency_stop_noop_execution',
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
      schema_version: 'v432',
      status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_noop_execution_binder_id,
    real_release_command_seal_contract_id,
    real_release_command_seal_contract_ready,
    noop_requested_by,
    noop_reason,
    noop_mode,
    noop_items,
    required_noop_controls,
  } = input;

  const errors = [];

  if (!final_noop_execution_binder_id || typeof final_noop_execution_binder_id !== 'string') {
    errors.push('final_noop_execution_binder_id required (string)');
  }
  if (!real_release_command_seal_contract_id || typeof real_release_command_seal_contract_id !== 'string') {
    errors.push('real_release_command_seal_contract_id required (string)');
  }
  if (typeof real_release_command_seal_contract_ready !== 'boolean') {
    errors.push('real_release_command_seal_contract_ready required (boolean)');
  }
  if (!noop_requested_by || typeof noop_requested_by !== 'string') {
    errors.push('noop_requested_by required (string)');
  }
  if (!noop_reason || typeof noop_reason !== 'string') {
    errors.push('noop_reason required (string)');
  }
  if (!noop_mode || typeof noop_mode !== 'string') {
    errors.push('noop_mode required (string)');
  }
  if (!Array.isArray(noop_items)) {
    errors.push('noop_items required (array)');
  }
  if (!Array.isArray(required_noop_controls)) {
    errors.push('required_noop_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v432',
      status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_NOOP_MODES.includes(noop_mode)) {
    return {
      schema_version: 'v432',
      status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_FAIL,
      errors: [`invalid noop_mode: ${noop_mode}`],
      ...invariants(),
    };
  }

  for (const item of noop_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v432',
        status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_FAIL,
        errors: ['each noop_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_NOOP_TYPES.includes(item.noop_type)) {
      return {
        schema_version: 'v432',
        status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_FAIL,
        errors: [`invalid noop_type: ${item.noop_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_noop_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v432',
      status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_FAIL,
      errors: [`missing required_noop_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!real_release_command_seal_contract_ready) {
    return {
      schema_version: 'v432',
      status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_BLOCKED_COMMAND_SEAL,
      errors: ['real_release_command_seal_contract_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v432',
      final_noop_execution_binder_id,
      real_release_command_seal_contract_id,
      noop_requested_by,
      noop_reason,
      noop_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v432',
    status: STATUSES.FINAL_NOOP_EXECUTION_BINDER_READY,
    hash,
    errors: [],
    final_noop_execution_binder_id,
    real_release_command_seal_contract_id,
    noop_requested_by,
    noop_reason,
    noop_mode,
    noop_items_count: noop_items.length,
    final_message: 'V432 final no-op execution binder recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_NOOP_EXECUTION_BINDER_READY) return false;
  if (result.final_noop_execution_bound !== false) return false;
  if (result.final_noop_execution_verified !== false) return false;
  if (result.real_release_noop_executed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.real_release_command_seal_created !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V432] Final No-Op Execution Binder — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V432] Final No-Op Execution Binder',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_noop_execution_binder_id) {
    lines.push(`Binder ID: ${result.final_noop_execution_binder_id}`);
  }
  if (result.noop_mode) {
    lines.push(`No-Op Mode: ${result.noop_mode}`);
  }
  if (result.noop_requested_by) {
    lines.push(`Requested By: ${result.noop_requested_by}`);
  }
  lines.push(`final_noop_execution_bound: ${result.final_noop_execution_bound}`);
  lines.push(`final_noop_execution_verified: ${result.final_noop_execution_verified}`);
  lines.push(`real_release_noop_executed: ${result.real_release_noop_executed}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`real_release_command_seal_created: ${result.real_release_command_seal_created}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}