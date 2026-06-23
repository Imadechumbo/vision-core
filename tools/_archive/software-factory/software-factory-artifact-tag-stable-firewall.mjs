import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ARTIFACT_TAG_STABLE_FIREWALL_STATUSES = [
  'ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_INPUT',
  'ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_NETWORK',
  'ARTIFACT_TAG_STABLE_FIREWALL_FAIL',
  'ARTIFACT_TAG_STABLE_FIREWALL_READY',
];

const ALLOWED_ARTIFACT_TYPES = [
  'artifact_publish', 'release_artifact', 'tag_creation', 'stable_promotion',
  'registry_upload', 'package_publish', 'github_release', 'docker_publish',
  'npm_publish', 'version_marker', 'stable_marker', 'emergency_stop',
];

const ALLOWED_ARTIFACT_MODES = ['blocked', 'metadata-only', 'dry-run', 'contract-only', 'planning'];

const REQUIRED_ARTIFACT_CONTROLS = [
  'artifact-tag-stable-firewall-required', 'no-artifact-publish', 'no-tag-create',
  'no-stable-promotion', 'no-release-publish', 'no-registry-upload',
  'no-package-publish', 'no-github-release', 'no-docker-publish', 'no-npm-publish',
  'no-production-touch', 'no-network', 'no-secret-access', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v370.0', artifact_tag_stable_firewall_id: null,
  artifact_tag_stable_firewall_ready: false,
  network_execution_firewall_id: null,
  network_execution_firewall_ready: false,
  artifact_items: [],
  artifact_items_count: 0,
  required_artifact_controls: [],
  required_artifact_controls_count: 0,
  artifact_level: null,
  artifact_tag_stable_firewall_hash: null,
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
  for (const rc of REQUIRED_ARTIFACT_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be non-empty array' };
  for (const item of items) {
    if (!item.artifact_id || typeof item.artifact_id !== 'string') return { ok: false, error: 'item missing artifact_id' };
    if (!item.artifact_type || !ALLOWED_ARTIFACT_TYPES.includes(item.artifact_type)) return { ok: false, error: `invalid artifact_type: ${item.artifact_type}` };
    if (!item.artifact_mode || !ALLOWED_ARTIFACT_MODES.includes(item.artifact_mode)) return { ok: false, error: `invalid artifact_mode: ${item.artifact_mode}` };
    if (!item.artifact_hash || typeof item.artifact_hash !== 'string' || !/^[0-9a-f]{64}$/.test(item.artifact_hash)) return { ok: false, error: `invalid artifact_hash for ${item.artifact_id}` };
  }
  return { ok: true };
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_INPUT'] };
  if (!input.artifact_tag_stable_firewall_id || typeof input.artifact_tag_stable_firewall_id !== 'string')
    return { ...BASE, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_INPUT: missing artifact_tag_stable_firewall_id'] };
  if (input.network_execution_firewall_ready !== true)
    return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_NETWORK: network_execution_firewall_ready must be true'] };
  if (!input.network_execution_firewall_id || typeof input.network_execution_firewall_id !== 'string')
    return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_NETWORK: missing network_execution_firewall_id'] };
  if (!Array.isArray(input.artifact_items))
    return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_FAIL: artifact_items required'] };
  const itemsVal = validateItems(input.artifact_items);
  if (!itemsVal.ok)
    return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, errors: [`ARTIFACT_TAG_STABLE_FIREWALL_FAIL: ${itemsVal.error}`] };
  if (!Array.isArray(input.required_artifact_controls))
    return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_FAIL: required_artifact_controls required'] };
  if (!hasAllRequiredControls(input.required_artifact_controls))
    return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_FAIL: required_artifact_controls must include all required controls'] };
  if (!input.artifact_level || typeof input.artifact_level !== 'string')
    return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, errors: ['ARTIFACT_TAG_STABLE_FIREWALL_FAIL: artifact_level required'] };

  const h = hash({ id: input.artifact_tag_stable_firewall_id, network_id: input.network_execution_firewall_id, items: input.artifact_items, controls: input.required_artifact_controls, level: input.artifact_level });
  return { ...BASE, artifact_tag_stable_firewall_id: input.artifact_tag_stable_firewall_id, artifact_tag_stable_firewall_ready: true, network_execution_firewall_id: input.network_execution_firewall_id, network_execution_firewall_ready: true, artifact_items: input.artifact_items, artifact_items_count: input.artifact_items.length, required_artifact_controls: input.required_artifact_controls, required_artifact_controls_count: input.required_artifact_controls.length, artifact_level: input.artifact_level, artifact_tag_stable_firewall_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid artifact tag stable firewall'] };
  const e = [];
  if (!result.artifact_tag_stable_firewall_id) e.push('missing artifact_tag_stable_firewall_id');
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_INPUT';
  const status = result.artifact_tag_stable_firewall_ready ? 'ARTIFACT_TAG_STABLE_FIREWALL_READY' :
    result.errors?.some(e => e.startsWith('ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_NETWORK')) ? 'ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_NETWORK' :
    result.errors?.some(e => e.startsWith('ARTIFACT_TAG_STABLE_FIREWALL_FAIL')) ? 'ARTIFACT_TAG_STABLE_FIREWALL_FAIL' : 'ARTIFACT_TAG_STABLE_FIREWALL_BLOCKED_INPUT';
  let out = `=== ${status} ===\nartifact_tag_stable_firewall_id: ${result.artifact_tag_stable_firewall_id || '(none)'}\nartifact_tag_stable_firewall_ready: ${result.artifact_tag_stable_firewall_ready}\nnetwork_execution_firewall_id: ${result.network_execution_firewall_id || '(none)'}\nnetwork_execution_firewall_ready: ${result.network_execution_firewall_ready}\nartifact_items_count: ${result.artifact_items_count}\nrequired_artifact_controls_count: ${result.required_artifact_controls_count}\nartifact_level: ${result.artifact_level || '(none)'}\n`;
  if (result.artifact_tag_stable_firewall_hash) out += `artifact_tag_stable_firewall_hash: ${result.artifact_tag_stable_firewall_hash}\n`;
  if (result.artifact_items?.length) {
    result.artifact_items.forEach((it, i) => { out += `artifact_item[${i}]: ${it.artifact_id} type=${it.artifact_type} mode=${it.artifact_mode} hash=${it.artifact_hash}\n`; });
  }
  ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}