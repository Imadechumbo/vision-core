import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_CREATION_EXECUTOR_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-creation-executor.mjs';

function validInput() {
  return {
    executor_id: 'exec-v260',
    approval_gate_id: 'ag-v259',
    real_pr_creation_approval_gate_ready: true,
    execution_mode: 'dry-run',
    command_preview: 'gh pr create --title "feat" --body "body" --base main --head feat/v260',
    source_branch: 'feat/v260-executor',
    target_branch: 'main',
    pr_title: 'feat(factory): add real PR creation executor V260',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_CREATION_EXECUTOR_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_EXECUTOR_STATUSES.includes('REAL_PR_EXECUTOR_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_EXECUTOR_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_EXECUTOR_STATUSES.includes('REAL_PR_EXECUTOR_BLOCKED_APPROVAL'));
    console.log('  PASS: has REAL_PR_EXECUTOR_BLOCKED_APPROVAL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_EXECUTOR_STATUSES.includes('REAL_PR_EXECUTOR_DRY_RUN_ONLY'));
    console.log('  PASS: has REAL_PR_EXECUTOR_DRY_RUN_ONLY');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_EXECUTOR_STATUSES.includes('REAL_PR_EXECUTOR_READY'));
    console.log('  PASS: has REAL_PR_EXECUTOR_READY');
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
    assert.equal(r.real_pr_creation_executor_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXECUTOR_BLOCKED_INPUT'));
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
    assert.equal(r.real_pr_creation_executor_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXECUTOR_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ executor_id: 'a' });
    assert.ok(r.errors[0].includes('approval_gate_id'));
    console.log('  PASS: missing approval_gate_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ executor_id: 'a', approval_gate_id: 'b' });
    assert.ok(r.errors[0].includes('command_preview'));
    console.log('  PASS: missing command_preview -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ executor_id: 'a', approval_gate_id: 'b', command_preview: 'c' });
    assert.ok(r.errors[0].includes('source_branch'));
    console.log('  PASS: missing source_branch -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ executor_id: 'a', approval_gate_id: 'b', command_preview: 'c', source_branch: 's' });
    assert.ok(r.errors[0].includes('pr_title'));
    console.log('  PASS: missing pr_title -> BLOCKED_INPUT');
  },

  // --- blocked approval ---
  () => {
    const input = validInput();
    input.real_pr_creation_approval_gate_ready = false;
    const r = build(input);
    assert.equal(r.real_pr_creation_executor_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXECUTOR_BLOCKED_APPROVAL'));
    console.log('  PASS: approval not ready -> BLOCKED_APPROVAL');
  },

  // --- dry run only ---
  () => {
    const input = validInput();
    input.execution_mode = 'live';
    const r = build(input);
    assert.equal(r.real_pr_creation_executor_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXECUTOR_DRY_RUN_ONLY'));
    console.log('  PASS: execution_mode=live -> DRY_RUN_ONLY');
  },
  () => {
    const input = validInput();
    input.source_branch = 'main';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXECUTOR_DRY_RUN_ONLY'));
    console.log('  PASS: source_branch=main -> DRY_RUN_ONLY');
  },
  () => {
    const input = validInput();
    input.target_branch = 'develop';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXECUTOR_DRY_RUN_ONLY'));
    console.log('  PASS: target_branch=develop -> DRY_RUN_ONLY');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_executor_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v260.0');
    console.log('  PASS: valid -> REAL_PR_EXECUTOR_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.executor_id);
    assert.ok(r.approval_gate_id);
    assert.equal(r.execution_mode, 'dry-run');
    assert.equal(r.command_preview_valid, true);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    console.log('  PASS: ready: real_pr_creation_allowed still false');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.executor_hash.length, 64);
    console.log('  PASS: ready: executor_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.executor_hash, r2.executor_hash);
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
    assert.ok(r.includes('REAL_PR_EXECUTOR_READY'));
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
  console.log('\n=== software-factory-real-pr-creation-executor tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 15],
    ['--- blocked approval ---', 15, 16],
    ['--- dry run only ---', 16, 19],
    ['--- ready ---', 19, 24],
    ['--- validate ---', 24, 26],
    ['--- render ---', 26, 29],
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
