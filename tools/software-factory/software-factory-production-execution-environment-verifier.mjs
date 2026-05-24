import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCTION_EXECUTION_ENVIRONMENT_VERIFIER_STATUSES = [
  'PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_INPUT',
  'PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND',
  'PRODUCTION_EXECUTION_ENVIRONMENT_FAIL',
  'PRODUCTION_EXECUTION_ENVIRONMENT_READY',
];

const ALLOWED_ENVIRONMENT_TYPES = [
  'release_target', 'deployment_target', 'tag_target', 'stable_target', 'artifact_target',
  'production_target', 'rollback_target', 'secret_boundary', 'network_boundary',
  'billing_boundary', 'audit_boundary', 'emergency_stop',
];
const ALLOWED_ENVIRONMENT_MODES = [
  'blocked', 'metadata-only', 'dry-run', 'planning', 'contract-only',
];
const REQUIRED_ENVIRONMENT_CONTROLS = [
  'metadata-only', 'no-secret-access', 'no-network', 'no-production-touch',
  'no-real-release', 'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
  'no-artifact-publish', 'no-billing-execution', 'rollback-required',
  'evidence-required', 'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v361.0', production_execution_environment_verifier_id: null,
  production_execution_environment_verifier_ready: false,
  environment_level: null, environment_items_count: 0,
  required_environment_controls_count: 0,
  production_execution_environment_verifier_hash: null,
  production_execution_environment_verified: false,
  real_release_execution_command_received: false,
  real_release_dry_run_verified: false,
  real_release_rollback_ready: false,
  controlled_real_release_preparation_phase_passed: false,
  real_release_execution_ready: false,
  real_release_execution_allowed: false,
  real_deployment_execution_allowed: false,
  real_tag_creation_allowed: false,
  real_stable_promotion_allowed: false,
  explicit_release_execution_command_received: false,
  release_execution_consent_bound: false,
  final_production_preflight_passed: false,
  real_release_execution_barrier_open: false,
  explicit_release_execution_phase_passed: false,
  real_release_executed: false, real_deploy_executed: false,
  real_tag_created: false, real_stable_promoted: false,
  pass_gold_release_authority_phase_passed: false,
  human_release_authority_bound: false,
  release_execution_plan_published: false,
  final_rollback_authority_bound: false,
  production_release_final_review_approved: false,
  pass_gold_release_evidence_bound: false,
  release_go_decision: false,
  production_release_scope_locked: false,
  release_candidate_integrity_bound: false,
  final_release_ready: false,
  release_execution_allowed: false, deployment_execution_allowed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false,
  real_patch_applied: false, production_touched: false,
  saas_enabled: false, billing_executed: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function hasAllRequiredControls(controls) {
  for (const rc of REQUIRED_ENVIRONMENT_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function isValidHex64(v) { return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_INPUT'] };
  if (!input.production_execution_environment_verifier_id || typeof input.production_execution_environment_verifier_id !== 'string')
    return { ...BASE, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_INPUT: missing production_execution_environment_verifier_id'] };
  if (input.real_release_execution_command_ready !== true)
    return { ...BASE, production_execution_environment_verifier_id: input.production_execution_environment_verifier_id, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND: real_release_execution_command_ready must be true'] };
  if (!input.real_release_execution_command_id || typeof input.real_release_execution_command_id !== 'string')
    return { ...BASE, production_execution_environment_verifier_id: input.production_execution_environment_verifier_id, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND: missing real_release_execution_command_id'] };
  if (!Array.isArray(input.environment_items) || input.environment_items.length === 0)
    return { ...BASE, production_execution_environment_verifier_id: input.production_execution_environment_verifier_id, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_FAIL: environment_items must be non-empty array'] };
  if (!Array.isArray(input.required_environment_controls))
    return { ...BASE, production_execution_environment_verifier_id: input.production_execution_environment_verifier_id, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_FAIL: required_environment_controls required'] };
  if (!hasAllRequiredControls(input.required_environment_controls))
    return { ...BASE, production_execution_environment_verifier_id: input.production_execution_environment_verifier_id, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_FAIL: required_environment_controls must include all required controls'] };
  if (input.environment_level && !ALLOWED_ENVIRONMENT_MODES.includes(input.environment_level))
    return { ...BASE, production_execution_environment_verifier_id: input.production_execution_environment_verifier_id, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_FAIL: environment_level invalid'] };

  const itemErrors = [];
  for (const item of input.environment_items) {
    if (!item.environment_id || typeof item.environment_id !== 'string') itemErrors.push('item missing environment_id');
    if (!item.environment_type || !ALLOWED_ENVIRONMENT_TYPES.includes(item.environment_type)) itemErrors.push('item invalid environment_type');
    if (!item.environment_mode || !ALLOWED_ENVIRONMENT_MODES.includes(item.environment_mode)) itemErrors.push('item invalid environment_mode');
    if (!item.environment_hash || !isValidHex64(item.environment_hash)) itemErrors.push('item invalid environment_hash');
  }
  if (itemErrors.length > 0)
    return { ...BASE, production_execution_environment_verifier_id: input.production_execution_environment_verifier_id, environment_items: input.environment_items, errors: ['PRODUCTION_EXECUTION_ENVIRONMENT_FAIL: ' + itemErrors.join('; ')] };

  const vid = input.production_execution_environment_verifier_id;
  const h = hash({ vid, command_id: input.real_release_execution_command_id, items: input.environment_items, controls: input.required_environment_controls, level: input.environment_level });
  return { ...BASE, production_execution_environment_verifier_id: vid, production_execution_environment_verifier_ready: true, environment_level: input.environment_level, environment_items: input.environment_items, environment_items_count: input.environment_items.length, required_environment_controls_count: input.required_environment_controls.length, production_execution_environment_verifier_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid production execution environment verifier'] };
  const e = [];
  if (!result.production_execution_environment_verifier_id) e.push('missing production_execution_environment_verifier_id');
  ['production_execution_environment_verified','real_release_execution_command_received','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_INPUT';
  const status = result.production_execution_environment_verifier_ready ? 'PRODUCTION_EXECUTION_ENVIRONMENT_READY' :
    result.errors?.some(e => e.startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND')) ? 'PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_COMMAND' :
    result.errors?.some(e => e.startsWith('PRODUCTION_EXECUTION_ENVIRONMENT_FAIL')) ? 'PRODUCTION_EXECUTION_ENVIRONMENT_FAIL' : 'PRODUCTION_EXECUTION_ENVIRONMENT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nproduction_execution_environment_verifier_id: ${result.production_execution_environment_verifier_id || '(none)'}\nproduction_execution_environment_verifier_ready: ${result.production_execution_environment_verifier_ready}\nenvironment_level: ${result.environment_level || '(none)'}\nenvironment_items_count: ${result.environment_items_count}\nrequired_environment_controls_count: ${result.required_environment_controls_count}\n`;
  if (result.production_execution_environment_verifier_hash) out += `production_execution_environment_verifier_hash: ${result.production_execution_environment_verifier_hash}\n`;
  if (result.environment_items?.length) {
    out += 'environment_items:\n';
    for (const item of result.environment_items) out += `  ${item.environment_type}: ${item.environment_id} (${item.environment_mode}) hash:${item.environment_hash?.substring(0,16)}...\n`;
  }
  ['production_execution_environment_verified','real_release_execution_command_received','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
