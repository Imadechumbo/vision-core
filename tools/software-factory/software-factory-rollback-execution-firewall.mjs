import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ROLLBACK_EXECUTION_FIREWALL_STATUSES = [
  'ROLLBACK_EXECUTION_FIREWALL_BLOCKED_INPUT',
  'ROLLBACK_EXECUTION_FIREWALL_BLOCKED_ARTIFACT',
  'ROLLBACK_EXECUTION_FIREWALL_FAIL',
  'ROLLBACK_EXECUTION_FIREWALL_READY',
];

const ALLOWED_ROLLBACK_TYPES = [
  'release_rollback', 'deployment_rollback', 'tag_rollback', 'stable_rollback',
  'artifact_rollback', 'database_rollback', 'infrastructure_rollback',
  'production_rollback', 'billing_rollback', 'secret_boundary_rollback',
  'network_boundary_rollback', 'emergency_stop',
];

const ALLOWED_ROLLBACK_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_ROLLBACK_CONTROLS = [
  'rollback-execution-firewall-required', 'no-real-rollback', 'no-database-write',
  'no-infra-mutation', 'no-production-touch', 'no-filesystem-write', 'no-network',
  'no-secret-access', 'no-billing-execution', 'no-real-release', 'no-real-deploy',
  'no-tag-create', 'no-stable-promotion', 'evidence-required', 'audit-required',
  'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v371.0', rollback_execution_firewall_id: null,
  rollback_execution_firewall_ready: false,
  artifact_tag_stable_firewall_id: null,
  artifact_tag_stable_firewall_ready: false,
  rollback_items: [],
  rollback_items_count: 0,
  required_rollback_controls: [],
  required_rollback_controls_count: 0,
  rollback_level: null,
  rollback_execution_firewall_hash: null,
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
  release_execution_firewall_phase_passed: false,
  real_release_execution_command_received: false,
  production_execution_environment_verified: false,
  real_release_dry_run_verified: false,
  real_release_rollback_ready: false,
  controlled_real_release_preparation_phase_passed: false,
  real_release_execution_ready: false,
  real_release_execution_allowed: false,
  real_deployment_execution_allowed: false,
  real_tag_creation_allowed: false,
  real_stable_promotion_allowed: false,
  real_release_executed: false, real_deploy_executed: false,
  real_tag_created: false, real_stable_promoted: false,
  artifact_published: false, production_touched: false,
  billing_executed: false, secrets_accessed: false,
  network_accessed: false, rollback_executed: false,
  release_allowed: false, deploy_allowed: false,
  stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false,
  runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false,
  real_patch_applied: false, saas_enabled: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function hasAllRequiredControls(controls) {
  for (const rc of REQUIRED_ROLLBACK_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.rollback_id || typeof item.rollback_id !== 'string') return { ok: false, error: 'item missing rollback_id' };
    if (!item.rollback_type || !ALLOWED_ROLLBACK_TYPES.includes(item.rollback_type)) return { ok: false, error: `invalid rollback_type: ${item.rollback_type}` };
    if (!item.rollback_mode || !ALLOWED_ROLLBACK_MODES.includes(item.rollback_mode)) return { ok: false, error: `invalid rollback_mode: ${item.rollback_mode}` };
    if (!item.rollback_hash || typeof item.rollback_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.rollback_hash)) return { ok: false, error: `invalid rollback_hash for ${item.rollback_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ROLLBACK_EXECUTION_FIREWALL_BLOCKED_INPUT'] };
  if (!input.rollback_execution_firewall_id || typeof input.rollback_execution_firewall_id !== 'string')
    return { ...BASE, errors: ['ROLLBACK_EXECUTION_FIREWALL_BLOCKED_INPUT: missing rollback_execution_firewall_id'] };
  if (input.artifact_tag_stable_firewall_ready !== true)
    return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, errors: ['ROLLBACK_EXECUTION_FIREWALL_BLOCKED_ARTIFACT: artifact_tag_stable_firewall_ready must be true'] };
  if (!input.artifact_tag_stable_firewall_id || typeof input.artifact_tag_stable_firewall_id !== 'string')
    return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, errors: ['ROLLBACK_EXECUTION_FIREWALL_BLOCKED_ARTIFACT: missing artifact_tag_stable_firewall_id'] };
  if (!Array.isArray(input.rollback_items))
    return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, errors: ['ROLLBACK_EXECUTION_FIREWALL_FAIL: rollback_items required'] };
  const itemsVal = validateItems(input.rollback_items);
  if (!itemsVal.ok)
    return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, errors: [`ROLLBACK_EXECUTION_FIREWALL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_rollback_controls))
    return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, errors: ['ROLLBACK_EXECUTION_FIREWALL_FAIL: required_rollback_controls required'] };
  if (!hasAllRequiredControls(input.required_rollback_controls))
    return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, errors: ['ROLLBACK_EXECUTION_FIREWALL_FAIL: required_rollback_controls must include all required controls'] };
  if (!input.rollback_level || typeof input.rollback_level !== 'string')
    return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, errors: ['ROLLBACK_EXECUTION_FIREWALL_FAIL: rollback_level required'] };

  const h = hash({ id: input.rollback_execution_firewall_id, artifact_id: input.artifact_tag_stable_firewall_id, items: input.rollback_items, controls: input.required_rollback_controls, level: input.rollback_level });
  return { ...BASE, rollback_execution_firewall_id: input.rollback_execution_firewall_id, rollback_execution_firewall_ready: true, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, artifact_tag_stable_firewall_ready: true, rollback_items: input.rollback_items, rollback_items_count: input.rollback_items.length, required_rollback_controls: input.required_rollback_controls, required_rollback_controls_count: input.required_rollback_controls.length, rollback_level: input.rollback_level, rollback_execution_firewall_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid rollback execution firewall'] };
  const e = [];
  if (!result.rollback_execution_firewall_id) e.push('missing rollback_execution_firewall_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ROLLBACK_EXECUTION_FIREWALL_BLOCKED_INPUT';
  const status = result.rollback_execution_firewall_ready ? 'ROLLBACK_EXECUTION_FIREWALL_READY' :
    result.errors?.some(e => e.startsWith('ROLLBACK_EXECUTION_FIREWALL_BLOCKED_ARTIFACT')) ? 'ROLLBACK_EXECUTION_FIREWALL_BLOCKED_ARTIFACT' :
    result.errors?.some(e => e.startsWith('ROLLBACK_EXECUTION_FIREWALL_FAIL')) ? 'ROLLBACK_EXECUTION_FIREWALL_FAIL' : 'ROLLBACK_EXECUTION_FIREWALL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrollback_execution_firewall_id: ${result.rollback_execution_firewall_id || '(none)'}\nrollback_execution_firewall_ready: ${result.rollback_execution_firewall_ready}\nartifact_tag_stable_firewall_id: ${result.artifact_tag_stable_firewall_id || '(none)'}\nartifact_tag_stable_firewall_ready: ${result.artifact_tag_stable_firewall_ready}\nrollback_items_count: ${result.rollback_items_count}\nrequired_rollback_controls_count: ${result.required_rollback_controls_count}\nrollback_level: ${result.rollback_level || '(none)'}\n`;
  if (result.rollback_execution_firewall_hash) out += `rollback_execution_firewall_hash: ${result.rollback_execution_firewall_hash}\n`;
  if (result.rollback_items?.length) {
    result.rollback_items.forEach((it, i) => { out += `rollback_item[${i}]: ${it.rollback_id} type=${it.rollback_type} mode=${it.rollback_mode} hash=${it.rollback_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}