import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_NETWORK_EXECUTION_FIREWALL_STATUSES = [
  'NETWORK_EXECUTION_FIREWALL_BLOCKED_INPUT',
  'NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING',
  'NETWORK_EXECUTION_FIREWALL_FAIL',
  'NETWORK_EXECUTION_FIREWALL_READY',
];

const ALLOWED_NETWORK_TYPES = [
  'http_request', 'fetch_call', 'github_api', 'cloud_api', 'deployment_api',
  'billing_api', 'llm_api', 'webhook_call', 'provider_api', 'registry_api',
  'artifact_upload', 'emergency_stop',
];

const ALLOWED_NETWORK_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_NETWORK_CONTROLS = [
  'network-execution-firewall-required', 'no-network', 'no-fetch', 'no-http',
  'no-provider-api', 'no-github-api', 'no-cloud-api', 'no-deployment-api',
  'no-billing-api', 'no-llm-api', 'no-webhook-call', 'no-artifact-upload',
  'no-production-touch', 'no-real-release', 'no-real-deploy', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v369.0', network_execution_firewall_id: null,
  network_execution_firewall_ready: false,
  billing_execution_firewall_id: null,
  billing_execution_firewall_ready: false,
  network_items: [],
  network_items_count: 0,
  required_network_controls: [],
  required_network_controls_count: 0,
  network_level: null,
  network_execution_firewall_hash: null,
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
  for (const rc of REQUIRED_NETWORK_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.network_id || typeof item.network_id !== 'string') return { ok: false, error: 'item missing network_id' };
    if (!item.network_type || !ALLOWED_NETWORK_TYPES.includes(item.network_type)) return { ok: false, error: `invalid network_type: ${item.network_type}` };
    if (!item.network_mode || !ALLOWED_NETWORK_MODES.includes(item.network_mode)) return { ok: false, error: `invalid network_mode: ${item.network_mode}` };
    if (!item.network_hash || typeof item.network_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.network_hash)) return { ok: false, error: `invalid network_hash for ${item.network_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['NETWORK_EXECUTION_FIREWALL_BLOCKED_INPUT'] };
  if (!input.network_execution_firewall_id || typeof input.network_execution_firewall_id !== 'string')
    return { ...BASE, errors: ['NETWORK_EXECUTION_FIREWALL_BLOCKED_INPUT: missing network_execution_firewall_id'] };
  if (input.billing_execution_firewall_ready !== true)
    return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, errors: ['NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING: billing_execution_firewall_ready must be true'] };
  if (!input.billing_execution_firewall_id || typeof input.billing_execution_firewall_id !== 'string')
    return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, errors: ['NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING: missing billing_execution_firewall_id'] };
  if (!Array.isArray(input.network_items))
    return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, errors: ['NETWORK_EXECUTION_FIREWALL_FAIL: network_items required'] };
  const itemsVal = validateItems(input.network_items);
  if (!itemsVal.ok)
    return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, errors: [`NETWORK_EXECUTION_FIREWALL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_network_controls))
    return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, errors: ['NETWORK_EXECUTION_FIREWALL_FAIL: required_network_controls required'] };
  if (!hasAllRequiredControls(input.required_network_controls))
    return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, errors: ['NETWORK_EXECUTION_FIREWALL_FAIL: required_network_controls must include all required controls'] };
  if (!input.network_level || typeof input.network_level !== 'string')
    return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, errors: ['NETWORK_EXECUTION_FIREWALL_FAIL: network_level required'] };

  const h = hash({ id: input.network_execution_firewall_id, billing_id: input.billing_execution_firewall_id, items: input.network_items, controls: input.required_network_controls, level: input.network_level });
  return { ...BASE, network_execution_firewall_id: input.network_execution_firewall_id, network_execution_firewall_ready: true, billing_execution_firewall_id: input.billing_execution_firewall_id, billing_execution_firewall_ready: true, network_items: input.network_items, network_items_count: input.network_items.length, required_network_controls: input.required_network_controls, required_network_controls_count: input.required_network_controls.length, network_level: input.network_level, network_execution_firewall_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid network execution firewall'] };
  const e = [];
  if (!result.network_execution_firewall_id) e.push('missing network_execution_firewall_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'NETWORK_EXECUTION_FIREWALL_BLOCKED_INPUT';
  const status = result.network_execution_firewall_ready ? 'NETWORK_EXECUTION_FIREWALL_READY' :
    result.errors?.some(e => e.startsWith('NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING')) ? 'NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING' :
    result.errors?.some(e => e.startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')) ? 'NETWORK_EXECUTION_FIREWALL_FAIL' : 'NETWORK_EXECUTION_FIREWALL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nnetwork_execution_firewall_id: ${result.network_execution_firewall_id || '(none)'}\nnetwork_execution_firewall_ready: ${result.network_execution_firewall_ready}\nbilling_execution_firewall_id: ${result.billing_execution_firewall_id || '(none)'}\nbilling_execution_firewall_ready: ${result.billing_execution_firewall_ready}\nnetwork_items_count: ${result.network_items_count}\nrequired_network_controls_count: ${result.required_network_controls_count}\nnetwork_level: ${result.network_level || '(none)'}\n`;
  if (result.network_execution_firewall_hash) out += `network_execution_firewall_hash: ${result.network_execution_firewall_hash}\n`;
  if (result.network_items?.length) {
    result.network_items.forEach((it, i) => { out += `network_item[${i}]: ${it.network_id} type=${it.network_type} mode=${it.network_mode} hash=${it.network_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}