import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-7';

export const STATUSES = Object.freeze({
  READY: 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_READY',
  BLOCKED_INPUT: 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_BLOCKED_INPUT',
  BLOCKED_EVIDENCE_CONTRACT: 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_BLOCKED_EVIDENCE_CONTRACT',
  FAIL: 'LOCAL_RUNTIME_DISCOVERY_DRY_RUN_GATE_FAIL'
});

function validateRuntimeEvidenceReceiptContract(runtime_evidence_receipt_contract) {
  if (runtime_evidence_receipt_contract !== true) {
    return { valid: false, errors: ['RUNTIME_EVIDENCE_RECEIPT_CONTRACT_NOT_READY'] };
  }
  return { valid: true };
}

function validateRequiredControls(required_controls) {
  const requiredControlList = [
    'rta6-required',
    'runtime-dry-run-gate-only',
    'local-dry-run-gate-only',
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
    runtime_evidence_receipt_contract_ready: input.runtime_evidence_receipt_contract_ready,
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

  if (input.runtime_evidence_receipt_contract_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_EVIDENCE_CONTRACT,
      ready: false,
      errors: ['RUNTIME_EVIDENCE_RECEIPT_CONTRACT_NOT_READY']
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

  const contractValidation = validateRuntimeEvidenceReceiptContract(input.runtime_evidence_receipt_contract_ready);
  if (!contractValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: contractValidation.errors
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
    local_runtime_discovery_dry_run_gate_ready: true,
    runtime_evidence_receipt_contract_ready: true,
    local_dry_run_gate_only: true,
    dry_run_consistency_verified: true,
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
    final_message: 'RTA-7 local runtime discovery dry-run gate prepared. Dry-run gate remains metadata-only; runtime execution requires RTA-9 and explicit human authorization.'
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) {
    return false;
  }

  return (
    result.local_runtime_discovery_dry_run_gate_ready === true &&
    result.runtime_evidence_receipt_contract_ready === true &&
    result.local_dry_run_gate_only === true &&
    result.dry_run_consistency_verified === true &&
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
RTA-7 Local Runtime Discovery Dry-Run Gate
RTA-6 evidence contract
dry-run gate remains metadata-only
runtime execution requires RTA-9 and explicit human authorization
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