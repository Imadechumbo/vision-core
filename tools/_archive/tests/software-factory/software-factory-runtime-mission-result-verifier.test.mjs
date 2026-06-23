import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RUNTIME_MISSION_RESULT_VERIFIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-mission-result-verifier.mjs';

function validInput() {
  return {
    result_verifier_id: 'rv-v282',
    sandbox_executor_id: 'se-v281',
    runtime_mission_sandbox_executor_ready: true,
    observed_result: {
      runtime_mission_executed: false,
      runtime_execution_allowed: false,
      production_touched: false,
      external_call_performed: false,
      filesystem_write_performed: false,
      validation_passed: true,
    },
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RUNTIME_MISSION_RESULT_VERIFIER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_RESULT_VERIFIER_STATUSES.includes('RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_RESULT_VERIFIER_STATUSES.includes('RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX'));
    console.log('  PASS: has BLOCKED_SANDBOX');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_RESULT_VERIFIER_STATUSES.includes('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_RESULT_VERIFIER_STATUSES.includes('RUNTIME_MISSION_RESULT_VERIFIER_READY'));
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
    assert.equal(r.runtime_mission_result_verifier_ready, false);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('result_verifier_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked sandbox ---
  () => {
    const input = validInput();
    input.runtime_mission_sandbox_executor_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX'));
    console.log('  PASS: sandbox not ready -> BLOCKED_SANDBOX');
  },
  () => {
    const input = validInput();
    delete input.sandbox_executor_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX'));
    console.log('  PASS: missing sandbox_executor_id -> BLOCKED_SANDBOX');
  },
  () => {
    const input = validInput();
    delete input.observed_result;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_BLOCKED_SANDBOX'));
    console.log('  PASS: missing observed_result -> BLOCKED_SANDBOX');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.observed_result.runtime_mission_executed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'));
    assert.ok(r.errors[0].includes('runtime_mission_executed'));
    console.log('  PASS: runtime_mission_executed=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.runtime_execution_allowed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'));
    console.log('  PASS: runtime_execution_allowed=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.production_touched = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'));
    console.log('  PASS: production_touched=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.external_call_performed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'));
    console.log('  PASS: external_call_performed=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.filesystem_write_performed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'));
    console.log('  PASS: filesystem_write_performed=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.validation_passed = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_RESULT_VERIFIER_FAIL'));
    console.log('  PASS: validation_passed=false -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_mission_result_verifier_ready, true);
    assert.equal(r.dry_run_verified, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.verification_hash);
    assert.equal(r.verification_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.verification_hash, r2.verification_hash);
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
    assert.ok(r.includes('RUNTIME_MISSION_RESULT_VERIFIER_READY'));
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
    assert.ok(r.includes('verification_hash'));
    console.log('  PASS: render: contains verification_hash');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
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
    assert.equal(r.external_call_performed, false);
    assert.equal(r.filesystem_write_performed, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-runtime-mission-result-verifier tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked sandbox ---', 10, 13],
    ['--- fail ---', 13, 19],
    ['--- ready ---', 19, 23],
    ['--- validate ---', 23, 25],
    ['--- render ---', 25, 29],
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
