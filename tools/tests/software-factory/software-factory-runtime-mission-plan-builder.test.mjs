import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RUNTIME_MISSION_PLAN_BUILDER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-mission-plan-builder.mjs';

function validInput() {
  return {
    mission_plan_builder_id: 'mpb-v278',
    runtime_mission_context_builder_ready: true,
    mission_context_builder_id: 'mcb-v277',
    plan_steps: ['verify scope', 'dry-run execution', 'generate report'],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RUNTIME_MISSION_PLAN_BUILDER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_PLAN_BUILDER_STATUSES.includes('RUNTIME_MISSION_PLAN_BUILDER_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_PLAN_BUILDER_STATUSES.includes('RUNTIME_MISSION_PLAN_BUILDER_BLOCKED_COMMAND'));
    console.log('  PASS: has BLOCKED_COMMAND');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_PLAN_BUILDER_STATUSES.includes('RUNTIME_MISSION_PLAN_BUILDER_READY'));
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
    assert.equal(r.runtime_mission_plan_builder_ready, false);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PLAN_BUILDER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('mission_plan_builder_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked command ---
  () => {
    const input = validInput();
    input.runtime_mission_context_builder_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PLAN_BUILDER_BLOCKED_COMMAND'));
    assert.ok(r.errors[0].includes('runtime_mission_context_builder_ready'));
    console.log('  PASS: context builder not ready -> BLOCKED_COMMAND');
  },
  () => {
    const input = validInput();
    delete input.mission_context_builder_id;
    const r = build(input);
    assert.ok(r.errors[0].includes('mission_context_builder_id'));
    console.log('  PASS: missing mission_context_builder_id -> BLOCKED_COMMAND');
  },
  () => {
    const input = validInput();
    delete input.plan_steps;
    const r = build(input);
    assert.ok(r.errors[0].includes('plan_steps'));
    console.log('  PASS: missing plan_steps -> BLOCKED_COMMAND');
  },
  () => {
    const input = validInput();
    input.plan_steps = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('plan_steps'));
    console.log('  PASS: empty plan_steps -> BLOCKED_COMMAND');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_mission_plan_builder_ready, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.mission_plan_builder_id);
    assert.equal(r.mission_context_builder_id, 'mcb-v277');
    assert.deepEqual(r.plan_steps, ['verify scope', 'dry-run execution', 'generate report']);
    assert.ok(r.plan_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.plan_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.plan_hash, r2.plan_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    console.log('  PASS: ready: runtime execution still blocked');
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
    assert.ok(r.includes('RUNTIME_MISSION_PLAN_BUILDER_READY'));
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
    assert.ok(r.includes('plan_hash'));
    console.log('  PASS: render: contains plan_hash');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-runtime-mission-plan-builder tests ===\n');
  const sections = [
    ['--- exports ---', 0, 7],
    ['--- blocked input ---', 7, 9],
    ['--- blocked command ---', 9, 13],
    ['--- ready ---', 13, 18],
    ['--- validate ---', 18, 20],
    ['--- render ---', 20, 24],
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
