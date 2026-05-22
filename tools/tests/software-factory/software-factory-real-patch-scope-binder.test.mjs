import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_SCOPE_BINDER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-scope-binder.mjs';

function validInput() {
  return {
    scope_binder_id: 'sb-v266',
    patch_command_id: 'pc-v265',
    real_patch_command_contract_ready: true,
    allowed_paths: ['tools/software-factory/', 'tools/tests/software-factory/'],
    requested_files: [
      'tools/software-factory/software-factory-real-patch-scope-binder.mjs',
      'tools/tests/software-factory/software-factory-real-patch-scope-binder.test.mjs',
    ],
    denied_paths: ['.env', '.github/workflows', 'secrets', 'deploy', 'production'],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_SCOPE_BINDER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_SCOPE_BINDER_STATUSES.includes('REAL_PATCH_SCOPE_BINDER_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_SCOPE_BINDER_STATUSES.includes('REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND'));
    console.log('  PASS: has BLOCKED_COMMAND');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_SCOPE_BINDER_STATUSES.includes('REAL_PATCH_SCOPE_BINDER_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_SCOPE_BINDER_STATUSES.includes('REAL_PATCH_SCOPE_BINDER_READY'));
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
    assert.equal(r.real_patch_scope_binder_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_SCOPE_BINDER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('scope_binder_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked command ---
  () => {
    const input = validInput();
    input.real_patch_command_contract_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_SCOPE_BINDER_BLOCKED_COMMAND'));
    console.log('  PASS: command contract not ready -> BLOCKED_COMMAND');
  },
  () => {
    const input = validInput();
    delete input.allowed_paths;
    const r = build(input);
    assert.ok(r.errors[0].includes('allowed_paths'));
    console.log('  PASS: missing allowed_paths -> BLOCKED_COMMAND');
  },
  () => {
    const input = validInput();
    input.allowed_paths = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('allowed_paths'));
    console.log('  PASS: empty allowed_paths -> BLOCKED_COMMAND');
  },
  () => {
    const input = validInput();
    delete input.requested_files;
    const r = build(input);
    assert.ok(r.errors[0].includes('requested_files'));
    console.log('  PASS: missing requested_files -> BLOCKED_COMMAND');
  },
  () => {
    const input = validInput();
    input.requested_files = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('requested_files'));
    console.log('  PASS: empty requested_files -> BLOCKED_COMMAND');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.requested_files = ['frontend/index.html'];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_SCOPE_BINDER_FAIL'));
    assert.ok(r.errors[0].includes('frontend/index.html'));
    console.log('  PASS: out-of-scope file -> FAIL');
  },
  () => {
    const input = validInput();
    input.requested_files = ['.env'];
    const r = build(input);
    assert.ok(r.errors[0].includes('denied'));
    console.log('  PASS: .env file -> FAIL');
  },
  () => {
    const input = validInput();
    input.requested_files = ['.github/workflows/ci.yml'];
    const r = build(input);
    assert.ok(r.errors[0].includes('denied'));
    console.log('  PASS: workflow file -> FAIL');
  },
  () => {
    const input = validInput();
    input.requested_files = ['secrets/keys.json'];
    const r = build(input);
    assert.ok(r.errors[0].includes('denied'));
    console.log('  PASS: secrets file -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_scope_binder_ready, true);
    assert.equal(r.scope_valid, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.scope_binder_id);
    assert.equal(r.requested_files_count, 2);
    assert.ok(r.scope_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.scope_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.scope_hash, r2.scope_hash);
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
    assert.ok(r.includes('REAL_PATCH_SCOPE_BINDER_READY'));
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
    assert.ok(r.includes('scope_hash'));
    console.log('  PASS: render: contains scope_hash');
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
  console.log('\n=== software-factory-real-patch-scope-binder tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked command ---', 10, 15],
    ['--- fail ---', 15, 19],
    ['--- ready ---', 19, 24],
    ['--- validate ---', 24, 26],
    ['--- render ---', 26, 30],
    ['--- invariants false ---', 30, 32],
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
