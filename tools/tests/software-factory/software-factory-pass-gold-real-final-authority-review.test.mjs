import assert from 'node:assert/strict';
import { STATUSES, build, validate, render } from '../../software-factory/software-factory-pass-gold-real-final-authority-review.mjs';

// ── helpers ──────────────────────────────────────────────────────────────────

function validInput() {
  return {
    local_rollback_recovery_readiness_evidence_ready: true,
    rollback_recovery_readiness_review_ready: true,
    chosen_path: 'RTE',
    rte0_complete: true,
    rte1_complete: true,
    rte2_complete: true,
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    final_authority_review: {
      runtime_truth_evidence_bound: true,
      smoke_flow_evidence_bound: true,
      rollback_recovery_evidence_bound: true,
      authority_review_declared: true,
      human_final_decision_required: true,
      rte_chain_complete: true,
      no_rte4_required: true,
      pass_gold_real_not_claimed: true,
      stable_promotion_blocked: true,
      release_blocked: true,
      deploy_blocked: true,
      tag_blocked: true,
      production_untouched: true,
      billing_blocked: true,
      secrets_blocked: true,
      network_blocked: true,
      rollback_execution_blocked: true,
      recovery_execution_blocked: true,
      v471_blocked: true,
      rta10_blocked: true,
      unify1_blocked: true,
      rc0_not_created: true,
    },
    authority_receipt: {
      reviewer_id: 'reviewer-001',
      review_mode: 'manual-final-authority-review',
      target_environment: 'local',
      runtime_truth_receipt_id: 'rte0-receipt-001',
      smoke_flow_receipt_id: 'rte1-receipt-001',
      rollback_recovery_receipt_id: 'rte2-receipt-001',
      pass_gold_real_claimed_by_module: false,
      stable_promotion_executed_by_module: false,
      release_executed_by_module: false,
      deploy_executed_by_module: false,
      tag_created_by_module: false,
      production_touched_by_module: false,
      rollback_executed_by_module: false,
      recovery_executed_by_module: false,
      command_executed_by_module: false,
      endpoint_probe_performed_by_module: false,
      external_network_used: false,
      secrets_used: false,
      billing_used: false,
    },
    required_controls: [
      'rte0-required',
      'rte1-required',
      'rte2-required',
      'rte-path-chosen',
      'final-authority-review-only',
      'manual-final-authority-review',
      'no-rte4',
      'no-v471',
      'no-rta10',
      'no-unify1',
      'no-rc0',
      'no-module-runtime-execution',
      'no-module-smoke-execution',
      'no-module-rollback-execution',
      'no-module-recovery-execution',
      'no-endpoint-probe',
      'no-production-target',
      'no-external-network',
      'no-secret-loading',
      'no-billing-access',
      'no-database-mutation',
      'no-service-restart',
      'no-deploy-execution',
      'no-release-execution',
      'no-tag-creation',
      'no-stable-promotion',
      'pass-gold-real-not-claimed',
      'final-human-decision-required',
    ],
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

test('STATUSES exported', () => {
  assert.ok(STATUSES);
  assert.equal(STATUSES.READY, 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_READY');
  assert.equal(STATUSES.BLOCKED_INPUT, 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_BLOCKED_INPUT');
  assert.equal(STATUSES.BLOCKED_RTE2, 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_BLOCKED_RTE2');
  assert.equal(STATUSES.FAIL, 'PASS_GOLD_REAL_FINAL_AUTHORITY_REVIEW_FAIL');
});

test('build exported', () => { assert.equal(typeof build, 'function'); });
test('validate exported', () => { assert.equal(typeof validate, 'function'); });
test('render exported', () => { assert.equal(typeof render, 'function'); });

// ── BLOCKED_INPUT ─────────────────────────────────────────────────────────────

test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('INPUT_NOT_OBJECT'));
});

test('array input → BLOCKED_INPUT', () => {
  const r = build([]);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('INPUT_NOT_OBJECT'));
});

test('final_authority_review missing → BLOCKED_INPUT', () => {
  const i = validInput();
  delete i.final_authority_review;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.some(e => e.includes('FINAL_AUTHORITY_REVIEW')));
});

test('final_authority_review not object → BLOCKED_INPUT', () => {
  const i = validInput();
  i.final_authority_review = 'bad';
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('authority_receipt missing → BLOCKED_INPUT', () => {
  const i = validInput();
  delete i.authority_receipt;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.some(e => e.includes('AUTHORITY_RECEIPT')));
});

test('authority_receipt not object → BLOCKED_INPUT', () => {
  const i = validInput();
  i.authority_receipt = 42;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
});

test('required_controls not array → BLOCKED_INPUT', () => {
  const i = validInput();
  i.required_controls = 'bad';
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.includes('REQUIRED_CONTROLS_NOT_ARRAY'));
});

// ── BLOCKED_RTE2 ──────────────────────────────────────────────────────────────

test('local_rollback_recovery_readiness_evidence_ready false → BLOCKED_RTE2', () => {
  const i = validInput();
  i.local_rollback_recovery_readiness_evidence_ready = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_RTE2);
  assert.ok(r.errors.includes('RTE2_ROLLBACK_RECOVERY_READINESS_EVIDENCE_NOT_READY'));
});

test('rollback_recovery_readiness_review_ready false → BLOCKED_RTE2', () => {
  const i = validInput();
  i.rollback_recovery_readiness_review_ready = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_RTE2);
  assert.ok(r.errors.includes('RTE2_ROLLBACK_RECOVERY_READINESS_EVIDENCE_NOT_READY'));
});

test('both RTE2 gates false → BLOCKED_RTE2', () => {
  const i = validInput();
  i.local_rollback_recovery_readiness_evidence_ready = false;
  i.rollback_recovery_readiness_review_ready = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_RTE2);
});

// ── FAIL gates ────────────────────────────────────────────────────────────────

test('chosen_path not RTE → FAIL', () => {
  const i = validInput();
  i.chosen_path = 'RTA';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE_PATH_NOT_CHOSEN'));
});

test('rte0_complete false → FAIL', () => {
  const i = validInput();
  i.rte0_complete = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE0_NOT_COMPLETE'));
});

test('rte1_complete false → FAIL', () => {
  const i = validInput();
  i.rte1_complete = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE1_NOT_COMPLETE'));
});

test('rte2_complete false → FAIL', () => {
  const i = validInput();
  i.rte2_complete = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE2_NOT_COMPLETE'));
});

test('pass_gold_real_achieved true → FAIL', () => {
  const i = validInput();
  i.pass_gold_real_achieved = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_RTE3'));
});

test('stable_promotion_allowed true → FAIL', () => {
  const i = validInput();
  i.stable_promotion_allowed = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('STABLE_PROMOTION_MUST_REMAIN_BLOCKED'));
});

// final_authority_review field false → FAIL
const farFields = [
  'runtime_truth_evidence_bound',
  'smoke_flow_evidence_bound',
  'rollback_recovery_evidence_bound',
  'authority_review_declared',
  'human_final_decision_required',
  'rte_chain_complete',
  'no_rte4_required',
  'pass_gold_real_not_claimed',
  'stable_promotion_blocked',
  'release_blocked',
  'deploy_blocked',
  'tag_blocked',
  'production_untouched',
  'billing_blocked',
  'secrets_blocked',
  'network_blocked',
  'rollback_execution_blocked',
  'recovery_execution_blocked',
  'v471_blocked',
  'rta10_blocked',
  'unify1_blocked',
  'rc0_not_created',
];

for (const field of farFields) {
  test(`final_authority_review.${field} false → FAIL`, () => {
    const i = validInput();
    i.final_authority_review[field] = false;
    const r = build(i);
    assert.equal(r.status, STATUSES.FAIL);
    assert.ok(
      r.errors.some(e => e.includes(field)),
      `Expected error referencing ${field}, got: ${JSON.stringify(r.errors)}`
    );
  });
}

// authority_receipt boolean-false fields → FAIL
const receiptFalseFields = [
  'pass_gold_real_claimed_by_module',
  'stable_promotion_executed_by_module',
  'release_executed_by_module',
  'deploy_executed_by_module',
  'tag_created_by_module',
  'production_touched_by_module',
  'rollback_executed_by_module',
  'recovery_executed_by_module',
  'command_executed_by_module',
  'endpoint_probe_performed_by_module',
  'external_network_used',
  'secrets_used',
  'billing_used',
];

for (const field of receiptFalseFields) {
  test(`authority_receipt.${field} true → FAIL`, () => {
    const i = validInput();
    i.authority_receipt[field] = true;
    const r = build(i);
    assert.equal(r.status, STATUSES.FAIL);
    assert.ok(
      r.errors.some(e => e.includes(field)),
      `Expected error referencing ${field}, got: ${JSON.stringify(r.errors)}`
    );
  });
}

test('authority_receipt reviewer_id empty → FAIL', () => {
  const i = validInput();
  i.authority_receipt.reviewer_id = '   ';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.some(e => e.includes('reviewer_id')));
});

test('authority_receipt review_mode wrong → FAIL', () => {
  const i = validInput();
  i.authority_receipt.review_mode = 'wrong-mode';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.some(e => e.includes('review_mode')));
});

test('authority_receipt target_environment wrong → FAIL', () => {
  const i = validInput();
  i.authority_receipt.target_environment = 'production';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.some(e => e.includes('target_environment')));
});

test('authority_receipt runtime_truth_receipt_id empty → FAIL', () => {
  const i = validInput();
  i.authority_receipt.runtime_truth_receipt_id = '';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.some(e => e.includes('runtime_truth_receipt_id')));
});

test('authority_receipt smoke_flow_receipt_id empty → FAIL', () => {
  const i = validInput();
  i.authority_receipt.smoke_flow_receipt_id = '';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.some(e => e.includes('smoke_flow_receipt_id')));
});

test('authority_receipt rollback_recovery_receipt_id empty → FAIL', () => {
  const i = validInput();
  i.authority_receipt.rollback_recovery_receipt_id = '';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.some(e => e.includes('rollback_recovery_receipt_id')));
});

// Missing required controls → FAIL
const requiredControls = [
  'rte0-required',
  'rte1-required',
  'rte2-required',
  'rte-path-chosen',
  'final-authority-review-only',
  'manual-final-authority-review',
  'no-rte4',
  'no-v471',
  'no-rta10',
  'no-unify1',
  'no-rc0',
  'no-module-runtime-execution',
  'no-module-smoke-execution',
  'no-module-rollback-execution',
  'no-module-recovery-execution',
  'no-endpoint-probe',
  'no-production-target',
  'no-external-network',
  'no-secret-loading',
  'no-billing-access',
  'no-database-mutation',
  'no-service-restart',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'pass-gold-real-not-claimed',
  'final-human-decision-required',
];

for (const ctrl of requiredControls) {
  test(`missing control '${ctrl}' → FAIL`, () => {
    const i = validInput();
    i.required_controls = i.required_controls.filter(c => c !== ctrl);
    const r = build(i);
    assert.equal(r.status, STATUSES.FAIL);
    assert.ok(
      r.errors.some(e => e.includes(ctrl)),
      `Expected error referencing ${ctrl}, got: ${JSON.stringify(r.errors)}`
    );
  });
}

// ── READY path ────────────────────────────────────────────────────────────────

const readyResult = build(validInput());

test('valid input → READY', () => {
  assert.equal(readyResult.status, STATUSES.READY);
});

test('module_version === RTE-3', () => {
  assert.equal(readyResult.module_version, 'RTE-3');
});

test('pass_gold_real_final_authority_review_ready true', () => {
  assert.equal(readyResult.pass_gold_real_final_authority_review_ready, true);
});

test('rte_chain_complete true', () => {
  assert.equal(readyResult.rte_chain_complete, true);
});

test('no_rte4_required true', () => {
  assert.equal(readyResult.no_rte4_required, true);
});

test('final_authority_review_ready true', () => {
  assert.equal(readyResult.final_authority_review_ready, true);
});

test('human_final_decision_required true', () => {
  assert.equal(readyResult.human_final_decision_required, true);
});

test('pass_gold_real_achieved false', () => {
  assert.equal(readyResult.pass_gold_real_achieved, false);
});

test('pass_gold_real_claimed_by_module false', () => {
  assert.equal(readyResult.pass_gold_real_claimed_by_module, false);
});

test('stable_promotion_allowed false', () => {
  assert.equal(readyResult.stable_promotion_allowed, false);
});

test('stable_promotion_executed_by_module false', () => {
  assert.equal(readyResult.stable_promotion_executed_by_module, false);
});

test('release_allowed false', () => {
  assert.equal(readyResult.release_allowed, false);
});

test('deploy_allowed false', () => {
  assert.equal(readyResult.deploy_allowed, false);
});

test('tag_allowed false', () => {
  assert.equal(readyResult.tag_allowed, false);
});

test('production_touched false', () => {
  assert.equal(readyResult.production_touched, false);
});

test('production_touched_by_module false', () => {
  assert.equal(readyResult.production_touched_by_module, false);
});

test('v471_allowed false', () => {
  assert.equal(readyResult.v471_allowed, false);
});

test('rta10_allowed false', () => {
  assert.equal(readyResult.rta10_allowed, false);
});

test('unify1_allowed false', () => {
  assert.equal(readyResult.unify1_allowed, false);
});

test('rc0_created false', () => {
  assert.equal(readyResult.rc0_created, false);
});

test('rollback_executed_by_module false', () => {
  assert.equal(readyResult.rollback_executed_by_module, false);
});

test('recovery_executed_by_module false', () => {
  assert.equal(readyResult.recovery_executed_by_module, false);
});

test('command_executed_by_module false', () => {
  assert.equal(readyResult.command_executed_by_module, false);
});

test('runtime_execution_performed_by_module false', () => {
  assert.equal(readyResult.runtime_execution_performed_by_module, false);
});

test('endpoint_probe_performed_by_module false', () => {
  assert.equal(readyResult.endpoint_probe_performed_by_module, false);
});

test('database_mutated false', () => {
  assert.equal(readyResult.database_mutated, false);
});

test('service_restarted false', () => {
  assert.equal(readyResult.service_restarted, false);
});

test('final_next_step === HUMAN_DECISION_REQUIRED', () => {
  assert.equal(readyResult.final_next_step, 'HUMAN_DECISION_REQUIRED');
});

test('evidence_hash is 64 chars', () => {
  assert.equal(typeof readyResult.evidence_hash, 'string');
  assert.equal(readyResult.evidence_hash.length, 64);
});

test('evidence_hash deterministic', () => {
  const r2 = build(validInput());
  assert.equal(readyResult.evidence_hash, r2.evidence_hash);
});

test('final_message exact', () => {
  assert.equal(
    readyResult.final_message,
    'RTE-3 final authority review prepared. RTE chain is complete, RTE-4 is forbidden, PASS GOLD REAL is not claimed, and stable promotion remains blocked pending explicit human final decision.'
  );
});

// ── validate ─────────────────────────────────────────────────────────────────

test('validate READY result → true', () => {
  assert.equal(validate(readyResult), true);
});

test('validate null → false', () => {
  assert.equal(validate(null), false);
});

test('validate BLOCKED_INPUT → false', () => {
  assert.equal(validate(build(null)), false);
});

test('validate BLOCKED_RTE2 → false', () => {
  const i = validInput();
  i.local_rollback_recovery_readiness_evidence_ready = false;
  assert.equal(validate(build(i)), false);
});

test('validate FAIL → false', () => {
  const i = validInput();
  i.pass_gold_real_achieved = true;
  assert.equal(validate(build(i)), false);
});

// ── render ────────────────────────────────────────────────────────────────────

const rendered = render(readyResult);

test('render contains RTE-3', () => {
  assert.ok(rendered.includes('RTE-3'), `Missing 'RTE-3' in render`);
});

test('render contains RTE-0', () => {
  assert.ok(rendered.includes('RTE-0'), `Missing 'RTE-0' in render`);
});

test('render contains RTE-1', () => {
  assert.ok(rendered.includes('RTE-1'), `Missing 'RTE-1' in render`);
});

test('render contains RTE-2', () => {
  assert.ok(rendered.includes('RTE-2'), `Missing 'RTE-2' in render`);
});

test('render contains RTE chain complete', () => {
  assert.ok(rendered.includes('RTE chain complete'), `Missing 'RTE chain complete' in render`);
});

test('render contains RTE-4 forbidden', () => {
  assert.ok(rendered.includes('RTE-4 forbidden'), `Missing 'RTE-4 forbidden' in render`);
});

test('render contains Path A RTE selected', () => {
  assert.ok(rendered.includes('Path A RTE selected'), `Missing 'Path A RTE selected' in render`);
});

test('render contains manual-final-authority-review', () => {
  assert.ok(rendered.includes('manual-final-authority-review'), `Missing mode in render`);
});

test('render contains PASS GOLD REAL is not claimed', () => {
  assert.ok(rendered.includes('PASS GOLD REAL is not claimed'), `Missing in render`);
});

test('render contains stable promotion remains blocked', () => {
  assert.ok(rendered.includes('stable promotion remains blocked'), `Missing in render`);
});

test('render contains final human decision required', () => {
  assert.ok(rendered.includes('final human decision required'), `Missing in render`);
});

test('render contains production untouched', () => {
  assert.ok(rendered.toLowerCase().includes('production untouched'), `Missing in render`);
});

test('render contains V471 blocked', () => {
  assert.ok(rendered.includes('V471 blocked'), `Missing 'V471 blocked' in render`);
});

test('render contains RTA-10 blocked', () => {
  assert.ok(rendered.includes('RTA-10 blocked'), `Missing 'RTA-10 blocked' in render`);
});

test('render contains UNIFY-1 blocked', () => {
  assert.ok(rendered.includes('UNIFY-1 blocked'), `Missing 'UNIFY-1 blocked' in render`);
});

test('render contains RC-0 not created', () => {
  assert.ok(rendered.includes('RC-0 not created'), `Missing 'RC-0 not created' in render`);
});

test('render contains REGRA ABSOLUTA', () => {
  assert.ok(rendered.includes('REGRA ABSOLUTA'), `Missing 'REGRA ABSOLUTA' in render`);
});

test('render contains final_message', () => {
  assert.ok(
    rendered.includes('RTE-3 final authority review prepared'),
    `Missing final_message in render`
  );
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
if (failed === 0) {
  console.log(`All RTE-3 tests passed. (${passed} passed)`);
} else {
  console.error(`${failed} test(s) FAILED. ${passed} passed.`);
  process.exit(1);
}
