import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SAAS_POLICY_BINDING_STATUSES = [
  'SAAS_POLICY_BINDING_BLOCKED_INPUT', 'SAAS_POLICY_BINDING_BLOCKED_RISK',
  'SAAS_POLICY_BINDING_FAIL', 'SAAS_POLICY_BINDING_READY',
];

const ALLOWED_BM = ['contract-only','metadata-only','dry-run','planning'];
const ALLOWED_BL = ['contract-only','metadata-only','dry-run','planning'];
const RPC = ['no-real-charge','no-customer-create','no-invoice-create','no-subscription-create','no-webhook-register','no-provider-connect','no-secret-access','no-production-touch','no-deploy','no-release','human-approval-required','audit-required','evidence-required'];
const H64 = /^[0-9a-f]{64}$/;

const B = {
  schema_version: 'v310.0', saas_policy_binding_id: null, saas_policy_binding_ready: false,
  policy_bindings_count: 0, required_policy_controls_count: 0, binding_level: null, saas_policy_binding_hash: null,
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
  if (!input || typeof input !== 'object') return { ...B, errors: ['SAAS_POLICY_BINDING_BLOCKED_INPUT'] };
  if (!input.saas_policy_binding_id || typeof input.saas_policy_binding_id !== 'string') return { ...B, errors: ['SAAS_POLICY_BINDING_BLOCKED_INPUT: missing saas_policy_binding_id'] };
  if (input.saas_risk_classification_gate_ready !== true) return { ...B, saas_policy_binding_id: input.saas_policy_binding_id, errors: ['SAAS_POLICY_BINDING_BLOCKED_RISK: saas_risk_classification_gate_ready must be true'] };
  if (!input.saas_risk_gate_id || typeof input.saas_risk_gate_id !== 'string') return { ...B, saas_policy_binding_id: input.saas_policy_binding_id, errors: ['SAAS_POLICY_BINDING_BLOCKED_RISK: missing saas_risk_gate_id'] };
  if (!input.binding_level || !ALLOWED_BL.includes(input.binding_level)) return { ...B, saas_policy_binding_id: input.saas_policy_binding_id, errors: ['SAAS_POLICY_BINDING_BLOCKED_RISK: invalid binding_level'] };
  if (!Array.isArray(input.policy_bindings) || input.policy_bindings.length === 0) return { ...B, saas_policy_binding_id: input.saas_policy_binding_id, errors: ['SAAS_POLICY_BINDING_BLOCKED_RISK: policy_bindings must be non-empty array'] };
  const fE = [];
  for (let i = 0; i < input.policy_bindings.length; i++) {
    const b = input.policy_bindings[i];
    if (!b.binding_id || typeof b.binding_id !== 'string') fE.push(`binding ${i}: missing binding_id`);
    if (!b.policy_id || typeof b.policy_id !== 'string') fE.push(`binding ${i}: missing policy_id`);
    if (!b.risk_id || typeof b.risk_id !== 'string') fE.push(`binding ${i}: missing risk_id`);
    if (!b.binding_mode || !ALLOWED_BM.includes(b.binding_mode)) fE.push(`binding ${i}: invalid binding_mode`);
    if (!b.binding_hash || !H64.test(b.binding_hash)) fE.push(`binding ${i}: binding_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...B, saas_policy_binding_id: input.saas_policy_binding_id, errors: ['SAAS_POLICY_BINDING_FAIL: ' + fE.join('; ')] };
  const controls = Array.isArray(input.required_policy_controls) ? input.required_policy_controls : RPC;
  const missing = RPC.filter(c => !controls.includes(c));
  if (missing.length > 0) return { ...B, saas_policy_binding_id: input.saas_policy_binding_id, policy_bindings_count: input.policy_bindings.length, errors: ['SAAS_POLICY_BINDING_FAIL: missing required policy controls: ' + missing.join(', ')] };
  const id = input.saas_policy_binding_id;
  const hash = h({ id, risk: input.saas_risk_gate_id, bindings: input.policy_bindings, controls, level: input.binding_level });
  return { ...B, saas_policy_binding_id: id, saas_policy_binding_ready: true, policy_bindings_count: input.policy_bindings.length, required_policy_controls_count: controls.length, binding_level: input.binding_level, saas_policy_binding_hash: hash, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS policy binding'] };
  const e = []; if (!result.saas_policy_binding_id) e.push('missing saas_policy_binding_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_POLICY_BINDING_BLOCKED_INPUT';
  const s = result.saas_policy_binding_ready ? 'SAAS_POLICY_BINDING_READY' :
    result.errors?.some(e => e.startsWith('SAAS_POLICY_BINDING_BLOCKED_RISK')) ? 'SAAS_POLICY_BINDING_BLOCKED_RISK' :
    result.errors?.some(e => e.startsWith('SAAS_POLICY_BINDING_FAIL')) ? 'SAAS_POLICY_BINDING_FAIL' : 'SAAS_POLICY_BINDING_BLOCKED_INPUT';
  let o = `=== ${s} ===\nsaas_policy_binding_id: ${result.saas_policy_binding_id || '(none)'}\nsaas_policy_binding_ready: ${result.saas_policy_binding_ready}\npolicy_bindings_count: ${result.policy_bindings_count}\nrequired_policy_controls_count: ${result.required_policy_controls_count}\nbinding_level: ${result.binding_level || '(none)'}\n`;
  if (result.saas_policy_binding_hash) o += `saas_policy_binding_hash: ${result.saas_policy_binding_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { o += `${k}: ${result[k]}\n`; });
  o += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) o += `errors: ${result.errors.join('; ')}\n`;
  return o;
}