import { createHash } from 'crypto';

export const STATUSES = {
  BLOCKED_INPUT: 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_BLOCKED_INPUT',
  BLOCKED_AUTHORITY: 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_BLOCKED_AUTHORITY',
  FAIL: 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_FAIL',
  READY: 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_READY',
};

const REQUIRED_CONTROLS = [
  'pass-gold-real-evidence-required',
  'human-authority-binding-required',
  'no-pass-gold-fabrication',
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
];

const ALLOWED_EVIDENCE_MODES = new Set([
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
]);

const ALLOWED_EVIDENCE_TYPES = new Set([
  'backend_evidence_receipt', 'go_core_evidence_receipt', 'runtime_evidence_receipt',
  'pass_gold_receipt', 'audit_receipt', 'release_drill_receipt',
  'human_authority_receipt', 'rollback_receipt',
]);

const HEX64 = /^[0-9a-f]{64}$/;

const BASE = {
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
  supervised_release_drill_phase_passed: false,
  real_release_execution_decision_received: false,
  final_human_authority_bound: false,
  final_human_authority_granted: false,
  pass_gold_real_evidence_revalidated: false,
  production_release_command_locked: false,
  production_release_command_executed: false,
  real_release_execution_final_barrier_passed: false,
  real_release_execution_authorized: false,
  real_release_execution_allowed: false,
};

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: ['input required'],
      schema_version: 'v398',
    };
  }

  const {
    pass_gold_real_evidence_revalidation_gate_id,
    final_human_authority_binding_id,
    final_human_authority_binding_ready,
    pass_gold_evidence_items = [],
    required_pass_gold_controls = [],
    revalidation_level,
  } = input;

  if (
    !pass_gold_real_evidence_revalidation_gate_id ||
    !final_human_authority_binding_id ||
    !revalidation_level
  ) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_INPUT,
      errors: [
        'pass_gold_real_evidence_revalidation_gate_id, final_human_authority_binding_id, revalidation_level required',
      ],
      schema_version: 'v398',
    };
  }

  if (!final_human_authority_binding_ready) {
    return {
      ...BASE,
      status: STATUSES.BLOCKED_AUTHORITY,
      errors: ['final_human_authority_binding_ready must be true'],
      schema_version: 'v398',
    };
  }

  const errors = [];

  if (!Array.isArray(pass_gold_evidence_items) || pass_gold_evidence_items.length === 0) {
    errors.push('pass_gold_evidence_items must be non-empty array');
  } else {
    for (const item of pass_gold_evidence_items) {
      if (!item.evidence_id) errors.push('evidence_item missing evidence_id');
      if (!ALLOWED_EVIDENCE_TYPES.has(item.evidence_type)) {
        errors.push(`invalid evidence_type: ${item.evidence_type}`);
      }
      if (!ALLOWED_EVIDENCE_MODES.has(item.evidence_mode)) {
        errors.push(`invalid evidence_mode: ${item.evidence_mode}`);
      }
      if (!HEX64.test(item.evidence_hash)) {
        errors.push(`invalid evidence_hash for ${item.evidence_id}`);
      }
      if (!item.source) errors.push(`evidence_item missing source for ${item.evidence_id}`);
    }
  }

  const missingControls = REQUIRED_CONTROLS.filter(
    (c) => !required_pass_gold_controls.includes(c)
  );
  if (missingControls.length > 0) {
    errors.push(`missing required controls: ${missingControls.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      ...BASE,
      status: STATUSES.FAIL,
      errors,
      schema_version: 'v398',
    };
  }

  const hash = createHash('sha256')
    .update(pass_gold_real_evidence_revalidation_gate_id)
    .update(final_human_authority_binding_id)
    .update(revalidation_level)
    .update(JSON.stringify(pass_gold_evidence_items))
    .digest('hex');

  return {
    ...BASE,
    status: STATUSES.READY,
    errors: [],
    schema_version: 'v398',
    pass_gold_real_evidence_revalidation_gate_id,
    final_human_authority_binding_id,
    pass_gold_evidence_items,
    required_pass_gold_controls,
    revalidation_level,
    hash,
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) return false;
  if (!HEX64.test(result.hash)) return false;
  return true;
}

export function render(result) {
  if (!result) {
    return 'PassGoldRealEvidenceRevalidationGate: no result\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }
  return [
    'PassGoldRealEvidenceRevalidationGate',
    `  status: ${result.status}`,
    `  schema_version: ${result.schema_version}`,
    `  pass_gold_real_evidence_revalidated: ${result.pass_gold_real_evidence_revalidated}`,
    `  release_allowed: ${result.release_allowed}`,
    `  real_execution_allowed: ${result.real_execution_allowed}`,
    `  final_human_authority_granted: ${result.final_human_authority_granted}`,
    `  production_touched: ${result.production_touched}`,
    `  errors: ${result.errors && result.errors.length ? result.errors.join('; ') : 'none'}`,
    'SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}
