import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_FINAL_ROLLBACK_AUTHORITY_BINDER_STATUSES = [
  'FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_INPUT',
  'FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN',
  'FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL',
  'FINAL_ROLLBACK_AUTHORITY_BINDER_READY',
];

const ALLOWED_ROLLBACK_TYPES = [
  'release_rollback', 'deployment_rollback', 'tag_rollback',
  'stable_rollback', 'artifact_rollback', 'production_rollback',
  'database_rollback', 'infrastructure_rollback', 'evidence_rollback',
  'audit_rollback', 'emergency_stop',
];

const ALLOWED_ROLLBACK_MODES = ['metadata-only', 'dry-run', 'contract-only', 'planning'];
const REQUIRED_ROLLBACK_CONTROLS = [
  'rollback-required', 'final-rollback-required', 'no-real-rollback',
  'no-filesystem-write', 'no-database-write', 'no-network',
  'no-secret-access', 'no-deploy', 'no-release', 'no-tag-create',
  'no-stable-promotion', 'evidence-required', 'audit-required',
  'human-approval-required',
];

const ALLOWED_ROLLBACK_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const BASE = {
  schema_version: 'v352.0', final_rollback_authority_binder_id: null,
  final_rollback_authority_binder_ready: false,
  rollback_authority_items_count: 0, required_rollback_controls_count: 0,
  rollback_level: null, final_rollback_authority_hash: null,
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
  for (const rc of REQUIRED_ROLLBACK_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_INPUT'] };
  if (!input.final_rollback_authority_binder_id || typeof input.final_rollback_authority_binder_id !== 'string')
    return { ...BASE, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_INPUT: missing final_rollback_authority_binder_id'] };
  if (input.release_execution_plan_receipt_ready !== true)
    return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN: release_execution_plan_receipt_ready must be true'] };
  if (!input.release_execution_plan_receipt_id || typeof input.release_execution_plan_receipt_id !== 'string')
    return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN: missing release_execution_plan_receipt_id'] };
  if (!Array.isArray(input.rollback_authority_items) || input.rollback_authority_items.length === 0)
    return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: rollback_authority_items required and non-empty'] };
  if (!Array.isArray(input.required_rollback_controls))
    return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: required_rollback_controls required'] };
  if (!input.rollback_level || typeof input.rollback_level !== 'string')
    return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: rollback_level required'] };
  if (!ALLOWED_ROLLBACK_LEVELS.includes(input.rollback_level))
    return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: rollback_level must be allowed'] };

  for (const item of input.rollback_authority_items) {
    if (!item.rollback_id || typeof item.rollback_id !== 'string')
      return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: each item requires rollback_id'] };
    if (!item.rollback_type || !ALLOWED_ROLLBACK_TYPES.includes(item.rollback_type))
      return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: each item requires valid rollback_type'] };
    if (!item.rollback_mode || !ALLOWED_ROLLBACK_MODES.includes(item.rollback_mode))
      return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: each item requires valid rollback_mode'] };
    if (!item.rollback_hash || typeof item.rollback_hash !== 'string' || item.rollback_hash.length !== 64 || !/^[0-9a-f]{64}$/.test(item.rollback_hash))
      return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: each item requires valid 64-char hex rollback_hash'] };
  }

  if (!hasAllRequiredControls(input.required_rollback_controls))
    return { ...BASE, final_rollback_authority_binder_id: input.final_rollback_authority_binder_id, errors: ['FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL: required_rollback_controls must include all required controls'] };

  const bid = input.final_rollback_authority_binder_id;
  const h = hash({ bid, plan_id: input.release_execution_plan_receipt_id, items: input.rollback_authority_items, controls: input.required_rollback_controls, level: input.rollback_level });
  return { ...BASE, final_rollback_authority_binder_id: bid, final_rollback_authority_binder_ready: true, rollback_authority_items_count: input.rollback_authority_items.length, required_rollback_controls_count: input.required_rollback_controls.length, rollback_level: input.rollback_level, final_rollback_authority_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid final rollback authority binder'] };
  const e = [];
  if (!result.final_rollback_authority_binder_id) e.push('missing final_rollback_authority_binder_id');
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_INPUT';
  const status = result.final_rollback_authority_binder_ready ? 'FINAL_ROLLBACK_AUTHORITY_BINDER_READY' :
    result.errors?.some(e => e.startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN')) ? 'FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_PLAN' :
    result.errors?.some(e => e.startsWith('FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL')) ? 'FINAL_ROLLBACK_AUTHORITY_BINDER_FAIL' : 'FINAL_ROLLBACK_AUTHORITY_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfinal_rollback_authority_binder_id: ${result.final_rollback_authority_binder_id || '(none)'}\nfinal_rollback_authority_binder_ready: ${result.final_rollback_authority_binder_ready}\nollback_authority_items_count: ${result.rollback_authority_items_count}\nrequired_rollback_controls_count: ${result.required_rollback_controls_count}\nrollback_level: ${result.rollback_level || '(none)'}\n`;
  if (result.final_rollback_authority_hash) out += `final_rollback_authority_hash: ${result.final_rollback_authority_hash}\n`;
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}