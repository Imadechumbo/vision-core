import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RUNTIME_MISSION_EVIDENCE_RECEIPT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-mission-evidence-receipt.mjs';

function validInput() {
  return {
    receipt_id: 'er-v283',
    result_verifier_id: 'rv-v282',
    runtime_mission_result_verifier_ready: true,
    evidence_entries: [
      { evidence_type: 'command_contract', evidence_hash: 'a'.repeat(64), description: 'V275 command contract evidence' },
      { evidence_type: 'scope_binding', evidence_hash: 'b'.repeat(64), description: 'V276 scope binder evidence' },
      { evidence_type: 'context_builder', evidence_hash: 'c'.repeat(64), description: 'V277 context builder evidence' },
      { evidence_type: 'plan_builder', evidence_hash: 'd'.repeat(64), description: 'V278 plan builder evidence' },
      { evidence_type: 'dry_run_controller', evidence_hash: 'e'.repeat(64), description: 'V279 dry-run controller evidence' },
      { evidence_type: 'approval_gate', evidence_hash: '0'.repeat(64), description: 'V280 approval gate evidence' },
      { evidence_type: 'sandbox_executor', evidence_hash: '1'.repeat(64), description: 'V281 sandbox executor evidence' },
      { evidence_type: 'result_verifier', evidence_hash: 'f'.repeat(64), description: 'V282 result verifier evidence' },
    ],
    evidence_level: 'dry-run',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RUNTIME_MISSION_EVIDENCE_RECEIPT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EVIDENCE_RECEIPT_STATUSES.includes('RUNTIME_MISSION_EVIDENCE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EVIDENCE_RECEIPT_STATUSES.includes('RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER'));
    console.log('  PASS: has BLOCKED_VERIFIER');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EVIDENCE_RECEIPT_STATUSES.includes('RUNTIME_MISSION_EVIDENCE_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_EVIDENCE_RECEIPT_STATUSES.includes('RUNTIME_MISSION_EVIDENCE_READY'));
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
    assert.equal(r.runtime_mission_evidence_receipt_ready, false);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('receipt_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked verifier ---
  () => {
    const input = validInput();
    input.runtime_mission_result_verifier_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER'));
    console.log('  PASS: verifier not ready -> BLOCKED_VERIFIER');
  },
  () => {
    const input = validInput();
    delete input.result_verifier_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER'));
    console.log('  PASS: missing result_verifier_id -> BLOCKED_VERIFIER');
  },
  () => {
    const input = validInput();
    input.evidence_level = 'production';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER'));
    assert.ok(r.errors[0].includes('evidence_level'));
    console.log('  PASS: wrong evidence_level -> BLOCKED_VERIFIER');
  },
  () => {
    const input = validInput();
    input.evidence_entries = [];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_BLOCKED_VERIFIER'));
    assert.ok(r.errors[0].includes('evidence_entries'));
    console.log('  PASS: empty evidence_entries -> BLOCKED_VERIFIER');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.evidence_entries = [{ evidence_type: 'invalid_type', evidence_hash: 'a'.repeat(64), description: 'test' }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_FAIL'));
    assert.ok(r.errors[0].includes('evidence_type'));
    console.log('  PASS: invalid evidence_type -> FAIL');
  },
  () => {
    const input = validInput();
    input.evidence_entries = [{ evidence_type: 'command_contract', evidence_hash: 'short', description: 'test' }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_FAIL'));
    assert.ok(r.errors[0].includes('evidence_hash'));
    console.log('  PASS: short hash -> FAIL');
  },
  () => {
    const input = validInput();
    input.evidence_entries = [{ evidence_type: 'command_contract', evidence_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_EVIDENCE_FAIL'));
    assert.ok(r.errors[0].includes('description'));
    console.log('  PASS: missing description -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_mission_evidence_receipt_ready, true);
    assert.equal(r.evidence_entries_count, 8);
    assert.equal(r.evidence_level, 'dry-run');
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.receipt_hash);
    assert.equal(r.receipt_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.receipt_hash, r2.receipt_hash);
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
    assert.ok(r.includes('RUNTIME_MISSION_EVIDENCE_READY'));
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
    assert.ok(r.includes('receipt_hash'));
    console.log('  PASS: render: contains receipt_hash');
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
  console.log('\n=== software-factory-runtime-mission-evidence-receipt tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked verifier ---', 10, 14],
    ['--- fail ---', 14, 17],
    ['--- ready ---', 17, 21],
    ['--- validate ---', 21, 23],
    ['--- render ---', 23, 27],
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
