import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-release-command-arming-barrier-phase-gate.mjs';

const FINAL_MESSAGE = 'V426-V430 real release execution final manual GO and command arming barrier complete. Real release execution remains blocked until explicit V431 command.';

const BASE_IDS = {
  final_manual_go_command_contract: 'fmgcc-001',
  release_command_arming_binder: 'rcab-001',
  command_arming_evidence_receipt: 'caer-001',
  final_command_arming_review: 'fcar-001',
};

const BASE_INPUT = {
  real_release_command_arming_barrier_phase_gate_id: 'rrcabpg-001',
  final_command_arming_review_id: 'fcar-001',
  final_command_arming_review_ready: true,
  ids: { ...BASE_IDS },
  phase_summary: 'V426-V430 real release command arming barrier phase gate',
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
  assert.equal(build(null).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('missing phase gate id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, real_release_command_arming_barrier_phase_gate_id: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('missing review id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_command_arming_review_id: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('missing review ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_command_arming_review_ready: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('ids is array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, ids: [] }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('ids is null → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, ids: null }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('missing phase_summary → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, phase_summary: undefined }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});
test('review ready not boolean → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_command_arming_review_ready: 'yes' }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_INPUT);
});

// --- build: INCOMPLETE ---
test('missing final_manual_go_command_contract id → INCOMPLETE', () => {
  const ids = { ...BASE_IDS };
  delete ids.final_manual_go_command_contract;
  assert.equal(build({ ...BASE_INPUT, ids }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE);
});
test('missing release_command_arming_binder id → INCOMPLETE', () => {
  const ids = { ...BASE_IDS };
  delete ids.release_command_arming_binder;
  assert.equal(build({ ...BASE_INPUT, ids }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE);
});
test('missing command_arming_evidence_receipt id → INCOMPLETE', () => {
  const ids = { ...BASE_IDS };
  delete ids.command_arming_evidence_receipt;
  assert.equal(build({ ...BASE_INPUT, ids }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE);
});
test('missing final_command_arming_review id → INCOMPLETE', () => {
  const ids = { ...BASE_IDS };
  delete ids.final_command_arming_review;
  assert.equal(build({ ...BASE_INPUT, ids }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE);
});
test('all ids missing → INCOMPLETE', () => {
  assert.equal(build({ ...BASE_INPUT, ids: {} }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE);
});
test('empty string id → INCOMPLETE', () => {
  assert.equal(build({ ...BASE_INPUT, ids: { ...BASE_IDS, final_manual_go_command_contract: '' } }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_INCOMPLETE);
});

// --- build: BLOCKED_REVIEW ---
test('review not ready → BLOCKED_REVIEW', () => {
  assert.equal(build({ ...BASE_INPUT, final_command_arming_review_ready: false }).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_BLOCKED_REVIEW);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.REAL_RELEASE_COMMAND_ARMING_BARRIER_READY);
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
test('READY has phase gate id', () => {
  assert.ok(build(BASE_INPUT).real_release_command_arming_barrier_phase_gate_id);
});
test('READY modules_verified has 4 entries', () => {
  assert.equal(build(BASE_INPUT).modules_verified.length, 4);
});
test('READY final_message exact', () => {
  assert.equal(build(BASE_INPUT).final_message, FINAL_MESSAGE);
});
test('READY has ids', () => {
  const r = build(BASE_INPUT);
  assert.ok(r.ids);
  assert.equal(r.ids.final_manual_go_command_contract, 'fmgcc-001');
});

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
  test(`BLOCKED_REVIEW: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, final_command_arming_review_ready: false })[flag], false);
  });
  test(`INCOMPLETE: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, ids: {} })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED_INPUT → false', () => { assert.equal(validate(build(null)), false); });
test('validate INCOMPLETE → false', () => { assert.equal(validate(build({ ...BASE_INPUT, ids: {} })), false); });
test('validate BLOCKED_REVIEW → false', () => { assert.equal(validate(build({ ...BASE_INPUT, final_command_arming_review_ready: false })), false); });
test('validate tampered real_release_command_arming_barrier_passed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_arming_barrier_passed: true }), false);
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
test('validate tampered final_command_authority_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_granted: true }), false);
});
test('validate tampered explicit_human_go_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_granted: true }), false);
});
test('validate wrong final_message → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_message: 'wrong' }), false);
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
test('render READY → contains V430', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V430'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('REAL_RELEASE_COMMAND_ARMING_BARRIER_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains final_message', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V426-V430'));
});
test('render READY → contains modules_verified', () => {
  assert.ok(render(build(BASE_INPUT)).includes('final_manual_go_command_contract'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);