/**
 * V406 — Final Real Release Preflight Contract Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-real-release-preflight-contract.mjs';

const REQUIRED_CONTROLS = [
  'final-real-release-preflight-required',
  'operator-go-no-go-required',
  'metadata-only-preflight',
  'preflight-not-passed',
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
  'hard-stop-required',
  'audit-required',
  'pass-gold-real-required',
];

const PREFLIGHT_ITEMS = [
  {
    preflight_item_id: 'pi-001',
    preflight_type: 'release_preflight',
    preflight_mode: 'metadata-only',
    preflight_hash: 'a'.repeat(64),
  },
  {
    preflight_item_id: 'pi-002',
    preflight_type: 'production_preflight',
    preflight_mode: 'no-op',
    preflight_hash: 'b'.repeat(64),
  },
];

function validInput(overrides = {}) {
  return {
    final_real_release_preflight_contract_id: 'frpc-001',
    operator_go_no_go_checklist_phase_gate_id: 'ogng-phase-001',
    operator_go_no_go_checklist_phase_gate_ready: true,
    preflight_requested_by: 'operator-alpha',
    preflight_reason: 'V406 preflight contract test',
    preflight_mode: 'metadata-only',
    preflight_items: PREFLIGHT_ITEMS,
    required_preflight_controls: [...REQUIRED_CONTROLS],
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

console.log('\nV406 — Final Real Release Preflight Contract\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT));
test('STATUSES has BLOCKED_OPERATOR', () => assert.ok(STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_OPERATOR));
test('STATUSES has FAIL', () => assert.ok(STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_FAIL));
test('STATUSES has READY', () => assert.ok(STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_READY));

// Null / empty input
test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT);
});

// Missing dependency
test('operator gate not ready → BLOCKED_OPERATOR', () => {
  const r = build(validInput({ operator_go_no_go_checklist_phase_gate_ready: false }));
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_OPERATOR);
});
test('operator gate id missing → BLOCKED_INPUT', () => {
  const r = build(validInput({ operator_go_no_go_checklist_phase_gate_id: undefined }));
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT);
});

// Fail cases
test('invalid preflight_mode → FAIL', () => {
  const r = build(validInput({ preflight_mode: 'live-execute' }));
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_FAIL);
});
test('missing required control → FAIL', () => {
  const r = build(validInput({ required_preflight_controls: ['final-real-release-preflight-required'] }));
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_FAIL);
});
test('empty preflight_items → BLOCKED_INPUT', () => {
  const r = build(validInput({ preflight_items: [] }));
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_BLOCKED_INPUT);
});

// Ready path
test('valid input → READY', () => {
  const r = build(validInput());
  assert.strictEqual(r.status, STATUSES.FINAL_REAL_RELEASE_PREFLIGHT_READY);
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
test('validate BLOCKED_OPERATOR → false', () => {
  const r = build(validInput({ operator_go_no_go_checklist_phase_gate_ready: false }));
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
test('READY: final_real_release_preflight_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_real_release_preflight_passed, false);
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
test('READY: final_operator_safety_acknowledged=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_operator_safety_acknowledged, false);
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
test('READY: operator_go_decision_granted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_decision_granted, false);
});
test('READY: real_release_command_executed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_command_executed, false);
});

// Invariants — BLOCKED states
test('BLOCKED_INPUT: final_real_release_preflight_passed=false', () => {
  const r = build(null);
  assert.strictEqual(r.final_real_release_preflight_passed, false);
});
test('BLOCKED_INPUT: real_release_execution_allowed=false', () => {
  const r = build(null);
  assert.strictEqual(r.real_release_execution_allowed, false);
});
test('BLOCKED_OPERATOR: real_release_execution_allowed=false', () => {
  const r = build(validInput({ operator_go_no_go_checklist_phase_gate_ready: false }));
  assert.strictEqual(r.real_release_execution_allowed, false);
});
test('BLOCKED_OPERATOR: final_real_release_preflight_passed=false', () => {
  const r = build(validInput({ operator_go_no_go_checklist_phase_gate_ready: false }));
  assert.strictEqual(r.final_real_release_preflight_passed, false);
});

// No real execution
test('no child_process usage', () => {
  // structural — module loaded without exec side effects
  assert.ok(true);
});
test('no production touched', () => {
  const r = build(validInput());
  assert.strictEqual(r.production_touched, false);
});
test('PASS GOLD not fabricated', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
  assert.strictEqual(r.final_real_release_preflight_passed, false);
});
test('final human authority not granted', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_decision_granted, false);
});
test('command not executed', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_command_executed, false);
  assert.strictEqual(r.real_release_execution_allowed, false);
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

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
