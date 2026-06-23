import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_CONTRACT_STATUSES = [
  'RELEASE_EXECUTION_FIREWALL_BLOCKED_INPUT',
  'RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION',
  'RELEASE_EXECUTION_FIREWALL_FAIL',
  'RELEASE_EXECUTION_FIREWALL_READY',
];

const ALLOWED_FIREWALL_TYPES = [
  'release_execution', 'deployment_execution', 'tag_creation',
  'stable_promotion', 'artifact_publish', 'production_touch',
  'billing_execution', 'secret_access', 'network_access',
  'rollback_execution', 'emergency_stop', 'audit_boundary',
];

const ALLOWED_FIREWALL_MODES = ['closed', 'blocked', 'metadata-only', 'contract-only', 'dry-run'];

const REQUIRED_FIREWALL_CONTROLS = [
  'firewall-required', 'barrier-closed-required', 'no-real-release', 'no-real-deploy',
  'no-tag-create', 'no-stable-promotion', 'no-artifact-publish', 'no-production-touch',
  'no-billing-execution', 'no-secret-access', 'no-network', 'no-real-rollback',
  'rollback-required', 'evidence-required', 'audit-required', 'human-approval-required',
  'pass-gold-required',
];

const BASE = {
  schema_version: 'v365.0', release_execution_firewall_contract_id: null,
  release_execution_firewall_contract_ready: false,
  controlled_real_release_preparation_phase_gate_id: null,
  controlled_real_release_preparation_phase_gate_ready: false,
  firewall_items: [],
  firewall_items_count: 0,
  required_firewall_controls: [],
  required_firewall_controls_count: 0,
  firewall_level: null,
  release_execution_firewall_contract_hash: null,
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
  for (const rc of REQUIRED_FIREWALL_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.firewall_id || typeof item.firewall_id !== 'string') return { ok: false, error: 'item missing firewall_id' };
    if (!item.firewall_type || !ALLOWED_FIREWALL_TYPES.includes(item.firewall_type)) return { ok: false, error: `invalid firewall_type: ${item.firewall_type}` };
    if (!item.firewall_mode || !ALLOWED_FIREWALL_MODES.includes(item.firewall_mode)) return { ok: false, error: `invalid firewall_mode: ${item.firewall_mode}` };
    if (!item.firewall_hash || typeof item.firewall_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.firewall_hash)) return { ok: false, error: `invalid firewall_hash for ${item.firewall_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_EXECUTION_FIREWALL_BLOCKED_INPUT'] };
  if (!input.release_execution_firewall_contract_id || typeof input.release_execution_firewall_contract_id !== 'string')
    return { ...BASE, errors: ['RELEASE_EXECUTION_FIREWALL_BLOCKED_INPUT: missing release_execution_firewall_contract_id'] };
  if (input.controlled_real_release_preparation_phase_gate_ready !== true)
    return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, errors: ['RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION: controlled_real_release_preparation_phase_gate_ready must be true'] };
  if (!input.controlled_real_release_preparation_phase_gate_id || typeof input.controlled_real_release_preparation_phase_gate_id !== 'string')
    return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, errors: ['RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION: missing controlled_real_release_preparation_phase_gate_id'] };
  if (!Array.isArray(input.firewall_items))
    return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, errors: ['RELEASE_EXECUTION_FIREWALL_FAIL: firewall_items required'] };
  const itemsVal = validateItems(input.firewall_items);
  if (!itemsVal.ok)
    return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, errors: [`RELEASE_EXECUTION_FIREWALL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_firewall_controls))
    return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, errors: ['RELEASE_EXECUTION_FIREWALL_FAIL: required_firewall_controls required'] };
  if (!hasAllRequiredControls(input.required_firewall_controls))
    return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, errors: ['RELEASE_EXECUTION_FIREWALL_FAIL: required_firewall_controls must include all required controls'] };
  if (!input.firewall_level || typeof input.firewall_level !== 'string')
    return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, errors: ['RELEASE_EXECUTION_FIREWALL_FAIL: firewall_level required'] };

  const h = hash({ id: input.release_execution_firewall_contract_id, phase_gate_id: input.controlled_real_release_preparation_phase_gate_id, items: input.firewall_items, controls: input.required_firewall_controls, level: input.firewall_level });
  return { ...BASE, release_execution_firewall_contract_id: input.release_execution_firewall_contract_id, release_execution_firewall_contract_ready: true, controlled_real_release_preparation_phase_gate_id: input.controlled_real_release_preparation_phase_gate_id, controlled_real_release_preparation_phase_gate_ready: true, firewall_items: input.firewall_items, firewall_items_count: input.firewall_items.length, required_firewall_controls: input.required_firewall_controls, required_firewall_controls_count: input.required_firewall_controls.length, firewall_level: input.firewall_level, release_execution_firewall_contract_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release execution firewall contract'] };
  const e = [];
  if (!result.release_execution_firewall_contract_id) e.push('missing release_execution_firewall_contract_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_EXECUTION_FIREWALL_BLOCKED_INPUT';
  const status = result.release_execution_firewall_contract_ready ? 'RELEASE_EXECUTION_FIREWALL_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION')) ? 'RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')) ? 'RELEASE_EXECUTION_FIREWALL_FAIL' : 'RELEASE_EXECUTION_FIREWALL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_execution_firewall_contract_id: ${result.release_execution_firewall_contract_id || '(none)'}\nrelease_execution_firewall_contract_ready: ${result.release_execution_firewall_contract_ready}\ncontrolled_real_release_preparation_phase_gate_id: ${result.controlled_real_release_preparation_phase_gate_id || '(none)'}\ncontrolled_real_release_preparation_phase_gate_ready: ${result.controlled_real_release_preparation_phase_gate_ready}\nfirewall_items_count: ${result.firewall_items_count}\nrequired_firewall_controls_count: ${result.required_firewall_controls_count}\nfirewall_level: ${result.firewall_level || '(none)'}\n`;
  if (result.release_execution_firewall_contract_hash) out += `release_execution_firewall_contract_hash: ${result.release_execution_firewall_contract_hash}\n`;
  if (result.firewall_items?.length) {
    result.firewall_items.forEach((it, i) => { out += `firewall_item[${i}]: ${it.firewall_id} type=${it.firewall_type} mode=${it.firewall_mode} hash=${it.firewall_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}