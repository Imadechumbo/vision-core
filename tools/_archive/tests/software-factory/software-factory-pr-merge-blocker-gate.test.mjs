import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_MERGE_BLOCKER_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-merge-blocker-gate.mjs';

function validInput() {
  return {
    merge_blocker_id: 'mb-v263',
    pr_checks_monitor_ready: true,
    real_pr_creation_verifier_ready: true,
    merge_approved: true,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_MERGE_BLOCKER_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_MERGE_BLOCKER_GATE_STATUSES.includes('MERGE_BLOCKER_GATE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_MERGE_BLOCKER_GATE_STATUSES.includes('MERGE_BLOCKER_GATE_BLOCKED_MODULES'));
    console.log('  PASS: has BLOCKED_MODULES');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_MERGE_BLOCKER_GATE_STATUSES.includes('MERGE_BLOCKER_GATE_DENIED'));
    console.log('  PASS: has DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_MERGE_BLOCKER_GATE_STATUSES.includes('MERGE_BLOCKER_GATE_READY'));
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
    assert.equal(r.merge_blocker_gate_ready, false);
    assert.ok(r.errors[0].startsWith('MERGE_BLOCKER_GATE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('merge_blocker_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ merge_blocker_id: 'a' });
    assert.ok(r.errors[0].startsWith('MERGE_BLOCKER_GATE_BLOCKED_MODULES'));
    console.log('  PASS: missing pr_checks_monitor_ready -> BLOCKED_MODULES');
  },

  // --- blocked modules ---
  () => {
    const input = validInput();
    input.pr_checks_monitor_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('MERGE_BLOCKER_GATE_BLOCKED_MODULES'));
    console.log('  PASS: pr_checks_monitor_ready=false -> BLOCKED_MODULES');
  },
  () => {
    const input = validInput();
    input.real_pr_creation_verifier_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('real_pr_creation_verifier_ready'));
    console.log('  PASS: verifier not ready -> BLOCKED_MODULES');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.merge_approved = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('MERGE_BLOCKER_GATE_DENIED'));
    console.log('  PASS: merge_approved=false -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.merge_blocker_gate_ready, true);
    assert.equal(r.merge_allowed, false);
    assert.equal(r.real_pr_merged, false);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY, but merge_allowed still false');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_allowed, false);
    console.log('  PASS: ready: real_pr_creation_allowed false');
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
    assert.ok(r.includes('MERGE_BLOCKER_GATE_READY'));
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
    assert.ok(r.includes('merge_allowed'));
    console.log('  PASS: render: contains merge_allowed');
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
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.merge_allowed, false);
    assert.equal(r.real_pr_merged, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-merge-blocker-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 11],
    ['--- blocked modules ---', 11, 13],
    ['--- denied ---', 13, 14],
    ['--- ready ---', 14, 16],
    ['--- validate ---', 16, 18],
    ['--- render ---', 18, 22],
    ['--- invariants false ---', 22, 24],
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
