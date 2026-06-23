import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_FIREWALL_EVIDENCE_RECEIPT_STATUSES = [
  'FIREWALL_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  'FIREWALL_EVIDENCE_RECEIPT_BLOCKED_DRILL',
  'FIREWALL_EVIDENCE_RECEIPT_FAIL',
  'FIREWALL_EVIDENCE_RECEIPT_READY',
];

const ALLOWED_EVIDENCE_TYPES = [
  'firewall_contract', 'production_mutation_block', 'secret_access_block',
  'billing_execution_block', 'network_execution_block', 'artifact_tag_stable_block',
  'rollback_execution_block', 'noop_drill_block', 'pass_gold_rule',
  'audit_record', 'authority_record', 'emergency_stop',
];

const ALLOWED_EVIDENCE_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_EVIDENCE_CONTROLS = [
  'firewall-evidence-required', 'no-real-evidence-publish', 'no-artifact-publish',
  'no-network', 'no-secret-access', 'no-production-touch', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-real-rollback',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v373.0', firewall_evidence_receipt_id: null,
  firewall_evidence_receipt_ready: false,
  last_mile_noop_execution_drill_id: null,
  last_mile_noop_execution_drill_ready: false,
  evidence_items: [],
  evidence_items_count: 0,
  required_evidence_controls: [],
  required_evidence_controls_count: 0,
  evidence_level: null,
  firewall_evidence_receipt_hash: null,
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
  for (const rc of REQUIRED_EVIDENCE_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.evidence_id || typeof item.evidence_id !== 'string') return { ok: false, error: 'item missing evidence_id' };
    if (!item.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(item.evidence_type)) return { ok: false, error: `invalid evidence_type: ${item.evidence_type}` };
    if (!item.evidence_mode || !ALLOWED_EVIDENCE_MODES.includes(item.evidence_mode)) return { ok: false, error: `invalid evidence_mode: ${item.evidence_mode}` };
    if (!item.evidence_hash || typeof item.evidence_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.evidence_hash)) return { ok: false, error: `invalid evidence_hash for ${item.evidence_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['FIREWALL_EVIDENCE_RECEIPT_BLOCKED_INPUT'] };
  if (!input.firewall_evidence_receipt_id || typeof input.firewall_evidence_receipt_id !== 'string')
    return { ...BASE, errors: ['FIREWALL_EVIDENCE_RECEIPT_BLOCKED_INPUT: missing firewall_evidence_receipt_id'] };
  if (input.last_mile_noop_execution_drill_ready !== true)
    return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, errors: ['FIREWALL_EVIDENCE_RECEIPT_BLOCKED_DRILL: last_mile_noop_execution_drill_ready must be true'] };
  if (!input.last_mile_noop_execution_drill_id || typeof input.last_mile_noop_execution_drill_id !== 'string')
    return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, errors: ['FIREWALL_EVIDENCE_RECEIPT_BLOCKED_DRILL: missing last_mile_noop_execution_drill_id'] };
  if (!Array.isArray(input.evidence_items))
    return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, errors: ['FIREWALL_EVIDENCE_RECEIPT_FAIL: evidence_items required'] };
  const itemsVal = validateItems(input.evidence_items);
  if (!itemsVal.ok)
    return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, errors: [`FIREWALL_EVIDENCE_RECEIPT_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_evidence_controls))
    return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, errors: ['FIREWALL_EVIDENCE_RECEIPT_FAIL: required_evidence_controls required'] };
  if (!hasAllRequiredControls(input.required_evidence_controls))
    return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, errors: ['FIREWALL_EVIDENCE_RECEIPT_FAIL: required_evidence_controls must include all required controls'] };
  if (!input.evidence_level || typeof input.evidence_level !== 'string')
    return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, errors: ['FIREWALL_EVIDENCE_RECEIPT_FAIL: evidence_level required'] };

  const h = hash({ id: input.firewall_evidence_receipt_id, drill_id: input.last_mile_noop_execution_drill_id, items: input.evidence_items, controls: input.required_evidence_controls, level: input.evidence_level });
  return { ...BASE, firewall_evidence_receipt_id: input.firewall_evidence_receipt_id, firewall_evidence_receipt_ready: true, last_mile_noop_execution_drill_id: input.last_mile_noop_execution_drill_id, last_mile_noop_execution_drill_ready: true, evidence_items: input.evidence_items, evidence_items_count: input.evidence_items.length, required_evidence_controls: input.required_evidence_controls, required_evidence_controls_count: input.required_evidence_controls.length, evidence_level: input.evidence_level, firewall_evidence_receipt_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid firewall evidence receipt'] };
  const e = [];
  if (!result.firewall_evidence_receipt_id) e.push('missing firewall_evidence_receipt_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'FIREWALL_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  const status = result.firewall_evidence_receipt_ready ? 'FIREWALL_EVIDENCE_RECEIPT_READY' :
    result.errors?.some(e => e.startsWith('FIREWALL_EVIDENCE_RECEIPT_BLOCKED_DRILL')) ? 'FIREWALL_EVIDENCE_RECEIPT_BLOCKED_DRILL' :
    result.errors?.some(e => e.startsWith('FIREWALL_EVIDENCE_RECEIPT_FAIL')) ? 'FIREWALL_EVIDENCE_RECEIPT_FAIL' : 'FIREWALL_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfirewall_evidence_receipt_id: ${result.firewall_evidence_receipt_id || '(none)'}\nfirewall_evidence_receipt_ready: ${result.firewall_evidence_receipt_ready}\nlast_mile_noop_execution_drill_id: ${result.last_mile_noop_execution_drill_id || '(none)'}\nlast_mile_noop_execution_drill_ready: ${result.last_mile_noop_execution_drill_ready}\nevidence_items_count: ${result.evidence_items_count}\nrequired_evidence_controls_count: ${result.required_evidence_controls_count}\nevidence_level: ${result.evidence_level || '(none)'}\n`;
  if (result.firewall_evidence_receipt_hash) out += `firewall_evidence_receipt_hash: ${result.firewall_evidence_receipt_hash}\n`;
  if (result.evidence_items?.length) {
    result.evidence_items.forEach((it, i) => { out += `evidence_item[${i}]: ${it.evidence_id} type=${it.evidence_type} mode=${it.evidence_mode} hash=${it.evidence_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}