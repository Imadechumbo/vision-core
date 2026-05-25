import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-release-command-arming-binder.mjs';

const REQUIRED_CONTROLS = [
  'release-command-arming-required',
  'final-manual-go-command-required',
  'metadata-only-arming',
  'arming-not-verified',
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
  arming_item_id: 'item-001',
  arming_type: 'release_command_arming',
  arming_mode: 'metadata-only',
  arming_hash: 'abc123',
};

const BASE_INPUT = {
  release_command_arming_binder_id: 'rcab-001',
  final_manual_go_command_contract_id: 'fmgcc-001',
  final_manual_go_command_contract_ready: true,
  arming_requested_by: 'operator-001',
  arming_reason: 'release command arming binder',
  arming_mode: 'metadata-only',
  arming_items: [BASE_ITEM],
  required_arming_controls: [...REQUIRED_CONTROLS],
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
  assert.equal(build(null).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('missing binder id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, release_command_arming_binder_id: undefined }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('missing contract id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_manual_go_command_contract_id: undefined }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('missing contract ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_manual_go_command_contract_ready: undefined }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('missing arming_requested_by → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, arming_requested_by: undefined }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('missing arming_reason → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, arming_reason: undefined }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('missing arming_mode → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, arming_mode: undefined }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('arming_items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, arming_items: 'bad' }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});
test('required_arming_controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_arming_controls: 'bad' }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid arming_mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, arming_mode: 'real-execute' }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL);
});
test('invalid arming_type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, arming_items: [{ ...BASE_ITEM, arming_type: 'real_release' }] }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, arming_items: ['bad'] }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_arming_controls: [] }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_arming_controls: ['release-command-arming-required'] }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_FAIL);
});

// --- build: BLOCKED_MANUAL_GO ---
test('manual go not ready → BLOCKED_MANUAL_GO', () => {
  assert.equal(build({ ...BASE_INPUT, final_manual_go_command_contract_ready: false }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_BLOCKED_MANUAL_GO);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_READY);
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
test('READY has binder id', () => {
  assert.ok(build(BASE_INPUT).release_command_arming_binder_id);
});

// All arming_modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`arming_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, arming_mode: mode }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_READY);
  });
}

// All arming_types valid
const ARMING_TYPES = [
  'release_command_arming', 'deploy_command_arming',
  'tag_command_arming', 'stable_command_arming',
  'artifact_command_arming', 'production_command_arming',
  'billing_command_arming', 'secret_command_arming',
  'network_command_arming', 'rollback_command_arming',
  'operator_command_arming', 'emergency_stop_command_arming',
];
for (const at of ARMING_TYPES) {
  test(`arming_type ${at} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, arming_items: [{ ...BASE_ITEM, arming_type: at }] }).status, STATUSES.RELEASE_COMMAND_ARMING_BINDER_READY);
  });
}

// Invariants always false
const INVARIANT_FLAGS = [
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed', 'real_release_executed', 'real_deploy_executed',
  'real_tag_created', 'real_stable_promoted', 'artifact_published',
  'production_touched', 'billing_executed', 'secrets_accessed',
  'network_accessed', 'rollback_executed',
  'final_release_command_authority_phase_passed', 'explicit_human_go_granted',
  'final_command_authority_granted', 'real_release_hard_stop_lifted',
  'real_release_execution_allowed', 'final_release_command_authority_created',
  'explicit_human_go_seal_bound', 'explicit_human_go_seal_verified',
  'human_go_evidence_receipt_published', 'final_command_authority_reviewed',
  'manual_release_approval_capsule_phase_passed', 'manual_release_execution_approved',
  'release_authorization_ledger_phase_passed', 'manual_release_execution_authorized',
  'final_manual_go_command_created', 'release_command_arming_bound',
  'release_command_arming_verified', 'command_arming_evidence_receipt_published',
  'final_command_arming_reviewed', 'final_command_arming_granted',
  'real_release_command_arming_barrier_passed', 'real_release_command_armed',
];

for (const flag of INVARIANT_FLAGS) {
  test(`READY: ${flag} === false`, () => {
    assert.equal(build(BASE_INPUT)[flag], false, `expected ${flag} false`);
  });
  test(`BLOCKED_MANUAL_GO: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, final_manual_go_command_contract_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_arming_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered release_command_arming_bound → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), release_command_arming_bound: true }), false);
});
test('validate tampered release_command_arming_verified → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), release_command_arming_verified: true }), false);
});
test('validate tampered real_release_command_armed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_armed: true }), false);
});
test('validate tampered real_release_execution_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_execution_allowed: true }), false);
});
test('validate tampered final_command_arming_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_arming_granted: true }), false);
});
test('validate tampered explicit_human_go_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_granted: true }), false);
});
test('validate tampered final_command_authority_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_granted: true }), false);
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
test('render READY → contains V427', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V427'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('RELEASE_COMMAND_ARMING_BINDER_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains arming_mode', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);