import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-6';

export const STATUSES = Object.freeze({
  READY: 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_READY',
  BLOCKED_INPUT: 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_BLOCKED_INPUT',
  BLOCKED_PERMISSION_MATRIX: 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_BLOCKED_PERMISSION_MATRIX',
  FAIL: 'RUNTIME_EVIDENCE_RECEIPT_CONTRACT_FAIL'
});

const REQUIRED_CONTRACT_FIELDS = [
  'runtime_truth_receipt_schema_declared',
  'smoke_flow_receipt_schema_declared',
  'rollback_readiness_receipt_schema_declared',
  'auto_rollback_drill_receipt_schema_declared',
  'stable_promotion_receipt_schema_declared',
  'pass_gold_receipt_schema_declared',
  'production_watchdog_receipt_schema_declared',
  'commit_hash_required',
  'version_required',
  'environment_required',
  'timestamp_required',
  'exit_code_required',
  'stdout_summary_required',
  'stderr_summary_required',
  'evidence_hash_required',
  'human_authority_required',
  'no_runtime_execution',
  'no_command_execution',
  'no_endpoint_probe',
  'no_production_target',
  'no_secret_or_billing_access',
  'v471_remains_blocked'
];

const REQUIRED_SCHEMA_IDS = [
  'runtime-truth-probe-receipt-schema',
  'smoke-flow-validator-receipt-schema',
  'rollback-readiness-verifier-receipt-schema',
  'auto-rollback-drill-receipt-schema',
  'stable-promotion-controller-receipt-schema',
  'pass-gold-receipt-schema',
  'production-watchdog-receipt-schema'
];

const REQUIRED_RECEIPT_FIELDS = [
  'commit_hash',
  'version',
  'environment',
  'timestamp',
  'result',
  'evidence_hash',
  'human_authority'
];

const REQUIRED_CONTROL_LIST = [
  'rta5-required',
  'runtime-evidence-receipt-contract-only',
  'evidence-schema-only',
  'no-runtime-execution',
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

// ---------------------------------------------------------------------------
// Structure checks
// ---------------------------------------------------------------------------

function checkContractStructure(evidence_receipt_contract) {
  if (
    !evidence_receipt_contract ||
    typeof evidence_receipt_contract !== 'object' ||
    Array.isArray(evidence_receipt_contract)
  ) {
    return { valid: false, errors: ['MISSING_EVIDENCE_RECEIPT_CONTRACT'] };
  }
  return { valid: true, errors: [] };
}

function validateContractFields(evidence_receipt_contract) {
  const errors = [];
  for (const field of REQUIRED_CONTRACT_FIELDS) {
    if (evidence_receipt_contract[field] !== true) {
      errors.push(`REQUIRED_EVIDENCE_RECEIPT_CONTRACT_FIELD_NOT_TRUE: ${field}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Receipt schema validation
// ---------------------------------------------------------------------------

function validateReceiptSchemas(receipt_schemas) {
  const errors = [];

  if (!Array.isArray(receipt_schemas)) {
    return { valid: false, errors: ['RECEIPT_SCHEMAS_NOT_ARRAY'] };
  }

  for (const schema of receipt_schemas) {
    if (
      !schema ||
      typeof schema !== 'object' ||
      typeof schema.id !== 'string' || schema.id.trim() === '' ||
      typeof schema.proof !== 'string' || schema.proof.trim() === '' ||
      !Array.isArray(schema.required_fields) || schema.required_fields.length === 0
    ) {
      errors.push('INVALID_RUNTIME_EVIDENCE_RECEIPT_SCHEMA');
      continue;
    }

    if (schema.execution_performed !== false) {
      errors.push(`RECEIPT_SCHEMA_MUST_NOT_EXECUTE: ${schema.id}`);
    }

    if (schema.receipt_schema_only !== true) {
      errors.push(`RECEIPT_SCHEMA_ONLY_REQUIRED: ${schema.id}`);
    }

    if (schema.requires_human_authorization !== true) {
      errors.push(`RECEIPT_SCHEMA_REQUIRES_HUMAN_AUTHORIZATION: ${schema.id}`);
    }

    for (const field of REQUIRED_RECEIPT_FIELDS) {
      if (!schema.required_fields.includes(field)) {
        errors.push(`MISSING_REQUIRED_RECEIPT_FIELD: ${schema.id}:${field}`);
      }
    }
  }

  const presentIds = receipt_schemas
    .filter(s => s && typeof s.id === 'string')
    .map(s => s.id);

  for (const requiredId of REQUIRED_SCHEMA_IDS) {
    if (!presentIds.includes(requiredId)) {
      errors.push(`MISSING_REQUIRED_RUNTIME_EVIDENCE_RECEIPT_SCHEMA: ${requiredId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Controls validation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Evidence hash
// ---------------------------------------------------------------------------

function buildEvidenceHash(input) {
  const payload = JSON.stringify({
    module: MODULE_VERSION,
    runtime_probe_permission_matrix_ready: input.runtime_probe_permission_matrix_ready,
    evidence_receipt_contract: input.evidence_receipt_contract,
    schema_ids: (input.receipt_schemas || []).map(s => s && s.id).sort(),
    required_controls: [...(input.required_controls || [])].sort()
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

export function build(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  if (input.runtime_probe_permission_matrix_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_PERMISSION_MATRIX,
      ready: false,
      errors: ['RUNTIME_PROBE_PERMISSION_MATRIX_NOT_READY']
    };
  }

  const contractStructure = checkContractStructure(input.evidence_receipt_contract);
  if (!contractStructure.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: contractStructure.errors
    };
  }

  if (!Array.isArray(input.receipt_schemas)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['RECEIPT_SCHEMAS_NOT_ARRAY']
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

  const contractFields = validateContractFields(input.evidence_receipt_contract);
  if (!contractFields.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: contractFields.errors
    };
  }

  const schemaResult = validateReceiptSchemas(input.receipt_schemas);
  if (!schemaResult.valid) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors: schemaResult.errors
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

  const evidence_hash = buildEvidenceHash(input);

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    runtime_evidence_receipt_contract_ready: true,
    runtime_probe_permission_matrix_ready: true,
    evidence_receipt_contract_only: true,
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
      'RTA-6 runtime evidence receipt contract prepared. Evidence receipts remain schema-only; runtime execution requires RTA-9 and explicit human authorization.'
  };
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.READY) return false;
  if (result.runtime_evidence_receipt_contract_ready !== true) return false;
  if (result.evidence_receipt_contract_only !== true) return false;
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

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

export function render(result) {
  if (!result || typeof result !== 'object') {
    return '[RTA-6] Runtime Evidence Receipt Contract — no result to render.';
  }

  const lines = [
    '=== RTA-6 Runtime Evidence Receipt Contract ===',
    '',
    `Module Version : ${result.module_version ?? 'N/A'}`,
    `Status         : ${result.status ?? 'N/A'}`,
    `Ready          : ${result.ready ?? false}`,
    '',
    '--- Dependency ---',
    `RTA-5 runtime probe permission matrix ready : ${result.runtime_probe_permission_matrix_ready ?? false}`,
    '',
    '--- Contract Scope ---',
    `Evidence receipt contract only   : ${result.evidence_receipt_contract_only ?? false}`,
    'Evidence receipts remain schema-only — no runtime execution performed.',
    '',
    '--- Execution Locks ---',
    `Runtime execution authorized     : ${result.runtime_execution_authorized ?? false}`,
    `Runtime discovery exec allowed   : ${result.runtime_discovery_execution_allowed ?? false}`,
    `Command execution allowed        : ${result.command_execution_allowed ?? false}`,
    `Endpoint probe allowed           : ${result.endpoint_probe_allowed ?? false}`,
    `Network allowed                  : ${result.network_allowed ?? false}`,
    `Rollback execution allowed       : ${result.rollback_execution_allowed ?? false}`,
    '',
    '--- Release / Deployment Locks ---',
    `Release allowed                  : ${result.release_allowed ?? false}`,
    `Deploy allowed                   : ${result.deploy_allowed ?? false}`,
    `Tag allowed                      : ${result.tag_allowed ?? false}`,
    `Stable promotion allowed         : ${result.stable_promotion_allowed ?? false}`,
    `Production touched               : ${result.production_touched ?? false}`,
    `Billing execution allowed        : ${result.billing_execution_allowed ?? false}`,
    `Secret access allowed            : ${result.secret_access_allowed ?? false}`,
    '',
    '--- PASS GOLD REAL ---',
    `PASS GOLD REAL achieved          : ${result.pass_gold_real_achieved ?? false}`,
    '',
    '--- V471 ---',
    `V471 allowed                     : ${result.v471_allowed ?? false}`,
    'V471 blocked                     : true',
    '',
    '--- Authorization Gate ---',
    `RTA-9 required before execution  : ${result.rta9_required_before_execution ?? true}`,
    'Runtime execution requires RTA-9 and explicit human authorization.',
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
