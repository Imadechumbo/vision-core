import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-freeze-review-gate.mjs';

console.log('=== TESTING V464 FINAL FREEZE REVIEW GATE ===');

const requiredControls = [
  'freeze-integrity-evidence-required',
  'final-freeze-review-required',
  'metadata-only-review',
  'release-freeze-integrity-not-verified',
  'release-freeze-not-lifted',
  'release-execution-not-unfrozen',
  'final-release-execution-not-unlocked',
  'final-real-execution-barrier-not-lifted',
  'post-barrier-execution-not-authorized',
  'controlled-release-not-unlocked',
  'real-release-not-executed',
  'real-release-command-not-armed',
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

function pass(name) {
  console.log(`PASS: ${name}`);
}

function test(name, fn) {
  console.log(`\nTEST: ${name}`);
  fn();
  pass(name);
}

test('STATUSES exported', () => {
  assert.equal(STATUSES.READY, 'FINAL_FREEZE_REVIEW_GATE_READY');
});

test('null input → BLOCKED_INPUT', () => {
  const result = build(null);
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
  assert.equal(result.real_release_execution_allowed, false);
});

test('evidence receipt not ready → BLOCKED_EVIDENCE', () => {
  const result = build({ freeze_integrity_evidence_receipt_ready: false });
  assert.equal(result.status, STATUSES.BLOCKED_EVIDENCE);
  assert.deepEqual(result.errors, ['FREEZE_INTEGRITY_EVIDENCE_RECEIPT_NOT_READY']);
});

test('final_freeze_review_items not array → BLOCKED_INPUT', () => {
  const result = build({
    freeze_integrity_evidence_receipt_ready: true,
    final_freeze_review_items: 'bad',
    required_final_freeze_review_controls: requiredControls,
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('required controls not array → BLOCKED_INPUT', () => {
  const result = build({
    freeze_integrity_evidence_receipt_ready: true,
    final_freeze_review_items: [],
    required_final_freeze_review_controls: 'bad',
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('invalid review item → FAIL', () => {
  const result = build({
    freeze_integrity_evidence_receipt_ready: true,
    final_freeze_review_items: [{ id: '', type: '', reviewed: false }],
    required_final_freeze_review_controls: requiredControls,
  });
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.includes('INVALID_FINAL_FREEZE_REVIEW_ITEM_ID'));
  assert(result.errors.includes('INVALID_FINAL_FREEZE_REVIEW_ITEM_TYPE'));
  assert(result.errors.includes('FINAL_FREEZE_REVIEW_ITEM_NOT_REVIEWED'));
});

test('missing required control → FAIL', () => {
  const result = build({
    freeze_integrity_evidence_receipt_ready: true,
    final_freeze_review_items: [{ id: 'review-1', type: 'metadata-review', reviewed: true }],
    required_final_freeze_review_controls: [],
  });
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.includes('MISSING_REQUIRED_CONTROL: freeze-integrity-evidence-required'));
  assert(result.errors.includes('MISSING_REQUIRED_CONTROL: pass-gold-real-required'));
});

const readyInput = {
  freeze_integrity_evidence_receipt_ready: true,
  final_freeze_review_items: [
    { id: 'final-freeze-review-1', type: 'metadata-review', reviewed: true },
    { id: 'release-freeze-integrity-review-1', type: 'freeze-integrity-review', reviewed: true },
  ],
  required_final_freeze_review_controls: requiredControls,
};

const ready = build(readyInput);

test('valid input → READY', () => {
  assert.equal(ready.status, STATUSES.READY);
  assert.equal(ready.ready, true);
});

test('READY hash 64 chars', () => {
  assert.equal(ready.evidence_hash.length, 64);
});

test('READY hash deterministic', () => {
  assert.equal(build(readyInput).evidence_hash, ready.evidence_hash);
});

test('READY final message exact', () => {
  assert.equal(
    ready.final_message,
    'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.'
  );
});

test('all critical flags false', () => {
  assert.equal(ready.final_freeze_review_gate_passed, false);
  assert.equal(ready.real_release_execution_allowed, false);
  assert.equal(ready.production_touched, false);
  assert.equal(ready.deploy_allowed, false);
  assert.equal(ready.release_allowed, false);
  assert.equal(ready.tag_allowed, false);
  assert.equal(ready.stable_promotion_allowed, false);
  assert.equal(ready.artifact_publish_allowed, false);
  assert.equal(ready.billing_execution_allowed, false);
  assert.equal(ready.secret_access_allowed, false);
  assert.equal(ready.network_allowed, false);
  assert.equal(ready.rollback_execution_allowed, false);
});

test('validate READY → true', () => {
  assert.equal(validate(ready), true);
});

test('validate blocked → false', () => {
  assert.equal(validate(build(null)), false);
});

test('render null → contains REGRA', () => {
  assert(render(null).includes('REGRA ABSOLUTA'));
});

test('render READY → contains V464', () => {
  assert(render(ready).includes('V464 Final Freeze Review Gate'));
});

test('render READY → contains V461-V465', () => {
  assert(render(ready).includes('V461-V465'));
});

test('render READY → contains status', () => {
  assert(render(ready).includes('FINAL_FREEZE_REVIEW_GATE_READY'));
});

test('render READY → contains hash', () => {
  assert(render(ready).includes(ready.evidence_hash));
});

test('render READY → REGRA ABSOLUTA', () => {
  assert(render(ready).includes('REGRA ABSOLUTA'));
});

console.log('\n=== V464 TESTING COMPLETE ===');