import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_POLICY_BINDING_STATUSES = [
  'ACTIVATION_POLICY_BINDING_BLOCKED_INPUT',
  'ACTIVATION_POLICY_BINDING_BLOCKED_RISK',
  'ACTIVATION_POLICY_BINDING_FAIL',
  'ACTIVATION_POLICY_BINDING_READY',
];

const ALLOWED_BINDING_MODES = ['contract-only','metadata-only','dry-run','planning'];
const ALLOWED_BINDING_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_POLICY_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-stable-promotion','no-billing-execution','no-provider-connect','no-tenant-create','no-secret-access','no-policy-bypass','rollback-required','evidence-required','pass-gold-required','human-approval-required','audit-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v320.0', activation_policy_binding_id: null, activation_policy_binding_ready: false,
  policy_bindings_count: 0, required_policy_controls_count: 0, binding_level: null, activation_policy_binding_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_POLICY_BINDING_BLOCKED_INPUT'] };
  if (!input.activation_policy_binding_id || typeof input.activation_policy_binding_id !== 'string') return { ...BASE, errors: ['ACTIVATION_POLICY_BINDING_BLOCKED_INPUT: missing activation_policy_binding_id'] };
  if (input.activation_risk_gate_ready !== true) return { ...BASE, activation_policy_binding_id: input.activation_policy_binding_id, errors: ['ACTIVATION_POLICY_BINDING_BLOCKED_RISK: activation_risk_gate_ready must be true'] };
  if (!input.activation_risk_gate_id || typeof input.activation_risk_gate_id !== 'string') return { ...BASE, activation_policy_binding_id: input.activation_policy_binding_id, errors: ['ACTIVATION_POLICY_BINDING_BLOCKED_RISK: missing activation_risk_gate_id'] };
  if (!Array.isArray(input.policy_bindings) || input.policy_bindings.length === 0) return { ...BASE, activation_policy_binding_id: input.activation_policy_binding_id, errors: ['ACTIVATION_POLICY_BINDING_BLOCKED_RISK: policy_bindings must be non-empty array'] };
  if (!input.binding_level || !ALLOWED_BINDING_LEVELS.includes(input.binding_level)) return { ...BASE, activation_policy_binding_id: input.activation_policy_binding_id, errors: ['ACTIVATION_POLICY_BINDING_BLOCKED_RISK: invalid binding_level'] };

  const fE = [];
  for (let i = 0; i < input.policy_bindings.length; i++) {
    const s = input.policy_bindings[i];
    if (!s.binding_id || typeof s.binding_id !== 'string') fE.push(`binding ${i}: missing binding_id`);
    if (!s.policy_id || typeof s.policy_id !== 'string') fE.push(`binding ${i}: missing policy_id`);
    if (!s.risk_id || typeof s.risk_id !== 'string') fE.push(`binding ${i}: missing risk_id`);
    if (!s.binding_mode || !ALLOWED_BINDING_MODES.includes(s.binding_mode)) fE.push(`binding ${i}: invalid binding_mode`);
    if (!s.binding_hash || !HEX64_RE.test(s.binding_hash)) fE.push(`binding ${i}: binding_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_policy_binding_id: input.activation_policy_binding_id, errors: ['ACTIVATION_POLICY_BINDING_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_policy_controls) ? input.required_policy_controls : REQUIRED_POLICY_CONTROLS;
  const missingControls = REQUIRED_POLICY_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, activation_policy_binding_id: input.activation_policy_binding_id, policy_bindings_count: input.policy_bindings.length, errors: ['ACTIVATION_POLICY_BINDING_FAIL: missing required policy controls: ' + missingControls.join(', ')] };

  const argId = input.activation_policy_binding_id;
  const h = hash({ argId, riskGate: input.activation_risk_gate_id, bindings: input.policy_bindings, controls: reqControls, level: input.binding_level });
  return { ...BASE, activation_policy_binding_id: argId, activation_policy_binding_ready: true, policy_bindings_count: input.policy_bindings.length, required_policy_controls_count: reqControls.length, binding_level: input.binding_level, activation_policy_binding_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation policy binding'] };
  const e = []; if (!result.activation_policy_binding_id) e.push('missing activation_policy_binding_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_POLICY_BINDING_BLOCKED_INPUT';
  const status = result.activation_policy_binding_ready ? 'ACTIVATION_POLICY_BINDING_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_POLICY_BINDING_BLOCKED_RISK')) ? 'ACTIVATION_POLICY_BINDING_BLOCKED_RISK' :
    result.errors?.some(e => e.startsWith('ACTIVATION_POLICY_BINDING_FAIL')) ? 'ACTIVATION_POLICY_BINDING_FAIL' : 'ACTIVATION_POLICY_BINDING_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_policy_binding_id: ${result.activation_policy_binding_id || '(none)'}\nactivation_policy_binding_ready: ${result.activation_policy_binding_ready}\npolicy_bindings_count: ${result.policy_bindings_count}\nrequired_policy_controls_count: ${result.required_policy_controls_count}\nbinding_level: ${result.binding_level || '(none)'}\n`;
  if (result.activation_policy_binding_hash) out += `activation_policy_binding_hash: ${result.activation_policy_binding_hash}\n`;
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}