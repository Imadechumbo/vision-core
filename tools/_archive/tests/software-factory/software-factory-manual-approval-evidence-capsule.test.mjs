import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-manual-approval-evidence-capsule.mjs';

const REQUIRED_EVIDENCE_CONTROLS = [
  'manual-approval-evidence-capsule-required',
  'seal-binder-required',
  'evidence-not-published',
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
  'operator-seal-not-verified',
  'approval-phase-not-passed',
];

const BASE_INPUT = {
  final_operator_seal_binder_id: 'final-operator-seal-binder-seal-001',
  final_operator_seal_binder_ready: true,
  evidence_id: 'evidence-001',
  evidence_type: 'approval_audit_trail',
  operator_id: 'operator-001',
  evidence_controls: [...REQUIRED_EVIDENCE_CONTROLS],
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
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('missing seal binder id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, final_operator_seal_binder_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('missing seal binder ready → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, final_operator_seal_binder_ready: undefined });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('missing evidence_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, evidence_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('missing evidence_type → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, evidence_type: undefined });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('missing operator_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, operator_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('evidence_controls not array → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, evidence_controls: 'bad' });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('dry_run not boolean → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, dry_run: 0 });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_INPUT);
});

test('invalid evidence_type → FAIL', () => {
  const r = build({ ...BASE_INPUT, evidence_type: 'real_evidence' });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_FAIL);
});

test('empty evidence_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, evidence_controls: [] });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_FAIL);
});

test('partial evidence_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, evidence_controls: ['manual-approval-evidence-capsule-required'] });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_FAIL);
});

test('seal not ready → BLOCKED_SEAL', () => {
  const r = build({ ...BASE_INPUT, final_operator_seal_binder_ready: false });
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_BLOCKED_SEAL);
});

test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_READY);
});

test('READY has hash 64 chars', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.hash.length, 64);
});

test('READY errors empty', () => {
  const r = build(BASE_INPUT);
  assert.deepEqual(r.errors, []);
});

test('READY has evidence capsule id', () => {
  const r = build(BASE_INPUT);
  assert.ok(r.manual_approval_evidence_capsule_id);
});

// All evidence types valid
const EVIDENCE_TYPES = [
  'approval_audit_trail',
  'seal_binding_evidence',
  'capsule_contract_evidence',
  'operator_authority_evidence',
  'authorization_ledger_evidence',
  'dry_run_evidence',
  'governance_evidence',
];

for (const et of EVIDENCE_TYPES) {
  test(`evidence_type ${et} → READY`, () => {
    const r = build({ ...BASE_INPUT, evidence_type: et });
    assert.equal(r.status, STATUSES.MANUAL_APPROVAL_EVIDENCE_CAPSULE_READY);
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
  test(`BLOCKED_SEAL: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, final_operator_seal_binder_ready: false });
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
  test(`FAIL: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, evidence_controls: [] });
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

test('validate tampered manual_approval_evidence_capsule_published → false', () => {
  const r = { ...build(BASE_INPUT), manual_approval_evidence_capsule_published: true };
  assert.equal(validate(r), false);
});

test('validate tampered manual_release_execution_approved → false', () => {
  const r = { ...build(BASE_INPUT), manual_release_execution_approved: true };
  assert.equal(validate(r), false);
});

test('validate tampered final_operator_seal_verified → false', () => {
  const r = { ...build(BASE_INPUT), final_operator_seal_verified: true };
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
  const r = { ...build(BASE_INPUT), hash: 'short' };
  assert.equal(validate(r), false);
});

// --- render ---

test('render null → string with REGRA', () => {
  const s = render(null);
  assert.ok(typeof s === 'string');
  assert.ok(s.includes('SEM PASS GOLD REAL'));
});

test('render READY → contains V418', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('V418'));
});

test('render READY → contains REGRA ABSOLUTA', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});

test('render READY → contains status', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('MANUAL_APPROVAL_EVIDENCE_CAPSULE_READY'));
});

test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  const s = render(r);
  assert.ok(s.includes(r.hash));
});

test('render READY → contains evidence_type', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('approval_audit_trail'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
