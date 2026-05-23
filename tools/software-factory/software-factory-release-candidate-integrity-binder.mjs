import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_CANDIDATE_INTEGRITY_BINDER_STATUSES = [
  'RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_INPUT',
  'RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE',
  'RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL',
  'RELEASE_CANDIDATE_INTEGRITY_BINDER_READY',
];

const ALLOWED_INTEGRITY_TYPES = [
  'source_integrity', 'package_integrity', 'test_integrity',
  'syntax_integrity', 'evidence_integrity', 'artifact_integrity',
  'rollback_integrity', 'audit_integrity', 'pass_gold_integrity', 'blocker_integrity',
];

const ALLOWED_INTEGRITY_MODES = ['metadata-only', 'dry-run', 'contract-only', 'planning'];
const REQUIRED_INTEGRITY_CONTROLS = [
  'integrity-required', 'no-artifact-publish', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
  'no-production-touch', 'pass-gold-required', 'rollback-required',
  'evidence-required', 'audit-required',
];

const ALLOWED_INTEGRITY_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const BASE = {
  schema_version: 'v348.0', release_candidate_integrity_binder_id: null,
  release_candidate_integrity_binder_ready: false,
  integrity_items_count: 0, required_integrity_controls_count: 0,
  integrity_level: null, release_candidate_integrity_hash: null,
  pass_gold_release_evidence_bound: false,
  release_go_decision: false, release_no_go_decision: false,
  production_release_scope_locked: false, release_candidate_integrity_bound: false,
  final_release_ready: false, human_release_authority_bound: false,
  release_execution_plan_published: false, final_rollback_authority_bound: false,
  production_release_final_review_approved: false,
  pass_gold_release_authority_phase_passed: false,
  release_execution_allowed: false, deployment_execution_allowed: false,
  deployment_scope_bound: false, release_artifact_published: false,
  deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false,
  release_rollback_bound: false, release_authority_granted: false,
  release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_phase_passed: false, product_activation_allowed: false,
  saas_enablement_allowed: false, saas_enabled: false, billing_executed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false,
  real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function hasAllRequiredControls(controls) {
  for (const rc of REQUIRED_INTEGRITY_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_INPUT'] };
  if (!input.release_candidate_integrity_binder_id || typeof input.release_candidate_integrity_binder_id !== 'string')
    return { ...BASE, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_INPUT: missing release_candidate_integrity_binder_id'] };
  if (input.production_release_scope_lock_ready !== true)
    return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE: production_release_scope_lock_ready must be true'] };
  if (!input.production_release_scope_lock_id || typeof input.production_release_scope_lock_id !== 'string')
    return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE: missing production_release_scope_lock_id'] };
  if (!Array.isArray(input.integrity_items) || input.integrity_items.length === 0)
    return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: integrity_items required and non-empty'] };
  if (!Array.isArray(input.required_integrity_controls))
    return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: required_integrity_controls required'] };
  if (!input.integrity_level || typeof input.integrity_level !== 'string')
    return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: integrity_level required'] };
  if (!ALLOWED_INTEGRITY_LEVELS.includes(input.integrity_level))
    return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: integrity_level must be allowed'] };

  for (const item of input.integrity_items) {
    if (!item.integrity_id || typeof item.integrity_id !== 'string')
      return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: each item requires integrity_id'] };
    if (!item.integrity_type || !ALLOWED_INTEGRITY_TYPES.includes(item.integrity_type))
      return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: each item requires valid integrity_type'] };
    if (!item.integrity_mode || !ALLOWED_INTEGRITY_MODES.includes(item.integrity_mode))
      return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: each item requires valid integrity_mode'] };
    if (!item.integrity_hash || typeof item.integrity_hash !== 'string' || item.integrity_hash.length !== 64 || !/^[0-9a-f]{64}$/.test(item.integrity_hash))
      return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: each item requires valid 64-char hex integrity_hash'] };
  }

  if (!hasAllRequiredControls(input.required_integrity_controls))
    return { ...BASE, release_candidate_integrity_binder_id: input.release_candidate_integrity_binder_id, errors: ['RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL: required_integrity_controls must include all required controls'] };

  const bid = input.release_candidate_integrity_binder_id;
  const h = hash({ bid, scope_id: input.production_release_scope_lock_id, items: input.integrity_items, controls: input.required_integrity_controls, level: input.integrity_level });
  return { ...BASE, release_candidate_integrity_binder_id: bid, release_candidate_integrity_binder_ready: true, integrity_items_count: input.integrity_items.length, required_integrity_controls_count: input.required_integrity_controls.length, integrity_level: input.integrity_level, release_candidate_integrity_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release candidate integrity binder'] };
  const e = [];
  if (!result.release_candidate_integrity_binder_id) e.push('missing release_candidate_integrity_binder_id');
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_INPUT';
  const status = result.release_candidate_integrity_binder_ready ? 'RELEASE_CANDIDATE_INTEGRITY_BINDER_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE')) ? 'RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_SCOPE' :
    result.errors?.some(e => e.startsWith('RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL')) ? 'RELEASE_CANDIDATE_INTEGRITY_BINDER_FAIL' : 'RELEASE_CANDIDATE_INTEGRITY_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_candidate_integrity_binder_id: ${result.release_candidate_integrity_binder_id || '(none)'}\nrelease_candidate_integrity_binder_ready: ${result.release_candidate_integrity_binder_ready}\nintegrity_items_count: ${result.integrity_items_count}\nrequired_integrity_controls_count: ${result.required_integrity_controls_count}\nintegrity_level: ${result.integrity_level || '(none)'}\n`;
  if (result.release_candidate_integrity_hash) out += `release_candidate_integrity_hash: ${result.release_candidate_integrity_hash}\n`;
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}