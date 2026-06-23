import { createHash } from 'crypto';

export const STATUSES = [
  'RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT',
  'RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK',
  'RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE',
  'RELEASE_DRILL_FINAL_REVIEW_READY',
];

const ALLOWED_REVIEW_TYPES = [
  'evidence_review', 'risk_review', 'scope_review', 'plan_review',
  'execution_review', 'control_review', 'audit_review', 'summary_review',
];

const ALLOWED_REVIEW_OUTCOMES = [
  'reviewed', 'noted', 'deferred', 'flagged', 'acknowledged',
];

const REQUIRED_CONTROLS = [
  'release-drill-final-review-required',
  'risk-classifier-required',
  'review-only-no-authority',
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
  'human-review-required',
  'human-approval-required',
  'pass-gold-required',
];

const HEX64 = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v394.0',
  release_drill_final_authority_review_id: null,
  review_ready: false,
  release_drill_risk_classifier_id: null,
  release_drill_risk_classifier_ready: false,
  review_items: [],
  review_summary: null,
  review_level: null,
  required_review_controls: [],
  missing_controls: [],
  invalid_items: [],
  review_hash: null,
  release_drill_evidence_published: false,
  release_drill_risk_accepted: false,
  release_drill_authority_approved: false,
  supervised_release_drill_command_received: false,
  release_drill_scope_bound: false,
  release_drill_plan_published: false,
  release_drill_noop_executed: false,
  release_drill_result_verified: false,
  release_drill_evidence_receipt_published: false,
  release_drill_risk_classified: false,
  release_drill_final_authority_approved: false,
  supervised_release_drill_phase_passed: false,
  release_firewall_consolidation_phase_passed: false,
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
  final_message: null,
  errors: [],
};

const FINAL_MESSAGE = 'V394 release drill final authority review completed. Evidence and risk reviewed for supervised drill only — no authority granted, no real execution approved, no deploy/release/tag/stable unlocked. All firewall consolidation modules (V377-V386) and supervised drill modules (V387-V393) remain active governance. Real release remains blocked until explicit PASS GOLD REAL authority.';

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function validateItems(items) {
  const invalid = [];
  if (!Array.isArray(items) || items.length === 0) return { ok: false, invalid: ['review_items must be non-empty array'] };
  for (const item of items) {
    if (!item || typeof item !== 'object') { invalid.push('item not object'); continue; }
    if (!item.review_id || typeof item.review_id !== 'string') invalid.push('item missing review_id');
    if (!ALLOWED_REVIEW_TYPES.includes(item.review_type)) invalid.push(`invalid review_type: ${item.review_type}`);
    if (!ALLOWED_REVIEW_OUTCOMES.includes(item.review_outcome)) invalid.push(`invalid review_outcome: ${item.review_outcome}`);
    if (!item.review_hash || !HEX64.test(item.review_hash)) invalid.push(`invalid review_hash for ${item.review_id || 'unknown'}`);
  }
  return { ok: invalid.length === 0, invalid };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT'] };
  }
  if (!input.release_drill_final_authority_review_id || typeof input.release_drill_final_authority_review_id !== 'string') {
    return { ...BASE, errors: ['RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT: missing release_drill_final_authority_review_id'] };
  }
  if (!input.release_drill_risk_classifier_id || typeof input.release_drill_risk_classifier_id !== 'string') {
    return { ...BASE, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, errors: ['RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK: missing release_drill_risk_classifier_id'] };
  }
  if (input.release_drill_risk_classifier_ready !== true) {
    return { ...BASE, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, errors: ['RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK: release_drill_risk_classifier_ready must be true'] };
  }
  const controls = Array.isArray(input.required_review_controls) ? input.required_review_controls : [];
  const missing = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missing.length > 0) {
    return { ...BASE, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_risk_classifier_ready: true, missing_controls: missing, errors: [`RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE: missing controls: ${missing.join(', ')}`] };
  }
  const itemCheck = validateItems(input.review_items);
  if (!itemCheck.ok) {
    return { ...BASE, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_risk_classifier_ready: true, invalid_items: itemCheck.invalid, errors: [`RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE: ${itemCheck.invalid.join('; ')}`] };
  }
  if (!input.review_summary || typeof input.review_summary !== 'string') {
    return { ...BASE, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_risk_classifier_ready: true, errors: ['RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE: missing review_summary'] };
  }
  if (!input.review_level || typeof input.review_level !== 'string') {
    return { ...BASE, release_drill_final_authority_review_id: input.release_drill_final_authority_review_id, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_risk_classifier_ready: true, errors: ['RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE: missing review_level'] };
  }
  const h = hash({ id: input.release_drill_final_authority_review_id, risk_id: input.release_drill_risk_classifier_id, items: input.review_items, summary: input.review_summary, level: input.review_level, controls });
  return {
    ...BASE,
    release_drill_final_authority_review_id: input.release_drill_final_authority_review_id,
    review_ready: true,
    release_drill_risk_classifier_id: input.release_drill_risk_classifier_id,
    release_drill_risk_classifier_ready: true,
    review_items: input.review_items,
    review_summary: input.review_summary,
    review_level: input.review_level,
    required_review_controls: controls,
    missing_controls: [],
    invalid_items: [],
    review_hash: h,
    final_message: FINAL_MESSAGE,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.release_drill_final_authority_review_id) e.push('missing release_drill_final_authority_review_id');
  const MUST_FALSE = [
    'release_drill_evidence_published', 'release_drill_risk_accepted', 'release_drill_authority_approved',
    'supervised_release_drill_command_received', 'release_drill_scope_bound', 'release_drill_plan_published',
    'release_drill_noop_executed', 'release_drill_result_verified', 'release_drill_evidence_receipt_published',
    'release_drill_risk_classified', 'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
    'release_firewall_consolidation_phase_passed', 'release_firewall_registry_published',
    'unified_firewall_snapshot_published', 'firewall_chain_integrity_confirmed',
    'firewall_dependency_graph_published', 'firewall_policy_bound',
    'unified_release_authority_report_published', 'firewall_evidence_index_published',
    'firewall_drift_detected', 'firewall_regression_guard_enabled', 'unified_firewall_final_review_approved',
    'release_execution_firewall_phase_passed', 'release_execution_firewall_enabled',
    'production_mutation_firewall_locked', 'secret_access_firewall_locked',
    'billing_execution_firewall_locked', 'network_execution_firewall_locked',
    'artifact_tag_stable_firewall_locked', 'rollback_execution_firewall_locked',
    'last_mile_noop_drill_completed', 'firewall_evidence_receipt_published', 'firewall_final_authority_approved',
    'real_release_executed', 'real_deploy_executed', 'real_tag_created', 'real_stable_promoted',
    'artifact_published', 'production_touched', 'billing_executed', 'secrets_accessed',
    'network_accessed', 'rollback_executed', 'release_allowed', 'deploy_allowed',
    'stable_allowed', 'tag_allowed', 'real_execution_allowed',
  ];
  MUST_FALSE.forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT';
  let status;
  if (result.review_ready) status = 'RELEASE_DRILL_FINAL_REVIEW_READY';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK'))) status = 'RELEASE_DRILL_FINAL_REVIEW_BLOCKED_RISK';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE'))) status = 'RELEASE_DRILL_FINAL_REVIEW_INCOMPLETE';
  else status = 'RELEASE_DRILL_FINAL_REVIEW_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_drill_final_authority_review_id: ${result.release_drill_final_authority_review_id || '(none)'}\nreview_ready: ${result.review_ready}\nrelease_drill_risk_classifier_id: ${result.release_drill_risk_classifier_id || '(none)'}\nrelease_drill_risk_classifier_ready: ${result.release_drill_risk_classifier_ready}\nreview_summary: ${result.review_summary || '(none)'}\nreview_level: ${result.review_level || '(none)'}\nreview_items_count: ${Array.isArray(result.review_items) ? result.review_items.length : 0}\n`;
  if (result.review_hash) out += `review_hash: ${result.review_hash}\n`;
  if (result.missing_controls?.length) out += `missing_controls: ${result.missing_controls.join(', ')}\n`;
  if (result.invalid_items?.length) out += `invalid_items: ${result.invalid_items.join('; ')}\n`;
  ['release_drill_authority_approved', 'release_drill_risk_accepted', 'release_drill_evidence_published',
   'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
   'release_firewall_consolidation_phase_passed', 'release_execution_firewall_phase_passed',
   'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed', 'real_execution_allowed',
   'production_touched', 'artifact_published', 'billing_executed', 'secrets_accessed',
   'network_accessed', 'rollback_executed', 'real_release_executed', 'real_deploy_executed',
   'real_tag_created', 'real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.final_message) out += `final_message: ${result.final_message}\n`;
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
