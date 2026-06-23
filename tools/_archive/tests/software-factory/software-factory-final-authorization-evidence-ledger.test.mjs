/**
 * V413 — Final Authorization Evidence Ledger Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-authorization-evidence-ledger.mjs';

const REQUIRED_CONTROLS = [
  'final-authorization-evidence-ledger-required',
  'manual-command-seal-required',
  'metadata-only-evidence',
  'evidence-ledger-not-published',
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

const EVIDENCE_ITEMS = [
  {
    evidence_item_id: 'ei-001',
    evidence_type: 'release_authorization_evidence',
    evidence_mode: 'metadata-only',
    evidence_hash: 'a'.repeat(64),
  },
  {
    evidence_item_id: 'ei-002',
    evidence_type: 'manual_seal_evidence',
    evidence_mode: 'no-op',
    evidence_hash: 'b'.repeat(64),
  },
];

function validInput(overrides = {}) {
  return {
    final_authorization_evidence_ledger_id: 'fael-001',
    manual_command_seal_binder_id: 'mcsb-001',
    manual_command_seal_binder_ready: true,
    evidence_ledger_items: EVIDENCE_ITEMS,
    required_evidence_ledger_controls: [...REQUIRED_CONTROLS],
    evidence_ledger_level: 'critical',
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

console.log('\nV413 — Final Authorization Evidence Ledger\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT));
test('STATUSES has BLOCKED_SEAL', () => assert.ok(STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_SEAL));
test('STATUSES has FAIL', () => assert.ok(STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_FAIL));
test('STATUSES has READY', () => assert.ok(STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  assert.strictEqual(build(null).status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.strictEqual(build({}).status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT);
});

// Missing dependency
test('seal binder not ready → BLOCKED_SEAL', () => {
  assert.strictEqual(build(validInput({ manual_command_seal_binder_ready: false })).status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_SEAL);
});
test('seal binder id missing → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ manual_command_seal_binder_id: undefined })).status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT);
});

// Fail cases
test('invalid evidence_type → FAIL', () => {
  const r = build(validInput({
    evidence_ledger_items: [{ evidence_item_id: 'ei-x', evidence_type: 'bad_evidence', evidence_mode: 'no-op', evidence_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_FAIL);
});
test('invalid evidence_mode → FAIL', () => {
  const r = build(validInput({
    evidence_ledger_items: [{ evidence_item_id: 'ei-x', evidence_type: 'release_authorization_evidence', evidence_mode: 'publish-now', evidence_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_FAIL);
});
test('missing required control → FAIL', () => {
  assert.strictEqual(build(validInput({ required_evidence_ledger_controls: ['final-authorization-evidence-ledger-required'] })).status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_FAIL);
});
test('empty evidence_ledger_items → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ evidence_ledger_items: [] })).status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_BLOCKED_INPUT);
});

// Ready path
test('valid input → READY', () => {
  assert.strictEqual(build(validInput()).status, STATUSES.FINAL_AUTHORIZATION_EVIDENCE_LEDGER_READY);
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
test('validate BLOCKED_SEAL → false', () => {
  assert.strictEqual(validate(build(validInput({ manual_command_seal_binder_ready: false }))), false);
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
test('BLOCKED_INPUT: final_authorization_evidence_ledger_published=false', () => {
  assert.strictEqual(build(null).final_authorization_evidence_ledger_published, false);
});
test('BLOCKED_INPUT: manual_release_execution_authorized=false', () => {
  assert.strictEqual(build(null).manual_release_execution_authorized, false);
});
test('BLOCKED_SEAL: final_authorization_evidence_ledger_published=false', () => {
  assert.strictEqual(build(validInput({ manual_command_seal_binder_ready: false })).final_authorization_evidence_ledger_published, false);
});
test('BLOCKED_SEAL: manual_release_execution_authorized=false', () => {
  assert.strictEqual(build(validInput({ manual_command_seal_binder_ready: false })).manual_release_execution_authorized, false);
});

// No real execution
test('no production touched', () => assert.strictEqual(build(validInput()).production_touched, false));
test('hard stop not lifted', () => assert.strictEqual(build(validInput()).real_release_hard_stop_lifted, false));
test('manual command seal not verified', () => assert.strictEqual(build(validInput()).manual_command_seal_verified, false));
test('evidence ledger not published', () => assert.strictEqual(build(validInput()).final_authorization_evidence_ledger_published, false));
test('manual execution intent not approved', () => assert.strictEqual(build(validInput()).manual_execution_intent_approved, false));
test('manual release execution not authorized', () => assert.strictEqual(build(validInput()).manual_release_execution_authorized, false));
test('execution not allowed', () => assert.strictEqual(build(validInput()).real_release_execution_allowed, false));
test('PASS GOLD not fabricated', () => assert.strictEqual(build(validInput()).release_authorization_ledger_phase_passed, false));

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
