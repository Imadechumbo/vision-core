import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_REAL_PATCH_PHYSICAL_APPLY_PROOF_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-patch-physical-apply-proof.mjs';

function validInput() {
  return {
    proof_id: 'pf-v269',
    apply_controller_id: 'ac-v268',
    real_patch_apply_controller_ready: true,
    observed_result: {
      real_patch_applied: false,
      files_written: false,
      git_apply_executed: false,
      dry_run_confirmed: true,
    },
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_REAL_PATCH_PHYSICAL_APPLY_PROOF_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PHYSICAL_APPLY_PROOF_STATUSES.includes('REAL_PATCH_APPLY_PROOF_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PHYSICAL_APPLY_PROOF_STATUSES.includes('REAL_PATCH_APPLY_PROOF_BLOCKED_CONTROLLER'));
    console.log('  PASS: has BLOCKED_CONTROLLER');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PHYSICAL_APPLY_PROOF_STATUSES.includes('REAL_PATCH_APPLY_PROOF_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_REAL_PATCH_PHYSICAL_APPLY_PROOF_STATUSES.includes('REAL_PATCH_APPLY_PROOF_READY'));
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
    assert.equal(r.real_patch_physical_apply_proof_ready, false);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_APPLY_PROOF_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('proof_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked controller ---
  () => {
    const input = validInput();
    input.real_patch_apply_controller_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_APPLY_PROOF_BLOCKED_CONTROLLER'));
    console.log('  PASS: controller not ready -> BLOCKED_CONTROLLER');
  },
  () => {
    const input = validInput();
    delete input.observed_result;
    const r = build(input);
    assert.ok(r.errors[0].includes('observed_result'));
    console.log('  PASS: missing observed_result -> BLOCKED_CONTROLLER');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.observed_result.real_patch_applied = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('REAL_PATCH_APPLY_PROOF_FAIL'));
    console.log('  PASS: real_patch_applied=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.files_written = true;
    const r = build(input);
    assert.ok(r.errors[0].includes('files_written'));
    console.log('  PASS: files_written=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.git_apply_executed = true;
    const r = build(input);
    assert.ok(r.errors[0].includes('git_apply_executed'));
    console.log('  PASS: git_apply_executed=true -> FAIL');
  },
  () => {
    const input = validInput();
    input.observed_result.dry_run_confirmed = false;
    const r = build(input);
    assert.ok(r.errors[0].includes('dry_run_confirmed'));
    console.log('  PASS: dry_run_confirmed=false -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_physical_apply_proof_ready, true);
    assert.equal(r.dry_run_verified, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.proof_id);
    assert.ok(r.proof_hash);
    console.log('  PASS: ready: fields set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.proof_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.proof_hash, r2.proof_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.files_written, false);
    assert.equal(r.git_apply_executed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    console.log('  PASS: ready: no patch applied, no files written');
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
    assert.ok(r.includes('REAL_PATCH_APPLY_PROOF_READY'));
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
    assert.ok(r.includes('proof_hash'));
    console.log('  PASS: render: contains proof_hash');
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
    assert.equal(r.files_written, false);
    assert.equal(r.git_apply_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.files_written, false);
    assert.equal(r.git_apply_executed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-real-patch-physical-apply-proof tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked controller ---', 10, 12],
    ['--- fail ---', 12, 16],
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
