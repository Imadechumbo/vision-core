import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_SECRETS_ACCESS_BOUNDARY_STATUSES = [
  'SECRETS_ACCESS_BOUNDARY_BLOCKED_INPUT',
  'SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY',
  'SECRETS_ACCESS_BOUNDARY_FAIL',
  'SECRETS_ACCESS_BOUNDARY_READY',
];

const ALLOWED_SECRET_TYPES = [
  'api_key',
  'token',
  'private_key',
  'password',
  'env_var',
  'credential',
  'webhook_secret',
  'signing_secret',
];

const ALLOWED_ACCESS_MODES = [
  'no-access',
  'metadata-only',
  'redacted-only',
];

const REQUIRED_CONTROLS = [
  'no-secret-read',
  'no-secret-write',
  'no-env-read',
  'no-credential-export',
  'no-token-print',
  'no-network-exfiltration',
  'redaction-required',
  'audit-required',
];

const ALLOWED_BOUNDARY_MODES = [
  'contract-only',
  'metadata-only',
  'planning',
  'dry-run',
];

const HEX64_RE = /^[0-9a-f]{64}$/;

const BASE = {
  schema_version: 'v296.0',
  secrets_boundary_id: null,
  secrets_access_boundary_contract_ready: false,
  secret_boundaries_count: 0,
  required_controls_count: 0,
  boundary_mode: null,
  secrets_boundary_hash: null,
  enterprise_security_enabled: false,
  compliance_enforced: false,
  security_scan_executed: false,
  secrets_accessed: false,
  security_policy_enforced: false,
  dashboard_enabled: false,
  dashboard_deployed: false,
  multi_project_enabled: false,
  policy_enforced: false,
  audit_ledger_written: false,
  projection_published: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  runtime_execution_allowed: false,
  runtime_mission_executed: false,
  real_pr_creation_allowed: false,
  real_patch_execution_allowed: false,
  real_patch_applied: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['SECRETS_ACCESS_BOUNDARY_BLOCKED_INPUT'] };
  }
  if (!input.secrets_boundary_id || typeof input.secrets_boundary_id !== 'string') {
    return { ...BASE, errors: ['SECRETS_ACCESS_BOUNDARY_BLOCKED_INPUT: missing secrets_boundary_id'] };
  }
  if (input.enterprise_security_contract_ready !== true) {
    return { ...BASE, secrets_boundary_id: input.secrets_boundary_id, errors: ['SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY: enterprise_security_contract_ready must be true'] };
  }
  if (!input.enterprise_security_contract_id || typeof input.enterprise_security_contract_id !== 'string') {
    return { ...BASE, secrets_boundary_id: input.secrets_boundary_id, errors: ['SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY: missing enterprise_security_contract_id'] };
  }
  if (!input.boundary_mode || !ALLOWED_BOUNDARY_MODES.includes(input.boundary_mode)) {
    return { ...BASE, secrets_boundary_id: input.secrets_boundary_id, errors: ['SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY: invalid boundary_mode'] };
  }
  if (!Array.isArray(input.secret_boundaries) || input.secret_boundaries.length === 0) {
    return { ...BASE, secrets_boundary_id: input.secrets_boundary_id, errors: ['SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY: secret_boundaries must be non-empty array'] };
  }

  const failErrors = [];
  for (let i = 0; i < input.secret_boundaries.length; i++) {
    const b = input.secret_boundaries[i];
    if (!b.boundary_id || typeof b.boundary_id !== 'string') failErrors.push(`boundary ${i}: missing boundary_id`);
    if (!b.secret_type || !ALLOWED_SECRET_TYPES.includes(b.secret_type)) failErrors.push(`boundary ${i}: invalid secret_type`);
    if (!b.access_mode || !ALLOWED_ACCESS_MODES.includes(b.access_mode)) failErrors.push(`boundary ${i}: invalid access_mode`);
    if (!b.boundary_hash || !HEX64_RE.test(b.boundary_hash)) failErrors.push(`boundary ${i}: boundary_hash must be 64 hex chars`);
  }

  if (failErrors.length > 0) {
    return { ...BASE, secrets_boundary_id: input.secrets_boundary_id, errors: ['SECRETS_ACCESS_BOUNDARY_FAIL: ' + failErrors.join('; ')] };
  }

  const controls = Array.isArray(input.required_controls) ? input.required_controls : REQUIRED_CONTROLS;
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) {
    return {
      ...BASE, secrets_boundary_id: input.secrets_boundary_id,
      secret_boundaries_count: input.secret_boundaries.length,
      errors: ['SECRETS_ACCESS_BOUNDARY_FAIL: missing required controls: ' + missingControls.join(', ')],
    };
  }

  const sbId = input.secrets_boundary_id;
  const secretsBoundaryHash = hash({ sbId, security: input.enterprise_security_contract_id, boundaries: input.secret_boundaries, controls, mode: input.boundary_mode });

  return {
    ...BASE, secrets_boundary_id: sbId, secrets_access_boundary_contract_ready: true,
    secret_boundaries_count: input.secret_boundaries.length,
    required_controls_count: controls.length, boundary_mode: input.boundary_mode,
    secrets_boundary_hash: secretsBoundaryHash, errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['invalid secrets access boundary contract'] };
  const e = [];
  if (!result.secrets_boundary_id) e.push('missing secrets_boundary_id');
  ['release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced'].forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors && result.errors.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'SECRETS_ACCESS_BOUNDARY_BLOCKED_INPUT';
  const status = result.secrets_access_boundary_contract_ready ? 'SECRETS_ACCESS_BOUNDARY_READY' :
    result.errors?.some(e => e.startsWith('SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY')) ? 'SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY' :
    result.errors?.some(e => e.startsWith('SECRETS_ACCESS_BOUNDARY_FAIL')) ? 'SECRETS_ACCESS_BOUNDARY_FAIL' : 'SECRETS_ACCESS_BOUNDARY_BLOCKED_INPUT';

  let out = `=== ${status} ===\n`;
  out += `secrets_boundary_id: ${result.secrets_boundary_id || '(none)'}\n`;
  out += `secrets_access_boundary_contract_ready: ${result.secrets_access_boundary_contract_ready}\n`;
  out += `secret_boundaries_count: ${result.secret_boundaries_count}\n`;
  out += `required_controls_count: ${result.required_controls_count}\n`;
  out += `boundary_mode: ${result.boundary_mode || '(none)'}\n`;
  if (result.secrets_boundary_hash) out += `secrets_boundary_hash: ${result.secrets_boundary_hash}\n`;
  ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}