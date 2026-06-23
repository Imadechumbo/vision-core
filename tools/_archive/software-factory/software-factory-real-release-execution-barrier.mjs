import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_BARRIER_STATUSES = [
  'REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_INPUT',
  'REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_PREFLIGHT',
  'REAL_RELEASE_EXECUTION_BARRIER_FAIL',
  'REAL_RELEASE_EXECUTION_BARRIER_READY',
];

const ALLOWED_BARRIER_TYPES = [
  'release_execution', 'deployment_execution', 'tag_creation',
  'stable_promotion', 'artifact_publish', 'production_touch',
  'billing_execution', 'secret_access', 'network_access',
  'rollback_execution', 'github_release', 'emergency_stop',
];
const ALLOWED_BARRIER_MODES = [
  'closed', 'blocked', 'metadata-only', 'dry-run', 'contract-only',
];
const REQUIRED_BARRIER_CONTROLS = [
  'barrier-closed-required', 'no-production-touch', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
  'no-billing-execution', 'no-secret-access', 'no-network', 'rollback-required',
  'evidence-required', 'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v358.0', real_release_execution_barrier_id: null,
  real_release_execution_barrier_ready: false,
  barrier_level: null, barrier_items_count: 0,
  required_barrier_controls_count: 0,
  real_release_execution_barrier_hash: null,
  real_release_execution_barrier_open: false,
  final_production_preflight_passed: false,
  explicit_release_execution_command_received: false,
  release_execution_consent_bound: false,
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
  for (const rc of REQUIRED_BARRIER_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function isValidHex64(v) { return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_INPUT'] };
  if (!input.real_release_execution_barrier_id || typeof input.real_release_execution_barrier_id !== 'string')
    return { ...BASE, errors: ['REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_INPUT: missing real_release_execution_barrier_id'] };
  if (input.final_production_execution_preflight_ready !== true)
    return { ...BASE, real_release_execution_barrier_id: input.real_release_execution_barrier_id, errors: ['REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_PREFLIGHT: final_production_execution_preflight_ready must be true'] };
  if (!input.final_production_execution_preflight_id || typeof input.final_production_execution_preflight_id !== 'string')
    return { ...BASE, real_release_execution_barrier_id: input.real_release_execution_barrier_id, errors: ['REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_PREFLIGHT: missing final_production_execution_preflight_id'] };
  if (!Array.isArray(input.barrier_items) || input.barrier_items.length === 0)
    return { ...BASE, real_release_execution_barrier_id: input.real_release_execution_barrier_id, errors: ['REAL_RELEASE_EXECUTION_BARRIER_FAIL: barrier_items must be non-empty array'] };
  if (!Array.isArray(input.required_barrier_controls))
    return { ...BASE, real_release_execution_barrier_id: input.real_release_execution_barrier_id, errors: ['REAL_RELEASE_EXECUTION_BARRIER_FAIL: required_barrier_controls required'] };
  if (!hasAllRequiredControls(input.required_barrier_controls))
    return { ...BASE, real_release_execution_barrier_id: input.real_release_execution_barrier_id, errors: ['REAL_RELEASE_EXECUTION_BARRIER_FAIL: required_barrier_controls must include all required controls'] };
  if (input.barrier_level && !['closed', 'blocked', 'metadata-only', 'dry-run', 'contract-only'].includes(input.barrier_level))
    return { ...BASE, real_release_execution_barrier_id: input.real_release_execution_barrier_id, errors: ['REAL_RELEASE_EXECUTION_BARRIER_FAIL: barrier_level invalid'] };

  const itemErrors = [];
  for (const item of input.barrier_items) {
    if (!item.barrier_id || typeof item.barrier_id !== 'string') itemErrors.push('item missing barrier_id');
    if (!item.barrier_type || !ALLOWED_BARRIER_TYPES.includes(item.barrier_type)) itemErrors.push('item invalid barrier_type');
    if (!item.barrier_mode || !ALLOWED_BARRIER_MODES.includes(item.barrier_mode)) itemErrors.push('item invalid barrier_mode');
    if (!item.barrier_hash || !isValidHex64(item.barrier_hash)) itemErrors.push('item invalid barrier_hash');
  }
  if (itemErrors.length > 0)
    return { ...BASE, real_release_execution_barrier_id: input.real_release_execution_barrier_id, barrier_items: input.barrier_items, errors: ['REAL_RELEASE_EXECUTION_BARRIER_FAIL: ' + itemErrors.join('; ')] };

  const bid = input.real_release_execution_barrier_id;
  const h = hash({ bid, preflight_id: input.final_production_execution_preflight_id, items: input.barrier_items, controls: input.required_barrier_controls, level: input.barrier_level });
  return { ...BASE, real_release_execution_barrier_id: bid, real_release_execution_barrier_ready: true, barrier_level: input.barrier_level, barrier_items: input.barrier_items, barrier_items_count: input.barrier_items.length, required_barrier_controls_count: input.required_barrier_controls.length, real_release_execution_barrier_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid real release execution barrier'] };
  const e = [];
  if (!result.real_release_execution_barrier_id) e.push('missing real_release_execution_barrier_id');
  ['real_release_execution_barrier_open','final_production_preflight_passed','explicit_release_execution_command_received','release_execution_consent_bound','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_INPUT';
  const status = result.real_release_execution_barrier_ready ? 'REAL_RELEASE_EXECUTION_BARRIER_READY' :
    result.errors?.some(e => e.startsWith('REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_PREFLIGHT')) ? 'REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_PREFLIGHT' :
    result.errors?.some(e => e.startsWith('REAL_RELEASE_EXECUTION_BARRIER_FAIL')) ? 'REAL_RELEASE_EXECUTION_BARRIER_FAIL' : 'REAL_RELEASE_EXECUTION_BARRIER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nreal_release_execution_barrier_id: ${result.real_release_execution_barrier_id || '(none)'}\nreal_release_execution_barrier_ready: ${result.real_release_execution_barrier_ready}\nbarrier_level: ${result.barrier_level || '(none)'}\nbarrier_items_count: ${result.barrier_items_count}\nrequired_barrier_controls_count: ${result.required_barrier_controls_count}\n`;
  if (result.real_release_execution_barrier_hash) out += `real_release_execution_barrier_hash: ${result.real_release_execution_barrier_hash}\n`;
  if (result.barrier_items?.length) {
    out += 'barrier_items:\n';
    for (const item of result.barrier_items) out += `  ${item.barrier_type}: ${item.barrier_id} (${item.barrier_mode}) hash:${item.barrier_hash?.substring(0,16)}...\n`;
  }
  ['real_release_execution_barrier_open','final_production_preflight_passed','explicit_release_execution_command_received','release_execution_consent_bound','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}