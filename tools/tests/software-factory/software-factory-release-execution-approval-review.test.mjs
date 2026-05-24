import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-release-execution-approval-review.mjs';

const REQUIRED_REVIEW_CONTROLS = [
  'release-execution-approval-review-required',
  'evidence-capsule-required',
  'review-not-approved',
  'approval-not-granted',
  'manual-release-not-approved',
  'manual-release-not-authorized',
  'real-execution-not-allowed',
  'hard-stop-not-lifted',
  'deploy-not-allowed',
  'stable-not-allowed',
  'tag-not-allowed',
  'artifact-not-published',
  'production-not-touched',
  'billing-not-executed',
  'secrets-not-accessed',
  'network-not-accessed',
  'rollback-not-executed',
  'real-tag-not-created',
  'real-stable-not-promoted',
  'phase-gate-not-passed',
];

const BASE_INPUT = {
  manual_approval_evidence_capsule_id: 'manual-approval-evidence-capsule-evidence-001',
  manual_approval_evidence_capsule_ready: true,
  review_id: 'review-001',
  review_outcome: 'review_dry_run_complete',
  operator_id: 'operator-001',
  review_controls: [...REQUIRED_REVIEW_CONTROLS],
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
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('missing evidence capsule id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, manual_approval_evidence_capsule_id: undefined });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('missing evidence capsule ready → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, manual_approval_evidence_capsule_ready: undefined });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('missing review_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, review_id: undefined });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('missing review_outcome → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, review_outcome: undefined });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('missing operator_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, operator_id: undefined });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('review_controls not array → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, review_controls: {} });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('dry_run not boolean → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, dry_run: 'true' });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_INPUT);
});

test('invalid review_outcome → FAIL', () => {
  const r = build({ ...BASE_INPUT, review_outcome: 'review_approved' });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_FAIL);
});

test('empty review_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, review_controls: [] });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_FAIL);
});

test('partial review_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, review_controls: ['release-execution-approval-review-required'] });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_FAIL);
});

test('evidence not ready → BLOCKED_EVIDENCE', () => {
  const r = build({ ...BASE_INPUT, manual_approval_evidence_capsule_ready: false });
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_BLOCKED_EVIDENCE);
});

test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_READY);
});

test('READY has hash 64 chars', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.hash.length, 64);
});

test('READY errors empty', () => {
  const r = build(BASE_INPUT);
  assert.deepEqual(r.errors, []);
});

test('READY has review id', () => {
  const r = build(BASE_INPUT);
  assert.ok(r.release_execution_approval_review_id);
});

// All review outcomes valid
const REVIEW_OUTCOMES = [
  'review_pending',
  'review_dry_run_complete',
  'review_simulation_complete',
  'review_governance_complete',
  'review_pre_production_complete',
];

for (const ro of REVIEW_OUTCOMES) {
  test(`review_outcome ${ro} → READY`, () => {
    const r = build({ ...BASE_INPUT, review_outcome: ro });
    assert.equal(r.status, STATUSES.RELEASE_EXECUTION_APPROVAL_REVIEW_READY);
  });
}

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
  test(`BLOCKED_EVIDENCE: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, manual_approval_evidence_capsule_ready: false });
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
  test(`FAIL: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, review_controls: [] });
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

test('validate BLOCKED → false', () => {
  assert.equal(validate(build(null)), false);
});

test('validate tampered release_execution_approval_reviewed → false', () => {
  const r = { ...build(BASE_INPUT), release_execution_approval_reviewed: true };
  assert.equal(validate(r), false);
});

test('validate tampered release_execution_approval_granted → false', () => {
  const r = { ...build(BASE_INPUT), release_execution_approval_granted: true };
  assert.equal(validate(r), false);
});

test('validate tampered manual_release_execution_approved → false', () => {
  const r = { ...build(BASE_INPUT), manual_release_execution_approved: true };
  assert.equal(validate(r), false);
});

test('validate tampered real_release_execution_allowed → false', () => {
  const r = { ...build(BASE_INPUT), real_release_execution_allowed: true };
  assert.equal(validate(r), false);
});

test('validate no hash → false', () => {
  const r = { ...build(BASE_INPUT), hash: undefined };
  assert.equal(validate(r), false);
});

test('validate short hash → false', () => {
  const r = { ...build(BASE_INPUT), hash: 'x'.repeat(10) };
  assert.equal(validate(r), false);
});

// --- render ---

test('render null → string with REGRA', () => {
  const s = render(null);
  assert.ok(typeof s === 'string');
  assert.ok(s.includes('SEM PASS GOLD REAL'));
});

test('render READY → contains V419', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('V419'));
});

test('render READY → contains REGRA ABSOLUTA', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});

test('render READY → contains status', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('RELEASE_EXECUTION_APPROVAL_REVIEW_READY'));
});

test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  const s = render(r);
  assert.ok(s.includes(r.hash));
});

test('render READY → contains review_outcome', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('review_dry_run_complete'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
