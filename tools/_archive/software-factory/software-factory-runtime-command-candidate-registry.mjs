import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-3';

export const STATUSES = Object.freeze({
  READY: 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_READY',
  BLOCKED_INPUT: 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_BLOCKED_INPUT',
  BLOCKED_EVIDENCE_BINDER: 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_BLOCKED_EVIDENCE_BINDER',
  FAIL: 'RUNTIME_COMMAND_CANDIDATE_REGISTRY_FAIL'
});

function validateCommandCandidateRegistry(command_candidate_registry) {
  const requiredFields = [
    'package_scripts_candidates_registered',
    'local_boot_command_candidates_registered',
    'health_endpoint_candidates_registered',
    'readiness_endpoint_candidates_registered',
    'version_endpoint_candidates_registered',
    'smoke_test_candidates_registered',
    'rollback_readiness_candidates_registered',
    'watchdog_signal_candidates_registered',
    'candidate_execution_policy_registered',
    'no_command_execution',
    'no_endpoint_probe',
    'no_network_probe',
    'no_production_target',
    'no_secret_loading',
    'no_deploy_release_or_stable',
    'v471_remains_blocked'
  ];

  const missingFields = requiredFields.filter(field => command_candidate_registry[field] !== true);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      errors: missingFields.map(field => `REQUIRED_COMMAND_REGISTRY_FIELD_NOT_TRUE: ${field}`)
    };
  }

  return { valid: true };
}

function validateCandidates(candidates) {
  const requiredCandidateIds = [
    'package-scripts-candidate',
    'local-boot-command-candidate',
    'health-endpoint-candidate',
    'readiness-endpoint-candidate',
    'version-endpoint-candidate',
    'smoke-test-candidate',
    'rollback-readiness-candidate',
    'watchdog-signal-candidate'
  ];

  if (!candidates || !Array.isArray(candidates)) {
    return { valid: false, errors: ['INPUT_NOT_OBJECT'] };
  }

  const errors = [];

  const candidateIds = candidates.map(candidate => candidate?.id).filter(Boolean);
  const missingRequiredCandidates = requiredCandidateIds.filter(id => !candidateIds.includes(id));
  
  if (missingRequiredCandidates.length > 0) {
    errors.push(...missingRequiredCandidates.map(id => `MISSING_REQUIRED_RUNTIME_COMMAND_CANDIDATE: ${id}`));
  }

  candidates.forEach((candidate, index) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      errors.push(`INVALID_RUNTIME_COMMAND_CANDIDATE`);
      return;
    }

    if (!candidate.id || typeof candidate.id !== 'string' || candidate.id.trim() === '') {
      errors.push(`INVALID_RUNTIME_COMMAND_CANDIDATE`);
      return;
    }

    if (!candidate.type || typeof candidate.type !== 'string' || candidate.type.trim() === '') {
      errors.push(`INVALID_RUNTIME_COMMAND_CANDIDATE`);
      return;
    }

    if (!candidate.source || typeof candidate.source !== 'string' || candidate.source.trim() === '') {
      errors.push(`INVALID_RUNTIME_COMMAND_CANDIDATE`);
      return;
    }

    if (!candidate.command_or_endpoint || typeof candidate.command_or_endpoint !== 'string' || candidate.command_or_endpoint.trim() === '') {
      errors.push(`INVALID_RUNTIME_COMMAND_CANDIDATE`);
      return;
    }

    if (candidate.execution_allowed !== false) {
      errors.push(`CANDIDATE_EXECUTION_MUST_REMAIN_BLOCKED: ${candidate.id}`);
    }

    if (candidate.production_target !== false) {
      errors.push(`CANDIDATE_MUST_NOT_TARGET_PRODUCTION: ${candidate.id}`);
    }

    if (candidate.requires_human_authorization !== true) {
      errors.push(`CANDIDATE_REQUIRES_HUMAN_AUTHORIZATION: ${candidate.id}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateRequiredControls(required_controls) {
  const requiredControlList = [
    'rta2-required',
    'runtime-command-candidate-registry-only',
    'command-registration-only',
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
    runtime_discovery_evidence_binder_ready: input.runtime_discovery_evidence_binder_ready,
    command_candidate_registry: input.command_candidate_registry,
    candidates: input.candidates,
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

  if (input.runtime_discovery_evidence_binder_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_EVIDENCE_BINDER,
      ready: false,
      errors: ['RUNTIME_DISCOVERY_EVIDENCE_BINDER_NOT_READY']
    };
  }

  // Validate input types first before content validation
  if (!input.command_candidate_registry || typeof input.command_candidate_registry !== 'object') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  if (!input.candidates || !Array.isArray(input.candidates)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
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

  // Now validate content
  const registryValidation = validateCommandCandidateRegistry(input.command_candidate_registry);
  if (!registryValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: registryValidation.errors
    };
  }

  const candidatesValidation = validateCandidates(input.candidates);
  if (!candidatesValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: candidatesValidation.errors
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
    runtime_command_candidate_registry_ready: true,
    runtime_discovery_evidence_binder_ready: true,
    command_registration_only: true,
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
    evidence_hash: evidence_hash,
    final_message: 'RTA-3 runtime command candidate registry prepared. Command and endpoint execution remain blocked until explicit human authorization.'
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) {
    return false;
  }

  return (
    result.runtime_command_candidate_registry_ready === true &&
    result.command_registration_only === true &&
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
    result.evidence_hash &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  return `
RTA-3 Runtime Command Candidate Registry
RTA-2 evidence binder
command and endpoint execution remain blocked
explicit human authorization
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