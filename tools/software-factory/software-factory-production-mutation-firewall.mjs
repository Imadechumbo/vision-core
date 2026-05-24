import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCTION_MUTATION_FIREWALL_STATUSES = [
  'PRODUCTION_MUTATION_FIREWALL_BLOCKED_INPUT',
  'PRODUCTION_MUTATION_FIREWALL_BLOCKED_FIREWALL',
  'PRODUCTION_MUTATION_FIREWALL_FAIL',
  'PRODUCTION_MUTATION_FIREWALL_READY',
];

const ALLOWED_MUTATION_TYPES = [
  'production_file_write', 'production_database_write', 'production_config_change',
  'production_env_change', 'production_infra_change', 'production_secret_change',
  'production_deploy_mutation', 'production_release_mutation', 'production_tag_mutation',
  'production_stable_mutation', 'production_rollback_mutation', 'emergency_stop',
];

const ALLOWED_MUTATION_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_MUTATION_CONTROLS = [
  'production-mutation-firewall-required', 'no-production-touch', 'no-filesystem-write',
  'no-database-write', 'no-config-mutation', 'no-env-mutation', 'no-infra-mutation',
  'no-secret-access', 'no-real-release', 'no-real-deploy', 'no-tag-create',
  'no-stable-promotion', 'no-real-rollback', 'evidence-required', 'audit-required',
  'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v366.0', production_mutation_firewall_id: null,
  production_mutation_firewall_ready: false,
  release_execution_firewall_contract_id: null,
  release_execution_firewall_contract_ready: false,
  mutation_items: [],
  mutation_items_count: 0,
  required_mutation_controls: [],
  required_mutation_controls_count: 0,
  mutation_level: null,
  production_mutation_firewall_hash: null,
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
  for (const rc of REQUIRED_MUTATION_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.mutation_id || typeof item.mutation_id !== 'string') return { ok: false, error: 'item missing mutation_id' };
    if (!item.mutation_type || !ALLOWED_MUTATION_TYPES.includes(item.mutation_type)) return { ok: false, error: `invalid mutation_type: ${item.mutation_type}` };
    if (!item.mutation_mode || !ALLOWED_MUTATION_MODES.includes(item.mutation_mode)) return { ok: false, error: `invalid mutation_mode: ${item.mutation_mode}` };
    if (!item.mutation_hash || typeof item.mutation_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.mutation_hash)) return { ok: false, error: `invalid mutation_hash for ${item.mutation_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCTION_MUTATION_FIREWALL_BLOCKED_INPUT'] };
  if (!input.production_mutation_firewall_id || typeof input.production_mutation_firewall_id !== 'string')
    return { ...BASE, errors: ['PRODUCTION_MUTATION_FIREWALL_BLOCKED_INPUT: missing production_mutation_firewall_id'] };
  if (input.release_execution_firewall_contract_ready !== true)
    return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, errors: ['PRODUCTION_MUTATION_FIREWALL_BLOCKED_FIREWALL: release_execution_firewall_contract_ready must be true'] };
  if (!input.release_execution_firewall_contract_id || typeof input.release_execution_firewall_contract_id !== 'string')
    return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, errors: ['PRODUCTION_MUTATION_FIREWALL_BLOCKED_FIREWALL: missing release_execution_firewall_contract_id'] };
  if (!Array.isArray(input.mutation_items))
    return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, errors: ['PRODUCTION_MUTATION_FIREWALL_FAIL: mutation_items required'] };
  const itemsVal = validateItems(input.mutation_items);
  if (!itemsVal.ok)
    return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, errors: [`PRODUCTION_MUTATION_FIREWALL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_mutation_controls))
    return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, errors: ['PRODUCTION_MUTATION_FIREWALL_FAIL: required_mutation_controls required'] };
  if (!hasAllRequiredControls(input.required_mutation_controls))
    return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, errors: ['PRODUCTION_MUTATION_FIREWALL_FAIL: required_mutation_controls must include all required controls'] };
  if (!input.mutation_level || typeof input.mutation_level !== 'string')
    return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, errors: ['PRODUCTION_MUTATION_FIREWALL_FAIL: mutation_level required'] };

  const h = hash({ id: input.production_mutation_firewall_id, contract_id: input.release_execution_firewall_contract_id, items: input.mutation_items, controls: input.required_mutation_controls, level: input.mutation_level });
  return { ...BASE, production_mutation_firewall_id: input.production_mutation_firewall_id, production_mutation_firewall_ready: true, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, release_execution_firewall_contract_ready: true, mutation_items: input.mutation_items, mutation_items_count: input.mutation_items.length, required_mutation_controls: input.required_mutation_controls, required_mutation_controls_count: input.required_mutation_controls.length, mutation_level: input.mutation_level, production_mutation_firewall_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid production mutation firewall'] };
  const e = [];
  if (!result.production_mutation_firewall_id) e.push('missing production_mutation_firewall_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCTION_MUTATION_FIREWALL_BLOCKED_INPUT';
  const status = result.production_mutation_firewall_ready ? 'PRODUCTION_MUTATION_FIREWALL_READY' :
    result.errors?.some(e => e.startsWith('PRODUCTION_MUTATION_FIREWALL_BLOCKED_FIREWALL')) ? 'PRODUCTION_MUTATION_FIREWALL_BLOCKED_FIREWALL' :
    result.errors?.some(e => e.startsWith('PRODUCTION_MUTATION_FIREWALL_FAIL')) ? 'PRODUCTION_MUTATION_FIREWALL_FAIL' : 'PRODUCTION_MUTATION_FIREWALL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nproduction_mutation_firewall_id: ${result.production_mutation_firewall_id || '(none)'}\nproduction_mutation_firewall_ready: ${result.production_mutation_firewall_ready}\nrelease_execution_firewall_contract_id: ${result.release_execution_firewall_contract_id || '(none)'}\nrelease_execution_firewall_contract_ready: ${result.release_execution_firewall_contract_ready}\nmutation_items_count: ${result.mutation_items_count}\nrequired_mutation_controls_count: ${result.required_mutation_controls_count}\nmutation_level: ${result.mutation_level || '(none)'}\n`;
  if (result.production_mutation_firewall_hash) out += `production_mutation_firewall_hash: ${result.production_mutation_firewall_hash}\n`;
  if (result.mutation_items?.length) {
    result.mutation_items.forEach((it, i) => { out += `mutation_item[${i}]: ${it.mutation_id} type=${it.mutation_type} mode=${it.mutation_mode} hash=${it.mutation_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}