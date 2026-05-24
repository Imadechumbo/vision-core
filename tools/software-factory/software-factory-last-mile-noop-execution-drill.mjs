import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_LAST_MILE_NOOP_EXECUTION_DRILL_STATUSES = [
  'LAST_MILE_NOOP_DRILL_BLOCKED_INPUT',
  'LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK',
  'LAST_MILE_NOOP_DRILL_FAIL',
  'LAST_MILE_NOOP_DRILL_READY',
];

const ALLOWED_DRILL_TYPES = [
  'release_noop', 'deploy_noop', 'tag_noop', 'stable_noop', 'artifact_noop',
  'production_noop', 'billing_noop', 'secret_noop', 'network_noop',
  'rollback_noop', 'emergency_stop_noop',
];

const ALLOWED_DRILL_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning', 'no-op'];

const REQUIRED_DRILL_CONTROLS = [
  'last-mile-noop-drill-required', 'no-real-release', 'no-real-deploy',
  'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
  'no-production-touch', 'no-billing-execution', 'no-secret-access', 'no-network',
  'no-real-rollback', 'evidence-required', 'audit-required',
  'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v372.0', last_mile_noop_execution_drill_id: null,
  last_mile_noop_execution_drill_ready: false,
  rollback_execution_firewall_id: null,
  rollback_execution_firewall_ready: false,
  drill_items: [],
  drill_items_count: 0,
  required_drill_controls: [],
  required_drill_controls_count: 0,
  drill_level: null,
  last_mile_noop_execution_drill_hash: null,
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
  for (const rc of REQUIRED_DRILL_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.drill_id || typeof item.drill_id !== 'string') return { ok: false, error: 'item missing drill_id' };
    if (!item.drill_type || !ALLOWED_DRILL_TYPES.includes(item.drill_type)) return { ok: false, error: `invalid drill_type: ${item.drill_type}` };
    if (!item.drill_mode || !ALLOWED_DRILL_MODES.includes(item.drill_mode)) return { ok: false, error: `invalid drill_mode: ${item.drill_mode}` };
    if (!item.drill_hash || typeof item.drill_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.drill_hash)) return { ok: false, error: `invalid drill_hash for ${item.drill_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['LAST_MILE_NOOP_DRILL_BLOCKED_INPUT'] };
  if (!input.last_mile_noop_execution_drill_id || typeof input.last_mile_noop_execution_drill_id !== 'string')
    return { ...BASE, errors: ['LAST_MILE_NOOP_DRILL_BLOCKED_INPUT: missing last_mile_noop_execution_drill_id'] };
  if (input.rollback_execution_firewall_ready !== true)
    return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, errors: ['LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK: rollback_execution_firewall_ready must be true'] };
  if (!input.rollback_execution_firewall_id || typeof input.rollback_execution_firewall_id !== 'string')
    return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, errors: ['LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK: missing rollback_execution_firewall_id'] };
  if (!Array.isArray(input.drill_items))
    return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, errors: ['LAST_MILE_NOOP_DRILL_FAIL: drill_items required'] };
  const itemsVal = validateItems(input.drill_items);
  if (!itemsVal.ok)
    return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, errors: [`LAST_MILE_NOOP_DRILL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_drill_controls))
    return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, errors: ['LAST_MILE_NOOP_DRILL_FAIL: required_drill_controls required'] };
  if (!hasAllRequiredControls(input.required_drill_controls))
    return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, errors: ['LAST_MILE_NOOP_DRILL_FAIL: required_drill_controls must include all required controls'] };
  if (!input.drill_level || typeof input.drill_level !== 'string')
    return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, errors: ['LAST_MILE_NOOP_DRILL_FAIL: drill_level required'] };

  const h = hash({ id: input.last_mile_noop_execution_drill_id, rollback_id: input.rollback_execution_firewall_id, items: input.drill_items, controls: input.required_drill_controls, level: input.drill_level });
  return { ...BASE, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, last_mile_noop_execution_drill_ready: true, rollback_execution_firewall_id: input.rollback_execution_firewall_id, rollback_execution_firewall_ready: true, drill_items: input.drill_items, drill_items_count: input.drill_items.length, required_drill_controls: input.required_drill_controls, required_drill_controls_count: input.required_drill_controls.length, drill_level: input.drill_level, last_mile_noop_execution_drill_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid last mile noop execution drill'] };
  const e = [];
  if (!result.last_mile_noop_execution_drill_id) e.push('missing last_mile_noop_execution_drill_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'LAST_MILE_NOOP_DRILL_BLOCKED_INPUT';
  const status = result.last_mile_noop_execution_drill_ready ? 'LAST_MILE_NOOP_DRILL_READY' :
    result.errors?.some(e => e.startsWith('LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK')) ? 'LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK' :
    result.errors?.some(e => e.startsWith('LAST_MILE_NOOP_DRILL_FAIL')) ? 'LAST_MILE_NOOP_DRILL_FAIL' : 'LAST_MILE_NOOP_DRILL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nlast_mile_noop_execution_drill_id: ${result.last_mile_noop_execution_drill_id || '(none)'}\nlast_mile_noop_execution_drill_ready: ${result.last_mile_noop_execution_drill_ready}\nrollback_execution_firewall_id: ${result.rollback_execution_firewall_id || '(none)'}\nrollback_execution_firewall_ready: ${result.rollback_execution_firewall_ready}\ndrill_items_count: ${result.drill_items_count}\nrequired_drill_controls_count: ${result.required_drill_controls_count}\ndrill_level: ${result.drill_level || '(none)'}\n`;
  if (result.last_mile_noop_execution_drill_hash) out += `last_mile_noop_execution_drill_hash: ${result.last_mile_noop_execution_drill_hash}\n`;
  if (result.drill_items?.length) {
    result.drill_items.forEach((it, i) => { out += `drill_item[${i}]: ${it.drill_id} type=${it.drill_type} mode=${it.drill_mode} hash=${it.drill_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}