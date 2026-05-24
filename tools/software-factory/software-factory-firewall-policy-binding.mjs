import { createHash } from 'crypto';

export const STATUSES = [
  'FIREWALL_POLICY_BINDING_BLOCKED_INPUT',
  'FIREWALL_POLICY_BINDING_BLOCKED_GRAPH',
  'FIREWALL_POLICY_BINDING_FAIL',
  'FIREWALL_POLICY_BINDING_READY',
];

const ALLOWED_POLICY_TYPES = new Set([
  'release_policy','deployment_policy','tag_policy','stable_policy','artifact_policy',
  'production_policy','billing_policy','secret_policy','network_policy',
  'rollback_policy','audit_policy','emergency_stop_policy',
]);

const ALLOWED_POLICY_MODES = new Set([
  'blocked','metadata-only','contract-only','dry-run','planning',
]);

const REQUIRED_CONTROLS = [
  'firewall-policy-required','dependency-graph-required','no-real-policy-enforcement',
  'no-real-release','no-real-deploy','no-tag-create','no-stable-promotion',
  'no-artifact-publish','no-production-touch','no-billing-execution',
  'no-secret-access','no-network','no-real-rollback','audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v381.0',
  firewall_policy_binding_id: null,
  firewall_policy_binding_ready: false,
  firewall_dependency_graph_id: null,
  firewall_dependency_graph_ready: false,
  policy_items: [],
  policy_items_count: 0,
  required_policy_controls: [],
  required_policy_controls_count: 0,
  policy_level: null,
  policy_hash: null,
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
    return { ...BASE, errors: ['FIREWALL_POLICY_BINDING_BLOCKED_INPUT'] };
  }
  if (!input.firewall_policy_binding_id || typeof input.firewall_policy_binding_id !== 'string') {
    return { ...BASE, errors: ['FIREWALL_POLICY_BINDING_BLOCKED_INPUT: missing firewall_policy_binding_id'] };
  }
  if (input.firewall_dependency_graph_ready !== true) {
    return { ...BASE, firewall_policy_binding_id: input.firewall_policy_binding_id, errors: ['FIREWALL_POLICY_BINDING_BLOCKED_GRAPH: firewall_dependency_graph_ready must be true'] };
  }
  if (!input.firewall_dependency_graph_id || typeof input.firewall_dependency_graph_id !== 'string') {
    return { ...BASE, firewall_policy_binding_id: input.firewall_policy_binding_id, errors: ['FIREWALL_POLICY_BINDING_BLOCKED_GRAPH: missing firewall_dependency_graph_id'] };
  }
  const items = input.policy_items || [];
  const errors = [];
  if (!items.length) { errors.push('FIREWALL_POLICY_BINDING_FAIL: policy_items must not be empty'); }
  for (const it of items) {
    if (!it || !it.policy_id || typeof it.policy_id !== 'string') { errors.push('FIREWALL_POLICY_BINDING_FAIL: item missing policy_id'); continue; }
    if (!ALLOWED_POLICY_TYPES.has(it.policy_type)) { errors.push(`FIREWALL_POLICY_BINDING_FAIL: item ${it.policy_id} invalid policy_type`); }
    if (!ALLOWED_POLICY_MODES.has(it.policy_mode)) { errors.push(`FIREWALL_POLICY_BINDING_FAIL: item ${it.policy_id} invalid policy_mode`); }
    if (!it.policy_hash || typeof it.policy_hash !== 'string' || it.policy_hash.length !== 64) { errors.push(`FIREWALL_POLICY_BINDING_FAIL: item ${it.policy_id} invalid policy_hash`); }
  }
  const controls = input.required_policy_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`FIREWALL_POLICY_BINDING_FAIL: missing controls: ${missingControls.join(', ')}`); }
  if (!input.policy_level || typeof input.policy_level !== 'string') { errors.push('FIREWALL_POLICY_BINDING_FAIL: missing policy_level'); }
  if (errors.length > 0) return { ...BASE, firewall_policy_binding_id: input.firewall_policy_binding_id, firewall_dependency_graph_id: input.firewall_dependency_graph_id, firewall_dependency_graph_ready: true, errors };
  const h = hash({ id: input.firewall_policy_binding_id, items, controls, level: input.policy_level });
  return {
    ...BASE,
    firewall_policy_binding_id: input.firewall_policy_binding_id,
    firewall_policy_binding_ready: true,
    firewall_dependency_graph_id: input.firewall_dependency_graph_id,
    firewall_dependency_graph_ready: true,
    policy_items: input.policy_items,
    policy_items_count: input.policy_items.length,
    required_policy_controls: controls,
    required_policy_controls_count: controls.length,
    policy_level: input.policy_level,
    policy_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.firewall_policy_binding_id) e.push('missing firewall_policy_binding_id');
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
  if (!result || typeof result !== 'object') return 'FIREWALL_POLICY_BINDING_BLOCKED_INPUT';
  let status;
  if (result.firewall_policy_binding_ready) status = 'FIREWALL_POLICY_BINDING_READY';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_POLICY_BINDING_BLOCKED_GRAPH'))) status = 'FIREWALL_POLICY_BINDING_BLOCKED_GRAPH';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_POLICY_BINDING_FAIL'))) status = 'FIREWALL_POLICY_BINDING_FAIL';
  else status = 'FIREWALL_POLICY_BINDING_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfirewall_policy_binding_id: ${result.firewall_policy_binding_id || '(none)'}\nfirewall_policy_binding_ready: ${result.firewall_policy_binding_ready}\nfirewall_dependency_graph_id: ${result.firewall_dependency_graph_id || '(none)'}\nfirewall_dependency_graph_ready: ${result.firewall_dependency_graph_ready}\npolicy_items_count: ${result.policy_items_count}\npolicy_level: ${result.policy_level || '(none)'}\n`;
  if (result.policy_hash) out += `policy_hash: ${result.policy_hash}\n`;
  ['firewall_policy_bound','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
