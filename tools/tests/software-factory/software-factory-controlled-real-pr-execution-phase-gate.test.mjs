import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-controlled-real-pr-execution-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'pg-v264',
    real_pr_creation_approval_gate_id: 'ag-v259',
    real_pr_creation_approval_gate_ready: true,
    real_pr_creation_executor_id: 'exec-v260',
    real_pr_creation_executor_ready: true,
    real_pr_creation_verifier_id: 'ver-v261',
    real_pr_creation_verifier_ready: true,
    pr_checks_monitor_id: 'cm-v262',
    pr_checks_monitor_ready: true,
    merge_blocker_id: 'mb-v263',
    merge_blocker_gate_ready: true,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_PHASE'));
    console.log('  PASS: has BLOCKED_PHASE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_READY'));
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
    assert.equal(r.controlled_real_pr_execution_phase_gate_ready, false);
    assert.ok(r.errors[0].startsWith('CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('phase_gate_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked phase ---
  () => {
    const input = validInput();
    input.real_pr_creation_executor_ready = false;
    const r = build(input);
    assert.equal(r.controlled_real_pr_execution_phase_gate_ready, false);
    assert.ok(r.errors[0].includes('BLOCKED_PHASE'));
    console.log('  PASS: executor not ready -> BLOCKED_PHASE');
  },
  () => {
    const input = validInput();
    input.real_pr_creation_approval_gate_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('BLOCKED_PHASE'));
    console.log('  PASS: approval gate not ready -> BLOCKED_PHASE');
  },
  () => {
    const input = validInput();
    input.real_pr_creation_verifier_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('BLOCKED_PHASE'));
    console.log('  PASS: verifier not ready -> BLOCKED_PHASE');
  },
  () => {
    const input = validInput();
    input.pr_checks_monitor_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('BLOCKED_PHASE'));
    console.log('  PASS: checks monitor not ready -> BLOCKED_PHASE');
  },
  () => {
    const input = validInput();
    input.merge_blocker_gate_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('BLOCKED_PHASE'));
    console.log('  PASS: merge blocker not ready -> BLOCKED_PHASE');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.controlled_real_pr_execution_phase_gate_ready, true);
    assert.equal(r.phase_passed, false);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY, but phase_passed=false');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.final_message.includes('V255-V264 controlled real PR execution complete'));
    console.log('  PASS: ready: final_message set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.merge_allowed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_merged, false);
    console.log('  PASS: ready: merge/creation still blocked');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.module_report.length, 5);
    console.log('  PASS: ready: has module_report with 5 entries');
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
    assert.ok(r.includes('CONTROLLED_REAL_PR_EXECUTION_PHASE_GATE_READY'));
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
    assert.ok(r.includes('final_message'));
    assert.ok(r.includes('V255-V264'));
    console.log('  PASS: render: contains final_message');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('module: V259'));
    console.log('  PASS: render: contains module report entries');
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
    assert.equal(r.real_pr_merged, false);
    assert.equal(r.merge_allowed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.phase_passed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.merge_allowed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-controlled-real-pr-execution-phase-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 7],
    ['--- blocked input ---', 7, 9],
    ['--- blocked phase ---', 9, 14],
    ['--- ready ---', 14, 18],
    ['--- validate ---', 18, 20],
    ['--- render ---', 20, 25],
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
