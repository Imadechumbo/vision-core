import { createHash } from 'crypto';

export const STATUSES = {
  EXPLICIT_HUMAN_GO_SEAL_BINDER_BLOCKED_INPUT: 'EXPLICIT_HUMAN_GO_SEAL_BINDER_BLOCKED_INPUT',
  EXPLICIT_HUMAN_GO_SEAL_BINDER_BLOCKED_AUTHORITY: 'EXPLICIT_HUMAN_GO_SEAL_BINDER_BLOCKED_AUTHORITY',
  EXPLICIT_HUMAN_GO_SEAL_BINDER_FAIL: 'EXPLICIT_HUMAN_GO_SEAL_BINDER_FAIL',
  EXPLICIT_HUMAN_GO_SEAL_BINDER_READY: 'EXPLICIT_HUMAN_GO_SEAL_BINDER_READY',
};

const REQUIRED_CONTROLS = [
  'explicit-human-go-seal-required',
  'final-command-authority-required',
  'metadata-only-go-seal',
  'go-seal-not-verified',
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

const ALLOWED_GO_SEAL_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_GO_SEAL_TYPES = [
  'explicit_human_release_go_seal',
  'explicit_human_deploy_go_seal',
  'explicit_human_tag_go_seal',
  'explicit_human_stable_go_seal',
  'explicit_human_artifact_go_seal',
  'explicit_human_production_go_seal',
  'explicit_human_billing_go_seal',
  'explicit_human_secret_go_seal',
  'explicit_human_network_go_seal',
  'explicit_human_rollback_go_seal',
  'explicit_human_operator_go_seal',
  'explicit_human_emergency_stop_go_seal',
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
      schema_version: 'v422',
      status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    explicit_human_go_seal_binder_id,
    final_release_command_authority_contract_id,
    final_release_command_authority_contract_ready,
    human_operator_id,
    human_operator_role,
    go_seal_reason,
    go_seal_mode,
    go_seal_items,
    required_go_seal_controls,
  } = input;

  const errors = [];

  if (!explicit_human_go_seal_binder_id || typeof explicit_human_go_seal_binder_id !== 'string') {
    errors.push('explicit_human_go_seal_binder_id required (string)');
  }
  if (!final_release_command_authority_contract_id || typeof final_release_command_authority_contract_id !== 'string') {
    errors.push('final_release_command_authority_contract_id required (string)');
  }
  if (typeof final_release_command_authority_contract_ready !== 'boolean') {
    errors.push('final_release_command_authority_contract_ready required (boolean)');
  }
  if (!human_operator_id || typeof human_operator_id !== 'string') {
    errors.push('human_operator_id required (string)');
  }
  if (!human_operator_role || typeof human_operator_role !== 'string') {
    errors.push('human_operator_role required (string)');
  }
  if (!go_seal_reason || typeof go_seal_reason !== 'string') {
    errors.push('go_seal_reason required (string)');
  }
  if (!go_seal_mode || typeof go_seal_mode !== 'string') {
    errors.push('go_seal_mode required (string)');
  }
  if (!Array.isArray(go_seal_items)) {
    errors.push('go_seal_items required (array)');
  }
  if (!Array.isArray(required_go_seal_controls)) {
    errors.push('required_go_seal_controls required (array)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v422',
      status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  if (!ALLOWED_GO_SEAL_MODES.includes(go_seal_mode)) {
    return {
      schema_version: 'v422',
      status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_FAIL,
      errors: [`invalid go_seal_mode: ${go_seal_mode}`],
      ...invariants(),
    };
  }

  for (const item of go_seal_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v422',
        status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_FAIL,
        errors: ['each go_seal_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_GO_SEAL_TYPES.includes(item.go_seal_type)) {
      return {
        schema_version: 'v422',
        status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_FAIL,
        errors: [`invalid go_seal_type: ${item.go_seal_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_go_seal_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v422',
      status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_FAIL,
      errors: [`missing required_go_seal_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!final_release_command_authority_contract_ready) {
    return {
      schema_version: 'v422',
      status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_BLOCKED_AUTHORITY,
      errors: ['final_release_command_authority_contract_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v422',
      explicit_human_go_seal_binder_id,
      final_release_command_authority_contract_id,
      human_operator_id,
      human_operator_role,
      go_seal_reason,
      go_seal_mode,
    }))
    .digest('hex');

  return {
    schema_version: 'v422',
    status: STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_READY,
    hash,
    errors: [],
    explicit_human_go_seal_binder_id,
    final_release_command_authority_contract_id,
    human_operator_id,
    human_operator_role,
    go_seal_reason,
    go_seal_mode,
    go_seal_items_count: go_seal_items.length,
    final_message: 'V422 explicit human GO seal binder recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.EXPLICIT_HUMAN_GO_SEAL_BINDER_READY) return false;
  if (result.explicit_human_go_seal_bound !== false) return false;
  if (result.explicit_human_go_seal_verified !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V422] Explicit Human GO Seal Binder — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V422] Explicit Human GO Seal Binder',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.explicit_human_go_seal_binder_id) {
    lines.push(`Seal Binder ID: ${result.explicit_human_go_seal_binder_id}`);
  }
  if (result.go_seal_mode) {
    lines.push(`GO Seal Mode: ${result.go_seal_mode}`);
  }
  if (result.human_operator_id) {
    lines.push(`Human Operator ID: ${result.human_operator_id}`);
  }
  if (result.human_operator_role) {
    lines.push(`Human Operator Role: ${result.human_operator_role}`);
  }
  lines.push(`explicit_human_go_seal_bound: ${result.explicit_human_go_seal_bound}`);
  lines.push(`explicit_human_go_seal_verified: ${result.explicit_human_go_seal_verified}`);
  lines.push(`explicit_human_go_granted: ${result.explicit_human_go_granted}`);
  lines.push(`final_command_authority_granted: ${result.final_command_authority_granted}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
