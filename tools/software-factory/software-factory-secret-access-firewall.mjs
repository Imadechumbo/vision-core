import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SECRET_ACCESS_FIREWALL_STATUSES = [
  'SECRET_ACCESS_FIREWALL_BLOCKED_INPUT',
  'SECRET_ACCESS_FIREWALL_BLOCKED_MUTATION',
  'SECRET_ACCESS_FIREWALL_FAIL',
  'SECRET_ACCESS_FIREWALL_READY',
];

const ALLOWED_SECRET_TYPES = [
  'env_file', 'process_env', 'api_key', 'oauth_token', 'webhook_secret',
  'billing_secret', 'deployment_secret', 'github_secret', 'cloud_secret',
  'vault_secret', 'database_secret', 'emergency_secret',
];

const ALLOWED_SECRET_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_SECRET_CONTROLS = [
  'secret-access-firewall-required', 'no-env-read', 'no-process-env', 'no-token-export',
  'no-secret-store-read', 'no-vault-read', 'no-provider-secret-access',
  'no-billing-secret-access', 'no-deployment-secret-access', 'no-network',
  'no-real-release', 'no-real-deploy', 'evidence-required', 'audit-required',
  'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v367.0', secret_access_firewall_id: null,
  secret_access_firewall_ready: false,
  production_mutation_firewall_id: null,
  production_mutation_firewall_ready: false,
  secret_items: [],
  secret_items_count: 0,
  required_secret_controls: [],
  required_secret_controls_count: 0,
  secret_level: null,
  secret_access_firewall_hash: null,
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
  for (const rc of REQUIRED_SECRET_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.secret_id || typeof item.secret_id !== 'string') return { ok: false, error: 'item missing secret_id' };
    if (!item.secret_type || !ALLOWED_SECRET_TYPES.includes(item.secret_type)) return { ok: false, error: `invalid secret_type: ${item.secret_type}` };
    if (!item.secret_mode || !ALLOWED_SECRET_MODES.includes(item.secret_mode)) return { ok: false, error: `invalid secret_mode: ${item.secret_mode}` };
    if (!item.secret_hash || typeof item.secret_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.secret_hash)) return { ok: false, error: `invalid secret_hash for ${item.secret_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['SECRET_ACCESS_FIREWALL_BLOCKED_INPUT'] };
  if (!input.secret_access_firewall_id || typeof input.secret_access_firewall_id !== 'string')
    return { ...BASE, errors: ['SECRET_ACCESS_FIREWALL_BLOCKED_INPUT: missing secret_access_firewall_id'] };
  if (input.production_mutation_firewall_ready !== true)
    return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, errors: ['SECRET_ACCESS_FIREWALL_BLOCKED_MUTATION: production_mutation_firewall_ready must be true'] };
  if (!input.production_mutation_firewall_id || typeof input.production_mutation_firewall_id !== 'string')
    return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, errors: ['SECRET_ACCESS_FIREWALL_BLOCKED_MUTATION: missing production_mutation_firewall_id'] };
  if (!Array.isArray(input.secret_items))
    return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, errors: ['SECRET_ACCESS_FIREWALL_FAIL: secret_items required'] };
  const itemsVal = validateItems(input.secret_items);
  if (!itemsVal.ok)
    return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, errors: [`SECRET_ACCESS_FIREWALL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_secret_controls))
    return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, errors: ['SECRET_ACCESS_FIREWALL_FAIL: required_secret_controls required'] };
  if (!hasAllRequiredControls(input.required_secret_controls))
    return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, errors: ['SECRET_ACCESS_FIREWALL_FAIL: required_secret_controls must include all required controls'] };
  if (!input.secret_level || typeof input.secret_level !== 'string')
    return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, errors: ['SECRET_ACCESS_FIREWALL_FAIL: secret_level required'] };

  const h = hash({ id: input.secret_access_firewall_id, mutation_id: input.production_mutation_firewall_id, items: input.secret_items, controls: input.required_secret_controls, level: input.secret_level });
  return { ...BASE, secret_access_firewall_id: input.secret_access_firewall_id, secret_access_firewall_ready: true, production_mutation_firewall_id: input.production_mutation_firewall_id, production_mutation_firewall_ready: true, secret_items: input.secret_items, secret_items_count: input.secret_items.length, required_secret_controls: input.required_secret_controls, required_secret_controls_count: input.required_secret_controls.length, secret_level: input.secret_level, secret_access_firewall_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid secret access firewall'] };
  const e = [];
  if (!result.secret_access_firewall_id) e.push('missing secret_access_firewall_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SECRET_ACCESS_FIREWALL_BLOCKED_INPUT';
  const status = result.secret_access_firewall_ready ? 'SECRET_ACCESS_FIREWALL_READY' :
    result.errors?.some(e => e.startsWith('SECRET_ACCESS_FIREWALL_BLOCKED_MUTATION')) ? 'SECRET_ACCESS_FIREWALL_BLOCKED_MUTATION' :
    result.errors?.some(e => e.startsWith('SECRET_ACCESS_FIREWALL_FAIL')) ? 'SECRET_ACCESS_FIREWALL_FAIL' : 'SECRET_ACCESS_FIREWALL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsecret_access_firewall_id: ${result.secret_access_firewall_id || '(none)'}\nsecret_access_firewall_ready: ${result.secret_access_firewall_ready}\nproduction_mutation_firewall_id: ${result.production_mutation_firewall_id || '(none)'}\nproduction_mutation_firewall_ready: ${result.production_mutation_firewall_ready}\nsecret_items_count: ${result.secret_items_count}\nrequired_secret_controls_count: ${result.required_secret_controls_count}\nsecret_level: ${result.secret_level || '(none)'}\n`;
  if (result.secret_access_firewall_hash) out += `secret_access_firewall_hash: ${result.secret_access_firewall_hash}\n`;
  if (result.secret_items?.length) {
    result.secret_items.forEach((it, i) => { out += `secret_item[${i}]: ${it.secret_id} type=${it.secret_type} mode=${it.secret_mode} hash=${it.secret_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}