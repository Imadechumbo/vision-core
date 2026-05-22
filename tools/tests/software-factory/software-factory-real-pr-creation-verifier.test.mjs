import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_CREATION_VERIFIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-creation-verifier.mjs';

function validInput() {
  return {
    verifier_id: 'ver-v261',
    executor_id: 'exec-v260',
    real_pr_creation_executor_ready: true,
    executor_mode: 'dry-run',
    observed_result: {
      real_pr_created: false,
      pr_number: null,
      pr_url: null,
      dry_run_confirmed: true,
      github_write_performed: false,
    },
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_CREATION_VERIFIER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_VERIFIER_STATUSES.includes('REAL_PR_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_VERIFIER_STATUSES.includes('REAL_PR_VERIFIER_BLOCKED_EXECUTOR'));
    console.log('  PASS: has BLOCKED_EXECUTOR');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_VERIFIER_STATUSES.includes('REAL_PR_VERIFIER_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_VERIFIER_STATUSES.includes('REAL_PR_VERIFIER_READY'));
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
    assert.equal(r.real_pr_creation_verifier_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.equal(r.real_pr_creation_verifier_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ verifier_id: 'a' });
    assert.ok(r.errors[0].includes('executor_id'));
    console.log('  PASS: missing executor_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ verifier_id: 'a', executor_id: 'b' });
    assert.ok(r.errors[0].includes('observed_result'));
    console.log('  PASS: missing observed_result -> BLOCKED_INPUT');
  },

  // --- blocked executor ---
  () => {
    const input = validInput();
    input.real_pr_creation_executor_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_VERIFIER_BLOCKED_EXECUTOR'));
    console.log('  PASS: executor not ready -> BLOCKED_EXECUTOR');
  },
  () => {
    const input = validInput();
    input.executor_mode = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_VERIFIER_BLOCKED_EXECUTOR'));
    console.log('  PASS: executor_mode=live -> BLOCKED_EXECUTOR');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.observed_result.real_pr_created = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_VERIFIER_FAIL'));
    console.log('  PASS: real_pr_created=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.pr_number = 123;
    const r = build(input);
    assert.ok(r.errors[0].includes('pr_number must be null'));
    console.log('  PASS: pr_number non-null -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.pr_url = 'https://example.com';
    const r = build(input);
    assert.ok(r.errors[0].includes('pr_url must be null'));
    console.log('  PASS: pr_url non-null -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.dry_run_confirmed = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('dry_run_confirmed must be true'));
    console.log('  PASS: dry_run_confirmed=false -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.github_write_performed = true;
    const r = build(input);
    assert.ok(r.errors[0].includes('github_write_performed must be false'));
    console.log('  PASS: github_write_performed=true -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_verifier_ready, true);
    assert.equal(r.dry_run_verified, true);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.verifier_id);
    assert.ok(r.executor_id);
    assert.ok(r.verifier_hash);
    console.log('  PASS: ready: ids and hash set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.verifier_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.verifier_hash, r2.verifier_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    console.log('  PASS: ready: real_pr_creation_allowed still false');
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
    assert.ok(r.includes('REAL_PR_VERIFIER_READY'));
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
    assert.ok(r.includes('verifier_hash'));
    console.log('  PASS: render: contains verifier_hash');
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
  console.log('\n=== software-factory-real-pr-creation-verifier tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 12],
    ['--- blocked executor ---', 12, 14],
    ['--- fail ---', 14, 19],
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
