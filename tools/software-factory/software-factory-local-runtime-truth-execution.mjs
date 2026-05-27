import crypto from 'node:crypto';

const MODULE_VERSION = 'RTE-0';

export const STATUSES = Object.freeze({
  READY: 'LOCAL_RUNTIME_TRUTH_EXECUTION_READY',
  BLOCKED_INPUT: 'LOCAL_RUNTIME_TRUTH_EXECUTION_BLOCKED_INPUT',
  BLOCKED_UNIFY_LEDGER: 'LOCAL_RUNTIME_TRUTH_EXECUTION_BLOCKED_UNIFY_LEDGER',
  FAIL: 'LOCAL_RUNTIME_TRUTH_EXECUTION_FAIL'
});

const REQUIRED_EXECUTION_FIELDS = [
  'local_scope_declared',
  'operator_supervision_declared',
  'local_runtime_command_declared',
  'command_execution_external_to_module',
  'evidence_capture_declared',
  'stdout_capture_declared',
  'stderr_capture_declared',
  'exit_code_capture_declared',
  'started_at_required',
  'completed_at_required',
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
  'unify0-required',
  'rte-path-chosen',
  'local-runtime-truth-execution-only',
  'manual-supervised-local-only',
  'command-execution-external-to-module',
  'no-module-runtime-execution',
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
    vision_core_final_state_ledger_ready = false,
    unified_state,
    chosen_path,
    pass_gold_real_achieved = false,
    stable_promotion_allowed = false,
    local_runtime_truth_execution,
    operator_execution_receipt,
    required_controls
  } = input;

  // 2. vision_core_final_state_ledger_ready must be true
  if (vision_core_final_state_ledger_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_UNIFY_LEDGER,
      ready: false,
      blocked_unify_ledger: true,
      errors: ['UNIFY0_FINAL_STATE_LEDGER_NOT_READY']
    };
  }

  // 3. unified_state must be 'REVIEW_READY_NOT_EXECUTED'
  if (unified_state !== 'REVIEW_READY_NOT_EXECUTED') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['UNIFIED_STATE_MUST_BE_REVIEW_READY_NOT_EXECUTED']
    };
  }

  // 4. chosen_path must be 'RTE'
  if (chosen_path !== 'RTE') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['RTE_PATH_NOT_CHOSEN']
    };
  }

  // 5. pass_gold_real_achieved must be false
  if (pass_gold_real_achieved !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE0']
    };
  }

  // 6. stable_promotion_allowed must be false
  if (stable_promotion_allowed !== false) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['STABLE_PROMOTION_MUST_REMAIN_BLOCKED']
    };
  }

  // 7. local_runtime_truth_execution must be object
  if (typeof local_runtime_truth_execution !== 'object' || local_runtime_truth_execution === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['LOCAL_RUNTIME_TRUTH_EXECUTION_MISSING_OR_NOT_OBJECT']
    };
  }

  // 8. operator_execution_receipt must be object
  if (typeof operator_execution_receipt !== 'object' || operator_execution_receipt === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['OPERATOR_EXECUTION_RECEIPT_MISSING_OR_NOT_OBJECT']
    };
  }

  // 9. required_controls must be array
  if (!Array.isArray(required_controls)) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      errors: ['REQUIRED_CONTROLS_NOT_ARRAY']
    };
  }

  // Validate each required local_runtime_truth_execution field is true
  for (const field of REQUIRED_EXECUTION_FIELDS) {
    if (local_runtime_truth_execution[field] !== true) {
      return {
        module_version: MODULE_VERSION,
        status: STATUSES.FAIL,
        ready: false,
        fail: true,
        errors: [`REQUIRED_LOCAL_RUNTIME_TRUTH_EXECUTION_FIELD_NOT_TRUE: ${field}`]
      };
    }
  }

  // Validate operator execution receipt fields
  const receipt = operator_execution_receipt;

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

  if (typeof receipt.command_id !== 'string' || receipt.command_id.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['COMMAND_ID_MUST_BE_NON_EMPTY_STRING']
    };
  }

  if (typeof receipt.command_text !== 'string' || receipt.command_text.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      errors: ['COMMAND_TEXT_MUST_BE_NON_EMPTY_STRING']
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
      vision_core_final_state_ledger_ready,
      unified_state,
      chosen_path,
      pass_gold_real_achieved,
      stable_promotion_allowed,
      operator_id: receipt.operator_id,
      command_id: receipt.command_id,
      command_text: receipt.command_text,
      required_controls
    }))
    .digest('hex');

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    local_runtime_truth_execution_ready: true,
    vision_core_final_state_ledger_ready: true,
    unified_state: 'REVIEW_READY_NOT_EXECUTED',
    chosen_path: 'RTE',
    local_scope_only: true,
    manual_supervised_local_only: true,
    command_execution_external_to_module: true,
    operator_execution_receipt_ready: true,
    runtime_truth_execution_review_ready: true,
    command_executed_by_module: false,
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
    final_message: 'RTE-0 local runtime truth execution receipt prepared. Execution is manual-supervised-local and external to the module; PASS GOLD REAL is not claimed.'
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

  if (result.local_runtime_truth_execution_ready !== true) return false;
  if (result.vision_core_final_state_ledger_ready !== true) return false;
  if (result.unified_state !== 'REVIEW_READY_NOT_EXECUTED') return false;
  if (result.chosen_path !== 'RTE') return false;
  if (result.local_scope_only !== true) return false;
  if (result.manual_supervised_local_only !== true) return false;
  if (result.command_execution_external_to_module !== true) return false;
  if (result.operator_execution_receipt_ready !== true) return false;
  if (result.runtime_truth_execution_review_ready !== true) return false;
  if (result.command_executed_by_module !== false) return false;
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
    `=== RTE-0 Local Runtime Truth Execution ===`,
    `Module: ${result.module_version}`,
    `Status: ${result.status}`,
    `Ready: ${result.ready}`,
    ``,
    `=== UNIFY-0 Final State Ledger Dependency ===`,
    `UNIFY-0 final state ledger ready: ${result.vision_core_final_state_ledger_ready ? 'YES' : 'NO'}`,
    `Unified State: ${result.unified_state}`,
    ``,
    `=== Path Selection ===`,
    `Path A RTE selected: ${result.chosen_path === 'RTE' ? 'CONFIRMED' : 'NOT SELECTED'}`,
    ``,
    `=== Execution Mode ===`,
    `Mode: manual-supervised-local`,
    `Local Scope Only: ${result.local_scope_only ? 'YES' : 'NO'}`,
    `Manual Supervised Local Only: ${result.manual_supervised_local_only ? 'YES' : 'NO'}`,
    `Execution is external to the module: ${result.command_execution_external_to_module ? 'CONFIRMED' : 'VIOLATION'}`,
    `Command Executed By Module: ${result.command_executed_by_module ? 'YES (VIOLATION)' : 'NO'}`,
    `Runtime Execution By Module: ${result.runtime_execution_performed_by_module ? 'YES (VIOLATION)' : 'NO'}`,
    `Endpoint Probe By Module: ${result.endpoint_probe_performed_by_module ? 'YES (VIOLATION)' : 'NO'}`,
    ``,
    `=== Operator Execution Receipt ===`,
    `Receipt Ready: ${result.operator_execution_receipt_ready ? 'YES' : 'NO'}`,
    `Execution Review Ready: ${result.runtime_truth_execution_review_ready ? 'YES' : 'NO'}`,
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
