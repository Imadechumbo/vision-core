import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ENTERPRISE_SECURITY_REPORT_STATUSES = [
  'ENTERPRISE_SECURITY_REPORT_BLOCKED_INPUT',
  'ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT',
  'ENTERPRISE_SECURITY_REPORT_FAIL',
  'ENTERPRISE_SECURITY_REPORT_READY',
];

const ALLOWED_SECTION_TYPES = [
  'executive_summary', 'security_scope', 'compliance_controls', 'secrets_boundary',
  'risk_classification', 'policy_binding', 'evidence_receipt', 'pass_gold_status', 'audit_summary', 'final_blockers',
];
const ALLOWED_REPORT_MODES = ['metadata-only', 'dry-run', 'contract-only', 'planning'];
const REQUIRED_SECTION_TYPES = [
  'executive_summary', 'security_scope', 'compliance_controls', 'secrets_boundary',
  'risk_classification', 'policy_binding', 'evidence_receipt', 'pass_gold_status', 'final_blockers',
];
const ALLOWED_REPORT_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v302.0', enterprise_security_report_id: null, enterprise_security_report_contract_ready: false,
  report_sections_count: 0, required_section_types_count: 0, report_level: null, enterprise_security_report_hash: null,
  enterprise_security_enabled: false, compliance_enforced: false, security_scan_executed: false,
  secrets_accessed: false, security_policy_enforced: false, security_report_published: false,
  enterprise_authority_granted: false, enterprise_phase_passed: false,
  dashboard_enabled: false, dashboard_deployed: false, multi_project_enabled: false,
  policy_enforced: false, audit_ledger_written: false, projection_published: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false,
  production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ENTERPRISE_SECURITY_REPORT_BLOCKED_INPUT'] };
  if (!input.enterprise_security_report_id || typeof input.enterprise_security_report_id !== 'string') return { ...BASE, errors: ['ENTERPRISE_SECURITY_REPORT_BLOCKED_INPUT: missing enterprise_security_report_id'] };
  if (input.compliance_evidence_receipt_ready !== true) return { ...BASE, enterprise_security_report_id: input.enterprise_security_report_id, errors: ['ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT: compliance_evidence_receipt_ready must be true'] };
  if (!input.compliance_receipt_id || typeof input.compliance_receipt_id !== 'string') return { ...BASE, enterprise_security_report_id: input.enterprise_security_report_id, errors: ['ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT: missing compliance_receipt_id'] };
  if (!input.report_level || !ALLOWED_REPORT_LEVELS.includes(input.report_level)) return { ...BASE, enterprise_security_report_id: input.enterprise_security_report_id, errors: ['ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT: invalid report_level'] };
  if (!Array.isArray(input.report_sections) || input.report_sections.length === 0) return { ...BASE, enterprise_security_report_id: input.enterprise_security_report_id, errors: ['ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT: report_sections must be non-empty array'] };

  const fE = [];
  for (let i = 0; i < input.report_sections.length; i++) {
    const s = input.report_sections[i];
    if (!s.section_id || typeof s.section_id !== 'string') fE.push(`section ${i}: missing section_id`);
    if (!s.section_type || !ALLOWED_SECTION_TYPES.includes(s.section_type)) fE.push(`section ${i}: invalid section_type`);
    if (!s.report_mode || !ALLOWED_REPORT_MODES.includes(s.report_mode)) fE.push(`section ${i}: invalid report_mode`);
    if (!s.section_hash || !HEX64_RE.test(s.section_hash)) fE.push(`section ${i}: section_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, enterprise_security_report_id: input.enterprise_security_report_id, errors: ['ENTERPRISE_SECURITY_REPORT_FAIL: ' + fE.join('; ')] };

  const reqTypes = Array.isArray(input.required_section_types) ? input.required_section_types : REQUIRED_SECTION_TYPES;
  const missingTypes = REQUIRED_SECTION_TYPES.filter(t => !reqTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, enterprise_security_report_id: input.enterprise_security_report_id, report_sections_count: input.report_sections.length, errors: ['ENTERPRISE_SECURITY_REPORT_FAIL: missing required section types: ' + missingTypes.join(', ')] };

  const esrId = input.enterprise_security_report_id;
  const h = hash({ esrId, receipt: input.compliance_receipt_id, sections: input.report_sections, required: reqTypes, level: input.report_level });
  return { ...BASE, enterprise_security_report_id: esrId, enterprise_security_report_contract_ready: true, report_sections_count: input.report_sections.length, required_section_types_count: reqTypes.length, report_level: input.report_level, enterprise_security_report_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid enterprise security report contract'] };
  const e = []; if (!result.enterprise_security_report_id) e.push('missing enterprise_security_report_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ENTERPRISE_SECURITY_REPORT_BLOCKED_INPUT';
  const status = result.enterprise_security_report_contract_ready ? 'ENTERPRISE_SECURITY_REPORT_READY' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT')) ? 'ENTERPRISE_SECURITY_REPORT_BLOCKED_RECEIPT' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_SECURITY_REPORT_FAIL')) ? 'ENTERPRISE_SECURITY_REPORT_FAIL' : 'ENTERPRISE_SECURITY_REPORT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nenterprise_security_report_id: ${result.enterprise_security_report_id || '(none)'}\nenterprise_security_report_contract_ready: ${result.enterprise_security_report_contract_ready}\nreport_sections_count: ${result.report_sections_count}\nrequired_section_types_count: ${result.required_section_types_count}\nreport_level: ${result.report_level || '(none)'}\n`;
  if (result.enterprise_security_report_hash) out += `enterprise_security_report_hash: ${result.enterprise_security_report_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}