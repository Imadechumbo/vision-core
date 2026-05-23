import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ENTERPRISE_SECURITY_POLICY_BINDING_STATUSES = [
  'ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_INPUT',
  'ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK',
  'ENTERPRISE_SECURITY_POLICY_BINDING_FAIL',
  'ENTERPRISE_SECURITY_POLICY_BINDING_READY',
];

const ALLOWED_BINDING_MODES = ['contract-only', 'metadata-only', 'dry-run', 'planning'];
const ALLOWED_BINDING_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const REQUIRED_POLICY_CONTROLS = [
  'pass-gold-required', 'no-secret-access', 'no-production-touch', 'no-deploy', 'no-release',
  'no-stable-promotion', 'no-runtime-execution', 'human-approval-required', 'audit-required', 'evidence-required',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v300.0', security_policy_binding_id: null, enterprise_security_policy_binding_ready: false,
  policy_bindings_count: 0, required_policy_controls_count: 0, binding_level: null, security_policy_binding_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_INPUT'] };
  if (!input.security_policy_binding_id || typeof input.security_policy_binding_id !== 'string') return { ...BASE, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_INPUT: missing security_policy_binding_id'] };
  if (input.enterprise_risk_classification_gate_ready !== true) return { ...BASE, security_policy_binding_id: input.security_policy_binding_id, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK: enterprise_risk_classification_gate_ready must be true'] };
  if (!input.risk_gate_id || typeof input.risk_gate_id !== 'string') return { ...BASE, security_policy_binding_id: input.security_policy_binding_id, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK: missing risk_gate_id'] };
  if (!input.binding_level || !ALLOWED_BINDING_LEVELS.includes(input.binding_level)) return { ...BASE, security_policy_binding_id: input.security_policy_binding_id, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK: invalid binding_level'] };
  if (!Array.isArray(input.policy_bindings) || input.policy_bindings.length === 0) return { ...BASE, security_policy_binding_id: input.security_policy_binding_id, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK: policy_bindings must be non-empty array'] };

  const failErrors = [];
  for (let i = 0; i < input.policy_bindings.length; i++) {
    const b = input.policy_bindings[i];
    if (!b.binding_id || typeof b.binding_id !== 'string') failErrors.push(`binding ${i}: missing binding_id`);
    if (!b.policy_id || typeof b.policy_id !== 'string') failErrors.push(`binding ${i}: missing policy_id`);
    if (!b.risk_id || typeof b.risk_id !== 'string') failErrors.push(`binding ${i}: missing risk_id`);
    if (!b.binding_mode || !ALLOWED_BINDING_MODES.includes(b.binding_mode)) failErrors.push(`binding ${i}: invalid binding_mode`);
    if (!b.binding_hash || !HEX64_RE.test(b.binding_hash)) failErrors.push(`binding ${i}: binding_hash must be 64 hex chars`);
  }
  if (failErrors.length > 0) return { ...BASE, security_policy_binding_id: input.security_policy_binding_id, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_FAIL: ' + failErrors.join('; ')] };

  const controls = Array.isArray(input.required_policy_controls) ? input.required_policy_controls : REQUIRED_POLICY_CONTROLS;
  const missingControls = REQUIRED_POLICY_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) return { ...BASE, security_policy_binding_id: input.security_policy_binding_id, policy_bindings_count: input.policy_bindings.length, errors: ['ENTERPRISE_SECURITY_POLICY_BINDING_FAIL: missing required policy controls: ' + missingControls.join(', ')] };

  const spbId = input.security_policy_binding_id;
  const h = hash({ spbId, risk: input.risk_gate_id, bindings: input.policy_bindings, controls, level: input.binding_level });
  return { ...BASE, security_policy_binding_id: spbId, enterprise_security_policy_binding_ready: true, policy_bindings_count: input.policy_bindings.length, required_policy_controls_count: controls.length, binding_level: input.binding_level, security_policy_binding_hash: h, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid enterprise security policy binding'] };
  const e = []; if (!result.security_policy_binding_id) e.push('missing security_policy_binding_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_INPUT';
  const status = result.enterprise_security_policy_binding_ready ? 'ENTERPRISE_SECURITY_POLICY_BINDING_READY' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK')) ? 'ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_RISK' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_SECURITY_POLICY_BINDING_FAIL')) ? 'ENTERPRISE_SECURITY_POLICY_BINDING_FAIL' : 'ENTERPRISE_SECURITY_POLICY_BINDING_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsecurity_policy_binding_id: ${result.security_policy_binding_id || '(none)'}\nenterprise_security_policy_binding_ready: ${result.enterprise_security_policy_binding_ready}\npolicy_bindings_count: ${result.policy_bindings_count}\nrequired_policy_controls_count: ${result.required_policy_controls_count}\nbinding_level: ${result.binding_level || '(none)'}\n`;
  if (result.security_policy_binding_hash) out += `security_policy_binding_hash: ${result.security_policy_binding_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','security_report_published','enterprise_authority_granted','enterprise_phase_passed','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}