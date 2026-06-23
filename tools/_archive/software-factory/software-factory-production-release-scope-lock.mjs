import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCTION_RELEASE_SCOPE_LOCK_STATUSES = [
  'PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_INPUT',
  'PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_DECISION',
  'PRODUCTION_RELEASE_SCOPE_LOCK_FAIL',
  'PRODUCTION_RELEASE_SCOPE_LOCK_READY',
];

const ALLOWED_SCOPE_TYPES = [
  'release', 'deployment', 'tag', 'stable', 'artifact',
  'production', 'rollback', 'audit', 'evidence', 'authority', 'blocker',
];

const ALLOWED_SCOPE_MODES = ['blocked', 'metadata-only', 'dry-run', 'planning'];
const REQUIRED_SCOPE_CONTROLS = [
  'scope-lock-required', 'no-production-touch', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
  'no-artifact-publish', 'rollback-required', 'evidence-required',
  'audit-required', 'human-approval-required',
];

const ALLOWED_LOCK_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const BASE = {
  schema_version: 'v347.0', production_release_scope_lock_id: null,
  production_release_scope_lock_ready: false,
  scope_items_count: 0, required_scope_controls_count: 0,
  lock_level: null, production_release_scope_lock_hash: null,
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
  for (const rc of REQUIRED_SCOPE_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_INPUT'] };
  if (!input.production_release_scope_lock_id || typeof input.production_release_scope_lock_id !== 'string')
    return { ...BASE, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_INPUT: missing production_release_scope_lock_id'] };
  if (input.release_go_no_go_decision_gate_ready !== true)
    return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_DECISION: release_go_no_go_decision_gate_ready must be true'] };
  if (!input.release_go_no_go_decision_gate_id || typeof input.release_go_no_go_decision_gate_id !== 'string')
    return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_DECISION: missing release_go_no_go_decision_gate_id'] };
  if (!Array.isArray(input.scope_items) || input.scope_items.length === 0)
    return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: scope_items required and non-empty'] };
  if (!Array.isArray(input.required_scope_controls))
    return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: required_scope_controls required'] };
  if (!input.lock_level || typeof input.lock_level !== 'string')
    return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: lock_level required'] };
  if (!ALLOWED_LOCK_LEVELS.includes(input.lock_level))
    return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: lock_level must be allowed'] };

  for (const item of input.scope_items) {
    if (!item.scope_id || typeof item.scope_id !== 'string')
      return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: each item requires scope_id'] };
    if (!item.scope_type || !ALLOWED_SCOPE_TYPES.includes(item.scope_type))
      return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: each item requires valid scope_type'] };
    if (!item.scope_mode || !ALLOWED_SCOPE_MODES.includes(item.scope_mode))
      return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: each item requires valid scope_mode'] };
    if (!item.scope_hash || typeof item.scope_hash !== 'string' || item.scope_hash.length !== 64 || !/^[0-9a-f]{64}$/.test(item.scope_hash))
      return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: each item requires valid 64-char hex scope_hash'] };
  }

  if (!hasAllRequiredControls(input.required_scope_controls))
    return { ...BASE, production_release_scope_lock_id: input.production_release_scope_lock_id, errors: ['PRODUCTION_RELEASE_SCOPE_LOCK_FAIL: required_scope_controls must include all required controls'] };

  const lid = input.production_release_scope_lock_id;
  const h = hash({ lid, decision_id: input.release_go_no_go_decision_gate_id, items: input.scope_items, controls: input.required_scope_controls, level: input.lock_level });
  return { ...BASE, production_release_scope_lock_id: lid, production_release_scope_lock_ready: true, scope_items_count: input.scope_items.length, required_scope_controls_count: input.required_scope_controls.length, lock_level: input.lock_level, production_release_scope_lock_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid production release scope lock'] };
  const e = [];
  if (!result.production_release_scope_lock_id) e.push('missing production_release_scope_lock_id');
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_INPUT';
  const status = result.production_release_scope_lock_ready ? 'PRODUCTION_RELEASE_SCOPE_LOCK_READY' :
    result.errors?.some(e => e.startsWith('PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_DECISION')) ? 'PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_DECISION' :
    result.errors?.some(e => e.startsWith('PRODUCTION_RELEASE_SCOPE_LOCK_FAIL')) ? 'PRODUCTION_RELEASE_SCOPE_LOCK_FAIL' : 'PRODUCTION_RELEASE_SCOPE_LOCK_BLOCKED_INPUT';
  let out = `=== ${status} ===\nproduction_release_scope_lock_id: ${result.production_release_scope_lock_id || '(none)'}\nproduction_release_scope_lock_ready: ${result.production_release_scope_lock_ready}\nscope_items_count: ${result.scope_items_count}\nrequired_scope_controls_count: ${result.required_scope_controls_count}\nlock_level: ${result.lock_level || '(none)'}\n`;
  if (result.production_release_scope_lock_hash) out += `production_release_scope_lock_hash: ${result.production_release_scope_lock_hash}\n`;
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}