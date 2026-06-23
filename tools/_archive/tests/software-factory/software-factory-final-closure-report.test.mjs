import assert from 'node:assert/strict';
import { STATUSES, build, validate, render } from '../../software-factory/software-factory-final-closure-report.mjs';

// ── helpers ───────────────────────────────────────────────────────────────────

function validInput() {
  return {
    pass_gold_real_final_authority_review_ready: true,
    rte_chain_complete: true,
    no_rte4_required: true,
    final_human_decision_required: true,
    final_next_step: 'HUMAN_DECISION_REQUIRED',
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    final_closure_report: {
      v466_v470_bound: true,
      rta0_rta9_bound: true,
      rtp0_rtp2_bound: true,
      unify0_bound: true,
      rte0_rte3_bound: true,
      rte_chain_closed: true,
      no_rte4: true,
      pass_gold_real_not_claimed: true,
      stable_blocked: true,
      release_blocked: true,
      deploy_blocked: true,
      tag_blocked: true,
      production_untouched: true,
      v471_blocked: true,
      rta10_not_created: true,
      unify1_not_created: true,
      rc0_not_created: true,
      no_next_automated_gate_required: true,
      final_human_decision_required: true,
    },
    required_controls: [
      'rte3-required',
      'rte-chain-complete',
      'no-rte4',
      'no-v471',
      'no-rta10',
      'no-unify1',
      'no-rc0',
      'no-final-closure-1',
      'no-new-gate-chain',
      'pass-gold-real-not-claimed',
      'stable-promotion-blocked',
      'release-blocked',
      'deploy-blocked',
      'tag-blocked',
      'production-untouched',
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
  assert.equal(STATUSES.READY, 'VISION_CORE_FINAL_CLOSURE_REPORT_READY');
  assert.equal(STATUSES.BLOCKED_INPUT, 'VISION_CORE_FINAL_CLOSURE_REPORT_BLOCKED_INPUT');
  assert.equal(STATUSES.BLOCKED_RTE3, 'VISION_CORE_FINAL_CLOSURE_REPORT_BLOCKED_RTE3');
  assert.equal(STATUSES.FAIL, 'VISION_CORE_FINAL_CLOSURE_REPORT_FAIL');
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

test('final_closure_report missing → BLOCKED_INPUT', () => {
  const i = validInput();
  delete i.final_closure_report;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.ok(r.errors.some(e => e.includes('FINAL_CLOSURE_REPORT')));
});

test('final_closure_report not object → BLOCKED_INPUT', () => {
  const i = validInput();
  i.final_closure_report = 'bad';
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

// ── BLOCKED_RTE3 ──────────────────────────────────────────────────────────────

test('pass_gold_real_final_authority_review_ready false → BLOCKED_RTE3', () => {
  const i = validInput();
  i.pass_gold_real_final_authority_review_ready = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.BLOCKED_RTE3);
  assert.ok(r.errors.includes('RTE3_FINAL_AUTHORITY_REVIEW_NOT_READY'));
});

// ── FAIL gates ────────────────────────────────────────────────────────────────

test('rte_chain_complete false → FAIL', () => {
  const i = validInput();
  i.rte_chain_complete = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE_CHAIN_NOT_COMPLETE'));
});

test('no_rte4_required false → FAIL', () => {
  const i = validInput();
  i.no_rte4_required = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RTE4_MUST_REMAIN_FORBIDDEN'));
});

test('final_human_decision_required false → FAIL', () => {
  const i = validInput();
  i.final_human_decision_required = false;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('FINAL_HUMAN_DECISION_REQUIRED'));
});

test('final_next_step invalid → FAIL', () => {
  const i = validInput();
  i.final_next_step = 'AUTO';
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('FINAL_NEXT_STEP_MUST_BE_HUMAN_DECISION_REQUIRED'));
});

test('pass_gold_real_achieved true → FAIL', () => {
  const i = validInput();
  i.pass_gold_real_achieved = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PASS_GOLD_REAL_MUST_NOT_BE_CLAIMED_BY_FINAL_CLOSURE_0'));
});

test('stable_promotion_allowed true → FAIL', () => {
  const i = validInput();
  i.stable_promotion_allowed = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('STABLE_PROMOTION_MUST_REMAIN_BLOCKED'));
});

test('release_allowed true → FAIL', () => {
  const i = validInput();
  i.release_allowed = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RELEASE_DEPLOY_TAG_MUST_REMAIN_BLOCKED'));
});

test('deploy_allowed true → FAIL', () => {
  const i = validInput();
  i.deploy_allowed = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RELEASE_DEPLOY_TAG_MUST_REMAIN_BLOCKED'));
});

test('tag_allowed true → FAIL', () => {
  const i = validInput();
  i.tag_allowed = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('RELEASE_DEPLOY_TAG_MUST_REMAIN_BLOCKED'));
});

test('production_touched true → FAIL', () => {
  const i = validInput();
  i.production_touched = true;
  const r = build(i);
  assert.equal(r.status, STATUSES.FAIL);
  assert.ok(r.errors.includes('PRODUCTION_MUST_REMAIN_UNTOUCHED'));
});

// final_closure_report fields → FAIL
const closureFields = [
  'v466_v470_bound',
  'rta0_rta9_bound',
  'rtp0_rtp2_bound',
  'unify0_bound',
  'rte0_rte3_bound',
  'rte_chain_closed',
  'no_rte4',
  'pass_gold_real_not_claimed',
  'stable_blocked',
  'release_blocked',
  'deploy_blocked',
  'tag_blocked',
  'production_untouched',
  'v471_blocked',
  'rta10_not_created',
  'unify1_not_created',
  'rc0_not_created',
  'no_next_automated_gate_required',
  'final_human_decision_required',
];

for (const field of closureFields) {
  test(`final_closure_report.${field} false → FAIL`, () => {
    const i = validInput();
    i.final_closure_report[field] = false;
    const r = build(i);
    assert.equal(r.status, STATUSES.FAIL);
    assert.ok(
      r.errors.some(e => e.includes(field)),
      `Expected error referencing ${field}, got: ${JSON.stringify(r.errors)}`
    );
  });
}

// Missing required controls → FAIL
const requiredControls = [
  'rte3-required',
  'rte-chain-complete',
  'no-rte4',
  'no-v471',
  'no-rta10',
  'no-unify1',
  'no-rc0',
  'no-final-closure-1',
  'no-new-gate-chain',
  'pass-gold-real-not-claimed',
  'stable-promotion-blocked',
  'release-blocked',
  'deploy-blocked',
  'tag-blocked',
  'production-untouched',
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

test("module_version === 'FINAL-CLOSURE-0'", () => {
  assert.equal(readyResult.module_version, 'FINAL-CLOSURE-0');
});

test('final_closure_report_ready true', () => {
  assert.equal(readyResult.final_closure_report_ready, true);
});

test('rte_chain_complete true', () => {
  assert.equal(readyResult.rte_chain_complete, true);
});

test('no_rte4_required true', () => {
  assert.equal(readyResult.no_rte4_required, true);
});

test('no_final_closure_1_required true', () => {
  assert.equal(readyResult.no_final_closure_1_required, true);
});

test('no_new_gate_chain_required true', () => {
  assert.equal(readyResult.no_new_gate_chain_required, true);
});

test('final_human_decision_required true', () => {
  assert.equal(readyResult.final_human_decision_required, true);
});

test("project_state === 'REVIEW_READY_CONTROLLED_CLOSURE'", () => {
  assert.equal(readyResult.project_state, 'REVIEW_READY_CONTROLLED_CLOSURE');
});

test('pass_gold_real_achieved false', () => {
  assert.equal(readyResult.pass_gold_real_achieved, false);
});

test('stable_promotion_allowed false', () => {
  assert.equal(readyResult.stable_promotion_allowed, false);
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
    'FINAL-CLOSURE-0 controlled closure report prepared. Vision Core is review-ready with RTE chain complete; PASS GOLD REAL is not claimed, stable promotion remains blocked, and no next automated gate is required.'
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

test('validate BLOCKED_RTE3 → false', () => {
  const i = validInput();
  i.pass_gold_real_final_authority_review_ready = false;
  assert.equal(validate(build(i)), false);
});

test('validate FAIL → false', () => {
  const i = validInput();
  i.pass_gold_real_achieved = true;
  assert.equal(validate(build(i)), false);
});

// ── render ────────────────────────────────────────────────────────────────────

const rendered = render(readyResult);

test('render contains FINAL-CLOSURE-0', () => {
  assert.ok(rendered.includes('FINAL-CLOSURE-0'), `Missing 'FINAL-CLOSURE-0'`);
});

test('render contains V466–V470', () => {
  assert.ok(rendered.includes('V466'), `Missing 'V466'`);
});

test('render contains RTA-0–RTA-9', () => {
  assert.ok(rendered.includes('RTA-0'), `Missing 'RTA-0'`);
});

test('render contains RTP-0–RTP-2', () => {
  assert.ok(rendered.includes('RTP-0'), `Missing 'RTP-0'`);
});

test('render contains UNIFY-0', () => {
  assert.ok(rendered.includes('UNIFY-0'), `Missing 'UNIFY-0'`);
});

test('render contains RTE-0–RTE-3', () => {
  assert.ok(rendered.includes('RTE-0'), `Missing 'RTE-0'`);
  assert.ok(rendered.includes('RTE-3'), `Missing 'RTE-3'`);
});

test('render contains RTE chain complete', () => {
  assert.ok(rendered.includes('RTE chain complete'), `Missing 'RTE chain complete'`);
});

test('render contains RTE-4 forbidden', () => {
  assert.ok(rendered.includes('RTE-4 forbidden'), `Missing 'RTE-4 forbidden'`);
});

test('render contains PASS GOLD REAL is not claimed', () => {
  assert.ok(rendered.includes('PASS GOLD REAL is not claimed'), `Missing in render`);
});

test('render contains stable promotion remains blocked', () => {
  assert.ok(rendered.includes('stable promotion remains blocked'), `Missing in render`);
});

test('render contains no next automated gate is required', () => {
  assert.ok(rendered.includes('no next automated gate is required'), `Missing in render`);
});

test('render contains final human decision required', () => {
  assert.ok(rendered.toLowerCase().includes('final human decision required'), `Missing in render`);
});

test('render contains V471 blocked', () => {
  assert.ok(rendered.includes('V471 blocked'), `Missing 'V471 blocked'`);
});

test('render contains RTA-10 not created', () => {
  assert.ok(rendered.includes('RTA-10 not created'), `Missing 'RTA-10 not created'`);
});

test('render contains UNIFY-1 not created', () => {
  assert.ok(rendered.includes('UNIFY-1 not created'), `Missing 'UNIFY-1 not created'`);
});

test('render contains RC-0 not created', () => {
  assert.ok(rendered.includes('RC-0 not created'), `Missing 'RC-0 not created'`);
});

test('render contains REGRA ABSOLUTA', () => {
  assert.ok(rendered.includes('REGRA ABSOLUTA'), `Missing 'REGRA ABSOLUTA'`);
});

test('render contains release/deploy/tag remain blocked', () => {
  assert.ok(
    rendered.toLowerCase().includes('release') && rendered.toLowerCase().includes('deploy') && rendered.toLowerCase().includes('tag'),
    `Missing release/deploy/tag mention`
  );
});

test('render contains production untouched', () => {
  assert.ok(rendered.toLowerCase().includes('production untouched'), `Missing 'production untouched'`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
if (failed === 0) {
  console.log(`All FINAL-CLOSURE-0 tests passed. (${passed} passed)`);
} else {
  console.error(`${failed} test(s) FAILED. ${passed} passed.`);
  process.exit(1);
}
