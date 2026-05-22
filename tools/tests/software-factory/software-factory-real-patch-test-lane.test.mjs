import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_TEST_LANE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-test-lane.mjs';

function validInput() {
  return {
    test_lane_id: 'tl-v270',
    proof_id: 'pf-v269',
    real_patch_physical_apply_proof_ready: true,
    test_plan: [
      { name: 'syntax-check', command_preview: 'node tools/syntax-check.mjs', required: true },
      { name: 'unit-tests', command_preview: 'npm run test:quick', required: true },
      { name: 'optional-lint', command_preview: 'npm run lint', required: false },
    ],
    test_results: [
      { name: 'syntax-check', status: 'pass' },
      { name: 'unit-tests', status: 'pass' },
      { name: 'optional-lint', status: 'fail' },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_TEST_LANE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_TEST_LANE_STATUSES.includes('REAL_PATCH_TEST_LANE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_TEST_LANE_STATUSES.includes('REAL_PATCH_TEST_LANE_BLOCKED_PROOF'));
    console.log('  PASS: has BLOCKED_PROOF');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_TEST_LANE_STATUSES.includes('REAL_PATCH_TEST_LANE_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_TEST_LANE_STATUSES.includes('REAL_PATCH_TEST_LANE_READY'));
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
    assert.equal(r.real_patch_test_lane_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_TEST_LANE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('test_lane_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked proof ---
  () => {
    const input = validInput();
    input.real_patch_physical_apply_proof_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_TEST_LANE_BLOCKED_PROOF'));
    console.log('  PASS: proof not ready -> BLOCKED_PROOF');
  },
  () => {
    const input = validInput();
    input.test_plan = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('test_plan'));
    console.log('  PASS: empty test_plan -> BLOCKED_PROOF');
  },
  () => {
    const input = validInput();
    input.test_results = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('test_results'));
    console.log('  PASS: empty test_results -> BLOCKED_PROOF');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.test_results[0].status = 'fail';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_TEST_LANE_FAIL'));
    console.log('  PASS: required test fail -> FAIL');
  },
  () => {
    const input = validInput();
    input.test_results[1].status = 'pending';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_TEST_LANE_FAIL'));
    console.log('  PASS: required test pending -> FAIL');
  },
  () => {
    const input = validInput();
    input.test_results = input.test_results.filter(r => r.name !== 'syntax-check');
    const r = build(input);
    assert.ok(r.errors[0].includes('syntax-check'));
    console.log('  PASS: required test missing -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_test_lane_ready, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.test_lane_id);
    assert.equal(r.tests_total, 3);
    assert.equal(r.tests_passed, 2);
    console.log('  PASS: ready: counts correct');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.test_lane_hash);
    assert.equal(r.test_lane_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.test_lane_hash, r2.test_lane_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    console.log('  PASS: ready: no patch applied');
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
    assert.ok(r.includes('REAL_PATCH_TEST_LANE_READY'));
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
    assert.ok(r.includes('test_lane_hash'));
    console.log('  PASS: render: contains test_lane_hash');
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
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-real-patch-test-lane tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked proof ---', 10, 13],
    ['--- fail ---', 13, 16],
    ['--- ready ---', 16, 21],
    ['--- validate ---', 21, 23],
    ['--- render ---', 23, 27],
    ['--- invariants false ---', 27, 29],
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
