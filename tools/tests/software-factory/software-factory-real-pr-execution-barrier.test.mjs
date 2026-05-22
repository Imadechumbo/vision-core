import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_EXECUTION_BARRIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-execution-barrier.mjs';

function validInput() {
  return {
    barrier_id: 'barrier-v250',
    approval_id: 'approval-v249',
    pr_human_approval_gate_ready: true,
    execution_requested: true,
    execution_authorized: true,
    authority_reference: 'authority-v245',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_EXECUTION_BARRIER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_BARRIER_STATUSES.includes('REAL_PR_EXEC_BARRIER_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_EXEC_BARRIER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_BARRIER_STATUSES.includes('REAL_PR_EXEC_BARRIER_BLOCKED_APPROVAL'));
    console.log('  PASS: has REAL_PR_EXEC_BARRIER_BLOCKED_APPROVAL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_BARRIER_STATUSES.includes('REAL_PR_EXEC_BARRIER_DENIED'));
    console.log('  PASS: has REAL_PR_EXEC_BARRIER_DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_BARRIER_STATUSES.includes('REAL_PR_EXEC_BARRIER_READY'));
    console.log('  PASS: has REAL_PR_EXEC_BARRIER_READY');
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
    assert.equal(r.real_pr_execution_barrier_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXEC_BARRIER_BLOCKED_INPUT'));
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
    assert.equal(r.real_pr_execution_barrier_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXEC_BARRIER_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ barrier_id: 'a' });
    assert.equal(r.real_pr_execution_barrier_ready, false);
    assert.ok(r.errors[0].includes('approval_id'));
    console.log('  PASS: missing approval_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ barrier_id: 'a', approval_id: 'b' });
    assert.equal(r.real_pr_execution_barrier_ready, false);
    assert.ok(r.errors[0].includes('authority_reference'));
    console.log('  PASS: missing authority_reference -> BLOCKED_INPUT');
  },

  // --- blocked approval ---
  () => {
    const input = validInput();
    input.pr_human_approval_gate_ready = false;
    const r = build(input);
    assert.equal(r.real_pr_execution_barrier_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXEC_BARRIER_BLOCKED_APPROVAL'));
    console.log('  PASS: approval not ready -> BLOCKED_APPROVAL');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.execution_requested = false;
    const r = build(input);
    assert.equal(r.real_pr_execution_barrier_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXEC_BARRIER_DENIED'));
    console.log('  PASS: execution_requested=false -> DENIED');
  },
  () => {
    const input = validInput();
    input.execution_authorized = false;
    const r = build(input);
    assert.equal(r.real_pr_execution_barrier_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_EXEC_BARRIER_DENIED'));
    console.log('  PASS: execution_authorized=false -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_execution_barrier_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v250.0');
    console.log('  PASS: valid -> REAL_PR_EXEC_BARRIER_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.barrier_id);
    assert.ok(r.approval_id);
    assert.equal(r.next_phase, 'V251_SUPERVISED_REAL_PR_EXECUTION_DRILL');
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
    assert.equal(r.barrier_hash.length, 64);
    console.log('  PASS: ready: barrier_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.barrier_hash, r2.barrier_hash);
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
    assert.ok(r.includes('REAL_PR_EXEC_BARRIER_READY'));
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
  console.log('\n=== software-factory-real-pr-execution-barrier tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 13],
    ['--- blocked approval ---', 13, 14],
    ['--- denied ---', 14, 16],
    ['--- ready ---', 16, 21],
    ['--- validate ---', 21, 23],
    ['--- render ---', 23, 26],
    ['--- invariants false ---', 26, 28],
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
