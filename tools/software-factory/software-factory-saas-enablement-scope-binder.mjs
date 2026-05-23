import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SAAS_ENABLEMENT_SCOPE_BINDER_STATUSES = [
  'SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_INPUT',
  'SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND',
  'SAAS_ENABLEMENT_SCOPE_BINDER_FAIL',
  'SAAS_ENABLEMENT_SCOPE_BINDER_READY',
];

const ALLOWED_SCOPE_TYPES = ['frontend','backend','go_core','billing','tenant','auth','database','deployment','release','stable','audit','rollback'];
const ALLOWED_SCOPE_MODES = ['out-of-scope','metadata-only','dry-run','planning'];
const REQUIRED_SCOPE_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-stable-promotion','no-billing-execution','no-tenant-create','no-auth-enable','no-database-write','audit-required','evidence-required','human-approval-required'];
const ALLOWED_SCOPE_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v316.0', saas_enablement_scope_binder_id: null, saas_enablement_scope_binder_ready: false,
  scope_items_count: 0, required_scope_controls_count: 0, scope_level: null, saas_enablement_scope_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_INPUT'] };
  if (!input.saas_enablement_scope_binder_id || typeof input.saas_enablement_scope_binder_id !== 'string') return { ...BASE, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_INPUT: missing saas_enablement_scope_binder_id'] };
  if (input.product_activation_command_ready !== true) return { ...BASE, saas_enablement_scope_binder_id: input.saas_enablement_scope_binder_id, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND: product_activation_command_ready must be true'] };
  if (!input.product_activation_command_id || typeof input.product_activation_command_id !== 'string') return { ...BASE, saas_enablement_scope_binder_id: input.saas_enablement_scope_binder_id, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND: missing product_activation_command_id'] };
  if (!Array.isArray(input.scope_items) || input.scope_items.length === 0) return { ...BASE, saas_enablement_scope_binder_id: input.saas_enablement_scope_binder_id, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND: scope_items must be non-empty array'] };
  if (!input.scope_level || !ALLOWED_SCOPE_LEVELS.includes(input.scope_level)) return { ...BASE, saas_enablement_scope_binder_id: input.saas_enablement_scope_binder_id, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND: invalid scope_level'] };

  const fE = [];
  for (let i = 0; i < input.scope_items.length; i++) {
    const s = input.scope_items[i];
    if (!s.scope_id || typeof s.scope_id !== 'string') fE.push(`scope item ${i}: missing scope_id`);
    if (!s.scope_type || !ALLOWED_SCOPE_TYPES.includes(s.scope_type)) fE.push(`scope item ${i}: invalid scope_type`);
    if (!s.scope_mode || !ALLOWED_SCOPE_MODES.includes(s.scope_mode)) fE.push(`scope item ${i}: invalid scope_mode`);
    if (!s.scope_hash || !HEX64_RE.test(s.scope_hash)) fE.push(`scope item ${i}: scope_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, saas_enablement_scope_binder_id: input.saas_enablement_scope_binder_id, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_scope_controls) ? input.required_scope_controls : REQUIRED_SCOPE_CONTROLS;
  const missingControls = REQUIRED_SCOPE_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, saas_enablement_scope_binder_id: input.saas_enablement_scope_binder_id, scope_items_count: input.scope_items.length, errors: ['SAAS_ENABLEMENT_SCOPE_BINDER_FAIL: missing required scope controls: ' + missingControls.join(', ')] };

  const sesbId = input.saas_enablement_scope_binder_id;
  const h = hash({ sesbId, command: input.product_activation_command_id, items: input.scope_items, controls: reqControls, level: input.scope_level });
  return { ...BASE, saas_enablement_scope_binder_id: sesbId, saas_enablement_scope_binder_ready: true, scope_items_count: input.scope_items.length, required_scope_controls_count: reqControls.length, scope_level: input.scope_level, saas_enablement_scope_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS enablement scope binder'] };
  const e = []; if (!result.saas_enablement_scope_binder_id) e.push('missing saas_enablement_scope_binder_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_INPUT';
  const status = result.saas_enablement_scope_binder_ready ? 'SAAS_ENABLEMENT_SCOPE_BINDER_READY' :
    result.errors?.some(e => e.startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND')) ? 'SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_COMMAND' :
    result.errors?.some(e => e.startsWith('SAAS_ENABLEMENT_SCOPE_BINDER_FAIL')) ? 'SAAS_ENABLEMENT_SCOPE_BINDER_FAIL' : 'SAAS_ENABLEMENT_SCOPE_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsaas_enablement_scope_binder_id: ${result.saas_enablement_scope_binder_id || '(none)'}\nsaas_enablement_scope_binder_ready: ${result.saas_enablement_scope_binder_ready}\nscope_items_count: ${result.scope_items_count}\nrequired_scope_controls_count: ${result.required_scope_controls_count}\nscope_level: ${result.scope_level || '(none)'}\n`;
  if (result.saas_enablement_scope_hash) out += `saas_enablement_scope_hash: ${result.saas_enablement_scope_hash}\n`;
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}