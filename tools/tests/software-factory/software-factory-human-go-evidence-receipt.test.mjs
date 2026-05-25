import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-human-go-evidence-receipt.mjs';

const REQUIRED_CONTROLS = [
  'human-go-evidence-receipt-required',
  'explicit-human-go-seal-required',
  'metadata-only-evidence',
  'go-evidence-not-published',
  'go-seal-not-verified',
  'explicit-human-go-not-granted',
  'final-command-authority-not-granted',
  'manual-release-not-approved',
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

const BASE_ITEM = {
  go_evidence_item_id: 'gevitem-001',
  go_evidence_type: 'explicit_human_release_go_evidence',
  go_evidence_mode: 'metadata-only',
  go_evidence_hash: 'abc123',
};

const BASE_INPUT = {
  human_go_evidence_receipt_id: 'hger-001',
  explicit_human_go_seal_binder_id: 'ehgsb-001',
  explicit_human_go_seal_binder_ready: true,
  go_evidence_items: [BASE_ITEM],
  required_go_evidence_controls: [...REQUIRED_CONTROLS],
  go_evidence_level: 'metadata-only',
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

// --- exports ---
test('STATUSES exported', () => { assert.ok(STATUSES); });
test('build exported', () => { assert.equal(typeof build, 'function'); });
test('validate exported', () => { assert.equal(typeof validate, 'function'); });
test('render exported', () => { assert.equal(typeof render, 'function'); });

// --- build: BLOCKED_INPUT ---
test('null input → BLOCKED_INPUT', () => {
  assert.equal(build(null).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing evidence receipt id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, human_go_evidence_receipt_id: undefined }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing seal binder id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, explicit_human_go_seal_binder_id: undefined }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing seal binder ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, explicit_human_go_seal_binder_ready: undefined }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('go_evidence_items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, go_evidence_items: 'bad' }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('required_go_evidence_controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_go_evidence_controls: 'bad' }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing go_evidence_level → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, go_evidence_level: undefined }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid go_evidence_mode in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, go_evidence_items: [{ ...BASE_ITEM, go_evidence_mode: 'real-execute' }] }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL);
});
test('invalid go_evidence_type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, go_evidence_items: [{ ...BASE_ITEM, go_evidence_type: 'real_go' }] }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, go_evidence_items: ['bad'] }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_go_evidence_controls: [] }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_go_evidence_controls: ['human-go-evidence-receipt-required'] }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_FAIL);
});

// --- build: BLOCKED_GO_SEAL ---
test('seal binder not ready → BLOCKED_GO_SEAL', () => {
  assert.equal(build({ ...BASE_INPUT, explicit_human_go_seal_binder_ready: false }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_BLOCKED_GO_SEAL);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_READY);
});
test('READY hash 64 chars', () => {
  assert.equal(build(BASE_INPUT).hash.length, 64);
});
test('READY hash deterministic', () => {
  assert.equal(build(BASE_INPUT).hash, build(BASE_INPUT).hash);
});
test('READY errors empty', () => {
  assert.deepEqual(build(BASE_INPUT).errors, []);
});
test('READY has evidence receipt id', () => {
  assert.ok(build(BASE_INPUT).human_go_evidence_receipt_id);
});

// All evidence modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`go_evidence_mode ${mode} in item → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, go_evidence_items: [{ ...BASE_ITEM, go_evidence_mode: mode }] }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_READY);
  });
}

// All evidence types valid
const EVIDENCE_TYPES = [
  'explicit_human_release_go_evidence', 'explicit_human_deploy_go_evidence',
  'explicit_human_tag_go_evidence', 'explicit_human_stable_go_evidence',
  'explicit_human_artifact_go_evidence', 'explicit_human_production_go_evidence',
  'explicit_human_billing_go_evidence', 'explicit_human_secret_go_evidence',
  'explicit_human_network_go_evidence', 'explicit_human_rollback_go_evidence',
  'explicit_human_operator_go_evidence', 'explicit_human_emergency_stop_go_evidence',
];
for (const et of EVIDENCE_TYPES) {
  test(`go_evidence_type ${et} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, go_evidence_items: [{ ...BASE_ITEM, go_evidence_type: et }] }).status, STATUSES.HUMAN_GO_EVIDENCE_RECEIPT_READY);
  });
}

// Invariants always false
const INVARIANT_FLAGS = [
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed', 'real_release_executed', 'real_deploy_executed',
  'real_tag_created', 'real_stable_promoted', 'artifact_published',
  'production_touched', 'billing_executed', 'secrets_accessed',
  'network_accessed', 'rollback_executed',
  'manual_release_approval_capsule_phase_passed', 'manual_release_execution_approved',
  'release_authorization_ledger_phase_passed', 'manual_release_execution_authorized',
  'real_release_hard_stop_lifted', 'real_release_execution_allowed',
  'final_release_command_authority_created', 'explicit_human_go_seal_bound',
  'explicit_human_go_seal_verified', 'human_go_evidence_receipt_published',
  'final_command_authority_reviewed', 'final_command_authority_granted',
  'final_release_command_authority_phase_passed', 'explicit_human_go_granted',
];

for (const flag of INVARIANT_FLAGS) {
  test(`READY: ${flag} === false`, () => {
    assert.equal(build(BASE_INPUT)[flag], false, `expected ${flag} false`);
  });
  test(`BLOCKED_GO_SEAL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, explicit_human_go_seal_binder_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_go_evidence_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered human_go_evidence_receipt_published → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), human_go_evidence_receipt_published: true }), false);
});
test('validate tampered explicit_human_go_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_granted: true }), false);
});
test('validate tampered final_command_authority_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_granted: true }), false);
});
test('validate tampered explicit_human_go_seal_verified → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_seal_verified: true }), false);
});
test('validate tampered real_release_execution_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_execution_allowed: true }), false);
});
test('validate tampered real_release_hard_stop_lifted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_hard_stop_lifted: true }), false);
});
test('validate no hash → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), hash: undefined }), false);
});
test('validate short hash → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), hash: 'abc' }), false);
});

// --- render ---
test('render null → string with REGRA', () => {
  const s = render(null);
  assert.ok(typeof s === 'string');
  assert.ok(s.includes('SEM PASS GOLD REAL'));
});
test('render READY → contains V423', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V423'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('HUMAN_GO_EVIDENCE_RECEIPT_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains go_evidence_level', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
