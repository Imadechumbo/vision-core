import { createHash } from 'crypto';
export const SOFTWARE_FACTORY_SAAS_SECURITY_REPORT_CONTRACT_STATUSES = [
  'SAAS_SECURITY_REPORT_BLOCKED_INPUT', 'SAAS_SECURITY_REPORT_BLOCKED_RECEIPT',
  'SAAS_SECURITY_REPORT_FAIL', 'SAAS_SECURITY_REPORT_READY',
];
const AST = ['executive_summary','saas_scope','tenant_isolation','subscription_policy','billing_controls','provider_blockers','evidence_receipt','pass_gold_status','audit_summary','final_blockers'];
const ARM = ['metadata-only','dry-run','contract-only','planning'];
const RST = ['executive_summary','saas_scope','tenant_isolation','subscription_policy','billing_controls','provider_blockers','evidence_receipt','pass_gold_status','final_blockers'];
const ARL = ['contract-only','metadata-only','dry-run','planning'];
const H64 = /^[0-9a-f]{64}$/;
const B = {
  schema_version: 'v312.0', saas_security_report_id: null, saas_security_report_contract_ready: false,
  report_sections_count: 0, required_section_types_count: 0, report_level: null, saas_security_report_hash: null,
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
  if (!input || typeof input !== 'object') return { ...B, errors: ['SAAS_SECURITY_REPORT_BLOCKED_INPUT'] };
  if (!input.saas_security_report_id || typeof input.saas_security_report_id !== 'string') return { ...B, errors: ['SAAS_SECURITY_REPORT_BLOCKED_INPUT: missing saas_security_report_id'] };
  if (input.saas_evidence_receipt_ready !== true) return { ...B, saas_security_report_id: input.saas_security_report_id, errors: ['SAAS_SECURITY_REPORT_BLOCKED_RECEIPT: saas_evidence_receipt_ready must be true'] };
  if (!input.saas_evidence_receipt_id || typeof input.saas_evidence_receipt_id !== 'string') return { ...B, saas_security_report_id: input.saas_security_report_id, errors: ['SAAS_SECURITY_REPORT_BLOCKED_RECEIPT: missing saas_evidence_receipt_id'] };
  if (!input.report_level || !ARL.includes(input.report_level)) return { ...B, saas_security_report_id: input.saas_security_report_id, errors: ['SAAS_SECURITY_REPORT_BLOCKED_RECEIPT: invalid report_level'] };
  if (!Array.isArray(input.report_sections) || input.report_sections.length === 0) return { ...B, saas_security_report_id: input.saas_security_report_id, errors: ['SAAS_SECURITY_REPORT_BLOCKED_RECEIPT: report_sections must be non-empty array'] };
  const fE = [];
  for (let i = 0; i < input.report_sections.length; i++) { const s = input.report_sections[i];
    if (!s.section_id || typeof s.section_id !== 'string') fE.push(`section ${i}: missing section_id`);
    if (!s.section_type || !AST.includes(s.section_type)) fE.push(`section ${i}: invalid section_type`);
    if (!s.report_mode || !ARM.includes(s.report_mode)) fE.push(`section ${i}: invalid report_mode`);
    if (!s.section_hash || !H64.test(s.section_hash)) fE.push(`section ${i}: section_hash must be 64 hex chars`); }
  if (fE.length > 0) return { ...B, saas_security_report_id: input.saas_security_report_id, errors: ['SAAS_SECURITY_REPORT_FAIL: ' + fE.join('; ')] };
  const req = Array.isArray(input.required_section_types) ? input.required_section_types : RST;
  const miss = RST.filter(t => !req.includes(t));
  if (miss.length > 0) return { ...B, saas_security_report_id: input.saas_security_report_id, report_sections_count: input.report_sections.length, errors: ['SAAS_SECURITY_REPORT_FAIL: missing required section types: ' + miss.join(', ')] };
  const id = input.saas_security_report_id; const hash = h({ id, receipt: input.saas_evidence_receipt_id, sections: input.report_sections, required: req, level: input.report_level });
  return { ...B, saas_security_report_id: id, saas_security_report_contract_ready: true, report_sections_count: input.report_sections.length, required_section_types_count: req.length, report_level: input.report_level, saas_security_report_hash: hash, errors: [] };
}
export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS security report contract'] };
  const e = []; if (!result.saas_security_report_id) e.push('missing saas_security_report_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors'); return { valid: e.length === 0, errors: e };
}
export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_SECURITY_REPORT_BLOCKED_INPUT';
  const s = result.saas_security_report_contract_ready ? 'SAAS_SECURITY_REPORT_READY' :
    result.errors?.some(e => e.startsWith('SAAS_SECURITY_REPORT_BLOCKED_RECEIPT')) ? 'SAAS_SECURITY_REPORT_BLOCKED_RECEIPT' :
    result.errors?.some(e => e.startsWith('SAAS_SECURITY_REPORT_FAIL')) ? 'SAAS_SECURITY_REPORT_FAIL' : 'SAAS_SECURITY_REPORT_BLOCKED_INPUT';
  let o = `=== ${s} ===\nsaas_security_report_id: ${result.saas_security_report_id || '(none)'}\nsaas_security_report_contract_ready: ${result.saas_security_report_contract_ready}\nreport_sections_count: ${result.report_sections_count}\nrequired_section_types_count: ${result.required_section_types_count}\nreport_level: ${result.report_level || '(none)'}\n`;
  if (result.saas_security_report_hash) o += `saas_security_report_hash: ${result.saas_security_report_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { o += `${k}: ${result[k]}\n`; });
  o += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) o += `errors: ${result.errors.join('; ')}\n`; return o;
}