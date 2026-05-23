import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SUBSCRIPTION_POLICY_MATRIX_STATUSES = [
  'SUBSCRIPTION_POLICY_MATRIX_BLOCKED_INPUT',
  'SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT',
  'SUBSCRIPTION_POLICY_MATRIX_FAIL',
  'SUBSCRIPTION_POLICY_MATRIX_READY',
];

const ALLOWED_PLAN_TYPES = ['free','starter','pro','business','enterprise','internal','disabled'];
const ALLOWED_LIMIT_TYPES = ['usage_limit','seat_limit','project_limit','runtime_limit','storage_limit','api_limit','billing_limit','support_limit'];
const REQUIRED_POLICY_TYPES = ['usage_limit','seat_limit','project_limit','runtime_limit','api_limit','billing_limit','support_limit'];
const ALLOWED_MATRIX_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v307.0', subscription_policy_matrix_id: null, subscription_policy_matrix_ready: false,
  subscription_policies_count: 0, required_policy_types_count: 0, matrix_level: null, subscription_policy_matrix_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['SUBSCRIPTION_POLICY_MATRIX_BLOCKED_INPUT'] };
  if (!input.subscription_policy_matrix_id || typeof input.subscription_policy_matrix_id !== 'string') return { ...BASE, errors: ['SUBSCRIPTION_POLICY_MATRIX_BLOCKED_INPUT: missing subscription_policy_matrix_id'] };
  if (input.tenant_isolation_contract_ready !== true) return { ...BASE, subscription_policy_matrix_id: input.subscription_policy_matrix_id, errors: ['SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT: tenant_isolation_contract_ready must be true'] };
  if (!input.tenant_isolation_contract_id || typeof input.tenant_isolation_contract_id !== 'string') return { ...BASE, subscription_policy_matrix_id: input.subscription_policy_matrix_id, errors: ['SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT: missing tenant_isolation_contract_id'] };
  if (!input.matrix_level || !ALLOWED_MATRIX_LEVELS.includes(input.matrix_level)) return { ...BASE, subscription_policy_matrix_id: input.subscription_policy_matrix_id, errors: ['SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT: invalid matrix_level'] };
  if (!Array.isArray(input.subscription_policies) || input.subscription_policies.length === 0) return { ...BASE, subscription_policy_matrix_id: input.subscription_policy_matrix_id, errors: ['SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT: subscription_policies must be non-empty array'] };

  const fE = [];
  for (let i = 0; i < input.subscription_policies.length; i++) {
    const p = input.subscription_policies[i];
    if (!p.policy_id || typeof p.policy_id !== 'string') fE.push(`policy ${i}: missing policy_id`);
    if (!p.plan_type || !ALLOWED_PLAN_TYPES.includes(p.plan_type)) fE.push(`policy ${i}: invalid plan_type`);
    if (!p.limit_type || !ALLOWED_LIMIT_TYPES.includes(p.limit_type)) fE.push(`policy ${i}: invalid limit_type`);
    if (!p.policy_hash || !HEX64_RE.test(p.policy_hash)) fE.push(`policy ${i}: policy_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, subscription_policy_matrix_id: input.subscription_policy_matrix_id, errors: ['SUBSCRIPTION_POLICY_MATRIX_FAIL: ' + fE.join('; ')] };

  const reqTypes = Array.isArray(input.required_policy_types) ? input.required_policy_types : REQUIRED_POLICY_TYPES;
  const missingTypes = REQUIRED_POLICY_TYPES.filter(t => !reqTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, subscription_policy_matrix_id: input.subscription_policy_matrix_id, subscription_policies_count: input.subscription_policies.length, errors: ['SUBSCRIPTION_POLICY_MATRIX_FAIL: missing required policy types: ' + missingTypes.join(', ')] };

  const spmId = input.subscription_policy_matrix_id;
  const h = hash({ spmId, tenant: input.tenant_isolation_contract_id, policies: input.subscription_policies, required: reqTypes, level: input.matrix_level });
  return { ...BASE, subscription_policy_matrix_id: spmId, subscription_policy_matrix_ready: true, subscription_policies_count: input.subscription_policies.length, required_policy_types_count: reqTypes.length, matrix_level: input.matrix_level, subscription_policy_matrix_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid subscription policy matrix'] };
  const e = []; if (!result.subscription_policy_matrix_id) e.push('missing subscription_policy_matrix_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SUBSCRIPTION_POLICY_MATRIX_BLOCKED_INPUT';
  const status = result.subscription_policy_matrix_ready ? 'SUBSCRIPTION_POLICY_MATRIX_READY' :
    result.errors?.some(e => e.startsWith('SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT')) ? 'SUBSCRIPTION_POLICY_MATRIX_BLOCKED_TENANT' :
    result.errors?.some(e => e.startsWith('SUBSCRIPTION_POLICY_MATRIX_FAIL')) ? 'SUBSCRIPTION_POLICY_MATRIX_FAIL' : 'SUBSCRIPTION_POLICY_MATRIX_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsubscription_policy_matrix_id: ${result.subscription_policy_matrix_id || '(none)'}\nsubscription_policy_matrix_ready: ${result.subscription_policy_matrix_ready}\nsubscription_policies_count: ${result.subscription_policies_count}\nrequired_policy_types_count: ${result.required_policy_types_count}\nmatrix_level: ${result.matrix_level || '(none)'}\n`;
  if (result.subscription_policy_matrix_hash) out += `subscription_policy_matrix_hash: ${result.subscription_policy_matrix_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}