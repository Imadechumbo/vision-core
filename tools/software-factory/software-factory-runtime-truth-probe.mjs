import crypto from 'node:crypto';

const MODULE_VERSION = 'V467';

export const STATUSES = Object.freeze({
  READY: 'RUNTIME_TRUTH_PROBE_READY',
  BLOCKED_INPUT: 'RUNTIME_TRUTH_PROBE_BLOCKED_INPUT',
  BLOCKED_CONTRACT: 'RUNTIME_TRUTH_PROBE_BLOCKED_CONTRACT',
  FAIL: 'RUNTIME_TRUTH_PROBE_FAIL',
});

const REQUIRED_PLAN_FIELDS = Object.freeze([
  'health_endpoint_declared',
  'readiness_endpoint_declared',
  'version_endpoint_declared',
  'smoke_flow_declared',
  'expected_runtime_environment_declared',
  'runtime_probe_plan_bound',
  'runtime_truth_not_simulated',
  'no_network_call_executed',
]);

const REQUIRED_CONTROLS = Object.freeze([
  'pass-gold-real-contract-required',
  'health-endpoint-required',
  'readiness-endpoint-required',
  'version-endpoint-required',
  'smoke-flow-required',
  'runtime-environment-required',
  'runtime-probe-plan-required',
  'runtime-truth-not-simulated',
  'no-network-call-executed',
  'no-production-touch',
  'no-secret-access',
  'no-billing-execution',
]);

const FINAL_MESSAGE = 'V467 runtime truth probe contract prepared. No network or production probe executed. PASS GOLD REAL remains blocked until real runtime verification is explicitly authorized.';

function stableHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function blockedInput(reason) {
  return {
    module_version: MODULE_VERSION,
    status: STATUSES.BLOCKED_INPUT,
    ready: false,
    errors: [reason],
    runtime_truth_probe_ready: false,
    runtime_truth_verified: false,
    network_allowed: false,
    production_touched: false,
    secret_access_allowed: false,
    billing_execution_allowed: false,
    real_release_execution_allowed: false,
    deploy_allowed: false,
    release_allowed: false,
    stable_promotion_allowed: false,
  };
}

export function build(input = {}) {
  if (!isPlainObject(input)) return blockedInput('INPUT_NOT_OBJECT');

  const {
    pass_gold_real_contract_ready,
    runtime_probe_plan,
    required_controls,
  } = input;

  if (pass_gold_real_contract_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_CONTRACT,
      ready: false,
      errors: ['PASS_GOLD_REAL_CONTRACT_NOT_READY'],
      runtime_truth_probe_ready: false,
      runtime_truth_verified: false,
      network_allowed: false,
      production_touched: false,
      secret_access_allowed: false,
      billing_execution_allowed: false,
      real_release_execution_allowed: false,
      deploy_allowed: false,
      release_allowed: false,
      stable_promotion_allowed: false,
    };
  }

  if (!isPlainObject(runtime_probe_plan)) {
    return blockedInput('RUNTIME_PROBE_PLAN_NOT_OBJECT');
  }

  if (!Array.isArray(required_controls)) {
    return blockedInput('REQUIRED_CONTROLS_NOT_ARRAY');
  }

  const errors = [];

  for (const field of REQUIRED_PLAN_FIELDS) {
    if (runtime_probe_plan[field] !== true) {
      errors.push(`REQUIRED_RUNTIME_PLAN_FIELD_NOT_TRUE: ${field}`);
    }
  }

  for (const control of REQUIRED_CONTROLS) {
    if (!required_controls.includes(control)) {
      errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
    }
  }

  if (errors.length > 0) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors,
      runtime_truth_probe_ready: false,
      runtime_truth_verified: false,
      network_allowed: false,
      production_touched: false,
      secret_access_allowed: false,
      billing_execution_allowed: false,
      real_release_execution_allowed: false,
      deploy_allowed: false,
      release_allowed: false,
      stable_promotion_allowed: false,
    };
  }

  const evidence_hash = stableHash({
    module_version: MODULE_VERSION,
    runtime_probe_plan,
    required_controls: [...required_controls].sort(),
    final_message: FINAL_MESSAGE,
  });

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    runtime_truth_probe_ready: true,
    runtime_truth_verified: false,
    health_endpoint_declared: true,
    readiness_endpoint_declared: true,
    version_endpoint_declared: true,
    smoke_flow_declared: true,
    expected_runtime_environment_declared: true,
    runtime_probe_plan_bound: true,
    runtime_truth_not_simulated: true,
    no_network_call_executed: true,
    network_allowed: false,
    production_touched: false,
    secret_access_allowed: false,
    billing_execution_allowed: false,
    real_release_execution_allowed: false,
    deploy_allowed: false,
    release_allowed: false,
    stable_promotion_allowed: false,
    evidence_hash,
    final_message: FINAL_MESSAGE,
  };
}

export function validate(result) {
  return Boolean(
    result &&
    result.module_version === MODULE_VERSION &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.runtime_truth_probe_ready === true &&
    result.runtime_truth_verified === false &&
    result.no_network_call_executed === true &&
    result.network_allowed === false &&
    result.production_touched === false &&
    result.secret_access_allowed === false &&
    result.billing_execution_allowed === false &&
    result.real_release_execution_allowed === false &&
    result.deploy_allowed === false &&
    result.release_allowed === false &&
    result.stable_promotion_allowed === false &&
    typeof result.evidence_hash === 'string' &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  if (!result) {
    return 'V467 Runtime Truth Probe: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    'V467 Runtime Truth Probe',
    `status=${result.status}`,
    `ready=${result.ready}`,
    'runtime truth: contract prepared; no real runtime verification performed.',
    `runtime_truth_probe_ready=${result.runtime_truth_probe_ready}`,
    `runtime_truth_verified=${result.runtime_truth_verified}`,
    `no_network_call_executed=${result.no_network_call_executed}`,
    `network_allowed=${result.network_allowed}`,
    `production_touched=${result.production_touched}`,
    `evidence_hash=${result.evidence_hash || 'none'}`,
    `final_message=${result.final_message || 'none'}`,
    'REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}

export default {
  STATUSES,
  build,
  validate,
  render,
};