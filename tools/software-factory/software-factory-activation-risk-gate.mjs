import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_RISK_GATE_STATUSES = [
  'ACTIVATION_RISK_GATE_BLOCKED_INPUT',
  'ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN',
  'ACTIVATION_RISK_GATE_FAIL',
  'ACTIVATION_RISK_GATE_READY',
];

const ALLOWED_RISK_TYPES = ['production_touch','deploy_risk','release_risk','stable_promotion','billing_execution','provider_connection','tenant_creation','secret_exposure','policy_bypass','rollback_gap','evidence_gap','pass_gold_gap'];
const ALLOWED_SEVERITIES = ['info','low','medium','high','critical','blocking'];
const REQUIRED_RISK_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-stable-promotion','no-billing-execution','no-provider-connect','no-tenant-create','no-secret-exposure','no-policy-bypass','rollback-required','evidence-required','pass-gold-required','human-approval-required'];
const ALLOWED_RISK_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v319.0', activation_risk_gate_id: null, activation_risk_gate_ready: false,
  risk_items_count: 0, required_risk_controls_count: 0, risk_level: null, activation_risk_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_RISK_GATE_BLOCKED_INPUT'] };
  if (!input.activation_risk_gate_id || typeof input.activation_risk_gate_id !== 'string') return { ...BASE, errors: ['ACTIVATION_RISK_GATE_BLOCKED_INPUT: missing activation_risk_gate_id'] };
  if (input.activation_dry_run_controller_ready !== true) return { ...BASE, activation_risk_gate_id: input.activation_risk_gate_id, errors: ['ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN: activation_dry_run_controller_ready must be true'] };
  if (!input.activation_dry_run_controller_id || typeof input.activation_dry_run_controller_id !== 'string') return { ...BASE, activation_risk_gate_id: input.activation_risk_gate_id, errors: ['ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN: missing activation_dry_run_controller_id'] };
  if (!Array.isArray(input.risk_items) || input.risk_items.length === 0) return { ...BASE, activation_risk_gate_id: input.activation_risk_gate_id, errors: ['ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN: risk_items must be non-empty array'] };
  if (!input.risk_level || !ALLOWED_RISK_LEVELS.includes(input.risk_level)) return { ...BASE, activation_risk_gate_id: input.activation_risk_gate_id, errors: ['ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN: invalid risk_level'] };

  const fE = [];
  for (let i = 0; i < input.risk_items.length; i++) {
    const s = input.risk_items[i];
    if (!s.risk_id || typeof s.risk_id !== 'string') fE.push(`risk item ${i}: missing risk_id`);
    if (!s.risk_type || !ALLOWED_RISK_TYPES.includes(s.risk_type)) fE.push(`risk item ${i}: invalid risk_type`);
    if (!s.severity || !ALLOWED_SEVERITIES.includes(s.severity)) fE.push(`risk item ${i}: invalid severity`);
    if (!s.risk_hash || !HEX64_RE.test(s.risk_hash)) fE.push(`risk item ${i}: risk_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_risk_gate_id: input.activation_risk_gate_id, errors: ['ACTIVATION_RISK_GATE_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_risk_controls) ? input.required_risk_controls : REQUIRED_RISK_CONTROLS;
  const missingControls = REQUIRED_RISK_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, activation_risk_gate_id: input.activation_risk_gate_id, risk_items_count: input.risk_items.length, errors: ['ACTIVATION_RISK_GATE_FAIL: missing required risk controls: ' + missingControls.join(', ')] };

  const argId = input.activation_risk_gate_id;
  const h = hash({ argId, dryRun: input.activation_dry_run_controller_id, items: input.risk_items, controls: reqControls, level: input.risk_level });
  return { ...BASE, activation_risk_gate_id: argId, activation_risk_gate_ready: true, risk_items_count: input.risk_items.length, required_risk_controls_count: reqControls.length, risk_level: input.risk_level, activation_risk_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation risk gate'] };
  const e = []; if (!result.activation_risk_gate_id) e.push('missing activation_risk_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_RISK_GATE_BLOCKED_INPUT';
  const status = result.activation_risk_gate_ready ? 'ACTIVATION_RISK_GATE_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN')) ? 'ACTIVATION_RISK_GATE_BLOCKED_DRY_RUN' :
    result.errors?.some(e => e.startsWith('ACTIVATION_RISK_GATE_FAIL')) ? 'ACTIVATION_RISK_GATE_FAIL' : 'ACTIVATION_RISK_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_risk_gate_id: ${result.activation_risk_gate_id || '(none)'}\nactivation_risk_gate_ready: ${result.activation_risk_gate_ready}\nrisk_items_count: ${result.risk_items_count}\nrequired_risk_controls_count: ${result.required_risk_controls_count}\nrisk_level: ${result.risk_level || '(none)'}\n`;
  if (result.activation_risk_hash) out += `activation_risk_hash: ${result.activation_risk_hash}\n`;
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}