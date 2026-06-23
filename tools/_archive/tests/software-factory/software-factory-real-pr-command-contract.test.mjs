import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_COMMAND_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-command-contract.mjs';

function validInput() {
  return {
    command_contract_id: 'cc-v255',
    pr_execution_phase_gate_ready: true,
    phase_gate_id: 'gate-v254',
    explicit_v255_command: true,
    requested_by: 'vision-core-pipeline',
    command_reason: 'Controlled real PR execution drill',
    source_branch: 'feat/v255-command-contract',
    target_branch: 'main',
    pr_title: 'feat(factory): add real PR command contract V255',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_COMMAND_CONTRACT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_COMMAND_CONTRACT_STATUSES.includes('REAL_PR_COMMAND_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_COMMAND_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_COMMAND_CONTRACT_STATUSES.includes('REAL_PR_COMMAND_BLOCKED_PHASE_GATE'));
    console.log('  PASS: has REAL_PR_COMMAND_BLOCKED_PHASE_GATE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_COMMAND_CONTRACT_STATUSES.includes('REAL_PR_COMMAND_DENIED'));
    console.log('  PASS: has REAL_PR_COMMAND_DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_COMMAND_CONTRACT_STATUSES.includes('REAL_PR_COMMAND_READY'));
    console.log('  PASS: has REAL_PR_COMMAND_READY');
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
    assert.equal(r.real_pr_command_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_COMMAND_BLOCKED_INPUT'));
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
    assert.equal(r.real_pr_command_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_COMMAND_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ command_contract_id: 'a' });
    assert.equal(r.real_pr_command_contract_ready, false);
    assert.ok(r.errors[0].includes('phase_gate_id'));
    console.log('  PASS: missing phase_gate_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ command_contract_id: 'a', phase_gate_id: 'b' });
    assert.ok(r.errors[0].includes('requested_by'));
    console.log('  PASS: missing requested_by -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ command_contract_id: 'a', phase_gate_id: 'b', requested_by: 'x', command_reason: 'y' });
    assert.ok(r.errors[0].includes('source_branch'));
    console.log('  PASS: missing source_branch -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ command_contract_id: 'a', phase_gate_id: 'b', requested_by: 'x', command_reason: 'y', source_branch: 'feat/x' });
    assert.ok(r.errors[0].includes('pr_title'));
    console.log('  PASS: missing pr_title -> BLOCKED_INPUT');
  },

  // --- blocked phase gate ---
  () => {
    const input = validInput();
    input.pr_execution_phase_gate_ready = false;
    const r = build(input);
    assert.equal(r.real_pr_command_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_COMMAND_BLOCKED_PHASE_GATE'));
    console.log('  PASS: phase gate not ready -> BLOCKED_PHASE_GATE');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.explicit_v255_command = false;
    const r = build(input);
    assert.equal(r.real_pr_command_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_COMMAND_DENIED'));
    console.log('  PASS: explicit_v255_command=false -> DENIED');
  },
  () => {
    const input = validInput();
    input.source_branch = 'main';
    const r = build(input);
    assert.equal(r.real_pr_command_contract_ready, false);
    assert.ok(r.errors[0].includes('source_branch cannot be main'));
    console.log('  PASS: source_branch=main -> DENIED');
  },
  () => {
    const input = validInput();
    input.target_branch = 'develop';
    const r = build(input);
    assert.equal(r.real_pr_command_contract_ready, false);
    assert.ok(r.errors[0].includes('target_branch must be main'));
    console.log('  PASS: target_branch=develop -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_command_contract_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v255.0');
    console.log('  PASS: valid -> REAL_PR_COMMAND_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.command_contract_id);
    assert.equal(r.explicit_command_received, true);
    assert.equal(r.source_branch, 'feat/v255-command-contract');
    assert.equal(r.target_branch, 'main');
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
    assert.equal(r.command_hash.length, 64);
    console.log('  PASS: ready: command_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.command_hash, r2.command_hash);
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
    assert.ok(r.includes('REAL_PR_COMMAND_READY'));
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
  console.log('\n=== software-factory-real-pr-command-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 15],
    ['--- blocked phase gate ---', 15, 16],
    ['--- denied ---', 16, 19],
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
