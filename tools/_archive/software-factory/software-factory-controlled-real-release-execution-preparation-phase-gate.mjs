import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES = [
  'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT',
  'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK',
  'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE',
  'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_READY',
];

const REQUIRED_IDS = [
  'real_release_execution_command_contract',
  'production_execution_environment_verifier',
  'real_release_execution_dry_run_verifier',
  'real_release_rollback_readiness_gate',
];

const FINAL_MESSAGE = 'V360-V364 controlled real release execution preparation complete. Real release, deploy, tag, stable promotion, artifact publish, production touch, billing, network, secret access, and rollback remain blocked until explicit V365 command.';

const BASE = {
  schema_version: 'v364.0', phase_gate_id: null,
  phase_gate_ready: false,
  phase_summary: null,
  required_ids_count: REQUIRED_IDS.length,
  present_ids_count: 0,
  missing_ids: [],
  phase_gate_hash: null,
  phase_passed: false,
  controlled_real_release_preparation_phase_passed: false,
  real_release_execution_command_received: false,
  production_execution_environment_verified: false,
  real_release_dry_run_verified: false,
  real_release_rollback_ready: false,
  real_release_execution_ready: false,
  real_release_execution_allowed: false,
  real_deployment_execution_allowed: false,
  real_tag_creation_allowed: false,
  real_stable_promotion_allowed: false,
  explicit_release_execution_command_received: false,
  release_execution_consent_bound: false,
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

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string')
    return { ...BASE, errors: ['CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.real_release_rollback_readiness_gate_ready !== true)
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK: real_release_rollback_readiness_gate_ready must be true'] };
  if (!input.real_release_rollback_readiness_gate_id || typeof input.real_release_rollback_readiness_gate_id !== 'string')
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK: missing real_release_rollback_readiness_gate_id'] };

  const ids = (input.ids && typeof input.ids === 'object') ? input.ids : {};
  const missing = [];
  for (const rid of REQUIRED_IDS) {
    if (!ids[rid] || typeof ids[rid] !== 'string') missing.push(rid);
  }
  const presentCount = REQUIRED_IDS.length - missing.length;

  if (missing.length > 0) {
    return { ...BASE, phase_gate_id: input.phase_gate_id, present_ids_count: presentCount, missing_ids: missing, errors: ['CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE: missing ids: ' + missing.join(', ')] };
  }

  const h = hash({ phase_gate_id: input.phase_gate_id, rollback_gate_id: input.real_release_rollback_readiness_gate_id, ids, summary: input.phase_summary });
  return { ...BASE, phase_gate_id: input.phase_gate_id, phase_gate_ready: true, phase_summary: input.phase_summary || FINAL_MESSAGE, required_ids_count: REQUIRED_IDS.length, present_ids_count: REQUIRED_IDS.length, missing_ids: [], phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid controlled real release preparation phase gate'] };
  const e = [];
  if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['phase_passed','controlled_real_release_preparation_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT';
  const status = result.phase_gate_ready ? 'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_READY' :
    result.errors?.some(e => e.startsWith('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK')) ? 'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK' :
    result.errors?.some(e => e.startsWith('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE')) ? 'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE' : 'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\nphase_gate_ready: ${result.phase_gate_ready}\nrequired_ids_count: ${result.required_ids_count}\npresent_ids_count: ${result.present_ids_count}\n`;
  if (result.missing_ids?.length) out += `missing_ids: ${result.missing_ids.join(', ')}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  if (result.phase_summary) out += `phase_summary: ${result.phase_summary}\n`;
  ['phase_passed','controlled_real_release_preparation_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
