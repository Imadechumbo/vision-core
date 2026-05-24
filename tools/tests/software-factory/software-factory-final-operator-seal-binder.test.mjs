import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-operator-seal-binder.mjs';

const REQUIRED_SEAL_CONTROLS = [
  'final-operator-seal-required',
  'capsule-contract-required',
  'seal-not-bound',
  'seal-not-verified',
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
  'operator-authority-not-granted',
];

const BASE_INPUT = {
  manual_release_approval_capsule_contract_id: 'manual-release-approval-capsule-contract-capsule-001',
  manual_release_approval_capsule_ready: true,
  seal_id: 'seal-001',
  seal_mode: 'dry_run_seal',
  operator_id: 'operator-001',
  seal_controls: [...REQUIRED_SEAL_CONTROLS],
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
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('empty object → BLOCKED_INPUT', () => {
  const r = build({});
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('missing contract id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, manual_release_approval_capsule_contract_id: undefined });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('missing capsule ready → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, manual_release_approval_capsule_ready: undefined });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('missing seal_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, seal_id: undefined });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('missing seal_mode → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, seal_mode: undefined });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('missing operator_id → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, operator_id: undefined });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('seal_controls not array → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, seal_controls: 'bad' });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('dry_run not boolean → BLOCKED_INPUT', () => {
  const r = build({ ...BASE_INPUT, dry_run: 1 });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_INPUT);
});

test('invalid seal_mode → FAIL', () => {
  const r = build({ ...BASE_INPUT, seal_mode: 'real_seal' });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_FAIL);
});

test('empty seal_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, seal_controls: [] });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_FAIL);
});

test('partial seal_controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, seal_controls: ['final-operator-seal-required'] });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_FAIL);
});

test('capsule not ready → BLOCKED_CAPSULE', () => {
  const r = build({ ...BASE_INPUT, manual_release_approval_capsule_ready: false });
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_BLOCKED_CAPSULE);
});

test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_READY);
});

test('READY has hash 64 chars', () => {
  const r = build(BASE_INPUT);
  assert.equal(r.hash.length, 64);
});

test('READY errors empty', () => {
  const r = build(BASE_INPUT);
  assert.deepEqual(r.errors, []);
});

test('READY has seal binder id', () => {
  const r = build(BASE_INPUT);
  assert.ok(r.final_operator_seal_binder_id);
});

// All seal modes valid
const SEAL_MODES = [
  'dry_run_seal',
  'review_seal',
  'simulation_seal',
  'pre_production_seal',
  'governance_seal',
];

for (const mode of SEAL_MODES) {
  test(`seal_mode ${mode} → READY`, () => {
    const r = build({ ...BASE_INPUT, seal_mode: mode });
    assert.equal(r.status, STATUSES.FINAL_OPERATOR_SEAL_BINDER_READY);
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
  test(`BLOCKED_CAPSULE: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, manual_release_approval_capsule_ready: false });
    assert.equal(r[flag], false, `expected ${flag} to be false`);
  });
  test(`FAIL: ${flag} === false`, () => {
    const r = build({ ...BASE_INPUT, seal_controls: [] });
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

test('validate tampered final_operator_seal_bound → false', () => {
  const r = { ...build(BASE_INPUT), final_operator_seal_bound: true };
  assert.equal(validate(r), false);
});

test('validate tampered final_operator_seal_verified → false', () => {
  const r = { ...build(BASE_INPUT), final_operator_seal_verified: true };
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
  const r = { ...build(BASE_INPUT), hash: 'abc' };
  assert.equal(validate(r), false);
});

// --- render ---

test('render null → string with REGRA', () => {
  const s = render(null);
  assert.ok(typeof s === 'string');
  assert.ok(s.includes('SEM PASS GOLD REAL'));
});

test('render READY → contains V417', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('V417'));
});

test('render READY → contains REGRA ABSOLUTA', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});

test('render READY → contains status', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('FINAL_OPERATOR_SEAL_BINDER_READY'));
});

test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  const s = render(r);
  assert.ok(s.includes(r.hash));
});

test('render READY → contains seal_mode', () => {
  const s = render(build(BASE_INPUT));
  assert.ok(s.includes('dry_run_seal'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
