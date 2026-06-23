import { createHash } from 'crypto';

export const STATUSES = [
  'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT',
  'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY',
  'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL',
  'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_READY',
];

const ALLOWED_SNAPSHOT_TYPES = new Set([
  'registry_snapshot','firewall_state','module_state','invariant_state',
  'dependency_state','policy_state','evidence_state','authority_state',
  'phase_state','execution_block_state','emergency_stop_state',
]);

const ALLOWED_SNAPSHOT_MODES = new Set([
  'blocked','metadata-only','contract-only','dry-run','planning',
]);

const REQUIRED_CONTROLS = [
  'snapshot-required','registry-required','no-real-publish','no-artifact-publish',
  'no-network','no-secret-access','no-production-touch','no-real-release',
  'no-real-deploy','no-tag-create','no-stable-promotion','no-real-rollback',
  'audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v378.0',
  unified_release_firewall_snapshot_id: null,
  unified_release_firewall_snapshot_ready: false,
  release_firewall_module_registry_id: null,
  release_firewall_module_registry_ready: false,
  snapshot_items: [],
  snapshot_items_count: 0,
  required_snapshot_controls: [],
  required_snapshot_controls_count: 0,
  snapshot_level: null,
  snapshot_hash: null,
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
    return { ...BASE, errors: ['UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT'] };
  }
  if (!input.unified_release_firewall_snapshot_id || typeof input.unified_release_firewall_snapshot_id !== 'string') {
    return { ...BASE, errors: ['UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT: missing unified_release_firewall_snapshot_id'] };
  }
  if (input.release_firewall_module_registry_ready !== true) {
    return { ...BASE, unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id, errors: ['UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY: release_firewall_module_registry_ready must be true'] };
  }
  if (!input.release_firewall_module_registry_id || typeof input.release_firewall_module_registry_id !== 'string') {
    return { ...BASE, unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id, errors: ['UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY: missing release_firewall_module_registry_id'] };
  }
  const items = input.snapshot_items || [];
  const errors = [];
  if (!items.length) { errors.push('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL: snapshot_items must not be empty'); }
  for (const it of items) {
    if (!it || !it.snapshot_id || typeof it.snapshot_id !== 'string') { errors.push('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL: item missing snapshot_id'); continue; }
    if (!ALLOWED_SNAPSHOT_TYPES.has(it.snapshot_type)) { errors.push(`UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL: item ${it.snapshot_id} invalid snapshot_type`); }
    if (!ALLOWED_SNAPSHOT_MODES.has(it.snapshot_mode)) { errors.push(`UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL: item ${it.snapshot_id} invalid snapshot_mode`); }
    if (!it.snapshot_hash || typeof it.snapshot_hash !== 'string' || it.snapshot_hash.length !== 64) { errors.push(`UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL: item ${it.snapshot_id} invalid snapshot_hash`); }
  }
  const controls = input.required_snapshot_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL: missing controls: ${missingControls.join(', ')}`); }
  if (!input.snapshot_level || typeof input.snapshot_level !== 'string') { errors.push('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL: missing snapshot_level'); }
  if (errors.length > 0) return { ...BASE, unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id, release_firewall_module_registry_id: input.release_firewall_module_registry_id, release_firewall_module_registry_ready: true, errors };
  const h = hash({ id: input.unified_release_firewall_snapshot_id, items, controls, level: input.snapshot_level });
  return {
    ...BASE,
    unified_release_firewall_snapshot_id: input.unified_release_firewall_snapshot_id,
    unified_release_firewall_snapshot_ready: true,
    release_firewall_module_registry_id: input.release_firewall_module_registry_id,
    release_firewall_module_registry_ready: true,
    snapshot_items: input.snapshot_items,
    snapshot_items_count: input.snapshot_items.length,
    required_snapshot_controls: controls,
    required_snapshot_controls_count: controls.length,
    snapshot_level: input.snapshot_level,
    snapshot_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.unified_release_firewall_snapshot_id) e.push('missing unified_release_firewall_snapshot_id');
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
  if (!result || typeof result !== 'object') return 'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT';
  let status;
  if (result.unified_release_firewall_snapshot_ready) status = 'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_READY';
  else if (result.errors?.some(e => e.startsWith('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY'))) status = 'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY';
  else if (result.errors?.some(e => e.startsWith('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL'))) status = 'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL';
  else status = 'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nunified_release_firewall_snapshot_id: ${result.unified_release_firewall_snapshot_id || '(none)'}\nunified_release_firewall_snapshot_ready: ${result.unified_release_firewall_snapshot_ready}\nrelease_firewall_module_registry_id: ${result.release_firewall_module_registry_id || '(none)'}\nrelease_firewall_module_registry_ready: ${result.release_firewall_module_registry_ready}\nsnapshot_items_count: ${result.snapshot_items_count}\nsnapshot_level: ${result.snapshot_level || '(none)'}\n`;
  if (result.snapshot_hash) out += `snapshot_hash: ${result.snapshot_hash}\n`;
  ['unified_firewall_snapshot_published','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
