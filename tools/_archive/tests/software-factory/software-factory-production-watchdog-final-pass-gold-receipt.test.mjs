import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-production-watchdog-final-pass-gold-receipt.mjs';

console.log('=== TESTING V470 PRODUCTION WATCHDOG FINAL PASS GOLD RECEIPT ===');

const FINAL_MESSAGE = 'V466-V470 PASS GOLD REAL closure block complete. Architecture is ready for explicit real-runtime PASS GOLD authorization. No release, deploy, tag, stable promotion, production touch, billing, secret access, network execution, or rollback execution occurred.';

const receiptFields = [
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
];

const watchdogFields = [
  'health_monitor_declared',
  'error_rate_monitor_declared',
  'latency_monitor_declared',
  'rollback_trigger_declared',
  'post_release_observation_window_declared',
  'no_real_monitoring_started',
];

const requiredControls = [
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
];

function validInput() {
  return {
    stable_promotion_controller_ready: true,
    final_pass_gold_receipt: {
      commit: 'e55742e',
      version: 'V470',
      environment: 'controlled-release-candidate',
      health_status: 'PENDING_AUTHORIZATION',
      readiness_status: 'PENDING_AUTHORIZATION',
      smoke_status: 'PENDING_AUTHORIZATION',
      rollback_ready_status: 'PENDING_AUTHORIZATION',
      rollback_drill_status: 'PENDING_AUTHORIZATION',
      previous_stable: 'stable-current',
      stable_candidate: 'stable-candidate-v470',
      watchdog_policy: 'watchdog-policy-required',
      human_authority: 'HUMAN_AUTHORITY_REQUIRED',
      result: 'PASS_GOLD_REAL_PENDING_AUTHORIZATION',
    },
    watchdog_requirements: Object.fromEntries(watchdogFields.map((field) => [field, true])),
    required_controls: [...requiredControls],
  };
}

function pass(name) {
  console.log(`PASS: ${name}`);
}

function test(name, fn) {
  console.log(`\nTEST: ${name}`);
  fn();
  pass(name);
}

test('STATUSES exported', () => {
  assert.equal(STATUSES.READY, 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_READY');
  assert.equal(STATUSES.BLOCKED_INPUT, 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_BLOCKED_INPUT');
  assert.equal(STATUSES.BLOCKED_STABLE, 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_BLOCKED_STABLE');
  assert.equal(STATUSES.FAIL, 'PRODUCTION_WATCHDOG_FINAL_PASS_GOLD_RECEIPT_FAIL');
});

test('build exported', () => {
  assert.equal(typeof build, 'function');
});

test('validate exported', () => {
  assert.equal(typeof validate, 'function');
});

test('render exported', () => {
  assert.equal(typeof render, 'function');
});

test('null input → BLOCKED_INPUT', () => {
  const result = build(null);
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('stable_promotion_controller_ready false → BLOCKED_STABLE', () => {
  const result = build({ stable_promotion_controller_ready: false });
  assert.equal(result.status, STATUSES.BLOCKED_STABLE);
  assert.deepEqual(result.errors, ['STABLE_PROMOTION_CONTROLLER_NOT_READY']);
});

test('final_pass_gold_receipt missing/not object → BLOCKED_INPUT', () => {
  const result = build({ stable_promotion_controller_ready: true });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);

  const resultBad = build({
    stable_promotion_controller_ready: true,
    final_pass_gold_receipt: 'bad',
    watchdog_requirements: {},
    required_controls: [],
  });
  assert.equal(resultBad.status, STATUSES.BLOCKED_INPUT);
});

test('watchdog_requirements missing/not object → BLOCKED_INPUT', () => {
  const result = build({
    stable_promotion_controller_ready: true,
    final_pass_gold_receipt: {},
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('required_controls not array → BLOCKED_INPUT', () => {
  const input = validInput();
  input.required_controls = 'bad';
  const result = build(input);
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('missing receipt field → FAIL', () => {
  for (const field of receiptFields) {
    const input = validInput();
    delete input.final_pass_gold_receipt[field];
    assert.equal(build(input).status, STATUSES.FAIL);
  }
});

test('result must not be PASS_GOLD_REAL achieved', () => {
  const input = validInput();
  input.final_pass_gold_receipt.result = 'PASS_GOLD_REAL';
  const result = build(input);
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.includes('PASS_GOLD_REAL_MUST_NOT_BE_MARKED_ACHIEVED'));
});

test('missing watchdog requirement → FAIL', () => {
  for (const field of watchdogFields) {
    const input = validInput();
    input.watchdog_requirements[field] = false;
    assert.equal(build(input).status, STATUSES.FAIL);

    const inputMissing = validInput();
    delete inputMissing.watchdog_requirements[field];
    assert.equal(build(inputMissing).status, STATUSES.FAIL);
  }
});

test('missing required control → FAIL', () => {
  const input = validInput();
  input.required_controls = input.required_controls.slice(1);
  const result = build(input);
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.some((error) => error.includes('MISSING_REQUIRED_CONTROL')));
});

const ready = build(validInput());

test('valid input → READY', () => {
  assert.equal(ready.status, STATUSES.READY);
  assert.equal(ready.module_version, 'V470');
  assert.equal(ready.production_watchdog_final_receipt_ready, true);
});

test('closure flags correct', () => {
  assert.equal(ready.v466_v470_closure_complete, true);
  assert.equal(ready.architecture_ready_for_explicit_real_runtime_authorization, true);
  assert.equal(ready.pass_gold_real_achieved, false);
  assert.equal(ready.no_real_monitoring_started, true);
});

test('all dangerous flags false', () => {
  assert.equal(ready.real_release_execution_allowed, false);
  assert.equal(ready.deploy_allowed, false);
  assert.equal(ready.release_allowed, false);
  assert.equal(ready.tag_allowed, false);
  assert.equal(ready.stable_promotion_allowed, false);
  assert.equal(ready.production_touched, false);
  assert.equal(ready.billing_execution_allowed, false);
  assert.equal(ready.secret_access_allowed, false);
  assert.equal(ready.network_allowed, false);
  assert.equal(ready.rollback_execution_allowed, false);
});

test('evidence_hash is 64 chars', () => {
  assert.equal(ready.evidence_hash.length, 64);
});

test('evidence_hash deterministic', () => {
  assert.equal(build(validInput()).evidence_hash, ready.evidence_hash);
});

test('final_message exact', () => {
  assert.equal(ready.final_message, FINAL_MESSAGE);
});

test('validate READY → true', () => {
  assert.equal(validate(ready), true);
});

test('validate blocked/invalid → false', () => {
  assert.equal(validate(build(null)), false);
  assert.equal(validate({ status: STATUSES.READY }), false);
});

test('render contains V470', () => {
  assert(render(ready).includes('V470 Production Watchdog + Final PASS GOLD Receipt'));
});

test('render contains V466-V470', () => {
  assert(render(ready).includes('V466-V470'));
});

test('render contains PASS GOLD REAL closure', () => {
  assert(render(ready).includes('PASS GOLD REAL closure'));
});

test('render contains REGRA ABSOLUTA', () => {
  assert(render(ready).includes('REGRA ABSOLUTA'));
});

test('render contains final_message', () => {
  assert(render(ready).includes(FINAL_MESSAGE));
});

console.log('\n=== V470 TESTING COMPLETE ===');