import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-stable-promotion-controller.mjs';

console.log('=== TESTING V469 STABLE PROMOTION CONTROLLER ===');

const FINAL_MESSAGE = 'V469 stable promotion controller prepared. Stable promotion remains blocked until PASS GOLD REAL evidence and human authority are verified.';

const requiredFields = [
  'pass_gold_real_contract_ready',
  'runtime_truth_verified',
  'rollback_drill_verified',
  'watchdog_bound',
  'final_pass_gold_receipt_bound',
  'human_authority_bound',
  'previous_stable_preserved',
  'stable_candidate_verified',
  'fake_pass_gold_rejected',
  'synthetic_evidence_rejected',
];

const requiredControls = [
  'auto-rollback-drill-contract-required',
  'pass-gold-real-contract-required',
  'runtime-truth-required',
  'rollback-drill-required',
  'watchdog-required',
  'final-pass-gold-receipt-required',
  'human-authority-required',
  'previous-stable-preserved',
  'stable-candidate-verified',
  'fake-pass-gold-rejected',
  'synthetic-evidence-rejected',
  'no-unverified-stable-promotion',
  'stable-promotion-blocked-until-pass-gold-real',
];

function validInput() {
  return {
    auto_rollback_drill_contract_ready: true,
    stable_promotion_requirements: Object.fromEntries(requiredFields.map((field) => [field, true])),
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
  assert.equal(STATUSES.READY, 'STABLE_PROMOTION_CONTROLLER_READY');
  assert.equal(STATUSES.BLOCKED_INPUT, 'STABLE_PROMOTION_CONTROLLER_BLOCKED_INPUT');
  assert.equal(STATUSES.BLOCKED_ROLLBACK, 'STABLE_PROMOTION_CONTROLLER_BLOCKED_ROLLBACK');
  assert.equal(STATUSES.FAIL, 'STABLE_PROMOTION_CONTROLLER_FAIL');
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

test('auto_rollback_drill_contract_ready false → BLOCKED_ROLLBACK', () => {
  const result = build({ auto_rollback_drill_contract_ready: false });
  assert.equal(result.status, STATUSES.BLOCKED_ROLLBACK);
  assert.deepEqual(result.errors, ['AUTO_ROLLBACK_DRILL_CONTRACT_NOT_READY']);
});

test('stable_promotion_requirements missing/not object → BLOCKED_INPUT', () => {
  const result = build({ auto_rollback_drill_contract_ready: true });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);

  const resultBad = build({
    auto_rollback_drill_contract_ready: true,
    stable_promotion_requirements: 'bad',
    required_controls: requiredControls,
  });
  assert.equal(resultBad.status, STATUSES.BLOCKED_INPUT);
});

test('required_controls not array → BLOCKED_INPUT', () => {
  const result = build({
    auto_rollback_drill_contract_ready: true,
    stable_promotion_requirements: {},
    required_controls: 'bad',
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('each required stable promotion field false/missing → FAIL', () => {
  for (const field of requiredFields) {
    const inputFalse = validInput();
    inputFalse.stable_promotion_requirements[field] = false;
    assert.equal(build(inputFalse).status, STATUSES.FAIL);

    const inputMissing = validInput();
    delete inputMissing.stable_promotion_requirements[field];
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
  assert.equal(ready.module_version, 'V469');
  assert.equal(ready.stable_promotion_controller_ready, true);
});

test('stable promotion remains blocked', () => {
  assert.equal(ready.stable_promotion_allowed, false);
  assert.equal(ready.pass_gold_real_verified, false);
  assert.equal(ready.human_authority_verified, false);
  assert.equal(ready.runtime_truth_verified, false);
  assert.equal(ready.rollback_drill_verified, false);
});

test('fake and synthetic evidence rejected', () => {
  assert.equal(ready.fake_pass_gold_rejected, true);
  assert.equal(ready.synthetic_evidence_rejected, true);
});

test('all dangerous flags false', () => {
  assert.equal(ready.stable_promotion_allowed, false);
  assert.equal(ready.tag_allowed, false);
  assert.equal(ready.release_allowed, false);
  assert.equal(ready.deploy_allowed, false);
  assert.equal(ready.production_touched, false);
  assert.equal(ready.real_release_execution_allowed, false);
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

test('render contains V469', () => {
  assert(render(ready).includes('V469 Stable Promotion Controller'));
});

test('render contains stable promotion', () => {
  assert(render(ready).includes('stable promotion'));
});

test('render contains REGRA ABSOLUTA', () => {
  assert(render(ready).includes('REGRA ABSOLUTA'));
});

test('render contains final_message', () => {
  assert(render(ready).includes(FINAL_MESSAGE));
});

console.log('\n=== V469 TESTING COMPLETE ===');