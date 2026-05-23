import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_GO_NO_GO_DECISION_GATE_STATUSES = [
  'RELEASE_GO_NO_GO_BLOCKED_INPUT',
  'RELEASE_GO_NO_GO_BLOCKED_EVIDENCE',
  'RELEASE_GO_NO_GO_DENIED',
  'RELEASE_GO_NO_GO_READY',
];

const ALLOWED_RELEASE_DECISIONS = ['go', 'no-go', 'blocked'];
const ALLOWED_DECISION_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const REQUIRED_DECISION_CONTROLS = [
  'pass-gold-required', 'human-authority-required', 'no-production-touch',
  'no-real-release', 'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
  'rollback-required', 'evidence-required', 'audit-required',
];

const BASE = {
  schema_version: 'v346.0', release_go_no_go_decision_gate_id: null,
  release_go_no_go_decision_gate_ready: false,
  release_decision: null, decision_mode: null,
  required_decision_controls_count: 0,
  release_go_no_go_hash: null,
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
  for (const rc of REQUIRED_DECISION_CONTROLS) {
    if (!controls.includes(rc)) return false;
  }
  return true;
}

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_GO_NO_GO_BLOCKED_INPUT'] };
  if (!input.release_go_no_go_decision_gate_id || typeof input.release_go_no_go_decision_gate_id !== 'string')
    return { ...BASE, errors: ['RELEASE_GO_NO_GO_BLOCKED_INPUT: missing release_go_no_go_decision_gate_id'] };
  if (input.pass_gold_release_evidence_contract_ready !== true)
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, errors: ['RELEASE_GO_NO_GO_BLOCKED_EVIDENCE: pass_gold_release_evidence_contract_ready must be true'] };
  if (!input.pass_gold_release_evidence_contract_id || typeof input.pass_gold_release_evidence_contract_id !== 'string')
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, errors: ['RELEASE_GO_NO_GO_BLOCKED_EVIDENCE: missing pass_gold_release_evidence_contract_id'] };
  if (!input.release_decision || !ALLOWED_RELEASE_DECISIONS.includes(input.release_decision))
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, errors: ['RELEASE_GO_NO_GO_DENIED: release_decision must be allowed'] };
  if (!input.decision_reason || typeof input.decision_reason !== 'string')
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, errors: ['RELEASE_GO_NO_GO_DENIED: decision_reason required'] };
  if (!input.decision_mode || !ALLOWED_DECISION_MODES.includes(input.decision_mode))
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, errors: ['RELEASE_GO_NO_GO_DENIED: decision_mode must be allowed'] };
  if (input.release_decision === 'no-go' || input.release_decision === 'blocked')
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, release_decision: input.release_decision, decision_mode: input.decision_mode, errors: ['RELEASE_GO_NO_GO_DENIED: release decision is no-go or blocked'] };
  if (!Array.isArray(input.required_decision_controls))
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, errors: ['RELEASE_GO_NO_GO_DENIED: required_decision_controls required'] };
  if (!hasAllRequiredControls(input.required_decision_controls))
    return { ...BASE, release_go_no_go_decision_gate_id: input.release_go_no_go_decision_gate_id, errors: ['RELEASE_GO_NO_GO_DENIED: required_decision_controls must include all required controls'] };

  const gid = input.release_go_no_go_decision_gate_id;
  const h = hash({ gid, evidence_id: input.pass_gold_release_evidence_contract_id, decision: input.release_decision, reason: input.decision_reason, mode: input.decision_mode, controls: input.required_decision_controls });
  return { ...BASE, release_go_no_go_decision_gate_id: gid, release_go_no_go_decision_gate_ready: true, release_decision: input.release_decision, decision_mode: input.decision_mode, required_decision_controls_count: input.required_decision_controls.length, release_go_no_go_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release go/no-go decision gate'] };
  const e = [];
  if (!result.release_go_no_go_decision_gate_id) e.push('missing release_go_no_go_decision_gate_id');
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_GO_NO_GO_BLOCKED_INPUT';
  const status = result.release_go_no_go_decision_gate_ready ? 'RELEASE_GO_NO_GO_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_GO_NO_GO_BLOCKED_EVIDENCE')) ? 'RELEASE_GO_NO_GO_BLOCKED_EVIDENCE' :
    result.errors?.some(e => e.startsWith('RELEASE_GO_NO_GO_DENIED')) ? 'RELEASE_GO_NO_GO_DENIED' : 'RELEASE_GO_NO_GO_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_go_no_go_decision_gate_id: ${result.release_go_no_go_decision_gate_id || '(none)'}\nrelease_go_no_go_decision_gate_ready: ${result.release_go_no_go_decision_gate_ready}\nrelease_decision: ${result.release_decision || '(none)'}\ndecision_mode: ${result.decision_mode || '(none)'}\nrequired_decision_controls_count: ${result.required_decision_controls_count}\n`;
  if (result.release_go_no_go_hash) out += `release_go_no_go_hash: ${result.release_go_no_go_hash}\n`;
  ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}