import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_RELEASE_EXECUTION_COMMAND_CONTRACT_STATUSES = [
  'RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT',
  'RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE',
  'RELEASE_EXECUTION_COMMAND_DENIED',
  'RELEASE_EXECUTION_COMMAND_READY',
];

const ALLOWED_RELEASE_MODES = ['contract-only','metadata-only','dry-run','planning'];
const REQUIRED_RELEASE_DOMAINS = ['release_execution','deployment_execution','deployment_scope','artifact_evidence','dry_run_plan','readiness_gate','rollback','evidence','audit','tag_blocker','stable_blocker','production_blocker'];
const ALLOWED_RELEASE_DOMAINS = ['release_execution','deployment_execution','deployment_scope','artifact_evidence','dry_run_plan','readiness_gate','approval_binding','rollback','evidence','audit','tag_blocker','stable_blocker','production_blocker'];

const BASE = {
  schema_version: 'v335.0', release_execution_command_id: null, release_execution_command_ready: false,
  explicit_command_received: false, release_mode: null, release_domains_count: 0, release_execution_command_hash: null,
  release_execution_allowed: false, deployment_execution_allowed: false, deployment_scope_bound: false,
  release_artifact_published: false, deployment_dry_run_completed: false, release_execution_ready: false,
  release_execution_approved: false, deployment_evidence_published: false, release_rollback_bound: false,
  release_authority_granted: false, release_execution_phase_passed: false,
  product_activation_execution_allowed: false, production_touch_allowed: false,
  activation_execution_phase_passed: false,
  product_activation_allowed: false, saas_enablement_allowed: false, production_readiness_confirmed: false,
  activation_dry_run_completed: false, activation_risk_accepted: false, activation_authority_granted: false, product_activation_phase_passed: false,
  activation_policy_enforced: false, activation_report_published: false, activation_evidence_published: false,
  activation_execution_dry_run_completed: false, activation_execution_ready: false, activation_execution_approved: false,
  activation_execution_evidence_published: false, activation_rollback_bound: false, activation_execution_authority_granted: false,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT'] };
  if (!input.release_execution_command_id || typeof input.release_execution_command_id !== 'string') return { ...BASE, errors: ['RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT: missing release_execution_command_id'] };
  if (input.controlled_product_activation_execution_phase_gate_ready !== true) return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE: controlled_product_activation_execution_phase_gate_ready must be true'] };
  if (!input.controlled_product_activation_execution_phase_gate_id || typeof input.controlled_product_activation_execution_phase_gate_id !== 'string') return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE: missing controlled_product_activation_execution_phase_gate_id'] };
  if (input.explicit_v335_command !== true) return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_DENIED: explicit_v335_command must be true'] };
  if (!input.requested_by || typeof input.requested_by !== 'string') return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_DENIED: missing requested_by'] };
  if (!input.release_scope || typeof input.release_scope !== 'string') return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_DENIED: missing release_scope'] };
  if (!input.release_mode || !ALLOWED_RELEASE_MODES.includes(input.release_mode)) return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_DENIED: invalid release_mode'] };
  if (!Array.isArray(input.release_domains) || input.release_domains.length === 0) return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_DENIED: release_domains must be non-empty array'] };

  const invalidDomains = input.release_domains.filter(d => !ALLOWED_RELEASE_DOMAINS.includes(d));
  if (invalidDomains.length > 0) return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_DENIED: invalid release_domains: ' + invalidDomains.join(', ')] };

  const missingDomains = REQUIRED_RELEASE_DOMAINS.filter(d => !input.release_domains.includes(d));
  if (missingDomains.length > 0) return { ...BASE, release_execution_command_id: input.release_execution_command_id, errors: ['RELEASE_EXECUTION_COMMAND_DENIED: missing required release_domains: ' + missingDomains.join(', ')] };

  const argId = input.release_execution_command_id;
  const h = hash({ argId, phaseGate: input.controlled_product_activation_execution_phase_gate_id, command: input.explicit_v335_command, by: input.requested_by, scope: input.release_scope, mode: input.release_mode, domains: input.release_domains });
  return { ...BASE, release_execution_command_id: argId, release_execution_command_ready: true, explicit_command_received: true, release_mode: input.release_mode, release_domains_count: input.release_domains.length, release_execution_command_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid release execution command contract'] };
  const e = []; if (!result.release_execution_command_id) e.push('missing release_execution_command_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','product_activation_execution_allowed','production_touch_allowed','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','activation_execution_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT';
  const status = result.release_execution_command_ready ? 'RELEASE_EXECUTION_COMMAND_READY' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_COMMAND_DENIED')) ? 'RELEASE_EXECUTION_COMMAND_DENIED' :
    result.errors?.some(e => e.startsWith('RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE')) ? 'RELEASE_EXECUTION_COMMAND_BLOCKED_PHASE' : 'RELEASE_EXECUTION_COMMAND_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrelease_execution_command_id: ${result.release_execution_command_id || '(none)'}\nrelease_execution_command_ready: ${result.release_execution_command_ready}\nexplicit_command_received: ${result.explicit_command_received}\nrelease_mode: ${result.release_mode || '(none)'}\nrelease_domains_count: ${result.release_domains_count}\n`;
  if (result.release_execution_command_hash) out += `release_execution_command_hash: ${result.release_execution_command_hash}\n`;
  ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','activation_execution_dry_run_completed','activation_execution_ready','activation_execution_approved','activation_execution_evidence_published','activation_rollback_bound','activation_execution_authority_granted','saas_enabled','tenant_isolation_enforced','subscription_active','billing_executed','billing_provider_connected','invoice_generated','customer_created','webhook_registered','saas_policy_enforced','saas_report_published','saas_authority_granted','saas_phase_passed','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}