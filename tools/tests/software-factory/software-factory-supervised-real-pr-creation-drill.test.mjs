import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_SUPERVISED_REAL_PR_CREATION_DRILL_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-supervised-real-pr-creation-drill.mjs';

function validInput() {
  return {
    drill_id: 'drill-v253',
    phase_gate_id: 'gate-v252',
    real_pr_exec_phase_gate_ready: true,
    pr_data: { title: 'feat: test', head: 'feat/v253', base: 'main' },
    simulated_result: 'Dry-run: PR would be created successfully, no modifications detected',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_SUPERVISED_REAL_PR_CREATION_DRILL_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_SUPERVISED_REAL_PR_CREATION_DRILL_STATUSES.includes('SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT'));
    console.log('  PASS: has SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_SUPERVISED_REAL_PR_CREATION_DRILL_STATUSES.includes('SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_PHASE_GATE'));
    console.log('  PASS: has SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_PHASE_GATE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_SUPERVISED_REAL_PR_CREATION_DRILL_STATUSES.includes('SUPERVISED_REAL_PR_CREATION_DRILL_SIMULATED'));
    console.log('  PASS: has SUPERVISED_REAL_PR_CREATION_DRILL_SIMULATED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_SUPERVISED_REAL_PR_CREATION_DRILL_STATUSES.includes('SUPERVISED_REAL_PR_CREATION_DRILL_READY'));
    console.log('  PASS: has SUPERVISED_REAL_PR_CREATION_DRILL_READY');
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
    assert.equal(r.supervised_pr_creation_drill_ready, false);
    assert.ok(r.errors[0].startsWith('SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT'));
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
    assert.equal(r.supervised_pr_creation_drill_ready, false);
    assert.ok(r.errors[0].startsWith('SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ drill_id: 'a' });
    assert.equal(r.supervised_pr_creation_drill_ready, false);
    assert.ok(r.errors[0].includes('phase_gate_id'));
    console.log('  PASS: missing phase_gate_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ drill_id: 'a', phase_gate_id: 'b' });
    assert.equal(r.supervised_pr_creation_drill_ready, false);
    assert.ok(r.errors[0].includes('pr_data'));
    console.log('  PASS: missing pr_data -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ drill_id: 'a', phase_gate_id: 'b', pr_data: {} });
    assert.equal(r.supervised_pr_creation_drill_ready, false);
    assert.ok(r.errors[0].includes('simulated_result'));
    console.log('  PASS: missing simulated_result -> BLOCKED_INPUT');
  },

  // --- blocked phase gate ---
  () => {
    const input = validInput();
    input.real_pr_exec_phase_gate_ready = false;
    const r = build(input);
    assert.equal(r.supervised_pr_creation_drill_ready, false);
    assert.ok(r.errors[0].startsWith('SUPERVISED_REAL_PR_CREATION_DRILL_BLOCKED_PHASE_GATE'));
    console.log('  PASS: phase gate not ready -> BLOCKED_PHASE_GATE');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.supervised_pr_creation_drill_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v253.0');
    console.log('  PASS: valid -> SUPERVISED_REAL_PR_CREATION_DRILL_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.drill_id);
    assert.ok(r.phase_gate_id);
    assert.equal(r.pr_simulation_performed, true);
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
    assert.equal(r.drill_hash.length, 64);
    console.log('  PASS: ready: drill_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.drill_hash, r2.drill_hash);
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
    assert.ok(r.includes('SUPERVISED_REAL_PR_CREATION_DRILL_READY'));
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
  console.log('\n=== software-factory-supervised-real-pr-creation-drill tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 14],
    ['--- blocked phase gate ---', 14, 15],
    ['--- ready ---', 15, 20],
    ['--- validate ---', 20, 22],
    ['--- render ---', 22, 25],
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
