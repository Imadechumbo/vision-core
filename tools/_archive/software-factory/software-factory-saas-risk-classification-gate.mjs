import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SAAS_RISK_CLASSIFICATION_GATE_STATUSES = [
  'SAAS_RISK_CLASSIFICATION_BLOCKED_INPUT',
  'SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING',
  'SAAS_RISK_CLASSIFICATION_FAIL',
  'SAAS_RISK_CLASSIFICATION_READY',
];

const ALLOWED_RISK_TYPES = ['tenant_leakage','billing_charge','invoice_creation','customer_creation','subscription_creation','provider_connection','webhook_registration','secret_exposure','policy_bypass','production_touch','deploy_risk','release_risk'];
const ALLOWED_SEVERITIES = ['info','low','medium','high','critical','blocking'];
const REQUIRED_RISK_CONTROLS = ['no-tenant-leakage','no-real-charge','no-invoice-create','no-customer-create','no-subscription-create','no-provider-connect','no-webhook-register','no-secret-exposure','no-production-touch','no-deploy','no-release','human-approval-required'];
const ALLOWED_RISK_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v309.0', saas_risk_gate_id: null, saas_risk_classification_gate_ready: false,
  risk_items_count: 0, required_risk_controls_count: 0, risk_level: null, saas_risk_classification_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['SAAS_RISK_CLASSIFICATION_BLOCKED_INPUT'] };
  if (!input.saas_risk_gate_id || typeof input.saas_risk_gate_id !== 'string') return { ...BASE, errors: ['SAAS_RISK_CLASSIFICATION_BLOCKED_INPUT: missing saas_risk_gate_id'] };
  if (input.billing_dry_run_contract_ready !== true) return { ...BASE, saas_risk_gate_id: input.saas_risk_gate_id, errors: ['SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING: billing_dry_run_contract_ready must be true'] };
  if (!input.billing_dry_run_contract_id || typeof input.billing_dry_run_contract_id !== 'string') return { ...BASE, saas_risk_gate_id: input.saas_risk_gate_id, errors: ['SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING: missing billing_dry_run_contract_id'] };
  if (!input.risk_level || !ALLOWED_RISK_LEVELS.includes(input.risk_level)) return { ...BASE, saas_risk_gate_id: input.saas_risk_gate_id, errors: ['SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING: invalid risk_level'] };
  if (!Array.isArray(input.risk_items) || input.risk_items.length === 0) return { ...BASE, saas_risk_gate_id: input.saas_risk_gate_id, errors: ['SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING: risk_items must be non-empty array'] };

  const fE = [];
  for (let i = 0; i < input.risk_items.length; i++) {
    const r = input.risk_items[i];
    if (!r.risk_id || typeof r.risk_id !== 'string') fE.push(`risk ${i}: missing risk_id`);
    if (!r.risk_type || !ALLOWED_RISK_TYPES.includes(r.risk_type)) fE.push(`risk ${i}: invalid risk_type`);
    if (!r.severity || !ALLOWED_SEVERITIES.includes(r.severity)) fE.push(`risk ${i}: invalid severity`);
    if (!r.risk_hash || !HEX64_RE.test(r.risk_hash)) fE.push(`risk ${i}: risk_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, saas_risk_gate_id: input.saas_risk_gate_id, errors: ['SAAS_RISK_CLASSIFICATION_FAIL: ' + fE.join('; ')] };

  const controls = Array.isArray(input.required_risk_controls) ? input.required_risk_controls : REQUIRED_RISK_CONTROLS;
  const missingControls = REQUIRED_RISK_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) return { ...BASE, saas_risk_gate_id: input.saas_risk_gate_id, risk_items_count: input.risk_items.length, errors: ['SAAS_RISK_CLASSIFICATION_FAIL: missing required risk controls: ' + missingControls.join(', ')] };

  const srgId = input.saas_risk_gate_id;
  const h = hash({ srgId, billing: input.billing_dry_run_contract_id, items: input.risk_items, controls, level: input.risk_level });
  return { ...BASE, saas_risk_gate_id: srgId, saas_risk_classification_gate_ready: true, risk_items_count: input.risk_items.length, required_risk_controls_count: controls.length, risk_level: input.risk_level, saas_risk_classification_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS risk classification gate'] };
  const e = []; if (!result.saas_risk_gate_id) e.push('missing saas_risk_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_RISK_CLASSIFICATION_BLOCKED_INPUT';
  const status = result.saas_risk_classification_gate_ready ? 'SAAS_RISK_CLASSIFICATION_READY' :
    result.errors?.some(e => e.startsWith('SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING')) ? 'SAAS_RISK_CLASSIFICATION_BLOCKED_BILLING' :
    result.errors?.some(e => e.startsWith('SAAS_RISK_CLASSIFICATION_FAIL')) ? 'SAAS_RISK_CLASSIFICATION_FAIL' : 'SAAS_RISK_CLASSIFICATION_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsaas_risk_gate_id: ${result.saas_risk_gate_id || '(none)'}\nsaas_risk_classification_gate_ready: ${result.saas_risk_classification_gate_ready}\nrisk_items_count: ${result.risk_items_count}\nrequired_risk_controls_count: ${result.required_risk_controls_count}\nrisk_level: ${result.risk_level || '(none)'}\n`;
  if (result.saas_risk_classification_hash) out += `saas_risk_classification_hash: ${result.saas_risk_classification_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}