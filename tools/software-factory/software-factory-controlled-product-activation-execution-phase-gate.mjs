import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_STATUSES = [
  'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_INPUT',
  'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW',
  'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_INCOMPLETE',
  'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_READY',
];

const ALL_MODULE_KEYS = ['product_activation_execution_command_contract','product_activation_preflight_gate','production_touch_boundary_contract','activation_execution_dry_run_plan','activation_execution_readiness_gate','activation_execution_approval_binding','activation_execution_evidence_receipt','activation_execution_rollback_binder','activation_execution_final_authority_review'];

const BASE = {
  schema_version: 'v334.0', phase_gate_id: null, controlled_product_activation_execution_phase_gate_ready: false,
  modules_verified: [], all_modules_present: false, phase_passed: false,
  final_message: 'V325-V334 controlled product activation execution complete. Real product activation execution, production touch, deploy, release, billing, rollback, and stable promotion remain blocked until explicit V335 command.',
  phase_gate_hash: null,
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

const MODULE_NAMES = {
  product_activation_execution_command_contract: 'V325',
  product_activation_preflight_gate: 'V326',
  production_touch_boundary_contract: 'V327',
  activation_execution_dry_run_plan: 'V328',
  activation_execution_readiness_gate: 'V329',
  activation_execution_approval_binding: 'V330',
  activation_execution_evidence_receipt: 'V331',
  activation_execution_rollback_binder: 'V332',
  activation_execution_final_authority_review: 'V333',
};

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') return { ...BASE, errors: ['CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.activation_execution_final_authority_review_ready !== true) return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: activation_execution_final_authority_review_ready must be true'] };
  if (!input.activation_execution_final_review_id || typeof input.activation_execution_final_review_id !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: missing activation_execution_final_review_id'] };
  if (!input.ids || typeof input.ids !== 'object') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: missing ids'] };
  if (!input.phase_summary || typeof input.phase_summary !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW: missing phase_summary'] };

  const present = [];
  let allPresent = true;
  for (const key of ALL_MODULE_KEYS) {
    if (input.ids[key]) {
      present.push({ module: key, id: input.ids[key], label: MODULE_NAMES[key] || key });
    } else {
      allPresent = false;
      present.push({ module: key, id: null, label: MODULE_NAMES[key] || key, missing: true });
    }
  }

  if (!allPresent) return { ...BASE, phase_gate_id: input.phase_gate_id, modules_verified: present, all_modules_present: false, errors: ['CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_INCOMPLETE: missing module ids'] };

  const argId = input.phase_gate_id;
  const h = hash({ argId, review: input.activation_execution_final_review_id, ids: input.ids, summary: input.phase_summary });
  return { ...BASE, phase_gate_id: argId, controlled_product_activation_execution_phase_gate_ready: true, modules_verified: present, all_modules_present: true, phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid controlled product activation execution phase gate'] };
  const e = []; if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_INPUT';
  const status = result.controlled_product_activation_execution_phase_gate_ready ? 'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_READY' :
    result.errors?.some(e => e.startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_INCOMPLETE')) ? 'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_INCOMPLETE' :
    result.errors?.some(e => e.startsWith('CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW')) ? 'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_REVIEW' : 'CONTROLLED_PRODUCT_ACTIVATION_EXECUTION_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\ncontrolled_product_activation_execution_phase_gate_ready: ${result.controlled_product_activation_execution_phase_gate_ready}\nall_modules_present: ${result.all_modules_present}\nphase_passed: ${result.phase_passed}\nfinal_message: ${result.final_message}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  if (result.modules_verified?.length) {
    out += 'modules_verified:\n';
    for (const m of result.modules_verified) out += `  ${m.label} (${m.module}): ${m.id || '(missing)'}\n`;
  }
  ['product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}