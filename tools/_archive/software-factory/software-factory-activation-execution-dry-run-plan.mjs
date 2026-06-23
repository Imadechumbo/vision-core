import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_EXECUTION_DRY_RUN_PLAN_STATUSES = [
  'ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_INPUT',
  'ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_BOUNDARY',
  'ACTIVATION_EXECUTION_DRY_RUN_PLAN_FAIL',
  'ACTIVATION_EXECUTION_DRY_RUN_PLAN_READY',
];

const ALLOWED_STEP_TYPES = ['activation_execution_preview','production_touch_preview','deploy_preview','release_preview','stable_preview','billing_preview','tenant_preview','rollback_preview','evidence_preview','audit_preview','blocker_preview'];
const ALLOWED_STEP_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_DRY_RUN_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_DRY_RUN_CONTROLS = ['no-production-touch','no-filesystem-write','no-network','no-database-write','no-secret-read','no-real-deploy','no-real-release','no-stable-promotion','no-billing-execution','no-tenant-create','rollback-required','evidence-required','audit-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v328.0', activation_execution_dry_run_plan_id: null, activation_execution_dry_run_plan_ready: false,
  dry_run_steps_count: 0, required_dry_run_controls_count: 0, dry_run_level: null, activation_execution_dry_run_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_INPUT'] };
  if (!input.activation_execution_dry_run_plan_id || typeof input.activation_execution_dry_run_plan_id !== 'string') return { ...BASE, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_INPUT: missing activation_execution_dry_run_plan_id'] };
  if (input.production_touch_boundary_contract_ready !== true) return { ...BASE, activation_execution_dry_run_plan_id: input.activation_execution_dry_run_plan_id, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_BOUNDARY: production_touch_boundary_contract_ready must be true'] };
  if (!input.production_touch_boundary_id || typeof input.production_touch_boundary_id !== 'string') return { ...BASE, activation_execution_dry_run_plan_id: input.activation_execution_dry_run_plan_id, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_BOUNDARY: missing production_touch_boundary_id'] };
  if (!Array.isArray(input.dry_run_steps) || input.dry_run_steps.length === 0) return { ...BASE, activation_execution_dry_run_plan_id: input.activation_execution_dry_run_plan_id, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_BOUNDARY: dry_run_steps must be non-empty array'] };
  if (!input.dry_run_level || !ALLOWED_DRY_RUN_LEVELS.includes(input.dry_run_level)) return { ...BASE, activation_execution_dry_run_plan_id: input.activation_execution_dry_run_plan_id, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_BOUNDARY: invalid dry_run_level'] };

  const fE = [];
  for (let i = 0; i < input.dry_run_steps.length; i++) {
    const s = input.dry_run_steps[i];
    if (!s.step_id || typeof s.step_id !== 'string') fE.push(`step ${i}: missing step_id`);
    if (!s.step_type || !ALLOWED_STEP_TYPES.includes(s.step_type)) fE.push(`step ${i}: invalid step_type`);
    if (!s.step_mode || !ALLOWED_STEP_MODES.includes(s.step_mode)) fE.push(`step ${i}: invalid step_mode`);
    if (!s.step_hash || !HEX64_RE.test(s.step_hash)) fE.push(`step ${i}: step_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_execution_dry_run_plan_id: input.activation_execution_dry_run_plan_id, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_dry_run_controls) ? input.required_dry_run_controls : REQUIRED_DRY_RUN_CONTROLS;
  const missingControls = REQUIRED_DRY_RUN_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, activation_execution_dry_run_plan_id: input.activation_execution_dry_run_plan_id, dry_run_steps_count: input.dry_run_steps.length, errors: ['ACTIVATION_EXECUTION_DRY_RUN_PLAN_FAIL: missing required dry-run controls: ' + missingControls.join(', ')] };

  const argId = input.activation_execution_dry_run_plan_id;
  const h = hash({ argId, boundary: input.production_touch_boundary_id, steps: input.dry_run_steps, controls: reqControls, level: input.dry_run_level });
  return { ...BASE, activation_execution_dry_run_plan_id: argId, activation_execution_dry_run_plan_ready: true, dry_run_steps_count: input.dry_run_steps.length, required_dry_run_controls_count: reqControls.length, dry_run_level: input.dry_run_level, activation_execution_dry_run_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation execution dry-run plan'] };
  const e = []; if (!result.activation_execution_dry_run_plan_id) e.push('missing activation_execution_dry_run_plan_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_INPUT';
  const status = result.activation_execution_dry_run_plan_ready ? 'ACTIVATION_EXECUTION_DRY_RUN_PLAN_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_DRY_RUN_PLAN_FAIL')) ? 'ACTIVATION_EXECUTION_DRY_RUN_PLAN_FAIL' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_BOUNDARY')) ? 'ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_BOUNDARY' : 'ACTIVATION_EXECUTION_DRY_RUN_PLAN_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_execution_dry_run_plan_id: ${result.activation_execution_dry_run_plan_id || '(none)'}\nactivation_execution_dry_run_plan_ready: ${result.activation_execution_dry_run_plan_ready}\ndry_run_steps_count: ${result.dry_run_steps_count}\nrequired_dry_run_controls_count: ${result.required_dry_run_controls_count}\ndry_run_level: ${result.dry_run_level || '(none)'}\n`;
  if (result.activation_execution_dry_run_hash) out += `activation_execution_dry_run_hash: ${result.activation_execution_dry_run_hash}\n`;
  ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}