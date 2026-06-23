import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_BILLING_DRY_RUN_CONTRACT_STATUSES = [
  'BILLING_DRY_RUN_CONTRACT_BLOCKED_INPUT',
  'BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION',
  'BILLING_DRY_RUN_CONTRACT_FAIL',
  'BILLING_DRY_RUN_CONTRACT_READY',
];

const ALLOWED_PROVIDER_TYPES = ['stripe','mercadopago','paypal','manual','internal','disabled'];
const ALLOWED_BILLING_MODES = ['no-charge','dry-run','metadata-only','planning'];
const REQUIRED_BILLING_CONTROLS = ['no-real-charge','no-customer-create','no-invoice-create','no-subscription-create','no-webhook-register','no-provider-connect','no-secret-read','audit-required','evidence-required'];
const ALLOWED_BILLING_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v308.0', billing_dry_run_contract_id: null, billing_dry_run_contract_ready: false,
  billing_targets_count: 0, required_billing_controls_count: 0, billing_level: null, billing_dry_run_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['BILLING_DRY_RUN_CONTRACT_BLOCKED_INPUT'] };
  if (!input.billing_dry_run_contract_id || typeof input.billing_dry_run_contract_id !== 'string') return { ...BASE, errors: ['BILLING_DRY_RUN_CONTRACT_BLOCKED_INPUT: missing billing_dry_run_contract_id'] };
  if (input.subscription_policy_matrix_ready !== true) return { ...BASE, billing_dry_run_contract_id: input.billing_dry_run_contract_id, errors: ['BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION: subscription_policy_matrix_ready must be true'] };
  if (!input.subscription_policy_matrix_id || typeof input.subscription_policy_matrix_id !== 'string') return { ...BASE, billing_dry_run_contract_id: input.billing_dry_run_contract_id, errors: ['BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION: missing subscription_policy_matrix_id'] };
  if (!input.billing_level || !ALLOWED_BILLING_LEVELS.includes(input.billing_level)) return { ...BASE, billing_dry_run_contract_id: input.billing_dry_run_contract_id, errors: ['BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION: invalid billing_level'] };
  if (!Array.isArray(input.billing_targets) || input.billing_targets.length === 0) return { ...BASE, billing_dry_run_contract_id: input.billing_dry_run_contract_id, errors: ['BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION: billing_targets must be non-empty array'] };

  const fE = [];
  for (let i = 0; i < input.billing_targets.length; i++) {
    const t = input.billing_targets[i];
    if (!t.target_id || typeof t.target_id !== 'string') fE.push(`target ${i}: missing target_id`);
    if (!t.provider_type || !ALLOWED_PROVIDER_TYPES.includes(t.provider_type)) fE.push(`target ${i}: invalid provider_type`);
    if (!t.billing_mode || !ALLOWED_BILLING_MODES.includes(t.billing_mode)) fE.push(`target ${i}: invalid billing_mode`);
    if (!t.target_hash || !HEX64_RE.test(t.target_hash)) fE.push(`target ${i}: target_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, billing_dry_run_contract_id: input.billing_dry_run_contract_id, errors: ['BILLING_DRY_RUN_CONTRACT_FAIL: ' + fE.join('; ')] };

  const controls = Array.isArray(input.required_billing_controls) ? input.required_billing_controls : REQUIRED_BILLING_CONTROLS;
  const missingControls = REQUIRED_BILLING_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) return { ...BASE, billing_dry_run_contract_id: input.billing_dry_run_contract_id, billing_targets_count: input.billing_targets.length, errors: ['BILLING_DRY_RUN_CONTRACT_FAIL: missing required billing controls: ' + missingControls.join(', ')] };

  const bdcId = input.billing_dry_run_contract_id;
  const h = hash({ bdcId, subscription: input.subscription_policy_matrix_id, targets: input.billing_targets, controls, level: input.billing_level });
  return { ...BASE, billing_dry_run_contract_id: bdcId, billing_dry_run_contract_ready: true, billing_targets_count: input.billing_targets.length, required_billing_controls_count: controls.length, billing_level: input.billing_level, billing_dry_run_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid billing dry-run contract'] };
  const e = []; if (!result.billing_dry_run_contract_id) e.push('missing billing_dry_run_contract_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'BILLING_DRY_RUN_CONTRACT_BLOCKED_INPUT';
  const status = result.billing_dry_run_contract_ready ? 'BILLING_DRY_RUN_CONTRACT_READY' :
    result.errors?.some(e => e.startsWith('BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION')) ? 'BILLING_DRY_RUN_CONTRACT_BLOCKED_SUBSCRIPTION' :
    result.errors?.some(e => e.startsWith('BILLING_DRY_RUN_CONTRACT_FAIL')) ? 'BILLING_DRY_RUN_CONTRACT_FAIL' : 'BILLING_DRY_RUN_CONTRACT_BLOCKED_INPUT';
  let out = `=== ${status} ===\nbilling_dry_run_contract_id: ${result.billing_dry_run_contract_id || '(none)'}\nbilling_dry_run_contract_ready: ${result.billing_dry_run_contract_ready}\nbilling_targets_count: ${result.billing_targets_count}\nrequired_billing_controls_count: ${result.required_billing_controls_count}\nbilling_level: ${result.billing_level || '(none)'}\n`;
  if (result.billing_dry_run_hash) out += `billing_dry_run_hash: ${result.billing_dry_run_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}