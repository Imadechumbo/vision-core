import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_STATUSES = [
  'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_INPUT',
  'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW',
  'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_INCOMPLETE',
  'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_READY',
];

const ALL_MODULE_KEYS = [
  'pass_gold_release_evidence_contract', 'release_go_no_go_decision_gate',
  'production_release_scope_lock', 'release_candidate_integrity_binder',
  'final_release_readiness_gate', 'human_release_authority_binding',
  'release_execution_plan_receipt', 'final_rollback_authority_binder',
  'production_release_final_review',
];

const BASE = {
  schema_version: 'v354.0', phase_gate_id: null, pass_gold_release_authority_phase_gate_ready: false,
  modules_verified: [], all_modules_present: false, phase_passed: false,
  final_message: 'V345-V354 PASS GOLD release authority complete. Real release, deploy, tag, artifact publish, production touch, rollback, and stable promotion remain blocked until explicit V355 command.',
  phase_gate_hash: null,
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

const MODULE_NAMES = {
  pass_gold_release_evidence_contract: 'V345',
  release_go_no_go_decision_gate: 'V346',
  production_release_scope_lock: 'V347',
  release_candidate_integrity_binder: 'V348',
  final_release_readiness_gate: 'V349',
  human_release_authority_binding: 'V350',
  release_execution_plan_receipt: 'V351',
  final_rollback_authority_binder: 'V352',
  production_release_final_review: 'V353',
};

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') return { ...BASE, errors: ['PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.production_release_final_review_ready !== true) return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW: production_release_final_review_ready must be true'] };
  if (!input.production_release_final_review_id || typeof input.production_release_final_review_id !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW: missing production_release_final_review_id'] };
  if (!input.ids || typeof input.ids !== 'object') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW: missing ids'] };
  if (!input.phase_summary || typeof input.phase_summary !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW: missing phase_summary'] };

  const present = [];
  let allPresent = true;
  for (const key of ALL_MODULE_KEYS) {
    if (input.ids[key]) {
      present.push({ module: key, id: input.ids[key], label: MODULE_NAMES[key] || key });
    } else {
      allPresent = false;
      present.push({ module: key, id: null, label: MODULE_NAMES[key] || key, missing: true });
    }
  }

  if (!allPresent) return { ...BASE, phase_gate_id: input.phase_gate_id, modules_verified: present, all_modules_present: false, errors: ['PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_INCOMPLETE: missing module ids'] };

  const argId = input.phase_gate_id;
  const h = hash({ argId, review: input.production_release_final_review_id, ids: input.ids, summary: input.phase_summary });
  return { ...BASE, phase_gate_id: argId, pass_gold_release_authority_phase_gate_ready: true, modules_verified: present, all_modules_present: true, phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid PASS GOLD release authority phase gate'] };
  const e = []; if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_INPUT';
  const status = result.pass_gold_release_authority_phase_gate_ready ? 'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_READY' :
    result.errors?.some(e => e.startsWith('PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_INCOMPLETE')) ? 'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_INCOMPLETE' :
    result.errors?.some(e => e.startsWith('PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW')) ? 'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_REVIEW' : 'PASS_GOLD_RELEASE_AUTHORITY_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\npass_gold_release_authority_phase_gate_ready: ${result.pass_gold_release_authority_phase_gate_ready}\nall_modules_present: ${result.all_modules_present}\nphase_passed: ${result.phase_passed}\nfinal_message: ${result.final_message}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  if (result.modules_verified?.length) {
    out += 'modules_verified:\n';
    for (const m of result.modules_verified) out += `  ${m.label} (${m.module}): ${m.id || '(missing)'}\n`;
  }
  ['human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}