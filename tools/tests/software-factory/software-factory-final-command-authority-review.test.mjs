import { strict as assert } from 'assert';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-final-command-authority-review.mjs';

const REQUIRED_CONTROLS = [
  'final-command-authority-review-required',
  'human-go-evidence-required',
  'metadata-only-review',
  'authority-review-not-granted',
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
  authority_review_item_id: 'aritem-001',
  authority_review_type: 'final_release_command_authority_review',
  authority_review_mode: 'metadata-only',
  authority_review_hash: 'abc123',
};

const BASE_INPUT = {
  final_command_authority_review_id: 'fcar-001',
  human_go_evidence_receipt_id: 'hger-001',
  human_go_evidence_receipt_ready: true,
  authority_review_actor: 'reviewer-001',
  authority_review_reason: 'final command authority review for release',
  authority_review_mode: 'metadata-only',
  authority_review_items: [BASE_ITEM],
  required_authority_review_controls: [...REQUIRED_CONTROLS],
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
  assert.equal(build(null).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('empty object → BLOCKED_INPUT', () => {
  assert.equal(build({}).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('missing review id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, final_command_authority_review_id: undefined }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('missing evidence receipt id → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, human_go_evidence_receipt_id: undefined }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('missing evidence receipt ready → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, human_go_evidence_receipt_ready: undefined }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('missing authority_review_actor → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_review_actor: undefined }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('missing authority_review_reason → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_review_reason: undefined }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('missing authority_review_mode → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_review_mode: undefined }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('authority_review_items not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, authority_review_items: 'bad' }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});
test('required_authority_review_controls not array → BLOCKED_INPUT', () => {
  assert.equal(build({ ...BASE_INPUT, required_authority_review_controls: 'bad' }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_INPUT);
});

// --- build: FAIL ---
test('invalid authority_review_mode → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, authority_review_mode: 'real-grant' }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL);
});
test('invalid authority_review_type in item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, authority_review_items: [{ ...BASE_ITEM, authority_review_type: 'real_grant' }] }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL);
});
test('non-object item → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, authority_review_items: ['bad'] }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL);
});
test('empty controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_authority_review_controls: [] }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL);
});
test('partial controls → FAIL', () => {
  assert.equal(build({ ...BASE_INPUT, required_authority_review_controls: ['final-command-authority-review-required'] }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_FAIL);
});

// --- build: BLOCKED_EVIDENCE ---
test('evidence not ready → BLOCKED_EVIDENCE', () => {
  assert.equal(build({ ...BASE_INPUT, human_go_evidence_receipt_ready: false }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_BLOCKED_EVIDENCE);
});

// --- build: READY ---
test('valid input → READY', () => {
  assert.equal(build(BASE_INPUT).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_READY);
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
  assert.ok(build(BASE_INPUT).final_command_authority_review_id);
});

// All authority_review_modes valid
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  test(`authority_review_mode ${mode} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, authority_review_mode: mode }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_READY);
  });
}

// All authority_review_types valid
const REVIEW_TYPES = [
  'final_release_command_authority_review', 'final_deploy_command_authority_review',
  'final_tag_command_authority_review', 'final_stable_command_authority_review',
  'final_artifact_command_authority_review', 'final_production_command_authority_review',
  'final_billing_command_authority_review', 'final_secret_command_authority_review',
  'final_network_command_authority_review', 'final_rollback_command_authority_review',
  'operator_command_authority_review', 'emergency_stop_command_authority_review',
];
for (const rt of REVIEW_TYPES) {
  test(`authority_review_type ${rt} → READY`, () => {
    assert.equal(build({ ...BASE_INPUT, authority_review_items: [{ ...BASE_ITEM, authority_review_type: rt }] }).status, STATUSES.FINAL_COMMAND_AUTHORITY_REVIEW_READY);
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
  test(`BLOCKED_EVIDENCE: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, human_go_evidence_receipt_ready: false })[flag], false);
  });
  test(`FAIL: ${flag} === false`, () => {
    assert.equal(build({ ...BASE_INPUT, required_authority_review_controls: [] })[flag], false);
  });
  test(`BLOCKED_INPUT: ${flag} === false`, () => {
    assert.equal(build(null)[flag], false);
  });
}

// --- validate ---
test('validate READY → true', () => { assert.equal(validate(build(BASE_INPUT)), true); });
test('validate null → false', () => { assert.equal(validate(null), false); });
test('validate BLOCKED → false', () => { assert.equal(validate(build(null)), false); });
test('validate tampered final_command_authority_reviewed → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_reviewed: true }), false);
});
test('validate tampered final_command_authority_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), final_command_authority_granted: true }), false);
});
test('validate tampered explicit_human_go_granted → false', () => {
  assert.equal(validate({ ...build(BASE_INPUT), explicit_human_go_granted: true }), false);
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
test('render READY → contains V424', () => {
  assert.ok(render(build(BASE_INPUT)).includes('V424'));
});
test('render READY → REGRA ABSOLUTA', () => {
  assert.ok(render(build(BASE_INPUT)).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
});
test('render READY → contains status', () => {
  assert.ok(render(build(BASE_INPUT)).includes('FINAL_COMMAND_AUTHORITY_REVIEW_READY'));
});
test('render READY → contains hash', () => {
  const r = build(BASE_INPUT);
  assert.ok(render(r).includes(r.hash));
});
test('render READY → contains review_mode', () => {
  assert.ok(render(build(BASE_INPUT)).includes('metadata-only'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
