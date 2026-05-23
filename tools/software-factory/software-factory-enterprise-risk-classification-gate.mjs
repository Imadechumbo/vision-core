import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_ENTERPRISE_RISK_CLASSIFICATION_STATUSES = [
  'ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_INPUT',
  'ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN',
  'ENTERPRISE_RISK_CLASSIFICATION_FAIL',
  'ENTERPRISE_RISK_CLASSIFICATION_READY',
];

const ALLOWED_RISK_TYPES = [
  'secret_exposure', 'dependency_risk', 'production_touch', 'deployment_risk',
  'release_risk', 'runtime_execution', 'policy_bypass', 'compliance_gap', 'audit_gap', 'rollback_gap',
];

const ALLOWED_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical', 'blocking'];

const REQUIRED_RISK_CONTROLS = [
  'no-secret-exposure', 'no-production-touch', 'no-deploy', 'no-release',
  'no-stable-promotion', 'no-runtime-execution', 'no-policy-bypass',
  'audit-required', 'rollback-required', 'human-approval-required',
];

const ALLOWED_RISK_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v299.0', risk_gate_id: null, enterprise_risk_classification_gate_ready: false,
  risk_items_count: 0, required_risk_controls_count: 0, risk_level: null, risk_classification_hash: null,
  enterprise_security_enabled: false, compliance_enforced: false, security_scan_executed: false,
  secrets_accessed: false, security_policy_enforced: false,
  dashboard_enabled: false, dashboard_deployed: false, multi_project_enabled: false,
  policy_enforced: false, audit_ledger_written: false, projection_published: false,
  release_allowed: false, deploy_allowed: false, stable_allowed: false, tag_allowed: false,
  real_execution_allowed: false, runtime_execution_allowed: false, runtime_mission_executed: false,
  real_pr_creation_allowed: false, real_patch_execution_allowed: false, real_patch_applied: false,
  production_touched: false, errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

export function build(input) {
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_INPUT'] };
  if (!input.risk_gate_id || typeof input.risk_gate_id !== 'string') return { ...BASE, errors: ['ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_INPUT: missing risk_gate_id'] };
  if (input.security_scan_dry_run_contract_ready !== true) return { ...BASE, risk_gate_id: input.risk_gate_id, errors: ['ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN: security_scan_dry_run_contract_ready must be true'] };
  if (!input.security_scan_id || typeof input.security_scan_id !== 'string') return { ...BASE, risk_gate_id: input.risk_gate_id, errors: ['ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN: missing security_scan_id'] };
  if (!input.risk_level || !ALLOWED_RISK_LEVELS.includes(input.risk_level)) return { ...BASE, risk_gate_id: input.risk_gate_id, errors: ['ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN: invalid risk_level'] };
  if (!Array.isArray(input.risk_items) || input.risk_items.length === 0) return { ...BASE, risk_gate_id: input.risk_gate_id, errors: ['ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN: risk_items must be non-empty array'] };

  const failErrors = [];
  for (let i = 0; i < input.risk_items.length; i++) {
    const r = input.risk_items[i];
    if (!r.risk_id || typeof r.risk_id !== 'string') failErrors.push(`risk ${i}: missing risk_id`);
    if (!r.risk_type || !ALLOWED_RISK_TYPES.includes(r.risk_type)) failErrors.push(`risk ${i}: invalid risk_type`);
    if (!r.severity || !ALLOWED_SEVERITIES.includes(r.severity)) failErrors.push(`risk ${i}: invalid severity`);
    if (!r.risk_hash || !HEX64_RE.test(r.risk_hash)) failErrors.push(`risk ${i}: risk_hash must be 64 hex chars`);
  }
  if (failErrors.length > 0) return { ...BASE, risk_gate_id: input.risk_gate_id, errors: ['ENTERPRISE_RISK_CLASSIFICATION_FAIL: ' + failErrors.join('; ')] };

  const controls = Array.isArray(input.required_risk_controls) ? input.required_risk_controls : REQUIRED_RISK_CONTROLS;
  const missingControls = REQUIRED_RISK_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) return { ...BASE, risk_gate_id: input.risk_gate_id, risk_items_count: input.risk_items.length, errors: ['ENTERPRISE_RISK_CLASSIFICATION_FAIL: missing required risk controls: ' + missingControls.join(', ')] };

  const rgId = input.risk_gate_id;
  const riskClassificationHash = hash({ rgId, scan: input.security_scan_id, items: input.risk_items, controls, level: input.risk_level });

  return { ...BASE, risk_gate_id: rgId, enterprise_risk_classification_gate_ready: true, risk_items_count: input.risk_items.length, required_risk_controls_count: controls.length, risk_level: input.risk_level, risk_classification_hash: riskClassificationHash, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid enterprise risk classification gate'] };
  const e = [];
  if (!result.risk_gate_id) e.push('missing risk_gate_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_INPUT';
  const status = result.enterprise_risk_classification_gate_ready ? 'ENTERPRISE_RISK_CLASSIFICATION_READY' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN')) ? 'ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_SCAN' :
    result.errors?.some(e => e.startsWith('ENTERPRISE_RISK_CLASSIFICATION_FAIL')) ? 'ENTERPRISE_RISK_CLASSIFICATION_FAIL' : 'ENTERPRISE_RISK_CLASSIFICATION_BLOCKED_INPUT';
  let out = `=== ${status} ===\nrisk_gate_id: ${result.risk_gate_id || '(none)'}\nenterprise_risk_classification_gate_ready: ${result.enterprise_risk_classification_gate_ready}\nrisk_items_count: ${result.risk_items_count}\nrequired_risk_controls_count: ${result.required_risk_controls_count}\nrisk_level: ${result.risk_level || '(none)'}\n`;
  if (result.risk_classification_hash) out += `risk_classification_hash: ${result.risk_classification_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}