import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_EXECUTION_CONSENT_BINDER_STATUSES = [
  'RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_INPUT',
  'RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND',
  'RELEASE_EXECUTION_CONSENT_BINDER_DENIED',
  'RELEASE_EXECUTION_CONSENT_BINDER_READY',
];

const ALLOWED_CONSENT_DECISIONS = ['approved', 'denied', 'blocked'];
const ALLOWED_CONSENT_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const REQUIRED_CONSENT_CONTROLS = [
  'human-consent-required', 'explicit-command-required', 'pass-gold-required',
  'no-production-touch', 'no-real-release', 'no-real-deploy', 'no-tag-create',
  'no-stable-promotion', 'no-artifact-publish', 'no-billing-execution',
  'no-secret-access', 'rollback-required', 'evidence-required', 'audit-required',
];

const BASE = {
  schema_version: 'v356.0', release_execution_consent_binder_id: null,
  release_execution_consent_binder_ready: false,
  consent_decision: null, consent_id: null, consent_mode: null, consent_reason: null,
  required_consent_controls_count: 0,
  release_execution_consent_hash: null,
  release_execution_consent_bound: false,
  explicit_release_execution_command_received: false,
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
  for (const rc of REQUIRED_CONSENT_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_INPUT'] };
  if (!input.release_execution_consent_binder_id || typeof input.release_execution_consent_binder_id !== 'string')
    return { ...BASE, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_INPUT: missing release_execution_consent_binder_id'] };
  if (input.explicit_release_execution_command_ready !== true)
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND: explicit_release_execution_command_ready must be true'] };
  if (!input.explicit_release_execution_command_id || typeof input.explicit_release_execution_command_id !== 'string')
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND: missing explicit_release_execution_command_id'] };
  if (!input.consent_decision || !ALLOWED_CONSENT_DECISIONS.includes(input.consent_decision))
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_DENIED: consent_decision must be allowed'] };
  if (!input.consent_id || typeof input.consent_id !== 'string')
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_DENIED: consent_id required'] };
  if (!input.consent_reason || typeof input.consent_reason !== 'string')
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_DENIED: consent_reason required'] };
  if (!input.consent_mode || !ALLOWED_CONSENT_MODES.includes(input.consent_mode))
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_DENIED: consent_mode must be allowed'] };
  if (input.consent_decision === 'denied' || input.consent_decision === 'blocked')
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, consent_decision: input.consent_decision, consent_id: input.consent_id, consent_mode: input.consent_mode, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_DENIED: decision is denied or blocked'] };
  if (!Array.isArray(input.required_consent_controls))
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_DENIED: required_consent_controls required'] };
  if (!hasAllRequiredControls(input.required_consent_controls))
    return { ...BASE, release_execution_consent_binder_id: input.release_execution_consent_binder_id, errors: ['RELEASE_EXECUTION_CONSENT_BINDER_DENIED: required_consent_controls must include all required controls'] };

  const bid = input.release_execution_consent_binder_id;
  const h = hash({ bid, command_id: input.explicit_release_execution_command_id, decision: input.consent_decision, cid: input.consent_id, reason: input.consent_reason, mode: input.consent_mode, controls: input.required_consent_controls });
  return { ...BASE, release_execution_consent_binder_id: bid, release_execution_consent_binder_ready: true, consent_decision: input.consent_decision, consent_id: input.consent_id, consent_mode: input.consent_mode, consent_reason: input.consent_reason, required_consent_controls_count: input.required_consent_controls.length, release_execution_consent_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release execution consent binder'] };
  const e = [];
  if (!result.release_execution_consent_binder_id) e.push('missing release_execution_consent_binder_id');
  ['release_execution_consent_bound','explicit_release_execution_command_received','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_INPUT';
  const status = result.release_execution_consent_binder_ready ? 'RELEASE_EXECUTION_CONSENT_BINDER_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND')) ? 'RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')) ? 'RELEASE_EXECUTION_CONSENT_BINDER_DENIED' : 'RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_execution_consent_binder_id: ${result.release_execution_consent_binder_id || '(none)'}\nrelease_execution_consent_binder_ready: ${result.release_execution_consent_binder_ready}\nconsent_decision: ${result.consent_decision || '(none)'}\nconsent_id: ${result.consent_id || '(none)'}\nconsent_mode: ${result.consent_mode || '(none)'}\nconsent_reason: ${result.consent_reason || '(none)'}\nrequired_consent_controls_count: ${result.required_consent_controls_count}\n`;
  if (result.release_execution_consent_hash) out += `release_execution_consent_hash: ${result.release_execution_consent_hash}\n`;
  ['release_execution_consent_bound','explicit_release_execution_command_received','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}