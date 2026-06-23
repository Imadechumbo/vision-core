import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_EXECUTION_SANDBOX_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-execution-sandbox.mjs';

function validInput() {
  return {
    sandbox_id: 'sandbox-v247',
    binder_id: 'binder-v246',
    pr_command_binder_ready: true,
    sandbox_mode: 'dry-run',
    isolation_rules: [
      'no_real_github_write',
      'no_real_pr_create',
      'no_deploy',
      'no_release',
      'no_tag',
      'no_stable',
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_EXECUTION_SANDBOX_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_SANDBOX_STATUSES.includes('PR_EXEC_SANDBOX_BLOCKED_INPUT'));
    console.log('  PASS: has PR_EXEC_SANDBOX_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_SANDBOX_STATUSES.includes('PR_EXEC_SANDBOX_BLOCKED_BINDER'));
    console.log('  PASS: has PR_EXEC_SANDBOX_BLOCKED_BINDER');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_SANDBOX_STATUSES.includes('PR_EXEC_SANDBOX_READY'));
    console.log('  PASS: has PR_EXEC_SANDBOX_READY');
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
    assert.equal(r.pr_execution_sandbox_ready, false);
    assert.ok(r.errors[0].startsWith('PR_EXEC_SANDBOX_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: null: all forbidden flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.pr_execution_sandbox_ready, false);
    assert.ok(r.errors[0].startsWith('PR_EXEC_SANDBOX_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ sandbox_id: 'a' });
    assert.equal(r.pr_execution_sandbox_ready, false);
    assert.ok(r.errors[0].includes('binder_id'));
    console.log('  PASS: missing binder_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ sandbox_id: 'a', binder_id: 'b' });
    assert.equal(r.pr_execution_sandbox_ready, false);
    assert.ok(r.errors[0].includes('isolation_rules'));
    console.log('  PASS: missing isolation_rules -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    input.sandbox_mode = 'live';
    const r = build(input);
    assert.equal(r.pr_execution_sandbox_ready, false);
    assert.ok(r.errors[0].includes('sandbox_mode must be dry-run'));
    console.log('  PASS: wrong sandbox_mode -> BLOCKED_INPUT');
  },
  () => {
    const input = validInput();
    input.isolation_rules = ['no_real_github_write'];
    const r = build(input);
    assert.equal(r.pr_execution_sandbox_ready, false);
    assert.ok(r.errors[0].includes('missing isolation rules'));
    console.log('  PASS: missing isolation rules -> BLOCKED_INPUT');
  },

  // --- blocked binder ---
  () => {
    const input = validInput();
    input.pr_command_binder_ready = false;
    const r = build(input);
    assert.equal(r.pr_execution_sandbox_ready, false);
    assert.ok(r.errors[0].startsWith('PR_EXEC_SANDBOX_BLOCKED_BINDER'));
    console.log('  PASS: binder not ready -> BLOCKED_BINDER');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.pr_execution_sandbox_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v247.0');
    console.log('  PASS: valid -> PR_EXEC_SANDBOX_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.sandbox_id);
    assert.ok(r.binder_id);
    assert.equal(r.isolation_active, true);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.sandbox_hash.length, 64);
    console.log('  PASS: ready: sandbox_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.sandbox_hash, r2.sandbox_hash);
    console.log('  PASS: ready: hash deterministic');
  },

  // --- validate ---
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.valid, true);
    assert.equal(v.errors.length, 0);
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
    assert.ok(r.includes('PR_EXEC_SANDBOX_READY'));
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

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-pr-execution-sandbox tests ===\n');
  const sections = [
    ['--- exports ---', 0, 7],
    ['--- blocked input ---', 7, 14],
    ['--- blocked binder ---', 14, 15],
    ['--- ready ---', 15, 19],
    ['--- validate ---', 19, 21],
    ['--- render ---', 21, 24],
    ['--- invariants false ---', 24, 26],
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
