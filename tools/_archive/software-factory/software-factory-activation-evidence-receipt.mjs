import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_EVIDENCE_RECEIPT_STATUSES = [
  'ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  'ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_POLICY',
  'ACTIVATION_EVIDENCE_RECEIPT_FAIL',
  'ACTIVATION_EVIDENCE_RECEIPT_READY',
];

const ALLOWED_EVIDENCE_TYPES = ['product_activation_command','saas_enablement_scope','production_readiness','activation_dry_run','activation_risk','activation_policy','pass_gold_status','audit_record','rollback_plan','blocker_record'];
const ALLOWED_EVIDENCE_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_RECEIPT_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_EVIDENCE_TYPES = ['product_activation_command','saas_enablement_scope','production_readiness','activation_dry_run','activation_risk','activation_policy','pass_gold_status','audit_record','rollback_plan','blocker_record'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v321.0', activation_evidence_receipt_id: null, activation_evidence_receipt_ready: false,
  evidence_entries_count: 0, required_evidence_types_count: 0, receipt_level: null, activation_evidence_receipt_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_INPUT'] };
  if (!input.activation_evidence_receipt_id || typeof input.activation_evidence_receipt_id !== 'string') return { ...BASE, errors: ['ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_INPUT: missing activation_evidence_receipt_id'] };
  if (input.activation_policy_binding_ready !== true) return { ...BASE, activation_evidence_receipt_id: input.activation_evidence_receipt_id, errors: ['ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_POLICY: activation_policy_binding_ready must be true'] };
  if (!input.activation_policy_binding_id || typeof input.activation_policy_binding_id !== 'string') return { ...BASE, activation_evidence_receipt_id: input.activation_evidence_receipt_id, errors: ['ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_POLICY: missing activation_policy_binding_id'] };
  if (!Array.isArray(input.evidence_entries) || input.evidence_entries.length === 0) return { ...BASE, activation_evidence_receipt_id: input.activation_evidence_receipt_id, errors: ['ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_POLICY: evidence_entries must be non-empty array'] };
  if (!input.receipt_level || !ALLOWED_RECEIPT_LEVELS.includes(input.receipt_level)) return { ...BASE, activation_evidence_receipt_id: input.activation_evidence_receipt_id, errors: ['ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_POLICY: invalid receipt_level'] };

  const fE = [];
  for (let i = 0; i < input.evidence_entries.length; i++) {
    const s = input.evidence_entries[i];
    if (!s.evidence_id || typeof s.evidence_id !== 'string') fE.push(`evidence ${i}: missing evidence_id`);
    if (!s.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(s.evidence_type)) fE.push(`evidence ${i}: invalid evidence_type`);
    if (!s.evidence_mode || !ALLOWED_EVIDENCE_MODES.includes(s.evidence_mode)) fE.push(`evidence ${i}: invalid evidence_mode`);
    if (!s.evidence_hash || !HEX64_RE.test(s.evidence_hash)) fE.push(`evidence ${i}: evidence_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_evidence_receipt_id: input.activation_evidence_receipt_id, errors: ['ACTIVATION_EVIDENCE_RECEIPT_FAIL: ' + fE.join('; ')] };

  const reqTypes = Array.isArray(input.required_evidence_types) ? input.required_evidence_types : REQUIRED_EVIDENCE_TYPES;
  const missingTypes = REQUIRED_EVIDENCE_TYPES.filter(t => !reqTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, activation_evidence_receipt_id: input.activation_evidence_receipt_id, evidence_entries_count: input.evidence_entries.length, errors: ['ACTIVATION_EVIDENCE_RECEIPT_FAIL: missing required evidence types: ' + missingTypes.join(', ')] };

  const argId = input.activation_evidence_receipt_id;
  const h = hash({ argId, policyBinding: input.activation_policy_binding_id, entries: input.evidence_entries, types: reqTypes, level: input.receipt_level });
  return { ...BASE, activation_evidence_receipt_id: argId, activation_evidence_receipt_ready: true, evidence_entries_count: input.evidence_entries.length, required_evidence_types_count: reqTypes.length, receipt_level: input.receipt_level, activation_evidence_receipt_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation evidence receipt'] };
  const e = []; if (!result.activation_evidence_receipt_id) e.push('missing activation_evidence_receipt_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  const status = result.activation_evidence_receipt_ready ? 'ACTIVATION_EVIDENCE_RECEIPT_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_POLICY')) ? 'ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_POLICY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EVIDENCE_RECEIPT_FAIL')) ? 'ACTIVATION_EVIDENCE_RECEIPT_FAIL' : 'ACTIVATION_EVIDENCE_RECEIPT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_evidence_receipt_id: ${result.activation_evidence_receipt_id || '(none)'}\nactivation_evidence_receipt_ready: ${result.activation_evidence_receipt_ready}\nevidence_entries_count: ${result.evidence_entries_count}\nrequired_evidence_types_count: ${result.required_evidence_types_count}\nreceipt_level: ${result.receipt_level || '(none)'}\n`;
  if (result.activation_evidence_receipt_hash) out += `activation_evidence_receipt_hash: ${result.activation_evidence_receipt_hash}\n`;
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}