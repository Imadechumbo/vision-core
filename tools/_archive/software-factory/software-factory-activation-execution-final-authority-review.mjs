import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_EXECUTION_FINAL_AUTHORITY_REVIEW_STATUSES = [
  'ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_INPUT',
  'ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK',
  'ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED',
  'ACTIVATION_EXECUTION_FINAL_REVIEW_READY',
];

const ALLOWED_AUTHORITY_DECISIONS = ['approved','denied','blocked'];
const ALLOWED_REVIEW_MODES = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_REVIEW_CONTROLS = ['human-authority-required','pass-gold-required','rollback-required','no-production-touch','no-real-execution','no-real-deploy','no-real-release','no-stable-promotion','no-billing-execution','no-provider-connect','no-tenant-create','no-secret-access','audit-required','evidence-required'];

const BASE = {
  schema_version: 'v333.0', activation_execution_final_review_id: null, activation_execution_final_authority_review_ready: false,
  authority_decision: null, authority_id: null, review_mode: null, required_review_controls_count: 0, final_review_hash: null,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_dry_run_completed: false, activation_execution_ready: false, activation_execution_approved: false,
  activation_execution_evidence_published: false, activation_rollback_bound: false, activation_execution_authority_granted: false, activation_execution_phase_passed: false,
  product_activation_allowed: false, saas_enablement_allowed: false, production_readiness_confirmed: false,
  activation_dry_run_completed: false, activation_risk_accepted: false, activation_authority_granted: false, product_activation_phase_passed: false,
  activation_policy_enforced: false, activation_report_published: false, activation_evidence_published: false,
  saas_enabled: false, tenant_isolation_enforced: false, subscription_active: false, billing_executed: false,
  billing_provider_connected: false, invoice_generated: false, customer_created: false, webhook_registered: false,
  saas_policy_enforced: false, saas_report_published: false, saas_authority_granted: false, saas_phase_passed: false,
  enterprise_security_enabled: false, compliance_enforced: false, security_scan_executed: false, secrets_accessed: false,
  security_policy_enforced: false, security_report_published: false, enterprise_authority_granted: false, enterprise_phase_passed: false,
  dashboard_enabled: false, dashboard_deployed: false, multi_project_enabled: false, policy_enforced: false,
  audit_ledger_written: false, projection_published: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false, production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_INPUT'] };
  if (!input.activation_execution_final_review_id || typeof input.activation_execution_final_review_id !== 'string') return { ...BASE, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_INPUT: missing activation_execution_final_review_id'] };
  if (input.activation_execution_rollback_binder_ready !== true) return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK: activation_execution_rollback_binder_ready must be true'] };
  if (!input.activation_execution_rollback_binder_id || typeof input.activation_execution_rollback_binder_id !== 'string') return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK: missing activation_execution_rollback_binder_id'] };
  if (!input.authority_decision || !ALLOWED_AUTHORITY_DECISIONS.includes(input.authority_decision)) return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK: invalid authority_decision'] };
  if (!input.authority_id || typeof input.authority_id !== 'string') return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK: missing authority_id'] };
  if (!input.review_reason || typeof input.review_reason !== 'string') return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK: missing review_reason'] };
  if (!input.review_mode || !ALLOWED_REVIEW_MODES.includes(input.review_mode)) return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK: invalid review_mode'] };

  const reqControls = Array.isArray(input.required_review_controls) ? input.required_review_controls : REQUIRED_REVIEW_CONTROLS;
  const missingControls = REQUIRED_REVIEW_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED: missing required review controls: ' + missingControls.join(', ')] };

  if (input.authority_decision !== 'approved') return { ...BASE, activation_execution_final_review_id: input.activation_execution_final_review_id, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, required_review_controls_count: reqControls.length, errors: ['ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED: authority_decision is ' + input.authority_decision] };

  const argId = input.activation_execution_final_review_id;
  const h = hash({ argId, rollback: input.activation_execution_rollback_binder_id, decision: input.authority_decision, authId: input.authority_id, reason: input.review_reason, mode: input.review_mode, controls: reqControls });
  return { ...BASE, activation_execution_final_review_id: argId, activation_execution_final_authority_review_ready: true, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, required_review_controls_count: reqControls.length, final_review_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation execution final authority review'] };
  const e = []; if (!result.activation_execution_final_review_id) e.push('missing activation_execution_final_review_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_INPUT';
  const status = result.activation_execution_final_authority_review_ready ? 'ACTIVATION_EXECUTION_FINAL_REVIEW_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED')) ? 'ACTIVATION_EXECUTION_FINAL_REVIEW_DENIED' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK')) ? 'ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_ROLLBACK' : 'ACTIVATION_EXECUTION_FINAL_REVIEW_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_execution_final_review_id: ${result.activation_execution_final_review_id || '(none)'}\nactivation_execution_final_authority_review_ready: ${result.activation_execution_final_authority_review_ready}\nauthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\nreview_mode: ${result.review_mode || '(none)'}\nrequired_review_controls_count: ${result.required_review_controls_count}\n`;
  if (result.final_review_hash) out += `final_review_hash: ${result.final_review_hash}\n`;
  ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}