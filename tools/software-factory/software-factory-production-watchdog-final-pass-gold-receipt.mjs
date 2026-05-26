import crypto from 'node:crypto';

const MODULE_VERSION = 'V470';

export const STATUSES = Object.freeze({
  READY: 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_READY',
  BLOCKED_INPUT: 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_BLOCKED_INPUT',
  BLOCKED_STABLE: 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_BLOCKED_STABLE',
  FAIL: 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_FAIL',
});

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'commit',
  'version',
  'environment',
  'health_status',
  'readiness_status',
  'smoke_status',
  'rollback_ready_status',
  'rollback_drill_status',
  'previous_stable',
  'stable_candidate',
  'watchdog_policy',
  'human_authority',
  'result',
]);

const REQUIRED_WATCHDOG_FIELDS = Object.freeze([
  'health_monitor_declared',
  'error_rate_monitor_declared',
  'latency_monitor_declared',
  'rollback_trigger_declared',
  'post_release_observation_window_declared',
  'no_real_monitoring_started',
]);

const REQUIRED_CONTROLS = Object.freeze([
  'stable-promotion-controller-required',
  'final-pass-gold-receipt-required',
  'production-watchdog-required',
  'health-monitor-required',
  'error-rate-monitor-required',
  'latency-monitor-required',
  'rollback-trigger-required',
  'observation-window-required',
  'no-real-monitoring-started',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
]);

const FINAL_MESSAGE = 'V466-V470 PASS GOLD REAL closure block complete. Architecture is ready for explicit real-runtime PASS GOLD authorization. No release, deploy, tag, stable promotion, production touch, billing, secret access, network execution, or rollback execution occurred.';

function stableHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function blockedInput(reason) {
  return {
    module_version: MODULE_VERSION,
    status: STATUSES.BLOCKED_INPUT,
    ready: false,
    errors: [reason],
    production_watchdog_final_receipt_ready: false,
    v466_v470_closure_complete: false,
    architecture_ready_for_explicit_real_runtime_authorization: false,
    pass_gold_real_achieved: false,
    real_release_execution_allowed: false,
    deploy_allowed: false,
    release_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
  };
}

export function build(input = {}) {
  if (!isPlainObject(input)) return blockedInput('INPUT_NOT_OBJECT');

  const {
    stable_promotion_controller_ready,
    final_pass_gold_receipt,
    watchdog_requirements,
    required_controls,
  } = input;

  if (stable_promotion_controller_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_STABLE,
      ready: false,
      errors: ['STABLE_PROMOTION_CONTROLLER_NOT_READY'],
      production_watchdog_final_receipt_ready: false,
      v466_v470_closure_complete: false,
      architecture_ready_for_explicit_real_runtime_authorization: false,
      pass_gold_real_achieved: false,
      real_release_execution_allowed: false,
      deploy_allowed: false,
      release_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
    };
  }

  if (!isPlainObject(final_pass_gold_receipt)) {
    return blockedInput('FINAL_PASS_GOLD_RECEIPT_NOT_OBJECT');
  }

  if (!isPlainObject(watchdog_requirements)) {
    return blockedInput('WATCHDOG_REQUIREMENTS_NOT_OBJECT');
  }

  if (!Array.isArray(required_controls)) {
    return blockedInput('REQUIRED_CONTROLS_NOT_ARRAY');
  }

  const errors = [];

  for (const field of REQUIRED_RECEIPT_FIELDS) {
    if (!isNonEmptyString(final_pass_gold_receipt[field])) {
      errors.push(`MISSING_FINAL_PASS_GOLD_RECEIPT_FIELD: ${field}`);
    }
  }

  if (final_pass_gold_receipt.result === 'PASS_GOLD_REAL') {
    errors.push('PASS_GOLD_REAL_MUST_NOT_BE_MARKED_ACHIEVED');
  }

  for (const field of REQUIRED_WATCHDOG_FIELDS) {
    if (watchdog_requirements[field] !== true) {
      errors.push(`REQUIRED_WATCHDOG_FIELD_NOT_TRUE: ${field}`);
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
      production_watchdog_final_receipt_ready: false,
      v466_v470_closure_complete: false,
      architecture_ready_for_explicit_real_runtime_authorization: false,
      pass_gold_real_achieved: false,
      real_release_execution_allowed: false,
      deploy_allowed: false,
      release_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
    };
  }

  const evidence_hash = stableHash({
    module_version: MODULE_VERSION,
    final_pass_gold_receipt,
    watchdog_requirements,
    required_controls: [...required_controls].sort(),
    final_message: FINAL_MESSAGE,
  });

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    errors: [],
    production_watchdog_final_receipt_ready: true,
    v466_v470_closure_complete: true,
    architecture_ready_for_explicit_real_runtime_authorization: true,
    pass_gold_real_achieved: false,
    final_pass_gold_receipt,
    watchdog_requirements,
    health_monitor_declared: true,
    error_rate_monitor_declared: true,
    latency_monitor_declared: true,
    rollback_trigger_declared: true,
    post_release_observation_window_declared: true,
    no_real_monitoring_started: true,
    real_release_execution_allowed: false,
    deploy_allowed: false,
    release_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
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
    result.production_watchdog_final_receipt_ready === true &&
    result.v466_v470_closure_complete === true &&
    result.architecture_ready_for_explicit_real_runtime_authorization === true &&
    result.pass_gold_real_achieved === false &&
    result.no_real_monitoring_started === true &&
    result.real_release_execution_allowed === false &&
    result.deploy_allowed === false &&
    result.release_allowed === false &&
    result.tag_allowed === false &&
    result.stable_promotion_allowed === false &&
    result.production_touched === false &&
    result.billing_execution_allowed === false &&
    result.secret_access_allowed === false &&
    result.network_allowed === false &&
    result.rollback_execution_allowed === false &&
    typeof result.evidence_hash === 'string' &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  if (!result) {
    return 'V470 Production Watchdog + Final PASS GOLD Receipt: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    'V470 Production Watchdog + Final PASS GOLD Receipt',
    'V466-V470 PASS GOLD REAL closure',
    `status=${result.status}`,
    `ready=${result.ready}`,
    `production_watchdog_final_receipt_ready=${result.production_watchdog_final_receipt_ready}`,
    `v466_v470_closure_complete=${result.v466_v470_closure_complete}`,
    `architecture_ready_for_explicit_real_runtime_authorization=${result.architecture_ready_for_explicit_real_runtime_authorization}`,
    `pass_gold_real_achieved=${result.pass_gold_real_achieved}`,
    `no_real_monitoring_started=${result.no_real_monitoring_started}`,
    `real_release_execution_allowed=${result.real_release_execution_allowed}`,
    `stable_promotion_allowed=${result.stable_promotion_allowed}`,
    `production_touched=${result.production_touched}`,
    `network_allowed=${result.network_allowed}`,
    `rollback_execution_allowed=${result.rollback_execution_allowed}`,
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