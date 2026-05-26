import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-truth-probe.mjs';

console.log('=== TESTING V467 RUNTIME TRUTH PROBE ===');

const FINAL_MESSAGE = 'V467 runtime truth probe contract prepared. No network or production probe executed. PASS GOLD REAL remains blocked until real runtime verification is explicitly authorized.';

const requiredPlanFields = [
  'health_endpoint_declared',
  'readiness_endpoint_declared',
  'version_endpoint_declared',
  'smoke_flow_declared',
  'expected_runtime_environment_declared',
  'runtime_probe_plan_bound',
  'runtime_truth_not_simulated',
  'no_network_call_executed',
];

const requiredControls = [
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
];

function validInput() {
  return {
    pass_gold_real_contract_ready: true,
    runtime_probe_plan: Object.fromEntries(requiredPlanFields.map((field) => [field, true])),
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
  assert.equal(STATUSES.READY, 'RUNTIME_TRUTH_PROBE_READY');
  assert.equal(STATUSES.BLOCKED_INPUT, 'RUNTIME_TRUTH_PROBE_BLOCKED_INPUT');
  assert.equal(STATUSES.BLOCKED_CONTRACT, 'RUNTIME_TRUTH_PROBE_BLOCKED_CONTRACT');
  assert.equal(STATUSES.FAIL, 'RUNTIME_TRUTH_PROBE_FAIL');
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

test('pass_gold_real_contract_ready false → BLOCKED_CONTRACT', () => {
  const result = build({ pass_gold_real_contract_ready: false });
  assert.equal(result.status, STATUSES.BLOCKED_CONTRACT);
  assert.deepEqual(result.errors, ['PASS_GOLD_REAL_CONTRACT_NOT_READY']);
});

test('runtime_probe_plan missing/not object → BLOCKED_INPUT', () => {
  const result = build({ pass_gold_real_contract_ready: true });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);

  const resultBad = build({
    pass_gold_real_contract_ready: true,
    runtime_probe_plan: 'bad',
    required_controls: requiredControls,
  });
  assert.equal(resultBad.status, STATUSES.BLOCKED_INPUT);
});

test('required_controls not array → BLOCKED_INPUT', () => {
  const result = build({
    pass_gold_real_contract_ready: true,
    runtime_probe_plan: {},
    required_controls: 'bad',
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('each required runtime field false/missing → FAIL', () => {
  for (const field of requiredPlanFields) {
    const inputFalse = validInput();
    inputFalse.runtime_probe_plan[field] = false;
    assert.equal(build(inputFalse).status, STATUSES.FAIL);

    const inputMissing = validInput();
    delete inputMissing.runtime_probe_plan[field];
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
  assert.equal(ready.module_version, 'V467');
  assert.equal(ready.runtime_truth_probe_ready, true);
});

test('runtime_truth_verified remains false', () => {
  assert.equal(ready.runtime_truth_verified, false);
});

test('no_network_call_executed true', () => {
  assert.equal(ready.no_network_call_executed, true);
});

test('network_allowed false', () => {
  assert.equal(ready.network_allowed, false);
});

test('all dangerous flags false', () => {
  assert.equal(ready.network_allowed, false);
  assert.equal(ready.production_touched, false);
  assert.equal(ready.secret_access_allowed, false);
  assert.equal(ready.billing_execution_allowed, false);
  assert.equal(ready.real_release_execution_allowed, false);
  assert.equal(ready.deploy_allowed, false);
  assert.equal(ready.release_allowed, false);
  assert.equal(ready.stable_promotion_allowed, false);
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

test('render contains V467', () => {
  assert(render(ready).includes('V467 Runtime Truth Probe'));
});

test('render contains runtime truth', () => {
  assert(render(ready).includes('runtime truth'));
});

test('render contains REGRA ABSOLUTA', () => {
  assert(render(ready).includes('REGRA ABSOLUTA'));
});

test('render contains final_message', () => {
  assert(render(ready).includes(FINAL_MESSAGE));
});

console.log('\n=== V467 TESTING COMPLETE ===');