/**
 * V412 — Manual Command Seal Binder Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-manual-command-seal-binder.mjs';

const REQUIRED_CONTROLS = [
  'manual-command-seal-required',
  'authorization-ledger-required',
  'metadata-only-seal',
  'seal-not-verified',
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

const SEAL_ITEMS = [
  {
    seal_item_id: 'si-001',
    seal_type: 'manual_release_seal',
    seal_mode: 'metadata-only',
    seal_hash: 'a'.repeat(64),
  },
  {
    seal_item_id: 'si-002',
    seal_type: 'manual_production_seal',
    seal_mode: 'no-op',
    seal_hash: 'b'.repeat(64),
  },
];

function validInput(overrides = {}) {
  return {
    manual_command_seal_binder_id: 'mcsb-001',
    release_authorization_ledger_contract_id: 'ralc-001',
    release_authorization_ledger_contract_ready: true,
    seal_actor: 'operator-alpha',
    seal_reason: 'V412 seal binder test',
    seal_mode: 'metadata-only',
    seal_items: SEAL_ITEMS,
    required_seal_controls: [...REQUIRED_CONTROLS],
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

console.log('\nV412 — Manual Command Seal Binder\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT));
test('STATUSES has BLOCKED_LEDGER', () => assert.ok(STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_LEDGER));
test('STATUSES has FAIL', () => assert.ok(STATUSES.MANUAL_COMMAND_SEAL_BINDER_FAIL));
test('STATUSES has READY', () => assert.ok(STATUSES.MANUAL_COMMAND_SEAL_BINDER_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  assert.strictEqual(build(null).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.strictEqual(build({}).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT);
});

// Missing dependency
test('ledger contract not ready → BLOCKED_LEDGER', () => {
  assert.strictEqual(build(validInput({ release_authorization_ledger_contract_ready: false })).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_LEDGER);
});
test('ledger contract id missing → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ release_authorization_ledger_contract_id: undefined })).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT);
});

// Fail cases
test('invalid seal_mode → FAIL', () => {
  assert.strictEqual(build(validInput({ seal_mode: 'arm-now' })).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_FAIL);
});
test('invalid seal_type → FAIL', () => {
  const r = build(validInput({
    seal_items: [{ seal_item_id: 'si-x', seal_type: 'bad_seal', seal_mode: 'no-op', seal_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_FAIL);
});
test('missing required control → FAIL', () => {
  assert.strictEqual(build(validInput({ required_seal_controls: ['manual-command-seal-required'] })).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_FAIL);
});
test('empty seal_items → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ seal_items: [] })).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_BLOCKED_INPUT);
});

// Ready path
test('valid input → READY', () => {
  assert.strictEqual(build(validInput()).status, STATUSES.MANUAL_COMMAND_SEAL_BINDER_READY);
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
test('validate BLOCKED_LEDGER → false', () => {
  assert.strictEqual(validate(build(validInput({ release_authorization_ledger_contract_ready: false }))), false);
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
test('BLOCKED_INPUT: manual_command_seal_bound=false', () => {
  assert.strictEqual(build(null).manual_command_seal_bound, false);
});
test('BLOCKED_INPUT: manual_command_seal_verified=false', () => {
  assert.strictEqual(build(null).manual_command_seal_verified, false);
});
test('BLOCKED_LEDGER: manual_command_seal_bound=false', () => {
  assert.strictEqual(build(validInput({ release_authorization_ledger_contract_ready: false })).manual_command_seal_bound, false);
});
test('BLOCKED_LEDGER: manual_command_seal_verified=false', () => {
  assert.strictEqual(build(validInput({ release_authorization_ledger_contract_ready: false })).manual_command_seal_verified, false);
});

// No real execution
test('no production touched', () => assert.strictEqual(build(validInput()).production_touched, false));
test('hard stop not lifted', () => assert.strictEqual(build(validInput()).real_release_hard_stop_lifted, false));
test('manual command seal not verified', () => assert.strictEqual(build(validInput()).manual_command_seal_verified, false));
test('manual execution intent not approved', () => assert.strictEqual(build(validInput()).manual_execution_intent_approved, false));
test('manual release execution not authorized', () => assert.strictEqual(build(validInput()).manual_release_execution_authorized, false));
test('execution not allowed', () => assert.strictEqual(build(validInput()).real_release_execution_allowed, false));
test('PASS GOLD not fabricated', () => assert.strictEqual(build(validInput()).release_authorization_ledger_phase_passed, false));

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
