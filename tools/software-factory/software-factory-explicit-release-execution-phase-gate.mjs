import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_STATUSES = [
  'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT',
  'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER',
  'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE',
  'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_READY',
];

const REQUIRED_IDS = [
  'explicit_release_execution_command_contract',
  'release_execution_consent_binder',
  'final_production_execution_preflight',
  'real_release_execution_barrier',
];

const BASE = {
  schema_version: 'v359.0', phase_gate_id: null,
  explicit_release_execution_phase_gate_ready: false,
  ids_provided: {}, all_ids_present: false, phase_passed: false,
  final_message: 'V355-V359 explicit release execution barrier complete. Real release, deploy, tag, stable promotion, artifact publish, production touch, billing, and rollback remain blocked until explicit V360 command.',
  phase_gate_hash: null,
  explicit_release_execution_phase_passed: false,
  explicit_release_execution_command_received: false,
  release_execution_consent_bound: false,
  final_production_preflight_passed: false,
  real_release_execution_barrier_open: false,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string')
    return { ...BASE, errors: ['EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.real_release_execution_barrier_ready !== true)
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER: real_release_execution_barrier_ready must be true'] };
  if (!input.real_release_execution_barrier_id || typeof input.real_release_execution_barrier_id !== 'string')
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER: missing real_release_execution_barrier_id'] };
  if (!input.ids || typeof input.ids !== 'object')
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER: missing ids'] };
  if (!input.phase_summary || typeof input.phase_summary !== 'string')
    return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER: missing phase_summary'] };

  const provided = {};
  let allPresent = true;
  for (const key of REQUIRED_IDS) {
    if (input.ids[key]) {
      provided[key] = { id: input.ids[key], present: true };
    } else {
      allPresent = false;
      provided[key] = { id: null, present: false, missing: true };
    }
  }

  if (!allPresent)
    return { ...BASE, phase_gate_id: input.phase_gate_id, ids_provided: provided, all_ids_present: false, errors: ['EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE: missing required ids'] };

  const argId = input.phase_gate_id;
  const h = hash({ argId, barrier: input.real_release_execution_barrier_id, ids: input.ids, summary: input.phase_summary });
  return { ...BASE, phase_gate_id: argId, explicit_release_execution_phase_gate_ready: true, ids_provided: provided, all_ids_present: true, phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid explicit release execution phase gate'] };
  const e = []; if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['explicit_release_execution_phase_passed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT';
  const status = result.explicit_release_execution_phase_gate_ready ? 'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_READY' :
    result.errors?.some(e => e.startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')) ? 'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE' :
    result.errors?.some(e => e.startsWith('EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER')) ? 'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_BARRIER' : 'EXPLICIT_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\nexplicit_release_execution_phase_gate_ready: ${result.explicit_release_execution_phase_gate_ready}\nall_ids_present: ${result.all_ids_present}\nphase_passed: ${result.phase_passed}\nfinal_message: ${result.final_message}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  if (result.ids_provided && Object.keys(result.ids_provided).length) {
    out += 'ids_provided:\n';
    for (const [key, val] of Object.entries(result.ids_provided)) out += `  ${key}: ${val.id || '(missing)'}\n`;
  }
  ['explicit_release_execution_phase_passed','explicit_release_execution_command_received','release_execution_consent_bound','final_production_preflight_passed','real_release_execution_barrier_open','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}