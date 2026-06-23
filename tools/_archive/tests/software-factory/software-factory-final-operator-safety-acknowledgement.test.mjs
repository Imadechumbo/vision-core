/**
 * V409 — Final Operator Safety Acknowledgement Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-operator-safety-acknowledgement.mjs';

const REQUIRED_CONTROLS = [
  'final-operator-safety-acknowledgement-required',
  'kill-switch-binding-required',
  'acknowledgement-not-granted',
  'operator-go-not-granted',
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

const ACK_ITEMS = [
  {
    acknowledgement_item_id: 'ai-001',
    acknowledgement_type: 'operator_safety_ack',
    acknowledgement_mode: 'metadata-only',
    acknowledgement_hash: 'a'.repeat(64),
  },
  {
    acknowledgement_item_id: 'ai-002',
    acknowledgement_type: 'production_safety_ack',
    acknowledgement_mode: 'no-op',
    acknowledgement_hash: 'b'.repeat(64),
  },
];

function validInput(overrides = {}) {
  return {
    final_operator_safety_acknowledgement_id: 'fosa-001',
    release_kill_switch_binding_id: 'rksb-001',
    release_kill_switch_binding_ready: true,
    operator_id: 'operator-alpha',
    operator_role: 'release-operator',
    acknowledgement_reason: 'V409 final operator safety acknowledgement test',
    acknowledgement_mode: 'metadata-only',
    acknowledgement_items: ACK_ITEMS,
    required_acknowledgement_controls: [...REQUIRED_CONTROLS],
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

console.log('\nV409 — Final Operator Safety Acknowledgement\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT));
test('STATUSES has BLOCKED_KILL_SWITCH', () => assert.ok(STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_KILL_SWITCH));
test('STATUSES has FAIL', () => assert.ok(STATUSES.FINAL_OPERATOR_SAFETY_ACK_FAIL));
test('STATUSES has READY', () => assert.ok(STATUSES.FINAL_OPERATOR_SAFETY_ACK_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT);
});

// Missing dependency
test('kill switch binding not ready → BLOCKED_KILL_SWITCH', () => {
  const r = build(validInput({ release_kill_switch_binding_ready: false }));
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_KILL_SWITCH);
});
test('kill switch binding id missing → BLOCKED_INPUT', () => {
  const r = build(validInput({ release_kill_switch_binding_id: undefined }));
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT);
});

// Fail cases
test('invalid acknowledgement_mode → FAIL', () => {
  const r = build(validInput({ acknowledgement_mode: 'live-execute' }));
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_FAIL);
});
test('invalid acknowledgement_type in item → FAIL', () => {
  const r = build(validInput({
    acknowledgement_items: [{ acknowledgement_item_id: 'ai-x', acknowledgement_type: 'invalid_ack', acknowledgement_mode: 'no-op', acknowledgement_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_FAIL);
});
test('missing required control → FAIL', () => {
  const r = build(validInput({ required_acknowledgement_controls: ['final-operator-safety-acknowledgement-required'] }));
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_FAIL);
});
test('empty acknowledgement_items → BLOCKED_INPUT', () => {
  const r = build(validInput({ acknowledgement_items: [] }));
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT);
});
test('missing operator_id → BLOCKED_INPUT', () => {
  const r = build(validInput({ operator_id: undefined }));
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_BLOCKED_INPUT);
});

// Ready path
test('valid input → READY', () => {
  const r = build(validInput());
  assert.strictEqual(r.status, STATUSES.FINAL_OPERATOR_SAFETY_ACK_READY);
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
test('validate BLOCKED_KILL_SWITCH → false', () => {
  const r = build(validInput({ release_kill_switch_binding_ready: false }));
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
test('READY: final_operator_safety_acknowledged=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_operator_safety_acknowledged, false);
});
test('READY: operator_go_decision_granted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_decision_granted, false);
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
test('READY: release_kill_switch_bound=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.release_kill_switch_bound, false);
});
test('READY: release_kill_switch_armed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.release_kill_switch_armed, false);
});
test('READY: final_real_release_preflight_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_real_release_preflight_passed, false);
});
test('READY: real_release_hard_stop_phase_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
});
test('READY: real_release_hard_stop_lifted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_lifted, false);
});
test('READY: operator_go_no_go_phase_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_no_go_phase_passed, false);
});
test('READY: real_release_command_executed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_command_executed, false);
});

// Invariants — BLOCKED
test('BLOCKED_INPUT: final_operator_safety_acknowledged=false', () => {
  const r = build(null);
  assert.strictEqual(r.final_operator_safety_acknowledged, false);
});
test('BLOCKED_INPUT: operator_go_decision_granted=false', () => {
  const r = build(null);
  assert.strictEqual(r.operator_go_decision_granted, false);
});
test('BLOCKED_KILL_SWITCH: final_operator_safety_acknowledged=false', () => {
  const r = build(validInput({ release_kill_switch_binding_ready: false }));
  assert.strictEqual(r.final_operator_safety_acknowledged, false);
});
test('BLOCKED_KILL_SWITCH: operator_go_decision_granted=false', () => {
  const r = build(validInput({ release_kill_switch_binding_ready: false }));
  assert.strictEqual(r.operator_go_decision_granted, false);
});

// No real execution
test('no production touched', () => {
  const r = build(validInput());
  assert.strictEqual(r.production_touched, false);
});
test('PASS GOLD not fabricated', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
  assert.strictEqual(r.final_real_release_preflight_passed, false);
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
test('acknowledgement not granted', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_operator_safety_acknowledged, false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
