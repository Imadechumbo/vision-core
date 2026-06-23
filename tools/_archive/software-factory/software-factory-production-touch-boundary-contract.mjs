import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCTION_TOUCH_BOUNDARY_CONTRACT_STATUSES = [
  'PRODUCTION_TOUCH_BOUNDARY_BLOCKED_INPUT',
  'PRODUCTION_TOUCH_BOUNDARY_BLOCKED_PREFLIGHT',
  'PRODUCTION_TOUCH_BOUNDARY_FAIL',
  'PRODUCTION_TOUCH_BOUNDARY_READY',
];

const ALLOWED_BOUNDARY_TYPES = ['filesystem','network','database','secrets','deployment','release','stable','billing','tenant','auth','runtime','github'];
const ALLOWED_BOUNDARY_MODES = ['blocked','metadata-only','dry-run','planning'];
const ALLOWED_BOUNDARY_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_BOUNDARY_CONTROLS = ['no-filesystem-write','no-network','no-database-write','no-secret-read','no-deploy','no-release','no-stable-promotion','no-billing-execution','no-tenant-create','no-auth-enable','no-runtime-execution','audit-required','evidence-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v327.0', production_touch_boundary_id: null, production_touch_boundary_contract_ready: false,
  boundary_items_count: 0, required_boundary_controls_count: 0, boundary_level: null, production_touch_boundary_hash: null,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_dry_run_completed: false, activation_execution_ready: false, activation_execution_approved: false,
  activation_execution_evidence_published: false, activation_rollback_bound: false, activation_execution_authority_granted: false, activation_execution_phase_passed: false,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCTION_TOUCH_BOUNDARY_BLOCKED_INPUT'] };
  if (!input.production_touch_boundary_id || typeof input.production_touch_boundary_id !== 'string') return { ...BASE, errors: ['PRODUCTION_TOUCH_BOUNDARY_BLOCKED_INPUT: missing production_touch_boundary_id'] };
  if (input.product_activation_preflight_gate_ready !== true) return { ...BASE, production_touch_boundary_id: input.production_touch_boundary_id, errors: ['PRODUCTION_TOUCH_BOUNDARY_BLOCKED_PREFLIGHT: product_activation_preflight_gate_ready must be true'] };
  if (!input.activation_preflight_gate_id || typeof input.activation_preflight_gate_id !== 'string') return { ...BASE, production_touch_boundary_id: input.production_touch_boundary_id, errors: ['PRODUCTION_TOUCH_BOUNDARY_BLOCKED_PREFLIGHT: missing activation_preflight_gate_id'] };
  if (!Array.isArray(input.boundary_items) || input.boundary_items.length === 0) return { ...BASE, production_touch_boundary_id: input.production_touch_boundary_id, errors: ['PRODUCTION_TOUCH_BOUNDARY_BLOCKED_PREFLIGHT: boundary_items must be non-empty array'] };
  if (!input.boundary_level || !ALLOWED_BOUNDARY_LEVELS.includes(input.boundary_level)) return { ...BASE, production_touch_boundary_id: input.production_touch_boundary_id, errors: ['PRODUCTION_TOUCH_BOUNDARY_BLOCKED_PREFLIGHT: invalid boundary_level'] };

  const fE = [];
  for (let i = 0; i < input.boundary_items.length; i++) {
    const s = input.boundary_items[i];
    if (!s.boundary_id || typeof s.boundary_id !== 'string') fE.push(`boundary ${i}: missing boundary_id`);
    if (!s.boundary_type || !ALLOWED_BOUNDARY_TYPES.includes(s.boundary_type)) fE.push(`boundary ${i}: invalid boundary_type`);
    if (!s.boundary_mode || !ALLOWED_BOUNDARY_MODES.includes(s.boundary_mode)) fE.push(`boundary ${i}: invalid boundary_mode`);
    if (!s.boundary_hash || !HEX64_RE.test(s.boundary_hash)) fE.push(`boundary ${i}: boundary_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, production_touch_boundary_id: input.production_touch_boundary_id, errors: ['PRODUCTION_TOUCH_BOUNDARY_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_boundary_controls) ? input.required_boundary_controls : REQUIRED_BOUNDARY_CONTROLS;
  const missingControls = REQUIRED_BOUNDARY_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, production_touch_boundary_id: input.production_touch_boundary_id, boundary_items_count: input.boundary_items.length, errors: ['PRODUCTION_TOUCH_BOUNDARY_FAIL: missing required boundary controls: ' + missingControls.join(', ')] };

  const argId = input.production_touch_boundary_id;
  const h = hash({ argId, preflight: input.activation_preflight_gate_id, items: input.boundary_items, controls: reqControls, level: input.boundary_level });
  return { ...BASE, production_touch_boundary_id: argId, production_touch_boundary_contract_ready: true, boundary_items_count: input.boundary_items.length, required_boundary_controls_count: reqControls.length, boundary_level: input.boundary_level, production_touch_boundary_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid production touch boundary contract'] };
  const e = []; if (!result.production_touch_boundary_id) e.push('missing production_touch_boundary_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCTION_TOUCH_BOUNDARY_BLOCKED_INPUT';
  const status = result.production_touch_boundary_contract_ready ? 'PRODUCTION_TOUCH_BOUNDARY_READY' :
    result.errors?.some(e => e.startsWith('PRODUCTION_TOUCH_BOUNDARY_FAIL')) ? 'PRODUCTION_TOUCH_BOUNDARY_FAIL' :
    result.errors?.some(e => e.startsWith('PRODUCTION_TOUCH_BOUNDARY_BLOCKED_PREFLIGHT')) ? 'PRODUCTION_TOUCH_BOUNDARY_BLOCKED_PREFLIGHT' : 'PRODUCTION_TOUCH_BOUNDARY_BLOCKED_INPUT';
  let out = `=== ${status} ===\nproduction_touch_boundary_id: ${result.production_touch_boundary_id || '(none)'}\nproduction_touch_boundary_contract_ready: ${result.production_touch_boundary_contract_ready}\nboundary_items_count: ${result.boundary_items_count}\nrequired_boundary_controls_count: ${result.required_boundary_controls_count}\nboundary_level: ${result.boundary_level || '(none)'}\n`;
  if (result.production_touch_boundary_hash) out += `production_touch_boundary_hash: ${result.production_touch_boundary_hash}\n`;
  ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}