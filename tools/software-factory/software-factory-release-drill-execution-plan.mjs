import { createHash } from 'crypto';

export const STATUSES = [
  'RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT',
  'RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE',
  'RELEASE_DRILL_EXECUTION_PLAN_FAIL',
  'RELEASE_DRILL_EXECUTION_PLAN_READY',
];

const ALLOWED_PLAN_TYPES = [
  'release_step', 'deploy_step', 'tag_step', 'stable_step', 'artifact_step',
  'production_step', 'billing_step', 'secret_step', 'network_step',
  'rollback_step', 'verification_step', 'emergency_stop_step',
];

const ALLOWED_PLAN_MODES = [
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
];

const REQUIRED_CONTROLS = [
  'release-drill-plan-required',
  'scope-binding-required',
  'plan-is-metadata-only',
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
  'verification-required',
  'audit-required',
  'human-approval-required',
  'pass-gold-required',
];

const HEX64 = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v389.0',
  release_drill_execution_plan_id: null,
  plan_ready: false,
  release_drill_scope_binder_id: null,
  release_drill_scope_binder_ready: false,
  plan_items: [],
  plan_level: null,
  required_plan_controls: [],
  missing_controls: [],
  invalid_items: [],
  plan_hash: null,
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

const FINAL_MESSAGE = 'V389 release drill execution plan registered as metadata-only in-memory artifact. This plan is not published or deployed. All firewall consolidation modules (V377-V386) remain active governance. Real release, deploy, tag, stable promotion, artifact publish, production touch, billing, network, secret access, and rollback remain blocked until explicit PASS GOLD REAL authority.';

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function validateItems(items) {
  const invalid = [];
  if (!Array.isArray(items) || items.length === 0) return { ok: false, invalid: ['plan_items must be non-empty array'] };
  for (const item of items) {
    if (!item || typeof item !== 'object') { invalid.push('item not object'); continue; }
    if (!item.plan_id || typeof item.plan_id !== 'string') invalid.push(`item missing plan_id`);
    if (!ALLOWED_PLAN_TYPES.includes(item.plan_type)) invalid.push(`invalid plan_type: ${item.plan_type}`);
    if (!ALLOWED_PLAN_MODES.includes(item.plan_mode)) invalid.push(`invalid plan_mode: ${item.plan_mode}`);
    if (!item.plan_hash || !HEX64.test(item.plan_hash)) invalid.push(`invalid plan_hash for ${item.plan_id || 'unknown'}`);
    if (!Number.isInteger(item.order) || item.order <= 0) invalid.push(`invalid order for ${item.plan_id || 'unknown'}: must be positive integer`);
  }
  return { ok: invalid.length === 0, invalid };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT'] };
  }
  if (!input.release_drill_execution_plan_id || typeof input.release_drill_execution_plan_id !== 'string') {
    return { ...BASE, errors: ['RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT: missing release_drill_execution_plan_id'] };
  }
  if (!input.release_drill_scope_binder_id || typeof input.release_drill_scope_binder_id !== 'string') {
    return { ...BASE, release_drill_execution_plan_id: input.release_drill_execution_plan_id, errors: ['RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE: missing release_drill_scope_binder_id'] };
  }
  if (input.release_drill_scope_binder_ready !== true) {
    return { ...BASE, release_drill_execution_plan_id: input.release_drill_execution_plan_id, release_drill_scope_binder_id: input.release_drill_scope_binder_id, errors: ['RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE: release_drill_scope_binder_ready must be true'] };
  }
  const controls = Array.isArray(input.required_plan_controls) ? input.required_plan_controls : [];
  const missing = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missing.length > 0) {
    return { ...BASE, release_drill_execution_plan_id: input.release_drill_execution_plan_id, release_drill_scope_binder_id: input.release_drill_scope_binder_id, release_drill_scope_binder_ready: true, missing_controls: missing, errors: [`RELEASE_DRILL_EXECUTION_PLAN_FAIL: missing controls: ${missing.join(', ')}`] };
  }
  const itemCheck = validateItems(input.plan_items);
  if (!itemCheck.ok) {
    return { ...BASE, release_drill_execution_plan_id: input.release_drill_execution_plan_id, release_drill_scope_binder_id: input.release_drill_scope_binder_id, release_drill_scope_binder_ready: true, invalid_items: itemCheck.invalid, errors: [`RELEASE_DRILL_EXECUTION_PLAN_FAIL: ${itemCheck.invalid.join('; ')}`] };
  }
  if (!input.plan_level || typeof input.plan_level !== 'string') {
    return { ...BASE, release_drill_execution_plan_id: input.release_drill_execution_plan_id, release_drill_scope_binder_id: input.release_drill_scope_binder_id, release_drill_scope_binder_ready: true, errors: ['RELEASE_DRILL_EXECUTION_PLAN_FAIL: missing plan_level'] };
  }
  const h = hash({ id: input.release_drill_execution_plan_id, scope_id: input.release_drill_scope_binder_id, items: input.plan_items, level: input.plan_level, controls });
  return {
    ...BASE,
    release_drill_execution_plan_id: input.release_drill_execution_plan_id,
    plan_ready: true,
    release_drill_scope_binder_id: input.release_drill_scope_binder_id,
    release_drill_scope_binder_ready: true,
    plan_items: input.plan_items,
    plan_level: input.plan_level,
    required_plan_controls: controls,
    missing_controls: [],
    invalid_items: [],
    plan_hash: h,
    final_message: FINAL_MESSAGE,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.release_drill_execution_plan_id) e.push('missing release_drill_execution_plan_id');
  const MUST_FALSE = [
    'supervised_release_drill_command_received',
    'release_drill_scope_bound', 'release_drill_plan_published',
    'release_drill_noop_executed', 'release_drill_result_verified',
    'release_drill_evidence_receipt_published', 'release_drill_risk_classified',
    'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
    'release_firewall_consolidation_phase_passed', 'release_firewall_registry_published',
    'unified_firewall_snapshot_published', 'firewall_chain_integrity_confirmed',
    'firewall_dependency_graph_published', 'firewall_policy_bound',
    'unified_release_authority_report_published', 'firewall_evidence_index_published',
    'firewall_drift_detected', 'firewall_regression_guard_enabled',
    'unified_firewall_final_review_approved', 'release_execution_firewall_phase_passed',
    'release_execution_firewall_enabled', 'production_mutation_firewall_locked',
    'secret_access_firewall_locked', 'billing_execution_firewall_locked',
    'network_execution_firewall_locked', 'artifact_tag_stable_firewall_locked',
    'rollback_execution_firewall_locked', 'last_mile_noop_drill_completed',
    'firewall_evidence_receipt_published', 'firewall_final_authority_approved',
    'real_release_executed', 'real_deploy_executed', 'real_tag_created',
    'real_stable_promoted', 'artifact_published', 'production_touched',
    'billing_executed', 'secrets_accessed', 'network_accessed', 'rollback_executed',
    'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
    'real_execution_allowed',
  ];
  MUST_FALSE.forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT';
  let status;
  if (result.plan_ready) status = 'RELEASE_DRILL_EXECUTION_PLAN_READY';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE'))) status = 'RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_SCOPE';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_EXECUTION_PLAN_FAIL'))) status = 'RELEASE_DRILL_EXECUTION_PLAN_FAIL';
  else status = 'RELEASE_DRILL_EXECUTION_PLAN_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_drill_execution_plan_id: ${result.release_drill_execution_plan_id || '(none)'}\nplan_ready: ${result.plan_ready}\nrelease_drill_scope_binder_id: ${result.release_drill_scope_binder_id || '(none)'}\nrelease_drill_scope_binder_ready: ${result.release_drill_scope_binder_ready}\nplan_level: ${result.plan_level || '(none)'}\nplan_items_count: ${Array.isArray(result.plan_items) ? result.plan_items.length : 0}\n`;
  if (result.plan_hash) out += `plan_hash: ${result.plan_hash}\n`;
  if (result.missing_controls?.length) out += `missing_controls: ${result.missing_controls.join(', ')}\n`;
  if (result.invalid_items?.length) out += `invalid_items: ${result.invalid_items.join('; ')}\n`;
  ['release_drill_plan_published', 'release_drill_scope_bound', 'supervised_release_drill_command_received',
   'supervised_release_drill_phase_passed', 'release_firewall_consolidation_phase_passed',
   'release_execution_firewall_phase_passed', 'release_allowed', 'deploy_allowed',
   'stable_allowed', 'tag_allowed', 'real_execution_allowed', 'production_touched',
   'artifact_published', 'billing_executed', 'secrets_accessed', 'network_accessed',
   'rollback_executed', 'real_release_executed', 'real_deploy_executed',
   'real_tag_created', 'real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.final_message) out += `final_message: ${result.final_message}\n`;
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
