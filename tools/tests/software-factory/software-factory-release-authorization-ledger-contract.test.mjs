/**
 * V411 — Release Authorization Ledger Contract Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-release-authorization-ledger-contract.mjs';

const REQUIRED_CONTROLS = [
  'release-authorization-ledger-required',
  'hard-stop-phase-required',
  'metadata-only-ledger',
  'ledger-not-created',
  'manual-release-not-authorized',
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

const LEDGER_ITEMS = [
  {
    ledger_item_id: 'li-001',
    ledger_type: 'release_authorization_entry',
    ledger_mode: 'metadata-only',
    ledger_hash: 'a'.repeat(64),
  },
  {
    ledger_item_id: 'li-002',
    ledger_type: 'production_authorization_entry',
    ledger_mode: 'no-op',
    ledger_hash: 'b'.repeat(64),
  },
];

function validInput(overrides = {}) {
  return {
    release_authorization_ledger_contract_id: 'ralc-001',
    real_release_hard_stop_phase_gate_id: 'rrhspg-001',
    real_release_hard_stop_phase_gate_ready: true,
    ledger_requested_by: 'operator-alpha',
    ledger_reason: 'V411 ledger contract test',
    ledger_mode: 'metadata-only',
    ledger_items: LEDGER_ITEMS,
    required_ledger_controls: [...REQUIRED_CONTROLS],
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

console.log('\nV411 — Release Authorization Ledger Contract\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT));
test('STATUSES has BLOCKED_HARD_STOP', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_HARD_STOP));
test('STATUSES has FAIL', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_FAIL));
test('STATUSES has READY', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  assert.strictEqual(build(null).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.strictEqual(build({}).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT);
});

// Missing dependency
test('hard stop gate not ready → BLOCKED_HARD_STOP', () => {
  assert.strictEqual(build(validInput({ real_release_hard_stop_phase_gate_ready: false })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_HARD_STOP);
});
test('hard stop gate id missing → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ real_release_hard_stop_phase_gate_id: undefined })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT);
});

// Fail cases
test('invalid ledger_mode → FAIL', () => {
  assert.strictEqual(build(validInput({ ledger_mode: 'live-execute' })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_FAIL);
});
test('invalid ledger_type → FAIL', () => {
  const r = build(validInput({
    ledger_items: [{ ledger_item_id: 'li-x', ledger_type: 'bad_type', ledger_mode: 'no-op', ledger_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_FAIL);
});
test('missing required control → FAIL', () => {
  assert.strictEqual(build(validInput({ required_ledger_controls: ['release-authorization-ledger-required'] })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_FAIL);
});
test('empty ledger_items → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ ledger_items: [] })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_BLOCKED_INPUT);
});

// Ready path
test('valid input → READY', () => {
  assert.strictEqual(build(validInput()).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_READY);
});
test('READY hash 64 chars', () => {
  assert.strictEqual(build(validInput()).hash.length, 64);
});
test('hash deterministic', () => {
  assert.strictEqual(build(validInput()).hash, build(validInput()).hash);
});
test('validate READY → true', () => {
  assert.strictEqual(validate(build(validInput())), true);
});
test('validate null → false', () => {
  assert.strictEqual(validate(null), false);
});
test('validate BLOCKED → false', () => {
  assert.strictEqual(validate(build(null)), false);
});
test('validate BLOCKED_HARD_STOP → false', () => {
  assert.strictEqual(validate(build(validInput({ real_release_hard_stop_phase_gate_ready: false }))), false);
});

// Render
test('render returns string', () => {
  assert.strictEqual(typeof render(build(validInput())), 'string');
});
test('render contains REGRA ABSOLUTA', () => {
  assert.ok(render(build(validInput())).includes('SEM PASS GOLD REAL'));
});
test('render null safe', () => {
  const s = render(null);
  assert.strictEqual(typeof s, 'string');
  assert.ok(s.includes('SEM PASS GOLD REAL'));
});

// Invariants READY
const INVARIANT_FLAGS = [
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed', 'real_release_executed', 'real_deploy_executed',
  'real_tag_created', 'real_stable_promoted', 'artifact_published',
  'production_touched', 'billing_executed', 'secrets_accessed',
  'network_accessed', 'rollback_executed', 'real_release_hard_stop_phase_passed',
  'real_release_hard_stop_lifted', 'operator_go_decision_granted',
  'real_release_command_executed', 'real_release_execution_allowed',
  'release_authorization_ledger_created', 'manual_command_seal_bound',
  'manual_command_seal_verified', 'final_authorization_evidence_ledger_published',
  'manual_execution_intent_reviewed', 'manual_execution_intent_approved',
  'release_authorization_ledger_phase_passed', 'manual_release_execution_authorized',
];

for (const flag of INVARIANT_FLAGS) {
  test(`READY: ${flag}=false`, () => {
    assert.strictEqual(build(validInput())[flag], false);
  });
}

// Invariants BLOCKED
test('BLOCKED_INPUT: release_authorization_ledger_created=false', () => {
  assert.strictEqual(build(null).release_authorization_ledger_created, false);
});
test('BLOCKED_INPUT: manual_release_execution_authorized=false', () => {
  assert.strictEqual(build(null).manual_release_execution_authorized, false);
});
test('BLOCKED_HARD_STOP: release_authorization_ledger_created=false', () => {
  assert.strictEqual(build(validInput({ real_release_hard_stop_phase_gate_ready: false })).release_authorization_ledger_created, false);
});
test('BLOCKED_HARD_STOP: manual_release_execution_authorized=false', () => {
  assert.strictEqual(build(validInput({ real_release_hard_stop_phase_gate_ready: false })).manual_release_execution_authorized, false);
});

// No real execution
test('no production touched', () => assert.strictEqual(build(validInput()).production_touched, false));
test('PASS GOLD not fabricated', () => assert.strictEqual(build(validInput()).release_authorization_ledger_phase_passed, false));
test('hard stop not lifted', () => assert.strictEqual(build(validInput()).real_release_hard_stop_lifted, false));
test('manual command seal not verified', () => assert.strictEqual(build(validInput()).manual_command_seal_verified, false));
test('manual execution intent not approved', () => assert.strictEqual(build(validInput()).manual_execution_intent_approved, false));
test('manual release execution not authorized', () => assert.strictEqual(build(validInput()).manual_release_execution_authorized, false));
test('execution not allowed', () => assert.strictEqual(build(validInput()).real_release_execution_allowed, false));

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
