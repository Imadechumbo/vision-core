import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-9';

export const STATUSES = Object.freeze({
  READY: 'RUNTIME_AUTHORIZATION_PHASE_GATE_READY',
  BLOCKED_INPUT: 'RUNTIME_AUTHORIZATION_PHASE_GATE_BLOCKED_INPUT',
  BLOCKED_HUMAN_AUTH: 'RUNTIME_AUTHORIZATION_PHASE_GATE_BLOCKED_HUMAN_AUTH',
  FAIL: 'RUNTIME_AUTHORIZATION_PHASE_GATE_FAIL'
});

function validateHumanRuntimeAuthorizationGate(human_runtime_authorization_gate) {
  if (human_runtime_authorization_gate !== true) {
    return { valid: false, errors: ['HUMAN_RUNTIME_AUTHORIZATION_GATE_NOT_READY'] };
  }
  return { valid: true };
}

function validateRTAChain(rta_chain_metadata) {
  const requiredRTAs = ['RTA-0', 'RTA-1', 'RTA-2', 'RTA-3', 'RTA-4', 'RTA-5', 'RTA-6', 'RTA-7', 'RTA-8'];
  
  if (!rta_chain_metadata || typeof rta_chain_metadata !== 'object') {
    return { valid: false, errors: ['RTA_CHAIN_METADATA_REQUIRED'] };
  }

  const missingRTAs = requiredRTAs.filter(rta => !rta_chain_metadata[rta]);
  
  if (missingRTAs.length > 0) {
    return {
      valid: false,
      errors: missingRTAs.map(rta => `MISSING_RTA_METADATA: ${rta}`)
    };
  }

  return { valid: true };
}

function validateRequiredControls(required_controls) {
  const requiredControlList = [
    'rta8-required',
    'runtime-authorization-phase-gate-only',
    'rta-final-gate',
    'rta-gate-sequence-complete',
    'next-path-required',
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
    'v471-blocked'
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
    human_runtime_authorization_gate_ready: input.human_runtime_authorization_gate_ready,
    rta_chain_metadata: input.rta_chain_metadata,
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

  if (input.human_runtime_authorization_gate_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_HUMAN_AUTH,
      ready: false,
      errors: ['HUMAN_RUNTIME_AUTHORIZATION_GATE_NOT_READY']
    };
  }

  if (!input.rta_chain_metadata || typeof input.rta_chain_metadata !== 'object') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: ['RTA_CHAIN_METADATA_REQUIRED']
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

  const humanAuthValidation = validateHumanRuntimeAuthorizationGate(input.human_runtime_authorization_gate_ready);
  if (!humanAuthValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: humanAuthValidation.errors
    };
  }

  const rtaChainValidation = validateRTAChain(input.rta_chain_metadata);
  if (!rtaChainValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: rtaChainValidation.errors
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
    runtime_authorization_phase_gate_ready: true,
    human_runtime_authorization_gate_ready: true,
    rta_final_gate: true,
    rta10_allowed: false,
    rta_gate_sequence_complete: true,
    next_path_required: true,
    allowed_next_paths: ['RTP', 'RC'],
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
    final_message: 'RTA-9 runtime authorization phase gate prepared. RTA gate sequence is complete; next step must choose RTP execution path or RC controlled closure path.'
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) {
    return false;
  }

  return (
    result.runtime_authorization_phase_gate_ready === true &&
    result.human_runtime_authorization_gate_ready === true &&
    result.rta_final_gate === true &&
    result.rta10_allowed === false &&
    result.rta_gate_sequence_complete === true &&
    result.next_path_required === true &&
    result.allowed_next_paths &&
    result.allowed_next_paths.length === 2 &&
    result.allowed_next_paths.includes('RTP') &&
    result.allowed_next_paths.includes('RC') &&
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
RTA-9 Runtime Authorization Phase Gate
FINAL RTA GATE
RTA gate sequence is complete
NO RTA-10 ALLOWED
RTP execution path or RC controlled closure path
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