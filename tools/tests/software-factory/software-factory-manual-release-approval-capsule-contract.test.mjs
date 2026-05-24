import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-manual-release-approval-capsule-contract.mjs';

const REQUIRED_CONTROLS = [
  'manual-release-approval-capsule-required',
  'authorization-ledger-phase-required',
  'capsule-not-created',
  'manual-release-not-approved',
  'manual-release-not-authorized',
  'deploy-not-allowed',
  'stable-not-allowed',
  'tag-not-allowed',
  'artifact-not-published',
  'production-not-touched',
  'billing-not-executed',
  'secrets-not-accessed',
  'network-not-accessed',
  'rollback-not-executed',
  'hard-stop-not-lifted',
  'real-execution-not-allowed',
  'real-tag-not-created',
  'real-stable-not-promoted',
  'operator-seal-not-bound',
];

const BASE_INPUT = {
  release_authorization_ledger_phase_gate_id: 'ledger-phase-gate-001',
  release_authorization_ledger_phase_gate_ready: true,
  capsule_type: 'manual_release_approval_entry',
  capsule_id: 'capsule-001',
  operator_id: 'operator-001',
  approval_controls: [...REQUIRED_CONTROLS],
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
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('missing input → BLOCKED_INPUT', () => {
  const r = build({});
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('missing release_authorization_ledger_phase_gate_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, release_authorization_ledger_phase_gate_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('missing release_authorization_ledger_phase_gate_ready → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, release_authorization_ledger_phase_gate_ready: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('missing capsule_type → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, capsule_type: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('missing capsule_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, capsule_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('missing operator_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, operator_id: undefined });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('approval_controls not array → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, approval_controls: 'x' });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('dry_run not boolean → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, dry_run: 'yes' });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_INPUT);
});

test('invalid capsule_type → FAIL', () => {
  const r = build({ ...BASE_INPUT, capsule_type: 'invalid_type' });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_FAIL);
});

test('missing approval_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, approval_controls: [] });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_FAIL);
});

test('partial approval_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, approval_controls: ['manual-release-approval-capsule-required'] });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_FAIL);
});

test('ledger not ready → BLOCKED_LEDGER', () => {
  const r = build({ ...BASE_INPUT, release_authorization_ledger_phase_gate_ready: false });
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_BLOCKED_LEDGER);
});

test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_READY);
});

test('READY has hash 64 chars', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.hash.length, 64);
});

test('READY errors empty', () => {
  const r = build(BASE_INPUT);
  assert.deepEqual(r.errors, []);
});

test('READY has contract id', () => {
  const r = build(BASE_INPUT);
  assert.ok(r.manual_release_approval_capsule_contract_id);
});

// All capsule types valid
const CAPSULE_TYPES = [
  'manual_release_approval_entry',
  'manual_deploy_approval_entry',
  'manual_tag_approval_entry',
  'manual_stable_approval_entry',
  'manual_artifact_approval_entry',
  'manual_production_approval_entry',
  'manual_billing_approval_entry',
  'manual_secret_approval_entry',
  'manual_network_approval_entry',
  'manual_rollback_approval_entry',
  'operator_approval_entry',
  'emergency_stop_approval_entry',
];

for (const ct of CAPSULE_TYPES) {
  test(`capsule_type ${ct} → READY`, () => {
    const r = build({ ...BASE_INPUT, capsule_type: ct });
    assert.equal(r.status, STATUSES.MANUAL_RELEASE_APPROVAL_CAPSULE_READY);
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
  test(`BLOCKED_LEDGER: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, release_authorization_ledger_phase_gate_ready: false });
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
  test(`FAIL: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, approval_controls: [] });
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

test('validate tampered manual_release_approval_capsule_created → false', () => {
  const r = { ...build(BASE_INPUT), manual_release_approval_capsule_created: true };
  assert.equal(validate(r), false);
});

test('validate tampered manual_release_execution_approved → false', () => {
  const r = { ...build(BASE_INPUT), manual_release_execution_approved: true };
  assert.equal(validate(r), false);
});

test('validate tampered release_allowed → false', () => {
  const r = { ...build(BASE_INPUT), release_allowed: true };
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
  const r = { ...build(BASE_INPUT), hash: 'abc' };
  assert.equal(validate(r), false);
});

// --- render ---

test('render null → string with REGRA', () => {
  const s = render(null);
  assert.ok(typeof s === 'string');
  assert.ok(s.includes('SEM PASS GOLD REAL'));
});

test('render READY → contains V416', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('V416'));
});

test('render READY → contains REGRA ABSOLUTA', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});

test('render READY → contains status', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('MANUAL_RELEASE_APPROVAL_CAPSULE_READY'));
});

test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  const s = render(r);
  assert.ok(s.includes(r.hash));
});

test('render READY → contains capsule_type', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('manual_release_approval_entry'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
