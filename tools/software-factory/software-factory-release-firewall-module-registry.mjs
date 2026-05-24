import { createHash } from 'crypto';

export const STATUSES = [
  'RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT',
  'RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE',
  'RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE',
  'RELEASE_FIREWALL_MODULE_REGISTRY_READY',
];

const REQUIRED_VERSIONS = ['V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375'];

const ALLOWED_MODULE_TYPES = new Set([
  'firewall_contract','production_mutation_firewall','secret_access_firewall',
  'billing_execution_firewall','network_execution_firewall','artifact_tag_stable_firewall',
  'rollback_execution_firewall','noop_drill','evidence_receipt','authority_review','phase_gate',
]);

const REQUIRED_CONTROLS = [
  'registry-required','all-firewall-modules-required','atomic-modules-preserved',
  'no-legacy-deletion','no-real-release','no-real-deploy','no-tag-create',
  'no-stable-promotion','no-artifact-publish','no-production-touch',
  'no-billing-execution','no-secret-access','no-network','no-real-rollback',
  'audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v377.0',
  release_firewall_module_registry_id: null,
  release_firewall_module_registry_ready: false,
  release_execution_firewall_phase_gate_id: null,
  release_execution_firewall_phase_gate_ready: false,
  modules: [],
  modules_count: 0,
  missing_versions: [],
  required_registry_controls: [],
  required_registry_controls_count: 0,
  registry_level: null,
  registry_hash: null,
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

function findMissingVersions(modules) {
  const found = new Set((modules || []).map(m => m && m.version));
  return REQUIRED_VERSIONS.filter(v => !found.has(v));
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT'] };
  }
  if (!input.release_firewall_module_registry_id || typeof input.release_firewall_module_registry_id !== 'string') {
    return { ...BASE, errors: ['RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT: missing release_firewall_module_registry_id'] };
  }
  if (input.release_execution_firewall_phase_gate_ready !== true) {
    return { ...BASE, release_firewall_module_registry_id: input.release_firewall_module_registry_id, errors: ['RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE: release_execution_firewall_phase_gate_ready must be true'] };
  }
  if (!input.release_execution_firewall_phase_gate_id || typeof input.release_execution_firewall_phase_gate_id !== 'string') {
    return { ...BASE, release_firewall_module_registry_id: input.release_firewall_module_registry_id, errors: ['RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE: missing release_execution_firewall_phase_gate_id'] };
  }
  const modules = input.modules || [];
  const missing = findMissingVersions(modules);
  if (missing.length > 0) {
    return { ...BASE, release_firewall_module_registry_id: input.release_firewall_module_registry_id, release_execution_firewall_phase_gate_id: input.release_execution_firewall_phase_gate_id, release_execution_firewall_phase_gate_ready: true, missing_versions: missing, errors: [`RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: missing versions: ${missing.join(', ')}`] };
  }
  const errors = [];
  for (const m of modules) {
    if (!m || !m.module_id || typeof m.module_id !== 'string') { errors.push('RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: module missing module_id'); continue; }
    if (!m.version || typeof m.version !== 'string') { errors.push(`RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: module ${m.module_id} missing version`); }
    if (!ALLOWED_MODULE_TYPES.has(m.module_type)) { errors.push(`RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: module ${m.module_id} invalid module_type`); }
    if (!m.module_slug || typeof m.module_slug !== 'string') { errors.push(`RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: module ${m.module_id} missing module_slug`); }
    if (!m.module_hash || typeof m.module_hash !== 'string' || m.module_hash.length !== 64) { errors.push(`RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: module ${m.module_id} invalid module_hash`); }
  }
  const controls = input.required_registry_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: missing controls: ${missingControls.join(', ')}`); }
  if (!input.registry_level || typeof input.registry_level !== 'string') { errors.push('RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: missing registry_level'); }
  if (errors.length > 0) return { ...BASE, release_firewall_module_registry_id: input.release_firewall_module_registry_id, release_execution_firewall_phase_gate_id: input.release_execution_firewall_phase_gate_id, release_execution_firewall_phase_gate_ready: true, errors };
  const h = hash({ id: input.release_firewall_module_registry_id, modules, controls, level: input.registry_level });
  return {
    ...BASE,
    release_firewall_module_registry_id: input.release_firewall_module_registry_id,
    release_firewall_module_registry_ready: true,
    release_execution_firewall_phase_gate_id: input.release_execution_firewall_phase_gate_id,
    release_execution_firewall_phase_gate_ready: true,
    modules: input.modules,
    modules_count: input.modules.length,
    missing_versions: [],
    required_registry_controls: controls,
    required_registry_controls_count: controls.length,
    registry_level: input.registry_level,
    registry_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.release_firewall_module_registry_id) e.push('missing release_firewall_module_registry_id');
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
  if (!result || typeof result !== 'object') return 'RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT';
  let status;
  if (result.release_firewall_module_registry_ready) status = 'RELEASE_FIREWALL_MODULE_REGISTRY_READY';
  else if (result.errors?.some(e => e.startsWith('RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE'))) status = 'RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE';
  else if (result.errors?.some(e => e.startsWith('RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE'))) status = 'RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE';
  else status = 'RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_firewall_module_registry_id: ${result.release_firewall_module_registry_id || '(none)'}\nrelease_firewall_module_registry_ready: ${result.release_firewall_module_registry_ready}\nrelease_execution_firewall_phase_gate_id: ${result.release_execution_firewall_phase_gate_id || '(none)'}\nrelease_execution_firewall_phase_gate_ready: ${result.release_execution_firewall_phase_gate_ready}\nmodules_count: ${result.modules_count}\nregistry_level: ${result.registry_level || '(none)'}\n`;
  if (result.registry_hash) out += `registry_hash: ${result.registry_hash}\n`;
  if (result.missing_versions?.length) out += `missing_versions: ${result.missing_versions.join(', ')}\n`;
  ['release_firewall_registry_published','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
