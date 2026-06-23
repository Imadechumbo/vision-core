import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PR_CREATION_APPROVAL_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-pr-creation-approval-gate.mjs';

function validInput() {
  return {
    approval_gate_id: 'ag-v259',
    body_binder_id: 'bb-v258',
    real_pr_body_evidence_binder_ready: true,
    human_approval: 'granted',
    approver_id: 'claude-code',
    approval_reason: 'All preflight checks passed, body evidence bound, safe to proceed',
    explicit_creation_authority: true,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PR_CREATION_APPROVAL_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_APPROVAL_GATE_STATUSES.includes('REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT'));
    console.log('  PASS: has REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_APPROVAL_GATE_STATUSES.includes('REAL_PR_CREATION_APPROVAL_BLOCKED_BODY'));
    console.log('  PASS: has REAL_PR_CREATION_APPROVAL_BLOCKED_BODY');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_APPROVAL_GATE_STATUSES.includes('REAL_PR_CREATION_APPROVAL_DENIED'));
    console.log('  PASS: has REAL_PR_CREATION_APPROVAL_DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PR_CREATION_APPROVAL_GATE_STATUSES.includes('REAL_PR_CREATION_APPROVAL_READY'));
    console.log('  PASS: has REAL_PR_CREATION_APPROVAL_READY');
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
    assert.equal(r.real_pr_creation_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT'));
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
    assert.equal(r.real_pr_creation_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_APPROVAL_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ approval_gate_id: 'a' });
    assert.ok(r.errors[0].includes('body_binder_id'));
    console.log('  PASS: missing body_binder_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ approval_gate_id: 'a', body_binder_id: 'b' });
    assert.ok(r.errors[0].includes('approver_id'));
    console.log('  PASS: missing approver_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ approval_gate_id: 'a', body_binder_id: 'b', approver_id: 'x' });
    assert.ok(r.errors[0].includes('approval_reason'));
    console.log('  PASS: missing approval_reason -> BLOCKED_INPUT');
  },

  // --- blocked body ---
  () => {
    const input = validInput();
    input.real_pr_body_evidence_binder_ready = false;
    const r = build(input);
    assert.equal(r.real_pr_creation_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_APPROVAL_BLOCKED_BODY'));
    console.log('  PASS: body binder not ready -> BLOCKED_BODY');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.human_approval = 'denied';
    const r = build(input);
    assert.equal(r.real_pr_creation_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_APPROVAL_DENIED'));
    console.log('  PASS: human_approval=denied -> DENIED');
  },
  () => {
    const input = validInput();
    input.explicit_creation_authority = false;
    const r = build(input);
    assert.equal(r.real_pr_creation_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PR_CREATION_APPROVAL_DENIED'));
    console.log('  PASS: explicit_creation_authority=false -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_pr_creation_approval_gate_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v259.0');
    console.log('  PASS: valid -> REAL_PR_CREATION_APPROVAL_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.approval_gate_id);
    assert.ok(r.body_binder_id);
    assert.equal(r.human_approved, true);
    assert.equal(r.explicit_creation_authority_received, true);
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
    assert.equal(r.approval_hash.length, 64);
    console.log('  PASS: ready: approval_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.approval_hash, r2.approval_hash);
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
    assert.ok(r.includes('REAL_PR_CREATION_APPROVAL_READY'));
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
  console.log('\n=== software-factory-real-pr-creation-approval-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 14],
    ['--- blocked body ---', 14, 15],
    ['--- denied ---', 15, 17],
    ['--- ready ---', 17, 22],
    ['--- validate ---', 22, 24],
    ['--- render ---', 24, 27],
    ['--- invariants false ---', 27, 29],
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
