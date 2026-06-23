import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-noop-execution-review.mjs';

const REQUIRED_CONTROLS = [
  'final-noop-execution-review-required',
  'noop-execution-evidence-required',
  'metadata-only-review',
  'noop-execution-not-granted',
  'noop-not-executed',
  'real-release-command-not-armed',
  'real-release-not-executed',
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
  noop_review_item_id: 'nritem-001',
  noop_review_type: 'final_release_noop_execution_review',
  noop_review_mode: 'metadata-only',
  noop_review_hash: 'abc123',
};

const BASE_INPUT = {
  final_noop_execution_review_id: 'fner-001',
  noop_execution_evidence_receipt_id: 'neer-001',
  noop_execution_evidence_receipt_ready: true,
  noop_review_actor: 'reviewer-001',
  noop_review_reason: 'final no-op execution review',
  noop_review_mode: 'metadata-only',
  noop_review_items: [BASE_ITEM],
  required_noop_review_controls: [...REQUIRED_CONTROLS],
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
  assert.equal(build(null).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('missing review id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_noop_execution_review_id: undefined }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('missing evidence receipt id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, noop_execution_evidence_receipt_id: undefined }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('missing evidence ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, noop_execution_evidence_receipt_ready: undefined }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('missing review actor → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, noop_review_actor: undefined }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('missing review reason → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, noop_review_reason: undefined }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('missing review mode → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, noop_review_mode: undefined }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('review items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, noop_review_items: 'bad' }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});
test('required controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_noop_review_controls: 'bad' }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid review mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, noop_review_mode: 'real-execute' }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_FAIL);
});
test('invalid review type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, noop_review_items: [{ ...BASE_ITEM, noop_review_type: 'invalid' }] }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, noop_review_items: ['bad'] }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_noop_review_controls: [] }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_noop_review_controls: ['final-noop-execution-review-required'] }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_FAIL);
});

// --- build: BLOCKED_EVIDENCE ---
test('evidence not ready → BLOCKED_EVIDENCE', () => {
  assert.equal(build({ ...BASE_INPUT, noop_execution_evidence_receipt_ready: false }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_BLOCKED_EVIDENCE);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_READY);
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
test('READY has review id', () => {
  assert.ok(build(BASE_INPUT).final_noop_execution_review_id);
});

// All review modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`review_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, noop_review_mode: mode }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_READY);
  });
}

// All review types valid
const REVIEW_TYPES = [
  'final_release_noop_execution_review', 'final_deploy_noop_execution_review',
  'final_tag_noop_execution_review', 'final_stable_noop_execution_review',
  'final_artifact_noop_execution_review', 'final_production_noop_execution_review',
  'final_billing_noop_execution_review', 'final_secret_noop_execution_review',
  'final_network_noop_execution_review', 'final_rollback_noop_execution_review',
  'operator_noop_execution_review', 'emergency_stop_noop_execution_review',
];
for (const rt of REVIEW_TYPES) {
  test(`review_type ${rt} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, noop_review_items: [{ ...BASE_ITEM, noop_review_type: rt }] }).status, STATUSES.FINAL_NOOP_EXECUTION_REVIEW_READY);
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
  test(`BLOCKED_EVIDENCE: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, noop_execution_evidence_receipt_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_noop_review_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered final_noop_execution_reviewed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_noop_execution_reviewed: true }), false);
});
test('validate tampered final_noop_execution_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_noop_execution_granted: true }), false);
});
test('validate tampered real_release_noop_executed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_noop_executed: true }), false);
});
test('validate tampered real_release_execution_allowed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_execution_allowed: true }), false);
});
test('validate tampered real_release_command_armed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_armed: true }), false);
});
test('validate tampered real_release_command_seal_created → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), real_release_command_seal_created: true }), false);
});
test('validate tampered final_noop_execution_bound → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_noop_execution_bound: true }), false);
});
test('validate tampered final_noop_execution_verified → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_noop_execution_verified: true }), false);
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
test('render READY → contains V434', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V434'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('FINAL_NOOP_EXECUTION_REVIEW_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains review mode', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);