import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SAAS_EVIDENCE_RECEIPT_STATUSES = [
  'SAAS_EVIDENCE_RECEIPT_BLOCKED_INPUT', 'SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING',
  'SAAS_EVIDENCE_RECEIPT_FAIL', 'SAAS_EVIDENCE_RECEIPT_READY',
];

const AET = ['saas_platform_contract','tenant_isolation','subscription_policy','billing_dry_run','saas_risk_classification','saas_policy_binding','pass_gold_status','audit_record','human_authority','billing_blocker'];
const AEM = ['metadata-only','dry-run','contract-only','planning'];
const RET = ['saas_platform_contract','tenant_isolation','subscription_policy','billing_dry_run','saas_risk_classification','saas_policy_binding','pass_gold_status','audit_record','billing_blocker'];
const ARL = ['contract-only','metadata-only','dry-run','planning'];
const H64 = /^[0-9a-f]{64}$/;

const B = {
  schema_version: 'v311.0', saas_evidence_receipt_id: null, saas_evidence_receipt_ready: false,
  evidence_entries_count: 0, required_evidence_types_count: 0, receipt_level: null, saas_evidence_receipt_hash: null,
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
  if (!input || typeof input !== 'object') return { ...B, errors: ['SAAS_EVIDENCE_RECEIPT_BLOCKED_INPUT'] };
  if (!input.saas_evidence_receipt_id || typeof input.saas_evidence_receipt_id !== 'string') return { ...B, errors: ['SAAS_EVIDENCE_RECEIPT_BLOCKED_INPUT: missing saas_evidence_receipt_id'] };
  if (input.saas_policy_binding_ready !== true) return { ...B, saas_evidence_receipt_id: input.saas_evidence_receipt_id, errors: ['SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING: saas_policy_binding_ready must be true'] };
  if (!input.saas_policy_binding_id || typeof input.saas_policy_binding_id !== 'string') return { ...B, saas_evidence_receipt_id: input.saas_evidence_receipt_id, errors: ['SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING: missing saas_policy_binding_id'] };
  if (!input.receipt_level || !ARL.includes(input.receipt_level)) return { ...B, saas_evidence_receipt_id: input.saas_evidence_receipt_id, errors: ['SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING: invalid receipt_level'] };
  if (!Array.isArray(input.evidence_entries) || input.evidence_entries.length === 0) return { ...B, saas_evidence_receipt_id: input.saas_evidence_receipt_id, errors: ['SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING: evidence_entries must be non-empty array'] };
  const fE = [];
  for (let i = 0; i < input.evidence_entries.length; i++) {
    const e = input.evidence_entries[i];
    if (!e.evidence_id || typeof e.evidence_id !== 'string') fE.push(`entry ${i}: missing evidence_id`);
    if (!e.evidence_type || !AET.includes(e.evidence_type)) fE.push(`entry ${i}: invalid evidence_type`);
    if (!e.evidence_mode || !AEM.includes(e.evidence_mode)) fE.push(`entry ${i}: invalid evidence_mode`);
    if (!e.evidence_hash || !H64.test(e.evidence_hash)) fE.push(`entry ${i}: evidence_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...B, saas_evidence_receipt_id: input.saas_evidence_receipt_id, errors: ['SAAS_EVIDENCE_RECEIPT_FAIL: ' + fE.join('; ')] };
  const req = Array.isArray(input.required_evidence_types) ? input.required_evidence_types : RET;
  const miss = RET.filter(t => !req.includes(t));
  if (miss.length > 0) return { ...B, saas_evidence_receipt_id: input.saas_evidence_receipt_id, evidence_entries_count: input.evidence_entries.length, errors: ['SAAS_EVIDENCE_RECEIPT_FAIL: missing required evidence types: ' + miss.join(', ')] };
  const id = input.saas_evidence_receipt_id;
  const hash = h({ id, binding: input.saas_policy_binding_id, entries: input.evidence_entries, required: req, level: input.receipt_level });
  return { ...B, saas_evidence_receipt_id: id, saas_evidence_receipt_ready: true, evidence_entries_count: input.evidence_entries.length, required_evidence_types_count: req.length, receipt_level: input.receipt_level, saas_evidence_receipt_hash: hash, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS evidence receipt'] };
  const e = []; if (!result.saas_evidence_receipt_id) e.push('missing saas_evidence_receipt_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  const s = result.saas_evidence_receipt_ready ? 'SAAS_EVIDENCE_RECEIPT_READY' :
    result.errors?.some(e => e.startsWith('SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING')) ? 'SAAS_EVIDENCE_RECEIPT_BLOCKED_BINDING' :
    result.errors?.some(e => e.startsWith('SAAS_EVIDENCE_RECEIPT_FAIL')) ? 'SAAS_EVIDENCE_RECEIPT_FAIL' : 'SAAS_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  let o = `=== ${s} ===\nsaas_evidence_receipt_id: ${result.saas_evidence_receipt_id || '(none)'}\nsaas_evidence_receipt_ready: ${result.saas_evidence_receipt_ready}\nevidence_entries_count: ${result.evidence_entries_count}\nrequired_evidence_types_count: ${result.required_evidence_types_count}\nreceipt_level: ${result.receipt_level || '(none)'}\n`;
  if (result.saas_evidence_receipt_hash) o += `saas_evidence_receipt_hash: ${result.saas_evidence_receipt_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { o += `${k}: ${result[k]}\n`; });
  o += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) o += `errors: ${result.errors.join('; ')}\n`;
  return o;
}