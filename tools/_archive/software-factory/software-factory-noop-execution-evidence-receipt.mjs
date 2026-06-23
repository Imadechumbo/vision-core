import { createHash } from 'crypto';

export const STATUSES = {
  NOOP_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'NOOP_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  NOOP_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_NOOP: 'NOOP_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_NOOP',
  NOOP_EXECUTION_EVIDENCE_RECEIPT_FAIL: 'NOOP_EXECUTION_EVIDENCE_RECEIPT_FAIL',
  NOOP_EXECUTION_EVIDENCE_RECEIPT_READY: 'NOOP_EXECUTION_EVIDENCE_RECEIPT_READY',
};

const REQUIRED_CONTROLS = [
  'noop-execution-evidence-receipt-required',
  'final-noop-execution-required',
  'metadata-only-evidence',
  'noop-evidence-not-published',
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

const ALLOWED_EVIDENCE_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_EVIDENCE_TYPES = [
  'release_noop_execution_evidence',
  'deploy_noop_execution_evidence',
  'tag_noop_execution_evidence',
  'stable_noop_execution_evidence',
  'artifact_noop_execution_evidence',
  'production_noop_execution_evidence',
  'billing_noop_execution_evidence',
  'secret_noop_execution_evidence',
  'network_noop_execution_evidence',
  'rollback_noop_execution_evidence',
  'operator_noop_execution_evidence',
  'emergency_stop_noop_execution_evidence',
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
      schema_version: 'v433',
      status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    noop_execution_evidence_receipt_id,
    final_noop_execution_binder_id,
    final_noop_execution_binder_ready,
    noop_evidence_items,
    required_noop_evidence_controls,
    noop_evidence_level,
  } = input;

  const errors = [];

  if (!noop_execution_evidence_receipt_id || typeof noop_execution_evidence_receipt_id !== 'string') {
    errors.push('noop_execution_evidence_receipt_id required (string)');
  }
  if (!final_noop_execution_binder_id || typeof final_noop_execution_binder_id !== 'string') {
    errors.push('final_noop_execution_binder_id required (string)');
  }
  if (typeof final_noop_execution_binder_ready !== 'boolean') {
    errors.push('final_noop_execution_binder_ready required (boolean)');
  }
  if (!Array.isArray(noop_evidence_items)) {
    errors.push('noop_evidence_items required (array)');
  }
  if (!Array.isArray(required_noop_evidence_controls)) {
    errors.push('required_noop_evidence_controls required (array)');
  }
  if (!noop_evidence_level || typeof noop_evidence_level !== 'string') {
    errors.push('noop_evidence_level required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v433',
      status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  const missingControls = REQUIRED_CONTROLS.filter(c => !required_noop_evidence_controls.includes(c));
  if (missingControls.length > 0) {
    return {
      schema_version: 'v433',
      status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_FAIL,
      errors: [`missing required_noop_evidence_controls: ${missingControls.join(', ')}`],
      ...invariants(),
    };
  }

  for (const item of noop_evidence_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v433',
        status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_FAIL,
        errors: ['each noop_evidence_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_EVIDENCE_TYPES.includes(item.noop_evidence_type)) {
      return {
        schema_version: 'v433',
        status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid noop_evidence_type: ${item.noop_evidence_type}`],
        ...invariants(),
      };
    }
    if (!ALLOWED_EVIDENCE_MODES.includes(item.noop_evidence_mode)) {
      return {
        schema_version: 'v433',
        status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid noop_evidence_mode: ${item.noop_evidence_mode}`],
        ...invariants(),
      };
    }
  }

  if (!final_noop_execution_binder_ready) {
    return {
      schema_version: 'v433',
      status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_BLOCKED_NOOP,
      errors: ['final_noop_execution_binder_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v433',
      noop_execution_evidence_receipt_id,
      final_noop_execution_binder_id,
      noop_evidence_level,
    }))
    .digest('hex');

  return {
    schema_version: 'v433',
    status: STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_READY,
    hash,
    errors: [],
    noop_execution_evidence_receipt_id,
    final_noop_execution_binder_id,
    noop_evidence_items_count: noop_evidence_items.length,
    noop_evidence_level,
    final_message: 'V433 no-op execution evidence receipt recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.NOOP_EXECUTION_EVIDENCE_RECEIPT_READY) return false;
  if (result.noop_execution_evidence_receipt_published !== false) return false;
  if (result.final_noop_execution_verified !== false) return false;
  if (result.real_release_noop_executed !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_command_armed !== false) return false;
  if (result.real_release_command_seal_created !== false) return false;
  if (result.final_noop_execution_bound !== false) return false;
  if (result.release_allowed !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V433] No-Op Execution Evidence Receipt — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V433] No-Op Execution Evidence Receipt',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.noop_execution_evidence_receipt_id) {
    lines.push(`Evidence Receipt ID: ${result.noop_execution_evidence_receipt_id}`);
  }
  if (result.noop_evidence_level) {
    lines.push(`Evidence Level: ${result.noop_evidence_level}`);
  }
  lines.push(`noop_execution_evidence_receipt_published: ${result.noop_execution_evidence_receipt_published}`);
  lines.push(`final_noop_execution_verified: ${result.final_noop_execution_verified}`);
  lines.push(`real_release_noop_executed: ${result.real_release_noop_executed}`);
  lines.push(`real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`real_release_command_armed: ${result.real_release_command_armed}`);
  lines.push(`real_release_command_seal_created: ${result.real_release_command_seal_created}`);
  lines.push(`final_noop_execution_bound: ${result.final_noop_execution_bound}`);
  if (result.final_message) {
    lines.push(`Final: ${result.final_message}`);
  }
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}