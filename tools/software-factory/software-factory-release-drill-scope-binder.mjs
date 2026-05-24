import { createHash } from 'crypto';

export const STATUSES = [
  'RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT',
  'RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND',
  'RELEASE_DRILL_SCOPE_BINDER_FAIL',
  'RELEASE_DRILL_SCOPE_BINDER_READY',
];

const ALLOWED_SCOPE_TYPES = [
  'release_scope', 'deployment_scope', 'tag_scope', 'stable_scope', 'artifact_scope',
  'production_scope', 'billing_scope', 'secret_scope', 'network_scope',
  'rollback_scope', 'audit_scope', 'emergency_stop_scope',
];

const ALLOWED_SCOPE_MODES = [
  'blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op',
];

const REQUIRED_CONTROLS = [
  'release-drill-scope-required',
  'supervised-command-required',
  'scope-is-metadata-only',
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
  schema_version: 'v388.0',
  release_drill_scope_binder_id: null,
  binder_ready: false,
  supervised_release_drill_command_contract_id: null,
  supervised_release_drill_command_contract_ready: false,
  scope_items: [],
  scope_level: null,
  required_scope_controls: [],
  missing_controls: [],
  invalid_items: [],
  binder_hash: null,
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

const FINAL_MESSAGE = 'V388 release drill scope bound. Scope is metadata-only — no production, deploy, tag, stable, artifact, billing, network, secret, or rollback scope unlocked. All firewall consolidation modules (V377-V386) remain active governance. Real release remains blocked until explicit PASS GOLD REAL authority.';

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function validateItems(items) {
  const invalid = [];
  if (!Array.isArray(items) || items.length === 0) return { ok: false, invalid: ['scope_items must be non-empty array'] };
  for (const item of items) {
    if (!item || typeof item !== 'object') { invalid.push('item not object'); continue; }
    if (!item.scope_id || typeof item.scope_id !== 'string') invalid.push(`item missing scope_id`);
    if (!ALLOWED_SCOPE_TYPES.includes(item.scope_type)) invalid.push(`invalid scope_type: ${item.scope_type}`);
    if (!ALLOWED_SCOPE_MODES.includes(item.scope_mode)) invalid.push(`invalid scope_mode: ${item.scope_mode}`);
    if (!item.scope_hash || !HEX64.test(item.scope_hash)) invalid.push(`invalid scope_hash for ${item.scope_id || 'unknown'}`);
  }
  return { ok: invalid.length === 0, invalid };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT'] };
  }
  if (!input.release_drill_scope_binder_id || typeof input.release_drill_scope_binder_id !== 'string') {
    return { ...BASE, errors: ['RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT: missing release_drill_scope_binder_id'] };
  }
  if (!input.supervised_release_drill_command_contract_id || typeof input.supervised_release_drill_command_contract_id !== 'string') {
    return { ...BASE, release_drill_scope_binder_id: input.release_drill_scope_binder_id, errors: ['RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND: missing supervised_release_drill_command_contract_id'] };
  }
  if (input.supervised_release_drill_command_contract_ready !== true) {
    return { ...BASE, release_drill_scope_binder_id: input.release_drill_scope_binder_id, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, errors: ['RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND: supervised_release_drill_command_contract_ready must be true'] };
  }
  const controls = Array.isArray(input.required_scope_controls) ? input.required_scope_controls : [];
  const missing = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missing.length > 0) {
    return { ...BASE, release_drill_scope_binder_id: input.release_drill_scope_binder_id, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, supervised_release_drill_command_contract_ready: true, missing_controls: missing, errors: [`RELEASE_DRILL_SCOPE_BINDER_FAIL: missing controls: ${missing.join(', ')}`] };
  }
  const itemCheck = validateItems(input.scope_items);
  if (!itemCheck.ok) {
    return { ...BASE, release_drill_scope_binder_id: input.release_drill_scope_binder_id, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, supervised_release_drill_command_contract_ready: true, invalid_items: itemCheck.invalid, errors: [`RELEASE_DRILL_SCOPE_BINDER_FAIL: ${itemCheck.invalid.join('; ')}`] };
  }
  if (!input.scope_level || typeof input.scope_level !== 'string') {
    return { ...BASE, release_drill_scope_binder_id: input.release_drill_scope_binder_id, supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id, supervised_release_drill_command_contract_ready: true, errors: ['RELEASE_DRILL_SCOPE_BINDER_FAIL: missing scope_level'] };
  }
  const h = hash({ id: input.release_drill_scope_binder_id, cmd_id: input.supervised_release_drill_command_contract_id, items: input.scope_items, level: input.scope_level, controls });
  return {
    ...BASE,
    release_drill_scope_binder_id: input.release_drill_scope_binder_id,
    binder_ready: true,
    supervised_release_drill_command_contract_id: input.supervised_release_drill_command_contract_id,
    supervised_release_drill_command_contract_ready: true,
    scope_items: input.scope_items,
    scope_level: input.scope_level,
    required_scope_controls: controls,
    missing_controls: [],
    invalid_items: [],
    binder_hash: h,
    final_message: FINAL_MESSAGE,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.release_drill_scope_binder_id) e.push('missing release_drill_scope_binder_id');
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
  if (!result || typeof result !== 'object') return 'RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT';
  let status;
  if (result.binder_ready) status = 'RELEASE_DRILL_SCOPE_BINDER_READY';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND'))) status = 'RELEASE_DRILL_SCOPE_BINDER_BLOCKED_COMMAND';
  else if (result.errors?.some(e => e.startsWith('RELEASE_DRILL_SCOPE_BINDER_FAIL'))) status = 'RELEASE_DRILL_SCOPE_BINDER_FAIL';
  else status = 'RELEASE_DRILL_SCOPE_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_drill_scope_binder_id: ${result.release_drill_scope_binder_id || '(none)'}\nbinder_ready: ${result.binder_ready}\nsupervised_release_drill_command_contract_id: ${result.supervised_release_drill_command_contract_id || '(none)'}\nsupervised_release_drill_command_contract_ready: ${result.supervised_release_drill_command_contract_ready}\nscope_level: ${result.scope_level || '(none)'}\nscope_items_count: ${Array.isArray(result.scope_items) ? result.scope_items.length : 0}\n`;
  if (result.binder_hash) out += `binder_hash: ${result.binder_hash}\n`;
  if (result.missing_controls?.length) out += `missing_controls: ${result.missing_controls.join(', ')}\n`;
  if (result.invalid_items?.length) out += `invalid_items: ${result.invalid_items.join('; ')}\n`;
  ['release_drill_scope_bound', 'supervised_release_drill_command_received', 'supervised_release_drill_phase_passed',
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
