import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-runtime-pass-gold-authorization-plan.mjs';

console.log('=== TESTING RTA-0 REAL-RUNTIME PASS GOLD AUTHORIZATION PLAN ===');

const requiredPlanFields = [
  'health_probe_declared',
  'readiness_probe_declared',
  'version_probe_declared',
  'smoke_probe_declared',
  'rollback_readiness_probe_declared',
  'rollback_drill_evidence_declared',
  'watchdog_evidence_declared',
  'human_authority_required',
  'no_release_execution',
  'no_deploy_execution',
  'no_tag_creation',
  'no_stable_promotion',
  'no_production_touch',
  'no_billing_access',
  'no_secret_access',
  'no_network_to_production',
  'no_real_rollback_execution',
];

const requiredEvidence = [
  'exact-command',
  'timestamp',
  'exit-code',
  'stdout-summary',
  'stderr-summary',
  'commit-hash',
  'environment',
  'no-production-touch-proof',
  'no-secrets-proof',
  'rollback-readiness-proof',
  'watchdog-proof',
  'human-authority-record',
];

const requiredControls = [
  'v466-v470-closure-required',
  'human-authority-required',
  'runtime-health-required',
  'runtime-readiness-required',
  'runtime-version-binding-required',
  'smoke-flow-required',
  'rollback-readiness-required',
  'rollback-drill-evidence-required',
  'watchdog-evidence-required',
  'no-release-execution',
  'no-deploy-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-production-touch',
  'no-billing-access',
  'no-secret-access',
  'no-network-to-production',
  'no-real-rollback-execution',
  'v471-blocked',
];

function validInput() {
  return {
    v466_v470_closure_complete: true,
    runtime_authorization_plan: Object.fromEntries(requiredPlanFields.map((field) => [field, true])),
    required_evidence: [...requiredEvidence],
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
  assert.equal(STATUSES.READY, 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_READY');
  assert.equal(STATUSES.BLOCKED_INPUT, 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_BLOCKED_INPUT');
  assert.equal(STATUSES.BLOCKED_CLOSURE, 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_BLOCKED_CLOSURE');
  assert.equal(STATUSES.FAIL, 'REAL_RUNTIME_PASS_GOLD_AUTHORIZATION_PLAN_FAIL');
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
  assert.equal(result.errors[0], 'INPUT_NOT_OBJECT');
});

test('v466_v470_closure_complete false → BLOCKED_CLOSURE', () => {
  const result = build({ v466_v470_closure_complete: false });
  assert.equal(result.status, STATUSES.BLOCKED_CLOSURE);
  assert.deepEqual(result.errors, ['V466_V470_CLOSURE_NOT_COMPLETE']);
});

test('runtime_authorization_plan missing/not object → BLOCKED_INPUT', () => {
  const result = build({ v466_v470_closure_complete: true });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
  assert.equal(result.errors[0], 'RUNTIME_AUTHORIZATION_PLAN_NOT_OBJECT');

  const resultBad = build({
    v466_v470_closure_complete: true,
    runtime_authorization_plan: 'bad',
    required_evidence: [],
    required_controls: [],
  });
  assert.equal(resultBad.status, STATUSES.BLOCKED_INPUT);
});

test('required_evidence not array → BLOCKED_INPUT', () => {
  const result = build({
    v466_v470_closure_complete: true,
    runtime_authorization_plan: {},
    required_evidence: 'bad',
    required_controls: [],
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('required_controls not array → BLOCKED_INPUT', () => {
  const result = build({
    v466_v470_closure_complete: true,
    runtime_authorization_plan: {},
    required_evidence: [],
    required_controls: 'bad',
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('each required runtime authorization field false → FAIL', () => {
  for (const field of requiredPlanFields) {
    const input = validInput();
    input.runtime_authorization_plan[field] = false;
    const result = build(input);
    assert.equal(result.status, STATUSES.FAIL);
    assert(result.errors.some((error) => error.includes(`REQUIRED_RUNTIME_AUTHORIZATION_FIELD_NOT_TRUE: ${field}`)));
  }
});

test('missing required evidence → FAIL', () => {
  const input = validInput();
  input.required_evidence = input.required_evidence.slice(1);
  const result = build(input);
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.some((error) => error.includes('MISSING_REQUIRED_EVIDENCE')));
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
  assert.equal(ready.module_version, 'RTA-0');
  assert.equal(ready.real_runtime_authorization_plan_ready, true);
  assert.equal(ready.v466_v470_closure_complete, true);
});

test('runtime execution remains blocked', () => {
  assert.equal(ready.runtime_execution_authorized, false);
  assert.equal(ready.pass_gold_real_achieved, false);
  assert.equal(ready.v471_allowed, false);
});

test('all dangerous flags false', () => {
  assert.equal(ready.release_allowed, false);
  assert.equal(ready.deploy_allowed, false);
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
  assert.equal(ready.final_message, 'RTA-0 real-runtime PASS GOLD authorization plan prepared. Runtime execution remains blocked until explicit human authorization and complete evidence binding.');
});

test('validate READY → true', () => {
  assert.equal(validate(ready), true);
});

test('validate blocked/invalid → false', () => {
  assert.equal(validate(build(null)), false);
  assert.equal(validate({ status: STATUSES.READY }), false);
});

test('render contains RTA-0', () => {
  assert(render(ready).includes('RTA-0 Real-Runtime PASS GOLD Authorization Plan'));
});

test('render contains V466-V470 closure', () => {
  assert(render(ready).includes('V466-V470 closure'));
});

test('render contains runtime execution remains blocked', () => {
  assert(render(ready).includes('runtime execution remains blocked'));
});

test('render contains V471 blocked', () => {
  assert(render(ready).includes('V471 blocked'));
});

test('render contains final_message', () => {
  assert(render(ready).includes('RTA-0 real-runtime PASS GOLD authorization plan prepared'));
});

test('render contains REGRA ABSOLUTA', () => {
  assert(render(ready).includes('REGRA ABSOLUTA'));
});

console.log('\n=== RTA-0 TESTING COMPLETE ===');