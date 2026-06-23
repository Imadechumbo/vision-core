import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_COMPLIANCE_CONTROL_MATRIX_STATUSES = [
  'COMPLIANCE_CONTROL_MATRIX_BLOCKED_INPUT',
  'COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS',
  'COMPLIANCE_CONTROL_MATRIX_FAIL',
  'COMPLIANCE_CONTROL_MATRIX_READY',
];

const ALLOWED_CONTROL_TYPES = [
  'pass_gold_required', 'no_secret_access', 'no_deploy', 'no_release',
  'no_stable_promotion', 'no_production_touch', 'no_real_execution',
  'human_approval_required', 'audit_required', 'rollback_required', 'evidence_required',
];

const ALLOWED_SEVERITIES = ['info', 'warning', 'blocking', 'critical'];

const REQUIRED_CONTROL_TYPES = [
  'pass_gold_required', 'no_secret_access', 'no_deploy', 'no_release',
  'no_stable_promotion', 'no_production_touch', 'no_real_execution',
  'human_approval_required', 'audit_required', 'evidence_required',
];

const ALLOWED_COMPLIANCE_MODES = ['contract-only', 'metadata-only', 'planning', 'dry-run'];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v297.0', compliance_matrix_id: null, compliance_control_matrix_ready: false,
  controls_count: 0, required_control_types_count: 0, compliance_mode: null,
  compliance_matrix_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['COMPLIANCE_CONTROL_MATRIX_BLOCKED_INPUT'] };
  if (!input.compliance_matrix_id || typeof input.compliance_matrix_id !== 'string') return { ...BASE, errors: ['COMPLIANCE_CONTROL_MATRIX_BLOCKED_INPUT: missing compliance_matrix_id'] };
  if (input.secrets_access_boundary_contract_ready !== true) return { ...BASE, compliance_matrix_id: input.compliance_matrix_id, errors: ['COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS: secrets_access_boundary_contract_ready must be true'] };
  if (!input.secrets_boundary_id || typeof input.secrets_boundary_id !== 'string') return { ...BASE, compliance_matrix_id: input.compliance_matrix_id, errors: ['COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS: missing secrets_boundary_id'] };
  if (!input.compliance_mode || !ALLOWED_COMPLIANCE_MODES.includes(input.compliance_mode)) return { ...BASE, compliance_matrix_id: input.compliance_matrix_id, errors: ['COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS: invalid compliance_mode'] };
  if (!Array.isArray(input.controls) || input.controls.length === 0) return { ...BASE, compliance_matrix_id: input.compliance_matrix_id, errors: ['COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS: controls must be non-empty array'] };

  const failErrors = [];
  for (let i = 0; i < input.controls.length; i++) {
    const c = input.controls[i];
    if (!c.control_id || typeof c.control_id !== 'string') failErrors.push(`control ${i}: missing control_id`);
    if (!c.control_type || !ALLOWED_CONTROL_TYPES.includes(c.control_type)) failErrors.push(`control ${i}: invalid control_type`);
    if (!c.severity || !ALLOWED_SEVERITIES.includes(c.severity)) failErrors.push(`control ${i}: invalid severity`);
    if (!c.control_hash || !HEX64_RE.test(c.control_hash)) failErrors.push(`control ${i}: control_hash must be 64 hex chars`);
  }
  if (failErrors.length > 0) return { ...BASE, compliance_matrix_id: input.compliance_matrix_id, errors: ['COMPLIANCE_CONTROL_MATRIX_FAIL: ' + failErrors.join('; ')] };

  const requiredTypes = Array.isArray(input.required_control_types) ? input.required_control_types : REQUIRED_CONTROL_TYPES;
  const missingTypes = REQUIRED_CONTROL_TYPES.filter(t => !requiredTypes.includes(t));
  if (missingTypes.length > 0) return { ...BASE, compliance_matrix_id: input.compliance_matrix_id, controls_count: input.controls.length, errors: ['COMPLIANCE_CONTROL_MATRIX_FAIL: missing required control types: ' + missingTypes.join(', ')] };

  const cmId = input.compliance_matrix_id;
  const complianceMatrixHash = hash({ cmId, secrets: input.secrets_boundary_id, controls: input.controls, required: requiredTypes, mode: input.compliance_mode });

  return { ...BASE, compliance_matrix_id: cmId, compliance_control_matrix_ready: true, controls_count: input.controls.length, required_control_types_count: requiredTypes.length, compliance_mode: input.compliance_mode, compliance_matrix_hash: complianceMatrixHash, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid compliance control matrix'] };
  const e = [];
  if (!result.compliance_matrix_id) e.push('missing compliance_matrix_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'COMPLIANCE_CONTROL_MATRIX_BLOCKED_INPUT';
  const status = result.compliance_control_matrix_ready ? 'COMPLIANCE_CONTROL_MATRIX_READY' :
    result.errors?.some(e => e.startsWith('COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS')) ? 'COMPLIANCE_CONTROL_MATRIX_BLOCKED_SECRETS' :
    result.errors?.some(e => e.startsWith('COMPLIANCE_CONTROL_MATRIX_FAIL')) ? 'COMPLIANCE_CONTROL_MATRIX_FAIL' : 'COMPLIANCE_CONTROL_MATRIX_BLOCKED_INPUT';
  let out = `=== ${status} ===\n`;
  out += `compliance_matrix_id: ${result.compliance_matrix_id || '(none)'}\n`;
  out += `compliance_control_matrix_ready: ${result.compliance_control_matrix_ready}\ncontrols_count: ${result.controls_count}\nrequired_control_types_count: ${result.required_control_types_count}\ncompliance_mode: ${result.compliance_mode || '(none)'}\n`;
  if (result.compliance_matrix_hash) out += `compliance_matrix_hash: ${result.compliance_matrix_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}