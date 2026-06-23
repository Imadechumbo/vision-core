import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SECURITY_SCAN_DRY_RUN_STATUSES = [
  'SECURITY_SCAN_DRY_RUN_BLOCKED_INPUT',
  'SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE',
  'SECURITY_SCAN_DRY_RUN_FAIL',
  'SECURITY_SCAN_DRY_RUN_READY',
];

const ALLOWED_TARGET_TYPES = [
  'dependency_manifest', 'source_metadata', 'policy_metadata', 'runtime_metadata',
  'dashboard_metadata', 'project_registry_metadata', 'evidence_metadata', 'audit_metadata',
];

const ALLOWED_SCAN_MODES = ['metadata-only', 'dry-run', 'planning'];

const REQUIRED_SCAN_CONTROLS = [
  'no-secret-read', 'no-filesystem-write', 'no-network', 'no-runtime-execution',
  'no-production-touch', 'evidence-required', 'audit-required',
];

const ALLOWED_SCAN_LEVELS = ['contract-only', 'metadata-only', 'dry-run', 'planning'];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v298.0', security_scan_id: null, security_scan_dry_run_contract_ready: false,
  scan_targets_count: 0, required_scan_controls_count: 0, scan_level: null, security_scan_hash: null,
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
  if (!input || typeof input !== 'object') return { ...BASE, errors: ['SECURITY_SCAN_DRY_RUN_BLOCKED_INPUT'] };
  if (!input.security_scan_id || typeof input.security_scan_id !== 'string') return { ...BASE, errors: ['SECURITY_SCAN_DRY_RUN_BLOCKED_INPUT: missing security_scan_id'] };
  if (input.compliance_control_matrix_ready !== true) return { ...BASE, security_scan_id: input.security_scan_id, errors: ['SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE: compliance_control_matrix_ready must be true'] };
  if (!input.compliance_matrix_id || typeof input.compliance_matrix_id !== 'string') return { ...BASE, security_scan_id: input.security_scan_id, errors: ['SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE: missing compliance_matrix_id'] };
  if (!input.scan_level || !ALLOWED_SCAN_LEVELS.includes(input.scan_level)) return { ...BASE, security_scan_id: input.security_scan_id, errors: ['SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE: invalid scan_level'] };
  if (!Array.isArray(input.scan_targets) || input.scan_targets.length === 0) return { ...BASE, security_scan_id: input.security_scan_id, errors: ['SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE: scan_targets must be non-empty array'] };

  const failErrors = [];
  for (let i = 0; i < input.scan_targets.length; i++) {
    const t = input.scan_targets[i];
    if (!t.target_id || typeof t.target_id !== 'string') failErrors.push(`target ${i}: missing target_id`);
    if (!t.target_type || !ALLOWED_TARGET_TYPES.includes(t.target_type)) failErrors.push(`target ${i}: invalid target_type`);
    if (!t.scan_mode || !ALLOWED_SCAN_MODES.includes(t.scan_mode)) failErrors.push(`target ${i}: invalid scan_mode`);
    if (!t.target_hash || !HEX64_RE.test(t.target_hash)) failErrors.push(`target ${i}: target_hash must be 64 hex chars`);
  }
  if (failErrors.length > 0) return { ...BASE, security_scan_id: input.security_scan_id, errors: ['SECURITY_SCAN_DRY_RUN_FAIL: ' + failErrors.join('; ')] };

  const controls = Array.isArray(input.required_scan_controls) ? input.required_scan_controls : REQUIRED_SCAN_CONTROLS;
  const missingControls = REQUIRED_SCAN_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) return { ...BASE, security_scan_id: input.security_scan_id, scan_targets_count: input.scan_targets.length, errors: ['SECURITY_SCAN_DRY_RUN_FAIL: missing required scan controls: ' + missingControls.join(', ')] };

  const ssId = input.security_scan_id;
  const securityScanHash = hash({ ssId, compliance: input.compliance_matrix_id, targets: input.scan_targets, controls, level: input.scan_level });

  return { ...BASE, security_scan_id: ssId, security_scan_dry_run_contract_ready: true, scan_targets_count: input.scan_targets.length, required_scan_controls_count: controls.length, scan_level: input.scan_level, security_scan_hash: securityScanHash, errors: [] };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid security scan dry-run contract'] };
  const e = [];
  if (!result.security_scan_id) e.push('missing security_scan_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SECURITY_SCAN_DRY_RUN_BLOCKED_INPUT';
  const status = result.security_scan_dry_run_contract_ready ? 'SECURITY_SCAN_DRY_RUN_READY' :
    result.errors?.some(e => e.startsWith('SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE')) ? 'SECURITY_SCAN_DRY_RUN_BLOCKED_COMPLIANCE' :
    result.errors?.some(e => e.startsWith('SECURITY_SCAN_DRY_RUN_FAIL')) ? 'SECURITY_SCAN_DRY_RUN_FAIL' : 'SECURITY_SCAN_DRY_RUN_BLOCKED_INPUT';
  let out = `=== ${status} ===\nsecurity_scan_id: ${result.security_scan_id || '(none)'}\nsecurity_scan_dry_run_contract_ready: ${result.security_scan_dry_run_contract_ready}\nscan_targets_count: ${result.scan_targets_count}\nrequired_scan_controls_count: ${result.required_scan_controls_count}\nscan_level: ${result.scan_level || '(none)'}\n`;
  if (result.security_scan_hash) out += `security_scan_hash: ${result.security_scan_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}