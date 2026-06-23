import { createHash } from 'crypto';

export const STATUSES = [
  'UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT',
  'UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY',
  'UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL',
  'UNIFIED_RELEASE_AUTHORITY_REPORT_READY',
];

const ALLOWED_REPORT_TYPES = new Set([
  'registry_report','snapshot_report','chain_integrity_report','dependency_graph_report',
  'policy_binding_report','firewall_state_report','authority_state_report',
  'evidence_state_report','execution_block_report','risk_report','emergency_stop_report',
]);

const ALLOWED_REPORT_MODES = new Set([
  'blocked','metadata-only','contract-only','dry-run','planning',
]);

const REQUIRED_CONTROLS = [
  'unified-report-required','policy-binding-required','no-real-report-publish',
  'no-real-release','no-real-deploy','no-tag-create','no-stable-promotion',
  'no-artifact-publish','no-production-touch','no-billing-execution',
  'no-secret-access','no-network','no-real-rollback','audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v382.0',
  unified_release_authority_report_id: null,
  unified_release_authority_report_ready: false,
  firewall_policy_binding_id: null,
  firewall_policy_binding_ready: false,
  report_items: [],
  report_items_count: 0,
  required_report_controls: [],
  required_report_controls_count: 0,
  report_level: null,
  report_hash: null,
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
    return { ...BASE, errors: ['UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT'] };
  }
  if (!input.unified_release_authority_report_id || typeof input.unified_release_authority_report_id !== 'string') {
    return { ...BASE, errors: ['UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT: missing unified_release_authority_report_id'] };
  }
  if (input.firewall_policy_binding_ready !== true) {
    return { ...BASE, unified_release_authority_report_id: input.unified_release_authority_report_id, errors: ['UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY: firewall_policy_binding_ready must be true'] };
  }
  if (!input.firewall_policy_binding_id || typeof input.firewall_policy_binding_id !== 'string') {
    return { ...BASE, unified_release_authority_report_id: input.unified_release_authority_report_id, errors: ['UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY: missing firewall_policy_binding_id'] };
  }
  const items = input.report_items || [];
  const errors = [];
  if (!items.length) { errors.push('UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: report_items must not be empty'); }
  for (const it of items) {
    if (!it || !it.report_id || typeof it.report_id !== 'string') { errors.push('UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: item missing report_id'); continue; }
    if (!ALLOWED_REPORT_TYPES.has(it.report_type)) { errors.push(`UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: item ${it.report_id} invalid report_type`); }
    if (!ALLOWED_REPORT_MODES.has(it.report_mode)) { errors.push(`UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: item ${it.report_id} invalid report_mode`); }
    if (!it.report_hash || typeof it.report_hash !== 'string' || it.report_hash.length !== 64) { errors.push(`UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: item ${it.report_id} invalid report_hash`); }
  }
  const controls = input.required_report_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: missing controls: ${missingControls.join(', ')}`); }
  if (!input.report_level || typeof input.report_level !== 'string') { errors.push('UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL: missing report_level'); }
  if (errors.length > 0) return { ...BASE, unified_release_authority_report_id: input.unified_release_authority_report_id, firewall_policy_binding_id: input.firewall_policy_binding_id, firewall_policy_binding_ready: true, errors };
  const h = hash({ id: input.unified_release_authority_report_id, items, controls, level: input.report_level });
  return {
    ...BASE,
    unified_release_authority_report_id: input.unified_release_authority_report_id,
    unified_release_authority_report_ready: true,
    firewall_policy_binding_id: input.firewall_policy_binding_id,
    firewall_policy_binding_ready: true,
    report_items: input.report_items,
    report_items_count: input.report_items.length,
    required_report_controls: controls,
    required_report_controls_count: controls.length,
    report_level: input.report_level,
    report_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.unified_release_authority_report_id) e.push('missing unified_release_authority_report_id');
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
  if (!result || typeof result !== 'object') return 'UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT';
  let status;
  if (result.unified_release_authority_report_ready) status = 'UNIFIED_RELEASE_AUTHORITY_REPORT_READY';
  else if (result.errors?.some(e => e.startsWith('UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY'))) status = 'UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_POLICY';
  else if (result.errors?.some(e => e.startsWith('UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL'))) status = 'UNIFIED_RELEASE_AUTHORITY_REPORT_FAIL';
  else status = 'UNIFIED_RELEASE_AUTHORITY_REPORT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nunified_release_authority_report_id: ${result.unified_release_authority_report_id || '(none)'}\nunified_release_authority_report_ready: ${result.unified_release_authority_report_ready}\nfirewall_policy_binding_id: ${result.firewall_policy_binding_id || '(none)'}\nfirewall_policy_binding_ready: ${result.firewall_policy_binding_ready}\nreport_items_count: ${result.report_items_count}\nreport_level: ${result.report_level || '(none)'}\n`;
  if (result.report_hash) out += `report_hash: ${result.report_hash}\n`;
  ['unified_release_authority_report_published','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
