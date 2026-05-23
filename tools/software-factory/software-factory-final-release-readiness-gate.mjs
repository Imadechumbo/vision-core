import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_FINAL_RELEASE_READINESS_GATE_STATUSES = [
  'FINAL_RELEASE_READINESS_BLOCKED_INPUT',
  'FINAL_RELEASE_READINESS_BLOCKED_INTEGRITY',
  'FINAL_RELEASE_READINESS_FAIL',
  'FINAL_RELEASE_READINESS_READY',
];

const ALLOWED_READINESS_TYPES = [
  'pass_gold_evidence', 'go_no_go_decision', 'scope_lock',
  'rc_integrity', 'release_blocker', 'deploy_blocker',
  'tag_blocker', 'stable_blocker', 'production_blocker',
  'rollback_requirement', 'audit_requirement', 'human_authority_requirement',
];

const ALLOWED_READINESS_MODES = ['metadata-only', 'dry-run', 'contract-only', 'planning'];
const REQUIRED_READINESS_CONTROLS = [
  'final-readiness-required', 'pass-gold-required', 'no-production-touch',
  'no-real-release', 'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
  'no-artifact-publish', 'rollback-required', 'evidence-required',
  'audit-required', 'human-approval-required',
];

const ALLOWED_READINESS_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const BASE = {
  schema_version: 'v349.0', final_release_readiness_gate_id: null,
  final_release_readiness_gate_ready: false,
  readiness_items_count: 0, required_readiness_controls_count: 0,
  readiness_level: null, final_release_readiness_hash: null,
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
  for (const rc of REQUIRED_READINESS_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['FINAL_RELEASE_READINESS_BLOCKED_INPUT'] };
  if (!input.final_release_readiness_gate_id || typeof input.final_release_readiness_gate_id !== 'string')
    return { ...BASE, errors: ['FINAL_RELEASE_READINESS_BLOCKED_INPUT: missing final_release_readiness_gate_id'] };
  if (input.release_candidate_integrity_binder_ready !== true)
    return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_BLOCKED_INTEGRITY: release_candidate_integrity_binder_ready must be true'] };
  if (!input.release_candidate_integrity_binder_id || typeof input.release_candidate_integrity_binder_id !== 'string')
    return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_BLOCKED_INTEGRITY: missing release_candidate_integrity_binder_id'] };
  if (!Array.isArray(input.readiness_items) || input.readiness_items.length === 0)
    return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: readiness_items required and non-empty'] };
  if (!Array.isArray(input.required_readiness_controls))
    return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: required_readiness_controls required'] };
  if (!input.readiness_level || typeof input.readiness_level !== 'string')
    return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: readiness_level required'] };
  if (!ALLOWED_READINESS_LEVELS.includes(input.readiness_level))
    return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: readiness_level must be allowed'] };

  for (const item of input.readiness_items) {
    if (!item.readiness_id || typeof item.readiness_id !== 'string')
      return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: each item requires readiness_id'] };
    if (!item.readiness_type || !ALLOWED_READINESS_TYPES.includes(item.readiness_type))
      return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: each item requires valid readiness_type'] };
    if (!item.readiness_mode || !ALLOWED_READINESS_MODES.includes(item.readiness_mode))
      return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: each item requires valid readiness_mode'] };
    if (!item.readiness_hash || typeof item.readiness_hash !== 'string' || item.readiness_hash.length !== 64 || !/^[0-9a-f]{64}$/.test(item.readiness_hash))
      return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: each item requires valid 64-char hex readiness_hash'] };
  }

  if (!hasAllRequiredControls(input.required_readiness_controls))
    return { ...BASE, final_release_readiness_gate_id: input.final_release_readiness_gate_id, errors: ['FINAL_RELEASE_READINESS_FAIL: required_readiness_controls must include all required controls'] };

  const gid = input.final_release_readiness_gate_id;
  const h = hash({ gid, integrity_id: input.release_candidate_integrity_binder_id, items: input.readiness_items, controls: input.required_readiness_controls, level: input.readiness_level });
  return { ...BASE, final_release_readiness_gate_id: gid, final_release_readiness_gate_ready: true, readiness_items_count: input.readiness_items.length, required_readiness_controls_count: input.required_readiness_controls.length, readiness_level: input.readiness_level, final_release_readiness_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid final release readiness gate'] };
  const e = [];
  if (!result.final_release_readiness_gate_id) e.push('missing final_release_readiness_gate_id');
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'FINAL_RELEASE_READINESS_BLOCKED_INPUT';
  const status = result.final_release_readiness_gate_ready ? 'FINAL_RELEASE_READINESS_READY' :
    result.errors?.some(e => e.startsWith('FINAL_RELEASE_READINESS_BLOCKED_INTEGRITY')) ? 'FINAL_RELEASE_READINESS_BLOCKED_INTEGRITY' :
    result.errors?.some(e => e.startsWith('FINAL_RELEASE_READINESS_FAIL')) ? 'FINAL_RELEASE_READINESS_FAIL' : 'FINAL_RELEASE_READINESS_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfinal_release_readiness_gate_id: ${result.final_release_readiness_gate_id || '(none)'}\nfinal_release_readiness_gate_ready: ${result.final_release_readiness_gate_ready}\nreadiness_items_count: ${result.readiness_items_count}\nrequired_readiness_controls_count: ${result.required_readiness_controls_count}\nreadiness_level: ${result.readiness_level || '(none)'}\n`;
  if (result.final_release_readiness_hash) out += `final_release_readiness_hash: ${result.final_release_readiness_hash}\n`;
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}