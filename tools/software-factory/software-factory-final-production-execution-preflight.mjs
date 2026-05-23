import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_FINAL_PRODUCTION_EXECUTION_PREFLIGHT_STATUSES = [
  'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_INPUT',
  'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT',
  'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL',
  'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_READY',
];

const ALLOWED_PREFLIGHT_TYPES = [
  'release', 'deployment', 'tag', 'stable', 'artifact',
  'production', 'rollback', 'evidence', 'audit', 'emergency_stop', 'blocker',
];
const ALLOWED_PREFLIGHT_MODES = [
  'blocked', 'metadata-only', 'dry-run', 'planning', 'contract-only',
];
const REQUIRED_PREFLIGHT_CONTROLS = [
  'final-preflight-required', 'no-production-touch', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
  'no-billing-execution', 'no-secret-access', 'rollback-required', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const BASE = {
  schema_version: 'v357.0', final_production_execution_preflight_id: null,
  final_production_execution_preflight_ready: false,
  preflight_level: null, preflight_items_count: 0,
  required_preflight_controls_count: 0,
  final_production_preflight_hash: null,
  final_production_preflight_passed: false,
  explicit_release_execution_command_received: false,
  release_execution_consent_bound: false,
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
  for (const rc of REQUIRED_PREFLIGHT_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

function isValidHex64(v) { return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_INPUT'] };
  if (!input.final_production_execution_preflight_id || typeof input.final_production_execution_preflight_id !== 'string')
    return { ...BASE, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_INPUT: missing final_production_execution_preflight_id'] };
  if (input.release_execution_consent_binder_ready !== true)
    return { ...BASE, final_production_execution_preflight_id: input.final_production_execution_preflight_id, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT: release_execution_consent_binder_ready must be true'] };
  if (!input.release_execution_consent_binder_id || typeof input.release_execution_consent_binder_id !== 'string')
    return { ...BASE, final_production_execution_preflight_id: input.final_production_execution_preflight_id, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT: missing release_execution_consent_binder_id'] };
  if (!Array.isArray(input.preflight_items) || input.preflight_items.length === 0)
    return { ...BASE, final_production_execution_preflight_id: input.final_production_execution_preflight_id, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL: preflight_items must be non-empty array'] };
  if (!Array.isArray(input.required_preflight_controls))
    return { ...BASE, final_production_execution_preflight_id: input.final_production_execution_preflight_id, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL: required_preflight_controls required'] };
  if (!hasAllRequiredControls(input.required_preflight_controls))
    return { ...BASE, final_production_execution_preflight_id: input.final_production_execution_preflight_id, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL: required_preflight_controls must include all required controls'] };
  if (input.preflight_level && !['blocked', 'dry-run', 'metadata-only', 'planning', 'contract-only'].includes(input.preflight_level))
    return { ...BASE, final_production_execution_preflight_id: input.final_production_execution_preflight_id, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL: preflight_level invalid'] };

  const itemErrors = [];
  for (const item of input.preflight_items) {
    if (!item.preflight_id || typeof item.preflight_id !== 'string') itemErrors.push('item missing preflight_id');
    if (!item.preflight_type || !ALLOWED_PREFLIGHT_TYPES.includes(item.preflight_type)) itemErrors.push('item invalid preflight_type');
    if (!item.preflight_mode || !ALLOWED_PREFLIGHT_MODES.includes(item.preflight_mode)) itemErrors.push('item invalid preflight_mode');
    if (!item.preflight_hash || !isValidHex64(item.preflight_hash)) itemErrors.push('item invalid preflight_hash');
  }
  if (itemErrors.length > 0)
    return { ...BASE, final_production_execution_preflight_id: input.final_production_execution_preflight_id, preflight_items: input.preflight_items, errors: ['FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL: ' + itemErrors.join('; ')] };

  const pid = input.final_production_execution_preflight_id;
  const h = hash({ pid, consent_id: input.release_execution_consent_binder_id, items: input.preflight_items, controls: input.required_preflight_controls, level: input.preflight_level });
  return { ...BASE, final_production_execution_preflight_id: pid, final_production_execution_preflight_ready: true, preflight_level: input.preflight_level, preflight_items: input.preflight_items, preflight_items_count: input.preflight_items.length, required_preflight_controls_count: input.required_preflight_controls.length, final_production_preflight_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid final production execution preflight'] };
  const e = [];
  if (!result.final_production_execution_preflight_id) e.push('missing final_production_execution_preflight_id');
  ['final_production_preflight_passed','explicit_release_execution_command_received','release_execution_consent_bound','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_INPUT';
  const status = result.final_production_execution_preflight_ready ? 'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_READY' :
    result.errors?.some(e => e.startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT')) ? 'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_CONSENT' :
    result.errors?.some(e => e.startsWith('FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL')) ? 'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_FAIL' : 'FINAL_PRODUCTION_EXECUTION_PREFLIGHT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfinal_production_execution_preflight_id: ${result.final_production_execution_preflight_id || '(none)'}\nfinal_production_execution_preflight_ready: ${result.final_production_execution_preflight_ready}\npreflight_level: ${result.preflight_level || '(none)'}\npreflight_items_count: ${result.preflight_items_count}\nrequired_preflight_controls_count: ${result.required_preflight_controls_count}\n`;
  if (result.final_production_preflight_hash) out += `final_production_preflight_hash: ${result.final_production_preflight_hash}\n`;
  if (result.preflight_items?.length) {
    out += 'preflight_items:\n';
    for (const item of result.preflight_items) out += `  ${item.preflight_type}: ${item.preflight_id} (${item.preflight_mode}) hash:${item.preflight_hash?.substring(0,16)}...\n`;
  }
  ['final_production_preflight_passed','explicit_release_execution_command_received','release_execution_consent_bound','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}