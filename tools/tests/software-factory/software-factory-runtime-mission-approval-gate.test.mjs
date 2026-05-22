import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_RUNTIME_MISSION_APPROVAL_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-runtime-mission-approval-gate.mjs';

function validInput() {
  return {
    approval_gate_id: 'ag-v280',
    dry_run_controller_id: 'mdc-v279',
    runtime_mission_execution_dry_run_controller_ready: true,
    dry_run_completed: false,
    human_approval: 'granted',
    approver_id: 'vision-core-admin',
    approval_reason: 'Mission dry-run controller validated',
    explicit_runtime_authority: true,
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_RUNTIME_MISSION_APPROVAL_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_APPROVAL_GATE_STATUSES.includes('RUNTIME_MISSION_APPROVAL_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_APPROVAL_GATE_STATUSES.includes('RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN'));
    console.log('  PASS: has BLOCKED_DRY_RUN');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_APPROVAL_GATE_STATUSES.includes('RUNTIME_MISSION_APPROVAL_DENIED'));
    console.log('  PASS: has DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_RUNTIME_MISSION_APPROVAL_GATE_STATUSES.includes('RUNTIME_MISSION_APPROVAL_READY'));
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
    assert.equal(r.runtime_mission_approval_gate_ready, false);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('approval_gate_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked dry run ---
  () => {
    const input = validInput();
    delete input.dry_run_controller_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN'));
    console.log('  PASS: missing dry_run_controller_id -> BLOCKED_DRY_RUN');
  },
  () => {
    const input = validInput();
    input.runtime_mission_execution_dry_run_controller_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN'));
    console.log('  PASS: dry run controller not ready -> BLOCKED_DRY_RUN');
  },
  () => {
    const input = validInput();
    input.dry_run_completed = true;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_BLOCKED_DRY_RUN'));
    assert.ok(r.errors[0].includes('dry_run_completed'));
    console.log('  PASS: dry_run_completed=true -> BLOCKED_DRY_RUN');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.human_approval = 'denied';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_DENIED'));
    assert.ok(r.errors[0].includes('human_approval'));
    console.log('  PASS: human_approval=denied -> DENIED');
  },
  () => {
    const input = validInput();
    input.human_approval = 'pending';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_DENIED'));
    console.log('  PASS: human_approval=pending -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.approver_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_DENIED'));
    assert.ok(r.errors[0].includes('approver_id'));
    console.log('  PASS: missing approver_id -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.approval_reason;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_DENIED'));
    assert.ok(r.errors[0].includes('approval_reason'));
    console.log('  PASS: missing approval_reason -> DENIED');
  },
  () => {
    const input = validInput();
    input.explicit_runtime_authority = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('RUNTIME_MISSION_APPROVAL_DENIED'));
    assert.ok(r.errors[0].includes('explicit_runtime_authority'));
    console.log('  PASS: explicit_runtime_authority=false -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_mission_approval_gate_ready, true);
    assert.equal(r.human_approved, true);
    assert.equal(r.explicit_runtime_authority_received, true);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.approval_hash);
    assert.equal(r.approval_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.approval_hash, r2.approval_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    console.log('  PASS: ready: runtime execution still blocked');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.real_execution_allowed, false);
    console.log('  PASS: ready: real execution blocked');
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
    assert.ok(r.includes('RUNTIME_MISSION_APPROVAL_READY'));
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
    assert.ok(r.includes('approval_hash'));
    console.log('  PASS: render: contains approval_hash');
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
  console.log('\n=== software-factory-runtime-mission-approval-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked dry run ---', 10, 13],
    ['--- denied ---', 13, 18],
    ['--- ready ---', 18, 23],
    ['--- validate ---', 23, 25],
    ['--- render ---', 25, 29],
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
