import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-release-command-authority-contract.mjs';

const REQUIRED_CONTROLS = [
  'final-release-command-authority-required',
  'manual-approval-capsule-phase-required',
  'metadata-only-authority',
  'authority-not-created',
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
  authority_item_id: 'item-001',
  authority_type: 'final_release_command_authority',
  authority_mode: 'metadata-only',
  authority_hash: 'abc123',
};

const BASE_INPUT = {
  final_release_command_authority_contract_id: 'frcac-001',
  manual_release_approval_capsule_phase_gate_id: 'mrapg-001',
  manual_release_approval_capsule_phase_gate_ready: true,
  authority_requested_by: 'operator-001',
  authority_reason: 'final release authority review',
  authority_mode: 'metadata-only',
  authority_items: [BASE_ITEM],
  required_authority_controls: [...REQUIRED_CONTROLS],
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

// --- build: null/empty ---
test('null input → BLOCKED_INPUT', () => {
  assert.equal(build(null).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('missing contract id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_release_command_authority_contract_id: undefined }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('missing phase gate id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, manual_release_approval_capsule_phase_gate_id: undefined }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('missing phase gate ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, manual_release_approval_capsule_phase_gate_ready: undefined }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('missing authority_requested_by → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_requested_by: undefined }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('missing authority_reason → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_reason: undefined }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('missing authority_mode → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_mode: undefined }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('authority_items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_items: 'bad' }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});
test('required_authority_controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_authority_controls: 'bad' }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid authority_mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, authority_mode: 'real-execute' }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL);
});
test('invalid authority_type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, authority_items: [{ ...BASE_ITEM, authority_type: 'real_release' }] }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, authority_items: ['bad'] }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL);
});
test('missing controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_authority_controls: [] }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_authority_controls: ['final-release-command-authority-required'] }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_FAIL);
});

// --- build: BLOCKED_CAPSULE ---
test('capsule not ready → BLOCKED_CAPSULE', () => {
  assert.equal(build({ ...BASE_INPUT, manual_release_approval_capsule_phase_gate_ready: false }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_BLOCKED_CAPSULE);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_READY);
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
test('READY has contract id', () => {
  assert.ok(build(BASE_INPUT).final_release_command_authority_contract_id);
});

// All authority modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`authority_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, authority_mode: mode }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_READY);
  });
}

// All authority types valid
const AUTHORITY_TYPES = [
  'final_release_command_authority', 'final_deploy_command_authority',
  'final_tag_command_authority', 'final_stable_command_authority',
  'final_artifact_command_authority', 'final_production_command_authority',
  'final_billing_command_authority', 'final_secret_command_authority',
  'final_network_command_authority', 'final_rollback_command_authority',
  'operator_command_authority', 'emergency_stop_command_authority',
];
for (const at of AUTHORITY_TYPES) {
  test(`authority_type ${at} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, authority_items: [{ ...BASE_ITEM, authority_type: at }] }).status, STATUSES.FINAL_RELEASE_COMMAND_AUTHORITY_READY);
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
  test(`BLOCKED_CAPSULE: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, manual_release_approval_capsule_phase_gate_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_authority_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered final_release_command_authority_created → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_release_command_authority_created: true }), false);
});
test('validate tampered explicit_human_go_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_granted: true }), false);
});
test('validate tampered final_command_authority_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_granted: true }), false);
});
test('validate tampered real_release_execution_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_execution_allowed: true }), false);
});
test('validate tampered real_release_hard_stop_lifted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_hard_stop_lifted: true }), false);
});
test('validate tampered release_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), release_allowed: true }), false);
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
test('render READY → contains V421', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V421'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('FINAL_RELEASE_COMMAND_AUTHORITY_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains authority_mode', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
