import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-4';

export const STATUSES = Object.freeze({
  READY: 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_READY',
  BLOCKED_INPUT: 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_BLOCKED_INPUT',
  BLOCKED_CANDIDATE_REGISTRY: 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_BLOCKED_CANDIDATE_REGISTRY',
  FAIL: 'RUNTIME_DISCOVERY_DRY_RUN_MANIFEST_FAIL'
});

const REQUIRED_DRY_RUN_MANIFEST_FIELDS = [
  'package_scripts_manifest_declared',
  'local_boot_manifest_declared',
  'health_endpoint_manifest_declared',
  'readiness_endpoint_manifest_declared',
  'version_endpoint_manifest_declared',
  'smoke_test_manifest_declared',
  'rollback_readiness_manifest_declared',
  'watchdog_signal_manifest_declared',
  'execution_order_declared',
  'evidence_capture_declared',
  'abort_conditions_declared',
  'human_authorization_required',
  'no_command_execution',
  'no_endpoint_probe',
  'no_network_probe',
  'no_production_target',
  'no_secret_loading',
  'no_deploy_release_or_stable',
  'v471_remains_blocked'
];

const REQUIRED_DRY_RUN_STEP_IDS = [
  'package-scripts-inventory-step',
  'local-boot-command-review-step',
  'health-endpoint-review-step',
  'readiness-endpoint-review-step',
  'version-endpoint-review-step',
  'smoke-test-review-step',
  'rollback-readiness-review-step',
  'watchdog-signal-review-step',
  'evidence-capture-review-step',
  'abort-conditions-review-step',
  'human-authorization-review-step',
  'v471-blocked-review-step'
];

const REQUIRED_CONTROL_LIST = [
  'rta3-required',
  'runtime-discovery-dry-run-manifest-only',
  'dry-run-metadata-only',
  'no-command-execution',
  'no-endpoint-probe',
  'no-network-probe',
  'no-production-target',
  'no-secret-loading',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-real-rollback',
  'v471-blocked',
  'human-authorization-required-before-runtime'
];

function validateDryRunManifest(dry_run_manifest) {
  if (!dry_run_manifest || typeof dry_run_manifest !== 'object' || Array.isArray(dry_run_manifest)) {
    return { valid: false, errors: ['MISSING_DRY_RUN_MANIFEST'] };
  }

  const errors = [];
  for (const field of REQUIRED_DRY_RUN_MANIFEST_FIELDS) {
    if (dry_run_manifest[field] !== true) {
      errors.push(`REQUIRED_DRY_RUN_MANIFEST_FIELD_NOT_TRUE: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateDryRunSteps(dry_run_steps) {
  const errors = [];

  const stepIds = dry_run_steps.map(step => step?.id).filter(Boolean);
  for (const id of REQUIRED_DRY_RUN_STEP_IDS) {
    if (!stepIds.includes(id)) {
      errors.push(`MISSING_REQUIRED_DRY_RUN_STEP: ${id}`);
    }
  }

  for (const step of dry_run_steps) {
    if (
      !step ||
      typeof step !== 'object' ||
      Array.isArray(step) ||
      !step.id || typeof step.id !== 'string' || step.id.trim() === '' ||
      !step.type || typeof step.type !== 'string' || step.type.trim() === '' ||
      !step.description || typeof step.description !== 'string' || step.description.trim() === ''
    ) {
      errors.push('INVALID_DRY_RUN_STEP');
      continue;
    }

    if (step.execution_allowed !== false) {
      errors.push(`DRY_RUN_STEP_EXECUTION_MUST_REMAIN_BLOCKED: ${step.id}`);
    }

    if (step.endpoint_probe_allowed !== false) {
      errors.push(`DRY_RUN_STEP_ENDPOINT_PROBE_MUST_REMAIN_BLOCKED: ${step.id}`);
    }

    if (step.production_target !== false) {
      errors.push(`DRY_RUN_STEP_MUST_NOT_TARGET_PRODUCTION: ${step.id}`);
    }

    if (step.requires_human_authorization !== true) {
      errors.push(`DRY_RUN_STEP_REQUIRES_HUMAN_AUTHORIZATION: ${step.id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateRequiredControls(required_controls) {
  const missing = REQUIRED_CONTROL_LIST.filter(c => !required_controls.includes(c));
  if (missing.length > 0) {
    return {
      valid: false,
      errors: missing.map(c => `MISSING_REQUIRED_CONTROL: ${c}`)
    };
  }
  return { valid: true };
}

function generateEvidenceHash(input) {
  const evidenceString = JSON.stringify({
    runtime_command_candidate_registry_ready: input.runtime_command_candidate_registry_ready,
    dry_run_manifest: input.dry_run_manifest,
    dry_run_steps: input.dry_run_steps,
    required_controls: input.required_controls
  });
  return crypto.createHash('sha256').update(evidenceString).digest('hex');
}

export function build(input = {}) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  if (input.runtime_command_candidate_registry_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_CANDIDATE_REGISTRY,
      ready: false,
      errors: ['RUNTIME_COMMAND_CANDIDATE_REGISTRY_NOT_READY']
    };
  }

  if (!input.dry_run_manifest || typeof input.dry_run_manifest !== 'object' || Array.isArray(input.dry_run_manifest)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['MISSING_DRY_RUN_MANIFEST']
    };
  }

  if (!Array.isArray(input.dry_run_steps)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['DRY_RUN_STEPS_NOT_ARRAY']
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

  const manifestValidation = validateDryRunManifest(input.dry_run_manifest);
  if (!manifestValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: manifestValidation.errors
    };
  }

  const stepsValidation = validateDryRunSteps(input.dry_run_steps);
  if (!stepsValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: stepsValidation.errors
    };
  }

  const controlsValidation = validateRequiredControls(input.required_controls);
  if (!controlsValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: controlsValidation.errors
    };
  }

  const evidence_hash = generateEvidenceHash(input);

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    runtime_discovery_dry_run_manifest_ready: true,
    runtime_command_candidate_registry_ready: true,
    dry_run_metadata_only: true,
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
    evidence_hash,
    final_message: 'RTA-4 runtime discovery dry-run manifest prepared. Dry-run remains metadata-only; command and endpoint execution require explicit human authorization.'
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) {
    return false;
  }

  return (
    result.runtime_discovery_dry_run_manifest_ready === true &&
    result.dry_run_metadata_only === true &&
    result.runtime_execution_authorized === false &&
    result.runtime_discovery_execution_allowed === false &&
    result.command_execution_allowed === false &&
    result.endpoint_probe_allowed === false &&
    result.pass_gold_real_achieved === false &&
    result.v471_allowed === false &&
    result.release_allowed === false &&
    result.deploy_allowed === false &&
    result.tag_allowed === false &&
    result.stable_promotion_allowed === false &&
    result.production_touched === false &&
    result.billing_execution_allowed === false &&
    result.secret_access_allowed === false &&
    result.network_allowed === false &&
    result.rollback_execution_allowed === false &&
    typeof result.evidence_hash === 'string' &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  return `
RTA-4 Runtime Discovery Dry-Run Manifest
RTA-3 command candidate registry
dry-run remains metadata-only
command and endpoint execution require explicit human authorization
V471 blocked
${result.final_message}
REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.
`.trim();
}

export default { STATUSES, build, validate, render };
