import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_APPLY_CONTROLLER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-apply-controller.mjs';

function validInput() {
  return {
    apply_controller_id: 'ac-v268',
    snapshot_id: 'ss-v267',
    real_patch_pre_state_snapshot_ready: true,
    apply_mode: 'dry-run',
    patch_plan: 'Apply patch to software-factory modules',
    patch_preview: 'diff --git a/file.mjs b/file.mjs\n+ new content',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_APPLY_CONTROLLER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_APPLY_CONTROLLER_STATUSES.includes('REAL_PATCH_APPLY_CONTROLLER_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_APPLY_CONTROLLER_STATUSES.includes('REAL_PATCH_APPLY_CONTROLLER_BLOCKED_SNAPSHOT'));
    console.log('  PASS: has BLOCKED_SNAPSHOT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_APPLY_CONTROLLER_STATUSES.includes('REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY'));
    console.log('  PASS: has DRY_RUN_ONLY');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_APPLY_CONTROLLER_STATUSES.includes('REAL_PATCH_APPLY_CONTROLLER_READY'));
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
    assert.equal(r.real_patch_apply_controller_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_APPLY_CONTROLLER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('apply_controller_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked snapshot ---
  () => {
    const input = validInput();
    input.real_patch_pre_state_snapshot_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_APPLY_CONTROLLER_BLOCKED_SNAPSHOT'));
    console.log('  PASS: snapshot not ready -> BLOCKED_SNAPSHOT');
  },

  // --- dry run only ---
  () => {
    const input = validInput();
    input.apply_mode = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_APPLY_CONTROLLER_DRY_RUN_ONLY'));
    console.log('  PASS: apply_mode=live -> DRY_RUN_ONLY');
  },
  () => {
    const input = validInput();
    delete input.patch_plan;
    const r = build(input);
    assert.ok(r.errors[0].includes('patch_plan'));
    console.log('  PASS: missing patch_plan -> DRY_RUN_ONLY');
  },
  () => {
    const input = validInput();
    delete input.patch_preview;
    const r = build(input);
    assert.ok(r.errors[0].includes('patch_preview'));
    console.log('  PASS: missing patch_preview -> DRY_RUN_ONLY');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_apply_controller_ready, true);
    assert.equal(r.patch_preview_valid, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.apply_controller_id);
    assert.equal(r.apply_mode, 'dry-run');
    assert.ok(r.controller_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.controller_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.controller_hash, r2.controller_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    console.log('  PASS: ready: patch execution still blocked');
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
    assert.ok(r.includes('REAL_PATCH_APPLY_CONTROLLER_READY'));
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
    assert.ok(r.includes('apply_mode'));
    console.log('  PASS: render: contains apply_mode');
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
  console.log('\n=== software-factory-real-patch-apply-controller tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked snapshot ---', 10, 11],
    ['--- dry run only ---', 11, 14],
    ['--- ready ---', 14, 19],
    ['--- validate ---', 19, 21],
    ['--- render ---', 21, 25],
    ['--- invariants false ---', 25, 27],
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
