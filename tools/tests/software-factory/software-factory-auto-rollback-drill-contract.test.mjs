// V468 AUTO ROLLBACK DRILL CONTRACT TEST
//*****************
// Generation: $(new Date().toISOString())
// Status: 🚁 Pending PR Creation

import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-auto-rollback-drill-contract.mjs';

function pass(name) {
  console.log(`PASS: ${name}`);
}

function test(name, fn) {
  console.log(`\nTEST: ${name}`);
  fn();
  pass(name);
}

const mockPlan = {
  previous_stable_version_declared: true,
  rollback_target_declared: true,
  rollback_trigger_policy_declared: true,
  rollback_health_check_declared: true,
  rollback_smoke_check_declared: true,
  rollback_evidence_required: true,
  rollback_dry_run_only: true,
  rollback_real_execution_blocked: true
};

const requiredControls = [
  'runtime-truth-probe-required',
  'previous-stable-version-required',
  'rollback-target-required',
  'rollback-trigger-policy-required',
  'rollback-health-check-required',
  'rollback-smoke-check-required',
  'rollback-evidence-required',
  'rollback-dry-run-only',
  'rollback-real-execution-blocked',
  'no-real-rollback',
  'no-production-touch',
  'no-release-execution',
  'no-deploy-execution'
];

test('STATUSES exported', () => {
  assert.ok(STATUSES);
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
  const res = build(null);
  assert.equal(res.status, STATUSES.BLOCKED_INPUT);
  assert.ok(res.errors.includes('INPUT_NOT_OBJECT'));
});

test('runtime_truth_probe_ready false → BLOCKED_RUNTIME', () => {
  const res = build({ runtime_truth_probe_ready: false, rollback_drill_plan: mockPlan, required_controls: requiredControls });
  assert.equal(res.status, STATUSES.BLOCKED_RUNTIME);
  assert.ok(res.errors.includes('RUNTIME_TRUTH_PROBE_NOT_READY'));
});

test('missing rollback_drill_plan → BLOCKED_INPUT', () => {
  const res = build({ runtime_truth_probe_ready: true, required_controls: requiredControls });
  assert.equal(res.status, STATUSES.BLOCKED_INPUT);
  assert.ok(res.errors.includes('ROLLBACK_DRILL_PLAN_NOT_OBJECT'));
});

test('required_controls not array → BLOCKED_INPUT', () => {
  const res = build({ runtime_truth_probe_ready: true, rollback_drill_plan: mockPlan, required_controls: 'not-array' });
  assert.equal(res.status, STATUSES.BLOCKED_INPUT);
  assert.ok(res.errors.includes('REQUIRED_CONTROLS_NOT_ARRAY'));
});

test('each required rollback field false → FAIL', () => {
  const fields = Object.keys(mockPlan);
  fields.forEach((field) => {
    const badPlan = { ...mockPlan, [field]: false };
    const res = build({ runtime_truth_probe_ready: true, rollback_drill_plan: badPlan, required_controls: requiredControls });
    assert.equal(res.status, STATUSES.FAIL);
    assert.match(res.error, /REQUIRED_ROLLBACK_DRILL_FIELD_NOT_TRUE/);
  });
});

test('missing required control → FAIL', () => {
  const missing = requiredControls.slice(0, -1);
  const res = build({ runtime_truth_probe_ready: true, rollback_drill_plan: mockPlan, required_controls: missing });
  assert.equal(res.status, STATUSES.FAIL);
  assert.match(res.error, /MISSING_REQUIRED_CONTROL/);
});

test('valid input → READY', () => {
  const res = build({ runtime_truth_probe_ready: true, rollback_drill_plan: mockPlan, required_controls: requiredControls });
  assert.equal(res.status, STATUSES.READY);
  assert.equal(res.module_version, 'V468');
  assert.equal(res.ready, true);
  assert.equal(res.auto_rollback_drill_contract_ready, true);
  assert.equal(res.rollback_ready_verified, false);
  assert.equal(res.rollback_drill_verified, false);
  assert.equal(res.rollback_dry_run_only, true);
  assert.equal(res.rollback_real_execution_blocked, true);
  assert.equal(res.evidence_hash.length, 64);
  assert.equal(res.final_message, 'V468 auto rollback drill contract prepared. Real rollback execution remains blocked until explicit PASS GOLD REAL authorization.');
  const dangerous = [
    'rollback_execution_allowed',
    'production_touched',
    'deploy_allowed',
    'release_allowed',
    'real_release_execution_allowed',
    'network_allowed',
    'secret_access_allowed',
    'billing_execution_allowed',
    'tag_allowed',
    'stable_promotion_allowed'
  ];
  dangerous.forEach((f) => assert.equal(res[f], false));
});

test('validate READY → true', () => {
  const res = build({ runtime_truth_probe_ready: true, rollback_drill_plan: mockPlan, required_controls: requiredControls });
  const v = validate(res);
  assert.equal(v.valid, true);
});

test('validate blocked/invalid → false', () => {
  const bad = build(null);
  const v = validate(bad);
  assert.equal(v.valid, false);
});

test('render contains required texts', () => {
  const out = render({ status: STATUSES.READY, final_message: 'msg', evidence_hash: 'a'.repeat(64), rollback_execution_allowed: false, production_touched: false, deploy_allowed: false, release_allowed: false, network_allowed: false });
  assert.ok(out.content.includes('V468 Auto Rollback Drill Contract'));
  assert.ok(out.content.includes('REGRA ABSOLUTA'));
  assert.ok(out.content.includes('FINAL MESSAGE'));
  assert.ok(out.content.includes('EVIDENCE_HASH'));
});
