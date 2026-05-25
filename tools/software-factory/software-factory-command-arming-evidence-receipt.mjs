import { createHash } from 'crypto';

export const STATUSES = {
  COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_ARMING: 'COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_ARMING',
  COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL: 'COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL',
  COMMAND_ARMING_EVIDENCE_RECEIPT_READY: 'COMMAND_ARMING_EVIDENCE_RECEIPT_READY',
};

const REQUIRED_CONTROLS = [
  'command-arming-evidence-receipt-required',
  'release-command-arming-required',
  'metadata-only-evidence',
  'arming-evidence-not-published',
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

const ALLOWED_EVIDENCE_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_EVIDENCE_TYPES = [
  'release_command_arming_evidence',
  'deploy_command_arming_evidence',
  'tag_command_arming_evidence',
  'stable_command_arming_evidence',
  'artifact_command_arming_evidence',
  'production_command_arming_evidence',
  'billing_command_arming_evidence',
  'secret_command_arming_evidence',
  'network_command_arming_evidence',
  'rollback_command_arming_evidence',
  'operator_command_arming_evidence',
  'emergency_stop_command_arming_evidence',
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
      schema_version: 'v428',
      status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    command_arming_evidence_receipt_id,
    release_command_arming_binder_id,
    release_command_arming_binder_ready,
    arming_evidence_items,
    required_arming_evidence_controls,
    arming_evidence_level,
  } = input;

  const errors = [];

  if (!command_arming_evidence_receipt_id || typeof command_arming_evidence_receipt_id !== 'string') {
    errors.push('command_arming_evidence_receipt_id required (string)');
  }
  if (!release_command_arming_binder_id || typeof release_command_arming_binder_id !== 'string') {
    errors.push('release_command_arming_binder_id required (string)');
  }
  if (typeof release_command_arming_binder_ready !== 'boolean') {
    errors.push('release_command_arming_binder_ready required (boolean)');
  }
  if (!Array.isArray(arming_evidence_items)) {
    errors.push('arming_evidence_items required (array)');
  }
  if (!Array.isArray(required_arming_evidence_controls)) {
    errors.push('required_arming_evidence_controls required (array)');
  }
  if (!arming_evidence_level || typeof arming_evidence_level !== 'string') {
    errors.push('arming_evidence_level required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v428',
      status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  for (const item of arming_evidence_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v428',
        status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL,
        errors: ['each arming_evidence_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_EVIDENCE_MODES.includes(item.arming_evidence_mode)) {
      return {
        schema_version: 'v428',
        status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid arming_evidence_mode: ${item.arming_evidence_mode}`],
        ...invariants(),
      };
    }
    if (!ALLOWED_EVIDENCE_TYPES.includes(item.arming_evidence_type)) {
      return {
        schema_version: 'v428',
        status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid arming_evidence_type: ${item.arming_evidence_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_arming_evidence_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v428',
      status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL,
      errors: [`missing required_arming_evidence_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!release_command_arming_binder_ready) {
    return {
      schema_version: 'v428',
      status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_ARMING,
      errors: ['release_command_arming_binder_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v428',
      command_arming_evidence_receipt_id,
      release_command_arming_binder_id,
      arming_evidence_level,
    }))
    .digest('hex');

  return {
    schema_version: 'v428',
    status: STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_READY,
    hash,
    errors: [],
    command_arming_evidence_receipt_id,
    release_command_arming_binder_id,
    arming_evidence_level,
    arming_evidence_items_count: arming_evidence_items.length,
    final_message: 'V428 command arming evidence receipt recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_READY) return false;
  if (result.command_arming_evidence_receipt_published !== false) return false;
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
    return '[V428] Command Arming Evidence Receipt — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V428] Command Arming Evidence Receipt',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.command_arming_evidence_receipt_id) {
    lines.push(`Evidence Receipt ID: ${result.command_arming_evidence_receipt_id}`);
  }
  if (result.arming_evidence_level) {
    lines.push(`Evidence Level: ${result.arming_evidence_level}`);
  }
  if (result.release_command_arming_binder_id) {
    lines.push(`Arming Binder ID: ${result.release_command_arming_binder_id}`);
  }
  lines.push(`command_arming_evidence_receipt_published: ${result.command_arming_evidence_receipt_published}`);
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