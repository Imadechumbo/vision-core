import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PRODUCTION_READINESS_EVIDENCE_BINDER_STATUSES = [
  'PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_INPUT',
  'PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE',
  'PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL',
  'PRODUCTION_READINESS_EVIDENCE_BINDER_READY',
];

const ALLOWED_EVIDENCE_TYPES = ['saas_hardening_gate','security_compliance_gate','billing_blocker','tenant_blocker','deploy_blocker','release_blocker','stable_blocker','rollback_plan','audit_record','pass_gold_status'];
const ALLOWED_EVIDENCE_MODES = ['metadata-only','dry-run','contract-only','planning'];
const REQUIRED_EVIDENCE_TYPES = ['saas_hardening_gate','security_compliance_gate','billing_blocker','tenant_blocker','deploy_blocker','release_blocker','stable_blocker','rollback_plan','audit_record','pass_gold_status'];
const ALLOWED_READINESS_LEVELS = ['contract-only','metadata-only','dry-run','planning'];
const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v317.0', production_readiness_evidence_binder_id: null, production_readiness_evidence_binder_ready: false,
  evidence_items_count: 0, required_evidence_types_count: 0, readiness_level: null, production_readiness_evidence_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_INPUT'] };
  if (!input.production_readiness_evidence_binder_id || typeof input.production_readiness_evidence_binder_id !== 'string') return { ...BASE, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_INPUT: missing production_readiness_evidence_binder_id'] };
  if (input.saas_enablement_scope_binder_ready !== true) return { ...BASE, production_readiness_evidence_binder_id: input.production_readiness_evidence_binder_id, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE: saas_enablement_scope_binder_ready must be true'] };
  if (!input.saas_enablement_scope_binder_id || typeof input.saas_enablement_scope_binder_id !== 'string') return { ...BASE, production_readiness_evidence_binder_id: input.production_readiness_evidence_binder_id, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE: missing saas_enablement_scope_binder_id'] };
  if (!Array.isArray(input.evidence_items) || input.evidence_items.length === 0) return { ...BASE, production_readiness_evidence_binder_id: input.production_readiness_evidence_binder_id, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE: evidence_items must be non-empty array'] };
  if (!input.readiness_level || !ALLOWED_READINESS_LEVELS.includes(input.readiness_level)) return { ...BASE, production_readiness_evidence_binder_id: input.production_readiness_evidence_binder_id, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE: invalid readiness_level'] };

  const fE = [];
  for (let i = 0; i < input.evidence_items.length; i++) {
    const s = input.evidence_items[i];
    if (!s.evidence_id || typeof s.evidence_id !== 'string') fE.push(`evidence item ${i}: missing evidence_id`);
    if (!s.evidence_type || !ALLOWED_EVIDENCE_TYPES.includes(s.evidence_type)) fE.push(`evidence item ${i}: invalid evidence_type`);
    if (!s.evidence_mode || !ALLOWED_EVIDENCE_MODES.includes(s.evidence_mode)) fE.push(`evidence item ${i}: invalid evidence_mode`);
    if (!s.evidence_hash || !HEX64_RE.test(s.evidence_hash)) fE.push(`evidence item ${i}: evidence_hash must be 64 hex chars`);
  }
  if (fE.length > 0) return { ...BASE, production_readiness_evidence_binder_id: input.production_readiness_evidence_binder_id, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL: ' + fE.join('; ')] };

  const reqTypes = Array.isArray(input.required_evidence_types) ? input.required_evidence_types : REQUIRED_EVIDENCE_TYPES;
  const missingTypes = REQUIRED_EVIDENCE_TYPES.filter(t => !reqTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, production_readiness_evidence_binder_id: input.production_readiness_evidence_binder_id, evidence_items_count: input.evidence_items.length, errors: ['PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL: missing required evidence types: ' + missingTypes.join(', ')] };

  const prebId = input.production_readiness_evidence_binder_id;
  const h = hash({ prebId, scope: input.saas_enablement_scope_binder_id, items: input.evidence_items, types: reqTypes, level: input.readiness_level });
  return { ...BASE, production_readiness_evidence_binder_id: prebId, production_readiness_evidence_binder_ready: true, evidence_items_count: input.evidence_items.length, required_evidence_types_count: reqTypes.length, readiness_level: input.readiness_level, production_readiness_evidence_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid production readiness evidence binder'] };
  const e = []; if (!result.production_readiness_evidence_binder_id) e.push('missing production_readiness_evidence_binder_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_INPUT';
  const status = result.production_readiness_evidence_binder_ready ? 'PRODUCTION_READINESS_EVIDENCE_BINDER_READY' :
    result.errors?.some(e => e.startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE')) ? 'PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_SCOPE' :
    result.errors?.some(e => e.startsWith('PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL')) ? 'PRODUCTION_READINESS_EVIDENCE_BINDER_FAIL' : 'PRODUCTION_READINESS_EVIDENCE_BINDER_BLOCKED_INPUT';
  let out = `=== ${status} ===\nproduction_readiness_evidence_binder_id: ${result.production_readiness_evidence_binder_id || '(none)'}\nproduction_readiness_evidence_binder_ready: ${result.production_readiness_evidence_binder_ready}\nevidence_items_count: ${result.evidence_items_count}\nrequired_evidence_types_count: ${result.required_evidence_types_count}\nreadiness_level: ${result.readiness_level || '(none)'}\n`;
  if (result.production_readiness_evidence_hash) out += `production_readiness_evidence_hash: ${result.production_readiness_evidence_hash}\n`;
  ['product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}