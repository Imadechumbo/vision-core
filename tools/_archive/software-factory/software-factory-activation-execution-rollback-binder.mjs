import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ACTIVATION_EXECUTION_ROLLBACK_BINDER_STATUSES = [
  'ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_INPUT',
  'ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_EVIDENCE',
  'ACTIVATION_EXECUTION_ROLLBACK_BINDER_FAIL',
  'ACTIVATION_EXECUTION_ROLLBACK_BINDER_READY',
];

const ALLOWED_ROLLBACK_TYPES = ['code_rollback','config_rollback','database_rollback','tenant_rollback','billing_rollback','deployment_rollback','release_rollback','stable_rollback','evidence_rollback','audit_rollback','emergency_stop'];
const ALLOWED_ROLLBACK_MODES = ['metadata-only','dry-run','contract-only','planning'];
const ALLOWED_ROLLBACK_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_ROLLBACK_CONTROLS = ['rollback-required','no-real-rollback','no-filesystem-write','no-database-write','no-network','no-secret-access','no-deploy','no-release','no-stable-promotion','audit-required','evidence-required','human-approval-required'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v332.0', activation_execution_rollback_binder_id: null, activation_execution_rollback_binder_ready: false,
  rollback_items_count: 0, required_rollback_controls_count: 0, rollback_level: null, activation_execution_rollback_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_INPUT'] };
  if (!input.activation_execution_rollback_binder_id || typeof input.activation_execution_rollback_binder_id !== 'string') return { ...BASE, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_INPUT: missing activation_execution_rollback_binder_id'] };
  if (input.activation_execution_evidence_receipt_ready !== true) return { ...BASE, activation_execution_rollback_binder_id: input.activation_execution_rollback_binder_id, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_EVIDENCE: activation_execution_evidence_receipt_ready must be true'] };
  if (!input.activation_execution_evidence_receipt_id || typeof input.activation_execution_evidence_receipt_id !== 'string') return { ...BASE, activation_execution_rollback_binder_id: input.activation_execution_rollback_binder_id, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_EVIDENCE: missing activation_execution_evidence_receipt_id'] };
  if (!Array.isArray(input.rollback_items) || input.rollback_items.length === 0) return { ...BASE, activation_execution_rollback_binder_id: input.activation_execution_rollback_binder_id, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_EVIDENCE: rollback_items must be non-empty array'] };
  if (!input.rollback_level || !ALLOWED_ROLLBACK_LEVELS.includes(input.rollback_level)) return { ...BASE, activation_execution_rollback_binder_id: input.activation_execution_rollback_binder_id, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_EVIDENCE: invalid rollback_level'] };

  const fE = [];
  for (let i = 0; i < input.rollback_items.length; i++) {
    const s = input.rollback_items[i];
    if (!s.rollback_id || typeof s.rollback_id !== 'string') fE.push(`item ${i}: missing rollback_id`);
    if (!s.rollback_type || !ALLOWED_ROLLBACK_TYPES.includes(s.rollback_type)) fE.push(`item ${i}: invalid rollback_type`);
    if (!s.rollback_mode || !ALLOWED_ROLLBACK_MODES.includes(s.rollback_mode)) fE.push(`item ${i}: invalid rollback_mode`);
    if (!s.rollback_hash || !HEX64_RE.test(s.rollback_hash)) fE.push(`item ${i}: rollback_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, activation_execution_rollback_binder_id: input.activation_execution_rollback_binder_id, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_FAIL: ' + fE.join('; ')] };

  const reqControls = Array.isArray(input.required_rollback_controls) ? input.required_rollback_controls : REQUIRED_ROLLBACK_CONTROLS;
  const missingControls = REQUIRED_ROLLBACK_CONTROLS.filter(c => !reqControls.includes(c));
  if (missingControls.length > 0) return { ...BASE, activation_execution_rollback_binder_id: input.activation_execution_rollback_binder_id, rollback_items_count: input.rollback_items.length, errors: ['ACTIVATION_EXECUTION_ROLLBACK_BINDER_FAIL: missing required rollback controls: ' + missingControls.join(', ')] };

  const argId = input.activation_execution_rollback_binder_id;
  const h = hash({ argId, evidence: input.activation_execution_evidence_receipt_id, items: input.rollback_items, controls: reqControls, level: input.rollback_level });
  return { ...BASE, activation_execution_rollback_binder_id: argId, activation_execution_rollback_binder_ready: true, rollback_items_count: input.rollback_items.length, required_rollback_controls_count: reqControls.length, rollback_level: input.rollback_level, activation_execution_rollback_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid activation execution rollback binder'] };
  const e = []; if (!result.activation_execution_rollback_binder_id) e.push('missing activation_execution_rollback_binder_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_INPUT';
  const status = result.activation_execution_rollback_binder_ready ? 'ACTIVATION_EXECUTION_ROLLBACK_BINDER_READY' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_ROLLBACK_BINDER_FAIL')) ? 'ACTIVATION_EXECUTION_ROLLBACK_BINDER_FAIL' :
    result.errors?.some(e => e.startsWith('ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_EVIDENCE')) ? 'ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_EVIDENCE' : 'ACTIVATION_EXECUTION_ROLLBACK_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nactivation_execution_rollback_binder_id: ${result.activation_execution_rollback_binder_id || '(none)'}\nactivation_execution_rollback_binder_ready: ${result.activation_execution_rollback_binder_ready}\nrollback_items_count: ${result.rollback_items_count}\nrequired_rollback_controls_count: ${result.required_rollback_controls_count}\nrollback_level: ${result.rollback_level || '(none)'}\n`;
  if (result.activation_execution_rollback_hash) out += `activation_execution_rollback_hash: ${result.activation_execution_rollback_hash}\n`;
  ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}