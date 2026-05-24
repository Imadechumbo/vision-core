/**
 * V415 — Release Authorization Ledger Phase Gate Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-release-authorization-ledger-phase-gate.mjs';

const FINAL_MESSAGE = 'V411-V415 final release execution authorization ledger and manual command seal complete. Real release execution remains blocked until explicit V416 command.';

const VALID_IDS = {
  release_authorization_ledger_contract: 'ralc-001',
  manual_command_seal_binder: 'mcsb-001',
  final_authorization_evidence_ledger: 'fael-001',
  manual_execution_intent_review: 'meir-001',
};

function validInput(overrides = {}) {
  return {
    release_authorization_ledger_phase_gate_id: 'ralpg-001',
    manual_execution_intent_review_id: 'meir-001',
    manual_execution_intent_review_ready: true,
    ids: { ...VALID_IDS },
    phase_summary: 'V411-V415 authorization ledger layer complete',
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

console.log('\nV415 — Release Authorization Ledger Phase Gate\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT));
test('STATUSES has BLOCKED_INTENT', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INTENT));
test('STATUSES has INCOMPLETE', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE));
test('STATUSES has READY', () => assert.ok(STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  assert.strictEqual(build(null).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.strictEqual(build({}).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT);
});

// Missing dependency
test('intent review not ready → BLOCKED_INTENT', () => {
  assert.strictEqual(build(validInput({ manual_execution_intent_review_ready: false })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INTENT);
});
test('intent review id missing → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ manual_execution_intent_review_id: undefined })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT);
});

// Incomplete cases
test('missing ids object → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ ids: undefined })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT);
});
test('missing release_authorization_ledger_contract id → INCOMPLETE', () => {
  assert.strictEqual(build(validInput({ ids: { ...VALID_IDS, release_authorization_ledger_contract: undefined } })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE);
});
test('missing manual_command_seal_binder id → INCOMPLETE', () => {
  assert.strictEqual(build(validInput({ ids: { ...VALID_IDS, manual_command_seal_binder: undefined } })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE);
});
test('missing final_authorization_evidence_ledger id → INCOMPLETE', () => {
  assert.strictEqual(build(validInput({ ids: { ...VALID_IDS, final_authorization_evidence_ledger: undefined } })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE);
});
test('missing manual_execution_intent_review id → INCOMPLETE', () => {
  assert.strictEqual(build(validInput({ ids: { ...VALID_IDS, manual_execution_intent_review: undefined } })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE);
});
test('empty ids → INCOMPLETE', () => {
  assert.strictEqual(build(validInput({ ids: {} })).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE);
});

// Ready path
test('valid input → READY', () => {
  assert.strictEqual(build(validInput()).status, STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_READY);
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
test('validate BLOCKED_INTENT → false', () => {
  assert.strictEqual(validate(build(validInput({ manual_execution_intent_review_ready: false }))), false);
});
test('validate INCOMPLETE → false', () => {
  assert.strictEqual(validate(build(validInput({ ids: {} }))), false);
});

// Final message
test('READY final_message exact', () => {
  assert.strictEqual(build(validInput()).final_message, FINAL_MESSAGE);
});
test('BLOCKED final_message present', () => {
  assert.strictEqual(build(null).final_message, FINAL_MESSAGE);
});
test('BLOCKED_INTENT final_message present', () => {
  assert.strictEqual(build(validInput({ manual_execution_intent_review_ready: false })).final_message, FINAL_MESSAGE);
});
test('INCOMPLETE final_message present', () => {
  assert.strictEqual(build(validInput({ ids: {} })).final_message, FINAL_MESSAGE);
});

// Render
test('render returns string', () => {
  assert.strictEqual(typeof render(build(validInput())), 'string');
});
test('render contains REGRA ABSOLUTA', () => {
  assert.ok(render(build(validInput())).includes('SEM PASS GOLD REAL'));
});
test('render contains V411-V415', () => {
  assert.ok(render(build(validInput())).includes('V411-V415'));
});
test('render contains V416', () => {
  assert.ok(render(build(validInput())).includes('V416'));
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
test('BLOCKED_INPUT: release_authorization_ledger_phase_passed=false', () => {
  assert.strictEqual(build(null).release_authorization_ledger_phase_passed, false);
});
test('BLOCKED_INPUT: manual_release_execution_authorized=false', () => {
  assert.strictEqual(build(null).manual_release_execution_authorized, false);
});
test('BLOCKED_INTENT: release_authorization_ledger_phase_passed=false', () => {
  assert.strictEqual(build(validInput({ manual_execution_intent_review_ready: false })).release_authorization_ledger_phase_passed, false);
});
test('BLOCKED_INTENT: real_release_hard_stop_lifted=false', () => {
  assert.strictEqual(build(validInput({ manual_execution_intent_review_ready: false })).real_release_hard_stop_lifted, false);
});
test('INCOMPLETE: release_authorization_ledger_phase_passed=false', () => {
  assert.strictEqual(build(validInput({ ids: {} })).release_authorization_ledger_phase_passed, false);
});
test('INCOMPLETE: manual_release_execution_authorized=false', () => {
  assert.strictEqual(build(validInput({ ids: {} })).manual_release_execution_authorized, false);
});

// No real execution
test('no production touched', () => assert.strictEqual(build(validInput()).production_touched, false));
test('hard stop not lifted', () => assert.strictEqual(build(validInput()).real_release_hard_stop_lifted, false));
test('manual command seal not verified', () => assert.strictEqual(build(validInput()).manual_command_seal_verified, false));
test('intent not approved', () => assert.strictEqual(build(validInput()).manual_execution_intent_approved, false));
test('manual release execution not authorized', () => assert.strictEqual(build(validInput()).manual_release_execution_authorized, false));
test('execution not allowed', () => assert.strictEqual(build(validInput()).real_release_execution_allowed, false));
test('PASS GOLD not fabricated', () => assert.strictEqual(build(validInput()).release_authorization_ledger_phase_passed, false));

// Consolidation
test('READY ids preserved', () => {
  const r = build(validInput());
  assert.strictEqual(r.ids.release_authorization_ledger_contract, 'ralc-001');
  assert.strictEqual(r.ids.manual_command_seal_binder, 'mcsb-001');
  assert.strictEqual(r.ids.final_authorization_evidence_ledger, 'fael-001');
  assert.strictEqual(r.ids.manual_execution_intent_review, 'meir-001');
});
test('READY modules_consolidated = 4', () => {
  assert.strictEqual(build(validInput()).modules_consolidated, 4);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
