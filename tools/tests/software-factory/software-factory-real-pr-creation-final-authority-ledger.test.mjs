import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_CREATION_FINAL_AUTHORITY_LEDGER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-creation-final-authority-ledger.mjs';

function validInput() {
  return {
    ledger_id: 'ledger-v254',
    drill_id: 'drill-v253',
    drill_status: { supervised_pr_creation_drill_ready: true },
    authority_decision: 'approved',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_CREATION_FINAL_AUTHORITY_LEDGER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_FINAL_AUTHORITY_LEDGER_STATUSES.includes('REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_FINAL_AUTHORITY_LEDGER_STATUSES.includes('REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_DRILL'));
    console.log('  PASS: has REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_DRILL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_FINAL_AUTHORITY_LEDGER_STATUSES.includes('REAL_PR_CREATION_FINAL_AUTH_LEDGER_APPROVED'));
    console.log('  PASS: has REAL_PR_CREATION_FINAL_AUTH_LEDGER_APPROVED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_FINAL_AUTHORITY_LEDGER_STATUSES.includes('REAL_PR_CREATION_FINAL_AUTH_LEDGER_READY'));
    console.log('  PASS: has REAL_PR_CREATION_FINAL_AUTH_LEDGER_READY');
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
    assert.equal(r.final_authority_ledger_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT'));
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
    assert.equal(r.final_authority_ledger_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ ledger_id: 'a' });
    assert.equal(r.final_authority_ledger_ready, false);
    assert.ok(r.errors[0].includes('drill_id'));
    console.log('  PASS: missing drill_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ ledger_id: 'a', drill_id: 'b' });
    assert.equal(r.final_authority_ledger_ready, false);
    assert.ok(r.errors[0].includes('drill_status'));
    console.log('  PASS: missing drill_status -> BLOCKED_INPUT');
  },

  // --- blocked drill ---
  () => {
    const input = validInput();
    input.drill_status = { supervised_pr_creation_drill_ready: false };
    const r = build(input);
    assert.equal(r.final_authority_ledger_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_FINAL_AUTH_LEDGER_BLOCKED_DRILL'));
    console.log('  PASS: drill not ready -> BLOCKED_DRILL');
  },

  // --- not approved ---
  () => {
    const input = validInput();
    input.authority_decision = 'denied';
    const r = build(input);
    assert.equal(r.final_authority_ledger_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_FINAL_AUTH_LEDGER_APPROVED'));
    console.log('  PASS: authority denied -> APPROVED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.final_authority_ledger_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v254.0');
    console.log('  PASS: valid -> REAL_PR_CREATION_FINAL_AUTH_LEDGER_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.ledger_id);
    assert.ok(r.drill_id);
    assert.equal(r.drill_ready, true);
    assert.equal(r.authority_decision, 'approved');
    console.log('  PASS: ready: ids and authority set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_pr_created, false);
    console.log('  PASS: ready: real_pr_creation_allowed still false');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.ledger_hash.length, 64);
    console.log('  PASS: ready: ledger_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.ledger_hash, r2.ledger_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.all_flags_locked, true);
    console.log('  PASS: ready: all_flags_locked true');
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
    assert.ok(r.includes('REAL_PR_CREATION_FINAL_AUTH_LEDGER_READY'));
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
  console.log('\n=== software-factory-real-pr-creation-final-authority-ledger tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 13],
    ['--- blocked drill ---', 13, 14],
    ['--- not approved ---', 14, 15],
    ['--- ready ---', 15, 21],
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
