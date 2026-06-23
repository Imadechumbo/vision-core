import { createHash } from 'crypto';

export const STATUSES = {
  FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT: 'FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT',
  FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_CAPSULE: 'FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_CAPSULE',
  FINAL_RELEASE_COMMAND_AUTHORITY_FAIL: 'FINAL_RELEASE_COMMAND_AUTHORITY_FAIL',
  FINAL_RELEASE_COMMAND_AUTHORITY_READY: 'FINAL_RELEASE_COMMAND_AUTHORITY_READY',
};

const REQUIRED_CONTROLS = [
  'final-release-command-authority-required',
  'manual-approval-capsule-phase-required',
  'metadata-only-authority',
  'authority-not-created',
  'explicit-human-go-not-granted',
  'final-command-authority-not-granted',
  'manual-release-not-approved',
  'manual-release-not-authorized',
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

const ALLOWED_AUTHORITY_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_AUTHORITY_TYPES = [
  'final_release_command_authority',
  'final_deploy_command_authority',
  'final_tag_command_authority',
  'final_stable_command_authority',
  'final_artifact_command_authority',
  'final_production_command_authority',
  'final_billing_command_authority',
  'final_secret_command_authority',
  'final_network_command_authority',
  'final_rollback_command_authority',
  'operator_command_authority',
  'emergency_stop_command_authority',
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
      schema_version: 'v421',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    final_release_command_authority_contract_id,
    manual_release_approval_capsule_phase_gate_id,
    manual_release_approval_capsule_phase_gate_ready,
    authority_requested_by,
    authority_reason,
    authority_mode,
    authority_items,
    required_authority_controls,
  } = input;

  const errors = [];

  if (!final_release_command_authority_contract_id || typeof final_release_command_authority_contract_id !== 'string') {
    errors.push('final_release_command_authority_contract_id required (string)');
  }
  if (!manual_release_approval_capsule_phase_gate_id || typeof manual_release_approval_capsule_phase_gate_id !== 'string') {
    errors.push('manual_release_approval_capsule_phase_gate_id required (string)');
  }
  if (typeof manual_release_approval_capsule_phase_gate_ready !== 'boolean') {
    errors.push('manual_release_approval_capsule_phase_gate_ready required (boolean)');
  }
  if (!authority_requested_by || typeof authority_requested_by !== 'string') {
    errors.push('authority_requested_by required (string)');
  }
  if (!authority_reason || typeof authority_reason !== 'string') {
    errors.push('authority_reason required (string)');
  }
  if (!authority_mode || typeof authority_mode !== 'string') {
    errors.push('authority_mode required (string)');
  }
  if (!Array.isArray(authority_items)) {
    errors.push('authority_items required (array)');
  }
  if (!Array.isArray(required_authority_controls)) {
    errors.push('required_authority_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v421',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_AUTHORITY_MODES.includes(authority_mode)) {
    return {
      schema_version: 'v421',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL,
      errors: [`invalid authority_mode: ${authority_mode}`],
      ...invariants(),
    };
  }

  for (const item of authority_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v421',
        status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL,
        errors: ['each authority_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_AUTHORITY_TYPES.includes(item.authority_type)) {
      return {
        schema_version: 'v421',
        status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL,
        errors: [`invalid authority_type: ${item.authority_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_authority_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v421',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL,
      errors: [`missing required_authority_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!manual_release_approval_capsule_phase_gate_ready) {
    return {
      schema_version: 'v421',
      status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_CAPSULE,
      errors: ['manual_release_approval_capsule_phase_gate_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v421',
      final_release_command_authority_contract_id,
      manual_release_approval_capsule_phase_gate_id,
      authority_requested_by,
      authority_reason,
      authority_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v421',
    status: STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_READY,
    hash,
    errors: [],
    final_release_command_authority_contract_id,
    manual_release_approval_capsule_phase_gate_id,
    authority_requested_by,
    authority_reason,
    authority_mode,
    authority_items_count: authority_items.length,
    final_message: 'V421 final release command authority contract recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_READY) return false;
  if (result.final_release_command_authority_created !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V421] Final Release Command Authority Contract — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V421] Final Release Command Authority Contract',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.final_release_command_authority_contract_id) {
    lines.push(`Contract ID: ${result.final_release_command_authority_contract_id}`);
  }
  if (result.authority_mode) {
    lines.push(`Authority Mode: ${result.authority_mode}`);
  }
  if (result.authority_requested_by) {
    lines.push(`Requested By: ${result.authority_requested_by}`);
  }
  lines.push(`final_release_command_authority_created: ${result.final_release_command_authority_created}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
