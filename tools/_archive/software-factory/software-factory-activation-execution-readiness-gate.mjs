import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_EXECUTION_READINESS_GATE_STATUSES = [
  'ACTIVATION_EXECUTION_READINESS_BLOCKED_INPUT',
  'ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN',
  'ACTIVATION_EXECUTION_READINESS_FAIL',
  'ACTIVATION_EXECUTION_READINESS_READY',
];

const ALLOWED_READINESS_TYPES = ['execution_command','preflight_gate','production_touch_boundary','dry_run_plan','rollback_requirement','evidence_requirement','audit_requirement','pass_gold_requirement','human_approval_requirement','deployment_blocker','release_blocker','stable_blocker','billing_blocker'];
const ALLOWED_READINESS_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_READINESS_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_READINESS_CONTROLS = ['no-production-touch','no-real-deploy','no-real-release','no-stable-promotion','no-billing-execution','no-secret-access','rollback-required','evidence-required','audit-required','pass-gold-required','human-approval-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v329.0', activation_execution_readiness_gate_id: null, activation_execution_readiness_gate_ready: false,
  readiness_items_count: 0, required_readiness_controls_count: 0, readiness_level: null, activation_execution_readiness_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_EXECUTION_READINESS_BLOCKED_INPUT'] };
  if (!input.activation_execution_readiness_gate_id || typeof input.activation_execution_readiness_gate_id !== 'string') return { ...BASE, errors: ['ACTIVATION_EXECUTION_READINESS_BLOCKED_INPUT: missing activation_execution_readiness_gate_id'] };
  if (input.activation_execution_dry_run_plan_ready !== true) return { ...BASE, activation_execution_readiness_gate_id: input.activation_execution_readiness_gate_id, errors: ['ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN: activation_execution_dry_run_plan_ready must be true'] };
  if (!input.activation_execution_dry_run_plan_id || typeof input.activation_execution_dry_run_plan_id !== 'string') return { ...BASE, activation_execution_readiness_gate_id: input.activation_execution_readiness_gate_id, errors: ['ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN: missing activation_execution_dry_run_plan_id'] };
  if (!Array.isArray(input.readiness_items) || input.readiness_items.length === 0) return { ...BASE, activation_execution_readiness_gate_id: input.activation_execution_readiness_gate_id, errors: ['ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN: readiness_items must be non-empty array'] };
  if (!input.readiness_level || !ALLOWED_READINESS_LEVELS.includes(input.readiness_level)) return { ...BASE, activation_execution_readiness_gate_id: input.activation_execution_readiness_gate_id, errors: ['ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN: invalid readiness_level'] };

  const fE = [];
  for (let i = 0; i < input.readiness_items.length; i++) {
    const s = input.readiness_items[i];
    if (!s.readiness_id || typeof s.readiness_id !== 'string') fE.push(`item ${i}: missing readiness_id`);
    if (!s.readiness_type || !ALLOWED_READINESS_TYPES.includes(s.readiness_type)) fE.push(`item ${i}: invalid readiness_type`);
    if (!s.readiness_mode || !ALLOWED_READINESS_MODES.includes(s.readiness_mode)) fE.push(`item ${i}: invalid readiness_mode`);
    if (!s.readiness_hash || !HEX64_RE.test(s.readiness_hash)) fE.push(`item ${i}: readiness_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_execution_readiness_gate_id: input.activation_execution_readiness_gate_id, errors: ['ACTIVATION_EXECUTION_READINESS_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_readiness_controls) ? input.required_readiness_controls : REQUIRED_READINESS_CONTROLS;
  const missingControls = REQUIRED_READINESS_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, activation_execution_readiness_gate_id: input.activation_execution_readiness_gate_id, readiness_items_count: input.readiness_items.length, errors: ['ACTIVATION_EXECUTION_READINESS_FAIL: missing required readiness controls: ' + missingControls.join(', ')] };

  const argId = input.activation_execution_readiness_gate_id;
  const h = hash({ argId, dryRun: input.activation_execution_dry_run_plan_id, items: input.readiness_items, controls: reqControls, level: input.readiness_level });
  return { ...BASE, activation_execution_readiness_gate_id: argId, activation_execution_readiness_gate_ready: true, readiness_items_count: input.readiness_items.length, required_readiness_controls_count: reqControls.length, readiness_level: input.readiness_level, activation_execution_readiness_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation execution readiness gate'] };
  const e = []; if (!result.activation_execution_readiness_gate_id) e.push('missing activation_execution_readiness_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_EXECUTION_READINESS_BLOCKED_INPUT';
  const status = result.activation_execution_readiness_gate_ready ? 'ACTIVATION_EXECUTION_READINESS_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_READINESS_FAIL')) ? 'ACTIVATION_EXECUTION_READINESS_FAIL' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN')) ? 'ACTIVATION_EXECUTION_READINESS_BLOCKED_DRY_RUN' : 'ACTIVATION_EXECUTION_READINESS_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_execution_readiness_gate_id: ${result.activation_execution_readiness_gate_id || '(none)'}\nactivation_execution_readiness_gate_ready: ${result.activation_execution_readiness_gate_ready}\nreadiness_items_count: ${result.readiness_items_count}\nrequired_readiness_controls_count: ${result.required_readiness_controls_count}\nreadiness_level: ${result.readiness_level || '(none)'}\n`;
  if (result.activation_execution_readiness_hash) out += `activation_execution_readiness_hash: ${result.activation_execution_readiness_hash}\n`;
  ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}