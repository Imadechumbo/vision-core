import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_COMPLIANCE_EVIDENCE_RECEIPT_STATUSES = [
  'COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  'COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING',
  'COMPLIANCE_EVIDENCE_RECEIPT_FAIL',
  'COMPLIANCE_EVIDENCE_RECEIPT_READY',
];

const ALLOWED_EVIDENCE_TYPES = [
  'enterprise_security_contract', 'secrets_boundary', 'compliance_matrix', 'security_scan_dry_run',
  'risk_classification', 'security_policy_binding', 'pass_gold_status', 'audit_record', 'human_authority',
];
const ALLOWED_EVIDENCE_MODES = ['metadata-only', 'dry-run', 'contract-only', 'planning'];
const REQUIRED_EVIDENCE_TYPES = [
  'enterprise_security_contract', 'secrets_boundary', 'compliance_matrix', 'security_scan_dry_run',
  'risk_classification', 'security_policy_binding', 'pass_gold_status', 'audit_record',
];
const ALLOWED_RECEIPT_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v301.0', compliance_receipt_id: null, compliance_evidence_receipt_ready: false,
  evidence_entries_count: 0, required_evidence_types_count: 0, receipt_level: null, compliance_receipt_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_INPUT'] };
  if (!input.compliance_receipt_id || typeof input.compliance_receipt_id !== 'string') return { ...BASE, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_INPUT: missing compliance_receipt_id'] };
  if (input.enterprise_security_policy_binding_ready !== true) return { ...BASE, compliance_receipt_id: input.compliance_receipt_id, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING: enterprise_security_policy_binding_ready must be true'] };
  if (!input.security_policy_binding_id || typeof input.security_policy_binding_id !== 'string') return { ...BASE, compliance_receipt_id: input.compliance_receipt_id, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING: missing security_policy_binding_id'] };
  if (!input.receipt_level || !ALLOWED_RECEIPT_LEVELS.includes(input.receipt_level)) return { ...BASE, compliance_receipt_id: input.compliance_receipt_id, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING: invalid receipt_level'] };
  if (!Array.isArray(input.evidence_entries) || input.evidence_entries.length === 0) return { ...BASE, compliance_receipt_id: input.compliance_receipt_id, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING: evidence_entries must be non-empty array'] };

  const fE = [];
  for (let i = 0; i < input.evidence_entries.length; i++) {
    const e = input.evidence_entries[i];
    if (!e.evidence_id || typeof e.evidence_id !== 'string') fE.push(`entry ${i}: missing evidence_id`);
    if (!e.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(e.evidence_type)) fE.push(`entry ${i}: invalid evidence_type`);
    if (!e.evidence_mode || !ALLOWED_EVIDENCE_MODES.includes(e.evidence_mode)) fE.push(`entry ${i}: invalid evidence_mode`);
    if (!e.evidence_hash || !HEX64_RE.test(e.evidence_hash)) fE.push(`entry ${i}: evidence_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, compliance_receipt_id: input.compliance_receipt_id, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_FAIL: ' + fE.join('; ')] };

  const reqTypes = Array.isArray(input.required_evidence_types) ? input.required_evidence_types : REQUIRED_EVIDENCE_TYPES;
  const missingTypes = REQUIRED_EVIDENCE_TYPES.filter(t => !reqTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, compliance_receipt_id: input.compliance_receipt_id, evidence_entries_count: input.evidence_entries.length, errors: ['COMPLIANCE_EVIDENCE_RECEIPT_FAIL: missing required evidence types: ' + missingTypes.join(', ')] };

  const crId = input.compliance_receipt_id;
  const h = hash({ crId, binding: input.security_policy_binding_id, entries: input.evidence_entries, required: reqTypes, level: input.receipt_level });
  return { ...BASE, compliance_receipt_id: crId, compliance_evidence_receipt_ready: true, evidence_entries_count: input.evidence_entries.length, required_evidence_types_count: reqTypes.length, receipt_level: input.receipt_level, compliance_receipt_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid compliance evidence receipt'] };
  const e = []; if (!result.compliance_receipt_id) e.push('missing compliance_receipt_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  const status = result.compliance_evidence_receipt_ready ? 'COMPLIANCE_EVIDENCE_RECEIPT_READY' :
    result.errors?.some(e => e.startsWith('COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING')) ? 'COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_BINDING' :
    result.errors?.some(e => e.startsWith('COMPLIANCE_EVIDENCE_RECEIPT_FAIL')) ? 'COMPLIANCE_EVIDENCE_RECEIPT_FAIL' : 'COMPLIANCE_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  let out = `=== ${status} ===\ncompliance_receipt_id: ${result.compliance_receipt_id || '(none)'}\ncompliance_evidence_receipt_ready: ${result.compliance_evidence_receipt_ready}\nevidence_entries_count: ${result.evidence_entries_count}\nrequired_evidence_types_count: ${result.required_evidence_types_count}\nreceipt_level: ${result.receipt_level || '(none)'}\n`;
  if (result.compliance_receipt_hash) out += `compliance_receipt_hash: ${result.compliance_receipt_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}