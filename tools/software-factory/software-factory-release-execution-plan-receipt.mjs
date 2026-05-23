import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_EXECUTION_PLAN_RECEIPT_STATUSES = [
  'RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_INPUT',
  'RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY',
  'RELEASE_EXECUTION_PLAN_RECEIPT_FAIL',
  'RELEASE_EXECUTION_PLAN_RECEIPT_READY',
];

const ALLOWED_PLAN_TYPES = [
  'release_plan', 'deployment_plan', 'tag_plan', 'stable_plan',
  'artifact_plan', 'production_plan', 'rollback_plan', 'audit_plan',
  'evidence_plan', 'blocker_plan', 'emergency_stop_plan',
];

const ALLOWED_PLAN_MODES = ['metadata-only', 'dry-run', 'contract-only', 'planning'];
const REQUIRED_PLAN_CONTROLS = [
  'no-real-release', 'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
  'no-artifact-publish', 'no-production-touch', 'no-billing-execution',
  'no-secret-access', 'rollback-required', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const ALLOWED_PLAN_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const BASE = {
  schema_version: 'v351.0', release_execution_plan_receipt_id: null,
  release_execution_plan_receipt_ready: false,
  plan_items_count: 0, required_plan_controls_count: 0,
  plan_level: null, release_execution_plan_hash: null,
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
  for (const rc of REQUIRED_PLAN_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_INPUT'] };
  if (!input.release_execution_plan_receipt_id || typeof input.release_execution_plan_receipt_id !== 'string')
    return { ...BASE, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_INPUT: missing release_execution_plan_receipt_id'] };
  if (input.human_release_authority_binding_ready !== true)
    return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY: human_release_authority_binding_ready must be true'] };
  if (!input.human_release_authority_binding_id || typeof input.human_release_authority_binding_id !== 'string')
    return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY: missing human_release_authority_binding_id'] };
  if (!Array.isArray(input.plan_items) || input.plan_items.length === 0)
    return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: plan_items required and non-empty'] };
  if (!Array.isArray(input.required_plan_controls))
    return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: required_plan_controls required'] };
  if (!input.plan_level || typeof input.plan_level !== 'string')
    return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: plan_level required'] };
  if (!ALLOWED_PLAN_LEVELS.includes(input.plan_level))
    return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: plan_level must be allowed'] };

  for (const item of input.plan_items) {
    if (!item.plan_id || typeof item.plan_id !== 'string')
      return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: each item requires plan_id'] };
    if (!item.plan_type || !ALLOWED_PLAN_TYPES.includes(item.plan_type))
      return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: each item requires valid plan_type'] };
    if (!item.plan_mode || !ALLOWED_PLAN_MODES.includes(item.plan_mode))
      return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: each item requires valid plan_mode'] };
    if (!item.plan_hash || typeof item.plan_hash !== 'string' || item.plan_hash.length !== 64 || !/^[0-9a-f]{64}$/.test(item.plan_hash))
      return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: each item requires valid 64-char hex plan_hash'] };
  }

  if (!hasAllRequiredControls(input.required_plan_controls))
    return { ...BASE, release_execution_plan_receipt_id: input.release_execution_plan_receipt_id, errors: ['RELEASE_EXECUTION_PLAN_RECEIPT_FAIL: required_plan_controls must include all required controls'] };

  const pid = input.release_execution_plan_receipt_id;
  const h = hash({ pid, authority_id: input.human_release_authority_binding_id, items: input.plan_items, controls: input.required_plan_controls, level: input.plan_level });
  return { ...BASE, release_execution_plan_receipt_id: pid, release_execution_plan_receipt_ready: true, plan_items_count: input.plan_items.length, required_plan_controls_count: input.required_plan_controls.length, plan_level: input.plan_level, release_execution_plan_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release execution plan receipt'] };
  const e = [];
  if (!result.release_execution_plan_receipt_id) e.push('missing release_execution_plan_receipt_id');
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_INPUT';
  const status = result.release_execution_plan_receipt_ready ? 'RELEASE_EXECUTION_PLAN_RECEIPT_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY')) ? 'RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_AUTHORITY' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_PLAN_RECEIPT_FAIL')) ? 'RELEASE_EXECUTION_PLAN_RECEIPT_FAIL' : 'RELEASE_EXECUTION_PLAN_RECEIPT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_execution_plan_receipt_id: ${result.release_execution_plan_receipt_id || '(none)'}\nrelease_execution_plan_receipt_ready: ${result.release_execution_plan_receipt_ready}\nlan_items_count: ${result.plan_items_count}\nrequired_plan_controls_count: ${result.required_plan_controls_count}\nplan_level: ${result.plan_level || '(none)'}\n`;
  if (result.release_execution_plan_hash) out += `release_execution_plan_hash: ${result.release_execution_plan_hash}\n`;
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}