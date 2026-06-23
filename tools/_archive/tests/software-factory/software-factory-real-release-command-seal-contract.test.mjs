import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-release-command-seal-contract.mjs';

const REQUIRED_CONTROLS = [
  'real-release-command-seal-required',
  'command-arming-barrier-required',
  'metadata-only-command-seal',
  'command-seal-not-created',
  'real-release-command-not-armed',
  'command-arming-not-granted',
  'explicit-human-go-not-granted',
  'final-command-authority-not-granted',
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
  command_seal_item_id: 'csitem-001',
  command_seal_type: 'real_release_command_seal',
  command_seal_mode: 'metadata-only',
  command_seal_hash: 'abc123',
};

const BASE_INPUT = {
  real_release_command_seal_contract_id: 'rrsc-001',
  real_release_command_arming_barrier_phase_gate_id: 'rrcabpg-001',
  real_release_command_arming_barrier_phase_gate_ready: true,
  command_seal_requested_by: 'operator-001',
  command_seal_reason: 'real release command seal contract',
  command_seal_mode: 'metadata-only',
  command_seal_items: [BASE_ITEM],
  required_command_seal_controls: [...REQUIRED_CONTROLS],
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
  assert.equal(build(null).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('missing contract id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, real_release_command_seal_contract_id: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('missing phase gate id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, real_release_command_arming_barrier_phase_gate_id: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('missing phase gate ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, real_release_command_arming_barrier_phase_gate_ready: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('missing command_seal_requested_by → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, command_seal_requested_by: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('missing command_seal_reason → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, command_seal_reason: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('missing command_seal_mode → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, command_seal_mode: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('command_seal_items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, command_seal_items: 'bad' }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});
test('required_command_seal_controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_command_seal_controls: 'bad' }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid command_seal_mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, command_seal_mode: 'real-execute' }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL);
});
test('invalid command_seal_type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, command_seal_items: [{ ...BASE_ITEM, command_seal_type: 'invalid' }] }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, command_seal_items: ['bad'] }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_command_seal_controls: [] }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_command_seal_controls: ['real-release-command-seal-required'] }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_FAIL);
});

// --- build: BLOCKED_ARMING_BARRIER ---
test('arming barrier not ready → BLOCKED_ARMING_BARRIER', () => {
  assert.equal(build({ ...BASE_INPUT, real_release_command_arming_barrier_phase_gate_ready: false }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_BLOCKED_ARMING_BARRIER);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_READY);
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
  assert.ok(build(BASE_INPUT).real_release_command_seal_contract_id);
});

// All command_seal_modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`command_seal_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, command_seal_mode: mode }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_READY);
  });
}

// All command_seal_types valid
const SEAL_TYPES = [
  'real_release_command_seal', 'real_deploy_command_seal',
  'real_tag_command_seal', 'real_stable_command_seal',
  'real_artifact_command_seal', 'real_production_command_seal',
  'real_billing_command_seal', 'real_secret_command_seal',
  'real_network_command_seal', 'real_rollback_command_seal',
  'operator_command_seal', 'emergency_stop_command_seal',
];
for (const st of SEAL_TYPES) {
  test(`command_seal_type ${st} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, command_seal_items: [{ ...BASE_ITEM, command_seal_type: st }] }).status, STATUSES.REAL_RELEASE_COMMAND_SEAL_READY);
  });
}

// Invariants always false
const INVARIANT_FLAGS = [
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed', 'real_release_executed', 'real_deploy_executed',
  'real_tag_created', 'real_stable_promoted', 'artifact_published',
  'production_touched', 'billing_executed', 'secrets_accessed',
  'network_accessed', 'rollback_executed',
  'real_release_command_arming_barrier_passed', 'real_release_command_armed',
  'final_command_arming_granted', 'real_release_execution_allowed',
  'real_release_hard_stop_lifted', 'explicit_human_go_granted',
  'final_command_authority_granted', 'final_release_command_authority_phase_passed',
  'final_release_command_authority_created', 'explicit_human_go_seal_bound',
  'explicit_human_go_seal_verified', 'human_go_evidence_receipt_published',
  'final_command_authority_reviewed', 'manual_release_approval_capsule_phase_passed',
  'manual_release_execution_approved', 'release_authorization_ledger_phase_passed',
  'manual_release_execution_authorized', 'final_manual_go_command_created',
  'release_command_arming_bound', 'release_command_arming_verified',
  'command_arming_evidence_receipt_published', 'final_command_arming_reviewed',
  'real_release_command_seal_created', 'final_noop_execution_bound',
  'final_noop_execution_verified', 'noop_execution_evidence_receipt_published',
  'final_noop_execution_reviewed', 'final_noop_execution_granted',
  'final_noop_execution_gate_passed', 'real_release_noop_executed',
];

for (const flag of INVARIANT_FLAGS) {
  test(`READY: ${flag} === false`, () => {
    assert.equal(build(BASE_INPUT)[flag], false, `expected ${flag} false`);
  });
  test(`BLOCKED_ARMING_BARRIER: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, real_release_command_arming_barrier_phase_gate_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_command_seal_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered real_release_command_seal_created → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_seal_created: true }), false);
});
test('validate tampered real_release_command_armed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_armed: true }), false);
});
test('validate tampered final_command_arming_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_arming_granted: true }), false);
});
test('validate tampered real_release_execution_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_execution_allowed: true }), false);
});
test('validate tampered real_release_hard_stop_lifted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_hard_stop_lifted: true }), false);
});
test('validate tampered explicit_human_go_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_granted: true }), false);
});
test('validate tampered final_command_authority_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_granted: true }), false);
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
test('render READY → contains V431', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V431'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('REAL_RELEASE_COMMAND_SEAL_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains command_seal_mode', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);