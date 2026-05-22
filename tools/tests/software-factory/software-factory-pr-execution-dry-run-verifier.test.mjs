import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_EXECUTION_DRY_RUN_VERIFIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-execution-dry-run-verifier.mjs';

function validInput() {
  return {
    verifier_id: 'verifier-v248',
    sandbox_id: 'sandbox-v247',
    pr_execution_sandbox_ready: true,
    dry_run_result: {
      command_preview: 'gh pr create --title "feat" --body "desc"',
      would_create_pr: true,
      target_branch: 'main',
      source_branch: 'feat/v248-feature',
      validation_passed: true,
    },
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_EXECUTION_DRY_RUN_VERIFIER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('PR_DRY_RUN_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: has PR_DRY_RUN_VERIFIER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('PR_DRY_RUN_VERIFIER_BLOCKED_SANDBOX'));
    console.log('  PASS: has PR_DRY_RUN_VERIFIER_BLOCKED_SANDBOX');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('PR_DRY_RUN_VERIFIER_FAIL'));
    console.log('  PASS: has PR_DRY_RUN_VERIFIER_FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('PR_DRY_RUN_VERIFIER_READY'));
    console.log('  PASS: has PR_DRY_RUN_VERIFIER_READY');
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
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].startsWith('PR_DRY_RUN_VERIFIER_BLOCKED_INPUT'));
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
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].startsWith('PR_DRY_RUN_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ verifier_id: 'a' });
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].includes('sandbox_id'));
    console.log('  PASS: missing sandbox_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ verifier_id: 'a', sandbox_id: 'b' });
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].includes('dry_run_result'));
    console.log('  PASS: missing dry_run_result -> BLOCKED_INPUT');
  },

  // --- blocked sandbox ---
  () => {
    const input = validInput();
    input.pr_execution_sandbox_ready = false;
    const r = build(input);
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].startsWith('PR_DRY_RUN_VERIFIER_BLOCKED_SANDBOX'));
    console.log('  PASS: sandbox not ready -> BLOCKED_SANDBOX');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.dry_run_result.would_create_pr = false;
    const r = build(input);
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].startsWith('PR_DRY_RUN_VERIFIER_FAIL'));
    console.log('  PASS: would_create_pr=false -> FAIL');
  },
  () => {
    const input = validInput();
    input.dry_run_result.validation_passed = false;
    const r = build(input);
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].startsWith('PR_DRY_RUN_VERIFIER_FAIL'));
    console.log('  PASS: validation_passed=false -> FAIL');
  },
  () => {
    const input = validInput();
    input.dry_run_result.target_branch = 'develop';
    const r = build(input);
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].startsWith('PR_DRY_RUN_VERIFIER_FAIL'));
    console.log('  PASS: wrong target_branch -> FAIL');
  },
  () => {
    const input = validInput();
    input.dry_run_result.source_branch = 'main';
    const r = build(input);
    assert.equal(r.pr_execution_dry_run_verified, false);
    assert.ok(r.errors[0].startsWith('PR_DRY_RUN_VERIFIER_FAIL'));
    console.log('  PASS: source_branch=main -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.pr_execution_dry_run_verified, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v248.0');
    console.log('  PASS: valid -> PR_DRY_RUN_VERIFIER_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.verifier_id);
    assert.ok(r.sandbox_id);
    assert.equal(r.dry_run_valid, true);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.verifier_hash.length, 64);
    console.log('  PASS: ready: verifier_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.verifier_hash, r2.verifier_hash);
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
    assert.ok(r.includes('PR_DRY_RUN_VERIFIER_READY'));
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
  console.log('\n=== software-factory-pr-execution-dry-run-verifier tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 13],
    ['--- blocked sandbox ---', 13, 14],
    ['--- fail ---', 14, 18],
    ['--- ready ---', 18, 22],
    ['--- validate ---', 22, 24],
    ['--- render ---', 24, 27],
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
