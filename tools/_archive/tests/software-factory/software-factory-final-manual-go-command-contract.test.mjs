import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-manual-go-command-contract.mjs';

const REQUIRED_CONTROLS = [
  'final-manual-go-command-required',
  'final-release-command-authority-phase-required',
  'metadata-only-manual-go',
  'manual-go-command-not-created',
  'command-arming-not-granted',
  'real-release-command-not-armed',
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
  manual_go_item_id: 'item-001',
  manual_go_type: 'final_manual_release_go_command',
  manual_go_mode: 'metadata-only',
  manual_go_hash: 'abc123',
};

const BASE_INPUT = {
  final_manual_go_command_contract_id: 'fmgcc-001',
  final_release_command_authority_phase_gate_id: 'frcapg-001',
  final_release_command_authority_phase_gate_ready: true,
  manual_go_requested_by: 'operator-001',
  manual_go_reason: 'final manual GO command review',
  manual_go_mode: 'metadata-only',
  manual_go_items: [BASE_ITEM],
  required_manual_go_controls: [...REQUIRED_CONTROLS],
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
  assert.equal(build(null).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('missing contract id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_manual_go_command_contract_id: undefined }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('missing phase gate id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_release_command_authority_phase_gate_id: undefined }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('missing phase gate ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_release_command_authority_phase_gate_ready: undefined }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('missing manual_go_requested_by → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, manual_go_requested_by: undefined }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('missing manual_go_reason → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, manual_go_reason: undefined }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('missing manual_go_mode → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, manual_go_mode: undefined }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('manual_go_items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, manual_go_items: 'bad' }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});
test('required_manual_go_controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_manual_go_controls: 'bad' }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid manual_go_mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, manual_go_mode: 'real-execute' }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL);
});
test('invalid manual_go_type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, manual_go_items: [{ ...BASE_ITEM, manual_go_type: 'real_release' }] }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, manual_go_items: ['bad'] }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_manual_go_controls: [] }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_manual_go_controls: ['final-manual-go-command-required'] }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_FAIL);
});

// --- build: BLOCKED_AUTHORITY ---
test('authority not ready → BLOCKED_AUTHORITY', () => {
  assert.equal(build({ ...BASE_INPUT, final_release_command_authority_phase_gate_ready: false }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_BLOCKED_AUTHORITY);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.FINAL_MANUAL_GO_COMMAND_READY);
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
  assert.ok(build(BASE_INPUT).final_manual_go_command_contract_id);
});

// All manual_go_modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`manual_go_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, manual_go_mode: mode }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_READY);
  });
}

// All manual_go_types valid
const GO_TYPES = [
  'final_manual_release_go_command', 'final_manual_deploy_go_command',
  'final_manual_tag_go_command', 'final_manual_stable_go_command',
  'final_manual_artifact_go_command', 'final_manual_production_go_command',
  'final_manual_billing_go_command', 'final_manual_secret_go_command',
  'final_manual_network_go_command', 'final_manual_rollback_go_command',
  'operator_manual_go_command', 'emergency_stop_manual_go_command',
];
for (const gt of GO_TYPES) {
  test(`manual_go_type ${gt} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, manual_go_items: [{ ...BASE_ITEM, manual_go_type: gt }] }).status, STATUSES.FINAL_MANUAL_GO_COMMAND_READY);
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
  test(`BLOCKED_AUTHORITY: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, final_release_command_authority_phase_gate_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_manual_go_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered final_manual_go_command_created → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_manual_go_command_created: true }), false);
});
test('validate tampered final_command_arming_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_arming_granted: true }), false);
});
test('validate tampered real_release_command_armed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_armed: true }), false);
});
test('validate tampered real_release_execution_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_execution_allowed: true }), false);
});
test('validate tampered final_command_authority_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_granted: true }), false);
});
test('validate tampered explicit_human_go_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_granted: true }), false);
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
test('render READY → contains V426', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V426'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('FINAL_MANUAL_GO_COMMAND_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains manual_go_mode', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);