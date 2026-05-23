import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PREFLIGHT_GATE_STATUSES = [
  'PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_INPUT',
  'PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND',
  'PRODUCT_ACTIVATION_PREFLIGHT_FAIL',
  'PRODUCT_ACTIVATION_PREFLIGHT_READY',
];

const ALLOWED_ITEM_TYPES = ['product_activation_gate','saas_enablement_blocker','production_touch_blocker','deploy_blocker','release_blocker','stable_blocker','billing_blocker','tenant_blocker','rollback_requirement','evidence_requirement','audit_requirement','pass_gold_requirement'];
const ALLOWED_ITEM_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_PREFLIGHT_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_PREFLIGHT_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-stable-promotion','no-billing-execution','no-tenant-create','no-provider-connect','no-secret-access','rollback-required','evidence-required','pass-gold-required','human-approval-required','audit-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v326.0', activation_preflight_gate_id: null, product_activation_preflight_gate_ready: false,
  preflight_items_count: 0, required_preflight_controls_count: 0, preflight_level: null, activation_preflight_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_INPUT'] };
  if (!input.activation_preflight_gate_id || typeof input.activation_preflight_gate_id !== 'string') return { ...BASE, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_INPUT: missing activation_preflight_gate_id'] };
  if (input.product_activation_execution_command_ready !== true) return { ...BASE, activation_preflight_gate_id: input.activation_preflight_gate_id, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND: product_activation_execution_command_ready must be true'] };
  if (!input.activation_execution_command_id || typeof input.activation_execution_command_id !== 'string') return { ...BASE, activation_preflight_gate_id: input.activation_preflight_gate_id, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND: missing activation_execution_command_id'] };
  if (!Array.isArray(input.preflight_items) || input.preflight_items.length === 0) return { ...BASE, activation_preflight_gate_id: input.activation_preflight_gate_id, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND: preflight_items must be non-empty array'] };
  if (!input.preflight_level || !ALLOWED_PREFLIGHT_LEVELS.includes(input.preflight_level)) return { ...BASE, activation_preflight_gate_id: input.activation_preflight_gate_id, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND: invalid preflight_level'] };

  const fE = [];
  for (let i = 0; i < input.preflight_items.length; i++) {
    const s = input.preflight_items[i];
    if (!s.item_id || typeof s.item_id !== 'string') fE.push(`item ${i}: missing item_id`);
    if (!s.item_type || !ALLOWED_ITEM_TYPES.includes(s.item_type)) fE.push(`item ${i}: invalid item_type`);
    if (!s.item_mode || !ALLOWED_ITEM_MODES.includes(s.item_mode)) fE.push(`item ${i}: invalid item_mode`);
    if (!s.item_hash || !HEX64_RE.test(s.item_hash)) fE.push(`item ${i}: item_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_preflight_gate_id: input.activation_preflight_gate_id, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_preflight_controls) ? input.required_preflight_controls : REQUIRED_PREFLIGHT_CONTROLS;
  const missingControls = REQUIRED_PREFLIGHT_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, activation_preflight_gate_id: input.activation_preflight_gate_id, preflight_items_count: input.preflight_items.length, errors: ['PRODUCT_ACTIVATION_PREFLIGHT_FAIL: missing required preflight controls: ' + missingControls.join(', ')] };

  const argId = input.activation_preflight_gate_id;
  const h = hash({ argId, execCmd: input.activation_execution_command_id, items: input.preflight_items, controls: reqControls, level: input.preflight_level });
  return { ...BASE, activation_preflight_gate_id: argId, product_activation_preflight_gate_ready: true, preflight_items_count: input.preflight_items.length, required_preflight_controls_count: reqControls.length, preflight_level: input.preflight_level, activation_preflight_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid product activation preflight gate'] };
  const e = []; if (!result.activation_preflight_gate_id) e.push('missing activation_preflight_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_INPUT';
  const status = result.product_activation_preflight_gate_ready ? 'PRODUCT_ACTIVATION_PREFLIGHT_READY' :
    result.errors?.some(e => e.startsWith('PRODUCT_ACTIVATION_PREFLIGHT_FAIL')) ? 'PRODUCT_ACTIVATION_PREFLIGHT_FAIL' :
    result.errors?.some(e => e.startsWith('PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND')) ? 'PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_COMMAND' : 'PRODUCT_ACTIVATION_PREFLIGHT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_preflight_gate_id: ${result.activation_preflight_gate_id || '(none)'}\nproduct_activation_preflight_gate_ready: ${result.product_activation_preflight_gate_ready}\npreflight_items_count: ${result.preflight_items_count}\nrequired_preflight_controls_count: ${result.required_preflight_controls_count}\npreflight_level: ${result.preflight_level || '(none)'}\n`;
  if (result.activation_preflight_hash) out += `activation_preflight_hash: ${result.activation_preflight_hash}\n`;
  ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}