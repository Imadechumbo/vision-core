import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-mission-execution-phase-gate.mjs';

function validIds() {
  return {
    runtime_mission_command_contract: 'mc-v275',
    runtime_mission_scope_binder: 'msb-v276',
    runtime_mission_context_builder: 'mcb-v277',
    runtime_mission_plan_builder: 'mpb-v278',
    runtime_mission_execution_dry_run_controller: 'mdc-v279',
    runtime_mission_approval_gate: 'ag-v280',
    runtime_mission_sandbox_executor: 'se-v281',
    runtime_mission_result_verifier: 'rv-v282',
    runtime_mission_evidence_receipt: 'er-v283',
  };
}

function validInput() {
  return {
    phase_gate_id: 'pg-v284',
    receipt_id: 'er-v283',
    runtime_mission_evidence_receipt_ready: true,
    ids: validIds(),
    phase_summary: 'V275-V284 runtime mission execution phase complete. All 9 modules verified.',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_PHASE_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_PHASE_GATE_STATUSES.includes('RUNTIME_MISSION_PHASE_GATE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_PHASE_GATE_STATUSES.includes('RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT'));
    console.log('  PASS: has BLOCKED_RECEIPT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_PHASE_GATE_STATUSES.includes('RUNTIME_MISSION_PHASE_GATE_INCOMPLETE'));
    console.log('  PASS: has INCOMPLETE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EXECUTION_PHASE_GATE_STATUSES.includes('RUNTIME_MISSION_PHASE_GATE_READY'));
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
    assert.equal(r.runtime_mission_execution_phase_gate_ready, false);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('phase_gate_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked receipt ---
  () => {
    const input = validInput();
    input.runtime_mission_evidence_receipt_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT'));
    console.log('  PASS: receipt not ready -> BLOCKED_RECEIPT');
  },
  () => {
    const input = validInput();
    delete input.receipt_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT'));
    console.log('  PASS: missing receipt_id -> BLOCKED_RECEIPT');
  },
  () => {
    const input = validInput();
    delete input.ids;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT'));
    console.log('  PASS: missing ids -> BLOCKED_RECEIPT');
  },
  () => {
    const input = validInput();
    delete input.phase_summary;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_BLOCKED_RECEIPT'));
    console.log('  PASS: missing phase_summary -> BLOCKED_RECEIPT');
  },

  // --- incomplete ---
  () => {
    const input = validInput();
    delete input.ids.runtime_mission_command_contract;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_INCOMPLETE'));
    assert.equal(r.all_modules_present, false);
    console.log('  PASS: missing command contract id -> INCOMPLETE');
  },
  () => {
    const input = validInput();
    delete input.ids.runtime_mission_evidence_receipt;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_INCOMPLETE'));
    console.log('  PASS: missing evidence_receipt id -> INCOMPLETE');
  },
  () => {
    const input = validInput();
    input.ids.runtime_mission_approval_gate = '';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_PHASE_GATE_INCOMPLETE'));
    console.log('  PASS: empty approval_gate id -> INCOMPLETE');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_mission_execution_phase_gate_ready, true);
    assert.equal(r.all_modules_present, true);
    assert.equal(r.phase_passed, false);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.modules_verified.length, 9);
    assert.ok(r.modules_verified.includes('mc-v275'));
    assert.ok(r.modules_verified.includes('er-v283'));
    console.log('  PASS: ready: 9 modules verified');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.final_message, 'V275-V284 runtime mission execution complete. Runtime mission execution remains blocked until explicit V285 product dashboard command.');
    console.log('  PASS: ready: final_message correct');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.phase_gate_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.phase_gate_hash, r2.phase_gate_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.phase_passed, false);
    console.log('  PASS: ready: execution still blocked, phase_passed=false');
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
    assert.ok(r.includes('RUNTIME_MISSION_PHASE_GATE_READY'));
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
    assert.ok(r.includes('V285'));
    console.log('  PASS: render: contains final_message with V285 reference');
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
  console.log('\n=== software-factory-runtime-mission-execution-phase-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked receipt ---', 10, 14],
    ['--- incomplete ---', 14, 17],
    ['--- ready ---', 17, 23],
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
