import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_EVIDENCE_RECEIPT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-evidence-receipt.mjs';

const VALID_HASH = 'a'.repeat(64);

function validInput() {
  return {
    receipt_id: 'er-v273',
    rollback_drill_id: 'rd-v272',
    real_patch_rollback_drill_ready: true,
    evidence_level: 'dry-run',
    evidence_entries: [
      { evidence_type: 'command_contract', evidence_hash: VALID_HASH, description: 'V265 command contract' },
      { evidence_type: 'scope_binding', evidence_hash: VALID_HASH, description: 'V266 scope binder' },
      { evidence_type: 'pre_state_snapshot', evidence_hash: VALID_HASH, description: 'V267 snapshot' },
      { evidence_type: 'apply_controller', evidence_hash: VALID_HASH, description: 'V268 controller' },
      { evidence_type: 'physical_apply_proof', evidence_hash: VALID_HASH, description: 'V269 proof' },
      { evidence_type: 'test_lane', evidence_hash: VALID_HASH, description: 'V270 test lane' },
      { evidence_type: 'rollback_plan', evidence_hash: VALID_HASH, description: 'V271 rollback plan' },
      { evidence_type: 'rollback_drill', evidence_hash: VALID_HASH, description: 'V272 rollback drill' },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_EVIDENCE_RECEIPT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_EVIDENCE_RECEIPT_STATUSES.includes('REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_EVIDENCE_RECEIPT_STATUSES.includes('REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL'));
    console.log('  PASS: has BLOCKED_DRILL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_EVIDENCE_RECEIPT_STATUSES.includes('REAL_PATCH_EVIDENCE_RECEIPT_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_EVIDENCE_RECEIPT_STATUSES.includes('REAL_PATCH_EVIDENCE_RECEIPT_READY'));
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
    assert.equal(r.real_patch_evidence_receipt_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('receipt_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked drill ---
  () => {
    const input = validInput();
    input.real_patch_rollback_drill_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_EVIDENCE_RECEIPT_BLOCKED_DRILL'));
    console.log('  PASS: drill not ready -> BLOCKED_DRILL');
  },
  () => {
    const input = validInput();
    input.evidence_entries = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('evidence_entries'));
    console.log('  PASS: empty entries -> BLOCKED_DRILL');
  },
  () => {
    const input = validInput();
    input.evidence_level = 'production';
    const r = build(input);
    assert.ok(r.errors[0].includes('evidence_level'));
    console.log('  PASS: wrong evidence_level -> BLOCKED_DRILL');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.evidence_entries[0].evidence_type = 'unknown_type';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_EVIDENCE_RECEIPT_FAIL'));
    console.log('  PASS: invalid evidence_type -> FAIL');
  },
  () => {
    const input = validInput();
    input.evidence_entries[0].evidence_hash = 'tooshort';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_EVIDENCE_RECEIPT_FAIL'));
    console.log('  PASS: short hash -> FAIL');
  },
  () => {
    const input = validInput();
    delete input.evidence_entries[0].description;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_EVIDENCE_RECEIPT_FAIL'));
    console.log('  PASS: missing description -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_evidence_receipt_ready, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.receipt_id);
    assert.equal(r.evidence_entries_count, 8);
    assert.equal(r.evidence_level, 'dry-run');
    assert.ok(r.receipt_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
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
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    console.log('  PASS: ready: no patch applied');
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
    assert.ok(r.includes('REAL_PATCH_EVIDENCE_RECEIPT_READY'));
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
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-real-patch-evidence-receipt tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked drill ---', 10, 13],
    ['--- fail ---', 13, 16],
    ['--- ready ---', 16, 21],
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
