/**
 * V414 — Manual Execution Intent Review Tests
 */

import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-manual-execution-intent-review.mjs';

const REQUIRED_CONTROLS = [
  'manual-execution-intent-review-required',
  'authorization-evidence-ledger-required',
  'metadata-only-intent',
  'intent-not-approved',
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

const INTENT_ITEMS = [
  {
    intent_item_id: 'ii-001',
    intent_type: 'manual_release_intent',
    intent_mode: 'metadata-only',
    intent_hash: 'a'.repeat(64),
  },
  {
    intent_item_id: 'ii-002',
    intent_type: 'manual_production_intent',
    intent_mode: 'no-op',
    intent_hash: 'b'.repeat(64),
  },
];

function validInput(overrides = {}) {
  return {
    manual_execution_intent_review_id: 'meir-001',
    final_authorization_evidence_ledger_id: 'fael-001',
    final_authorization_evidence_ledger_ready: true,
    intent_actor: 'operator-alpha',
    intent_reason: 'V414 intent review test',
    intent_mode: 'metadata-only',
    intent_items: INTENT_ITEMS,
    required_intent_controls: [...REQUIRED_CONTROLS],
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

console.log('\nV414 — Manual Execution Intent Review\n');

// Exports
test('exports STATUSES', () => assert.ok(STATUSES && typeof STATUSES === 'object'));
test('exports build', () => assert.strictEqual(typeof build, 'function'));
test('exports validate', () => assert.strictEqual(typeof validate, 'function'));
test('exports render', () => assert.strictEqual(typeof render, 'function'));

// Statuses
test('STATUSES has BLOCKED_INPUT', () => assert.ok(STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT));
test('STATUSES has BLOCKED_EVIDENCE', () => assert.ok(STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_EVIDENCE));
test('STATUSES has FAIL', () => assert.ok(STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_FAIL));
test('STATUSES has READY', () => assert.ok(STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_READY));

// Null / empty
test('null input → BLOCKED_INPUT', () => {
  assert.strictEqual(build(null).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.strictEqual(build({}).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT);
});

// Missing dependency
test('evidence ledger not ready → BLOCKED_EVIDENCE', () => {
  assert.strictEqual(build(validInput({ final_authorization_evidence_ledger_ready: false })).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_EVIDENCE);
});
test('evidence ledger id missing → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ final_authorization_evidence_ledger_id: undefined })).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT);
});

// Fail cases
test('invalid intent_mode → FAIL', () => {
  assert.strictEqual(build(validInput({ intent_mode: 'approve-now' })).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_FAIL);
});
test('invalid intent_type → FAIL', () => {
  const r = build(validInput({
    intent_items: [{ intent_item_id: 'ii-x', intent_type: 'bad_intent', intent_mode: 'no-op', intent_hash: 'a'.repeat(64) }],
  }));
  assert.strictEqual(r.status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_FAIL);
});
test('missing required control → FAIL', () => {
  assert.strictEqual(build(validInput({ required_intent_controls: ['manual-execution-intent-review-required'] })).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_FAIL);
});
test('empty intent_items → BLOCKED_INPUT', () => {
  assert.strictEqual(build(validInput({ intent_items: [] })).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_BLOCKED_INPUT);
});

// Ready path
test('valid input → READY', () => {
  assert.strictEqual(build(validInput()).status, STATUSES.MANUAL_EXECUTION_INTENT_REVIEW_READY);
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
test('validate BLOCKED_EVIDENCE → false', () => {
  assert.strictEqual(validate(build(validInput({ final_authorization_evidence_ledger_ready: false }))), false);
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
test('BLOCKED_INPUT: manual_execution_intent_reviewed=false', () => {
  assert.strictEqual(build(null).manual_execution_intent_reviewed, false);
});
test('BLOCKED_INPUT: manual_execution_intent_approved=false', () => {
  assert.strictEqual(build(null).manual_execution_intent_approved, false);
});
test('BLOCKED_EVIDENCE: manual_execution_intent_reviewed=false', () => {
  assert.strictEqual(build(validInput({ final_authorization_evidence_ledger_ready: false })).manual_execution_intent_reviewed, false);
});
test('BLOCKED_EVIDENCE: manual_execution_intent_approved=false', () => {
  assert.strictEqual(build(validInput({ final_authorization_evidence_ledger_ready: false })).manual_execution_intent_approved, false);
});

// No real execution
test('no production touched', () => assert.strictEqual(build(validInput()).production_touched, false));
test('hard stop not lifted', () => assert.strictEqual(build(validInput()).real_release_hard_stop_lifted, false));
test('manual command seal not verified', () => assert.strictEqual(build(validInput()).manual_command_seal_verified, false));
test('intent not approved', () => assert.strictEqual(build(validInput()).manual_execution_intent_approved, false));
test('manual release execution not authorized', () => assert.strictEqual(build(validInput()).manual_release_execution_authorized, false));
test('execution not allowed', () => assert.strictEqual(build(validInput()).real_release_execution_allowed, false));
test('PASS GOLD not fabricated', () => assert.strictEqual(build(validInput()).release_authorization_ledger_phase_passed, false));

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
