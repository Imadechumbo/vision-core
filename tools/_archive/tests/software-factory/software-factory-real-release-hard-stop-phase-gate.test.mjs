/**
 * V410 — Real Release Hard Stop Phase Gate Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-release-hard-stop-phase-gate.mjs';

const FINAL_MESSAGE = 'V406-V410 final real release execution preflight and hard stop layer complete. Real release execution remains blocked until explicit V411 command.';

const VALID_IDS = {
  final_real_release_preflight_contract: 'frpc-001',
  hard_stop_enforcement_gate: 'hseg-001',
  release_kill_switch_binding: 'rksb-001',
  final_operator_safety_acknowledgement: 'fosa-001',
};

function validInput(overrides = {}) {
  return {
    real_release_hard_stop_phase_gate_id: 'rrhspg-001',
    final_operator_safety_acknowledgement_id: 'fosa-001',
    final_operator_safety_acknowledgement_ready: true,
    ids: { ...VALID_IDS },
    phase_summary: 'V406-V410 hard stop layer complete',
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

console.log('\nV410 — Real Release Hard Stop Phase Gate\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT));
test('STATUSES has BLOCKED_ACK', () => assert.ok(STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_ACK));
test('STATUSES has INCOMPLETE', () => assert.ok(STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE));
test('STATUSES has READY', () => assert.ok(STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT);
});

// Missing dependency
test('ack not ready → BLOCKED_ACK', () => {
  const r = build(validInput({ final_operator_safety_acknowledgement_ready: false }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_ACK);
});
test('ack id missing → BLOCKED_INPUT', () => {
  const r = build(validInput({ final_operator_safety_acknowledgement_id: undefined }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT);
});

// Incomplete cases
test('missing ids object → BLOCKED_INPUT', () => {
  const r = build(validInput({ ids: undefined }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_BLOCKED_INPUT);
});
test('missing final_real_release_preflight_contract id → INCOMPLETE', () => {
  const r = build(validInput({ ids: { ...VALID_IDS, final_real_release_preflight_contract: undefined } }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE);
});
test('missing hard_stop_enforcement_gate id → INCOMPLETE', () => {
  const r = build(validInput({ ids: { ...VALID_IDS, hard_stop_enforcement_gate: undefined } }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE);
});
test('missing release_kill_switch_binding id → INCOMPLETE', () => {
  const r = build(validInput({ ids: { ...VALID_IDS, release_kill_switch_binding: undefined } }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE);
});
test('missing final_operator_safety_acknowledgement id → INCOMPLETE', () => {
  const r = build(validInput({ ids: { ...VALID_IDS, final_operator_safety_acknowledgement: undefined } }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE);
});
test('empty ids → INCOMPLETE', () => {
  const r = build(validInput({ ids: {} }));
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_INCOMPLETE);
});

// Ready path
test('valid input → READY', () => {
  const r = build(validInput());
  assert.strictEqual(r.status, STATUSES.REAL_RELEASE_HARD_STOP_PHASE_GATE_READY);
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
test('validate BLOCKED_ACK → false', () => {
  const r = build(validInput({ final_operator_safety_acknowledgement_ready: false }));
  assert.strictEqual(validate(r), false);
});
test('validate INCOMPLETE → false', () => {
  const r = build(validInput({ ids: {} }));
  assert.strictEqual(validate(r), false);
});

// Final message
test('READY final_message exact', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_message, FINAL_MESSAGE);
});
test('BLOCKED final_message present', () => {
  const r = build(null);
  assert.strictEqual(r.final_message, FINAL_MESSAGE);
});
test('BLOCKED_ACK final_message present', () => {
  const r = build(validInput({ final_operator_safety_acknowledgement_ready: false }));
  assert.strictEqual(r.final_message, FINAL_MESSAGE);
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
test('render contains final message', () => {
  const r = build(validInput());
  assert.ok(render(r).includes('V406-V410'));
  assert.ok(render(r).includes('V411'));
});
test('render null safe', () => {
  assert.strictEqual(typeof render(null), 'string');
  assert.ok(render(null).includes('SEM PASS GOLD REAL'));
});

// Invariants — READY
test('READY: real_release_hard_stop_phase_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
});
test('READY: real_release_hard_stop_lifted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_hard_stop_lifted, false);
});
test('READY: real_release_execution_allowed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_execution_allowed, false);
});
test('READY: operator_go_decision_granted=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_decision_granted, false);
});
test('READY: final_operator_safety_acknowledged=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.final_operator_safety_acknowledged, false);
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
test('READY: operator_go_no_go_phase_passed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.operator_go_no_go_phase_passed, false);
});
test('READY: real_release_command_executed=false', () => {
  const r = build(validInput());
  assert.strictEqual(r.real_release_command_executed, false);
});

// Invariants — BLOCKED
test('BLOCKED_INPUT: real_release_hard_stop_phase_passed=false', () => {
  const r = build(null);
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
});
test('BLOCKED_INPUT: real_release_hard_stop_lifted=false', () => {
  const r = build(null);
  assert.strictEqual(r.real_release_hard_stop_lifted, false);
});
test('BLOCKED_INPUT: real_release_execution_allowed=false', () => {
  const r = build(null);
  assert.strictEqual(r.real_release_execution_allowed, false);
});
test('BLOCKED_ACK: real_release_hard_stop_phase_passed=false', () => {
  const r = build(validInput({ final_operator_safety_acknowledgement_ready: false }));
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
});
test('BLOCKED_ACK: real_release_hard_stop_lifted=false', () => {
  const r = build(validInput({ final_operator_safety_acknowledgement_ready: false }));
  assert.strictEqual(r.real_release_hard_stop_lifted, false);
});
test('INCOMPLETE: real_release_hard_stop_phase_passed=false', () => {
  const r = build(validInput({ ids: {} }));
  assert.strictEqual(r.real_release_hard_stop_phase_passed, false);
});
test('INCOMPLETE: operator_go_decision_granted=false', () => {
  const r = build(validInput({ ids: {} }));
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

// Consolidation check
test('READY ids preserved', () => {
  const r = build(validInput());
  assert.strictEqual(r.ids.final_real_release_preflight_contract, 'frpc-001');
  assert.strictEqual(r.ids.hard_stop_enforcement_gate, 'hseg-001');
  assert.strictEqual(r.ids.release_kill_switch_binding, 'rksb-001');
  assert.strictEqual(r.ids.final_operator_safety_acknowledgement, 'fosa-001');
});
test('READY modules_consolidated = 4', () => {
  const r = build(validInput());
  assert.strictEqual(r.modules_consolidated, 4);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
