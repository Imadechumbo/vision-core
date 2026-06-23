/**
 * V408 — Release Kill-Switch Binding Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-release-kill-switch-binding.mjs';

const REQUIRED_CONTROLS = [
  'release-kill-switch-binding-required',
  'hard-stop-required',
  'kill-switch-not-armed',
  'hard-stop-not-lifted',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-artifact-publish',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
  'audit-required',
  'pass-gold-real-required',
];

const KILL_SWITCH_ITEMS = [
  {
    kill_switch_item_id: 'ksi-001',
    kill_switch_type: 'release_kill_switch',
    kill_switch_mode: 'metadata-only',
    kill_switch_hash: 'a'.repeat(64),
  },
  {
    kill_switch_item_id: 'ksi-002',
    kill_switch_type: 'production_kill_switch',
    kill_switch_mode: 'no-op',
    kill_switch_hash: 'b'.repeat(64),
  },
];

function validInput(overrides = {}) {
  return {
    release_kill_switch_binding_id: 'rksb-001',
    hard_stop_enforcement_gate_id: 'hseg-001',
    hard_stop_enforcement_gate_ready: true,
    kill_switch_items: KILL_SWITCH_ITEMS,
    required_kill_switch_controls: [...REQUIRED_CONTROLS],
    kill_switch_level: 'critical',
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\nV408 — Release Kill-Switch Binding\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT));
test('STATUSES has BLOCKED_HARD_STOP', () => assert.ok(STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_HARD_STOP));
test('STATUSES has FAIL', () => assert.ok(STATUSES.RELEASE_KILL_SWITCH_BINDING_FAIL));
test('STATUSES has READY', () => assert.ok(STATUSES.RELEASE_KILL_SWITCH_BINDING_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT);
});

// Missing dependency
test('hard stop gate not ready → BLOCKED_HARD_STOP', () => {
  const r = build(validInput({ hard_stop_enforcement_gate_ready: false }));
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_HARD_STOP);
});
test('hard stop gate id missing → BLOCKED_INPUT', () => {
  const r = build(validInput({ hard_stop_enforcement_gate_id: undefined }));
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT);
});

// Fail cases
test('invalid kill_switch_type → FAIL', () => {
  const r = build(validInput({
    kill_switch_items: [{ kill_switch_item_id: 'ksi-x', kill_switch_type: 'invalid_ks', kill_switch_mode: 'no-op', kill_switch_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_FAIL);
});
test('invalid kill_switch_mode → FAIL', () => {
  const r = build(validInput({
    kill_switch_items: [{ kill_switch_item_id: 'ksi-x', kill_switch_type: 'release_kill_switch', kill_switch_mode: 'arm-now', kill_switch_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_FAIL);
});
test('missing required control → FAIL', () => {
  const r = build(validInput({ required_kill_switch_controls: ['release-kill-switch-binding-required'] }));
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_FAIL);
});
test('empty kill_switch_items → BLOCKED_INPUT', () => {
  const r = build(validInput({ kill_switch_items: [] }));
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_BLOCKED_INPUT);
});

// Ready path
test('valid input → READY', () => {
  const r = build(validInput());
  assert.strictEqual(r.status, STATUSES.RELEASE_KILL_SWITCH_BINDING_READY);
});
test('READY has hash 64 chars', () => {
  const r = build(validInput());
  assert.strictEqual(r.hash.length, 64);
});
test('hash deterministic', () => {
  const r1 = build(validInput());
  const r2 = build(validInput());
  assert.strictEqual(r1.hash, r2.hash);
});
test('validate READY → true', () => {
  const r = build(validInput());
  assert.strictEqual(validate(r), true);
});
test('validate BLOCKED → false', () => {
  const r = build(null);
  assert.strictEqual(validate(r), false);
});
test('validate BLOCKED_HARD_STOP → false', () => {
  const r = build(validInput({ hard_stop_enforcement_gate_ready: false }));
  assert.strictEqual(validate(r), false);
});

// Render
test('render returns string', () => {
  const r = build(validInput());
  assert.strictEqual(typeof render(r), 'string');
});
test('render contains REGRA ABSOLUTA', () => {
  const r = build(validInput());
  assert.ok(render(r).includes('SEM PASS GOLD REAL'));
});
test('render null safe', () => {
  assert.strictEqual(typeof render(null), 'string');
  assert.ok(render(null).includes('SEM PASS GOLD REAL'));
});

// Invariants — READY
test('READY: release_kill_switch_bound=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.release_kill_switch_bound, false);
});
test('READY: release_kill_switch_armed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.release_kill_switch_armed, false);
});
test('READY: real_release_hard_stop_lifted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_lifted, false);
});
test('READY: real_release_execution_allowed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_execution_allowed, false);
});
test('READY: real_execution_allowed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_execution_allowed, false);
});
test('READY: production_touched=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.production_touched, false);
});
test('READY: release_allowed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.release_allowed, false);
});
test('READY: deploy_allowed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.deploy_allowed, false);
});
test('READY: tag_allowed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.tag_allowed, false);
});
test('READY: stable_allowed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.stable_allowed, false);
});
test('READY: real_release_executed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_executed, false);
});
test('READY: real_tag_created=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_tag_created, false);
});
test('READY: real_stable_promoted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_stable_promoted, false);
});
test('READY: artifact_published=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.artifact_published, false);
});
test('READY: billing_executed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.billing_executed, false);
});
test('READY: secrets_accessed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.secrets_accessed, false);
});
test('READY: network_accessed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.network_accessed, false);
});
test('READY: rollback_executed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.rollback_executed, false);
});
test('READY: hard_stop_enforced=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.hard_stop_enforced, false);
});
test('READY: final_real_release_preflight_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_real_release_preflight_passed, false);
});
test('READY: final_operator_safety_acknowledged=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_operator_safety_acknowledged, false);
});
test('READY: real_release_hard_stop_phase_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
});
test('READY: operator_go_no_go_phase_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_no_go_phase_passed, false);
});
test('READY: operator_go_decision_granted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_decision_granted, false);
});
test('READY: real_release_command_executed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_command_executed, false);
});

// Invariants — BLOCKED
test('BLOCKED_INPUT: release_kill_switch_bound=false', () => {
  const r = build(null);
  assert.strictEqual(r.release_kill_switch_bound, false);
});
test('BLOCKED_INPUT: release_kill_switch_armed=false', () => {
  const r = build(null);
  assert.strictEqual(r.release_kill_switch_armed, false);
});
test('BLOCKED_HARD_STOP: release_kill_switch_armed=false', () => {
  const r = build(validInput({ hard_stop_enforcement_gate_ready: false }));
  assert.strictEqual(r.release_kill_switch_armed, false);
});
test('BLOCKED_HARD_STOP: real_release_hard_stop_lifted=false', () => {
  const r = build(validInput({ hard_stop_enforcement_gate_ready: false }));
  assert.strictEqual(r.real_release_hard_stop_lifted, false);
});

// No real execution
test('no production touched', () => {
  const r = build(validInput());
  assert.strictEqual(r.production_touched, false);
});
test('PASS GOLD not fabricated', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
});
test('hard stop not lifted', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_lifted, false);
});
test('kill-switch not armed', () => {
  const r = build(validInput());
  assert.strictEqual(r.release_kill_switch_armed, false);
});
test('execution not allowed', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_execution_allowed, false);
  assert.strictEqual(r.real_release_execution_allowed, false);
});
test('command not executed', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_command_executed, false);
});
test('operator go not granted', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_decision_granted, false);
});
test('checklist not approved', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_no_go_phase_passed, false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
