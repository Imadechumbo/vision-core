import { createHash } from 'crypto';

export const STATUSES = [
  'RELEASE_DRILL_RISK_BLOCKED_INPUT',
  'RELEASE_DRILL_RISK_BLOCKED_EVIDENCE',
  'RELEASE_DRILL_RISK_FAIL',
  'RELEASE_DRILL_RISK_READY',
];

const ALLOWED_RISK_LEVELS = [
  'none', 'low', 'medium', 'high', 'critical',
];

const ALLOWED_RISK_CATEGORIES = [
  'release_risk', 'deploy_risk', 'tag_risk', 'stable_risk', 'artifact_risk',
  'production_risk', 'billing_risk', 'secret_risk', 'network_risk',
  'rollback_risk', 'data_risk', 'compliance_risk',
];

const ALLOWED_RISK_DISPOSITIONS = [
  'blocked', 'classified', 'noted', 'deferred', 'acknowledged',
];

const REQUIRED_CONTROLS = [
  'release-drill-risk-required',
  'evidence-receipt-required',
  'risk-classification-only',
  'no-risk-acceptance',
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
  'human-approval-required',
  'pass-gold-required',
];

const HEX64 = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v393.0',
  release_drill_risk_classifier_id: null,
  classifier_ready: false,
  release_drill_evidence_receipt_id: null,
  release_drill_evidence_receipt_ready: false,
  risk_items: [],
  classifier_level: null,
  required_risk_controls: [],
  missing_controls: [],
  invalid_items: [],
  classifier_hash: null,
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

const FINAL_MESSAGE = 'V393 release drill risk classifier completed. Risk items classified for supervised drill only — no risk accepted, no production decision made, no release authorized. All firewall consolidation modules (V377-V386) and supervised drill modules (V387-V392) remain active governance. Real release remains blocked until explicit PASS GOLD REAL authority.';

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function validateItems(items) {
  const invalid = [];
  if (!Array.isArray(items) || items.length === 0) return { ok: false, invalid: ['risk_items must be non-empty array'] };
  for (const item of items) {
    if (!item || typeof item !== 'object') { invalid.push('item not object'); continue; }
    if (!item.risk_id || typeof item.risk_id !== 'string') invalid.push('item missing risk_id');
    if (!ALLOWED_RISK_CATEGORIES.includes(item.risk_category)) invalid.push(`invalid risk_category: ${item.risk_category}`);
    if (!ALLOWED_RISK_LEVELS.includes(item.risk_level)) invalid.push(`invalid risk_level: ${item.risk_level}`);
    if (!ALLOWED_RISK_DISPOSITIONS.includes(item.risk_disposition)) invalid.push(`invalid risk_disposition: ${item.risk_disposition}`);
    if (!item.risk_hash || !HEX64.test(item.risk_hash)) invalid.push(`invalid risk_hash for ${item.risk_id || 'unknown'}`);
  }
  return { ok: invalid.length === 0, invalid };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['RELEASE_DRILL_RISK_BLOCKED_INPUT'] };
  }
  if (!input.release_drill_risk_classifier_id || typeof input.release_drill_risk_classifier_id !== 'string') {
    return { ...BASE, errors: ['RELEASE_DRILL_RISK_BLOCKED_INPUT: missing release_drill_risk_classifier_id'] };
  }
  if (!input.release_drill_evidence_receipt_id || typeof input.release_drill_evidence_receipt_id !== 'string') {
    return { ...BASE, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, errors: ['RELEASE_DRILL_RISK_BLOCKED_EVIDENCE: missing release_drill_evidence_receipt_id'] };
  }
  if (input.release_drill_evidence_receipt_ready !== true) {
    return { ...BASE, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_evidence_receipt_id: input.release_drill_evidence_receipt_id, errors: ['RELEASE_DRILL_RISK_BLOCKED_EVIDENCE: release_drill_evidence_receipt_ready must be true'] };
  }
  const controls = Array.isArray(input.required_risk_controls) ? input.required_risk_controls : [];
  const missing = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missing.length > 0) {
    return { ...BASE, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_evidence_receipt_id: input.release_drill_evidence_receipt_id, release_drill_evidence_receipt_ready: true, missing_controls: missing, errors: [`RELEASE_DRILL_RISK_FAIL: missing controls: ${missing.join(', ')}`] };
  }
  const itemCheck = validateItems(input.risk_items);
  if (!itemCheck.ok) {
    return { ...BASE, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_evidence_receipt_id: input.release_drill_evidence_receipt_id, release_drill_evidence_receipt_ready: true, invalid_items: itemCheck.invalid, errors: [`RELEASE_DRILL_RISK_FAIL: ${itemCheck.invalid.join('; ')}`] };
  }
  if (!input.classifier_level || typeof input.classifier_level !== 'string') {
    return { ...BASE, release_drill_risk_classifier_id: input.release_drill_risk_classifier_id, release_drill_evidence_receipt_id: input.release_drill_evidence_receipt_id, release_drill_evidence_receipt_ready: true, errors: ['RELEASE_DRILL_RISK_FAIL: missing classifier_level'] };
  }
  const h = hash({ id: input.release_drill_risk_classifier_id, evidence_id: input.release_drill_evidence_receipt_id, items: input.risk_items, level: input.classifier_level, controls });
  return {
    ...BASE,
    release_drill_risk_classifier_id: input.release_drill_risk_classifier_id,
    classifier_ready: true,
    release_drill_evidence_receipt_id: input.release_drill_evidence_receipt_id,
    release_drill_evidence_receipt_ready: true,
    risk_items: input.risk_items,
    classifier_level: input.classifier_level,
    required_risk_controls: controls,
    missing_controls: [],
    invalid_items: [],
    classifier_hash: h,
    final_message: FINAL_MESSAGE,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.release_drill_risk_classifier_id) e.push('missing release_drill_risk_classifier_id');
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
  if (!result || typeof result !== 'object') return 'RELEASE_DRILL_RISK_BLOCKED_INPUT';
  let status;
  if (result.classifier_ready) status = 'RELEASE_DRILL_RISK_READY';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_RISK_BLOCKED_EVIDENCE'))) status = 'RELEASE_DRILL_RISK_BLOCKED_EVIDENCE';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_RISK_FAIL'))) status = 'RELEASE_DRILL_RISK_FAIL';
  else status = 'RELEASE_DRILL_RISK_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_drill_risk_classifier_id: ${result.release_drill_risk_classifier_id || '(none)'}\nclassifier_ready: ${result.classifier_ready}\nrelease_drill_evidence_receipt_id: ${result.release_drill_evidence_receipt_id || '(none)'}\nrelease_drill_evidence_receipt_ready: ${result.release_drill_evidence_receipt_ready}\nclassifier_level: ${result.classifier_level || '(none)'}\nrisk_items_count: ${Array.isArray(result.risk_items) ? result.risk_items.length : 0}\n`;
  if (result.classifier_hash) out += `classifier_hash: ${result.classifier_hash}\n`;
  if (result.missing_controls?.length) out += `missing_controls: ${result.missing_controls.join(', ')}\n`;
  if (result.invalid_items?.length) out += `invalid_items: ${result.invalid_items.join('; ')}\n`;
  ['release_drill_risk_accepted', 'release_drill_evidence_published', 'release_drill_authority_approved',
   'release_drill_risk_classified', 'supervised_release_drill_phase_passed',
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
