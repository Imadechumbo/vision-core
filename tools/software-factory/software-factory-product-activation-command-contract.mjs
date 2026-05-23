import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCT_ACTIVATION_COMMAND_STATUSES = [
  'PRODUCT_ACTIVATION_COMMAND_BLOCKED_INPUT',
  'PRODUCT_ACTIVATION_COMMAND_BLOCKED_SAAS',
  'PRODUCT_ACTIVATION_COMMAND_DENIED',
  'PRODUCT_ACTIVATION_COMMAND_READY',
];

const ALLOWED_ACTIVATION_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const ALLOWED_ACTIVATION_DOMAINS = ['saas_enablement','production_readiness','deployment_readiness','release_readiness','billing_readiness','tenant_readiness','security_readiness','evidence','audit','rollback'];
const REQUIRED_ACTIVATION_DOMAINS = ['saas_enablement','production_readiness','deployment_readiness','release_readiness','billing_readiness','tenant_readiness','security_readiness','evidence','audit','rollback'];

const BASE = {
  schema_version: 'v315.0', product_activation_command_id: null, product_activation_command_ready: false,
  explicit_command_received: false, activation_mode: null, activation_domains_count: 0, product_activation_command_hash: null,
  product_activation_allowed: false, saas_enablement_allowed: false, production_readiness_confirmed: false,
  activation_dry_run_completed: false, activation_risk_accepted: false, activation_authority_granted: false, product_activation_phase_passed: false,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCT_ACTIVATION_COMMAND_BLOCKED_INPUT'] };
  if (!input.product_activation_command_id || typeof input.product_activation_command_id !== 'string') return { ...BASE, errors: ['PRODUCT_ACTIVATION_COMMAND_BLOCKED_INPUT: missing product_activation_command_id'] };
  if (input.saas_hardening_phase_gate_ready !== true) return { ...BASE, product_activation_command_id: input.product_activation_command_id, errors: ['PRODUCT_ACTIVATION_COMMAND_BLOCKED_SAAS: saas_hardening_phase_gate_ready must be true and V314 completed'] };
  if (!input.saas_phase_gate_id || typeof input.saas_phase_gate_id !== 'string') return { ...BASE, product_activation_command_id: input.product_activation_command_id, errors: ['PRODUCT_ACTIVATION_COMMAND_BLOCKED_SAAS: missing saas_phase_gate_id'] };
  if (input.explicit_v315_command !== true) return { ...BASE, product_activation_command_id: input.product_activation_command_id, errors: ['PRODUCT_ACTIVATION_COMMAND_DENIED: explicit_v315_command must be true'] };
  if (!input.requested_by || typeof input.requested_by !== 'string') return { ...BASE, product_activation_command_id: input.product_activation_command_id, errors: ['PRODUCT_ACTIVATION_COMMAND_DENIED: requested_by required'] };
  if (!input.activation_scope || typeof input.activation_scope !== 'string') return { ...BASE, product_activation_command_id: input.product_activation_command_id, errors: ['PRODUCT_ACTIVATION_COMMAND_DENIED: activation_scope required'] };
  if (!input.activation_mode || !ALLOWED_ACTIVATION_MODES.includes(input.activation_mode)) return { ...BASE, product_activation_command_id: input.product_activation_command_id, errors: ['PRODUCT_ACTIVATION_COMMAND_DENIED: invalid activation_mode'] };
  if (!Array.isArray(input.activation_domains) || input.activation_domains.length === 0) return { ...BASE, product_activation_command_id: input.product_activation_command_id, errors: ['PRODUCT_ACTIVATION_COMMAND_DENIED: activation_domains must be non-empty array'] };

  const missingDomains = REQUIRED_ACTIVATION_DOMAINS.filter(d => !input.activation_domains.includes(d));
  if (missingDomains.length > 0) return { ...BASE, product_activation_command_id: input.product_activation_command_id, activation_domains_count: input.activation_domains.length, errors: ['PRODUCT_ACTIVATION_COMMAND_DENIED: missing required activation domains: ' + missingDomains.join(', ')] };

  const pacId = input.product_activation_command_id;
  const h = hash({ pacId, saas: input.saas_phase_gate_id, requestedBy: input.requested_by, scope: input.activation_scope, mode: input.activation_mode, domains: input.activation_domains });
  return { ...BASE, product_activation_command_id: pacId, product_activation_command_ready: true, explicit_command_received: true, activation_mode: input.activation_mode, activation_domains_count: input.activation_domains.length, product_activation_command_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid product activation command contract'] };
  const e = []; if (!result.product_activation_command_id) e.push('missing product_activation_command_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCT_ACTIVATION_COMMAND_BLOCKED_INPUT';
  const status = result.product_activation_command_ready ? 'PRODUCT_ACTIVATION_COMMAND_READY' :
    result.errors?.some(e => e.startsWith('PRODUCT_ACTIVATION_COMMAND_BLOCKED_SAAS')) ? 'PRODUCT_ACTIVATION_COMMAND_BLOCKED_SAAS' :
    result.errors?.some(e => e.startsWith('PRODUCT_ACTIVATION_COMMAND_DENIED')) ? 'PRODUCT_ACTIVATION_COMMAND_DENIED' : 'PRODUCT_ACTIVATION_COMMAND_BLOCKED_INPUT';
  let out = `=== ${status} ===\nproduct_activation_command_id: ${result.product_activation_command_id || '(none)'}\nproduct_activation_command_ready: ${result.product_activation_command_ready}\nexplicit_command_received: ${result.explicit_command_received}\nactivation_mode: ${result.activation_mode || '(none)'}\nactivation_domains_count: ${result.activation_domains_count}\n`;
  if (result.product_activation_command_hash) out += `product_activation_command_hash: ${result.product_activation_command_hash}\n`;
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}