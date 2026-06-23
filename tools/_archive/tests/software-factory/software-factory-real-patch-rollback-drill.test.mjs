import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_DRILL_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-rollback-drill.mjs';

function validInput() {
  return {
    rollback_drill_id: 'rd-v272',
    rollback_plan_id: 'rp-v271',
    real_patch_rollback_plan_ready: true,
    drill_mode: 'dry-run',
    drill_result: {
      simulated: true,
      rollback_executed: false,
      files_restored: false,
      validation_passed: true,
    },
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_DRILL_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('REAL_PATCH_ROLLBACK_DRILL_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN'));
    console.log('  PASS: has BLOCKED_PLAN');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('REAL_PATCH_ROLLBACK_DRILL_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_ROLLBACK_DRILL_STATUSES.includes('REAL_PATCH_ROLLBACK_DRILL_READY'));
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
    assert.equal(r.real_patch_rollback_drill_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_DRILL_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('rollback_drill_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked plan ---
  () => {
    const input = validInput();
    input.real_patch_rollback_plan_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN'));
    console.log('  PASS: plan not ready -> BLOCKED_PLAN');
  },
  () => {
    const input = validInput();
    input.drill_mode = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_DRILL_BLOCKED_PLAN'));
    console.log('  PASS: drill_mode=live -> BLOCKED_PLAN');
  },
  () => {
    const input = validInput();
    delete input.drill_result;
    const r = build(input);
    assert.ok(r.errors[0].includes('drill_result'));
    console.log('  PASS: missing drill_result -> BLOCKED_PLAN');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.drill_result.simulated = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_DRILL_FAIL'));
    console.log('  PASS: simulated=false -> FAIL');
  },
  () => {
    const input = validInput();
    input.drill_result.rollback_executed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_DRILL_FAIL'));
    console.log('  PASS: rollback_executed=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.drill_result.files_restored = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_DRILL_FAIL'));
    console.log('  PASS: files_restored=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.drill_result.validation_passed = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_ROLLBACK_DRILL_FAIL'));
    console.log('  PASS: validation_passed=false -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_rollback_drill_ready, true);
    assert.equal(r.drill_mode, 'dry-run');
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.rollback_drill_id);
    assert.ok(r.rollback_drill_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.rollback_drill_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.rollback_drill_hash, r2.rollback_drill_hash);
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
    assert.ok(r.includes('REAL_PATCH_ROLLBACK_DRILL_READY'));
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
    assert.ok(r.includes('drill_mode'));
    console.log('  PASS: render: contains drill_mode');
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
  console.log('\n=== software-factory-real-patch-rollback-drill tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked plan ---', 10, 13],
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
