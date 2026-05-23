import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_STATUSES = [
  'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT',
  'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW',
  'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE',
  'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_READY',
];

const ALL_MODULE_KEYS = ['release_execution_command_contract','deployment_scope_boundary_contract','release_artifact_evidence_binder','deployment_dry_run_plan','release_execution_readiness_gate','release_approval_binding','deployment_evidence_receipt','release_rollback_binder','release_final_authority_review'];

const BASE = {
  schema_version: 'v344.0', phase_gate_id: null, controlled_release_execution_phase_gate_ready: false,
  modules_verified: [], all_modules_present: false, phase_passed: false,
  final_message: 'V335-V344 controlled release/deployment authority complete. Real release, deploy, tag, artifact publish, production touch, rollback, and stable promotion remain blocked until explicit V345 command.',
  phase_gate_hash: null,
  release_execution_allowed: false, deployment_execution_allowed: false, deployment_scope_bound: false,
  release_artifact_published: false, deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false, release_rollback_bound: false,
  release_authority_granted: false, release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false, activation_execution_phase_passed: false,
  product_activation_allowed: false, saas_enablement_allowed: false,
  saas_enabled: false, billing_executed: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

const MODULE_NAMES = {
  release_execution_command_contract: 'V335',
  deployment_scope_boundary_contract: 'V336',
  release_artifact_evidence_binder: 'V337',
  deployment_dry_run_plan: 'V338',
  release_execution_readiness_gate: 'V339',
  release_approval_binding: 'V340',
  deployment_evidence_receipt: 'V341',
  release_rollback_binder: 'V342',
  release_final_authority_review: 'V343',
};

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') return { ...BASE, errors: ['CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.release_final_authority_review_ready !== true) return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: release_final_authority_review_ready must be true'] };
  if (!input.release_final_review_id || typeof input.release_final_review_id !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: missing release_final_review_id'] };
  if (!input.ids || typeof input.ids !== 'object') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: missing ids'] };
  if (!input.phase_summary || typeof input.phase_summary !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: missing phase_summary'] };

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

  if (!allPresent) return { ...BASE, phase_gate_id: input.phase_gate_id, modules_verified: present, all_modules_present: false, errors: ['CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE: missing module ids'] };

  const argId = input.phase_gate_id;
  const h = hash({ argId, review: input.release_final_review_id, ids: input.ids, summary: input.phase_summary });
  return { ...BASE, phase_gate_id: argId, controlled_release_execution_phase_gate_ready: true, modules_verified: present, all_modules_present: true, phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid controlled release execution phase gate'] };
  const e = []; if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT';
  const status = result.controlled_release_execution_phase_gate_ready ? 'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_READY' :
    result.errors?.some(e => e.startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE')) ? 'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_INCOMPLETE' :
    result.errors?.some(e => e.startsWith('CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')) ? 'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_REVIEW' : 'CONTROLLED_RELEASE_EXECUTION_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\ncontrolled_release_execution_phase_gate_ready: ${result.controlled_release_execution_phase_gate_ready}\nall_modules_present: ${result.all_modules_present}\nphase_passed: ${result.phase_passed}\nfinal_message: ${result.final_message}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  if (result.modules_verified?.length) {
    out += 'modules_verified:\n';
    for (const m of result.modules_verified) out += `  ${m.label} (${m.module}): ${m.id || '(missing)'}\n`;
  }
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}