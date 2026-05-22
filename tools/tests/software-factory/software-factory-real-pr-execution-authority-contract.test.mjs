import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_EXECUTION_AUTHORITY_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-execution-authority-contract.mjs';

function validInput() {
  return {
    authority_id: 'authority-v245',
    phase_gate_id: 'pg-v244',
    pr_creation_phase_gate_ready: true,
    requested_by: 'controller',
    authority_reason: 'V245 authority contract preparation',
    explicit_v245_command: true,
    real_pr_scope: 'tools/software-factory',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_EXECUTION_AUTHORITY_CONTRACT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_AUTHORITY_CONTRACT_STATUSES.includes('REAL_PR_AUTHORITY_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_AUTHORITY_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_AUTHORITY_CONTRACT_STATUSES.includes('REAL_PR_AUTHORITY_BLOCKED_PHASE_GATE'));
    console.log('  PASS: has REAL_PR_AUTHORITY_BLOCKED_PHASE_GATE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_AUTHORITY_CONTRACT_STATUSES.includes('REAL_PR_AUTHORITY_DENIED'));
    console.log('  PASS: has REAL_PR_AUTHORITY_DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_EXECUTION_AUTHORITY_CONTRACT_STATUSES.includes('REAL_PR_AUTHORITY_READY'));
    console.log('  PASS: has REAL_PR_AUTHORITY_READY');
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
    assert.equal(r.real_pr_authority_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_AUTHORITY_BLOCKED_INPUT'));
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
    assert.equal(r.real_pr_authority_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_AUTHORITY_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ authority_id: 'a' });
    assert.equal(r.real_pr_authority_contract_ready, false);
    assert.ok(r.errors[0].includes('phase_gate_id'));
    console.log('  PASS: missing phase_gate_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ authority_id: 'a', phase_gate_id: 'b' });
    assert.equal(r.real_pr_authority_contract_ready, false);
    assert.ok(r.errors[0].includes('requested_by'));
    console.log('  PASS: missing requested_by -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ authority_id: 'a', phase_gate_id: 'b', requested_by: 'c', authority_reason: 'd' });
    assert.equal(r.real_pr_authority_contract_ready, false);
    assert.ok(r.errors[0].includes('real_pr_scope'));
    console.log('  PASS: missing real_pr_scope -> BLOCKED_INPUT');
  },

  // --- blocked phase gate ---
  () => {
    const input = validInput();
    input.pr_creation_phase_gate_ready = false;
    const r = build(input);
    assert.equal(r.real_pr_authority_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_AUTHORITY_BLOCKED_PHASE_GATE'));
    console.log('  PASS: phase gate not ready -> BLOCKED_PHASE_GATE');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.explicit_v245_command = false;
    const r = build(input);
    assert.equal(r.real_pr_authority_contract_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_AUTHORITY_DENIED'));
    console.log('  PASS: no explicit command -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_authority_contract_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v245.0');
    console.log('  PASS: valid -> REAL_PR_AUTHORITY_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.authority_id);
    assert.ok(r.phase_gate_id);
    assert.ok(r.authority_hash);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.explicit_command_received, true);
    console.log('  PASS: ready: explicit_command_received=true');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.authority_hash.length, 64);
    console.log('  PASS: ready: authority_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.authority_hash, r2.authority_hash);
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
    assert.ok(r.includes('REAL_PR_AUTHORITY_READY'));
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
  console.log('\n=== software-factory-real-pr-execution-authority-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 14],
    ['--- blocked phase gate ---', 14, 15],
    ['--- denied ---', 15, 16],
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
