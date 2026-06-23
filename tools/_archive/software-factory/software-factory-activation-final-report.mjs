import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_FINAL_REPORT_STATUSES = [
  'ACTIVATION_FINAL_REPORT_BLOCKED_INPUT',
  'ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT',
  'ACTIVATION_FINAL_REPORT_FAIL',
  'ACTIVATION_FINAL_REPORT_READY',
];

const ALLOWED_SECTION_TYPES = ['executive_summary','activation_scope','production_readiness','saas_enablement','billing_blockers','deploy_blockers','release_blockers','stable_blockers','evidence_receipt','risk_summary','final_blockers'];
const ALLOWED_REPORT_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_REPORT_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_SECTION_TYPES = ['executive_summary','activation_scope','production_readiness','saas_enablement','billing_blockers','deploy_blockers','release_blockers','stable_blockers','evidence_receipt','risk_summary','final_blockers'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v322.0', activation_final_report_id: null, activation_final_report_ready: false,
  report_sections_count: 0, required_section_types_count: 0, report_level: null, activation_final_report_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_FINAL_REPORT_BLOCKED_INPUT'] };
  if (!input.activation_final_report_id || typeof input.activation_final_report_id !== 'string') return { ...BASE, errors: ['ACTIVATION_FINAL_REPORT_BLOCKED_INPUT: missing activation_final_report_id'] };
  if (input.activation_evidence_receipt_ready !== true) return { ...BASE, activation_final_report_id: input.activation_final_report_id, errors: ['ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT: activation_evidence_receipt_ready must be true'] };
  if (!input.activation_evidence_receipt_id || typeof input.activation_evidence_receipt_id !== 'string') return { ...BASE, activation_final_report_id: input.activation_final_report_id, errors: ['ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT: missing activation_evidence_receipt_id'] };
  if (!Array.isArray(input.report_sections) || input.report_sections.length === 0) return { ...BASE, activation_final_report_id: input.activation_final_report_id, errors: ['ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT: report_sections must be non-empty array'] };
  if (!input.report_level || !ALLOWED_REPORT_LEVELS.includes(input.report_level)) return { ...BASE, activation_final_report_id: input.activation_final_report_id, errors: ['ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT: invalid report_level'] };

  const fE = [];
  for (let i = 0; i < input.report_sections.length; i++) {
    const s = input.report_sections[i];
    if (!s.section_id || typeof s.section_id !== 'string') fE.push(`section ${i}: missing section_id`);
    if (!s.section_type || !ALLOWED_SECTION_TYPES.includes(s.section_type)) fE.push(`section ${i}: invalid section_type`);
    if (!s.report_mode || !ALLOWED_REPORT_MODES.includes(s.report_mode)) fE.push(`section ${i}: invalid report_mode`);
    if (!s.section_hash || !HEX64_RE.test(s.section_hash)) fE.push(`section ${i}: section_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_final_report_id: input.activation_final_report_id, errors: ['ACTIVATION_FINAL_REPORT_FAIL: ' + fE.join('; ')] };

  const reqTypes = Array.isArray(input.required_section_types) ? input.required_section_types : REQUIRED_SECTION_TYPES;
  const missingTypes = REQUIRED_SECTION_TYPES.filter(t => !reqTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, activation_final_report_id: input.activation_final_report_id, report_sections_count: input.report_sections.length, errors: ['ACTIVATION_FINAL_REPORT_FAIL: missing required section types: ' + missingTypes.join(', ')] };

  const argId = input.activation_final_report_id;
  const h = hash({ argId, evidenceReceipt: input.activation_evidence_receipt_id, sections: input.report_sections, types: reqTypes, level: input.report_level });
  return { ...BASE, activation_final_report_id: argId, activation_final_report_ready: true, report_sections_count: input.report_sections.length, required_section_types_count: reqTypes.length, report_level: input.report_level, activation_final_report_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation final report'] };
  const e = []; if (!result.activation_final_report_id) e.push('missing activation_final_report_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_FINAL_REPORT_BLOCKED_INPUT';
  const status = result.activation_final_report_ready ? 'ACTIVATION_FINAL_REPORT_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT')) ? 'ACTIVATION_FINAL_REPORT_BLOCKED_RECEIPT' :
    result.errors?.some(e => e.startsWith('ACTIVATION_FINAL_REPORT_FAIL')) ? 'ACTIVATION_FINAL_REPORT_FAIL' : 'ACTIVATION_FINAL_REPORT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_final_report_id: ${result.activation_final_report_id || '(none)'}\nactivation_final_report_ready: ${result.activation_final_report_ready}\nreport_sections_count: ${result.report_sections_count}\nrequired_section_types_count: ${result.required_section_types_count}\nreport_level: ${result.report_level || '(none)'}\n`;
  if (result.activation_final_report_hash) out += `activation_final_report_hash: ${result.activation_final_report_hash}\n`;
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}