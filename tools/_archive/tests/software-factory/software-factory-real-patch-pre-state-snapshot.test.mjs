import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_PRE_STATE_SNAPSHOT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-pre-state-snapshot.mjs';

function validInput() {
  return {
    snapshot_id: 'ss-v267',
    scope_binder_id: 'sb-v266',
    real_patch_scope_binder_ready: true,
    files: [
      {
        path: 'tools/software-factory/software-factory-real-patch-pre-state-snapshot.mjs',
        before_hash: 'a'.repeat(64),
        exists: true,
      },
      {
        path: 'tools/tests/software-factory/software-factory-real-patch-pre-state-snapshot.test.mjs',
        before_hash: null,
        exists: false,
      },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_PRE_STATE_SNAPSHOT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PRE_STATE_SNAPSHOT_STATUSES.includes('REAL_PATCH_PRESTATE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PRE_STATE_SNAPSHOT_STATUSES.includes('REAL_PATCH_PRESTATE_BLOCKED_SCOPE'));
    console.log('  PASS: has BLOCKED_SCOPE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PRE_STATE_SNAPSHOT_STATUSES.includes('REAL_PATCH_PRESTATE_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PRE_STATE_SNAPSHOT_STATUSES.includes('REAL_PATCH_PRESTATE_READY'));
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
    assert.equal(r.real_patch_pre_state_snapshot_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_PRESTATE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('snapshot_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked scope ---
  () => {
    const input = validInput();
    input.real_patch_scope_binder_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_PRESTATE_BLOCKED_SCOPE'));
    console.log('  PASS: scope not ready -> BLOCKED_SCOPE');
  },
  () => {
    const input = validInput();
    delete input.files;
    const r = build(input);
    assert.ok(r.errors[0].includes('files'));
    console.log('  PASS: missing files -> BLOCKED_SCOPE');
  },
  () => {
    const input = validInput();
    input.files = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('files'));
    console.log('  PASS: empty files -> BLOCKED_SCOPE');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.files = [{ exists: true }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_PRESTATE_FAIL'));
    assert.ok(r.errors[0].includes('path'));
    console.log('  PASS: missing path -> FAIL');
  },
  () => {
    const input = validInput();
    input.files = [{ path: 'test.js' }];
    const r = build(input);
    assert.ok(r.errors[0].includes('exists must be boolean'));
    console.log('  PASS: missing exists -> FAIL');
  },
  () => {
    const input = validInput();
    input.files = [{ path: 'test.js', exists: true }];
    const r = build(input);
    assert.ok(r.errors[0].includes('before_hash'));
    console.log('  PASS: exists=true no hash -> FAIL');
  },
  () => {
    const input = validInput();
    input.files = [{ path: 'test.js', exists: true, before_hash: 'abc' }];
    const r = build(input);
    assert.ok(r.errors[0].includes('64 hex'));
    console.log('  PASS: short hash -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_pre_state_snapshot_ready, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.snapshot_id);
    assert.equal(r.files_count, 2);
    assert.equal(r.snapshot_level, 'metadata-only');
    assert.ok(r.snapshot_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.snapshot_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.snapshot_hash, r2.snapshot_hash);
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
    assert.ok(r.includes('REAL_PATCH_PRESTATE_READY'));
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
    assert.ok(r.includes('snapshot_hash'));
    console.log('  PASS: render: contains snapshot_hash');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('metadata-only'));
    console.log('  PASS: render: contains metadata-only');
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
  console.log('\n=== software-factory-real-patch-pre-state-snapshot tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked scope ---', 10, 13],
    ['--- fail ---', 13, 17],
    ['--- ready ---', 17, 22],
    ['--- validate ---', 22, 24],
    ['--- render ---', 24, 29],
    ['--- invariants false ---', 29, 31],
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
