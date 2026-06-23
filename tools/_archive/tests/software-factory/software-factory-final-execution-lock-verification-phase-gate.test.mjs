import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-execution-lock-verification-phase-gate.mjs';

console.log('=== TESTING V465 FINAL EXECUTION LOCK VERIFICATION PHASE GATE ===');

const requiredControls = [
  'final-execution-lock-verification-required',
  'release-freeze-integrity-required',
  'freeze-integrity-evidence-required',
  'final-freeze-review-required',
  'metadata-only-phase-gate',
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
  assert.equal(STATUSES.READY, 'FINAL_EXECUTION_LOCK_VERIFICATION_PHASE_GATE_READY');
});

test('null input → BLOCKED_INPUT', () => {
  const result = build(null);
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
  assert.equal(result.real_release_execution_allowed, false);
});

test('final freeze review gate not ready → BLOCKED_REVIEW', () => {
  const result = build({ final_freeze_review_gate_ready: false });
  assert.equal(result.status, STATUSES.BLOCKED_REVIEW);
  assert.deepEqual(result.errors, ['FINAL_FREEZE_REVIEW_GATE_NOT_READY']);
});

test('phase_gate_items not array → BLOCKED_INPUT', () => {
  const result = build({
    final_freeze_review_gate_ready: true,
    phase_gate_items: 'bad',
    required_phase_controls: requiredControls,
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('required_phase_controls not array → BLOCKED_INPUT', () => {
  const result = build({
    final_freeze_review_gate_ready: true,
    phase_gate_items: [],
    required_phase_controls: 'bad',
  });
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
});

test('invalid phase item → FAIL', () => {
  const result = build({
    final_freeze_review_gate_ready: true,
    phase_gate_items: [{ id: '', type: '', verified: false }],
    required_phase_controls: requiredControls,
  });
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.includes('INVALID_PHASE_GATE_ITEM_ID'));
  assert(result.errors.includes('INVALID_PHASE_GATE_ITEM_TYPE'));
  assert(result.errors.includes('PHASE_GATE_ITEM_NOT_VERIFIED'));
});

test('missing required control → FAIL', () => {
  const result = build({
    final_freeze_review_gate_ready: true,
    phase_gate_items: [{ id: 'phase-gate-1', type: 'metadata-phase-gate', verified: true }],
    required_phase_controls: [],
  });
  assert.equal(result.status, STATUSES.FAIL);
  assert(result.errors.includes('MISSING_REQUIRED_CONTROL: final-execution-lock-verification-required'));
  assert(result.errors.includes('MISSING_REQUIRED_CONTROL: pass-gold-real-required'));
});

const readyInput = {
  final_freeze_review_gate_ready: true,
  phase_gate_items: [
    { id: 'v461-final-execution-lock-verification', type: 'contract-binding', verified: true },
    { id: 'v462-release-freeze-integrity', type: 'freeze-binding', verified: true },
    { id: 'v463-freeze-integrity-evidence', type: 'evidence-binding', verified: true },
    { id: 'v464-final-freeze-review', type: 'review-binding', verified: true },
  ],
  required_phase_controls: requiredControls,
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

test('all bindings true but phase/execution false', () => {
  assert.equal(ready.final_execution_lock_verified, true);
  assert.equal(ready.release_freeze_integrity_bound, true);
  assert.equal(ready.freeze_integrity_evidence_bound, true);
  assert.equal(ready.final_freeze_review_bound, true);
  assert.equal(ready.final_execution_lock_verification_phase_passed, false);
  assert.equal(ready.v466_allowed, false);
});

test('all critical flags false', () => {
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

test('render READY → contains V465', () => {
  assert(render(ready).includes('V465 Final Execution Lock Verification Phase Gate'));
});

test('render READY → contains V461-V465', () => {
  assert(render(ready).includes('V461-V465'));
});

test('render READY → contains status', () => {
  assert(render(ready).includes('FINAL_EXECUTION_LOCK_VERIFICATION_PHASE_GATE_READY'));
});

test('render READY → contains v466 false', () => {
  assert(render(ready).includes('v466_allowed=false'));
});

test('render READY → contains hash', () => {
  assert(render(ready).includes(ready.evidence_hash));
});

test('render READY → REGRA ABSOLUTA', () => {
  assert(render(ready).includes('REGRA ABSOLUTA'));
});

console.log('\n=== V465 TESTING COMPLETE ===');