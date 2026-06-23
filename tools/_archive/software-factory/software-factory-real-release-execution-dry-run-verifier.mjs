import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES = [
  'REAL_RELEASE_DRY_RUN_BLOCKED_INPUT',
  'REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT',
  'REAL_RELEASE_DRY_RUN_FAIL',
  'REAL_RELEASE_DRY_RUN_READY',
];

const ALLOWED_DRY_RUN_TYPES = [
  'release_dry_run', 'deployment_dry_run', 'tag_dry_run', 'stable_dry_run', 'artifact_dry_run',
  'production_dry_run', 'rollback_dry_run', 'billing_dry_run', 'secret_boundary_dry_run',
  'network_boundary_dry_run', 'emergency_stop_dry_run',
];
const ALLOWED_DRY_RUN_MODES = [
  'blocked', 'metadata-only', 'dry-run', 'planning', 'contract-only',
];
const REQUIRED_DRY_RUN_CONTROLS = [
  'dry-run-required', 'no-production-touch', 'no-real-release', 'no-real-deploy',
  'no-tag-create', 'no-stable-promotion', 'no-artifact-publish', 'no-billing-execution',
  'no-secret-access', 'no-network', 'rollback-required', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v362.0', real_release_execution_dry_run_verifier_id: null,
  real_release_execution_dry_run_verifier_ready: false,
  dry_run_level: null, dry_run_items_count: 0,
  required_dry_run_controls_count: 0,
  real_release_execution_dry_run_verifier_hash: null,
  real_release_dry_run_verified: false,
  real_release_execution_command_received: false,
  production_execution_environment_verified: false,
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
  for (const rc of REQUIRED_DRY_RUN_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function isValidHex64(v) { return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['REAL_RELEASE_DRY_RUN_BLOCKED_INPUT'] };
  if (!input.real_release_execution_dry_run_verifier_id || typeof input.real_release_execution_dry_run_verifier_id !== 'string')
    return { ...BASE, errors: ['REAL_RELEASE_DRY_RUN_BLOCKED_INPUT: missing real_release_execution_dry_run_verifier_id'] };
  if (input.production_execution_environment_verifier_ready !== true)
    return { ...BASE, real_release_execution_dry_run_verifier_id: input.real_release_execution_dry_run_verifier_id, errors: ['REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT: production_execution_environment_verifier_ready must be true'] };
  if (!input.production_execution_environment_verifier_id || typeof input.production_execution_environment_verifier_id !== 'string')
    return { ...BASE, real_release_execution_dry_run_verifier_id: input.real_release_execution_dry_run_verifier_id, errors: ['REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT: missing production_execution_environment_verifier_id'] };
  if (!Array.isArray(input.dry_run_items) || input.dry_run_items.length === 0)
    return { ...BASE, real_release_execution_dry_run_verifier_id: input.real_release_execution_dry_run_verifier_id, errors: ['REAL_RELEASE_DRY_RUN_FAIL: dry_run_items must be non-empty array'] };
  if (!Array.isArray(input.required_dry_run_controls))
    return { ...BASE, real_release_execution_dry_run_verifier_id: input.real_release_execution_dry_run_verifier_id, errors: ['REAL_RELEASE_DRY_RUN_FAIL: required_dry_run_controls required'] };
  if (!hasAllRequiredControls(input.required_dry_run_controls))
    return { ...BASE, real_release_execution_dry_run_verifier_id: input.real_release_execution_dry_run_verifier_id, errors: ['REAL_RELEASE_DRY_RUN_FAIL: required_dry_run_controls must include all required controls'] };
  if (input.dry_run_level && !ALLOWED_DRY_RUN_MODES.includes(input.dry_run_level))
    return { ...BASE, real_release_execution_dry_run_verifier_id: input.real_release_execution_dry_run_verifier_id, errors: ['REAL_RELEASE_DRY_RUN_FAIL: dry_run_level invalid'] };

  const itemErrors = [];
  for (const item of input.dry_run_items) {
    if (!item.dry_run_id || typeof item.dry_run_id !== 'string') itemErrors.push('item missing dry_run_id');
    if (!item.dry_run_type || !ALLOWED_DRY_RUN_TYPES.includes(item.dry_run_type)) itemErrors.push('item invalid dry_run_type');
    if (!item.dry_run_mode || !ALLOWED_DRY_RUN_MODES.includes(item.dry_run_mode)) itemErrors.push('item invalid dry_run_mode');
    if (!item.dry_run_hash || !isValidHex64(item.dry_run_hash)) itemErrors.push('item invalid dry_run_hash');
  }
  if (itemErrors.length > 0)
    return { ...BASE, real_release_execution_dry_run_verifier_id: input.real_release_execution_dry_run_verifier_id, dry_run_items: input.dry_run_items, errors: ['REAL_RELEASE_DRY_RUN_FAIL: ' + itemErrors.join('; ')] };

  const vid = input.real_release_execution_dry_run_verifier_id;
  const h = hash({ vid, env_id: input.production_execution_environment_verifier_id, items: input.dry_run_items, controls: input.required_dry_run_controls, level: input.dry_run_level });
  return { ...BASE, real_release_execution_dry_run_verifier_id: vid, real_release_execution_dry_run_verifier_ready: true, dry_run_level: input.dry_run_level, dry_run_items: input.dry_run_items, dry_run_items_count: input.dry_run_items.length, required_dry_run_controls_count: input.required_dry_run_controls.length, real_release_execution_dry_run_verifier_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid real release dry run verifier'] };
  const e = [];
  if (!result.real_release_execution_dry_run_verifier_id) e.push('missing real_release_execution_dry_run_verifier_id');
  ['real_release_dry_run_verified','real_release_execution_command_received','production_execution_environment_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'REAL_RELEASE_DRY_RUN_BLOCKED_INPUT';
  const status = result.real_release_execution_dry_run_verifier_ready ? 'REAL_RELEASE_DRY_RUN_READY' :
    result.errors?.some(e => e.startsWith('REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT')) ? 'REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT' :
    result.errors?.some(e => e.startsWith('REAL_RELEASE_DRY_RUN_FAIL')) ? 'REAL_RELEASE_DRY_RUN_FAIL' : 'REAL_RELEASE_DRY_RUN_BLOCKED_INPUT';
  let out = `=== ${status} ===\nreal_release_execution_dry_run_verifier_id: ${result.real_release_execution_dry_run_verifier_id || '(none)'}\nreal_release_execution_dry_run_verifier_ready: ${result.real_release_execution_dry_run_verifier_ready}\ndry_run_level: ${result.dry_run_level || '(none)'}\ndry_run_items_count: ${result.dry_run_items_count}\nrequired_dry_run_controls_count: ${result.required_dry_run_controls_count}\n`;
  if (result.real_release_execution_dry_run_verifier_hash) out += `real_release_execution_dry_run_verifier_hash: ${result.real_release_execution_dry_run_verifier_hash}\n`;
  if (result.dry_run_items?.length) {
    out += 'dry_run_items:\n';
    for (const item of result.dry_run_items) out += `  ${item.dry_run_type}: ${item.dry_run_id} (${item.dry_run_mode}) hash:${item.dry_run_hash?.substring(0,16)}...\n`;
  }
  ['real_release_dry_run_verified','real_release_execution_command_received','production_execution_environment_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
