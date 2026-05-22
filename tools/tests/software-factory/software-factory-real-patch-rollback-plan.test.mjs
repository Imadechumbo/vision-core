import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_PLAN_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-rollback-plan.mjs';

function validInput() {
  return {
    rollback_plan_id: 'rp-v271',
    test_lane_id: 'tl-v270',
    real_patch_test_lane_ready: true,
    rollback_steps: [
      { step_id: 'step-1', action_preview: 'git checkout HEAD -- tools/software-factory/some-file.mjs', target_path: 'tools/software-factory/some-file.mjs' },
      { step_id: 'step-2', action_preview: 'git checkout HEAD -- package.json', target_path: 'package.json' },
    ],
    snapshot_reference: 'snapshot-v267-abc123',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_PLAN_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_PLAN_STATUSES.includes('REAL_PATCH_ROLLBACK_PLAN_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_PLAN_STATUSES.includes('REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE'));
    console.log('  PASS: has BLOCKED_TEST_LANE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_PLAN_STATUSES.includes('REAL_PATCH_ROLLBACK_PLAN_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_PLAN_STATUSES.includes('REAL_PATCH_ROLLBACK_PLAN_READY'));
    console.log('  PASS: has READY');
  },
  () => {
    assert.equal(typeof build, 'function');
    console.log('  PASS: build is function');
  },
  () => {
    assert.equal(typeof validate, 'function');
    console.log('  PASS: validate is function');
  },
  () => {
    assert.equal(typeof render, 'function');
    console.log('  PASS: render is function');
  },

  // --- blocked input ---
  () => {
    const r = build(null);
    assert.equal(r.real_patch_rollback_plan_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_PLAN_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('rollback_plan_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked test lane ---
  () => {
    const input = validInput();
    input.real_patch_test_lane_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_PLAN_BLOCKED_TEST_LANE'));
    console.log('  PASS: test lane not ready -> BLOCKED_TEST_LANE');
  },
  () => {
    const input = validInput();
    input.rollback_steps = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('rollback_steps'));
    console.log('  PASS: empty steps -> BLOCKED_TEST_LANE');
  },
  () => {
    const input = validInput();
    delete input.snapshot_reference;
    const r = build(input);
    assert.ok(r.errors[0].includes('snapshot_reference'));
    console.log('  PASS: missing snapshot_reference -> BLOCKED_TEST_LANE');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.rollback_steps[0].target_path = 'config/.env';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_PLAN_FAIL'));
    console.log('  PASS: .env target -> FAIL');
  },
  () => {
    const input = validInput();
    input.rollback_steps[0].target_path = '.github/workflows/ci.yml';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_PLAN_FAIL'));
    console.log('  PASS: workflow target -> FAIL');
  },
  () => {
    const input = validInput();
    delete input.rollback_steps[0].action_preview;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_PLAN_FAIL'));
    console.log('  PASS: missing action_preview -> FAIL');
  },
  () => {
    const input = validInput();
    delete input.rollback_steps[0].target_path;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_PLAN_FAIL'));
    console.log('  PASS: missing target_path -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_rollback_plan_ready, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.rollback_plan_id);
    assert.equal(r.rollback_steps_count, 2);
    assert.ok(r.rollback_plan_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.rollback_plan_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.rollback_plan_hash, r2.rollback_plan_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.rollback_executed, false);
    assert.equal(r.files_restored, false);
    assert.equal(r.real_patch_applied, false);
    console.log('  PASS: ready: no rollback executed');
  },

  // --- validate ---
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.valid, true);
    console.log('  PASS: validate ready: valid=true');
  },
  () => {
    const r = build(null);
    const v = validate(r);
    assert.equal(v.valid, false);
    console.log('  PASS: validate blocked: valid=false');
  },

  // --- render ---
  () => {
    const r = render(build(validInput()));
    assert.equal(typeof r, 'string');
    assert.ok(r.includes('REAL_PATCH_ROLLBACK_PLAN_READY'));
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const r = render(null);
    assert.equal(typeof r, 'string');
    console.log('  PASS: render null: returns string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('rollback_plan_hash'));
    console.log('  PASS: render: contains rollback_plan_hash');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.rollback_executed, false);
    assert.equal(r.files_restored, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.rollback_executed, false);
    assert.equal(r.files_restored, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-real-patch-rollback-plan tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked test lane ---', 10, 13],
    ['--- fail ---', 13, 17],
    ['--- ready ---', 17, 22],
    ['--- validate ---', 22, 24],
    ['--- render ---', 24, 28],
    ['--- invariants false ---', 28, 30],
  ];
  let passed = 0;
  let failed = 0;
  for (const [label, start, end] of sections) {
    console.log(label);
    for (let i = start; i < end; i++) {
      try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
    }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
