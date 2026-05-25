import { createHash } from 'crypto';

export const STATUSES = {
  RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT: 'RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT',
  RELEASE_COMMAND_ARMING_BINDER_BLOCKED_MANUAL_GO: 'RELEASE_COMMAND_ARMING_BINDER_BLOCKED_MANUAL_GO',
  RELEASE_COMMAND_ARMING_BINDER_FAIL: 'RELEASE_COMMAND_ARMING_BINDER_FAIL',
  RELEASE_COMMAND_ARMING_BINDER_READY: 'RELEASE_COMMAND_ARMING_BINDER_READY',
};

const REQUIRED_CONTROLS = [
  'release-command-arming-required',
  'final-manual-go-command-required',
  'metadata-only-arming',
  'arming-not-verified',
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

const ALLOWED_ARMING_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_ARMING_TYPES = [
  'release_command_arming',
  'deploy_command_arming',
  'tag_command_arming',
  'stable_command_arming',
  'artifact_command_arming',
  'production_command_arming',
  'billing_command_arming',
  'secret_command_arming',
  'network_command_arming',
  'rollback_command_arming',
  'operator_command_arming',
  'emergency_stop_command_arming',
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
      schema_version: 'v427',
      status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    release_command_arming_binder_id,
    final_manual_go_command_contract_id,
    final_manual_go_command_contract_ready,
    arming_requested_by,
    arming_reason,
    arming_mode,
    arming_items,
    required_arming_controls,
  } = input;

  const errors = [];

  if (!release_command_arming_binder_id || typeof release_command_arming_binder_id !== 'string') {
    errors.push('release_command_arming_binder_id required (string)');
  }
  if (!final_manual_go_command_contract_id || typeof final_manual_go_command_contract_id !== 'string') {
    errors.push('final_manual_go_command_contract_id required (string)');
  }
  if (typeof final_manual_go_command_contract_ready !== 'boolean') {
    errors.push('final_manual_go_command_contract_ready required (boolean)');
  }
  if (!arming_requested_by || typeof arming_requested_by !== 'string') {
    errors.push('arming_requested_by required (string)');
  }
  if (!arming_reason || typeof arming_reason !== 'string') {
    errors.push('arming_reason required (string)');
  }
  if (!arming_mode || typeof arming_mode !== 'string') {
    errors.push('arming_mode required (string)');
  }
  if (!Array.isArray(arming_items)) {
    errors.push('arming_items required (array)');
  }
  if (!Array.isArray(required_arming_controls)) {
    errors.push('required_arming_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v427',
      status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_ARMING_MODES.includes(arming_mode)) {
    return {
      schema_version: 'v427',
      status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL,
      errors: [`invalid arming_mode: ${arming_mode}`],
      ...invariants(),
    };
  }

  for (const item of arming_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v427',
        status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL,
        errors: ['each arming_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_ARMING_TYPES.includes(item.arming_type)) {
      return {
        schema_version: 'v427',
        status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL,
        errors: [`invalid arming_type: ${item.arming_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_arming_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v427',
      status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL,
      errors: [`missing required_arming_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_manual_go_command_contract_ready) {
    return {
      schema_version: 'v427',
      status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_MANUAL_GO,
      errors: ['final_manual_go_command_contract_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v427',
      release_command_arming_binder_id,
      final_manual_go_command_contract_id,
      arming_requested_by,
      arming_reason,
      arming_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v427',
    status: STATUSES.RELEASE_COMMAND_ARMING_BINDER_READY,
    hash,
    errors: [],
    release_command_arming_binder_id,
    final_manual_go_command_contract_id,
    arming_requested_by,
    arming_reason,
    arming_mode,
    arming_items_count: arming_items.length,
    final_message: 'V427 release command arming binder recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.RELEASE_COMMAND_ARMING_BINDER_READY) return false;
  if (result.release_command_arming_bound !== false) return false;
  if (result.release_command_arming_verified !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.final_command_arming_granted !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V427] Release Command Arming Binder — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V427] Release Command Arming Binder',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.release_command_arming_binder_id) {
    lines.push(`Arming Binder ID: ${result.release_command_arming_binder_id}`);
  }
  if (result.arming_mode) {
    lines.push(`Arming Mode: ${result.arming_mode}`);
  }
  if (result.arming_requested_by) {
    lines.push(`Requested By: ${result.arming_requested_by}`);
  }
  lines.push(`release_command_arming_bound: ${result.release_command_arming_bound}`);
  lines.push(`release_command_arming_verified: ${result.release_command_arming_verified}`);
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