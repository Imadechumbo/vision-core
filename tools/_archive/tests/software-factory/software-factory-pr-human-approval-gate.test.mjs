import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_HUMAN_APPROVAL_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-human-approval-gate.mjs';

function validInput() {
  return {
    approval_id: 'approval-v249',
    verifier_id: 'verifier-v248',
    pr_execution_dry_run_verified: true,
    human_approval: 'granted',
    approver_id: 'human-approver',
    approval_reason: 'All dry-run checks passed, scope verified',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_HUMAN_APPROVAL_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_HUMAN_APPROVAL_GATE_STATUSES.includes('PR_HUMAN_APPROVAL_BLOCKED_INPUT'));
    console.log('  PASS: has PR_HUMAN_APPROVAL_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_HUMAN_APPROVAL_GATE_STATUSES.includes('PR_HUMAN_APPROVAL_BLOCKED_VERIFIER'));
    console.log('  PASS: has PR_HUMAN_APPROVAL_BLOCKED_VERIFIER');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_HUMAN_APPROVAL_GATE_STATUSES.includes('PR_HUMAN_APPROVAL_DENIED'));
    console.log('  PASS: has PR_HUMAN_APPROVAL_DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PR_HUMAN_APPROVAL_GATE_STATUSES.includes('PR_HUMAN_APPROVAL_READY'));
    console.log('  PASS: has PR_HUMAN_APPROVAL_READY');
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
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('PR_HUMAN_APPROVAL_BLOCKED_INPUT'));
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
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('PR_HUMAN_APPROVAL_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ approval_id: 'a' });
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].includes('verifier_id'));
    console.log('  PASS: missing verifier_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ approval_id: 'a', verifier_id: 'b' });
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].includes('approver_id'));
    console.log('  PASS: missing approver_id -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ approval_id: 'a', verifier_id: 'b', approver_id: 'c' });
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].includes('approval_reason'));
    console.log('  PASS: missing approval_reason -> BLOCKED_INPUT');
  },

  // --- blocked verifier ---
  () => {
    const input = validInput();
    input.pr_execution_dry_run_verified = false;
    const r = build(input);
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('PR_HUMAN_APPROVAL_BLOCKED_VERIFIER'));
    console.log('  PASS: verifier not ready -> BLOCKED_VERIFIER');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.human_approval = 'denied';
    const r = build(input);
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('PR_HUMAN_APPROVAL_DENIED'));
    console.log('  PASS: human_approval=denied -> DENIED');
  },
  () => {
    const input = validInput();
    input.human_approval = 'pending';
    const r = build(input);
    assert.equal(r.pr_human_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('PR_HUMAN_APPROVAL_DENIED'));
    console.log('  PASS: human_approval=pending -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.pr_human_approval_gate_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v249.0');
    console.log('  PASS: valid -> PR_HUMAN_APPROVAL_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.approval_id);
    assert.ok(r.verifier_id);
    assert.equal(r.human_approved, true);
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
    assert.ok(r.includes('PR_HUMAN_APPROVAL_READY'));
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
  console.log('\n=== software-factory-pr-human-approval-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 14],
    ['--- blocked verifier ---', 14, 15],
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
