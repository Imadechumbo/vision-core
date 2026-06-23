import crypto from 'node:crypto';

const MODULE_VERSION = 'RTE-1';

export const STATUSES = Object.freeze({
  READY: 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_READY',
  BLOCKED_INPUT: 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_BLOCKED_INPUT',
  BLOCKED_RTE0: 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_BLOCKED_RTE0',
  FAIL: 'LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_FAIL'
});

const REQUIRED_SMOKE_FLOW_FIELDS = [
  'local_scope_declared',
  'operator_supervision_declared',
  'smoke_flow_declared',
  'smoke_flow_execution_external_to_module',
  'evidence_capture_declared',
  'stdout_capture_declared',
  'stderr_capture_declared',
  'exit_code_capture_declared',
  'started_at_required',
  'completed_at_required',
  'runtime_truth_dependency_bound',
  'production_scope_blocked',
  'external_network_blocked',
  'secrets_blocked',
  'billing_blocked',
  'deploy_release_tag_stable_blocked',
  'rollback_blocked',
  'pass_gold_real_not_claimed',
  'v471_blocked',
  'rta10_blocked'
];

const REQUIRED_CONTROLS = [
  'rte0-required',
  'rte-path-chosen',
  'local-smoke-flow-execution-evidence-only',
  'manual-supervised-local-only',
  'smoke-flow-execution-external-to-module',
  'no-module-runtime-execution',
  'no-module-smoke-execution',
  'no-endpoint-probe',
  'no-production-target',
  'no-external-network',
  'no-secret-loading',
  'no-billing-access',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-rollback-execution',
  'pass-gold-real-not-claimed',
  'v471-blocked',
  'rta10-blocked'
];

export function build(input = {}) {
  // 1. Input must be object
  if (typeof input !== 'object' || input === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['INPUT_NOT_OBJECT']
    };
  }

  const {
    local_runtime_truth_execution_ready = false,
    runtime_truth_execution_review_ready = false,
    chosen_path,
    pass_gold_real_achieved = false,
    stable_promotion_allowed = false,
    local_smoke_flow_execution_evidence,
    operator_smoke_flow_receipt,
    required_controls
  } = input;

  // 2. RTE-0 dependencies must be ready
  if (local_runtime_truth_execution_ready !== true || runtime_truth_execution_review_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_RTE0,
      ready: false,
      blocked_rte0: true,
      errors: ['RTE0_LOCAL_RUNTIME_TRUTH_EXECUTION_NOT_READY']
    };
  }

  // 3. chosen_path must be 'RTE'
  if (chosen_path !== 'RTE') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['RTE_PATH_NOT_CHOSEN']
    };
  }

  // 4. pass_gold_real_achieved must be false
  if (pass_gold_real_achieved !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE1']
    };
  }

  // 5. stable_promotion_allowed must be false
  if (stable_promotion_allowed !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['STABLE_PROMOTION_MUST_REMAIN_BLOCKED']
    };
  }

  // 6. local_smoke_flow_execution_evidence must be object
  if (typeof local_smoke_flow_execution_evidence !== 'object' || local_smoke_flow_execution_evidence === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['LOCAL_SMOKE_FLOW_EXECUTION_EVIDENCE_MISSING_OR_NOT_OBJECT']
    };
  }

  // 7. operator_smoke_flow_receipt must be object
  if (typeof operator_smoke_flow_receipt !== 'object' || operator_smoke_flow_receipt === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['OPERATOR_SMOKE_FLOW_RECEIPT_MISSING_OR_NOT_OBJECT']
    };
  }

  // 8. required_controls must be array
  if (!Array.isArray(required_controls)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['REQUIRED_CONTROLS_NOT_ARRAY']
    };
  }

  // Validate each required smoke flow field is true
  for (const field of REQUIRED_SMOKE_FLOW_FIELDS) {
    if (local_smoke_flow_execution_evidence[field] !== true) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`REQUIRED_LOCAL_SMOKE_FLOW_EXECUTION_FIELD_NOT_TRUE: ${field}`]
      };
    }
  }

  // Validate operator smoke flow receipt
  const receipt = operator_smoke_flow_receipt;

  if (typeof receipt.operator_id !== 'string' || receipt.operator_id.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['OPERATOR_ID_MUST_BE_NON_EMPTY_STRING']
    };
  }

  if (receipt.execution_mode !== 'manual-supervised-local') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['EXECUTION_MODE_MUST_BE_MANUAL_SUPERVISED_LOCAL']
    };
  }

  if (receipt.target_environment !== 'local') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['TARGET_ENVIRONMENT_MUST_BE_LOCAL']
    };
  }

  if (typeof receipt.smoke_flow_id !== 'string' || receipt.smoke_flow_id.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['SMOKE_FLOW_ID_MUST_BE_NON_EMPTY_STRING']
    };
  }

  if (typeof receipt.smoke_flow_description !== 'string' || receipt.smoke_flow_description.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['SMOKE_FLOW_DESCRIPTION_MUST_BE_NON_EMPTY_STRING']
    };
  }

  if (typeof receipt.runtime_truth_receipt_id !== 'string' || receipt.runtime_truth_receipt_id.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['RUNTIME_TRUTH_RECEIPT_ID_MUST_BE_NON_EMPTY_STRING']
    };
  }

  if (receipt.command_executed_by_module !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['COMMAND_EXECUTED_BY_MODULE_MUST_BE_FALSE']
    };
  }

  if (receipt.smoke_flow_executed_by_module !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['SMOKE_FLOW_EXECUTED_BY_MODULE_MUST_BE_FALSE']
    };
  }

  if (receipt.endpoint_probe_performed_by_module !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['ENDPOINT_PROBE_PERFORMED_BY_MODULE_MUST_BE_FALSE']
    };
  }

  if (receipt.production_target !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['PRODUCTION_TARGET_MUST_BE_FALSE']
    };
  }

  if (receipt.external_network_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['EXTERNAL_NETWORK_USED_MUST_BE_FALSE']
    };
  }

  if (receipt.secrets_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['SECRETS_USED_MUST_BE_FALSE']
    };
  }

  if (receipt.billing_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['BILLING_USED_MUST_BE_FALSE']
    };
  }

  if (receipt.rollback_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['ROLLBACK_USED_MUST_BE_FALSE']
    };
  }

  if (receipt.deploy_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['DEPLOY_USED_MUST_BE_FALSE']
    };
  }

  if (receipt.release_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['RELEASE_USED_MUST_BE_FALSE']
    };
  }

  if (receipt.tag_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['TAG_USED_MUST_BE_FALSE']
    };
  }

  if (receipt.stable_promotion_used !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['STABLE_PROMOTION_USED_MUST_BE_FALSE']
    };
  }

  // Validate required controls
  for (const control of REQUIRED_CONTROLS) {
    if (!required_controls.includes(control)) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`MISSING_REQUIRED_CONTROL: ${control}`]
      };
    }
  }

  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version: MODULE_VERSION,
      local_runtime_truth_execution_ready,
      runtime_truth_execution_review_ready,
      chosen_path,
      pass_gold_real_achieved,
      stable_promotion_allowed,
      operator_id: receipt.operator_id,
      smoke_flow_id: receipt.smoke_flow_id,
      smoke_flow_description: receipt.smoke_flow_description,
      runtime_truth_receipt_id: receipt.runtime_truth_receipt_id,
      required_controls
    }))
    .digest('hex');

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    local_smoke_flow_execution_evidence_ready: true,
    local_runtime_truth_execution_ready: true,
    runtime_truth_execution_review_ready: true,
    chosen_path: 'RTE',
    local_scope_only: true,
    manual_supervised_local_only: true,
    smoke_flow_execution_external_to_module: true,
    operator_smoke_flow_receipt_ready: true,
    smoke_flow_execution_review_ready: true,
    runtime_truth_dependency_bound: true,
    command_executed_by_module: false,
    smoke_flow_executed_by_module: false,
    runtime_execution_performed_by_module: false,
    endpoint_probe_performed_by_module: false,
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    v471_allowed: false,
    rta10_allowed: false,
    evidence_hash,
    final_message: 'RTE-1 local smoke flow execution evidence prepared. Smoke flow execution is manual-supervised-local and external to the module; PASS GOLD REAL is not claimed.'
  };
}

export function validate(result) {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  if (result.module_version !== MODULE_VERSION) {
    return false;
  }

  if (!Object.values(STATUSES).includes(result.status)) {
    return false;
  }

  if (typeof result.ready !== 'boolean') {
    return false;
  }

  if (result.status !== STATUSES.READY) {
    return false;
  }

  if (result.local_smoke_flow_execution_evidence_ready !== true) return false;
  if (result.local_runtime_truth_execution_ready !== true) return false;
  if (result.runtime_truth_execution_review_ready !== true) return false;
  if (result.chosen_path !== 'RTE') return false;
  if (result.local_scope_only !== true) return false;
  if (result.manual_supervised_local_only !== true) return false;
  if (result.smoke_flow_execution_external_to_module !== true) return false;
  if (result.operator_smoke_flow_receipt_ready !== true) return false;
  if (result.smoke_flow_execution_review_ready !== true) return false;
  if (result.runtime_truth_dependency_bound !== true) return false;
  if (result.command_executed_by_module !== false) return false;
  if (result.smoke_flow_executed_by_module !== false) return false;
  if (result.runtime_execution_performed_by_module !== false) return false;
  if (result.endpoint_probe_performed_by_module !== false) return false;
  if (result.pass_gold_real_achieved !== false) return false;
  if (result.stable_promotion_allowed !== false) return false;
  if (result.release_allowed !== false) return false;
  if (result.deploy_allowed !== false) return false;
  if (result.tag_allowed !== false) return false;
  if (result.production_touched !== false) return false;
  if (result.billing_execution_allowed !== false) return false;
  if (result.secret_access_allowed !== false) return false;
  if (result.network_allowed !== false) return false;
  if (result.rollback_execution_allowed !== false) return false;
  if (result.v471_allowed !== false) return false;
  if (result.rta10_allowed !== false) return false;
  if (typeof result.evidence_hash !== 'string' || result.evidence_hash.length !== 64) return false;

  return true;
}

export function render(result) {
  const lines = [
    `=== RTE-1 Local Smoke Flow Execution Evidence ===`,
    `Module: ${result.module_version}`,
    `Status: ${result.status}`,
    `Ready: ${result.ready}`,
    ``,
    `=== RTE-0 Dependency ===`,
    `RTE-0 local runtime truth execution ready: ${result.local_runtime_truth_execution_ready ? 'YES' : 'NO'}`,
    `RTE-0 execution review ready: ${result.runtime_truth_execution_review_ready ? 'YES' : 'NO'}`,
    `Runtime truth dependency bound: ${result.runtime_truth_dependency_bound ? 'YES' : 'NO'}`,
    ``,
    `=== Path Selection ===`,
    `Path A RTE selected: ${result.chosen_path === 'RTE' ? 'CONFIRMED' : 'NOT SELECTED'}`,
    ``,
    `=== Execution Mode ===`,
    `Mode: manual-supervised-local`,
    `Local Scope Only: ${result.local_scope_only ? 'YES' : 'NO'}`,
    `Manual Supervised Local Only: ${result.manual_supervised_local_only ? 'YES' : 'NO'}`,
    `Smoke flow execution is external to the module: ${result.smoke_flow_execution_external_to_module ? 'CONFIRMED' : 'VIOLATION'}`,
    `Command Executed By Module: ${result.command_executed_by_module ? 'YES (VIOLATION)' : 'NO'}`,
    `Smoke Flow Executed By Module: ${result.smoke_flow_executed_by_module ? 'YES (VIOLATION)' : 'NO'}`,
    `Runtime Execution By Module: ${result.runtime_execution_performed_by_module ? 'YES (VIOLATION)' : 'NO'}`,
    `Endpoint Probe By Module: ${result.endpoint_probe_performed_by_module ? 'YES (VIOLATION)' : 'NO'}`,
    ``,
    `=== Operator Smoke Flow Receipt ===`,
    `Receipt Ready: ${result.operator_smoke_flow_receipt_ready ? 'YES' : 'NO'}`,
    `Smoke Flow Execution Review Ready: ${result.smoke_flow_execution_review_ready ? 'YES' : 'NO'}`,
    ``,
    `=== PASS GOLD REAL Status ===`,
    `PASS GOLD REAL is not claimed: ${result.pass_gold_real_achieved === false ? 'CONFIRMED' : 'VIOLATION'}`,
    ``,
    `=== Blocked Actions ===`,
    `Stable promotion remains blocked: ${result.stable_promotion_allowed === false ? 'CONFIRMED' : 'VIOLATION'}`,
    `Release: ${result.release_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Deploy: ${result.deploy_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Tag: ${result.tag_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Production untouched: ${result.production_touched === false ? 'CONFIRMED' : 'VIOLATION'}`,
    ``,
    `=== Safety Controls ===`,
    `V471 blocked: ${result.v471_allowed === false ? 'CONFIRMED' : 'VIOLATION'}`,
    `RTA-10 blocked: ${result.rta10_allowed === false ? 'CONFIRMED' : 'VIOLATION'}`,
    ``,
    `=== Access Controls ===`,
    `Billing: ${result.billing_execution_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Secret Access: ${result.secret_access_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Network: ${result.network_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    `Rollback: ${result.rollback_execution_allowed ? 'ALLOWED (VIOLATION)' : 'BLOCKED'}`,
    ``,
    `Evidence Hash: ${result.evidence_hash}`,
    ``,
    `Final Message: ${result.final_message}`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`
  ];

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
