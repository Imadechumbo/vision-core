import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RUNTIME_MISSION_SANDBOX_EXECUTOR_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-mission-sandbox-executor.mjs';

function validInput() {
  return {
    sandbox_executor_id: 'se-v281',
    approval_gate_id: 'ag-v280',
    runtime_mission_approval_gate_ready: true,
    sandbox_mode: 'dry-run',
    mission_preview: 'Runtime dry-run sandbox simulation for diagnosis mission V281',
    sandbox_constraints: [
      'no-production-touch',
      'no-real-execution',
      'no-filesystem-write',
      'no-network',
      'no-deploy',
      'no-release',
      'no-stable-promotion',
    ],
    simulated_execution_result: {
      simulated: true,
      sandbox_executed: false,
      external_call_performed: false,
      filesystem_write_performed: false,
      result: 'pass',
    },
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RUNTIME_MISSION_SANDBOX_EXECUTOR_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_SANDBOX_EXECUTOR_STATUSES.includes('RUNTIME_MISSION_SANDBOX_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_SANDBOX_EXECUTOR_STATUSES.includes('RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL'));
    console.log('  PASS: has BLOCKED_APPROVAL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_SANDBOX_EXECUTOR_STATUSES.includes('RUNTIME_MISSION_SANDBOX_DENIED'));
    console.log('  PASS: has DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_SANDBOX_EXECUTOR_STATUSES.includes('RUNTIME_MISSION_SANDBOX_READY'));
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
    assert.equal(r.runtime_mission_sandbox_executor_ready, false);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('sandbox_executor_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked approval ---
  () => {
    const input = validInput();
    input.runtime_mission_approval_gate_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL'));
    console.log('  PASS: approval gate not ready -> BLOCKED_APPROVAL');
  },
  () => {
    const input = validInput();
    delete input.approval_gate_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_BLOCKED_APPROVAL'));
    console.log('  PASS: missing approval_gate_id -> BLOCKED_APPROVAL');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.sandbox_mode = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    assert.ok(r.errors[0].includes('sandbox_mode'));
    console.log('  PASS: invalid sandbox_mode -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.mission_preview;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    assert.ok(r.errors[0].includes('mission_preview'));
    console.log('  PASS: missing mission_preview -> DENIED');
  },
  () => {
    const input = validInput();
    input.sandbox_constraints = [];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    assert.ok(r.errors[0].includes('sandbox_constraints'));
    console.log('  PASS: empty constraints -> DENIED');
  },
  () => {
    const input = validInput();
    input.sandbox_constraints = ['no-production-touch'];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    assert.ok(r.errors[0].includes('missing required constraints'));
    console.log('  PASS: missing required constraints -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.simulated_execution_result;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    assert.ok(r.errors[0].includes('simulated_execution_result'));
    console.log('  PASS: missing simulated_execution_result -> DENIED');
  },
  () => {
    const input = validInput();
    input.simulated_execution_result.simulated = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    console.log('  PASS: simulated=false -> DENIED');
  },
  () => {
    const input = validInput();
    input.simulated_execution_result.sandbox_executed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    console.log('  PASS: sandbox_executed=true -> DENIED');
  },
  () => {
    const input = validInput();
    input.simulated_execution_result.external_call_performed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    console.log('  PASS: external_call_performed=true -> DENIED');
  },
  () => {
    const input = validInput();
    input.simulated_execution_result.filesystem_write_performed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    console.log('  PASS: filesystem_write_performed=true -> DENIED');
  },
  () => {
    const input = validInput();
    input.simulated_execution_result.result = 'invalid';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_SANDBOX_DENIED'));
    assert.ok(r.errors[0].includes('result'));
    console.log('  PASS: invalid result -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_mission_sandbox_executor_ready, true);
    assert.equal(r.sandbox_executed, false);
    assert.equal(r.external_call_performed, false);
    assert.equal(r.filesystem_write_performed, false);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.sandbox_hash);
    assert.equal(r.sandbox_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.sandbox_hash, r2.sandbox_hash);
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
    assert.ok(r.includes('RUNTIME_MISSION_SANDBOX_READY'));
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
    assert.ok(r.includes('sandbox_hash'));
    console.log('  PASS: render: contains sandbox_hash');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.sandbox_executed, false);
    assert.equal(r.external_call_performed, false);
    assert.equal(r.filesystem_write_performed, false);
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
    assert.equal(r.sandbox_executed, false);
    assert.equal(r.external_call_performed, false);
    assert.equal(r.filesystem_write_performed, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-runtime-mission-sandbox-executor tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked approval ---', 10, 12],
    ['--- denied ---', 12, 22],
    ['--- ready ---', 22, 26],
    ['--- validate ---', 26, 28],
    ['--- render ---', 28, 32],
    ['--- invariants false ---', 32, 34],
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
