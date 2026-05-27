import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-0';

export const STATUSES = Object.freeze({
  READY: 'LOCAL_RUNTIME_TRUTH_PROBE_EXECUTION_READY',
  BLOCKED_INPUT: 'LOCAL_RUNTIME_TRUTH_PROBE_EXECUTION_BLOCKED_INPUT',
  BLOCKED_RTA_PHASE_GATE: 'LOCAL_RUNTIME_TRUTH_PROBE_EXECUTION_BLOCKED_RTA_PHASE_GATE',
  FAIL: 'LOCAL_RUNTIME_TRUTH_PROBE_EXECUTION_FAIL'
});

export function build(input = {}) {
  const {
    runtime_authorization_phase_gate_ready = false,
    rta_final_gate = false,
    chosen_path = '',
    rta10_allowed = false
  } = input;

  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version: MODULE_VERSION,
      runtime_authorization_phase_gate_ready,
      rta_final_gate,
      chosen_path,
      rta10_allowed,
      timestamp: Date.now()
    }))
    .digest('hex');

  if (!runtime_authorization_phase_gate_ready) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      message: 'Runtime authorization phase gate not ready',
      evidence_hash
    };
  }

  if (!rta_final_gate) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_RTA_PHASE_GATE,
      ready: false,
      blocked_rta_phase_gate: true,
      message: 'RTA final phase gate not passed',
      evidence_hash
    };
  }

  if (chosen_path !== 'RTP') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: `Invalid chosen path: ${chosen_path}. RTP path required.`,
      evidence_hash
    };
  }

  if (rta10_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'RTA-10 is forbidden and must not be allowed',
      evidence_hash
    };
  }

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    local_runtime_truth_probe_execution_ready: true,
    runtime_authorization_phase_gate_ready: true,
    chosen_path: 'RTP',
    local_scope_only: true,
    supervised_local_execution_plan_ready: true,
    runtime_truth_probe_prepared: true,
    runtime_execution_authorized: false,
    local_runtime_execution_plan_declared: true,
    command_execution_allowed: false,
    endpoint_probe_allowed: false,
    external_network_allowed: false,
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
    final_message: 'RTP-0 local runtime truth probe execution plan prepared. Local supervised probe remains pending explicit operator execution; PASS GOLD REAL is not claimed.'
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
      'local_runtime_truth_probe_execution_ready',
      'runtime_authorization_phase_gate_ready', 
      'chosen_path',
      'local_scope_only',
      'supervised_local_execution_plan_ready',
      'runtime_truth_probe_prepared',
      'runtime_execution_authorized',
      'local_runtime_execution_plan_declared',
      'command_execution_allowed',
      'endpoint_probe_allowed',
      'external_network_allowed',
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

    if (result.final_message !== 'RTP-0 local runtime truth probe execution plan prepared. Local supervised probe remains pending explicit operator execution; PASS GOLD REAL is not claimed.') {
      return false;
    }

    if (result.local_runtime_truth_probe_execution_ready !== true ||
        result.runtime_authorization_phase_gate_ready !== true ||
        result.chosen_path !== 'RTP' ||
        result.local_scope_only !== true ||
        result.supervised_local_execution_plan_ready !== true ||
        result.runtime_truth_probe_prepared !== true ||
        result.runtime_execution_authorized !== false ||
        result.local_runtime_execution_plan_declared !== true ||
        result.command_execution_allowed !== false ||
        result.endpoint_probe_allowed !== false ||
        result.external_network_allowed !== false ||
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
    `=== RTP-0 Local Runtime Truth Probe Execution Plan ===`,
    `Module: ${result.module_version}`,
    `Status: ${result.status}`,
    `Ready: ${result.ready}`,
    ``,
    `Runtime Authorization Phase Gate: ${result.runtime_authorization_phase_gate_ready ? 'PASS' : 'FAIL'}`,
    `RTA Final Gate: ${result.rta_final_gate ? 'PASS' : 'FAIL'}`,
    `Chosen Path: ${result.chosen_path}`,
    `RTA-10 Allowed: ${result.rta10_allowed ? 'TRUE (FORBIDDEN)' : 'FALSE'}`,
    ``,
    `Local Runtime Truth Probe Execution: ${result.local_runtime_truth_probe_execution_ready ? 'READY' : 'NOT READY'}`,
    `Local Scope Only: ${result.local_scope_only}`,
    `Supervised Execution Plan: ${result.supervised_local_execution_plan_ready ? 'READY' : 'NOT READY'}`,
    `Runtime Truth Probe Prepared: ${result.runtime_truth_probe_prepared ? 'YES' : 'NO'}`,
    `Execution Authorized: ${result.runtime_execution_authorized ? 'YES' : 'NO'}`,
    `Local Plan Declared: ${result.local_runtime_execution_plan_declared ? 'YES' : 'NO'}`,
    ``,
    `Security Controls:`,
    `  Command Execution: ${result.command_execution_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  Endpoint Probe: ${result.endpoint_probe_allowed ? 'ALLOWED' : 'BLOCKED'}`,
    `  External Network: ${result.external_network_allowed ? 'ALLOWED' : 'BLOCKED'}`,
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
    `=== RTA-9 Final Phase Gate Status ===`,
    `RTA-9 has been completed and authorized Path A (RTP) selection.`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`
  ];

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };