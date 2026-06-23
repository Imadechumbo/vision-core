import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pass-gold-real-contract.mjs';

console.log('=== TESTING V466 PASS GOLD REAL CONTRACT ===');

const FINAL_MESSAGE = 'V466 PASS GOLD REAL contract defined. Real release execution remains blocked until runtime truth, rollback proof, stable promotion control, watchdog evidence, and human authority are all verified.';

const requiredRequirementIds = [
  'runtime-health-verified',
  'runtime-readiness-verified',
  'runtime-version-verified',
  'primary-smoke-flow-verified',
  'rollback-ready-verified',
  'rollback-drill-verified',
  'previous-stable-bound',
  'stable-candidate-bound',
  'evidence-receipt-real-required',
  'human-authority-bound',
  'production-watchdog-required',
  'no-fake-pass-gold',
  'no-synthetic-evidence',
  'no-unverified-stable-promotion',
];

const requiredControls = [
  'pass-gold-real-required',
  'runtime-truth-required',
  'smoke-flow-required',
  'rollback-proof-required',
  'stable-control-required',
  'watchdog-required',
  'evidence-receipt-required',
  'human-authority-required',
  'no-fake-pass-gold',
  'no-synthetic-evidence',
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
    pass_gold_real_requirements: requiredRequirementIds.map((id) => ({
      id,
      type: 'pass-gold-real-requirement',
      verified: true,
    })),
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
  assert.equal(STATUSES.READY, 'PASS_GOLD_REAL_CONTRACT_READY');
  assert.equal(STATUSES.BLOCKED_INPUT, 'PASS_GOLD_REAL_CONTRACT_BLOCKED_INPUT');
  assert.equal(STATUSES.FAIL, 'PASS_GOLD_REAL_CONTRACT_FAIL');
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

test('requirements not array → BLOCKED_INPUT', () => {
  const result = build({
    pass_gold_real_requirements: 'bad',
    required_controls: requiredControls,
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('controls not array → BLOCKED_INPUT', () => {
  const result = build({
    pass_gold_real_requirements: [],
    required_controls: 'bad',
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('invalid requirement item → FAIL', () => {
  const result = build({
    pass_gold_real_requirements: [{ id: '', type: '', verified: false }],
    required_controls: requiredControls,
  });
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.includes('INVALID_PASS_GOLD_REAL_REQUIREMENT_ID'));
  assert(result.errors.includes('INVALID_PASS_GOLD_REAL_REQUIREMENT_TYPE'));
  assert(result.errors.includes('PASS_GOLD_REAL_REQUIREMENT_NOT_VERIFIED'));
});

test('missing required requirement → FAIL', () => {
  const input = validInput();
  input.pass_gold_real_requirements = input.pass_gold_real_requirements.slice(1);
  const result = build(input);
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.some((error) => error.includes('MISSING_REQUIRED_REQUIREMENT')));
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
  assert.equal(ready.module_version, 'V466');
  assert.equal(ready.pass_gold_real_contract_ready, true);
});

test('PASS GOLD REAL remains unverified', () => {
  assert.equal(ready.pass_gold_real_verified, false);
  assert.equal(ready.runtime_health_verified, false);
  assert.equal(ready.runtime_readiness_verified, false);
  assert.equal(ready.primary_smoke_flow_verified, false);
  assert.equal(ready.rollback_ready_verified, false);
  assert.equal(ready.rollback_drill_verified, false);
});

test('contract bindings true', () => {
  assert.equal(ready.stable_candidate_bound, true);
  assert.equal(ready.previous_stable_bound, true);
  assert.equal(ready.evidence_receipt_real_required, true);
  assert.equal(ready.human_authority_bound, true);
  assert.equal(ready.production_watchdog_required, true);
  assert.equal(ready.no_fake_pass_gold, true);
  assert.equal(ready.no_synthetic_evidence, true);
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

test('render contains V466', () => {
  assert(render(ready).includes('V466 PASS GOLD REAL Contract'));
});

test('render contains PASS GOLD REAL', () => {
  assert(render(ready).includes('PASS GOLD REAL'));
});

test('render contains REGRA ABSOLUTA', () => {
  assert(render(ready).includes('REGRA ABSOLUTA'));
});

test('render contains final_message', () => {
  assert(render(ready).includes(FINAL_MESSAGE));
});

console.log('\n=== V466 TESTING COMPLETE ===');