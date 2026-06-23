import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-human-release-command-contract.mjs';

const REQUIRED_CONTROLS = [
  'final-human-release-command-required',
  'final-noop-execution-gate-required',
  'metadata-only-human-command',
  'human-command-not-created',
  'controlled-execution-not-unlocked',
  'real-release-not-executed',
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
  human_command_item_id: 'hcitem-001',
  human_command_type: 'final_human_release_command',
  human_command_mode: 'metadata-only',
  human_command_hash: 'abc123',
};

const BASE_INPUT = {
  final_human_release_command_contract_id: 'fhrcc-001',
  final_noop_execution_gate_phase_gate_id: 'fnegpg-001',
  final_noop_execution_gate_phase_gate_ready: true,
  human_command_requested_by: 'operator-001',
  human_command_reason: 'final human release command contract',
  human_command_mode: 'metadata-only',
  human_command_items: [BASE_ITEM],
  required_human_command_controls: [...REQUIRED_CONTROLS],
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
  assert.equal(build(null).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('missing contract id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_human_release_command_contract_id: undefined }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('missing phase gate id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_noop_execution_gate_phase_gate_id: undefined }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('missing phase gate ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_noop_execution_gate_phase_gate_ready: undefined }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('missing human_command_requested_by → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, human_command_requested_by: undefined }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('missing human_command_reason → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, human_command_reason: undefined }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('missing human_command_mode → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, human_command_mode: undefined }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('human_command_items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, human_command_items: 'bad' }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});
test('required_human_command_controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_human_command_controls: 'bad' }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid human_command_mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, human_command_mode: 'real-execute' }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL);
});
test('invalid human_command_type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, human_command_items: [{ ...BASE_ITEM, human_command_type: 'invalid' }] }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, human_command_items: ['bad'] }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_human_command_controls: [] }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_human_command_controls: ['final-human-release-command-required'] }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_FAIL);
});

// --- build: BLOCKED_NOOP_GATE ---
test('noop gate not ready → BLOCKED_NOOP_GATE', () => {
  assert.equal(build({ ...BASE_INPUT, final_noop_execution_gate_phase_gate_ready: false }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_BLOCKED_NOOP_GATE);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_READY);
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
  assert.ok(build(BASE_INPUT).final_human_release_command_contract_id);
});

// All human_command_modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`human_command_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, human_command_mode: mode }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_READY);
  });
}

// All human_command_types valid
const HUMAN_COMMAND_TYPES = [
  'final_human_release_command', 'final_human_deploy_command',
  'final_human_tag_command', 'final_human_stable_command',
  'final_human_artifact_command', 'final_human_production_command',
  'final_human_billing_command', 'final_human_secret_command',
  'final_human_network_command', 'final_human_rollback_command',
  'operator_human_command', 'emergency_stop_human_command',
];
for (const hct of HUMAN_COMMAND_TYPES) {
  test(`human_command_type ${hct} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, human_command_items: [{ ...BASE_ITEM, human_command_type: hct }] }).status, STATUSES.FINAL_HUMAN_RELEASE_COMMAND_READY);
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
  'final_human_release_command_created', 'controlled_execution_lock_bound',
  'controlled_execution_lock_verified', 'execution_lock_evidence_receipt_published',
  'final_controlled_execution_reviewed', 'final_controlled_execution_granted',
  'controlled_execution_lock_phase_passed', 'controlled_real_release_execution_unlocked',
];

for (const flag of INVARIANT_FLAGS) {
  test(`READY: ${flag} === false`, () => {
    assert.equal(build(BASE_INPUT)[flag], false, `expected ${flag} false`);
  });
  test(`BLOCKED_NOOP_GATE: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, final_noop_execution_gate_phase_gate_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_human_command_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered final_human_release_command_created → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_human_release_command_created: true }), false);
});
test('validate tampered controlled_real_release_execution_unlocked → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), controlled_real_release_execution_unlocked: true }), false);
});
test('validate tampered real_release_execution_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_execution_allowed: true }), false);
});
test('validate tampered real_release_executed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_executed: true }), false);
});
test('validate tampered real_release_command_armed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_armed: true }), false);
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
test('render READY → contains V436', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V436'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('FINAL_HUMAN_RELEASE_COMMAND_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains human_command_mode', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);