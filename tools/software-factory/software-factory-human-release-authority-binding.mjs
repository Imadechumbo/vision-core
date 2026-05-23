import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_HUMAN_RELEASE_AUTHORITY_BINDING_STATUSES = [
  'HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_INPUT',
  'HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_READINESS',
  'HUMAN_RELEASE_AUTHORITY_BINDING_DENIED',
  'HUMAN_RELEASE_AUTHORITY_BINDING_READY',
];

const ALLOWED_AUTHORITY_DECISIONS = ['approved', 'denied', 'blocked'];
const ALLOWED_AUTHORITY_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const REQUIRED_AUTHORITY_CONTROLS = [
  'human-authority-required', 'pass-gold-required', 'final-readiness-required',
  'no-production-touch', 'no-real-release', 'no-real-deploy', 'no-tag-create',
  'no-stable-promotion', 'no-artifact-publish', 'no-billing-execution',
  'no-secret-access', 'rollback-required', 'evidence-required', 'audit-required',
];

const BASE = {
  schema_version: 'v350.0', human_release_authority_binding_id: null,
  human_release_authority_binding_ready: false,
  authority_decision: null, authority_id: null, authority_mode: null,
  required_authority_controls_count: 0,
  human_release_authority_hash: null,
  human_release_authority_bound: false,
  release_execution_plan_published: false, final_rollback_authority_bound: false,
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
  for (const rc of REQUIRED_AUTHORITY_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_INPUT'] };
  if (!input.human_release_authority_binding_id || typeof input.human_release_authority_binding_id !== 'string')
    return { ...BASE, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_INPUT: missing human_release_authority_binding_id'] };
  if (input.final_release_readiness_gate_ready !== true)
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_READINESS: final_release_readiness_gate_ready must be true'] };
  if (!input.final_release_readiness_gate_id || typeof input.final_release_readiness_gate_id !== 'string')
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_READINESS: missing final_release_readiness_gate_id'] };
  if (!input.authority_decision || !ALLOWED_AUTHORITY_DECISIONS.includes(input.authority_decision))
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_DENIED: authority_decision must be allowed'] };
  if (!input.authority_id || typeof input.authority_id !== 'string')
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_DENIED: authority_id required'] };
  if (!input.authority_reason || typeof input.authority_reason !== 'string')
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_DENIED: authority_reason required'] };
  if (!input.authority_mode || !ALLOWED_AUTHORITY_MODES.includes(input.authority_mode))
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_DENIED: authority_mode must be allowed'] };
  if (input.authority_decision === 'denied' || input.authority_decision === 'blocked')
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, authority_decision: input.authority_decision, authority_id: input.authority_id, authority_mode: input.authority_mode, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_DENIED: decision is denied or blocked'] };
  if (!Array.isArray(input.required_authority_controls))
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_DENIED: required_authority_controls required'] };
  if (!hasAllRequiredControls(input.required_authority_controls))
    return { ...BASE, human_release_authority_binding_id: input.human_release_authority_binding_id, errors: ['HUMAN_RELEASE_AUTHORITY_BINDING_DENIED: required_authority_controls must include all required controls'] };

  const bid = input.human_release_authority_binding_id;
  const h = hash({ bid, readiness_id: input.final_release_readiness_gate_id, decision: input.authority_decision, auth_id: input.authority_id, reason: input.authority_reason, mode: input.authority_mode, controls: input.required_authority_controls });
  return { ...BASE, human_release_authority_binding_id: bid, human_release_authority_binding_ready: true, authority_decision: input.authority_decision, authority_id: input.authority_id, authority_mode: input.authority_mode, required_authority_controls_count: input.required_authority_controls.length, human_release_authority_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid human release authority binding'] };
  const e = [];
  if (!result.human_release_authority_binding_id) e.push('missing human_release_authority_binding_id');
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_INPUT';
  const status = result.human_release_authority_binding_ready ? 'HUMAN_RELEASE_AUTHORITY_BINDING_READY' :
    result.errors?.some(e => e.startsWith('HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_READINESS')) ? 'HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_READINESS' :
    result.errors?.some(e => e.startsWith('HUMAN_RELEASE_AUTHORITY_BINDING_DENIED')) ? 'HUMAN_RELEASE_AUTHORITY_BINDING_DENIED' : 'HUMAN_RELEASE_AUTHORITY_BINDING_BLOCKED_INPUT';
  let out = `=== ${status} ===\nhuman_release_authority_binding_id: ${result.human_release_authority_binding_id || '(none)'}\nhuman_release_authority_binding_ready: ${result.human_release_authority_binding_ready}\nuthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\nauthority_mode: ${result.authority_mode || '(none)'}\nrequired_authority_controls_count: ${result.required_authority_controls_count}\n`;
  if (result.human_release_authority_hash) out += `human_release_authority_hash: ${result.human_release_authority_hash}\n`;
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}