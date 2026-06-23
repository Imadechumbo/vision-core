import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCT_ACTIVATION_PHASE_GATE_STATUSES = [
  'PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_INPUT',
  'PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW',
  'PRODUCT_ACTIVATION_PHASE_GATE_INCOMPLETE',
  'PRODUCT_ACTIVATION_PHASE_GATE_READY',
];

const ALL_MODULE_KEYS = ['product_activation_command_contract','saas_enablement_scope_binder','production_readiness_evidence_binder','activation_dry_run_controller','activation_risk_gate','activation_policy_binding','activation_evidence_receipt','activation_final_report','activation_final_authority_review'];

const BASE = {
  schema_version: 'v324.0', phase_gate_id: null, product_activation_phase_gate_ready: false,
  modules_verified: [], all_modules_present: false, phase_passed: false,
  final_message: 'V315-V324 product activation authority complete. Product activation, SaaS enablement, production touch, deploy, release, billing, and stable promotion remain blocked until explicit V325 command.',
  phase_gate_hash: null,
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
  product_activation_command_contract: 'V315',
  saas_enablement_scope_binder: 'V316',
  production_readiness_evidence_binder: 'V317',
  activation_dry_run_controller: 'V318',
  activation_risk_gate: 'V319',
  activation_policy_binding: 'V320',
  activation_evidence_receipt: 'V321',
  activation_final_report: 'V322',
  activation_final_authority_review: 'V323',
};

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') return { ...BASE, errors: ['PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.activation_final_authority_review_ready !== true) return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW: activation_final_authority_review_ready must be true'] };
  if (!input.activation_final_review_id || typeof input.activation_final_review_id !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW: missing activation_final_review_id'] };
  if (!input.ids || typeof input.ids !== 'object') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW: missing ids'] };
  if (!input.phase_summary || typeof input.phase_summary !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW: missing phase_summary'] };

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

  if (!allPresent) return { ...BASE, phase_gate_id: input.phase_gate_id, modules_verified: present, all_modules_present: false, errors: ['PRODUCT_ACTIVATION_PHASE_GATE_INCOMPLETE: missing module ids'] };

  const argId = input.phase_gate_id;
  const h = hash({ argId, review: input.activation_final_review_id, ids: input.ids, summary: input.phase_summary });
  return { ...BASE, phase_gate_id: argId, product_activation_phase_gate_ready: true, modules_verified: present, all_modules_present: true, phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid product activation phase gate'] };
  const e = []; if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_INPUT';
  const status = result.product_activation_phase_gate_ready ? 'PRODUCT_ACTIVATION_PHASE_GATE_READY' :
    result.errors?.some(e => e.startsWith('PRODUCT_ACTIVATION_PHASE_GATE_INCOMPLETE')) ? 'PRODUCT_ACTIVATION_PHASE_GATE_INCOMPLETE' :
    result.errors?.some(e => e.startsWith('PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW')) ? 'PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_REVIEW' : 'PRODUCT_ACTIVATION_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\nproduct_activation_phase_gate_ready: ${result.product_activation_phase_gate_ready}\nall_modules_present: ${result.all_modules_present}\nphase_passed: ${result.phase_passed}\nfinal_message: ${result.final_message}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  if (result.modules_verified?.length) {
    out += 'modules_verified:\n';
    for (const m of result.modules_verified) out += `  ${m.label} (${m.module}): ${m.id || '(missing)'}\n`;
  }
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}