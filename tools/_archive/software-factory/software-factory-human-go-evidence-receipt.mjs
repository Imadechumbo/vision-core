import { createHash } from 'crypto';

export const STATUSES = {
  HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT: 'HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_GO_SEAL: 'HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_GO_SEAL',
  HUMAN_GO_EVIDENCE_RECEIPT_FAIL: 'HUMAN_GO_EVIDENCE_RECEIPT_FAIL',
  HUMAN_GO_EVIDENCE_RECEIPT_READY: 'HUMAN_GO_EVIDENCE_RECEIPT_READY',
};

const REQUIRED_CONTROLS = [
  'human-go-evidence-receipt-required',
  'explicit-human-go-seal-required',
  'metadata-only-evidence',
  'go-evidence-not-published',
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

const ALLOWED_EVIDENCE_MODES = [
  'blocked',
  'metadata-only',
  'contract-only',
  'dry-run',
  'planning',
  'no-op',
];

const ALLOWED_EVIDENCE_TYPES = [
  'explicit_human_release_go_evidence',
  'explicit_human_deploy_go_evidence',
  'explicit_human_tag_go_evidence',
  'explicit_human_stable_go_evidence',
  'explicit_human_artifact_go_evidence',
  'explicit_human_production_go_evidence',
  'explicit_human_billing_go_evidence',
  'explicit_human_secret_go_evidence',
  'explicit_human_network_go_evidence',
  'explicit_human_rollback_go_evidence',
  'explicit_human_operator_go_evidence',
  'explicit_human_emergency_stop_go_evidence',
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
      schema_version: 'v423',
      status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors: ['input required'],
      ...invariants(),
    };
  }

  const {
    human_go_evidence_receipt_id,
    explicit_human_go_seal_binder_id,
    explicit_human_go_seal_binder_ready,
    go_evidence_items,
    required_go_evidence_controls,
    go_evidence_level,
  } = input;

  const errors = [];

  if (!human_go_evidence_receipt_id || typeof human_go_evidence_receipt_id !== 'string') {
    errors.push('human_go_evidence_receipt_id required (string)');
  }
  if (!explicit_human_go_seal_binder_id || typeof explicit_human_go_seal_binder_id !== 'string') {
    errors.push('explicit_human_go_seal_binder_id required (string)');
  }
  if (typeof explicit_human_go_seal_binder_ready !== 'boolean') {
    errors.push('explicit_human_go_seal_binder_ready required (boolean)');
  }
  if (!Array.isArray(go_evidence_items)) {
    errors.push('go_evidence_items required (array)');
  }
  if (!Array.isArray(required_go_evidence_controls)) {
    errors.push('required_go_evidence_controls required (array)');
  }
  if (!go_evidence_level || typeof go_evidence_level !== 'string') {
    errors.push('go_evidence_level required (string)');
  }

  if (errors.length > 0) {
    return {
      schema_version: 'v423',
      status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT,
      errors,
      ...invariants(),
    };
  }

  for (const item of go_evidence_items) {
    if (!item || typeof item !== 'object') {
      return {
        schema_version: 'v423',
        status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL,
        errors: ['each go_evidence_item must be an object'],
        ...invariants(),
      };
    }
    if (!ALLOWED_EVIDENCE_MODES.includes(item.go_evidence_mode)) {
      return {
        schema_version: 'v423',
        status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid go_evidence_mode: ${item.go_evidence_mode}`],
        ...invariants(),
      };
    }
    if (!ALLOWED_EVIDENCE_TYPES.includes(item.go_evidence_type)) {
      return {
        schema_version: 'v423',
        status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL,
        errors: [`invalid go_evidence_type: ${item.go_evidence_type}`],
        ...invariants(),
      };
    }
  }

  const missing = REQUIRED_CONTROLS.filter(c => !required_go_evidence_controls.includes(c));
  if (missing.length > 0) {
    return {
      schema_version: 'v423',
      status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL,
      errors: [`missing required_go_evidence_controls: ${missing.join(', ')}`],
      ...invariants(),
    };
  }

  if (!explicit_human_go_seal_binder_ready) {
    return {
      schema_version: 'v423',
      status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_GO_SEAL,
      errors: ['explicit_human_go_seal_binder_ready must be true'],
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      schema_version: 'v423',
      human_go_evidence_receipt_id,
      explicit_human_go_seal_binder_id,
      go_evidence_level,
    }))
    .digest('hex');

  return {
    schema_version: 'v423',
    status: STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_READY,
    hash,
    errors: [],
    human_go_evidence_receipt_id,
    explicit_human_go_seal_binder_id,
    go_evidence_level,
    go_evidence_items_count: go_evidence_items.length,
    final_message: 'V423 human GO evidence receipt recorded. Real release execution remains blocked.',
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_READY) return false;
  if (result.human_go_evidence_receipt_published !== false) return false;
  if (result.explicit_human_go_granted !== false) return false;
  if (result.final_command_authority_granted !== false) return false;
  if (result.explicit_human_go_seal_verified !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[V423] Human GO Evidence Receipt — no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  const lines = [
    '[V423] Human GO Evidence Receipt',
    `Status: ${result.status}`,
  ];
  if (result.errors && result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join('; ')}`);
  }
  if (result.hash) {
    lines.push(`Hash: ${result.hash}`);
  }
  if (result.human_go_evidence_receipt_id) {
    lines.push(`Evidence Receipt ID: ${result.human_go_evidence_receipt_id}`);
  }
  if (result.go_evidence_level) {
    lines.push(`Evidence Level: ${result.go_evidence_level}`);
  }
  if (result.explicit_human_go_seal_binder_id) {
    lines.push(`GO Seal Binder ID: ${result.explicit_human_go_seal_binder_id}`);
  }
  lines.push(`human_go_evidence_receipt_published: ${result.human_go_evidence_receipt_published}`);
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
