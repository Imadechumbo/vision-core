import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_TENANT_ISOLATION_CONTRACT_STATUSES = [
  'TENANT_ISOLATION_CONTRACT_BLOCKED_INPUT',
  'TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM',
  'TENANT_ISOLATION_CONTRACT_FAIL',
  'TENANT_ISOLATION_CONTRACT_READY',
];

const ALLOWED_TENANT_SCOPES = ['project','workspace','organization','billing_account','user_group','environment'];
const ALLOWED_ISOLATION_MODES = ['no-cross-write','metadata-only','read-only','planning'];
const REQUIRED_ISOLATION_CONTROLS = ['no-cross-tenant-write','no-cross-tenant-secret-access','no-cross-tenant-billing','no-cross-tenant-production-touch','no-cross-tenant-runtime-execution','audit-required','evidence-required','human-approval-required'];
const ALLOWED_ISOLATION_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v306.0', tenant_isolation_contract_id: null, tenant_isolation_contract_ready: false,
  tenant_boundaries_count: 0, required_isolation_controls_count: 0, isolation_level: null, tenant_isolation_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['TENANT_ISOLATION_CONTRACT_BLOCKED_INPUT'] };
  if (!input.tenant_isolation_contract_id || typeof input.tenant_isolation_contract_id !== 'string') return { ...BASE, errors: ['TENANT_ISOLATION_CONTRACT_BLOCKED_INPUT: missing tenant_isolation_contract_id'] };
  if (input.saas_platform_contract_ready !== true) return { ...BASE, tenant_isolation_contract_id: input.tenant_isolation_contract_id, errors: ['TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM: saas_platform_contract_ready must be true'] };
  if (!input.saas_platform_contract_id || typeof input.saas_platform_contract_id !== 'string') return { ...BASE, tenant_isolation_contract_id: input.tenant_isolation_contract_id, errors: ['TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM: missing saas_platform_contract_id'] };
  if (!input.isolation_level || !ALLOWED_ISOLATION_LEVELS.includes(input.isolation_level)) return { ...BASE, tenant_isolation_contract_id: input.tenant_isolation_contract_id, errors: ['TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM: invalid isolation_level'] };
  if (!Array.isArray(input.tenant_boundaries) || input.tenant_boundaries.length === 0) return { ...BASE, tenant_isolation_contract_id: input.tenant_isolation_contract_id, errors: ['TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM: tenant_boundaries must be non-empty array'] };

  const fE = [];
  for (let i = 0; i < input.tenant_boundaries.length; i++) {
    const b = input.tenant_boundaries[i];
    if (!b.boundary_id || typeof b.boundary_id !== 'string') fE.push(`boundary ${i}: missing boundary_id`);
    if (!b.tenant_scope || !ALLOWED_TENANT_SCOPES.includes(b.tenant_scope)) fE.push(`boundary ${i}: invalid tenant_scope`);
    if (!b.isolation_mode || !ALLOWED_ISOLATION_MODES.includes(b.isolation_mode)) fE.push(`boundary ${i}: invalid isolation_mode`);
    if (!b.boundary_hash || !HEX64_RE.test(b.boundary_hash)) fE.push(`boundary ${i}: boundary_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, tenant_isolation_contract_id: input.tenant_isolation_contract_id, errors: ['TENANT_ISOLATION_CONTRACT_FAIL: ' + fE.join('; ')] };

  const controls = Array.isArray(input.required_isolation_controls) ? input.required_isolation_controls : REQUIRED_ISOLATION_CONTROLS;
  const missingControls = REQUIRED_ISOLATION_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) return { ...BASE, tenant_isolation_contract_id: input.tenant_isolation_contract_id, tenant_boundaries_count: input.tenant_boundaries.length, errors: ['TENANT_ISOLATION_CONTRACT_FAIL: missing required isolation controls: ' + missingControls.join(', ')] };

  const ticId = input.tenant_isolation_contract_id;
  const h = hash({ ticId, platform: input.saas_platform_contract_id, boundaries: input.tenant_boundaries, controls, level: input.isolation_level });
  return { ...BASE, tenant_isolation_contract_id: ticId, tenant_isolation_contract_ready: true, tenant_boundaries_count: input.tenant_boundaries.length, required_isolation_controls_count: controls.length, isolation_level: input.isolation_level, tenant_isolation_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid tenant isolation contract'] };
  const e = []; if (!result.tenant_isolation_contract_id) e.push('missing tenant_isolation_contract_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'TENANT_ISOLATION_CONTRACT_BLOCKED_INPUT';
  const status = result.tenant_isolation_contract_ready ? 'TENANT_ISOLATION_CONTRACT_READY' :
    result.errors?.some(e => e.startsWith('TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM')) ? 'TENANT_ISOLATION_CONTRACT_BLOCKED_PLATFORM' :
    result.errors?.some(e => e.startsWith('TENANT_ISOLATION_CONTRACT_FAIL')) ? 'TENANT_ISOLATION_CONTRACT_FAIL' : 'TENANT_ISOLATION_CONTRACT_BLOCKED_INPUT';
  let out = `=== ${status} ===\ntenant_isolation_contract_id: ${result.tenant_isolation_contract_id || '(none)'}\ntenant_isolation_contract_ready: ${result.tenant_isolation_contract_ready}\ntenant_boundaries_count: ${result.tenant_boundaries_count}\nrequired_isolation_controls_count: ${result.required_isolation_controls_count}\nisolation_level: ${result.isolation_level || '(none)'}\n`;
  if (result.tenant_isolation_hash) out += `tenant_isolation_hash: ${result.tenant_isolation_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}