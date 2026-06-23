import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-5';

export const STATUSES = Object.freeze({
  READY: 'RUNTIME_PROBE_PERMISSION_MATRIX_READY',
  BLOCKED_INPUT: 'RUNTIME_PROBE_PERMISSION_MATRIX_BLOCKED_INPUT',
  BLOCKED_DRY_RUN_MANIFEST: 'RUNTIME_PROBE_PERMISSION_MATRIX_BLOCKED_DRY_RUN_MANIFEST',
  FAIL: 'RUNTIME_PROBE_PERMISSION_MATRIX_FAIL'
});

const REQUIRED_PERMISSION_MATRIX_FIELDS = [
  'runtime_truth_probe_permission_declared',
  'smoke_flow_validator_permission_declared',
  'rollback_readiness_permission_declared',
  'auto_rollback_drill_permission_declared',
  'stable_promotion_permission_declared',
  'pass_gold_receipt_permission_declared',
  'production_watchdog_permission_declared',
  'local_only_scope_declared',
  'production_scope_blocked',
  'command_execution_blocked_until_rta9',
  'endpoint_probe_blocked_until_rta9',
  'human_authorization_required',
  'no_deploy_release_or_stable',
  'no_secret_or_billing_access',
  'no_real_rollback_execution',
  'v471_remains_blocked'
];

const REQUIRED_PROBE_PERMISSION_IDS = [
  'runtime-truth-probe-permission',
  'smoke-flow-validator-permission',
  'rollback-readiness-verifier-permission',
  'auto-rollback-drill-permission',
  'stable-promotion-controller-permission',
  'pass-gold-receipt-permission',
  'production-watchdog-permission'
];

const REQUIRED_CONTROL_LIST = [
  'rta4-required',
  'runtime-probe-permission-matrix-only',
  'permission-declaration-only',
  'no-command-execution',
  'no-endpoint-probe',
  'no-network-probe',
  'no-production-target',
  'no-secret-loading',
  'no-billing-access',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-real-rollback',
  'v471-blocked',
  'rta9-required-before-execution',
  'human-authorization-required-before-runtime'
];

const VALID_PERMISSION_LEVELS = ['blocked-until-rta9', 'human-authorization-required'];

function checkPermissionMatrixStructure(permission_matrix) {
  if (!permission_matrix || typeof permission_matrix !== 'object' || Array.isArray(permission_matrix)) {
    return { valid: false, errors: ['MISSING_PERMISSION_MATRIX'] };
  }
  return { valid: true, errors: [] };
}

function validatePermissionMatrixFields(permission_matrix) {
  const errors = [];
  for (const field of REQUIRED_PERMISSION_MATRIX_FIELDS) {
    if (permission_matrix[field] !== true) {
      errors.push(`REQUIRED_PERMISSION_MATRIX_FIELD_NOT_TRUE: ${field}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateProbePermissions(probe_permissions) {
  const errors = [];

  if (!Array.isArray(probe_permissions)) {
    return { valid: false, errors: ['PROBE_PERMISSIONS_NOT_ARRAY'] };
  }

  for (const perm of probe_permissions) {
    if (
      !perm ||
      typeof perm !== 'object' ||
      typeof perm.id !== 'string' || perm.id.trim() === '' ||
      typeof perm.proof !== 'string' || perm.proof.trim() === '' ||
      typeof perm.scope !== 'string' || perm.scope.trim() === '' ||
      !VALID_PERMISSION_LEVELS.includes(perm.permission_level)
    ) {
      errors.push('INVALID_RUNTIME_PROBE_PERMISSION');
      continue;
    }

    if (perm.execution_allowed !== false) {
      errors.push(`PROBE_PERMISSION_EXECUTION_MUST_REMAIN_BLOCKED: ${perm.id}`);
    }

    if (perm.endpoint_probe_allowed !== false) {
      errors.push(`PROBE_PERMISSION_ENDPOINT_PROBE_MUST_REMAIN_BLOCKED: ${perm.id}`);
    }

    if (perm.production_target !== false) {
      errors.push(`PROBE_PERMISSION_MUST_NOT_TARGET_PRODUCTION: ${perm.id}`);
    }

    if (perm.requires_human_authorization !== true) {
      errors.push(`PROBE_PERMISSION_REQUIRES_HUMAN_AUTHORIZATION: ${perm.id}`);
    }
  }

  const presentIds = probe_permissions
    .filter(p => p && typeof p.id === 'string')
    .map(p => p.id);

  for (const requiredId of REQUIRED_PROBE_PERMISSION_IDS) {
    if (!presentIds.includes(requiredId)) {
      errors.push(`MISSING_REQUIRED_RUNTIME_PROBE_PERMISSION: ${requiredId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateControls(required_controls) {
  if (!Array.isArray(required_controls)) {
    return { valid: false, errors: ['REQUIRED_CONTROLS_NOT_ARRAY'] };
  }

  const errors = [];
  for (const control of REQUIRED_CONTROL_LIST) {
    if (!required_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function buildEvidenceHash(input, probe_permissions, required_controls) {
  const payload = JSON.stringify({
    module: MODULE_VERSION,
    runtime_discovery_dry_run_manifest_ready: input.runtime_discovery_dry_run_manifest_ready,
    permission_matrix: input.permission_matrix,
    probe_permission_ids: (probe_permissions || []).map(p => p && p.id).sort(),
    required_controls: [...(required_controls || [])].sort()
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function build(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  if (input.runtime_discovery_dry_run_manifest_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_DRY_RUN_MANIFEST,
      ready: false,
      errors: ['RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_NOT_READY']
    };
  }

  const matrixStructure = checkPermissionMatrixStructure(input.permission_matrix);
  if (!matrixStructure.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: matrixStructure.errors
    };
  }

  const matrixFields = validatePermissionMatrixFields(input.permission_matrix);
  if (!matrixFields.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: matrixFields.errors
    };
  }

  if (!Array.isArray(input.probe_permissions)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['PROBE_PERMISSIONS_NOT_ARRAY']
    };
  }

  if (!Array.isArray(input.required_controls)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['REQUIRED_CONTROLS_NOT_ARRAY']
    };
  }

  const probeResult = validateProbePermissions(input.probe_permissions);
  if (!probeResult.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: probeResult.errors
    };
  }

  const controlResult = validateControls(input.required_controls);
  if (!controlResult.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: controlResult.errors
    };
  }

  const evidence_hash = buildEvidenceHash(input, input.probe_permissions, input.required_controls);

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    runtime_probe_permission_matrix_ready: true,
    runtime_discovery_dry_run_manifest_ready: true,
    permission_matrix_only: true,
    runtime_execution_authorized: false,
    runtime_discovery_execution_allowed: false,
    command_execution_allowed: false,
    endpoint_probe_allowed: false,
    pass_gold_real_achieved: false,
    v471_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    rta9_required_before_execution: true,
    evidence_hash,
    final_message:
      'RTA-5 runtime probe permission matrix prepared. Probe execution remains blocked until RTA-9 and explicit human authorization.'
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.READY) return false;
  if (result.runtime_probe_permission_matrix_ready !== true) return false;
  if (result.permission_matrix_only !== true) return false;
  if (result.runtime_execution_authorized !== false) return false;
  if (result.runtime_discovery_execution_allowed !== false) return false;
  if (result.command_execution_allowed !== false) return false;
  if (result.endpoint_probe_allowed !== false) return false;
  if (result.pass_gold_real_achieved !== false) return false;
  if (result.v471_allowed !== false) return false;
  if (result.release_allowed !== false) return false;
  if (result.deploy_allowed !== false) return false;
  if (result.tag_allowed !== false) return false;
  if (result.stable_promotion_allowed !== false) return false;
  if (result.production_touched !== false) return false;
  if (result.billing_execution_allowed !== false) return false;
  if (result.secret_access_allowed !== false) return false;
  if (result.network_allowed !== false) return false;
  if (result.rollback_execution_allowed !== false) return false;
  if (result.rta9_required_before_execution !== true) return false;
  if (typeof result.evidence_hash !== 'string' || result.evidence_hash.length !== 64) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[RTA-5] Runtime Probe Permission Matrix — no result to render.';
  }

  const lines = [
    '=== RTA-5 Runtime Probe Permission Matrix ===',
    '',
    `Module Version : ${result.module_version ?? 'N/A'}`,
    `Status         : ${result.status ?? 'N/A'}`,
    `Ready          : ${result.ready ?? false}`,
    '',
    '--- Dependency ---',
    `RTA-4 dry-run manifest ready : ${result.runtime_discovery_dry_run_manifest_ready ?? false}`,
    '',
    '--- Permission Matrix Scope ---',
    `Permission matrix only        : ${result.permission_matrix_only ?? false}`,
    '',
    '--- Execution Locks ---',
    `Runtime execution authorized  : ${result.runtime_execution_authorized ?? false}`,
    `Runtime discovery exec allowed: ${result.runtime_discovery_execution_allowed ?? false}`,
    `Command execution allowed     : ${result.command_execution_allowed ?? false}`,
    `Endpoint probe allowed        : ${result.endpoint_probe_allowed ?? false}`,
    `Network allowed               : ${result.network_allowed ?? false}`,
    `Rollback execution allowed    : ${result.rollback_execution_allowed ?? false}`,
    '',
    '--- Release / Deployment Locks ---',
    `Release allowed               : ${result.release_allowed ?? false}`,
    `Deploy allowed                : ${result.deploy_allowed ?? false}`,
    `Tag allowed                   : ${result.tag_allowed ?? false}`,
    `Stable promotion allowed      : ${result.stable_promotion_allowed ?? false}`,
    `Production touched            : ${result.production_touched ?? false}`,
    `Billing execution allowed     : ${result.billing_execution_allowed ?? false}`,
    `Secret access allowed         : ${result.secret_access_allowed ?? false}`,
    '',
    '--- PASS GOLD REAL ---',
    `PASS GOLD REAL achieved       : ${result.pass_gold_real_achieved ?? false}`,
    '',
    '--- V471 ---',
    `V471 allowed                  : ${result.v471_allowed ?? false}`,
    'V471 blocked                  : true',
    '',
    '--- Authorization Gate ---',
    `RTA-9 required before execution     : ${result.rta9_required_before_execution ?? true}`,
    'Probe execution remains blocked until RTA-9 and explicit human authorization.',
    '',
    '--- Evidence ---',
    `Evidence hash : ${result.evidence_hash ?? 'N/A'}`,
    '',
    '--- Final Message ---',
    result.final_message ?? 'N/A',
    '',
    '--- Errors ---',
    ...(result.errors && result.errors.length > 0
      ? result.errors.map(e => `  ERROR: ${e}`)
      : ['  (none)']),
    '',
    '--- REGRA ABSOLUTA ---',
    'REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
    ''
  ];

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
