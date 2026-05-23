import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_APPROVAL_BINDING_STATUSES = [
  'RELEASE_APPROVAL_BINDING_BLOCKED_INPUT',
  'RELEASE_APPROVAL_BINDING_BLOCKED_READINESS',
  'RELEASE_APPROVAL_BINDING_DENIED',
  'RELEASE_APPROVAL_BINDING_READY',
];

const ALLOWED_AUTHORITY_DECISIONS = ['approved','denied','blocked'];
const ALLOWED_APPROVAL_MODES = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_APPROVAL_CONTROLS = ['human-authority-required','pass-gold-required','no-production-touch','no-real-deploy','no-real-release','no-tag-create','no-stable-promotion','no-artifact-publish','no-billing-execution','no-secret-access','rollback-required','evidence-required','audit-required'];

const BASE = {
  schema_version: 'v340.0', release_approval_binding_id: null, release_approval_binding_ready: false,
  authority_decision: null, authority_id: null, approval_mode: null, required_approval_controls_count: 0, release_approval_binding_hash: null,
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

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_INPUT'] };
  if (!input.release_approval_binding_id || typeof input.release_approval_binding_id !== 'string') return { ...BASE, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_INPUT: missing release_approval_binding_id'] };
  if (input.release_execution_readiness_gate_ready !== true) return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_READINESS: release_execution_readiness_gate_ready must be true'] };
  if (!input.release_execution_readiness_gate_id || typeof input.release_execution_readiness_gate_id !== 'string') return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_READINESS: missing release_execution_readiness_gate_id'] };
  if (!input.authority_decision || !ALLOWED_AUTHORITY_DECISIONS.includes(input.authority_decision)) return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_READINESS: invalid authority_decision'] };
  if (!input.authority_id || typeof input.authority_id !== 'string') return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_READINESS: missing authority_id'] };
  if (!input.approval_reason || typeof input.approval_reason !== 'string') return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_READINESS: missing approval_reason'] };
  if (!input.approval_mode || !ALLOWED_APPROVAL_MODES.includes(input.approval_mode)) return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, errors: ['RELEASE_APPROVAL_BINDING_BLOCKED_READINESS: invalid approval_mode'] };

  const reqControls = Array.isArray(input.required_approval_controls) ? input.required_approval_controls : REQUIRED_APPROVAL_CONTROLS;
  const missingControls = REQUIRED_APPROVAL_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, errors: ['RELEASE_APPROVAL_BINDING_DENIED: missing required approval controls: ' + missingControls.join(', ')] };

  if (input.authority_decision !== 'approved') return { ...BASE, release_approval_binding_id: input.release_approval_binding_id, authority_decision: input.authority_decision, authority_id: input.authority_id, approval_mode: input.approval_mode, required_approval_controls_count: reqControls.length, errors: ['RELEASE_APPROVAL_BINDING_DENIED: authority_decision is ' + input.authority_decision] };

  const argId = input.release_approval_binding_id;
  const h = hash({ argId, readiness: input.release_execution_readiness_gate_id, decision: input.authority_decision, authId: input.authority_id, reason: input.approval_reason, mode: input.approval_mode, controls: reqControls });
  return { ...BASE, release_approval_binding_id: argId, release_approval_binding_ready: true, authority_decision: input.authority_decision, authority_id: input.authority_id, approval_mode: input.approval_mode, required_approval_controls_count: reqControls.length, release_approval_binding_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release approval binding'] };
  const e = []; if (!result.release_approval_binding_id) e.push('missing release_approval_binding_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_APPROVAL_BINDING_BLOCKED_INPUT';
  const status = result.release_approval_binding_ready ? 'RELEASE_APPROVAL_BINDING_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_APPROVAL_BINDING_DENIED')) ? 'RELEASE_APPROVAL_BINDING_DENIED' :
    result.errors?.some(e => e.startsWith('RELEASE_APPROVAL_BINDING_BLOCKED_READINESS')) ? 'RELEASE_APPROVAL_BINDING_BLOCKED_READINESS' : 'RELEASE_APPROVAL_BINDING_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_approval_binding_id: ${result.release_approval_binding_id || '(none)'}\nrelease_approval_binding_ready: ${result.release_approval_binding_ready}\nauthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\napproval_mode: ${result.approval_mode || '(none)'}\nrequired_approval_controls_count: ${result.required_approval_controls_count}\n`;
  if (result.release_approval_binding_hash) out += `release_approval_binding_hash: ${result.release_approval_binding_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}