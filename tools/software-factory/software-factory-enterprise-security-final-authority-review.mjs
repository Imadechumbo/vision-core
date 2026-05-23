import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ENTERPRISE_SECURITY_FINAL_REVIEW_STATUSES = [
  'ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_INPUT',
  'ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT',
  'ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED',
  'ENTERPRISE_SECURITY_FINAL_REVIEW_READY',
];

const ALLOWED_AUTHORITY_DECISIONS = ['approved', 'denied', 'blocked'];
const ALLOWED_REVIEW_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const REQUIRED_REVIEW_CONTROLS = [
  'human-authority-required', 'pass-gold-required', 'no-secret-access', 'no-production-touch',
  'no-deploy', 'no-release', 'no-stable-promotion', 'no-runtime-execution', 'evidence-required', 'audit-required',
];

const BASE = {
  schema_version: 'v303.0', enterprise_final_review_id: null, enterprise_security_final_authority_review_ready: false,
  authority_decision: null, authority_id: null, review_mode: null, required_review_controls_count: 0, final_review_hash: null,
  enterprise_security_enabled: false, compliance_enforced: false, security_scan_executed: false,
  secrets_accessed: false, security_policy_enforced: false, security_report_published: false,
  enterprise_authority_granted: false, enterprise_phase_passed: false,
  dashboard_enabled: false, dashboard_deployed: false, multi_project_enabled: false,
  policy_enforced: false, audit_ledger_written: false, projection_published: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false,
  production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_INPUT'] };
  if (!input.enterprise_final_review_id || typeof input.enterprise_final_review_id !== 'string') return { ...BASE, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_INPUT: missing enterprise_final_review_id'] };
  if (input.enterprise_security_report_contract_ready !== true) return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT: enterprise_security_report_contract_ready must be true'] };
  if (!input.enterprise_security_report_id || typeof input.enterprise_security_report_id !== 'string') return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT: missing enterprise_security_report_id'] };
  if (!input.authority_decision || !ALLOWED_AUTHORITY_DECISIONS.includes(input.authority_decision)) return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT: invalid or missing authority_decision'] };
  if (!input.authority_id || typeof input.authority_id !== 'string') return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT: missing authority_id'] };
  if (!input.review_reason || typeof input.review_reason !== 'string') return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT: missing review_reason'] };
  if (!input.review_mode || !ALLOWED_REVIEW_MODES.includes(input.review_mode)) return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT: invalid review_mode'] };

  const controls = Array.isArray(input.required_review_controls) ? input.required_review_controls : REQUIRED_REVIEW_CONTROLS;
  const missingControls = REQUIRED_REVIEW_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED: missing required review controls: ' + missingControls.join(', ')] };

  if (input.authority_decision !== 'approved') return { ...BASE, enterprise_final_review_id: input.enterprise_final_review_id, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, errors: ['ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED: authority_decision is not approved'] };

  const efrId = input.enterprise_final_review_id;
  const h = hash({ efrId, report: input.enterprise_security_report_id, decision: input.authority_decision, authority: input.authority_id, reason: input.review_reason, mode: input.review_mode, controls });
  return { ...BASE, enterprise_final_review_id: efrId, enterprise_security_final_authority_review_ready: true, authority_decision: input.authority_decision, authority_id: input.authority_id, review_mode: input.review_mode, required_review_controls_count: controls.length, final_review_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid enterprise security final authority review'] };
  const e = []; if (!result.enterprise_final_review_id) e.push('missing enterprise_final_review_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_INPUT';
  const status = result.enterprise_security_final_authority_review_ready ? 'ENTERPRISE_SECURITY_FINAL_REVIEW_READY' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT')) ? 'ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_REPORT' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED')) ? 'ENTERPRISE_SECURITY_FINAL_REVIEW_DENIED' : 'ENTERPRISE_SECURITY_FINAL_REVIEW_BLOCKED_INPUT';
  let out = `=== ${status} ===\nenterprise_final_review_id: ${result.enterprise_final_review_id || '(none)'}\nenterprise_security_final_authority_review_ready: ${result.enterprise_security_final_authority_review_ready}\nauthority_decision: ${result.authority_decision || '(none)'}\nauthority_id: ${result.authority_id || '(none)'}\nreview_mode: ${result.review_mode || '(none)'}\nrequired_review_controls_count: ${result.required_review_controls_count}\n`;
  if (result.final_review_hash) out += `final_review_hash: ${result.final_review_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}