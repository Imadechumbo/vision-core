import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-8';

export const STATUSES = Object.freeze({
  READY: 'HUMAN_RUNTIME_AUTHORIZATION_GATE_READY',
  BLOCKED_INPUT: 'HUMAN_RUNTIME_AUTHORIZATION_GATE_BLOCKED_INPUT',
  BLOCKED_DRY_RUN_GATE: 'HUMAN_RUNTIME_AUTHORIZATION_GATE_BLOCKED_DRY_RUN_GATE',
  FAIL: 'HUMAN_RUNTIME_AUTHORIZATION_GATE_FAIL'
});

function validateLocalRuntimeDiscoveryDryRunGate(local_runtime_discovery_dry_run_gate) {
  if (local_runtime_discovery_dry_run_gate !== true) {
    return { valid: false, errors: ['LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_NOT_READY'] };
  }
  return { valid: true };
}

function validateHumanAuthorizationMetadata(human_authorization_metadata) {
  if (!human_authorization_metadata || typeof human_authorization_metadata !== 'object') {
    return { valid: false, errors: ['HUMAN_AUTHORIZATION_METADATA_REQUIRED'] };
  }

  if (!human_authorization_metadata.explicit || human_authorization_metadata.explicit !== true) {
    return { valid: false, errors: ['EXPLICIT_AUTHORIZATION_REQUIRED'] };
  }

  if (human_authorization_metadata.implicit !== false) {
    return { valid: false, errors: ['IMPLICIT_AUTHORIZATION_REJECTED'] };
  }

  if (human_authorization_metadata.timeout_consent !== false) {
    return { valid: false, errors: ['TIMEOUT_CONSENT_REJECTED'] };
  }

  if (!human_authorization_metadata.timestamp || typeof human_authorization_metadata.timestamp !== 'string') {
    return { valid: false, errors: ['AUTHORIZATION_TIMESTAMP_REQUIRED'] };
  }

  if (!human_authorization_metadata.principal || typeof human_authorization_metadata.principal !== 'string' || human_authorization_metadata.principal.trim() === '') {
    return { valid: false, errors: ['AUTHORIZATION_PRINCIPAL_REQUIRED'] };
  }

  if (!human_authorization_metadata.scope || !Array.isArray(human_authorization_metadata.scope) || human_authorization_metadata.scope.length === 0) {
    return { valid: false, errors: ['AUTHORIZATION_SCOPE_REQUIRED'] };
  }

  return { valid: true };
}

function validateRequiredControls(required_controls) {
  const requiredControlList = [
    'rta7-required',
    'human-runtime-authorization-gate-only',
    'human-authorization-required',
    'human-authorization-record-required',
    'human-authorization-metadata-only',
    'no-runtime-execution',
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
    'rta9-required-before-execution'
  ];

  if (!required_controls || !Array.isArray(required_controls)) {
    return { valid: false, errors: ['INPUT_NOT_OBJECT'] };
  }

  const missingControls = requiredControlList.filter(control => !required_controls.includes(control));
  
  if (missingControls.length > 0) {
    return {
      valid: false,
      errors: missingControls.map(control => `MISSING_REQUIRED_CONTROL: ${control}`)
    };
  }

  return { valid: true };
}

function generateEvidenceHash(input) {
  const evidenceString = JSON.stringify({
    local_runtime_discovery_dry_run_gate_ready: input.local_runtime_discovery_dry_run_gate_ready,
    human_authorization_metadata: input.human_authorization_metadata,
    required_controls: input.required_controls
  });
  
  return crypto.createHash('sha256').update(evidenceString).digest('hex');
}

export function build(input = {}) {
  if (typeof input !== 'object' || input === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  if (input.local_runtime_discovery_dry_run_gate_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_DRY_RUN_GATE,
      ready: false,
      errors: ['LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_NOT_READY']
    };
  }

  if (!input.human_authorization_metadata || typeof input.human_authorization_metadata !== 'object') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: ['HUMAN_AUTHORIZATION_METADATA_REQUIRED']
    };
  }

  if (!input.required_controls || !Array.isArray(input.required_controls)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  const dryRunGateValidation = validateLocalRuntimeDiscoveryDryRunGate(input.local_runtime_discovery_dry_run_gate_ready);
  if (!dryRunGateValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: dryRunGateValidation.errors
    };
  }

  const authMetadataValidation = validateHumanAuthorizationMetadata(input.human_authorization_metadata);
  if (!authMetadataValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: authMetadataValidation.errors
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
    human_runtime_authorization_gate_ready: true,
    local_runtime_discovery_dry_run_gate_ready: true,
    human_authorization_required: true,
    human_authorization_record_required: true,
    human_authorization_metadata_only: true,
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
    evidence_hash: evidence_hash,
    final_message: 'RTA-8 human runtime authorization gate prepared. Runtime execution remains blocked until explicit human authorization is bound and RTA-9 validates the phase.'
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) {
    return false;
  }

  return (
    result.human_runtime_authorization_gate_ready === true &&
    result.local_runtime_discovery_dry_run_gate_ready === true &&
    result.human_authorization_required === true &&
    result.human_authorization_record_required === true &&
    result.human_authorization_metadata_only === true &&
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
    result.rta9_required_before_execution === true &&
    result.evidence_hash &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  return `
RTA-8 Human Runtime Authorization Gate
human authorization required
runtime execution remains blocked until explicit human authorization is bound and RTA-9 validates the phase
V471 blocked
${result.final_message}
REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.
`.trim();
}

export default {
  STATUSES,
  build,
  validate,
  render
};