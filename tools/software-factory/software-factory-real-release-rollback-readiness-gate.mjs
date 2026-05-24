import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES = [
  'REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT',
  'REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN',
  'REAL_RELEASE_ROLLBACK_READINESS_FAIL',
  'REAL_RELEASE_ROLLBACK_READINESS_READY',
];

const ALLOWED_ROLLBACK_TYPES = [
  'release_rollback', 'deployment_rollback', 'tag_rollback', 'stable_rollback',
  'artifact_rollback', 'production_rollback', 'billing_rollback', 'secret_boundary_rollback',
  'network_boundary_rollback', 'database_rollback', 'emergency_stop',
];
const ALLOWED_ROLLBACK_MODES = [
  'blocked', 'metadata-only', 'dry-run', 'planning', 'contract-only',
];
const REQUIRED_ROLLBACK_CONTROLS = [
  'rollback-readiness-required', 'no-real-rollback', 'no-production-touch', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
  'no-billing-execution', 'no-secret-access', 'no-network', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v363.0', real_release_rollback_readiness_gate_id: null,
  real_release_rollback_readiness_gate_ready: false,
  rollback_level: null, rollback_items_count: 0,
  required_rollback_controls_count: 0,
  real_release_rollback_readiness_gate_hash: null,
  real_release_rollback_ready: false,
  real_release_execution_command_received: false,
  production_execution_environment_verified: false,
  real_release_dry_run_verified: false,
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
  for (const rc of REQUIRED_ROLLBACK_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function isValidHex64(v) { return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT'] };
  if (!input.real_release_rollback_readiness_gate_id || typeof input.real_release_rollback_readiness_gate_id !== 'string')
    return { ...BASE, errors: ['REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT: missing real_release_rollback_readiness_gate_id'] };
  if (input.real_release_execution_dry_run_verifier_ready !== true)
    return { ...BASE, real_release_rollback_readiness_gate_id: input.real_release_rollback_readiness_gate_id, errors: ['REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN: real_release_execution_dry_run_verifier_ready must be true'] };
  if (!input.real_release_execution_dry_run_verifier_id || typeof input.real_release_execution_dry_run_verifier_id !== 'string')
    return { ...BASE, real_release_rollback_readiness_gate_id: input.real_release_rollback_readiness_gate_id, errors: ['REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN: missing real_release_execution_dry_run_verifier_id'] };
  if (!Array.isArray(input.rollback_items) || input.rollback_items.length === 0)
    return { ...BASE, real_release_rollback_readiness_gate_id: input.real_release_rollback_readiness_gate_id, errors: ['REAL_RELEASE_ROLLBACK_READINESS_FAIL: rollback_items must be non-empty array'] };
  if (!Array.isArray(input.required_rollback_controls))
    return { ...BASE, real_release_rollback_readiness_gate_id: input.real_release_rollback_readiness_gate_id, errors: ['REAL_RELEASE_ROLLBACK_READINESS_FAIL: required_rollback_controls required'] };
  if (!hasAllRequiredControls(input.required_rollback_controls))
    return { ...BASE, real_release_rollback_readiness_gate_id: input.real_release_rollback_readiness_gate_id, errors: ['REAL_RELEASE_ROLLBACK_READINESS_FAIL: required_rollback_controls must include all required controls'] };
  if (input.rollback_level && !ALLOWED_ROLLBACK_MODES.includes(input.rollback_level))
    return { ...BASE, real_release_rollback_readiness_gate_id: input.real_release_rollback_readiness_gate_id, errors: ['REAL_RELEASE_ROLLBACK_READINESS_FAIL: rollback_level invalid'] };

  const itemErrors = [];
  for (const item of input.rollback_items) {
    if (!item.rollback_id || typeof item.rollback_id !== 'string') itemErrors.push('item missing rollback_id');
    if (!item.rollback_type || !ALLOWED_ROLLBACK_TYPES.includes(item.rollback_type)) itemErrors.push('item invalid rollback_type');
    if (!item.rollback_mode || !ALLOWED_ROLLBACK_MODES.includes(item.rollback_mode)) itemErrors.push('item invalid rollback_mode');
    if (!item.rollback_hash || !isValidHex64(item.rollback_hash)) itemErrors.push('item invalid rollback_hash');
  }
  if (itemErrors.length > 0)
    return { ...BASE, real_release_rollback_readiness_gate_id: input.real_release_rollback_readiness_gate_id, rollback_items: input.rollback_items, errors: ['REAL_RELEASE_ROLLBACK_READINESS_FAIL: ' + itemErrors.join('; ')] };

  const vid = input.real_release_rollback_readiness_gate_id;
  const h = hash({ vid, dry_run_id: input.real_release_execution_dry_run_verifier_id, items: input.rollback_items, controls: input.required_rollback_controls, level: input.rollback_level });
  return { ...BASE, real_release_rollback_readiness_gate_id: vid, real_release_rollback_readiness_gate_ready: true, rollback_level: input.rollback_level, rollback_items: input.rollback_items, rollback_items_count: input.rollback_items.length, required_rollback_controls_count: input.required_rollback_controls.length, real_release_rollback_readiness_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid real release rollback readiness gate'] };
  const e = [];
  if (!result.real_release_rollback_readiness_gate_id) e.push('missing real_release_rollback_readiness_gate_id');
  ['real_release_rollback_ready','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT';
  const status = result.real_release_rollback_readiness_gate_ready ? 'REAL_RELEASE_ROLLBACK_READINESS_READY' :
    result.errors?.some(e => e.startsWith('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN')) ? 'REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN' :
    result.errors?.some(e => e.startsWith('REAL_RELEASE_ROLLBACK_READINESS_FAIL')) ? 'REAL_RELEASE_ROLLBACK_READINESS_FAIL' : 'REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT';
  let out = `=== ${status} ===\nreal_release_rollback_readiness_gate_id: ${result.real_release_rollback_readiness_gate_id || '(none)'}\nreal_release_rollback_readiness_gate_ready: ${result.real_release_rollback_readiness_gate_ready}\nrollback_level: ${result.rollback_level || '(none)'}\nrollback_items_count: ${result.rollback_items_count}\nrequired_rollback_controls_count: ${result.required_rollback_controls_count}\n`;
  if (result.real_release_rollback_readiness_gate_hash) out += `real_release_rollback_readiness_gate_hash: ${result.real_release_rollback_readiness_gate_hash}\n`;
  if (result.rollback_items?.length) {
    out += 'rollback_items:\n';
    for (const item of result.rollback_items) out += `  ${item.rollback_type}: ${item.rollback_id} (${item.rollback_mode}) hash:${item.rollback_hash?.substring(0,16)}...\n`;
  }
  ['real_release_rollback_ready','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
