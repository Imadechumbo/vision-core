import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_CONTROLLED_REAL_PATCH_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-controlled-real-patch-execution-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'pg-v274',
    receipt_id: 'er-v273',
    real_patch_evidence_receipt_ready: true,
    ids: {
      real_patch_command_contract: 'cc-v265',
      real_patch_scope_binder: 'sb-v266',
      real_patch_pre_state_snapshot: 'ss-v267',
      real_patch_apply_controller: 'ac-v268',
      real_patch_physical_apply_proof: 'pf-v269',
      real_patch_test_lane: 'tl-v270',
      real_patch_rollback_plan: 'rp-v271',
      real_patch_rollback_drill: 'rd-v272',
      real_patch_evidence_receipt: 'er-v273',
    },
    phase_summary: 'V265-V274 controlled real patch execution phase complete. All modules verified. Dry-run only. No patch applied.',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_CONTROLLED_REAL_PATCH_PHASE_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_CONTROLLED_REAL_PATCH_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_CONTROLLED_REAL_PATCH_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT'));
    console.log('  PASS: has BLOCKED_RECEIPT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_CONTROLLED_REAL_PATCH_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_PATCH_PHASE_GATE_INCOMPLETE'));
    console.log('  PASS: has INCOMPLETE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_CONTROLLED_REAL_PATCH_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_PATCH_PHASE_GATE_READY'));
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
    assert.equal(r.controlled_real_patch_execution_phase_gate_ready, false);
    assert.ok(r.errors[0].startsWith('CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_INPUT'));
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
    input.real_patch_evidence_receipt_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('CONTROLLED_REAL_PATCH_PHASE_GATE_BLOCKED_RECEIPT'));
    console.log('  PASS: receipt not ready -> BLOCKED_RECEIPT');
  },
  () => {
    const input = validInput();
    delete input.ids;
    const r = build(input);
    assert.ok(r.errors[0].includes('ids'));
    console.log('  PASS: missing ids -> BLOCKED_RECEIPT');
  },
  () => {
    const input = validInput();
    delete input.phase_summary;
    const r = build(input);
    assert.ok(r.errors[0].includes('phase_summary'));
    console.log('  PASS: missing phase_summary -> BLOCKED_RECEIPT');
  },

  // --- incomplete ---
  () => {
    const input = validInput();
    delete input.ids.real_patch_command_contract;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('CONTROLLED_REAL_PATCH_PHASE_GATE_INCOMPLETE'));
    console.log('  PASS: missing module id -> INCOMPLETE');
  },
  () => {
    const input = validInput();
    delete input.ids.real_patch_rollback_drill;
    const r = build(input);
    assert.ok(r.errors.some(e => e.includes('real_patch_rollback_drill')));
    console.log('  PASS: missing rollback_drill -> INCOMPLETE');
  },
  () => {
    const input = validInput();
    delete input.ids.real_patch_evidence_receipt;
    const r = build(input);
    assert.ok(r.errors.some(e => e.includes('real_patch_evidence_receipt')));
    console.log('  PASS: missing evidence_receipt -> INCOMPLETE');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.controlled_real_patch_execution_phase_gate_ready, true);
    assert.equal(r.all_modules_present, true);
    assert.equal(r.phase_passed, false);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.modules_verified.length, 9);
    assert.ok(r.phase_gate_hash);
    console.log('  PASS: ready: 9 modules verified');
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
    assert.ok(r.final_message.includes('V265-V274'));
    assert.ok(r.final_message.includes('V275'));
    console.log('  PASS: ready: final_message references V265-V274 and V275');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.phase_passed, false);
    console.log('  PASS: ready: execution still blocked');
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
    assert.ok(r.includes('CONTROLLED_REAL_PATCH_PHASE_GATE_READY'));
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
    console.log('  PASS: render: contains final_message');
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
    assert.equal(r.rollback_executed, false);
    assert.equal(r.files_restored, false);
    assert.equal(r.production_touched, false);
    assert.equal(r.phase_passed, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.rollback_executed, false);
    assert.equal(r.production_touched, false);
    assert.equal(r.phase_passed, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-controlled-real-patch-execution-phase-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked receipt ---', 10, 13],
    ['--- incomplete ---', 13, 16],
    ['--- ready ---', 16, 22],
    ['--- validate ---', 22, 24],
    ['--- render ---', 24, 28],
    ['--- invariants false ---', 28, 30],
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
