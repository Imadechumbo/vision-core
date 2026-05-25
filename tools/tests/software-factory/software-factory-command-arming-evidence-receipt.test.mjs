import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-command-arming-evidence-receipt.mjs';

const REQUIRED_CONTROLS = [
  'command-arming-evidence-receipt-required',
  'release-command-arming-required',
  'metadata-only-evidence',
  'arming-evidence-not-published',
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
  arming_evidence_item_id: 'item-001',
  arming_evidence_type: 'release_command_arming_evidence',
  arming_evidence_mode: 'metadata-only',
  arming_evidence_hash: 'abc123',
};

const BASE_INPUT = {
  command_arming_evidence_receipt_id: 'caer-001',
  release_command_arming_binder_id: 'rcab-001',
  release_command_arming_binder_ready: true,
  arming_evidence_items: [BASE_ITEM],
  required_arming_evidence_controls: [...REQUIRED_CONTROLS],
  arming_evidence_level: 'metadata-only',
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
  assert.equal(build(null).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing receipt id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, command_arming_evidence_receipt_id: undefined }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing binder id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, release_command_arming_binder_id: undefined }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing binder ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, release_command_arming_binder_ready: undefined }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('evidence items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, arming_evidence_items: 'bad' }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_arming_evidence_controls: 'bad' }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});
test('missing evidence level → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, arming_evidence_level: undefined }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, arming_evidence_items: ['bad'] }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL);
});
test('invalid arming_evidence_mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, arming_evidence_items: [{ ...BASE_ITEM, arming_evidence_mode: 'real-execute' }] }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL);
});
test('invalid arming_evidence_type → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, arming_evidence_items: [{ ...BASE_ITEM, arming_evidence_type: 'real_release' }] }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_arming_evidence_controls: [] }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_arming_evidence_controls: ['command-arming-evidence-receipt-required'] }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_FAIL);
});

// --- build: BLOCKED_ARMING ---
test('binder not ready → BLOCKED_ARMING', () => {
  assert.equal(build({ ...BASE_INPUT, release_command_arming_binder_ready: false }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_BLOCKED_ARMING);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_READY);
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
test('READY has receipt id', () => {
  assert.ok(build(BASE_INPUT).command_arming_evidence_receipt_id);
});

// All evidence modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`arming_evidence_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, arming_evidence_items: [{ ...BASE_ITEM, arming_evidence_mode: mode }] }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_READY);
  });
}

// All evidence types valid
const EVIDENCE_TYPES = [
  'release_command_arming_evidence', 'deploy_command_arming_evidence',
  'tag_command_arming_evidence', 'stable_command_arming_evidence',
  'artifact_command_arming_evidence', 'production_command_arming_evidence',
  'billing_command_arming_evidence', 'secret_command_arming_evidence',
  'network_command_arming_evidence', 'rollback_command_arming_evidence',
  'operator_command_arming_evidence', 'emergency_stop_command_arming_evidence',
];
for (const et of EVIDENCE_TYPES) {
  test(`arming_evidence_type ${et} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, arming_evidence_items: [{ ...BASE_ITEM, arming_evidence_type: et }] }).status, STATUSES.COMMAND_ARMING_EVIDENCE_RECEIPT_READY);
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
  test(`BLOCKED_ARMING: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, release_command_arming_binder_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_arming_evidence_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered command_arming_evidence_receipt_published → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), command_arming_evidence_receipt_published: true }), false);
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
test('render READY → contains V428', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V428'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('COMMAND_ARMING_EVIDENCE_RECEIPT_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains evidence level', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);