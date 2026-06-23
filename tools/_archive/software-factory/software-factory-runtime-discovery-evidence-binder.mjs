import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-2';

export const STATUSES = Object.freeze({
  READY: 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_READY',
  BLOCKED_INPUT: 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_BLOCKED_INPUT',
  BLOCKED_DISCOVERY_PLAN: 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_BLOCKED_DISCOVERY_PLAN',
  FAIL: 'RUNTIME_DISCOVERY_EVIDENCE_BINDER_FAIL'
});

function validateEvidenceBinder(evidence_binder) {
  if (!evidence_binder || typeof evidence_binder !== 'object') {
    return { valid: false, errors: ['INPUT_NOT_OBJECT'] };
  }

  const requiredFields = [
    'package_scripts_inventory_bound',
    'local_boot_command_candidates_bound',
    'health_endpoint_candidates_bound',
    'readiness_endpoint_candidates_bound',
    'version_endpoint_candidates_bound',
    'smoke_test_candidates_bound',
    'rollback_readiness_candidates_bound',
    'watchdog_signal_candidates_bound',
    'evidence_capture_plan_bound',
    'no_runtime_execution_bound',
    'no_network_probe_bound',
    'no_production_target_bound',
    'no_secret_loading_bound',
    'no_deploy_release_or_stable_bound',
    'v471_blocked_bound'
  ];

  const missingFields = requiredFields.filter(field => evidence_binder[field] !== true);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      errors: missingFields.map(field => `REQUIRED_EVIDENCE_BINDER_FIELD_NOT_TRUE: ${field}`)
    };
  }

  return { valid: true };
}

function validateEvidenceReceipts(evidence_receipts) {
  const requiredReceiptIds = [
    'package-scripts-inventory-receipt',
    'local-boot-command-candidates-receipt',
    'health-endpoint-candidates-receipt',
    'readiness-endpoint-candidates-receipt',
    'version-endpoint-candidates-receipt',
    'smoke-test-candidates-receipt',
    'rollback-readiness-candidates-receipt',
    'watchdog-signal-candidates-receipt',
    'evidence-capture-plan-receipt',
    'no-runtime-execution-receipt',
    'no-network-probe-receipt',
    'no-production-target-receipt',
    'no-secret-loading-receipt',
    'no-deploy-release-stable-receipt',
    'v471-blocked-receipt'
  ];

  if (!evidence_receipts || !Array.isArray(evidence_receipts)) {
    return { valid: false, errors: ['INPUT_NOT_OBJECT'] };
  }

  const errors = [];

  const receiptIds = evidence_receipts.map(receipt => receipt?.id).filter(Boolean);
  const missingRequiredReceipts = requiredReceiptIds.filter(id => !receiptIds.includes(id));
  
  if (missingRequiredReceipts.length > 0) {
    errors.push(...missingRequiredReceipts.map(id => `MISSING_REQUIRED_EVIDENCE_RECEIPT: ${id}`));
  }

  evidence_receipts.forEach((receipt, index) => {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
      errors.push(`INVALID_EVIDENCE_RECEIPT`);
      return;
    }

    if (!receipt.id || typeof receipt.id !== 'string' || receipt.id.trim() === '') {
      errors.push(`INVALID_EVIDENCE_RECEIPT`);
      return;
    }

    if (!receipt.type || typeof receipt.type !== 'string' || receipt.type.trim() === '') {
      errors.push(`INVALID_EVIDENCE_RECEIPT`);
      return;
    }

    if (receipt.bound !== true) {
      errors.push(`INVALID_EVIDENCE_RECEIPT`);
      return;
    }

    if (receipt.execution_performed !== false) {
      errors.push(`EVIDENCE_RECEIPT_MUST_NOT_EXECUTE: ${receipt.id}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateRequiredControls(required_controls) {
  const requiredControlList = [
    'rta1-required',
    'runtime-discovery-evidence-only',
    'evidence-binding-only',
    'no-runtime-execution',
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
    supervised_runtime_discovery_plan_ready: input.supervised_runtime_discovery_plan_ready,
    evidence_binder: input.evidence_binder,
    evidence_receipts: input.evidence_receipts,
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

  if (input.supervised_runtime_discovery_plan_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_DISCOVERY_PLAN,
      ready: false,
      errors: ['SUPERVISED_RUNTIME_DISCOVERY_PLAN_NOT_READY']
    };
  }

  // Validate input types first before content validation
  if (!input.evidence_binder || typeof input.evidence_binder !== 'object') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  if (!input.evidence_receipts || !Array.isArray(input.evidence_receipts)) {
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
  const evidenceBinderValidation = validateEvidenceBinder(input.evidence_binder);
  if (!evidenceBinderValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: evidenceBinderValidation.errors
    };
  }

  const receiptsValidation = validateEvidenceReceipts(input.evidence_receipts);
  if (!receiptsValidation.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: receiptsValidation.errors
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
    runtime_discovery_evidence_binder_ready: true,
    supervised_runtime_discovery_plan_ready: true,
    runtime_execution_authorized: false,
    runtime_discovery_execution_allowed: false,
    evidence_binding_only: true,
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
    final_message: 'RTA-2 runtime discovery evidence binder prepared. Evidence binding remains metadata-only; runtime execution requires explicit human authorization.'
  };
}

export function validate(result) {
  if (!result || result.status !== STATUSES.READY) {
    return false;
  }

  return (
    result.runtime_discovery_evidence_binder_ready === true &&
    result.evidence_binding_only === true &&
    result.runtime_execution_authorized === false &&
    result.runtime_discovery_execution_allowed === false &&
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
RTA-2 Runtime Discovery Evidence Binder
RTA-1 supervised discovery
evidence binding remains metadata-only
runtime execution requires explicit human authorization
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