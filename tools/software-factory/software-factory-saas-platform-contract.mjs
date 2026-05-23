import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SAAS_PLATFORM_CONTRACT_STATUSES = [
  'SAAS_PLATFORM_CONTRACT_BLOCKED_INPUT',
  'SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE',
  'SAAS_PLATFORM_CONTRACT_DENIED',
  'SAAS_PLATFORM_CONTRACT_READY',
];

const ALLOWED_PLATFORM_MODES = ['contract-only', 'metadata-only', 'planning', 'dry-run'];
const ALLOWED_SAAS_DOMAINS = ['tenancy','billing','subscriptions','access_control','policy','audit','evidence','security','compliance','support','usage_limits'];
const REQUIRED_SAAS_DOMAINS = ['tenancy','billing','subscriptions','access_control','policy','audit','evidence','security','compliance'];

const BASE = {
  schema_version: 'v305.0', saas_platform_contract_id: null, saas_platform_contract_ready: false,
  explicit_command_received: false, platform_mode: null, saas_domains_count: 0, saas_platform_contract_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['SAAS_PLATFORM_CONTRACT_BLOCKED_INPUT'] };
  if (!input.saas_platform_contract_id || typeof input.saas_platform_contract_id !== 'string') return { ...BASE, errors: ['SAAS_PLATFORM_CONTRACT_BLOCKED_INPUT: missing saas_platform_contract_id'] };
  if (input.enterprise_security_compliance_phase_gate_ready !== true) return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, errors: ['SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE: enterprise_security_compliance_phase_gate_ready must be true and V304 completed'] };
  if (!input.enterprise_phase_gate_id || typeof input.enterprise_phase_gate_id !== 'string') return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, errors: ['SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE: missing enterprise_phase_gate_id'] };
  if (input.explicit_v305_command !== true) return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, errors: ['SAAS_PLATFORM_CONTRACT_DENIED: explicit_v305_command must be true'] };
  if (!input.requested_by || typeof input.requested_by !== 'string') return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, errors: ['SAAS_PLATFORM_CONTRACT_DENIED: requested_by required'] };
  if (!input.platform_scope || typeof input.platform_scope !== 'string') return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, errors: ['SAAS_PLATFORM_CONTRACT_DENIED: platform_scope required'] };
  if (!input.platform_mode || !ALLOWED_PLATFORM_MODES.includes(input.platform_mode)) return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, errors: ['SAAS_PLATFORM_CONTRACT_DENIED: invalid platform_mode'] };
  if (!Array.isArray(input.saas_domains) || input.saas_domains.length === 0) return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, errors: ['SAAS_PLATFORM_CONTRACT_DENIED: saas_domains must be non-empty array'] };

  const missingDomains = REQUIRED_SAAS_DOMAINS.filter(d => !input.saas_domains.includes(d));
  if (missingDomains.length > 0) return { ...BASE, saas_platform_contract_id: input.saas_platform_contract_id, saas_domains_count: input.saas_domains.length, errors: ['SAAS_PLATFORM_CONTRACT_DENIED: missing required saas domains: ' + missingDomains.join(', ')] };

  const spcId = input.saas_platform_contract_id;
  const h = hash({ spcId, enterprise: input.enterprise_phase_gate_id, requestedBy: input.requested_by, scope: input.platform_scope, mode: input.platform_mode, domains: input.saas_domains });
  return { ...BASE, saas_platform_contract_id: spcId, saas_platform_contract_ready: true, explicit_command_received: true, platform_mode: input.platform_mode, saas_domains_count: input.saas_domains.length, saas_platform_contract_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS platform contract'] };
  const e = []; if (!result.saas_platform_contract_id) e.push('missing saas_platform_contract_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_PLATFORM_CONTRACT_BLOCKED_INPUT';
  const status = result.saas_platform_contract_ready ? 'SAAS_PLATFORM_CONTRACT_READY' :
    result.errors?.some(e => e.startsWith('SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE')) ? 'SAAS_PLATFORM_CONTRACT_BLOCKED_ENTERPRISE' :
    result.errors?.some(e => e.startsWith('SAAS_PLATFORM_CONTRACT_DENIED')) ? 'SAAS_PLATFORM_CONTRACT_DENIED' : 'SAAS_PLATFORM_CONTRACT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsaas_platform_contract_id: ${result.saas_platform_contract_id || '(none)'}\nsaas_platform_contract_ready: ${result.saas_platform_contract_ready}\nexplicit_command_received: ${result.explicit_command_received}\nplatform_mode: ${result.platform_mode || '(none)'}\nsaas_domains_count: ${result.saas_domains_count}\n`;
  if (result.saas_platform_contract_hash) out += `saas_platform_contract_hash: ${result.saas_platform_contract_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}