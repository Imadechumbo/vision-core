import { createHash } from 'crypto';

export const STATUSES = [
  'UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT',
  'UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT',
  'UNIFIED_FIREWALL_FINAL_REVIEW_DENIED',
  'UNIFIED_FIREWALL_FINAL_REVIEW_READY',
];

const ALLOWED_AUTHORITY_DECISIONS = new Set([
  'approved','denied','blocked',
]);

const ALLOWED_REVIEW_MODES = new Set([
  'blocked','metadata-only','contract-only','dry-run','planning',
]);

const REQUIRED_CONTROLS = [
  'unified-firewall-final-review-required','drift-detector-required','human-review-required',
  'no-real-execution-approval','no-real-release','no-real-deploy','no-tag-create',
  'no-stable-promotion','no-artifact-publish','no-production-touch',
  'no-billing-execution','no-secret-access','no-network','no-real-rollback',
  'audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v385.0',
  unified_firewall_final_review_id: null,
  unified_firewall_final_review_ready: false,
  firewall_drift_detector_id: null,
  firewall_drift_detector_ready: false,
  authority_decision: null,
  authority_id: null,
  review_reason: null,
  review_mode: null,
  required_review_controls: [],
  required_review_controls_count: 0,
  review_hash: null,
  release_firewall_registry_published: false,
  unified_firewall_snapshot_published: false,
  firewall_chain_integrity_confirmed: false,
  firewall_dependency_graph_published: false,
  firewall_policy_bound: false,
  unified_release_authority_report_published: false,
  firewall_evidence_index_published: false,
  firewall_drift_detected: false,
  firewall_regression_guard_enabled: false,
  unified_firewall_final_review_approved: false,
  release_firewall_consolidation_phase_passed: false,
  release_execution_firewall_phase_passed: false,
  release_execution_firewall_enabled: false,
  production_mutation_firewall_locked: false,
  secret_access_firewall_locked: false,
  billing_execution_firewall_locked: false,
  network_execution_firewall_locked: false,
  artifact_tag_stable_firewall_locked: false,
  rollback_execution_firewall_locked: false,
  last_mile_noop_drill_completed: false,
  firewall_evidence_receipt_published: false,
  firewall_final_authority_approved: false,
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
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT'] };
  }
  if (!input.unified_firewall_final_review_id || typeof input.unified_firewall_final_review_id !== 'string') {
    return { ...BASE, errors: ['UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT: missing unified_firewall_final_review_id'] };
  }
  if (input.firewall_drift_detector_ready !== true) {
    return { ...BASE, unified_firewall_final_review_id: input.unified_firewall_final_review_id, errors: ['UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT: firewall_drift_detector_ready must be true'] };
  }
  if (!input.firewall_drift_detector_id || typeof input.firewall_drift_detector_id !== 'string') {
    return { ...BASE, unified_firewall_final_review_id: input.unified_firewall_final_review_id, errors: ['UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT: missing firewall_drift_detector_id'] };
  }
  const errors = [];
  if (!input.authority_decision || !ALLOWED_AUTHORITY_DECISIONS.has(input.authority_decision)) {
    errors.push(`UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT: invalid authority_decision`);
  }
  if (!input.authority_id || typeof input.authority_id !== 'string') {
    errors.push('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT: missing authority_id');
  }
  if (!input.review_reason || typeof input.review_reason !== 'string') {
    errors.push('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT: missing review_reason');
  }
  if (!input.review_mode || !ALLOWED_REVIEW_MODES.has(input.review_mode)) {
    errors.push('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT: invalid review_mode');
  }
  if (errors.length > 0) return { ...BASE, unified_firewall_final_review_id: input.unified_firewall_final_review_id, firewall_drift_detector_id: input.firewall_drift_detector_id, firewall_drift_detector_ready: true, errors };
  if (input.authority_decision !== 'approved') {
    const controls = input.required_review_controls || [];
    const h = hash({ id: input.unified_firewall_final_review_id, decision: input.authority_decision, authority: input.authority_id, reason: input.review_reason, mode: input.review_mode, controls });
    return {
      ...BASE,
      unified_firewall_final_review_id: input.unified_firewall_final_review_id,
      firewall_drift_detector_id: input.firewall_drift_detector_id,
      firewall_drift_detector_ready: true,
      authority_decision: input.authority_decision,
      authority_id: input.authority_id,
      review_reason: input.review_reason,
      review_mode: input.review_mode,
      required_review_controls: controls,
      required_review_controls_count: controls.length,
      review_hash: h,
      errors: [`UNIFIED_FIREWALL_FINAL_REVIEW_DENIED: authority_decision=${input.authority_decision}`],
    };
  }
  const controls = input.required_review_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  const ctrlErrors = [];
  if (missingControls.length > 0) { ctrlErrors.push(`UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT: missing controls: ${missingControls.join(', ')}`); }
  if (ctrlErrors.length > 0) return { ...BASE, unified_firewall_final_review_id: input.unified_firewall_final_review_id, firewall_drift_detector_id: input.firewall_drift_detector_id, firewall_drift_detector_ready: true, errors: ctrlErrors };
  const h = hash({ id: input.unified_firewall_final_review_id, decision: input.authority_decision, authority: input.authority_id, reason: input.review_reason, mode: input.review_mode, controls });
  return {
    ...BASE,
    unified_firewall_final_review_id: input.unified_firewall_final_review_id,
    unified_firewall_final_review_ready: true,
    firewall_drift_detector_id: input.firewall_drift_detector_id,
    firewall_drift_detector_ready: true,
    authority_decision: input.authority_decision,
    authority_id: input.authority_id,
    review_reason: input.review_reason,
    review_mode: input.review_mode,
    required_review_controls: controls,
    required_review_controls_count: controls.length,
    review_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.unified_firewall_final_review_id) e.push('missing unified_firewall_final_review_id');
  const MUST_FALSE = [
    'release_firewall_registry_published','unified_firewall_snapshot_published',
    'firewall_chain_integrity_confirmed','firewall_dependency_graph_published',
    'firewall_policy_bound','unified_release_authority_report_published',
    'firewall_evidence_index_published','firewall_drift_detected',
    'firewall_regression_guard_enabled','unified_firewall_final_review_approved',
    'release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed',
    'release_execution_firewall_enabled','production_mutation_firewall_locked',
    'secret_access_firewall_locked','billing_execution_firewall_locked',
    'network_execution_firewall_locked','artifact_tag_stable_firewall_locked',
    'rollback_execution_firewall_locked','last_mile_noop_drill_completed',
    'firewall_evidence_receipt_published','firewall_final_authority_approved',
    'real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted',
    'artifact_published','production_touched','billing_executed','secrets_accessed',
    'network_accessed','rollback_executed','release_allowed','deploy_allowed',
    'stable_allowed','tag_allowed','real_execution_allowed',
  ];
  MUST_FALSE.forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT';
  let status;
  if (result.unified_firewall_final_review_ready) status = 'UNIFIED_FIREWALL_FINAL_REVIEW_READY';
  else if (result.errors?.some(e => e.startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_DENIED'))) status = 'UNIFIED_FIREWALL_FINAL_REVIEW_DENIED';
  else if (result.errors?.some(e => e.startsWith('UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT'))) status = 'UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_DRIFT';
  else status = 'UNIFIED_FIREWALL_FINAL_REVIEW_BLOCKED_INPUT';
  let out = `=== ${status} ===\nunified_firewall_final_review_id: ${result.unified_firewall_final_review_id || '(none)'}\nunified_firewall_final_review_ready: ${result.unified_firewall_final_review_ready}\nfirewall_drift_detector_id: ${result.firewall_drift_detector_id || '(none)'}\nfirewall_drift_detector_ready: ${result.firewall_drift_detector_ready}\nauthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\nreview_mode: ${result.review_mode || '(none)'}\n`;
  if (result.review_hash) out += `review_hash: ${result.review_hash}\n`;
  ['unified_firewall_final_review_approved','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
