import { createHash } from 'crypto';
export const SOFTWARE_FACTORY_SAAS_FINAL_REVIEW_STATUSES = [
  'SAAS_FINAL_REVIEW_BLOCKED_INPUT', 'SAAS_FINAL_REVIEW_BLOCKED_REPORT',
  'SAAS_FINAL_REVIEW_DENIED', 'SAAS_FINAL_REVIEW_READY',
];
const AAD = ['approved','denied','blocked']; const ARM = ['contract-only','metadata-only','dry-run','planning'];
const RRC = ['human-authority-required','pass-gold-required','no-real-charge','no-customer-create','no-invoice-create','no-subscription-create','no-webhook-register','no-provider-connect','no-secret-access','no-production-touch','no-deploy','no-release','audit-required','evidence-required'];
const B = {
  schema_version: 'v313.0', saas_final_review_id: null, saas_final_authority_review_ready: false,
  authority_decision: null, authority_id: null, review_mode: null, required_review_controls_count: 0, final_review_hash: null,
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
function h(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }
export function build(input) {
  if (!input || typeof input !== 'object') return { ...B, errors: ['SAAS_FINAL_REVIEW_BLOCKED_INPUT'] };
  if (!input.saas_final_review_id || typeof input.saas_final_review_id !== 'string') return { ...B, errors: ['SAAS_FINAL_REVIEW_BLOCKED_INPUT: missing saas_final_review_id'] };
  if (input.saas_security_report_contract_ready !== true) return { ...B, saas_final_review_id: input.saas_final_review_id, errors: ['SAAS_FINAL_REVIEW_BLOCKED_REPORT: saas_security_report_contract_ready must be true'] };
  if (!input.saas_security_report_id || typeof input.saas_security_report_id !== 'string') return { ...B, saas_final_review_id: input.saas_final_review_id, errors: ['SAAS_FINAL_REVIEW_BLOCKED_REPORT: missing saas_security_report_id'] };
  if (!input.authority_decision || !AAD.includes(input.authority_decision)) return { ...B, saas_final_review_id: input.saas_final_review_id, errors: ['SAAS_FINAL_REVIEW_BLOCKED_REPORT: invalid authority_decision'] };
  if (!input.authority_id || typeof input.authority_id !== 'string') return { ...B, saas_final_review_id: input.saas_final_review_id, errors: ['SAAS_FINAL_REVIEW_BLOCKED_REPORT: missing authority_id'] };
  if (!input.review_reason || typeof input.review_reason !== 'string') return { ...B, saas_final_review_id: input.saas_final_review_id, errors: ['SAAS_FINAL_REVIEW_BLOCKED_REPORT: missing review_reason'] };
  if (!input.review_mode || !ARM.includes(input.review_mode)) return { ...B, saas_final_review_id: input.saas_final_review_id, errors: ['SAAS_FINAL_REVIEW_BLOCKED_REPORT: invalid review_mode'] };
  const controls = Array.isArray(input.required_review_controls) ? input.required_review_controls : RRC;
  const missing = RRC.filter(c => !controls.includes(c));
  if (missing.length > 0) return { ...B, saas_final_review_id: input.saas_final_review_id, errors: ['SAAS_FINAL_REVIEW_DENIED: missing required review controls: ' + missing.join(', ')] };
  if (input.authority_decision !== 'approved') return { ...B, saas_final_review_id: input.saas_final_review_id, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, errors: ['SAAS_FINAL_REVIEW_DENIED: authority_decision is not approved'] };
  const id = input.saas_final_review_id; const hash = h({ id, report: input.saas_security_report_id, decision: input.authority_decision, authority: input.authority_id, reason: input.review_reason, mode: input.review_mode, controls });
  return { ...B, saas_final_review_id: id, saas_final_authority_review_ready: true, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, required_review_controls_count: controls.length, final_review_hash: hash, errors: [] };
}
export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS final authority review'] };
  const e = []; if (!result.saas_final_review_id) e.push('missing saas_final_review_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors'); return { valid: e.length === 0, errors: e };
}
export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_FINAL_REVIEW_BLOCKED_INPUT';
  const s = result.saas_final_authority_review_ready ? 'SAAS_FINAL_REVIEW_READY' :
    result.errors?.some(e => e.startsWith('SAAS_FINAL_REVIEW_BLOCKED_REPORT')) ? 'SAAS_FINAL_REVIEW_BLOCKED_REPORT' :
    result.errors?.some(e => e.startsWith('SAAS_FINAL_REVIEW_DENIED')) ? 'SAAS_FINAL_REVIEW_DENIED' : 'SAAS_FINAL_REVIEW_BLOCKED_INPUT';
  let o = `=== ${s} ===\nsaas_final_review_id: ${result.saas_final_review_id || '(none)'}\nsaas_final_authority_review_ready: ${result.saas_final_authority_review_ready}\nauthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\nreview_mode: ${result.review_mode || '(none)'}\nrequired_review_controls_count: ${result.required_review_controls_count}\n`;
  if (result.final_review_hash) o += `final_review_hash: ${result.final_review_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { o += `${k}: ${result[k]}\n`; });
  o += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) o += `errors: ${result.errors.join('; ')}\n`; return o;
}