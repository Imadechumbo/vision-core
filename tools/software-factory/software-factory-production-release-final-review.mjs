import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCTION_RELEASE_FINAL_REVIEW_STATUSES = [
  'PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_INPUT',
  'PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_ROLLBACK',
  'PRODUCTION_RELEASE_FINAL_REVIEW_DENIED',
  'PRODUCTION_RELEASE_FINAL_REVIEW_READY',
];

const ALLOWED_REVIEW_DECISIONS = ['approved', 'denied', 'blocked'];
const ALLOWED_REVIEW_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const REQUIRED_REVIEW_CONTROLS = [
  'human-authority-required', 'pass-gold-required', 'final-readiness-required',
  'rollback-required', 'no-production-touch', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
  'no-artifact-publish', 'no-billing-execution', 'no-secret-access',
  'audit-required', 'evidence-required',
];

const BASE = {
  schema_version: 'v353.0', production_release_final_review_id: null,
  production_release_final_review_ready: false,
  authority_decision: null, authority_id: null, review_mode: null,
  required_review_controls_count: 0,
  production_release_final_review_hash: null,
  human_release_authority_bound: false,
  release_execution_plan_published: false,
  final_rollback_authority_bound: false,
  production_release_final_review_approved: false,
  pass_gold_release_authority_phase_passed: false,
  pass_gold_release_evidence_bound: false,
  release_go_decision: false, release_no_go_decision: false,
  production_release_scope_locked: false, release_candidate_integrity_bound: false,
  final_release_ready: false,
  release_execution_allowed: false, deployment_execution_allowed: false,
  deployment_scope_bound: false, release_artifact_published: false,
  deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false,
  release_rollback_bound: false, release_authority_granted: false,
  release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_phase_passed: false, product_activation_allowed: false,
  saas_enablement_allowed: false, production_readiness_confirmed: false,
  saas_enabled: false, billing_executed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false,
  real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function hasAllRequiredControls(controls) {
  for (const rc of REQUIRED_REVIEW_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_INPUT'] };
  if (!input.production_release_final_review_id || typeof input.production_release_final_review_id !== 'string')
    return { ...BASE, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_INPUT: missing production_release_final_review_id'] };
  if (input.final_rollback_authority_binder_ready !== true)
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_ROLLBACK: final_rollback_authority_binder_ready must be true'] };
  if (!input.final_rollback_authority_binder_id || typeof input.final_rollback_authority_binder_id !== 'string')
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_ROLLBACK: missing final_rollback_authority_binder_id'] };
  if (!input.authority_decision || !ALLOWED_REVIEW_DECISIONS.includes(input.authority_decision))
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_DENIED: authority_decision must be allowed'] };
  if (!input.authority_id || typeof input.authority_id !== 'string')
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_DENIED: authority_id required'] };
  if (!input.review_reason || typeof input.review_reason !== 'string')
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_DENIED: review_reason required'] };
  if (!input.review_mode || !ALLOWED_REVIEW_MODES.includes(input.review_mode))
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_DENIED: review_mode must be allowed'] };
  if (input.authority_decision === 'denied' || input.authority_decision === 'blocked')
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_DENIED: decision is denied or blocked'] };
  if (!Array.isArray(input.required_review_controls))
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_DENIED: required_review_controls required'] };
  if (!hasAllRequiredControls(input.required_review_controls))
    return { ...BASE, production_release_final_review_id: input.production_release_final_review_id, errors: ['PRODUCTION_RELEASE_FINAL_REVIEW_DENIED: required_review_controls must include all required controls'] };

  const rid = input.production_release_final_review_id;
  const h = hash({ rid, rollback_id: input.final_rollback_authority_binder_id, decision: input.authority_decision, auth_id: input.authority_id, reason: input.review_reason, mode: input.review_mode, controls: input.required_review_controls });
  return { ...BASE, production_release_final_review_id: rid, production_release_final_review_ready: true, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, required_review_controls_count: input.required_review_controls.length, production_release_final_review_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid production release final review'] };
  const e = [];
  if (!result.production_release_final_review_id) e.push('missing production_release_final_review_id');
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_INPUT';
  const status = result.production_release_final_review_ready ? 'PRODUCTION_RELEASE_FINAL_REVIEW_READY' :
    result.errors?.some(e => e.startsWith('PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_ROLLBACK')) ? 'PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_ROLLBACK' :
    result.errors?.some(e => e.startsWith('PRODUCTION_RELEASE_FINAL_REVIEW_DENIED')) ? 'PRODUCTION_RELEASE_FINAL_REVIEW_DENIED' : 'PRODUCTION_RELEASE_FINAL_REVIEW_BLOCKED_INPUT';
  let out = `=== ${status} ===\nproduction_release_final_review_id: ${result.production_release_final_review_id || '(none)'}\nproduction_release_final_review_ready: ${result.production_release_final_review_ready}\nauthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\neview_mode: ${result.review_mode || '(none)'}\nrequired_review_controls_count: ${result.required_review_controls_count}\n`;
  if (result.production_release_final_review_hash) out += `production_release_final_review_hash: ${result.production_release_final_review_hash}\n`;
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}