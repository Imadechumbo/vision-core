import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SAAS_HARDENING_PHASE_GATE_STATUSES = [
  'SAAS_HARDENING_PHASE_GATE_BLOCKED_INPUT',
  'SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW',
  'SAAS_HARDENING_PHASE_GATE_INCOMPLETE',
  'SAAS_HARDENING_PHASE_GATE_READY',
];

const REQUIRED_MODULE_IDS = [
  'saas_platform_contract', 'tenant_isolation_contract', 'subscription_policy_matrix',
  'billing_dry_run_contract', 'saas_risk_classification_gate',
  'saas_policy_binding', 'saas_evidence_receipt',
  'saas_security_report_contract', 'saas_final_authority_review',
];

const FINAL_MESSAGE = 'V305-V314 SaaS hardening and compliance complete. SaaS enablement, billing, tenant operations, deploy, release, and stable promotion remain blocked. REGRA ABSOLUTA preserved.';

const BASE = {
  schema_version: 'v314.0', phase_gate_id: null, saas_hardening_phase_gate_ready: false,
  modules_verified: [], all_modules_present: false, phase_passed: false,
  final_message: FINAL_MESSAGE, phase_gate_hash: null,
  saas_enabled: false, tenant_isolation_enforced: false, subscription_active: false, billing_executed: false,
  billing_provider_connected: false, invoice_generated: false, customer_created: false, webhook_registered: false,
  saas_policy_enforced: false, saas_report_published: false, saas_authority_granted: false, saas_phase_passed: false,
  enterprise_security_enabled: false, compliance_enforced: false, security_scan_executed: false, secrets_accessed: false,
  security_policy_enforced: false, security_report_published: false, enterprise_authority_granted: false, enterprise_phase_passed: false,
  dashboard_enabled: false, dashboard_deployed: false, multi_project_enabled: false, policy_enforced: false,
  audit_ledger_written: false, projection_published: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false,
  production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['SAAS_HARDENING_PHASE_GATE_BLOCKED_INPUT'] };
  if (!input.phase_gate_id || typeof input.phase_gate_id !== 'string') return { ...BASE, errors: ['SAAS_HARDENING_PHASE_GATE_BLOCKED_INPUT: missing phase_gate_id'] };
  if (input.saas_final_authority_review_ready !== true) return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW: saas_final_authority_review_ready must be true'] };
  if (!input.saas_final_review_id || typeof input.saas_final_review_id !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW: missing saas_final_review_id'] };
  if (!input.phase_summary || typeof input.phase_summary !== 'string') return { ...BASE, phase_gate_id: input.phase_gate_id, errors: ['SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW: phase_summary required'] };

  const ids = input.ids || {};
  const modulesVerified = [];
  const missingModules = [];

  for (const key of REQUIRED_MODULE_IDS) {
    if (ids[key] && typeof ids[key] === 'string') {
      modulesVerified.push(key);
    } else {
      missingModules.push(key);
    }
  }

  if (missingModules.length > 0) return { ...BASE, phase_gate_id: input.phase_gate_id, modules_verified: modulesVerified, all_modules_present: false, errors: ['SAAS_HARDENING_PHASE_GATE_INCOMPLETE: missing modules: ' + missingModules.join(', ')] };

  const pgId = input.phase_gate_id;
  const h = hash({ pgId, review: input.saas_final_review_id, ids, summary: input.phase_summary });

  return { ...BASE, phase_gate_id: pgId, saas_hardening_phase_gate_ready: true, modules_verified: modulesVerified, all_modules_present: true, phase_passed: false, final_message: FINAL_MESSAGE, phase_gate_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid SaaS hardening phase gate'] };
  const e = []; if (!result.phase_gate_id) e.push('missing phase_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SAAS_HARDENING_PHASE_GATE_BLOCKED_INPUT';
  const status = result.saas_hardening_phase_gate_ready ? 'SAAS_HARDENING_PHASE_GATE_READY' :
    result.errors?.some(e => e.startsWith('SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW')) ? 'SAAS_HARDENING_PHASE_GATE_BLOCKED_REVIEW' :
    result.errors?.some(e => e.startsWith('SAAS_HARDENING_PHASE_GATE_INCOMPLETE')) ? 'SAAS_HARDENING_PHASE_GATE_INCOMPLETE' : 'SAAS_HARDENING_PHASE_GATE_BLOCKED_INPUT';
  let out = `=== ${status} ===\nphase_gate_id: ${result.phase_gate_id || '(none)'}\nsaas_hardening_phase_gate_ready: ${result.saas_hardening_phase_gate_ready}\nmodules_verified: ${result.modules_verified.join(', ') || '(none)'}\nall_modules_present: ${result.all_modules_present}\nphase_passed: ${result.phase_passed}\nfinal_message: ${result.final_message || '(none)'}\n`;
  if (result.phase_gate_hash) out += `phase_gate_hash: ${result.phase_gate_hash}\n`;
  ['saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}