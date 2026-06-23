import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-1';

export const STATUSES = Object.freeze({
  READY: 'SMOKE_FLOW_ROLLBACK_READINESS_EVIDENCE_READY',
  BLOCKED_INPUT: 'SMOKE_FLOW_ROLLBACK_READINESS_EVIDENCE_BLOCKED_INPUT',
  BLOCKED_RTP0: 'SMOKE_FLOW_ROLLBACK_READINESS_EVIDENCE_BLOCKED_RTP0',
  FAIL: 'SMOKE_FLOW_ROLLBACK_READINESS_EVIDENCE_FAIL'
});

export function build(input = {}) {
  const {
    local_runtime_truth_probe_execution_ready = false,
    runtime_truth_probe_result_bound = false,
    pass_gold_real_achieved = false,
    smoke_execution_performed = false,
    rollback_execution_performed = false
  } = input;

  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version: MODULE_VERSION,
      local_runtime_truth_probe_execution_ready,
      runtime_truth_probe_result_bound,
      pass_gold_real_achieved,
      smoke_execution_performed,
      rollback_execution_performed,
      timestamp: Date.now()
    }))
    .digest('hex');

  if (!local_runtime_truth_probe_execution_ready) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      message: 'Local runtime truth probe execution not ready',
      evidence_hash
    };
  }

  if (!runtime_truth_probe_result_bound) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_RTP0,
      ready: false,
      blocked_rtp0: true,
      message: 'Runtime truth probe result not bound',
      evidence_hash
    };
  }

  if (pass_gold_real_achieved) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'PASS GOLD REAL must not be achieved at this stage',
      evidence_hash
    };
  }

  if (smoke_execution_performed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Smoke execution must not be performed by this module',
      evidence_hash
    };
  }

  if (rollback_execution_performed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Rollback execution must not be performed by this module',
      evidence_hash
    };
  }

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    smoke_flow_rollback_readiness_evidence_ready: true,
    local_runtime_truth_probe_execution_ready: true,
    runtime_truth_probe_result_bound: true,
    smoke_flow_evidence_plan_ready: true,
    rollback_readiness_evidence_plan_ready: true,
    smoke_execution_performed: false,
    rollback_execution_performed: false,
    runtime_execution_authorized: false,
    command_execution_allowed: false,
    endpoint_probe_allowed: false,
    pass_gold_real_achieved: false,
    v471_allowed: false,
    rta10_allowed: false,
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
    final_message: 'RTP-1 smoke flow and rollback readiness evidence plan prepared. Smoke execution and rollback execution remain pending explicit operator evidence; PASS GOLD REAL is not claimed.'
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

  if (result.status === STATUSES.READY) {
    const requiredFields = [
      'smoke_flow_rollback_readiness_evidence_ready',
      'local_runtime_truth_probe_execution_ready',
      'runtime_truth_probe_result_bound',
      'smoke_flow_evidence_plan_ready',
      'rollback_readiness_evidence_plan_ready',
      'smoke_execution_performed',
      'rollback_execution_performed',
      'runtime_execution_authorized',
      'command_execution_allowed',
      'endpoint_probe_allowed',
      'pass_gold_real_achieved',
      'v471_allowed',
      'rta10_allowed',
      'release_allowed',
      'deploy_allowed',
      'tag_allowed',
      'stable_promotion_allowed',
      'production_touched',
      'billing_execution_allowed',
      'secret_access_allowed',
      'network_allowed',
      'rollback_execution_allowed',
      'evidence_hash',
      'final_message'
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        return false;
      }
    }

    if (result.evidence_hash.length !== 64) {
      return false;
    }

    if (result.final_message !== 'RTP-1 smoke flow and rollback readiness evidence plan prepared. Smoke execution and rollback execution remain pending explicit operator evidence; PASS GOLD REAL is not claimed.') {
      return false;
    }

    if (result.smoke_flow_rollback_readiness_evidence_ready !== true ||
        result.local_runtime_truth_probe_execution_ready !== true ||
        result.runtime_truth_probe_result_bound !== true ||
        result.smoke_flow_evidence_plan_ready !== true ||
        result.rollback_readiness_evidence_plan_ready !== true ||
        result.smoke_execution_performed !== false ||
        result.rollback_execution_performed !== false ||
        result.runtime_execution_authorized !== false ||
        result.command_execution_allowed !== false ||
        result.endpoint_probe_allowed !== false ||
        result.pass_gold_real_achieved !== false ||
        result.v471_allowed !== false ||
        result.rta10_allowed !== false ||
        result.release_allowed !== false ||
        result.deploy_allowed !== false ||
        result.tag_allowed !== false ||
        result.stable_promotion_allowed !== false ||
        result.production_touched !== false ||
        result.billing_execution_allowed !== false ||
        result.secret_access_allowed !== false ||
        result.network_allowed !== false ||
        result.rollback_execution_allowed !== false) {
      return false;
    }
  }

  return true;
}

export function render(result) {
  const lines = [
    `=== RTP-1 Smoke Flow + Rollback Readiness Evidence Plan ===`,
    `Module: ${result.module_version}`,
    `Status: ${result.status}`,
    `Ready: ${result.ready}`,
    ``,
    `Local Runtime Truth Probe Execution: ${result.local_runtime_truth_probe_execution_ready ? 'READY' : 'NOT READY'}`,
    `Runtime Truth Probe Result Bound: ${result.runtime_truth_probe_result_bound ? 'BOUND' : 'NOT BOUND'}`,
    `PASS GOLD REAL Achieved: ${result.pass_gold_real_achieved ? 'TRUE (INVALID)' : 'FALSE'}`,
    ``,
    `Smoke Flow + Rollback Readiness Evidence: ${result.smoke_flow_rollback_readiness_evidence_ready ? 'READY' : 'NOT READY'}`,
    `Smoke Flow Evidence Plan: ${result.smoke_flow_evidence_plan_ready ? 'READY' : 'NOT READY'}`,
    `Rollback Readiness Evidence Plan: ${result.rollback_readiness_evidence_plan_ready ? 'READY' : 'NOT READY'}`,
    `Smoke Execution Performed: ${result.smoke_execution_performed ? 'TRUE (INVALID)' : 'FALSE'}`,
    `Rollback Execution Performed: ${result.rollback_execution_performed ? 'TRUE (INVALID)' : 'FALSE'}`,
    ``,
    `Security Controls:`,
    `  Runtime Execution: ${result.runtime_execution_authorized ? 'ALLOWED' : 'BLOCKED'}`,
    `  Command Execution: ${result.command_execution_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Endpoint Probe: ${result.endpoint_probe_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  PASS GOLD REAL: ${result.pass_gold_real_achieved ? 'ACHIEVED' : 'NOT ACHIEVED'}`,
    `  V471 Allowed: ${result.v471_allowed ? 'TRUE (BLOCKED)' : 'FALSE'}`,
    `  RTA-10 Allowed: ${result.rta10_allowed ? 'TRUE (BLOCKED)' : 'FALSE'}`,
    ``,
    `Release Controls:`,
    `  Release: ${result.release_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Deploy: ${result.deploy_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Tag: ${result.tag_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Stable Promotion: ${result.stable_promotion_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Production Touched: ${result.production_touched ? 'YES' : 'NO'}`,
    ``,
    `Access Controls:`,
    `  Billing Execution: ${result.billing_execution_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Secret Access: ${result.secret_access_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Network Access: ${result.network_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Rollback Execution: ${result.rollback_execution_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    ``,
    `Evidence Hash: ${result.evidence_hash}`,
    ``,
    `Final Message: ${result.final_message}`,
    ``,
    `=== RTP-0 Dependency Status ===`,
    `RTP-0 must be completed and runtime truth probe result must be bound.`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`
  ];

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };