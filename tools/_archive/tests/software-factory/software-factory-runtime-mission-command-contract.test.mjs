import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RUNTIME_MISSION_COMMAND_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-mission-command-contract.mjs';

function validInput() {
  return {
    mission_command_id: 'mc-v275',
    controlled_real_patch_execution_phase_gate_ready: true,
    explicit_v275_command: true,
    requested_by: 'vision-core',
    mission_reason: 'Initiate runtime mission execution phase',
    mission_type: 'diagnosis',
    mission_goal: 'Verify runtime mission command contract works',
    target_project: 'vision-core',
    allowed_runtime_mode: 'dry-run',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RUNTIME_MISSION_COMMAND_CONTRACT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_COMMAND_CONTRACT_STATUSES.includes('RUNTIME_MISSION_COMMAND_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_COMMAND_CONTRACT_STATUSES.includes('RUNTIME_MISSION_COMMAND_BLOCKED_PHASE_GATE'));
    console.log('  PASS: has BLOCKED_PHASE_GATE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_COMMAND_CONTRACT_STATUSES.includes('RUNTIME_MISSION_COMMAND_DENIED'));
    console.log('  PASS: has DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_COMMAND_CONTRACT_STATUSES.includes('RUNTIME_MISSION_COMMAND_READY'));
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
    assert.equal(r.runtime_mission_command_contract_ready, false);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_COMMAND_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('mission_command_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked phase gate ---
  () => {
    const input = validInput();
    input.controlled_real_patch_execution_phase_gate_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_COMMAND_BLOCKED_PHASE_GATE'));
    console.log('  PASS: phase gate not ready -> BLOCKED_PHASE_GATE');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.explicit_v275_command = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_COMMAND_DENIED'));
    console.log('  PASS: explicit_v275_command=false -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.requested_by;
    const r = build(input);
    assert.ok(r.errors[0].includes('requested_by'));
    console.log('  PASS: missing requested_by -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.mission_reason;
    const r = build(input);
    assert.ok(r.errors[0].includes('mission_reason'));
    console.log('  PASS: missing mission_reason -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.mission_type;
    const r = build(input);
    assert.ok(r.errors[0].includes('mission_type'));
    console.log('  PASS: missing mission_type -> DENIED');
  },
  () => {
    const input = validInput();
    input.mission_type = 'deploy';
    const r = build(input);
    assert.ok(r.errors[0].includes('mission_type'));
    console.log('  PASS: invalid mission_type -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.mission_goal;
    const r = build(input);
    assert.ok(r.errors[0].includes('mission_goal'));
    console.log('  PASS: missing mission_goal -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.target_project;
    const r = build(input);
    assert.ok(r.errors[0].includes('target_project'));
    console.log('  PASS: missing target_project -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.allowed_runtime_mode;
    const r = build(input);
    assert.ok(r.errors[0].includes('allowed_runtime_mode'));
    console.log('  PASS: missing allowed_runtime_mode -> DENIED');
  },
  () => {
    const input = validInput();
    input.allowed_runtime_mode = 'live';
    const r = build(input);
    assert.ok(r.errors[0].includes('allowed_runtime_mode'));
    console.log('  PASS: invalid allowed_runtime_mode -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_mission_command_contract_ready, true);
    assert.equal(r.explicit_command_received, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.mission_command_id);
    assert.equal(r.mission_type, 'diagnosis');
    assert.equal(r.target_project, 'vision-core');
    assert.equal(r.allowed_runtime_mode, 'dry-run');
    assert.ok(r.command_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.command_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.command_hash, r2.command_hash);
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
    assert.ok(r.includes('RUNTIME_MISSION_COMMAND_READY'));
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
    assert.ok(r.includes('command_hash'));
    console.log('  PASS: render: contains command_hash');
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
  console.log('\n=== software-factory-runtime-mission-command-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked phase gate ---', 10, 11],
    ['--- denied ---', 11, 20],
    ['--- ready ---', 20, 25],
    ['--- validate ---', 25, 27],
    ['--- render ---', 27, 31],
    ['--- invariants false ---', 31, 33],
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
