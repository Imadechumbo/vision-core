import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-manual-release-approval-capsule-phase-gate.mjs';

const FINAL_MESSAGE = 'V416-V420 manual release execution approval capsule and final operator seal complete. Real release execution remains blocked until explicit V421 command.';

const BASE_INPUT = {
  manual_release_approval_capsule_contract_id: 'manual-release-approval-capsule-contract-capsule-001',
  final_operator_seal_binder_id: 'final-operator-seal-binder-seal-001',
  manual_approval_evidence_capsule_id: 'manual-approval-evidence-capsule-evidence-001',
  release_execution_approval_review_id: 'release-execution-approval-review-review-001',
  release_execution_approval_review_ready: true,
  operator_id: 'operator-001',
  dry_run: true,
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

// --- build ---

test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT);
});

test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT);
});

test('missing dry_run → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, dry_run: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT);
});

test('missing operator_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, operator_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT);
});

test('missing review ready → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, release_execution_approval_review_ready: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT);
});

test('dry_run not boolean → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, dry_run: 'yes' });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_INPUT);
});

test('missing capsule contract id → INCOMPLETE', () => {
  const r = build({ ...BASE_INPUT, manual_release_approval_capsule_contract_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE);
});

test('missing seal binder id → INCOMPLETE', () => {
  const r = build({ ...BASE_INPUT, final_operator_seal_binder_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE);
});

test('missing evidence capsule id → INCOMPLETE', () => {
  const r = build({ ...BASE_INPUT, manual_approval_evidence_capsule_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE);
});

test('missing review id → INCOMPLETE', () => {
  const r = build({ ...BASE_INPUT, release_execution_approval_review_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE);
});

test('all ids missing → INCOMPLETE', () => {
  const r = build({
    ...BASE_INPUT,
    manual_release_approval_capsule_contract_id: undefined,
    final_operator_seal_binder_id: undefined,
    manual_approval_evidence_capsule_id: undefined,
    release_execution_approval_review_id: undefined,
  });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_INCOMPLETE);
});

test('review not ready → BLOCKED_REVIEW', () => {
  const r = build({ ...BASE_INPUT, release_execution_approval_review_ready: false });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_BLOCKED_REVIEW);
});

test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_READY);
});

test('READY has hash 64 chars', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.hash.length, 64);
});

test('READY errors empty', () => {
  const r = build(BASE_INPUT);
  assert.deepEqual(r.errors, []);
});

test('READY has phase gate id', () => {
  const r = build(BASE_INPUT);
  assert.ok(r.phase_gate_id);
});

test('READY modules_verified has 4 entries', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.modules_verified.length, 4);
});

test('READY final_message exact', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.final_message, FINAL_MESSAGE);
});

// Invariants always false
const INVARIANT_FLAGS = [
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed', 'real_release_executed', 'real_deploy_executed',
  'real_tag_created', 'real_stable_promoted', 'artifact_published',
  'production_touched', 'billing_executed', 'secrets_accessed',
  'network_accessed', 'rollback_executed', 'release_authorization_ledger_phase_passed',
  'manual_release_execution_authorized', 'real_release_hard_stop_lifted',
  'real_release_execution_allowed', 'manual_release_approval_capsule_created',
  'final_operator_seal_bound', 'final_operator_seal_verified',
  'manual_approval_evidence_capsule_published', 'release_execution_approval_reviewed',
  'release_execution_approval_granted', 'manual_release_approval_capsule_phase_passed',
  'manual_release_execution_approved',
];

for (const flag of INVARIANT_FLAGS) {
  test(`READY: ${flag} === false`, () => {
    const r = build(BASE_INPUT);
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
  test(`BLOCKED_REVIEW: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, release_execution_approval_review_ready: false });
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
  test(`INCOMPLETE: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, manual_release_approval_capsule_contract_id: undefined });
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    const r = build(null);
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
}

// --- validate ---

test('validate READY → true', () => {
  assert.equal(validate(build(BASE_INPUT)), true);
});

test('validate null → false', () => {
  assert.equal(validate(null), false);
});

test('validate BLOCKED_INPUT → false', () => {
  assert.equal(validate(build(null)), false);
});

test('validate INCOMPLETE → false', () => {
  assert.equal(validate(build({ ...BASE_INPUT, manual_release_approval_capsule_contract_id: undefined })), false);
});

test('validate BLOCKED_REVIEW → false', () => {
  assert.equal(validate(build({ ...BASE_INPUT, release_execution_approval_review_ready: false })), false);
});

test('validate tampered manual_release_approval_capsule_phase_passed → false', () => {
  const r = { ...build(BASE_INPUT), manual_release_approval_capsule_phase_passed: true };
  assert.equal(validate(r), false);
});

test('validate tampered manual_release_execution_approved → false', () => {
  const r = { ...build(BASE_INPUT), manual_release_execution_approved: true };
  assert.equal(validate(r), false);
});

test('validate tampered release_execution_approval_granted → false', () => {
  const r = { ...build(BASE_INPUT), release_execution_approval_granted: true };
  assert.equal(validate(r), false);
});

test('validate tampered real_release_execution_allowed → false', () => {
  const r = { ...build(BASE_INPUT), real_release_execution_allowed: true };
  assert.equal(validate(r), false);
});

test('validate tampered real_release_hard_stop_lifted → false', () => {
  const r = { ...build(BASE_INPUT), real_release_hard_stop_lifted: true };
  assert.equal(validate(r), false);
});

test('validate tampered manual_release_execution_authorized → false', () => {
  const r = { ...build(BASE_INPUT), manual_release_execution_authorized: true };
  assert.equal(validate(r), false);
});

test('validate wrong final_message → false', () => {
  const r = { ...build(BASE_INPUT), final_message: 'wrong message' };
  assert.equal(validate(r), false);
});

test('validate no hash → false', () => {
  const r = { ...build(BASE_INPUT), hash: undefined };
  assert.equal(validate(r), false);
});

test('validate short hash → false', () => {
  const r = { ...build(BASE_INPUT), hash: 'abc' };
  assert.equal(validate(r), false);
});

// --- render ---

test('render null → string with REGRA', () => {
  const s = render(null);
  assert.ok(typeof s === 'string');
  assert.ok(s.includes('SEM PASS GOLD REAL'));
});

test('render READY → contains V420', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('V420'));
});

test('render READY → contains REGRA ABSOLUTA', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});

test('render READY → contains status', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('MANUAL_RELEASE_APPROVAL_CAPSULE_PHASE_GATE_READY'));
});

test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  const s = render(r);
  assert.ok(s.includes(r.hash));
});

test('render READY → contains final_message', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('V416-V420'));
});

test('render READY → contains modules_verified', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('manual_release_approval_capsule_contract'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
