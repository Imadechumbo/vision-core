import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_BILLING_EXECUTION_FIREWALL_STATUSES = [
  'BILLING_EXECUTION_FIREWALL_BLOCKED_INPUT',
  'BILLING_EXECUTION_FIREWALL_BLOCKED_SECRET',
  'BILLING_EXECUTION_FIREWALL_FAIL',
  'BILLING_EXECUTION_FIREWALL_READY',
];

const ALLOWED_BILLING_TYPES = [
  'customer_create', 'invoice_create', 'subscription_create', 'payment_provider_call',
  'stripe_call', 'paypal_call', 'mercadopago_call', 'webhook_register',
  'webhook_secret', 'billing_provider_connection', 'billing_rollback', 'emergency_stop',
];

const ALLOWED_BILLING_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_BILLING_CONTROLS = [
  'billing-execution-firewall-required', 'no-billing-execution', 'no-customer-create',
  'no-invoice-create', 'no-subscription-create', 'no-payment-provider-call',
  'no-webhook-register', 'no-webhook-secret-access', 'no-network', 'no-secret-access',
  'no-production-touch', 'no-real-release', 'no-real-deploy', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v368.0', billing_execution_firewall_id: null,
  billing_execution_firewall_ready: false,
  secret_access_firewall_id: null,
  secret_access_firewall_ready: false,
  billing_items: [],
  billing_items_count: 0,
  required_billing_controls: [],
  required_billing_controls_count: 0,
  billing_level: null,
  billing_execution_firewall_hash: null,
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
  for (const rc of REQUIRED_BILLING_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.billing_id || typeof item.billing_id !== 'string') return { ok: false, error: 'item missing billing_id' };
    if (!item.billing_type || !ALLOWED_BILLING_TYPES.includes(item.billing_type)) return { ok: false, error: `invalid billing_type: ${item.billing_type}` };
    if (!item.billing_mode || !ALLOWED_BILLING_MODES.includes(item.billing_mode)) return { ok: false, error: `invalid billing_mode: ${item.billing_mode}` };
    if (!item.billing_hash || typeof item.billing_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.billing_hash)) return { ok: false, error: `invalid billing_hash for ${item.billing_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['BILLING_EXECUTION_FIREWALL_BLOCKED_INPUT'] };
  if (!input.billing_execution_firewall_id || typeof input.billing_execution_firewall_id !== 'string')
    return { ...BASE, errors: ['BILLING_EXECUTION_FIREWALL_BLOCKED_INPUT: missing billing_execution_firewall_id'] };
  if (input.secret_access_firewall_ready !== true)
    return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, errors: ['BILLING_EXECUTION_FIREWALL_BLOCKED_SECRET: secret_access_firewall_ready must be true'] };
  if (!input.secret_access_firewall_id || typeof input.secret_access_firewall_id !== 'string')
    return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, errors: ['BILLING_EXECUTION_FIREWALL_BLOCKED_SECRET: missing secret_access_firewall_id'] };
  if (!Array.isArray(input.billing_items))
    return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, errors: ['BILLING_EXECUTION_FIREWALL_FAIL: billing_items required'] };
  const itemsVal = validateItems(input.billing_items);
  if (!itemsVal.ok)
    return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, errors: [`BILLING_EXECUTION_FIREWALL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_billing_controls))
    return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, errors: ['BILLING_EXECUTION_FIREWALL_FAIL: required_billing_controls required'] };
  if (!hasAllRequiredControls(input.required_billing_controls))
    return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, errors: ['BILLING_EXECUTION_FIREWALL_FAIL: required_billing_controls must include all required controls'] };
  if (!input.billing_level || typeof input.billing_level !== 'string')
    return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, errors: ['BILLING_EXECUTION_FIREWALL_FAIL: billing_level required'] };

  const h = hash({ id: input.billing_execution_firewall_id, secret_id: input.secret_access_firewall_id, items: input.billing_items, controls: input.required_billing_controls, level: input.billing_level });
  return { ...BASE, billing_execution_firewall_id: input.billing_execution_firewall_id, billing_execution_firewall_ready: true, secret_access_firewall_id: input.secret_access_firewall_id, secret_access_firewall_ready: true, billing_items: input.billing_items, billing_items_count: input.billing_items.length, required_billing_controls: input.required_billing_controls, required_billing_controls_count: input.required_billing_controls.length, billing_level: input.billing_level, billing_execution_firewall_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid billing execution firewall'] };
  const e = [];
  if (!result.billing_execution_firewall_id) e.push('missing billing_execution_firewall_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'BILLING_EXECUTION_FIREWALL_BLOCKED_INPUT';
  const status = result.billing_execution_firewall_ready ? 'BILLING_EXECUTION_FIREWALL_READY' :
    result.errors?.some(e => e.startsWith('BILLING_EXECUTION_FIREWALL_BLOCKED_SECRET')) ? 'BILLING_EXECUTION_FIREWALL_BLOCKED_SECRET' :
    result.errors?.some(e => e.startsWith('BILLING_EXECUTION_FIREWALL_FAIL')) ? 'BILLING_EXECUTION_FIREWALL_FAIL' : 'BILLING_EXECUTION_FIREWALL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nbilling_execution_firewall_id: ${result.billing_execution_firewall_id || '(none)'}\nbilling_execution_firewall_ready: ${result.billing_execution_firewall_ready}\nsecret_access_firewall_id: ${result.secret_access_firewall_id || '(none)'}\nsecret_access_firewall_ready: ${result.secret_access_firewall_ready}\nbilling_items_count: ${result.billing_items_count}\nrequired_billing_controls_count: ${result.required_billing_controls_count}\nbilling_level: ${result.billing_level || '(none)'}\n`;
  if (result.billing_execution_firewall_hash) out += `billing_execution_firewall_hash: ${result.billing_execution_firewall_hash}\n`;
  if (result.billing_items?.length) {
    result.billing_items.forEach((it, i) => { out += `billing_item[${i}]: ${it.billing_id} type=${it.billing_type} mode=${it.billing_mode} hash=${it.billing_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}